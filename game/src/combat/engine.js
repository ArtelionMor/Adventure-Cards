// Moteur de combat de cartes. Aucun DOM ici : l'UI lit l'etat et rejoue le log.
//
// MODELE D'UNITE — une unite separe ce qu'elle EST de ce qu'on lui FAIT :
//   baseAtk / baseHp / baseKeys  ce que la carte apporte, plus les renforts permanents
//   damage                       les degats encaisses, cumules
//   atk / maxHp / hp / keys      DERIVES, recalcules par refresh() a chaque changement
// C'est ce qui rend les auras propres : une aura qui tombe retire son bonus de maxHp
// sans "reguerir" l'unite, et sans la tuer deux fois si elle etait deja blessee.
//
// MOMENTS OU UNE CARTE PEUT AGIR (voir TRIGGERS dans config/mechanics.js) :
//   play       quand la carte est jouee (cri de guerre / effet du sort)
//   death      quand l'unite meurt (rale d'agonie)
//   turnStart  au debut du tour de son proprietaire
//   turnEnd    a la fin du tour de son proprietaire
//   on_X_qui   quand un EVENEMENT se produit (pioche, sort, allie pose, PV perdus,
//              unite tuee, attaque), provoque par toi, l'adversaire ou n'importe qui
//   aura       en continu tant que l'unite est en jeu (pas un effet : un modificateur)
//   statics    en continu aussi, mais sur autre chose que les stats des unites : le
//              cout des cartes en main, les montants des effets, les degats subis par
//              un heros, la pioche et le mana du tour (cf. STATICS dans mechanics.js).
//              Ils ne sont jamais parcourus a la main : staticTotal() les additionne
//              a l'endroit exact ou la valeur est lue.
import { BALANCE } from '../config/balance.js';
import { cardById, catalogCards, fatiguePile, switchOf } from '../config/npcs.js';
import { resolveCard } from '../config/characters.js';
import { staticMin, ALL_EFFECTS, ALL_KEYWORDS, TRIGGERS, ZONES, EVENTS, eventSlot, keyId, keyArg, hasKey, keyFields, counterValue, amountValue, numberParams, targetParams, cardMatches, describeFilter, describeCarteCreee, describeModele, cardCost, staticTotal, describeStatic, targetId, targetArg, targetDef, typesOf, partageType, estDuType, eachSubEffect, listeEffets, typeVariable, describeEffect, EVENT_GARDES } from '../config/mechanics.js';


let uid = 1;
const nextUid = () => 'u' + uid++;

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeSide(cfg) {
  return {
    key: cfg.key,
    name: cfg.name,
    sprite: cfg.sprite,
    hp: cfg.hp,
    maxHp: cfg.hp,
    armor: cfg.startArmor || 0,
    mana: 0,
    maxMana: 0,
    manaCap: Math.min(cfg.mana, BALANCE.combat.maxManaCap),
    handSize: cfg.hand,
    deck: shuffle(cfg.deck.map(c => ({ ...c }))),
    discard: [],
    hand: [],
    board: [],
    // Mana promis pour le PROCHAIN tour (effet `mana_au_prochain_tour`). Il s'ajoute
    // au mana du tour et peut donc depasser le mana max : c'est l'interet de l'effet.
    nextMana: 0,
    turns: 0,        // tours joues par ce camp, pour les caracteristiques variables
    aVide: false,    // son deck est epuise : il ne piochera plus (dit une seule fois)
    recycle: 0,      // cartes remises dans sa pioche ce tour-ci (garde-fou anti-boucle)
    fatigue: 0,      // pioches faites dans la pile de fatigue ce tour-ci (idem)
    // Ce que le camp a deja fait ce tour-ci, pour les trois plafonds statiques.
    jouees: 0,       // cartes jouees
    attaques: 0,     // unites qui ont attaque
    piochees: 0,     // cartes piochees (la pioche de debut de tour comprise)
    spellsGame: 0,   // sorts joues par ce camp depuis le debut du combat
    spellsTurn: 0,   // ... et depuis le debut de SON tour (remis a zero a chaque tour)
  };
}

export function createBattle(playerCfg, enemyCfg, meta = {}) {
  const B = {
    meta,
    p: makeSide({ ...playerCfg, key: 'p' }),
    e: makeSide({ ...enemyCfg, key: 'e' }),
    turn: 'p',
    turnNo: 0,
    log: [],
    pending: [],   // mecaniques rencontrees mais pas encore codees
    // Combien de fois chaque moment s'est declenche. Sert aux outils hors-jeu
    // (scripts/check-decks.mjs) a reperer un moment ecrit sur une carte qui ne part
    // jamais en vrai — le journal, lui, se fait tronquer au bout de 120 lignes.
    fired: {},
    eventDepth: 0, // rebonds de « quand X alors Y » en cours (garde-fou anti-boucle)
    renfortEnCours: false, // un renfort declenche par un renfort ne se redeclenche pas
    over: false,
    winner: null
  };
  for (let i = 0; i < B.p.handSize; i++) draw(B, 'p');
  for (let i = 0; i < B.e.handSize; i++) draw(B, 'e');
  say(B, `${B.p.name} affronte ${B.e.name}.`);
  beginTurn(B);
  return B;
}

const foe = k => (k === 'p' ? 'e' : 'p');

// Le plateau est-il plein ? `BALANCE.combat.boardSize` a 0 veut dire « pas de limite »
// (GAME CONFIG) : la question se pose au meme endroit qu'avant, elle repond juste
// toujours non. Un seul point de verite pour la pose, l'invocation et la jouabilite.
const plateauPlein = s => BALANCE.combat.boardSize > 0 && s.board.length >= BALANCE.combat.boardSize;
export const other = foe;
// Le cout d'une carte se lit toujours ici (le mot-cle « Cout X de moins/de plus » peut
// le faire varier d'un tour a l'autre) : l'UI et le bot le prennent au meme endroit.
export { cardCost };

function say(B, msg) {
  B.log.push(msg);
  // Assez long pour qu'un combat entier tienne dedans : c'est ce journal qu'on
  // telecharge pour comprendre une partie, et la fin seule ne dit jamais pourquoi.
  if (B.log.length > 400) B.log.shift();
}

// ------------------------------------------------------------------ pioche
/**
 * PIOCHER DANS UNE PIOCHE VIDE. Le deck ne se remelange toujours pas, mais finir sa
 * pioche ne veut plus dire « tu ne piocheras plus » : on tire alors une carte au
 * hasard dans la PILE DE FATIGUE (`CHARACTER_DATA.fatigue`, editee dans le builder).
 *
 * La pile ne s'epuise pas — chaque tirage en fabrique une COPIE — d'ou le plafond par
 * tour : sans lui, « sort a 0 mana qui fait piocher » se rejouerait sans fin, la
 * boucle meme que fermait l'ancienne regle. Pile vide = ancienne regle, a l'identique.
 */
function carteDeFatigue(B, k) {
  const pile = fatiguePile();
  if (!pile.length) return null;
  const s = B[k];
  if (s.fatigue >= BALANCE.combat.maxPiochesAVideParTour) {
    say(B, `${s.name} ne peut plus piocher dans la pile de fatigue ce tour-ci.`);
    return null;
  }
  s.fatigue++;
  const m = pile[Math.floor(Math.random() * pile.length)];
  return { ...resolveCard(m.card, m.lvl), sprite: m.sprite };
}

export function draw(B, k, n = 1) {
  const s = B[k];
  for (let i = 0; i < n; i++) {
    // « Tu ne pioches pas plus de X cartes par tour » : un effet statique. Il est dit
    // une fois, sinon un sort qui pioche cinq fois ecrirait cinq lignes identiques.
    if (s.piochees >= staticMin(B, k, 'nombre_de_cartes_piochees')) {
      if (!s.plafondPioche) { s.plafondPioche = true; say(B, `${s.name} a atteint sa limite de pioche pour ce tour.`); }
      return;
    }
    s.piochees++;
    // LE DECK NE SE REMELANGE PAS : une carte tiree ne revient pas d'elle-meme. Mais
    // une pioche vide n'est plus une impasse — on tire dans la pile de fatigue, qui
    // est le seul endroit ou une carte se fabrique toute seule. Un deck epais reste
    // un avantage : on tire ses bonnes cartes avant d'en etre reduit a la pile.
    // Pile vide : un camp a sec ne perd pas pour autant, il joue ce qu'il a encore en
    // main et sur le plateau ; quand plus personne ne peut rien, beginTurn tranche aux PV.
    if (!s.deck.length) {
      const secours = carteDeFatigue(B, k);
      if (!secours) {
        if (!s.aVide) { s.aVide = true; say(B, `${s.name} a fini sa pioche : plus aucune carte a tirer.`); }
        return;
      }
      if (!s.aVide) { s.aVide = true; say(B, `${s.name} a fini sa pioche : il tire dans la pile de fatigue.`); }
      if (s.hand.length >= BALANCE.combat.handMax) { say(B, `Main pleine : ${secours.name} part a la defausse.`); s.discard.push(secours); continue; }
      say(B, `${s.name} tire ${secours.name} de la pile de fatigue.`);
      s.hand.push(secours);
      fireEvent(B, k, 'draw');
      continue;
    }
    const c = s.deck.pop();
    if (s.hand.length >= BALANCE.combat.handMax) { say(B, `Main pleine : ${c.name} part a la defausse.`); s.discard.push(c); continue; }
    s.hand.push(c);
    fireEvent(B, k, 'draw');
  }
}

/**
 * Pioche CIBLEE : on cherche dans le deck la premiere carte qui convient au lieu de
 * prendre celle du dessus. On ne fouille pas la defausse — un deck est ce qu'il reste
 * a tirer, et fouiller la defausse ferait des boucles sans fin avec le remelange.
 * `dit` sert au journal quand rien ne correspond.
 */
function drawMatching(B, k, n, convient, dit) {
  const s = B[k];
  let pris = 0;
  for (let i = 0; i < n; i++) {
    // De la fin vers le debut : la fin du tableau est le dessus du deck.
    let idx = -1;
    for (let j = s.deck.length - 1; j >= 0; j--) if (convient(s.deck[j])) { idx = j; break; }
    if (idx < 0) break;
    const c = s.deck.splice(idx, 1)[0];
    if (s.hand.length >= BALANCE.combat.handMax) {
      say(B, `Main pleine : ${c.name} part a la defausse.`);
      s.discard.push(c);
    } else {
      s.hand.push(c);
      say(B, `${s.name} pioche ${c.name}.`);
    }
    pris++;
    fireEvent(B, k, 'draw');   // une pioche reste une pioche
    if (B.over) return pris;
  }
  if (pris < n) say(B, `Rien ${dit} a piocher dans le deck.`);
  return pris;
}

/**
 * Remet des cartes dans une pioche, chacune a une place au hasard. C'est le seul
 * moyen d'alimenter un deck qui ne se remelange pas — et donc la porte de sortie de
 * la regle « finir sa pioche, c'est fini ». D'ou le plafond par tour : sans lui, un
 * sort a 0 mana qui se remet lui-meme dans la pioche et fait piocher tournerait sans
 * fin dans le meme tour, exactement la boucle que la regle avait fermee.
 */
function melangeDedans(B, k, cartes) {
  const s = B[k];
  let mises = 0;
  for (const c of cartes) {
    if (s.recycle >= BALANCE.combat.maxRecyclageParTour) {
      say(B, `${s.name} ne peut plus remelanger de cartes ce tour-ci.`);
      break;
    }
    // Une place au hasard : le dessus du deck est la fin du tableau (draw() fait pop()).
    s.deck.splice(Math.floor(Math.random() * (s.deck.length + 1)), 0, c);
    s.recycle++;
    mises++;
  }
  // Le deck n'est plus vide : on pourra de nouveau annoncer sa fin le jour ou il l'est.
  if (mises && s.deck.length) s.aVide = false;
  return mises;
}

/**
 * DEPLACER DES CARTES D'UNE ZONE A L'AUTRE. « Melange dans la pioche », « Renvoie en
 * main » et « Pose sur le plateau » sont le meme geste, avec trois destinations :
 * on preleve des cartes quelque part, on les depose ailleurs.
 *
 * Regle constante : une carte reste TOUJOURS chez son proprietaire. Prendre une unite
 * adverse la renvoie dans SA main a lui, pas dans la notre. Le choix « chez qui » ne
 * sert qu'aux zones de paquet (main, defausse, pioche) ; le plateau, lui, se designe
 * avec une cible ordinaire.
 *
 * Une unite prelevee sur le plateau NE MEURT PAS : pas de rale d'agonie, pas de
 * defausse. C'est ce qui distingue un rebond d'une destruction.
 */
function preleve(B, k, e, target, source, last) {
  const zone = ZONES[e.d_ou] || ZONES.defausse;
  const pris = [];

  if (zone.carte) {
    const combien = Math.max(0, e.n === undefined ? 1 : e.n);
    for (let i = 0; i < combien; i++) {
      const modele = modeleCree(e);
      if (!modele) { say(B, `${rienDeTel(e)} : rien a deplacer.`); break; }
      pris.push({ camp: campDuPaquet(k, e), carte: { ...resolveCard(modele, e.lvl || 1), sprite: modele.sprite || (source ? source.sprite : null) } });
    }
    return pris;
  }

  if (zone.cible) {
    for (const r of recipients(B, k, e.t, target, source, last)) {
      if (r.kind !== 'unit') continue;
      const s2 = B[r.side];
      if (!s2.board.includes(r.unit)) continue;
      s2.board = s2.board.filter(u => u !== r.unit);
      // Meme regle qu'a la mort : la carte rentre chez son proprietaire, pas chez
      // celui qui la controlait.
      if (r.unit.card) pris.push({ camp: proprio(r.unit, r.side), carte: r.unit.card, unite: r.unit });
      else say(B, `${r.unit.name} n'est pas une carte : il disparait.`);   // un jeton
    }
    return pris;
  }

  // Zones de paquet. Les cartes fabriquees par la pile de fatigue n'y sont pas : le
  // `indexOf` ne les trouve pas et il n'y a donc rien a en retirer.
  const { camp, pile } = paquetDe(B, k, e);
  for (const carte of choisitDansPaquet(B, k, e, pile, camp)) {
    const at = pile.indexOf(carte);
    if (at >= 0) pile.splice(at, 1);
    pris.push({ camp, carte });
  }
  return pris;
}

/**
 * CHEZ QUI on va chercher les cartes. « Toi » et « l'adversaire » sont fixes ; les deux
 * autres se decident au moment ou l'effet part :
 *   - « son proprietaire » suit la CIBLE de l'effet — c'est ce qui permet « l'unite
 *     ciblee devient une carte au hasard de la pioche de SON proprietaire » ;
 *   - « un joueur au hasard » tire a pile ou face a chaque resolution.
 * Un effet sans cible a lire (les trois deplacements prennent dans un paquet, pas sur
 * une unite) retombe sur celui qui joue la carte, et la validation le dit.
 */
function campDuPaquet(k, e, campCible) {
  switch (e.qui) {
    case 'adversaire': return foe(k);
    case 'hasard': return Math.random() < 0.5 ? k : foe(k);
    case 'proprietaire': return campCible || k;
    default: return k;
  }
}

/** Le paquet qu'un effet vise : la main, la pioche ou la defausse, chez l'un ou l'autre. */
function paquetDe(B, k, e, campCible) {
  const camp = campDuPaquet(k, e, campCible);
  return { camp, pile: e.d_ou === 'main' ? B[camp].hand : e.d_ou === 'pioche' ? B[camp].deck : B[camp].discard };
}

/**
 * CHOISIR DES CARTES DANS UN PAQUET, sans rien y toucher. Deux facons, au choix du
 * designer : AU HASARD (personne n'est la pour choisir sur un rale d'agonie) ou DU
 * DESSUS — le dessus d'un paquet est la FIN du tableau, c'est de la que `draw()` tire.
 *
 * Et quand il n'y en a pas assez, la carte peut demander a COMPLETER AVEC LA PILE DE
 * FATIGUE : les manquantes sont fabriquees exactement comme a une pioche a vide, meme
 * plafond par tour compris. Elles n'appartiennent a aucun paquet tant qu'on ne les y a
 * pas mises — c'est a l'appelant de les deposer.
 */
function choisitDansPaquet(B, k, e, pile, camp) {
  const combien = Math.max(0, e.n === undefined ? 1 : e.n);
  const candidates = pile.filter(c => cardMatches(c, e));
  const pris = [];
  for (let i = 0; i < combien && candidates.length; i++) {
    const at = e.ordre === 'dessus' ? candidates.length - 1 : Math.floor(Math.random() * candidates.length);
    pris.push(candidates.splice(at, 1)[0]);
  }
  if (e.fatigue) {
    for (let i = pris.length; i < combien; i++) {
      const c = carteDeFatigue(B, camp);
      if (!c) break;
      say(B, `Il en manque : ${c.name} vient de la pile de fatigue.`);
      pris.push(c);
    }
  }
  return pris;
}

/**
 * La carte qu'un effet fait apparaitre de toutes pieces : celle qu'on a choisie, ou
 * une tiree au hasard dans le catalogue parmi celles que le filtre laisse passer.
 * On l'appelle une fois PAR EXEMPLAIRE : « 3 cartes au hasard », c'est trois tirages
 * differents, et non trois copies de la meme.
 */
function modeleCree(e) {
  if ((e.choix || 'precise') !== 'hasard') return cardById(e.carte);
  const sac = catalogCards().filter(c => cardMatches(c, e));
  if (!sac.length) return null;
  return sac[Math.floor(Math.random() * sac.length)];
}

/** Pourquoi rien n'est apparu : une carte nommee qui n'existe plus, ou un filtre
 *  que pas une carte du catalogue ne satisfait. Les deux se disent differemment. */
const rienDeTel = e => (e.choix || 'precise') === 'hasard'
  ? `le catalogue n'a pas ${describeCarteCreee(e)}`
  : `« ${e.carte || '?'} » n'existe pas`;

/**
 * LE RENFORT DES CARTES DEPLACEES. « Remelange ta defausse et donne-leur +2/+2 » : le
 * bonus va aux cartes qu'on vient de prendre, pas a un second paquet. Il s'ecrit sur la
 * CARTE (atk/hp), qui devient baseAtk/baseHp quand elle sera posee — la carte reste donc
 * grossie pour tout le combat, et les auras se cumulent par-dessus comme d'habitude.
 * On l'applique AVANT le depot : une carte posee sur le plateau arrive deja grossie.
 * Un sort n'a ni attaque ni vie et traverse sans rien recevoir.
 */
function renforceCartes(B, cartes, e) {
  const atk = e.atk || 0, hp = e.hp || 0;
  if (!atk && !hp) return;
  const touchees = [];
  for (const carte of cartes) {
    if (carte.type !== 'ally') continue;
    // Un bonus negatif ne doit ni rendre l'attaque absurde ni faire arriver la carte
    // deja morte : on borne, comme partout ailleurs dans le moteur.
    carte.atk = Math.max(0, (carte.atk || 0) + atk);
    carte.hp = Math.max(1, (carte.hp || 0) + hp);
    touchees.push(carte.name);
  }
  say(B, touchees.length
    ? `+${atk}/+${hp} pour ${touchees.join(', ')}.`
    : `+${atk}/+${hp} : aucun allie la-dedans, le bonus ne touche rien.`);
}

/** Depose une carte dans une zone. Rend l'unite creee quand elle arrive en jeu. */
function depose(B, camp, carte, vers) {
  const s = B[camp];
  if (vers === 'pioche') { melangeDedans(B, camp, [carte]); return null; }
  if (vers === 'main') {
    if (s.hand.length >= BALANCE.combat.handMax) {
      s.discard.push(carte);
      say(B, `Main pleine : ${carte.name} part a la defausse.`);
      return null;
    }
    s.hand.push(carte);
    return null;
  }
  // Sur le plateau : seuls les allies s'y posent, et la carte n'est pas JOUEE — « A la
  // pose » ne part donc pas, exactement comme pour un jeton invoque.
  if (carte.type !== 'ally') { say(B, `${carte.name} est un sort : il ne se pose pas.`); s.discard.push(carte); return null; }
  if (plateauPlein(s)) { say(B, `Le plateau de ${s.name} est plein : ${carte.name} reste de cote.`); s.discard.push(carte); return null; }
  const u = makeUnit(carte);
  u.card = carte;
  s.board.push(u);
  checkKeywords(B, u);
  return u;
}

// ------------------------------------------------------------------- switch
/**
 * L'AUTRE FACE D'UNE CARTE, resolue au niveau de celle qu'elle remplace. Une carte
 * libre, un jeton ou une carte de PNJ n'occupent aucun slot de personnage : ils n'ont
 * pas d'autre face, et l'appelant le dit.
 */
function autreFace(carte) {
  const def = carte && switchOf(carte.id);
  if (!def) return null;
  return { ...resolveCard(def, Math.max(1, carte.ownerLevel || 1)), sprite: def.sprite || carte.sprite };
}

/**
 * SWITCHER UNE UNITE EN JEU. Elle DEVIENT l'autre face — c'est exactement une copie,
 * donc le meme chemin — sauf quand cette autre face est un SORT : une unite ne peut pas
 * en devenir un, alors elle s'en va et le sort part a sa place. Elle ne meurt pas pour
 * autant (pas de rale d'agonie) : elle a change de forme, la carte finit a la defausse
 * de son proprietaire comme n'importe quel sort joue.
 */
function switcheUnite(B, k, r) {
  const carte = r.unit.card || carteDUnite(r.unit);
  const face = autreFace(carte);
  if (!face) { say(B, `${r.unit.name} n'a pas d'autre face.`); return null; }
  if (face.type === 'ally') {
    say(B, `${r.unit.name} devient ${face.name}.`);
    devientCopie(B, r.unit, face);
    return { kind: 'unit', side: r.side, unit: r.unit };
  }
  const camp = proprio(r.unit, r.side);
  B[r.side].board = B[r.side].board.filter(u => u !== r.unit);
  B[camp].discard.push(face);
  say(B, `${r.unit.name} se change en ${face.name} : le sort part.`);
  // Personne n'est la pour designer : le sort choisit ses cibles comme le fait un
  // rale d'agonie. Il part du cote de qui CONTROLAIT l'unite.
  if ((face.play || []).length) {
    B.fired.play = (B.fired.play || 0) + 1;
    applyEffects(B, r.side, face.play, autoTarget(B, r.side, face.play, null), face);
  }
  return null;
}

// ------------------------------------------------------- qui possede l'unite
/**
 * A QUI EST CETTE UNITE ? Presque toujours : au camp sur le plateau duquel elle se
 * trouve. « Prendre le controle » est le seul cas qui separe les deux — l'unite change
 * de camp, pas de proprietaire — et c'est lui, et lui seul, qui pose `owner`. Tant que
 * personne n'a rien vole, ce champ n'existe pas et la reponse est « le camp d'ici ».
 *
 * Ce qui suit le PROPRIETAIRE : la carte quand l'unite meurt, et la carte quand elle
 * quitte le plateau pour une main, une pioche ou une defausse.
 * Ce qui suit le CONTROLEUR : tout le reste — le rale d'agonie, les auras, les
 * attaques, les cibles « tes allies ».
 */
const proprio = (u, camp) => u.owner || camp;

// -------------------------------------------------------------------- copie
/**
 * LE MODELE D'UNE COPIE : une carte, prise la ou on la designe — et LAISSEE sur place.
 * Memes zones et memes filtres qu'un deplacement (c'est le meme bloc de parametres),
 * mais rien n'est preleve : copier une carte de la main adverse ne la lui prend pas.
 * Une cible qui designe plusieurs unites n'en donne qu'une, au hasard : une copie n'a
 * qu'un seul modele.
 */
function modeleACopier(B, k, e, target, source, last, campCible) {
  const zone = ZONES[e.d_ou] || ZONES.plateau;
  if (zone.carte) {
    const def = modeleCree(e);
    // Une carte du catalogue n'appartient a personne : on la resout au niveau de
    // celle qui copie, comme le fait un jeton invoque.
    if (!def) return null;
    const lvl = Math.max(1, (source && source.ownerLevel) || 1);
    return { ...resolveCard(def, lvl), sprite: def.sprite || (source ? source.sprite : null) };
  }
  if (zone.cible) {
    const r = pickOne(recipients(B, k, e.tm, target, source, last).filter(x => x.kind === 'unit'));
    if (!r) return null;
    return r.unit.card || carteDUnite(r.unit);
  }
  // `campCible` = le camp de l'unite qui se transforme : c'est lui que designe
  // « chez son proprietaire ».
  const { camp, pile } = paquetDe(B, k, e, campCible);
  return choisitDansPaquet(B, k, { ...e, n: 1, fatigue: false }, pile, camp)[0] || null;
}

/**
 * La carte qu'un JETON n'a pas. On la reconstitue avec ce qu'il annoncait en arrivant
 * (`printedAtk`/`printedHp`) : copier un jeton renforce ne doit pas copier le renfort,
 * pas plus que copier une carte du plateau ne copie les degats qu'elle a encaisses.
 */
function carteDUnite(u) {
  const c = {
    name: u.name, type: 'ally', cost: 0, atk: u.printedAtk, hp: u.printedHp,
    keys: [...u.baseKeys], sprite: u.sprite, ownerLevel: u.ownerLevel,
    aura: u.aura ? { ...u.aura } : null, statics: (u.statics || []).map(m => ({ ...m }))
  };
  for (const slot of Object.keys(TRIGGERS)) c[slot] = (u[slot] || []).map(x => ({ ...x }));
  return c;
}

/**
 * L'UNITE DEVIENT LA CARTE. On ne garde que son identite de plateau — son `uid` (les
 * cibles en cours, la fiche ouverte et l'affichage la suivent), sa place dans la
 * rangee, et le fait qu'elle ait deja attaque ce tour-ci. Tout le reste est remplace
 * par une unite neuve faite du modele : degats subis et renforts recus s'effacent.
 * Elle n'est PAS jouee : « A la pose » ne part pas, meme regle qu'un jeton invoque.
 */
function devientCopie(B, u, carte) {
  const neuve = makeUnit({ ...carte, ownerLevel: carte.ownerLevel || u.ownerLevel });
  const garde = {
    uid: u.uid,
    attackedThisTurn: u.attackedThisTurn,
    // Changer de peau ne rend pas une attaque deja depensee ; la Charge du modele, en
    // revanche, compte : sous cette forme-la, l'unite vient d'arriver.
    canAttack: u.canAttack || neuve.canAttack
  };
  for (const champ of Object.keys(u)) delete u[champ];
  Object.assign(u, neuve, garde);
  u.card = { ...carte };
  checkKeywords(B, u);
}

/**
 * L'unite telle que sa CARTE l'ecrit, mots-cles derives mis de cote. Sert a une seule
 * question : la portee d'une aura « aux allies du meme type ». Un type recu d'une aura
 * compte partout ailleurs (cibles, compteurs, filtres) mais pas ici — sinon une aura
 * qui donne un type elargirait sa propre portee, et ce que touche une aura dependrait
 * de l'ordre dans lequel on parcourt le plateau.
 */
const imprimee = u => ({ keys: u.baseKeys });

// -------------------------------------------------------------------- types
// Le mot-cle « type:Chien » etiquette une unite, et une carte peut en porter
// plusieurs. La regle vit dans config/mechanics.js (`typesOf`, `partageType`,
// `estDuType`) parce que le bot, les compteurs et les filtres de cartes se posent la
// meme question : deux copies de « est-ce un Chien ? » divergeraient fatalement, et
// « Type : tous » ne vaudrait que dans la moitie du jeu.

// -------------------------------------------------- caracteristique variable
// « characteristique_variable:stat:compteur:valeur » : l'attaque et/ou les PV ne sont
// plus ce qui est ecrit sur la carte, ils valent ce que compte un compteur.
//
// C'est un DERIVE, pas un etat : refresh() le recalcule a chaque changement, comme une
// aura. Deux consequences voulues :
//   - la valeur monte et descend toute seule, sans jamais toucher aux degats subis ;
//   - une vie variable qui tombe a 0 tue l'unite au prochain ramassage des morts,
//     exactement comme une aura de +PV qui disparait.
// Les renforts recus en combat s'ajoutent par-dessus : on les retrouve en comparant
// `baseAtk` (qui les cumule) a `printedAtk` (ce que la carte annoncait en arrivant).
const variableDe = u => {
  const k = (u.baseKeys || []).find(x => keyId(x) === 'characteristique_variable');
  return k ? keyFields(k) : null;
};

// -------------------------------------------------------------------- auras
/**
 * L'aura de `src` porte-t-elle sur `u` en ce moment ? `allie` dit si les deux sont du
 * meme cote. Une aura ne se pose jamais sur son propre porteur.
 * C'est LE seul endroit qui repond a cette question : `refresh()` s'en sert pour cumuler
 * les bonus, la vue inspectee pour dire d'ou ils viennent — les deux ne peuvent donc pas
 * diverger, ce qui arriverait fatalement avec deux copies de la regle.
 */
function auraPorte(src, u, allie) {
  if (!src.aura || src === u) return false;
  const scope = src.aura.scope || 'otherAllies';
  if (allie) return scope === 'otherAllies' || (scope === 'sameTypeAllies' && partageType(imprimee(src), imprimee(u)));
  return scope === 'enemyUnits';
}

/**
 * Les auras qui s'appliquent a `u` (du camp `k`), avec LEUR PORTEUR. Le combat ne garde
 * pas la trace de qui donne quoi — `refresh()` n'en range que le total — donc on relit
 * le plateau avec la meme regle quand il faut le dire au joueur.
 */
export function aurasSur(B, k, u) {
  const out = [];
  for (const src of B[k].board) if (auraPorte(src, u, true)) out.push({ src, camp: k });
  for (const src of B[foe(k)].board) if (auraPorte(src, u, false)) out.push({ src, camp: foe(k) });
  return out;
}

/**
 * Recalcule les valeurs derivees de toutes les unites a partir de leurs valeurs de
 * base et des auras presentes sur le plateau. A appeler apres tout changement.
 */
function refresh(B) {
  for (const k of ['p', 'e']) {
    const mine = B[k].board, theirs = B[foe(k)].board;
    for (const u of mine) {
      let bAtk = 0, bHp = 0;
      const bKeys = [];
      const take = src => {
        bAtk += src.aura.atk || 0;
        bHp += src.aura.hp || 0;
        if (src.aura.key) bKeys.push(src.aura.key);
      };
      for (const src of mine) if (auraPorte(src, u, true)) take(src);
      for (const src of theirs) if (auraPorte(src, u, false)) take(src);
      // Socle : ce que la carte annonce, ou le compteur quand la caracteristique varie.
      let socleAtk = u.baseAtk, socleHp = u.baseHp;
      const varia = variableDe(u);
      if (varia) {
        const x = counterValue(varia.src, B, k, u, varia.arg);
        // Les renforts encaisses depuis l'arrivee restent acquis : x + ce qui a ete gagne.
        if (varia.stat === 'atk' || varia.stat === 'both') socleAtk = x + (u.baseAtk - u.printedAtk);
        if (varia.stat === 'hp' || varia.stat === 'both') socleHp = x + (u.baseHp - u.printedHp);
        u.variable = { ...varia, x };
      }
      u.atk = Math.max(0, socleAtk + bAtk);
      u.maxHp = socleHp + bHp;
      u.hp = u.maxHp - u.damage;
      u.keys = [...new Set([...u.baseKeys, ...bKeys])];
      u.types = typesOf(u);
      // Une aura peut donner Charge : l'unite doit alors pouvoir frapper tout de suite.
      if (hasKey(u.keys, 'Charge') && B.turn === k && !u.attackedThisTurn) u.canAttack = true;
    }
  }
}

// ------------------------------------------------------------------- degats
function damageHero(B, k, v) {
  const s = B[k];
  // Un effet statique peut adoucir ou aggraver chaque perte de PV. Ca se joue AVANT
  // l'armure : l'armure encaisse ce qui arrive vraiment jusqu'au heros.
  v = Math.max(0, v + staticTotal(B, k, 'degats_du_heros'));
  if (v <= 0) return;
  if (s.armor > 0) {
    const used = Math.min(s.armor, v);
    s.armor -= used;
    v -= used;
  }
  if (v > 0) s.hp -= v;
  checkOver(B);
  if (v > 0) fireEvent(B, k, 'heroHurt');
}

/** Inflige des degats a une unite. Ne retire personne du plateau : resolveDeaths s'en charge. */
function damageUnit(B, k, u, v, source) {
  if (v <= 0) return;
  if (u.shield) { u.shield = false; say(B, `${u.name} encaisse avec son bouclier.`); return; }
  u.damage += v;
  if (source && source !== u && hasKey(source.keys, 'Venin')) {
    u.damage = u.maxHp;
    say(B, `${u.name} succombe au venin.`);
  }
  u.hp = u.maxHp - u.damage;
}

/**
 * Retire les unites mortes et declenche leur rale d'agonie. Boucle tant que ces rales
 * (ou la disparition d'une aura) en tuent d'autres, avec un garde-fou.
 */
function resolveDeaths(B, depth = 0) {
  refresh(B);
  const dead = [];
  for (const k of ['p', 'e']) {
    const s = B[k];
    for (const u of s.board) if (u.hp <= 0) dead.push({ k, u });
    s.board = s.board.filter(u => u.hp > 0);
  }
  if (!dead.length) return;

  for (const { k, u } of dead) {
    say(B, `${u.name} est mis hors de combat.`);
    // La carte rejoint la defausse maintenant : un jeton, lui, n'en a pas et disparait.
    // « Tes allies qui meurent retournent dans ta pioche » la detourne vers le deck.
    // Le porteur qui meurt ne s'applique pas a lui-meme : il a deja quitte le plateau
    // juste au-dessus, et un statique s'arrete avec son porteur — c'est sa promesse.
    if (u.card) {
      // Chez SON proprietaire : une unite volee retourne dans la defausse de celui a
      // qui elle appartient, pas dans celle de qui la controlait.
      const chez = proprio(u, k);
      if (staticTotal(B, chez, 'cartes_jouees_remelangees', m => m.quoi !== 'sorts') > 0) melangeDedans(B, chez, [u.card]);
      else B[chez].discard.push(u.card);
    }
    if (u.death && u.death.length && !B.over) {
      B.fired.death = (B.fired.death || 0) + 1;
      say(B, `Rale d'agonie de ${u.name}.`);
      applyEffects(B, k, u.death, autoTarget(B, k, u.death, u), u);
    }
    fireEvent(B, k, 'unitDies');
  }
  if (depth < 8 && !B.over) resolveDeaths(B, depth + 1);
}

/**
 * Ce camp peut-il encore faire QUOI QUE CE SOIT, maintenant ou a son prochain tour ?
 * On regarde large exprès : une carte payable un jour (son cout tient dans son mana
 * maximum) compte, meme s'il n'a pas le mana tout de suite. Sinon on arreterait une
 * partie encore vivante.
 */
function peutAgir(B, k) {
  const s = B[k];
  if (s.deck.length) return true;                       // il piochera encore
  // Une pile de fatigue non vide se repioche a l'infini : ce camp aura toujours
  // quelque chose a tirer (le plafond du tour ne vaut que pour le tour en cours).
  if (fatiguePile().length) return true;
  if (s.board.some(u => u.atk > 0)) return true;        // il a de quoi frapper
  return s.hand.some(c => cardCost(c, B, k) <= s.manaCap);
}

/**
 * Fin de partie aux points de vie : le plus haut total l'emporte, egalite = match nul.
 * Cote joueur, l'UI compte le match nul comme une defaite (c'est la regle du jeu).
 */
function finParPv(B, raison) {
  B.over = true;
  B.winner = B.p.hp === B.e.hp ? 'draw' : (B.p.hp > B.e.hp ? 'p' : 'e');
  say(B, `${raison} : ` + (B.winner === 'draw'
    ? `egalite a ${B.p.hp} PV, match nul.`
    : `${B[B.winner].name} l'emporte aux PV (${B.p.hp} contre ${B.e.hp}).`));
}

function checkOver(B) {
  if (B.over) return;
  if (B.p.hp <= 0 || B.e.hp <= 0) {
    B.over = true;
    B.winner = B.e.hp <= 0 && B.p.hp > 0 ? 'p' : B.p.hp <= 0 && B.e.hp > 0 ? 'e' : 'draw';
    say(B, B.winner === 'p' ? 'Victoire !' : B.winner === 'e' ? 'Defaite...' : 'Match nul.');
  }
}

// -------------------------------------------------------------------- tours
function fireTrigger(B, k, slot, label) {
  // On fige la liste : une unite qui meurt pendant la sequence ne doit pas la casser.
  for (const u of [...B[k].board]) {
    if (B.over) return;
    if (!u[slot] || !u[slot].length) continue;
    if (!B[k].board.includes(u)) continue;   // deja morte entre-temps
    B.fired[slot] = (B.fired[slot] || 0) + 1;
    say(B, `${label} — ${u.name}.`);
    applyEffects(B, k, u[slot], autoTarget(B, k, u[slot], u), u);
    resolveDeaths(B);
  }
}

/**
 * Un EVENEMENT vient de se produire du cote `acteur`. Toutes les unites en jeu qui
 * l'ecoutent declenchent leurs effets — celles du camp de l'acteur par « quand tu... »,
 * celles d'en face par « quand l'adversaire... », et tout le monde par « n'importe qui ».
 *
 * On NE ramasse PAS les morts ici : c'est le flux normal (fin de carte, fin d'attaque,
 * debut de tour) qui s'en charge, comme pour les autres effets. Ca evite de retirer une
 * unite du plateau au milieu d'une liste qu'on est en train de parcourir.
 *
 * Le garde-fou est indispensable : « quand tu pioches, pioche » se rappellerait sans
 * fin. Au-dela de quelques rebonds on coupe, et on le dit dans le journal plutot que
 * de laisser le combat se figer.
 */
/**
 * LA GARDE D'UN MOMENT : « oui, mais seulement si le sujet est... ». Sans garde, le
 * moment part toujours — c'est le cas de toutes les cartes ecrites jusqu'ici. Avec une
 * garde et sans sujet a regarder, il ne part pas : la condition ne peut pas etre vraie.
 */
function gardePasse(u, slot, sujets) {
  const g = (u.gardes || {})[slot];
  const id = keyId(g);
  if (!g || id === 'tous' || !EVENT_GARDES[id]) return true;
  const vus = sujets || [];
  if (!vus.length) return false;
  if (id === 'moi') return vus.includes(u);
  if (id === 'type') return vus.some(x => estDuType(x, keyArg(g)));
  if (id === 'memeType') return vus.some(x => partageType(u, x));
  return true;
}

function fireEvent(B, acteur, ev, sujets = null) {
  if (B.over) return;
  if (B.eventDepth >= 4) {
    say(B, 'La chaine de declenchements est coupee (trop de rebonds).');
    return;
  }
  B.eventDepth++;
  try {
    for (const k of ['p', 'e']) {
      const qui = k === acteur ? 'self' : 'foe';
      for (const slot of [eventSlot(ev, qui), eventSlot(ev, 'any')]) {
        // LE SUJET SERT A DEUX CHOSES, et il ne faut pas les confondre :
        //   - il dit qui est « Lui » pour les effets du moment (tous les evenements
        //     qui en ont un : l'allie qu'on pose, l'unite qui attaque) ;
        //   - il RESTREINT l'ecoute au seul sujet, mais pour le renfort seulement
        //     (« quand CETTE unite recoit du renfort »), d'ou `ecouteLeSujet`.
        // Sans cette distinction, « quand tu joues un allie » ne serait entendu que
        // par l'allie qu'on vient de poser — c'est-a-dire par personne d'utile.
        const ecoutent = sujets && (EVENTS[ev] || {}).ecouteLeSujet && slot === eventSlot(ev, 'self')
          ? B[k].board.filter(u => sujets.includes(u))
          : B[k].board;
        // On fige la liste : une unite qui meurt pendant la sequence ne la casse pas.
        // LE SUJET DE L'EVENEMENT EST « LUI » : l'allie qu'on vient de poser, l'unite
        // qui vient d'attaquer, celle qui vient d'etre renforcee. Il est toujours du
        // cote de l'acteur — c'est lui qui a provoque l'evenement.
        const depart = (sujets || []).filter(u => B[acteur].board.includes(u))
          .map(u => ({ kind: 'unit', side: acteur, unit: u }));
        for (const u of [...ecoutent]) {
          if (B.over) return;
          if (!u[slot] || !u[slot].length) continue;
          if (!B[k].board.includes(u)) continue;   // deja partie entre-temps
          if (!gardePasse(u, slot, sujets)) continue;   // « seulement si... »
          B.fired[slot] = (B.fired[slot] || 0) + 1;
          say(B, `${TRIGGERS[slot].label} — ${u.name}.`);
          applyEffects(B, k, u[slot], autoTarget(B, k, u[slot], u), u, null, depart);
        }
      }
    }
  } finally {
    B.eventDepth--;
  }
}

export function beginTurn(B) {
  if (B.over) return;
  const k = B.turn;
  const s = B[k];
  B.turnNo++;
  // Le combat ne peut pas durer indefiniment : voir BALANCE.combat.maxTurns.
  if (B.turnNo > BALANCE.combat.maxTurns) { finParPv(B, `le combat s'eternise (${BALANCE.combat.maxTurns} tours)`); return; }
  s.turns++;
  s.maxMana = Math.min(s.maxMana + 1, s.manaCap);
  s.mana = s.maxMana;
  s.tempMana = 0;
  s.spellsTurn = 0;
  s.recycle = 0;
  s.fatigue = 0;
  s.jouees = 0;
  s.attaques = 0;
  s.piochees = 0;
  s.plafondPioche = false;
  // Mana statique (« +1 mana par tour tant que je suis la »). Comme le mana promis,
  // il n'est pas plafonne par le mana max : c'est ce que la carte annonce.
  const manaStatique = staticTotal(B, k, 'mana_du_tour');
  if (manaStatique) {
    s.mana = Math.max(0, s.mana + manaStatique);
    say(B, `${s.name} ${manaStatique > 0 ? 'gagne' : 'perd'} ${Math.abs(manaStatique)} mana (effet statique).`);
  }
  if (s.nextMana) {
    // Volontairement au-dessus du mana max : c'est ce que promet l'effet.
    s.mana += s.nextMana;
    say(B, `${s.name} recupere ${s.nextMana} mana promis au tour precedent.`);
    s.nextMana = 0;
  }
  for (const u of s.board) { u.canAttack = true; u.attackedThisTurn = false; }
  // Les deux premiers tours partent de la main de depart. Un effet statique peut faire
  // piocher plus (ou plus rien du tout) : il ne touche que CETTE pioche-la, pas celles
  // qu'une carte declenche.
  if (B.turnNo > 2) draw(B, k, Math.max(0, 1 + staticTotal(B, k, 'pioche_du_tour')));
  // Une caracteristique variable suit un compteur qui bouge SANS qu'aucune carte ne
  // soit jouee : le tour qui avance, la main qui se remplit. Les auras n'avaient pas
  // ce probleme (le plateau ne change qu'en jouant), donc rien ne recalculait ici.
  // resolveDeaths commence par un refresh, et ramasse l'unite dont la vie variable
  // vient de tomber a zero — rale d'agonie compris.
  resolveDeaths(B);
  if (B.over) return;
  // Plus personne ne peut rien faire (plus de pioche, rien de jouable, rien qui
  // frappe) : inutile de tourner dans le vide, on tranche aux PV.
  if (!peutAgir(B, 'p') && !peutAgir(B, 'e')) { finParPv(B, 'plus personne ne peut jouer'); return; }
  say(B, `— Tour de ${s.name} (${s.mana} mana) —`);
  fireTrigger(B, k, 'turnStart', 'Debut de tour');
}

export function endTurn(B) {
  if (B.over) return;
  fireTrigger(B, B.turn, 'turnEnd', 'Fin de tour');
  if (B.over) return;
  B.turn = foe(B.turn);
  beginTurn(B);
}

// ------------------------------------------------------------------- ciblage
const isPick = t => !!(targetDef(t) && targetDef(t).pick);

/**
 * TOUTES les cibles que porte un effet. Longtemps il n'y en avait qu'une, `t`, et
 * elle etait lue en dur ; la Copie en a deux (qui devient la copie, et de quoi). On
 * demande donc au registre — et un effet qui gagnera une cible sera servi tout seul.
 * Un effet inventé dans le builder, qui n'a pas declare ses parametres, garde `t`.
 */
const ciblesDe = e => {
  const params = targetParams(e.op);
  return (params.length ? params.map(p => e[p.k]) : [e.t]).filter(Boolean);
};

/**
 * La carte demande-t-elle au joueur de CHOISIR une branche avant d'etre jouee ?
 * On regarde aussi dans les effets imbriques : un « Choisir » peut en cacher un autre.
 */
export function needsChoice(card) {
  let oui = false;
  for (const e of card.play || []) eachSubEffect(e, x => { if (x.op === 'choisir') oui = true; });
  return oui;
}

/**
 * LES CIBLES QU'UNE CARTE POSE VRAIMENT, branches comprises. Un « Choisir » cache ses
 * effets dans ses deux branches : sans descendre dedans, une carte dont tout le contenu
 * est dans un choix paraitrait n'avoir aucune cible — elle partirait sans rien viser.
 * `choix` restreint a la branche retenue quand elle est connue (le joueur repond avant
 * de designer) ; sans reponse, on prend les deux, ce qui donne la bonne question a
 * « cette carte est-elle jouable ? ».
 */
function ciblesDeLaCarte(card, choix) {
  const out = [];
  const descend = e => {
    if (e.op === 'choisir') {
      const branches = choix ? [e[choix]] : [e.a, e.b];
      for (const b of branches) for (const x of listeEffets(b)) descend(x);
      return;
    }
    out.push(...ciblesDe(e));
  };
  for (const e of card.play || []) descend(e);
  return out;
}

/** Une carte a-t-elle besoin que le joueur designe une cible avant d'etre jouee ? */
export function needsTarget(card, choix) {
  return ciblesDeLaCarte(card, choix).some(isPick);
}

export function legalTargets(B, k, card, choix) {
  const out = [];
  const me = B[k], them = B[foe(k)];
  for (const t of ciblesDeLaCarte(card, choix)) {
    // « Une unite, alliee ou adverse » : les deux plateaux sont designables.
    if (t === 'anyUnit') {
      out.push(...me.board.map(u => ({ side: k, uid: u.uid })));
      out.push(...them.board.map(u => ({ side: foe(k), uid: u.uid })));
    } else if (t === 'enemyUnit') out.push(...them.board.map(u => ({ side: foe(k), uid: u.uid })));
    else if (t === 'enemyAny') {
      out.push(...them.board.map(u => ({ side: foe(k), uid: u.uid })));
      out.push({ side: foe(k), uid: 'hero' });
    } else if (t === 'allyUnit') out.push(...me.board.map(u => ({ side: k, uid: u.uid })));
  }
  // dedoublonne
  return out.filter((t, i) => out.findIndex(o => o.side === t.side && o.uid === t.uid) === i);
}

/**
 * Un rale d'agonie ou un declencheur de tour part tout seul : personne n'est la pour
 * choisir une cible. On en designe une raisonnable ici plutot que d'appeler l'IA,
 * qui depend deja du moteur (on eviterait un import circulaire).
 * Seules les cibles `pick` sont concernees : les autres se resolvent d'elles-memes.
 */
/**
 * L'effet fait-il du mal ? Sert quand personne n'est la pour designer une cible « une
 * unite, alliee ou adverse » : ce qui blesse part en face, le reste va chez soi.
 * Un renfort negatif est un affaiblissement — c'est le signe qui tranche, pas l'effet.
 */
const estHostile = e => e.op === 'dmg' || e.op === 'detruit'
  || (e.op === 'buff' && ((e.atk || 0) < 0 || (e.hp || 0) < 0));

function autoTarget(B, k, effects, source) {
  const me = B[k], them = B[foe(k)];
  for (const brut of effects) {
    const e = resolveAmounts(B, k, source, brut);
    for (const t0 of ciblesDe(e)) {
      if (!isPick(t0)) continue;
      // Une cible sans camp n'en designe pas moins UNE unite : on tranche le cote par
      // la nature de l'effet, puis on retombe sur les choix habituels.
      const t = t0 === 'anyUnit' ? (estHostile(e) ? 'enemyUnit' : 'allyUnit') : t0;
      if (t === 'enemyUnit' || t === 'enemyAny') {
        // Une destruction n'a pas de seuil de PV : n'importe quelle unite tombe, on
        // prend donc la plus genante au lieu de la plus entamee.
        const mortelles = e.op === 'detruit' ? [...them.board] : them.board.filter(u => u.hp <= (e.v || 0));
        const kill = mortelles.sort((a, b) => b.atk - a.atk)[0];
        if (kill) return { side: foe(k), uid: kill.uid };
        if (t === 'enemyAny') return { side: foe(k), uid: 'hero' };
        const weakest = [...them.board].sort((a, b) => a.hp - b.hp)[0];
        return weakest ? { side: foe(k), uid: weakest.uid } : null;
      }
      if (t === 'allyUnit') {
        const best = [...me.board].sort((a, b) => b.atk - a.atk)[0];
        if (best) return { side: k, uid: best.uid };
      }
    }
  }
  return null;
}

function findUnit(B, ref) {
  if (!ref || ref.uid === 'hero') return null;
  return B[ref.side].board.find(u => u.uid === ref.uid) || null;
}

const pickOne = list => (list.length ? list[Math.floor(Math.random() * list.length)] : null);

/** Compare deux noms de carte sans se faire avoir par les accents ni les majuscules. */
const normalise = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

/**
 * Traduit une cible en destinataires concrets : des unites et/ou un heros.
 * Tout le ciblage passe par ici, donc ajouter une cible au registre ne demande
 * qu'un `case` de plus, jamais de retoucher les effets un par un.
 */
function recipients(B, k, t, target, source, last) {
  const me = B[k], them = B[foe(k)];
  const unit = (side, u) => ({ kind: 'unit', side, unit: u });
  const hero = side => ({ kind: 'hero', side });

  switch (targetId(t)) {
    case 'previous':
      // « Lui » : les destinataires du precedent effet de la meme sequence. Les morts
      // ne sont ramassees qu'a la fin de la carte, donc une unite mise a 0 PV par
      // l'effet d'avant est encore la — c'est ce qui permet « inflige 3, puis rend 5 ».
      // Le filtre ne sert qu'a ecarter celles qui ont VRAIMENT quitte le plateau.
      return (last || []).filter(r => r.kind === 'hero' || B[r.side].board.includes(r.unit));
    case 'enemyHero': return [hero(foe(k))];
    case 'ownHero': return [hero(k)];
    case 'allEnemyUnits': return them.board.map(u => unit(foe(k), u));
    case 'allAllies': return me.board.filter(u => u !== source).map(u => unit(k, u));
    case 'randomAllyUnit': { const u = pickOne(me.board); return u ? [unit(k, u)] : []; }
    case 'randomEnemyUnit': { const u = pickOne(them.board); return u ? [unit(foe(k), u)] : []; }
    case 'randomEnemyAny': {
      const pool = [...them.board.map(u => unit(foe(k), u)), hero(foe(k))];
      return [pickOne(pool)];
    }
    case 'randomAllyAny': {
      const pool = [...me.board.map(u => unit(k, u)), hero(k)];
      return [pickOne(pool)];
    }
    case 'sameTypeAllies': {
      // Comme `allAllies` : le porteur ne se compte pas lui-meme.
      if (!source || !source.uid || !me.board.includes(source)) return [];
      return me.board.filter(u => u !== source && partageType(source, u)).map(u => unit(k, u));
    }
    case 'allyType': {
      // Le type est ecrit dans la cible : aucun besoin de porteur, un sort y a droit.
      const voulu = targetArg(t);
      return voulu ? me.board.filter(u => estDuType(u, voulu)).map(u => unit(k, u)) : [];
    }
    case 'enemyType': {
      const voulu = targetArg(t);
      return voulu ? them.board.filter(u => estDuType(u, voulu)).map(u => unit(foe(k), u)) : [];
    }
    case 'self':
      // Un sort n'est "lui-meme" de rien : la source doit etre une unite en jeu.
      return source && source.uid && me.board.includes(source) ? [unit(k, source)] : [];
    // LES CIBLES SANS CAMP. `anyUnit` est designee par le joueur : elle tombe dans le
    // `default` avec les autres cibles pointees, qui lit deja le cote dans `target`.
    case 'allUnits':
      // « Toutes » veut dire toutes : le porteur n'est pas epargne, contrairement a
      // « Tous tes allies ».
      return [...me.board.map(u => unit(k, u)), ...them.board.map(u => unit(foe(k), u))];
    case 'randomUnit': {
      const pool = [...me.board.map(u => unit(k, u)), ...them.board.map(u => unit(foe(k), u))];
      const r = pickOne(pool);
      return r ? [r] : [];
    }
    case 'anyType': {
      const voulu = targetArg(t);
      if (!voulu) return [];
      return [...me.board.filter(u => estDuType(u, voulu)).map(u => unit(k, u)),
        ...them.board.filter(u => estDuType(u, voulu)).map(u => unit(foe(k), u))];
    }
    case 'previousType': {
      // Le type vient de « Lui » : on repete l'effet sur ses semblables, du meme cote
      // que lui, sans le reprendre — il vient de le recevoir. Une unite sans etiquette
      // ne partage rien avec personne : la chaine s'arrete d'elle-meme.
      const bases = (last || []).filter(r => r.kind === 'unit');
      const out = [];
      for (const r of bases) {
        for (const u of B[r.side].board) {
          if (bases.some(b => b.unit === u) || out.some(o => o.unit === u)) continue;
          if (partageType(r.unit, u)) out.push(unit(r.side, u));
        }
      }
      return out;
    }
    default: {
      // CIBLES DESIGNEES par le joueur (ou par autoTarget). Une cible qui NOMME un camp
      // ne se laisse pas designer de l'autre cote : « un de tes allies » ne renforce pas
      // une unite d'en face parce que le joueur a pointe celle-la. Ca n'arrive qu'avec
      // deux cibles a designer sur la meme carte — elles recoivent forcement la meme
      // reponse, et la validation le signale.
      const attendu = t === 'allyUnit' ? k : (t === 'enemyUnit' || t === 'enemyAny') ? foe(k) : null;
      const bonCote = target && (!attendu || target.side === attendu);
      const u = findUnit(B, target);
      if (u && bonCote) return [unit(target.side, u)];
      if (bonCote && target.uid === 'hero') return [hero(target.side)];
      // Sans cible utilisable, seul 'enemyAny' sait retomber sur le heros adverse.
      return t === 'enemyAny' ? [hero(foe(k))] : [];
    }
  }
}

const nameOf = (B, r) => (r.kind === 'hero' ? B[r.side].name : r.unit.name);

// ------------------------------------------------------------------- effets
/**
 * Rend une copie de l'effet ou chaque nombre est un VRAI nombre : un montant variable
 * (« X = tes allies Chien ») est calcule ici, au moment ou l'effet part. C'est le seul
 * endroit qui le fait — le reste du moteur ne voit que des nombres, comme avant.
 * La liste des champs a resoudre vient du registre : un effet qui gagne un parametre
 * numerique en profite sans qu'on touche a cette fonction.
 */
/**
 * LE TYPE QU'UN FILTRE VISE, quand il ne le porte pas ecrit mais le LIT sur une carte :
 * « du type d'une carte de ta main », « d'une unite en jeu chez l'adversaire ». On tire
 * au sort parmi les etiquettes presentes dans la zone visee — une carte qui en porte
 * deux compte deux fois, une carte « Type : tous » n'en nomme aucune et n'en fournit
 * donc pas. Rien a lire : le type reste vide, et le filtre ne prendra rien.
 */
function typeLu(B, k, e) {
  const camps = e.typeQui === 'adversaire' ? [foe(k)] : e.typeQui === 'deux' ? [k, foe(k)] : [k];
  const etiquettes = [];
  for (const camp of camps) {
    const s = B[camp];
    const ou = e.typeDe === 'plateau' ? s.board : e.typeDe === 'main' ? s.hand
      : e.typeDe === 'pioche' ? s.deck : s.discard;
    for (const x of ou) etiquettes.push(...typesOf(x));
  }
  return etiquettes.length ? etiquettes[Math.floor(Math.random() * etiquettes.length)] : '';
}

function resolveAmounts(B, k, u, e) {
  const champs = numberParams(e.op);
  // Un type lu sur une carte se resout ici, au meme endroit et pour la meme raison
  // qu'un montant variable : apres, tout le moteur ne voit qu'un type ordinaire.
  if (typeVariable(e)) {
    const copie = { ...e, argType: typeLu(B, k, e) };
    return champs.length ? resolveAmounts(B, k, u, { ...copie, typeDe: 'ecrit' }) : copie;
  }
  if (!champs.length) return e;
  // Un effet statique « tes degats infligent 1 de plus » s'ajoute a chaque nombre de
  // l'effet vise, exactement comme un palier « Amplifie » — mais seulement tant que
  // son porteur tient le plateau.
  const bonus = staticTotal(B, k, 'montant_des_effets', m => m.cible === e.op);
  let copie = null;
  for (const p of champs) {
    if (e[p.k] === undefined) continue;
    if (typeof e[p.k] === 'number' && !bonus) continue;
    copie = copie || { ...e };
    copie[p.k] = Math.max(0, amountValue(e[p.k], B, k, u) + bonus);
  }
  return copie || e;
}

/**
 * `choix` = la branche que le joueur a designee pour les effets « Choisir » de cette
 * carte ('a' ou 'b'). Une seule reponse pour toute la carte : le joueur ne choisit
 * qu'une fois, comme il ne designe qu'une cible. Sans reponse (rale d'agonie,
 * declencheur de tour), c'est la premiere branche qui part.
 * Rend les destinataires du dernier effet, pour que « Choisir » puisse les rendre a
 * son tour et que « Lui » traverse une branche.
 */
function applyEffects(B, k, effects, target, source, choix, depart) {
  const me = B[k], them = B[foe(k)];
  // Ce que le dernier effet a vise ou cree, pour la cible « Lui ». Les effets sans
  // destinataire (pioche, armure, mana) ne l'ecrasent pas : ils ne coupent pas la chaine.
  // `depart` amorce la chaine : un evenement a un SUJET (l'allie qu'on vient de poser,
  // l'unite qui vient d'attaquer), et c'est « Lui » pour le premier effet du moment.
  let last = depart || [];
  const cible = (t) => recipients(B, k, t, target, source, last);
  for (const brut of effects) {
    const e = resolveAmounts(B, k, source, brut);
    switch (e.op) {
      case 'dmg': {
        const cibles = cible(e.t);
        if (!cibles.length) { say(B, 'Aucune cible a viser.'); break; }
        last = cibles;
        for (const r of cibles) {
          say(B, `${e.v} degats a ${nameOf(B, r)}.`);
          if (r.kind === 'hero') damageHero(B, r.side, e.v);
          else damageUnit(B, r.side, r.unit, e.v, source);
        }
        break;
      }
      case 'detruit': {
        // On ne retire personne du plateau ici : on marque la mort (comme le Venin) et
        // resolveDeaths ramasse, ce qui declenche les rales d'agonie. Le Bouclier ne
        // protege pas — il absorbe une perte de PV, pas une destruction. Un heros dans
        // la liste (via « Lui » ou une cible au hasard) est simplement ignore.
        const cibles = cible(e.t);
        if (!cibles.length) { say(B, 'Aucune cible a detruire.'); break; }
        last = cibles;
        for (const r of cibles) {
          if (r.kind !== 'unit') continue;
          r.unit.damage = r.unit.maxHp;
          r.unit.hp = 0;
          say(B, `${r.unit.name} est detruit.`);
        }
        break;
      }
      case 'heal': {
        // On soigne en effacant des degats, jamais en gonflant les PV au-dela du max.
        const soignes = cible(e.t);
        if (soignes.length) last = soignes;
        for (const r of soignes) {
          if (r.kind === 'hero') {
            const s = B[r.side];
            s.hp = Math.min(s.maxHp, s.hp + e.v);
            say(B, `${s.name} recupere ${e.v} PV.`);
          } else {
            r.unit.damage = Math.max(0, r.unit.damage - e.v);
            say(B, `${r.unit.name} recupere ${e.v} PV.`);
          }
        }
        break;
      }
      case 'buff': {
        const recus = cible(e.t).filter(r => r.kind === 'unit');
        if (recus.length) last = recus;
        const list = recus.map(r => r.unit);
        for (const u of list) {
          u.baseAtk += e.atk || 0;
          u.baseHp += e.hp || 0;
          if (e.key && !u.baseKeys.includes(e.key)) {
            u.baseKeys.push(e.key);
            if (e.key === 'Charge' && !u.attackedThisTurn) u.canAttack = true;
          }
        }
        const dit = v => ((v || 0) < 0 ? '' : '+') + (v || 0);
        if (list.length) say(B, `${(e.atk || 0) < 0 || (e.hp || 0) < 0 ? 'Affaiblissement' : 'Renfort'} : `
          + `${dit(e.atk)}/${dit(e.hp)} (${list.map(u => u.name).join(', ')}).`);
        // « QUAND CETTE UNITE RECOIT DU RENFORT » : le moment est porte par l'unite
        // renforcee, pas par son camp — d'ou la liste d'unites passee a `fireEvent`.
        // On part camp par camp parce qu'un renfort peut tomber en face, par « Lui ».
        // Un renfort qui n'offre qu'un mot-cle (+0/+0) n'en est pas un : rien ne part.
        //
        // UNE FOIS PAR PILE. `renfortEnCours` est indispensable : sans lui, « quand cette
        // unite recoit du renfort, +1/+1 sur elle-meme » se redonnerait du renfort a
        // chaque rebond jusqu'au garde-fou de chaine. Un renfort donne PAR un declencheur
        // de renfort ne relance donc pas l'evenement, quelle qu'en soit la cible.
        // UN MALUS N'EST PAS UN RENFORT : « quand cette unite recoit du renfort » ne
        // part que sur un vrai gain. Un -2/-2 ne reveille personne.
        if (list.length && ((e.atk || 0) > 0 || (e.hp || 0) > 0) && !B.renfortEnCours) {
          B.renfortEnCours = true;
          try {
            for (const camp of [...new Set(recus.map(r => r.side))]) {
              fireEvent(B, camp, 'renfort', recus.filter(r => r.side === camp).map(r => r.unit));
            }
          } finally { B.renfortEnCours = false; }
        }
        break;
      }
      case 'draw': draw(B, k, e.v); break;
      case 'cree': {
        // La carte vient du CATALOGUE (cartes libres + cartes des personnages), pas du
        // deck : rien n'est retire nulle part, elle apparait, point.
        const combien = e.n === undefined ? 1 : e.n;
        const noms = [];
        for (let i = 0; i < combien; i++) {
          // Au hasard : un tirage par exemplaire, donc des cartes differentes.
          const modele = modeleCree(e);
          if (!modele) { say(B, `${rienDeTel(e)} : rien n'est cree.`); break; }
          if (me.hand.length >= BALANCE.combat.handMax) { say(B, 'Main pleine : la carte creee est perdue.'); break; }
          me.hand.push({ ...resolveCard(modele, e.lvl || 1), sprite: modele.sprite || (source ? source.sprite : null) });
          noms.push(modele.name);
        }
        if (noms.length) say(B, `${me.name} cree ${noms.length} × ${[...new Set(noms)].join(', ')}.`);
        break;
      }
      case 'renforce_les_cartes': {
        // On ne deplace rien : la carte reste ou elle est et grossit. Les cartes venues
        // de la pile de fatigue, elles, n'etaient nulle part — on les met dans le paquet
        // vise, deja renforcees, sinon le renfort tomberait dans le vide.
        const { camp, pile } = paquetDe(B, k, e);
        const cartes = choisitDansPaquet(B, k, e, pile, camp);
        if (!cartes.length) { say(B, 'Aucune carte a renforcer.'); break; }
        renforceCartes(B, cartes, e);
        for (const c of cartes) if (!pile.includes(c)) pile.push(c);
        break;
      }
      case 'melange_a_la_pioche':
      case 'renvoie_en_main':
      case 'pose_sur_le_plateau': {
        const vers = e.op === 'melange_a_la_pioche' ? 'pioche' : e.op === 'renvoie_en_main' ? 'main' : 'plateau';
        const pris = preleve(B, k, e, target, source, last);
        if (!pris.length) { say(B, 'Rien a deplacer.'); break; }
        renforceCartes(B, pris.map(x => x.carte), e);
        const arrivees = [];
        for (const { camp, carte } of pris) {
          const u = depose(B, camp, carte, vers);
          if (u) arrivees.push({ kind: 'unit', side: camp, unit: u });
        }
        // Les unites qui viennent d'arriver deviennent le « Lui » de l'effet suivant.
        if (arrivees.length) last = arrivees;
        const mot = vers === 'pioche' ? 'melangee(s) dans la pioche' : vers === 'main' ? 'renvoyee(s) en main' : 'posee(s) sur le plateau';
        say(B, `${pris.length} carte(s) ${mot} : ${pris.map(x => x.carte.name).join(', ')}.`);
        break;
      }
      case 'copie': {
        // DEUX questions, deux cibles : qui devient une copie (`t`), et de quoi (`tm`
        // ou le paquet). Le modele est lu une seule fois : « tous tes allies
        // deviennent une copie d'une carte de ta pioche », c'est la MEME carte pour
        // tous, pas un tirage par unite.
        const cibles = cible(e.t).filter(r => r.kind === 'unit');
        if (!cibles.length) { say(B, 'Aucune unite a transformer.'); break; }
        const modele = modeleACopier(B, k, e, target, source, last, cibles[0].side);
        if (!modele) { say(B, `Rien a copier (${describeModele(e)}).`); break; }
        // Un sort n'a ni attaque ni vie : une unite ne peut pas en devenir la copie.
        if (modele.type !== 'ally') { say(B, `${modele.name} est un sort : on ne peut pas en devenir la copie.`); break; }
        const avant = cibles.map(r => r.unit.name);
        for (const r of cibles) devientCopie(B, r.unit, modele);
        last = cibles;
        say(B, `${avant.join(', ')} devient ${modele.name} ${modele.atk || 0}/${modele.hp || 0}.`);
        break;
      }
      case 'switch': {
        const zone = ZONES[e.d_ou] || ZONES.plateau;
        if (zone.cible) {
          const cibles = cible(e.t).filter(r => r.kind === 'unit');
          if (!cibles.length) { say(B, 'Aucune unite a switcher.'); break; }
          const restees = [];
          for (const r of cibles) { const s = switcheUnite(B, k, r); if (s) restees.push(s); }
          if (restees.length) last = restees;
          break;
        }
        // Dans un paquet : on echange la carte SUR PLACE, et elle reste ainsi pour tout
        // le combat. Rien ne bouge de zone, donc rien ne se pioche ni ne se defausse.
        const { camp, pile } = paquetDe(B, k, e);
        const cartes = choisitDansPaquet(B, k, { ...e, fatigue: false }, pile, camp);
        if (!cartes.length) { say(B, 'Aucune carte a switcher.'); break; }
        const noms = [];
        for (const carte of cartes) {
          const face = autreFace(carte);
          const at = pile.indexOf(carte);
          if (!face || at < 0) { say(B, `${carte.name} n'a pas d'autre face.`); continue; }
          pile[at] = face;
          noms.push(`${carte.name} → ${face.name}`);
        }
        if (noms.length) say(B, `Switch : ${noms.join(', ')}.`);
        break;
      }
      case 'prendre_le_controle': {
        const cibles = cible(e.t).filter(r => r.kind === 'unit');
        if (!cibles.length) { say(B, 'Aucune unite a prendre.'); break; }
        const pris = [];
        for (const r of cibles) {
          if (r.side === k) { say(B, `${r.unit.name} est deja de ton cote.`); continue; }
          if (plateauPlein(me)) { say(B, `Le plateau de ${me.name} est plein : ${r.unit.name} reste ou elle est.`); continue; }
          // On la pose chez soi SANS la faire mourir ni la rejouer : « A la pose » ne
          // part pas, exactement comme pour une unite renvoyee sur le plateau.
          r.unit.owner = proprio(r.unit, r.side);
          B[r.side].board = B[r.side].board.filter(u => u !== r.unit);
          me.board.push(r.unit);
          // Elle vient d'arriver de ce cote-ci : elle n'attaque pas ce tour, sauf Charge.
          r.unit.canAttack = hasKey(r.unit.keys, 'Charge');
          r.unit.attackedThisTurn = false;
          pris.push({ kind: 'unit', side: k, unit: r.unit });
        }
        if (pris.length) {
          last = pris;
          say(B, `${me.name} prend le controle de ${pris.map(r => r.unit.name).join(', ')}.`);
        }
        break;
      }
      case 'choisir': {
        // UNE SEULE branche part, mais une branche est une LISTE : ses effets
        // s'enchainent comme sur un moment, « Lui » compris. Le joueur l'a designee en
        // jouant la carte ; le bot compare les deux ; sinon c'est la premiere.
        const branche = listeEffets(choix === 'b' ? e.b : e.a);
        if (!branche.length) { say(B, 'Ce choix ne propose rien.'); break; }
        say(B, `Choix : ${branche.map(describeEffect).join(', ')}.`);
        // Les destinataires de la branche deviennent ceux de « Choisir » : « Lui »
        // continue donc de fonctionner par-dessus.
        last = applyEffects(B, k, branche, target, source, choix) || last;
        break;
      }
      case 'pioche_x': {
        const cherche = normalise(e.carte);
        if (!cherche) { say(B, 'Aucune carte n\'est designee.'); break; }
        drawMatching(B, k, e.n === undefined ? 1 : e.n,
          c => normalise(c.name) === cherche || normalise(c.id) === cherche,
          `qui s'appelle « ${e.carte} »`);
        break;
      }
      case 'pioche_une_carte_de_type': {
        const sort = e.type === 'spell';
        drawMatching(B, k, e.n === undefined ? 1 : e.n,
          c => (c.type === 'ally') !== sort,
          sort ? 'de sort' : 'd\'allie');
        break;
      }
      case 'reduit_le_cout_de': {
        // Les cartes DEJA en main : celles qu'on piochera ensuite gardent leur cout.
        const touchees = me.hand.filter(c => cardMatches(c, e));
        for (const c of touchees) c.cost = Math.max(0, c.cost - e.v);
        say(B, touchees.length
          ? `${describeFilter(e)} : ${e.v} mana de moins (${touchees.map(c => c.name).join(', ')}).`
          : `Aucune carte a alleger dans ta main.`);
        break;
      }
      case 'armor': me.armor += e.v; say(B, `${me.name} gagne ${e.v} armure.`); break;
      case 'mana': me.mana += e.v; say(B, `+${e.v} mana.`); break;
      case 'mana_au_prochain_tour':
        me.nextMana += e.x || 0;
        say(B, `+${e.x || 0} mana au prochain tour.`);
        break;
      case 'summon': {
        // Le jeton porte tout ce que makeUnit sait lire : mots-cles, aura, moments.
        // Les jetons qui viennent d'arriver deviennent le « lui » de l'effet suivant.
        const arrives = [];
        for (let i = 0; i < (e.n || 1); i++) {
          if (plateauPlein(me)) break;
          // Un jeton herite du niveau de celui qui l'invoque : sans ca, « X = ton niveau »
          // vaudrait zero sur un jeton, ce que personne n'attend.
          const t = makeUnit({ ...e.unit, sprite: e.unit.sprite || (source ? source.sprite : null),
            ownerLevel: e.unit.ownerLevel || (source ? source.ownerLevel : 0) });
          me.board.push(t);
          arrives.push({ kind: 'unit', side: k, unit: t });
          checkKeywords(B, t);
        }
        if (arrives.length) last = arrives;
        say(B, arrives.length ? `${arrives.length} ${e.unit.name}(s) arrivent.` : 'Le plateau est plein : aucune invocation.');
        break;
      }
      default: {
        // Mecanique inventee dans le Card Builder et pas encore implementee ici.
        // On le dit dans le journal plutot que de faire semblant que la carte a marche.
        const def = ALL_EFFECTS[e.op];
        notePending(B, e.op, def ? def.label : e.op);
        break;
      }
    }
    refresh(B);
    checkOver(B);
    if (B.over) return last;
  }
  return last;
}

function notePending(B, id, label) {
  if (!B.pending.includes(id)) B.pending.push(id);
  say(B, `⚠ « ${label} » n'est pas encore codee — la carte n'a rien fait.`);
}

function checkKeywords(B, unit) {
  for (const k of unit.keys) {
    const id = keyId(k);
    if (ALL_KEYWORDS[id] && ALL_KEYWORDS[id].implemented) continue;
    notePending(B, id, (ALL_KEYWORDS[id] && ALL_KEYWORDS[id].label) || id);
  }
}

function makeUnit(c) {
  const keys = [...(c.keys || [])];
  const u = {
    uid: nextUid(),
    name: c.name,
    baseAtk: c.atk || 0,
    baseHp: c.hp || 0,
    // Ce que la carte annoncait en arrivant : sert a distinguer les renforts recus
    // en combat de la ligne de statistiques d'origine (cf. caracteristique variable).
    printedAtk: c.atk || 0,
    printedHp: c.hp || 0,
    // Le niveau auquel la carte a ete resolue, pour le compteur « niveau du heros ».
    ownerLevel: c.ownerLevel || 0,
    baseKeys: keys,
    damage: 0,
    sprite: c.sprite,
    shield: hasKey(keys, 'Bouclier'),
    canAttack: hasKey(keys, 'Charge'),
    attackedThisTurn: false,
    aura: c.aura && (c.aura.atk || c.aura.hp || c.aura.key) ? { ...c.aura } : null,
    // Les effets statiques suivent l'unite : ils agissent tant qu'elle est en jeu et
    // s'arretent avec elle, sans qu'on ait a les retirer de quoi que ce soit.
    statics: (c.statics || []).map(m => ({ ...m }))
  };
  // Les moments accroches a l'unite, copies depuis la carte. Generique : un moment
  // ajoute au registre est transporte sans toucher a cette fonction.
  for (const slot of Object.keys(TRIGGERS)) u[slot] = (c[slot] || []).map(e => ({ ...e }));
  // ... et leurs gardes (« seulement quand c'est un Chien qui attaque »).
  u.gardes = { ...(c.gardes || {}) };
  // Valeurs derivees, corrigees des le refresh() qui suit.
  u.atk = u.baseAtk;
  u.maxHp = u.baseHp;
  u.hp = u.baseHp;
  u.keys = [...keys];
  u.types = typesOf(u);
  return u;
}

// ---------------------------------------------------------------- jouer/attaquer
export function canPlay(B, k, card) {
  const s = B[k];
  // « Tu ne joues pas plus de X cartes par tour » : c'est bien une question de
  // JOUABILITE, donc elle se pose ici — le bot et l'interface la voient tous les deux.
  if (s.jouees >= staticMin(B, k, 'limite_de_cartes_jouees')) return false;
  if (s.mana < cardCost(card, B, k)) return false;
  if (card.type === 'ally' && plateauPlein(s)) return false;
  // UNE BRANCHE SUFFIT. Une carte « Choisir » dont un seul des deux choix trouve une
  // cible reste jouable : on prendra l'autre. Sans ce detour, « gagne 8 armure OU
  // inflige 1 degat a une unite adverse » deviendrait injouable des que le plateau
  // d'en face est vide, alors que la premiere branche n'attend personne.
  const viable = choix => !needsTarget(card, choix) || legalTargets(B, k, card, choix).length > 0
    // Un sort de degats sans cible d'unite peut toujours viser le heros adverse, et
    // une carte qui fait AUSSI autre chose (une cible qui se resout seule) part quand meme.
    || ciblesDeLaCarte(card, choix).some(t => t === 'enemyAny' || !isPick(t));
  return needsChoice(card) ? (viable('a') || viable('b')) : viable(null);
}

export function playCard(B, k, handIndex, target = null, choix = null) {
  const s = B[k];
  const card = s.hand[handIndex];
  if (!card || !canPlay(B, k, card)) return false;
  s.mana -= cardCost(card, B, k);
  s.jouees++;
  s.hand.splice(handIndex, 1);
  // UN ALLIE EN JEU N'EST PAS DANS LA DEFAUSSE : il est sur le plateau, et sa carte
  // voyage avec l'unite. Elle ne tombe a la defausse qu'a sa mort. Sans cette regle,
  // « reanime un allie de ta defausse » ressusciterait une unite encore vivante et
  // « renvoie en main » dupliquerait la carte.
  if (card.type !== 'ally') {
    // « Les cartes que tu joues retournent dans ta pioche » : un effet statique, donc
    // il vaut tant que son porteur tient le plateau. Le plafond de recyclage par tour
    // s'applique — c'est lui qui empeche « sort a 0 mana qui revient » de tourner.
    // Le sort part AVANT que ses effets se resolvent : un sort qui pioche peut donc se
    // retirer lui-meme. C'est la meme regle que pour la defausse, et c'est visible.
    if (staticTotal(B, k, 'cartes_jouees_remelangees', m => m.quoi !== 'allies') > 0) melangeDedans(B, k, [card]);
    else s.discard.push(card);
  }
  say(B, `${s.name} joue ${card.name}.`);

  let source = null;
  if (card.type === 'ally') {
    source = makeUnit(card);
    source.card = card;
    s.board.push(source);
    refresh(B);
    checkKeywords(B, source);
    if (source.aura) say(B, `Aura de ${source.name}.`);
    for (const m of source.statics) say(B, `${source.name} : ${describeStatic(m)}.`);
  }
  if (card.type !== 'ally') { s.spellsGame++; s.spellsTurn++; }
  if ((card.play || []).length) {
    B.fired.play = (B.fired.play || 0) + 1;
    applyEffects(B, k, card.play, target, source || card, choix);
  }
  refresh(B);
  resolveDeaths(B);
  // L'evenement part une fois la carte entierement resolue : « quand tu lances un
  // sort » se declenche apres l'effet du sort, pas au milieu.
  // L'allie qu'on vient de poser est le SUJET de l'evenement : « Lui », pour les
  // moments qui l'ecoutent.
  fireEvent(B, k, card.type === 'ally' ? 'ally' : 'spell', source ? [source] : null);
  resolveDeaths(B);
  return true;
}

/**
 * Une COPIE independante du combat, pour essayer un coup sans toucher a la vraie
 * partie (c'est ce dont le bot Monte-Carlo a besoin). Tout l'etat est du JSON — des
 * nombres, des chaines, des tableaux d'objets simples — donc structuredClone suffit.
 * `meta` (la rencontre, ses recompenses) n'est jamais modifie : on le partage.
 */
export function cloneBattle(B) {
  const { meta, ...reste } = B;
  const copie = structuredClone(reste);
  copie.meta = meta;
  return copie;
}

export function attackableTargets(B, k, unit) {
  // « Tu n'attaques pas avec plus de X unites par tour » : plus aucune cible legale
  // une fois le plafond atteint, donc le bot cesse de proposer des attaques.
  if (B[k].attaques >= staticMin(B, k, 'nombre_d_attaques')) return [];
  const them = B[foe(k)];
  // Elusif : invisible pour les attaques adverses (mais pas pour les sorts).
  const visibles = them.board.filter(u => !hasKey(u.keys, 'elusif'));
  // Passe-Murailles : les provocations ne l'arretent pas.
  const taunts = unit && hasKey(unit.keys, 'passe_murailles')
    ? [] : visibles.filter(u => hasKey(u.keys, 'Taunt'));
  if (taunts.length) return taunts.map(u => ({ side: foe(k), uid: u.uid }));
  return [...visibles.map(u => ({ side: foe(k), uid: u.uid })), { side: foe(k), uid: 'hero' }];
}

export function attack(B, k, unitUid, target) {
  const s = B[k], them = B[foe(k)];
  const a = s.board.find(u => u.uid === unitUid);
  if (!a || !a.canAttack || a.atk <= 0 || B.over) return false;
  const legal = attackableTargets(B, k, a);
  if (!legal.some(t => t.uid === target.uid)) return false;

  a.canAttack = false;
  a.attackedThisTurn = true;
  s.attaques++;
  if (target.uid === 'hero') {
    say(B, `${a.name} frappe ${them.name} pour ${a.atk}.`);
    damageHero(B, foe(k), a.atk);
  } else {
    const d = them.board.find(u => u.uid === target.uid);
    if (!d) return false;
    say(B, `${a.name} (${a.atk}/${a.hp}) attaque ${d.name} (${d.atk}/${d.hp}).`);
    // Les deux coups partent avant qu'on ne ramasse les morts : une unite tuee en
    // attaquant rend quand meme ses degats, et les deux rales se declenchent.
    const riposte = d.atk;
    damageUnit(B, foe(k), d, a.atk, a);
    if (riposte > 0) damageUnit(B, k, a, riposte, d);
  }
  resolveDeaths(B);
  // L'unite qui vient d'attaquer est le sujet : elle est « Lui » pour ce moment.
  fireEvent(B, k, 'attack', [a]);
  resolveDeaths(B);
  checkOver(B);
  return true;
}
