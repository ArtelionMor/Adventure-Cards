#!/usr/bin/env python3
"""La chaise du devant en DEUX CALQUES, pour y asseoir un client ENTRE eux : l'assise et ses pieds (`Front Of the Chair.png`, a (0, 24)
dans `Chair.png`) sont dessines DERRIERE lui, le dossier (`Back Of the Chair.png`, a (133, 0)) DEVANT lui, comme dans le dessin du
game designer (le client est assis sur le siege, le dossier lui passe devant le cote). Les deux passent par la MEME rectification
(case lue sur la chaise entiere, `rectifie-meuble.py`) et le meme cadre : ils se superposent a l'identique.
  python scripts/rectifie-chaise-calques.py  -> Rectifies/chaise.png (entiere), chaise-assise.png (derriere), chaise-dossier.png (devant)
"""
import importlib.util
import os
import numpy as np
from PIL import Image

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOSSIER = os.path.join(RACINE, 'Graphical Assets', 'Furnitures')
SORTIE = os.path.join(DOSSIER, 'Rectifies')
spec = importlib.util.spec_from_file_location('rectifie_meuble', os.path.join(RACINE, 'scripts', 'rectifie-meuble.py'))
rm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rm)

entiere = np.array(Image.open(os.path.join(DOSSIER, 'Chair.png')).convert('RGBA'))
# Les trois pieds a la main : la lecture automatique prend le coin gauche de l'assise pour un pied (la colonne la plus a gauche
# n'a que son trait) et deforme alors l'assise. Les pointes des pieds (gauche, devant, droite) de `Chair.png` :
case = ((51, 568), (211, 660), (367, 567))
H, W = entiere.shape[:2]


def sur_la_toile(nom, x, y):
    t = np.array(Image.open(os.path.join(DOSSIER, nom)).convert('RGBA'))
    toile = np.zeros_like(entiere)
    toile[y:y + t.shape[0], x:x + t.shape[1]] = t
    return toile


os.makedirs(SORTIE, exist_ok=True)
# La chaise entiere donne le cadre ; chaque calque y est recolle par son coin avant (rectifie() rogne chaque image sur son contenu),
# pour que les trois aient la meme taille et le meme point d'ancrage.
entiere_out, info_e = rm.rectifie(entiere, case, 440, None, True)
ex, ey = (int(round(v)) for v in info_e['coin_avant'])
Image.fromarray(entiere_out).save(os.path.join(SORTIE, 'chaise.png'))
print('chaise', info_e['taille'])
for nom, img in (('chaise-assise', sur_la_toile('Front Of the Chair.png', 0, 24)), ('chaise-dossier', sur_la_toile('Back Of the Chair.png', 133, 0))):
    out, infos = rm.rectifie(img, case, 440, None, True)
    cx, cy = (int(round(v)) for v in infos['coin_avant'])
    cadre = np.zeros_like(entiere_out)
    dx, dy = ex - cx, ey - cy
    h, w = out.shape[:2]
    hh, ww = min(h, cadre.shape[0] - dy), min(w, cadre.shape[1] - dx)
    cadre[dy:dy + hh, dx:dx + ww] = out[:hh, :ww]
    Image.fromarray(cadre).save(os.path.join(SORTIE, nom + '.png'))
    print(nom, cadre.shape[1], cadre.shape[0])
