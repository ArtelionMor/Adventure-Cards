// LES ICONES DU JEU. Chacune est un fichier `Graphical Assets/Icons/<Nom>.png` (celui que dessine le game
// designer) ; tant qu'il n'existe pas, l'ecran montre un SIGNE de remplacement a sa place, et le
// jour ou le fichier est depose il prend la place tout seul — sans une ligne a changer ici.
//
// C'est pour ca qu'on n'ecrit JAMAIS un picto en dur dans un ecran (« ⚔ », « ☠ ») : on dit
// `icone('Swords')`. Le signe de remplacement n'est qu'un echafaudage : un meme caractere ne se
// dessine pas pareil d'un appareil a l'autre, ce qui est justement ce qu'on veut quitter.
//
// Nom → signe de remplacement. La liste est celle demandee au game designer (8 octobre 2026) ;
// ajouter une icone = une ligne ici, et le fichier le jour ou il existe.
import { asset } from './shell.js';

export const ICONES = {
  // interface
  Log: '☰', Close: '✕', Auto: '▶', Manual: '✋', Deck: '▤', Discard: '▥',
  // « Revoir le combat » (21 oct. 2026) : les fleches des bords et la pause
  Previous: '◀', Next: '▶', Pause: '❚❚',
  // valeurs
  Mana: '◆', Attack: '⚔', Health: '♥', Armor: '⛨',
  // monnaies (dessins tires de la maquette Figma du game designer, 12 octobre 2026)
  Coin: '●', Gem: '◆',
  // evenements
  Swords: '⚔', Counter: '↩', Dead: '☠', Damage: '✸', Heal: '✚', Buff: '▲', Debuff: '▼', Summon: '✦',
  Draw: '▤', Destroy: '✖', Mill: '⇩', Exile: '⊘', Create: '✧', Return: '⤴', Shuffle: '⤨', Copy: '⧉',
  Switch: '⇄', Control: '⚑', Fatigue: '☁', Track: '🐾', Registry: '▦',
  // moments
  Deathrattle: '♱', Aura: '◎', Static: '∞', TurnStart: '☀', TurnEnd: '☾', Trigger: '↯',
  // mots-cles
  Taunt: '▣', Charge: '➤', Venom: '☣', Shield: '◍', Elusive: '◌', WallWalker: '⇉', Mirror: '◫', Flashback: '↺',
  // resultats d'un coup
  Cancel: '⊗', Choice: '⑂',
  // l'ecran d'equipe : la coche d'un heros dans l'equipe
  Check: '✔',
  // fin de combat
  Victory: '★', Defeat: '✖',
  // la barre de navigation (maquette « Arena Screen », 19 octobre 2026) : un dessin par ecran
  Arena: '⚔', Farm: '🌱', Map: '🗺', 'Icon Deck': '▤', Shop: '🛒',
  // les recompenses d'une arene (monnaies A et B), la coche d'un niveau battu
  Fanion: '⚑', Sceau: '✪', Validate: '✔',
  // le bandeau de quete (ui/quetes.js, 21 oct. 2026) : la quete en cours (dessin du game designer a venir)
  Quest: '❖',
  // « QUAND X » (une regle qui reagit a ce qui se passe : un sort lance, un allie qui arrive...) : l'oeil, ferme sur la
  // carte, qui s'ouvre quand sa regle se declenche (ui/effets.js, `oeil`). Dessins du game designer, 20 oct. 2026.
  Watch: '◉'
};

// Quand le dessin d'une icone ne porte pas son nom (rangé dans un sous-dossier, ou partage avec une autre icone) : le
// fichier, relatif a `DOSSIER_ICONES`, sans extension. Choix du game designer (20 oct. 2026) : le rale d'agonie prend le
// crane de la mort, le Venin la fiole de poison, « quand X » l'oeil ferme.
export const FICHIERS = {
  Deathrattle: 'Dead', Venom: 'Poison', Watch: 'Eye/Eye Close'
};
// Les cinq etapes de l'oeil qui s'ouvre (ui/effets.js), de ferme a ouvert.
export const OEIL = ['Eye/Eye Close', 'Eye/Eye 25%', 'Eye/Eye 50%', 'Eye/Eye 75%', 'Eye/Eye Open'];
// Les quatre bandes de brume d'une unite ELUSIVE (ui/battle.js), du plus clair au plus sombre : elles derivent sur la
// carte et changent d'opacite (CSS, `.brume`).
export const BRUME = ['Fog/White Fog', 'Fog/Grey Fog', 'Fog/Dark Grey Fog', 'Fog/Dark Fog'];

// Le dossier des icones (depuis le rangement du 19 octobre 2026 : `Icons/` est devenu `Graphical Assets/Icons/`).
export const DOSSIER_ICONES = 'Graphical Assets/Icons';
/** L'adresse du dessin de `nom` : sa version allegee quand elle existe (les icones de navigation font 2000 px). */
export const urlIcone = nom => asset(`${DOSSIER_ICONES}/${FICHIERS[nom] || nom}.png`);

// DES PICTOS DE TRAVAIL, en attendant les dessins du game designer. `Graphical Assets/Icons/Kenney/<fichier>.png` : le pack
// « Board Game Icons » de Kenney (CC0, licence a cote), blanc sur transparent, donc TEINTABLE (on le pose en
// masque, il prend la `color` du texte autour). Ordre de repli, pour chaque nom :
//   1. `Graphical Assets/Icons/<Nom>.png`, le dessin du game designer, des qu'il existe ;
//   2. le pictogramme Kenney ci-dessous ;
//   3. le signe de `ICONES`.
// Remplacer un picto de travail = deposer `Graphical Assets/Icons/<Nom>.png`, sans toucher a ce fichier.
// Tous remplissent leur carre : `tag_shield` et `tag_infinite` (un petit dessin dans le coin d'un carre vide) ont ete
// recadres le 21 oct. 2026, et l'Aura prend l'hexagone PLEIN (le contour seul se lisait trop petit sur une carte).
const KENNEY = {
  Mana: 'suit_diamonds', Attack: 'sword', Health: 'suit_hearts', Armor: 'shield',
  Swords: 'sword', Counter: 'arrow_counterclockwise', Dead: 'skull', Damage: 'fire', Heal: 'suit_hearts',
  Buff: 'arrow_diagonal', Debuff: 'suit_hearts_broken', Summon: 'token_add',
  Draw: 'cards_take', Destroy: 'skull', Mill: 'card_remove', Exile: 'lock_closed', Create: 'card_add',
  Return: 'cards_return', Shuffle: 'cards_shuffle', Copy: 'cards_flip', Switch: 'card_flip', Control: 'flag_triangle',
  Fatigue: 'cards_skull', Cancel: 'dice_close', Choice: 'cards_fan', Registry: 'cards_fan',
  Deathrattle: 'dice_skull', Aura: 'hexagon', Static: 'tag_infinite', TurnStart: 'hourglass_top', TurnEnd: 'hourglass_bottom', Trigger: 'exploding',
  Taunt: 'tag_shield', Charge: 'arrow_right', Venom: 'flask_full', Shield: 'shield', Elusive: 'hexagon_question',
  WallWalker: 'structure_wall', Mirror: 'hexagon_switch', Flashback: 'arrow_rotate',
  Victory: 'crown_a', Defeat: 'skull', Fanion: 'flag_triangle', Sceau: 'award'
};
const urlKenney = f => asset(`${DOSSIER_ICONES}/Kenney/${f}.png`);

/** Le pictogramme Kenney teintable de `nom`, ou null. */
const masque = (nom, style) => {
  const f = KENNEY[nom];
  return f ? `<span class="ico k" style="${style}--m:url('${urlKenney(f)}')" data-ico="${nom}"></span>` : null;
};

// Les icones dont le fichier manque : on ne les redemande pas (un 404 de plus par icone et par
// affichage, sinon). Remplie par l'ecouteur d'erreurs ci-dessous.
const absentes = new Set();

/**
 * L'icone `nom` en HTML. `taille` en pixels (carre). Le fichier si on l'a, le signe sinon.
 * Une ICONE INCONNUE (pas dans `ICONES`) rend son nom entre crochets : une faute de frappe se voit.
 */
export function icone(nom, taille = 20) {
  const g = ICONES[nom];
  if (g === undefined) return `<span class="ico g" style="--s:${taille}px" title="icone inconnue : ${nom}">[${nom}]</span>`;
  if (absentes.has(nom)) return masque(nom, `--s:${taille}px;`) || `<span class="ico g" style="--s:${taille}px" data-ico="${nom}">${g}</span>`;
  return `<img class="ico" style="--s:${taille}px" src="${urlIcone(nom)}" alt="" data-ico="${nom}">`;
}

/**
 * Pour l'ECRAN DE CHARGEMENT (ui/chargement.js) : les fichiers a precharger — l'icone dessinee de chaque nom
 * (`absente(nom)` est rappele si elle n'existe pas : plus de 404 ni de signe qui clignote dans les menus) et
 * chaque pictogramme Kenney.
 */
export function imagesDesIcones() {
  return [
    ...Object.keys(ICONES).map(nom => ({ url: urlIcone(nom), absente: () => absentes.add(nom) })),
    ...[...new Set(Object.values(KENNEY))].map(f => ({ url: urlKenney(f) })),
    // les etapes de l'oeil et les bandes de brume, animees en combat : chargees d'avance, elles ne clignotent pas
    ...[...OEIL, ...BRUME].map(f => ({ url: asset(`${DOSSIER_ICONES}/${f}.png`) }))
  ];
}

// Un fichier d'icone introuvable : le signe prend sa place, et on s'en souvient. L'evenement
// `error` d'une image ne remonte pas, d'ou l'ecoute en CAPTURE sur le document.
if (typeof document !== 'undefined') {
  document.addEventListener('error', ev => {
    const i = ev.target;
    if (!i || i.tagName !== 'IMG' || !i.dataset || !i.dataset.ico) return;
    const nom = i.dataset.ico;
    absentes.add(nom);
    const k = masque(nom, i.style.cssText.replace(/;?\s*$/, ';'));
    if (k) { i.insertAdjacentHTML('afterend', k); i.remove(); return; }
    const s = document.createElement('span');
    s.className = 'ico g';
    s.style.cssText = i.style.cssText;
    s.dataset.ico = nom;
    s.textContent = ICONES[nom];
    i.replaceWith(s);
  }, true);
}
