// LA FEUILLE GOOGLE → LA GAME CONFIG.
//
// Le game designer regle certaines valeurs dans une Google Sheet (« Config Adventure-Cards »). Un outil
// (`scripts/sync-feuille.mjs`, ou le bouton de l'Atelier) lit la feuille et ecrit
// `game/data/feuille.data.js` ; ce module, pur (ni DOM ni reseau), dit comment ces lignes se posent
// sur `BALANCE`. Les valeurs par defaut restent dans `balance.js` : une ligne de feuille ne fait que les
// REMPLACER, et une ligne absente laisse la valeur par defaut.
//
// Regle de la feuille : tout ce qui commence par « ~ » (onglet, colonne, ligne) n'est PAS exporte.
//
// Ce module sert a deux endroits, pour que le jeu et l'apercu disent la meme chose :
//   - `balance.js` l'applique au chargement (`applique`) ;
//   - le serveur et l'outil en ligne de commande l'interrogent avant d'ecrire (`planifie`).

/** Les objets de `BALANCE.ui.fx` ou un identifiant de la feuille peut tomber : le niveau, puis `fin`. */
function portes(cible) {
  return [cible, cible && cible.fin].filter(o => o && typeof o === 'object');
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
export function planifie(cible, lignes) {
  const out = [];
  for (const l of lignes || []) {
    const id = String(l.id);
    // Un identifiant designe une valeur (nombre, texte, liste), jamais un sous-groupe (`fin`).
    const o = portes(cible).find(x => Object.prototype.hasOwnProperty.call(x, id) && (typeof x[id] !== 'object' || Array.isArray(x[id])));
    if (!o) { out.push({ id, nom: l.name || '', avant: null, apres: l.value, etat: 'inconnu', raison: 'cet identifiant n\'existe pas dans BALANCE.ui.fx' }); continue; }
    const avant = o[id];
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
    const meme = JSON.stringify(apres) === JSON.stringify(avant);
    out.push({ id, nom: l.name || '', avant, apres, etat: meme ? 'identique' : 'change', objet: o });
  }
  return out;
}

/** Pose les lignes de la feuille sur `BALANCE.ui.fx` (celles qui sont valides). Rend le plan. */
export function applique(cible, lignes) {
  const plan = planifie(cible, lignes);
  for (const p of plan) if (p.etat === 'change') p.objet[p.id] = p.apres;
  return plan;
}
