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
import { canPlay, legalTargets, attackableTargets, needsTarget, needsChoice, cloneBattle, playCard, attack, endTurn } from './engine.js';
import { TRIGGERS, TARGETS, STATICS, ZONES, hasKey, keyId, keyFields, counterValue, amountValue, cardCost, cardMatches, staticFields, targetId, targetArg, partageType, estDuType, eachSubEffect, listeEffets, typeVariable } from '../config/mechanics.js';
import { cardById, fatiguePile, switchOf } from '../config/npcs.js';

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

// Les types sont lus par les memes fonctions que le moteur (config/mechanics.js) :
// le bot doit compter la meute exactement comme le combat la resout, « Type : tous »
// compris — sinon il jouerait une carte qui ne fait pas ce qu'il croit.
/** Combien d'unites du plateau partagent une etiquette de type avec `x`. */
function sameTypeCount(board, x) {
  return board.filter(u => u !== x && partageType(x, u)).length;
}
/** Combien d'unites d'un plateau portent le type ecrit dans une cible « allyType:X ». */
function typeCount(board, t) {
  const voulu = targetArg(t);
  return voulu ? (board || []).filter(u => estDuType(u, voulu)).length : 0;
}

// --------------------------------------------------------------- valorisation
const CIBLES_ENNEMIES = ['enemyUnit', 'allEnemyUnits', 'randomEnemyUnit', 'enemyType'];
// « Elle-meme » n'est pas la : le porteur sera bien la, meme si le plateau est vide.
const CIBLES_ALLIEES = ['allyUnit', 'allAllies', 'randomAllyUnit', 'sameTypeAllies', 'allyType'];
// LES CIBLES SANS CAMP. Elles ne sont dans aucune des deux listes : elles prennent des
// deux cotes, donc ni la faisabilite ni le signe ne se deduisent d'un camp. Chaque
// effet dit ce qu'il en fait — pour un balayage, ce qu'on gagne en face moins ce qu'on
// perd chez soi ; pour une cible designee, le bot choisit son cote (cf. pickTarget).
const CIBLES_MIXTES = ['anyUnit', 'allUnits', 'randomUnit', 'anyType'];

/**
 * L'EFFET PEUT-IL SEULEMENT SE PRODUIRE ? La valorisation chiffrait ce que la carte
 * PROMET, jamais ce qu'elle FERA : un renvoi en main sans rien a renvoyer, une pioche
 * avec un deck fini, un sort de zone sans une seule unite en face valaient leur plein
 * tarif — et le bot les jouait dans le vide. C'est ce que disent les journaux :
 * « Aucune cible a viser », « Rien a deplacer », « Rien de sort a piocher ».
 *
 * On ne juge que ce qui est SUR : un effet dont on ne sait rien passe (mieux vaut le
 * surestimer que rendre le bot craintif).
 */
function faisable(e, ctx) {
  const B = ctx.B, k = ctx.k;
  if (!B) return true;                       // hors combat : on ne sait rien
  const me = B[k];
  const t = targetId(e.t);
  if (CIBLES_ENNEMIES.includes(t) && !ctx.enemies) return false;
  if (CIBLES_ALLIEES.includes(t) && !ctx.allies) return false;
  // Sans camp impose, il suffit qu'il y ait une unite quelque part.
  if (CIBLES_MIXTES.includes(t) && !ctx.enemies && !ctx.allies) return false;

  // Un filtre dont le TYPE se lit sur une carte ne se juge pas d'avance : il ne sera
  // connu qu'au moment ou l'effet partira. On ne condamne pas la carte pour ca.
  if (typeVariable(e)) return true;

  if (e.op === 'draw') return !!me.deck.length || !!fatiguePile().length;
  if (e.op === 'pioche_x') return me.deck.some(c => c.name === e.carte);
  if (e.op === 'pioche_une_carte_de_type') return me.deck.some(c => (e.type === 'spell') === (c.type !== 'ally'));
  if (e.op === 'reduit_le_cout_de') return me.hand.some(c => cardMatches(c, e));

  // Une copie sans modele ne fait rien : un paquet ou pas un seul ALLIE ne passe le
  // filtre ne donnera jamais de quoi se transformer (on ne copie pas un sort).
  if (e.op === 'copie') {
    const z = ZONES[e.d_ou] || {};
    if (z.carte || z.cible) return true;
    return pilesVisees(B, k, e).some(pile => pile.some(c => c.type === 'ally' && cardMatches(c, e)));
  }

  if (['melange_a_la_pioche', 'renvoie_en_main', 'pose_sur_le_plateau', 'renforce_les_cartes', 'switch'].includes(e.op)) {
    const z = ZONES[e.d_ou] || {};
    if (z.carte) return true;                          // creee de toutes pieces
    if (z.cible) return true;                          // le plateau : la cible a deja tranche
    if (e.fatigue && fatiguePile().length) return true; // completee par la fatigue
    return pilesVisees(B, k, e).some(pile => pile.some(c => cardMatches(c, e)));
  }
  return true;
}

/**
 * Les paquets qu'un effet peut viser. « Chez qui » ne designe plus toujours un camp
 * connu d'avance : « son proprietaire » suit la cible, « un joueur au hasard » tire a
 * pile ou face. Le bot regarde alors les deux cotes plutot que de parier.
 */
function pilesVisees(B, k, e) {
  const pile = camp => e.d_ou === 'main' ? B[camp].hand : e.d_ou === 'pioche' ? B[camp].deck : B[camp].discard;
  if (e.qui === 'adversaire') return [pile(foe(k))];
  if (e.qui === 'proprietaire' || e.qui === 'hasard') return [pile(k), pile(foe(k))];
  return [pile(k)];
}

/**
 * Ce que vaut POUR NOUS un effet qui touche le paquet designe par « chez qui ». Chez
 * l'adversaire, un cadeau est une perte ; un joueur au hasard, c'est pile ou face,
 * donc en moyenne rien. « Son proprietaire » suit la cible : on le lit comme chez soi,
 * puisque c'est nous qui choisissons la cible.
 */
const signeDuPaquet = e => e.qui === 'adversaire' ? -1 : e.qui === 'hasard' ? 0 : 1;

/**
 * TOUS les effets d'une carte, y compris ceux caches dans les branches d'un « Choisir ».
 * Les heuristiques qui cherchent « cette carte fait-elle des degats ? » passent par la :
 * sans ca, une carte dont le retrait est dans une branche paraitrait inoffensive.
 */
function effetsDeLaCarte(card, choix) {
  const out = [];
  const descend = e => {
    if (e.op === 'choisir') {
      for (const b of (choix ? [e[choix]] : [e.a, e.b])) for (const x of listeEffets(b)) descend(x);
      return;
    }
    out.push(e);
  };
  for (const e of (card && card.play) || []) descend(e);
  return out;
}

/** Ce que vaut un corps moyen sur ce plateau — ce qu'une copie remplace. */
const moyenneCorps = (list, ctx) => (list && list.length)
  ? list.reduce((a, u) => a + bodyValue(u, ctx, 0.8), 0) / list.length : 0;

/**
 * Ce que vaut le MODELE d'une copie, quand on peut le savoir : une carte nommee, une
 * unite en jeu, la moyenne des allies d'un paquet. `null` veut dire « on ne sait
 * pas » — un tirage au hasard dans le catalogue, un paquet vide — et l'appelant
 * s'abstient alors de trancher plutot que d'inventer un chiffre.
 */
function valeurDuModele(e, ctx) {
  const z = ZONES[e.d_ou] || {};
  if (z.carte) {
    if ((e.choix || 'precise') !== 'hasard') {
      const c = cardById(e.carte);
      return c && c.type === 'ally' ? bodyValue(c, ctx, 0.8) : null;
    }
    return null;
  }
  if (z.cible) {
    const pool = (CIBLES_ENNEMIES.includes(targetId(e.tm)) ? ctx.foeBoard : ctx.board) || [];
    return pool.length ? moyenneCorps(pool, ctx) : null;
  }
  if (!ctx.B) return null;
  const allies = pilesVisees(ctx.B, ctx.k, e).flat().filter(c => c.type === 'ally' && cardMatches(c, e));
  return allies.length ? moyenneCorps(allies, ctx) : null;
}

/** Valeur approximative d'un effet, en "points de tempo". ctx = tailles de plateau. */
function effectValue(e, ctx) {
  if (!faisable(e, ctx)) return 0;
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
      // Sans camp : un balayage compte ce qu'on gagne en face MOINS ce qu'on perd chez
      // soi — c'est ce qui fait qu'on ne joue « degats a tout le monde » qu'en retard.
      if (e.t === 'allUnits') return v * (ctx.enemies * 0.9 - ctx.allies);
      if (targetId(e.t) === 'anyType') return v * (typeCount(ctx.foeBoard, e.t) * 0.9 - typeCount(ctx.board, e.t));
      // Une unite au hasard des deux camps : une chance sur deux de se tirer dessus.
      if (e.t === 'randomUnit') return v * (ctx.enemies - ctx.allies) / Math.max(1, ctx.enemies + ctx.allies);
      // Designee, elle part en face — le bot choisit sa cible. Sans rien en face, il ne
      // resterait que nos propres unites a blesser : c'est un cout.
      if (e.t === 'anyUnit') return ctx.enemies ? v : -v;
      // Se blesser soi-meme ou blesser un allie est un cout, pas un gain : le bot
      // doit prendre une carte pareille pour ce qu'elle est.
      if (['self', 'randomAllyUnit', 'randomAllyAny'].includes(e.t)) return -v;
      // « Les autres du meme type que Lui » : on ne sait pas encore qui sera touche,
      // ca depend de ce que l'effet d'avant a vise. Au mieux le reste du plateau, et
      // rien du tout quand il n'y a personne d'autre.
      if (e.t === 'previousType') return v * 0.5 * Math.max(0, ctx.enemies - 1);
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
      const duType = list => (list || []).filter(u => estDuType(u, targetArg(e.t)));
      switch (targetId(e.t)) {
        // Sans camp : ce qu'on enleve en face moins ce qu'on s'enleve a soi.
        case 'allUnits': return somme(ctx.foeBoard) - somme(ctx.board);
        case 'anyType': return somme(duType(ctx.foeBoard)) - somme(duType(ctx.board));
        case 'randomUnit': return (moyenne(ctx.foeBoard) - moyenne(ctx.board)) * 0.85;
        // Designee : le bot vise la plus grosse d'en face, comme « une unite adverse ».
        case 'anyUnit': return ctx.enemies ? Math.max(0, ...(ctx.foeBoard || []).map(poids)) : -moyenne(ctx.board);
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
    // UNE PIOCHE QUI DEBORDE NE VAUT RIEN : au-dela de la place en main, la carte
    // tiree part directement a la defausse. Les journaux en sont pleins (« Main
    // pleine : X part a la defausse »), et le bot enchainait ces pioches sans le voir.
    case 'draw': return Math.min(n('v'), ctx.place ?? 99) * 1.6;
    // Aller CHERCHER une carte precise vaut plus que piocher au hasard : on sait ce
    // qu'on prend. Mais ca ne vaut rien si le deck ne la contient pas — le bot ne peut
    // pas le savoir ici, on reste donc raisonnable.
    // Creer vaut un peu plus que chercher dans son deck : la carte arrive toujours,
    // meme deck fini, et on sait exactement laquelle.
    // Au hasard, on ne sait pas ce qui tombe : ca vaut un peu plus qu'une pioche,
    // un peu moins qu'une carte qu'on a choisie.
    case 'cree': return Math.min(e.n === undefined ? 1 : n('n'), ctx.place ?? 99) * (e.choix === 'hasard' ? 1.5 : 2.2);
    case 'renforce_les_cartes': {
      // Un renfort ecrit sur des cartes qu'on jouera plus tard : ca vaut moins qu'un
      // renfort sur le plateau (il faut encore les tirer et les payer), et c'est un
      // cadeau si les cartes sont a l'adversaire.
      const combien = e.n === undefined ? 1 : n('n');
      const gain = ((e.atk === undefined ? 0 : n('atk')) * 1.1 + (e.hp === undefined ? 0 : n('hp')) * 0.6) * combien * 0.6;
      return gain * signeDuPaquet(e);
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
      return pourLeCampVise * signeDuPaquet(e);
    }
    case 'copie': {
      // Une copie est un ECHANGE : on gagne le corps du modele, on perd celui qu'on
      // remplace. En face, le signe s'inverse — transformer une grosse unite adverse
      // en petite chose est un retrait, lui offrir un meilleur corps est un cadeau.
      const t = targetId(e.t);
      const enFace = CIBLES_ENNEMIES.includes(t);
      const corps = (enFace ? ctx.foeBoard : ctx.board) || [];
      const modele = valeurDuModele(e, ctx);
      if (modele === null) return 0.5;   // on ne sait pas ce qui tombe : rien de tranche
      const remplace = t === 'self' ? bodyValue(ctx.carte || {}, ctx, 0.8) : moyenneCorps(corps, ctx);
      const combien = ['allEnemyUnits', 'allAllies'].includes(t) ? corps.length : 1;
      return (enFace ? -1 : 1) * (modele - remplace) * combien;
    }
    case 'switch': {
      // L'autre face est CONNUE quand on switche une unite en jeu : c'est un echange,
      // comme une copie — ce qu'on gagne moins ce qu'on perd, signe inverse en face.
      // Dans un paquet, on ne sait pas encore quelle carte sera prise : petite utilite.
      if (!(ZONES[e.d_ou] || {}).cible) return 0.4;
      const t = targetId(e.t);
      const enFace = CIBLES_ENNEMIES.includes(t);
      const corps = (enFace ? ctx.foeBoard : ctx.board) || [];
      if (!corps.length) return 0;
      const gain = u => {
        // On lit la definition, pas la carte resolue : le bot sous-estime un peu une
        // autre face a gros paliers, plutot que d'inventer un niveau.
        const face = switchOf((u.card || {}).id);
        if (!face) return 0;                                  // pas d'autre face
        return (face.type === 'ally' ? bodyValue(face, ctx, 0.8) : effectsValue(face.play, ctx))
          - bodyValue(u, ctx, 0.8);
      };
      const somme = corps.reduce((a, u) => a + gain(u), 0);
      const tout = ['allEnemyUnits', 'allAllies', 'enemyType', 'allyType', 'allUnits', 'anyType'].includes(t);
      return (enFace ? -1 : 1) * (tout ? somme : somme / corps.length);
    }
    case 'prendre_le_controle': {
      // Un corps qu'on enleve a l'adversaire ET qu'on met de notre cote : il change
      // deux fois de camp dans le compte. Un peu moins que deux fois sa valeur, parce
      // qu'il n'attaque pas le tour ou il arrive.
      const t = targetId(e.t);
      if (CIBLES_ALLIEES.includes(t) || t === 'self') return 0;   // prendre chez soi ne fait rien
      const proies = (ctx.foeBoard || []).map(u => bodyValue(u, ctx, 0.8));
      if (!proies.length) return 0;
      const somme = proies.reduce((a, v) => a + v, 0);
      const prise = ['allEnemyUnits', 'enemyType', 'allUnits', 'anyType'].includes(t) ? somme
        : (TARGETS[t] || {}).random ? somme / proies.length
          : Math.max(...proies);
      return prise * 1.8;
    }
    // On garde la meilleure des deux branches : c'est celle que le bot jouera.
    case 'choisir': return Math.max(brancheValue(e.a, ctx), brancheValue(e.b, ctx));
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
      const t = targetId(e.t);
      // Un renfort « du meme type » ne vaut que le nombre d'allies etiquetes presents :
      // sans meute sur le plateau, il ne fait rien, et le bot ne doit pas le jouer.
      // SANS CAMP, le signe se calcule au lieu de se lire. Un renfort qui touche tout
      // le monde profite au camp qui a le plus d'unites ; un affaiblissement (per < 0)
      // s'inverse alors tout seul, sans un cas de plus.
      if (t === 'allUnits') return per * (ctx.allies - ctx.enemies);
      if (t === 'anyType') return per * (typeCount(ctx.board, e.t) - typeCount(ctx.foeBoard, e.t));
      if (t === 'randomUnit') return per * (ctx.allies - ctx.enemies) / Math.max(1, ctx.allies + ctx.enemies);
      // Designee : le bot l'envoie du bon cote — renforcer chez soi, affaiblir en face —
      // donc elle vaut ce qu'elle donne, a condition qu'il y ait quelqu'un de ce cote-la.
      if (t === 'anyUnit') return per >= 0 ? (ctx.allies ? per : 0) : (ctx.enemies ? -per : 0);
      const cibles = e.t === 'allAllies' ? Math.max(1, ctx.allies)
        : e.t === 'allEnemyUnits' ? Math.max(1, ctx.enemies)
          : e.t === 'sameTypeAllies' ? Math.max(0, ctx.sameType || 0)
            : t === 'allyType' ? typeCount(ctx.board, e.t)
              : t === 'enemyType' ? typeCount(ctx.foeBoard, e.t)
                : 1;
      // EN FACE, LE SIGNE S'INVERSE : affaiblir l'adversaire de -2/-2 est bon pour nous,
      // et lui offrir +2/+2 est un cadeau. Le bot doit lire les deux dans le bon sens.
      const enFace = ['enemyUnit', 'allEnemyUnits', 'randomEnemyUnit', 'enemyType'].includes(t);
      return (enFace ? -per : per) * cibles;
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
/** Une branche de « Choisir » : la somme de ses effets. Vide, elle ne vaut rien. */
const brancheValue = (v, ctx) => effectsValue(listeEffets(v), ctx);

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
  if (f.src === 'alliesOfType' && estDuType(card, f.arg)) x += 1;
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

/**
 * La position, telle que la fonction de valeur la lit. Ecrite une fois : `cardValue` et
 * le choix d'une branche doivent juger la meme chose, sinon le bot choisirait la
 * branche B en croyant jouer la valeur de la branche A.
 * `place` : combien de cartes tiendraient encore en main. La carte qu'on evalue va
 * quitter la main en etant jouee, d'ou le +1.
 */
function contexte(B, k, card) {
  const me = B[k], them = B[foe(k)];
  return { allies: me.board.length, enemies: them.board.length, sameType: sameTypeCount(me.board, card),
    place: Math.max(0, BALANCE.combat.handMax - me.hand.length + 1),
    board: me.board, foeBoard: them.board, B, k, carte: card };
}

/**
 * QUELLE BRANCHE le bot prend sur une carte « Choisir » : celle qui vaut le plus dans
 * cette position. Le Monte-Carlo, lui, ne s'en sert pas — il essaie les deux et joue
 * les parties jusqu'au bout (cf. `coupsPossibles`).
 */
export function meilleureBranche(B, k, card) {
  const ctx = contexte(B, k, card);
  let a = 0, b = 0;
  for (const brut of card.play || []) eachSubEffect(brut, e => {
    if (e.op !== 'choisir') return;
    a += brancheValue(e.a, ctx);
    b += brancheValue(e.b, ctx);
  });
  return b > a ? 'b' : 'a';
}

/** Ce que vaut une carte si on la pose maintenant, dans cette position. */
function cardValue(B, k, def) {
  const card = estimee(B, k, def);
  const ctx = contexte(B, k, card);
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
    place: Math.max(0, BALANCE.combat.handMax - them.hand.length),
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
    // Une carte « Choisir » fait DEUX coups : le Monte-Carlo joue les deux branches
    // jusqu'au bout et garde celle qui gagne le plus souvent. C'est mieux qu'une
    // fonction de valeur, et ca ne coute qu'un candidat de plus.
    if (needsChoice(c)) {
      // Chaque branche a ses propres cibles : on vise avec celle qu'on essaie.
      for (const choix of ['a', 'b']) coups.push({ type: 'play', index: i, target: pickTarget(B, k, c, choix), choix });
      return;
    }
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
  else if (a.type === 'play') { if (!playCard(B, k, a.index, a.target, a.choix)) endTurn(B); }
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
  // A EGALITE, LE MOINS CHER. Sans ce departage le bot gardait le PREMIER de la liste
  // — et `coupsPossibles` empile les cartes avant « passer ». Une carte qui ne change
  // rien donne pourtant exactement le meme taux que passer : le Monte-Carlo mesurait
  // bien qu'elle etait inutile, puis la jouait quand meme, par ordre d'arrivee.
  // Attaquer et passer coutent zero, donc rien ne passe devant une attaque gratuite.
  // Un candidat ecarte tot a moins de parties derriere lui : c'est voulu, il perdait.
  const taux = e => (e.n ? e.somme / e.n : 0);
  const cout = a => (a.type === 'play' ? Math.max(0, cardCost(B[k].hand[a.index], B, k)) : 0);
  let best = evalues[0];
  for (const e of evalues) {
    const ecart = taux(e) - taux(best);
    if (ecart > 1e-9 || (ecart > -1e-9 && cout(e.coup) < cout(best.coup))) best = e;
  }
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
    ...note, quoi: 'carte', id: c.id || null,
    nom: c.name + (a.choix ? ` (choix ${a.choix.toUpperCase()})` : ''),
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
    // Le combat lui-meme : l'ecouteur peut ainsi ecrire la decision DANS le journal
    // de la partie, a sa place chronologique, juste avant le coup joue.
    b: B,
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
  const a = avecChoix(B, k, decide(B, k, jeu));
  noteLaDecision(B, k, a, null);
  return a;
}

/**
 * Une carte « Choisir » ne part jamais sans reponse. Les priorites du GDD construisent
 * leur coup a sept endroits differents : on complete a la sortie plutot que d'ajouter
 * la meme ligne sept fois. Le Monte-Carlo, lui, a deja tranche (les deux branches sont
 * des coups distincts) et on ne touche pas a son choix.
 */
function avecChoix(B, k, a) {
  if (!a || a.type !== 'play' || a.choix) return a;
  const c = B[k].hand[a.index];
  if (!c || !needsChoice(c)) return a;
  const choix = meilleureBranche(B, k, c);
  // La cible avait ete choisie sans savoir quelle branche partirait : si elle ne
  // convient pas a celle-ci, on en reprend une qui convient.
  const legales = legalTargets(B, k, c, choix);
  const bonne = a.target && legales.some(t => t.side === a.target.side && t.uid === a.target.uid);
  return { ...a, choix, target: bonne ? a.target : pickTarget(B, k, c, choix) };
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
    // Une carte qui ne vaut plus rien dans cette position ne fera rien : elle n'a pas
    // a passer devant « ne rien jouer ». C'est la faisabilite qui la met a zero.
    .filter(x => cardValue(B, k, x.c) > 0)
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

/**
 * LE COUP AU HASARD — la 4e priorite du GDD, et le dernier recours quand aucune des
 * trois autres n'a rien trouve. Le GDD VEUT que le bot se trompe : c'est la marge de
 * progression du joueur. Mais jouer une carte qui ne peut RIEN faire n'est pas une
 * erreur interessante, c'est du mana brule pour rien — c'est ce qu'on lisait dans les
 * journaux (« Loup - Souffle » lance sur un plateau vide, 48 fois sur une matrice).
 * On tire donc au hasard parmi ce qui produit quelque chose ; si rien ne produit rien,
 * on garde ses cartes.
 */
function randomAction(B, k, playable, ready) {
  const pool = [];
  for (const x of playable) {
    if (cardValue(B, k, x.c) <= 0) continue;
    pool.push({ type: 'play', index: x.i, target: pickTarget(B, k, x.c) });
  }
  for (const u of ready) {
    const legal = attackableTargets(B, k, u);
    pool.push({ type: 'attack', uid: u.uid, target: legal[Math.floor(Math.random() * legal.length)] });
  }
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

function pickTarget(B, k, card, choix) {
  if (!needsTarget(card, choix)) return null;
  const targets = legalTargets(B, k, card, choix);
  if (!targets.length) return { side: foe(k), uid: 'hero' };

  // UN SOUTIEN EST UN EFFET QUI FAIT DU BIEN, et ca se lit au SIGNE : un renfort
  // negatif est un affaiblissement, il n'a rien a faire sur nos propres unites. La
  // question se pose depuis qu'une cible peut n'avoir aucun camp (« une unite, alliee
  // ou adverse ») : avant, le cote de la cible tranchait tout seul.
  const effets = effetsDeLaCarte(card, choix);
  const soutien = effets.some(e => e.op === 'heal'
    || (e.op === 'buff' && (e.atk || 0) >= 0 && (e.hp || 0) >= 0));
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

  // Une destruction ne regarde pas les PV : on enleve l'unite la plus genante. Une
  // prise de controle vise pareil — c'est le meme retrait, avec un corps en prime.
  if (effets.some(e => e.op === 'detruit' || e.op === 'prendre_le_controle')) {
    const them = B[foe(k)];
    const proies = targets.filter(t => t.side === foe(k) && t.uid !== 'hero')
      .map(t => them.board.find(u => u.uid === t.uid)).filter(Boolean)
      .sort((a, b) => unitThreat(B, k, b) - unitThreat(B, k, a));
    if (proies.length) return { side: foe(k), uid: proies[0].uid };
  }

  // Une copie : en face on transforme la plus genante (c'est un retrait), chez soi la
  // plus faible (c'est elle qui a le plus a gagner a changer de peau).
  const copie = effets.find(e => e.op === 'copie');
  if (copie) {
    const enFace = CIBLES_ENNEMIES.includes(targetId(copie.t));
    const camp = enFace ? foe(k) : k;
    const unites = targets.filter(t => t.side === camp && t.uid !== 'hero')
      .map(t => B[camp].board.find(u => u.uid === t.uid)).filter(Boolean);
    const choisie = enFace
      ? unites.sort((a, b) => unitThreat(B, k, b) - unitThreat(B, k, a))[0]
      : unites.sort((a, b) => (a.atk + a.hp) - (b.atk + b.hp))[0];
    if (choisie) return { side: camp, uid: choisie.uid };
  }

  const dmg = effets.filter(e => e.op === 'dmg').reduce((a, e) => a + amountValue(e.v, B, k, null), 0);
  if (dmg) {
    const them = B[foe(k)];
    const kill = them.board.filter(u => u.hp <= dmg)
      .sort((a, b) => unitThreat(B, k, b) - unitThreat(B, k, a))[0];
    if (kill) return { side: foe(k), uid: kill.uid };
    const face = targets.find(t => t.uid === 'hero');
    if (face) return face;
    // Rien a abattre, pas de heros a portee : on frappe quand meme EN FACE, et la plus
    // genante. Sans ca, une cible sans camp (« une unite, alliee ou adverse ») partait
    // sur la premiere de la liste — c'est-a-dire sur une des notres.
    const proie = targets.filter(t => t.side === foe(k) && t.uid !== 'hero')
      .map(t => them.board.find(u => u.uid === t.uid)).filter(Boolean)
      .sort((a, b) => unitThreat(B, k, b) - unitThreat(B, k, a))[0];
    if (proie) return { side: foe(k), uid: proie.uid };
  }
  return targets[0];
}
