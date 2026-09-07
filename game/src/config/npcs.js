// ADVERSAIRES (PNJ) ET CATALOGUE DE CARTES.
//
// Les decks des PNJ ne sont plus ecrits en dur : ils vivent dans les donnees du Card
// Builder (`CHARACTER_DATA.npcs`), et leurs cartes sont piochees dans un CATALOGUE —
// la bibliotheque de cartes libres (`CHARACTER_DATA.library`, des cartes qui
// n'appartiennent a aucun slot de personnage) plus toutes les cartes des personnages,
// base et switch. Un PNJ peut donc jouer une carte de heros, et une carte libre peut
// etre donnee a un heros : c'est le meme catalogue des deux cotes.
//
// `world.js` garde ce qui releve du MONDE (ou est la rencontre, ce qu'elle rapporte) ;
// tout ce qui releve du DECK est ici, donc editable dans le builder.
import { CHARACTER_DATA } from '../../data/characters.data.js';
import { resolveCard } from './characters.js';

export const LIBRARY = CHARACTER_DATA.library || [];
export const NPCS = CHARACTER_DATA.npcs || [];

/**
 * Toutes les cartes du jeu, avec d'ou elles viennent. Sert au menu deroulant du
 * builder (« pioche une carte ») et a la resolution des decks de PNJ.
 * Rend [{ id, card, origine, ownerId }] — `origine` est un libelle lisible.
 */
export function cardCatalog(data = CHARACTER_DATA) {
  const out = [];
  for (const c of data.library || []) if (c && c.id) out.push({ id: c.id, card: c, origine: 'Cartes libres', ownerId: null });
  for (const ch of data.characters || []) {
    for (const cote of ['cards', 'switches']) {
      for (const c of ch[cote] || []) {
        if (!c || !c.id) continue;
        out.push({ id: c.id, card: c, ownerId: ch.id, origine: `${ch.name} · ${cote === 'cards' ? 'base' : 'switch'}` });
      }
    }
  }
  return out;
}

/** L'index id -> entree du catalogue. Le premier gagne : la bibliotheque d'abord. */
export function cardIndex(data = CHARACTER_DATA) {
  const idx = {};
  for (const e of cardCatalog(data)) if (!idx[e.id]) idx[e.id] = e;
  return idx;
}

export const NPC_BY_ID = Object.fromEntries(NPCS.map(n => [n.id, n]));

// L'index du catalogue, construit une fois : le moteur s'en sert pour l'effet
// « Cree une carte », qui fait apparaitre n'importe quelle carte du jeu en main.
let INDEX = null;
export function cardEntry(id, data = CHARACTER_DATA) {
  if (data !== CHARACTER_DATA) return cardIndex(data)[id] || null;
  if (!INDEX) INDEX = cardIndex(data);
  return INDEX[id] || null;
}
export function cardById(id, data = CHARACTER_DATA) {
  return (cardEntry(id, data) || {}).card || null;
}

/**
 * Toutes les cartes du catalogue, une seule fois chacune. C'est le sac dans lequel
 * pioche « Cree une carte au hasard » : les cartes libres et celles des personnages,
 * sans distinction — une carte sans identifiant n'y est pas (rien ne la designerait).
 * Garde en memoire comme l'index : un tirage par carte creee, ca se repete beaucoup.
 */
let SAC = null;
export function catalogCards(data = CHARACTER_DATA) {
  if (data !== CHARACTER_DATA) return Object.values(cardIndex(data)).map(e => e.card);
  if (!SAC) SAC = Object.values(cardIndex(data)).map(e => e.card);
  return SAC;
}

/**
 * LA PILE DE FATIGUE — « les cartes qu'on pioche quand la pioche est vide ».
 * Une seule pile pour tout le jeu (`CHARACTER_DATA.fatigue`), editee dans le builder
 * comme un deck de PNJ : des lignes qui DESIGNENT une carte du catalogue, avec un
 * nombre d'exemplaires (qui pondere le tirage) et le niveau auquel la carte sort.
 *
 * Elle ne s'epuise pas : le moteur y tire au hasard et en fabrique une copie. On rend
 * donc les MODELES (`{ card, lvl, sprite }`), pas des cartes deja resolues — c'est le
 * tirage qui appelle `resolveCard`, pour que deux pioches ne partagent jamais le meme
 * objet (une carte en main se fait modifier : cout reduit, renfort...).
 */
export function fatiguePile(data = CHARACTER_DATA) {
  // Pas de cache a elle : elle passe par `cardEntry`, dont l'index est deja garde en
  // memoire. Le moteur la consulte a chaque pioche et a chaque fin de tour, mais une
  // pile fait quelques lignes — et comme rien n'est fige, remplir la pile suffit a
  // changer le jeu (le banc de test et la page d'equilibrage en dependent).
  const out = [];
  for (const ligne of data.fatigue || []) {
    const e = cardEntry(ligne.card, data);
    if (!e) continue;                                   // la validation le signale
    for (let i = 0; i < (ligne.n || 1); i++) {
      out.push({ card: e.card, lvl: Math.max(1, ligne.lvl || 1), sprite: e.card.sprite || spriteDe(e.ownerId, data) });
    }
  }
  return out;
}

/** Le sprite du personnage a qui appartient une carte, quand elle n'en a pas. */
function spriteDe(ownerId, data) {
  const ch = ownerId ? (data.characters || []).find(c => c.id === ownerId) : null;
  return ch ? ch.sprite : null;
}

/**
 * Le deck d'un PNJ deroule en vraies cartes (resolues a son niveau : un PNJ peut
 * jouer les cartes d'un heros a un niveau donne). Une carte introuvable est ignoree
 * — le builder la signale, le jeu ne plante pas pour autant.
 */
export function npcDeck(npc, data = CHARACTER_DATA) {
  const idx = cardIndex(data);
  const out = [];
  for (const ligne of npc.deck || []) {
    const e = idx[ligne.card];
    if (!e) continue;
    for (let i = 0; i < (ligne.n || 1); i++) {
      out.push({ ...resolveCard(e.card, npc.level || 1), sprite: e.card.sprite || npc.sprite });
    }
  }
  return out;
}

/** Le camp jouable d'un PNJ : ses statistiques et son deck. */
export function npcSide(id, data = CHARACTER_DATA) {
  const npc = (data.npcs || []).find(n => n.id === id);
  if (!npc) return null;
  return {
    name: npc.name, sprite: npc.sprite,
    hp: npc.hp, mana: npc.mana, hand: npc.hand,
    ia: npc.ia, deck: npcDeck(npc, data)
  };
}
