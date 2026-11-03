#!/usr/bin/env python3
"""Refait le tri des crânes et le nettoyage de « corps » sur une découpe DÉJÀ faite (etiquettes.png + parties.json), sans refaire l'IA.
   python nettoie-etiquettes.py <dossier de la découpe> <source.png>"""
import json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import decoupe
d, src = sys.argv[1], sys.argv[2]
noms = [q["nom"] for q in json.loads(open(os.path.join(d, "parties.json"), "rb").read().decode("utf-8", "replace"))["parties"]]
lab = np.array(Image.open(os.path.join(d, "etiquettes.png")))
etiq = lab.astype(np.int16) - 1
n = decoupe.cranes_vers_decor(etiq, noms, Image.open(src).convert("RGBA"))
out = (etiq + 1).astype(np.uint8)
out[etiq < 0] = 0
Image.fromarray(out, "L").save(os.path.join(d, "etiquettes.png"))
print("nettoyé : %d px déplacés" % n)
