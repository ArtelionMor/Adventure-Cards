#!/usr/bin/env python3
"""DECOUPE AUTOMATIQUE d'un personnage : SAM 2 trouve les regions, un modele de vision (Ollama) les range en parties,
chaque partie s'etend sur le personnage entier. Le meme enchainement que la fenetre « Decoupe auto » de l'Atelier
(builder/rig/sam.js), sans personne devant l'ecran. Sortie : un dossier avec etiquettes.png (un niveau de gris par
partie : 0 = aucune, k = la k-ieme partie), parties.json (qui est quoi, les chiffres) et apercu.png (a regarder).
L'assemblage en rig (calques, os, clips) est fait ensuite par scripts/rig-auto.mjs.

  python decoupe.py --source <source.png> --sortie <dossier> --parties "tete, corps, queue" \
         [--sam http://127.0.0.1:7340] [--ia http://100.119.195.112:11434] [--modele qwen3.5:27b] [--points 64]

Sans dependance hors numpy et Pillow (l'environnement SAM les a). Code de sortie 0 = fait ; 1 = echec (le message dit
pourquoi : SAM injoignable, l'IA n'a rien range, JSON illisible apres deux essais…).
"""
import argparse, base64, colorsys, io, json, os, re, sys, time, urllib.request
import numpy as np
from PIL import Image, ImageDraw, ImageFont

COULEURS = [(255, 80, 80), (80, 160, 255), (255, 200, 40), (90, 220, 120), (200, 110, 255), (255, 140, 60),
            (60, 220, 220), (255, 100, 190), (150, 150, 150), (120, 80, 40), (0, 120, 80), (160, 0, 60)]


def http(url, donnees=None, delai=900, entetes=None):
    req = urllib.request.Request(url, data=donnees, headers=entetes or {})
    return urllib.request.urlopen(req, timeout=delai)


def regions_sam(png, sam, points):
    rep = json.load(http("%s/segmente?points=%d" % (sam, points), png, delai=1800))
    W, H = rep["largeur"], rep["hauteur"]
    regions = []
    for r in rep["masques"]:
        m = np.array(Image.open(io.BytesIO(base64.b64decode(r["png"]))).convert("L")) > 127
        plein = np.zeros((H, W), bool)
        plein[r["y"]:r["y"] + r["h"], r["x"]:r["x"] + r["w"]] = m
        regions.append((r["id"], int(r["aire"]), plein))
    return W, H, regions


def hsl(h, s, l):
    r, g, b = colorsys.hls_to_rgb(h / 360, l / 100, s / 100)
    return np.array([r, g, b]) * 255


def numerote(im, regions):
    """Le personnage, ses regions colorees et leur numero (comme apercuNumerote de builder/rig/sam.js)."""
    W, H = im.size
    fond = Image.new("RGBA", im.size, (255, 255, 255, 255)); fond.alpha_composite(im)
    base = np.array(fond.convert("RGB")).astype(np.float32)
    over = base.copy()
    for rid, aire, m in sorted(regions, key=lambda x: -x[1]):
        over[m] = over[m] * 0.45 + hsl((rid * 67) % 360, 85, 55) * 0.55
    num = Image.fromarray(over.astype(np.uint8))
    d = ImageDraw.Draw(num)
    try:
        police = ImageFont.truetype("arialbd.ttf", max(14, W // 50))
    except Exception:
        police = ImageFont.load_default()
    for rid, aire, m in regions:
        ys, xs = np.where(m)
        if not len(xs):
            continue
        k = np.argmin((xs - xs.mean()) ** 2 + (ys - ys.mean()) ** 2)
        d.text((int(xs[k]), int(ys[k])), str(rid), fill=(255, 255, 255), font=police, anchor="mm", stroke_width=3, stroke_fill=(0, 0, 0))
    buf = io.BytesIO(); num.save(buf, "PNG")
    return base64.b64encode(buf.getvalue()).decode(), base


def lis_json(texte):
    t = re.sub(r"```(?:json)?", "", texte)
    a, b = t.find("{"), t.rfind("}")
    if a < 0 or b <= a:
        raise ValueError("reponse sans JSON : " + t[:120])
    brut = json.loads(t[a:b + 1])
    out = {}
    for nom, ids in brut.items():
        liste = []
        for x in (ids if isinstance(ids, list) else []):
            try:
                liste.append(int(x))
            except Exception:
                pass
        if liste:
            out[str(nom).strip()] = sorted(set(liste))
    if not out:
        raise ValueError("l'IA n'a range aucune region")
    return out


def demande_ia(ia, modele, image_b64, parties):
    consigne = ("Cette image montre un personnage de jeu découpé en régions colorées NUMÉROTÉES. "
                "Pour chaque partie ci-dessous, donne la liste des NUMÉROS des régions qui la composent (toutes celles qui en font partie, y compris les petites). "
                "Parties : " + ", ".join(parties) + ". Une région ne va que dans une seule partie ; omets une partie qui n'existe pas. "
                'Réponds UNIQUEMENT par un JSON : {"partie": [numeros]}.')
    if "decor" in parties:
        consigne += (" La partie « decor » regroupe tout ce qui N'EST PAS le personnage : sol, herbe, rochers, ombre portée, fumée, "
                     "bâtiments ou objets d'arrière-plan.")
    corps = {"model": modele, "stream": True, "think": False, "options": {"temperature": 0.1, "num_ctx": 8192},
             "messages": [{"role": "user", "content": consigne, "images": [image_b64]}]}
    texte = ""
    with http(ia + "/api/chat", json.dumps(corps).encode(), delai=3600, entetes={"Content-Type": "application/json"}) as r:
        for ligne in r:
            j = json.loads(ligne)
            if j.get("error"):
                raise RuntimeError("Ollama : " + j["error"])
            texte += j.get("message", {}).get("content", "")
    return texte


def etiquettes(regions, groupes, alpha, W, H, etend=9999):
    """Comme affineParRegions de builder/rig/sam.js : la plus petite region rangee, puis chaque partie grignote le libre."""
    vers = {}
    for z, ids in enumerate(groupes):
        for i in ids:
            vers.setdefault(i, z)
    etiq = -np.ones((H, W), np.int16)
    for rid, aire, m in sorted(regions, key=lambda x: -x[1]):
        if rid in vers:
            etiq[m & alpha] = vers[rid]
    for _ in range(min(etend, 800)):
        libre = alpha & (etiq < 0)
        if not libre.any():
            break
        nouveau = etiq.copy()
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            dec = np.roll(etiq, (dy, dx), (0, 1))
            prend = libre & (nouveau < 0) & (dec >= 0)
            nouveau[prend] = dec[prend]
        if (nouveau == etiq).all():
            break
        etiq = nouveau
    return etiq


def main():
    # sans console (tache cachee de Windows), Python ecrit en cp1252 et plante sur le moindre accent
    for flux in (sys.stdout, sys.stderr):
        try:
            flux.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    p = argparse.ArgumentParser()
    p.add_argument("--source", required=True)
    p.add_argument("--sortie", required=True)
    p.add_argument("--parties", required=True)
    p.add_argument("--sam", default="http://100.79.166.73:7340")
    p.add_argument("--ia", default="http://100.119.195.112:11434")
    p.add_argument("--modele", default="qwen3.5:27b")
    p.add_argument("--repli", default="qwen3.5:9b")
    p.add_argument("--points", type=int, default=64)
    a = p.parse_args()
    os.makedirs(a.sortie, exist_ok=True)
    parties = [x.strip() for x in a.parties.split(",") if x.strip()]
    png = open(a.source, "rb").read()
    im = Image.open(io.BytesIO(png)).convert("RGBA")
    W, H = im.size
    alpha = np.array(im)[:, :, 3] > 8
    rapport = {"source": a.source, "parties_demandees": parties, "modele": a.modele, "points": a.points, "alertes": []}

    t = time.time()
    W2, H2, regions = regions_sam(png, a.sam, a.points)
    rapport["duree_sam"] = round(time.time() - t, 1); rapport["regions"] = len(regions)
    if len(regions) < 8:
        rapport["alertes"].append("SAM n'a trouvé que %d régions" % len(regions))
    image_b64, base = numerote(im, regions)
    Image.open(io.BytesIO(base64.b64decode(image_b64))).save(os.path.join(a.sortie, "numerote.png"))

    classement, essais = None, []
    for modele in (a.modele, a.modele, a.repli):
        t = time.time()
        try:
            classement = lis_json(demande_ia(a.ia, modele, image_b64, parties))
            rapport["modele_utilise"] = modele
            rapport["duree_ia"] = round(time.time() - t, 1)
            break
        except Exception as e:
            essais.append("%s : %s" % (modele, e))
    if classement is None:
        rapport["alertes"].append("IA : " + " | ".join(essais))
        json.dump(rapport, open(os.path.join(a.sortie, "parties.json"), "w"), ensure_ascii=False, indent=1)
        print("ECHEC IA : " + " | ".join(essais))
        sys.exit(1)
    if len(essais):
        rapport["alertes"].append("IA : %d essai(s) raté(s) avant la réponse (%s)" % (len(essais), " | ".join(essais)))

    noms = list(classement)
    groupes = [classement[n] for n in noms]
    etiq = etiquettes(regions, groupes, alpha, W, H)
    total = int(alpha.sum())
    parts = []
    for z, n in enumerate(noms):
        px = int((etiq == z).sum())
        parts.append({"nom": n, "regions": groupes[z], "pixels": px, "part": round(px / max(1, total), 4)})
    libres = int((alpha & (etiq < 0)).sum())
    rapport["parties"] = parts
    rapport["non_couvert"] = round(libres / max(1, total), 4)
    for q in parts:
        if q["part"] < 0.002:
            rapport["alertes"].append("partie « %s » minuscule (%.2f %% du personnage)" % (q["nom"], 100 * q["part"]))
    for d in parties:
        if d not in noms:
            rapport["alertes"].append("partie « %s » non trouvée par l'IA" % d)
    if libres / max(1, total) > 0.03:
        rapport["alertes"].append("%.1f %% du personnage n'est dans aucune partie" % (100 * libres / total))

    # les fichiers
    lab = np.zeros((H, W), np.uint8)
    for z in range(len(noms)):
        lab[etiq == z] = z + 1
    Image.fromarray(lab, "L").save(os.path.join(a.sortie, "etiquettes.png"))
    img = base * 0.5 + 127 * 0.5 * (~alpha)[..., None]
    for z in range(len(noms)):
        img[etiq == z] = img[etiq == z] * 0.4 + np.array(COULEURS[z % len(COULEURS)]) * 0.6
    ap = Image.fromarray(img.astype(np.uint8)); dd = ImageDraw.Draw(ap)
    dd.rectangle([0, 0, W, 28 + 22 * ((len(noms) + 1) // 2)], fill=(255, 255, 255))
    for z, n in enumerate(noms):
        x0 = 6 + (z % 2) * (W // 2); y0 = 6 + (z // 2) * 22
        dd.rectangle([x0, y0, x0 + 14, y0 + 14], fill=COULEURS[z % len(COULEURS)])
        dd.text((x0 + 20, y0), "%s (%.0f %%)" % (n, 100 * parts[z]["part"]), fill=(0, 0, 0), font=ImageFont.load_default())
    ap.save(os.path.join(a.sortie, "apercu.png"))
    json.dump(rapport, open(os.path.join(a.sortie, "parties.json"), "w"), ensure_ascii=False, indent=1)
    print("OK %s : %d regions, %d parties, SAM %.0f s, IA %.0f s" % (os.path.basename(os.path.dirname(a.source)), len(regions), len(parts), rapport["duree_sam"], rapport["duree_ia"]))


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        print("ECHEC : %s" % e)
        sys.exit(1)
