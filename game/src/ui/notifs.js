// LES NOTIFICATIONS DU TELEPHONE (2 nov. 2026) : un jeu ferme n'execute rien, donc c'est le SERVEUR (le Pi) qui pousse la notification a l'heure
// (`scripts/lib/rappels-jeu.mjs`, Web Push). Ici : le service worker (`game/sw.js`), l'abonnement de l'appareil, et l'envoi au serveur de la
// liste COMPLETE des echeances du jeu (heures absolues) a chaque changement et quand le jeu passe en arriere-plan. Echeances : la fin d'une
// enchere ou le joueur a mise (10 minutes avant, et a la fin), le retour du grading, l'ouverture d'un tournoi. HTTPS (ou localhost) seulement ;
// sur iPhone, le jeu doit etre ajoute a l'ecran d'accueil.
import { ctx, ecoute, partie } from '../boutique/partie.js';
import { carteDef } from './boutique.js';
import { el, toast } from './shell.js';

const WARN_MS = ctx.cfg.market.lot.warnMinutes * 60000;
const prises = () => isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
let reg = null;
let actif = false;
let demande = false;

const versOctets = b64 => Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const enB64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const post = (url, corps, opts = {}) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps ?? {}), ...opts });

/** `indisponible` (pas de HTTPS, navigateur sans Push) | `refuse` | `inactif` | `actif`. */
export function etatNotifications() {
  if (!prises()) return 'indisponible';
  if (Notification.permission === 'denied') return 'refuse';
  return actif && Notification.permission === 'granted' ? 'actif' : 'inactif';
}

/** Les echeances du jeu, en heures absolues (`quand`, ms depuis 1970) : l'heure du jeu avance comme l'heure reelle. */
function lesRappels() {
  const S = partie();
  if (!S) return [];
  const maintenant = Date.now(), base = maintenant - S.nowMs;
  const liste = [];
  for (const lot of S.market.lots) {
    if (!lot.engaged || lot.endMs <= S.nowMs) continue;
    const nom = carteDef(lot.cardId)?.name ?? 'Une carte';
    if (lot.endMs - WARN_MS > S.nowMs) liste.push({ id: `lot${lot.id}-10`, quand: base + lot.endMs - WARN_MS, titre: 'Enchère bientôt finie', corps: `${nom} : plus que ${ctx.cfg.market.lot.warnMinutes} minutes. Va voir où tu en es.`, tag: `lot${lot.id}` });
    liste.push({ id: `lot${lot.id}-fin`, quand: base + lot.endMs, titre: 'Enchère terminée', corps: `${nom} : va voir si elle est à toi.`, tag: `lot${lot.id}` });
  }
  for (const g of S.gradingQueue) {
    if (g.doneMs <= S.nowMs) continue;
    const inst = S.instances[g.instanceId];
    liste.push({ id: `grading${g.instanceId}`, quand: base + g.doneMs, titre: 'Grading terminé', corps: `${inst ? carteDef(inst.cardId)?.name : 'Ta carte'} revient du grading.`, tag: `grading${g.instanceId}` });
  }
  const t = S.tournoi;
  if (t?.etat === 'attente' && t.suivantMs > S.nowMs) liste.push({ id: `tournoi${Math.round(t.suivantMs)}`, quand: base + t.suivantMs, titre: 'Un tournoi s’ouvre', corps: 'Les inscriptions sont ouvertes au tableau des défis.', tag: 'tournoi' });
  return liste;
}

let minuteur = 0;
/** Envoie la liste des echeances au serveur (rien si l'appareil n'est pas abonne). `maintenant` : sans attendre (le jeu part en arriere-plan). */
export function synchronise(maintenant = false) {
  clearTimeout(minuteur);
  const envoie = () => { if (etatNotifications() === 'actif') post('/api/jeu/rappels', { rappels: lesRappels() }, { keepalive: true }).catch(() => {}); };
  if (maintenant) envoie(); else minuteur = setTimeout(envoie, 3000);
}

async function abonne() {
  reg ??= await navigator.serviceWorker.register('/game/sw.js', { scope: '/game/' });
  await navigator.serviceWorker.ready;
  const { cle } = await (await fetch('/api/jeu/push/cle', { cache: 'no-store' })).json();
  let sub = await reg.pushManager.getSubscription();
  // Une cle serveur qui a change (push.json efface) invalide l'abonnement : on se reabonne.
  if (sub && sub.options?.applicationServerKey && enB64u(sub.options.applicationServerKey) !== cle) { await sub.unsubscribe(); sub = null; }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: versOctets(cle) });
  await post('/api/jeu/push/abonne', sub.toJSON());
  actif = true;
  synchronise(true);
}

/** Active les notifications (a appeler depuis un toucher : le navigateur demande la permission). Rend l'etat obtenu. */
export async function activeNotifications() {
  if (!prises()) { toast('Les notifications demandent une adresse https (ou localhost).'); return etatNotifications(); }
  try {
    if (Notification.permission === 'default') await Notification.requestPermission();
    if (Notification.permission === 'granted') await abonne();
    else toast('Notifications refusées : change-le dans les réglages du navigateur.');
  } catch (e) { toast(`Notifications impossibles : ${e.message}`); }
  return etatNotifications();
}

/** La premiere mise est le bon moment pour demander (un geste du joueur, une raison) ; une seule fois par session. */
export function demandeNotifs() {
  if (demande || !prises() || Notification.permission !== 'default') return;
  demande = true;
  activeNotifications();
}

/** Au demarrage : si la permission est deja donnee, on se rabonne sans rien demander ; puis on suit les changements. */
export function installeNotifications() {
  if (prises() && Notification.permission === 'granted') abonne().catch(() => {});
  ecoute(e => { if (e.t === 'change') synchronise(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') synchronise(true); });
  addEventListener('pagehide', () => synchronise(true));
}

/** Le bloc du Profil : l'etat, un bouton pour activer, un pour essayer. */
export function blocNotifs() {
  const box = el('<div class="nt"><b>Notifications</b><span class="muted"></span><div class="nt-b"></div></div>');
  const dessine = () => {
    const e = etatNotifications();
    box.querySelector('span').textContent = { actif: 'Actives : fin d’enchère, grading, tournoi.', inactif: 'Pour être prévenu même jeu fermé.', refuse: 'Refusées par le navigateur.', indisponible: 'Il faut https (ou localhost), et l’appli sur l’écran d’accueil sur iPhone.' }[e];
    const b = box.querySelector('.nt-b');
    b.innerHTML = '';
    if (e === 'inactif') { const x = el('<button class="btn">Activer</button>'); x.onclick = async () => { await activeNotifications(); dessine(); }; b.appendChild(x); }
    if (e === 'actif') { const x = el('<button class="btn ghost">Essayer</button>'); x.onclick = async () => { const r = await (await post('/api/jeu/push/test')).json().catch(() => ({})); toast(r.envoyees ? 'Notification envoyée : ferme le jeu et attends-la.' : `Rien envoyé (${(r.erreurs || [])[0] || 'pas d’abonné'})`); }; b.appendChild(x); }
  };
  dessine();
  return box;
}

