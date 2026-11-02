#!/usr/bin/env python3
"""Decoupe l'animation d'un duel de cartes (`Graphical Assets/Furnitures/Duel Animation/1.png` … `N.png`, 2305 x 2180, les cartes
posees au milieu d'un grand vide transparent) autour des cartes : une SEULE boite pour toutes les images (celle qui contient
l'union de leur contenu), pour qu'elles restent alignees entre elles, en WebP sans perte dans `game/vignettes/Duel/N.webp`.
Un decodage de 2305 x 2180 x 7 pesait ~140 Mo en memoire ; la boite en fait ~1,5 Mo.

  python scripts/gen-duel-frames.py
"""
import glob, os, re
from PIL import Image

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTREE = os.path.join(RACINE, 'Graphical Assets', 'Furnitures', 'Duel Animation')
SORTIE = os.path.join(RACINE, 'game', 'vignettes', 'Duel')

fichiers = sorted(glob.glob(os.path.join(ENTREE, '*.png')), key=lambda f: int(re.sub(r'\D', '', os.path.basename(f)) or 0))
images = [Image.open(f).convert('RGBA') for f in fichiers]
boites = [im.getbbox() for im in images if im.getbbox()]
x0, y0 = min(b[0] for b in boites), min(b[1] for b in boites)
x1, y1 = max(b[2] for b in boites), max(b[3] for b in boites)
os.makedirs(SORTIE, exist_ok=True)
for i, im in enumerate(images, 1):
    im.crop((x0, y0, x1, y1)).save(os.path.join(SORTIE, f'{i}.webp'), lossless=True)
print(f'{len(images)} images, boite ({x0}, {y0}, {x1}, {y1}) = {x1 - x0} x {y1 - y0}')
