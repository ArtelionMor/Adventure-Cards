// Outil one-shot : extrait les personnages/cartes actuellement codes en dur vers
// game/data/characters.data.js, le fichier de donnees que le Card Builder edite.
// A relancer seulement si on veut re-generer les donnees depuis le code.
import { writeFileSync } from 'fs';
import { CHARACTERS, STARTERS } from '../game/src/config/characters.js';

const data = {
  version: 1,
  starters: STARTERS,
  customMechanics: [],
  characters: CHARACTERS.map(c => ({
    id: c.id, name: c.name, species: c.species, sprite: c.sprite, role: c.role,
    stats: c.stats,
    cards: c.cards.map(clean),
    switches: c.switches.map(clean)
  }))
};

function clean(card) {
  const o = { id: card.id, name: card.name, type: card.type, cost: card.cost };
  if (card.type === 'ally') { o.atk = card.atk; o.hp = card.hp; }
  o.keys = card.keys || [];
  o.text = card.text || '';
  o.play = (card.play || []).map(e => ({ ...e }));
  o.tiers = (card.tiers || []).map(t => ({ ...t }));
  return o;
}

const out = `// DONNEES DE JEU — genere et re-ecrit par le Card Builder (/builder/).
// Tu peux l'editer a la main, mais le builder est fait pour ca : ouvre-le plutot.
export const CHARACTER_DATA = ${JSON.stringify(data, null, 2)};
`;
writeFileSync(new URL('../game/data/characters.data.js', import.meta.url), out, 'utf8');
console.log(`${data.characters.length} personnages ecrits dans game/data/characters.data.js`);
