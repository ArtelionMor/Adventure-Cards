// LES ICONES DU JEU. Chacune est un fichier `Icons/<Nom>.png` (celui que dessine le game
// designer) ; tant qu'il n'existe pas, l'ecran montre un SIGNE de remplacement a sa place, et le
// jour ou le fichier est depose il prend la place tout seul — sans une ligne a changer ici.
//
// C'est pour ca qu'on n'ecrit JAMAIS un picto en dur dans un ecran (« ⚔ », « ☠ ») : on dit
// `icone('Swords')`. Le signe de remplacement n'est qu'un echafaudage : un meme caractere ne se
// dessine pas pareil d'un appareil a l'autre, ce qui est justement ce qu'on veut quitter.
//
// Nom → signe de remplacement. La liste est celle demandee au game designer (8 octobre 2026) ;
// ajouter une icone = une ligne ici, et le fichier le jour ou il existe.
export const ICONES = {
  // interface
  Log: '☰', Close: '✕', Auto: '▶', Manual: '✋', Deck: '▤', Discard: '▥',
  // valeurs
  Mana: '◆', Attack: '⚔', Health: '♥', Armor: '⛨',
  // evenements
  Swords: '⚔', Counter: '↩', Dead: '☠', Damage: '✸', Heal: '✚', Buff: '▲', Debuff: '▼', Summon: '✦',
  Draw: '▤', Destroy: '✖', Mill: '⇩', Exile: '⊘', Create: '✧', Return: '⤴', Shuffle: '⤨', Copy: '⧉',
  Switch: '⇄', Control: '⚑', Fatigue: '☁',
  // moments
  Deathrattle: '♱', Aura: '◎', Static: '∞', TurnStart: '☀', TurnEnd: '☾', Trigger: '↯',
  // mots-cles
  Taunt: '▣', Charge: '➤', Venom: '☣', Shield: '◍', Elusive: '◌', WallWalker: '⇉', Mirror: '◫', Flashback: '↺',
  // resultats d'un coup
  Cancel: '⊗', Choice: '⑂',
  // fin de combat
  Victory: '★', Defeat: '✖'
};

// DES PICTOS DE TRAVAIL, en attendant les dessins du game designer. `Icons/Kenney/<fichier>.png` : le pack
// « Board Game Icons » de Kenney (CC0, licence a cote), blanc sur transparent, donc TEINTABLE (on le pose en
// masque, il prend la `color` du texte autour). Ordre de repli, pour chaque nom :
//   1. `Icons/<Nom>.png`, le dessin du game designer, des qu'il existe ;
//   2. le pictogramme Kenney ci-dessous ;
//   3. le signe de `ICONES`.
// Remplacer un picto de travail = deposer `Icons/<Nom>.png`, sans toucher a ce fichier.
const KENNEY = {
  Mana: 'suit_diamonds', Attack: 'sword', Health: 'suit_hearts', Armor: 'shield',
  Swords: 'sword', Counter: 'arrow_counterclockwise', Dead: 'skull', Damage: 'fire', Heal: 'suit_hearts',
  Buff: 'arrow_diagonal', Debuff: 'suit_hearts_broken', Summon: 'token_add',
  Draw: 'cards_take', Destroy: 'skull', Mill: 'card_remove', Exile: 'lock_closed', Create: 'card_add',
  Return: 'cards_return', Shuffle: 'cards_shuffle', Copy: 'cards_flip', Switch: 'card_flip', Control: 'flag_triangle',
  Fatigue: 'cards_skull', Cancel: 'dice_close', Choice: 'cards_fan',
  Deathrattle: 'dice_skull', Aura: 'hexagon_outline', Static: 'tag_infinite', TurnStart: 'hourglass_top', TurnEnd: 'hourglass_bottom', Trigger: 'exploding',
  Taunt: 'tag_shield', Charge: 'arrow_right', Venom: 'flask_full', Shield: 'shield', Elusive: 'hexagon_question',
  WallWalker: 'structure_wall', Mirror: 'hexagon_switch', Flashback: 'arrow_rotate',
  Victory: 'crown_a', Defeat: 'skull'
};

/** Le pictogramme Kenney teintable de `nom`, ou null. */
const masque = (nom, style) => {
  const f = KENNEY[nom];
  return f ? `<span class="ico k" style="${style}--m:url('/Icons/Kenney/${f}.png')" data-ico="${nom}"></span>` : null;
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
  return `<img class="ico" style="--s:${taille}px" src="/Icons/${encodeURIComponent(nom)}.png" alt="" data-ico="${nom}">`;
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
