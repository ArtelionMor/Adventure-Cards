// BANC DES VFX DE CARTES — « chaque carte a SON animation, et elle va avec ce que la carte fait ».
//
//   node scripts/test-vfx.mjs
//
// Ce qu'il garde (game/src/ui/vfx.js) :
//   1. chacune des cartes des heros (base et switch) a une signature ECRITE dans `SIGNATURES`, et aucune signature ne
//      parle d'une carte qui n'existe pas (une faute de frappe dans un id ne se voit pas a l'ecran : la carte garde
//      simplement l'animation calculee) ;
//   2. toutes les signatures (telles que le jeu les lit : `signatureDe`) sont DIFFERENTES — c'est la promesse
//      « une animation unique par carte » ;
//   3. chaque brique citee existe (`creeBriques`) et a sa phrase dans `BRIQUES_DOC` (le wiki l'affiche) ;
//   4. la signature suit la carte : un allie a une entree ; un rale d'agonie, un debut/fin de tour, une regle
//      « quand X » ont leur animation ; Charge, Passe-Murailles et Venin s'animent a l'attaque ; une aura a son onde ;
//   5. les `vers` et `de` sont de ceux que l'ecran sait viser.
// Il ne joue aucune partie et n'ouvre aucun navigateur : il lit les donnees.
import { CHARACTERS } from '../game/src/config/characters.js';
import { SIGNATURES, BRIQUES_DOC, creeBriques, signatureDe } from '../game/src/ui/vfx.js';

const rouge = t => `\x1b[31m${t}\x1b[0m`;
const vert = t => `\x1b[32m${t}\x1b[0m`;
let passes = 0;
const echecs = [];
const verifie = (nom, ok, detail) => { if (ok) passes++; else echecs.push(`${nom} — ${detail}`); };

const cartes = [];
for (const h of CHARACTERS) for (const c of [...h.cards, ...(h.switches || [])]) cartes.push({ c, h });
const ids = new Set(cartes.map(x => x.c.id));

// Les briques qui existent : `creeBriques` ne touche pas au DOM tant qu'on ne joue rien.
const briques = Object.keys(creeBriques({ anime() {}, T: x => x, ephemere() {}, couche() {}, F: () => ({}) }));
const VERS = [undefined, 'ennemi', 'allies', 'ennemis', 'main', 'pioche', 'defausse', 'soi'];
const DE = [undefined, 'ennemi', 'pioche'];
const liste = e => (!e ? [] : Array.isArray(e[0]) ? e : [e]);

/** Toutes les entrees `[brique, options]` d'une signature, sous-signatures comprises. */
function entrees(sig) {
  const out = [];
  for (const champ of ['lancer', 'arrivee', 'soin', 'renfort', 'entree', 'attaque', 'mort', 'aura']) out.push(...liste(sig[champ]));
  for (const sub of Object.values(sig.declenche || {})) for (const champ of ['lancer', 'arrivee', 'soin', 'renfort', 'entree']) out.push(...liste(sub[champ]));
  return out;
}
/** L'empreinte d'une signature : du JSON a cles triees (deux signatures egales ont la meme). */
const empreinte = x => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(c => [c, v[c]])) : v));

console.log('\n=== Les VFX des cartes ===\n');

// --- 1. Une signature ecrite par carte, et rien d'autre.
for (const { c, h } of cartes) verifie(`${h.name} · ${c.name} a sa signature`, !!SIGNATURES[c.id], `ajouter « ${c.id} » dans SIGNATURES (game/src/ui/vfx.js)`);
for (const id of Object.keys(SIGNATURES)) verifie(`la signature « ${id} » parle d'une carte`, ids.has(id), 'aucune carte des heros n\'a cet identifiant (faute de frappe, ou carte renommee ?)');

// --- 2. Toutes differentes.
const vues = new Map();
for (const { c, h } of cartes) {
  const e = empreinte(signatureDe(c.id));
  verifie(`${h.name} · ${c.name} a une animation unique`, !vues.has(e), `meme signature que ${vues.get(e)}`);
  if (!vues.has(e)) vues.set(e, `${h.name} · ${c.name}`);
}

// --- 3. Des briques qui existent, et qui sont decrites.
for (const { c, h } of cartes) {
  const sig = signatureDe(c.id);
  for (const [nom] of entrees(sig)) {
    verifie(`${h.name} · ${c.name} : la brique « ${nom} » existe`, briques.includes(nom), 'elle n\'est pas dans creeBriques()');
    verifie(`${h.name} · ${c.name} : la brique « ${nom} » est decrite`, !!BRIQUES_DOC[nom], 'ajouter sa phrase dans BRIQUES_DOC');
  }
}
for (const nom of briques) verifie(`la brique « ${nom} » est decrite`, !!BRIQUES_DOC[nom], 'ajouter sa phrase dans BRIQUES_DOC');

// --- 4. La signature suit la carte.
for (const { c, h } of cartes) {
  const sig = signatureDe(c.id), d = sig.declenche || {};
  const nom = `${h.name} · ${c.name}`;
  const cles = (c.keys || []).map(k => String(k).split(':')[0]);
  if (c.type === 'ally') verifie(`${nom} : une entree`, liste(sig.entree).length > 0, 'un allie doit s\'animer quand il arrive');
  else verifie(`${nom} : un lancer`, liste(sig.lancer).length > 0 || liste(sig.arrivee).length > 0, 'un sort doit montrer ce qu\'il fait (lancer ou arrivee)');
  if ((c.death || []).length) verifie(`${nom} : sa mort s'anime`, liste(sig.mort).length > 0 && !!d.death, 'un rale d\'agonie : `mort` et `declenche.death`');
  if ((c.turnStart || []).length) verifie(`${nom} : son debut de tour s'anime`, !!d.turnStart, '`declenche.turnStart`');
  if ((c.turnEnd || []).length) verifie(`${nom} : sa fin de tour s'anime`, !!d.turnEnd, '`declenche.turnEnd`');
  if (Object.keys(c).some(k => k.startsWith('on_') && Array.isArray(c[k]) && c[k].length)) verifie(`${nom} : sa regle s'anime`, !!d.regle, '`declenche.regle`');
  if (cles.some(k => ['Charge', 'passe_murailles', 'Venin'].includes(k))) verifie(`${nom} : son attaque s'anime`, liste(sig.attaque).length > 0, 'Charge, Passe-Murailles ou Venin : `attaque`');
  if (c.aura) verifie(`${nom} : son aura s'anime`, liste(sig.aura).length > 0, '`aura`');
}

// --- 5. Des cibles que l'ecran connait.
for (const { c, h } of cartes) {
  const sig = signatureDe(c.id);
  const nom = `${h.name} · ${c.name}`;
  verifie(`${nom} : vers`, VERS.includes(sig.vers), `« ${sig.vers} » n'est pas une cible connue (${VERS.filter(Boolean).join(', ')})`);
  verifie(`${nom} : de`, DE.includes(sig.de), `« ${sig.de} » n'est pas un depart connu`);
  for (const sub of Object.values(sig.declenche || {})) verifie(`${nom} : vers d'un declenchement`, VERS.includes(sub.vers), `« ${sub.vers} » inconnu`);
}

for (const e of echecs) console.log(rouge('  ECHEC     ') + e);
if (!echecs.length) console.log(vert(`  ${cartes.length} cartes, ${vues.size} animations differentes, ${briques.length} briques.`));
console.log(`\n${passes} test(s) passe(s), ${echecs.length} echec(s).\n`);
process.exit(echecs.length ? 1 : 0);
