// LE SERVICE WORKER DU JEU — pour les notifications, et RIEN D'AUTRE (comme `builder/sw.js` pour l'Atelier).
//
// Aucun cache, aucune interception de requete : le jeu doit toujours relire ses fichiers frais. Ce fichier ne sert qu'a recevoir les messages
// push du serveur (`scripts/lib/rappels-jeu.mjs` : fin d'une enchere ou l'on a mise, grading termine, tournoi qui s'ouvre) et a les afficher,
// JEU FERME OU NON. Un message ne s'affiche pas si le jeu est deja a l'ecran : le joueur le voit mieux dedans.
// Les messages : { titre, corps, tag, url, bruyante }. Un meme `tag` remplace la notification precedente.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', ev => ev.waitUntil(self.clients.claim()));

self.addEventListener('push', ev => {
  let d;
  try { d = ev.data.json(); } catch { d = { titre: 'Adventure Card', corps: ev.data ? ev.data.text() : '' }; }
  ev.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (fenetres.some(f => f.visibilityState === 'visible')) return;
    await self.registration.showNotification(d.titre || 'Adventure Card', {
      body: d.corps || '',
      tag: d.tag || 'jeu',
      renotify: !!d.bruyante,
      icon: '/Graphical%20Assets/Icons/Icon.png',
      data: { url: d.url || '/game/index.html' }
    });
  })());
});

// Toucher la notification ramene au jeu : la fenetre deja ouverte si elle existe.
self.addEventListener('notificationclick', ev => {
  ev.notification.close();
  const cible = new URL(ev.notification.data.url, self.registration.scope).href;
  ev.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const deja = fenetres.find(f => f.url.split('#')[0].split('?')[0] === cible.split('#')[0].split('?')[0]) || fenetres[0];
    if (deja) return deja.focus();
    return self.clients.openWindow(cible);
  })());
});
