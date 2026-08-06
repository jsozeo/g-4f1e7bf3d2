#!/usr/bin/env python3
"""Convertit les PDF de `images/` en images web legeres, une par page.

Les PDF sources sont des photos : lourds (~10 Mo/page) et hors depot git.
Ce script produit deux jeux d'images :
  - images/web/<slug>-pN.jpg : publie sur le site (~1500 px, compresse)
  - .work/<slug>-pN.jpg      : copie haute definition, locale, pour relecture
"""

import re
import unicodedata
from io import BytesIO
from pathlib import Path

import fitz
from PIL import Image

RACINE = Path(__file__).parent
SOURCES = RACINE / "images"
WEB = SOURCES / "web"
TRAVAIL = RACINE / ".work"

# Deja publie par la premiere notice, inutile de le reconvertir.
IGNORES = {"gestion-dechets-source.pdf"}

LARGEUR_WEB, QUALITE_WEB = 1500, 78
LARGEUR_HD, QUALITE_HD = 2200, 88


def slug(nom: str) -> str:
    sans_accent = unicodedata.normalize("NFKD", nom).encode("ascii", "ignore").decode()
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", sans_accent.lower())).strip("-")


def enregistrer(pixmap, destination: Path, largeur: int, qualite: int) -> int:
    image = Image.open(BytesIO(pixmap.tobytes("png"))).convert("RGB")
    if image.width > largeur:
        hauteur = round(image.height * largeur / image.width)
        image = image.resize((largeur, hauteur), Image.LANCZOS)
    image.save(destination, "JPEG", quality=qualite, optimize=True, progressive=True)
    return destination.stat().st_size


def main() -> None:
    WEB.mkdir(parents=True, exist_ok=True)
    TRAVAIL.mkdir(parents=True, exist_ok=True)
    total = 0

    for pdf in sorted(SOURCES.glob("*.pdf")):
        if pdf.name in IGNORES:
            continue
        identifiant = slug(pdf.stem)
        document = fitz.open(pdf)

        for numero, page in enumerate(document, start=1):
            # Rendu unique en haute definition, puis reduction pour le web.
            zoom = LARGEUR_HD / page.rect.width
            pixmap = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
            nom = f"{identifiant}-p{numero}.jpg"
            enregistrer(pixmap, TRAVAIL / nom, LARGEUR_HD, QUALITE_HD)
            poids = enregistrer(pixmap, WEB / nom, LARGEUR_WEB, QUALITE_WEB)
            total += poids
            print(f"  {nom:<52} {poids // 1024:>5} Ko")

        document.close()

    print(f"\nTotal publie : {total / 1_048_576:.1f} Mo dans {WEB.relative_to(RACINE)}/")


if __name__ == "__main__":
    main()
