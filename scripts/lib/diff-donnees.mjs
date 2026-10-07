// LA DIFFERENCE ENTRE DEUX ETATS DES DONNEES DU JEU, ecrite pour un humain.
//
// Un diff de texte sur `characters.data.js` est illisible : 12 000 lignes de JSON, des
// indices qui bougent des qu'on insere une carte. Ici on compare par IDENTITE — un
// heros, une carte, un adversaire, la pile de fatigue — et, dans chacun, par CLE : un
// palier se retrouve par son niveau, une ligne de deck par sa carte, un effet par sa
// place. Resultat : « Griffe (chat) : coût 2 → 3 · palier niv. 12 ajouté », pas un
// fichier rouge et vert.
//
// MODULE PUR : aucun import, aucune API de Node ni du navigateur. La page de versions
// l'importe (`/scripts/lib/diff-donnees.mjs`), le serveur aussi, et les bancs de test.
// Il ne sait rien des regles du jeu : un champ qu'on ajoute demain apparaitra tout seul,
// sous son nom brut, tant qu'on ne lui a pas donne de libelle dans LIBELLES.

/** Les noms de champs que le designer lit (le reste s'affiche sous son nom brut). */
export const LIBELLES = {
  name: 'nom', cost: 'coût', atk: 'attaque', hp: 'PV', text: 'texte', keys: 'mots-clés', type: 'type',
  sprite: 'image', tiers: 'paliers', gardes: 'gardes', statics: 'effets statiques', aura: 'aura',
  play: 'à la pose', death: 'râle d’agonie', turnStart: 'début de tour', turnEnd: 'fin de tour',
  cards: 'cartes', switches: 'switchs', lvl: 'niveau', stats: 'stats', key: 'mot-clé', amp: 'effet +',
  extra: 'effet ajouté', lesDeux: 'choisit les deux', ia: 'bot', deck: 'deck', n: 'exemplaires',
  card: 'carte', v: 'valeur', t: 'cible', op: 'effet', slot: 'moment'
};

const clePalier = (x, vus) => {
  if (x && typeof x === 'object') {
    for (const champ of ['lvl', 'id', 'card']) {
      if (x[champ] !== undefined) {
        let c = `${champ}=${x[champ]}`;
        // Deux entrees de meme cle (deux paliers au meme niveau) : on les distingue par rang.
        if (vus[c] !== undefined) { vus[c]++; c += '#' + vus[c]; } else vus[c] = 0;
        return c;
      }
    }
  }
  return null;
};

/** Aplatit une valeur en { chemin: valeurFeuille }. Un tableau d'objets se range par cle. */
export function aplati(v, chemin = '', sortie = {}) {
  if (Array.isArray(v)) {
    if (!v.length) { sortie[chemin] = '[]'; return sortie; }
    const vus = {};
    v.forEach((x, i) => aplati(x, `${chemin}[${clePalier(x, vus) ?? i}]`, sortie));
  } else if (v && typeof v === 'object') {
    const ks = Object.keys(v);
    if (!ks.length) { sortie[chemin] = '{}'; return sortie; }
    for (const k of ks) aplati(v[k], chemin ? `${chemin}.${k}` : k, sortie);
  } else sortie[chemin] = v === undefined ? null : v;
  return sortie;
}

const meme = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ------------------------------------------------------------------ les entites
/** Toutes les entites comparables d'un fichier de donnees : { cle -> { type, id, nom, ... valeur } }. */
export function entites(d) {
  const E = {};
  const pose = (cle, e) => { let c = cle, k = 1; while (E[c]) c = `${cle}#${++k}`; E[c] = { cle: c, ...e }; };
  d = d || {};
  (d.characters || []).forEach((h, hi) => {
    const { cards, switches, ...reste } = h;
    pose('hero:' + h.id, { type: 'heros', id: h.id, nom: h.name || h.id, rang: hi, valeur: reste });
    (cards || []).forEach((c, i) => c && pose('carte:' + (c.id ?? `${h.id}.base${i}`),
      { type: 'carte', id: c.id, nom: c.name || c.id, proprio: h.id, cote: 'base', rang: i, valeur: c }));
    (switches || []).forEach((c, i) => c && pose('carte:' + (c.id ?? `${h.id}.switch${i}`),
      { type: 'carte', id: c.id, nom: c.name || c.id, proprio: h.id, cote: 'switch', rang: i, valeur: c }));
  });
  (d.library || []).forEach((c, i) => c && pose('carte:' + (c.id ?? `libre${i}`),
    { type: 'carte', id: c.id, nom: c.name || c.id, proprio: null, cote: 'libre', rang: i, valeur: c }));
  (d.npcs || []).forEach((n, ni) => pose('pnj:' + n.id, { type: 'adversaire', id: n.id, nom: n.name || n.id, rang: ni, valeur: n }));
  if (d.fatigue !== undefined) pose('fatigue', { type: 'fatigue', id: 'fatigue', nom: 'Pile de fatigue', valeur: d.fatigue });
  for (const k of Object.keys(d)) {
    if (['characters', 'library', 'npcs', 'fatigue'].includes(k)) continue;
    pose('reglage:' + k, { type: 'reglage', id: k, nom: k, valeur: d[k] });
  }
  return E;
}

// ------------------------------------------------------------------ le diff
/** Le groupe d'un chemin : « tiers[lvl=12] », « play[0] »… la premiere unite lisible. */
function groupeDe(chemin) {
  const m = /^([^.\[]+)(\[[^\]]+\])?/.exec(chemin);
  return m ? m[1] + (m[2] && m[1] === 'tiers' ? m[2] : '') : chemin;
}

const court = (v, n = 90) => {
  const s = typeof v === 'string' ? `« ${v} »` : String(v);
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};

/** Une phrase pour un groupe de changements (« palier niv. 12 : ajouté — … »). */
function phraseDuGroupe(g, lignes) {
  const nom = g.startsWith('tiers[lvl=') ? `palier niv. ${g.slice(10, -1)}` : (LIBELLES[g] || g);
  const ajouts = lignes.filter(l => l.avant === undefined), retraits = lignes.filter(l => l.apres === undefined);
  const texte = lignes.find(l => /(^|\.)text$/.test(l.chemin));
  if (ajouts.length === lignes.length) return `${nom} ajouté${texte ? ' — ' + court(texte.apres) : ''}`;
  if (retraits.length === lignes.length) return `${nom} retiré${texte ? ' — ' + court(texte.avant) : ''}`;
  if (lignes.length === 1 && !lignes[0].chemin.includes('.') && !lignes[0].chemin.includes('['))
    return `${nom} : ${court(lignes[0].avant)} → ${court(lignes[0].apres)}`;
  if (texte && texte.avant !== undefined && texte.apres !== undefined) return `${nom} modifié — ${court(texte.avant)} → ${court(texte.apres)}`;
  return `${nom} modifié (${lignes.length} changement${lignes.length > 1 ? 's' : ''})`;
}

/** Compare deux valeurs d'une meme entite : la liste de groupes qui ont bouge. */
export function diffValeur(avant, apres) {
  const A = aplati(avant), B = aplati(apres);
  const lignes = [];
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const a = A[k], b = B[k];
    if (a === undefined && b === undefined) continue;
    if (a !== undefined && b !== undefined && meme(a, b)) continue;
    lignes.push({ chemin: k, avant: a, apres: b });
  }
  const groupes = new Map();
  for (const l of lignes) {
    const g = groupeDe(l.chemin);
    if (!groupes.has(g)) groupes.set(g, []);
    groupes.get(g).push(l);
  }
  return [...groupes].map(([cle, ls]) => ({ cle, resume: phraseDuGroupe(cle, ls), lignes: ls }));
}

/**
 * La difference entre deux etats (`avant` -> `apres`).
 * Rend { entites: [{ cle, type, id, nom, proprio, statut, resume, groupes }], total, parType }.
 * `statut` : 'ajoutee' | 'retiree' | 'modifiee' | 'deplacee' (carte qui change de heros/slot).
 */
export function diff(avant, apres) {
  const A = entites(avant), B = entites(apres);
  const sortie = [];
  for (const cle of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const a = A[cle], b = B[cle];
    if (!a) {
      sortie.push({ cle, type: b.type, id: b.id, nom: b.nom, proprio: b.proprio, cote: b.cote, statut: 'ajoutee', groupes: [],
        resume: b.type === 'carte' ? `carte ajoutée${b.proprio ? ' chez ' + b.proprio : ''}` : `${b.type} ajouté` });
      continue;
    }
    if (!b) {
      sortie.push({ cle, type: a.type, id: a.id, nom: a.nom, proprio: a.proprio, cote: a.cote, statut: 'retiree', groupes: [],
        resume: a.type === 'carte' ? `carte retirée${a.proprio ? ' de ' + a.proprio : ''}` : `${a.type} retiré` });
      continue;
    }
    const groupes = diffValeur(a.valeur, b.valeur);
    const deplacee = a.type === 'carte' && (a.proprio !== b.proprio || a.cote !== b.cote);
    if (!groupes.length && !deplacee) continue;
    const lignes = groupes.map(g => g.resume);
    if (deplacee) lignes.unshift(`déplacée : ${a.proprio || 'libre'}/${a.cote} → ${b.proprio || 'libre'}/${b.cote}`);
    sortie.push({ cle, type: b.type, id: b.id, nom: b.nom, proprio: b.proprio, cote: b.cote,
      statut: groupes.length ? 'modifiee' : 'deplacee', groupes, resume: lignes.join(' · ') });
  }
  // Un heros ajoute ou retire emporte ses cartes : on ne les liste pas une par une (restaurer le
  // heros les ramene toutes). Le resume du heros dit combien.
  for (const h of sortie.filter(e => e.type === 'heros' && (e.statut === 'ajoutee' || e.statut === 'retiree'))) {
    const siennes = sortie.filter(e => e.type === 'carte' && e.proprio === h.id && e.statut === h.statut);
    if (siennes.length) { h.resume += ` (avec ses ${siennes.length} cartes)`; for (const c of siennes) sortie.splice(sortie.indexOf(c), 1); }
  }
  const ordreType = { heros: 0, carte: 1, adversaire: 2, fatigue: 3, reglage: 4 };
  sortie.sort((x, y) => (ordreType[x.type] - ordreType[y.type]) || String(x.proprio || '').localeCompare(String(y.proprio || '')) || String(x.nom).localeCompare(String(y.nom)));
  const parType = {};
  for (const e of sortie) parType[e.type] = (parType[e.type] || 0) + 1;
  return { entites: sortie, total: sortie.length, parType };
}

// ------------------------------------------------------------------ restaurer une entite
/**
 * Remet UNE entite (un heros, une carte, un adversaire, la fatigue, un reglage) dans l'etat
 * qu'elle avait dans `source`, sans toucher au reste de `courant`. Rend la copie modifiee
 * (`courant` n'est pas change) et dit ce qui a ete fait.
 * Une entite absente de `source` est RETIREE de `courant` : c'est « annuler son ajout ».
 */
export function restaureEntite(courant, source, cle) {
  const C = structuredClone(courant), S = source;
  const dansS = entites(S)[cle], dansC = entites(C)[cle];
  if (!dansS && !dansC) throw new Error('Entité introuvable : ' + cle);
  const copie = x => structuredClone(x);
  const [genre, id] = cle.includes(':') ? [cle.slice(0, cle.indexOf(':')), cle.slice(cle.indexOf(':') + 1)] : [cle, ''];

  if (genre === 'reglage') {
    if (dansS) C[id] = copie(S[id]); else delete C[id];
    return { donnees: C, fait: dansS ? `réglage « ${id} » rétabli` : `réglage « ${id} » retiré` };
  }
  if (genre === 'fatigue') {
    if (dansS) C.fatigue = copie(S.fatigue); else delete C.fatigue;
    return { donnees: C, fait: 'pile de fatigue rétablie' };
  }
  if (genre === 'pnj') {
    C.npcs = C.npcs || [];
    const i = C.npcs.findIndex(n => n.id === id);
    if (dansS) { const v = copie((S.npcs || []).find(n => n.id === id)); if (i >= 0) C.npcs[i] = v; else C.npcs.splice(Math.min(dansS.rang, C.npcs.length), 0, v); }
    else if (i >= 0) C.npcs.splice(i, 1);
    return { donnees: C, fait: dansS ? `adversaire « ${dansS.nom} » rétabli` : `adversaire « ${dansC.nom} » retiré` };
  }
  if (genre === 'hero') {
    C.characters = C.characters || [];
    const i = C.characters.findIndex(h => h.id === id);
    if (dansS) {
      const hs = (S.characters || []).find(h => h.id === id);
      if (i >= 0) {
        // Les statistiques du heros reviennent ; ses cartes, elles, restent a leur propre entite.
        const { cards, switches, ...reste } = copie(hs);
        C.characters[i] = { ...reste, cards: C.characters[i].cards, switches: C.characters[i].switches };
      } else C.characters.splice(Math.min(dansS.rang, C.characters.length), 0, copie(hs));   // heros entier, cartes comprises
    } else if (i >= 0) C.characters.splice(i, 1);
    return { donnees: C, fait: dansS ? `héros « ${dansS.nom} » rétabli` : `héros « ${dansC.nom} » retiré` };
  }
  if (genre === 'carte') {
    const place = (D, e) => {
      if (!e) return null;
      if (e.cote === 'libre') return { liste: (D.library = D.library || []) };
      const h = (D.characters || []).find(x => x.id === e.proprio);
      return h ? { liste: (h[e.cote === 'base' ? 'cards' : 'switches'] = h[e.cote === 'base' ? 'cards' : 'switches'] || []) } : null;
    };
    const ou = place(C, dansC);
    const idDe = c => c && c.id;
    if (!dansS) {                        // annuler un ajout
      const i = ou.liste.findIndex(c => idDe(c) === id);
      if (i >= 0) ou.liste.splice(i, 1);
      return { donnees: C, fait: `carte « ${dansC.nom} » retirée` };
    }
    const v = copie(dansS.valeur);
    if (ou) {                            // elle existe encore ici : on la remet EN PLACE (meme heros, meme slot)
      const cible = place(C, dansS);     // ... mais si elle a change de heros, elle retourne chez son ancien
      const i = ou.liste.findIndex(c => idDe(c) === id);
      if (cible && cible.liste !== ou.liste) {
        ou.liste.splice(i, 1);
        cible.liste.splice(Math.min(dansS.rang, cible.liste.length), 0, v);
      } else ou.liste[i] = v;
    } else {                             // elle avait disparu : retour a son heros et son rang
      const cible = place(C, dansS);
      if (!cible) throw new Error(`Le héros « ${dansS.proprio} » n'existe plus : rétablis-le d'abord.`);
      cible.liste.splice(Math.min(dansS.rang, cible.liste.length), 0, v);
    }
    return { donnees: C, fait: `carte « ${dansS.nom} » rétablie` };
  }
  throw new Error('Genre inconnu : ' + cle);
}
