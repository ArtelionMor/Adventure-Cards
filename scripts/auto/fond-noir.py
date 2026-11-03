# fond-noir.py <dossier-rig> [--erosion 10] [--rallonge 40] [--exclu arme,queue] [--parent corps]
# Refait le calque <parent>-copie (noir sous le corps) : il remplit TOUT l'interieur de la
# silhouette de source.png (erodee de --erosion px) que les calques du dessus laissent ouvert
# (alpha < 230), puis ce remplissage est dilate de --rallonge px (il passe sous les voisins,
# pour couvrir les fentes qui s'ouvrent en rotation) en restant dans la silhouette erodee.
# Pas de noir sous les calques --exclu (objet tenu, queue). Met a jour rig.json (bbox du calque).
import sys, json, os, argparse
import numpy as np, cv2
ap = argparse.ArgumentParser(); ap.add_argument('dossier')
ap.add_argument('--erosion', type=int, default=10); ap.add_argument('--rallonge', type=int, default=40)
ap.add_argument('--exclu', default='arme,queue'); ap.add_argument('--bande', type=int, default=70)  # queue : noir quand meme a moins de --bande px des autres calques (racine)
ap.add_argument('--parent', default='corps')
a = ap.parse_args(); D = a.dossier
rigp = os.path.join(D, 'rig.json'); rig = json.load(open(rigp, encoding='utf-8'))
W, H = rig['source']['largeur'], rig['source']['hauteur']
src = cv2.imread(os.path.join(D, 'source.png'), cv2.IMREAD_UNCHANGED)
S = (src[..., 3] > 128).astype(np.uint8)
ell = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*r+1, 2*r+1))
core = cv2.erode(S, ell(a.erosion))
nom = a.parent + '-copie'
def plan(c):
    im = cv2.imread(os.path.join(D, c['image']), cv2.IMREAD_UNCHANGED); p = np.zeros((H, W), np.uint8)
    h, w = im.shape[:2]; p[c['y']:c['y']+h, c['x']:c['x']+w] = im[..., 3]; return p
cov = np.zeros((H, W), bool); ex = np.zeros((H, W), np.uint8); plans = {}
for c in rig['calques']:
    if c['id'] in ('tout', 'decor', nom): continue
    p = plan(c); plans[c['id']] = p; cov |= p >= 230
for i in a.exclu.split(','):
    if i not in plans: continue
    p = (plans[i] > 0).astype(np.uint8)
    if i != 'arme':  # queue : pas de noir dessous, sauf pres de la racine
        autres = np.zeros((H, W), bool)
        for k, q in plans.items():
            if k != i: autres |= q >= 230
        p &= (1 - cv2.dilate(autres.astype(np.uint8), ell(a.bande)))
    ex |= p
tout = np.zeros((H, W), np.uint8)
decor_plein = np.zeros((H, W), np.uint8)
for c in rig['calques']:
    if c['id'] == 'tout': tout |= (plan(c) > 0).astype(np.uint8)  # l'ombre au sol : pas de noir dessus
    if c['id'] == 'decor':
        p = plan(c); tout |= ((p > 0) & (p < 230)).astype(np.uint8)   # le décor : le noir passe SOUS ses pixels pleins (il est dessiné par-dessus), pas sous ses bords translucides
        decor_plein = (p >= 230).astype(np.uint8)
ex |= cv2.dilate(tout, ell(3))
gaps = ((core > 0) & ~cov).astype(np.uint8)
N = cv2.dilate(gaps, ell(a.rallonge)) & core
# la jonction corps / décor : quand le corps bouge, il découvre la frange entre lui et le décor (les piles) : du noir y reste, sous le décor
corps_plein = np.zeros((H, W), np.uint8)
for k, q_ in plans.items():
    if k != 'decor': corps_plein |= (q_ >= 230).astype(np.uint8)
jonction = cv2.dilate(corps_plein, ell(10)) & cv2.dilate(decor_plein, ell(10)) & S
N |= jonction
N &= (1 - cv2.dilate(ex, ell(2)))
N = cv2.morphologyEx(N, cv2.MORPH_CLOSE, ell(3)) & core & (1 - cv2.dilate(ex, ell(2)))
if not N.any():
    print('rien a combler : pas de noir'); sys.exit(0)   # les calques du dessus ne laissent aucun trou
ys, xs = np.nonzero(N); x0, x1, y0, y1 = xs.min(), xs.max()+1, ys.min(), ys.max()+1
out = np.zeros((y1-y0, x1-x0, 4), np.uint8); out[..., 3] = N[y0:y1, x0:x1] * 255
cv2.imwrite(os.path.join(D, 'calques', nom + '.png'), out)
if not any(c['id'] == nom for c in rig['calques']):   # premiere fois (le lot) : le calque est cree juste au-dessus de « tout », sous tout le reste
    for c in rig['calques']:
        if c.get('ordre', 0) >= 1: c['ordre'] += 1
    rig['calques'].append({'id': nom, 'image': 'calques/' + nom + '.png', 'de': a.parent, 'ordre': 1, 'x': 0, 'y': 0, 'largeur': 1, 'hauteur': 1, 'osPoids': [a.parent]})
for c in rig['calques']:
    if c['id'] == nom:
        c.update(x=int(x0), y=int(y0), largeur=int(x1-x0), hauteur=int(y1-y0)); c.pop('mesh', None)
json.dump(rig, open(rigp, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
rest = ((core > 0) & ~cov & (N == 0) & (ex == 0)).sum()
print('noir px', int(N.sum()), 'bbox', x0, y0, x1-x0, y1-y0, '| interieur non couvert restant', int(rest), '| noir hors core', int((N & (1-core)).sum()))
