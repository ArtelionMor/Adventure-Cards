// REGISTRE DES MECANIQUES — source de verite unique de "est-ce que ca existe ?".
// Le moteur de combat les execute, le Card Builder les propose dans ses menus.
// Une mecanique inventee dans le builder arrive ici via CHARACTER_DATA.customMechanics
// avec implemented:false : le jeu la signale au lieu de l'ignorer en silence, et elle
// est listee dans docs/MECANIQUES-A-CODER.md pour etre codee.
import { CHARACTER_DATA } from '../../data/characters.data.js';

// CIBLES. `pick` = le joueur la designe au moment de jouer la carte ; les autres se
// resolvent toutes seules, ce qui les rend utilisables sur un rale d'agonie ou un
// declencheur de tour, ou personne n'est la pour choisir.
// `random` sert au bot : une cible tiree au sort vaut un peu moins qu'une cible choisie.
// `allyOnly` : n'a de sens que porte par une unite (un sort n'est "lui-meme" de rien).
export const TARGETS = {
  enemyAny: { label: 'Une cible adverse (unite ou heros)', pick: true },
  enemyUnit: { label: 'Une unite adverse', pick: true },
  enemyHero: { label: 'Le heros adverse', pick: false },
  allEnemyUnits: { label: 'Toutes les unites adverses', pick: false },
  randomEnemyAny: { label: 'Un ennemi au hasard (unite ou heros)', pick: false, random: true },
  randomEnemyUnit: { label: 'Une unite adverse au hasard', pick: false, random: true },
  ownHero: { label: 'Ton heros', pick: false },
  allyUnit: { label: 'Un de tes allies', pick: true },
  allAllies: { label: 'Tous tes allies (hors porteur de l’effet)', pick: false },
  randomAllyAny: { label: 'Un allie ou ton heros, au hasard', pick: false, random: true },
  randomAllyUnit: { label: 'Un de tes allies au hasard', pick: false, random: true },
  self: { label: 'Elle-meme', pick: false, allyOnly: true },
  // Lit le mot-cle « Type » du porteur : « Les allies Chien gagnent +1/+1 » se
  // dit avec cette cible, portee par un allie qui est lui-meme un Chien.
  sameTypeAllies: { label: 'Tes autres allies du meme type', pick: false, allyOnly: true },
  // « LUI » : de quoi enchainer deux effets sur la MEME chose sans la redesigner.
  // « Invoque un jeton, LUI inflige 6 blessures » — pas besoin de savoir de quel cote
  // il est tombe. Renvoie les destinataires du dernier effet qui en avait (pioche,
  // armure et mana n'en ont pas : ils ne cassent pas la chaine).
  previous: { label: 'Lui (ce que l’effet precedent a vise ou cree)', pick: false },
  // CIBLES A PARAMETRE. Le type est ecrit dans la cible elle-meme, « allyType:Chien »,
  // comme un mot-cle a parametre. Elles ne dependent pas du porteur : un sort peut
  // donc dire « les allies Chien gagnent +1/+1 ».
  allyType: {
    label: 'Tes allies d’un type',
    pick: false,
    params: [{ k: 'x', type: 'text', label: 'Type visé', def: 'Chien' }]
  },
  enemyType: {
    label: 'Les unites adverses d’un type',
    pick: false,
    params: [{ k: 'x', type: 'text', label: 'Type visé', def: 'Chien' }]
  }
};

// Une cible peut porter une valeur, ecrite « id:valeur » comme pour les mots-cles.
// Ne compare jamais `e.t` a la main quand la cible peut etre parametree : passe par
// `targetId`, et `TARGETS[targetId(t)]` pour retrouver sa definition.
export const targetId = t => String(t || '').split(':')[0];
export const targetArg = t => { const i = String(t || '').indexOf(':'); return i < 0 ? '' : String(t).slice(i + 1); };
export const targetDef = t => TARGETS[targetId(t)] || null;
/** Libelle lisible d'une cible : « Tes allies d'un type » → « Tes allies Chien ». */
export const targetLabel = t => {
  const def = targetDef(t);
  if (!def) return targetId(t);
  const arg = targetArg(t);
  return (def.params || []).length ? def.label.replace('d’un type', arg ? arg : '(type manquant)') : def.label;
};

const ENEMY_TARGETS = ['enemyAny', 'enemyUnit', 'enemyHero', 'allEnemyUnits', 'randomEnemyAny', 'randomEnemyUnit', 'enemyType'];
const ALLY_TARGETS = ['ownHero', 'allyUnit', 'allAllies', 'randomAllyAny', 'randomAllyUnit', 'self', 'sameTypeAllies', 'allyType'];

const num = (k, label, def = 1) => ({ k, type: 'number', label, def });
const tgt = (k, label, allow) => ({ k, type: 'target', label, allow });

// FILTRES DE CARTES — « quelles cartes de ta main ? ». Sert aux reductions de cout,
// et a tout ce qui voudra designer un paquet de cartes plus tard.
// Ajouter un filtre = une entree ici + son cas dans cardMatches().
// `label` nomme un paquet QUI EST A TOI (ta main, ta defausse) ; `tout` nomme le
// meme filtre applique au CATALOGUE du jeu, ou rien n'appartient a personne — c'est
// ce que lit « cree une carte au hasard ».
export const CARD_FILTERS = {
  all: { label: 'Toutes tes cartes', tout: 'N’importe quelle carte' },
  ally: { label: 'Tes allies', tout: 'N’importe quel allie' },
  spell: { label: 'Tes sorts', tout: 'N’importe quel sort' },
  ofType: { label: 'Tes cartes d’un type', tout: 'N’importe quelle carte d’un type', arg: 'type' },
  withKey: { label: 'Tes cartes avec un mot-cle', tout: 'N’importe quelle carte avec un mot-cle', arg: 'key' },
  // UNE CARTE PRECISE, designee par son identifiant comme dans un deck de PNJ. C'est
  // ce qui transforme « pose une carte de ta pioche » en « va chercher CELLE-LA ».
  // `precise` la retire des listes « au hasard » : tirer au sort parmi une seule carte
  // n'aurait aucun sens, et le champ « Quelle carte » est deja la juste au-dessus.
  oneCard: { label: 'Une carte précise', arg: 'card', precise: true }
};

// LES ZONES DU JEU — d'ou une carte peut venir, ou elle peut aller.
// « Melange dans la pioche », « Renvoie en main » et « Pose sur le plateau » sont le
// MEME geste : prendre des cartes quelque part, les mettre ailleurs. Une seule liste
// de zones, trois destinations ; ajouter une zone les sert toutes les trois.
export const ZONES = {
  defausse: { label: 'De la défausse' },
  main: { label: 'De la main' },
  pioche: { label: 'De la pioche' },
  // Le plateau ne se filtre pas comme un paquet : on DESIGNE des unites, avec une
  // cible ordinaire. Une unite renvoyee ne meurt pas — son rale ne part donc pas.
  plateau: { label: 'Du plateau (unités en jeu)', cible: true },
  creee: { label: 'Créées de toutes pièces', carte: true }
};

const ZONE_CIBLES = ['enemyUnit', 'allyUnit', 'allEnemyUnits', 'allAllies', 'randomEnemyUnit',
  'randomAllyUnit', 'self', 'sameTypeAllies', 'allyType', 'enemyType', 'previous'];

/**
 * « Lesquelles » : le filtre de cartes, plus le champ que le filtre reclame. `si` dit
 * quand ces trois champs ont un sens, `catalogue` s'ils designent le catalogue du jeu
 * (« n'importe quel allie ») plutot qu'un paquet a soi (« tes allies »).
 */
const paramsFiltre = (si = () => true, catalogue = false) => [
  {
    k: 'quoi', type: 'choice', label: 'Lesquelles', def: 'all',
    choices: Object.entries(CARD_FILTERS)
      .filter(([, d]) => !(catalogue && d.precise))
      .map(([id, d]) => [id, catalogue ? d.tout : d.label]),
    si
  },
  { k: 'argType', type: 'text', label: 'Type vise', def: '', si: e => si(e) && (CARD_FILTERS[e.quoi] || {}).arg === 'type' },
  { k: 'argKey', type: 'keyword', label: 'Mot-cle vise', si: e => si(e) && (CARD_FILTERS[e.quoi] || {}).arg === 'key' },
  { k: 'argCard', type: 'cardRef', label: 'Quelle carte', si: e => si(e) && (CARD_FILTERS[e.quoi] || {}).arg === 'card' }
];

/**
 * COMMENT on prend dans un paquet. Jusqu'ici c'etait toujours au hasard ; « du dessus »
 * rend « les 2 cartes du dessus de ta pioche » dicible — le dessus d'un paquet est la
 * FIN du tableau, c'est de la que `draw()` tire.
 */
const paramsOrdre = (si = () => true) => [
  {
    k: 'ordre', type: 'choice', label: 'Comment', def: 'hasard',
    choices: [['hasard', 'Au hasard'], ['dessus', 'Du dessus']],
    si
  }
];

/**
 * « Quelle carte fait-on apparaitre ? » — une carte PRECISE du catalogue, ou une
 * carte AU HASARD parmi celles qui passent un filtre (toutes, les allies, les sorts,
 * un type, un mot-cle). C'est le meme bloc pour « Cree une carte » et pour la zone
 * « Creees de toutes pieces » des trois deplacements : le hasard leur sert des deux.
 * Le tirage est refait a chaque exemplaire — 3 cartes au hasard, c'est 3 tirages.
 */
const paramsCarteCreee = (si = () => true) => [
  {
    k: 'choix', type: 'choice', label: 'Quelle carte', def: 'precise',
    choices: [['precise', 'Une carte precise'], ['hasard', 'Une carte au hasard']],
    si
  },
  { k: 'carte', type: 'cardRef', label: 'Carte créée', si: e => si(e) && (e.choix || 'precise') === 'precise' },
  ...paramsFiltre(e => si(e) && e.choix === 'hasard', true)
];

/** Les parametres communs aux trois deplacements : d'ou, lesquelles, combien. */
const paramsZone = (defautZone) => [
  {
    k: 'd_ou', type: 'choice', label: 'D’où viennent les cartes', def: defautZone,
    choices: Object.entries(ZONES).map(([id, d]) => [id, d.label])
  },
  ...paramsCarteCreee(({ d_ou }) => (ZONES[d_ou] || {}).carte),
  { k: 't', type: 'target', label: 'Quelles unités', allow: ZONE_CIBLES, si: ({ d_ou }) => (ZONES[d_ou] || {}).cible },
  {
    // Le plateau n'a pas besoin de ce champ : la cible dit deja de quel cote on prend.
    k: 'qui', type: 'choice', label: 'Chez qui', def: 'toi',
    choices: [['toi', 'Toi'], ['adversaire', 'L’adversaire']],
    si: ({ d_ou }) => !(ZONES[d_ou] || {}).cible
  },
  // Le meme filtre, mais sur un paquet a soi : les deux blocs ne s'affichent jamais
  // ensemble (l'un veut la zone des cartes creees, l'autre toutes les autres).
  ...paramsFiltre(({ d_ou }) => !(ZONES[d_ou] || {}).cible && !(ZONES[d_ou] || {}).carte),
  ...paramsOrdre(({ d_ou }) => !(ZONES[d_ou] || {}).cible && !(ZONES[d_ou] || {}).carte),
  { k: 'n', type: 'number', label: 'Combien', def: 1, si: ({ d_ou }) => !(ZONES[d_ou] || {}).cible },
  // « S'il en manque, on envoie des cartes de la pile de fatigue » : les cartes qui
  // manquent sont fabriquees comme a une pioche a vide (meme plafond par tour). Par
  // defaut non — sinon un paquet vide se mettrait a produire des cartes tout seul.
  {
    k: 'fatigue', type: 'bool', label: 'Compléter avec la pile de fatigue', def: false,
    si: ({ d_ou }) => !(ZONES[d_ou] || {}).cible && !(ZONES[d_ou] || {}).carte
  },
  // « ET LEUR DONNE +X/+Y ». Le renfort va aux cartes QU'ON VIENT DE DEPLACER : pas de
  // second filtre a regler, pas d'ambiguite sur qui en profite. Il s'ecrit sur la carte
  // et la suit donc jusqu'au plateau. Un sort n'a ni attaque ni vie : il passe sans rien.
  num('atk', 'Bonus d’attaque', 0),
  num('hp', 'Bonus de vie', 0)
];

// Effets jouables (champ `play` d'une carte).
export const EFFECTS = {
  dmg: {
    // Les degats peuvent viser ton propre camp : c'est un cout assume, pas un bug.
    label: 'Degats',
    desc: 'Inflige des degats a la cible.',
    params: [tgt('t', 'Cible', [...ENEMY_TARGETS, 'randomAllyAny', 'randomAllyUnit', 'self', 'previous']), num('v', 'Montant', 2)],
    implemented: true
  },
  detruit: {
    // Une destruction ne regarde pas les PV : elle marque l'unite comme morte, comme
    // le fait le Venin, et c'est resolveDeaths qui la ramasse — donc son rale d'agonie
    // part normalement. Le Bouclier n'arrete rien : il absorbe une PERTE DE PV, pas
    // une destruction. Le heros, lui, n'est jamais concerne.
    label: 'Destruction',
    desc: 'Detruit les unites visees, quel que soit leur nombre de PV. Ne touche pas les heros.',
    params: [tgt('t', 'Cible', ['enemyUnit', 'allEnemyUnits', 'randomEnemyUnit', 'enemyType',
      'allyUnit', 'allAllies', 'randomAllyUnit', 'self', 'sameTypeAllies', 'allyType', 'previous'])],
    implemented: true
  },
  heal: {
    label: 'Soin',
    desc: 'Rend des points de vie.',
    params: [tgt('t', 'Cible', [...ALLY_TARGETS, 'previous']), num('v', 'Montant', 4)],
    implemented: true
  },
  buff: {
    label: 'Renfort',
    desc: 'Augmente attaque/vie et peut donner un mot-cle.',
    params: [
      tgt('t', 'Cible', ['allyUnit', 'allAllies', 'randomAllyUnit', 'self', 'sameTypeAllies', 'allyType', 'previous']),
      num('atk', 'Attaque', 1), num('hp', 'Vie', 1),
      { k: 'key', type: 'keyword', label: 'Mot-cle offert (optionnel)' }
    ],
    implemented: true
  },
  draw: { label: 'Pioche', desc: 'Pioche des cartes.', params: [num('v', 'Cartes', 1)], implemented: true },
  armor: { label: 'Armure', desc: 'Ton heros gagne de l’armure, qui absorbe les degats avant les PV.', params: [num('v', 'Armure', 4)], implemented: true },
  mana: { label: 'Mana temporaire', desc: 'Donne du mana pour ce tour uniquement.', params: [num('v', 'Mana', 1)], implemented: true },
  mana_au_prochain_tour: {
    // Le mana rendu au prochain tour n'est PAS plafonne par le mana max : c'est le
    // seul moyen du jeu de depasser sa courbe de mana, et c'est voulu.
    label: 'Mana au prochain tour',
    desc: 'Donne X manas au prochain tour au joueur. (ce mana peut depasser la quantite de mana max du joueur)',
    params: [num('x', 'Valeur', 1)],
    implemented: true
  },
  pioche_x: {
    // Chercher une carte precise dans le deck. Le nom est celui de la carte : le
    // builder le propose dans une liste, justement pour qu'il ne soit jamais tape.
    label: 'Pioche une carte precise',
    desc: 'Cherche une carte par son nom dans ton deck et la met en main. Ne fouille pas la defausse.',
    params: [{ k: 'carte', type: 'cardName', label: 'Carte cherchee' }, num('n', 'Combien', 1)],
    implemented: true
  },
  cree: {
    // « Cree » n'est pas « pioche » : la carte n'a pas besoin d'etre dans le deck, elle
    // apparait en main. Ca ouvre le catalogue entier (cartes libres comprises) sans le
    // combo evident « je pioche le sort qui pioche », et ca marche encore quand le deck
    // est fini — ce qui, depuis que la defausse ne se remelange plus, arrive vraiment.
    label: 'Cree une carte',
    desc: 'Fait apparaitre une carte en main, prise dans tout le catalogue du jeu : une carte precise, ou une carte au hasard (n\'importe laquelle, ou parmi les allies, les sorts, un type, un mot-cle). Elle ne vient pas du deck : le deck n\'est pas touche.',
    params: [
      ...paramsCarteCreee(),
      num('n', 'Combien', 1),
      { k: 'lvl', type: 'number', label: 'Niveau de la carte', def: 1 }
    ],
    implemented: true
  },
  renforce_les_cartes: {
    // Le pendant du « et leur donne +X/+Y » des deplacements, mais SANS deplacer : la
    // carte reste ou elle est et grossit. C'est le seul moyen de renforcer un allie qui
    // n'est pas encore en jeu — `buff`, lui, ne connait que les unites du plateau.
    label: 'Renforce des cartes',
    desc: 'Donne +X/+Y a des cartes d\'un paquet (main, pioche, defausse), la ou elles sont. Le renfort est ecrit sur la carte : l\'unite arrivera deja grossie quand on la jouera. Un sort n\'a ni attaque ni vie et traverse sans rien recevoir.',
    params: [
      {
        k: 'd_ou', type: 'choice', label: 'Où', def: 'main',
        choices: Object.entries(ZONES).filter(([, d]) => !d.cible && !d.carte).map(([id, d]) => [id, d.label])
      },
      {
        k: 'qui', type: 'choice', label: 'Chez qui', def: 'toi',
        choices: [['toi', 'Toi'], ['adversaire', 'L’adversaire']]
      },
      ...paramsFiltre(),
      ...paramsOrdre(),
      num('n', 'Combien', 1),
      num('atk', 'Bonus d’attaque', 1),
      num('hp', 'Bonus de vie', 1)
    ],
    implemented: true
  },
  melange_a_la_pioche: {
    // LA carte qui rend la regle « le deck ne se remelange pas » vivable : c'est le
    // seul moyen de remettre des cartes dans une pioche finie. « Melange ta defausse »,
    // « melange les Chiens de ta main », « melange une unite ciblee » : c'est la meme
    // entree, on change juste la zone d'ou l'on prend.
    label: 'Melange dans la pioche',
    desc: 'Remet des cartes dans une pioche, a une place au hasard. Elles viennent de la main, de la defausse, de la pioche, du plateau, ou sont creees. Une unite prise sur le plateau ne meurt pas : elle repart dans le deck de son proprietaire.',
    params: paramsZone('defausse'),
    implemented: true
  },
  renvoie_en_main: {
    // Le retour en main : rebond d'une unite (la sienne pour la rejouer, celle d'en
    // face pour lui faire tout repayer), recuperation d'une carte de la defausse,
    // recherche dans la pioche. Main pleine : la carte part a la defausse.
    label: 'Renvoie en main',
    desc: 'Ramene des cartes en main. Une unite renvoyee quitte le plateau sans mourir (pas de rale d\'agonie) et redevient la carte a jouer. Si la main est pleine, la carte part a la defausse.',
    params: paramsZone('plateau'),
    implemented: true
  },
  pose_sur_le_plateau: {
    // Reanimation (depuis la defausse) et triche de cout (depuis la main) : la carte
    // arrive en jeu sans etre payee. Elle n'est pas JOUEE pour autant, donc « A la
    // pose » ne part pas — meme regle que pour un jeton invoque.
    label: 'Pose sur le plateau',
    desc: 'Fait arriver des allies directement en jeu, sans les payer. Depuis la defausse c\'est une reanimation, depuis la main une triche de cout. « A la pose » ne se declenche pas (la carte n\'est pas jouee), et les sorts sont ignores.',
    params: paramsZone('defausse'),
    implemented: true
  },
  pioche_une_carte_de_type: {
    label: 'Pioche un allie ou un sort',
    desc: 'Cherche dans ton deck la premiere carte du genre demande et la met en main.',
    params: [
      { k: 'type', type: 'choice', label: 'Genre', def: 'ally', choices: [['ally', 'Un allie'], ['spell', 'Un sort']] },
      num('n', 'Combien', 1)
    ],
    implemented: true
  },
  reduit_le_cout_de: {
    // Effet PONCTUEL : il touche les cartes deja en main, pas celles a venir, et la
    // reduction leur reste acquise pour tout le combat.
    label: 'Reduit le cout',
    desc: 'Reduit le cout des cartes de ta main qui correspondent au filtre. Un cout ne descend jamais sous 0. Les cartes piochees ensuite ne sont pas concernees.',
    params: [
      ...paramsFiltre(),
      num('v', 'Reduction', 1)
    ],
    implemented: true
  },
  summon: {
    // Le jeton invoque est une unite comme une autre : mots-cles (type compris),
    // aura et moments (rale d'agonie, debut/fin de tour) le suivent. Seul « A la
    // pose » ne le suit pas : un jeton n'est pas joue depuis la main, il apparait.
    label: 'Invocation',
    desc: 'Fait apparaitre des unites sur ton cote du plateau.',
    params: [num('n', 'Nombre', 1), { k: 'unit', type: 'unit', label: 'Unite invoquee' }],
    implemented: true
  }
};

// LES MOMENTS ou une carte peut agir. Chaque entree est un champ de la carte qui
// contient une liste d'effets — n'importe lequel des EFFECTS ci-dessus y fonctionne.
// Ajouter un moment ici veut dire l'ajouter aussi dans combat/engine.js.
export const TRIGGERS = {
  play: {
    label: 'A la pose',
    desc: "Quand la carte est jouee : cri de guerre pour un allie, effet du sort pour un sort.",
    allyOnly: false
  },
  death: {
    label: "Rale d'agonie",
    desc: "Quand cette unite meurt, quelle qu'en soit la cause.",
    allyOnly: true
  },
  turnStart: {
    label: 'Debut de ton tour',
    desc: "Chaque tour, tant que l'unite est en jeu, juste apres la pioche.",
    allyOnly: true
  },
  turnEnd: {
    label: 'Fin de ton tour',
    desc: "Chaque tour, tant que l'unite est en jeu, avant de passer la main.",
    allyOnly: true
  }
};

// ---------------------------------------------------------------------------
// EVENEMENTS — « quand X, alors Y ».
// Ce ne sont PAS des mots-cles : ce sont des moments de plus. Une unite en jeu ecoute
// ce qui se passe et declenche sa liste d'effets, exactement comme « Debut de ton tour ».
// Tout ce qui sait deja transporter un moment (resolveCard, makeUnit, le builder, le
// bot) les transporte donc sans une ligne de plus.
//
// Chaque evenement existe en trois versions selon QUI l'a provoque : toi, l'adversaire,
// ou n'importe qui. Ajouter un evenement = une entree ici + son `fireEvent` au bon
// endroit dans engine.js.
export const EVENTS = {
  draw: { you: 'pioches une carte', other: 'pioche une carte' },
  spell: { you: 'lances un sort', other: 'lance un sort' },
  ally: { you: 'joues un allie', other: 'joue un allie' },
  heroHurt: { you: 'perds des PV', other: 'perd des PV' },
  unitDies: { you: 'perds une unite', other: 'perd une unite' },
  attack: { you: 'attaques avec une unite', other: 'attaque avec une unite' },
  // LE RENFORT D'UNE UNITE EN JEU (l'effet « Renfort »). C'est le seul evenement dont
  // le SUJET est une unite et non un camp : `soi` remplace le libelle « Quand tu... »,
  // et le moment n'est ecoute que par l'unite REELLEMENT renforcee (le 4e argument de
  // `fireEvent`). Les variantes adverse / n'importe qui restent de camp : elles disent
  // « une unite de ce cote-la a ete renforcee », et tout le monde peut l'entendre.
  //
  // Une aura n'est pas un renfort — elle modifie tant qu'elle dure, elle ne donne rien —
  // ni un renfort qui n'offre qu'un mot-cle (+0/+0).
  renfort: {
    soi: 'Quand cette unite recoit du renfort',
    you: 'recois du renfort', other: 'recoit du renfort'
  }
};

export const EVENT_WHO = {
  self: { label: 'Toi' },
  foe: { label: 'L’adversaire' },
  any: { label: 'N’importe qui' }
};

/** Le nom du moment qui porte « quand QUI fait EVENEMENT ». */
export const eventSlot = (ev, who) => `on_${ev}_${who}`;

// `soi` : les evenements dont le sujet est l'unite elle-meme et non le camp ne se
// disent pas « Quand tu... » — ils portent leur propre libelle.
const eventLabel = (ev, who) =>
  who === 'self' ? (EVENTS[ev].soi || `Quand tu ${EVENTS[ev].you}`)
    : who === 'foe' ? `Quand l’adversaire ${EVENTS[ev].other}`
      : `Quand n’importe qui ${EVENTS[ev].other}`;

for (const ev of Object.keys(EVENTS)) {
  for (const who of Object.keys(EVENT_WHO)) {
    TRIGGERS[eventSlot(ev, who)] = {
      label: eventLabel(ev, who),
      desc: `Tant que cette unite est en jeu, a chaque fois que ca se produit.`,
      allyOnly: true,   // il faut etre sur le plateau pour ecouter
      event: true, ev, who
    };
  }
}

/** Les moments qu'un jeton invoque peut porter : tout sauf « A la pose », qui ne
 *  se declenche que pour une carte jouee depuis la main. */
export const TOKEN_TRIGGERS = Object.keys(TRIGGERS).filter(slot => slot !== 'play');

/** Les moments « ordinaires » (pose, rale, tours) — ceux que le builder montre toujours. */
export const BASE_TRIGGERS = Object.keys(TRIGGERS).filter(slot => !TRIGGERS[slot].event);
/** Les moments d'evenement, ranges par evenement puis par « qui ». */
export const EVENT_TRIGGERS = Object.keys(TRIGGERS).filter(slot => TRIGGERS[slot].event);

// L'aura n'est pas un effet : c'est un modificateur applique en continu tant que
// l'unite est sur le plateau, et retire des qu'elle le quitte.
export const AURA_SCOPES = {
  otherAllies: { label: 'Tes autres allies' },
  sameTypeAllies: { label: 'Tes autres allies du meme type' },
  enemyUnits: { label: 'Les unites adverses' }
};

// Effets dont un palier « Amplifie les effets » sait augmenter les nombres.
// La pioche, le mana et les invocations en sont volontairement exclus : +1 carte
// piochee ne vaut pas +1 degat, ca se regle en ajoutant un effet, pas en amplifiant.
// Le Card Builder lit cette liste pour prevenir quand un palier ne servirait a rien.
export const AMPLIFIABLE = ['dmg', 'heal', 'buff', 'armor'];

// ---------------------------------------------------------------------------
// EFFETS STATIQUES — « les [trucs] sont affectes [comme ca] ».
// L'aura ci-dessus ne sait toucher qu'une seule chose : les statistiques des unites en
// jeu. Un effet statique tient la meme promesse (ca dure tant que le porteur est la,
// ca disparait avec lui) sur tout le reste : le cout des cartes en main, les montants
// que les effets envoient, les degats subis par un heros, la pioche et le mana du tour.
//
// Chaque entree dit QUI est vise (`qui` : le camp du porteur, ou celui d'en face),
// DANS QUEL SENS (`sens`) et DE COMBIEN (`v` — un nombre du jeu, donc un compteur si
// on veut). Le moteur ne va jamais les chercher un par un : il appelle `staticTotal`
// a l'endroit exact ou la valeur est lue, et repart avec un seul nombre.
// AJOUTER UN EFFET STATIQUE = une entree ici + un appel a `staticTotal` au bon endroit.
//   `bon`   : est-ce que « de plus » est une bonne nouvelle pour le camp vise ? (le bot)
//   `poids` : ce que vaut un point de ce modificateur pendant un tour (le bot).
const quiParam = (soi, autre) => ({
  k: 'qui', type: 'choice', label: 'Porte sur', def: 'toi',
  choices: [['toi', soi], ['adversaire', autre]]
});
const sensParam = def => ({
  k: 'sens', type: 'choice', label: 'Sens', def,
  choices: [['moins', 'De moins'], ['plus', 'De plus']]
});

export const STATICS = {
  cout_des_cartes: {
    label: 'Le cout des cartes en main',
    desc: "Les cartes visees coutent moins (ou plus) cher tant que cette unite est en jeu. Le cout revient a la normale des qu'elle quitte le plateau.",
    params: [
      quiParam('Tes cartes', 'Les cartes de l’adversaire'),
      // Le meme bloc de filtre que partout ailleurs : pas de valeur par defaut sur le
      // type, `staticFields` comble les trous et un champ laisse vide ne doit surtout
      // pas se transformer en « Chien » sans le dire.
      ...paramsFiltre(),
      sensParam('moins'),
      num('v', 'Combien', 1)
    ],
    bon: -1, poids: 1.2,
    text: m => `${paquetDe(m)} coutent ${describeAmount(m.v)} de ${motSens(m)}`
  },
  montant_des_effets: {
    // Le meme geste qu'un palier « Amplifie les effets », mais tant que le porteur
    // tient le plateau — et il peut viser les effets d'en face pour les affaiblir.
    label: 'Les montants des effets',
    desc: "Les nombres envoyes par un type d'effet montent (ou baissent) : « tes degats infligent 1 de plus ».",
    params: [
      quiParam('Tes effets', 'Les effets de l’adversaire'),
      {
        k: 'cible', type: 'choice', label: 'Quel effet', def: 'dmg',
        choices: AMPLIFIABLE.map(op => [op, EFFECTS[op].label])
      },
      sensParam('plus'),
      num('v', 'Combien', 1)
    ],
    bon: 1, poids: 1.5,
    text: m => `${m.qui === 'adversaire' ? 'Les' : 'Tes'} ${motEffet(m.cible)}`
      + `${m.qui === 'adversaire' ? ' de l’adversaire' : ''} : ${describeAmount(m.v)} de ${motSens(m)}`
  },
  degats_du_heros: {
    label: 'Les degats subis par un heros',
    desc: "Chaque perte de PV d'un heros est reduite (ou aggravee). L'armure fait son travail apres.",
    params: [quiParam('Ton heros', 'Le heros adverse'), sensParam('moins'), num('v', 'Combien', 1)],
    bon: -1, poids: 1.2,
    text: m => `Les degats subis par ${m.qui === 'adversaire' ? 'le heros adverse' : 'ton heros'} : ${describeAmount(m.v)} de ${motSens(m)}`
  },
  // « Aura : les cartes que vous jouez se remelangent a votre pioche ». Ce n'est pas
  // une aura au sens du moteur (une aura ne touche que les statistiques des unites en
  // jeu) mais bien un EFFET STATIQUE : ca dure tant que le porteur est la, ca disparait
  // avec lui. Il ne se dose pas — il est la ou il n'est pas — d'ou les deux champs
  // figes que `staticTotal` additionne et que le builder ne montre pas.
  //
  // UNE CARTE PART A LA DEFAUSSE A DEUX MOMENTS, et ce sont deux choses differentes :
  // un SORT y va des qu'il est joue, un ALLIE seulement quand il meurt — sa carte
  // voyage avec l'unite tant qu'elle tient le plateau, la remelanger a la pose la
  // dupliquerait (une unite en jeu ET une carte dans le deck). Le champ « Quelles
  // cartes » laisse donc choisir l'un, l'autre, ou les deux.
  cartes_jouees_remelangees: {
    label: 'Les cartes retournent dans la pioche',
    desc: "Au lieu d'aller a la defausse, la carte est remelangee dans la pioche de son proprietaire, tant que cette unite est en jeu. Un sort part des qu'il est joue ; un allie seulement quand il meurt. Un jeton n'a pas de carte : il ne laisse rien. Le plafond de recyclage par tour s'applique.",
    params: [
      quiParam('Toi', 'L’adversaire'),
      {
        k: 'quoi', type: 'choice', label: 'Quelles cartes', def: 'tout',
        choices: [
          ['tout', 'Les sorts joués et les alliés morts'],
          ['sorts', 'Seulement les sorts joués'],
          ['allies', 'Seulement les alliés qui meurent']
        ]
      },
      { k: 'sens', type: 'choice', label: 'Sens', def: 'plus', choices: [['plus', 'De plus']], si: () => false },
      { k: 'v', type: 'number', label: 'Valeur', def: 1, si: () => false }
    ],
    bon: 1, poids: 1.4,
    text: m => {
      const face = m.qui === 'adversaire';
      const bouts = [];
      if (m.quoi !== 'allies') bouts.push(face ? 'les sorts que joue l’adversaire' : 'les sorts que tu joues');
      if (m.quoi !== 'sorts') bouts.push(face ? 'ses alliés qui meurent' : 'tes alliés qui meurent');
      const phrase = bouts.join(' et ');
      return phrase.charAt(0).toUpperCase() + phrase.slice(1) + ` retournent dans ${face ? 'sa' : 'ta'} pioche`;
    }
  },
  pioche_du_tour: {
    label: 'La pioche de debut de tour',
    desc: "La carte piochee chaque tour devient plusieurs (ou aucune). Ne touche pas les pioches ecrites sur les cartes.",
    params: [quiParam('Toi', 'L’adversaire'), sensParam('plus'), num('v', 'Combien', 1)],
    bon: 1, poids: 1.6,
    text: m => `${m.qui === 'adversaire' ? 'L’adversaire pioche' : 'Tu pioches'} ${describeAmount(m.v)} de ${motSens(m)} par tour`
  },
  mana_du_tour: {
    label: 'Le mana de chaque tour',
    desc: "Du mana en plus (ou en moins) au debut de chaque tour. Comme le mana promis, il peut depasser le mana max.",
    params: [quiParam('Toi', 'L’adversaire'), sensParam('plus'), num('v', 'Combien', 1)],
    bon: 1, poids: 1.2,
    text: m => `${m.qui === 'adversaire' ? 'L’adversaire a' : 'Tu as'} ${describeAmount(m.v)} mana de ${motSens(m)} par tour`
  }
};

const motSens = m => (m.sens === 'plus' ? 'plus' : 'moins');
// Le nom d'un effet au pluriel, pour que la carte se lise en francais. Un effet
// amplifiable ajoute au registre sans passer par ici retombe sur son libelle.
const MOTS_EFFET = { dmg: 'degats', heal: 'soins', buff: 'renforts', armor: 'armures' };
const motEffet = op => MOTS_EFFET[op] || ((EFFECTS[op] || {}).label || op).toLowerCase();
/** « tes sorts » vu du porteur, « les sorts de l'adversaire » vu d'en face. */
const paquetDe = m => (m.qui === 'adversaire'
  ? describeFilter(m).replace(/\btes\b/, 'les') + ' de l’adversaire'
  : describeFilter(m));

/** Les parametres d'un effet statique, trous combles par les valeurs par defaut. */
export function staticFields(m) {
  const out = { ...m };
  for (const p of ((STATICS[(m || {}).op] || {}).params || [])) if (out[p.k] === undefined) out[p.k] = p.def;
  return out;
}

/**
 * La somme signee des effets statiques qui visent le camp `k` pour un modificateur
 * donne. C'est LE point de passage : le moteur l'appelle la ou il lit la valeur
 * (le cout d'une carte, les degats d'un heros, la pioche du tour...) et n'a jamais a
 * parcourir les plateaux lui-meme. `garde` affine (le filtre de cartes, l'effet vise).
 */
export function staticTotal(B, k, op, garde) {
  if (!B) return 0;   // hors combat (vitrine du deck) : aucun plateau, aucun modificateur
  let total = 0;
  for (const camp of ['p', 'e']) {
    for (const u of B[camp].board) {
      for (const brut of u.statics || []) {
        if (brut.op !== op) continue;
        const m = staticFields(brut);
        // « Toi » = le camp du porteur ; « L'adversaire » = celui d'en face.
        const vise = m.qui === 'adversaire' ? (camp === 'p' ? 'e' : 'p') : camp;
        if (vise !== k || (garde && !garde(m))) continue;
        // Le montant se compte du cote du PORTEUR : « X = tes allies Chien » parle de lui.
        const v = amountValue(m.v, B, camp, u);
        total += m.sens === 'plus' ? v : -v;
      }
    }
  }
  return total;
}

/** Texte lisible d'un effet statique, pour la carte et pour le builder. */
export function describeStatic(m) {
  const d = STATICS[(m || {}).op];
  if (!d) return `⚠ effet statique inconnu « ${(m || {}).op} »`;
  return d.text(staticFields(m));
}

// ---------------------------------------------------------------------------
// COMPTEURS. Ce qu'une caracteristique variable peut suivre. Chacun rend un NOMBRE
// a partir de l'etat du combat — jamais a partir de l'attaque ou des PV d'une unite,
// sinon deux caracteristiques variables se regarderaient en boucle.
// Ajouter un compteur = une entree ici, rien d'autre : le moteur l'appelle et le
// Card Builder le propose tout seul.
//   B = la bataille, k = le camp du porteur, u = le porteur (peut manquer quand le
//   bot evalue une carte encore en main), arg = la valeur saisie (un type, souvent).
const compte = (list, t) => (list || []).filter(x => keyArgs(x.baseKeys || x.keys, 'type').includes(t)).length;

export const COUNTERS = {
  ownTurns: { label: 'Tes tours joués', compute: (B, k) => B[k].turns || 0 },
  turnTotal: { label: 'Tours joués (les deux camps)', compute: B => B.turnNo || 0 },
  spellsGame: { label: 'Tes sorts joués cette partie', compute: (B, k) => B[k].spellsGame || 0 },
  spellsTurn: { label: 'Tes sorts joués ce tour', compute: (B, k) => B[k].spellsTurn || 0 },
  allyUnits: { label: 'Tes alliés en jeu (celui-ci compris)', compute: (B, k) => B[k].board.length },
  enemyUnits: { label: 'Les unités adverses en jeu', compute: (B, k) => B[k === 'p' ? 'e' : 'p'].board.length },
  alliesOfType: {
    label: 'Tes alliés d’un type', needsArg: true, argLabel: 'Type suivi',
    compute: (B, k, u, arg) => compte(B[k].board, arg)
  },
  enemiesOfType: {
    label: 'Les unités adverses d’un type', needsArg: true, argLabel: 'Type suivi',
    compute: (B, k, u, arg) => compte(B[k === 'p' ? 'e' : 'p'].board, arg)
  },
  handCards: { label: 'Les cartes de ta main', compute: (B, k) => B[k].hand.length },
  discardCards: { label: 'Les cartes de ta défausse', compute: (B, k) => B[k].discard.length },
  deckCards: { label: 'Les cartes de ta pioche', compute: (B, k) => B[k].deck.length },
  heroMissingHp: { label: 'Les PV manquants de ton héros', compute: (B, k) => Math.max(0, B[k].maxHp - B[k].hp) },
  // Le seul compteur qui ne lit pas le combat mais la CARTE : son niveau de resolution,
  // pose par resolveCard(). Pour une carte de heros c'est le niveau du personnage, pour
  // une carte de PNJ le niveau auquel il joue ses cartes, pour un jeton celui de l'unite
  // qui l'a invoque. D'ou le porteur (`u`) passe partout ou un nombre est calcule.
  ownerLevel: { label: 'Le niveau du héros propriétaire', compute: (B, k, u) => (u && u.ownerLevel) || 0 }
};

/** Le nombre suivi, ou 0 si le compteur n'existe pas (mecanique a moitie decrite). */
export function counterValue(id, B, k, u, arg) {
  const def = COUNTERS[id];
  return def ? Math.max(0, def.compute(B, k, u, arg) || 0) : 0;
}

// ---------------------------------------------------------------------------
// MONTANTS VARIABLES. N'IMPORTE QUEL nombre d'un effet peut valoir un compteur au
// lieu d'une valeur fixe : « inflige X degats, X = tes allies Chien », « pioche X
// cartes », « invoque X jetons ». Ce n'est donc pas un effet de plus — c'est une
// facon d'ecrire un nombre, et tous les effets en profitent d'un coup.
//   nombre fixe   : 3
//   nombre variable : { src: 'alliesOfType', arg: 'Chien', plus: 0 }
// `plus` est le bonus a plat, celui que les paliers « Amplifie les effets » ajoutent.
export const isVariableAmount = v => !!(v && typeof v === 'object' && v.src);

/** Le nombre a utiliser maintenant. Un montant fixe se rend tel quel. */
export function amountValue(v, B, k, u) {
  if (!isVariableAmount(v)) return +v || 0;
  return Math.max(0, counterValue(v.src, B, k, u, v.arg) + (v.plus || 0));
}

/** Ce qu'on lit sur la carte : « 3 », ou « X (X = tes allies Chien) ». */
export function describeAmount(v) {
  if (!isVariableAmount(v)) return String(+v || 0);
  const c = COUNTERS[v.src];
  const bonus = v.plus ? ` + ${v.plus}` : '';
  return `X${bonus} (= ${c ? c.label.toLowerCase() : '?'}${c && c.needsArg ? ' « ' + (v.arg || '?') + ' »' : ''})`;
}

/** Amplifie un montant : un palier « Effet +2 » nourrit le bonus a plat. */
export function amplify(v, amp) {
  return isVariableAmount(v) ? { ...v, plus: (v.plus || 0) + amp } : (+v || 0) + amp;
}

/** Les parametres numeriques d'un effet — ceux qui acceptent un montant variable. */
export const numberParams = op => ((ALL_EFFECTS[op] || {}).params || []).filter(p => p.type === 'number');

// Mots-cles portes par une unite (champ `keys`).
export const KEYWORDS = {
  Taunt: { label: 'Provocation', desc: 'Doit etre attaquee avant le heros et les autres unites.', implemented: true },
  Charge: { label: 'Charge', desc: 'Peut attaquer des le tour ou elle arrive.', implemented: true },
  Venin: { label: 'Venin', desc: 'Detruit toute unite qu’elle blesse.', implemented: true },
  Bouclier: { label: 'Bouclier', desc: 'Absorbe entierement la premiere perte de PV.', implemented: true },
  // Mot-cle A PARAMETRE : il s'ecrit « type:Chien » dans `keys`. Il ne fait rien tout
  // seul — c'est une etiquette que d'autres cartes vont chercher, via la cible
  // `sameTypeAllies` ou la portee d'aura du meme nom.
  type: {
    label: 'Type',
    desc: 'L’allie est du type X, referencable par les cartes qui visent « les allies du meme type ».',
    params: [{ k: 'x', type: 'text', label: 'Valeur', def: 'Chien' }],
    implemented: true
  },
  elusif: {
    label: 'Elusif',
    desc: 'Ne peut pas etre attaquee par les unites adverses. Les sorts et les effets, eux, l’atteignent toujours.',
    implemented: true
  },
  passe_murailles: {
    label: 'Passe-Murailles',
    desc: 'Peut frapper le heros adverse meme si des unites ont Provocation.',
    implemented: true
  },
  // Le cout n'est pas une valeur derivee comme atk/hp : c'est ce mot-cle, et lui seul,
  // qui le fait bouger. Il vaut pour la carte EN MAIN — le porter sur un allie ne fait
  // rien une fois l'unite posee. Sa valeur passe par le systeme de montants variables :
  // « 2 de moins » comme « X de plus, X = tes tours joues » s'ecrivent pareil.
  cout_x_de_moins_de_plus: {
    label: 'Cout X de moins/de plus',
    desc: 'Cette carte coute X mana de moins (ou de plus). X peut etre un nombre fixe ou un compteur. Un cout ne descend jamais sous 0.',
    params: [
      {
        k: 'sens', type: 'choice', label: 'Sens', def: 'moins',
        choices: [['moins', 'De moins'], ['plus', 'De plus']]
      },
      // En mode « fixe » c'est X lui-meme ; avec un compteur, c'est le bonus a plat
      // qui s'y ajoute (le meme role que `plus` dans un montant variable).
      { k: 'v', type: 'number', label: 'Valeur (bonus si X suit un compteur)', def: 1 },
      // « fixe » = la valeur ci-dessus, telle quelle. Un compteur = la valeur devient
      // le bonus a plat du montant variable, exactement comme `plus` ailleurs.
      {
        k: 'src', type: 'choice', label: 'X vaut', def: 'fixe',
        choices: [['fixe', 'La valeur ci-dessus'], ...Object.entries(COUNTERS).map(([id, d]) => [id, d.label])]
      },
      {
        k: 'arg', type: 'text', label: 'Type suivi', def: '',
        si: ({ src }) => !!(COUNTERS[src] && COUNTERS[src].needsArg)
      }
    ],
    text: (f) => `Cout ${describeAmount(costAmount(f))} de ${f.sens === 'plus' ? 'plus' : 'moins'}`,
    implemented: true
  },
  // Mot-cle a PLUSIEURS parametres : « id:stat:compteur:valeur ».
  // L'attaque et/ou les PV ne sont plus ecrits sur la carte, ils SONT le compteur.
  // C'est une valeur derivee de plus : refresh() la recalcule, exactement comme une
  // aura, donc elle monte et descend toute seule sans jamais toucher aux degats subis.
  characteristique_variable: {
    label: 'Caractéristique variable',
    desc: 'L’attaque et/ou la vie de cette unite valent ce que compte un compteur (tours joues, allies d’un type...). Les statistiques ecrites sur la carte sont alors ignorees ; les renforts recus en combat, eux, s’ajoutent.',
    params: [
      {
        k: 'stat', type: 'choice', label: 'Ce qui varie', def: 'atk',
        choices: [['atk', 'L’attaque'], ['hp', 'La vie'], ['both', 'L’attaque et la vie']]
      },
      {
        k: 'src', type: 'choice', label: 'Vaut le nombre de', def: 'ownTurns',
        choices: Object.entries(COUNTERS).map(([id, d]) => [id, d.label])
      },
      // `si` : ce champ n'a de sens que pour un compteur qui demande une valeur.
      // Le builder ne l'affiche donc pas quand on compte les tours.
      {
        k: 'arg', type: 'text', label: 'Type suivi', def: '',
        si: ({ src }) => !!(COUNTERS[src] && COUNTERS[src].needsArg)
      }
    ],
    /** Ce que la carte affiche : « Attaque = tes tours joues ». Recoit les parametres
     *  deja completes par leurs valeurs par defaut, jamais des trous. */
    text: ({ stat, src, arg }) => {
      const quoi = stat === 'hp' ? 'Vie' : stat === 'both' ? 'Attaque et vie' : 'Attaque';
      const cpt = COUNTERS[src];
      return `${quoi} = ${cpt ? cpt.label.toLowerCase() : '?'}${cpt && cpt.needsArg ? ' « ' + (arg || '?') + ' »' : ''}`;
    },
    implemented: true
  }
};

// ---------------------------------------------------------------------------
// MOTS-CLES A PARAMETRE. Un mot-cle simple s'ecrit « Taunt » ; un mot-cle qui porte
// une valeur s'ecrit « id:valeur » (« type:Chien »). Tout le jeu passe par ces trois
// fonctions plutot que de comparer les chaines a la main : ajouter un mot-cle a
// parametre ne demande donc pas de retoucher les mots-cles existants.
export const keyId = k => String(k || '').split(':')[0];
export const keyArg = k => { const i = String(k || '').indexOf(':'); return i < 0 ? '' : String(k).slice(i + 1); };
/** Les valeurs d'un mot-cle a PLUSIEURS parametres, dans l'ordre de ses `params`. */
export const keyParts = k => String(k || '').split(':').slice(1);
/** Les parametres d'un mot-cle range par nom : { stat: 'atk', src: 'ownTurns', ... }. */
export function keyFields(k) {
  const def = ALL_KEYWORDS[keyId(k)];
  const parts = keyParts(k);
  const out = {};
  ((def && def.params) || []).forEach((p, i) => { out[p.k] = parts[i] === undefined ? (p.def || '') : parts[i]; });
  return out;
}
/** Assemble « id:v1:v2 » a partir des valeurs rangees par nom. */
export function keyFrom(id, champs, defs) {
  const params = (defs || (ALL_KEYWORDS[id] || {}).params) || [];
  if (!params.length) return id;
  return [id, ...params.map(p => (champs[p.k] === undefined ? (p.def || '') : champs[p.k]))].join(':');
}
/** La liste `keys` contient-elle ce mot-cle, avec ou sans valeur ? */
export const hasKey = (keys, id) => (keys || []).some(k => keyId(k) === id);
/** Les valeurs portees par un mot-cle donne (ex. tous les types d'une unite). */
export const keyArgs = (keys, id) => (keys || []).filter(k => keyId(k) === id).map(keyArg).filter(Boolean);

// ---------------------------------------------------------------------------
// COUT D'UNE CARTE. Le cout ecrit sur la carte (que les paliers et « Reduit le cout »
// modifient) plus ce que dit le mot-cle « Cout X de moins/de plus », qui lui se
// recalcule a chaque fois qu'on regarde la carte : son X peut etre un compteur.
// Tout ce qui paie ou affiche un cout passe par `cardCost` — jamais par `card.cost`.
export const COST_KEYWORD = 'cout_x_de_moins_de_plus';

/** Le X du mot-cle, ecrit comme n'importe quel montant du jeu : nombre ou compteur. */
export function costAmount(champs) {
  const plat = +champs.v || 0;
  return champs.src && COUNTERS[champs.src] ? { src: champs.src, arg: champs.arg || '', plus: plat } : plat;
}

/** Ce que le mot-cle ajoute (positif) ou retire (negatif) au cout, ici et maintenant. */
export function costDelta(card, B, k) {
  const cle = ((card && card.keys) || []).find(x => keyId(x) === COST_KEYWORD);
  if (!cle) return 0;
  const champs = keyFields(cle);
  // Hors combat (vitrine du deck, vue d'ensemble) il n'y a pas de compteurs a lire :
  // on ne montre alors que la part fixe, jamais un nombre invente.
  // On passe la carte comme porteur : c'est elle qui sait de quel niveau elle est.
  const x = B ? amountValue(costAmount(champs), B, k, card) : Math.max(0, +champs.v || 0);
  return champs.sens === 'plus' ? x : -x;
}

/** Le cout a payer pour cette carte, dans cette position. Jamais negatif.
 *  Trois choses le composent : le cout ecrit (que les paliers et « Reduit le cout »
 *  modifient), le mot-cle porte par la carte, et les effets statiques en jeu. */
export const cardCost = (card, B, k) => Math.max(0, ((card && card.cost) || 0)
  + costDelta(card, B, k)
  + staticTotal(B, k, 'cout_des_cartes', m => cardMatches(card, m)));

// ---------------------------------------------------------------------------
// MECANIQUES INVENTEES DANS LE BUILDER QUI SONT MAINTENANT CODEES, mais sous une
// autre forme que celle imaginee au depart : ni un effet, ni un mot-cle, donc elles
// n'apparaissent pas dans EFFECTS/KEYWORDS et le builder ne pourrait pas deviner
// qu'elles sont faites. Il s'en sert pour les retirer de `customMechanics` tout seul
// et dire par quoi les remplacer.
export const IMPLEMENTED_AS = {
  montant_variable: 'c’est le bouton « X » a cote de chaque nombre d’un effet',
  quand_x_alors_y: 'ce sont les moments « Quand X alors Y » (pioche, sort, allie pose, PV perdus, unite tuee, attaque)'
};

// ---------------------------------------------------------------------------
// Fusion avec les mecaniques inventees dans le builder.
const customs = CHARACTER_DATA.customMechanics || [];

export const CUSTOM_MECHANICS = customs;

export const ALL_EFFECTS = { ...EFFECTS };
export const ALL_KEYWORDS = { ...KEYWORDS };
/** Cette mecanique inventee dans le builder existe-t-elle deja, pour de vrai, ici ? */
const dejaCodee = m => !!((m.kind === 'keyword' ? KEYWORDS : EFFECTS)[m.id] || IMPLEMENTED_AS[m.id]);

for (const m of customs) {
  // Une mecanique CODEE ne doit plus jamais etre ecrasee par sa version « a coder ».
  // Sinon un vieil onglet du builder qui re-applique son brouillon la remet dans les
  // donnees, et le moteur perd la vraie : ses parametres redeviennent ceux qu'on avait
  // imagines, et la carte ne fait plus rien. Le builder fait le meme tri de son cote.
  if (dejaCodee(m)) continue;
  const entry = { label: m.label, desc: m.desc, params: m.params || [], implemented: !!m.implemented, custom: true };
  if (m.kind === 'keyword') ALL_KEYWORDS[m.id] = entry;
  else ALL_EFFECTS[m.id] = entry;
}

export const isEffectReady = op => !!(ALL_EFFECTS[op] && ALL_EFFECTS[op].implemented);
export const isKeywordReady = k => !!(ALL_KEYWORDS[keyId(k)] && ALL_KEYWORDS[keyId(k)].implemented);

/** Ce qu'on affiche sur une carte pour un mot-cle : « Provocation », « Type Chien ». */
export const keyLabel = k => {
  const def = ALL_KEYWORDS[keyId(k)];
  if (def && def.text) return def.text(keyFields(k));   // le mot-cle sait se dire lui-meme
  const arg = keyArg(k);
  return (def ? def.label : keyId(k)) + (arg ? ' ' + arg : '');
};

/** Tout ce qui reste a coder — sert au jeu, au simulateur et au fichier de suivi. */
export function pendingMechanics() {
  return customs.filter(m => !m.implemented && !dejaCodee(m));
}

/** Cette carte correspond-elle au filtre ? `e` porte les valeurs saisies. */
export function cardMatches(card, e) {
  if (!card) return false;
  switch (e.quoi || 'all') {
    case 'ally': return card.type === 'ally';
    case 'spell': return card.type !== 'ally';
    case 'ofType': return !!e.argType && keyArgs(card.keys, 'type').includes(e.argType);
    case 'withKey': return !!e.argKey && hasKey(card.keys, e.argKey);
    // Une carte sans identifiant ne peut etre designee par personne : elle ne passe pas.
    case 'oneCard': return !!e.argCard && card.id === e.argCard;
    default: return true;
  }
}

/** Comment on nomme ce paquet de cartes dans un texte de carte. */
export function describeFilter(e) {
  const d = CARD_FILTERS[e.quoi || 'all'] || CARD_FILTERS.all;
  if (d.arg === 'type') return `tes cartes « ${e.argType || '?'} »`;
  if (d.arg === 'key') return `tes cartes avec ${e.argKey ? keyLabel(e.argKey) : '?'}`;
  if (d.arg === 'card') return `« ${nomDeCarte(e.argCard)} »`;
  return d.label.toLowerCase();
}

/** Texte lisible d'une aura : « +1 attaque, Provocation → tes autres allies ». */
export function describeAura(a) {
  if (!a) return '';
  const parts = [];
  if (a.atk) parts.push((a.atk > 0 ? '+' : '') + a.atk + ' attaque');
  if (a.hp) parts.push((a.hp > 0 ? '+' : '') + a.hp + ' vie');
  if (a.key) parts.push(keyLabel(a.key));
  const scope = (AURA_SCOPES[a.scope || 'otherAllies'] || {}).label || a.scope;
  return parts.join(', ') + ' → ' + scope.toLowerCase();
}

/**
 * Le nom lisible d'une carte designee par son identifiant (« Cree », « Melange dans
 * la pioche »). On ne passe pas par `cardCatalog()` de config/npcs.js : ce module
 * importe characters.js, qui importe celui-ci — la boucle d'imports rendrait la
 * fonction indisponible au chargement. Ici on ne lit que les donnees, deja importees.
 */
const nomDeCarte = id => {
  if (!id) return '?';
  const d = CHARACTER_DATA;
  const trouve = (d.library || []).find(c => c && c.id === id)
    || (d.characters || []).flatMap(ch => [...(ch.cards || []), ...(ch.switches || [])])
      .find(c => c && c.id === id);
  return trouve ? trouve.name : id;
};

/**
 * Comment on nomme la carte creee de toutes pieces : « Rongeur » quand elle est
 * choisie, « un allie « Chien » au hasard » quand elle est tiree. C'est le filtre de
 * CARD_FILTERS, mais dit au singulier : c'est UNE carte qui apparait, pas un paquet.
 */
export function describeCarteCreee(e) {
  if ((e.choix || 'precise') !== 'hasard') return `« ${nomDeCarte(e.carte)} »`;
  const quoi = e.quoi || 'all';
  const nom = quoi === 'ally' ? 'un allie' : quoi === 'spell' ? 'un sort' : 'une carte';
  const precision = quoi === 'ofType' ? ` « ${e.argType || '?'} »`
    : quoi === 'withKey' ? ` avec ${e.argKey ? keyLabel(e.argKey) : '?'}` : '';
  return `${nom}${precision} au hasard`;
}

/** « 2 sorts de la defausse », « l'unite ciblee », « 1 × Rongeur » : la partie
 *  « quelles cartes et d'ou » d'un deplacement, commune aux trois destinations. */
export function describeZone(e) {
  const z = ZONES[e.d_ou] || ZONES.defausse;
  if (z.carte) return `${describeAmount(e.n === undefined ? 1 : e.n)} × ${describeCarteCreee(e)}`;
  if (z.cible) return targetLabel(e.t).toLowerCase();
  const chez = e.qui === 'adversaire' ? ' de l’adversaire' : '';
  const zone = e.d_ou === 'main' ? 'la main' : e.d_ou === 'pioche' ? 'la pioche' : 'la defausse';
  const ou = e.ordre === 'dessus' ? `du dessus de ${zone}` : `de ${zone}`;
  const secours = e.fatigue ? ' (completees par la fatigue)' : '';
  return `${describeAmount(e.n === undefined ? 1 : e.n)} × ${describeFilter(e)} ${ou}${chez}${secours}`;
}

/** « et leur donne +2/+2 » — le renfort qu'un deplacement pose sur ses cartes. */
const bonusDeplacement = e => (e.atk || e.hp)
  ? ` et leur donne +${describeAmount(e.atk || 0)}/+${describeAmount(e.hp || 0)}` : '';

/** Texte lisible d'un effet, pour l'apercu du builder. */
export function describeEffect(e) {
  const def = ALL_EFFECTS[e.op];
  if (!def) return `⚠ mecanique inconnue « ${e.op} »`;
  const t = e.t ? ` → ${targetLabel(e.t)}` : '';
  const n = k => describeAmount(e[k]);
  switch (e.op) {
    case 'dmg': return `${n('v')} degats${t}`;
    case 'detruit': return `detruit${t}`;
    case 'heal': return `soigne ${n('v')}${t}`;
    case 'buff': return `+${n('atk')}/+${n('hp')}${e.key ? ' et ' + e.key : ''}${t}`;
    case 'draw': return `pioche ${n('v')}`;
    case 'armor': return `${n('v')} armure`;
    case 'mana': return `+${n('v')} mana ce tour`;
    case 'mana_au_prochain_tour': return `+${n('x')} mana au prochain tour`;
    case 'cree': return `cree ${describeAmount(e.n === undefined ? 1 : e.n)} × ${describeCarteCreee(e)} en main`;
    case 'melange_a_la_pioche': {
      // Une carte prise sur le PLATEAU retourne toujours chez son proprietaire : le
      // choix « chez qui » ne s'applique pas, et le texte ne doit pas mentir.
      const ou = (ZONES[e.d_ou] || {}).cible ? 'sa pioche'
        : e.qui === 'adversaire' ? 'la pioche de l’adversaire' : 'ta pioche';
      return `melange ${describeZone(e)} dans ${ou}${bonusDeplacement(e)}`;
    }
    case 'renforce_les_cartes': return `+${describeAmount(e.atk || 0)}/+${describeAmount(e.hp || 0)} pour ${describeZone(e)}`;
    case 'renvoie_en_main': return `renvoie ${describeZone(e)} en main${bonusDeplacement(e)}`;
    case 'pose_sur_le_plateau': return `pose ${describeZone(e)} sur le plateau${bonusDeplacement(e)}`;
    case 'pioche_x': return `cherche ${describeAmount(e.n === undefined ? 1 : e.n)} × « ${e.carte || '?'} » dans ton deck`;
    case 'pioche_une_carte_de_type': return `cherche ${describeAmount(e.n === undefined ? 1 : e.n)} ${e.type === 'spell' ? 'sort' : 'allie'}(s) dans ton deck`;
    case 'reduit_le_cout_de': return `${describeAmount(e.v)} mana de moins pour ${describeFilter(e)} en main`;
    case 'summon': {
      if (!e.unit) return `invoque ${e.n || 1} × ?`;
      // Un jeton peut porter mots-cles, moments et aura : le dire, sinon la carte
      // a l'air d'un simple tas de statistiques.
      const dons = [
        ...(e.unit.keys || []).map(keyLabel),
        ...TOKEN_TRIGGERS.filter(slot => (e.unit[slot] || []).length).map(slot => TRIGGERS[slot].label),
        ...(e.unit.aura ? ['Aura'] : [])
      ];
      return `invoque ${describeAmount(e.n === undefined ? 1 : e.n)} × ${e.unit.name} ${e.unit.atk}/${e.unit.hp}`
        + (dons.length ? ` (${dons.join(', ')})` : '');
    }
    default: return def.implemented ? def.label : `⚠ ${def.label} (pas encore codee)`;
  }
}
