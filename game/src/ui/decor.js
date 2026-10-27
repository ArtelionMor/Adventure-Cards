// LE DECOR VIVANT du combat (ESSAI, 27 oct. 2026) : les arbres de la clairiere et les nenuphars de l'etang ne sont plus des fonds CSS mais
// des images posees dans une couche derriere le jeu (`.decor`, z-index -1 de `#battle`), que `skins/cozy.css` fait osciller ; plus, selon le
// fond, des feuilles qui tombent (clairiere), des rides (etang) et des lucioles (nuit). Rien de tout ca ne se touche : `pointer-events: none`.
// Les positions sont celles des anciens fonds CSS : [dessin, cote, decalage px, haut, largeur px]. Le PREMIER est celui du dessus.
import { BALANCE } from '../config/balance.js';

const D = (f, cote, dx, haut, w) => ({ f, cote, dx, haut, w });
const ARBRES = {
  clairiere: [
    D('pommier', 'right', -64, '68%', 140), D('buisson', 'right', -14, '60%', 62), D('chene2', 'right', -72, '46%', 145),
    D('sapin', 'right', -62, '29%', 130), D('chene', 'right', -66, '11%', 150),
    D('chene', 'left', -74, '66%', 150), D('pommier', 'left', -66, '50%', 140), D('buisson', 'left', -16, '46%', 60),
    D('chene2', 'left', -72, '32%', 140), D('sapin', 'left', -60, '16%', 130),
    D('chene2', 'right', -50, '-66px', 155), D('chene', 'left', -52, '-70px', 155),
    D('sapin', 'left', '24%', '-80px', 128), D('pommier', 'left', '62%', '-86px', 140),
  ],
  etang: [
    D('nenuphar-fleur', 'right', -20, '64%', 92), D('nenuphar', 'right', -34, '44%', 104), D('nenuphar', 'right', -26, '22%', 86),
    D('nenuphar', 'left', -30, '70%', 100), D('nenuphar-fleur', 'left', -22, '46%', 90), D('nenuphar', 'left', -34, '26%', 104),
    D('nenuphar-fleur', 'left', '30%', '-30px', 88), D('nenuphar', 'right', '6%', '-36px', 100), D('nenuphar', 'left', -30, '-28px', 96),
  ],
};
// Les petites choses qui passent : [classe, nombre]
const PASSANTS = { clairiere: ['feuille', 8], etang: ['ride', 6], nuit: ['luciole', 14] };

const px = v => (typeof v === 'number' ? v + 'px' : v);
const alea = (a, b) => a + Math.random() * (b - a);

function dessine(root) {
  root.querySelector(':scope > .decor')?.remove();
  const fond = root.dataset.fond;
  const arbres = ARBRES[fond], passants = PASSANTS[fond];
  if (!arbres && !passants) return;
  const vivant = BALANCE.ui.decorVivant;   // faux : les memes images, immobiles (le decor d'avant)
  const couche = document.createElement('div');
  couche.className = vivant ? 'decor' : 'decor fixe';
  // le premier de la liste est au-dessus : on les pose en dernier
  for (const a of (arbres || []).slice().reverse()) {
    const im = document.createElement('img');
    im.src = `/game/skins/cozy/${a.f}.svg`; im.alt = ''; im.draggable = false;
    im.className = `${a.f.startsWith('nenuphar') ? 'nenu' : 'arbre'} ${a.cote}`;
    im.style[a.cote] = px(a.dx); im.style.top = a.haut; im.style.width = a.w + 'px';
    im.style.setProperty('--duree', alea(4.5, 8).toFixed(1) + 's');
    im.style.animationDelay = `${-alea(0, 8).toFixed(1)}s`;
    couche.append(im);
  }
  if (passants && vivant) {
    const [classe, n] = passants;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.className = classe;
      p.style.left = alea(4, 94).toFixed(0) + '%';
      p.style.top = (classe === 'feuille' ? -6 : alea(8, 92)).toFixed(0) + '%';
      p.style.setProperty('--duree', alea(classe === 'feuille' ? 9 : 5, classe === 'feuille' ? 16 : 11).toFixed(1) + 's');
      p.style.setProperty('--dx', alea(-70, 70).toFixed(0) + 'px');
      p.style.animationDelay = `${-alea(0, 12).toFixed(1)}s`;
      couche.append(p);
    }
  }
  root.prepend(couche);
}

// A appeler apres que la coque a vide `#battle` ; le decor suit un changement de fond (Profil, `AC.fond`).
export function monteLeDecor(root) {
  dessine(root);
  if (!root._observeDecor) {
    root._observeDecor = new MutationObserver(() => { if (root.childElementCount) dessine(root); });
    root._observeDecor.observe(root, { attributes: true, attributeFilter: ['data-fond'] });
  }
}
