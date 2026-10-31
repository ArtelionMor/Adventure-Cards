// Etat de sauvegarde + regles de progression hors combat.
import { BALANCE } from './config/balance.js';
import { CHARACTERS, CHAR_BY_ID, STARTERS, etapesDe, niveauMax, niveauDePalier, niveauDepuisAncien } from './config/characters.js';
import { WORLD } from './config/world.js';
import { ARENES, ARENE_PAR_ID, FONDS } from './config/arenes.js';
import { NIVEAU_MAX_PROFIL, recompensesDuNiveau } from './config/profil.js';
import { QUETES, QUETE_PAR_ID } from './config/quetes.js';

const KEY = BALANCE.save.key;
// Les heros donnes au depart : l'onglet « start » de la feuille s'il en nomme (`BALANCE.depart.heros`), le builder sinon.
const herosDeDepart = () => (BALANCE.depart.heros || STARTERS).filter(id => CHAR_BY_ID[id]);

function freshChars() {
  const o = {};
  for (const c of CHARACTERS) {
    o[c.id] = {
      owned: herosDeDepart().includes(c.id),   // le heros du depart (Pompon), le tutoriel donne les autres
      level: 1,                         // 1 + le nombre d'ameliorations faites (une par palier : etapesDe)
      switches: [false, false, false, false, false], // 1 alternative par slot de carte
      bossBeaten: false                 // le boss ouvre l'ELIGIBILITE a l'achat
    };
  }
  return o;
}

export function freshSave() {
  const now = Date.now();
  return {
    v: 3,                               // 2 : le niveau d'un heros compte ses ameliorations (12 octobre 2026)
                                        // 3 : arenes, champ en grille, profil du joueur (16 octobre 2026)
    createdAt: now,
    lastSeen: now,
    // Monnaies. C = les pieces (ameliorations), G = les gemmes : les deux s'affichent dans la barre du haut
    // (maquette « Deck Screen », 12 octobre 2026).
    cur: { ...BALANCE.depart.monnaies },
    chars: freshChars(),
    team: herosDeDepart().slice(0, 3),
    // Une place au depart (`BALANCE.depart`) : le tutoriel (docs/TUTORIEL.md) ouvre les autres par ses quetes.
    rosterSlots: BALANCE.depart.places,
    world: {
      px: WORLD.spawn.x + 0.5,
      py: WORLD.spawn.y + 0.5,
      cleared: {},                      // nodeId -> true
      seen: {},                         // nodeId -> true : une arene vue apparait dans l'onglet « Arene »
      carte: WORLD.version              // la carte sur laquelle (px, py) a un sens
    },
    // Les ARENES : { [id]: { niveau, victoires, defaites, meilleur } } — `meilleur` = le plus haut niveau battu.
    arenes: {},
    // Les DECKS ENREGISTRES : [{ nom, team, switches: { heros: [5 booleens] }, retraits: { heros: [emplacements] } }].
    decks: [],
    // Les cartes RETIREES avec un joker : { heros: [emplacements] } (config/characters.js, `characterDeck`).
    retraits: {},
    // Le PROFIL DU JOUEUR (config/profil.js) : son niveau, son XP vers le suivant, ses jokers de retrait, et le FOND de
    // ses combats (`null` = celui de l'arene ; un fond debloque sinon : `fondsDebloques`).
    profil: { niveau: 1, xp: 0, jokersRetrait: 0, fond: null },
    farm: {
      // Le CHAMP EN GRILLE : une case = null ou { cropId, at } ; seules les `caseCount` premieres sont ouvertes.
      caseCount: BALANCE.farm.casesDeDepart,
      cases: Array(BALANCE.farm.grille.cols * BALANCE.farm.grille.rows).fill(null),
      discovered: {},                   // cropId -> true : une culture trouvee dans la nature (points « cueillette »)
      stallSlots: BALANCE.farm.startStallSlots,
      stall: Array(BALANCE.farm.maxStallSlots).fill(null), // cropId
      basket: {},                       // cropId -> quantite recoltee
      nextSaleAt: now + BALANCE.farm.saleIntervalMs,
      totalEarned: 0
    },
    relics: [],
    // Le FIL DE QUETES (config/quetes.js) : la quete en cours (`null` = fil fini), ce qu'elle a compte depuis son
    // debut (ses evenements), et les quetes faites.
    quetes: { courante: QUETES[0].id, compte: 0, faites: [] },
    flags: { tutorial: false },
    log: []
  };
}

export const save = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshSave();
    const s = JSON.parse(raw);
    // Migration douce : on complete les champs manquants sans casser la partie.
    const neuve = freshSave();
    // Un heros ajoute au jeu depuis cette sauvegarde (les V3) n'y a pas d'entree : on la cree
    // vierge, sinon l'ecran du deck plante sur `save.chars[id].owned`. Les heros deja connus
    // gardent tout ce qu'ils avaient, champ par champ (un champ ajoute ensuite recoit son defaut).
    const chars = { ...neuve.chars };
    for (const id of Object.keys(chars)) if (s.chars && s.chars[id]) chars[id] = { ...chars[id], ...s.chars[id] };
    // v1 -> v2 : l'ancien niveau L devient « toutes les etapes de palier <= L faites ». Le heros garde exactement
    // ses cartes ; il affiche seulement un plus grand nombre.
    if ((s.v || 1) < 2) for (const id of Object.keys(chars)) chars[id].level = niveauDepuisAncien(CHAR_BY_ID[id], chars[id].level || 1);
    // Une sauvegarde d'avant les QUETES (21 octobre 2026) saute le tutoriel (docs/TUTORIEL.md, decision 14) : elle
    // recoit les Lapins et commence au fil d'apres. Les quetes qui offrent un heros qu'elle a deja seront sautees.
    let quetes = s.quetes;
    if (!quetes) {
      for (const id of ['lapin1', 'lapin2', 'lapin3']) if (chars[id]) chars[id].owned = true;
      const fin = QUETES.findIndex(q => q.finTutoriel);
      quetes = { courante: (QUETES[fin + 1] || {}).id || null, compte: 0, faites: QUETES.slice(0, fin + 1).map(q => q.id) };
    }
    const rosterSlots = Math.max(s.rosterSlots || 1, neuve.rosterSlots);
    // Les places vides se remplissent avec les heros possedes : on ne part plus jamais seul (dans les places ouvertes).
    const equipe = [...(s.team || neuve.team)].slice(0, Math.max(rosterSlots, 1));
    for (let i = 0; i < Math.min(3, rosterSlots); i++) if (!equipe[i]) equipe[i] = Object.keys(chars).find(id => chars[id].owned && !equipe.includes(id)) || null;
    return {
      ...neuve, ...s, v: neuve.v, chars, team: equipe, farm: migreFerme(neuve.farm, s.farm || {}),
      world: migreMonde(neuve.world, s.world || {}),
      cur: { ...neuve.cur, ...s.cur },
      profil: { ...neuve.profil, ...s.profil },
      quetes: { ...neuve.quetes, ...quetes, faites: [...(quetes.faites || [])] },
      rosterSlots
    };
  } catch {
    return freshSave();
  }
}

/**
 * v2 -> v3 : les PARCELLES (`plots`, `plotCount`) deviennent les premieres CASES du champ en grille, sans perte : une
 * parcelle plantee garde sa culture et son heure. Les cases ouvertes ne sont jamais moins nombreuses qu'avant.
 */
function migreFerme(neuve, f) {
  const out = { ...neuve, ...f };
  const n = neuve.cases.length;
  const cases = Array.isArray(f.cases) ? f.cases.slice(0, n) : [];
  while (cases.length < n) cases.push(null);
  if (Array.isArray(f.plots)) {
    const plantees = f.plots.filter(Boolean);
    for (const p of plantees) { const i = cases.indexOf(null); if (i >= 0) cases[i] = p; }
    out.caseCount = Math.max(neuve.caseCount, f.plotCount || 0, plantees.length);
  }
  out.cases = cases;
  out.caseCount = Math.min(n, Math.max(out.caseCount || 0, neuve.caseCount));
  out.discovered = { ...(f.discovered || {}) };
  delete out.plots;
  delete out.plotCount;
  return out;
}

/** Une sauvegarde faite sur une autre carte (`WORLD.version`) repart de l'apparition : ses coordonnees ne voudraient rien dire. */
function migreMonde(neuve, w) {
  const out = { ...neuve, ...w, cleared: { ...(w.cleared || {}) }, seen: { ...(w.seen || {}) } };
  if (w.carte !== WORLD.version) { out.px = neuve.px; out.py = neuve.py; out.carte = WORLD.version; }
  return out;
}

export function persist() {
  if (figee) return;
  save.lastSeen = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch {}
}

// Avant de recharger la page apres avoir touche au stockage : sinon la sauvegarde de `beforeunload` reecrirait la partie en memoire.
let figee = false;
export const sauvegardeFigee = () => figee;

/** Remplace les deux sauvegardes (jeu, boutique ; null les efface) et repart de la. */
export function rechargeAvec(jeu = null, boutique = null) {
  figee = true;
  for (const [cle, v] of [[KEY, jeu], [BALANCE.save.cleBoutique, boutique]]) {
    if (v === null) localStorage.removeItem(cle); else localStorage.setItem(cle, v);
  }
  location.reload();
}

export const resetSave = () => rechargeAvec();

/** La sauvegarde telle qu'elle est stockee : la console de triche la copie et en fait des points de retour. */
export const sauvegardeBrute = () => {
  persist();
  return { jeu: localStorage.getItem(KEY), boutique: localStorage.getItem(BALANCE.save.cleBoutique) };
};

// ---------------------------------------------------------------- monnaies
export function gain(kind, n) {
  save.cur[kind] = (save.cur[kind] || 0) + n;
}
export function spend(kind, n) {
  if ((save.cur[kind] || 0) < n) return false;
  save.cur[kind] -= n;
  return true;
}

// ------------------------------------------------------------- personnages
export const team = () => save.team.filter(Boolean);

/**
 * Niveau de reference pour les verrous de l'overworld : le meilleur de l'equipe, sur l'echelle des PALIERS (celle
 * des rencontres), pas en nombre d'ameliorations. Les verrous passeront a la puissance (`puissanceEquipe`).
 */
export function partyLevel() {
  const t = team();
  return t.length ? Math.max(...t.map(id => niveauDePalier(CHAR_BY_ID[id], save.chars[id].level))) : 1;
}

/**
 * Le cout de l'etape d'index `k` d'un heros (en pieces). L'economie d'avant est gardee : passer du palier P' au
 * palier P coutait la somme de `charUpgrade(L)` pour L de P' a P-1 ; cette somme se partage entre les etapes de
 * palier P. Atteindre un palier coute donc toujours la meme chose qu'avant, en plusieurs fois.
 */
export function coutEtape(heros, k) {
  const etapes = etapesDe(heros);
  const e = etapes[k];
  if (!e) return null;
  const avant = etapes.filter(x => x.lvl < e.lvl);
  const depuis = avant.length ? avant[avant.length - 1].lvl : 1;
  let total = 0;
  for (let L = depuis; L < e.lvl; L++) total += BALANCE.costs.charUpgrade(L);
  return Math.max(1, Math.round(total / etapes.filter(x => x.lvl === e.lvl).length));
}

export function upgradeCost(charId) {
  return coutEtape(CHAR_BY_ID[charId], save.chars[charId].level - 1);
}

/** La puissance d'un heros, et celle de l'equipe : `BALANCE.progression.puissance`. */
export function puissance(charId, niveau = save.chars[charId].level) {
  const p = BALANCE.progression.puissance;
  return p.base + p.parAmelioration * (niveau - 1);
}
// L'equipe alignee : chaque heros compte comme un heros debloque (`nouveauHeros`) plus ses ameliorations. C'est elle
// que la fiche d'arene compare a la puissance conseillee.
export const puissanceEquipe = () => team().reduce((n, id) => n + BALANCE.progression.puissance.gains.nouveauHeros + puissance(id), 0);

/**
 * LA PUISSANCE DU JOUEUR (annexe « puissance » de la spec du 16 octobre 2026) : part de 0 et ne fait que monter ;
 * c'est la somme des points de tout ce qu'il a debloque ou ameliore — chaque heros possede (`nouveauHeros`), chaque
 * amelioration de ses heros (`amelioration`), chaque relique (`nouveauTrinket`), et les deblocages du profil (une
 * place d'equipe, un joker). Les points sont dans `BALANCE.progression.puissance` (`~settings.increase_power`). Elle
 * ne verrouille rien : la fiche d'arene la compare a la puissance conseillee.
 */
export function puissanceJoueur() {
  const p = BALANCE.progression.puissance;
  const g = p.gains;
  let n = p.base;
  for (const id of Object.keys(save.chars)) if (save.chars[id].owned) n += g.nouveauHeros + puissance(id) - p.base;
  n += g.nouveauTrinket * (save.relics || []).length;
  for (let niv = 2; niv <= ((save.profil && save.profil.niveau) || 1); niv++) {
    for (const r of recompensesDuNiveau(niv)) if (r.type !== 'heros') n += g.amelioration * (r.n || 1);
  }
  return n;
}

/**
 * Le verrou d'un point d'interet du monde : `{ ouvert, sorte, requis, actuel }`. Un combat qui a une puissance requise
 * (`reqPower`, posee par la Google Sheet : onglet « encounters ») se compare a la puissance de l'equipe ; les autres
 * (passages, combats sans ligne dans la feuille) gardent le niveau d'equipe (`reqLevel`, `partyLevel`).
 */
export function verrouDe(n) {
  if (n.reqPower != null) { const actuel = puissanceEquipe(); return { ouvert: actuel >= n.reqPower, sorte: 'puissance', requis: n.reqPower, actuel }; }
  const actuel = partyLevel();
  return { ouvert: !n.reqLevel || actuel >= n.reqLevel, sorte: 'niveau', requis: n.reqLevel || 0, actuel };
}

export function upgradeChar(charId) {
  const st = save.chars[charId];
  if (st.level >= niveauMax(CHAR_BY_ID[charId])) return 'max';
  const cost = upgradeCost(charId);
  if (!spend('C', cost)) return 'poor';
  st.level++;
  signale('ameliore');
  persist();
  return 'ok';
}

export function buySwitch(charId, slot) {
  const st = save.chars[charId];
  if (st.switches[slot]) return 'owned';
  if (!spend('B', BALANCE.costs.switchCard)) return 'poor';
  st.switches[slot] = true;
  signale('switch');
  persist();
  return 'ok';
}

export function toggleSwitch(charId, slot) {
  // Une fois la carte switch achetee, on peut basculer librement entre les deux faces.
  const st = save.chars[charId];
  st.switches[slot] = !st.switches[slot];
  persist();
}

/**
 * Le heros est-il a toi ? Sa sauvegarde le dit (`owned`), ou le reglage provisoire `BALANCE.toutDebloque` (en attendant
 * la nouvelle carte : tous les heros), qui ne l'ECRIT PAS : remis a false, chaque partie retrouve les heros qu'elle a
 * gagnes. Le fil de quetes lit `owned`, pas ceci : une quete qui offre un heros se fait toujours. L'interface demande ici.
 */
export const possede = id => !!(save.chars[id] && (save.chars[id].owned || BALANCE.toutDebloque));

export function unlockChar(charId) {
  const st = save.chars[charId];
  if (st.owned) return 'owned';
  if (!st.bossBeaten) return 'boss';   // le boss gate l'eligibilite
  if (!spend('A', BALANCE.costs.charUnlock)) return 'poor'; // la monnaie A gate l'achat
  st.owned = true;
  persist();
  return 'ok';
}

export function buyRosterSlot() {
  if (save.rosterSlots >= 3) return 'max';
  const cost = BALANCE.costs.rosterSlots[save.rosterSlots];
  if (!spend('C', cost)) return 'poor';
  save.rosterSlots++;
  persist();
  return 'ok';
}

export function setTeamSlot(slot, charId) {
  if (slot >= save.rosterSlots) return false;
  // Un meme personnage ne peut pas occuper deux slots.
  const other = save.team.indexOf(charId);
  if (other >= 0 && other !== slot) save.team[other] = null;
  save.team[slot] = charId;
  if (!save.team.some(Boolean)) save.team[0] = charId;
  persist();
  previensQuetes();   // « mets-le dans ton equipe » se relit sur l'equipe
  return true;
}

// ------------------------------------------------------------------- arenes
/** L'etat d'une arene (cree a la demande) : `{ niveau, victoires, defaites, meilleur }`. */
export function etatArene(id) {
  if (!save.arenes) save.arenes = {};
  if (!save.arenes[id]) save.arenes[id] = { niveau: 1, victoires: 0, defaites: 0, meilleur: 0 };
  return save.arenes[id];
}

/**
 * Note l'issue d'un combat d'arene joue au niveau `joue` (le niveau courant par defaut). Une victoire au niveau
 * courant fait monter l'arene (`BALANCE.arenes`) ; un niveau deja battu, rejoue depuis l'onglet, ne la fait pas monter.
 */
export function noteCombatArene(id, gagne, joue) {
  const a = etatArene(id);
  const niveau = joue || a.niveau;
  if (gagne) {
    a.victoires++;
    a.meilleur = Math.max(a.meilleur, niveau);
    if (niveau >= a.niveau) a.niveau = Math.min(BALANCE.arenes.niveauMax, a.niveau + BALANCE.arenes.niveauParVictoire);
  } else a.defaites++;
  persist();
  return a;
}

/** Les FONDS DEBLOQUES : celui de chaque arene gagnee au moins une fois (config/arenes.js, `fond`). Rien a garder : ca
 *  se relit sur les arenes, donc une sauvegarde d'avant les fonds a deja les siens. */
export function fondsDebloques() {
  const ok = new Set();
  for (const a of ARENES) if (save.arenes && save.arenes[a.id] && save.arenes[a.id].victoires > 0) ok.add(a.fond);
  return ok;
}

/** Le fond que le joueur garde pour tous ses combats (Profil) : `null` rend celui de chaque arene. Un fond pas encore
 *  debloque est refuse. */
export function choisitFond(fond) {
  if (fond !== null && (!FONDS[fond] || !fondsDebloques().has(fond))) return false;
  save.profil.fond = fond;
  persist();
  return true;
}

// ------------------------------------------------------------------- le profil du joueur
/** Ce qu'il faut d'XP pour passer du niveau actuel au suivant (0 au niveau max). */
export const xpPourSuivant = () => (save.profil.niveau >= NIVEAU_MAX_PROFIL ? 0 : BALANCE.profil.xpPourNiveau(save.profil.niveau));

/** Donne les recompenses d'un niveau du profil ; rend des phrases a afficher. */
function donneRecompenses(niveau) {
  const notes = [];
  for (const r of recompensesDuNiveau(niveau)) {
    if (r.type === 'place') { save.rosterSlots++; notes.push(`Une place d'équipe de plus (${save.rosterSlots}).`); }
    else if (r.type === 'joker') { save.profil.jokersRetrait += r.n || 1; notes.push(`+${r.n || 1} joker de retrait.`); }
    else if (r.type === 'heros') {
      const st = save.chars[r.id], c = CHAR_BY_ID[r.id];
      if (!st || !c || st.owned) continue;
      // L'arbre ouvre l'ELIGIBILITE, comme un boss battu : le heros s'achete ensuite avec des Fanions.
      st.bossBeaten = true;
      notes.push(`${c.name} peut être recruté (Fanions).`);
    }
  }
  return notes;
}

/** Gagne `n` XP de profil ; rend `{ niveaux: [niveaux atteints], notes: [phrases] }`. */
export function gagneXp(n) {
  const out = { niveaux: [], notes: [] };
  save.profil.xp += n || 0;
  while (save.profil.niveau < NIVEAU_MAX_PROFIL && save.profil.xp >= xpPourSuivant()) {
    save.profil.xp -= xpPourSuivant();
    save.profil.niveau++;
    out.niveaux.push(save.profil.niveau);
    out.notes.push(...donneRecompenses(save.profil.niveau));
  }
  if (save.profil.niveau >= NIVEAU_MAX_PROFIL) save.profil.xp = 0;
  persist();
  return out;
}

// ------------------------------------------------------------------- le deck : taille, jokers, decks enregistres
/** Combien de cartes partent au combat avec l'equipe actuelle (cartes retirees deduites). */
export function tailleDuDeck(ids = team()) {
  return ids.reduce((n, id) => n + CHAR_BY_ID[id].cards.length - ((save.retraits && save.retraits[id]) || []).length, 0);
}

/**
 * La taille minimale d'un deck pour combattre (`BALANCE.decks.tailleMin`), jamais plus que ce que les places ouvertes
 * peuvent porter : Pompon seul (une place, 5 cartes) combat pendant le tutoriel.
 */
export const tailleMinDuDeck = () =>
  Math.min(BALANCE.decks.tailleMin, save.rosterSlots * Math.max(...CHARACTERS.map(c => c.cards.length)));

/** Retire l'emplacement `slot` du deck d'un heros contre un joker. Rend 'ok', 'joker' (plus de joker) ou 'deja'. */
export function retireCarte(id, slot) {
  if (!save.retraits) save.retraits = {};
  const r = save.retraits[id] || (save.retraits[id] = []);
  if (r.includes(slot)) return 'deja';
  if ((save.profil.jokersRetrait || 0) <= 0) return 'joker';
  save.profil.jokersRetrait--;
  r.push(slot);
  persist();
  return 'ok';
}

/** Remet une carte retiree dans le deck : le joker est rendu (on peut changer d'avis). */
export function rendCarte(id, slot) {
  const r = (save.retraits && save.retraits[id]) || [];
  const i = r.indexOf(slot);
  if (i < 0) return false;
  r.splice(i, 1);
  save.profil.jokersRetrait++;
  persist();
  return true;
}

/** Enregistre l'equipe actuelle (heros, faces switch, cartes retirees) sous `nom`. */
export function enregistreDeck(nom) {
  if (!save.decks) save.decks = [];
  if (save.decks.length >= BALANCE.decks.max) return 'plein';
  const ids = team();
  save.decks.push({
    nom: nom || `Deck ${save.decks.length + 1}`,
    team: ids,
    switches: Object.fromEntries(ids.map(id => [id, [...save.chars[id].switches]])),
    retraits: Object.fromEntries(ids.map(id => [id, [...((save.retraits && save.retraits[id]) || [])]]))
  });
  persist();
  return 'ok';
}

/**
 * Recharge un deck enregistre. Un heros qu'on ne possede plus est saute ; une face switch n'est equipee que si elle
 * a ete achetee ; les cartes retirees ne se reprennent que si les jokers suffisent (ceux des heros du deck sont d'abord
 * rendus).
 */
export function chargeDeck(i) {
  const d = (save.decks || [])[i];
  if (!d) return false;
  const ids = d.team.filter(possede).slice(0, save.rosterSlots);
  if (!ids.length) return false;
  save.team = Array.from({ length: save.rosterSlots }, (_, k) => ids[k] || null);
  for (const id of ids) {
    const st = save.chars[id];
    (d.switches[id] || []).forEach((v, k) => { st.switches[k] = !!v && (!!(st.bought && st.bought[k]) || st.switches[k]); });
    for (const slot of [...((save.retraits && save.retraits[id]) || [])]) rendCarte(id, slot);
    for (const slot of d.retraits[id] || []) retireCarte(id, slot);
  }
  persist();
  return true;
}

export function supprimeDeck(i) {
  if (!save.decks || !save.decks[i]) return;
  save.decks.splice(i, 1);
  persist();
}

// ------------------------------------------------------------------- la cueillette
/** Fait connaitre des cultures a la Ferme ; rend celles qui etaient nouvelles. */
export function decouvreCultures(ids) {
  const neuves = ids.filter(id => !save.farm.discovered[id]);
  for (const id of neuves) save.farm.discovered[id] = true;
  persist();
  return neuves;
}

/** L'arene d'un point du monde (ou null). */
export const areneDe = n => (n && n.arene ? ARENE_PAR_ID[n.arene] || null : null);

// ------------------------------------------------------------------- le fil de quetes (config/quetes.js, docs/TUTORIEL.md)
// Une quete a la fois. Remplie, elle attend que le joueur recupere sa recompense ; la suivante commence alors. Un ETAT
// (arene battue, heros dans l'equipe) se relit dans la sauvegarde ; un EVENEMENT (`signale`) se compte depuis le debut
// de la quete. L'interface ecoute (`ecouteQuetes`) : le bandeau se redessine quand quelque chose change.
const ecouteurs = new Set();
export const ecouteQuetes = fn => { ecouteurs.add(fn); return () => ecouteurs.delete(fn); };
function previensQuetes() { for (const fn of ecouteurs) fn(); }

/** Le tutoriel est fini quand la quete `finTutoriel` est faite. */
export const tutorielFini = () => {
  const fin = QUETES.find(q => q.finTutoriel);
  return !fin || save.quetes.faites.includes(fin.id);
};

/**
 * Une quete qui offre un heros deja possede ne se fait pas (un joueur qui a deja Medor ne refait pas sa quete), ni une quete
 * de la Ferme tant qu'elle est hors du jeu.
 */
const QUETES_DE_FERME = ['plante', 'vend'];
const sautee = q => (!BALANCE.fermeActive && QUETES_DE_FERME.includes(q.objectif?.quoi)) || !!(q.recompense && q.recompense.heros && save.chars[q.recompense.heros] && save.chars[q.recompense.heros].owned);

/** Passe a la quete qui suit `q` dans le fil (`null` au bout). */
function suivante(q) {
  const i = QUETES.indexOf(q);
  save.quetes.courante = (QUETES[i + 1] || {}).id || null;
  save.quetes.compte = 0;
}

/** La quete en cours (`null` quand le fil est fini). Les quetes a sauter sont passees ici. */
export function queteCourante() {
  let q = QUETE_PAR_ID[save.quetes.courante] || null;
  while (q && sautee(q)) {
    save.quetes.faites.push(q.id);
    suivante(q);
    persist();
    q = QUETE_PAR_ID[save.quetes.courante] || null;
  }
  return q;
}

/** Ou en est une quete : `{ n, sur, fait }` (n sur `sur`). */
export function progresQuete(q = queteCourante()) {
  if (!q) return { n: 0, sur: 1, fait: false };
  const o = q.objectif;
  let n, sur = o.n || 1;
  if (o.quoi === 'arene') { n = ((save.arenes || {})[o.arene] || {}).meilleur >= o.niveau ? 1 : 0; sur = 1; }
  else if (o.quoi === 'equipe') { n = team().includes(o.heros) ? 1 : 0; sur = 1; }
  else n = save.quetes.compte;
  return { n: Math.min(n, sur), sur, fait: n >= sur };
}

/**
 * Le jeu dit ce qui vient d'arriver : 'victoire' (`{ equipe }` : le nombre de heros alignes), 'ameliore', 'switch',
 * 'plante', 'vend'. Ca ne compte que pour la quete en cours, et seulement si c'est ce qu'elle demande.
 */
export function signale(quoi, detail = {}) {
  const q = queteCourante();
  if (q && q.objectif.quoi === quoi && !progresQuete(q).fait) {
    if (!(q.objectif.equipe && (detail.equipe || 0) < q.objectif.equipe)) {
      save.quetes.compte++;
      persist();
    }
  }
  previensQuetes();
}

/**
 * Recupere la recompense de la quete en cours, si elle est remplie ; rend `{ quete, gains, notes }` ou null — `gains` :
 * les monnaies (`[{ k, n }]`, l'interface les nomme), `notes` : les phrases a montrer (heros, place).
 */
export function recupereQuete() {
  const q = queteCourante();
  if (!q || !progresQuete(q).fait) return null;
  const r = q.recompense || {}, gains = [], notes = [];
  for (const k of ['C', 'B', 'A', 'G']) if (r[k]) { gain(k, r[k]); gains.push({ k, n: r[k] }); }
  if (r.heros && save.chars[r.heros]) { save.chars[r.heros].owned = true; notes.push(`${CHAR_BY_ID[r.heros].name} te rejoint !`); }
  if (r.place) { save.rosterSlots += r.place; notes.push(`Une place d'équipe de plus (${save.rosterSlots}).`); }
  save.quetes.faites.push(q.id);
  suivante(q);
  persist();
  previensQuetes();
  return { quete: q, gains, notes };
}

/**
 * TRICHE (ui/triche.js) : finit le tutoriel d'un coup, comme une sauvegarde d'avant les quetes — les heros et les places
 * qu'il offre sont donnes (pas ses monnaies), et le fil reprend apres la quete `finTutoriel`. Rend le nombre de quetes passees.
 */
export function passeLeTutoriel() {
  const fin = QUETES.findIndex(q => q.finTutoriel);
  if (fin < 0 || tutorielFini()) return 0;
  let n = 0;
  for (const q of QUETES.slice(0, fin + 1)) {
    if (save.quetes.faites.includes(q.id)) continue;
    const r = q.recompense || {};
    if (r.heros && save.chars[r.heros]) save.chars[r.heros].owned = true;
    if (r.place) save.rosterSlots += r.place;
    save.quetes.faites.push(q.id);
    n++;
  }
  save.quetes.courante = (QUETES[fin + 1] || {}).id || null;
  save.quetes.compte = 0;
  for (let i = 0; i < Math.min(3, save.rosterSlots); i++) {
    if (!save.team[i]) save.team[i] = Object.keys(save.chars).find(id => save.chars[id].owned && !save.team.includes(id)) || null;
  }
  persist();
  previensQuetes();
  return n;
}
