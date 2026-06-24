#!/usr/bin/env python3
"""Maakt absolute paden (/assets, /team, ...) relatief, zodat de site werkt op
een GitHub Pages project-URL (sircle-cloud.github.io/<repo>/) EN op de Node-server.

- index.html        -> diepte 0 (prefix '')
- team/, faq/       -> diepte 1 (prefix '../')

De 3 vacaturepagina's worden door build_vacatures.py al relatief gegenereerd
en hoeven hier niet langs. Het script is idempotent: een tweede run doet niets.

Draaien: python3 relativize_paths.py
"""
from pathlib import Path

ROOT = Path(__file__).parent
PUBLIC = ROOT / "public"

# (pad, diepte)
TARGETS = [
    ("index.html", 0),
    ("team/index.html", 1),
    ("faq/index.html", 1),
]

def relativize(html: str, depth: int) -> str:
    prefix = "../" * depth
    # attribuut-waarden die met / beginnen -> relatief
    html = html.replace('="/', '="' + prefix)
    # css url() varianten
    html = html.replace("url('/", "url('" + prefix)
    html = html.replace('url("/', 'url("' + prefix)
    html = html.replace("url(/", "url(" + prefix)
    # lege home-href netjes maken (diepte 0: href="/" werd href="")
    html = html.replace('href=""', 'href="./"')
    return html

def patch_static_form(html: str) -> str:
    """Op GitHub Pages is er geen backend; laat het formulier dan netjes het
    bedankt-scherm tonen (demo) i.p.v. een foutmelding."""
    old = ("}catch(err){ btn.disabled=false; btn.textContent='Verstuur sollicitatie'; "
           "alert('Versturen lukte niet: '+(err.message||'')+'\\nProbeer opnieuw of mail naar info@vlijttandartsen.nl'); }")
    new = ("}catch(err){ if(location.hostname.indexOf('github.io')>-1){ f.style.display='none'; "
           "document.getElementById('form-ok').style.display='block'; return; } "
           "btn.disabled=false; btn.textContent='Verstuur sollicitatie'; "
           "alert('Versturen lukte niet: '+(err.message||'')+'\\nProbeer opnieuw of mail naar info@vlijttandartsen.nl'); }")
    return html.replace(old, new)

for rel, depth in TARGETS:
    p = PUBLIC / rel
    txt = p.read_text(encoding="utf-8")
    out = relativize(txt, depth)
    if rel == "index.html":
        out = patch_static_form(out)
    if out != txt:
        p.write_text(out, encoding="utf-8")
        print(f"bijgewerkt: public/{rel} (diepte {depth})")
    else:
        print(f"ongewijzigd: public/{rel}")

print("klaar.")
