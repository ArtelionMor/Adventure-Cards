#!/usr/bin/env python3
"""LE LOT : decoupe puis assemble, l'un apres l'autre, tous les personnages qui n'ont pas encore ete touches.
Tourne SUR mon-mien (SAM en local, l'IA sur le Mac par le reseau Tailscale), reprend tout seul apres un arret, et
ecrit ce qu'il fait dans <auto>/etat.json (un etat par personnage + un « battement » : l'heure de son dernier signe de
vie) et <auto>/lot.log.

  python lot.py [--depot C:\\Users\\telia\\Adventure-Cards] [--auto C:\\Users\\telia\\auto] [--ia http://…:11434]
                [--modele qwen3.5:27b] [--points 64] [--ids a,b,c] [--max N]

  --ids   ne traiter que ceux-la (le pilote) ; sans : tous les Characters non touches
  Arret propre : creer le fichier <auto>/STOP (il finit le personnage en cours puis s'arrete).

Un personnage « touche » n'est JAMAIS ecrase : plus d'un calque, un maillage, ou une animation = quelqu'un y a deja
travaille. Pour recommencer l'un d'eux, le retirer d'etat.json et remettre son rig en squelette type.
"""
import argparse, hashlib, json, os, re, subprocess, sys, time, unicodedata

ESPECES = [
    (r"octo", "tete, corps, tentacules, tuyau, jambes, arme"),
    (r"cameleon", "tete, corps, bras, jambes, queue, feuilles, arme"),
    (r"owl|raven|robin|crow|falcon|bird", "tete, aile_gauche, aile_droite, corps, queue, pattes, arme, cape"),
    (r"frog|toad", "tete, corps, bras, jambes, arme, cape"),
    (r"kitsune|fox|wolf|dog|cat|rabbit|mouse|goat|sloth|panda|duke", "tete, oreille_gauche, oreille_droite, corps, bras, jambes, queue, arme, cape"),
]
DEFAUT = "tete, corps, bras, jambes, queue, arme, cape"


def slug(nom):
    s = unicodedata.normalize("NFD", nom).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def parties_de(identifiant):
    for motif, parties in ESPECES:
        if re.search(motif, identifiant):
            return parties
    return DEFAUT


def touche(dossier):
    """Quelqu'un a-t-il deja travaille ce rig ? (plus d'un calque, un maillage, une animation)"""
    try:
        rig = json.load(open(os.path.join(dossier, "rig.json"), encoding="utf-8"))
    except Exception:
        return "rig.json illisible"
    if len(rig.get("calques", [])) != 1:
        return "déjà découpé en calques"
    if any(c.get("mesh") for c in rig["calques"]):
        return "déjà maillé"
    try:
        clips = json.load(open(os.path.join(dossier, "clips.json"), encoding="utf-8")).get("clips", {})
        if clips:
            return "déjà animé"
    except Exception:
        pass
    return None


def empreinte(dossier):
    try:
        return hashlib.sha1(open(os.path.join(dossier, "rig.json"), "rb").read()).hexdigest()
    except Exception:
        return None


def main():
    # sans console (tache cachee de Windows), Python ecrit en cp1252 et plante sur le moindre accent
    for flux in (sys.stdout, sys.stderr):
        try:
            flux.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    p = argparse.ArgumentParser()
    p.add_argument("--depot", default=r"C:\Users\telia\Adventure-Cards")
    p.add_argument("--auto", default=r"C:\Users\telia\auto")
    p.add_argument("--ia", default="http://100.119.195.112:11434")
    p.add_argument("--sam", default="http://100.79.166.73:7340")
    p.add_argument("--modele", default="qwen3.5:27b")
    p.add_argument("--points", type=int, default=64)
    p.add_argument("--ids", default="")
    p.add_argument("--max", type=int, default=0)
    p.add_argument("--python", default=r"C:\Users\telia\sam2-env\Scripts\python.exe")
    p.add_argument("--node", default="node")
    p.add_argument("--etape", default="tout", choices=["tout", "decoupe", "assemble"], help="decoupe : SAM + IA seulement ; assemble : rig-auto sur ce qui est decoupe ; tout : les deux")
    p.add_argument("--refaire", action="store_true", help="avec --etape assemble : refait aussi ce qui est deja fait (depuis sa decoupe)")
    a = p.parse_args()
    os.makedirs(a.auto, exist_ok=True)
    f_etat, f_log, f_stop = (os.path.join(a.auto, n) for n in ("etat.json", "lot.log", "STOP"))

    def log(msg):
        ligne = "%s  %s" % (time.strftime("%Y-%m-%d %H:%M:%S"), msg)
        print(ligne, flush=True)
        with open(f_log, "a", encoding="utf-8") as f:
            f.write(ligne + "\n")

    etat = json.load(open(f_etat, encoding="utf-8")) if os.path.exists(f_etat) else {}

    def sauve(courant=None):
        etat["_battement"] = time.strftime("%Y-%m-%dT%H:%M:%S")
        etat["_courant"] = courant
        json.dump(etat, open(f_etat, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    chars = os.path.join(a.depot, "Graphical Assets", "Characters")
    tous = sorted(slug(os.path.splitext(f)[0]) for f in os.listdir(chars) if f.lower().endswith(".png"))
    if a.ids:
        tous = [i for i in a.ids.split(",") if i]
    faits = 0
    log("lot démarré : %d personnage(s) candidat(s), modèle %s, SAM %d points" % (len(tous), a.modele, a.points))
    for ident in tous:
        if os.path.exists(f_stop):
            log("arrêt demandé (fichier STOP)"); break
        if a.max and faits >= a.max:
            break
        e = etat.get(ident, {})
        statut = e.get("statut")
        sortie = os.path.join(a.auto, "sortie", ident)
        deja_decoupe = os.path.exists(os.path.join(sortie, "etiquettes.png")) and statut in ("decoupe_faite", "fait", "a_verifier")
        if statut == "ignore" or (statut == "echec" and e.get("essais", 0) >= 3):
            continue
        if a.etape == "decoupe" and deja_decoupe:
            continue
        if a.etape == "assemble" and not (deja_decoupe and (statut == "decoupe_faite" or a.refaire)):
            continue
        if a.etape == "tout" and statut in ("fait", "a_verifier"):
            continue
        dossier = os.path.join(a.depot, "game", "data", "rigs", ident)
        if not os.path.isdir(dossier):
            etat[ident] = {"statut": "ignore", "raison": "pas de dossier de rig"}; sauve(); continue
        if not deja_decoupe:
            raison = touche(dossier)
            if raison:
                etat[ident] = {"statut": "ignore", "raison": raison}; log("%s : ignoré (%s)" % (ident, raison)); sauve(); continue
        os.makedirs(sortie, exist_ok=True)
        base = e.get("base") if deja_decoupe and e.get("base") else empreinte(dossier)
        etat[ident] = {"statut": "en_cours", "debut": time.strftime("%Y-%m-%dT%H:%M:%S"), "base": base, "essais": e.get("essais", 0) + 1}
        sauve(ident)
        t0 = time.time()
        if not deja_decoupe:
            log("%s : découpe (%s)" % (ident, parties_de(ident)))
            r1 = subprocess.run([a.python, os.path.join(a.depot, "scripts", "auto", "decoupe.py"), "--source", os.path.join(dossier, "source.png"),
                                 "--sortie", sortie, "--parties", parties_de(ident), "--sam", a.sam, "--ia", a.ia, "--modele", a.modele, "--points", str(a.points)],
                                capture_output=True, text=True, timeout=3600, encoding="utf-8", errors="replace")
            if r1.returncode != 0:
                etat[ident].update({"statut": "echec", "etape": "découpe", "erreur": (r1.stdout + r1.stderr).strip()[-400:]})
                log("%s : ÉCHEC découpe : %s" % (ident, etat[ident]["erreur"][-160:])); sauve(); continue
            log("%s : %s" % (ident, r1.stdout.strip().splitlines()[-1] if r1.stdout.strip() else "?"))
            etat[ident].update({"statut": "decoupe_faite", "duree_decoupe": round(time.time() - t0)})
            if a.etape == "decoupe":
                faits += 1; sauve(); continue
        r2 = subprocess.run([a.node, os.path.join(a.depot, "scripts", "rig-auto.mjs"), ident, "--auto", sortie], capture_output=True, text=True,
                            timeout=1800, encoding="utf-8", errors="replace", cwd=a.depot)
        if r2.returncode != 0:
            etat[ident].update({"statut": "echec", "etape": "assemblage", "erreur": (r2.stdout + r2.stderr).strip()[-400:]})
            log("%s : ÉCHEC assemblage : %s" % (ident, etat[ident]["erreur"][-160:])); sauve(); continue
        ligne = r2.stdout.strip().splitlines()[-1]
        try:
            rapport = json.load(open(os.path.join(sortie, "rapport.json"), encoding="utf-8"))
        except Exception:
            rapport = {"problemes": []}
        pb = [q for q in rapport.get("problemes", []) if q.get("gravite") != "info"]
        graves = [q for q in pb if q.get("gravite") == "erreur"]
        etat[ident].update({"statut": "a_verifier" if pb else "fait", "fin": time.strftime("%Y-%m-%dT%H:%M:%S"),
                            "duree": round(time.time() - t0), "problemes": len(pb), "graves": len(graves), "resume": ligne})
        log("%s : %s (%d s)" % (ident, ligne, etat[ident]["duree"]))
        faits += 1
        sauve()
    sauve(None)
    log("lot terminé : %d personnage(s) fait(s) dans cette passe" % faits)


if __name__ == "__main__":
    main()
