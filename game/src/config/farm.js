// GAME CONFIG — mini-jeu de Ferme (source unique de la monnaie C).
// Boucle : planter -> recolter -> poser a l'etale -> une vente passe toutes les 15 min
// et achete tout ce qui est en vente, au prix proportionnel a la rarete (GDD).
import { BALANCE } from './balance.js';

const SPECIES = [
  { id: 'carrot', name: 'Carotte', art: 'Carrot', building: 'Machines/Carrot Farm.png', mult: 1.0 },
  { id: 'nenuphar', name: 'Nenuphar', art: 'Nenuphar', building: 'Machines/Nenuphar Farm.png', mult: 1.25 },
  { id: 'nest', name: 'Nid', art: 'Nest', building: 'Machines/Nest Factory.png', mult: 1.6 },
  { id: 'pillow', name: 'Coussin', art: 'Pillow', building: 'Machines/Pillow Maker.png', mult: 2.1 }
];

// Un "plant" = une espece a un palier de rarete (Tier 1..6).
export const CROPS = [];
for (const s of SPECIES) {
  for (let tier = 1; tier <= 6; tier++) {
    CROPS.push({
      id: `${s.id}${tier}`,
      species: s.id,
      name: `${s.name} T${tier}`,
      tier,
      sprite: `Ressources/${s.art} Tier ${tier}.png`,
      building: s.building,
      // Un tier plus rare pousse plus lentement mais vaut nettement plus.
      growMs: Math.round(50000 * Math.pow(1.85, tier - 1)),
      price: Math.round(8 * s.mult * Math.pow(2.35, tier - 1))
      // Plus de niveau requis (spec du 16 octobre 2026) : une culture se TROUVE dans la nature (`estConnue`).
    });
  }
}

export const CROP_BY_ID = Object.fromEntries(CROPS.map(c => [c.id, c]));

/** Le joueur connait-il cette culture ? Les tiers bas d'office (`BALANCE.farm.tierLibre`), les autres une fois trouves. */
export const estConnue = (crop, discovered = {}) => crop.tier <= BALANCE.farm.tierLibre || !!discovered[crop.id];
