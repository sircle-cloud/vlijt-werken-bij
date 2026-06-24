# Werken bij VLIJT — werken.vlijttandartsen.nl

Employer-branding landingssite voor VLIJT Tandartsen (Strijp-S, Eindhoven).
Concept: **Werken met een glimlach**. Premium licht thema, Poppins, GSAP-scrollanimaties, mobiel-first met hamburgermenu.

Door [Sircle Agency](https://sircle.agency).

## Structuur

```
public/                 statische site (wordt door GitHub Pages geserveerd)
  index.html            homepage
  team/  faq/           team- en FAQ-pagina
  tandartsassistent/    vacaturepagina's (gegenereerd)
  mondhygienist/
  preventie-assistent/
  assets/               brand.css, menu.css, menu.js, beeld, video
server.js               Node-server + sollicitatie-endpoint (voor VPS-deploy)
build_vacatures.py      genereert de 3 vacaturepagina's uit 1 template
relativize_paths.py     zet absolute paden relatief (Pages werkt op project-URL)
```

## Lokaal draaien

```bash
npm install
node server.js          # http://localhost:3008
```

## Hosting

- **Preview**: GitHub Pages (deze repo), automatisch via `.github/workflows/pages.yml`. `noindex` tot livegang.
- **Productie**: `werken.vlijttandartsen.nl` via Node-server + Cloudflare Tunnel (sollicitatieformulier met CV-upload werkt daar wél).

Op GitHub Pages is er geen backend: het sollicitatieformulier toont dan het bedankt-scherm als demo.
