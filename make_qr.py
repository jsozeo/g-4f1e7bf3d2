"""Génère les QR codes du guide de la résidence vers le site en ligne."""
import qrcode
from qrcode.constants import ERROR_CORRECT_M

BASE = "https://jsozeo.github.io/g-4f1e7bf3d2"

TARGETS = {
    "accueil": f"{BASE}/",
    "gestion-dechets": f"{BASE}/notices/gestion-dechets.html",
}

FILL = "#144f64"
BACK = "#ffffff"

for name, url in TARGETS.items():
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=12, border=3)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color=FILL, back_color=BACK)
    out = f"qrcodes/{name}.png"
    img.save(out)
    print(f"{out}  ->  {url}")
