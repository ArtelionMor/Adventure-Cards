#!/usr/bin/env python3
"""Rectifie un meuble genere dans un gabarit (la « cage » : une case au sol projetee vers le haut) pour le mettre
au format du jeu : cage effacee, fond transparent, case de base redressee en losange 2:1 exact (comme la scene de la
boutique : `BOUTIQUE.scene.case`), verticales droites, recadrage ancre sur le COIN AVANT de la case.

  python scripts/rectifie-meuble.py chaise.png                       -> Graphical Assets/Furnitures/Rectifies/chaise.png
  python scripts/rectifie-meuble.py chaise.png autre.png --sortie dossier --largeur 440
  python scripts/rectifie-meuble.py chaise.png --apercu              -> + un <nom>_apercu.png (la case detectee, le losange cible)
  python scripts/rectifie-meuble.py table.png --sans-cage --base 0,350,620,976,1248,350   (un meuble sans cage : on donne
                                                                       la case a la main : gauche, avant, droite = x,y x3)

Automatique : sans nom d'image, il traite toutes les images de `Graphical Assets/Furnitures/` (hors sous-dossiers) qui sont
nouvelles ou modifiees depuis leur derniere rectification ; `--surveille` reste ouvert et rectifie chaque image des qu'elle
y tombe. Une image deja detouree, sans cage (les tables), est rectifiee aussi : la case se lit sur ses pieds.

Convention de sortie : le losange de la case fait `--largeur` px de large (defaut 440 = 4 x la case du jeu, 110 px) ; le BAS
de l'image est le coin avant de la case, son CENTRE est le centre de la case : le jeu pose deja ses meubles ainsi (bas-centre
de l'image sur le centre de l'emprise). Le meuble peut depasser du losange (dossier, abat-jour) : l'image s'elargit, toujours
symetrique autour de l'axe de la case.
"""
import argparse, os, sys
import numpy as np
import cv2
from PIL import Image

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTREE_DEFAUT = os.path.join(RACINE, 'Graphical Assets', 'Furnitures')
SORTIE_DEFAUT = os.path.join(ENTREE_DEFAUT, 'Rectifies')
EXTENSIONS = ('.png', '.webp')


def charge(chemin):
    im = Image.open(chemin).convert('RGBA')
    return np.array(im)


def couleur_fond(rgba):
    """Le fond du gabarit : la mediane des bords (le coin est parfois mange par la cage)."""
    h, w = rgba.shape[:2]
    bords = np.concatenate([rgba[0, :, :3], rgba[-1, :, :3], rgba[:, 0, :3], rgba[:, -1, :3]])
    return np.median(bords, axis=0)


def masque_cage(rgb, fond):
    """Les traits FINS et noirs (la cage). Le contour du meuble, lui, est epais : une ouverture le garde et enleve la cage."""
    noir = (rgb.max(axis=2) < 70).astype(np.uint8)
    epais = cv2.morphologyEx(noir, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    fin = noir & (1 - epais)
    # Le bord anti-aliase d'un trait n'est pas noir : on elargit un peu.
    return cv2.dilate(fin, np.ones((5, 5), np.uint8))


def detecte_case(masque):
    """(gauche, avant, droite) de la case au sol, d'apres les traits de la cage : coin le plus bas de l'arete verticale gauche,
    point le plus bas, coin le plus bas de l'arete verticale droite."""
    n, etiq, stats, _ = cv2.connectedComponentsWithStats(masque, connectivity=8)
    if n < 2:
        return None
    # Le plus grand composant : la cage (ses traits sont tous relies par les aretes).
    k = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    ys, xs = np.nonzero(etiq == k)
    if xs.max() - xs.min() < 80 or ys.max() - ys.min() < 80:
        return None
    xmin, xmax, ymax = xs.min(), xs.max(), ys.max()
    g = np.nonzero(xs <= xmin + 6)[0]; d = np.nonzero(xs >= xmax - 6)[0]; b = np.nonzero(ys >= ymax - 3)[0]
    gauche = (float(xs[g].mean()), float(ys[g].max()) - 2)
    droite = (float(xs[d].mean()), float(ys[d].max()) - 2)
    avant = (float(xs[b].mean()), float(ymax) - 2)
    return gauche, avant, droite


def case_depuis_silhouette(alpha):
    """Meuble deja detoure, sans cage : la case se lit sur les PIEDS. Gauche = le point le plus bas des colonnes les plus a
    gauche (le pied gauche, pas l'angle du plateau), droite pareil, avant = le point le plus bas de l'image."""
    ys, xs = np.nonzero(alpha > 40)
    if len(xs) == 0:
        return None
    xmin, xmax, ymax = xs.min(), xs.max(), ys.max()
    # Les trois pointes REELLES des pieds : le bas de l'arete verticale la plus a gauche, le bas de celle de droite, le point le
    # plus bas. (Une moyenne sur une bande de colonnes tomberait hors du dessin et deformerait la case.)
    g = np.nonzero(xs <= xmin + 2)[0]; d = np.nonzero(xs >= xmax - 2)[0]; b = np.nonzero(ys >= ymax - 2)[0]
    return ((float(xmin), float(ys[g].max())), (float(xs[b].mean()), float(ymax)), (float(xmax), float(ys[d].max())))


def efface_cage(rgba, masque):
    rgb = np.ascontiguousarray(rgba[:, :, :3])
    return cv2.inpaint(rgb, masque * 255, 3, cv2.INPAINT_TELEA)


def alpha_depuis_fond(rgb, fond, tol=34):
    """Opaque partout sauf ce qui a la couleur du fond (y compris les trous : la fenetre d'un dossier)."""
    d = np.abs(rgb.astype(np.int16) - fond.astype(np.int16)).max(axis=2)
    a = (d > tol).astype(np.uint8)
    # Un point isole (reste de trait) disparait.
    a = cv2.morphologyEx(a, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    return a * 255


def rectifie(rgba, case, largeur, fond=None, sans_cage=False):
    """Retourne (image RGBA rectifiee, infos)."""
    g, a, d = case
    if sans_cage:
        rgb = rgba[:, :, :3]; alpha = rgba[:, :, 3]
    else:
        masque = masque_cage(rgba[:, :, :3], fond)
        rgb = efface_cage(rgba, masque)
        alpha = alpha_depuis_fond(rgb, fond)
    h0, w0 = alpha.shape
    # Case cible : losange 2:1 exact de `largeur` de large, son coin avant en (0, 0).
    L = float(largeur)
    gx, gy = g; ax_, ay_ = a; dx_, dy_ = d
    if not (gx < ax_ < dx_):
        raise SystemExit('la case est mal ordonnee (gauche < avant < droite)')
    sv = L / (dx_ - gx)                               # echelle verticale = echelle horizontale moyenne
    # La deformation est faite COLONNE PAR COLONNE : chaque cote de l'axe est etire en largeur pour que les pieds tombent sur les
    # coins du losange, et chaque colonne glisse en hauteur pour que son pied tombe sur son bord. Les verticales restent verticales.
    def x_vers_cible(x):
        return np.where(x < ax_, (x - ax_) * (L / 2) / (ax_ - gx), (x - ax_) * (L / 2) / (dx_ - ax_))
    def cible_vers_x(xp):
        return np.where(xp < 0, ax_ + xp * (ax_ - gx) / (L / 2), ax_ + xp * (dx_ - ax_) / (L / 2))
    def pied(x):                                      # le sol du dessin : la ligne qui joint les trois pieds
        return np.where(x < ax_, ay_ + (x - ax_) * (gy - ay_) / (gx - ax_), ay_ + (x - ax_) * (dy_ - ay_) / (dx_ - ax_))
    def sol_cible(xp):                                # le sol voulu : les deux bords avant du losange
        return -np.abs(xp) / 2
    # L'etendue de la toile : les bords de l'image, colonne par colonne.
    xs_src = np.linspace(0, w0, 200)
    xp = x_vers_cible(xs_src)
    yp_haut = (0 - pied(xs_src)) * sv + sol_cible(xp)
    yp_bas = (h0 - pied(xs_src)) * sv + sol_cible(xp)
    ox, oy = xp.min() - 4, yp_haut.min() - 4
    W = int(np.ceil(xp.max() - ox + 4)); H = int(np.ceil(yp_bas.max() - oy + 4))
    # Pour chaque pixel de sortie, d'ou il vient dans l'image.
    u, v = np.meshgrid(np.arange(W, dtype=np.float32) + ox, np.arange(H, dtype=np.float32) + oy)
    xsrc = cible_vers_x(u)
    ysrc = pied(xsrc) + (v - sol_cible(u)) / sv
    # Alpha pre-multiplie : pas de liseré clair sur les bords.
    pm = np.dstack([rgb.astype(np.float32) * (alpha[:, :, None] / 255.0), alpha.astype(np.float32)])
    w = cv2.remap(pm, xsrc.astype(np.float32), ysrc.astype(np.float32), cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    w = np.clip(w, 0, 255)
    aw = w[:, :, 3]
    ys, xs = np.nonzero(aw > 8)
    if len(xs) == 0:
        raise SystemExit('rien a garder : tout l\'image a ete prise pour du fond')
    ax, ay = -ox, -oy                      # le coin avant de la case, dans la toile
    bas = max(int(ys.max()) + 1, int(round(ay)))
    demi = max(L / 2, ax - xs.min(), xs.max() + 1 - ax)
    x0, x1 = int(np.floor(ax - demi)) - 1, int(np.ceil(ax + demi)) + 1
    y0 = int(ys.min()) - 1
    # Le bas de l'image = le coin avant de la case (ce qui depasse en dessous, un pied de chaise, reste : le bas descend).
    y1 = bas + 1
    sortie = np.zeros((y1 - y0, x1 - x0, 4), np.float32)
    sy0, sy1 = max(y0, 0), min(y1, H); sx0, sx1 = max(x0, 0), min(x1, W)
    sortie[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = w[sy0:sy1, sx0:sx1]
    a = sortie[:, :, 3:4]
    rgb_out = np.where(a > 0, sortie[:, :, :3] / np.maximum(a, 1) * 255.0, 0)
    out = np.dstack([np.clip(rgb_out, 0, 255), a]).astype(np.uint8)
    infos = {
        'taille': (out.shape[1], out.shape[0]),
        'coin_avant': (ax - x0, ay - y0),            # x, y du coin avant de la case dans l'image
        'case': L,
    }
    return out, infos


def apercu(out, infos):
    """Le meuble sur un fond clair, avec le losange cible : on voit d'un coup d'oeil si les pieds sont dans la case."""
    h, w = out.shape[:2]
    toile = np.full((h, w, 3), 236, np.uint8)
    a = out[:, :, 3:4].astype(np.float32) / 255
    toile = (toile * (1 - a) + out[:, :, :3] * a).astype(np.uint8)
    bx, by = infos['coin_avant']; L = infos['case']
    pts = np.int32([[bx - L / 2, by - L / 4], [bx, by - L / 2], [bx + L / 2, by - L / 4], [bx, by]])
    cv2.polylines(toile, [pts], True, (40, 120, 255), 2, cv2.LINE_AA)
    return toile


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('images', nargs='*', help="sans nom : tout le dossier Furnitures, ce qui est nouveau seulement")
    ap.add_argument('--surveille', action='store_true', help='reste ouvert et traite les images qui arrivent dans le dossier')
    ap.add_argument('--tout', action='store_true', help='refait aussi les images deja rectifiees')
    ap.add_argument('--sortie', default=SORTIE_DEFAUT, help='dossier de sortie')
    ap.add_argument('--largeur', type=float, default=440, help='largeur du losange de la case, en px (defaut 440)')
    ap.add_argument('--apercu', action='store_true', help='ecrit aussi <nom>_apercu.png')
    ap.add_argument('--sans-cage', action='store_true', help="l'image a deja un fond transparent et pas de cage (avec --base)")
    ap.add_argument('--base', help='gx,gy,ax,ay,dx,dy : coins gauche, avant, droit de la case, a la main')
    args = ap.parse_args()
    os.makedirs(args.sortie, exist_ok=True)
    if args.images:
        return sum(traite(c, args) for c in args.images)
    if not args.surveille:
        return sum(traite(c, args) for c in a_faire(args))
    import time
    print(f'Surveille {ENTREE_DEFAUT} (Ctrl+C pour arreter)')
    vus = {}
    while True:
        for c in a_faire(args):
            m = os.path.getmtime(c)
            if vus.get(c) == m:
                continue
            time.sleep(1.0)                      # le fichier finit d'etre ecrit
            vus[c] = os.path.getmtime(c)
            traite(c, args)
        time.sleep(2)


def a_faire(args):
    """Les images du dossier dont la version rectifiee manque ou est plus ancienne."""
    if not os.path.isdir(ENTREE_DEFAUT):
        return []
    res = []
    for f in sorted(os.listdir(ENTREE_DEFAUT)):
        c = os.path.join(ENTREE_DEFAUT, f)
        nom, ext = os.path.splitext(f)
        if not os.path.isfile(c) or ext.lower() not in EXTENSIONS:
            continue
        sortie = os.path.join(args.sortie, nom + '.png')
        if args.tout or not os.path.exists(sortie) or os.path.getmtime(sortie) < os.path.getmtime(c):
            res.append(c)
    return res


def traite(chemin, args):
    """Rectifie une image ; rend 1 si elle echoue, 0 sinon."""
    nom = os.path.splitext(os.path.basename(chemin))[0]
    try:
        rgba = charge(chemin)
        if max(rgba.shape[:2]) < 200:
            print(f'{nom} : trop petite ({rgba.shape[1]}x{rgba.shape[0]}), une reference : laissee telle quelle', file=sys.stderr)
            return 0 if not args.images else 1
        # Deja detoure (fond transparent) : pas de cage a chercher (le noir cache sous le vide passerait pour des traits) ;
        # la case se lit sur les pieds, sauf si on la donne (--base).
        detoure = (rgba[:, :, 3] < 250).mean() > 0.05
        sans_cage = args.sans_cage or detoure
        fond = None if sans_cage else couleur_fond(rgba)
        if args.base:
            v = [float(x) for x in args.base.split(',')]
            case = ((v[0], v[1]), (v[2], v[3]), (v[4], v[5]))
        elif sans_cage:
            case = case_depuis_silhouette(rgba[:, :, 3])
        else:
            case = detecte_case(masque_cage(rgba[:, :, :3], fond))
        if not case:
            print(f'{nom} : pas de case trouvee, laissee telle quelle (donne-la avec --base)', file=sys.stderr)
            return 0 if not args.images else 1
        out, infos = rectifie(rgba, case, args.largeur, fond, sans_cage)
    except Exception as e:                       # une image abimee n'arrete pas les autres
        print(f'{nom} : echec ({e})', file=sys.stderr); return 1
    Image.fromarray(out).save(os.path.join(args.sortie, nom + '.png'))
    if args.apercu:
        Image.fromarray(apercu(out, infos)).save(os.path.join(args.sortie, nom + '_apercu.png'))
    print(f"{nom} : case g={tuple(round(x) for x in case[0])} av={tuple(round(x) for x in case[1])} d={tuple(round(x) for x in case[2])}"
          f" -> {infos['taille'][0]}x{infos['taille'][1]}, coin avant ({infos['coin_avant'][0]:.0f},{infos['coin_avant'][1]:.0f})")
    return 0


if __name__ == '__main__':
    sys.exit(main())
