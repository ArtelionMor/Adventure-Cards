// JOURNAL DE DECISIONS — enregistrer un combat de facon qu'on puisse, pour CHAQUE
// decision, reconstituer tout ce qui etait possible et ce qui a ete choisi.
//
// `B.log` dit ce qui a ete joue ; il ne dit jamais ce qui a ete ECARTE. C'est
// justement ce qu'on cherche quand on veut apprendre au bot a jouer comme le game
// designer : « a ce moment-la, tu avais ces sept coups, le bot aurait pris celui-ci,
// tu as pris celui-la — pourquoi ? ».
//
// SIX PRINCIPES, et chaque ligne de ce fichier en decoule :
//   1. ETAT COMPLET, PAS DE DEDUCTION. Chaque decision embarque une photo des deux
//      camps, main adverse et ordre des pioches compris. Le bloc `vue` dit ensuite ce
//      que celui qui decidait pouvait SAVOIR : on ne reproche pas a un joueur d'avoir
//      ignore une carte qu'il ne voyait pas.
//   2. AUCUN REJEU NECESSAIRE. Le moteur tire a `Math.random` sans graine : une partie
//      ne se rejoue pas. Le fichier doit donc se suffire a lui-meme.
//   3. DES DONNEES, PAS DU TEXTE. Des identifiants stables (`id` de carte, `inst`
//      d'exemplaire, `uid` d'unite), jamais seulement un nom affiche. Les phrases de
//      `B.log` sont gardees en complement, dans le champ `journal`.
//   4. AUTONOME ET VERSIONNE. Chaque fichier porte `v` (la version du schema) et une
//      empreinte des donnees de cartes : relu dans six mois, il reste interpretable
//      meme si les cartes ont change depuis.
//   5. COUT NUL HORS ENREGISTREMENT. Sans `B.journal`, `joue()` ne fait qu'appeler
//      l'action : zero allocation, zero copie. L'idle d'un joueur ne paie pas pour un
//      outil de game design.
//   6. UNE SEULE SOURCE. Le jeu, l'arene (`tools/arene.js`) et les scripts de
//      l'Atelier passent tous par `joue()`. C'est ce que verifie le banc du partage.
//
// FORMAT : du JSONL — une ligne = un objet JSON = un evenement. Trois types, dans cet
// ordre : un `debut`, N `decision`, un `fin`. Toute ligne porte `t` (le type), `v` (la
// version du schema) et `i` (son rang dans le fichier, a partir de 0).
//
// REGLE DE COMPATIBILITE : ajouter un champ ne change pas `v`. Renommer, supprimer ou
// changer le sens d'un champ incremente `v` — et se note dans l'historique, en bas.
import { BALANCE } from '../config/balance.js';
import { CHARACTER_DATA } from '../../data/characters.data.js';
import { TRIGGERS, cardCost, choixDeLaCarte } from '../config/mechanics.js';
import { canPlay, needsChoice, needsTarget, legalTargets, attackableTargets, playCard, attack, endTurn, other } from './engine.js';
import { evalue, ecouteLesChoix } from './ai.js';

/** La version du schema. Voir l'historique en bas de ce fichier. */
export const VERSION = 1;

// ------------------------------------------------------------- identifiants
/**
 * L'IDENTIFIANT D'EXEMPLAIRE d'une carte. `makeSide` en pose un sur les 15 cartes de
 * depart ; deux cas le manquent, et un seul endroit les rattrape :
 *   - une carte FABRIQUEE en cours de combat (« Cree une carte », pile de fatigue) n'en
 *     a pas du tout ;
 *   - une carte COPIEE porte celui de son modele, donc un identifiant deja pris.
 * Les deux recoivent ici un identifiant neuf, prefixe par `c` (« p-c03 »). On passe par
 * l'IDENTITE de l'objet (une WeakMap) et non par son contenu : c'est la seule chose qui
 * reste vraie quand deux cartes sont rigoureusement identiques.
 */
function instDe(j, camp, carte) {
  let id = j.inst.get(carte);
  if (id) return id;
  id = carte.inst;
  if (!id || j.pris.has(id)) id = `${camp}-c${String(++j.creees).padStart(2, '0')}`;
  j.inst.set(carte, id);
  j.pris.add(id);
  return id;
}

/**
 * Une empreinte des donnees qui ont servi a ce combat. Pas une signature : de quoi
 * repondre « est-ce bien les memes cartes ? » a la lecture d'un vieux fichier.
 * FNV-1a, parce qu'il tient en six lignes et ne demande aucune dependance — ni
 * `node:crypto` (absent du navigateur) ni `SubtleCrypto` (qui est asynchrone).
 */
function empreinte(texte) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// ----------------------------------------------------------- mise en donnees
/**
 * Ce qu'une carte FAIT, recopie tel quel. Le journal garde les structures brutes et
 * non une phrase : une IA qui relit le fichier dans six mois n'aura pas le registre des
 * mecaniques sous la main, mais elle aura le texte de la carte (`texte`) a cote.
 * La boucle passe par `TRIGGERS` : un moment ajoute au registre est emporte tout seul.
 */
function effetsJson(x) {
  const o = {};
  for (const slot of Object.keys(TRIGGERS)) if ((x[slot] || []).length) o[slot] = x[slot];
  if (x.aura) o.aura = x.aura;
  if ((x.statics || []).length) o.statiques = x.statics;
  if (x.gardes && Object.keys(x.gardes).length) o.gardes = x.gardes;
  return o;
}

/**
 * LE FORMAT `carte`, reutilise partout (deck de depart, main, modele d'une unite).
 * Trois couts, et ils ne disent pas la meme chose :
 *   `coutBase`  ce qui est imprime sur la carte (« Reduit le cout » le reecrit) ;
 *   `cout`      ce qu'elle coute A CET INSTANT — mot-cle « X de moins » et effets
 *               statiques en jeu compris. C'est ce qu'on paie.
 */
function carteJson(j, B, k, c) {
  return {
    inst: instDe(j, k, c),
    id: c.id || null,
    nom: c.name,
    type: c.type,
    cout: cardCost(c, B, k),
    coutBase: c.cost,
    atk: c.atk ?? null,
    pv: c.hp ?? null,
    cles: [...(c.keys || [])],
    texte: c.text || '',
    perso: c.owner || null,
    niveauPerso: c.ownerLevel ?? null,
    paliers: [...(c.unlocked || [])],
    effets: effetsJson(c)
  };
}

/**
 * LE FORMAT `unite`. On separe ce qu'elle EST (`atkBase`/`pvBase`, ce que la carte
 * apporte) de ce qu'on lui a FAIT (`degats`) et de ce qui en sort (`atk`/`pv`, les
 * valeurs derivees ou les auras se lisent) : le journal doit pouvoir expliquer un
 * « 4/5 », pas seulement l'afficher.
 * Un jeton n'a pas de carte : son `inst` et son `id` sont nuls, c'est ce qui le designe.
 */
function uniteJson(j, k, u) {
  return {
    uid: u.uid,
    inst: u.card ? instDe(j, k, u.card) : null,
    id: u.card ? (u.card.id || null) : null,
    nom: u.name,
    atk: u.atk,
    pv: u.hp,
    pvMax: u.maxHp,
    atkBase: u.baseAtk,
    pvBase: u.baseHp,
    degats: u.damage,
    cles: [...(u.keys || [])],
    peutAttaquer: !!u.canAttack && u.atk > 0,
    aura: u.aura || null,
    statiques: u.statics || [],
    effets: effetsJson(u)
  };
}

/** L'etat complet d'un camp. Rien n'est deduit : tout ce que le moteur sait y est. */
function etatCamp(j, B, k) {
  const s = B[k];
  return {
    pv: s.hp,
    pvMax: s.maxHp,
    armure: s.armor,
    mana: s.mana,
    manaMax: s.maxMana,
    manaCap: s.manaCap,
    manaProchainTour: s.nextMana,
    // La main porte deux champs de plus : ce que la carte coute maintenant et si on
    // peut la jouer. `jouable` repond a la question que se posait le joueur.
    main: s.hand.map(c => ({ ...carteJson(j, B, k, c), coutActuel: cardCost(c, B, k), jouable: canPlay(B, k, c) })),
    plateau: s.board.map(u => uniteJson(j, k, u)),
    // DESSUS EN PREMIER. Dans le moteur, le dessus d'un paquet est la FIN du tableau
    // (c'est la que `draw()` va chercher) : on retourne, sinon on lirait l'ordre de
    // pioche a l'envers et toute l'analyse s'en trouverait fausse.
    pioche: [...s.deck].reverse().map(c => instDe(j, k, c)),
    defausse: s.discard.map(c => instDe(j, k, c)),
    // Les compteurs du tour : ce sont eux qui expliquent un « pourquoi je ne peux plus
    // jouer » (les trois plafonds statiques) ou une caracteristique variable.
    jouees: s.jouees,
    attaques: s.attaques,
    piochees: s.piochees,
    sortsTour: s.spellsTurn,
    sortsPartie: s.spellsGame,
    fatigue: s.fatigue,
    piocheVide: !!s.aVide
  };
}

/**
 * CE QUE CELUI QUI DECIDE POUVAIT SAVOIR. L'etat, lui, dit tout — y compris la main
 * adverse et l'ordre des pioches. Sans ce bloc, l'analyse reprocherait a un joueur de
 * ne pas avoir joue autour d'une carte qu'il ne pouvait pas voir.
 * Le joueur connait les heros d'en face, donc les 15 cartes du deck adverse, mais pas
 * leur repartition entre main et pioche : `cartesAdversesVues` liste celles qui sont
 * REELLEMENT sorties — posees sur le plateau, ou passees a la defausse.
 */
function vueJson(j, B, k) {
  const f = other(k);
  const eux = B[f];
  return {
    mainAdverseTaille: eux.hand.length,
    piocheAdverseTaille: eux.deck.length,
    piochePropreTaille: B[k].deck.length,
    cartesAdversesVues: [
      ...eux.discard.map(c => instDe(j, f, c)),
      ...eux.board.filter(u => u.card).map(u => instDe(j, f, u.card))
    ]
  };
}

// ------------------------------------------------------------------- coups
const cibleJson = t => (t ? { camp: t.side, uid: t.uid } : null);

/**
 * Un coup du moteur traduit pour le fichier. On ecrit l'`inst` de la carte et NON son
 * index dans la main : l'index change des qu'une carte est jouee, l'`inst` ne bouge
 * jamais. C'est ce qui rend deux lignes du journal comparables entre elles.
 */
function coupJson(j, B, k, a) {
  if (!a || a.type === 'end') return { type: 'end' };
  if (a.type === 'attack') return { type: 'attack', uid: a.uid, cible: cibleJson(a.target) };
  const c = B[k].hand[a.index];
  // LA CIBLE N'EST RETENUE QUE SI ELLE DESIGNE VRAIMENT QUELQUE CHOSE. Quand une carte
  // demande une cible qu'aucune unite ne peut remplir, le bot pointe le heros adverse
  // et l'interface ne pointe rien : les deux veulent dire « pas de cible designee ».
  // Le journal l'ecrit d'une seule facon, sinon le meme coup s'ecrirait de deux
  // manieres et ne se retrouverait pas dans ses propres coups legaux.
  const vise = c && a.target && needsTarget(c, a.choix)
    && legalTargets(B, k, c, a.choix).some(t => t.side === a.target.side && t.uid === a.target.uid);
  return { type: 'play', inst: c ? instDe(j, k, c) : null, cible: vise ? cibleJson(a.target) : null, choix: a.choix || null };
}

/**
 * TOUS les coups possibles a cet instant — une entree par carte ET PAR CIBLE LEGALE,
 * la ou le bot n'en garde qu'une (la cible qu'il vise). La difference compte : le
 * joueur humain, lui, a pu viser ailleurs, et son coup doit se retrouver dans cette
 * liste. C'est d'ailleurs ce que verifie le banc.
 */
function coupsLegaux(j, B, k) {
  const out = [];
  for (const c of B[k].hand) {
    if (!canPlay(B, k, c)) continue;
    // Le MEME identifiant que celui du coup joue : une carte fabriquee en combat n'a
    // pas d'`inst` a elle, et lire `c.inst` en direct rendrait ici un `null` la ou le
    // coup, lui, porte l'identifiant attribue par le journal.
    const inst = instDe(j, k, c);
    // Une carte « Choisir » fait deux coups : les branches n'ont pas les memes cibles.
    for (const choix of needsChoice(c) ? choixDeLaCarte(c) : [null]) {
      const cibles = needsTarget(c, choix) ? legalTargets(B, k, c, choix) : [];
      // Aucune cible a designer (elle se resout seule, ou la branche vise en face) :
      // la carte part quand meme, cible nulle — c'est ce que recoit `playCard`.
      if (!cibles.length) out.push({ type: 'play', inst, cible: null, choix });
      else for (const t of cibles) out.push({ type: 'play', inst, cible: cibleJson(t), choix });
    }
  }
  for (const u of B[k].board) {
    if (!u.canAttack || u.atk <= 0) continue;
    for (const t of attackableTargets(B, k, u)) out.push({ type: 'attack', uid: u.uid, cible: cibleJson(t) });
  }
  out.push({ type: 'end' });
  return out;
}

// ------------------------------------------------------------- l'evaluation
/**
 * CE QUE LE BOT PENSAIT DES COUPS. Pour une decision du bot, c'est ce que le mouchard
 * (`ecouteLesChoix`) vient de noter — il a deja decide quand on arrive ici. Pour une
 * decision humaine, on rejoue la meme reflexion sur une COPIE, sans jouer le coup.
 * C'est ce champ, et lui seul, qui permet de reperer automatiquement les decisions ou
 * l'humain et le bot divergent.
 */
function evaluationJson(j, B, k, controle, niveau) {
  const note = j.note;
  j.note = null;   // une note ne sert qu'une fois : sinon elle collerait a la decision suivante
  if (controle === 'bot' && note && note.b === B && note.camp === k && note.tour === B.turnNo) {
    return {
      niveau: niveau || null,
      critere: note.critere,
      candidats: note.candidats.map(c => ({ coup: coupJson(j, B, k, c.coup), note: c.victoires ?? c.valeur ?? null })),
      choixBot: coupJson(j, B, k, note.choisi.coup)
    };
  }
  if (controle !== 'humain') return null;
  const e = evalue(B, k, j.niveauReference);
  return {
    niveau: e.niveau,
    critere: e.critere,
    // Les coups viennent d'une copie, mais on les traduit contre le combat REEL : la
    // main a le meme contenu dans le meme ordre, et c'est la vraie carte qu'on veut
    // nommer (son `inst` n'existe que de ce cote-ci).
    candidats: e.candidats.map(c => ({ coup: coupJson(j, B, k, c.coup), note: c.victoires ?? c.valeur ?? null })),
    choixBot: coupJson(j, B, k, e.choisi)
  };
}

// --------------------------------------------------------------- ecriture
/** Une ligne de plus dans le fichier. On fige le texte tout de suite (voir `joue`). */
function ligne(j, t, obj) {
  j.lignes.push(JSON.stringify({ t, v: VERSION, i: j.i++, ...obj }));
}

/**
 * Les phrases de `B.log` ecrites depuis la ligne precedente. `B.logTotal` compte TOUT
 * ce qui a ete dit, `B.log` ne garde que les 400 dernieres : c'est la difference des
 * deux qui dit combien de lignes sont neuves, et donc lesquelles prendre.
 * Si plus de 400 lignes se sont dites depuis la derniere decision, le moteur en a
 * vraiment perdu — on le signale plutot que de faire comme si de rien n'etait.
 */
function depuisLaDerniereFois(j, B) {
  const total = B.logTotal || 0;
  let n = total - j.dernierLog;
  j.dernierLog = total;
  const out = [];
  if (n > B.log.length) {
    out.push(`[${n - B.log.length} ligne(s) perdue(s) : le journal texte ne garde que les 400 dernieres]`);
    n = B.log.length;
  }
  out.push(...B.log.slice(B.log.length - n));
  return out;
}

// -------------------------------------------------------------- ouverture
/**
 * OUVRIR LE JOURNAL. A appeler juste apres `createBattle` — donc apres le melange et
 * la pioche des mains de depart, avant le premier tour : c'est exactement ce que doit
 * decrire l'evenement `debut`.
 *
 * `opts` :
 *   source            "jeu" ou "simulateur"
 *   rencontre         { id, nom, ... } — ce qu'on sait de la rencontre (`B.meta`)
 *   camps             { p: { controle, niveauBot, equipe, reliques }, e: {…} }
 *   niveauReference   le niveau de bot auquel on compare les decisions humaines
 *   data              les donnees de cartes mesurees (le brouillon du builder, sinon
 *                     le fichier du jeu) — c'est d'elles qu'on prend l'empreinte
 */
export function ouvreJournal(B, opts = {}) {
  const data = opts.data || CHARACTER_DATA;
  const camps = opts.camps || {};
  const j = {
    i: 0,
    lignes: [],
    t0: Date.now(),
    dernierLog: 0,
    // Pour `reflexionMs` : quand ce camp a agi pour la derniere fois, et quand
    // n'importe qui a agi (ce dernier tient lieu de « debut de son tour »).
    dernier: { p: 0, e: 0 },
    dernierQuelconque: 0,
    tourVu: { p: -1, e: -1 },
    decisions: { p: 0, e: 0 },
    niveauReference: opts.niveauReference || BALANCE.ai.defaut,
    inst: new WeakMap(),
    pris: new Set(),
    creees: 0,
    note: null,
    precedent: null
  };
  B.journal = j;
  // On ecoute le bot SANS voler l'ecouteur en place (l'analyse des cartes en branche
  // un) : on l'appelle, puis on garde la note pour la decision qui arrive.
  j.precedent = ecouteLesChoix(info => {
    if (j.precedent) j.precedent(info);
    j.note = info;
  });

  ligne(j, 'debut', {
    date: new Date().toISOString(),
    source: opts.source || 'jeu',
    rencontre: opts.rencontre || (B.meta && B.meta.node ? { id: B.meta.node.id, nom: B.meta.node.name } : {}),
    configHash: empreinte(JSON.stringify(data) + JSON.stringify(BALANCE)),
    // Les regles du combat telles qu'elles etaient CE JOUR-LA : un fichier relu plus
    // tard ne doit pas dependre du `balance.js` du moment.
    regles: BALANCE.combat,
    camps: {
      p: campDebut(j, B, 'p', camps.p || {}),
      e: campDebut(j, B, 'e', camps.e || {})
    }
  });
  return j;
}

function campDebut(j, B, k, info) {
  const s = B[k];
  return {
    controle: info.controle || 'bot',
    niveauBot: info.niveauBot || null,
    heros: { nom: s.name, pv: s.hp, pvMax: s.maxHp, armure: s.armor, manaCap: s.manaCap, tailleMain: s.handSize },
    equipe: info.equipe || null,
    reliques: info.reliques || null,
    // LES 15 CARTES, en entier : main de depart d'abord, puis la pioche de haut en bas.
    // C'est le seul endroit du fichier ou le deck figure au complet ; tout le reste ne
    // cite que des `inst`.
    deck: [...s.hand, ...[...s.deck].reverse()].map(c => carteJson(j, B, k, c)),
    ordrePioche: [...s.deck].reverse().map(c => instDe(j, k, c)),
    mainDepart: s.hand.map(c => instDe(j, k, c))
  };
}

/** `combat_20260922-143005_owlboss.jsonl` — lisible, et qui se trie tout seul. */
export function nomDeFichier(rencontre) {
  const d = new Date();
  const n = x => String(x).padStart(2, '0');
  const quand = `${d.getFullYear()}${n(d.getMonth() + 1)}${n(d.getDate())}-${n(d.getHours())}${n(d.getMinutes())}${n(d.getSeconds())}`;
  const qui = String((rencontre && (rencontre.id || (rencontre.node && rencontre.node.id))) || 'combat')
    .replace(/[^a-zA-Z0-9_-]+/g, '-');
  return `combat_${quand}_${qui}.jsonl`;
}

// ------------------------------------------------------------------- jouer
/**
 * Appliquer une action. C'est le SEUL chemin : le jeu, l'arene et les scripts passent
 * tous par la, et c'est ce que verifie le banc du partage. Journal eteint, la fonction
 * ne fait qu'appeler l'action — pas une allocation, pas une copie.
 *
 * `action` est le coup tel que le bot le rend : `{type:'play', index, target, choix}`,
 * `{type:'attack', uid, target}` ou `{type:'end'}`.
 * `controle` vaut "humain" ou "bot", `niveau` est le niveau de bot quand c'en est un.
 * Rend ce que `playCard` / `attack` ont renvoye (toujours `true` pour un tour passe).
 */
export function joue(B, k, action, controle = 'bot', niveau = null) {
  const j = B && B.journal;
  if (!j) return applique(B, k, action);

  const ms = Date.now() - j.t0;
  // Le temps de reflexion : depuis l'action precedente du meme camp, ou depuis le
  // debut de son tour quand c'est sa premiere action. Chez un humain, c'est un signal
  // d'hesitation — la decision longue est souvent la decision interessante.
  const premiere = j.tourVu[k] !== B.turnNo;
  j.tourVu[k] = B.turnNo;
  const reflexionMs = ms - (premiere ? j.dernierQuelconque : j.dernier[k]);

  const obj = {
    tour: B.turnNo,
    camp: k,
    controle,
    ms,
    reflexionMs,
    etat: { p: etatCamp(j, B, 'p'), e: etatCamp(j, B, 'e') },
    vue: vueJson(j, B, k),
    coupsLegaux: coupsLegaux(j, B, k),
    coup: coupJson(j, B, k, action),
    evaluationBot: evaluationJson(j, B, k, controle, niveau),
    journal: depuisLaDerniereFois(j, B)
  };
  // LA LIGNE EST FIGEE AVANT QUE L'ACTION PARTE. `etat` tient des references vers les
  // effets des cartes, et l'action qui suit va modifier le combat : ce qu'on ecrit
  // doit etre l'etat d'AVANT, sans exception. On serialise donc ici, puis on ajoute
  // `ok` — que seule l'action peut dire — a la chaine deja close. Il se range A COTE
  // de `coup` et non dedans : un coup est ce qu'on a voulu faire, `ok` ce que le
  // moteur en a fait.
  const texte = JSON.stringify({ t: 'decision', v: VERSION, i: j.i++, ...obj });
  j.decisions[k]++;
  j.dernier[k] = ms;
  j.dernierQuelconque = ms;

  const ok = applique(B, k, action);
  j.lignes.push(texte.slice(0, -1) + ',"ok":' + JSON.stringify(ok !== false) + '}');
  return ok;
}

/** Le dispatch, et le seul du projet : un coup du bot vers l'appel du moteur. */
function applique(B, k, action) {
  if (!action || action.type === 'end') { endTurn(B); return true; }
  if (action.type === 'play') return playCard(B, k, action.index, action.target, action.choix);
  if (action.type === 'attack') return attack(B, k, action.uid, action.target);
  return false;
}

// ------------------------------------------------------------------- fin
/**
 * FERMER LE JOURNAL : ecrit l'evenement `fin` et rend le fichier, en texte JSONL.
 * `raison` n'est a passer que pour un abandon (le joueur quitte le combat) : sinon
 * c'est le moteur qui l'a dite, dans `B.finRaison`.
 *
 * Rappel de regle : un match nul compte comme une defaite du joueur (GDD §07b). Le
 * fichier enregistre quand meme "nul" — c'est a l'analyse d'appliquer la regle, pas au
 * journal de la prejuger.
 */
export function fermeJournal(B, raison = null) {
  const j = B && B.journal;
  if (!j) return '';
  const abandon = !B.over;
  ligne(j, 'fin', {
    vainqueur: abandon ? 'abandon' : B.winner === 'draw' ? 'nul' : B.winner,
    raison: raison || (abandon ? 'abandon' : B.finRaison || 'pv'),
    tours: B.turnNo,
    pv: { p: B.p.hp, e: B.e.hp },
    // De quoi verifier l'integrite du fichier sans le relire en entier.
    decisions: { ...j.decisions },
    lignesJournal: B.logTotal || 0,
    etatFinal: { p: etatCamp(j, B, 'p'), e: etatCamp(j, B, 'e') },
    journal: depuisLaDerniereFois(j, B)
  });
  ecouteLesChoix(j.precedent);
  B.journal = null;
  return j.lignes.join('\n') + '\n';
}

/** Le fichier tel qu'il est a cet instant, sans fermer le journal (pour un apercu). */
export function texteJournal(B) {
  const j = B && B.journal;
  return j ? j.lignes.join('\n') + '\n' : '';
}

// ---------------------------------------------------------------- historique
// v1 — 22/09/2026 — premiere version.
