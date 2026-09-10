// LE SERVICE WORKER DE L'ATELIER — pour les notifications, et RIEN D'AUTRE.
//
// Aucun cache, aucune interception de requete : le builder doit toujours relire des
// donnees fraiches, et une page servie de travers depuis un cache serait exactement le
// piege que `relit()` evite ailleurs. Ce fichier ne sert qu'a recevoir les messages
// push du serveur (scripts/lib/push.mjs) et a les afficher, Atelier ferme ou non.
//
// Les messages : { titre, corps, tag, url, bruyante, actions }. Un meme `tag` REMPLACE
// la notification precedente — c'est ce qui fait avancer « 40 % » sur place au lieu
// d'empiler dix notifications. `bruyante` : la fin d'une file sonne, la progression non.
// `actions` : les boutons (deux au plus sur Android) — Pause, Reprendre, Arreter,
// Analyser les resultats.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', ev => ev.waitUntil(self.clients.claim()));

self.addEventListener('push', ev => {
  let d;
  try { d = ev.data.json(); } catch { d = { titre: 'Atelier', corps: ev.data ? ev.data.text() : '' }; }
  ev.waitUntil(self.registration.showNotification(d.titre || 'Atelier', {
    body: d.corps || '',
    tag: d.tag || 'atelier',
    renotify: !!d.bruyante,
    silent: !d.bruyante,
    icon: 'icons/atelier-192.png',
    badge: 'icons/atelier-badge-96.png',
    actions: (d.actions || []).slice(0, 2),
    data: { url: d.url || 'lancer.html' }
  }));
});

// Les boutons Pause / Reprendre / Arreter commandent la file sans ouvrir l'app : le
// serveur repond en envoyant la notification suivante (« En pause », « 45 % »…).
// « Analyser les resultats », ou toucher la notification elle-meme, ouvre la page du
// calcul — celle deja ouverte si elle existe.
const COMMANDES = ['pause', 'reprendre', 'stop'];

self.addEventListener('notificationclick', ev => {
  ev.notification.close();
  if (COMMANDES.includes(ev.action)) {
    ev.waitUntil(fetch(new URL('/api/run/' + ev.action, self.location.origin), { method: 'POST' }).catch(() => {}));
    return;
  }
  const url = ev.action === 'analyser' ? 'lancer.html#resultats' : ev.notification.data.url;
  const cible = new URL(url, self.registration.scope).href;
  ev.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const deja = fenetres.find(f => f.url.split('#')[0] === cible.split('#')[0]);
    if (deja) { if ('navigate' in deja) await deja.navigate(cible).catch(() => {}); return deja.focus(); }
    return self.clients.openWindow(cible);
  })());
});
