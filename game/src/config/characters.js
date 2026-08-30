// GAME CONFIG — personnages et cartes.
// Modele GDD : 1 personnage = 5 cartes fixes + 1 carte switch alternative par slot.
// Un deck = 3 personnages = 15 cartes melangees dans un paquet unique.
//
// Effets disponibles (interpretes par combat/engine.js) :
//   {op:'dmg',    t:'enemyAny'|'enemyUnit'|'enemyHero'|'allEnemyUnits', v:N}
//   {op:'heal',   t:'ownHero'|'allyUnit'|'allAllies', v:N}
//   {op:'buff',   t:'allyUnit'|'allAllies', atk:N, hp:N, key:'Charge'}
//   {op:'draw',   v:N}
//   {op:'armor',  v:N}
//   {op:'mana',   v:N}                      // mana temporaire, ce tour uniquement
//   {op:'summon', n:N, unit:{name,atk,hp,keys}}
// Mots-cles : Taunt (doit etre attaque en premier), Charge (peut attaquer le tour de
// son arrivee), Venin (detruit toute unite qu'il blesse), Bouclier (absorbe la 1re perte de PV).

const P = 'Characters/';

// Paliers par defaut, cumulatifs (cf. Anatomie de carte du GDD).
// Les niveaux sont ceux vus sur les mockups : 2/5/10 pour un Ally, 3/6/11 pour un Spell.
const allyTiers = () => [
  { lvl: 2, stats: { atk: 0, hp: 1 }, text: '+0/+1' },
  { lvl: 5, stats: { atk: 1, hp: 0 }, text: '+1/+0' },
  { lvl: 10, stats: { atk: 1, hp: 2 }, text: '+1/+2' }
];
const spellTiers = () => [
  { lvl: 3, amp: 1, text: 'Effet +1' },
  { lvl: 6, extra: { op: 'draw', v: 1 }, text: 'Pioche 1 carte en plus' },
  { lvl: 11, amp: 2, text: 'Effet +2' }
];

// Fabriques compactes : A = allie, S = sort.
const A = (id, name, cost, atk, hp, o = {}) => ({
  id, name, type: 'ally', cost, atk, hp,
  keys: o.keys || [], text: o.text || '', play: o.play || [],
  tiers: o.tiers || allyTiers()
});
const S = (id, name, cost, o = {}) => ({
  id, name, type: 'spell', cost,
  keys: [], text: o.text || '', play: o.play || [],
  tiers: o.tiers || spellTiers()
});

export const CHARACTERS = [
  {
    id: 'dog',
    name: 'Gniocci',
    species: 'Chien',
    sprite: P + 'Dog Gniocci.png',
    role: 'Gardien — tient la ligne et soigne',
    stats: { hp: 32, mana: 7, hand: 4 },
    cards: [
      A('dog_pup', 'Toutou Fidele', 1, 1, 3, { keys: ['Taunt'], text: 'Provocation.' }),
      A('dog_guard', 'Molosse de Garde', 3, 3, 4, { keys: ['Taunt'], text: 'Provocation.' }),
      S('dog_bark', 'Aboiement', 1, { text: 'Inflige 2 degats.', play: [{ op: 'dmg', t: 'enemyAny', v: 2 }] }),
      S('dog_lick', 'Coup de Langue', 2, { text: 'Rend 6 PV a ton heros.', play: [{ op: 'heal', t: 'ownHero', v: 6 }] }),
      A('dog_pack', 'Meute', 4, 2, 2, {
        text: 'Cri de guerre : invoque deux Chiots 1/1.',
        play: [{ op: 'summon', n: 2, unit: { name: 'Chiot', atk: 1, hp: 1 } }]
      })
    ],
    switches: [
      A('dog_bite', 'Morsure', 2, 3, 2, { keys: ['Charge'], text: 'Charge.' }),
      A('dog_alpha', 'Alpha', 5, 5, 5, {
        text: 'Cri de guerre : +1/+1 a tes autres allies.',
        play: [{ op: 'buff', t: 'allAllies', atk: 1, hp: 1 }]
      }),
      S('dog_shield', 'Carapace', 2, { text: 'Gagne 6 points d’armure.', play: [{ op: 'armor', v: 6 }] }),
      S('dog_bone', 'Vieil Os', 3, {
        text: 'Rend 4 PV et pioche une carte.',
        play: [{ op: 'heal', t: 'ownHero', v: 4 }, { op: 'draw', v: 1 }]
      }),
      S('dog_growl', 'Grondement', 1, {
        text: 'Un allie gagne +0/+3 et Provocation.',
        play: [{ op: 'buff', t: 'allyUnit', atk: 0, hp: 3, key: 'Taunt' }]
      })
    ]
  },

  {
    id: 'cat',
    name: 'Mistral',
    species: 'Chat',
    sprite: P + 'Cat.png',
    role: 'Rodeur — vitesse et pression',
    stats: { hp: 26, mana: 8, hand: 5 },
    cards: [
      A('cat_claw', 'Griffure', 1, 2, 1, { keys: ['Charge'], text: 'Charge.' }),
      A('cat_alley', 'Chat de Gouttiere', 2, 2, 3),
      S('cat_pounce', 'Bond', 1, { text: 'Inflige 3 degats a une unite.', play: [{ op: 'dmg', t: 'enemyUnit', v: 3 }] }),
      S('cat_nine', 'Neuf Vies', 3, {
        text: 'Invoque trois Chatons 1/1 avec Charge.',
        play: [{ op: 'summon', n: 3, unit: { name: 'Chaton', atk: 1, hp: 1, keys: ['Charge'] } }]
      }),
      A('cat_shadow', 'Ombre Feutree', 4, 5, 3)
    ],
    switches: [
      S('cat_scratch', 'Coup de Patte', 0, { text: 'Inflige 1 degat.', play: [{ op: 'dmg', t: 'enemyAny', v: 1 }] }),
      S('cat_hunt', 'Chasse', 2, {
        text: 'Un allie gagne +2/+0 et Charge.',
        play: [{ op: 'buff', t: 'allyUnit', atk: 2, hp: 0, key: 'Charge' }]
      }),
      S('cat_curio', 'Curiosite', 2, { text: 'Pioche 2 cartes.', play: [{ op: 'draw', v: 2 }] }),
      A('cat_trap', 'Piege a Souris', 2, 1, 4, {
        keys: ['Taunt'], text: 'Provocation. Cri de guerre : pioche une carte.',
        play: [{ op: 'draw', v: 1 }]
      }),
      A('cat_king', 'Roi des Toits', 5, 4, 5, {
        text: 'Cri de guerre : +1/+0 a tes autres allies.',
        play: [{ op: 'buff', t: 'allAllies', atk: 1, hp: 0 }]
      })
    ]
  },

  {
    id: 'crow',
    name: 'Corax',
    species: 'Corbeau',
    sprite: P + 'Crow.png',
    role: 'Filou — pioche et degats directs',
    stats: { hp: 24, mana: 8, hand: 5 },
    cards: [
      S('crow_peck', 'Coup de Bec', 1, {
        text: 'Inflige 2 degats au heros adverse et pioche une carte.',
        play: [{ op: 'dmg', t: 'enemyHero', v: 2 }, { op: 'draw', v: 1 }]
      }),
      A('crow_scout', 'Eclaireur', 2, 2, 2, { text: 'Cri de guerre : pioche une carte.', play: [{ op: 'draw', v: 1 }] }),
      S('crow_murder', 'Nuee', 4, { text: 'Inflige 2 degats a toutes les unites adverses.', play: [{ op: 'dmg', t: 'allEnemyUnits', v: 2 }] }),
      S('crow_omen', 'Presage', 2, { text: 'Pioche 2 cartes.', play: [{ op: 'draw', v: 2 }] }),
      A('crow_raven', 'Grand Corbeau', 5, 4, 4)
    ],
    switches: [
      A('crow_thief', 'Voleur de Brillants', 3, 3, 2, { text: 'Cri de guerre : +1 mana ce tour.', play: [{ op: 'mana', v: 1 }] }),
      S('crow_curse', 'Malediction', 3, { text: 'Inflige 5 degats.', play: [{ op: 'dmg', t: 'enemyAny', v: 5 }] }),
      S('crow_feather', 'Plume Noire', 1, { text: 'Un allie gagne +2/+1.', play: [{ op: 'buff', t: 'allyUnit', atk: 2, hp: 1 }] }),
      A('crow_swarm', 'Envol', 4, 3, 3, {
        text: 'Cri de guerre : invoque un Corbillat 1/2.',
        play: [{ op: 'summon', n: 1, unit: { name: 'Corbillat', atk: 1, hp: 2 } }]
      }),
      S('crow_night', 'Nuit Sans Lune', 5, {
        text: '3 degats a toutes les unites adverses, 2 au heros adverse.',
        play: [{ op: 'dmg', t: 'allEnemyUnits', v: 3 }, { op: 'dmg', t: 'enemyHero', v: 2 }]
      })
    ]
  },

  {
    id: 'frog',
    name: 'Bulle',
    species: 'Grenouille',
    sprite: P + 'Frog.png',
    role: 'Venin — use l’adversaire',
    stats: { hp: 28, mana: 7, hand: 4 },
    cards: [
      A('frog_tad', 'Tetard', 1, 1, 2),
      S('frog_tongue', 'Langue Collante', 2, { text: 'Inflige 3 degats a une unite.', play: [{ op: 'dmg', t: 'enemyUnit', v: 3 }] }),
      A('frog_venom', 'Crapaud Venimeux', 3, 2, 4, { keys: ['Venin'], text: 'Venin : detruit toute unite qu’il blesse.' }),
      S('frog_swamp', 'Vase', 3, { text: 'Inflige 2 degats a toutes les unites adverses.', play: [{ op: 'dmg', t: 'allEnemyUnits', v: 2 }] }),
      A('frog_toad', 'Grand Crapaud', 5, 4, 6, { keys: ['Taunt'], text: 'Provocation.' })
    ],
    switches: [
      S('frog_leap', 'Saut', 1, { text: 'Un allie gagne +1/+1 et Charge.', play: [{ op: 'buff', t: 'allyUnit', atk: 1, hp: 1, key: 'Charge' }] }),
      S('frog_spit', 'Crachat Acide', 2, {
        text: 'Inflige 2 degats et rend 2 PV.',
        play: [{ op: 'dmg', t: 'enemyAny', v: 2 }, { op: 'heal', t: 'ownHero', v: 2 }]
      }),
      A('frog_lily', 'Nenuphar', 2, 0, 5, {
        keys: ['Taunt'], text: 'Provocation. Cri de guerre : 3 points d’armure.',
        play: [{ op: 'armor', v: 3 }]
      }),
      S('frog_brew', 'Decoction', 4, {
        text: 'Rend 8 PV et pioche une carte.',
        play: [{ op: 'heal', t: 'ownHero', v: 8 }, { op: 'draw', v: 1 }]
      }),
      A('frog_prince', 'Prince Grenouille', 6, 6, 6, {
        text: 'Cri de guerre : +1/+1 a tes autres allies.',
        play: [{ op: 'buff', t: 'allAllies', atk: 1, hp: 1 }]
      })
    ]
  },

  {
    id: 'owl',
    name: 'Athena',
    species: 'Chouette',
    sprite: P + 'Owl.png',
    role: 'Controle — mana et cartes',
    stats: { hp: 26, mana: 9, hand: 5 },
    cards: [
      S('owl_study', 'Etude', 1, { text: 'Pioche une carte et gagne 1 mana ce tour.', play: [{ op: 'draw', v: 1 }, { op: 'mana', v: 1 }] }),
      A('owl_scholar', 'Chouette Erudite', 2, 1, 4),
      S('owl_gaze', 'Regard Percant', 3, { text: 'Inflige 4 degats.', play: [{ op: 'dmg', t: 'enemyAny', v: 4 }] }),
      S('owl_wisdom', 'Sagesse', 4, { text: 'Pioche 3 cartes.', play: [{ op: 'draw', v: 3 }] }),
      A('owl_night', 'Chouette Nocturne', 5, 3, 6, { keys: ['Taunt'], text: 'Provocation.' })
    ],
    switches: [
      S('owl_focus', 'Concentration', 2, { text: 'Gagne 2 mana ce tour.', play: [{ op: 'mana', v: 2 }] }),
      S('owl_lecture', 'Lecon', 3, { text: '+1/+2 a tous tes allies.', play: [{ op: 'buff', t: 'allAllies', atk: 1, hp: 2 }] }),
      A('owl_watch', 'Guet', 3, 2, 3, { keys: ['Taunt'], text: 'Provocation. Cri de guerre : 3 armure.', play: [{ op: 'armor', v: 3 }] }),
      S('owl_storm', 'Tempete d’Idees', 5, {
        text: '2 degats a toutes les unites adverses, pioche 2 cartes.',
        play: [{ op: 'dmg', t: 'allEnemyUnits', v: 2 }, { op: 'draw', v: 2 }]
      }),
      A('owl_arch', 'Archichouette', 6, 5, 7)
    ]
  },

  {
    id: 'fox',
    name: 'Roux',
    species: 'Renard',
    sprite: P + 'Fox Wild.png',
    role: 'Bandit — burst et tempo',
    stats: { hp: 25, mana: 8, hand: 4 },
    cards: [
      A('fox_kit', 'Renardeau', 1, 1, 1, { text: 'Cri de guerre : pioche une carte.', play: [{ op: 'draw', v: 1 }] }),
      A('fox_dash', 'Fulgurance', 2, 3, 1, { keys: ['Charge'], text: 'Charge.' }),
      S('fox_snare', 'Collet', 2, { text: 'Inflige 3 degats a une unite.', play: [{ op: 'dmg', t: 'enemyUnit', v: 3 }] }),
      S('fox_raid', 'Razzia', 3, { text: 'Inflige 4 degats au heros adverse.', play: [{ op: 'dmg', t: 'enemyHero', v: 4 }] }),
      A('fox_wild', 'Renard Sauvage', 4, 4, 3, { keys: ['Charge'], text: 'Charge.' })
    ],
    switches: [
      S('fox_cunning', 'Ruse', 1, { text: 'Un allie gagne +3/+0.', play: [{ op: 'buff', t: 'allyUnit', atk: 3, hp: 0 }] }),
      S('fox_ambush', 'Embuscade', 4, { text: 'Inflige 3 degats a toutes les unites adverses.', play: [{ op: 'dmg', t: 'allEnemyUnits', v: 3 }] }),
      A('fox_bandit', 'Bandit Masque', 3, 3, 3, { text: 'Cri de guerre : 2 degats au heros adverse.', play: [{ op: 'dmg', t: 'enemyHero', v: 2 }] }),
      S('fox_frenzy', 'Frenesie', 3, { text: 'Tes allies gagnent +1/+0 et Charge.', play: [{ op: 'buff', t: 'allAllies', atk: 1, hp: 0, key: 'Charge' }] }),
      A('fox_king', 'Roi Bandit', 6, 6, 4, { keys: ['Charge'], text: 'Charge.' })
    ]
  }
];

export const CHAR_BY_ID = Object.fromEntries(CHARACTERS.map(c => [c.id, c]));

// Les 3 personnages distribues pendant le tutoriel (GDD).
export const STARTERS = ['dog', 'cat', 'crow'];

/**
 * Applique les paliers de niveau cumulatifs a une carte.
 * Le niveau est celui du PERSONNAGE proprietaire, pas de la carte.
 */
export function resolveCard(def, level) {
  const c = {
    ...def,
    keys: [...def.keys],
    play: def.play.map(e => ({ ...e })),
    ownerLevel: level,
    unlocked: []
  };
  let amp = 0;
  for (const t of def.tiers) {
    if (level < t.lvl) continue;
    c.unlocked.push(t.lvl);
    if (t.stats) { c.atk = (c.atk || 0) + (t.stats.atk || 0); c.hp = (c.hp || 0) + (t.stats.hp || 0); }
    if (t.key && !c.keys.includes(t.key)) c.keys.push(t.key);
    if (t.cost) c.cost = Math.max(0, c.cost + t.cost);
    if (t.extra) c.play.push({ ...t.extra });
    if (t.amp) amp += t.amp;
  }
  if (amp) {
    for (const e of c.play) {
      if (e.op === 'dmg' || e.op === 'heal') e.v += amp;
      else if (e.op === 'buff') { if (e.atk) e.atk += amp; if (e.hp) e.hp += amp; }
      else if (e.op === 'armor') e.v += amp;
    }
  }
  return c;
}

/** Les 5 cartes effectives d'un personnage, en tenant compte des switch equipes. */
export function characterDeck(charId, save) {
  const def = CHAR_BY_ID[charId];
  const st = save.chars[charId];
  return def.cards.map((base, i) => {
    const c = resolveCard(st.switches[i] ? def.switches[i] : base, st.level);
    c.sprite = def.sprite;
    c.owner = charId;
    return c;
  });
}
