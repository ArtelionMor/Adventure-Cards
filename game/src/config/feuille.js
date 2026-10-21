// LA FEUILLE GOOGLE → LA GAME CONFIG.
//
// Le game designer regle certaines valeurs dans une Google Sheet (« Config Adventure-Cards »). Un outil
// (`scripts/sync-feuille.mjs`, ou la page « Feuille » de l'Atelier) lit la feuille et ecrit
// `game/data/feuille.data.js` ; ce module, pur (ni DOM ni reseau), dit comment ces lignes se posent
// sur `BALANCE`. Les valeurs par defaut restent dans `balance.js` : une ligne de feuille ne fait que les
// REMPLACER, et une ligne absente laisse la valeur par defaut.
//
// Regle de la feuille : tout ce qui commence par « ~ » (onglet, colonne, ligne) n'est PAS exporte.
//
// Onglets branches : « animations » (-> BALANCE.ui.fx) et « heroes » (-> statistiques des heros et adversaires,
// voir plus bas).
//
// Ce module sert a deux endroits, pour que le jeu et l'apercu disent la meme chose :
//   - `balance.js` l'applique au chargement (`applique`), `characters.js` aussi (`appliqueHeros`) ;
//   - le serveur et l'outil en ligne de commande l'interrogent avant d'ecrire (`planifie`).

/**
 * Ou un identifiant de la feuille peut tomber, dans l'ordre : `ui.fx`, `ui.fx.fin`, puis `combat` — mais
 * `combat` ne s'ouvre que sur `autoStepMs` (la pause du mode auto) : l'onglet « animations » ne doit pas
 * pouvoir changer par erreur un plafond ou une regle du combat.
 */
const COMBAT_OUVERT = ['autoStepMs'];
/** Une duree (`…Ms`) plus petite que ca est ecrite en SECONDES dans la feuille : aucune animation ne dure moins de 20 ms. */
const SECONDES_SOUS = 20;
function portes(racine) {
  const fx = racine && racine.ui && racine.ui.fx;
  const out = [];
  if (fx) out.push({ objet: fx }, { objet: fx.fin });
  if (racine && racine.combat) out.push({ objet: racine.combat, permis: COMBAT_OUVERT });
  return out.filter(p => p.objet && typeof p.objet === 'object');
}

/** « 0,58 », « 1 200 » ou 0.58 -> 0.58 ; null si ce n'est pas un nombre. */
function nombre(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const n = Number(v.trim().replace(/\s/g, '').replace(',', '.'));
  return v.trim() !== '' && Number.isFinite(n) ? n : null;
}

/**
 * Pour chaque ligne `{ id, value }` de la feuille : que se passe-t-il ?
 * `etat` : « change » (la valeur bouge), « identique », « inconnu » (l'identifiant n'existe pas dans la
 * config : une faute de frappe, ou une valeur pas encore codee) ou « invalide » (la valeur n'a pas la bonne forme).
 */
export function planifie(racine, lignes) {
  const out = [];
  for (const l of lignes || []) {
    const id = String(l.id);
    // Un identifiant designe une valeur (nombre, texte, liste), jamais un sous-groupe (`fin`).
    const porte = portes(racine).find(p => Object.prototype.hasOwnProperty.call(p.objet, id)
      && (!p.permis || p.permis.includes(id)) && (typeof p.objet[id] !== 'object' || Array.isArray(p.objet[id])));
    if (!porte) {
      out.push({ id, nom: l.name || '', avant: null, apres: l.value, etat: 'inconnu', raison: 'cet identifiant n\'existe pas dans la config des animations' });
      continue;
    }
    const avant = porte.objet[id];
    let apres;
    if (Array.isArray(avant)) {
      // une liste de nombres s'ecrit « 1, 2, 4 » dans une cellule
      const morceaux = typeof l.value === 'number' ? [l.value] : String(l.value).split(/[;,\s]+/).filter(Boolean).map(nombre);
      apres = morceaux.length && morceaux.every(n => n !== null) ? morceaux : null;
    } else if (typeof avant === 'number') apres = nombre(l.value);
    else apres = l.value;
    if (apres === null || apres === undefined || apres === '') {
      out.push({ id, nom: l.name || '', avant, apres: l.value, etat: 'invalide', raison: 'la valeur attendue est ' + (Array.isArray(avant) ? 'une liste de nombres' : typeof avant) });
      continue;
    }
    // UNE DUREE EN SECONDES : un identifiant en « Ms » attend des millisecondes, mais la feuille peut dire « 1.5 » pour une
    // seconde et demie — lu tel quel, c'etait un vol de carte de 1,5 ms, invisible (21 oct. 2026). Sous `SECONDES_SOUS`, la
    // valeur est donc lue en secondes, et l'apercu le dit.
    let raison;
    if (typeof apres === 'number' && /Ms$/.test(id) && apres > 0 && apres < SECONDES_SOUS) {
      raison = `lu en secondes : ${apres} s = ${Math.round(apres * 1000)} ms`;
      apres = Math.round(apres * 1000);
    }
    const meme = JSON.stringify(apres) === JSON.stringify(avant);
    out.push({ id, nom: l.name || '', avant, apres, etat: meme ? 'identique' : 'change', objet: porte.objet, ...(raison ? { raison } : {}) });
  }
  return out;
}

/** Pose les lignes de la feuille sur `BALANCE` (celles qui sont valides). Rend le plan. */
export function applique(racine, lignes) {
  const plan = planifie(racine, lignes);
  for (const p of plan) if (p.etat === 'change') p.objet[p.id] = p.apres;
  return plan;
}

// ------------------------------------------------------------------ onglet « heroes »
// Decision du game designer (16 octobre 2026) : la feuille commande les STATISTIQUES des heros et des
// adversaires (nom, image, PV, mana max, archetype) ; le Card Builder garde les CARTES. Une ligne = un heros
// (`characters`) ou un adversaire (`npcs`), designe par l'identifiant du jeu. Une case vide laisse la valeur
// du builder. `heroes_kin` et `is_hero` ne se posent sur rien : l'espece d'un heros (`species`) range les
// familles de l'ecran d'equipe (config/familles.js), elle reste au builder.

/** Colonne de la feuille -> champ du heros (`h`) ou de l'adversaire (`n`), et la forme attendue. */
export const COLONNES_HEROS = {
  name:          { h: ['name'],        n: ['name'],      forme: 'texte',  nom: 'nom' },
  sprite:        { h: ['sprite'],      n: ['sprite'],    forme: 'sprite', nom: 'image' },
  PV_Max:        { h: ['stats', 'hp'], n: ['hp'],        forme: 'nombre', nom: 'PV' },
  Mana_Max:      { h: ['stats', 'mana'], n: ['mana'],    forme: 'nombre', nom: 'mana max' },
  deck_category: { h: ['archetype'],   n: ['archetype'], forme: 'texte',  nom: 'archetype' }
};

/** Le dossier des portraits : un sous-dossier par espece (« Graphical Assets/Characters/Dog/Dog Cocker.png »). */
export const DOSSIER_PERSONNAGES = 'Graphical Assets/Characters';

/**
 * « Dog German Shepherd » -> « Graphical Assets/Characters/Dog/Dog German Shepherd.png » : un nom nu (avec ou sans
 * `.png`) est cherche dans les sous-dossiers d'espece de `sprites` (`SPRITES` de game/data/sprites.js), pour que la
 * feuille n'ait pas a savoir ou l'image est rangee. Un chemin complet est garde tel quel ; un nom introuvable donne un
 * chemin a la racine du dossier, que la validation refuse.
 */
export function cheminPersonnage(v, sprites = null) {
  if (/[/\\]/.test(v)) return v;
  const nom = /\.png$/i.test(v) ? v : `${v}.png`;
  const trouve = ((sprites && sprites[DOSSIER_PERSONNAGES]) || []).find(f => f.split('/').pop() === nom);
  return `${DOSSIER_PERSONNAGES}/${trouve || nom}`;
}

/** Le parent du champ et sa cle, en creant les objets intermediaires (`stats`). */
function champ(objet, chemin) {
  let o = objet;
  for (const k of chemin.slice(0, -1)) o = o[k] = o[k] && typeof o[k] === 'object' ? o[k] : {};
  return { parent: o, cle: chemin[chemin.length - 1] };
}

/**
 * Pour chaque case remplie de l'onglet « heroes » : que se passe-t-il ? Memes `etat` que `planifie`. L'`id` d'une
 * entree est `<id du heros>.<colonne>`. `sprites` (facultatif, `SPRITES` de game/data/sprites.js) : une image
 * absente de la liste est refusee (« invalide ») plutot que de laisser un portrait vide en jeu.
 */
export function planifieHeros(donnees, lignes, sprites = null) {
  const out = [];
  const images = sprites ? new Set(Object.entries(sprites).flatMap(([d, fs]) => fs.map(f => `${d}/${f}`))) : null;
  for (const l of lignes || []) {
    const id = String(l.id);
    const heros = (donnees.characters || []).find(c => c.id === id);
    const pnj = heros ? null : (donnees.npcs || []).find(n => n.id === id);
    const cible = heros || pnj;
    for (const [col, def] of Object.entries(COLONNES_HEROS)) {
      if (l[col] === undefined || l[col] === '') continue;
      const ent = { id: `${id}.${col}`, nom: `${(cible && cible.name) || l.name || id} · ${def.nom}` };
      if (!cible) { out.push({ ...ent, avant: null, apres: l[col], etat: 'inconnu', raison: `aucun heros ni adversaire « ${id} » dans les donnees du builder` }); continue; }
      const lu = (heros ? def.h : def.n).reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), cible);
      const avant = lu === undefined ? null : lu;
      let apres = def.forme === 'nombre' ? nombre(l[col]) : String(l[col]).trim();
      if (def.forme === 'sprite' && apres) apres = cheminPersonnage(apres, sprites);
      let raison = null;
      if (apres === null || apres === '') raison = 'la valeur attendue est ' + (def.forme === 'nombre' ? 'un nombre' : 'un texte');
      else if (def.forme === 'nombre' && !(apres > 0)) raison = 'il faut un nombre plus grand que 0';
      else if (def.forme === 'sprite' && images && !images.has(apres)) raison = `l'image ${apres} n'est pas dans la liste (Card Builder : 🔄 Actualiser les images)`;
      if (raison) { out.push({ ...ent, avant, apres: l[col], etat: 'invalide', raison }); continue; }
      out.push({ ...ent, avant, apres, etat: JSON.stringify(avant) === JSON.stringify(apres) ? 'identique' : 'change', cible, chemin: heros ? def.h : def.n });
    }
  }
  return out;
}

/** Pose l'onglet « heroes » sur les donnees (mutees en place, et rendues). Idempotent. */
export function appliqueHeros(donnees, lignes, sprites = null) {
  if (!donnees || !lignes || !lignes.length) return donnees;
  for (const p of planifieHeros(donnees, lignes, sprites)) {
    if (p.etat !== 'change') continue;
    const { parent, cle } = champ(p.cible, p.chemin);
    parent[cle] = p.apres;
  }
  return donnees;
}

// ------------------------------------------------------------------ onglet « encounters »
// `power_needed` : la PUISSANCE d'equipe (state.js, `puissanceEquipe`) qu'il faut pour lancer ce combat
// (decision du 16 octobre 2026). Une ligne = un adversaire (son identifiant) ; elle se pose sur le point
// d'interet du monde qui le porte (`enemy`, config/world.js) sous le nom `reqPower`. Un combat sans ligne garde
// son verrou de niveau (`reqLevel`).

/** Pour chaque ligne de l'onglet « encounters » : que se passe-t-il ? Memes `etat` que `planifie`. */
export function planifieRencontres(nodes, lignes) {
  const out = [];
  for (const l of lignes || []) {
    if (l.power_needed === undefined || l.power_needed === '') continue;
    const id = String(l.id);
    const points = (nodes || []).filter(n => n.enemy === id);
    const ent = { id: `${id}.power_needed`, nom: `${(points[0] && points[0].name) || id} · puissance requise` };
    if (!points.length) { out.push({ ...ent, avant: null, apres: l.power_needed, etat: 'inconnu', raison: `aucun combat contre « ${id} » sur la carte du monde (config/world.js)` }); continue; }
    const apres = nombre(l.power_needed);
    if (apres === null || apres < 0) { out.push({ ...ent, avant: points[0].reqPower ?? null, apres: l.power_needed, etat: 'invalide', raison: 'la valeur attendue est un nombre positif ou nul' }); continue; }
    const avant = points[0].reqPower ?? null;
    out.push({ ...ent, avant, apres, etat: avant === apres ? 'identique' : 'change', points });
  }
  return out;
}

/** Pose l'onglet « encounters » sur les points d'interet du monde (mutes en place). */
export function appliqueRencontres(nodes, lignes) {
  for (const p of planifieRencontres(nodes, lignes)) if (p.etat === 'change') for (const n of p.points) n.reqPower = p.apres;
  return nodes;
}

// Les TEXTES DE LA FICHE D'ARENE (spec du 16 octobre 2026) : `role`, `archetype` (« Aggro Tempo », « Contrôle
// Pillow Fort »), `question`, `reponse` (la strategie optimale), `punit` et `heros_conseilles` (« dog, frog (Médor,
// Patou, Bulle) » : les noms entre parentheses designent les heros, sinon les identifiants ; « tous » = aucun en
// particulier). Tous facultatifs : une case vide laisse le texte de config/arenes.js.

const sansAccent = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** « Contrôle Pillow Fort » -> { archetype: 'Contrôle', sousArchetype: 'Pillow Fort' }. */
function decoupeArchetype(v) {
  const mots = String(v).trim().split(/\s+/);
  const tete = sansAccent(mots[0]);
  const archetype = tete.startsWith('control') ? 'Contrôle' : tete === 'aggro' ? 'Aggro' : tete === 'combo' ? 'Combo' : mots[0];
  return { archetype, sousArchetype: mots.slice(1).join(' ') || null };
}

/** « dog, frog (Médor, Patou, Bulle) » -> ['dog', 'dog3', 'frog'] (les heros connus seulement). */
export function herosDepuisTexte(v, characters = []) {
  const s = String(v || '').trim();
  if (!s || sansAccent(s) === 'tous') return [];
  const par = s.match(/\(([^)]*)\)/);
  const noms = (par ? par[1] : s).split(/[,;/]+/).map(x => x.trim()).filter(Boolean);
  const out = [];
  for (const n of noms) {
    const c = characters.find(h => h.id === n || sansAccent(h.name) === sansAccent(n));
    if (c && !out.includes(c.id)) out.push(c.id);
  }
  return out;
}

/** Pose les colonnes de fiche de l'onglet « encounters » sur les arenes (mutees en place). Une case vide ne change rien. */
export function appliqueArenes(arenes, lignes, characters = []) {
  for (const l of lignes || []) {
    const a = (arenes || []).find(x => x.ennemi === String(l.id) || x.id === String(l.id));
    if (!a) continue;
    const plein = k => l[k] !== undefined && String(l[k]).trim() !== '';
    if (plein('role')) a.role = String(l.role).trim();
    if (plein('archetype')) Object.assign(a, decoupeArchetype(l.archetype));
    for (const k of ['question', 'reponse', 'punit']) if (plein(k)) a[k] = String(l[k]).trim();
    if (plein('heros_conseilles')) a.herosConseilles = herosDepuisTexte(l.heros_conseilles, characters);
  }
  return arenes;
}

/** La feuille regle-t-elle ce champ ? (`colonne` : une cle de COLONNES_HEROS) — le builder grise la case. */
export const reglePar = (lignes, id, colonne) => (lignes || []).some(l => String(l.id) === id && l[colonne] !== undefined && l[colonne] !== '');

// ------------------------------------------------------------------ le TUTORIEL : onglets « quests », « tutorial_guide », « start »
// Demande du game designer (21 octobre 2026) : tout le deroule du tutoriel se regle dans la feuille (docs/TUTORIEL.md).
// Quand un onglet a des lignes, il REMPLACE la valeur du code (le fil de quetes entier, les etapes d'un guide) ; sans
// lignes, le code garde la sienne (config/quetes.js, config/guide.js, `BALANCE.depart`). Une ligne invalide est ecartee
// (le jeu ne s'y bloque pas) et l'apercu de l'Atelier dit pourquoi (`verifieQuetes`, `verifieGuide`, `verifieDepart`).

const vrai = v => v === true || v === 1 || /^(true|vrai|oui|x|1)$/i.test(String(v || '').trim());
const plein = v => v !== undefined && v !== null && String(v).trim() !== '';
const texte = v => (plein(v) ? String(v).trim() : undefined);
/** Les objectifs d'une quete (state.js, `progresQuete`) : un ETAT relu dans la sauvegarde, ou un EVENEMENT compte. */
export const OBJECTIFS_DE_QUETE = ['arene', 'equipe', 'victoire', 'ameliore', 'switch', 'plante', 'vend'];
/** Ce que peut pointer une bulle du guide (ui/guide.js) et les etapes dont il connait le moment. */
export const CIBLES_DU_GUIDE = ['carte', 'unite', 'heros', 'fin', 'pioche', 'auto'];
export const ETAPES_DU_GUIDE = ['poser', 'attaque', 'heros', 'fin', 'fatigue', 'auto'];

/**
 * Onglet « quests » : une ligne = une quete, dans l'ordre du fil. Colonnes : id, chapitre, titre, texte, objectif
 * (arene | equipe | victoire | ameliore | switch | plante | vend), arene, niveau, heros, n, equipe_min, pieces, sceaux,
 * fanions, gemmes, heros_offert, places, guide, fin_tutoriel. Rend la ligne au format de config/quetes.js.
 */
export function queteDepuisLigne(l) {
  const n = k => (plein(l[k]) ? nombre(l[k]) : undefined);
  const ote = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== 0));
  const q = {
    id: String(l.id).trim(), chapitre: n('chapitre') || 1, titre: texte(l.titre) || '', texte: texte(l.texte) || '',
    objectif: ote({ quoi: texte(l.objectif), arene: texte(l.arene), niveau: n('niveau'), heros: texte(l.heros), n: n('n'), equipe: n('equipe_min') }),
    recompense: ote({ C: n('pieces'), B: n('sceaux'), A: n('fanions'), G: n('gemmes'), heros: texte(l.heros_offert), place: n('places') })
  };
  if (plein(l.guide)) q.guide = texte(l.guide);
  if (vrai(l.fin_tutoriel)) q.finTutoriel = true;
  return q;
}

/** Les lignes de « quests » qui ne peuvent pas marcher : `[{ id, raison }]`. `connus` : { heros: Set, arenes: Set }. */
export function verifieQuetes(lignes, connus = {}) {
  const out = [], vus = new Set();
  for (const l of lignes || []) {
    const q = queteDepuisLigne(l), o = q.objectif, faute = r => out.push({ id: q.id, raison: r });
    if (vus.has(q.id)) faute('identifiant en double');
    vus.add(q.id);
    if (!OBJECTIFS_DE_QUETE.includes(o.quoi)) { faute(`objectif « ${o.quoi || ''} » inconnu (${OBJECTIFS_DE_QUETE.join(', ')})`); continue; }
    if (o.quoi === 'arene' && !(o.arene && o.niveau)) faute('un objectif « arene » demande une arene et un niveau');
    if (o.quoi === 'arene' && connus.arenes && !connus.arenes.has(o.arene)) faute(`arene « ${o.arene} » inconnue`);
    if (o.quoi === 'equipe' && !(o.heros && (!connus.heros || connus.heros.has(o.heros)))) faute(`heros « ${o.heros || ''} » inconnu`);
    if (q.recompense.heros && connus.heros && !connus.heros.has(q.recompense.heros)) faute(`heros offert « ${q.recompense.heros} » inconnu`);
    if (!q.titre) faute('pas de titre');
  }
  return out;
}

/** Le fil de quetes de la feuille (les lignes valides, dans l'ordre), ou `null` si l'onglet est vide. */
export function quetesDepuisFeuille(lignes, connus = {}) {
  if (!lignes || !lignes.length) return null;
  const mauvaises = new Set(verifieQuetes(lignes, connus).map(x => x.id));
  return lignes.map(queteDepuisLigne).filter(q => !mauvaises.has(q.id));
}

/**
 * Onglet « tutorial_guide » : une ligne = une bulle, dans l'ordre de priorite. Colonnes : id (l'etape : poser, attaque,
 * heros, fin, fatigue, auto), guide (« premierCombat »), cible, texte, duree_s (une information : sa duree en secondes).
 */
export function verifieGuide(lignes) {
  const out = [];
  for (const l of lignes || []) {
    const id = String(l.id).trim(), faute = r => out.push({ id, raison: r });
    if (!ETAPES_DU_GUIDE.includes(id)) faute(`etape inconnue (${ETAPES_DU_GUIDE.join(', ')})`);
    if (!CIBLES_DU_GUIDE.includes(texte(l.cible))) faute(`cible « ${texte(l.cible) || ''} » inconnue (${CIBLES_DU_GUIDE.join(', ')})`);
    if (!texte(l.texte)) faute('pas de texte');
  }
  return out;
}

/** Les guides de la feuille `{ guide: [etapes] }`, ou `null` si l'onglet est vide. */
export function guidesDepuisFeuille(lignes) {
  if (!lignes || !lignes.length) return null;
  const mauvaises = new Set(verifieGuide(lignes).map(x => x.id));
  const out = {};
  for (const l of lignes) {
    const id = String(l.id).trim();
    if (mauvaises.has(id)) continue;
    const g = texte(l.guide) || 'premierCombat';
    const d = plein(l.duree_s) ? nombre(l.duree_s) : null;
    (out[g] = out[g] || []).push({ id, cible: texte(l.cible), texte: texte(l.texte), ...(d ? { dureeMs: Math.round(d * 1000) } : {}) });
  }
  return out;
}

/**
 * Onglet « start » : les valeurs de DEPART d'une partie, une ligne = une valeur (`id`, `value`). Ids : places, pieces,
 * sceaux, fanions, gemmes, heros_depart (« lapin1 » ou « lapin1, lapin2 »), deck_minimum.
 */
const DEPART = {
  places: (b, v) => { b.depart.places = v; }, pieces: (b, v) => { b.depart.monnaies.C = v; }, sceaux: (b, v) => { b.depart.monnaies.B = v; },
  fanions: (b, v) => { b.depart.monnaies.A = v; }, gemmes: (b, v) => { b.depart.monnaies.G = v; }, deck_minimum: (b, v) => { b.decks.tailleMin = v; }
};
export function verifieDepart(lignes) {
  const out = [];
  for (const l of lignes || []) {
    const id = String(l.id).trim();
    if (id === 'heros_depart') { if (!texte(l.value)) out.push({ id, raison: 'pas de heros' }); continue; }
    if (!DEPART[id]) out.push({ id, raison: `inconnu (${[...Object.keys(DEPART), 'heros_depart'].join(', ')})` });
    else if (nombre(l.value) === null || nombre(l.value) < 0) out.push({ id, raison: 'un nombre positif est attendu' });
  }
  return out;
}
/** Pose l'onglet « start » sur BALANCE (`depart`, `decks.tailleMin`) ; une ligne invalide est ecartee. */
export function appliqueDepart(balance, lignes) {
  const mauvaises = new Set(verifieDepart(lignes).map(x => x.id));
  for (const l of lignes || []) {
    const id = String(l.id).trim();
    if (mauvaises.has(id)) continue;
    if (id === 'heros_depart') balance.depart.heros = String(l.value).split(/[,;\s]+/).filter(Boolean);
    else DEPART[id](balance, nombre(l.value));
  }
  return balance;
}
