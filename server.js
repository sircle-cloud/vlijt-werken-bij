#!/usr/bin/env node
/**
 * VLIJT Werken-bij — statische server + sollicitatie-endpoint
 * Draait onder PM2 als "vlijt-werkenbij" op poort 3008.
 * Cloudflare Tunnel route: werken.vlijttandartsen.nl -> localhost:3008
 *
 * NOINDEX: staat aan tot go-live (vr 26 juni 2026). Bij go-live
 * NOINDEX hieronder op false zetten en pm2 restart vlijt-werkenbij.
 *
 * Sollicitaties: POST /api/solliciteer -> data/sollicitaties.jsonl
 * (e-mailnotificatie naar VLIJT koppelen we bij deploy)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const PORT = 3008;
const ROOT = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const NOINDEX = true; // <-- bij go-live: false

// ── Uploads (CV + motivatiebrief) ────────────────────────────
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.jpg', '.jpeg', '.png', '.pages'];
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = (file.originalname || 'bestand').replace(/[^\w.\-]+/g, '_').slice(-80);
    const stamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    cb(null, `${stamp}_${file.fieldname}_${Math.random().toString(36).slice(2, 8)}_${safe}`);
  },
});
const uploadFields = multer({
  storage: uploadStorage,
  limits: { fileSize: 8 * 1024 * 1024, files: 2 },
  fileFilter: (req, file, cb) => cb(null, ALLOWED_EXT.includes(path.extname(file.originalname || '').toLowerCase())),
}).fields([{ name: 'cv', maxCount: 1 }, { name: 'motivatie', maxCount: 1 }]);

function cleanupFiles(req) {
  const files = req.files || {};
  Object.keys(files).forEach((k) => files[k].forEach((f) => { try { fs.unlinkSync(f.path); } catch {} }));
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function send(res, status, headers, body) {
  if (NOINDEX) headers['X-Robots-Tag'] = 'noindex, nofollow';
  res.writeHead(status, headers);
  res.end(body);
}

function handleSollicitatie(req, res) {
  uploadFields(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Bestand te groot (max 8 MB).' : 'Upload mislukt.';
      cleanupFiles(req);
      return send(res, 400, { 'Content-Type': 'application/json' }, JSON.stringify({ ok: false, error: msg }));
    }
    const b = req.body || {};
    // honeypot: bots vullen het verborgen veld "website" in
    if (b.website) {
      cleanupFiles(req);
      return send(res, 200, { 'Content-Type': 'application/json' }, '{"ok":true}');
    }
    const naam = String(b.naam || '').trim().slice(0, 200);
    const telefoon = String(b.telefoon || '').trim().slice(0, 50);
    const email = String(b.email || '').trim().slice(0, 200);
    const bericht = String(b.bericht || '').trim().slice(0, 2000);
    const functie = String(b.functie || '').trim().slice(0, 100);
    if (!naam || (!telefoon && !email)) {
      cleanupFiles(req);
      return send(res, 422, { 'Content-Type': 'application/json' },
        JSON.stringify({ ok: false, error: 'Vul je naam in, plus een telefoonnummer of e-mailadres.' }));
    }
    const files = req.files || {};
    const cv = files.cv && files.cv[0] ? path.basename(files.cv[0].path) : null;
    const motivatie = files.motivatie && files.motivatie[0] ? path.basename(files.motivatie[0].path) : null;
    const entry = { ts: new Date().toISOString(), functie, naam, telefoon, email, bericht, cv, motivatie };
    fs.appendFile(path.join(DATA_DIR, 'sollicitaties.jsonl'), JSON.stringify(entry) + '\n', (e) => {
      if (e) {
        console.error('sollicitatie opslaan mislukt:', e.message);
        return send(res, 500, { 'Content-Type': 'application/json' }, '{"ok":false}');
      }
      console.log(`sollicitatie ontvangen: ${functie} — ${naam}${cv ? ' +cv' : ''}${motivatie ? ' +motivatie' : ''}`);
      send(res, 200, { 'Content-Type': 'application/json' }, '{"ok":true}');
    });
  });
}

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    return send(res, 400, { 'Content-Type': 'text/plain' }, 'Bad request');
  }

  if (req.method === 'POST' && urlPath === '/api/solliciteer') {
    return handleSollicitatie(req, res);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, { 'Content-Type': 'text/plain' }, 'Method not allowed');
  }

  // normaliseer: /functie/ -> /functie/index.html, / -> /index.html
  if (urlPath.endsWith('/')) urlPath += 'index.html';
  if (!path.extname(urlPath)) urlPath += '/index.html';

  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    return send(res, 403, { 'Content-Type': 'text/plain' }, 'Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    const ext = path.extname(filePath).toLowerCase();
    if (err) {
      fs.readFile(path.join(ROOT, '404.html'), (e2, nf) => {
        if (e2) return send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Pagina niet gevonden');
        send(res, 404, { 'Content-Type': 'text/html; charset=utf-8' }, nf);
      });
      return;
    }
    // Tijdens de staging/review-fase: HTML en CSS nooit cachen, zodat
    // reviewers altijd de laatste versie zien. Alleen zware assets
    // (beelden, fonts) krijgen een korte cache.
    const noCacheExt = ext === '.html' || ext === '.css' || ext === '.js';
    send(res, 200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': noCacheExt ? 'no-cache, must-revalidate' : 'public, max-age=3600',
    }, data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`vlijt-werkenbij draait op http://127.0.0.1:${PORT} (noindex: ${NOINDEX})`);
});
