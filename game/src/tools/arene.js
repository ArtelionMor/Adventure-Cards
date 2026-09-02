// ARENE — faire jouer deux decks l'un contre l'autre, en dehors d'une vraie partie.
// Partagee par les scripts en ligne de commande (`check-decks`, `matchups`) et par la
// page d'equilibrage du builder (`builder/balance.html`) : une seule implementation,
// donc les memes chiffres des deux cotes.
//
// POURQUOI ON JOUE AU LIEU DE CALCULER. Un combat est une chaine de Markov : l'etat
// complet (mains, plateaux, PV, decks) suffit a decrire ce qui peut arriver ensuite.
// Mais le nombre d'etats est astronomique — melange, pioche, cibles au hasard, erreurs
// volontaires du bot — donc personne ne resout cette chaine exactement. On l'ESTIME
// par Monte-Carlo : beaucoup de parties, et on compte. `wilson()` dit ensuite a quel
// point on peut croire le chiffre obtenu.
//
// Toutes les fonctions acceptent des DONNEES en parametre (`data`) : la page
// d'equilibrage travaille sur le brouillon du builder, pas sur le fichier du jeu.
import { CHARACTER_DATA } from '../../data/characters.data.js';
import { resolveCard } from '../config/characters.js';
import { npcSide } from '../config/npcs.js';
import { createBattle, playCard, attack, endTurn } from '../combat/engine.js';
import { botAction } from '../combat/ai.js';

/** Un camp a partir de cartes deja resolues. Le socle de tous les autres. */
export function campDeCartes(nom, stats, cartes, sprite = '') {
  return {
    name: nom, sprite,
    hp: stats.hp, mana: stats.mana, hand: stats.hand,
    deck: cartes.map(c => ({ ...c }))
  };
}

/**
 * Le camp d'un ou plusieurs personnages, au niveau demande. `cote` choisit les cartes
 * de base ou les cartes switch — sans quoi la moitie du jeu ne serait jamais testee.
 */
export function campPerso(ids, level, cote = 'cards', data = CHARACTER_DATA) {
  const chars = ids.map(id => (data.characters || []).find(c => c.id === id)).filter(Boolean);
  if (!chars.length) return null;
  const cartes = chars.flatMap(ch => (ch[cote] || ch.cards || []).filter(Boolean)
    .map(c => ({ ...resolveCard(c, level), sprite: ch.sprite })));
  return campDeCartes(chars.map(c => c.name).join('&'), {
    hp: chars.reduce((a, c) => a + c.stats.hp, 0),
    mana: Math.max(...chars.map(c => c.stats.mana)),
    hand: Math.max(...chars.map(c => c.stats.hand))
  }, cartes, chars[0].sprite);
}

/**
 * Le deck MELANGE d'un ou plusieurs personnages : pour chaque slot, la carte de base
 * ou sa carte switch, tiree au sort. C'est le deck le plus proche de la realite —
 * en jeu, chaque slot est l'un ou l'autre, « tout base » et « tout switch » ne sont
 * que deux combinaisons parmi 2^5 par personnage.
 *
 * Rend une FABRIQUE, pas un camp : le tirage est refait a chaque partie, donc une
 * serie couvre l'ensemble des decks qu'un joueur peut monter et son taux de victoire
 * est la moyenne sur cet ensemble. Mesurer une combinaison precise, c'est autre chose.
 */
export function campMelange(ids, level, data = CHARACTER_DATA) {
  const chars = ids.map(id => (data.characters || []).find(c => c.id === id)).filter(Boolean);
  if (!chars.length) return null;
  return () => {
    const cartes = chars.flatMap(ch => {
      const n = Math.max((ch.cards || []).length, (ch.switches || []).length);
      const pris = [];
      for (let i = 0; i < n; i++) {
        const base = (ch.cards || [])[i], swap = (ch.switches || [])[i];
        // Sans switch en face, le slot garde sa carte de base : c'est ce que voit le joueur.
        const choisie = (swap && Math.random() < 0.5) ? swap : (base || swap);
        if (choisie) pris.push({ ...resolveCard(choisie, level), sprite: ch.sprite });
      }
      return pris;
    });
    return campDeCartes(chars.map(c => c.name).join('&'), {
      hp: chars.reduce((a, c) => a + c.stats.hp, 0),
      mana: Math.max(...chars.map(c => c.stats.mana)),
      hand: Math.max(...chars.map(c => c.stats.hand))
    }, cartes, chars[0].sprite);
  };
}

/** Le camp d'un adversaire (PNJ), tel que le builder l'a defini. */
export function campPnj(id, data = CHARACTER_DATA) {
  const side = npcSide(id, data);
  return side ? { ...side, deck: side.deck.map(c => ({ ...c })) } : null;
}

/**
 * Une partie entiere, bot contre bot. Rend { winner, B } — winner vaut 'p', 'e',
 * 'draw' ou 'stuck' (le garde-fou a saute : le moteur tourne en rond).
 * `opts.p` / `opts.e` / `opts.bot` reglent la difficulte de chaque cote.
 */
export function duel(fabriqueP, fabriqueE, opts = {}) {
  // Un camp peut etre une fabrique (« melange base/switch ») : on la tire ici, donc
  // a chaque partie, sans que le reste du code ait a savoir lequel des deux c'est.
  const cfgP = typeof fabriqueP === 'function' ? fabriqueP() : fabriqueP;
  const cfgE = typeof fabriqueE === 'function' ? fabriqueE() : fabriqueE;
  const B = createBattle(cfgP, cfgE, {});
  let garde = 0;
  while (!B.over && garde++ < 4000) {
    const k = B.turn;
    // Un camp sans reglage explicite garde celui de son PNJ, s'il en a un.
    const niveau = opts[k] || opts.bot || (k === 'p' ? cfgP.ia : cfgE.ia);
    const a = botAction(B, k, niveau);
    if (!a || a.type === 'end') endTurn(B);
    else if (a.type === 'play') { if (!playCard(B, k, a.index, a.target)) endTurn(B); }
    else if (a.type === 'attack') { if (!attack(B, k, a.uid, a.target)) endTurn(B); }
  }
  return { winner: garde >= 4000 ? 'stuck' : B.winner, B };
}

/**
 * N parties entre deux decks, LA MOITIE dans chaque sens. Celui qui commence a un
 * avantage reel : sans alterner, on mesurerait surtout qui a gagne le tirage au sort.
 * Rend le taux de victoire du PREMIER deck, et ce que pese l'avantage du premier tour.
 */
export function serie(a, b, n, opts = {}) {
  let victoiresA = 0, nulles = 0, bloquees = 0, tours = 0;
  let gagneEnCommencant = 0, commencees = 0;
  // Le journal d'une partie temoin : c'est ce qu'on exporte pour comprendre POURQUOI
  // une case donne ce chiffre. Un taux ne dit jamais ce qui s'est passe.
  let temoin = null;
  for (let i = 0; i < n; i++) {
    const aCommence = i % 2 === 0;
    const o = aCommence ? opts : { ...opts, p: opts.e, e: opts.p };
    const { winner, B } = aCommence ? duel(a, b, o) : duel(b, a, o);
    tours += B.turnNo;
    // On gardera la derniere partie decisive : la plus representative des logs.
    if (winner === 'p' || winner === 'e') {
      temoin = { aCommence, gagnant: winner, tours: B.turnNo, pv: [B.p.hp, B.e.hp], log: [...B.log] };
    }
    const gagnantEstA = aCommence ? winner === 'p' : winner === 'e';
    if (winner === 'stuck') bloquees++;
    else if (winner === 'draw') nulles++;
    else if (gagnantEstA) victoiresA++;
    if (winner === 'p' || winner === 'e') {
      commencees++;
      if (winner === 'p') gagneEnCommencant++;
    }
  }
  const decisives = n - nulles - bloquees;
  return {
    parties: n, victoiresA, nulles, bloquees, decisives, temoin,
    taux: decisives ? victoiresA / decisives : 0.5,
    toursMoyens: tours / n,
    avantagePremier: commencees ? gagneEnCommencant / commencees : 0.5
  };
}

/**
 * Intervalle de confiance a 95 % (Wilson) d'un taux estime sur n parties.
 * Sans lui on « corrige » des ecarts qui ne sont que du bruit : sur 100 parties, un
 * vrai 50 % sort entre 40 % et 60 % sans que rien ne soit desequilibre.
 */
export function wilson(taux, n) {
  if (!n) return { bas: 0, haut: 1, demi: 0.5 };
  const z = 1.96, p = taux;
  const den = 1 + z * z / n;
  const centre = (p + z * z / (2 * n)) / den;
  const ecart = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den;
  return { bas: Math.max(0, centre - ecart), haut: Math.min(1, centre + ecart), demi: ecart };
}

// Les cibles d'equilibrage demandees par le game designer : un deck qui a le matchup
// gagne ~66 %, celui qui ne l'a pas ~33 %, et deux decks de meme force ~50 %.
export const CIBLES = [
  { nom: 'défavorable', valeur: 0.33 },
  { nom: 'équilibré', valeur: 0.50 },
  { nom: 'favorable', valeur: 0.66 }
];
export const TOLERANCE = 0.06;   // ±6 points : on ne court pas apres la virgule

/**
 * Les resultats d'une matrice, en CSV « long » (une ligne par matchup) : c'est la
 * forme qui se croise le mieux dans un tableur, bien plus que le tableau carre.
 * Point-virgule et virgule decimale : Excel francais l'ouvre sans rien demander.
 */
export function matriceCsv(resultats, nomDe, meta = {}) {
  const nb = x => String(x).replace('.', ',');
  const lignes = [
    '# ' + Object.entries(meta).map(([k, v]) => `${k}=${v}`).join(' ; '),
    'deck;adversaire;parties;decisives;victoires;taux;intervalle_95;nulles;bloquees;tours_moyens;avantage_premier;lecture'
  ];
  for (const r of resultats) {
    const l = lecture(r.taux);
    const etiquette = nomDe(r.a) === nomDe(r.b) ? 'miroir' : l.ecrasant ? 'ecrasant' : l.dedans ? l.cible.nom : 'entre deux cibles';
    lignes.push([
      nomDe(r.a), nomDe(r.b), r.parties, r.decisives, r.victoiresA,
      nb((r.taux * 100).toFixed(1)), nb((r.demi * 100).toFixed(1)),
      r.nulles, r.bloquees, nb(r.toursMoyens.toFixed(1)), nb((r.avantagePremier * 100).toFixed(1)),
      etiquette
    ].join(';'));
  }
  return lignes.join('\n') + '\n';
}

/** Les journaux temoins, en texte lisible : une partie par matchup. */
export function journauxTexte(resultats, nomDe, meta = {}) {
  const out = ['JOURNAUX DE COMBAT — une partie temoin par matchup',
    Object.entries(meta).map(([k, v]) => `${k} = ${v}`).join(' · '), ''];
  for (const r of resultats) {
    if (!r.temoin) continue;
    const t = r.temoin;
    const gagnant = (t.aCommence ? t.gagnant === 'p' : t.gagnant === 'e') ? nomDe(r.a) : nomDe(r.b);
    out.push('='.repeat(78));
    out.push(`${nomDe(r.a)} contre ${nomDe(r.b)} — ${(r.taux * 100).toFixed(0)}% sur ${r.decisives} parties`);
    // Les PV sont ranges dans l'ordre du COMBAT (p puis e) : on les renomme, sinon on
    // lit "32 / -1" sans savoir a qui appartient quoi.
    const pvA = t.aCommence ? t.pv[0] : t.pv[1];
    const pvB = t.aCommence ? t.pv[1] : t.pv[0];
    out.push(`partie temoin : ${t.aCommence ? nomDe(r.a) : nomDe(r.b)} commence, ${gagnant} gagne`
      + ` en ${t.tours} tours (PV finaux : ${nomDe(r.a)} ${pvA}, ${nomDe(r.b)} ${pvB})`);
    out.push('-'.repeat(78));
    for (const l of t.log) out.push('  ' + l);
    out.push('');
  }
  return out.join('\n');
}

/** La cible la plus proche d'un taux, et si on est dedans. */
export function lecture(taux) {
  const cible = CIBLES.reduce((a, c) => (Math.abs(c.valeur - taux) < Math.abs(a.valeur - taux) ? c : a));
  return {
    cible,
    dedans: Math.abs(cible.valeur - taux) <= TOLERANCE,
    ecrasant: taux > 0.72 || taux < 0.28
  };
}
