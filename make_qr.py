"""Génère les QR codes du guide.

Chaque QR pointe vers la page d'auth en emportant la fiche cible (deep link) :
  /auth/login.html?next=/notices/….html

Si l'utilisateur est déjà connecté sur ce téléphone, la page d'auth le
renvoie immédiatement vers la fiche — sans nouvel email.
"""
from pathlib import Path

import qrcode
from qrcode.constants import ERROR_CORRECT_M

BASE = "https://jsozeo.github.io/g-4f1e7bf3d2"
OUT = Path("qrcodes")
OUT.mkdir(exist_ok=True)

# Cible = chemin interne (deep link). Le QR encode toujours /auth/login.html?next=…
TARGETS = {
    "accueil": "/index.html",
    "gestion-dechets": "/notices/gestion-dechets.html",
    "plan-maison": "/notices/plan-maison.html",
    "ouverture-maison": "/notices/ouverture-maison.html",
    "fermeture-maison": "/notices/fermeture-maison.html",
    "gaz": "/notices/gaz.html",
    "poele-bois": "/notices/poele-bois.html",
    "signalements": "/app/index.html",
}

FILL = "#144f64"
BACK = "#ffffff"


def auth_url(next_path: str) -> str:
    return f"{BASE}/auth/login.html?next={next_path}"


for name, next_path in TARGETS.items():
    url = auth_url(next_path)
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=12, border=3)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color=FILL, back_color=BACK)
    out = OUT / f"{name}.png"
    img.save(out)
    print(f"{out}  ->  {url}")
