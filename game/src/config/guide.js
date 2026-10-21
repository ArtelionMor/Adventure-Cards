// GAME CONFIG — LE COMBAT GUIDE (docs/TUTORIEL.md, chapitre 1 : « comprendre le jeu »).
//
// Le premier combat du Potager se joue EN MANUEL, avec des BULLES : une a la fois, pointee sur ce qu'il faut toucher,
// montree quand son moment arrive et jamais deux fois. Aucune ne bloque le jeu ni ne demande un toucher pour partir :
// une bulle d'action s'en va quand le joueur a fait le geste (ou l'a fait avant qu'on le lui dise), une bulle
// d'information au bout de `dureeMs`. Pendant une action engagee (le masque noir), la bulle se cache.
//
// Une etape : { id, texte, cible, dureeMs? } — l'ORDRE est la priorite (la premiere etape dont le moment est venu
// passe devant). `cible` dit ce que la bulle pointe (ui/guide.js) : 'carte' (une carte jouable de ta main), 'fin'
// (« Fin de tour »), 'unite' (ton unite prete a attaquer), 'heros' (le heros adverse), 'pioche' (ta pioche), 'auto'
// (le bouton Auto). Le moment de chaque etape et ce qui la termine sont dans ui/guide.js, par identifiant.
// Une quete declenche le guide par son champ `guide` (config/quetes.js). PROVISOIRE : les textes.
// LA FEUILLE GAGNE : l'onglet « tutorial_guide » (une ligne par bulle : id, guide, cible, texte, duree_s) remplace un guide
// des qu'il en a des lignes (config/feuille.js, `guidesDepuisFeuille`). Ce qui suit est la valeur du code.
import { FEUILLE } from '../../data/feuille.data.js';
import { guidesDepuisFeuille } from './feuille.js';

export const GUIDES_DU_CODE = {
  premierCombat: [
    { id: 'poser', cible: 'carte',
      texte: 'C’est ton tour ! Ton mana se remplit à chaque tour, et grandit de 1. Touche une carte pour la poser.' },
    { id: 'attaque', cible: 'unite',
      texte: 'Ton Lapin est prêt : touche-le, puis touche ce qu’il doit frapper.' },
    { id: 'heros', cible: 'heros',
      texte: 'La voie est libre : frappe le héros adverse ! À 0 PV, tu as gagné.' },
    { id: 'fin', cible: 'fin',
      texte: 'Plus rien à faire ? Touche « Fin de tour » : l’adversaire joue, puis c’est encore à toi.' },
    { id: 'fatigue', cible: 'pioche', dureeMs: 6000,
      texte: 'Ta pioche est vide : tu tires maintenant dans la pile de fatigue, des cartes qui ne s’épuisent jamais.' },
    { id: 'auto', cible: 'auto', dureeMs: 6000,
      texte: 'Le bouton Auto joue à ta place. Un toucher sur l’écran te rend la main.' }
  ]
};

export const GUIDES = { ...GUIDES_DU_CODE, ...(guidesDepuisFeuille(FEUILLE.tutorial_guide) || {}) };
