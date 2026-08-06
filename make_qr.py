"""Génère les QR codes du guide (lien direct vers les fiches).

L'accès est protégé par la popup login/mdp sur chaque page.
Si l'utilisateur est déjà déverrouillé sur le téléphone, la fiche s'ouvre
directement.
"""
from pathlib import Path
from urllib.parse import quote

import qrcode
from qrcode.constants import ERROR_CORRECT_M

BASE = "https://jsozeo.github.io/g-4f1e7bf3d2"
OUT = Path("qrcodes")
OUT.mkdir(exist_ok=True)

# Lien direct ; la popup s'affiche seulement si le téléphone n'est pas encore déverrouillé.
TARGETS = {
    "accueil": f"{BASE}/",
    "gestion-dechets": f"{BASE}/notices/gestion-dechets.html",
    "plan-maison": f"{BASE}/notices/plan-maison.html",
    "ouverture-maison": f"{BASE}/notices/ouverture-maison.html",
    "fermeture-maison": f"{BASE}/notices/fermeture-maison.html",
    "gaz": f"{BASE}/notices/gaz.html",
    "poele-bois": f"{BASE}/notices/poele-bois.html",
    "signalements": f"{BASE}/app/index.html",
}

FILL = "#144f64"
BACK = "#ffffff"

for name, url in TARGETS.items():
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=12, border=3)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color=FILL, back_color=BACK)
    out = OUT / f"{name}.png"
    img.save(out)
    print(f"{out}  ->  {url}")
