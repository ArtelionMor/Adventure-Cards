// VALIDATION DES DONNEES DE CARTES — les memes regles pour le Card Builder (bandeau
// « À vérifier ») et pour la ligne de commande (`node scripts/check-decks.mjs`).
// Ecrites une seule fois : une regle ajoutee ici est appliquee aux deux endroits.
//
// `validateData(db, effets, motsCles)` rend une liste de { bad, msg } :
//   bad: true  = bloquant, la carte ne fera pas ce qu'elle annonce
//   bad: false = avertissement, a regarder mais jouable
// Les registres sont passes en parametre parce que le builder connait aussi les
// mecaniques inventees dans son brouillon, que le jeu, lui, n'a pas encore.
import { TRIGGERS, EVENTS, AMPLIFIABLE, CARD_FILTERS, COUNTERS, STATICS, keyId, keyArg, keyFields,
  isVariableAmount, targetDef, targetId, targetArg, targetLabel, describeAmount, effectParams, eachSubEffect, listeEffets, typeVariable } from './mechanics.js';

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

export function validateData(DB, eff, kw) {
  const out = [];
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

  // Les cartes libres : memes regles que les autres, elles finissent dans des decks.
  const vues = new Set();
  for (const c of DB.library || []) {
    if (!c) continue;
    if (!c.id) out.push({ bad: true, msg: `Cartes libres · ${c.name || '(sans nom)'} — pas d'identifiant : aucun deck ne pourra la prendre.` });
    else if (vues.has(c.id)) out.push({ bad: true, msg: `Cartes libres — deux cartes portent l'identifiant « ${c.id} ».` });
    vues.add(c.id);
    if (c.type === 'ally' && (c.atk === undefined || c.hp === undefined))
      out.push({ bad: true, msg: `Cartes libres · ${c.name} — allié sans attaque ou sans vie : il arrivera en 0/0.` });
    eachEffect(c, e => {
      if (!eff[e.op]) out.push({ bad: true, msg: `Cartes libres · ${c.name} — effet inconnu « ${e.op} ».` });
      else if (!eff[e.op].implemented) out.push({ bad: false, msg: `Cartes libres · ${c.name} — « ${eff[e.op].label} » reste à coder.` });
    });
  }

  // Les adversaires et leurs decks.
  const idsPnj = new Set();
  for (const n of DB.npcs || []) {
    const ou = `PNJ ${n.name || n.id}`;
    if (!n.id) out.push({ bad: true, msg: `${ou} — pas d'identifiant.` });
    else if (idsPnj.has(n.id)) out.push({ bad: true, msg: `Deux adversaires ont l'identifiant « ${n.id} ».` });
    idsPnj.add(n.id);
    const cartes = (n.deck || []).reduce((a, l) => a + (l.n || 1), 0);
    if (!cartes) out.push({ bad: true, msg: `${ou} — deck vide : il n'aura rien à jouer.` });
    else if (cartes < 8) out.push({ bad: false, msg: `${ou} — ${cartes} carte(s) seulement : il tournera vite à la fatigue.` });
    for (const l of n.deck || []) {
      if (!catalogue.has(l.card)) out.push({ bad: true, msg: `${ou} — carte « ${l.card} » introuvable : elle sera ignorée dans son deck.` });
    }
    if (!(n.hp > 0)) out.push({ bad: true, msg: `${ou} — ${n.hp || 0} PV : le combat serait déjà fini.` });
  }
  out.push(...verifiePile(DB, catalogue));
  const ids = new Set();
  for (const c of DB.characters) {
    if (ids.has(c.id)) out.push({ bad: true, msg: `Deux personnages ont l'identifiant « ${c.id} ».` });
    ids.add(c.id);
    if (!c.id) out.push({ bad: true, msg: `« ${c.name} » n'a pas d'identifiant.` });
    for (const side of ['cards', 'switches']) {
      const n = (c[side] || []).filter(Boolean).length;
      if (n !== 5) out.push({ bad: side === 'cards', msg: `${c.name} — ${n}/5 ${side === 'cards' ? 'cartes de base' : 'cartes switch'} remplies.` });
      (c[side] || []).forEach((card, i) => {
        if (!card) return;
        // Un allie sans ligne de statistiques arrive en 0/0 et meurt aussitot pose.
        // C'est invisible dans l'editeur (les champs paraissent vides) et ca casse un
        // deck entier sans rien dire : on le signale comme bloquant.
        if (card.type === 'ally') {
          if (card.atk === undefined || card.hp === undefined)
            out.push({ bad: true, msg: `${c.name} · ${card.name} — allié sans attaque ou sans vie : il arrivera en 0/0 et mourra aussitôt.` });
          else if (card.hp <= 0 && !(card.keys || []).some(k => keyId(k) === 'characteristique_variable'))
            out.push({ bad: true, msg: `${c.name} · ${card.name} — allié à ${card.hp} PV : il mourra en arrivant.` });
        }
        // Effets de la carte et de ses jetons.
        eachEffect(card, e => {
          if (!eff[e.op]) out.push({ bad: true, msg: `${c.name} · ${card.name} — effet inconnu « ${e.op} ».` });
          else if (!eff[e.op].implemented) out.push({ bad: false, msg: `${c.name} · ${card.name} — « ${eff[e.op].label} » reste à coder.` });
          // « Cree » designe une carte du catalogue par son identifiant — sauf au
          // hasard, ou c'est le filtre qui doit tenir debout.
          if (e.op === 'cree') out.push(...verifieCarteCreee(e, `${c.name} · ${card.name}`, 'Crée une carte', catalogue));
          // Melanger dans la pioche : la carte creee doit exister, et un filtre par
          // type ou par mot-cle sans valeur ne designerait aucune carte.
          if (['melange_a_la_pioche', 'renvoie_en_main', 'pose_sur_le_plateau', 'switch'].includes(e.op)) {
            const nom = (eff[e.op] || {}).label || e.op;
            if (e.d_ou === 'creee') {
              out.push(...verifieCarteCreee(e, `${c.name} · ${card.name}`, nom, catalogue));
              // Le renfort s'ecrit sur une carte alliee : une carte creee qui est un sort
              // (tiree parmi les sorts, ou nommee) ne le verra jamais.
              const sortCree = (e.choix === 'hasard' && e.quoi === 'spell')
                || (e.choix !== 'hasard' && carteParId.has(e.carte) && carteParId.get(e.carte).type !== 'ally');
              if ((e.atk || e.hp) && sortCree)
                out.push({ bad: false, msg: `${c.name} · ${card.name} — « ${nom} » donne +${describeAmount(e.atk || 0)}/+${describeAmount(e.hp || 0)} à un sort : un sort n'a ni attaque ni vie, le bonus ne fera rien.` });
            } else if (e.d_ou === 'plateau') {
              if (!e.t) out.push({ bad: false, msg: `${c.name} · ${card.name} — « ${nom} » prend sur le plateau sans cible : il ne prendra rien.` });
              else if (cibleHeros(e.t)) out.push({ bad: true, msg: `${c.name} · ${card.name} — « ${nom} » vise un héros : un héros n'est pas une carte, il ne ${e.op === 'switch' ? 'se switche pas' : 'se déplace pas'}.` });
              else if (e.op === 'pose_sur_le_plateau') out.push({ bad: false, msg: `${c.name} · ${card.name} — « ${nom} » prend une unité en jeu pour la reposer : elle repart de zéro (dégâts et renforts effacés, elle ne peut plus attaquer ce tour). Voulu ?` });
            } else {
              // Le renfort « +X/+Y » s'ecrit sur une carte alliee : un paquet filtre sur
              // les sorts n'en verra jamais la couleur.
              if ((e.atk || e.hp) && e.quoi === 'spell') out.push({ bad: false, msg: `${c.name} · ${card.name} — « ${nom} » donne +${describeAmount(e.atk || 0)}/+${describeAmount(e.hp || 0)} à des sorts : un sort n'a ni attaque ni vie, le bonus ne fera rien.` });
              out.push(...verifieFiltre(e, `${c.name} · ${card.name}`, nom, catalogue, 'il ne prendra aucune carte'));
            }
          }
          // Renforcer des cartes : les memes pieges que les deplacements, sur un effet
          // qui ne deplace rien.
          if (e.op === 'renforce_les_cartes') {
            if (!e.atk && !e.hp) out.push({ bad: false, msg: `${c.name} · ${card.name} — « Renforce des cartes » ne donne ni attaque ni vie : il ne fera rien.` });
            if (e.quoi === 'spell') out.push({ bad: false, msg: `${c.name} · ${card.name} — « Renforce des cartes » ne vise que des sorts : un sort n'a ni attaque ni vie, le bonus ne fera rien.` });
            out.push(...verifieFiltre(e, `${c.name} · ${card.name}`, 'Renforce des cartes', catalogue, 'il ne touchera aucune carte'));
          }

          // PRENDRE LE CONTROLE ne prend rien chez soi (l'unite y est deja) et rien
          // sur un heros (ce n'est pas une unite).
          if (e.op === 'prendre_le_controle') {
            const t = targetId(e.t);
            if (['self', 'allyUnit', 'allAllies', 'randomAllyUnit', 'sameTypeAllies', 'allyType'].includes(t))
              out.push({ bad: false, msg: `${c.name} · ${card.name} — « Prise de controle » vise ton propre camp : ces unités sont déjà de ton côté, rien ne se passera.` });
            if (cibleHeros(t)) out.push({ bad: true, msg: `${c.name} · ${card.name} — « Prise de controle » vise un héros : un héros n'est pas une unité, il ne change pas de camp.` });
          }
          // CHOISIR : deux branches, et quelqu'un pour choisir.
          if (e.op === 'choisir') {
            for (const cle of ['a', 'b']) {
              if (!listeEffets(e[cle]).length)
                out.push({ bad: false, msg: `${c.name} · ${card.name} — « Choisir » n'a pas de ${cle === 'a' ? 'première' : 'seconde'} branche : il n'y a rien à choisir.` });
            }
          }

          // « Chez son proprietaire » n'a de sens que s'il y a une cible a lire. Les
          // trois deplacements prennent dans un paquet, pas sur une unite : chez eux,
          // ce choix retombe sur le camp de celui qui joue la carte.
          if (e.qui === 'proprietaire' && ['melange_a_la_pioche', 'renvoie_en_main', 'pose_sur_le_plateau', 'renforce_les_cartes'].includes(e.op))
            out.push({ bad: false, msg: `${c.name} · ${card.name} — « ${(eff[e.op] || {}).label || e.op} » prend « chez son propriétaire » sans cible à lire : ce sera ton camp.` });

          // LA COPIE va chercher un modele la ou un deplacement va chercher des cartes :
          // les memes pieges de filtre, plus les deux qui lui sont propres — un modele
          // qui ne peut etre qu'un sort (une unite ne peut pas en devenir la copie) et
          // deux cibles a designer alors que le joueur n'en pointe qu'une.
          if (e.op === 'copie') {
            const ou = `${c.name} · ${card.name}`;
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
            const noms = [];
            for (const ch of DB.characters) for (const sd of ['cards', 'switches'])
              for (const ca of ch[sd] || []) if (ca) noms.push(ca.name);
            if (!e.carte) out.push({ bad: false, msg: `${c.name} · ${card.name} — pioche ciblée sans carte choisie.` });
            else if (!noms.includes(e.carte)) out.push({ bad: true, msg: `${c.name} · ${card.name} — « ${e.carte} » n'existe dans aucun deck : la pioche ne trouvera rien.` });
          }
          // Un montant variable dont le compteur reclame un type, sans type : toujours 0.
          for (const par of ((eff[e.op] || {}).params || [])) {
            const v = e[par.k];
            if (!isVariableAmount(v)) continue;
            const cpt = COUNTERS[v.src];
            if (!cpt) out.push({ bad: true, msg: `${c.name} · ${card.name} — compteur inconnu « ${v.src} » sur « ${par.label} ».` });
            else if (cpt.needsArg && !v.arg) out.push({ bad: false, msg: `${c.name} · ${card.name} — « ${par.label} » suit « ${cpt.label} » sans valeur : le montant restera à 0.` });
          }
        });
        // Effets statiques de la carte et de ses jetons : un filtre sans valeur ne
        // designerait aucune carte, l'effet ne ferait donc rien du tout.
        eachUnit(card, u => {
          const ou = u === card ? '' : ` (jeton « ${u.name} »)`;
          for (const m of u.statics || []) {
            const d = STATICS[m.op];
            if (!d) { out.push({ bad: true, msg: `${c.name} · ${card.name}${ou} — effet statique inconnu « ${m.op} ».` }); continue; }
            const arg = (CARD_FILTERS[m.quoi] || {}).arg;
            if (arg === 'type' && !m.argType) out.push({ bad: false, msg: `${c.name} · ${card.name}${ou} — « ${d.label} » vise un type mais aucun type n'est écrit : il ne touchera aucune carte.` });
            if (arg === 'key' && !m.argKey) out.push({ bad: false, msg: `${c.name} · ${card.name}${ou} — « ${d.label} » vise un mot-clé mais aucun n'est choisi : il ne touchera aucune carte.` });
            if (arg === 'card' && !m.argCard) out.push({ bad: false, msg: `${c.name} · ${card.name}${ou} — « ${d.label} » vise une carte précise mais aucune n'est choisie : il ne touchera rien.` });
            else if (arg === 'card' && !catalogue.has(m.argCard)) out.push({ bad: true, msg: `${c.name} · ${card.name}${ou} — « ${d.label} » vise la carte « ${m.argCard} », qui n'existe pas.` });
          }
        });
        // Mots-cles de la carte et de ses jetons.
        eachUnit(card, u => {
          const ou = u === card ? '' : ` (jeton « ${u.name} »)`;
          for (const k of u.keys || []) {
            const d = kw[keyId(k)];
            if (!d) out.push({ bad: true, msg: `${c.name} · ${card.name}${ou} — mot-clé inconnu « ${keyId(k)} ».` });
            else if (!d.implemented) out.push({ bad: false, msg: `${c.name} · ${card.name}${ou} — mot-clé « ${d.label} » reste à coder.` });
            else if ((d.params || []).length && !keyArg(k)) out.push({ bad: false, msg: `${c.name} · ${card.name}${ou} — mot-clé « ${d.label} » sans valeur : il ne servira à rien.` });
          // Une caracteristique variable qui suit un compteur reclamant un type, sans type.
          if (keyId(k) === 'characteristique_variable') {
            const f = keyFields(k);
            const cpt = COUNTERS[f.src];
            if (cpt && cpt.needsArg && !f.arg)
              out.push({ bad: false, msg: `${c.name} · ${card.name}${ou} — « ${cpt.label} » sans valeur suivie : le compteur restera à 0.` });
            // Vie qui n'est PAS variable et vaut 0 : l'unité meurt en arrivant.
            if (f.stat === 'atk' && !(u.hp > 0))
              out.push({ bad: false, msg: `${c.name} · ${card.name}${ou} — seule l'attaque varie et la vie écrite est ${u.hp || 0} : l'unité mourra en arrivant.` });
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
            out.push({ bad: true, msg: `${c.name} · ${card.name} — deux cibles à désigner dans des camps opposés partent ensemble : le joueur n'en pointe qu'une, donc l'une des deux ne touchera jamais rien. Passe l'une en cible automatique (« au hasard », « tous »).` });
        }

        // UNE GARDE QUI NE PEUT PAS ETRE VRAIE : « seulement une unite d'un type »
        // sans type ecrit ne laissera jamais passer le moment.
        for (const [slot, g] of Object.entries(card.gardes || {})) {
          if (keyId(g) === 'type' && !keyArg(g))
            out.push({ bad: true, msg: `${c.name} · ${card.name} — « ${(TRIGGERS[slot] || {}).label || slot} » ne part que pour un type, mais aucun type n'est écrit : il ne partira jamais.` });
        }

        // « CHOISIR » ne se choisit qu'a la pose : ailleurs (rale d'agonie, debut de
        // tour), personne n'est la pour repondre et c'est la premiere branche qui part.
        for (const [slot, def] of Object.entries(TRIGGERS)) {
          if (slot === 'play') continue;
          for (const e of card[slot] || []) eachSubEffect(e, x => {
            if (x.op === 'choisir')
              out.push({ bad: false, msg: `${c.name} · ${card.name} — « Choisir » sur « ${def.label} » : personne n'est là pour choisir, c'est toujours la première branche qui partira.` });
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
            out.push({ bad: true, msg: `${c.name} · ${card.name} — « ${def.label} » commence par « ${targetLabel(premier.t)} » : aucun effet ne le précède, la cible sera vide et l'effet ne fera rien.` });
        }
        for (const t of card.tiers || []) {
          const w = tierIssue(card, t);
          if (w) out.push({ bad: false, msg: `${c.name} · ${card.name} — palier ${t.lvl} sans effet : ${w}` });
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
                out.push({ bad: true, msg: `${c.name} · ${card.name} — cible « ${tdef.label} » impossible sur un sort.` });
              // Une cible par type sans type écrit ne trouvera jamais personne.
              if (tdef && (tdef.params || []).length && !targetArg(t))
                out.push({ bad: false, msg: `${c.name} · ${card.name} — cible « ${tdef.label} » sans type : elle ne touchera personne.` });
            }
          }
        }
        // Un sort ne reste pas en jeu : ses moments d'unite ne partiraient jamais.
        if (card.type !== 'ally') {
          for (const [slot, def] of Object.entries(TRIGGERS)) {
            if (def.allyOnly && (card[slot] || []).length)
              out.push({ bad: true, msg: `${c.name} · ${card.name} — « ${def.label} » sur un sort ne se déclenchera jamais.` });
          }
          if (card.aura) out.push({ bad: true, msg: `${c.name} · ${card.name} — une aura sur un sort ne s'appliquera jamais.` });
          if ((card.statics || []).length) out.push({ bad: true, msg: `${c.name} · ${card.name} — un effet statique sur un sort ne s'appliquera jamais (le sort ne reste pas en jeu).` });
        }
      });
    }
  }
  for (const s of DB.starters || []) if (!ids.has(s)) out.push({ bad: true, msg: `Le personnage de départ « ${s} » n'existe plus.` });
  return out;
}
