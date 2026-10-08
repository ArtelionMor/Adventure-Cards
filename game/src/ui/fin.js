// L'ECRAN DE FIN DE COMBAT : le moment qui donne envie de rejouer.
//
// Il se pose PAR-DESSUS le plateau (qui reste visible, assombri) et se joue en scene : le titre
// s'abat, les recompenses defilent une a une avec un compteur, puis les boutons arrivent. Toucher
// l'ecran pendant la scene la termine d'un coup (jamais plus long que ce que le joueur veut).
// Procedural et sans image : les dessins du game designer viendront remplacer les confettis et le titre.
// Les durees sont dans `BALANCE.ui.fx.fin`.
import { BALANCE } from '../config/balance.js';
import { el } from './shell.js';

const COULEURS = ['#ffc46b', '#7fd6a6', '#6ec1ff', '#ff6f7f', '#d6a8ff'];

/**
 * `issue` : 'victoire', 'defaite' ou 'nul'. `recompenses` : [{ label, n }]. `notes` : lignes en retrait.
 * `boutons` : [{ texte, primaire, onClick }].
 */
export function montreFin({ racine, issue, sousTitre, recompenses = [], notes = [], boutons = [] }) {
  const f = BALANCE.ui.fx.fin;
  const titre = { victoire: 'Victoire', defaite: 'Défaite', nul: 'Match nul' }[issue];
  const calque = el(`
    <div class="fin ${issue}">
      <div class="fin-rayons"></div>
      <div class="fin-contenu">
        <div class="fin-titre">${titre}</div>
        <div class="fin-sous">${sousTitre || ''}</div>
        <div class="fin-gains"></div>
        <div class="fin-notes"></div>
        <div class="fin-boutons"></div>
      </div>
    </div>`);
  const gains = calque.querySelector('.fin-gains');
  const zoneNotes = calque.querySelector('.fin-notes');
  const zoneBoutons = calque.querySelector('.fin-boutons');
  for (const b of boutons) {
    const n = el(`<button class="btn ${b.primaire ? '' : 'ghost'}">${b.texte}</button>`);
    n.onclick = ev => { ev.stopPropagation(); b.onClick(); };
    zoneBoutons.appendChild(n);
  }
  racine.appendChild(calque);

  const minuteurs = [];
  const apres = (ms, fn) => { const id = setTimeout(fn, ms); minuteurs.push(id); };
  let fini = false;
  const termine = () => {
    if (fini) return;
    fini = true;
    minuteurs.forEach(clearTimeout);
    for (const g of gains.children) { g.style.opacity = 1; g.querySelector('b').textContent = g.dataset.n; }
    zoneNotes.style.opacity = 1;
    zoneBoutons.style.opacity = 1;
    zoneBoutons.style.pointerEvents = 'auto';
  };
  calque.addEventListener('pointerdown', termine);
  zoneBoutons.style.pointerEvents = 'none';

  // Le fond se ferme sur le plateau, le titre s'abat.
  calque.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350 });
  const t = calque.querySelector('.fin-titre');
  t.animate(issue === 'victoire' ? [
    { transform: 'scale(3.2)', opacity: 0 },
    { transform: 'scale(.92)', opacity: 1, offset: .55, easing: 'ease-in' },
    { transform: 'scale(1.06)', offset: .75 },
    { transform: 'scale(1)' }
  ] : [
    { transform: 'translateY(-90px)', opacity: 0 },
    { transform: 'translateY(8px)', opacity: 1, offset: .6, easing: 'ease-in' },
    { transform: 'translateY(0)' }
  ], { duration: f.titreMs, easing: 'cubic-bezier(.2,.8,.3,1)' });
  const sous = calque.querySelector('.fin-sous');
  sous.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: f.titreMs * .8, fill: 'backwards' });
  if (issue === 'victoire') {
    calque.querySelector('.fin-rayons').animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 24000, iterations: Infinity });
    confettis(calque, f);
  }

  // Les recompenses defilent une a une, avec un compteur.
  let tAt = f.titreMs + f.premierePauseMs;
  for (const r of recompenses) {
    const g = el(`<div class="fin-gain" data-n="${r.n}"><span>${r.label}</span><b>0</b></div>`);
    g.style.opacity = 0;
    gains.appendChild(g);
    const debut = tAt;
    apres(debut, () => {
      g.style.opacity = 1;
      g.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.18)', opacity: 1, offset: .6 }, { transform: 'scale(1)' }],
        { duration: 380, easing: 'ease-out' });
      const n = Number(r.n);
      const pas = Math.max(1, Math.round(f.compteMs / 40));
      for (let i = 1; i <= pas; i++) {
        apres(i * (f.compteMs / pas), () => { g.querySelector('b').textContent = Math.round(n * (1 - (1 - i / pas) ** 3)); });
      }
    });
    tAt += f.recompenseMs;
  }
  zoneNotes.innerHTML = notes.map(n => `<p>${n}</p>`).join('');
  zoneNotes.style.opacity = 0;
  zoneBoutons.style.opacity = 0;
  apres(tAt, () => {
    zoneNotes.style.opacity = 1;
    zoneBoutons.style.opacity = 1;
    zoneBoutons.style.pointerEvents = 'auto';
    zoneBoutons.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 400 });
    zoneNotes.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
  });
  return { termine };
}

/** Une pluie de confettis : des carres qui tombent en tournant, puis disparaissent. */
function confettis(calque, f) {
  const hauteur = calque.clientHeight || 800, largeur = calque.clientWidth || 375;
  for (let i = 0; i < f.confettis; i++) {
    const c = document.createElement('i');
    c.className = 'fin-confetti';
    c.style.cssText = `left:${Math.random() * largeur}px;top:-20px;background:${COULEURS[i % COULEURS.length]};width:${6 + Math.random() * 6}px;height:${8 + Math.random() * 8}px`;
    calque.appendChild(c);
    const dx = (Math.random() - .5) * 140, delai = Math.random() * 700;
    const duree = f.confettiMs * (.8 + Math.random() * .5);
    c.animate([
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx}px, ${hauteur * .8}px) rotate(${360 + Math.random() * 540}deg)`, opacity: 1, offset: .8 },
      { transform: `translate(${dx * 1.2}px, ${hauteur}px) rotate(900deg)`, opacity: 0 }
    ], { duration: duree, delay: delai, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'both' });
    setTimeout(() => c.remove(), duree + delai + 300);
  }
}
