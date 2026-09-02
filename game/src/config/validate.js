// VALIDATION DES DONNEES DE CARTES — les memes regles pour le Card Builder (bandeau
// « À vérifier ») et pour la ligne de commande (`node scripts/check-decks.mjs`).
// Ecrites une seule fois : une regle ajoutee ici est appliquee aux deux endroits.
//
// `validateData(db, effets, motsCles)` rend une liste de { bad, msg } :
//   bad: true  = bloquant, la carte ne fera pas ce qu'elle annonce
//   bad: false = avertissement, a regarder mais jouable
// Les registres sont passes en parametre parce que le builder connait aussi les
// mecaniques inventees dans son brouillon, que le jeu, lui, n'a pas encore.
import { TRIGGERS, AMPLIFIABLE, CARD_FILTERS, COUNTERS, STATICS, keyId, keyArg, keyFields,
  isVariableAmount, targetDef, targetArg } from './mechanics.js';

// ---------- PARCOURS D'UNE CARTE ----------
// Un jeton invoque porte des mots-cles et des moments comme une carte : tout ce qui
// inspecte une carte (validation, compte des mecaniques a coder, fichier de suivi)
// doit donc descendre dedans, sinon une mecanique se cache dans un jeton.

/** Chaque effet d'une carte : ses moments, ses paliers, et ceux de ses jetons. */
export function eachEffect(card, fn) {
  const lists = [];
  const holder = h => { for (const slot of Object.keys(TRIGGERS)) if ((h[slot] || []).length) lists.push(h[slot]); };
  holder(card);
  for (const t of card.tiers || []) if (t.extra) lists.push([t.extra]);
  while (lists.length) {
    for (const e of lists.pop()) {
      fn(e);
      if (e.op === 'summon' && e.unit) holder(e.unit);
    }
  }
}

/** Chaque unite d'une carte : elle-meme si c'est un allie, plus chaque jeton invoque. */
export function eachUnit(card, fn) {
  if (card.type === 'ally') fn(card);
  eachEffect(card, e => { if (e.op === 'summon' && e.unit) fn(e.unit); });
}

// Un palier peut etre parfaitement valide et ne rien faire du tout sur SA carte :
// amplifier une carte qui ne fait que piocher, donner un mot-cle a un sort...
// On le dit tout de suite plutot que de laisser la carte mentir au joueur.
export function tierIssue(cd, t) {
  if (!cd) return null;
  if (t.amp !== undefined) {
    const ampliable = Object.keys(TRIGGERS).some(slot => (cd[slot] || []).some(e => AMPLIFIABLE.includes(e.op)));
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
  for (const c of DB.library || []) if (c && c.id) catalogue.add(c.id);
  for (const ch of DB.characters || []) {
    for (const cote of ['cards', 'switches']) for (const c of ch[cote] || []) if (c && c.id) catalogue.add(c.id);
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
          // « Cree » designe une carte du catalogue par son identifiant.
          if (e.op === 'cree') {
            if (!e.carte) out.push({ bad: false, msg: `${c.name} · ${card.name} — « Crée une carte » sans carte choisie.` });
            else if (!catalogue.has(e.carte)) out.push({ bad: true, msg: `${c.name} · ${card.name} — la carte créée « ${e.carte} » n'existe pas.` });
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
        // « Lui » en tete de liste ne designe rien : aucun effet ne l'a precede.
        for (const [slot, def] of Object.entries(TRIGGERS)) {
          if ((card[slot] || [])[0] && card[slot][0].t === 'previous')
            out.push({ bad: false, msg: `${c.name} · ${card.name} — « ${def.label} » commence par « Lui » : aucun effet ne le précède, la cible sera vide.` });
        }
        for (const t of card.tiers || []) {
          const w = tierIssue(card, t);
          if (w) out.push({ bad: false, msg: `${c.name} · ${card.name} — palier ${t.lvl} sans effet : ${w}` });
        }
        // Une cible comme « Elle-meme » n'a pas de porteur sur un sort.
        for (const slot of Object.keys(TRIGGERS)) {
          for (const e of card[slot] || []) {
            const tdef = targetDef(e.t);
            if (tdef && tdef.allyOnly && card.type !== 'ally')
              out.push({ bad: true, msg: `${c.name} · ${card.name} — cible « ${tdef.label} » impossible sur un sort.` });
            // Une cible par type sans type écrit ne trouvera jamais personne.
            if (tdef && (tdef.params || []).length && !targetArg(e.t))
              out.push({ bad: false, msg: `${c.name} · ${card.name} — cible « ${tdef.label} » sans type : elle ne touchera personne.` });
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
