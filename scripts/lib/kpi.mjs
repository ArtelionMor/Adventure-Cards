// LES CHIFFRES D'UN CALCUL, LUS DANS SA SORTIE.
//
// Les outils de mesure (`matchups`, `analyse-cartes`, `simulate`…) ecrivent du TEXTE pour un
// humain. Une version du jeu veut garder « les taux de victoire, la heatmap, les cartes les
// plus fortes » de la mesure qui lui correspond : ce module relit ce texte et rend des
// donnees (JSON) qu'une page sait dessiner. Aucun outil n'a ete modifie pour ca — c'est le
// meme principe que `resumeCalcul()` du serveur, en plus complet.
//
// ⚠ C'EST DU PARSING DE TEXTE : si un outil change sa mise en forme, ce module doit suivre.
// Il ne devine jamais : une section qu'il ne reconnait pas est absente du resultat (et la
// page dit « pas de matrice dans ce calcul »), jamais inventee. `node scripts/test-versions.mjs`
// rejoue des sorties types et casse si le format derive.
//
// MODULE PUR (aucun import) : la page de versions et le serveur s'en servent tous les deux.

const PCT = /^(\d+(?:[.,]\d+)?)%$/;
const num = s => Number(String(s).replace(',', '.'));

/** Retire les sequences d'echappement du terminal et garde la derniere version d'une ligne reecrite (\r). */
export function lignesDe(texte) {
  return String(texte || '').replace(/\x1b\[[\d;?]*[A-Za-z]/g, '').split('\n')
    .map(l => l.replace(/\r+$/, '')).map(l => l.slice(l.lastIndexOf('\r') + 1).replace(/\s+$/, ''));
}

// ------------------------------------------------------------------ matchups.mjs
/**
 * Lit la sortie de `matchups.mjs`.
 * Rend { parties, niveau, mode, taille, equipes[], matrice[][], carree, precision, avantage,
 *        sur_cible:{n,sur}, repartition:{defavorable,equilibre,favorable}, ecrasants[], force[], heros[] }
 * ou null si la sortie ne contient pas de matrice.
 */
export function lisMatchups(texte) {
  const L = lignesDe(texte);
  const r = { parties: null, niveau: null, mode: null, taille: null };
  const tete = L.map(l => /^Matchups — (\d+) parties par paire, niveau (\d+), (.*?), equipes de (\d+)/.exec(l)).find(Boolean);
  if (tete) { r.parties = +tete[1]; r.niveau = +tete[2]; r.mode = tete[3]; r.taille = +tete[4]; }

  // La matrice : « Nom du deck | 52% 52% — 63% … ». La ligne d'en-tete (noms tronques) n'a pas de pourcentage.
  const lignesMatrice = [];
  for (const l of L) {
    const i = l.indexOf(' | ');
    if (i < 0) continue;
    const nom = l.slice(0, i).trim();
    const cases = l.slice(i + 3).trim().split(/\s+/).filter(Boolean);
    if (!nom || !cases.length) continue;
    if (!cases.every(c => PCT.test(c) || /^[—–-]$/.test(c))) continue;
    lignesMatrice.push({ nom, cases: cases.map(c => PCT.test(c) ? num(PCT.exec(c)[1]) / 100 : null) });
  }
  if (!lignesMatrice.length) return null;
  r.equipes = lignesMatrice.map(x => x.nom);
  r.matrice = lignesMatrice.map(x => x.cases);
  r.carree = r.matrice.every(row => row.length === r.matrice.length);

  const prec = L.map(l => /Precision : ±(\d+(?:[.,]\d+)?)%/.exec(l)).find(Boolean);
  if (prec) r.precision = num(prec[1]) / 100;
  const av = L.map(l => /Avantage de celui qui commence : (\d+)%/.exec(l)).find(Boolean);
  if (av) r.avantage = +av[1] / 100;
  const cible = L.map(l => /sur une cible.*:\s*(\d+)\s*\/\s*(\d+)/.exec(l)).find(Boolean);
  if (cible) r.sur_cible = { n: +cible[1], sur: +cible[2] };
  const rep = L.map(l => /^\s*(\d+) défavorable, (\d+) équilibré, (\d+) favorable/.exec(l)).find(Boolean);
  if (rep) r.repartition = { defavorable: +rep[1], equilibre: +rep[2], favorable: +rep[3] };

  // Les ecrasants : « A bat B 80% ± 10% », sous « N matchup(s) ecrasant(s) ».
  const iE = L.findIndex(l => /matchup\(s\) ecrasant/.test(l));
  r.ecrasants = [];
  const nbE = L.map(l => /^\s*(\d+) matchup\(s\) ecrasant/.exec(l)).find(Boolean);
  r.nb_ecrasants = nbE ? +nbE[1] : 0;   // la sortie n'en liste qu'une partie : le total est la ligne du titre
  if (iE >= 0) {
    for (let k = iE + 1; k < L.length; k++) {
      const m = /^\s+(.+?) bat (.+?) (\d+)% ± (\d+)%/.exec(L[k]);
      if (!m) { if (L[k].trim() === '' && r.ecrasants.length) break; continue; }
      r.ecrasants.push({ gagnant: m[1], perdant: m[2], taux: +m[3] / 100, marge: +m[4] / 100 });
    }
  }
  // La force globale de chaque deck (moyenne de ses matchups).
  const iF = L.findIndex(l => /Force globale de chaque deck/.test(l));
  r.force = [];
  if (iF >= 0) {
    for (let k = iF + 1; k < L.length; k++) {
      const m = /^\s+(.+?)\s+(\d+)%\s+[█▏▎▍▌▋▊▉]*\s*$/.exec(L[k]);
      if (m) r.force.push({ deck: m[1].trim(), taux: +m[2] / 100 });
      else if (r.force.length && L[k].trim() === '') break;
    }
  }
  // Par heros : la moyenne des forces des decks qui le contiennent. Les noms de heros sont
  // ceux de la sortie (« Médor+Felix+Corax »), separes par « + ».
  const parHeros = {};
  for (const f of r.force) for (const h of f.deck.split('+').map(s => s.trim()).filter(Boolean)) (parHeros[h] = parHeros[h] || []).push(f.taux);
  r.heros = Object.entries(parHeros).map(([nom, v]) => ({ nom, taux: v.reduce((a, b) => a + b, 0) / v.length, decks: v.length }))
    .sort((a, b) => b.taux - a.taux);
  return r;
}

// ------------------------------------------------------------------ analyse-cartes.mjs
/**
 * Lit la sortie de `analyse-cartes.mjs`.
 * Rend { contexte, parties, cartes: [{ nom, proposee, jouee, preferee, ecart, valeur }] } ou null.
 * « preferee » = part des fois ou la carte, jouable, a ete choisie (0..1). `ecart` est null
 * quand l'outil affiche « — » (bot sans Monte-Carlo : pas de mesure d'ecart).
 */
export function lisAnalyseCartes(texte) {
  const L = lignesDe(texte);
  const i = L.findIndex(l => /^carte\s+propos/.test(l));
  if (i < 0) return null;
  const cartes = [];
  for (let k = i + 1; k < L.length; k++) {
    const m = /^(.+?)\s{2,}(\d+)\s+(\d+)\s+(\d+)%\s+(—|-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)\s*$/.exec(L[k]);
    if (m) cartes.push({ nom: m[1].trim(), proposee: +m[2], jouee: +m[3], preferee: +m[4] / 100,
      ecart: m[5] === '—' ? null : num(m[5]), valeur: num(m[6]) });
    else if (cartes.length && L[k].trim() === '') break;
  }
  if (!cartes.length) return null;
  const ctx = L.find(l => /\(niveau \d+, (base|switch)\) contre/.test(l));
  const p = L.map(l => /^Analyse : (\d+) partie/.exec(l)).find(Boolean);
  return { contexte: ctx ? ctx.trim() : null, parties: p ? +p[1] : null, cartes };
}

// ------------------------------------------------------------------ un calcul entier
/**
 * Les chiffres d'un calcul range : une entree par ligne de la file, avec ce qu'on sait en lire.
 * `lignes` = celles de `calcul.json` rouvert (chacune porte `outil`, `libelle`, `resume`, `sortie`).
 * Rend [{ libelle, outil, resume, matchups?, cartes? }].
 */
export function kpiDuCalcul(lignes) {
  const sortie = [];
  for (const l of lignes || []) {
    const e = { libelle: l.libelle || l.outil || '?', outil: l.outil || null, resume: l.resume || '' };
    if (l.outil === 'matchups') { const m = lisMatchups(l.sortie); if (m) e.matchups = m; }
    else if (l.outil === 'analyse-cartes') { const c = lisAnalyseCartes(l.sortie); if (c) e.cartes = c; }
    sortie.push(e);
  }
  return sortie;
}
