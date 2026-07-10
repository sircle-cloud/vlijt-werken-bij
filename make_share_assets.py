#!/usr/bin/env python3
"""Genereert favicons (VLIJT 'V' op olive) + Open Graph share-image voor de werken-bij-site."""
import base64, subprocess, os
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).parent
ASSETS = ROOT / "public" / "assets"
OG_DIR = ASSETS / "og"
OG_DIR.mkdir(parents=True, exist_ok=True)
FONTS = Path.home() / "Library" / "Fonts"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# brand
CREAM      = "#fcfae4"
OLIVE      = "#7f846a"
OLIVE_DEEP = "#5e6450"
INK        = "#181916"
GOLD       = "#C9A24B"

def hx(c): return tuple(int(c[i:i+2], 16) for i in (1, 3, 5))

# ---------- 1) FAVICONS ----------
def rounded_square(size, bg):
    from PIL import ImageDraw
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    r = int(size * 0.22)
    d.rounded_rectangle([0, 0, size-1, size-1], radius=r, fill=bg + (255,))
    return im

def build_favicons():
    bm = Image.open(ASSETS / "vlijt-beeldmerk-cream.png").convert("RGBA")
    # crop the V (left ~46% of the lockup), trim to alpha bbox
    v = bm.crop((0, 0, 540, bm.height))
    v = v.crop(v.split()[3].getbbox())
    bg = hx(OLIVE_DEEP)
    def make(size, pad_ratio=0.24):
        icon = rounded_square(size, bg)
        avail = int(size * (1 - pad_ratio * 2))
        vw, vh = v.size
        sc = min(avail / vw, avail / vh)
        nv = v.resize((max(1, int(vw*sc)), max(1, int(vh*sc))), Image.LANCZOS)
        icon.alpha_composite(nv, ((size - nv.width)//2, (size - nv.height)//2))
        return icon
    make(512).save(ASSETS / "icon-512.png")
    make(180, 0.20).save(ASSETS / "apple-touch-icon.png")
    make(32).save(ASSETS / "favicon-32x32.png")
    make(16, 0.18).save(ASSETS / "favicon-16x16.png")
    ico = make(48)
    ico.save(ROOT / "public" / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print("favicons: favicon.ico, apple-touch-icon.png, favicon-32/16, icon-512")

# ---------- 2) OG IMAGE (1200x630) ----------
def b64(path):
    ext = str(path).split('.')[-1].lower()
    mime = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png"}.get(ext, "png")
    return f"data:image/{mime};base64," + base64.b64encode(Path(path).read_bytes()).decode()

def font_face(name, file, weight, style="normal"):
    p = FONTS / file
    return f"@font-face{{font-family:'{name}';src:url('file://{p}') format('truetype');font-weight:{weight};font-style:{style};}}" if p.exists() else ""

FF = "".join([
    font_face("Poppins", "Poppins-Regular.ttf", 400),
    font_face("Poppins", "Poppins-Medium.ttf", 500),
    font_face("Poppins", "Poppins-SemiBold.ttf", 600),
    font_face("Poppins", "Poppins-Bold.ttf", 700),
    font_face("Poppins", "Poppins-ExtraBold.ttf", 800),
    font_face("Poppins", "Poppins-Black.ttf", 900),
])

def build_og():
    photo = b64(ASSETS / "shoot" / "vlijt-28.jpg")
    logo = b64(ASSETS / "vlijt-beeldmerk-cream.png")
    html = f"""<!doctype html><html><head><meta charset='utf-8'><style>
{FF}
*{{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased;}}
html,body{{width:1200px;height:630px;overflow:hidden;}}
.c{{position:relative;width:1200px;height:630px;font-family:'Poppins',sans-serif;background:{INK};overflow:hidden;}}
.photo{{position:absolute;inset:0;background:url('{photo}') center 22%/cover no-repeat;}}
.grad{{position:absolute;inset:0;background:
  linear-gradient(90deg, rgba(30,35,26,.94) 0%, rgba(38,44,32,.82) 34%, rgba(38,44,32,.28) 62%, rgba(38,44,32,.08) 100%),
  linear-gradient(180deg, rgba(20,25,18,.35) 0%, rgba(20,25,18,0) 30%, rgba(20,25,18,.55) 100%);}}
.logo{{position:absolute;top:56px;left:70px;height:64px;}}
.wrap{{position:absolute;left:70px;bottom:66px;max-width:760px;}}
.eyebrow{{display:flex;align-items:center;gap:14px;font-weight:600;font-size:19px;letter-spacing:3.5px;
  text-transform:uppercase;color:{GOLD};margin-bottom:22px;}}
.eyebrow::before{{content:'';width:44px;height:2px;background:{GOLD};display:block;}}
h1{{font-weight:800;font-size:76px;line-height:.98;letter-spacing:-1.5px;color:{CREAM};text-shadow:0 3px 24px rgba(0,0,0,.4);}}
.sub{{margin-top:22px;font-weight:500;font-size:27px;color:rgba(252,250,228,.94);}}
.url{{position:absolute;right:70px;bottom:66px;font-weight:600;font-size:22px;color:{CREAM};opacity:.9;letter-spacing:.4px;}}
</style></head><body>
<div class='c'>
  <div class='photo'></div>
  <div class='grad'></div>
  <img class='logo' src='{logo}'/>
  <div class='wrap'>
    <div class='eyebrow'>Werken bij VLIJT · Strijp-S, Eindhoven</div>
    <h1>Werken met<br>een glimlach.</h1>
    <div class='sub'>Word onderdeel van een jong, hecht team.</div>
  </div>
  <div class='url'>werken.vlijttandartsen.nl</div>
</div></body></html>"""
    hf = OG_DIR / "_og.html"; hf.write_text(html)
    raw = OG_DIR / "_og_2x.png"
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--force-device-scale-factor=2", "--window-size=1200,630",
        f"--screenshot={raw}", f"file://{hf}"], check=True, capture_output=True)
    im = Image.open(raw).convert("RGB").resize((1200, 630), Image.LANCZOS)
    out = OG_DIR / "og-default.jpg"
    im.save(out, quality=88)
    raw.unlink(missing_ok=True); hf.unlink(missing_ok=True)
    print("og:", out, im.size)

if __name__ == "__main__":
    build_favicons()
    build_og()
    print("klaar.")
