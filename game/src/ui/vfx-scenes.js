// LES SCENES D'UNE CARTE : fabriquer, pour une carte et un MOMENT de sa vie, les evenements qu'un vrai combat
// produirait — pour les REJOUER (le wiki de l'Atelier, la console de triche). Rien ici ne joue de partie : ce sont
// des evenements de mise en scene (pas de PV qui bougent), que `effets.js` lit comme ceux du moteur.
import { refCarte } from '../combat/evenements.js';

/** Les moments qu'une carte a, d'apres ses donnees : `[cle, libelle]`. */
export function momentsDe(card) {
  const out = [['jouer', card.type === 'ally' ? 'Quand on la pose' : 'Quand on la joue']];
  const ally = card.type === 'ally';
  const slots = Object.keys(card).filter(k => k.startsWith('on_') && Array.isArray(card[k]) && card[k].length);
  if (ally) out.push(['attaque', 'Quand elle attaque']);
  if ((card.death || []).length || ally) out.push(['mort', 'Quand elle meurt']);
  if ((card.turnStart || []).length) out.push(['debut', 'Au début de ton tour']);
  if ((card.turnEnd || []).length) out.push(['fin', 'À la fin de ton tour']);
  if (slots.length) out.push(['regle', 'Quand sa règle se déclenche']);
  return out;
}

/** Une unite de mise en scene qui porte l'identite de la carte (c'est `id` que `effets.js` lit pour trouver sa signature). */
export function fauxUnite(card, camp, uid) {
  return { k: 'unite', camp, uid, nom: card.name, id: card.id, sprite: card.sprite || null, atk: card.atk || 0, hp: card.hp || 1, maxHp: card.hp || 1, keys: [...(card.keys || [])], cout: card.cost, jeton: false };
}

/** Ce que des EFFETS provoquent (leurs evenements), pour que la scene ait de quoi animer. */
function enfants(ops, cause, ctx) {
  const { ev, heroE, heroP, allies, ennemis, src } = ctx;
  for (const e of ops || []) {
    const t = e.t || e.target;
    switch (e.op) {
      case 'dmg': {
        const v = typeof e.v === 'number' ? e.v : 2;
        const cibles = ['allEnemyUnits', 'enemyUnits'].includes(t) && ennemis.length ? ennemis : [heroE];
        for (const c of cibles) ev({ t: 'degats', cible: c, n: v, perdu: v, avant: 30, apres: 30 - v }, cause);
        break;
      }
      case 'heal': ev({ t: 'soin', cible: allies[0] || heroP, n: 4, soigne: 4, avant: 2, apres: 6 }, cause); break;
      case 'buff': case 'renforce_les_cartes': {
        const tous = ['allAllies', 'sameTypeAllies', 'otherAllies'].includes(t);
        for (const c of tous ? allies : [allies[0] || src]) ev({ t: 'renfort', atk: e.atk || 1, hp: e.hp || 1, cle: e.key || null, cible: c }, cause);
        break;
      }
      case 'summon': case 'pose_sur_le_plateau': ev({ t: 'invoque', via: 'jeton', camp: 'p', unite: allies[0] || src }, cause); break;
      case 'armor': ev({ t: 'armure', camp: 'p', v: typeof e.v === 'number' ? e.v : 2 }, cause); break;
      case 'mana': case 'mana_au_prochain_tour': ev({ t: 'mana', camp: 'p', v: 2, promis: e.op !== 'mana' }, cause); break;
      case 'copie': ev({ t: 'transforme', mode: 'copie', de: [src.nom], modele: null, unites: [src, ...allies] }, cause); break;
      case 'switch': ev({ t: 'transforme', mode: 'switch', de: src.nom, unite: allies[0] || src }, cause); break;
      default: break;
    }
  }
}

/**
 * Les evenements de `moment` pour `card`. `ctx` : { ev(evenement, cause) -> indice, src (la carte en unite, camp 'p'),
 * allies (les autres unites alliees), ennemis, heroP, heroE }.
 */
export function fabrique(card, moment, ctx) {
  const { ev, src, ennemis, heroE } = ctx;
  const cible = ennemis[0] || heroE;
  const regle = Object.keys(card).find(k => k.startsWith('on_') && Array.isArray(card[k]) && card[k].length);
  switch (moment) {
    case 'jouer': {
      const spell = card.type !== 'ally';
      const i = ev({ t: 'joue', camp: 'p', carte: refCarte({ ...card, inst: 0 }), paye: card.cost, zone: 'main', cible: spell && (card.play || []).some(e => e.op === 'dmg' || e.op === 'detruit') && !(card.play || []).some(e => ['allEnemyUnits', 'enemyUnits'].includes(e.t || e.target)) ? heroE : null, choix: null });
      if (!spell) ev({ t: 'invoque', via: 'carte', camp: 'p', unite: src }, i);
      enfants(card.play, i, ctx);
      break;
    }
    case 'attaque': {
      const i = ev({ t: 'attaque', camp: 'p', src, cible });
      ev({ t: 'degats', camp: 'p', src, cible, n: card.atk || 2, perdu: Math.min(card.atk || 2, 2), avant: 4, apres: 2 }, i);
      if (regle && /attack/.test(regle)) {
        const d = ev({ t: 'declenche', moment: regle, camp: 'p', src }, i);
        enfants(card[regle], d, ctx);
      }
      break;
    }
    case 'mort': {
      const i = ev({ t: 'attaque', camp: 'e', src: cible, cible: src });
      const d = ev({ t: 'degats', camp: 'e', src: cible, cible: src, n: 9, perdu: 3, avant: 3, apres: 0 }, i);
      const m = ev({ t: 'meurt', camp: 'p', unite: src, proprio: 'p' }, d);
      if ((card.death || []).length) {
        const x = ev({ t: 'declenche', moment: 'death', camp: 'p', src }, m);
        enfants(card.death, x, ctx);
      }
      break;
    }
    case 'debut': case 'fin': {
      const slot = moment === 'debut' ? 'turnStart' : 'turnEnd';
      const x = ev({ t: 'declenche', moment: slot, camp: 'p', src });
      enfants(card[slot], x, ctx);
      break;
    }
    case 'regle': {
      const x = ev({ t: 'declenche', moment: regle || 'on_spell_self', camp: 'p', src });
      enfants(regle ? card[regle] : [], x, ctx);
      break;
    }
    default: break;
  }
}
