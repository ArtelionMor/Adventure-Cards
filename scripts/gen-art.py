#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""gen-art.py — l'image d'une carte, du nom de la carte au PNG détouré.

La chaîne qui se faisait à la main (Gemini → Figma → Icons8), en une commande :
  1. prend une carte dans l'export « cartes-niveau-N-….json » de l'Atelier ;
  2. écrit le prompt (le gabarit « Dans le style graphique des images, sur un fond rose,
     dessine … ») avec des images de référence prises dans Characters/ ;
  3. demande N variantes à l'API Gemini ;
  4. détoure le fond rose EN LOCAL (plus d'Icons8) et signale les rendus ratés : sujet coupé
     par le cadre, fond pas uni, sujet minuscule ;
  5. dépose les variantes dans art-sortie/<id>/ et fait des planches-contact. On choisit, puis
     --choisir copie le PNG dans Characters/ sous le bon nom.

Le SUJET (« un labrador commandant genre Napoléon ») reste une décision de game design : il se
écrit dans scripts/art-sujets.json (clé = id de la carte). Sans sujet, la carte est sautée.

Exemples (depuis la racine du dépôt) :
  python scripts/gen-art.py --verifier                          # contrôle l'installation, sans réseau
  python scripts/gen-art.py --liste cartes.json --etat          # où on en est
  python scripts/gen-art.py --liste cartes.json --carte "Chat Souricier" --a-blanc
  python scripts/gen-art.py --liste cartes.json --carte "Chat Souricier" --variantes 3
  python scripts/gen-art.py --liste cartes.json --toutes --heros Médor --oui
  python scripts/gen-art.py --liste cartes.json --choisir "Chat Souricier" 2
  python scripts/gen-art.py --liste cartes.json --prompts docs/PROMPTS-IMAGES-CARTES.md   # prompts à copier-coller
  python scripts/gen-art.py --references   # range les 10 images de référence dans art-sortie/references-style/
  python scripts/gen-art.py --detourer "C:/…/telechargements"   # détoure des images prises à la main dans Gemini

La clé vient de la variable d'environnement GEMINI_API_KEY (jamais dans un fichier du dépôt).
Dépendances : Pillow, numpy, scipy.
"""
import argparse
import base64
import io
import json
import os
import re
import shutil
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi

# ─────────────────────────────── Réglages ───────────────────────────────
RACINE = Path(__file__).resolve().parent.parent
DOSSIER_SPRITES = RACINE / "Characters"          # où vivent les portraits (et d'où viennent les références)
DOSSIER_SORTIE = RACINE / "art-sortie"           # variantes et planches (ignoré par git)
FICHIER_SUJETS = Path(__file__).resolve().parent / "art-sujets.json"

ROSE = (255, 105, 180)                           # le fond demandé au modèle
ROSE_HEX = "#FF69B4"

URL_API = "https://generativelanguage.googleapis.com/v1beta/interactions"
MODELE_DEFAUT = "gemini-nano-banana-2.1"         # surchargé par --modele ou GEMINI_MODEL
FORMAT_IMAGE = {"type": "image", "aspect_ratio": "1:1", "image_size": "1K"}

# EXACTEMENT la formule des prompts tapés à la main, qui donnent le bon résultat (ex. « Dans ce style
# graphique, sur fond rose, dessine un chat avec une tenue de flûtier ») : toute consigne ajoutée (autocollant,
# « sans dégradé », « de face », « marge »…) a fait dériver le style. Gemini reprend la charpente des images
# jointes (boule, petits pieds, queue) : ce sont elles qui font la cohérence, pas le texte.
GABARIT = "Dans ce style graphique, sur fond rose, dessine {sujet}."

# Les MÊMES 10 images, jointes SÉPARÉMENT à chaque prompt (c'est ce que fait l'utilisateur à la main, et le plafond
# de l'app Gemini est de 10 fichiers par message). ⚠ Ne jamais les fondre en une planche : une image unique est
# prise pour le support à MODIFIER (Gemini repeint le fond et pose le personnage dessus, que la planche soit rose
# ou blanche) ; avec plusieurs images, il en crée une nouvelle d'après leur style.
REFERENCES_FIXES = ["Cameleon Cosmoléon.png", "Cat Menkoun.png", "Cat Witch.png", "Chien de Berger.png",
                    "Dog Chef de Meute.png", "Dog Chiot de Garde.png", "Dog Prince des Cabots.png",
                    "Fox Robin Hood.png", "Frog Captain.png", "Owl Academic.png"]
DOSSIER_REFERENCES = DOSSIER_SORTIE / "references-style"   # `--references` y copie les 10, à joindre d'un coup
TAILLE_REFERENCE = 1024                          # px : réduites avant l'envoi à l'API

# Les noms d'espèce de l'export (français) → préfixe des fichiers de Characters/.
ESPECES_EN = {"Chien": "Dog", "Chat": "Cat", "Corbeau": "Crow", "Grenouille": "Frog",
              "Chouette": "Owl", "Hibou": "Owl", "Faucon": "Falcon", "Cameleon": "Cameleon"}

# Les cartes libres n'ont pas d'espèce : on la devine à un mot de leur nom, pour choisir des références
# (le nom du fichier produit, lui, n'est pas préfixé).
MOTS_ESPECES = {"Lapin": "Rabbit", "Paresseux": "Sloth", "Chien": "Dog", "Chat": "Cat", "Corbeau": "Crow",
                "Grenouille": "Frog", "Hiboux": "Owl", "Hibou": "Owl", "Chouette": "Owl", "Faucon": "Falcon",
                "Pieuvre": "Octopus", "Rouge": "Robin"}

# Détourage.
TOLERANCE_FOND = 70.0        # écart de couleur (0-441) pour être « du fond » s'il touche le bord
TOLERANCE_POCHE = 28.0       # idem pour un fond enfermé (entre la queue et le corps…)
POCHE_MIN_PX = 120           # une poche enfermée plus petite que ça est ignorée
SEUIL_NOIR = 130             # un pixel dont la plus forte composante est sous ce seuil est « du contour »
PART_CONTOUR_POCHE = 0.6     # part du pourtour d'une poche qui doit être du contour pour que ce soit du fond
MARGE_FAIBLE = 0.02          # marge (part du cadre) sous laquelle on prévient « collé au bord »
SUJET_MINUSCULE = 0.06       # part du cadre occupée par le sujet, en dessous : signalé

SEUIL_SANS_CONFIRMATION = 12  # au-delà de ce nombre d'appels, --oui est exigé


# ─────────────────────────────── Texte ───────────────────────────────
def norm(s):
    """Minuscules, sans accents ni ponctuation : pour comparer des noms de carte et de fichier."""
    s = unicodedata.normalize("NFKD", s.replace("œ", "oe").replace("Œ", "oe"))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "", s.lower())


def rel(chemin):
    """Chemin relatif au dépôt pour l'affichage (tel quel s'il est ailleurs)."""
    try:
        return Path(chemin).relative_to(RACINE)
    except ValueError:
        return Path(chemin)


def sans_accents(s):
    """Pour les étiquettes de planche : la police par défaut de Pillow n'a pas tous les accents."""
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")


def police(taille):
    try:
        return ImageFont.load_default(size=taille)
    except TypeError:  # Pillow ancien : pas de taille
        return ImageFont.load_default()


# ─────────────────────────────── Les cartes ───────────────────────────────
def charge_cartes(chemin):
    """Lit l'export de l'Atelier. Rend une liste de cartes à plat."""
    d = json.loads(Path(chemin).read_text(encoding="utf-8"))
    persos = {p["nom"]: p for p in d["personnages"]}
    cartes = []
    for c in d["cartes"]:
        nom_hero = c["ou"].split("·")[0].strip()
        hero = persos.get(nom_hero)
        espece = ESPECES_EN.get(hero["espece"], hero["espece"]) if hero else None
        stats = "sort" if c["type"] == "sort" else f'{c.get("attaque")}/{c.get("vie")}'
        cartes.append({
            "id": c["id"], "nom": c["nom"], "type": c["type"], "cout": c.get("cout"), "stats": stats,
            "texte": c.get("texteCarte") or "", "ou": c["ou"],
            "hero_id": hero["id"] if hero else None, "hero": hero["nom"] if hero else None,
            "role": hero["role"] if hero else None, "espece_fr": hero["espece"] if hero else None,
            "espece": espece,
        })
    for c in cartes:
        c["espece_refs"] = c["espece"] or next(
            (MOTS_ESPECES[m] for m in re.split(r"[\s-]+", c["nom"]) if m in MOTS_ESPECES), None)
        base = c["nom"] if not c["espece"] else f'{c["espece"]} {c["nom"]}'
        c["fichier"] = re.sub(r'[<>:"/\\|?*]', "", base).strip() + ".png"
    doublons = Counter(c["fichier"] for c in cartes)
    for c in cartes:  # deux cartes de même nom et de même espèce : l'id les départage
        if doublons[c["fichier"]] > 1:
            c["fichier"] = c["fichier"][:-4] + f' ({c["id"]}).png'
    return cartes


def charge_sujets():
    if not FICHIER_SUJETS.exists():
        return {}
    brut = json.loads(FICHIER_SUJETS.read_text(encoding="utf-8"))
    sujets = {}
    for cle, v in brut.items():
        if cle.startswith("_"):
            continue
        sujets[cle] = {"sujet": v, "refs": []} if isinstance(v, str) else \
            {"sujet": v["sujet"], "refs": list(v.get("refs", []))}
    return sujets


def images_existantes():
    return {norm(p.stem): p for p in DOSSIER_SPRITES.glob("*.png")}


def image_de(carte, existantes):
    """Le portrait déjà déposé pour cette carte (`<Espèce> <Nom>.png` ou `<Nom>.png`), sinon None."""
    cles = [norm(carte["nom"])]
    if carte["espece"]:
        cles.append(norm(f'{carte["espece"]} {carte["nom"]}'))
    return next((existantes[k] for k in cles if k in existantes), None)


def trouve_carte(requete, cartes):
    """Une carte par id exact, sinon par nom (sans accent ni casse). Erreur si ambigu ou absent."""
    par_id = [c for c in cartes if c["id"] == requete]
    if par_id:
        return par_id[0]
    k = norm(requete)
    par_nom = [c for c in cartes if norm(c["nom"]) == k]
    if len(par_nom) == 1:
        return par_nom[0]
    if not par_nom:
        raise SystemExit(f'Carte introuvable : « {requete} ». (--etat liste ce qui manque.)')
    choix = ", ".join(f'{c["id"]} ({c["ou"]})' for c in par_nom)
    raise SystemExit(f'« {requete} » est ambigu : donne l\'id — {choix}')


# ─────────────────────────────── Références et prompt ───────────────────────────────
def choisit_references(carte, sujet):
    """Les 10 mêmes images de référence, séparées, pour toutes les cartes."""
    return [DOSSIER_SPRITES / n for n in REFERENCES_FIXES if (DOSSIER_SPRITES / n).exists()]


def prepare_reference(chemin):
    """Le portrait tel quel (PNG transparent, comme à la main), simplement réduit."""
    im = Image.open(chemin).convert("RGBA")
    im.thumbnail((TAILLE_REFERENCE, TAILLE_REFERENCE), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "PNG")
    return buf.getvalue()


def commande_references():
    """Range les 10 images dans un dossier : dans Gemini, « + » puis Importer des fichiers, Ctrl+A, Ouvrir."""
    DOSSIER_REFERENCES.mkdir(parents=True, exist_ok=True)
    manquantes, n = [], 0
    for i, nom in enumerate(REFERENCES_FIXES, start=1):
        src = DOSSIER_SPRITES / nom
        if src.exists():
            shutil.copyfile(src, DOSSIER_REFERENCES / f"{i:02d} {nom}")
            n += 1
        else:
            manquantes.append(nom)
    print(f"{n} image(s) dans {DOSSIER_REFERENCES}")
    for nom in manquantes:
        print(f"  introuvable dans Characters/ : {nom}")
    return 1 if manquantes else 0


def ecrit_prompt(sujet):
    return GABARIT.format(sujet=sujet["sujet"].strip().rstrip("."))


# ─────────────────────────────── L'API ───────────────────────────────
class ErreurApi(RuntimeError):
    pass


def abrege(noeud):
    """Le JSON de la réponse sans ses longs blocs base64, pour l'afficher dans une erreur."""
    if isinstance(noeud, dict):
        return {k: abrege(v) for k, v in noeud.items()}
    if isinstance(noeud, list):
        return [abrege(v) for v in noeud]
    if isinstance(noeud, str) and len(noeud) > 200:
        return noeud[:40] + f"…({len(noeud)} car.)"
    return noeud


def trouve_image(reponse):
    """Le DERNIER bloc image de la réponse (octets), quelle que soit la forme exacte :
    `steps[].content[]` de l'API Interactions, `output_image`, ou `candidates[].content.parts[]`."""
    trouves = []

    def marche(n):
        if isinstance(n, dict):
            enfant = n.get("inlineData") or n.get("inline_data")
            d = enfant.get("data") if isinstance(enfant, dict) else n.get("data")
            mime = str((enfant or n).get("mimeType") or (enfant or n).get("mime_type") or "")
            if isinstance(d, str) and len(d) > 2000 and (n.get("type") == "image" or "image" in mime):
                trouves.append(d)
            for v in n.values():
                marche(v)
        elif isinstance(n, list):
            for v in n:
                marche(v)

    marche(reponse)
    return base64.b64decode(trouves[-1]) if trouves else None


def appelle_api(cle, modele, prompt, references):
    """Une image. `references` : liste d'octets PNG. Réessaie sur 429/5xx."""
    corps = {
        "model": modele,
        "input": [{"type": "text", "text": prompt}] + [
            {"type": "image", "mime_type": "image/png", "data": base64.b64encode(r).decode()}
            for r in references],
        "response_format": FORMAT_IMAGE,
    }
    donnees = json.dumps(corps).encode("utf-8")
    for essai in range(4):
        req = urllib.request.Request(URL_API, data=donnees, method="POST", headers={
            "Content-Type": "application/json", "x-goog-api-key": cle})
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                reponse = json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            texte = e.read().decode("utf-8", "replace")[:600]
            if e.code in (429, 500, 502, 503, 504) and essai < 3:
                time.sleep(5 * 2 ** essai)
                continue
            raise ErreurApi(f"HTTP {e.code} : {texte}")
        except (urllib.error.URLError, TimeoutError) as e:
            if essai < 3:
                time.sleep(5 * 2 ** essai)
                continue
            raise ErreurApi(f"réseau : {e}")
        octets = trouve_image(reponse)
        if octets is None:
            raise ErreurApi("pas d'image dans la réponse : " + json.dumps(abrege(reponse), ensure_ascii=False)[:600])
        return octets
    raise ErreurApi("trop d'essais")


# ─────────────────────────────── Le détourage ───────────────────────────────
def detoure(rgb):
    """Fond uni → PNG transparent. `rgb` : HxWx3 uint8. Rend (rgba uint8, rapport).

    - Le fond est la couleur médiane du pourtour ; est « fond » ce qui lui ressemble ET touche le
      bord (le rose des joues, derrière le contour, reste donc).
    - Un fond enfermé (entre la queue et le corps) part aussi, s'il est cerné de noir.
    - Le liseré : un pixel du bord est un mélange contour noir / fond, donc son alpha se calcule
      exactement et sa couleur est le noir — pas de halo rose.
    """
    img = rgb.astype(np.float32)
    h, w, _ = img.shape
    bord = np.concatenate([img[0], img[-1], img[:, 0], img[:, -1]])
    fond = np.median(bord, axis=0)
    ecart = np.linalg.norm(img - fond, axis=2)

    etiq, _ = ndi.label(ecart < TOLERANCE_FOND)
    du_bord = np.unique(np.concatenate([etiq[0], etiq[-1], etiq[:, 0], etiq[:, -1]]))
    masque = np.isin(etiq, du_bord[du_bord != 0])

    sombre = img.max(axis=2) < SEUIL_NOIR
    etiq2, n2 = ndi.label((ecart < TOLERANCE_POCHE) & ~masque)
    poches = gardees = 0
    if n2:
        tailles = np.bincount(etiq2.ravel())
        for i in np.nonzero(tailles[1:] >= POCHE_MIN_PX)[0] + 1:
            zone = etiq2 == i
            cerne = ndi.binary_dilation(zone, iterations=4) & ~zone
            # cerné de contour noir : du vrai fond. Une joue de la même couleur est cernée de peau.
            if cerne.any() and sombre[cerne].mean() >= PART_CONTOUR_POCHE:
                masque |= zone
                poches += 1
            else:
                gardees += 1                         # joue de la couleur du fond, ou trou sans contour

    alpha = np.where(masque, 0.0, 1.0).astype(np.float32)
    sortie = img.copy()
    # Le liseré (3 px) est un mélange fond / sujet : la couleur du sujet est celle du pixel
    # intérieur le plus proche (noir pour un contour, bleu pâle pour un fantôme), et l'alpha est
    # la part de ce sujet dans le pixel, par projection sur la droite fond → sujet.
    large = ndi.binary_dilation(masque, iterations=3)
    anneau = large & ~masque
    interieur = ~large
    if anneau.any() and interieur.any():
        _, (iy, ix) = ndi.distance_transform_edt(~interieur, return_indices=True)
        sujet_px = img[iy, ix]
        d = sujet_px - fond
        den = (d * d).sum(axis=2)
        num = ((img - fond) * d).sum(axis=2)
        a = np.clip(num / np.maximum(den, 1.0), 0.0, 1.0)
        refait = a[..., None] * sujet_px + (1 - a[..., None]) * fond
        propre = anneau & (den > 400) & (np.linalg.norm(img - refait, axis=2) < 45.0)
        alpha[propre] = a[propre]
        partiel = propre & (a < 0.98)
        sortie[partiel] = sujet_px[partiel]

    sujet = alpha > 0.5
    ys, xs = np.nonzero(sujet)
    if len(ys):
        marge = min(ys.min(), xs.min(), h - 1 - ys.max(), w - 1 - xs.max()) / max(h, w)
    else:
        marge = 0.0
    part = float(sujet.mean())
    ecart_bord = float(np.percentile(np.linalg.norm(bord - fond, axis=1), 95))

    flags = []
    if len(ys) == 0:
        flags.append("rien détouré")
    elif marge <= 0:
        flags.append("coupé par le cadre")
    elif marge < MARGE_FAIBLE:
        flags.append("collé au bord")
    if ecart_bord > 30 and marge > 0:
        flags.append("fond pas uni")
    if len(ys) and part < SUJET_MINUSCULE:
        flags.append("sujet minuscule")
    if gardees:
        flags.append(f"{gardees} zone(s) du fond gardée(s) : joue ou trou ?")

    rapport = {"fond": [int(x) for x in fond], "poches": poches, "gardees": gardees,
               "part_sujet": round(part, 3), "marge": round(float(marge), 3), "flags": flags}
    rgba = np.dstack([np.clip(sortie, 0, 255), alpha * 255]).astype(np.uint8)
    return rgba, rapport


# ─────────────────────────────── Sortie : variantes et planches ───────────────────────────────
def damier(taille, case=16):
    y, x = np.mgrid[0:taille, 0:taille]
    c = np.where(((x // case) + (y // case)) % 2 == 0, 235, 205).astype(np.uint8)
    return Image.fromarray(np.dstack([c, c, c]), "RGB")


def planche_contact(lignes, chemin, cellule=256):
    """lignes : [(titre, [(chemin_png ou None, flags)])]. Une ligne par carte, une colonne par variante."""
    colonnes = max((len(v) for _, v in lignes), default=1)
    barre = 34
    toile = Image.new("RGB", (cellule * colonnes, (cellule + barre) * len(lignes)), (255, 255, 255))
    d = ImageDraw.Draw(toile)
    fond = damier(cellule)
    for r, (titre, variantes) in enumerate(lignes):
        y = r * (cellule + barre)
        for c, (png, flags) in enumerate(variantes):
            x = c * cellule
            vignette = fond.copy().convert("RGBA")
            if png and Path(png).exists():
                im = Image.open(png).convert("RGBA")
                im.thumbnail((cellule, cellule), Image.LANCZOS)
                vignette.alpha_composite(im, ((cellule - im.width) // 2, (cellule - im.height) // 2))
            toile.paste(vignette.convert("RGB"), (x, y + barre))
            d.rectangle((x, y, x + cellule - 1, y + barre - 1), fill=(255, 220, 220) if flags else (230, 245, 230))
            d.text((x + 4, y + 3), f"{sans_accents(titre)} - v{c + 1}"[:40], fill=(0, 0, 0), font=police(12))
            d.text((x + 4, y + 18), (sans_accents(", ".join(flags)) if flags else "ok")[:44],
                   fill=(170, 0, 0) if flags else (0, 110, 0), font=police(11))
    toile.save(chemin)


def variantes_sur_disque(carte):
    """[(png, flags)] de ce qui est déjà dans art-sortie/<id>/, dans l'ordre v1, v2…"""
    dossier = DOSSIER_SORTIE / carte["id"]
    sortie, n = [], 1
    while (dossier / f"v{n}.png").exists():
        flags = []
        rapport = dossier / f"v{n}.json"
        if rapport.exists():
            flags = json.loads(rapport.read_text(encoding="utf-8")).get("flags", [])
        sortie.append((dossier / f"v{n}.png", flags))
        n += 1
    return sortie


def ecrit_planches(cartes_du_lot):
    DOSSIER_SORTIE.mkdir(exist_ok=True)
    lignes = [(c["nom"], variantes_sur_disque(c)) for c in cartes_du_lot]
    lignes = [l for l in lignes if l[1]]
    chemins = []
    for i in range(0, len(lignes), 6):
        chemin = DOSSIER_SORTIE / f"planche-{i // 6 + 1:02d}.png"
        planche_contact(lignes[i:i + 6], chemin)
        chemins.append(chemin)
    return chemins


# ─────────────────────────────── Une tâche : une variante ───────────────────────────────
def fais_variante(cle, modele, carte, prompt, references, n):
    dossier = DOSSIER_SORTIE / carte["id"]
    dossier.mkdir(parents=True, exist_ok=True)
    (dossier / "prompt.txt").write_text(prompt + "\n\nréférences : " + ", ".join(
        p.name for p in references[1]) + "\n", encoding="utf-8")
    brut = appelle_api(cle, modele, prompt, references[0])
    im = Image.open(io.BytesIO(brut))
    (dossier / f"brut-v{n}.{(im.format or 'png').lower()}").write_bytes(brut)
    rgba, rapport = detoure(np.asarray(im.convert("RGB")))
    Image.fromarray(rgba, "RGBA").save(dossier / f"v{n}.png")
    (dossier / f"v{n}.json").write_text(json.dumps(rapport, ensure_ascii=False), encoding="utf-8")
    return rapport


# ─────────────────────────────── Commandes ───────────────────────────────
def commande_etat(cartes, sujets):
    exist = images_existantes()
    avec_image = [c for c in cartes if image_de(c, exist)]
    avec_sujet = [c for c in cartes if c["id"] in sujets]
    print(f"{len(cartes)} cartes dont {sum(1 for c in cartes if c['hero'])} de héros "
          f"et {sum(1 for c in cartes if not c['hero'])} libres.")
    print(f"  portrait déjà dans Characters/ : {len(avec_image)}")
    print(f"  sujet écrit (art-sujets.json)  : {len(avec_sujet)}")
    reste = [c for c in cartes if not image_de(c, exist) and c["id"] not in sujets]
    print(f"  sans portrait ET sans sujet    : {len(reste)}")
    par_hero = Counter(c["hero"] or "Cartes libres" for c in reste)
    for h, n in par_hero.items():
        print(f"      {n:3d}  {h}")
    sorties = [c for c in cartes if (DOSSIER_SORTIE / c["id"]).is_dir()]
    if sorties:
        print(f"  déjà générées dans art-sortie/ : {len(sorties)}")


def selection(args, cartes, sujets):
    exist = images_existantes()
    if args.carte:
        choisies = [trouve_carte(q, cartes) for q in args.carte]
        if args.sujet:
            if len(choisies) != 1:
                raise SystemExit("--sujet ne va qu'avec une seule --carte.")
            sujets = dict(sujets)
            sujets[choisies[0]["id"]] = {"sujet": args.sujet, "refs": []}
        sans = [c for c in choisies if c["id"] not in sujets]
        if sans:
            raise SystemExit("Pas de sujet pour : " + ", ".join(f'{c["nom"]} ({c["id"]})' for c in sans)
                             + f"\n→ l'écrire dans {rel(FICHIER_SUJETS)} (clé = id), ou --sujet \"…\".")
        return choisies, sujets, []
    visees = cartes
    if args.heros:
        k = norm(args.heros)
        visees = [c for c in cartes if c["hero_id"] and (norm(c["hero_id"]) == k or norm(c["hero"]) == k)]
        if not visees:
            raise SystemExit(f"Aucune carte pour le héros « {args.heros} » (id ou nom).")
    faites, retenues, sans_sujet = [], [], []
    for c in visees:
        if image_de(c, exist) and not args.refaire:
            faites.append(c)
        elif c["id"] not in sujets:
            sans_sujet.append(c)
        else:
            retenues.append(c)
    return retenues, sujets, sans_sujet


def commande_generer(args, cartes, sujets):
    retenues, sujets, sans_sujet = selection(args, cartes, sujets)
    if sans_sujet:
        print(f"{len(sans_sujet)} carte(s) sautée(s), sans sujet dans art-sujets.json "
              f"(--etat les compte par héros).")
    if not retenues:
        print("Rien à générer.")
        return 0
    taches = []
    for c in retenues:
        refs = choisit_references(c, sujets[c["id"]])
        prompt = ecrit_prompt(sujets[c["id"]])
        for n in range(1, args.variantes + 1):
            if (DOSSIER_SORTIE / c["id"] / f"v{n}.png").exists() and not args.refaire:
                continue
            taches.append((c, prompt, refs, n))

    if args.a_blanc:
        for c, prompt, refs, n in taches:
            if n == 1:
                print(f"\n● {c['nom']}  ({c['id']}, {c['ou']})  →  Characters/{c['fichier']}")
                print("  références :", ", ".join(p.name for p in refs) or "(aucune)")
                print("  prompt     :", prompt)
        print(f"\n{len(taches)} appel(s) pour {len(retenues)} carte(s), modèle {args.modele}. "
              "(--a-blanc : rien n'a été envoyé.)")
        return 0

    cle = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not cle:
        raise SystemExit("Pas de clé : définis GEMINI_API_KEY (PowerShell : $env:GEMINI_API_KEY = '…').")
    if len(taches) > SEUIL_SANS_CONFIRMATION and not args.oui:
        raise SystemExit(f"{len(taches)} appels payants pour {len(retenues)} cartes : relance avec --oui "
                         f"pour confirmer (ou --a-blanc pour voir les prompts).")
    if not taches:
        print("Tout est déjà généré (--refaire pour recommencer).")
        ecrit_planches(retenues)
        return 0

    octets_refs = {}
    print(f"{len(taches)} appel(s), {len(retenues)} carte(s), modèle {args.modele}, {args.parallele} en parallèle.")
    ratees = []
    with ThreadPoolExecutor(max_workers=args.parallele) as pool:
        futurs = {}
        for c, prompt, refs, n in taches:
            for p in refs:
                if p not in octets_refs:
                    octets_refs[p] = prepare_reference(p)
            lot = ([octets_refs[p] for p in refs], refs)
            futurs[pool.submit(fais_variante, cle, args.modele, c, prompt, lot, n)] = (c, n)
        for f in as_completed(futurs):
            c, n = futurs[f]
            try:
                r = f.result()
                marque = " ! " + ", ".join(r["flags"]) if r["flags"] else ""
                print(f"  ok  {c['nom']} v{n}{marque}")
            except ErreurApi as e:
                ratees.append((c, n, str(e)))
                print(f"  ÉCHEC  {c['nom']} v{n} : {e}")
    planches = ecrit_planches(retenues)
    for p in planches:
        print("planche :", rel(p))
    if ratees:
        print(f"{len(ratees)} variante(s) en échec : relancer la même commande ne refait que celles-là.")
        return 1
    print("Choisir : python scripts/gen-art.py --liste <export.json> --choisir \"<carte>\" <n>")
    return 0


def commande_prompts(args, cartes, sujets):
    """Écrit le fichier de prompts à copier-coller (pour Gemini dans le navigateur), carte par carte."""
    exist = images_existantes()
    lignes = [
        "# Prompts des images de cartes",
        "",
        "> **Généré** par `python scripts/gen-art.py --liste <export.json> --prompts <ce fichier>` à partir de",
        "> `scripts/art-sujets.json` (le sujet de chaque carte, à corriger là-bas puis regénérer ce fichier).",
        "",
        "**Pour chaque carte :**",
        "1. Dans Gemini, joins toujours les MÊMES 10 images, SÉPARÉES (jamais en une planche : Gemini l'éditerait) :",
        "   `python scripts/gen-art.py --references` les range dans `art-sortie/references-style/`. Puis colle le prompt du bloc.",
        "2. Télécharge l'image et nomme-la comme indiqué (`Fichier`), dans un même dossier.",
        "3. `python scripts/gen-art.py --detourer <dossier>` retire le rose (sans Figma ni Icons8) → `art-sortie/detoure/`.",
        "   Il signale les rendus à refaire : sujet coupé par le cadre, fond pas uni, zone rose gardée.",
        "4. Copie le PNG dans `Characters/`, puis `node scripts/gen-sprites.mjs`, et règle le sprite de la carte dans le Card Builder.",
        "",
        "✅ = la carte a déjà un portrait dans `Characters/` (le prompt est là au cas où on le refait).",
        "",
    ]
    groupes, ordre = {}, []
    for c in cartes:
        cle = c["hero"] or "Cartes libres"
        if cle not in groupes:
            groupes[cle] = []
            ordre.append(cle)
        groupes[cle].append(c)
    manquants = []
    total = 0
    for cle in ordre:
        premiere = groupes[cle][0]
        titre = f'{cle} ({premiere["espece_fr"]}) — {premiere["role"]}' if premiere["hero"] else cle
        lignes += [f"## {titre}", ""]
        for c in groupes[cle]:
            sujet = sujets.get(c["id"])
            if not sujet:
                manquants.append(c)
                continue
            total += 1
            fait = "  ·  ✅ portrait déjà là" if image_de(c, exist) else ""
            quoi = c["type"] if c["type"] == "sort" else f'{c["type"]} {c["stats"]}'
            cote = f'{c["ou"].split("·")[1].strip()}' if "·" in c["ou"] else "carte libre"
            lignes += [f'### {c["nom"]}  ·  {quoi}, {c["cout"]} mana  ·  {cote}{fait}']
            if c["texte"]:
                lignes += [f'> {c["texte"]}']
            lignes += ["", "```", ecrit_prompt(sujet), "```", "", f'Fichier : `{c["fichier"]}`', ""]
    if manquants:
        lignes += ["## Sans sujet", ""] + [f'- {c["nom"]} (`{c["id"]}`)' for c in manquants] + [""]
    chemin = Path(args.prompts)
    chemin.write_bytes(("\n".join(lignes) + "\n").encode("utf-8"))
    print(f"{total} prompt(s) écrits dans {rel(chemin)}" + (f" ; {len(manquants)} carte(s) sans sujet" if manquants else ""))
    return 0


def commande_detourer(args):
    """Détoure des images déjà téléchargées (un fichier ou un dossier) : le rose part, sans API."""
    source = Path(args.detourer)
    fichiers = sorted(p for p in source.iterdir() if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp")) \
        if source.is_dir() else [source]
    if not fichiers:
        raise SystemExit(f"Aucune image dans {source}")
    sortie = DOSSIER_SORTIE / "detoure"
    sortie.mkdir(parents=True, exist_ok=True)
    a_revoir = 0
    for f in fichiers:
        rgba, rapport = detoure(np.asarray(Image.open(f).convert("RGB")))
        Image.fromarray(rgba, "RGBA").save(sortie / (f.stem + ".png"))
        if rapport["flags"]:
            a_revoir += 1
        print(f"  {'!' if rapport['flags'] else 'ok'}  {f.name}" + (" : " + ", ".join(rapport["flags"]) if rapport["flags"] else ""))
    print(f"{len(fichiers)} image(s) → {rel(sortie)} ({a_revoir} à revoir)")
    return 0


def commande_choisir(args, cartes):
    nom, n = args.choisir
    carte = trouve_carte(nom, cartes)
    src = DOSSIER_SORTIE / carte["id"] / f"v{int(n)}.png"
    if not src.exists():
        raise SystemExit(f"Introuvable : {rel(src)}")
    dest = DOSSIER_SPRITES / carte["fichier"]
    if dest.exists() and not args.ecraser:
        raise SystemExit(f"{rel(dest)} existe déjà (--ecraser pour le remplacer).")
    shutil.copyfile(src, dest)
    print(f"copié : {rel(dest)}")
    print("Reste : node scripts/gen-sprites.mjs (ou « Actualiser les images » dans le builder), "
          f"puis régler le sprite de « {carte['nom']} » dans le Card Builder.")
    return 0


# ─────────────────────────────── Autocontrôle (sans réseau) ───────────────────────────────
def verifier():
    """Dessine un sprite factice sur le rose, le passe en JPEG, détoure, et compare au vrai alpha."""
    t = 512
    plaque = Image.new("RGB", (t, t), ROSE)
    vrai = Image.new("L", (t, t), 0)
    p, v = ImageDraw.Draw(plaque), ImageDraw.Draw(vrai)
    p.ellipse((60, 100, 360, 400), fill=(0, 0, 0)); v.ellipse((60, 100, 360, 400), fill=255)
    p.ellipse((78, 118, 342, 382), fill=(250, 235, 210))
    p.ellipse((110, 250, 170, 300), fill=ROSE)                    # une joue de la couleur du fond
    p.ellipse((300, 150, 470, 320), fill=(0, 0, 0)); v.ellipse((300, 150, 470, 320), fill=255)
    p.ellipse((335, 185, 435, 285), fill=ROSE); v.ellipse((335, 185, 435, 285), fill=0)  # fond enfermé
    buf = io.BytesIO()
    plaque.save(buf, "JPEG", quality=85)
    rgba, rapport = detoure(np.asarray(Image.open(io.BytesIO(buf.getvalue())).convert("RGB")))
    a = rgba[..., 3].astype(np.float32) / 255
    erreurs = []
    if np.abs(a - np.asarray(vrai, np.float32) / 255).mean() > 0.01:
        erreurs.append("alpha trop loin de la vérité")
    if a[275, 140] < 0.9:
        erreurs.append("la joue de la couleur du fond a été mangée")
    if a[235, 385] > 0.1:
        erreurs.append("le fond enfermé n'est pas parti")
    if a[5, 5] > 0.1:
        erreurs.append("le coin n'est pas transparent")
    if rapport["gardees"] != 1 or rapport["poches"] != 1:   # la joue est gardée (et signalée), le fond enfermé part
        erreurs.append(f"poches : {rapport['poches']} retirée(s), {rapport['gardees']} gardée(s)")
    if len(rapport["flags"]) != 1:
        erreurs.append(f"signalé à tort : {rapport['flags']}")
    # le contrôle « sujet coupé » doit s'allumer quand le sujet touche le bord
    coupe = plaque.copy()
    ImageDraw.Draw(coupe).rectangle((0, 200, 80, 260), fill=(0, 0, 0))
    if "coupé par le cadre" not in detoure(np.asarray(coupe))[1]["flags"]:
        erreurs.append("un sujet coupé n'est pas signalé")
    # la lecture de la réponse, dans les deux formes connues
    b64 = base64.b64encode(os.urandom(3000)).decode()
    for forme in ({"steps": [{"type": "model_output", "content": [{"type": "image", "data": b64}]}]},
                  {"candidates": [{"content": {"parts": [{"inlineData": {"mimeType": "image/png", "data": b64}}]}}]}):
        if trouve_image(forme) is None:
            erreurs.append("réponse non lue : " + json.dumps(abrege(forme))[:80])
    if erreurs:
        print("ÉCHEC :", *erreurs, sep="\n  - ")
        return 1
    print("ok : détourage (alpha, joue, fond enfermé, coin), contrôle « coupé », lecture de la réponse.")
    return 0


# ─────────────────────────────── Entrée ───────────────────────────────
def main():
    for flux in (sys.stdout, sys.stderr):
        if hasattr(flux, "reconfigure"):
            flux.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="Images de cartes : prompt → Gemini → détourage local.")
    ap.add_argument("--liste", help="export « cartes-niveau-N-….json » de l'Atelier")
    ap.add_argument("--verifier", action="store_true", help="autocontrôle sans réseau")
    ap.add_argument("--etat", action="store_true", help="compte les cartes, portraits et sujets")
    ap.add_argument("--carte", action="append", help="nom ou id (répétable) ; force, même si un portrait existe")
    ap.add_argument("--sujet", help="le sujet, pour une seule --carte (sinon : art-sujets.json)")
    ap.add_argument("--toutes", action="store_true", help="toutes les cartes sans portrait mais avec sujet")
    ap.add_argument("--heros", help="limite --toutes à un héros (id ou nom)")
    ap.add_argument("--variantes", type=int, default=3)
    ap.add_argument("--refaire", action="store_true", help="regénère même ce qui existe")
    ap.add_argument("--a-blanc", action="store_true", dest="a_blanc", help="montre les prompts, n'appelle rien")
    ap.add_argument("--oui", action="store_true", help=f"confirme plus de {SEUIL_SANS_CONFIRMATION} appels payants")
    ap.add_argument("--parallele", type=int, default=3)
    ap.add_argument("--modele", default=os.environ.get("GEMINI_MODEL", MODELE_DEFAUT))
    ap.add_argument("--prompts", metavar="FICHIER.md", help="écrit les prompts de toutes les cartes à copier-coller")
    ap.add_argument("--detourer", metavar="FICHIER_OU_DOSSIER", help="détoure des images déjà téléchargées (sans API)")
    ap.add_argument("--references", action="store_true", help="range les 10 images de référence dans art-sortie/references-style/")
    ap.add_argument("--choisir", nargs=2, metavar=("CARTE", "N"), help="copie art-sortie/<id>/vN.png dans Characters/")
    ap.add_argument("--ecraser", action="store_true", help="avec --choisir : remplace un portrait existant")
    args = ap.parse_args()

    if args.verifier:
        return verifier()
    if args.references:
        return commande_references()
    if args.detourer:
        return commande_detourer(args)
    if not args.liste:
        ap.error("--liste est requis (l'export de l'Atelier).")
    cartes = charge_cartes(args.liste)
    sujets = charge_sujets()
    if args.etat:
        commande_etat(cartes, sujets)
        return 0
    if args.prompts:
        return commande_prompts(args, cartes, sujets)
    if args.choisir:
        return commande_choisir(args, cartes)
    if args.carte or args.toutes:
        return commande_generer(args, cartes, sujets)
    ap.error("rien à faire : --etat, --prompts, --detourer, --carte, --toutes ou --choisir.")


if __name__ == "__main__":
    sys.exit(main())
