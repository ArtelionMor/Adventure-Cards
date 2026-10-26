#!/usr/bin/env python3
# LE SERVEUR SAM : la machine qui a une carte graphique decoupe une image en regions (SAM 2, Meta) pour
# l'Atelier « Rig & Anim » (builder/rig/sam.js). Le serveur du jeu (scripts/devserver.js) lui envoie le PNG
# d'un personnage, il rend les regions (un masque PNG recadre par region). Meme principe qu'un renfort
# de calcul (scripts/renfort.mjs) : une machine de plus, jointe par son nom Tailscale.
#
#   python scripts/sam-serveur.py [--port 7340] [--hote tailscale|127.0.0.1|0.0.0.0] [--modele chemin.pt]
#
#   --hote tailscale   n'ecoute QUE sur l'adresse Tailscale de la machine (`tailscale ip -4`) : rien
#                      d'autre que le tailnet ne peut l'appeler. C'est le reglage a prendre.
#   --hote 127.0.0.1   (defaut) seulement cette machine : le serveur du jeu tourne ici aussi.
#
# Installation (une fois) : python -m venv sam2-env ; pip install torch torchvision (CUDA) ;
#   pip install git+https://github.com/facebookresearch/sam2.git opencv-python pillow numpy
# Le modele (sam2.1_hiera_large, ~900 Mo) se telecharge au premier appel.
#
# Appels :  GET  /etat                     -> { ok, modele, charge, gpu, occupe, etape, ecoule, calcul_dernier }
#           POST /segmente?points=32       -> corps = PNG ; rend { largeur, hauteur, masques: [ { id, aire,
#                                              x, y, w, h, png (base64, recadre) } ] }, du plus grand au plus petit
# ⚠ Sans mot de passe : ne jamais l'exposer a internet (cf. scripts/CLAUDE.md, « Le serveur »).
import argparse
import base64
import io
import json
import os
import subprocess
import threading
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT_DEFAUT = 7340
URL_MODELE = "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_large.pt"
CONFIG = "configs/sam2.1/sam2.1_hiera_l.yaml"
TAILLE_MAX = 40 * 1024 * 1024

ETAT = {"gen": None, "gpu": None, "modele": None,
        "occupe": False, "etape": None, "debut": 0.0, "etape_debut": 0.0, "calcul_dernier": None}


def etape(nom):
    """Dit ou en est le calcul : l'Atelier l'affiche en barre de progression (GET /etat)."""
    ETAT["etape"] = nom
    ETAT["etape_debut"] = time.time()
VERROU = threading.Lock()  # une seule image a la fois sur la carte


def charge_modele(chemin):
    """Charge SAM 2 une fois (le premier appel paie le telechargement et le chargement)."""
    if ETAT["gen"] is not None:
        return ETAT["gen"]
    import torch
    from sam2.build_sam import build_sam2
    from sam2.automatic_mask_generator import SAM2AutomaticMaskGenerator
    if not os.path.exists(chemin):
        os.makedirs(os.path.dirname(chemin) or ".", exist_ok=True)
        print("telechargement du modele (~900 Mo)...", flush=True)
        urllib.request.urlretrieve(URL_MODELE, chemin)
    appareil = "cuda" if torch.cuda.is_available() else "cpu"
    modele = build_sam2(CONFIG, chemin, device=appareil, apply_postprocessing=False)
    ETAT["gpu"] = torch.cuda.get_device_name(0) if appareil == "cuda" else "cpu"
    ETAT["modele"] = os.path.basename(chemin)
    ETAT["gen"] = (modele, SAM2AutomaticMaskGenerator)
    return ETAT["gen"]


def segmente(png, points, chemin_modele):
    import numpy as np
    import torch
    from PIL import Image
    if ETAT["gen"] is None:
        etape("chargement")
    modele, Generateur = charge_modele(chemin_modele)
    etape("calcul")
    t_calcul = time.time()
    gen = Generateur(modele, points_per_side=points, pred_iou_thresh=0.8, stability_score_thresh=0.9, min_mask_region_area=300)
    im = Image.open(io.BytesIO(png)).convert("RGBA")
    alpha = np.array(im)[:, :, 3] > 8
    fond = Image.new("RGBA", im.size, (255, 255, 255, 255))
    fond.alpha_composite(im)
    rgb = np.array(fond.convert("RGB"))
    with torch.inference_mode(), torch.autocast("cuda" if torch.cuda.is_available() else "cpu", dtype=torch.bfloat16):
        masques = gen.generate(rgb)
    gardes = []
    for m in masques:
        seg = m["segmentation"]
        n = int(seg.sum())
        # on ne garde que ce qui est dans le personnage (le fond transparent n'est pas une partie)
        if n == 0 or (seg & alpha).sum() / n < 0.6:
            continue
        gardes.append((n, seg))
    ETAT["calcul_dernier"] = round(time.time() - t_calcul, 1)
    etape("encodage")
    gardes.sort(key=lambda t: -t[0])
    sortie = []
    for k, (n, seg) in enumerate(gardes):
        ys, xs = np.where(seg)
        x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
        tampon = io.BytesIO()
        Image.fromarray((seg[y0:y1, x0:x1] * 255).astype("uint8")).save(tampon, format="PNG", optimize=True)
        sortie.append({"id": k, "aire": n, "x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0,
                       "png": base64.b64encode(tampon.getvalue()).decode("ascii")})
    return {"largeur": im.size[0], "hauteur": im.size[1], "masques": sortie}


class Gestionnaire(BaseHTTPRequestHandler):
    chemin_modele = ""

    def log_message(self, fmt, *args):
        print(f"{self.client_address[0]} - {urllib.parse.urlparse(self.path).path} {args[1] if len(args) > 1 else ''}", flush=True)

    def repond(self, code, obj):
        corps = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corps)))
        self.end_headers()
        self.wfile.write(corps)

    def do_GET(self):
        if urllib.parse.urlparse(self.path).path == "/etat":
            maintenant = time.time()
            self.repond(200, {"ok": True, "modele": ETAT["modele"] or os.path.basename(self.chemin_modele), "charge": ETAT["gen"] is not None, "gpu": ETAT["gpu"],
                              "occupe": ETAT["occupe"], "etape": ETAT["etape"] if ETAT["occupe"] else None,
                              "ecoule": round(maintenant - ETAT["etape_debut"], 1) if ETAT["occupe"] else 0,
                              "calcul_dernier": ETAT["calcul_dernier"]})
        else:
            self.repond(404, {"erreur": "inconnu"})

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        if url.path != "/segmente":
            self.repond(404, {"erreur": "inconnu"})
            return
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > TAILLE_MAX:
            self.repond(413, {"erreur": "image absente ou trop grosse"})
            return
        png = self.rfile.read(n)
        points = max(8, min(64, int((urllib.parse.parse_qs(url.query).get("points") or ["32"])[0])))
        try:
            with VERROU:
                ETAT["occupe"] = True
                etape("lecture")
                try:
                    reponse = segmente(png, points, self.chemin_modele)
                finally:
                    ETAT["occupe"] = False
                self.repond(200, reponse)
        except Exception as e:  # noqa: BLE001 : on le dit au serveur du jeu plutot que de couper la connexion
            print("erreur :", repr(e), flush=True)
            self.repond(500, {"erreur": str(e)})


def adresse(hote):
    if hote != "tailscale":
        return hote
    for exe in ("tailscale", r"C:\Program Files\Tailscale\tailscale.exe"):
        try:
            sortie = subprocess.run([exe, "ip", "-4"], capture_output=True, text=True, timeout=10).stdout.split()
            if sortie:
                return sortie[0]
        except Exception:  # noqa: BLE001
            pass
    raise SystemExit("tailscale introuvable : impossible de lire l'adresse Tailscale de cette machine")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--port", type=int, default=PORT_DEFAUT)
    p.add_argument("--hote", default="127.0.0.1")
    p.add_argument("--modele", default=os.path.join(os.path.expanduser("~"), ".adventure-card", "sam2_hiera_large.pt"))
    a = p.parse_args()
    Gestionnaire.chemin_modele = a.modele
    hote = adresse(a.hote)
    print(f"Serveur SAM sur http://{hote}:{a.port} (modele {a.modele})", flush=True)
    ThreadingHTTPServer((hote, a.port), Gestionnaire).serve_forever()
