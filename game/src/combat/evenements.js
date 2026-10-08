// LES EVENEMENTS DU COMBAT : ce qui s'est passe, dit en donnees et non en phrases.
//
// `B.log` raconte le combat en texte (« Chat joue Foudre. 2 degats a Grand Mechant Loup. ») :
// c'est lisible, mais une phrase ne dit ni QUI l'a causee, ni ce que valaient les chiffres
// AVANT, ni de quelle carte elle venait — et c'est exactement ce que veut savoir un joueur qui
// n'a pas suivi (« mais cette carte ne fait pas ca ? ah oui, il y avait ca en plus »). Ici
// chaque chose qui arrive est un objet JSON : un TYPE, des REFERENCES (qui agit, qui subit, avec
// leurs chiffres au moment du coup), les valeurs AVANT / APRES, et une CAUSE — l'indice de
// l'evenement qui l'a provoquee. Une attaque cause deux degats (le coup et la riposte), qui
// causent chacun une mort, qui cause un rale d'agonie, qui cause une invocation : l'ecran
// montre cet arbre en retrait.
//
// ⚠ ETEINT PAR DEFAUT, et il doit le rester pour tout ce qui joue des parties en masse :
// `B.evts` n'existe que si on l'ouvre (`createBattle(..., { evenements: true })`). Chaque
// point d'emission du moteur commence par `if (B.evts)` : eteint, il ne construit rien, ne
// copie rien, ne tire rien au hasard — un combat enregistre est le meme que s'il ne l'etait
// pas, mot pour mot (`scripts/test-evenements.mjs` le verifie sur des parties graines).
// `cloneBattle` ne copie JAMAIS les evenements : une copie est une hypothese (les milliers
// de parties imaginees par le bot, l'apercu d'un coup), pas l'histoire du combat.
//
// Tout est du JSON simple : un evenement traverse `structuredClone`, `localStorage` et le
// reseau. Les references sont des PHOTOS prises au moment du fait, pas des liens vers le
// combat : une unite morte a disparu du plateau, son evenement doit encore dire qui elle etait.

/** Ouvre l'enregistrement : a appeler avant la premiere pioche, c'est `createBattle` qui s'en charge. */
export function ouvreEvenements(B) {
  B.evts = [];
  B.evtCause = null;   // l'evenement en cours de resolution : le parent de ce qui va arriver
}

/**
 * Ecrit un evenement et rend son indice. `cause` est l'indice du parent ; sans lui, c'est
 * l'evenement en cours (`B.evtCause`). `null` dit explicitement « aucune cause » (un tour qui
 * commence, la fin du combat).
 */
export function evt(B, ev, cause) {
  const i = B.evts.length;
  B.evts.push({
    i,
    tour: B.turnNo,      // le numero du tour (0 : la main de depart)
    camp: B.turn,        // a qui est le tour
    cause: cause === undefined ? B.evtCause : cause,
    ...ev
  });
  return i;
}

/** Fait tourner `fn` avec l'evenement `i` pour cause de tout ce qu'elle provoque. Eteint : appelle juste `fn`. */
export function avec(B, i, fn) {
  if (!B.evts || i < 0) return fn();
  const avant = B.evtCause;
  B.evtCause = i;
  try { return fn(); } finally { B.evtCause = avant; }
}

// ------------------------------------------------------------------ les photos
/** Une carte : en main, a la defausse, jouee. `cout` est le cout IMPRIME ; le paye est dans `joue`. */
export const refCarte = c => ({
  k: 'carte', nom: c.name, id: c.id, inst: c.inst, sprite: c.sprite || null, type: c.type,
  cout: c.cost, atk: c.atk, hp: c.hp, keys: [...(c.keys || [])]
});

/** Une unite en jeu, avec ses chiffres A CET INSTANT (derives : auras comprises). */
export const refUnite = (u, camp) => ({
  k: 'unite', camp, uid: u.uid, nom: u.name, sprite: u.sprite || null,
  atk: u.atk, hp: u.hp, maxHp: u.maxHp, keys: [...u.keys],
  cout: u.card ? u.card.cost : null, jeton: !u.card
});

/** Un heros (un camp tout entier). */
export const refHeros = (B, camp) => {
  const s = B[camp];
  return { k: 'heros', camp, nom: s.name, sprite: s.sprite || null, hp: s.hp, maxHp: s.maxHp, armure: s.armor };
};

/** La source d'un effet : une unite en jeu (elle a un `uid`) ou la carte d'un sort. `camp` = qui l'a lancee. */
export const refSource = (source, camp) => (!source ? null : source.uid ? refUnite(source, camp) : refCarte(source));

/** Ce qu'une designation `{ side, uid }` montre (une unite, ou le heros), ou null si elle n'est plus la. */
export function refCible(B, t) {
  if (!t) return null;
  if (t.uid === 'hero') return refHeros(B, t.side);
  const u = B[t.side].board.find(x => x.uid === t.uid);
  return u ? refUnite(u, t.side) : null;
}

// ------------------------------------------------------------ qui a donne le coup
// Une unite meurt plus tard que le coup qui la tue : `resolveDeaths` ramasse apres coup. On
// retient donc, pour chaque unite, l'evenement du DERNIER coup qu'elle a recu — c'est lui, et
// non l'action qui l'entourait, qui est la cause de sa mort (« meurt a la riposte »).
const coups = new WeakMap();
export const noteCoup = (u, i) => { if (i >= 0) coups.set(u, i); };
export const coupDe = u => coups.get(u);
