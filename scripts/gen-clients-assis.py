#!/usr/bin/env python3
"""Les clients ASSIS : reduit les dessins du game designer (`Graphical Assets/Clients/<Nom> Sitted.png`, 928x1232) a la taille des
autres poses (96x128, `<tete>_sit.png`), meme toile pour que les pieds restent ancres en bas. `BOUTIQUE.scene.poseAssise = 'sit'`.
  python scripts/gen-clients-assis.py
"""
import os
import numpy as np
import cv2
from PIL import Image

DOSSIER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'Graphical Assets', 'Clients')
# nom du dessin (casse libre) -> tete du jeu
NOMS = {'ada': 'ada', 'barnaby': 'barnaby', 'boris': 'boris', 'broke': 'brock', 'cipher': 'cipher', 'jenna': 'jenna',
        'richie': 'richie', 'rook': 'rook', 'spike': 'spike', 'timmy': 'timmy'}

# Tous regardent du meme cote (cartes dans la main droite, comme Ada) : ceux dessines de l'autre cote sont retournes.
RETOURNES = {'boris', 'brock', 'cipher', 'richie', 'timmy'}
# Les autres poses ont un contour blanc de 3 a 5 px a 96 px de large (≈ 30 a 50 px ici) : tous en recoivent un, plus gros chez ceux
# qui n'en avaient pas du tout.
SANS_CONTOUR = {'boris', 'brock', 'cipher', 'richie', 'rook', 'spike'}
CONTOUR, CONTOUR_SANS = 30, 40


def contour(im, r):
    a = np.array(im)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
    large = cv2.dilate((a[:, :, 3] > 8).astype(np.uint8), k)
    out = np.zeros_like(a)
    out[large > 0] = (255, 255, 255, 255)
    m = a[:, :, 3] > 0
    al = a[:, :, 3:4] / 255.0
    out[:, :, :3] = np.where(m[:, :, None], a[:, :, :3] * al + out[:, :, :3] * (1 - al), out[:, :, :3])
    return Image.fromarray(out)


for f in sorted(os.listdir(DOSSIER)):
    if not f.lower().endswith(' sitted.png'):
        continue
    tete = NOMS.get(f.lower()[:-len(' sitted.png')])
    if not tete:
        print('inconnu :', f); continue
    im = Image.open(os.path.join(DOSSIER, f)).convert('RGBA')
    im = contour(im, CONTOUR_SANS if tete in SANS_CONTOUR else CONTOUR)
    if tete in RETOURNES:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    im.resize((96, 128), Image.LANCZOS).save(os.path.join(DOSSIER, f'{tete}_sit.png'))
    print(tete)
