"""LES VERSIONS ALLEGEES DES IMAGES DU JEU (game/vignettes/ + game/data/vignettes.js).

Les sprites sont dessines en 2000 x 2000 (~1,5 Mo, ~220 Mo en tout) alors que le jeu ne les affiche jamais a plus
de ~500 pixels reels (un batiment de la carte, sur un ecran de telephone x2). Les charger tels quels rendait chaque
menu lent sur le telephone : le fichier a revalider aupres du Pi, puis a decoder en entier (16 Mo de pixels).

Ce script fabrique, pour chaque image des dossiers de sprites, une copie WebP dont le plus grand cote fait au plus
TAILLE_MAX pixels, et ecrit la liste de celles qui existent dans game/data/vignettes.js. Le jeu (ui/shell.js,
`asset`) prend la version allegee quand elle existe, l'original sinon ; l'ecran de chargement (ui/chargement.js)
les precharge toutes au demarrage.

    python scripts/gen-vignettes.py          (seules les images nouvelles ou modifiees sont refaites)
    python scripts/gen-vignettes.py --tout   (tout refaire)

Le bouton « Actualiser les images » de l'Atelier le lance aussi (scripts/gen-sprites.mjs), quand Python et Pillow
sont la. Sans eux, rien ne casse : le jeu prend les originaux.
"""
import json
import os
import sys

from PIL import Image

RACINE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
# Les dossiers allegés : ceux des gros sprites (les tuiles de Decor/ et les icones sont deja petites).
DOSSIERS = ['Characters', 'Machines', 'Ressources', 'UI']
TAILLE_MAX = 512        # pixels, plus grand cote : assez pour un batiment de 7 personnages sur un ecran x2
QUALITE = 85            # WebP avec transparence
SORTIE = os.path.join(RACINE, 'game', 'vignettes')
LISTE = os.path.join(RACINE, 'game', 'data', 'vignettes.js')


def suivies():
    """Les images listees par game/data/sprites.js (celles que le jeu connait), par dossier."""
    chemin = os.path.join(RACINE, 'game', 'data', 'sprites.js')
    texte = open(chemin, encoding='utf-8').read()
    return json.loads(texte[texte.index('{'):texte.rindex('}') + 1])


def main():
    tout = '--tout' in sys.argv
    sprites = suivies()
    faites, refaites = [], 0
    for dossier in DOSSIERS:
        for nom in sprites.get(dossier, []):
            src = os.path.join(RACINE, dossier, nom)
            if not os.path.exists(src):
                continue
            rel = f'{dossier}/{nom}'
            dst = os.path.join(SORTIE, dossier, os.path.splitext(nom)[0] + '.webp')
            if tout or not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                with Image.open(src) as im:
                    im = im.convert('RGBA')
                    im.thumbnail((TAILLE_MAX, TAILLE_MAX), Image.LANCZOS)
                    im.save(dst, 'WEBP', quality=QUALITE, method=6)
                refaites += 1
            faites.append(rel)
    faites.sort()
    with open(LISTE, 'w', encoding='utf-8', newline='\n') as f:
        f.write('// Genere par scripts/gen-vignettes.py — ne pas editer a la main.\n')
        f.write('// Les images qui ont une version allegee dans game/vignettes/ (meme chemin, extension .webp).\n')
        f.write('export const VIGNETTES = ' + json.dumps(faites, ensure_ascii=False, indent=2) + ';\n')
    poids = sum(os.path.getsize(os.path.join(dp, n)) for dp, _, ns in os.walk(SORTIE) for n in ns)
    print(f'{len(faites)} vignettes ({refaites} refaites), {poids / 1e6:.1f} Mo dans game/vignettes/')


if __name__ == '__main__':
    main()
