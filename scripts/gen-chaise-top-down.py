#!/usr/bin/env python3
"""Dessine la chaise « Top-Down » de la table de jeu (maquette « Playing Table ») : la chaise du FOND, vue de face et de dessus
(l'assise visible, le dossier derriere, en haut a gauche), dans le meme format que les meubles rectifies
(scripts/rectifie-meuble.py) : case de 440 px, le bas de l'image est le coin avant de la case, l'axe de la case au milieu.

Pourquoi un dessin et pas un retournement : la chaise generee montre son dossier cote camera (la « Bottom-Up », la chaise du
devant) ; une chaise de dos retournee reste une chaise de dos. Il faut un AUTRE point de vue. Celui-ci est construit en
isometrique 2:1 avec des boites (pieds, assise, montants, traverses), aux couleurs de la chaise generee, contour noir epais.
Remplacable le jour ou le game designer en genere une (la deposer dans Graphical Assets/Furnitures/).

  python scripts/gen-chaise-top-down.py        -> Graphical Assets/Furnitures/Rectifies/chaise-top-down.png
"""
import os
import numpy as np
import cv2
from PIL import Image, ImageDraw

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SORTIE = os.path.join(RACINE, 'Graphical Assets', 'Furnitures', 'Rectifies', 'chaise-top-down.png')

L = 440                      # largeur de la case, comme `--largeur` de rectifie-meuble.py
SS = 4                       # sur-echantillonnage
HAUT = 340                   # hauteur d'une unite en z (une chaise fait ~1 unite)
CONTOUR = 7                  # epaisseur du contour noir, en px finaux
# Les couleurs de la chaise generee (k-means de chaise.png).
HAUT_C, GAUCHE_C, DROITE_C, REFLET = (231, 139, 68), (172, 102, 44), (125, 70, 23), (245, 179, 123)
BOIS = (HAUT_C, GAUCHE_C, DROITE_C)


def proj(x, y, z):
    """Un point de la case (x vers le bas-droite de l'ecran, y vers le bas-gauche, z vers le haut) -> px, origine = centre de la case."""
    return ((x - y) * L / 2, (x + y - 1) * L / 4 - z * HAUT)


def boite(x0, x1, y0, y1, z0, z1):
    return dict(b=(x0, x1, y0, y1, z0, z1), cle=(x0 + x1 + y0 + y1) / 2 + (z0 + z1) * 0.05)


# La chaise tourne le dos au bord x = 0 (en haut a gauche de l'ecran) et regarde vers +x.
P = 0.11                                   # epaisseur d'un pied
a, b = 0.12, 0.88                          # ou sont les pieds
BOITES = [
    # pieds de devant (cote +x) et de derriere (montants du dossier, jusqu'en haut)
    boite(b - P, b, a, a + P, 0, .44), boite(b - P, b, b - P, b, 0, .44),
    boite(a, a + P, a, a + P, 0, 1.0), boite(a, a + P, b - P, b, 0, 1.0),
    # traverses basses
    boite(b - P, b, a + P, b - P, .12, .19), boite(a, a + P, a + P, b - P, .12, .19), boite(a + P, b - P, a, a + P, .12, .19), boite(a + P, b - P, b - P, b, .12, .19),
    # assise
    boite(a, b, a, b, .44, .53),
    # dossier : deux traverses entre les montants
    boite(a, a + P, a + P, b - P, .84, .97), boite(a, a + P, a + P, b - P, .62, .72),
]


def faces(bx):
    x0, x1, y0, y1, z0, z1 = bx
    # Les trois faces visibles : dessus (z1), gauche-bas (y1), droite-bas (x1).
    return [
        ([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], HAUT_C),
        ([(x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0)], GAUCHE_C),
        ([(x1, y0, z1), (x1, y1, z1), (x1, y1, z0), (x1, y0, z0)], DROITE_C),
    ]


def main():
    W, H = (L + 120) * SS, (L + int(HAUT * 1.2) + 120) * SS
    ox, oy = W // 2, int((HAUT * 1.15 + 60) * SS + L / 4 * SS)       # centre de la case dans la toile
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    def px(p):
        sx, sy = proj(*p)
        return (ox + sx * SS, oy + sy * SS)

    for bo in sorted(BOITES, key=lambda t: t['cle']):
        for pts, col in faces(bo['b']):
            poly = [px(p) for p in pts]
            d.polygon(poly, fill=col + (255,))
            # un reflet clair sur l'arete haute de la face gauche, comme les bords biseautes de la chaise generee
            if col == GAUCHE_C:
                d.line([poly[0], poly[1]], fill=REFLET + (255,), width=3 * SS)
        # le trait sombre entre les faces
        for pts, col in faces(bo['b']):
            poly = [px(p) for p in pts]
            d.line(poly + [poly[0]], fill=(60, 30, 10, 255), width=SS)
    a_ = np.array(img)
    masque = (a_[:, :, 3] > 0).astype(np.uint8)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * CONTOUR * SS + 1, 2 * CONTOUR * SS + 1))
    large = cv2.dilate(masque, k)
    sortie = np.zeros_like(a_)
    sortie[large > 0] = (0, 0, 0, 255)
    sur = a_[:, :, 3] > 0
    sortie[sur] = a_[sur]
    im = Image.fromarray(sortie).resize((W // SS, H // SS), Image.LANCZOS)
    # Recadrage : le bas = le coin avant de la case, l'axe = le milieu.
    ax, ay = ox // SS, oy // SS + L // 4
    al = np.array(im)[:, :, 3]
    ys, xs = np.nonzero(al > 8)
    demi = max(L // 2, ax - xs.min(), xs.max() + 1 - ax)
    y0, y1 = ys.min() - 1, max(ys.max() + 2, ay + 1)
    im = im.crop((ax - demi - 1, y0, ax + demi + 1, y1))
    os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
    im.save(SORTIE)
    print(f'chaise-top-down : {im.width}x{im.height}')


if __name__ == '__main__':
    main()
