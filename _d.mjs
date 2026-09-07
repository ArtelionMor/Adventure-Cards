import { campPerso, campPnj, duel, wilson } from './game/src/tools/arene.js';
import { CHARACTER_DATA } from './game/data/characters.data.js';
const p = campPerso([(CHARACTER_DATA.starters||[])[0]], 5, 'cards');
// Le bot corrige contre lui-meme d'avant : meme deck des deux cotes, seul le bot change.
for (const niv of ['dur','montecarlo']) {
  let g=0, n=60;
  for (let i=0;i<n;i++){ const c=i%2===0; const {winner}=duel(p,p,{p:c?niv:niv, e:c?niv:niv}); if(winner===(c?'p':'e')) g++; }
  console.log(niv, 'symetrie', g+'/'+n);
}
