// VALIDATION DES DONNEES DE CARTES — les memes regles pour le Card Builder (bandeau
// « À vérifier ») et pour la ligne de commande (`node scripts/check-decks.mjs`).
// Ecrites une seule fois : une regle ajoutee ici est appliquee aux deux endroits.
//
// `validateData(db, effets, motsCles)` rend une liste de { bad, msg } :
//   bad: true  = bloquant, la carte ne fera pas ce qu'elle annonce
//   bad: false = avertissement, a regarder mais jouable
// Les registres sont passes en parametre parce que le builder connait aussi les
// mecaniques inventees dans son brouillon, que le jeu, lui, n'a pas encore.
//
// Un constat peut aussi porter `ou` (« carte:<id> », « pnj:<id> ») et `regle` : c'est
// ce qui permet de l'IGNORER (cf. « Les constats ignores », plus bas). Un constat
// ignore reste dans la liste, avec `ignore` (la raison donnee) : il ne bloque plus
// rien, mais il ne disparait pas sans laisser de trace. Ne filtre jamais sur `bad`
// seul : passe par `bloque(s)`.
import { TRIGGERS, EVENTS, AMPLIFIABLE, CARD_FILTERS, COUNTERS, STATICS, keyId, keyArg, keyFields, cardCost,
  isVariableAmount, targetDef, targetId, targetArg, targetLabel, describeAmount, effectParams, eachSubEffect, listeEffets, typeVariable } from './mechanics.js';
import { resolveCard } from './characters.js';

/**
 * Les cibles qu'un effet porte VRAIMENT. Un parametre de cible peut etre hors sujet
 * selon les autres champs (`tm` ne sert a la Copie que si le modele vient du plateau) :
 * `si` le dit, et le builder ne l'affiche alors pas. Le juger serait crier au loup.
 */
const ciblesDeLEffet = (e, eff) => ((eff[e.op] || {}).params || [])
  .filter(p => p.type === 'target' && (!p.si || p.si(e)))
  .map(p => e[p.k]).filter(Boolean);

/** Une cible que le JOUEUR doit pointer. Il n'en pointe qu'une par carte. */
const pointee = t => !!(targetDef(t) && targetDef(t).pick);
/** Le camp qu'une cible designee impose, quand elle en impose un. */
const campPointe = t => ({ allyUnit: 'moi', enemyUnit: 'adverse', enemyAny: 'adverse' })[targetId(t)] || null;

// Les cibles qui ne designent QUE des heros. Elles sont proposees partout (c'est au
// designer de choisir), mais un heros n'est ni une carte ni une unite : les effets qui
// prennent ou transforment des unites les ignorent. Autant le dire tout de suite.
const cibleHeros = t => ['ownHero', 'enemyHero'].includes(targetId(t));

// ---------- PARCOURS D'UNE CARTE ----------
// Un jeton invoque porte des mots-cles et des moments comme une carte : tout ce qui
// inspecte une carte (validation, compte des mecaniques a coder, fichier de suivi)
// doit donc descendre dedans, sinon une mecanique se cache dans un jeton.

/**
 * La pile de fatigue : les cartes qu'on pioche quand la pioche est vide. Comme un deck
 * de PNJ, elle DESIGNE des cartes du catalogue — une ligne qui pointe dans le vide ne
 * sortirait jamais, et une pile vide remet l'ancienne regle (on ne pioche plus).
 */
function verifiePile(db, catalogue) {
  const out = [];
  for (const l of db.fatigue || []) {
    if (!catalogue.has(l.card)) out.push({ bad: true, msg: `Pile de fatigue — carte « ${l.card} » introuvable : elle ne sortira jamais.` });
  }
  return out;
}

/**
 * Chaque effet d'une carte : ses moments, ses paliers, ceux de ses jetons — et ceux
 * qu'un effet CONTIENT (les deux branches de « Choisir »). Sans cette derniere descente,
 * une mecanique non codee se cacherait dans une branche et personne ne le dirait.
 */
export function eachEffect(card, fn) {
  const lists = [];
  const holder = h => { for (const slot of Object.keys(TRIGGERS)) if ((h[slot] || []).length) lists.push(h[slot]); };
  holder(card);
  for (const t of card.tiers || []) if (t.extra) lists.push([t.extra]);
  while (lists.length) {
    for (const brut of lists.pop()) {
      eachSubEffect(brut, e => {
        fn(e);
        if (e.op === 'summon' && e.unit) holder(e.unit);
      });
    }
  }
}

/** Chaque unite d'une carte : elle-meme si c'est un allie, plus chaque jeton invoque. */
export function eachUnit(card, fn) {
  if (card.type === 'ally') fn(card);
  eachEffect(card, e => { if (e.op === 'summon' && e.unit) fn(e.unit); });
}

/**
 * Une carte creee de toutes pieces : soit on la designe (elle doit exister), soit on
 * la tire au hasard (le filtre doit alors designer quelque chose — un filtre par type
 * ou par mot-cle laisse en blanc ne tirerait jamais rien).
 */
function verifieCarteCreee(e, ou, nom, catalogue) {
  const out = [];
  if ((e.choix || 'precise') !== 'hasard') {
    if (!e.carte) out.push({ bad: false, msg: `${ou} — « ${nom} » sans carte choisie.` });
    else if (!catalogue.has(e.carte)) out.push({ bad: true, msg: `${ou} — la carte « ${e.carte} » de « ${nom} » n'existe pas.` });
    return out;
  }
  const arg = (CARD_FILTERS[e.quoi] || {}).arg;
  // Un type LU sur une carte n'a pas a etre ecrit : il sera connu au moment ou l'effet
  // part. Seul un type qu'on annonce ecrire et qu'on laisse vide est une erreur.
  if (arg === 'type' && !e.argType && !typeVariable(e)) out.push({ bad: true, msg: `${ou} — « ${nom} » tire au hasard une carte d'un type sans le nommer : rien n'apparaîtra.` });
  if (arg === 'key' && !e.argKey) out.push({ bad: true, msg: `${ou} — « ${nom} » tire au hasard une carte avec un mot-clé sans le choisir : rien n'apparaîtra.` });
  return out;
}

/**
 * UN FILTRE DE CARTES QUI NE DESIGNE RIEN. Un type ou un mot-cle laisse en blanc, une
 * carte precise absente du catalogue : dans les trois cas le paquet vise est vide et
 * l'effet ne fera rien. Ecrit une fois, appele partout ou un filtre est propose — les
 * trois deplacements, le renfort de cartes, la copie.
 */
function verifieFiltre(e, ou, nom, catalogue, rien) {
  const out = [];
  const arg = (CARD_FILTERS[e.quoi] || {}).arg;
  if (arg === 'type' && !e.argType && !typeVariable(e)) out.push({ bad: false, msg: `${ou} — « ${nom} » vise un type sans le nommer : ${rien}.` });
  if (arg === 'key' && !e.argKey) out.push({ bad: false, msg: `${ou} — « ${nom} » vise un mot-clé sans le choisir : ${rien}.` });
  if (arg === 'card' && !e.argCard) out.push({ bad: false, msg: `${ou} — « ${nom} » vise une carte précise sans la choisir : ${rien}.` });
  else if (arg === 'card' && !catalogue.has(e.argCard)) out.push({ bad: true, msg: `${ou} — « ${nom} » vise la carte « ${e.argCard} », qui n'existe pas.` });
  return out;
}

// Un palier peut etre parfaitement valide et ne rien faire du tout sur SA carte :
// amplifier une carte qui ne fait que piocher, donner un mot-cle a un sort...
// On le dit tout de suite plutot que de laisser la carte mentir au joueur.
export function tierIssue(cd, t) {
  if (!cd) return null;
  if (t.lesDeux) {
    // Un palier « Choisit les deux » sur une carte qui ne choisit rien ne fait rien.
    let choisit = false;
    for (const slot of Object.keys(TRIGGERS)) {
      for (const e of cd[slot] || []) eachSubEffect(e, x => { if (x.op === 'choisir') choisit = true; });
    }
    if (!choisit) return "cette carte n'a aucun « Choisir » : il n'y a rien à décider, donc rien à débloquer.";
  }
  if (t.amp !== undefined) {
    // Les branches de « Choisir » comptent : resolveCard les amplifie aussi.
    let ampliable = false;
    for (const slot of Object.keys(TRIGGERS)) {
      for (const e of cd[slot] || []) eachSubEffect(e, x => { if (AMPLIFIABLE.includes(x.op)) ampliable = true; });
    }
    if (!ampliable) return "n'amplifie rien : cette carte n'a aucun effet amplifiable (dégâts, soin, armure, renfort). Passe par « Ajoute un effet ».";
  }
  if (t.stats && cd.type !== 'ally')
    return "les bonus de stats ne servent qu'aux alliés, pas aux sorts.";
  if (t.key && cd.type !== 'ally')
    return "un mot-clé ne s'applique qu'à un allié, pas à un sort.";
  if (t.aura && cd.type !== 'ally')
    return "une aura ne s'applique qu'à un allié, pas à un sort.";
  if (t.statique && cd.type !== 'ally')
    return "un effet statique ne dure que tant que l'unité est en jeu : un sort ne reste pas.";
  if (t.extra && cd.type !== 'ally') {
    const def = TRIGGERS[t.slot || 'play'];
    if (def && def.allyOnly) return '« ' + def.label + ' » ne se déclenche jamais sur un sort.';
  }
  return null;
}

/**
 * LES REGLES D'UNE CARTE — celles qui ne regardent que la carte, pas son proprietaire.
 * Ecrites UNE fois : une carte de personnage et une carte libre sont la meme chose pour
 * tout ce qui suit, et la pile de fatigue comme les decks de PNJ sont faits de cartes
 * libres. Tant qu'elles avaient leur propre passe, elles n'etaient verifiees que par une
 * regle sur dix — c'est ainsi qu'un cri de guerre qui ne part jamais a pu passer.
 * `proprio` n'est que le nom affiche devant la carte dans les messages.
 */
function verifieCarte(card, proprio, ctx) {
  if (!card) return;
  const { out, eff, kw, catalogue, carteParId, noms } = ctx;
  // Un allie sans ligne de statistiques arrive en 0/0 et meurt aussitot pose.
  // C'est invisible dans l'editeur (les champs paraissent vides) et ca casse un
  // deck entier sans rien dire : on le signale comme bloquant.
  if (card.type === 'ally') {
    if (card.atk === undefined || card.hp === undefined)
      out.push({ bad: true, msg: `${proprio} · ${card.name} — allié sans attaque ou sans vie : il arrivera en 0/0 et mourra aussitôt.` });
    else if (card.hp <= 0 && !(card.keys || []).some(k => keyId(k) === 'characteristique_variable'))
      out.push({ bad: true, msg: `${proprio} · ${card.name} — allié à ${card.hp} PV : il mourra en arrivant.` });
  }
  // Effets de la carte et de ses jetons.
  eachEffect(card, e => {
    if (!eff[e.op]) out.push({ bad: true, msg: `${proprio} · ${card.name} — effet inconnu « ${e.op} ».` });
    else if (!eff[e.op].implemented) out.push({ bad: false, msg: `${proprio} · ${card.name} — « ${eff[e.op].label} » reste à coder.` });
    // « Cree » designe une carte du catalogue par son identifiant — sauf au
    // hasard, ou c'est le filtre qui doit tenir debout.
    if (e.op === 'cree') out.push(...verifieCarteCreee(e, `${proprio} · ${card.name}`, 'Crée une carte', catalogue));
    // Melanger dans la pioche : la carte creee doit exister, et un filtre par
    // type ou par mot-cle sans valeur ne designerait aucune carte.
    if (['melange_a_la_pioche', 'renvoie_en_main', 'pose_sur_le_plateau', 'switch'].includes(e.op)) {
      const nom = (eff[e.op] || {}).label || e.op;
      if (e.d_ou === 'creee') {
        out.push(...verifieCarteCreee(e, `${proprio} · ${card.name}`, nom, catalogue));
        // Le renfort s'ecrit sur une carte alliee : une carte creee qui est un sort
        // (tiree parmi les sorts, ou nommee) ne le verra jamais.
        const sortCree = (e.choix === 'hasard' && e.quoi === 'spell')
          || (e.choix !== 'hasard' && carteParId.has(e.carte) && carteParId.get(e.carte).type !== 'ally');
        if ((e.atk || e.hp) && sortCree)
          out.push({ bad: false, msg: `${proprio} · ${card.name} — « ${nom} » donne +${describeAmount(e.atk || 0)}/+${describeAmount(e.hp || 0)} à un sort : un sort n'a ni attaque ni vie, le bonus ne fera rien.` });
      } else if (e.d_ou === 'plateau') {
        if (!e.t) out.push({ bad: false, msg: `${proprio} · ${card.name} — « ${nom} » prend sur le plateau sans cible : il ne prendra rien.` });
        else if (cibleHeros(e.t)) out.push({ bad: true, msg: `${proprio} · ${card.name} — « ${nom} » vise un héros : un héros n'est pas une carte, il ne ${e.op === 'switch' ? 'se switche pas' : 'se déplace pas'}.` });
        else if (e.op === 'pose_sur_le_plateau') out.push({ bad: false, msg: `${proprio} · ${card.name} — « ${nom} » prend une unité en jeu pour la reposer : elle repart de zéro (dégâts et renforts effacés, elle ne peut plus attaquer ce tour). Voulu ?` });
      } else {
        // Le renfort « +X/+Y » s'ecrit sur une carte alliee : un paquet filtre sur
        // les sorts n'en verra jamais la couleur.
        if ((e.atk || e.hp) && e.quoi === 'spell') out.push({ bad: false, msg: `${proprio} · ${card.name} — « ${nom} » donne +${describeAmount(e.atk || 0)}/+${describeAmount(e.hp || 0)} à des sorts : un sort n'a ni attaque ni vie, le bonus ne fera rien.` });
        out.push(...verifieFiltre(e, `${proprio} · ${card.name}`, nom, catalogue, 'il ne prendra aucune carte'));
      }
    }
    // Renforcer des cartes : les memes pieges que les deplacements, sur un effet
    // qui ne deplace rien.
    if (e.op === 'renforce_les_cartes') {
      if (!e.atk && !e.hp) out.push({ bad: false, msg: `${proprio} · ${card.name} — « Renforce des cartes » ne donne ni attaque ni vie : il ne fera rien.` });
      if (e.quoi === 'spell') out.push({ bad: false, msg: `${proprio} · ${card.name} — « Renforce des cartes » ne vise que des sorts : un sort n'a ni attaque ni vie, le bonus ne fera rien.` });
      out.push(...verifieFiltre(e, `${proprio} · ${card.name}`, 'Renforce des cartes', catalogue, 'il ne touchera aucune carte'));
    }

    // PRENDRE LE CONTROLE ne prend rien chez soi (l'unite y est deja) et rien
    // sur un heros (ce n'est pas une unite).
    if (e.op === 'prendre_le_controle') {
      const t = targetId(e.t);
      if (['self', 'allyUnit', 'allAllies', 'randomAllyUnit', 'sameTypeAllies', 'allyType'].includes(t))
        out.push({ bad: false, msg: `${proprio} · ${card.name} — « Prise de controle » vise ton propre camp : ces unités sont déjà de ton côté, rien ne se passera.` });
      if (cibleHeros(t)) out.push({ bad: true, msg: `${proprio} · ${card.name} — « Prise de controle » vise un héros : un héros n'est pas une unité, il ne change pas de camp.` });
    }
    // CHOISIR : deux branches, et quelqu'un pour choisir.
    if (e.op === 'choisir') {
      for (const cle of ['a', 'b']) {
        if (!listeEffets(e[cle]).length)
          out.push({ bad: false, msg: `${proprio} · ${card.name} — « Choisir » n'a pas de ${cle === 'a' ? 'première' : 'seconde'} branche : il n'y a rien à choisir.` });
      }
    }

    // « Chez son proprietaire » n'a de sens que s'il y a une cible a lire. Les
    // trois deplacements prennent dans un paquet, pas sur une unite : chez eux,
    // ce choix retombe sur le camp de celui qui joue la carte.
    if (e.qui === 'proprietaire' && ['melange_a_la_pioche', 'renvoie_en_main', 'pose_sur_le_plateau', 'renforce_les_cartes'].includes(e.op))
      out.push({ bad: false, msg: `${proprio} · ${card.name} — « ${(eff[e.op] || {}).label || e.op} » prend « chez son propriétaire » sans cible à lire : ce sera ton camp.` });

    // LA COPIE va chercher un modele la ou un deplacement va chercher des cartes :
    // les memes pieges de filtre, plus les deux qui lui sont propres — un modele
    // qui ne peut etre qu'un sort (une unite ne peut pas en devenir la copie) et
    // deux cibles a designer alors que le joueur n'en pointe qu'une.
    if (e.op === 'copie') {
      const ou = `${proprio} · ${card.name}`;
      if (e.d_ou === 'creee') out.push(...verifieCarteCreee(e, ou, 'Copie', catalogue));
      else if (e.d_ou === 'plateau') {
        if (!e.tm) out.push({ bad: false, msg: `${ou} — « Copie » ne dit pas quelle unité sert de modèle : elle ne copiera rien.` });
      } else {
        if (e.quoi === 'spell') out.push({ bad: true, msg: `${ou} — « Copie » ne prend que des sorts pour modèle : une unité ne peut pas devenir un sort.` });
        out.push(...verifieFiltre(e, ou, 'Copie', catalogue, 'elle ne trouvera aucun modèle'));
      }
      if (cibleHeros(e.t)) out.push({ bad: true, msg: `${ou} — « Copie » transforme un héros : un héros n'est pas une unité, il ne devient la copie de rien.` });
      if (e.d_ou === 'plateau' && cibleHeros(e.tm)) out.push({ bad: true, msg: `${ou} — « Copie » prend un héros pour modèle : un héros n'est pas une carte, il n'y a rien à copier.` });
      // Deux cibles A DESIGNER sur le meme effet : le joueur n'en pointe qu'une,
      // elle servirait aux deux. La seconde (`tm`) n'est lue que si le modele
      // vient du plateau — ailleurs c'est une valeur morte, et l'avertir serait
      // crier au loup sur une carte parfaitement valide.
    }
    // Une pioche ciblee qui nomme une carte inexistante ne trouvera jamais rien.
    if (e.op === 'pioche_x') {
      if (!e.carte) out.push({ bad: false, msg: `${proprio} · ${card.name} — pioche ciblée sans carte choisie.` });
      else if (!noms.has(e.carte)) out.push({ bad: true, msg: `${proprio} · ${card.name} — « ${e.carte} » n'existe dans aucun deck : la pioche ne trouvera rien.` });
    }
    // Un montant variable dont le compteur reclame un type, sans type : toujours 0.
    for (const par of ((eff[e.op] || {}).params || [])) {
      const v = e[par.k];
      if (!isVariableAmount(v)) continue;
      const cpt = COUNTERS[v.src];
      if (!cpt) out.push({ bad: true, msg: `${proprio} · ${card.name} — compteur inconnu « ${v.src} » sur « ${par.label} ».` });
      else if (cpt.needsArg && !v.arg) out.push({ bad: false, msg: `${proprio} · ${card.name} — « ${par.label} » suit « ${cpt.label} » sans valeur : le montant restera à 0.` });
    }
  });
  // Effets statiques de la carte et de ses jetons : un filtre sans valeur ne
  // designerait aucune carte, l'effet ne ferait donc rien du tout.
  eachUnit(card, u => {
    const ou = u === card ? '' : ` (jeton « ${u.name} »)`;
    for (const m of u.statics || []) {
      const d = STATICS[m.op];
      if (!d) { out.push({ bad: true, msg: `${proprio} · ${card.name}${ou} — effet statique inconnu « ${m.op} ».` }); continue; }
      const arg = (CARD_FILTERS[m.quoi] || {}).arg;
      if (arg === 'type' && !m.argType) out.push({ bad: false, msg: `${proprio} · ${card.name}${ou} — « ${d.label} » vise un type mais aucun type n'est écrit : il ne touchera aucune carte.` });
      if (arg === 'key' && !m.argKey) out.push({ bad: false, msg: `${proprio} · ${card.name}${ou} — « ${d.label} » vise un mot-clé mais aucun n'est choisi : il ne touchera aucune carte.` });
      if (arg === 'card' && !m.argCard) out.push({ bad: false, msg: `${proprio} · ${card.name}${ou} — « ${d.label} » vise une carte précise mais aucune n'est choisie : il ne touchera rien.` });
      else if (arg === 'card' && !catalogue.has(m.argCard)) out.push({ bad: true, msg: `${proprio} · ${card.name}${ou} — « ${d.label} » vise la carte « ${m.argCard} », qui n'existe pas.` });
    }
  });
  // Mots-cles de la carte et de ses jetons.
  eachUnit(card, u => {
    const ou = u === card ? '' : ` (jeton « ${u.name} »)`;
    for (const k of u.keys || []) {
      const d = kw[keyId(k)];
      if (!d) out.push({ bad: true, msg: `${proprio} · ${card.name}${ou} — mot-clé inconnu « ${keyId(k)} ».` });
      else if (!d.implemented) out.push({ bad: false, msg: `${proprio} · ${card.name}${ou} — mot-clé « ${d.label} » reste à coder.` });
      else if ((d.params || []).length && !keyArg(k)) out.push({ bad: false, msg: `${proprio} · ${card.name}${ou} — mot-clé « ${d.label} » sans valeur : il ne servira à rien.` });
    // Une caracteristique variable qui suit un compteur reclamant un type, sans type.
    if (keyId(k) === 'characteristique_variable') {
      const f = keyFields(k);
      const cpt = COUNTERS[f.src];
      if (cpt && cpt.needsArg && !f.arg)
        out.push({ bad: false, msg: `${proprio} · ${card.name}${ou} — « ${cpt.label} » sans valeur suivie : le compteur restera à 0.` });
      // Vie qui n'est PAS variable et vaut 0 : l'unité meurt en arrivant.
      if (f.stat === 'atk' && !(u.hp > 0))
        out.push({ bad: false, msg: `${proprio} · ${card.name}${ou} — seule l'attaque varie et la vie écrite est ${u.hp || 0} : l'unité mourra en arrivant.` });
    }
    }
  });
  // DEUX CIBLES A DESIGNER SUR LA MEME CARTE : le joueur n'en pointe qu'une, et
  // elle sert aux deux. Quand elles reclament des camps opposes, c'est pire qu'une
  // gene — l'une des deux ne touchera jamais rien, quel que soit le clic. On
  // regarde les branches d'un « Choisir » aussi : au palier « Choisit les deux »,
  // elles partent ensemble.
  // DEUX CIBLES A DESIGNER QUI PARTENT ENSEMBLE se genent : le joueur n'en pointe
  // qu'une. Deux du MEME cote sont une bonne carte (« soigne un allie ET
  // renforce-le ») ; des camps OPPOSES, non — quel que soit le clic, l'une des
  // deux ne touchera rien.
  //
  // Les deux branches d'un « Choisir » ne partent PAS ensemble : chacune a droit
  // a sa cible, et le joueur repond avant de designer. Sauf au palier « Choisit
  // les deux », qui les fait partir toutes les deux — la, elles se genent.
  {
    const hors = [], branches = [];
    for (const e of card.play || []) {
      if (e.op === 'choisir') {
        for (const cle of ['a', 'b']) {
          const camps = [];
          for (const x of listeEffets(e[cle])) eachSubEffect(x, y => {
            for (const t of ciblesDeLEffet(y, eff)) if (pointee(t)) camps.push(campPointe(t));
          });
          branches.push(camps);
        }
        continue;
      }
      eachSubEffect(e, y => {
        for (const t of ciblesDeLEffet(y, eff)) if (pointee(t)) hors.push(campPointe(t));
      });
    }
    const lesDeux = (card.tiers || []).some(t => t.lesDeux);
    // Ce qui part ensemble : le hors-choix avec chaque branche prise a part, ou
    // tout d'un bloc quand le palier fait partir les deux.
    const ensembles = lesDeux || !branches.length
      ? [[...hors, ...branches.flat()]]
      : branches.map(b => [...hors, ...b]);
    if (ensembles.some(g => g.includes('moi') && g.includes('adverse')))
      out.push({ bad: true, msg: `${proprio} · ${card.name} — deux cibles à désigner dans des camps opposés partent ensemble : le joueur n'en pointe qu'une, donc l'une des deux ne touchera jamais rien. Passe l'une en cible automatique (« au hasard », « tous »).` });
  }

  // UNE GARDE QUI NE PEUT PAS ETRE VRAIE : « seulement une unite d'un type »
  // sans type ecrit ne laissera jamais passer le moment.
  for (const [slot, g] of Object.entries(card.gardes || {})) {
    if (keyId(g) === 'type' && !keyArg(g))
      out.push({ bad: true, msg: `${proprio} · ${card.name} — « ${(TRIGGERS[slot] || {}).label || slot} » ne part que pour un type, mais aucun type n'est écrit : il ne partira jamais.` });
  }

  // UNE GARDE SUR UN EVENEMENT SANS SUJET : « quand tu perds une unite, SI C'EST UN CHIEN »
  // n'existe pas. Seuls les evenements qui ont une unite pour sujet (`EVENTS[ev].sujet` :
  // jouer un allie, attaquer, recevoir du renfort) ont quelqu'un a regarder. Pour les
  // autres (pioche, sort, PV perdus, unite perdue) `gardePasse` ne trouve aucun sujet et
  // refuse TOUJOURS : le moment ne partira jamais, et rien sur la carte ne le laisse voir.
  for (const [slot, g] of Object.entries(card.gardes || {})) {
    if (!g || keyId(g) === 'tous') continue;
    const m = /^on_(.+)_(self|foe|any)$/.exec(slot);
    if (m && EVENTS[m[1]] && !EVENTS[m[1]].sujet)
      out.push({ bad: true, msg: `${proprio} · ${card.name} — « ${(TRIGGERS[slot] || {}).label || slot} » n'a pas de sujet à regarder : une garde (« seulement si… ») n'y laisse jamais rien passer, le moment ne partira jamais. Retire la garde.` });
  }

  // « CHOISIR » ne se choisit qu'a la pose : ailleurs (rale d'agonie, debut de
  // tour), personne n'est la pour repondre et c'est la premiere branche qui part.
  for (const [slot, def] of Object.entries(TRIGGERS)) {
    if (slot === 'play') continue;
    for (const e of card[slot] || []) eachSubEffect(e, x => {
      if (x.op === 'choisir')
        out.push({ bad: false, msg: `${proprio} · ${card.name} — « Choisir » sur « ${def.label} » : personne n'est là pour choisir, c'est toujours la première branche qui partira.` });
    });
  }

  // UNE CIBLE QUI SUIT L'EFFET PRECEDENT, EN PREMIERE POSITION, ne designe rien :
  // personne ne l'a precedee. C'est bloquant, pas un avertissement — l'effet ne
  // partira jamais, quoi qu'il arrive, et rien dans la carte ne le laisse voir.
  // Le message nomme la cible : « Lui » et « les autres du meme type que Lui » se
  // trompent de la meme facon, mais le designer doit lire CELLE qu'il a posee.
  //
  // SAUF sur un moment d'evenement QUI A UN SUJET (« quand tu joues un allie » :
  // l'allie pose est « Lui »). La chaine y commence donc avec quelqu'un dedans,
  // et « les autres du meme type que Lui » est exactement ce qu'on veut ecrire.
  for (const [slot, def] of Object.entries(TRIGGERS)) {
    // `def.ev` est l'identifiant de l'evenement ; `def.event` n'est qu'un
    // drapeau (« ce moment en est un »). Les confondre revenait a ne jamais
    // appliquer l'exception.
    if (def.event && (EVENTS[def.ev] || {}).sujet) continue;
    const premier = (card[slot] || [])[0];
    if (premier && ['previous', 'previousType'].includes(targetId(premier.t)))
      out.push({ bad: true, msg: `${proprio} · ${card.name} — « ${def.label} » commence par « ${targetLabel(premier.t)} » : aucun effet ne le précède, la cible sera vide et l'effet ne fera rien.` });
  }
  for (const t of card.tiers || []) {
    const w = tierIssue(card, t);
    if (w) out.push({ bad: false, msg: `${proprio} · ${card.name} — palier ${t.lvl} sans effet : ${w}` });
  }
  // Une cible comme « Elle-meme » n'a pas de porteur sur un sort.
  for (const slot of Object.keys(TRIGGERS)) {
    for (const e of card[slot] || []) {
      // Un effet peut porter PLUSIEURS cibles (la Copie en a deux : qui devient
      // la copie, et de quoi) : on les demande au registre plutot que de lire
      // `t` en dur. Une mecanique inventee sans parametres garde son `t`.
      const pars = ciblesDeLEffet(e, eff);
      for (const t of (pars.length ? pars : [e.t]).filter(Boolean)) {
        const tdef = targetDef(t);
        if (tdef && tdef.allyOnly && card.type !== 'ally')
          out.push({ bad: true, msg: `${proprio} · ${card.name} — cible « ${tdef.label} » impossible sur un sort.` });
        // Une cible par type sans type écrit ne trouvera jamais personne.
        if (tdef && (tdef.params || []).length && !targetArg(t))
          out.push({ bad: false, msg: `${proprio} · ${card.name} — cible « ${tdef.label} » sans type : elle ne touchera personne.` });
      }
    }
  }
  // Un sort ne reste pas en jeu : ses moments d'unite ne partiraient jamais.
  if (card.type !== 'ally') {
    for (const [slot, def] of Object.entries(TRIGGERS)) {
      if (def.allyOnly && (card[slot] || []).length)
        out.push({ bad: true, msg: `${proprio} · ${card.name} — « ${def.label} » sur un sort ne se déclenchera jamais.` });
    }
    if (card.aura) out.push({ bad: true, msg: `${proprio} · ${card.name} — une aura sur un sort ne s'appliquera jamais.` });
    if ((card.statics || []).length) out.push({ bad: true, msg: `${proprio} · ${card.name} — un effet statique sur un sort ne s'appliquera jamais (le sort ne reste pas en jeu).` });
  }
}

// ---------- LES CONSTATS IGNORES ----------
// Certaines erreurs n'en sont pas pour le game designer : « Neuf Vies coûte 14, Felix
// plafonne à 8 » est vrai d'un héros SEUL, et le joueur ne l'est jamais (cf. CLAUDE.md,
// « Taille d'équipe »). `DB.ignores` les liste, une entrée par constat :
//   { ou: 'carte:felix_ninelives', regle: 'cout-solo', pourquoi: 'jouable en trio' }
// `ou` est l'IDENTIFIANT de ce qui est visé, pas son nom : renommer la carte ne fait pas
// revenir le constat. `regle` est un code stable quand la regle en declare un
// (`cout-solo`, `deck-court`), sinon le texte du constat sans son « Proprio · Carte — ».
// Dans ce second cas, ce qu'on ignore est CE constat-là : si la carte change et que le
// message change avec elle, il revient — c'est voulu, ce n'est plus ce qu'on a jugé.
// Un ignore qui ne correspond plus a rien est signale (avertissement) : on le retire.

/** Le code d'un constat, faute de code declare : son texte sans le « Proprio · Carte — ». */
const texteSeul = msg => { const i = msg.indexOf(' — '); return i < 0 ? msg : msg.slice(i + 3); };
/** Un constat qui bloque vraiment : bloquant ET pas ignore. */
export const bloque = s => !!s.bad && s.ignore === undefined;
/** L'entree de `DB.ignores` qui couvre ce constat, s'il y en a une. */
export const ignoreDe = (DB, s) => (DB.ignores || []).find(g => g.ou === s.ou && g.regle === s.regle) || null;

export function validateData(DB, eff, kw, { niveau = 5 } = {}) {
  const out = [];
  // Ce que `f` ajoute a la liste est rattache a `ou` (et recoit un code s'il n'en a pas) :
  // c'est ce qui le rend ignorable. Les regles n'ont pas a s'en soucier une par une.
  const sur = (ou, f) => {
    const depuis = out.length;
    f();
    if (!ou) return;
    for (let i = depuis; i < out.length; i++) {
      if (!out[i].ou) out[i].ou = ou;
      if (!out[i].regle) out[i].regle = texteSeul(out[i].msg);
    }
  };
  // Le catalogue ou piochent les decks des PNJ : les cartes libres et celles des
  // personnages. Un deck qui pointe ailleurs ne jouera tout simplement pas la carte.
  const catalogue = new Set();
  // La carte elle-meme, pas seulement son identifiant : de quoi verifier qu'un renfort
  // ne vise pas un sort, qui n'a ni attaque ni vie.
  const carteParId = new Map();
  for (const c of DB.library || []) if (c && c.id) { catalogue.add(c.id); carteParId.set(c.id, c); }
  for (const ch of DB.characters || []) {
    for (const cote of ['cards', 'switches']) for (const c of ch[cote] || []) if (c && c.id) { catalogue.add(c.id); carteParId.set(c.id, c); }
  }
  // Ce dont `verifieCarte` a besoin, rassemble une fois : elle sert aux cartes des
  // personnages comme aux cartes libres.
  // Les NOMS des cartes (« Pioche X » designe une carte par son nom, pas par son
  // identifiant) : monte une fois, comme le catalogue, et les cartes libres y sont
  // elles aussi — un deck de PNJ en est fait, et le nom s'y trouve donc pour de bon.
  const noms = new Set();
  for (const c of DB.library || []) if (c && c.name) noms.add(c.name);
  for (const ch of DB.characters || []) {
    for (const cote of ['cards', 'switches']) for (const c of ch[cote] || []) if (c && c.name) noms.add(c.name);
  }
  const ctx = { out, eff, kw, catalogue, carteParId, noms };

  // Les cartes libres : MEMES REGLES QUE LES AUTRES, elles finissent dans des decks —
  // ceux des PNJ et la pile de fatigue. Seule l'identite leur est propre (une carte de
  // personnage tient son slot, une carte libre n'existe que par son identifiant) ; tout
  // le reste passe par `verifieCarte`, exactement comme pour un heros.
  const vues = new Set();
  for (const c of DB.library || []) {
    if (!c) continue;
    if (!c.id) out.push({ bad: true, msg: `Cartes libres · ${c.name || '(sans nom)'} — pas d'identifiant : aucun deck ne pourra la prendre.` });
    else if (vues.has(c.id)) out.push({ bad: true, msg: `Cartes libres — deux cartes portent l'identifiant « ${c.id} ».` });
    vues.add(c.id);
    sur(c.id && 'carte:' + c.id, () => verifieCarte(c, 'Cartes libres', ctx));
  }

  // Les adversaires et leurs decks.
  const idsPnj = new Set();
  for (const n of DB.npcs || []) sur(n.id && 'pnj:' + n.id, () => {
    const ou = `PNJ ${n.name || n.id}`;
    if (!n.id) out.push({ bad: true, msg: `${ou} — pas d'identifiant.` });
    else if (idsPnj.has(n.id)) out.push({ bad: true, msg: `Deux adversaires ont l'identifiant « ${n.id} ».` });
    idsPnj.add(n.id);
    const cartes = (n.deck || []).reduce((a, l) => a + (l.n || 1), 0);
    if (!cartes) out.push({ bad: true, msg: `${ou} — deck vide : il n'aura rien à jouer.` });
    else if (cartes < 8) out.push({ bad: false, regle: 'deck-court', msg: `${ou} — ${cartes} carte(s) seulement : il tournera vite à la fatigue.` });
    for (const l of n.deck || []) {
      if (!catalogue.has(l.card)) out.push({ bad: true, msg: `${ou} — carte « ${l.card} » introuvable : elle sera ignorée dans son deck.` });
    }
    if (!(n.hp > 0)) out.push({ bad: true, msg: `${ou} — ${n.hp || 0} PV : le combat serait déjà fini.` });
  });
  out.push(...verifiePile(DB, catalogue));
  const ids = new Set();
  for (const c of DB.characters) {
    if (ids.has(c.id)) out.push({ bad: true, msg: `Deux personnages ont l'identifiant « ${c.id} ».` });
    ids.add(c.id);
    if (!c.id) out.push({ bad: true, msg: `« ${c.name} » n'a pas d'identifiant.` });
    for (const side of ['cards', 'switches']) {
      const n = (c[side] || []).filter(Boolean).length;
      if (n !== 5) out.push({ bad: side === 'cards', msg: `${c.name} — ${n}/5 ${side === 'cards' ? 'cartes de base' : 'cartes switch'} remplies.` });
      (c[side] || []).forEach(card => sur(card && card.id && 'carte:' + card.id, () => {
        verifieCarte(card, c.name, ctx);
        // Un cout superieur au mana max du personnage : la carte ne sort jamais de la main
        // quand il joue SEUL. Lu au niveau `niveau` (un palier peut baisser le cout), et
        // sans combat (`cardCost` hors combat ne compte que la part fixe : « coûte 1 de
        // moins par tour joué » n'y est pas — d'où Minuit, qu'on ignore plutôt).
        const plafond = Math.min((c.stats || {}).mana || 0, 10);
        if (!card || !plafond) return;
        const cout = cardCost(resolveCard(card, niveau), null, 'p');
        if (cout > plafond) out.push({ bad: true, regle: 'cout-solo',
          msg: `${c.name} · ${card.name} — coûte ${cout} au niveau ${niveau}, or ${c.name} plafonne à ${plafond} mana : injouable quand il part seul.` });
      }));
    }
  }
  for (const s of DB.starters || []) if (!ids.has(s)) out.push({ bad: true, msg: `Le personnage de départ « ${s} » n'existe plus.` });

  // Les constats ignores : marques (pas retires), et les ignores orphelins signales.
  for (const s of out) { const g = ignoreDe(DB, s); if (g) s.ignore = g.pourquoi || ''; }
  for (const g of DB.ignores || []) {
    if (!out.some(s => s.ou === g.ou && s.regle === g.regle))
      out.push({ bad: false, orphelin: g, msg: `Constat ignoré qui ne se produit plus (${g.ou}) : « ${g.regle} ». Tu peux retirer cet ignore.` });
  }
  return out;
}
