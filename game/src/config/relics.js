// GAME CONFIG — objets a passifs trouves en explorant l'overworld.
// Ce ne sont ni des cartes ni une monnaie (GDD) : des passifs permanents facon relics.
export const RELICS = [
  { id: 'coin', name: 'Piece Fetiche', sprite: 'UI/Coins.png',
    text: '+1 carte en main au debut du combat.', mod: { hand: 1 }, price: 25 },
  { id: 'dice', name: 'De en Bois', sprite: 'UI/Wooden dice.png',
    text: '+1 mana maximum.', mod: { mana: 1 }, price: 40 },
  { id: 'vault', name: 'Petit Coffre', sprite: 'UI/Vault.png',
    text: '+8 PV.', mod: { hp: 8 }, price: 30 },
  { id: 'tree', name: 'Rameau Ancien', sprite: 'UI/Tree.png',
    text: 'Commence chaque combat avec 5 armure.', mod: { armor: 5 }, price: 45 },
  { id: 'worker', name: 'Compagnon', sprite: 'UI/Worker.png',
    text: 'Une parcelle de Ferme pousse 25% plus vite.', mod: { farmSpeed: 0.25 }, price: 60 }
];

export const RELIC_BY_ID = Object.fromEntries(RELICS.map(r => [r.id, r]));

export function relicMods(save) {
  const m = { hp: 0, mana: 0, hand: 0, armor: 0, farmSpeed: 0 };
  for (const id of save.relics) {
    const r = RELIC_BY_ID[id];
    if (!r) continue;
    for (const k in r.mod) m[k] += r.mod[k];
  }
  return m;
}
