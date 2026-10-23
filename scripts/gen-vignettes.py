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
    python scripts/gen-vignettes.py --progression   (dit ou il en est : « @@progression 12/120 »)

Le bouton « Actualiser les images » de l'Atelier le lance aussi (scripts/gen-sprites.mjs), quand Python et Pillow
sont la, avec --progression : la barre de chargement du Card Builder lit ces lignes. Sans eux, rien ne casse : le
jeu prend les originaux.
"""
import json
import os
import sys

from PIL import Image

RACINE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
# Les dossiers allegés : ceux des gros sprites (les tuiles de Decor/ et les icones sont deja petites). Ce sont des cles
# de sprites.js ; un nom peut y contenir un sous-dossier (les personnages sont ranges par espece : « Dog/Dog Cocker.png »).
DOSSIERS = ['Graphical Assets/Characters', 'Graphical Assets/Cards', 'Graphical Assets/Buildings', 'Graphical Assets/Ressources', 'Graphical Assets/Old UI']
TAILLE_MAX = 512        # pixels, plus grand cote : assez pour un batiment de 7 personnages sur un ecran x2
# Les images d'INTERFACE dessinees en 2000 px (icones de la navigation, dos de carte : ~1 a 3 Mo chacune) : on
# balaye ces dossiers directement (sprites.js ne les liste pas) et on les reduit plus fort — elles ne s'affichent
# jamais a plus de ~100 pixels. Une petite image (une icone de 64 px) n'est pas touchee.
INTERFACE = ['Graphical Assets/Icons', 'Graphical Assets/CardBack']
TAILLE_INTERFACE = 256
SEUIL_INTERFACE = 100_000   # octets : en dessous, l'original est deja leger
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
    progression = '--progression' in sys.argv
    sprites = suivies()
    faites, refaites, a_faire = [], 0, []

    # Deux temps : on dresse d'abord la liste de ce qui est a refaire (pour pouvoir dire « 12 sur 120 »), puis
    # on le fait.
    def allege(dossier, nom, taille):
        src = os.path.join(RACINE, dossier, nom)
        rel = f'{dossier}/{nom}'
        dst = os.path.join(SORTIE, dossier, os.path.splitext(nom)[0] + '.webp')
        if not os.path.exists(src):
            # L'original a disparu (dossier deplace, renomme) mais sa vignette est la : on la GARDE. Sinon un
            # rangement des images sur le disque viderait la liste, et le jeu perdrait tous ses sprites d'un coup.
            if os.path.exists(dst):
                faites.append(rel)
            return
        if tout or not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
            a_faire.append((src, dst, taille))
        faites.append(rel)

    def fabrique(src, dst, taille):
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with Image.open(src) as im:
            im = im.convert('RGBA')
            im.thumbnail((taille, taille), Image.LANCZOS)
            # ⚠ method=4 (le defaut de libwebp), pas 6 : mesure le 23 oct. 2026 sur une carte
            # de 1024 px, 3,3 s par image en 6 contre 0,05 s en 4, pour 39 Ko contre 40.
            # 121 cartes deposees d'un coup faisaient attendre 7 minutes le bouton
            # « Actualiser les images » du Card Builder, qui semblait ne rien faire.
            im.save(dst, 'WEBP', quality=QUALITE, method=4)

    for dossier in DOSSIERS:
        for nom in sprites.get(dossier, []):
            allege(dossier, nom, TAILLE_MAX)
    for dossier in INTERFACE:
        racine = os.path.join(RACINE, dossier)
        if not os.path.isdir(racine):
            continue
        for nom in sorted(os.listdir(racine)):
            if nom.lower().endswith('.png') and os.path.getsize(os.path.join(racine, nom)) >= SEUIL_INTERFACE:
                allege(dossier, nom, TAILLE_INTERFACE)
    if progression:
        print(f'@@progression 0/{len(a_faire)}', flush=True)
    for k, (src, dst, taille) in enumerate(a_faire, 1):
        fabrique(src, dst, taille)
        refaites += 1
        if progression:
            print(f'@@progression {k}/{len(a_faire)}', flush=True)
    faites.sort()
    with open(LISTE, 'w', encoding='utf-8', newline='\n') as f:
        f.write('// Genere par scripts/gen-vignettes.py — ne pas editer a la main.\n')
        f.write('// Les images qui ont une version allegee dans game/vignettes/ (meme chemin, extension .webp).\n')
        f.write('export const VIGNETTES = ' + json.dumps(faites, ensure_ascii=False, indent=2) + ';\n')
    poids = sum(os.path.getsize(os.path.join(dp, n)) for dp, _, ns in os.walk(SORTIE) for n in ns)
    print(f'{len(faites)} vignettes ({refaites} refaites), {poids / 1e6:.1f} Mo dans game/vignettes/')


if __name__ == '__main__':
    main()
