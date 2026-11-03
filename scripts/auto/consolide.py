#!/usr/bin/env python3
"""CONSOLIDE les calques d'un rig que le lot vient d'assembler (retour du game designer sur 12 planches, 29 oct. 2026) :

  1. les ÉCLATS : tout morceau détaché d'un calque (hors du plus gros), plus petit que `--eclat` px ou 3 % du calque, va au calque voisin
     qu'il touche le plus (sinon il disparaît) ;
  2. les CALQUES MINUSCULES (moins de `--mini` % du personnage) fusionnent entièrement dans le calque voisin qu'ils touchent le plus ;
  3. les calques fusionnés disparaissent de rig.json (leur os reste, sans calque) ; les calques changés sont remaillés (rig-maille).

Ne touche jamais `tout`, `decor`, ni les calques `*-copie` (les noirs, refaits après).
   python consolide.py <dossier d'un rig> [--eclat 250] [--mini 1.5] [--node node] [--depot <dossier>]
"""
import argparse, json, os, subprocess, sys
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass
import numpy as np
import cv2

ap = argparse.ArgumentParser()
ap.add_argument("dossier")
ap.add_argument("--eclat", type=int, default=250)
ap.add_argument("--mini", type=float, default=1.5)
ap.add_argument("--contact", type=float, default=0.35, help="part du contour d'un petit calque qui longe un voisin pour que ce soit un morceau de lui")
ap.add_argument("--node", default="node")
ap.add_argument("--depot", default=None)
a = ap.parse_args()
D = a.dossier
rigp = os.path.join(D, "rig.json")
rig = json.load(open(rigp, encoding="utf-8"))
W, H = rig["source"]["largeur"], rig["source"]["hauteur"]
mob = [c for c in rig["calques"] if c["id"] not in ("tout", "decor") and not c["id"].endswith("-copie")]
if len(mob) < 2:
    print("consolide : moins de 2 calques mobiles"); sys.exit(0)

def charge(c):
    im = cv2.imread(os.path.join(D, c["image"]), cv2.IMREAD_UNCHANGED)
    if im.shape[2] == 3:
        im = np.dstack([im, np.full(im.shape[:2], 255, np.uint8)])
    pl = np.zeros((H, W, 4), np.uint8)
    h, w = im.shape[:2]
    y0, x0 = c["y"], c["x"]
    pl[y0:y0 + h, x0:x0 + w] = im[:H - y0, :W - x0] if (y0 + h > H or x0 + w > W) else im
    return pl

P = {c["id"]: charge(c) for c in mob}
changes = set()
noyau = np.ones((3, 3), np.uint8)

def touche(masque, autres, r=7):
    """le calque (parmi `autres`) dont l'alpha recoupe le plus le masque dilaté de r px"""
    d = cv2.dilate(masque.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)))
    best, bn = None, 0
    for k in autres:
        n = int(((P[k][..., 3] > 128) & (d > 0)).sum())
        if n > bn:
            best, bn = k, n
    return best

def verse(src, masque, dest):
    """déplace les pixels `masque` de src vers dest (sans écraser un pixel déjà occupé de dest)"""
    pixels = P[src].copy()
    libre = P[dest][..., 3] == 0
    prend = masque & libre
    P[dest][prend] = pixels[prend]
    P[src][masque] = 0
    changes.add(src); changes.add(dest)

# 1. les éclats
n_eclats = 0
for k in list(P):
    al = (P[k][..., 3] > 128).astype(np.uint8)
    n, comp, stats, _ = cv2.connectedComponentsWithStats(al, connectivity=8)
    if n < 3:
        continue
    gros = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    aire_k = int(al.sum())
    for i in range(1, n):
        if i == gros:
            continue
        aire = int(stats[i, cv2.CC_STAT_AREA])
        if aire < max(a.eclat, 0.03 * aire_k):
            m = comp == i
            dest = touche(m, [x for x in P if x != k])
            if dest:
                verse(k, m, dest)
            else:
                P[k][m] = 0; changes.add(k)
            n_eclats += 1

# 2. les calques minuscules
total = sum(int((P[k][..., 3] > 128).sum()) for k in P) or 1
supprimes = []
for k in sorted(P, key=lambda x: (P[x][..., 3] > 128).sum()):
    aire = int((P[k][..., 3] > 128).sum())
    if len(P) - len(supprimes) <= 2:
        break
    if aire < a.mini / 100 * total:
        autres = [x for x in P if x != k and x not in supprimes]
        m = P[k][..., 3] > 0
        dest = touche(m, autres, r=14) if aire else None
        if dest:
            verse(k, m, dest)
        supprimes.append(k)

# 2 bis. les pièces d'un même objet : un petit calque (< 8 % du personnage) dont une grande part du CONTOUR touche un seul voisin n'est pas
#        une partie à part, c'est un morceau de ce voisin (la tête d'un marteau et le bras qui le tient, une pancarte et son poteau)
def contact(k, autres):
    m = (P[k][..., 3] > 128).astype(np.uint8)
    bord = m - cv2.erode(m, noyau)
    nb = int(bord.sum()) or 1
    ring = cv2.dilate(bord, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    meilleur, r = None, 0.0
    for x in autres:
        n = int(((P[x][..., 3] > 128) & (ring > 0)).sum())
        # part du contour de k qui longe x
        c = int(((cv2.dilate((P[x][..., 3] > 128).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))) > 0) & (bord > 0)).sum()) / nb
        if c > r:
            meilleur, r = x, c
    return meilleur, r
fusion_contact = []
for k in sorted(P, key=lambda x: (P[x][..., 3] > 128).sum()):
    if k in supprimes or len(P) - len(supprimes) <= 2:
        continue
    aire = int((P[k][..., 3] > 128).sum())
    if aire >= 0.08 * total or k.startswith(("oreille", "tete", "corps")):
        continue
    autres = [x for x in P if x != k and x not in supprimes]
    dest, r = contact(k, autres)
    if dest and r >= a.contact:
        verse(k, P[k][..., 3] > 0, dest)
        supprimes.append(k); fusion_contact.append(k + "->" + dest)

# écriture
def ecrit(c, pl):
    ys, xs = np.nonzero(pl[..., 3] > 0)
    if len(xs) == 0:
        return False
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
    cv2.imwrite(os.path.join(D, c["image"]), pl[y0:y1, x0:x1])
    c.update(x=x0, y=y0, largeur=x1 - x0, hauteur=y1 - y0)
    return True

garde = []
rem = []
for c in rig["calques"]:
    k = c["id"]
    if k in supprimes:
        continue
    if k in P and k in changes:
        if not ecrit(c, P[k]):
            continue
        c.pop("mesh", None)
        rem.append(k)
    garde.append(c)
rig["calques"] = garde
json.dump(rig, open(rigp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
# remaillage des calques changés
depot = a.depot or os.path.abspath(os.path.join(D, "..", "..", "..", ".."))
mail = os.path.join(depot, "scripts", "rig-maille.mjs")
for k in rem:
    r = subprocess.run([a.node, mail, os.path.basename(D.rstrip("/\\")), "--calque", k, "--pas", "14", "--forcer"] + (["--depot", depot] if False else []),
                       capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=depot)
# rig-maille répartit les poids entre TOUS les os (le fondu qui bridait les clips) : un calque remaillé ne suit que SON os (même nom), comme rig-auto --flou 0
rig = json.load(open(rigp, encoding="utf-8"))
os_ids = {o["id"] for o in rig.get("os", [])}
for c in rig["calques"]:
    if c["id"] in rem and c["id"] in os_ids and c.get("mesh"):
        c["mesh"]["poids"] = [[c["id"], 1] for _ in range(len(c["mesh"]["sommets"]) // 2)]
        c["mesh"]["poidsManuels"] = True
json.dump(rig, open(rigp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("consolide : %d éclat(s) reversé(s), %d calque(s) fusionné(s) (%s), %d remaillé(s)" % (n_eclats, len(supprimes), ", ".join(supprimes) + (" ; contact : " + ", ".join(fusion_contact) if fusion_contact else ""), len(rem)))
