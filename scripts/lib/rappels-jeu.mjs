// LES RAPPELS DU JEU (2 nov. 2026) : le serveur previent le telephone quand une echeance du jeu arrive — la fin d'une enchere ou il a mise, le
// grading qui revient, un tournoi qui s'ouvre — MEME JEU FERME. Un navigateur ferme n'execute rien : c'est donc le jeu qui, a chaque
// changement et en passant en arriere-plan, envoie ici la liste complete de ses echeances (`POST /api/jeu/rappels`, des heures
// absolues), et c'est ce planificateur qui pousse la notification a l'heure (Web Push, `push.mjs`, abonnements marques `app: 'jeu'`).
// Les echeances sont remplacees a chaque envoi (une enchere surencherie, un lot fini disparaissent) ; un rappel deja parti ne repart pas.
// Fichier : ~/.adventure-card/rappels-jeu.json (jamais dans le repo).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { notifie } from './push.mjs';

const FICHIER = process.env.ADVENTURE_RAPPELS || join(homedir(), '.adventure-card', 'rappels-jeu.json');
const PAS_MS = 20000;               // le planificateur regarde toutes les 20 s
const OUBLI_MS = 6 * 3600 * 1000;   // un rappel manque de plus de 6 h (serveur eteint) ne part plus : il serait absurde

let etat = null;
const charge = () => {
  if (etat) return etat;
  try { etat = JSON.parse(readFileSync(FICHIER, 'utf8')); } catch { etat = { rappels: [], envoyes: {} }; }
  return etat;
};
const sauve = () => {
  try { mkdirSync(dirname(FICHIER), { recursive: true }); writeFileSync(FICHIER, JSON.stringify(etat, null, 2), { mode: 0o600 }); } catch { /* disque plein : on retentera */ }
};

/** Remplace les echeances par celles du jeu. Chaque rappel : `{ id, quand (ms epoch), titre, corps, tag? }`. Rend leur nombre. */
export function remplaceRappels(liste) {
  if (!Array.isArray(liste)) throw new Error('Liste de rappels attendue');
  const e = charge();
  e.rappels = liste.slice(0, 50).filter(r => r && typeof r.id === 'string' && Number.isFinite(r.quand) && typeof r.titre === 'string')
    .map(r => ({ id: r.id.slice(0, 80), quand: r.quand, titre: r.titre.slice(0, 80), corps: String(r.corps || '').slice(0, 200), tag: String(r.tag || r.id).slice(0, 60) }));
  // On n'oublie un « envoye » que si son rappel a disparu : un rappel qui revient (meme id) repartirait sinon une seconde fois.
  const ids = new Set(e.rappels.map(r => r.id));
  for (const id of Object.keys(e.envoyes)) if (!ids.has(id) && Date.now() - e.envoyes[id] > 24 * 3600 * 1000) delete e.envoyes[id];
  sauve();
  return e.rappels.length;
}

/** Envoie les rappels echus. Rend les ids partis (pour les journaux et le banc). */
export async function envoieLesEchus(maintenant = Date.now()) {
  const e = charge();
  const partis = [];
  for (const r of e.rappels) {
    if (r.quand > maintenant || e.envoyes[r.id]) continue;
    e.envoyes[r.id] = maintenant;
    if (maintenant - r.quand > OUBLI_MS) continue;
    const bilan = await notifie({ titre: r.titre, corps: r.corps, tag: r.tag, bruyante: true, url: '/game/index.html' }, { urgence: 'high', sujet: r.tag.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) || undefined, app: 'jeu' });
    partis.push({ id: r.id, ...bilan });
  }
  if (partis.length) sauve();
  return partis;
}

/** Lance le planificateur (une seule fois par processus). */
let minuteur = null;
export function demarreRappels() {
  if (minuteur) return;
  minuteur = setInterval(() => { envoieLesEchus().catch(err => console.log('rappel impossible : ' + err.message)); }, PAS_MS);
  minuteur.unref?.();
}
