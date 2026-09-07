// UN OUVRIER DE LA MATRICE. Les cases d'un tableau de matchups sont independantes :
// chacune est un paquet de parties qui ne regarde aucune autre. On en donne donc une a
// chaque coeur, et la page ne fait plus que ramasser les resultats.
//
// FILE DE TRAVAIL, pas de tranches decoupees d'avance : une case coute de quelques
// secondes a une minute selon les decks, donc un decoupage fige laisserait un ouvrier
// finir seul pendant que les quinze autres attendent. Ici chacun redemande une case des
// qu'il a fini la sienne — et la barre de progression avance regulierement.
//
// Ce worker ne recoit PAS de camps tout faits : `campMelange` rend une fabrique (une
// fonction), et une fonction ne traverse pas un `postMessage`. Il recoit la RECETTE
// (« le personnage dog, niveau 5, cote switch ») et remonte le camp lui-meme, avec les
// memes fonctions d'arene que la page — donc exactement les memes chiffres.
import { campPerso, campMelange, campPnj, serie } from '../game/src/tools/arene.js';
import { ecouteLesChoix } from '../game/src/combat/ai.js';

/**
 * Le camp decrit par une recette, reconstruit avec les donnees recues. `ids` est une
 * EQUIPE : un deck peut reunir un, deux ou trois heros, et `campPerso`/`campMelange`
 * savent deja additionner leurs cartes, leurs PV et leur mana.
 */
function camp(r, db) {
  const ids = r.ids || [r.id];
  if (r.type === 'pnj') return campPnj(ids[0], db);
  if (r.type === 'mix') return campMelange(ids, r.niveau, db);
  return campPerso(ids, r.niveau, r.type === 'switch' ? 'switches' : 'cards', db);
}

let camps = null, runs = 10, bot = 'normal', DB = null;

// CE QUE LE BOT A PREFERE, ramasse pendant que la matrice se joue. Les parties sont deja
// jouees : ecouter ses decisions ne coute presque rien, et donne le tableau des cartes
// sur les milliers de parties de la matrice au lieu d'un run dedie.
let cartes = new Map();
ecouteLesChoix(d => {
  const jouables = d.candidats.filter(c => c.quoi === 'carte');
  if (!jouables.length) return;
  const meilleur = d.candidats.reduce((a, b) => ((b.victoires ?? -1) > (a.victoires ?? -1) ? b : a), d.candidats[0]);
  // LA DECISION DANS LE JOURNAL. Elle s'ecrit avant le coup joue, donc a sa place
  // chronologique : on lit « il hesitait entre ca et ca » puis « il joue ca ». C'est ce
  // qui manquait pour comprendre une partie temoin — le journal disait ce qui a ete
  // joue, jamais ce qui aurait pu l'etre.
  if (d.b && d.b.log) {
    const dit = c => c.nom + (c.victoires === undefined ? '' : ' ' + Math.round(c.victoires * 100) + '%');
    const autres = d.candidats.filter(c => c !== d.choisi).map(dit).join(', ');
    d.b.log.push(`   ↳ choix : ${dit(d.choisi)}${autres ? ' — devant ' + autres : ''}`);
  }
  for (const c of jouables) {
    let f = cartes.get(c.nom);
    if (!f) cartes.set(c.nom, f = { nom: c.nom, propose: 0, joue: 0, sommeValeur: 0, nValeur: 0, sommeEcart: 0, nEcart: 0, prefereA: {} });
    f.propose++;
    if (c.valeur !== undefined) { f.sommeValeur += c.valeur; f.nValeur++; }
    // L'ecart au meilleur coup : le seul chiffre du Monte-Carlo qui parle de la CARTE.
    // Le taux brut, lui, dit surtout si la position etait gagnante.
    if (c.victoires !== undefined && meilleur.victoires !== undefined) { f.sommeEcart += meilleur.victoires - c.victoires; f.nEcart++; }
    if (c.nom === d.choisi.nom) f.joue++;
    else f.prefereA[d.choisi.nom] = (f.prefereA[d.choisi.nom] || 0) + 1;
  }
});

self.onmessage = ({ data }) => {
  if (data.setup) {
    DB = data.db;
    camps = (data.recettes || []).map(r => camp(r, data.db));
    runs = data.runs; bot = data.bot;
    self.postMessage({ pret: true });
    return;
  }
  cartes = new Map();                       // les compteurs partent par case, en delta

  // LA COURBE DE DIFFICULTE : une equipe de heros contre une rencontre. Le worker
  // remonte le camp lui-meme, comme pour la matrice — la seule difference est qu'ici
  // l'equipe se decrit par la liste de ses heros et son niveau.
  if (data.courbe) {
    const { equipe, niveau, pnj } = data.courbe;
    const p = campPerso(equipe, niveau, 'cards', DB);
    const e = campPnj(pnj, DB);
    const r = p && e ? serie(p, e, runs, { bot }) : null;
    self.postMessage({ courbe: data.courbe, r, cartes: [...cartes.values()] });
    return;
  }

  const [i, j] = data.cellule;
  const r = serie(camps[i], camps[j], runs, { bot });
  self.postMessage({ i, j, r, cartes: [...cartes.values()] });
};
