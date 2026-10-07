// Paliers de niveau des six heros V2 — la « grammaire des paliers » appliquee carte par carte.
// Voir docs/GRAMMAIRE-DES-PALIERS.md pour les regles. En resume :
//   * Eveil (niv. 2-5)   : un petit geste net (un peu de chiffre, un mot-cle).
//   * Verbe (niv. 6-10)  : la carte fait QUELQUE CHOSE de nouveau (un moment de plus, un effet de plus).
//   * Pivot (niv. 11-15) : elle change de role (aura, statique, portee elargie, lien avec une autre espece).
//   * Sommet (niv. 17-20): une regle brisee, un par niveau, sur la moitie des cartes.
//   * Chaque niveau de 2 a 20 change au moins une carte du heros ; jamais plus de deux a la fois.
//   * Une carte n'a qu'un palier purement numerique (stats / effet+ / cout) : le chiffre accompagne le verbe.
//
// `fabrique(ctx)` recoit les jetons deja definis dans v2.mjs et rend :
//   TIERS  : id de carte -> liste de paliers
//   GARDES : id de carte -> gardes a poser pour qu'un moment ajoute par un palier ecoute le bon sujet
//   REFONTE: id de carte -> champs remplaces sur la carte de base (un « Choisir » a debloquer)
export function fabrique({ cub, kitten, tad, tok, cnt, LVL, ALL, OWL, WOLF }) {
  // ---------------------------------------------------------------- constructeurs de paliers
  const st = (lvl, atk, hp) => ({ lvl, stats: { atk, hp }, text: `+${atk}/+${hp}` });
  const amp = (lvl, n = 1) => ({ lvl, amp: n, text: `Effet +${n}` });
  const cost = lvl => ({ lvl, cost: -1, text: 'Coût -1' });
  const key = (lvl, k, text) => ({ lvl, key: k, text });
  const ex = (lvl, effect, text, slot) => ({ lvl, extra: effect, ...(slot ? { slot } : {}), text });
  const aura = (lvl, a, text) => ({ lvl, aura: { key: '', atk: 0, hp: 0, ...a }, text });
  const sta = (lvl, statique, text) => ({ lvl, statique, text });
  const both = (lvl, text = 'Les deux choix partent.') => ({ lvl, lesDeux: true, text });

  // ---------------------------------------------------------------- effets recurrents
  const dmgH = v => ({ op: 'dmg', t: 'enemyHero', v });
  const dmgRU = v => ({ op: 'dmg', t: 'randomEnemyUnit', v });
  const dmgRA = v => ({ op: 'dmg', t: 'randomEnemyAny', v });
  const buffSelf = (atk, hp) => ({ op: 'buff', t: 'self', atk, hp });
  const buffAll = (atk, hp, k) => ({ op: 'buff', t: 'allAllies', atk, hp, ...(k ? { key: k } : {}) });
  const buffType = (type, atk, hp, k) => ({ op: 'buff', t: 'allyType:' + type, atk, hp, ...(k ? { key: k } : {}) });
  const buffPrev = (atk, hp, k) => ({ op: 'buff', t: 'previous', atk, hp, ...(k ? { key: k } : {}) });
  const draw = v => ({ op: 'draw', v });
  const armor = v => ({ op: 'armor', v });
  const heal = v => ({ op: 'heal', t: 'ownHero', v });
  const mana1 = { op: 'mana_au_prochain_tour', x: 1 };
  const summon = (n, unit) => ({ op: 'summon', n, unit });
  const cree = carte => ({ op: 'cree', choix: 'precise', carte, quoi: 'all', argCard: '', n: 1, lvl: LVL });
  const pump = (atk, hp, d_ou = 'main', n = 8) => ({ op: 'renforce_les_cartes', d_ou, qui: 'toi', quoi: 'all', argCard: '', ordre: 'hasard', n, atk, hp });
  const reduitSorts = { op: 'reduit_le_cout_de', quoi: 'spell', typeDe: 'ecrit', argType: '', typeQui: 'toi', argKey: '', argCard: '', v: 1 };
  const nbChiens = cnt('alliesOfType', 'Chien');
  const main = cnt('handCards');
  const tours = cnt('ownTurns');

  // Un palier nomme parfois une espece : le lien entre deux decks.
  const TIERS = {
    // =================================================================== CROC (chien 2) — la meute qui charge
    dog2_cub: [
      st(2, 0, 1),
      ex(8, dmgH(1), 'Râle d’agonie : inflige 1 dégât au héros adverse.', 'death'),
      ex(14, cree('dog2_cub'), 'Râle d’agonie : revient dans ta main.', 'death')
    ],
    dog2_hunt: [
      amp(3),
      ex(10, dmgH(2), 'Inflige aussi 2 dégâts au héros adverse.'),
      ex(12, buffType('Chien', 1, 0), 'Tes Chiens gagnent aussi +1/+0.')
    ],
    dog2_beater: [
      amp(4),
      ex(7, dmgH(1), 'Quand tu perds une unité, inflige 1 dégât au héros adverse.', 'on_unitDies_self'),
      aura(15, { scope: 'sameTypeAllies', atk: 1 }, 'Aura : tes autres Chiens ont +1/+0.')
    ],
    dog2_pack: [
      cost(5),
      ex(9, summon(1, cub), 'Invoque un Louveteau de plus.'),
      ex(13, summon(1, tok('Louveteau Alpha', 3, 2, ['Charge', ...WOLF])), 'Invoque aussi un Louveteau Alpha 3/2 Charge.'),
      ex(20, buffType('Chien', 2, 2), 'Tes Chiens gagnent +2/+2.')
    ],
    dog2_alpha: [
      st(6, 1, 1),
      ex(11, summon(2, cub), 'Râle d’agonie : invoque deux Louveteaux.', 'death'),
      ex(16, buffType('Chat', 1, 0), 'Cri de guerre : tes Chats gagnent aussi +1/+0.'),
      aura(18, { scope: 'sameTypeAllies', key: 'Charge' }, 'Aura : tes autres Chiens ont Charge.')
    ],
    dog2_kami: [
      amp(4),
      key(10, 'passe_murailles', 'Gagne Passe-Murailles.'),
      ex(16, dmgRU(2), 'Râle d’agonie : inflige aussi 2 dégâts à une unité adverse au hasard.', 'death')
    ],
    dog2_curee: [
      amp(5),
      ex(7, dmgRU(1), 'Inflige aussi 1 dégât à une unité adverse au hasard.'),
      both(14, 'Les deux choix partent : dégâts ET renfort.')
    ],
    dog2_queen: [
      st(6, 0, 2),
      key(9, 'elusif', 'Gagne Élusif.'),
      ex(12, draw(1), 'Quand tu perds une unité, pioche une carte.', 'on_unitDies_self'),
      aura(19, { scope: 'sameTypeAllies', atk: 1, hp: 1 }, 'Aura : tes autres Chiens ont +1/+1.')
    ],
    dog2_feast: [
      amp(2),
      ex(11, summon(1, cub), 'Invoque aussi un Louveteau.'),
      ex(15, heal(4), 'Soigne aussi ton héros de 4.')
    ],
    dog2_moon: [
      amp(3),
      ex(13, dmgH(nbChiens), 'Inflige aussi 1 dégât au héros adverse par Chien que tu contrôles.'),
      ex(17, draw(2), 'Pioche aussi deux cartes.')
    ],

    // =================================================================== MISTIGRI (chat 2) — le maraudeur
    cat2_kit: [
      st(3, 0, 1),
      key(9, 'elusif', 'Gagne Élusif.'),
      ex(15, buffSelf(1, 0), 'Quand tu joues un Chat, gagne +1/+0.', 'on_ally_self')
    ],
    cat2_stray: [
      st(4, 0, 1),
      key(11, 'passe_murailles', 'Gagne Passe-Murailles.'),
      ex(13, cree('cat_pounce'), 'Râle d’agonie : crée aussi une Foudre dans ta main.', 'death')
    ],
    cat2_sneak: [
      amp(5),
      ex(8, draw(1), 'Pioche aussi une carte.'),
      ex(16, buffType('Chat', 1, 0), 'Tes Chats gagnent aussi +1/+0.')
    ],
    cat2_burglar: [
      st(6, 1, 0),
      ex(10, draw(1), 'Quand il attaque, pioche une carte.', 'on_attack_self'),
      sta(14, { op: 'cout_des_cartes', qui: 'toi', quoi: 'spell', argCard: '', sens: 'moins', v: 1 }, 'Tes sorts coûtent 1 de moins.')
    ],
    cat2_lord: [
      st(2, 1, 1),
      ex(12, summon(2, kitten), 'Râle d’agonie : invoque deux Chatons.', 'death'),
      sta(17, { op: 'montant_des_effets', qui: 'toi', cible: 'dmg', sens: 'plus', v: 1 }, 'Tes dégâts infligent 1 de plus.')
    ],
    cat2_ghost: [
      st(5, 0, 1),
      ex(11, draw(1), 'Râle d’agonie : pioche une carte.', 'death'),
      key(12, 'Charge', 'Gagne Charge.')
    ],
    cat2_matriarch: [
      st(6, 0, 2),
      ex(8, draw(1), 'Quand tu perds une unité, pioche une carte.', 'on_unitDies_self'),
      ex(15, buffType('Chat', 1, 0), 'Quand tu perds une unité, tes Chats gagnent +1/+0.', 'on_unitDies_self'),
      ex(19, dmgH(2), 'Quand tu perds une unité, inflige 2 dégâts au héros adverse.', 'on_unitDies_self')
    ],
    cat2_yowl: [
      amp(2),
      ex(10, summon(1, kitten), 'Invoque aussi un Chaton.'),
      ex(13, mana1, 'Gagne 1 mana au prochain tour.'),
      ex(18, buffType('Chat', 0, 0, 'Charge'), 'Tes Chats gagnent aussi Charge.')
    ],
    cat2_pick: [
      st(3, 0, 1),
      ex(7, draw(1), 'Râle d’agonie : pioche une carte.', 'death'),
      ex(16, cree('cat_pounce'), 'Cri de guerre : crée une Foudre dans ta main.')
    ],
    cat2_roof: [
      amp(4),
      aura(9, { scope: 'sameTypeAllies', hp: 1 }, 'Aura : tes autres Chats ont +0/+1 de plus.'),
      ex(14, buffSelf(1, 1), 'Quand tu lances un sort, gagne +1/+1.', 'on_spell_self'),
      ex(20, draw(1), 'Quand tu lances un sort, pioche une carte.', 'on_spell_self')
    ],

    // =================================================================== SIROCCO (corbeau 2) — la main pleine
    crow2_eaglet: [
      st(4, 0, 1),
      ex(10, pump(0, 1), 'Cri de guerre : les cartes de ta main gagnent aussi +0/+1.'),
      ex(16, pump(1, 0), 'Râle d’agonie : les cartes de ta main gagnent +1/+0.', 'death'),
      ex(18, draw(1), 'Cri de guerre : pioche une carte.')
    ],
    crow2_dive: [
      amp(5),
      ex(7, draw(1), 'Pioche aussi une carte.'),
      ex(14, dmgH(main), 'Inflige aussi X dégâts au héros adverse (X = cartes en main).')
    ],
    crow2_hawk: [
      key(6, 'Charge', 'Gagne Charge.'),
      ex(9, buffSelf(0, 1), 'Quand tu pioches une carte, gagne +0/+1.', 'on_draw_self'),
      ex(12, draw(1), 'Quand il attaque, pioche une carte.', 'on_attack_self')
    ],
    crow2_gust: [
      cost(2),
      ex(11, pump(1, 0), 'Les cartes de ta main gagnent aussi +1/+0.'),
      ex(15, draw(1), 'Pioche aussi une carte.')
    ],
    crow2_roc: [
      amp(3),
      ex(13, draw(1), 'Quand il attaque, pioche une carte.', 'on_attack_self'),
      sta(17, { op: 'pioche_du_tour', qui: 'toi', sens: 'plus', v: 1 }, 'Tu pioches une carte de plus par tour.')
    ],
    crow2_sparrow: [
      st(6, 1, 0),
      ex(7, draw(1), 'Râle d’agonie : pioche une carte.', 'death'),
      ex(13, pump(1, 0), 'Cri de guerre : les cartes de ta main gagnent +1/+0.')
    ],
    crow2_dart: [
      amp(2),
      ex(9, draw(1), 'Pioche aussi une carte.'),
      ex(16, dmgH(2), 'Inflige aussi 2 dégâts au héros adverse.')
    ],
    crow2_robin: [
      st(3, 0, 1),
      ex(11, dmgRA(1), 'Quand tu pioches une carte, inflige 1 dégât à un ennemi au hasard.', 'on_draw_self'),
      ex(14, draw(1), 'Râle d’agonie : pioche une carte.', 'death')
    ],
    crow2_cry: [
      ex(4, pump(1, 1), 'Les cartes de ta main gagnent +1/+1 de plus.'),
      ex(8, mana1, 'Gagne 1 mana au prochain tour.'),
      ex(12, draw(1), 'Pioche aussi une carte.'),
      ex(19, pump(1, 1, 'pioche', 15), 'Les cartes de ta pioche gagnent +1/+1.')
    ],
    crow2_storm: [
      st(5, 1, 0),
      ex(15, dmgH(1), 'Quand il attaque, inflige 1 dégât au héros adverse.', 'on_attack_self'),
      ex(20, dmgH(main), 'Râle d’agonie : inflige X dégâts au héros adverse (X = cartes en main).', 'death')
    ],

    // =================================================================== REINETTE (grenouille 2) — le marais qui grossit
    frog2_spawn: [
      cost(5),
      ex(11, summon(1, tad), 'Invoque un Têtard de plus.'),
      ex(12, buffType('Têtard', 1, 1), 'Tes Têtards gagnent +1/+1.'),
      ex(17, buffAll(1, 1), 'Tous tes alliés gagnent +1/+1.')
    ],
    frog2_croak: [
      st(6, 0, 1),
      ex(8, buffSelf(0, 1), 'Début de ton tour : gagne +0/+1 (donc 2 dégâts au héros adverse).', 'turnStart'),
      ex(15, dmgRA(1), 'Quand cette unité reçoit du renfort, inflige aussi 1 dégât à un ennemi au hasard.', 'on_renfort_self')
    ],
    frog2_bull: [
      st(2, 0, 2),
      ex(10, heal(2), 'Quand cette unité reçoit du renfort, soigne ton héros de 2.', 'on_renfort_self'),
      ex(13, buffAll(1, 1), 'Râle d’agonie : tes alliés gagnent +1/+1.', 'death')
    ],
    frog2_rain: [
      amp(3),
      ex(7, heal(3), 'Soigne aussi ton héros de 3.'),
      ex(16, cree('frog_tad'), 'Crée aussi un Têtard dans ta main.')
    ],
    frog2_elder: [
      st(4, 0, 2),
      ex(9, summon(1, tad), 'Début de ton tour : invoque aussi un Têtard.', 'turnStart'),
      ex(14, buffType('Têtard', 1, 1), 'Début de ton tour : tes Têtards gagnent +1/+1.', 'turnStart'),
      sta(18, { op: 'montant_des_effets', qui: 'toi', cible: 'buff', sens: 'plus', v: 1 }, 'Tes renforts donnent 1 de plus.')
    ],
    frog2_pond: [
      st(2, 0, 2),
      ex(8, armor(1), 'Début de ton tour : gagne aussi 1 armure.', 'turnStart'),
      ex(14, summon(1, tad), 'Début de ton tour : invoque un Têtard de plus.', 'turnStart'),
      ex(19, buffAll(0, 1), 'Début de ton tour : tes alliés gagnent +0/+1.', 'turnStart')
    ],
    frog2_mud: [
      amp(3),
      ex(10, summon(1, tad), 'Invoque aussi un Têtard.'),
      ex(12, draw(1), 'Pioche aussi une carte.')
    ],
    frog2_queen: [
      st(4, 1, 1),
      ex(7, cree('frog_tad'), 'Râle d’agonie : crée un Têtard dans ta main.', 'death'),
      ex(15, cree('frog_tad'), 'Cri de guerre : crée un Têtard dans ta main.')
    ],
    frog2_leaper: [
      amp(5),
      ex(9, buffSelf(1, 0), 'Fin de ton tour : gagne +1/+0 (donc 2 dégâts à un ennemi au hasard).', 'turnEnd'),
      key(13, 'elusif', 'Gagne Élusif.')
    ],
    frog2_king: [
      st(6, 1, 1),
      ex(16, buffSelf(1, 1), 'Début de ton tour : gagne +1/+1 (donc tes alliés aussi).', 'turnStart'),
      ex(20, summon(3, tad), 'Cri de guerre : invoque trois Têtards.')
    ],

    // =================================================================== MORPHEE (hibou 2) — le temps joue pour elle
    owl2_nest: [
      st(6, 0, 2),
      ex(7, buffSelf(0, 1), 'Fin de ton tour : gagne aussi +0/+1.', 'turnEnd'),
      sta(13, { op: 'degats_du_heros', qui: 'toi', sens: 'moins', v: 1 }, 'Les dégâts subis par ton héros sont réduits de 1.')
    ],
    owl2_sand: [
      amp(2),
      ex(9, heal(tours), 'Soigne aussi ton héros d’autant.'),
      ex(16, draw(1), 'Pioche aussi une carte.')
    ],
    owl2_watch: [
      cost(3),
      ex(11, heal(2), 'Début de ton tour : soigne ton héros de 2.', 'turnStart'),
      ex(14, dmgRA(tours), 'Râle d’agonie : inflige X dégâts à un ennemi au hasard (X = tes tours).', 'death'),
      sta(18, { op: 'mana_du_tour', qui: 'toi', sens: 'plus', v: 1 }, 'Tu as 1 mana de plus par tour.')
    ],
    owl2_lull: [
      st(4, 0, 2),
      key(8, 'Taunt', 'Gagne Provocation.'),
      sta(12, { op: 'cout_des_cartes', qui: 'adversaire', quoi: 'all', argCard: '', sens: 'plus', v: 1 }, 'Les cartes adverses coûtent encore 1 de plus.')
    ],
    owl2_elder: [
      amp(5),
      ex(15, armor(2), 'Début de ton tour : gagne aussi 2 armures.', 'turnStart'),
      ex(20, dmgH(2), 'Début de ton tour : inflige aussi 2 dégâts au héros adverse.', 'turnStart')
    ],
    owl2_egg: [
      st(3, 0, 1),
      ex(9, armor(1), 'Fin de ton tour : ton héros gagne 1 armure.', 'turnEnd'),
      ex(15, summon(1, tok('Hibou', 3, 3, ['Taunt', ...OWL])), 'Râle d’agonie : l’œuf éclot — invoque un Hibou 3/3 Provocation.', 'death')
    ],
    owl2_dream: [
      cost(4),
      ex(11, armor(3), 'Gagne aussi 3 armures.'),
      both(13, 'Les deux choix partent : pioche ET mana.')
    ],
    owl2_clock: [
      st(5, 0, 2),
      ex(8, armor(1), 'Fin de ton tour : ton héros gagne aussi 1 armure.', 'turnEnd'),
      ex(16, dmgRA(1), 'Fin de ton tour : inflige aussi 1 dégât à un ennemi au hasard.', 'turnEnd'),
      sta(19, { op: 'cartes_jouees_remelangees', qui: 'toi', quoi: 'sorts', sens: 'plus', v: 1 }, 'Les sorts que tu joues retournent dans ta pioche.')
    ],
    owl2_pillow: [
      st(6, 0, 2),
      ex(10, heal(2), 'Fin de ton tour : soigne ton héros de 2.', 'turnEnd'),
      sta(14, { op: 'degats_du_heros', qui: 'toi', sens: 'moins', v: 1 }, 'Les dégâts subis par ton héros sont encore réduits de 1.'),
      ex(17, armor(8), 'Cri de guerre : ton héros gagne 8 armures.')
    ],
    owl2_midnight: [
      amp(2),
      ex(7, draw(1), 'Pioche aussi une carte.'),
      ex(12, heal(6), 'Soigne aussi ton héros de 6.')
    ],

    // =================================================================== MIRAGE (caméléon 2) — le type qu'il te faut
    cam2_prism: [
      st(2, 0, 1),
      ex(8, buffPrev(1, 1), 'Cri de guerre : l’allié choisi gagne aussi +1/+1.'),
      ex(14, buffAll(0, 0, 'type_tous'), 'Râle d’agonie : tes alliés gagnent Type : tous.', 'death'),
      ex(17, draw(1), 'Cri de guerre : pioche une carte.')
    ],
    cam2_mirror: [
      cost(3),
      ex(10, buffPrev(2, 2), 'L’unité copiée gagne +2/+2.'),
      ex(12, draw(1), 'Pioche aussi une carte.')
    ],
    cam2_choir: [
      st(4, 0, 2),
      aura(7, { scope: 'sameTypeAllies', key: 'passe_murailles' }, 'Aura : tes autres alliés ont Passe-Murailles.'),
      aura(15, { scope: 'sameTypeAllies', atk: 1, hp: 1 }, 'Aura : tes autres alliés ont +1/+1 de plus.')
    ],
    cam2_shed: [
      cost(5),
      ex(9, draw(1), 'Pioche aussi une carte.'),
      ex(13, reduitSorts, 'Tes sorts en main coûtent aussi 1 de moins.')
    ],
    cam2_ball: [
      amp(6),
      ex(11, summon(1, tok('Double', 2, 2, ALL)), 'Invoque aussi un Double 2/2 Type : tous.'),
      ex(16, draw(2), 'Pioche aussi deux cartes.'),
      ex(18, buffAll(1, 1), 'Tous tes alliés gagnent +1/+1 de plus.')
    ],
    cam2_bud: [
      st(4, 0, 1),
      ex(10, buffSelf(0, 1), 'Début de ton tour : gagne aussi +0/+1.', 'turnStart'),
      ex(16, summon(1, tok('Double', 2, 2, ALL)), 'Râle d’agonie : invoque un Double 2/2 Type : tous.', 'death')
    ],
    cam2_double: [
      cost(5),
      ex(7, summon(1, tok('Double', 2, 2, ALL)), 'Invoque un Double de plus.'),
      ex(14, draw(1), 'Pioche aussi une carte.'),
      ex(19, summon(2, tok('Double', 2, 2, ALL)), 'Invoque deux Doubles de plus.')
    ],
    cam2_veil: [
      amp(6),
      ex(9, buffPrev(0, 0, 'type_tous'), 'L’allié gagne aussi Type : tous.'),
      ex(12, armor(3), 'Ton héros gagne aussi 3 armures.')
    ],
    cam2_mime: [
      st(2, 0, 2),
      ex(11, heal(1), 'Quand tu joues un allié, soigne ton héros de 1.', 'on_ally_self'),
      ex(15, armor(1), 'Quand tu joues un allié, ton héros gagne 1 armure.', 'on_ally_self')
    ],
    cam2_chimera: [
      st(3, 1, 1),
      aura(8, { scope: 'enemyUnits', atk: -1 }, 'Aura : les unités adverses ont -1/-0 de plus.'),
      ex(13, dmgRA(1), 'Début de ton tour : inflige 1 dégât à un ennemi au hasard.', 'turnStart'),
      sta(20, { op: 'cout_des_cartes', qui: 'adversaire', quoi: 'all', argCard: '', sens: 'plus', v: 1 }, 'Les cartes adverses coûtent 1 de plus.')
    ]
  };

  // Gardes a poser d'avance : un moment ajoute par un palier ne dit pas lui-meme QUI il ecoute.
  const GARDES = {
    cat2_kit: { on_ally_self: 'type:Chat' },
    cat2_burglar: { on_attack_self: 'moi' },
    crow2_hawk: { on_attack_self: 'moi' },
    crow2_roc: { on_attack_self: 'moi' },
    crow2_storm: { on_attack_self: 'moi' }
  };

  // Deux sorts deviennent un vrai « Choisir » : le palier « Choisit les deux » rend alors son sens a leur mastery.
  const REFONTE = {
    dog2_curee: {
      text: 'Choisis : inflige au héros adverse 1 dégât par Chien que tu contrôles, +1 — OU tes Chiens gagnent +1/+1.',
      play: [{
        op: 'choisir',
        a: [{ op: 'dmg', t: 'enemyHero', v: cnt('alliesOfType', 'Chien', 1) }],
        b: [{ op: 'buff', t: 'allyType:Chien', atk: 1, hp: 1 }]
      }]
    },
    owl2_dream: {
      text: 'Choisis : pioche une carte — OU gagne 3 mana au prochain tour.',
      play: [{
        op: 'choisir',
        a: [{ op: 'draw', v: 1 }],
        b: [{ op: 'mana_au_prochain_tour', x: 3 }]
      }]
    }
  };

  return { TIERS, GARDES, REFONTE };
}
