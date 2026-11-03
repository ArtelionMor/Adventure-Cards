#!/usr/bin/env python3
"""Le dernier passage du lot sur un rig tout juste assemblé (rig-auto.mjs) :

  1. Le DÉCOR (parties « decor_… » : les piles de crânes de la Baronne) devient un calque `decor`, rigide sur l'os `fond` (immobile) ;
     « tout » est vidé (rig-auto y laissait aussi des lambeaux du personnage, comblement provisoire, qui dépassent dès qu'il glisse).
  2. Un FOND NOIR PAR CHOSE QUI BOUGE (règle 2 du game designer : en cas de doute du noir, dans un calque séparé, loin du bord) :
     `corps-copie` (`fond-noir.py`) et `tete-copie` (la tête rétrécie), mailles par `rig-maille.mjs`.
  3. Les POIDS : le bas du corps est RATTACHÉ AU SOL (os `fond`) : le corps et son noir ne sont tirés que par `corps` et `fond`, le haut par
     `corps`, le bas (la robe) par `fond`, avec un fondu. Sans ça, les os n'ont que deux os à se partager et la robe flotte.
     (Décision du game designer, 28 oct. 2026, d'après sa correction à la main de la Baronne.)

  python finit.py <id> --sortie <dossier de la découpe> [--depot ...]
"""
import argparse, json, os, subprocess, sys
import numpy as np
import cv2

ap = argparse.ArgumentParser()
ap.add_argument("id")
ap.add_argument("--sortie", required=True)
ap.add_argument("--depot", default=r"C:\Users\telia\Adventure-Cards")
ap.add_argument("--node", default="node")
a = ap.parse_args()
D = os.path.join(a.depot, "game", "data", "rigs", a.id)
rigp = os.path.join(D, "rig.json")
rig = json.load(open(rigp, encoding="utf-8"))


def sauve():
    json.dump(rig, open(rigp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

def calque(i):
    return next((c for c in rig["calques"] if c["id"] == i), None)

def monte_ordre(a_partir):
    for c in rig["calques"]:
        if c.get("ordre", 0) >= a_partir:
            c["ordre"] += 1

# 0. la consolidation : éclats et calques minuscules (retour du game designer, 29 oct. 2026), avant tout le reste
rc = subprocess.run([sys.executable, os.path.join(a.depot, "scripts", "auto", "consolide.py"), D, "--node", a.node, "--depot", a.depot], capture_output=True, text=True, encoding="utf-8", errors="replace")
print((rc.stdout + rc.stderr).strip()[-220:])
rig = json.load(open(rigp, encoding="utf-8"))

# 1. le décor : un calque rigide sur « fond », « tout » vidé
try:
    parties = json.loads(open(os.path.join(a.sortie, "parties.json"), "rb").read().decode("utf-8", "replace"))
    noms = [q["nom"] for q in parties["parties"]]
    deco = [z + 1 for z, n in enumerate(noms) if n.startswith("decor")]
    lab = cv2.imread(os.path.join(a.sortie, "etiquettes.png"), cv2.IMREAD_UNCHANGED)
except Exception:
    deco, lab = [], None
tout = calque("tout")
a_decor = False
if deco and lab is not None and tout is not None:
    chemin = os.path.join(D, tout["image"])
    im = cv2.imread(chemin, cv2.IMREAD_UNCHANGED)
    garde = cv2.dilate(np.isin(lab, deco).astype(np.uint8), np.ones((3, 3), np.uint8))
    if garde.shape == im.shape[:2]:
        dec = im.copy(); dec[garde == 0, 3] = 0
        ys, xs = np.nonzero(dec[..., 3] > 0)
        if len(xs):
            x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
            cv2.imwrite(os.path.join(D, "calques", "decor.png"), dec[y0:y1, x0:x1])
            if not calque("decor"):
                monte_ordre(1)
                rig["calques"].append({"id": "decor", "image": "calques/decor.png", "de": "tout", "ordre": 1, "x": x0, "y": y0, "largeur": x1 - x0, "hauteur": y1 - y0, "os": "fond"})
            im[..., 3] = 0                                   # « tout » : plus rien dedans
            cv2.imwrite(chemin, im)
            tout["zones"] = []
            a_decor = True
            sauve()
            print("decor : %d px sur « fond », « tout » vidé" % int((dec[..., 3] > 0).sum()))

# 2. un fond noir par chose qui bouge
corps = next((c["id"] for c in rig["calques"] if c["id"] in ("corps", "torse")), None)
if corps:
    r = subprocess.run([sys.executable, os.path.join(a.depot, "scripts", "auto", "fond-noir.py"), D, "--parent", corps, "--exclu", "arme,queue"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    print((r.stdout + r.stderr).strip()[-300:])
    rig = json.load(open(rigp, encoding="utf-8"))
tete = calque("tete")
if tete and not calque("tete-copie"):
    im = cv2.imread(os.path.join(D, tete["image"]), cv2.IMREAD_UNCHANGED)
    al = (im[..., 3] > 128).astype(np.uint8)
    noyau = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (29, 29))
    n = cv2.erode(al, noyau)                                  # loin du bord (14 px) : le noir ne se voit pas en rotation
    ys, xs = np.nonzero(n)
    if len(xs):
        x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
        out = np.zeros((y1 - y0, x1 - x0, 4), np.uint8); out[..., 3] = n[y0:y1, x0:x1] * 255
        cv2.imwrite(os.path.join(D, "calques", "tete-copie.png"), out)
        monte_ordre(tete["ordre"])                              # sous la tête, au-dessus du reste
        rig["calques"].append({"id": "tete-copie", "image": "calques/tete-copie.png", "de": "tete", "ordre": tete["ordre"] - 1, "x": tete["x"] + x0, "y": tete["y"] + y0, "largeur": x1 - x0, "hauteur": y1 - y0, "osPoids": ["tete"]})
        sauve()
for c in ("corps-copie", "tete-copie"):
    if calque(c):
        r2 = subprocess.run([a.node, os.path.join(a.depot, "scripts", "rig-maille.mjs"), a.id, "--calque", c, "--pas", "14", "--forcer"],
                            capture_output=True, text=True, encoding="utf-8", errors="replace")
        print((r2.stdout + r2.stderr).strip()[-160:])
rig = json.load(open(rigp, encoding="utf-8"))

# 3. le bas du corps tenu par le sol (os « fond ») quand il y a un décor
def lisse(u):
    u = max(0.0, min(1.0, u)); return u * u * (3 - 2 * u)
a_pin = a_decor and any(n.startswith("decor_") for n in noms)   # seules les PILES (decor_gauche…) tiennent le bas du corps ; un simple « decor » (sol, ombre) n'y touche pas
if a_pin and corps:
    for nom in (corps, corps + "-copie"):
        c = calque(nom)
        if not c or not c.get("mesh"):
            continue
        S = c["mesh"]["sommets"]; ys = S[1::2]
        haut, bas = min(ys), max(ys); h = max(1, bas - haut)
        c["osPoids"] = [corps, "fond"]
        poids = []
        for k in range(len(ys)):
            f = lisse((ys[k] - haut) / h)                              # 0 en haut (suit le corps), 1 au bas de la robe (tenu par le sol) : un fondu sur TOUTE la hauteur, plus large = moins d'étirement
            w = [(corps, 1 - f), ("fond", f)]
            poids.append([x for kk, v in w if v > 0.01 for x in (kk, round(v, 3))])
        c["mesh"]["poids"] = poids; c["mesh"]["poidsManuels"] = True
    tc = calque("tete")
    if tc:
        tc["osPoids"] = ["tete", corps]
    sauve()
    print("poids : le bas de « %s » est tenu par fond" % corps)
    # les clips d'un personnage posé sur un décor : le sol ne bouge presque plus (le bas est tenu), le haut oscille (corps et tête tournent
    # plus), puis on re-calme (le validateur dit jusqu'où)
    cl = json.load(open(os.path.join(D, "clips.json"), encoding="utf-8"))
    for nom, c in cl["clips"].items():
        for os_, fa in (("sol", 0.25), (corps, 2.5), ("tete", 1.6)):
            for keys in (c.get("pistes", {}).get(os_) or {}).values():
                for k in keys:
                    k["v"] = round(k["v"] * fa, 3)
        for m in c.get("procedural", []):
            if m["os"] in (corps, "tete"):
                m["amplitude"] = round(m["amplitude"] * 1.6, 3)
    json.dump(cl, open(os.path.join(D, "clips.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)

# le re-calme des clips pour TOUS les rigs (les poids ont changé après rig-auto : décor, fonds noirs) : la plus grande amplitude acceptée
r4 = subprocess.run([a.node, os.path.join(a.depot, "scripts", "auto", "calme.mjs"), a.id, "--depot", a.depot], capture_output=True, text=True, encoding="utf-8", errors="replace")
print((r4.stdout + r4.stderr).strip()[-200:])
