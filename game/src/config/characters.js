// Personnages et cartes — LOGIQUE seulement.
// Les donnees vivent dans game/data/characters.data.js, ecrit par le Card Builder
// (/builder/). Ne code pas de carte en dur ici : passe par le builder.
//
// Modele GDD : 1 personnage = 5 cartes fixes + 1 carte switch alternative par slot.
// Un deck = 3 personnages = 15 cartes melangees dans un paquet unique.
// Les effets et mots-cles disponibles sont decrits dans config/mechanics.js.
import { CHARACTER_DATA } from '../../data/characters.data.js';
import { AMPLIFIABLE, TRIGGERS, amplify, effectParams, eachSubEffect, listeEffets } from './mechanics.js';

export const CHARACTERS = CHARACTER_DATA.characters;
export const CHAR_BY_ID = Object.fromEntries(CHARACTERS.map(c => [c.id, c]));

// Les personnages distribues pendant le tutoriel (GDD).
export const STARTERS = CHARACTER_DATA.starters;

// Paliers proposes par defaut a la creation d'une carte (le builder les copie).
// Niveaux repris des mockups : 2/5/10 pour un Ally, 3/6/11 pour un Spell.
export const DEFAULT_TIERS = {
  ally: () => [
    { lvl: 2, stats: { atk: 0, hp: 1 }, text: '+0/+1' },
    { lvl: 5, stats: { atk: 1, hp: 0 }, text: '+1/+0' },
    { lvl: 10, stats: { atk: 1, hp: 2 }, text: '+1/+2' }
  ],
  spell: () => [
    { lvl: 3, amp: 1, text: 'Effet +1' },
    { lvl: 6, extra: { op: 'draw', v: 1 }, text: 'Pioche 1 carte en plus' },
    { lvl: 11, amp: 2, text: 'Effet +2' }
  ]
};

/**
 * Applique les paliers de niveau cumulatifs a une carte.
 * Le niveau est celui du PERSONNAGE proprietaire, pas de la carte.
 */
export function resolveCard(def, level) {
  // Un effet peut en CONTENIR d'autres (les deux branches de « Choisir ») : la copie
  // descend dedans, sinon un palier « Amplifie » irait modifier la definition de la
  // carte elle-meme, et le niveau 3 amplifierait encore le niveau 1.
  // Une branche est une LISTE : la copier avec `{ ...e }` en ferait un objet a cles
  // numeriques, et la branche disparaitrait sans un mot. `listeEffets` la rend toujours
  // comme une liste — au passage, les cartes ecrites avant qu'elle en devienne une
  // sont normalisees ici.
  const copyEffet = e => {
    const o = { ...e };
    for (const p of effectParams(e.op)) if (o[p.k]) o[p.k] = listeEffets(o[p.k]).map(copyEffet);
    return o;
  };
  const copy = list => (list || []).map(copyEffet);
  const c = {
    ...def,
    keys: [...(def.keys || [])],
    aura: def.aura ? { ...def.aura } : null,
    // Les effets statiques sont copies eux aussi : un palier peut en ajouter, et la
    // definition de la carte ne doit pas bouger quand le personnage monte de niveau.
    statics: copy(def.statics),
    ownerLevel: level,
    unlocked: []
  };
  // Un champ par moment (cf. TRIGGERS dans mechanics.js), copie en profondeur : le
  // moteur mute ces objets pendant le combat, la definition ne doit pas bouger.
  // La boucle est generique : un moment ajoute au registre suit tout seul.
  for (const slot of Object.keys(TRIGGERS)) c[slot] = copy(def[slot]);
  // La garde d'un moment (« seulement si c'est un Chien qui attaque ») voyage avec lui.
  c.gardes = { ...(def.gardes || {}) };

  let amp = 0, lesDeux = false;
  for (const t of def.tiers || []) {
    if (level < t.lvl) continue;
    c.unlocked.push(t.lvl);
    // « Choisit les deux » : au-dela de ce palier, la carte ne demande plus rien.
    if (t.lesDeux) lesDeux = true;
    if (t.stats) { c.atk = (c.atk || 0) + (t.stats.atk || 0); c.hp = (c.hp || 0) + (t.stats.hp || 0); }
    if (t.key && !c.keys.includes(t.key)) c.keys.push(t.key);
    if (t.cost) c.cost = Math.max(0, c.cost + t.cost);
    // Un palier peut debloquer un effet sur N'IMPORTE QUEL moment : cri de guerre
    // (slot par defaut), rale d'agonie, debut/fin de tour, ou un moment a venir.
    if (t.extra) {
      const slot = TRIGGERS[t.slot] ? t.slot : 'play';
      (c[slot] = c[slot] || []).push({ ...t.extra });
    }
    // Un palier peut aussi donner une aura, ou renforcer celle qui existe deja.
    if (t.aura) {
      c.aura = c.aura || { scope: t.aura.scope || 'otherAllies', atk: 0, hp: 0, key: '' };
      c.aura.atk = (c.aura.atk || 0) + (t.aura.atk || 0);
      c.aura.hp = (c.aura.hp || 0) + (t.aura.hp || 0);
      if (t.aura.key) c.aura.key = t.aura.key;
      if (t.aura.scope) c.aura.scope = t.aura.scope;
    }
    // Un palier peut aussi poser un effet statique de plus (« a partir du niveau 5,
    // tes sorts coutent 1 de moins »).
    if (t.statique) c.statics.push({ ...t.statique });
    if (t.amp) amp += t.amp;
  }
  // ON DEROULE LES « CHOISIR » une fois pour toutes, avant l'amplification : les deux
  // branches deviennent des effets ordinaires, a la suite. Le moteur, le bot et
  // l'interface ne voient alors plus aucun choix a poser — il n'y en a plus.
  if (lesDeux) {
    for (const slot of Object.keys(TRIGGERS)) {
      if (!(c[slot] || []).length) continue;
      c[slot] = c[slot].flatMap(e => e.op === 'choisir' ? [...listeEffets(e.a), ...listeEffets(e.b)] : [e]);
    }
  }
  if (amp) {
    // L'amplification touche les effets de tous les moments, pas seulement la pose.
    for (const slot of Object.keys(TRIGGERS)) {
      // `eachSubEffect` descend dans les branches de « Choisir » : les deux choix sont
      // amplifies, sinon le palier ne vaudrait que pour celui qu'on n'a pas pris.
      for (const brut of c[slot] || []) eachSubEffect(brut, e => {
        if (!AMPLIFIABLE.includes(e.op)) return; // pioche/mana/invocation : non amplifiables
        // amplify() sait amplifier un nombre comme un montant variable (il nourrit
        // alors son bonus a plat) sans jamais toucher a l'objet d'origine.
        if (e.op === 'buff') { if (e.atk) e.atk = amplify(e.atk, amp); if (e.hp) e.hp = amplify(e.hp, amp); }
        else e.v = amplify(e.v, amp);
      });
    }
  }
  return c;
}

/** Les 5 cartes effectives d'un personnage, en tenant compte des switch equipes. */
export function characterDeck(charId, save) {
  const def = CHAR_BY_ID[charId];
  const st = save.chars[charId];
  return def.cards.map((base, i) => {
    const c = resolveCard(st.switches[i] && def.switches[i] ? def.switches[i] : base, st.level);
    // La carte garde SON image si elle en a une (cas d'une carte libre reprise par un
    // heros) ; sinon elle prend celle du personnage.
    c.sprite = def.sprite || c.sprite;
    c.owner = charId;
    return c;
  });
}
