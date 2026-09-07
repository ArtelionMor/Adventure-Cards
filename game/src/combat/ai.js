// Bot de combat. Priorites imposees par le GDD :
//   1. chercher la victoire immediate  2. se developper
//   3. freiner l'adversaire            4. jouer au hasard
// Il joue donc regulierement mal, et c'est voulu : c'est la marge de progression
// que recupere le joueur qui reprend la main en mode manuel.
//
// Ce qui le rend un peu moins bete, c'est une fonction de valeur : une carte ne vaut
// pas son cout en mana mais ce qu'elle rapporte. Un rale d'agonie compte parce qu'il
// part meme si l'unite meurt ; une aura compte pour ce qu'elle multiplie ; un
// declencheur de tour compte plusieurs fois parce qu'il se repete.
import { BALANCE } from '../config/balance.js';
import { canPlay, legalTargets, attackableTargets, needsTarget, cloneBattle, playCard, attack, endTurn } from './engine.js';
import { TRIGGERS, TARGETS, STATICS, hasKey, keyId, keyArgs, keyFields, counterValue, amountValue, cardCost, staticFields, targetId, targetArg } from '../config/mechanics.js';

const foe = k => (k === 'p' ? 'e' : 'p');

/**
 * Le niveau de jeu du bot. Il vient du GAME CONFIG (`BALANCE.ai`) : c'est une valeur
 * d'equilibrage, elle n'a rien a faire ici en dur. On peut le demander au coup par
 * coup — `botAction(B, k, 'dur')` — ou le poser sur le combat entier via son `meta.ia`.
 */
function reglages(B, opts) {
  const niveaux = BALANCE.ai.niveaux;
  const choix = opts || (B.meta && B.meta.ia) || BALANCE.ai.defaut;
  return typeof choix === 'string' ? (niveaux[choix] || niveaux[BALANCE.ai.defaut]) : { ...niveaux[BALANCE.ai.defaut], ...choix };
}

// Combien de tours on suppose qu'une unite survit : sert a chiffrer le recurrent.
const TOURS_ESPERES = 2;

// Les types portes par une carte (`keys`) ou par une unite en jeu (`baseKeys`).
const typesOf = x => keyArgs(x.baseKeys || x.keys, 'type');
/** Combien d'unites du plateau partagent une etiquette de type avec `x`. */
function sameTypeCount(board, x) {
  const mine = typesOf(x);
  if (!mine.length) return 0;
  return board.filter(u => u !== x && typesOf(u).some(t => mine.includes(t))).length;
}
/** Combien d'unites d'un plateau portent le type ecrit dans une cible « allyType:X ». */
function typeCount(board, t) {
  const voulu = targetArg(t);
  return voulu ? (board || []).filter(u => typesOf(u).includes(voulu)).length : 0;
}

// --------------------------------------------------------------- valorisation
/** Valeur approximative d'un effet, en "points de tempo". ctx = tailles de plateau. */
function effectValue(e, ctx) {
  // Un montant variable vaut ce qu'il vaudrait maintenant : « X degats, X = tes
  // allies Chien » ne vaut rien sans meute, et beaucoup avec.
  const n = key => amountValue(e[key], ctx.B, ctx.k, ctx.carte || null);
  switch (e.op) {
    case 'dmg': {
      const v = n('v');
      if (e.t === 'allEnemyUnits') return v * Math.max(1, ctx.enemies) * 0.9;
      // Une cible par type ne vaut que les unites qui portent vraiment l'etiquette :
      // sans meute en face, la carte ne fait rien et le bot ne doit pas la jouer.
      if (targetId(e.t) === 'enemyType') return v * typeCount(ctx.foeBoard, e.t) * 0.9;
      if (targetId(e.t) === 'allyType') return -v * typeCount(ctx.board, e.t);
      // Se blesser soi-meme ou blesser un allie est un cout, pas un gain : le bot
      // doit prendre une carte pareille pour ce qu'elle est.
      if (['self', 'randomAllyUnit', 'randomAllyAny'].includes(e.t)) return -v;
      // Une cible tiree au sort vaut un peu moins qu'une cible choisie.
      // « Lui » peut viser aussi bien un jeton adverse qu'un des notres selon ce que
      // l'effet d'avant a touche : on ne parie ni dans un sens ni dans l'autre.
      if (e.t === 'previous') return v * 0.5;
      return (TARGETS[targetId(e.t)] || {}).random ? v * 0.85 : v;
    }
    case 'detruit': {
      // La destruction ignore les PV : elle vaut le CORPS qu'elle enleve, pas les
      // degats qu'il aurait fallu pour l'abattre. Pointee sur nos propres allies,
      // c'est un cout — « detruit tout » ne se joue que quand on perd moins qu'en face.
      const poids = u => (u.atk || 0) * 1.3 + (u.hp || 0) * 0.35;
      const somme = list => (list || []).reduce((a, u) => a + poids(u), 0);
      const moyenne = list => (list && list.length ? somme(list) / list.length : 0);
      const duType = list => (list || []).filter(u => typesOf(u).includes(targetArg(e.t)));
      switch (targetId(e.t)) {
        case 'allEnemyUnits': return somme(ctx.foeBoard);
        case 'enemyType': return somme(duType(ctx.foeBoard));
        // On designe la cible : c'est la plus grosse unite d'en face qui tombe.
        case 'enemyUnit': return Math.max(0, ...(ctx.foeBoard || []).map(poids));
        case 'randomEnemyUnit': return moyenne(ctx.foeBoard) * 0.85;
        case 'allAllies': return -somme(ctx.board);
        case 'allyType': return -somme(duType(ctx.board));
        case 'allyUnit': case 'randomAllyUnit': case 'self': case 'sameTypeAllies': return -moyenne(ctx.board);
        // « Lui » peut viser un jeton adverse comme un des notres : on ne parie pas.
        default: return 0;
      }
    }
    case 'heal': return n('v') * 0.6;
    case 'draw': return n('v') * 1.6;
    // Aller CHERCHER une carte precise vaut plus que piocher au hasard : on sait ce
    // qu'on prend. Mais ca ne vaut rien si le deck ne la contient pas — le bot ne peut
    // pas le savoir ici, on reste donc raisonnable.
    // Creer vaut un peu plus que chercher dans son deck : la carte arrive toujours,
    // meme deck fini, et on sait exactement laquelle.
    // Au hasard, on ne sait pas ce qui tombe : ca vaut un peu plus qu'une pioche,
    // un peu moins qu'une carte qu'on a choisie.
    case 'cree': return (e.n === undefined ? 1 : n('n')) * (e.choix === 'hasard' ? 1.5 : 2.2);
    case 'renforce_les_cartes': {
      // Un renfort ecrit sur des cartes qu'on jouera plus tard : ca vaut moins qu'un
      // renfort sur le plateau (il faut encore les tirer et les payer), et c'est un
      // cadeau si les cartes sont a l'adversaire.
      const combien = e.n === undefined ? 1 : n('n');
      const gain = ((e.atk === undefined ? 0 : n('atk')) * 1.1 + (e.hp === undefined ? 0 : n('hp')) * 0.6) * combien * 0.6;
      return e.qui === 'adversaire' ? -gain : gain;
    }
    case 'melange_a_la_pioche':
    case 'renvoie_en_main':
    case 'pose_sur_le_plateau': {
      // Trois destinations, une meme lecture : qu'est-ce que le camp vise GAGNE ?
      //   poser en jeu > ramener en main > remettre dans la pioche (le plus lointain).
      // Prendre dans une main ou sur un plateau coute au camp vise ce qu'on lui enleve.
      const combien = e.n === undefined ? 1 : n('n');
      const prix = { pose_sur_le_plateau: 2.4, renvoie_en_main: 1.8, melange_a_la_pioche: 1.4 }[e.op];
      // « et leur donne +X/+Y » : un renfort ecrit sur la carte, qui la suit tout le
      // combat. Il vaut pour le camp A QUI SONT les cartes — donner +2/+2 aux cartes
      // d'en face est un cadeau, pas un bon coup.
      const renfort = (e.atk === undefined ? 0 : n('atk')) * 1.1 + (e.hp === undefined ? 0 : n('hp')) * 0.6;
      // Depuis le PLATEAU : on enleve un corps a son proprietaire. C'est un retrait
      // doux quand c'est une unite adverse, une perte de tempo quand c'est la notre.
      if ((e.t || '').length && ['plateau'].includes(e.d_ou)) {
        const vise = ['enemyUnit', 'allEnemyUnits', 'randomEnemyUnit', 'enemyType'].includes(targetId(e.t));
        const corps = (vise ? ctx.foeBoard : ctx.board) || [];
        const poids = corps.reduce((a, u) => a + (u.atk || 0) * 1.1 + (u.hp || 0) * 0.3, 0) / Math.max(1, corps.length);
        const combienUnites = ['allEnemyUnits', 'allAllies'].includes(targetId(e.t)) ? corps.length : 1;
        // Rendre une carte a l'adversaire attenue le retrait : il pourra la rejouer.
        return (vise ? 1 : -1) * combienUnites * (poids - prix * 0.5 - renfort);
      }
      const pourLeCampVise = ((e.d_ou === 'main' ? -0.6 : prix) + renfort) * combien;
      return e.qui === 'adversaire' ? -pourLeCampVise : pourLeCampVise;
    }
    case 'pioche_x': return (e.n === undefined ? 1 : n('n')) * 2;
    case 'pioche_une_carte_de_type': return (e.n === undefined ? 1 : n('n')) * 1.8;
    // Du mana rendu sur des cartes qu'on a deja en main : c'est du tempo pour plus tard.
    case 'reduit_le_cout_de': return n('v') * 0.9;
    case 'armor': return n('v') * 0.6;
    case 'mana': return n('v') * 1.2;
    // Un mana promis pour le tour suivant vaut presque autant qu'un mana tout de
    // suite : il n'est pas plafonne, mais il faut survivre au tour d'en face.
    case 'mana_au_prochain_tour': return n('x') * 1.1;
    case 'buff': {
      const per = n('atk') + n('hp') * 0.6 + (e.key ? 1.2 : 0);
      // Un renfort « du meme type » ne vaut que le nombre d'allies etiquetes presents :
      // sans meute sur le plateau, il ne fait rien, et le bot ne doit pas le jouer.
      const cibles = e.t === 'allAllies' ? Math.max(1, ctx.allies)
        : e.t === 'sameTypeAllies' ? Math.max(0, ctx.sameType || 0)
          : targetId(e.t) === 'allyType' ? typeCount(ctx.board, e.t)
            : 1;
      return per * cibles;
    }
    case 'summon': {
      // Un jeton peut porter mots-cles, aura et moments : il vaut son corps entier.
      return (e.n === undefined ? 1 : amountValue(e.n, ctx.B, ctx.k, ctx.carte || null)) * bodyValue(e.unit || {}, ctx, 0.8);
    }
    // Mecanique inventee dans le builder et pas encore codee : elle ne fait rien,
    // le bot ne doit donc pas surestimer la carte qui la porte.
    default: return 0.2;
  }
}

const effectsValue = (list, ctx) => (list || []).reduce((a, e) => a + effectValue(e, ctx), 0);

/** Une aura ne vaut rien seule : elle vaut ce qu'elle multiplie. */
function auraValue(aura, allies, enemies, sameType) {
  if (!aura) return 0;
  const per = (aura.atk || 0) + (aura.hp || 0) * 0.6 + (aura.key ? 1.5 : 0);
  if (aura.scope === 'enemyUnits') return -per * Math.max(1, enemies); // per negatif = bon
  // Une aura « du meme type » ne porte que sur les allies qui partagent l'etiquette.
  // Sans compte precis (on ne sait pas toujours qui est en face), on suppose la moitie.
  if (aura.scope === 'sameTypeAllies') return per * Math.max(0, sameType ?? allies * 0.5);
  return per * Math.max(1, allies);
}

/**
 * Ce que valent les EFFETS STATIQUES d'une unite, par tour, pour le camp qui la pose.
 * Rien n'est ecrit ici mecanique par mecanique : le registre dit deja si « de plus »
 * est une bonne nouvelle (`bon`) et combien un point pese (`poids`). Ajouter un effet
 * statique ne demande donc aucune ligne de bot.
 */
function staticsValue(u, ctx) {
  let v = 0;
  for (const brut of u.statics || []) {
    const d = STATICS[brut.op];
    if (!d) continue;
    const m = staticFields(brut);
    const x = amountValue(m.v, ctx.B, ctx.k, null);
    // Bon pour le camp vise ? Puis : ce camp, est-ce le notre ou celui d'en face ?
    const pourLeVise = (m.sens === 'plus' ? 1 : -1) * (d.bon || 1);
    v += x * (d.poids || 1) * pourLeVise * (m.qui === 'adversaire' ? -1 : 1);
  }
  return v;
}

/**
 * Une carte a caracteristique variable ment sur sa ligne de statistiques : elle
 * annonce 0/0 alors qu'elle arrivera peut-etre en 5/5. On estime ce qu'elle vaudra
 * si on la pose MAINTENANT, sinon le bot ne la joue jamais.
 */
function estimee(B, k, card) {
  const cle = (card.keys || []).find(x => keyId(x) === 'characteristique_variable');
  if (!cle) return card;
  const f = keyFields(cle);
  // La carte est son propre porteur tant qu'elle est en main : c'est ce qui permet a
  // « X = ton niveau » d'etre lu avant meme d'etre pose.
  let x = counterValue(f.src, B, k, card, f.arg);
  // Elle n'est pas encore sur le plateau : les compteurs qui comptent les allies
  // vaudront un de plus une fois qu'elle sera posee.
  if (f.src === 'allyUnits') x += 1;
  if (f.src === 'alliesOfType' && typesOf(card).includes(f.arg)) x += 1;
  const copie = { ...card };
  if (f.stat === 'atk' || f.stat === 'both') copie.atk = x;
  if (f.stat === 'hp' || f.stat === 'both') copie.hp = x;
  return copie;
}

/**
 * Ce que vaut un CORPS d'unite : sa ligne de stats, ses mots-cles, son aura et ses
 * moments. Sert aux cartes alliees comme aux jetons invoques — un jeton qui laisse
 * un rale ou porte une aura n'est pas un 1/1 comme un autre.
 * `poidsPv` : une carte se paie plus cher en attaque qu'en PV, un jeton un peu moins.
 */
function bodyValue(u, ctx, poidsPv) {
  let v = (u.atk || 0) + (u.hp || 0) * poidsPv;
  const keys = u.keys || [];
  if (hasKey(keys, 'Taunt')) v += 1.5;
  if (hasKey(keys, 'Charge')) v += (u.atk || 0) * 0.6;
  if (hasKey(keys, 'Venin')) v += 2;
  if (hasKey(keys, 'Bouclier')) v += 1.5;
  // Une unite qu'on ne peut pas attaquer, ou qui ignore les provocations, pese lourd.
  if (hasKey(keys, 'elusif')) v += 2;
  if (hasKey(keys, 'passe_murailles')) v += (u.atk || 0) * 0.5;
  v += auraValue(u.aura, ctx.allies, ctx.enemies, ctx.sameType);
  // Un rale part meme quand l'unite tombe : sa valeur ne se perd presque jamais.
  v += effectsValue(u.death, ctx) * 0.9;
  // Un declencheur de tour rapporte a chaque tour ou l'unite tient.
  v += (effectsValue(u.turnStart, ctx) + effectsValue(u.turnEnd, ctx)) * TOURS_ESPERES;
  // Un effet statique aussi : il court tant que l'unite est la, comme une aura.
  v += staticsValue(u, ctx) * TOURS_ESPERES;
  return v;
}

/** Ce que vaut une carte si on la pose maintenant, dans cette position. */
function cardValue(B, k, def) {
  const me = B[k], them = B[foe(k)];
  const card = estimee(B, k, def);
  const ctx = { allies: me.board.length, enemies: them.board.length, sameType: sameTypeCount(me.board, card),
    board: me.board, foeBoard: them.board, B, k, carte: card };
  let v = effectsValue(card.play, ctx);

  if (card.type === 'ally') {
    v += bodyValue(card, ctx, 0.7);
    // Les moments qui seront ajoutes plus tard comptent aussi, sans rien savoir d'eux.
    for (const slot of Object.keys(TRIGGERS)) {
      if (['play', 'death', 'turnStart', 'turnEnd'].includes(slot)) continue;
      v += effectsValue(card[slot], ctx);
    }
  }
  return v;
}

/** A quel point on veut voir cette unite ADVERSE disparaitre. */
function unitThreat(B, k, u) {
  const them = B[foe(k)];
  const memeType = sameTypeCount(them.board, u);
  // Les effets valorises ici sont ceux de l'unite ADVERSE : ses montants variables
  // se comptent depuis son camp a elle.
  const ctx = { allies: them.board.length, enemies: B[k].board.length, sameType: memeType,
    board: them.board, foeBoard: B[k].board, B, k: foe(k) };
  let p = u.atk * 1.3 + u.hp * 0.35;
  if (hasKey(u.keys, 'Venin')) p += 2;
  if (hasKey(u.keys, 'Taunt')) p += 0.5;
  // On ne peut pas la frapper au corps a corps : quand un sort peut l'atteindre, ca vaut le coup.
  if (hasKey(u.keys, 'elusif')) p += 2;
  // Couper une aura adverse vaut plus que sa ligne de stats.
  p += auraValue(u.aura, them.board.length - 1, B[k].board.length, memeType) * 1.5;
  // Un moteur qui se redeclenche chaque tour doit tomber en priorite.
  p += (effectsValue(u.turnStart, ctx) + effectsValue(u.turnEnd, ctx)) * TOURS_ESPERES;
  // Idem pour ce qu'elle impose en continu (nos cartes plus cheres, ses degats plus
  // forts...) : `ctx` est monte du cote adverse, donc la valeur est bien la SIENNE.
  p += staticsValue(u, ctx) * TOURS_ESPERES;
  // Mais le tuer lui offre son rale : c'est un cadeau, ca fait baisser l'envie.
  p -= effectsValue(u.death, ctx) * 0.8;
  return p;
}

const directDamage = (B, k, card) =>
  (card.play || []).filter(e => e.op === 'dmg' && (e.t === 'enemyAny' || e.t === 'enemyHero'))
    .reduce((a, e) => a + amountValue(e.v, B, k, null), 0);

/**
 * Le meilleur PAQUET de cartes payables avec le mana disponible (un sac a dos, DP sur
 * le mana). Sans ca le bot pose la carte la plus chere et laisse dormir trois manas :
 * deux petites cartes valent tres souvent mieux qu'une grosse.
 */
function meilleurPaquet(B, k, playable) {
  const mana = Math.max(0, B[k].mana);
  const objets = playable
    .map(x => ({ ...x, cout: Math.max(0, cardCost(x.c, B, k)), valeur: cardValue(B, k, x.c) }))
    .filter(x => x.valeur > 0);
  const table = Array.from({ length: mana + 1 }, () => ({ valeur: 0, choix: [] }));
  for (const o of objets) {
    for (let m = mana; m >= o.cout; m--) {
      const candidat = table[m - o.cout].valeur + o.valeur;
      if (candidat > table[m].valeur) table[m] = { valeur: candidat, choix: [...table[m - o.cout].choix, o] };
    }
  }
  return table[mana].choix;
}

/**
 * La meilleure attaque du plateau ENTIER, pas la premiere trouvee : on compare
 * chaque (attaquant, cible) une bonne fois. Tuer une grosse menace sans mourir vaut
 * mieux que taper au visage, taper au visage vaut mieux qu'un echange perdant.
 */
function meilleureAttaque(B, k, ready) {
  const me = B[k], them = B[foe(k)];
  const ctx = { allies: me.board.length, enemies: them.board.length, sameType: 0,
    board: me.board, foeBoard: them.board, B, k };
  let best = null;
  for (const u of ready) {
    for (const t of attackableTargets(B, k, u)) {
      let note;
      if (t.uid === 'hero') {
        note = u.atk;
      } else {
        const d = them.board.find(x => x.uid === t.uid);
        if (!d) continue;
        const tue = d.hp <= u.atk;
        const meurt = u.hp <= d.atk;
        // Ce qu'on gagne : la menace enlevee, ou juste des degats sur un gros corps.
        const gain = tue ? unitThreat(B, k, d) : u.atk * 0.35;
        // Ce qu'on perd : notre unite — moins son rale, qui partira quand meme.
        const perte = meurt ? (u.atk * 1.3 + u.hp * 0.35) - effectsValue(u.death, ctx) * 0.9 : 0;
        note = gain - perte;
      }
      if (!best || note > best.note) best = { note, uid: u.uid, target: t };
    }
  }
  return best;
}

// ------------------------------------------------------------- Monte-Carlo
// Les regles ci-dessus disent ce qu'une carte VAUT ; elles se trompent forcement un
// peu, et elles ne voient jamais deux coups plus loin. La recherche, elle, ne sait
// rien du jeu : elle essaie un coup, finit la partie au pas de course des deux cotes,
// recommence, et garde le coup qui gagne le plus souvent. C'est du Monte-Carlo — la
// meme idee que l'estimation des matchups, appliquee a une seule decision.
//
// Le combat etant une chaine de Markov (l'etat suffit a decrire la suite), une partie
// terminee depuis la position obtenue est un echantillon honnete de ce qui nous attend.

/** Tous les coups jouables maintenant : les cartes, les attaques, et passer. */
function coupsPossibles(B, k) {
  const me = B[k];
  const coups = [];
  me.hand.forEach((c, i) => {
    if (!canPlay(B, k, c)) return;
    coups.push({ type: 'play', index: i, target: pickTarget(B, k, c) });
  });
  for (const u of me.board.filter(u => u.canAttack && u.atk > 0)) {
    for (const t of attackableTargets(B, k, u)) coups.push({ type: 'attack', uid: u.uid, target: t });
  }
  coups.push({ type: 'end' });
  return coups;
}

function applique(B, k, a) {
  if (!a || a.type === 'end') endTurn(B);
  else if (a.type === 'play') { if (!playCard(B, k, a.index, a.target)) endTurn(B); }
  else if (a.type === 'attack') { if (!attack(B, k, a.uid, a.target)) endTurn(B); }
}

/**
 * UNE POLITIQUE DE ROLLOUT BON MARCHE : une carte jouable au hasard, sinon une attaque
 * au hasard, sinon on passe. C'est volontairement bete — en Monte-Carlo, ce qui compte
 * est le NOMBRE de parties imaginees, pas leur qualite. Le bot complet coute cinq fois
 * plus cher par coup pour un signal a peine meilleur.
 */
function coupLeger(B, k) {
  const me = B[k];
  const jouables = [];
  me.hand.forEach((c, i) => { if (canPlay(B, k, c)) jouables.push(i); });
  if (jouables.length) {
    const i = jouables[Math.floor(Math.random() * jouables.length)];
    return { type: 'play', index: i, target: pickTarget(B, k, me.hand[i]) };
  }
  const prets = me.board.filter(u => u.canAttack && u.atk > 0);
  if (prets.length) {
    const u = prets[Math.floor(Math.random() * prets.length)];
    const cibles = attackableTargets(B, k, u);
    if (cibles.length) return { type: 'attack', uid: u.uid, target: cibles[Math.floor(Math.random() * cibles.length)] };
  }
  return { type: 'end' };
}

/**
 * ESTIMER une position sans la jouer : c'est ce qui permet d'arreter un rollout avant
 * la fin. On compte l'avance en PV, en corps sur le plateau et en cartes en main, puis
 * on ecrase le tout entre 0 et 1 — une avance d'une vingtaine de points vaut a peu pres
 * une partie gagnee. Grossier, mais un rollout tronque de 4 tours ne demande pas mieux :
 * il sert a departager des coups, pas a annoncer un vainqueur.
 */
function estime(B, k) {
  const me = B[k], them = B[foe(k)];
  const corps = s => s.board.reduce((a, u) => a + (u.atk || 0) * 1.1 + (u.hp || 0) * 0.7, 0);
  const avance = (me.hp - them.hp) * 0.7 + (corps(me) - corps(them)) + (me.hand.length - them.hand.length) * 0.5;
  return 1 / (1 + Math.exp(-avance / 8));
}

/**
 * Joue la partie imaginee et rend ce qu'elle vaut pour `k`, entre 0 et 1 (1 = gagnee,
 * 0.5 = nulle). `jeu.troncature` arrete apres N tours et ESTIME au lieu de finir.
 */
function jusquAuBout(B, jeu, k) {
  const rapide = { ...jeu, rollouts: 0 };
  const stop = jeu.troncature > 0 ? B.turnNo + jeu.troncature : Infinity;
  let garde = 0;
  while (!B.over && garde++ < 600 && B.turnNo < stop) {
    applique(B, B.turn, jeu.rolloutRapide ? coupLeger(B, B.turn) : botAction(B, B.turn, rapide));
  }
  if (B.over) return B.winner === k ? 1 : B.winner === 'draw' ? 0.5 : 0;
  return estime(B, k);
}

/**
 * Le coup qui gagne le plus souvent, sur `n` parties finies par coup. Rend le coup ET
 * la note de chaque candidat : c'est la seule vraie raison qu'ait ce bot de preferer
 * une carte a une autre, et le mouchard en a besoin.
 */
/** `n` parties imaginees de plus pour ce candidat, cumulees sur les precedentes. */
function simule(B, k, e, n, jeu) {
  for (let i = 0; i < n; i++) {
    const C = cloneBattle(B);
    applique(C, k, e.coup);
    e.somme += C.over ? (C.winner === k ? 1 : C.winner === 'draw' ? 0.5 : 0) : jusquAuBout(C, jeu, k);
    e.n++;
  }
}

function coupCherche(B, k, jeu) {
  const coups = coupsPossibles(B, k);
  if (coups.length === 1) return { a: coups[0], evalues: [{ coup: coups[0] }] };
  const evalues = coups.map(coup => ({ coup, somme: 0, n: 0 }));
  // Les parties imaginees ne sont pas des decisions : on eteint le mouchard pendant.
  enSondage++;
  try {
    if (jeu.elimination && evalues.length > 2) {
      // ELIMINATION PROGRESSIVE : la moitie du budget pour tout le monde, on garde la
      // moitie des candidats, on recommence. Un coup manifestement mauvais est ecarte
      // apres cinq parties au lieu d'en consommer dix — et le coup retenu, lui, finit
      // avec autant de simulations qu'avant.
      let vivants = evalues;
      const budget = Math.max(2, Math.round(jeu.rollouts / 2));
      while (vivants.length > 1) {
        for (const e of vivants) simule(B, k, e, budget, jeu);
        const garde = Math.max(1, Math.floor(vivants.length / 2));
        if (garde === vivants.length) break;
        vivants = [...vivants].sort((a, b) => b.somme / b.n - a.somme / a.n).slice(0, garde);
      }
    } else {
      for (const e of evalues) simule(B, k, e, jeu.rollouts, jeu);
    }
  } finally { enSondage--; }
  // A egalite on garde le premier : les cartes viennent avant « passer ». Un candidat
  // ecarte tot a moins de parties derriere lui — c'est voulu, il etait perdant.
  const taux = e => (e.n ? e.somme / e.n : 0);
  let best = evalues[0];
  for (const e of evalues) if (taux(e) > taux(best)) best = e;
  return { a: best.coup, evalues: evalues.map(e => ({ coup: e.coup, victoires: e.n ? e.somme / e.n : undefined })) };
}

// ------------------------------------------------------------------ mouchard
// POURQUOI CE COUP-LA ? Le bot ne dit rien de ses raisons : le journal de combat montre
// ce qu'il a joue, jamais ce qu'il aurait pu jouer. Ce mouchard, ETEINT PAR DEFAUT, note
// chaque decision OU IL Y AVAIT UN CHOIX — les candidats, ce que chacun valait, celui
// qu'il a garde. C'est ce que lit `scripts/analyse-cartes.mjs`.
//
// Les coups joues DANS un rollout de Monte-Carlo ne sont pas notes : ce sont des
// milliers de parties imaginaires, pas des decisions. D'ou `enSondage`.
let mouchard = null;
let enSondage = 0;

/** Passe une fonction pour ecouter les decisions du bot, rien pour arreter. */
export function ecouteLesChoix(fn) { mouchard = fn || null; }

/** Ce qu'un coup est, en clair. A appeler AVANT de le jouer : la main est encore la. */
function decrisCoup(B, k, a, victoires) {
  const note = victoires === undefined ? {} : { victoires };
  if (!a || a.type === 'end') return { ...note, quoi: 'passer', nom: '— passer —' };
  if (a.type === 'attack') {
    const u = B[k].board.find(x => x.uid === a.uid);
    return { ...note, quoi: 'attaque', nom: (u ? u.name : '?') + ' attaque' };
  }
  const c = B[k].hand[a.index];
  if (!c) return { ...note, quoi: 'carte', nom: '?' };
  return {
    ...note, quoi: 'carte', id: c.id || null, nom: c.name,
    cout: cardCost(c, B, k),
    // Ce que la fonction de valeur du bot pense de la carte. Pour un Monte-Carlo ce
    // n'est PAS son critere : c'est un deuxieme avis, et leur desaccord se lit.
    valeur: Math.round(cardValue(B, k, c) * 100) / 100
  };
}

const memeCoup = (x, y) => !!x && !!y && x.type === y.type && x.index === y.index && x.uid === y.uid;

/** Note une decision et ses candidats. Ne dit rien quand il n'y avait pas le choix. */
function noteLaDecision(B, k, a, evalues) {
  if (!mouchard || enSondage) return;
  const liste = evalues || coupsPossibles(B, k).map(coup => ({ coup }));
  if (liste.length < 2) return;                    // pas de choix : rien a expliquer
  const candidats = liste.map(n => decrisCoup(B, k, n.coup, n.victoires));
  const iChoisi = liste.findIndex(n => n.coup === a || memeCoup(n.coup, a));
  mouchard({
    tour: B.turnNo, camp: k, nom: B[k].name,
    critere: liste.some(n => n.victoires !== undefined) ? 'victoires' : 'valeur',
    choisi: iChoisi >= 0 ? candidats[iChoisi] : decrisCoup(B, k, a),
    candidats
  });
}

// ------------------------------------------------------------------- decision
/**
 * L'action a executer. C'est ici, et seulement ici, que le mouchard est nourri : la
 * decision elle-meme (`decide`) ne sait pas qu'on l'observe.
 */
export function botAction(B, k, opts) {
  const jeu = reglages(B, opts);
  // Le bot qui cherche ne passe pas par les priorites : il les remplace.
  if (jeu.rollouts > 0 && !B.over) {
    const { a, evalues } = coupCherche(B, k, jeu);
    noteLaDecision(B, k, a, evalues);
    return a;
  }
  const a = decide(B, k, jeu);
  noteLaDecision(B, k, a, null);
  return a;
}

/** Les 4 priorites du GDD. Rend UNE action, ou {type:'end'} quand il n'y a plus rien. */
function decide(B, k, jeu) {
  const me = B[k], them = B[foe(k)];
  const ready = me.board.filter(u => u.canAttack && u.atk > 0);
  const taunts = them.board.filter(u => hasKey(u.keys, 'Taunt'));
  const playable = me.hand.map((c, i) => ({ c, i })).filter(x => canPlay(B, k, x.c));

  // --- 1. victoire immediate -----------------------------------------------
  // Qui peut vraiment toucher le heros : une provocation arrete la plupart des
  // unites, mais pas Passe-Murailles. On le demande au moteur plutot que de le
  // deviner, sinon le bot rate une lethale ou en invente une.
  const faceDamage = ready.filter(u => attackableTargets(B, k, u).some(t => t.uid === 'hero'))
    .reduce((a, u) => a + u.atk, 0);
  const brulure = c => directDamage(B, k, c);
  const burnCards = playable.filter(x => brulure(x.c) > 0);
  let burn = 0, mana = me.mana;
  for (const x of burnCards.sort((a, b) => brulure(b.c) - brulure(a.c))) {
    const cout = cardCost(x.c, B, k);
    if (mana >= cout) { burn += brulure(x.c); mana -= cout; }
  }
  if (them.hp <= faceDamage + burn - them.armor) {
    const b = burnCards.sort((a, b) => brulure(b.c) - brulure(a.c))[0];
    if (b && them.hp > faceDamage - them.armor) {
      return { type: 'play', index: b.i, target: { side: foe(k), uid: 'hero' } };
    }
    const frappeur = ready.find(u => attackableTargets(B, k, u).some(t => t.uid === 'hero'));
    if (frappeur) return { type: 'attack', uid: frappeur.uid, target: { side: foe(k), uid: 'hero' } };
  }

  // --- coup au hasard occasionnel ------------------------------------------
  if (Math.random() < jeu.misplay) {
    const r = randomAction(B, k, playable, ready);
    if (r) return r;
  }

  // --- 2. se developper ----------------------------------------------------
  // Le bot malin ne choisit pas parmi TOUTE la main : il choisit dans le meilleur
  // paquet payable ce tour-ci. Poser un 5 mana en laissant deux 2 mana en main est
  // une erreur classique, et c'est celle qui coute le plus cher.
  const candidats = jeu.malin ? meilleurPaquet(B, k, playable) : playable;
  const dansLePaquet = x => candidats.some(c => c.i === x.i);

  // On pose l'allie qui rapporte le plus dans cette position, pas le plus cher.
  const allies = playable.filter(x => x.c.type === 'ally').filter(dansLePaquet)
    .sort((a, b) => cardValue(B, k, b.c) - cardValue(B, k, a.c));
  // Le bot naif pose TOUJOURS un allie avant de regarder le reste : tant qu'il en a
  // un en main, ses sorts de pioche dorment jusqu'a la fin du combat. Le bot malin
  // compare les deux — poser un corps reste souvent mieux, mais plus systematiquement.
  if (allies.length && !jeu.malin) return { type: 'play', index: allies[0].i, target: pickTarget(B, k, allies[0].c) };

  const utility = playable.filter(dansLePaquet)
    // Tout ce qui n'est pas du pur retrait developpe : pioche, mana, armure, soin,
    // renfort, invocation, reduction de cout, recherche de carte... La liste vient
    // du registre en creux (« ce qui n'est ni degats ni destruction »), sinon un
    // effet ajoute plus tard resterait invisible pour le bot — c'est ce qui laissait
    // dormir « Presage » et « Sagesse » en main.
    .filter(x => (x.c.play || []).some(e => !['dmg', 'detruit'].includes(e.op)))
    .sort((a, b) => cardValue(B, k, b.c) - cardValue(B, k, a.c));
  // On ne gaspille pas un renfort quand il n'y a personne a renforcer.
  const utile = utility.find(x => {
    const besoinAllie = (x.c.play || []).some(e => ['allyUnit', 'allAllies', 'sameTypeAllies', 'allyType'].includes(targetId(e.t)));
    return !(besoinAllie && me.board.length === 0);
  });
  if (jeu.malin && allies.length) {
    // Un corps sur le plateau vaut un peu plus que sa valeur brute : il attaque des
    // le tour suivant et force l'adversaire a s'en occuper. D'ou la prime de tempo.
    const valeurAllie = cardValue(B, k, allies[0].c) * 1.15;
    if (!utile || valeurAllie >= cardValue(B, k, utile.c)) {
      return { type: 'play', index: allies[0].i, target: pickTarget(B, k, allies[0].c) };
    }
  }
  if (utile) return { type: 'play', index: utile.i, target: pickTarget(B, k, utile.c) };

  // --- 3. freiner l'adversaire ---------------------------------------------
  // Sort de degats sur une unite qu'on peut tuer : on vise la plus genante.
  for (const x of playable) {
    const dmg = (x.c.play || []).filter(e => e.op === 'dmg').reduce((a, e) => a + amountValue(e.v, B, k, null), 0);
    if (!dmg) continue;
    const kill = them.board.filter(u => u.hp <= dmg)
      .sort((a, b) => unitThreat(B, k, b) - unitThreat(B, k, a))[0];
    // Un bot malin garde son gros retrait : bruler 6 degats sur un 1/1 est un cadeau.
    // Sans menace qui en vaille la peine, la carte reste en main pour le tour suivant.
    const vautLeCoup = !jeu.malin || !kill || unitThreat(B, k, kill) >= dmg * 0.8;
    if (kill && vautLeCoup) return { type: 'play', index: x.i, target: { side: foe(k), uid: kill.uid } };
    if ((x.c.play || []).some(e => e.t === 'allEnemyUnits') && them.board.length >= 2) {
      return { type: 'play', index: x.i, target: null };
    }
  }
  // Destruction : elle n'a pas de seuil de PV a atteindre, elle ne passe donc pas par
  // la boucle de degats ci-dessus. On ne la joue que si elle rapporte vraiment — une
  // carte qui detruit les deux plateaux vaut zero quand c'est nous qui perdons le plus.
  for (const x of playable) {
    if (!(x.c.play || []).some(e => e.op === 'detruit')) continue;
    if (!them.board.length || cardValue(B, k, x.c) <= 0) continue;
    return { type: 'play', index: x.i, target: pickTarget(B, k, x.c) };
  }
  // Attaques. Le bot malin compare TOUTES les paires (attaquant, cible) avant de
  // frapper, et s'abstient quand rien de bon n'est possible — mieux vaut garder une
  // unite vivante que la jeter dans une provocation qui la mange.
  if (jeu.malin && ready.length) {
    const coup = meilleureAttaque(B, k, ready);
    if (coup && coup.note > 0) return { type: 'attack', uid: coup.uid, target: coup.target };
    if (coup) return { type: 'end' };
  }

  // Attaques (bot naif) : provocations d'abord, puis les echanges qui valent le coup.
  for (const u of ready) {
    const legal = attackableTargets(B, k, u);
    const units = legal.filter(t => t.uid !== 'hero')
      .map(t => them.board.find(x => x.uid === t.uid)).filter(Boolean);

    // Echange franchement favorable : on tue sans mourir.
    const propre = units.filter(d => d.hp <= u.atk && d.atk < u.hp)
      .sort((a, b) => unitThreat(B, k, b) - unitThreat(B, k, a))[0];
    if (propre) return { type: 'attack', uid: u.uid, target: { side: foe(k), uid: propre.uid } };

    // Echange ou l'on meurt aussi : acceptable si la cible est vraiment genante,
    // ou si notre unite laisse un rale derriere elle.
    const ctx = { allies: me.board.length, enemies: them.board.length, board: me.board, foeBoard: them.board, B, k };
    const consolation = effectsValue(u.death, ctx) * 0.9;
    const troc = units.filter(d => d.hp <= u.atk)
      .sort((a, b) => unitThreat(B, k, b) - unitThreat(B, k, a))[0];
    if (troc && unitThreat(B, k, troc) + consolation > u.atk * 1.3 + u.hp * 0.35) {
      return { type: 'attack', uid: u.uid, target: { side: foe(k), uid: troc.uid } };
    }

    if (taunts.length) {
      const t = units.sort((a, b) => a.hp - b.hp)[0];
      if (t) return { type: 'attack', uid: u.uid, target: { side: foe(k), uid: t.uid } };
    }
    return { type: 'attack', uid: u.uid, target: { side: foe(k), uid: 'hero' } };
  }

  // --- 4. au hasard --------------------------------------------------------
  const r = randomAction(B, k, playable, ready);
  return r || { type: 'end' };
}

function randomAction(B, k, playable, ready) {
  const pool = [];
  for (const x of playable) pool.push({ type: 'play', index: x.i, target: pickTarget(B, k, x.c) });
  for (const u of ready) {
    const legal = attackableTargets(B, k, u);
    pool.push({ type: 'attack', uid: u.uid, target: legal[Math.floor(Math.random() * legal.length)] });
  }
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

function pickTarget(B, k, card) {
  if (!needsTarget(card)) return null;
  const targets = legalTargets(B, k, card);
  if (!targets.length) return { side: foe(k), uid: 'hero' };

  const soutien = (card.play || []).some(e => e.op === 'buff' || (e.op === 'heal' && e.t === 'allyUnit'));
  if (soutien) {
    const mine = targets.filter(t => t.side === k)
      .map(t => B[k].board.find(u => u.uid === t.uid)).filter(Boolean);
    if (mine.length) {
      // On renforce l'unite qui compte le plus : porteuse d'aura ou grosse attaque.
      const ctx = { allies: B[k].board.length, enemies: B[foe(k)].board.length, sameType: 0,
        board: B[k].board, foeBoard: B[foe(k)].board, B, k };
      const poids = u => u.atk
        + auraValue(u.aura, ctx.allies - 1, ctx.enemies, sameTypeCount(B[k].board, u)) * 1.5
        + effectsValue(u.death, { ...ctx, sameType: sameTypeCount(B[k].board, u) });
      const best = mine.sort((a, b) => poids(b) - poids(a))[0];
      if (best) return { side: k, uid: best.uid };
    }
  }

  // Une destruction ne regarde pas les PV : on enleve l'unite la plus genante.
  if ((card.play || []).some(e => e.op === 'detruit')) {
    const them = B[foe(k)];
    const proies = targets.filter(t => t.side === foe(k) && t.uid !== 'hero')
      .map(t => them.board.find(u => u.uid === t.uid)).filter(Boolean)
      .sort((a, b) => unitThreat(B, k, b) - unitThreat(B, k, a));
    if (proies.length) return { side: foe(k), uid: proies[0].uid };
  }

  const dmg = (card.play || []).filter(e => e.op === 'dmg').reduce((a, e) => a + amountValue(e.v, B, k, null), 0);
  if (dmg) {
    const them = B[foe(k)];
    const kill = them.board.filter(u => u.hp <= dmg)
      .sort((a, b) => unitThreat(B, k, b) - unitThreat(B, k, a))[0];
    if (kill) return { side: foe(k), uid: kill.uid };
    const face = targets.find(t => t.uid === 'hero');
    if (face) return face;
  }
  return targets[0];
}
