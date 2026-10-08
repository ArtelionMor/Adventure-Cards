// L'APERCU D'UN COUP : ce qui arriverait a une cible si on la designait, avant de s'engager.
//
// On ne le DEVINE pas avec une formule recopiee (Bouclier, Venin, Elusif, rales d'agonie,
// riposte... : une seconde copie des regles finirait par mentir). On JOUE le coup sur une
// copie du combat — la meme que celle du bot (`cloneBattle`) — et on compare l'avant et
// l'apres. Le moteur n'est pas touche, et l'apercu dit ce que le moteur ferait vraiment.
//
// ⚠ Un coup qui tire au hasard (« choisis au hasard parmi… ») peut tomber autrement pour de
// vrai : l'apercu en montre UN tirage. La cible, elle, est toujours celle que le joueur a
// designee, donc le cas courant (un sort de degats sur une unite) est exact.
import { cloneBattle, attack, playCard } from '../combat/engine.js';
import { asset } from './shell.js';

/** L'etat qui compte d'une cible : un heros (ses PV) ou une unite (attaque, vie, bouclier). */
function lis(B, side, uid) {
  if (uid === 'hero') return { hero: true, hp: B[side].hp };
  const u = B[side].board.find(x => x.uid === uid);
  return u ? { hp: u.hp, atk: u.atk, bouclier: !!u.shield } : null;
}

/** Avant → apres : `mort` quand il n'en reste rien (retiree du plateau, ou PV a 0). */
function resultat(avant, apres) {
  if (!avant) return null;
  if (!apres || apres.hp <= 0) return { avant, mort: true };
  return { avant, apres, mort: false };
}

const cle = t => `${t.side}:${t.uid}`;

/** Pour chaque cible possible d'une attaque : { cible, acteur } (l'acteur meurt-il a la riposte ?). */
export function apercuAttaque(B, k, uidActeur, cibles) {
  const out = new Map();
  for (const t of cibles) {
    try {
      const C = cloneBattle(B);
      const avantCible = lis(B, t.side, t.uid), avantActeur = lis(B, k, uidActeur);
      if (!attack(C, k, uidActeur, t)) continue;
      out.set(cle(t), {
        cible: resultat(avantCible, lis(C, t.side, t.uid)),
        acteur: resultat(avantActeur, lis(C, k, uidActeur))
      });
    } catch { /* un apercu qui echoue ne doit jamais gener le coup lui-meme */ }
  }
  return out;
}

/** Pour chaque cible possible d'une carte jouee depuis `zone` : { cible }. */
export function apercuCarte(B, k, index, zone, choix, cibles) {
  const out = new Map();
  for (const t of cibles) {
    try {
      const C = cloneBattle(B);
      const avantCible = lis(B, t.side, t.uid);
      if (!playCard(C, k, index, t, choix, zone)) continue;
      out.set(cle(t), { cible: resultat(avantCible, lis(C, t.side, t.uid)), acteur: null });
    } catch { /* idem */ }
  }
  return out;
}

const MORT = `<img class="mort" src="${asset('Icons/Dead.png')}" alt="">`;

/**
 * Le texte de l'apercu, en HTML : une ligne pour la cible, et une seconde — l'icone « mort »
 * et « riposte » — quand c'est l'unite qui attaque qui ne survivra pas au coup.
 */
export function pilule(ap) {
  if (!ap) return '';
  const r = ap.cible;
  let l1 = '';
  if (r) {
    if (r.mort) l1 = `<span class="l1 mal">${MORT}<b>mort</b></span>`;
    else if (r.avant.atk !== undefined && r.apres.atk !== r.avant.atk) {
      const bon = r.apres.atk + r.apres.hp >= r.avant.atk + r.avant.hp;
      l1 = `<span class="l1 ${bon ? 'bon' : 'mal'}">${r.avant.atk}/${r.avant.hp} → ${r.apres.atk}/${r.apres.hp}</span>`;
    } else if (r.apres.hp === r.avant.hp) {
      l1 = `<span class="l1">${r.avant.bouclier && !r.apres.bouclier ? 'bouclier brisé' : 'sans effet'}</span>`;
    } else {
      l1 = `<span class="l1 ${r.apres.hp > r.avant.hp ? 'bon' : 'mal'}">${r.avant.hp} → ${r.apres.hp}</span>`;
    }
  }
  const l2 = ap.acteur && ap.acteur.mort ? `<span class="l2 mal">${MORT}riposte</span>` : '';
  return l1 + l2;
}
