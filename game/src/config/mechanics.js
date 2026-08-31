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

// Effets jouables (champ `play` d'une carte).
export const EFFECTS = {
  dmg: {
    // Les degats peuvent viser ton propre camp : c'est un cout assume, pas un bug.
    label: 'Degats',
    desc: 'Inflige des degats a la cible.',
    params: [tgt('t', 'Cible', [...ENEMY_TARGETS, 'randomAllyAny', 'randomAllyUnit', 'self', 'previous']), num('v', 'Montant', 2)],
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

/** Les moments qu'un jeton invoque peut porter : tout sauf « A la pose », qui ne
 *  se declenche que pour une carte jouee depuis la main. */
export const TOKEN_TRIGGERS = Object.keys(TRIGGERS).filter(slot => slot !== 'play');

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
  }
};

// ---------------------------------------------------------------------------
// MOTS-CLES A PARAMETRE. Un mot-cle simple s'ecrit « Taunt » ; un mot-cle qui porte
// une valeur s'ecrit « id:valeur » (« type:Chien »). Tout le jeu passe par ces trois
// fonctions plutot que de comparer les chaines a la main : ajouter un mot-cle a
// parametre ne demande donc pas de retoucher les mots-cles existants.
export const keyId = k => String(k || '').split(':')[0];
export const keyArg = k => { const i = String(k || '').indexOf(':'); return i < 0 ? '' : String(k).slice(i + 1); };
/** La liste `keys` contient-elle ce mot-cle, avec ou sans valeur ? */
export const hasKey = (keys, id) => (keys || []).some(k => keyId(k) === id);
/** Les valeurs portees par un mot-cle donne (ex. tous les types d'une unite). */
export const keyArgs = (keys, id) => (keys || []).filter(k => keyId(k) === id).map(keyArg).filter(Boolean);

// ---------------------------------------------------------------------------
// Fusion avec les mecaniques inventees dans le builder.
const customs = CHARACTER_DATA.customMechanics || [];

export const CUSTOM_MECHANICS = customs;

export const ALL_EFFECTS = { ...EFFECTS };
export const ALL_KEYWORDS = { ...KEYWORDS };
for (const m of customs) {
  const entry = { label: m.label, desc: m.desc, params: m.params || [], implemented: !!m.implemented, custom: true };
  if (m.kind === 'keyword') ALL_KEYWORDS[m.id] = entry;
  else ALL_EFFECTS[m.id] = entry;
}

export const isEffectReady = op => !!(ALL_EFFECTS[op] && ALL_EFFECTS[op].implemented);
export const isKeywordReady = k => !!(ALL_KEYWORDS[keyId(k)] && ALL_KEYWORDS[keyId(k)].implemented);

/** Ce qu'on affiche sur une carte pour un mot-cle : « Provocation », « Type Chien ». */
export const keyLabel = k => {
  const def = ALL_KEYWORDS[keyId(k)];
  const arg = keyArg(k);
  return (def ? def.label : keyId(k)) + (arg ? ' ' + arg : '');
};

/** Tout ce qui reste a coder — sert au jeu, au simulateur et au fichier de suivi. */
export function pendingMechanics() {
  return customs.filter(m => !m.implemented);
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

/** Texte lisible d'un effet, pour l'apercu du builder. */
export function describeEffect(e) {
  const def = ALL_EFFECTS[e.op];
  if (!def) return `⚠ mecanique inconnue « ${e.op} »`;
  const t = e.t ? ` → ${targetLabel(e.t)}` : '';
  switch (e.op) {
    case 'dmg': return `${e.v} degats${t}`;
    case 'heal': return `soigne ${e.v}${t}`;
    case 'buff': return `+${e.atk || 0}/+${e.hp || 0}${e.key ? ' et ' + e.key : ''}${t}`;
    case 'draw': return `pioche ${e.v}`;
    case 'armor': return `${e.v} armure`;
    case 'mana': return `+${e.v} mana ce tour`;
    case 'mana_au_prochain_tour': return `+${e.x} mana au prochain tour`;
    case 'summon': {
      if (!e.unit) return `invoque ${e.n || 1} × ?`;
      // Un jeton peut porter mots-cles, moments et aura : le dire, sinon la carte
      // a l'air d'un simple tas de statistiques.
      const dons = [
        ...(e.unit.keys || []).map(keyLabel),
        ...TOKEN_TRIGGERS.filter(slot => (e.unit[slot] || []).length).map(slot => TRIGGERS[slot].label),
        ...(e.unit.aura ? ['Aura'] : [])
      ];
      return `invoque ${e.n || 1} × ${e.unit.name} ${e.unit.atk}/${e.unit.hp}`
        + (dons.length ? ` (${dons.join(', ')})` : '');
    }
    default: return def.implemented ? def.label : `⚠ ${def.label} (pas encore codee)`;
  }
}
