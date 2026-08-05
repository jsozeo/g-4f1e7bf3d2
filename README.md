# Guide de la résidence — Messery

Guide pratique numérique de la résidence secondaire à **Messery** (Haute-Savoie).
Objectif : numériser les notes et consignes affichées un peu partout dans la maison
pour les rendre accessibles en ligne, facilement, via un **QR code** depuis un téléphone.

## 🌐 Site en ligne
👉 **https://jsozeo.github.io/guide-residence-messery/**

## 📋 Notices disponibles
| Notice | Page web | Source markdown |
|--------|----------|-----------------|
| Gestion des déchets | [gestion-dechets.html](notices/gestion-dechets.html) | [gestion-dechets.md](notices/gestion-dechets.md) |

## 🗂️ Structure du projet
```
.
├── index.html              # Accueil : liste des notices
├── assets/
│   └── style.css           # Design mobile-first
├── notices/
│   ├── gestion-dechets.html   # Notice (page web)
│   └── gestion-dechets.md     # Notice (markdown)
├── images/
│   ├── gestion-dechets-source.pdf   # PDF/photo d'origine
│   ├── gestion-dechets-source.png   # Photo d'origine (PNG)
│   └── gestion-dechets-photo.jpg    # Version web allégée
├── qrcodes/                # QR codes générés vers le site
└── README.md
```

## ➕ Ajouter une nouvelle notice
1. Prendre en photo la note affichée et l'enregistrer dans `images/`.
2. Créer `notices/ma-notice.html` (sur le modèle de `gestion-dechets.html`) et éventuellement `notices/ma-notice.md`.
3. Ajouter une carte vers cette notice dans `index.html`.
4. Committer et pousser : GitHub Pages met le site à jour automatiquement.
5. (Optionnel) Générer un QR code dédié vers la nouvelle page.

## 📱 QR codes
Les QR codes se trouvent dans `qrcodes/` et pointent vers le site en ligne.
Il suffit de les imprimer et de les afficher dans la maison.
