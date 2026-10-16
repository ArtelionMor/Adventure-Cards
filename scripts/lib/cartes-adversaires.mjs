// LES CARTES DES ADVERSAIRES (16 octobre 2026) — 44 cartes libres (`CHARACTER_DATA.library`) et les decks des
// adversaires qui les jouent. Lu par scripts/gen-heros-v3.mjs, qui les pose dans characters.data.js.
// La conception (une identite mecanique par adversaire, tiree de sa fiche d'arene) : docs/CARTES-ADVERSAIRES.md.
//
// ⚠ Relancer le generateur REECRIT ces cartes et les decks des 9 adversaires du builder : une retouche faite
// depuis dans le builder serait perdue. Les 5 adversaires provisoires ont leur deck dans game/src/config/ennemis.js.
//
// Paliers : 2/5/10 pour un allie, 3/6/11 pour un sort (GDD, « Anatomie de carte ») — c'est ce qui donne du sens a
// `card_level` dans les profils de progression des adversaires (onglet enemy_progress_profile).

const allyTiers = () => [
  { lvl: 2, stats: { atk: 0, hp: 1 }, text: '+0/+1' },
  { lvl: 5, stats: { atk: 1, hp: 0 }, text: '+1/+0' },
  { lvl: 10, stats: { atk: 1, hp: 2 }, text: '+1/+2' }
];
const spellTiers = () => [{ lvl: 3, amp: 1, text: 'Effet +1' }, { lvl: 6, cost: -1, text: 'coût -1' }, { lvl: 11, amp: 2, text: 'Effet +2' }];
// Un sort sans montant a amplifier : ses paliers baissent son cout.
const spellTiersCout = () => [{ lvl: 6, cost: -1, text: 'coût -1' }];

const C = n => `Characters/${n}.png`;
const ally = o => ({
  id: o.id, name: o.name, type: 'ally', cost: o.cost, keys: o.keys || [], text: o.text,
  play: o.play || [], tiers: o.tiers || allyTiers(), atk: o.atk, hp: o.hp, statics: o.statics || [],
  ...(o.aura ? { aura: o.aura } : {}), ...(o.death ? { death: o.death } : {}),
  ...(o.turnStart ? { turnStart: o.turnStart } : {}), ...(o.turnEnd ? { turnEnd: o.turnEnd } : {}),
  ...(o.gardes ? { gardes: o.gardes } : {}),
  ...Object.fromEntries(Object.entries(o).filter(([k]) => k.startsWith('on_'))),
  sprite: o.sprite
});
const spell = o => ({
  id: o.id, name: o.name, type: 'spell', cost: o.cost, keys: o.keys || [], text: o.text,
  play: o.play, tiers: o.tiers || spellTiers(), statics: [], sprite: o.sprite
});

// Aides d'effets (memes formes que les cartes ecrites par le builder).
const dmg = (t, v) => ({ op: 'dmg', t, v });
const buff = (t, atk, hp, key) => ({ op: 'buff', t, atk, hp, ...(key ? { key } : {}) });
const draw = v => ({ op: 'draw', v });
const armor = v => ({ op: 'armor', v });
const heal = (t, v) => ({ op: 'heal', t, v });
const toxine = (t, v) => ({ op: 'toxine', t, v });
const meuleAdverse = n => ({ op: 'met_a_la_defausse', d_ou: 'pioche', choix: 'precise', carte: '', quoi: 'all', argCard: '', t: 'enemyUnit', qui: 'adversaire', ordre: 'dessus', n });
const renvoieAdverse = () => ({ op: 'renvoie_en_main', d_ou: 'plateau', choix: 'precise', carte: '', quoi: 'all', argCard: '', t: 'enemyUnit', qui: 'toi', ordre: 'hasard', n: 1, fatigue: false, atk: 0, hp: 0 });
const statique = (op, qui, sens, v, extra = {}) => ({ op, qui, ...(sens ? { sens } : {}), v, ...extra });

export const CARTES_ADVERSAIRES = [
  // ------------------------------------------------ Lapin Chapardeur (tutoriel, Aggro Tempo) : « jouer ses cartes et frapper le heros »
  ally({ id: 'adv_lapin_terrier', name: 'Lapin - Terrier', cost: 2, atk: 2, hp: 1, keys: ['type:Lapin'],
    text: 'Râle d’agonie : invoque un Lapereau 1/1.', sprite: C('Rabbit'),
    death: [{ op: 'summon', n: 1, unit: { name: 'Lapereau', atk: 1, hp: 1, keys: ['type:Lapin'], statics: [] } }] }),
  ally({ id: 'adv_lapin_sauteur', name: 'Lapin - Sauteur de haies', cost: 3, atk: 3, hp: 2, keys: ['passe_murailles', 'type:Lapin'],
    text: 'Passe-Murailles.', sprite: C('Rabbit English Lop') }),
  spell({ id: 'adv_lapin_carotte', name: 'Lapin - Carotte volée', cost: 1, keys: ['type:Lapin'],
    text: 'Pioche une carte. Tu auras 1 mana de plus au prochain tour.', sprite: C('Rabbit'),
    tiers: spellTiersCout(), play: [draw(1), { op: 'mana_au_prochain_tour', x: 1 }] }),

  // ------------------------------------------------ Chat de Ruelle (Aggro Turbo) : « tenir une course aux degats »
  ally({ id: 'adv_chat_gouttiere', name: 'Chat - Matou de gouttière', cost: 2, atk: 3, hp: 1, keys: ['Charge', 'type:Chat'],
    text: 'Charge. Quand il attaque, 1 dégât au héros adverse.', sprite: C('Cat Chat de Gouttière'),
    gardes: { on_attack_self: 'moi' }, on_attack_self: [dmg('enemyHero', 1)] }),
  ally({ id: 'adv_chat_caid', name: 'Chat - Caïd du quartier', cost: 4, atk: 3, hp: 3, keys: ['type:Chat'],
    text: 'Les dégâts subis par le héros adverse : 1 de plus.', sprite: C('Cat Ginger'),
    statics: [statique('degats_du_heros', 'adversaire', 'plus', 1)] }),
  spell({ id: 'adv_chat_course', name: 'Chat - Course effrénée', cost: 2, keys: ['type:Chat'],
    text: 'Un allié gagne +2/+0 et Charge. Pioche une carte.', sprite: C('Cat Siamese'),
    play: [buff('allyUnit', 2, 0, 'Charge'), draw(1)] }),

  // ------------------------------------------------ Corbeau Rieur (Aggro MidRange) : « tuer la menace avant qu'elle grandisse »
  ally({ id: 'adv_corbeau_glaneur', name: 'Corbeau - Glaneur', cost: 2, atk: 1, hp: 2, keys: ['type:Oiseau', 'type:Corbeau'],
    text: 'Fin de ton tour : gagne +1/+1.', sprite: C('Crow'),
    turnEnd: [buff('self', 1, 1)] }),
  ally({ id: 'adv_corbeau_nuee', name: 'Corbeau - Nuée', cost: 4, atk: 1, hp: 3, keys: ['type:Oiseau', 'type:Corbeau', 'characteristique_variable:atk:allyUnits::1'],
    text: 'Attaque = le nombre de tes alliés en jeu, +1.', sprite: C('Crow Three Eyes') }),
  spell({ id: 'adv_corbeau_rire', name: 'Corbeau - Rire moqueur', cost: 2, keys: ['type:Oiseau'],
    text: 'Au choix : 3 dégâts à une unité adverse, ou +2/+2 à un allié.', sprite: C('Crow White'),
    play: [{ op: 'choisir', a: [dmg('enemyUnit', 3)], b: [buff('allyUnit', 2, 2)] }] }),

  // ------------------------------------------------ Grand Mechant Loup (boss 1, Controle Soft) : « savoir ne pas tout poser »
  spell({ id: 'adv_loup_hurlement', name: 'Loup - Hurlement', cost: 3, keys: ['type:Loup'],
    text: '2 dégâts à toutes les unités adverses. Gagne 2 d’armure.', sprite: C('Big Bad Wolf'),
    play: [dmg('allEnemyUnits', 2), armor(2)] }),
  ally({ id: 'adv_loup_mere', name: 'Loup - Mère de la meute', cost: 5, atk: 4, hp: 5, keys: ['Taunt', 'type:Loup'],
    text: 'Provocation. Quand l’adversaire joue un allié, 1 dégât à cet allié.', sprite: C('Big Bad Wolf Mythic'),
    on_ally_foe: [dmg('previous', 1)] }),
  ally({ id: 'adv_loup_fourrure', name: 'Loup - Garde à fourrure', cost: 3, atk: 2, hp: 3, keys: ['Taunt', 'Bouclier', 'type:Loup'],
    text: 'Provocation. Bouclier.', sprite: C('Big Bad Wolf') }),
  spell({ id: 'adv_loup_flair', name: 'Loup - Flair', cost: 1, keys: ['type:Loup'],
    text: 'Piste 2 cartes de la main adverse. Pioche une carte.', sprite: C('Big Bad Wolf'),
    tiers: spellTiersCout(), play: [{ op: 'piste', n: 2 }, draw(1)] }),

  // ------------------------------------------------ Crapaud Baveux (Controle Hard) : « quoi echanger contre un Venin »
  spell({ id: 'adv_crapaud_bave', name: 'Crapaud - Bave', cost: 1, keys: ['type:Grenouille'],
    text: 'Pose 2 Toxines sur une unité adverse.', sprite: C('Frog Toad'),
    play: [toxine('enemyUnit', 2)] }),
  ally({ id: 'adv_crapaud_tetard', name: 'Crapaud - Têtard venimeux', cost: 1, atk: 1, hp: 1, keys: ['Venin', 'type:Grenouille'],
    text: 'Venin. Râle d’agonie : pose 1 Toxine sur une unité adverse au hasard.', sprite: C('Frog Venomous'),
    death: [toxine('randomEnemyUnit', 1)] }),
  ally({ id: 'adv_crapaud_roi', name: 'Crapaud - Roi du marais', cost: 4, atk: 3, hp: 4, keys: ['type:Grenouille'],
    text: 'Tes Toxines en posent 1 de plus. Quand une unité adverse qui porte une Toxine meurt, pioche une carte.', sprite: C('Frog'),
    statics: [statique('montant_des_effets', 'toi', 'plus', 1, { cible: 'toxine', zone: 'toutes' })],
    on_unitToxinee_foe: [draw(1)] }),

  // ------------------------------------------------ Pieuvre Pirate (Controle Pillow Fort) : « passer un mur »
  ally({ id: 'adv_pieuvre_ancre', name: 'Pieuvre - Ancre rouillée', cost: 3, atk: 2, hp: 5, keys: ['Taunt', 'type:Pieuvre'],
    text: 'Provocation. Tes autres alliés ont +0/+1.', sprite: C('Octopus Pirate'),
    aura: { scope: 'otherAllies', atk: 0, hp: 1, key: '' } }),
  ally({ id: 'adv_pieuvre_encre', name: 'Pieuvre - Nuage d’encre', cost: 5, atk: 3, hp: 5, keys: ['Taunt', 'type:Pieuvre'],
    text: 'Provocation. L’adversaire n’attaque pas avec plus de 2 unités par tour.', sprite: C('Octopus'),
    statics: [statique('nombre_d_attaques', 'adversaire', null, 2)] }),
  spell({ id: 'adv_pieuvre_tresor', name: 'Pieuvre - Coffre au trésor', cost: 2, keys: ['type:Pieuvre'],
    text: 'Gagne 4 d’armure. Pioche un allié de ton deck.', sprite: C('Octopus Pirate'),
    play: [armor(4), { op: 'pioche_une_carte_de_type', type: 'ally', n: 1 }] }),

  // ------------------------------------------------ Capitaine Grenouille (boss 2, Controle Hard) : « garder de quoi rejouer apres un plateau rase »
  spell({ id: 'adv_capitaine_abordage', name: 'Grenouille - À l’abordage', cost: 3, keys: ['reprise', 'type:Grenouille'],
    text: 'Détruit une unité adverse. Reprise.', sprite: C('Frog Captain'),
    tiers: spellTiersCout(), play: [{ op: 'detruit', t: 'enemyUnit' }] }),
  spell({ id: 'adv_capitaine_canonnade', name: 'Grenouille - Canonnade', cost: 4, keys: ['type:Grenouille'],
    text: '3 dégâts à toutes les unités adverses.', sprite: C('Frog Captain'),
    play: [dmg('allEnemyUnits', 3)] }),
  ally({ id: 'adv_capitaine_quartier', name: 'Grenouille - Quartier-maître', cost: 3, atk: 2, hp: 4, keys: ['type:Grenouille'],
    text: 'Cri de guerre : gagne 2 d’armure. Quand tu lances un sort depuis ta défausse, pioche une carte.', sprite: C('Frog'),
    play: [armor(2)], on_reprise_self: [draw(1)] }),

  // ------------------------------------------------ Renard des Neiges (Aggro Tempo) : « choisir qui bloque »
  spell({ id: 'adv_renard_bourrasque', name: 'Renard - Bourrasque', cost: 2, keys: ['type:Renard'],
    text: 'Renvoie une unité adverse dans la main de son propriétaire.', sprite: C('Fox Snow'),
    tiers: spellTiersCout(), play: [renvoieAdverse()] }),
  ally({ id: 'adv_renard_givre', name: 'Renard - Renard de givre', cost: 3, atk: 3, hp: 2, keys: ['elusif', 'type:Renard'],
    text: 'Élusif. Cri de guerre : une unité adverse perd 2 d’attaque.', sprite: C('Fox Snow'),
    play: [buff('enemyUnit', -2, 0)] }),
  ally({ id: 'adv_renard_traque', name: 'Renard - Meneur de traque', cost: 4, atk: 3, hp: 3, keys: ['Charge', 'type:Renard'],
    text: 'Charge. Quand une de tes unités attaque, elle gagne +1/+0.', sprite: C('Fox Wild'),
    on_attack_self: [buff('previous', 1, 0)] }),

  // ------------------------------------------------ Grand-Duc (boss final, Controle Hard) : « forcer ses reponses »
  spell({ id: 'adv_duc_sentence', name: 'Hibou - Sentence', cost: 5, keys: ['cout_x_de_moins_de_plus:moins:0:enemyUnits:', 'type:Hibou'],
    text: 'Coûte 1 de moins par unité adverse. Détruit une unité adverse.', sprite: C('Owl Great Horned Owl'),
    tiers: spellTiersCout(), play: [{ op: 'detruit', t: 'enemyUnit' }] }),
  ally({ id: 'adv_duc_archiviste', name: 'Hibou - Archiviste', cost: 4, atk: 2, hp: 5, keys: ['type:Oiseau', 'type:Hibou'],
    text: 'Tu pioches 1 carte de plus par tour.', sprite: C('Owl Academic'),
    statics: [statique('pioche_du_tour', 'toi', 'plus', 1)] }),
  ally({ id: 'adv_duc_eclipse', name: 'Hibou - Éclipse', cost: 6, atk: 5, hp: 6, keys: ['type:Oiseau', 'type:Hibou'],
    text: 'L’adversaire a 1 mana de moins par tour.', sprite: C('Owl Cosmonaute'),
    statics: [statique('mana_du_tour', 'adversaire', 'moins', 1)] }),

  // ------------------------------------------------ Paresseux Batisseur (Controle Pillow Fort)
  ally({ id: 'adv_paresseux_hamac', name: 'Paresseux - Hamac', cost: 2, atk: 1, hp: 5, keys: ['Taunt', 'type:Paresseux'],
    text: 'Provocation. Fin de ton tour : soigne 2 PV à ton héros.', sprite: C('Sloth'),
    turnEnd: [heal('ownHero', 2)] }),
  spell({ id: 'adv_paresseux_sieste', name: 'Paresseux - Grande sieste', cost: 3, keys: ['type:Paresseux'],
    text: 'Gagne 5 d’armure. Tes alliés gagnent +0/+2.', sprite: C('Sloth CosmoSloth'),
    play: [armor(5), buff('allAllies', 0, 2)] }),
  ally({ id: 'adv_paresseux_coussin', name: 'Paresseux - Coussin géant', cost: 4, atk: 2, hp: 6, keys: ['Taunt', 'type:Paresseux'],
    text: 'Provocation. Les dégâts subis par ton héros : 1 de moins.', sprite: C('Sloth VolcanoSloth'),
    statics: [statique('degats_du_heros', 'toi', 'moins', 1)] }),

  // ------------------------------------------------ Rouge-Gorge Fou (Aggro Turbo)
  spell({ id: 'adv_rougegorge_pique', name: 'Rouge-Gorge - Piqué', cost: 1, keys: ['reprise', 'type:Oiseau'],
    text: '2 dégâts au héros adverse. Reprise.', sprite: C('Robin'),
    play: [dmg('enemyHero', 2)] }),
  ally({ id: 'adv_rougegorge_chant', name: 'Rouge-Gorge - Chant de l’aube', cost: 2, atk: 2, hp: 1, keys: ['Charge', 'type:Oiseau'],
    text: 'Charge. Quand tu lances un sort, gagne +1/+0.', sprite: C('Robin'),
    on_spell_self: [buff('self', 1, 0)] }),
  ally({ id: 'adv_rougegorge_kamikaze', name: 'Rouge-Gorge - Kamikaze', cost: 1, atk: 2, hp: 1, keys: ['Charge', 'type:Oiseau'],
    text: 'Charge. Râle d’agonie : 1 dégât au héros adverse.', sprite: C('Robin'),
    death: [dmg('enemyHero', 1)] }),

  // ------------------------------------------------ Kitsune Farceur (Combo Turbo)
  spell({ id: 'adv_kitsune_illusion', name: 'Kitsune - Illusion', cost: 2, keys: ['type:Panda'],
    text: 'Crée un Miroir en main. Pioche une carte.', sprite: C('Red Panda Kitsune'),
    tiers: spellTiersCout(), play: [{ op: 'cree', choix: 'precise', carte: 'miroir', quoi: 'all', argCard: '', n: 1, lvl: 1 }, draw(1)] }),
  ally({ id: 'adv_kitsune_metamorphe', name: 'Kitsune - Métamorphe', cost: 3, atk: 2, hp: 2, keys: ['type_tous'],
    text: 'Type : tous. Cri de guerre : devient la copie d’une unité en jeu.', sprite: C('Red Panda'),
    play: [{ op: 'copie', t: 'self', d_ou: 'plateau', choix: 'precise', carte: '', quoi: 'all', argCard: '', tm: 'anyUnit', qui: 'toi', ordre: 'hasard' }] }),
  ally({ id: 'adv_kitsune_queues', name: 'Kitsune - Neuf Queues', cost: 7, atk: 5, hp: 5, keys: ['cout_x_de_moins_de_plus:moins:0:spellsGame:', 'type:Panda'],
    text: 'Coûte 1 de moins par sort joué cette partie. Râle d’agonie : crée 2 sorts au hasard.', sprite: C('Red Panda Kitsune'),
    death: [{ op: 'cree', choix: 'hasard', carte: '', quoi: 'spell', argCard: '', n: 2, lvl: 1 }] }),

  // ------------------------------------------------ Chevre Tetue (Controle Fatigue)
  spell({ id: 'adv_chevre_rumination', name: 'Chèvre - Rumination', cost: 2, keys: ['type:Chèvre'],
    text: 'L’adversaire meule 2 cartes. Gagne 2 d’armure.', sprite: C('Goat'),
    play: [meuleAdverse(2), armor(2)] }),
  ally({ id: 'adv_chevre_bouquetin', name: 'Chèvre - Bouquetin obstiné', cost: 3, atk: 2, hp: 5, keys: ['Taunt', 'ex_libris', 'type:Chèvre'],
    text: 'Provocation. Ex-libris.', sprite: C('Goat') }),
  ally({ id: 'adv_chevre_vieille', name: 'Chèvre - Vieille bique', cost: 5, atk: 3, hp: 6, keys: ['type:Chèvre'],
    text: 'Quand l’adversaire pioche dans la fatigue, il perd 2 PV.', sprite: C('Goat'),
    on_fatigue_foe: [dmg('enemyHero', 2)] }),
  ally({ id: 'adv_chevre_mangetout', name: 'Chèvre - Mange-tout', cost: 2, atk: 2, hp: 3, keys: ['type:Chèvre'],
    text: 'Quand l’adversaire meule une carte, gagne +1/+1.', sprite: C('Goat'),
    on_meule_foe: [buff('self', 1, 1)] }),

  // ------------------------------------------------ Pieuvre Robot (Aggro MidRange, examen)
  ally({ id: 'adv_robot_tentacule', name: 'Pieuvre - Tentacule mécanique', cost: 2, atk: 2, hp: 2, keys: ['type:Pieuvre'],
    text: 'Quand une unité adverse meurt, gagne +1/+1.', sprite: C('Octopus Robot'),
    on_unitDies_foe: [buff('self', 1, 1)] }),
  ally({ id: 'adv_robot_recycleuse', name: 'Pieuvre - Recycleuse', cost: 4, atk: 3, hp: 3, keys: ['type:Pieuvre'],
    text: 'Cri de guerre : Charogne 2 (dévore les 2 dernières cartes de la défausse adverse).', sprite: C('Octopus Robot'),
    play: [{ op: 'charogne', n: 2, t: 'self' }] }),
  spell({ id: 'adv_robot_usine', name: 'Pieuvre - Chaîne de montage', cost: 5, keys: ['type:Pieuvre'],
    text: 'Pose sur le plateau 2 alliés au hasard de ta pioche.', sprite: C('Octopus Robot'),
    tiers: spellTiersCout(), play: [{ op: 'pose_sur_le_plateau', d_ou: 'pioche', choix: 'precise', carte: '', quoi: 'ally', typeDe: 'ecrit', typeQui: 'toi', argCard: '', t: 'enemyUnit', qui: 'toi', ordre: 'hasard', n: 2, fatigue: false, atk: 0, hp: 0 }] })
];

/** Les decks des 9 adversaires du builder (`CHARACTER_DATA.npcs`). Les 5 provisoires : config/ennemis.js. */
export const DECKS_ADVERSAIRES = {
  rabbit1: { grunt1: 4, grunt2: 3, bolt: 3, card_bjidas: 3, adv_lapin_terrier: 3, adv_lapin_sauteur: 2, adv_lapin_carotte: 2 },
  cat1: { grunt2: 2, rush1: 4, bolt: 4, card_i5eghg: 3, wall1: 3, card_ta7prz: 2, adv_chat_gouttiere: 4, adv_chat_caid: 2, adv_chat_course: 3 },
  crow1: { grunt3: 4, bolt: 4, wall1: 3, card_y5uc9s: 4, adv_corbeau_glaneur: 4, adv_corbeau_nuee: 3, adv_corbeau_rire: 3 },
  wolf: { grunt3: 2, wall2: 1, smash: 1, rally: 1, adv_loup_hurlement: 1, adv_loup_mere: 1, adv_loup_fourrure: 2, adv_loup_flair: 1 },
  frog1: { venomite: 2, grunt3: 1, card_urlyni: 1, adv_crapaud_bave: 2, adv_crapaud_tetard: 2, adv_crapaud_roi: 1 },
  octo1: { grunt3: 2, grunt4: 2, smash: 2, wall1: 1, adv_pieuvre_ancre: 2, adv_pieuvre_encre: 1, adv_pieuvre_tresor: 2 },
  frogboss: { venomite: 3, wall2: 3, grunt4: 3, smash: 2, rally: 2, potion: 1, card_viekke: 1, card_winkd1: 1, adv_capitaine_abordage: 2, adv_capitaine_canonnade: 1, adv_capitaine_quartier: 2 },
  fox1: { rush1: 3, grunt4: 2, smash: 2, grunt3: 2, adv_renard_bourrasque: 2, adv_renard_givre: 2, adv_renard_traque: 2 },
  owlboss: { wall2: 4, grunt4: 4, smash: 3, rally: 2, potion: 2, card_viekke: 3, card_4vap0r: 1, adv_duc_sentence: 2, adv_duc_archiviste: 2, adv_duc_eclipse: 1 }
};
