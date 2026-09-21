// BANC DES COURBES DE PROGRESSION — les six promesses du modele
// (`game/src/config/courbes.js`), celles sur lesquelles l'editeur de l'Atelier repose.
//
//   node scripts/test-courbes.mjs
//
// Ce qu'on verifie, et pourquoi c'est ici plutot que dans une relecture a l'oeil :
//   1. CHAQUE LIGNE DIFFERE DE LA PRECEDENTE, sur tout l'horizon, pour tout profil
//      valide. C'est la contrainte absolue : un niveau qui ne change rien ne se sent pas.
//   2. La valeur d'une colonne a son k-ieme tour NE DEPEND PAS DU RYTHME DES AUTRES.
//      Formellement : une valeur rendue est toujours celle de SA courbe au niveau ou le
//      tour tombe. Les autres colonnes decident le QUAND, jamais le COMBIEN.
//   3. Changer le rythme d'une colonne NE DEFORME PAS SA COURBE : les valeurs restent
//      celles de la meme fonction, seuls les niveaux ou elles apparaissent bougent — et
//      la ou deux rythmes tombent sur le meme niveau, ils rendent le meme nombre.
//   4. Les deux BOUCLES (additive et proportionnelle) sont CONTINUES a la jonction des
//      cycles : un cycle qui repart doit recoller, sinon la courbe fait une marche.
//   5. Le validateur attrape bien |Δvaleur| < K — le segment qui promet des tours plats.
//   6. MONOTONIE ET ABSENCE DE DERIVE D'ARRONDI sur 10 000 niveaux. C'est le piege que
//      la dette existe pour fermer : arrondir l'increment au lieu de la cible cumulee
//      marche parfaitement sur 40 niveaux et se voit seulement sur 10 000.
import { developpe, valide, valeurBornee, valeurIdeale, tableColonne, colonneVide, profilVide,
  ardoise, versTSV, versJSON, depuisJSON, segments, keyframes } from '../game/src/config/courbes.js';

const rouge = t => `\x1b[31m${t}\x1b[0m`;
const vert = t => `\x1b[32m${t}\x1b[0m`;
let pass = 0;
const echecs = [];
const ok = (nom, vrai, detail = '') => {
  if (vrai) { pass++; console.log('  ok   ' + nom); return; }
  echecs.push(`${nom} — ${detail}`);
  console.log(rouge('  FAIL ') + nom + (detail ? '  ' + detail : ''));
};

// Un hasard REPRODUCTIBLE : un banc qui echoue une fois sur cinq n'apprend rien.
let graine = 20260921;
const alea = () => (graine = (graine * 1103515245 + 12345) % 2147483648) / 2147483648;
const entre = (a, b) => a + Math.floor(alea() * (b - a + 1));
const piocheDans = liste => liste[entre(0, liste.length - 1)];

/** Une colonne au hasard, mais plausible : les valeurs restent lisibles. */
function colonneAuHasard(i) {
  const c = colonneVide('c' + i, 'Colonne ' + i);
  const mode = piocheDans(['regulier', 'regulier', 'toujours', 'liste']);
  c.rythme = { mode, x: entre(1, 6), cap: alea() < 0.2 ? entre(3, 12) : 0, niveaux: [entre(2, 10), entre(11, 25), entre(26, 39)] };
  const n = entre(2, 4);
  const ks = [];
  let niveau = 1, valeur = entre(1, 30);
  for (let k = 0; k < n; k++) {
    ks.push({ niveau, valeur, forme: piocheDans(Object.keys({ lineaire: 1, easeIn: 1, easeOut: 1 })), echelle: piocheDans(['additive', 'additive', 'proportionnelle']) });
    niveau += entre(6, 15);
    valeur += entre(10, 60);   // large : on veut des profils VALIDES, pas des tours plats
  }
  c.courbe = { keyframes: ks, prolonger: alea() < 0.5 };
  return c;
}

const profilAuHasard = () => ({
  id: 'p', nom: 'Profil', niveauDepart: 1, horizon: entre(20, 60),
  colonnes: Array.from({ length: entre(1, 4) }, (_, i) => colonneAuHasard(i))
});

// ---------------------------------------------------------------------------
console.log('\n=== La primitive a dette ===\n');

{
  // Les tours d'un niveau se distribuent SANS PERTE : autant de tours rendus que de
  // niveaux, et chacun au prorata de son poids.
  const poids = [0.5, 0.3, 0.2];
  const ard = ardoise(3);
  ard.avance(poids.map(w => 0.5 * w));
  const pris = [0, 0, 0];
  for (let L = 0; L < 1000; L++) { ard.avance(poids); const i = ard.creanciere(); ard.rend(i); pris[i]++; }
  ok('1000 niveaux donnent 1000 tours', pris.reduce((a, b) => a + b, 0) === 1000, `rendus : ${pris}`);
  ok('chacun au prorata de son poids', pris.every((n, i) => Math.abs(n - poids[i] * 1000) <= 1), `${pris} pour ${poids.map(w => w * 1000)}`);

  // La meme ardoise, l'autre bout : la cible cumulee arrondie ne derive jamais.
  const a2 = ardoise(1);
  let cumul = 0;
  for (let i = 1; i <= 9999; i++) cumul += a2.versEntier(0, i / 3);
  ok('la cible cumulee ne derive pas', cumul === Math.round(9999 / 3), `${cumul} au lieu de ${Math.round(9999 / 3)}`);
}

// ---------------------------------------------------------------------------
console.log('\n=== 1. Chaque ligne differe de la precedente ===\n');

{
  let profils = 0, fautifs = [];
  for (let essai = 0; essai < 300; essai++) {
    const p = profilAuHasard();
    const dev = developpe(p);
    if (valide(p, dev).some(v => v.bad)) continue;   // « pour tout profil VALIDE »
    profils++;
    for (let i = 1; i < dev.lignes.length; i++) {
      if (dev.lignes[i].valeurs.every((v, j) => v === dev.lignes[i - 1].valeurs[j])) {
        fautifs.push(`niveau ${dev.lignes[i].niveau} (${dev.lignes[i].valeurs})`);
        break;
      }
    }
  }
  ok(`${profils} profils valides tires au hasard, aucune ligne repetee`, !fautifs.length, fautifs.slice(0, 3).join(' ; '));
  ok('assez de profils valides pour que le test dise quelque chose', profils >= 30, `seulement ${profils}`);

  // Le cas limite qui a motive le tour force : deux colonnes lentes et une courbe plate
  // par endroits. Sans le secours, il resterait des niveaux muets.
  const p = { id: 'lent', nom: 'Lent', niveauDepart: 1, horizon: 30, colonnes: [
    { ...colonneVide('a', 'A'), rythme: { mode: 'regulier', x: 5, cap: 0, niveaux: [] },
      courbe: { keyframes: [{ niveau: 1, valeur: 0, forme: 'lineaire', echelle: 'additive' }, { niveau: 30, valeur: 40, forme: 'lineaire', echelle: 'additive' }], prolonger: true } },
    { ...colonneVide('b', 'B'), rythme: { mode: 'regulier', x: 9, cap: 0, niveaux: [] },
      courbe: { keyframes: [{ niveau: 1, valeur: 5, forme: 'easeIn', echelle: 'additive' }, { niveau: 30, valeur: 60, forme: 'lineaire', echelle: 'additive' }], prolonger: true } }
  ] };
  const dev = developpe(p);
  const repetees = dev.lignes.filter((l, i) => i > 0 && l.valeurs.every((v, j) => v === dev.lignes[i - 1].valeurs[j]));
  ok('deux colonnes lentes : aucun niveau muet', !repetees.length, `${repetees.length} niveau(x) repete(s)`);
}

// ---------------------------------------------------------------------------
console.log('\n=== 2. Une colonne ne depend pas du rythme des autres ===\n');

{
  /** L'invariant : toute valeur rendue est celle de SA courbe, au niveau du tour. */
  const surSaCourbe = (p) => {
    const dev = developpe(p);
    for (let i = 0; i < p.colonnes.length; i++) {
      for (const L of dev.tours[i]) {
        const attendu = Math.round(valeurBornee(p.colonnes[i], L));
        const ligne = dev.lignes.find(l => l.niveau === L);
        if (ligne.valeurs[i] !== attendu) return `${p.colonnes[i].id} niveau ${L} : ${ligne.valeurs[i]} au lieu de ${attendu}`;
      }
    }
    return null;
  };
  let faute = null;
  for (let essai = 0; essai < 200 && !faute; essai++) faute = surSaCourbe(profilAuHasard());
  ok('chaque valeur rendue est celle de sa propre courbe, au niveau du tour', !faute, faute || '');

  // Et concretement : on triture le rythme du VOISIN, la colonne surveillee garde la
  // meme valeur partout ou son tour retombe au meme niveau.
  const base = () => ({ id: 'p', nom: 'P', niveauDepart: 1, horizon: 40, colonnes: [
    { ...colonneVide('pv', 'PV'), rythme: { mode: 'regulier', x: 2, cap: 0, niveaux: [] },
      courbe: { keyframes: [{ niveau: 1, valeur: 20, forme: 'lineaire', echelle: 'additive' }, { niveau: 40, valeur: 140, forme: 'easeIn', echelle: 'additive' }], prolonger: true } },
    { ...colonneVide('deg', 'Dégâts'), rythme: { mode: 'regulier', x: 4, cap: 0, niveaux: [] },
      courbe: { keyframes: [{ niveau: 1, valeur: 2, forme: 'lineaire', echelle: 'additive' }, { niveau: 40, valeur: 30, forme: 'lineaire', echelle: 'additive' }], prolonger: true } }
  ] });
  const lu = (dev, i) => new Map(dev.tours[i].map(L => [L, dev.lignes.find(l => l.niveau === L).valeurs[i]]));
  const a = base(); const devA = developpe(a);
  const b = base(); b.colonnes[1].rythme = { mode: 'liste', x: 4, cap: 0, niveaux: [7, 19, 33] }; const devB = developpe(b);
  const c = base(); c.colonnes[1].rythme = { mode: 'toujours', x: 1, cap: 0, niveaux: [] }; const devC = developpe(c);
  const mA = lu(devA, 0), mB = lu(devB, 0), mC = lu(devC, 0);
  const communs = [...mA.keys()].filter(L => mB.has(L) || mC.has(L));
  const differents = communs.filter(L => (mB.has(L) && mB.get(L) !== mA.get(L)) || (mC.has(L) && mC.get(L) !== mA.get(L)));
  ok(`le rythme du voisin change (${communs.length} niveaux communs), les PV n'y bougent pas`, !differents.length, `niveaux ${differents.slice(0, 5)}`);
  ok('le voisin, lui, a bien change de calendrier', devA.tours[1].join() !== devB.tours[1].join(), 'le test ne prouverait rien');
}

// ---------------------------------------------------------------------------
console.log('\n=== 3. Changer un rythme deplace, ne deforme pas ===\n');

{
  // ⚠ Une colonne SEULE prend tous les tours quel que soit son X : les poids sont
  // normalises, et il faut bien que quelque chose bouge a chaque niveau. C'est avec une
  // voisine que « 1 sur 4 » devient un vrai espacement — d'ou le PV a cote de l'armure.
  const colonne = (rythme) => ({ id: 'p', nom: 'P', niveauDepart: 1, horizon: 41, colonnes: [
    { ...colonneVide('arm', 'Armure'), rythme,
      courbe: { keyframes: [{ niveau: 1, valeur: 0, forme: 'lineaire', echelle: 'additive' }, { niveau: 41, valeur: 80, forme: 'lineaire', echelle: 'additive' }], prolonger: true } },
    { ...colonneVide('pv', 'PV'), rythme: { mode: 'regulier', x: 1, cap: 0, niveaux: [] },
      courbe: { keyframes: [{ niveau: 1, valeur: 20, forme: 'lineaire', echelle: 'additive' }, { niveau: 41, valeur: 300, forme: 'lineaire', echelle: 'additive' }], prolonger: true } }
  ] });
  const rythmes = [
    { mode: 'toujours', x: 1, cap: 0, niveaux: [] },
    { mode: 'regulier', x: 4, cap: 0, niveaux: [] },
    { mode: 'liste', x: 1, cap: 0, niveaux: [5, 9, 17, 33] }
  ];
  const vues = rythmes.map(r => {
    const p = colonne(r), dev = developpe(p);
    return new Map(dev.tours[0].map(L => [L, dev.lignes.find(l => l.niveau === L).valeurs[0]]));
  });
  const p0 = colonne(rythmes[0]).colonnes[0];
  const horsCourbe = vues.flatMap((v, i) => [...v.entries()].filter(([L, val]) => val !== Math.round(valeurBornee(p0, L))).map(([L]) => `${i}@${L}`));
  ok('les trois rythmes rendent des valeurs de la MEME courbe', !horsCourbe.length, horsCourbe.slice(0, 4).join(' '));
  const partages = [...vues[0].keys()].filter(L => vues[1].has(L));
  ok(`aux ${partages.length} niveaux communs, les memes valeurs`, partages.length > 2 && partages.every(L => vues[0].get(L) === vues[1].get(L)));
  ok('les calendriers, eux, different bien', vues[0].size !== vues[1].size && vues[2].size === 4,
    `${vues.map(v => v.size)} tours`);
}

// ---------------------------------------------------------------------------
console.log('\n=== 4. Les boucles recollent ===\n');

{
  const boucle = (echelle, v0, v1) => ({
    ...colonneVide('b', 'Bouclée'),
    courbe: { keyframes: [{ niveau: 1, valeur: v0, forme: 'lineaire', echelle }, { niveau: 11, valeur: v1, forme: 'lineaire', echelle }], prolonger: false }
  });
  for (const [nom, col, pas] of [['additive', boucle('additive', 10, 30), 20], ['proportionnelle', boucle('proportionnelle', 10, 30), 3]]) {
    // La jonction : le dernier niveau d'un cycle et le premier du suivant sont le MEME
    // niveau. Des deux cotes, la courbe doit dire la meme chose.
    const jonctions = [11, 21, 31, 41];
    const sauts = jonctions.map(L => Math.abs(valeurIdeale(col, L + 0.001) - valeurIdeale(col, L - 0.001)));
    ok(`boucle ${nom} : aucune marche aux jonctions`, sauts.every(s => s < 0.5), `sauts ${sauts.map(s => s.toFixed(2))}`);
    // Et un cycle entier vaut bien ce qu'il annonce.
    const c0 = valeurIdeale(col, 11), c1 = valeurIdeale(col, 21);
    ok(`boucle ${nom} : un cycle vaut ${pas}`, Math.abs(nom === 'additive' ? c1 - c0 - pas : c1 / c0 - pas) < 1e-9, `${c0} → ${c1}`);
  }
}

// ---------------------------------------------------------------------------
console.log('\n=== 5. Le validateur attrape les tours plats ===\n');

{
  // 40 niveaux, un tour sur deux, 5 points d'ecart : la moitie des tours ne diront rien.
  const p = { id: 'plat', nom: 'Plat', niveauDepart: 1, horizon: 40, colonnes: [
    { ...colonneVide('arm', 'Armure'), rythme: { mode: 'regulier', x: 2, cap: 0, niveaux: [] },
      courbe: { keyframes: [{ niveau: 1, valeur: 3, forme: 'lineaire', echelle: 'additive' }, { niveau: 40, valeur: 8, forme: 'lineaire', echelle: 'additive' }], prolonger: true } }
  ] };
  const dev = developpe(p);
  const K = segments(p.colonnes[0], dev.tours[0])[0].tours.length;
  const msgs = valide(p, dev).filter(v => v.bad).map(v => v.msg);
  const plat = msgs.find(m => m.includes('tours seront plats'));
  ok(`le segment est signale (K = ${K} tours pour 5 points)`, !!plat, msgs.join(' | ') || 'aucun message');
  ok('le message nomme les trois leviers', !!plat && plat.includes('Élargis la plage') && plat.includes('espace le rythme') && plat.includes('rallonge le segment'), plat || '');
  ok('il compte les tours, pas les niveaux', !!plat && plat.includes(`${K} tours pour 5 points`), plat || '');

  // Le meme segment, avec assez de points : plus rien a dire.
  const sain = structuredClone(p);
  sain.colonnes[0].courbe.keyframes[1].valeur = 3 + K + 5;
  ok('elargir la plage suffit a faire taire le validateur', !valide(sain).some(v => v.bad && v.msg.includes('plats')));

  // Les autres controles.
  const casse = (fn) => { const q = structuredClone(p); fn(q); return valide(q).filter(v => v.bad).map(v => v.msg).join(' | '); };
  ok('keyframes non triees', casse(q => q.colonnes[0].courbe.keyframes[1].niveau = 1).includes('niveau 1'));
  ok('echelle proportionnelle avec un 0', casse(q => { q.colonnes[0].courbe.keyframes[0].valeur = 0; q.colonnes[0].courbe.keyframes[0].echelle = 'proportionnelle'; }).includes('keyframe à 0'));
  ok('echelle proportionnelle a cheval sur le signe', casse(q => { q.colonnes[0].courbe.keyframes[0].valeur = -4; q.colonnes[0].courbe.keyframes[0].echelle = 'proportionnelle'; }).includes('facteur ne change pas de signe'));
  ok('toutes les colonnes epuisees avant la fin', casse(q => { q.colonnes[0].rythme.cap = 3; }).includes('épuisées'));
  const avis = (() => { const q = structuredClone(p); q.colonnes[0].plafond = 5; return valide(q).map(v => v.msg).join(' | '); })();
  ok('plafond atteint avant la derniere keyframe', avis.includes('plafond 5 atteint'), avis);
}

// ---------------------------------------------------------------------------
console.log('\n=== 6. Dix mille niveaux, sans derive ===\n');

{
  const col = { ...colonneVide('long', 'Long'),
    courbe: { keyframes: [{ niveau: 1, valeur: 7, forme: 'lineaire', echelle: 'additive' }, { niveau: 3000, valeur: 9721, forme: 'easeOut', echelle: 'additive' }], prolonger: true } };
  const t = tableColonne(col, 1, 10000);
  ok('monotone du debut a la fin', t.entiers.every((v, i) => !i || v >= t.entiers[i - 1]));
  const derive = t.entiers[t.entiers.length - 1] - Math.round(valeurBornee(col, 10000));
  ok('la derniere valeur est exactement celle de la courbe', derive === 0, `${derive} point(s) de derive`);
  const somme = t.pas.reduce((a, b) => a + b, 0);
  ok('la somme des pas fait la montee entiere', somme === t.entiers[t.entiers.length - 1] - t.entiers[0], `${somme}`);
  const maxEcart = Math.max(...t.entiers.map((v, i) => Math.abs(v - t.reels[i])));
  ok('aucune valeur ne s’ecarte de plus d’un demi-point de la courbe', maxEcart <= 0.5 + 1e-9, `${maxEcart}`);

  // Une descente (reduction de cout) : meme promesse, dans l'autre sens.
  const bas = { ...colonneVide('cout', 'Coût'), plancher: 1,
    courbe: { keyframes: [{ niveau: 1, valeur: 9, forme: 'lineaire', echelle: 'additive' }, { niveau: 400, valeur: 1, forme: 'lineaire', echelle: 'additive' }], prolonger: true } };
  const tb = tableColonne(bas, 1, 10000);
  ok('une courbe descendante reste monotone', tb.entiers.every((v, i) => !i || v <= tb.entiers[i - 1]));
  ok('le plancher tient', Math.min(...tb.entiers) === 1);

  // Et le developpement complet ne s'effondre pas sur un long horizon.
  const t0 = Date.now();
  const grand = { id: 'g', nom: 'G', niveauDepart: 1, horizon: 10000, colonnes: [col, bas, colonneAuHasard(9)] };
  const dev = developpe(grand);
  ok(`10 000 niveaux developpes (${Date.now() - t0} ms)`, dev.lignes.length === 10000);
  const repetees = dev.lignes.filter((l, i) => i > 0 && l.valeurs.every((v, j) => v === dev.lignes[i - 1].valeurs[j])).length;
  ok('et les colonnes ont de quoi tenir jusqu’au bout', repetees === 0 || valide(grand, dev).some(v => v.bad), `${repetees} lignes repetees sans que la validation le dise`);
}

// ---------------------------------------------------------------------------
console.log('\n=== Les sorties ===\n');

{
  const p = profilVide('duc', 'Grand-Duc');
  p.colonnes.push({ ...colonneVide('arm', 'Armure'), stockage: 'modificateur',
    courbe: { keyframes: [{ niveau: 1, valeur: 4, forme: 'lineaire', echelle: 'additive' }, { niveau: 20, valeur: 44, forme: 'lineaire', echelle: 'additive' }], prolonger: true } });
  const q = { ...profilVide('loup', 'Loup'), colonnes: [colonneVide('hp', 'PV')] };
  const tsv = versTSV([p, q]).trim().split('\n');
  ok('TSV : un en-tete, puis une ligne par niveau et par profil', tsv.length === 1 + p.horizon + q.horizon, `${tsv.length} lignes`);
  ok('TSV : colonnes id / level / stats', tsv[0] === 'id\tlevel\thp\tarm', tsv[0]);
  const ligneLoup = tsv.find(l => l.startsWith('loup\t5\t'));
  ok('TSV : une colonne inutilisee reste VIDE, pas a zero', ligneLoup.endsWith('\t'), ligneLoup);
  const monte = tsv.slice(1).find(l => +l.split('\t')[3] > 0);
  ok('TSV : le stockage « modificateur » part de 0 et monte ensuite',
    tsv[1].split('\t')[3] === '0' && !!monte, tsv[1] + ' / ' + (monte || 'jamais'));

  const relu = depuisJSON(versJSON([p]))[0];
  ok('JSON : un aller-retour rend le meme profil', JSON.stringify(developpe(relu).lignes) === JSON.stringify(developpe(p).lignes));
  ok('JSON : les valeurs developpees n’y sont pas', !versJSON([p]).includes('"lignes"'));
  const vieux = depuisJSON('{"profils":[{"id":"v","colonnes":[{"id":"x","courbe":{"keyframes":[{"niveau":1,"valeur":2},{"niveau":9,"valeur":30}]}}]}]}')[0];
  ok('JSON : un profil incomplet se relit quand meme', keyframes(vieux.colonnes[0]).length === 2 && developpe(vieux).lignes.length > 1);
}

// ---------------------------------------------------------------------------
for (const e of echecs) console.log(rouge('  ECHEC     ') + e);
if (!echecs.length) console.log('\n' + vert('  Les courbes tiennent leurs six promesses.'));
console.log(`\n${pass} test(s) passe(s), ${echecs.length} echec(s).\n`);
process.exit(echecs.length ? 1 : 0);
