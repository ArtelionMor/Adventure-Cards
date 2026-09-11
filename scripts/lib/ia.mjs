// L'ANALYSE DES RESULTATS PAR UNE IA LOCALE (Ollama) — sans dependance, sans jeton paye.
//
// A la fin d'une file de simulations, « Analyser les resultats » donne le recapitulatif a
// un modele de langage qui tourne a la maison, et rend trois paragraphes : ce qui
// ressort, ce qui cloche, ce qu'il faut regarder ensuite. Il ne decide rien : il lit plus
// vite que nous une pile de chiffres, et il montre du doigt.
//
// LES MACHINES, dans l'ordre de preference : les PC a carte graphique d'abord (rapides,
// gros modele), la machine du serveur en dernier recours (le Pi : un petit modele, sur
// le processeur, plusieurs minutes). A chaque analyse on les SONDE dans l'ordre — « tu
// reponds, et tu as le modele ? » — et on prend la premiere qui dit oui : un PC eteint
// est simplement saute. La liste vit hors du repo (il est public) :
// ~/.adventure-card/ia.json, editee depuis la page « Lancer un calcul ».
//
// Deux reglages qui comptent :
//   - `think: false` : les modeles recents « reflechissent a voix haute » avant de
//     repondre. Sur le Pi, un test de deux phrases a produit 1 286 jetons en 6 min, dont
//     presque tout de reflexion. Pour resumer des chiffres, on n'en veut pas.
//   - `detail` : une machine rapide recoit des EXTRAITS des sorties en plus des resumes ;
//     une machine lente (celle du serveur, par defaut) ne recoit que les resumes — sur le
//     Pi, lire 3 000 jetons prendrait deja plusieurs minutes.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

const FICHIER = process.env.ADVENTURE_IA || join(homedir(), '.adventure-card', 'ia.json');
const PAR_DEFAUT = [{ nom: 'Cette machine', url: 'http://127.0.0.1:11434', modele: 'qwen3.5:4b' }];
const MACHINES_MAX = 8;

/** Une machine « locale » est celle du serveur : elle partage ses coeurs avec les calculs. */
export const estLocale = m => /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(m.url);
/** Envoie-t-on les extraits des sorties, ou seulement les resumes ? */
const detaille = m => (typeof m.detail === 'boolean' ? m.detail : !estLocale(m));

export function machines() {
  try {
    const m = JSON.parse(readFileSync(FICHIER, 'utf8')).machines;
    if (Array.isArray(m) && m.length) return m;
  } catch { /* pas encore de fichier : la liste par defaut */ }
  return PAR_DEFAUT;
}

/** La liste editee dans la page. Verifiee champ par champ : elle part ensuite dans des requetes. */
export function enregistreMachines(liste) {
  if (!Array.isArray(liste) || !liste.length) throw new Error('Il faut au moins une machine.');
  if (liste.length > MACHINES_MAX) throw new Error(`${MACHINES_MAX} machines au plus.`);
  const propres = liste.map((m, i) => {
    const nom = String(m.nom || '').trim().slice(0, 40) || `Machine ${i + 1}`;
    const url = String(m.url || '').trim().replace(/\/+$/, '');
    const modele = String(m.modele || '').trim();
    if (!/^https?:\/\/[\w.-]+(:\d{1,5})?$/.test(url)) throw new Error(`Adresse invalide pour « ${nom} » : ${url || '(vide)'} — attendu http://nom-du-pc:11434`);
    if (!/^[\w.:/-]{1,80}$/.test(modele)) throw new Error(`Modèle invalide pour « ${nom} » : ${modele || '(vide)'}`);
    return { nom, url, modele };
  });
  mkdirSync(dirname(FICHIER), { recursive: true });
  writeFileSync(FICHIER, JSON.stringify({ machines: propres }, null, 2), { mode: 0o600 });
  return propres;
}

/** « Tu reponds, et tu as le modele ? » — en quelques secondes au plus. */
async function sonde(m, ms = 2500) {
  try {
    const r = await fetch(m.url + '/api/tags', { signal: AbortSignal.timeout(ms) });
    if (!r.ok) return { ok: false, pourquoi: `répond ${r.status}` };
    const noms = ((await r.json()).models || []).map(x => x.name);
    if (noms.some(n => n === m.modele || n === m.modele + ':latest')) return { ok: true };
    return { ok: false, pourquoi: `n'a pas le modèle (ollama pull ${m.modele})` };
  } catch (e) {
    return { ok: false, pourquoi: e.name === 'TimeoutError' ? 'ne répond pas (éteinte ?)' : 'injoignable' };
  }
}

/** Toutes les machines et ce qu'elles repondent — pour la page. */
export async function statuts() {
  return Promise.all(machines().map(async m => ({ ...m, locale: estLocale(m), ...(await sonde(m)) })));
}

/** La premiere machine prete. `sansLocale` : un calcul tourne, on ne vole pas ses coeurs. */
export async function premiereDisponible({ sansLocale = false } = {}) {
  const essais = [];
  for (const m of machines()) {
    if (sansLocale && estLocale(m)) { essais.push(`${m.nom} : occupée par les calculs`); continue; }
    const s = await sonde(m);
    if (s.ok) return { machine: m, essais };
    essais.push(`${m.nom} : ${s.pourquoi}`);
  }
  return { machine: null, essais };
}

// ------------------------------------------------------------------ la demande
// La consigne dit au modele comment LIRE nos chiffres : sans elle, il commente un 66 %
// comme un desequilibre alors que c'est la cible du designer.
export const CONSIGNE = `Tu es l'assistant d'équilibrage d'Adventure Card, un jeu de cartes où des decks de héros affrontent d'autres decks et des adversaires (PNJ). Les chiffres viennent de parties jouées bot contre bot.

Comment lire les résultats :
- Matrice des matchups : taux de victoire de la LIGNE contre la COLONNE. Les cibles du designer sont ~66 % quand un deck a l'avantage, ~33 % quand il ne l'a pas, ~50 % entre decks de même force. Au-delà de 72 % ou sous 28 %, le matchup est « écrasant ». Un écart plus petit que l'intervalle ± n'est que du bruit.
- « Contre les adversaires » : taux des équipes de héros face aux adversaires. La PIRE équipe dit si un adversaire est un mur ; la moyenne dit si le palier est bien placé.
- Courbe de difficulté : un « mur » = même la meilleure équipe perd ; un « combat offert » = même la pire gagne.
- Contrôle des decks : les erreurs de construction et ce qui ne se produit jamais en partie.
- Tous les taux sont ceux des HÉROS (la ligne) : plus un taux est haut, plus l'adversaire est facile pour eux. « niv N » est le niveau des cartes des héros ; les adversaires gardent le leur, donc monter de niveau doit faire monter les taux.
- « Avantage de celui qui commence » : la part des parties gagnées par le camp qui joue en premier (50 % = aucun avantage).
- « Précision ±X % » : l'intervalle de confiance. Il rétrécit quand on joue plus de parties.
- Tout est joué par des bots, sans joueur humain — il n'y en aura pas. Un deck mal piloté par le bot paraît plus faible qu'il n'est.

Réponds en français, en 150 à 250 mots, en trois parties courtes titrées **Ce qui ressort**, **Ce qui cloche** et **À regarder ensuite**. Cite les lignes et les chiffres qu'on te donne, n'en invente aucun, et avant d'écrire qu'un chiffre monte ou baisse, vérifie le sens. Dis-le franchement quand les données ne suffisent pas pour conclure. Dans « À regarder ensuite », ne propose que ce qu'on peut faire avec les outils : relancer avec plus de parties, rejouer un matchup suspect avec le bot Monte-Carlo (qui joue mieux), lancer « Analyse des cartes » pour voir les cartes que le bot boude, « Contrôle des decks » pour les erreurs, ou modifier une carte ou un héros précis.`;

const sansCouleurs = t => String(t).replace(/\x1b\[[\d;?]*[A-Za-z]/g, '').split('\n')
  .map(l => l.slice(l.lastIndexOf('\r') + 1).trimEnd()).filter(l => l.trim()).join('\n');

/** Le recapitulatif d'une file, avec ou sans extraits des sorties. */
export function demande(lot, avecExtraits) {
  const EXTRAIT_MAX = 2500, TOTAL_MAX = 24000;
  let total = 0;
  const blocs = lot.lignes.map(l => {
    let bloc = `### ${l.libelle} (${l.etat})\nRésumé : ${l.resume || '—'}`;
    if (avecExtraits && l.sortie && total < TOTAL_MAX) {
      // La fin d'une sortie porte la lecture (matchups sur cible, forces, murs) : c'est
      // elle qu'on garde quand il faut couper.
      const extrait = sansCouleurs(l.sortie).slice(-EXTRAIT_MAX);
      total += extrait.length;
      bloc += `\nExtrait de la sortie :\n${extrait}`;
    }
    return bloc;
  });
  const finis = lot.lignes.filter(l => l.etat === 'fini').length;
  // Le rappel est repete ICI, a cote des donnees : dans la consigne seule, un petit modele
  // lisait encore « niv 4 » comme le niveau des adversaires, et une hausse des taux comme
  // des adversaires « plus resistants ».
  return `File de ${lot.lignes.length} calcul(s), ${finis} terminé(s). Rappel : « niv N » dans un libellé = niveau des cartes des HÉROS, `
    + `les adversaires ne changent pas d'une ligne à l'autre ; les taux sont ceux des héros.\n\n${blocs.join('\n\n')}`;
}

/** L'analyse elle-meme. Rend le texte, la duree et la vitesse (jetons par seconde). */
export async function analyse(m, lot, ms = 15 * 60 * 1000) {
  const avecExtraits = detaille(m);
  const debut = Date.now();
  const r = await fetch(m.url + '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: m.modele,
      stream: false,
      think: false,
      keep_alive: '10m',
      options: { temperature: 0.3, num_ctx: avecExtraits ? 16384 : 4096 },
      messages: [{ role: 'system', content: CONSIGNE }, { role: 'user', content: demande(lot, avecExtraits) }]
    }),
    signal: AbortSignal.timeout(ms)
  });
  if (!r.ok) throw new Error(`${m.nom} a répondu ${r.status} : ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return {
    texte: ((d.message && d.message.content) || '').trim(),
    duree: Date.now() - debut,
    vitesse: d.eval_count && d.eval_duration ? d.eval_count / (d.eval_duration / 1e9) : null,
    avecExtraits
  };
}
