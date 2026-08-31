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
  self: { label: 'Elle-meme', pick: false, allyOnly: true }
};

const ENEMY_TARGETS = ['enemyAny', 'enemyUnit', 'enemyHero', 'allEnemyUnits', 'randomEnemyAny', 'randomEnemyUnit'];
const ALLY_TARGETS = ['ownHero', 'allyUnit', 'allAllies', 'randomAllyAny', 'randomAllyUnit', 'self'];

const num = (k, label, def = 1) => ({ k, type: 'number', label, def });
const tgt = (k, label, allow) => ({ k, type: 'target', label, allow });

// Effets jouables (champ `play` d'une carte).
export const EFFECTS = {
  dmg: {
    // Les degats peuvent viser ton propre camp : c'est un cout assume, pas un bug.
    label: 'Degats',
    desc: 'Inflige des degats a la cible.',
    params: [tgt('t', 'Cible', [...ENEMY_TARGETS, 'randomAllyAny', 'randomAllyUnit', 'self']), num('v', 'Montant', 2)],
    implemented: true
  },
  heal: {
    label: 'Soin',
    desc: 'Rend des points de vie.',
    params: [tgt('t', 'Cible', ALLY_TARGETS), num('v', 'Montant', 4)],
    implemented: true
  },
  buff: {
    label: 'Renfort',
    desc: 'Augmente attaque/vie et peut donner un mot-cle.',
    params: [
      tgt('t', 'Cible', ['allyUnit', 'allAllies', 'randomAllyUnit', 'self']),
      num('atk', 'Attaque', 1), num('hp', 'Vie', 1),
      { k: 'key', type: 'keyword', label: 'Mot-cle offert (optionnel)' }
    ],
    implemented: true
  },
  draw: { label: 'Pioche', desc: 'Pioche des cartes.', params: [num('v', 'Cartes', 1)], implemented: true },
  armor: { label: 'Armure', desc: 'Ton heros gagne de l’armure, qui absorbe les degats avant les PV.', params: [num('v', 'Armure', 4)], implemented: true },
  mana: { label: 'Mana temporaire', desc: 'Donne du mana pour ce tour uniquement.', params: [num('v', 'Mana', 1)], implemented: true },
  summon: {
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

// L'aura n'est pas un effet : c'est un modificateur applique en continu tant que
// l'unite est sur le plateau, et retire des qu'elle le quitte.
export const AURA_SCOPES = {
  otherAllies: { label: 'Tes autres allies' },
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
  Bouclier: { label: 'Bouclier', desc: 'Absorbe entierement la premiere perte de PV.', implemented: true }
};

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
export const isKeywordReady = k => !!(ALL_KEYWORDS[k] && ALL_KEYWORDS[k].implemented);

/** Tout ce qui reste a coder — sert au jeu, au simulateur et au fichier de suivi. */
export function pendingMechanics() {
  return customs.filter(m => !m.implemented);
}

/** Texte lisible d'un effet, pour l'apercu du builder. */
export function describeEffect(e) {
  const def = ALL_EFFECTS[e.op];
  if (!def) return `⚠ mecanique inconnue « ${e.op} »`;
  const t = e.t ? ` → ${(TARGETS[e.t] || { label: e.t }).label}` : '';
  switch (e.op) {
    case 'dmg': return `${e.v} degats${t}`;
    case 'heal': return `soigne ${e.v}${t}`;
    case 'buff': return `+${e.atk || 0}/+${e.hp || 0}${e.key ? ' et ' + e.key : ''}${t}`;
    case 'draw': return `pioche ${e.v}`;
    case 'armor': return `${e.v} armure`;
    case 'mana': return `+${e.v} mana ce tour`;
    case 'summon': return `invoque ${e.n || 1} × ${e.unit ? `${e.unit.name} ${e.unit.atk}/${e.unit.hp}` : '?'}`;
    default: return def.implemented ? def.label : `⚠ ${def.label} (pas encore codee)`;
  }
}
