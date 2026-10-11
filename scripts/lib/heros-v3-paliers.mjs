// Paliers de niveau des six heros V3 — la « grammaire des paliers » appliquee carte par carte.
// La SOURCE est docs/V3-HEROS.md, section 2 : chaque tableau « paliers:<Heros> » y est recopie ici,
// niveau par niveau, et le calendrier (Eveil 2-6, Verbe 7-11, Pivot 12-16, quatre sommets 17-20)
// y est deja verifie. Voir aussi docs/GRAMMAIRE-DES-PALIERS.md.
//
// `fabrique(ctx)` recoit les jetons et les aides deja definis dans gen-heros-v3.mjs et rend :
//   TIERS  : id de carte -> liste de paliers
//   GARDES : id de carte -> gardes a poser pour qu'un moment ajoute par un palier ecoute le bon sujet
//
// ⚠ Plusieurs paliers parlent de mecaniques PAS ENCORE CODEES (Pistage, Charogne, Appat, Toxine,
// Ex-libris, Registre) : elles sont declarees dans `customMechanics` (effets, mot-cle) ou dans le
// registre avec `implemented: false` (moments, statiques, compteurs, filtres). Voir V3-HEROS.md.
// Un moment n'a de garde que si son evenement a un SUJET : « quand une unite adverse qui porte une
// Toxine meurt » est donc son propre evenement (`unitToxinee`), et non une garde sur `unitDies`.
export function fabrique({ tok, cnt, LVL, chat, tetard }) {
  // ---------------------------------------------------------------- constructeurs de paliers
  const st = (lvl, atk, hp) => ({ lvl, stats: { atk, hp }, text: `+${atk}/+${hp}` });
  const amp = (lvl, n = 1) => ({ lvl, amp: n, text: `Effet +${n}` });
  const cost = lvl => ({ lvl, cost: -1, text: 'Coût -1' });
  const key = (lvl, k, text) => ({ lvl, key: k, text });
  const ex = (lvl, effect, text, slot) => ({ lvl, extra: effect, ...(slot ? { slot } : {}), text });
  const aura = (lvl, a, text) => ({ lvl, aura: { key: '', atk: 0, hp: 0, ...a }, text });
  const sta = (lvl, statique, text) => ({ lvl, statique, text });

  // ---------------------------------------------------------------- effets recurrents
  const dmgH = v => ({ op: 'dmg', t: 'enemyHero', v });
  const dmgRU = v => ({ op: 'dmg', t: 'randomEnemyUnit', v });
  const dmgRA = v => ({ op: 'dmg', t: 'randomEnemyAny', v });
  const buffSelf = (atk, hp) => ({ op: 'buff', t: 'self', atk, hp });
  const buffAll = (atk, hp, k) => ({ op: 'buff', t: 'allAllies', atk, hp, ...(k ? { key: k } : {}) });
  const buffType = (type, atk, hp, k) => ({ op: 'buff', t: 'allyType:' + type, atk, hp, ...(k ? { key: k } : {}) });
  const buffRand = (atk, hp) => ({ op: 'buff', t: 'randomAllyUnit', atk, hp });
  const buffAlly = (atk, hp, k) => ({ op: 'buff', t: 'allyUnit', atk, hp, ...(k ? { key: k } : {}) });
  const buffLui = (atk, hp) => ({ op: 'buff', t: 'previousType', atk, hp });
  const draw = v => ({ op: 'draw', v });
  const armor = v => ({ op: 'armor', v });
  const heal = v => ({ op: 'heal', t: 'ownHero', v });
  const mana1 = { op: 'mana_au_prochain_tour', x: 1 };
  const summon = (n, unit) => ({ op: 'summon', n, unit });
  const detruit = t => ({ op: 'detruit', t });
  const nPistees = cnt('cartesPistees');
  const nTypes = cnt('typesRegistre');

  // Les paquets : meule (du dessus de la pioche), defausse (de la main), reprise (de la defausse).
  const meule = n => ({ op: 'met_a_la_defausse', d_ou: 'pioche', choix: 'precise', carte: '', quoi: 'all', argCard: '', t: 'enemyUnit', qui: 'toi', ordre: 'dessus', n });
  const defausse = (qui = 'toi', quoi = 'all') => ({ op: 'met_a_la_defausse', d_ou: 'main', choix: 'precise', carte: '', quoi, argCard: '', t: 'enemyUnit', qui, ordre: 'hasard', n: 1 });
  const reprend = () => ({ op: 'renvoie_en_main', d_ou: 'defausse', choix: 'precise', carte: '', quoi: 'spell', argCard: '', t: 'enemyUnit', qui: 'toi', ordre: 'hasard', n: 1, fatigue: false, atk: 0, hp: 0 });
  const pumpMain = (atk, hp) => ({ op: 'renforce_les_cartes', d_ou: 'main', qui: 'toi', quoi: 'all', argCard: '', ordre: 'hasard', n: 99, atk, hp });
  const pumpSujet = (atk, hp) => ({ op: 'renforce_les_cartes', d_ou: 'main', qui: 'toi', quoi: 'sujet', argCard: '', ordre: 'hasard', n: 1, atk, hp });
  const reduitUnSort = { op: 'reduit_le_cout_de', quoi: 'spell', typeDe: 'ecrit', argType: '', typeQui: 'toi', argKey: '', argCard: '', v: 1, n: 1 };
  const reduitTout = { op: 'reduit_le_cout_de', quoi: 'all', typeDe: 'ecrit', argType: '', typeQui: 'toi', argKey: '', argCard: '', v: 1, n: 0 };

  // Les mecaniques inventees (customMechanics) — pas encore codees.
  const piste = n => ({ op: 'piste', n });
  const charogne = (n, t = 'self') => ({ op: 'charogne', n, t });
  const toxine = (t, v) => ({ op: 'toxine', t, v });
  const enregistre = n => ({ op: 'enregistre', n });
  const typeDuRegistre = (t, quoi) => ({ op: 'donne_type_du_registre', t, quoi });
  const relance = (mode, n = 1) => ({ op: 'relance_registre', mode, n });
  // Ex-libris (V3, 4.5) a reutilise le registre : « renforce les cartes » de la zone fatigue (toutes, `n: 99`)
  // et « cree » avec la source fatigue — aucun effet inventé.
  const creeDeLaFatigue = (atk, hp) => ({ op: 'cree', choix: 'fatigue', n: 1, atk, hp });
  const renforceLaFatigue = (atk, hp) => ({ op: 'renforce_les_cartes', d_ou: 'fatigue', qui: 'toi', quoi: 'all', ordre: 'hasard', n: 99, atk, hp });

  const TIERS = {
    // =================================================================== PATOU (chien 3) — le berger
    dog3_herd: [
      st(2, 0, 1),
      ex(7, piste(1), 'Râle d’agonie : piste une carte.', 'death'),
      ex(12, draw(1), 'Quand l’adversaire joue une carte pistée, pioche une carte.', 'on_pistee_foe'),
      sta(18, { op: 'pistage_a_la_pioche', qui: 'adversaire', sens: 'plus', v: 1 }, 'Statique : les cartes que l’adversaire pioche sont pistées.')
    ],
    dog3_shepherd: [
      st(3, 1, 0),
      ex(8, piste(1), 'Fin de ton tour : piste une carte.', 'turnEnd'),
      aura(13, { scope: 'sameTypeAllies', hp: 1 }, 'Aura : tes autres Chiens ont +0/+1.'),
      sta(20, { op: 'limite_de_cartes_jouees', qui: 'adversaire', v: 1 }, 'Statique : l’adversaire ne peut jouer qu’une carte par tour.')
    ],
    dog3_train: [
      amp(4),
      ex(9, draw(1), 'Pioche aussi une carte.'),
      ex(15, dmgH(nPistees), 'Inflige aussi X dégâts au héros adverse.')
    ],
    dog3_patou: [
      st(5, 0, 1),
      ex(10, armor(2), 'Fin de ton tour : ton héros gagne 2 d’armure.', 'turnEnd'),
      aura(16, { scope: 'enemyUnits', atk: -1 }, 'Aura : les unités adverses ont -1/-0.'),
      ex(17, detruit('randomEnemyUnit'), 'Quand l’adversaire joue une carte pistée, détruis une de ses unités.', 'on_pistee_foe')
    ],
    dog3_hunt: [
      cost(6),
      ex(11, draw(1), 'Pioche aussi une carte.'),
      ex(14, piste(99), 'Piste aussi toute la main adverse.')
    ],
    dog3_pup: [
      st(2, 0, 1),
      ex(9, heal(3), 'Quand l’adversaire joue une carte pistée, tu gagnes aussi 3 PV.', 'on_pistee_foe'),
      aura(13, { scope: 'sameTypeAllies', atk: 1 }, 'Aura : tes autres Chiens ont +1/+0.'),
      ex(19, draw(1), 'Quand l’adversaire joue une carte pistée, pioche une carte.', 'on_pistee_foe')
    ],
    dog3_muzzle: [
      cost(3),
      ex(7, dmgH(2), 'L’adversaire perd aussi 2 PV.'),
      ex(15, defausse('adversaire'), 'Il défausse aussi une carte au hasard.')
    ],
    dog3_rott: [
      st(4, 1, 0),
      ex(10, dmgRU(2), 'Râle d’agonie : 2 dégâts à une unité adverse au hasard.', 'death'),
      sta(16, { op: 'nombre_d_attaques', qui: 'adversaire', v: 2 }, 'Statique : l’adversaire n’attaque qu’avec 2 unités par tour.')
    ],
    dog3_beat: [
      cost(5),
      ex(8, dmgRU(nPistees), 'Inflige aussi 1 dégât à une unité adverse au hasard par carte pistée.'),
      ex(14, defausse('adversaire', 'pistee'), 'L’adversaire défausse aussi une carte pistée.')
    ],
    dog3_elder: [
      st(6, 0, 1),
      ex(11, dmgH(nPistees), 'Fin de ton tour : 1 dégât au héros adverse par carte pistée.', 'turnEnd'),
      ex(12, dmgH(3), 'Quand l’adversaire joue une carte pistée, il perd 3 PV.', 'on_pistee_foe')
    ],

    // =================================================================== MELUSINE (chat 3) — la sorciere
    cat3_spark: [
      amp(2),
      ex(7, dmgH(1), 'Inflige aussi 1 dégât au héros adverse.'),
      ex(13, reduitUnSort, 'Réduit de 1 le coût d’un sort de ta main.')
    ],
    cat3_kit: [
      st(3, 1, 0),
      ex(8, defausse(), 'Râle d’agonie : défausse une carte…', 'death'),
      ex(8, draw(1), '… puis pioche une carte.', 'death'),
      ex(15, reduitUnSort, 'Quand tu défausses une carte, un sort de ta main coûte 1 de moins.', 'on_defausse_self'),
      sta(17, { op: 'cout_des_cartes', qui: 'toi', quoi: 'spell', argCard: '', sens: 'moins', v: 1 }, 'Statique : tes sorts coûtent 1 de moins.')
    ],
    cat3_cauldron: [
      st(4, 0, 1),
      ex(9, dmgRU(1), 'Fin de ton tour : 1 dégât à une unité adverse au hasard.', 'turnEnd'),
      sta(14, { op: 'montant_des_effets', qui: 'toi', cible: 'dmg', sens: 'plus', v: 1 }, 'Statique : tes dégâts infligent 1 de plus.'),
      ex(18, draw(1), 'Quand tu défausses une carte, pioche une carte.', 'on_defausse_self')
    ],
    cat3_ash: [
      st(5, 1, 0),
      ex(10, reprend(), 'Râle d’agonie : reprends un sort de ta défausse dans ta main.', 'death'),
      ex(12, reprend(), 'Cri de guerre : reprends aussi un sort de ta défausse dans ta main.')
    ],
    cat3_philter: [
      cost(6),
      ex(11, draw(1), 'Pioche aussi une carte.'),
      ex(16, dmgRU(3), 'Inflige aussi 3 dégâts à une unité adverse au hasard.')
    ],
    cat3_evil: [
      cost(3),
      ex(8, draw(1), 'Pioche aussi une carte.'),
      ex(12, buffLui(-1, -1), 'Donne aussi -1/-1 à toutes les unités adverses du même type.')
    ],
    cat3_divin: [
      cost(2),
      ex(7, mana1, 'Gagne aussi 1 mana au prochain tour.'),
      ex(14, reduitTout, 'Réduit de 1 le coût de toutes les cartes de ta main.')
    ],
    cat3_familiar: [
      st(4, 0, 1),
      ex(9, dmgH(1), 'Quand tu lances un sort depuis ta défausse, 1 dégât au héros adverse.', 'on_reprise_self'),
      ex(13, buffSelf(1, 0), 'Quand tu défausses une carte, gagne +1/+0.', 'on_defausse_self'),
      ex(20, summon(1, chat), 'Quand tu lances un sort depuis ta défausse, invoque un Chat 2/2.', 'on_reprise_self')
    ],
    cat3_black: [
      st(5, 1, 0),
      ex(10, draw(1), 'Quand tu lances un sort depuis ta défausse, pioche une carte.', 'on_reprise_self'),
      ex(15, buffRand(1, 1), 'Quand tu défausses une carte, un allié gagne +1/+1.', 'on_defausse_self')
    ],
    cat3_sabbat: [
      cost(6),
      ex(11, reprend(), 'Début de ton tour : reprends un sort au hasard de ta défausse dans ta main.', 'turnStart'),
      sta(16, { op: 'cout_des_cartes', qui: 'toi', quoi: 'all', argCard: '', sens: 'moins', v: 1, zone: 'defausse' }, 'Statique : les cartes de ta défausse coûtent 1 de moins.'),
      ex(19, dmgRU(2), 'Quand tu lances un sort depuis ta défausse, 2 dégâts à une unité adverse au hasard.', 'on_reprise_self')
    ],

    // =================================================================== MORRIGANE (corbeau 3) — la charognarde
    crow3_hungry: [
      st(2, 0, 1),
      ex(8, charogne(1), 'Quand cette unité attaque, Charogne 1.', 'on_attack_self'),
      ex(13, charogne(1), 'Quand l’adversaire perd des PV, Charogne 1.', 'on_heroHurt_foe'),
      sta(17, { op: 'montant_des_effets', qui: 'toi', cible: 'charogne', sens: 'plus', v: 1 }, 'Statique : tes Charognes dévorent 1 carte de plus.')
    ],
    crow3_magpie: [
      st(3, 0, 1),
      ex(7, buffType('Oiseau', 1, 0), 'Râle d’agonie : tes autres Oiseaux gagnent +1/+0.', 'death'),
      ex(15, buffType('Oiseau', 1, 0), 'Quand une carte est exilée d’une défausse, tes autres Oiseaux gagnent +1/+0.', 'on_exil_any')
    ],
    crow3_vulture: [
      st(4, 1, 0),
      ex(9, charogne(1), 'Cri de guerre : Charogne 1.'),
      aura(14, { scope: 'sameTypeAllies', key: 'Charge' }, 'Aura : tes autres Oiseaux ont Charge.')
    ],
    crow3_knacker: [
      st(5, 1, 0),
      ex(10, charogne(2), 'Cri de guerre : Charogne 2.'),
      ex(12, charogne(1), 'Quand l’adversaire lance un sort, Charogne 1.', 'on_spell_foe')
    ],
    crow3_lord: [
      cost(6),
      ex(11, charogne(2), 'Quand cette unité attaque, Charogne 2.', 'on_attack_self'),
      aura(16, { scope: 'sameTypeAllies', atk: 1 }, 'Aura : tes autres Oiseaux ont +1/+0.'),
      ex(18, charogne(1), 'Début de ton tour : Charogne 1.', 'turnStart')
    ],
    crow3_charnel: [
      cost(2),
      ex(8, draw(1), 'Pioche aussi une carte.'),
      ex(13, buffAlly(0, 0, 'Charge'), 'L’unité gagne aussi Charge.')
    ],
    crow3_skel: [
      st(3, 1, 0),
      ex(7, charogne(1), 'Quand cette unité attaque, Charogne 1.', 'on_attack_self'),
      ex(15, draw(1), 'Quand une carte est exilée d’une défausse, pioche une carte.', 'on_exil_any')
    ],
    crow3_prince: [
      cost(4),
      ex(9, charogne(2), 'Cri de guerre : Charogne 2.'),
      key(14, 'Charge', 'Gagne Charge.'),
      ex(19, defausse('adversaire'), 'Quand une carte est exilée d’une défausse, l’adversaire défausse une carte au hasard.', 'on_exil_any')
    ],
    crow3_colossus: [
      cost(5),
      ex(10, charogne(1), 'Début de ton tour : Charogne 1.', 'turnStart'),
      aura(16, { scope: 'sameTypeAllies', atk: 1, hp: 1 }, 'Aura : tes autres Oiseaux ont +1/+1.'),
      ex(20, buffSelf(1, 1), 'Quand une carte est exilée d’une défausse, gagne +1/+1.', 'on_exil_any')
    ],
    crow3_lean: [
      st(6, 1, 1),
      ex(11, draw(1), 'Râle d’agonie : pioche une carte.', 'death'),
      ex(12, charogne(1), 'Quand tu attaques avec une unité, Charogne 1.', 'on_attack_self')
    ],

    // =================================================================== DENDROBATE (grenouille 3) — le venin
    frog3_tree: [
      st(2, 0, 1),
      ex(8, toxine('randomEnemyUnit', 1), 'Râle d’agonie : pose 1 Toxine sur une unité adverse au hasard.', 'death'),
      ex(14, toxine('randomEnemyUnit', 1), 'Début de ton tour : pose 1 Toxine sur une unité adverse au hasard.', 'turnStart'),
      sta(17, { op: 'montant_des_effets', qui: 'toi', cible: 'toxine', sens: 'plus', v: 1 }, 'Statique : tes Toxines en posent 1 de plus.')
    ],
    frog3_dart: [
      amp(3),
      ex(7, toxine('randomEnemyUnit', 1), 'Pose aussi 1 Toxine sur une autre unité adverse au hasard.'),
      ex(13, draw(1), 'Pioche aussi une carte.')
    ],
    frog3_sentinel: [
      st(4, 1, 0),
      ex(9, armor(2), 'Fin de ton tour : ton héros gagne 2 d’armure.', 'turnEnd'),
      aura(12, { scope: 'enemyUnits', atk: -1 }, 'Aura : les unités adverses ont -1/-0.')
    ],
    frog3_slow: [
      cost(5),
      ex(10, heal(4), 'Soigne aussi ton héros de 4.'),
      ex(15, draw(1), 'Pioche aussi une carte.')
    ],
    frog3_royal: [
      st(6, 0, 1),
      ex(11, armor(2), 'Quand une unité adverse meurt, ton héros gagne 2 d’armure.', 'on_unitDies_foe'),
      aura(16, { scope: 'otherAllies', hp: 1 }, 'Aura : tes autres alliés ont +0/+1 de plus.'),
      aura(18, { scope: 'otherAllies', key: 'Bouclier' }, 'Aura : tes autres alliés ont Bouclier.')
    ],
    frog3_tadpole: [
      st(4, 0, 1),
      ex(10, toxine('enemyUnit', 1), 'Cri de guerre : pose 1 Toxine sur une unité adverse.'),
      ex(13, summon(1, tetard), 'Râle d’agonie : invoque un Têtard 1/1.', 'death')
    ],
    frog3_toad: [
      st(2, 1, 0),
      ex(8, toxine('randomEnemyUnit', 2), 'Râle d’agonie : pose 2 Toxines sur une unité adverse au hasard.', 'death'),
      key(15, 'Taunt', 'Gagne Provocation.'),
      sta(20, { op: 'toxine_brule_le_heros', qui: 'adversaire', sens: 'plus', v: 1 }, 'Statique : au début de son tour, chaque unité adverse inflige à son contrôleur 1 dégât par Toxine qu’elle porte.')
    ],
    frog3_contagion: [
      cost(3),
      ex(7, draw(1), 'Pioche aussi une carte.'),
      // « chaque unité adverse QUI PORTE une Toxine » : aucune cible du registre ne dit ça, donc c'est
      // la Contagion elle-meme qui blesse (`dmg`) — avec v: 0 elle ne pose rien de plus.
      ex(12, { op: 'contagion', v: 0, dmg: 1 }, 'Inflige aussi 1 dégât à chaque unité adverse qui porte une Toxine.')
    ],
    frog3_collector: [
      st(5, 0, 1),
      ex(9, toxine('randomEnemyUnit', 1), 'Quand une de tes unités meurt, pose 1 Toxine sur une unité adverse au hasard.', 'on_unitDies_self'),
      aura(14, { scope: 'otherAllies', hp: 1 }, 'Aura : tes autres alliés ont +0/+1.'),
      sta(19, { op: 'pioche_du_tour', qui: 'toi', sens: 'plus', v: 1 }, 'Statique : tu pioches une carte de plus au début de ton tour.')
    ],
    frog3_epidemic: [
      cost(6),
      ex(11, draw(1), 'Pioche aussi une carte.'),
      ex(16, heal(6), 'Soigne aussi ton héros de 6.')
    ],

    // =================================================================== HULOTTE (hibou 3) — la bibliothecaire
    owl3_skim: [
      ex(2, meule(2), 'Meule aussi 2 cartes.'),
      ex(7, draw(1), 'Pioche aussi une carte.'),
      ex(12, renforceLaFatigue(1, 1), 'Les cartes de ta pile de fatigue gagnent +1/+1.')
    ],
    owl3_archivist: [
      st(3, 0, 1),
      ex(9, meule(2), 'Râle d’agonie : meule 2 cartes.', 'death'),
      ex(14, meule(1), 'Début de ton tour : meule une carte.', 'turnStart'),
      sta(17, { op: 'mana_du_tour', qui: 'toi', sens: 'plus', v: 1 }, 'Statique : tu as 1 mana de plus par tour.')
    ],
    owl3_annot: [
      cost(4),
      ex(8, draw(1), 'Pioche une carte.'),
      ex(13, pumpMain(1, 1), 'Les cartes de ta main gagnent aussi +1/+1.'),
      ex(18, creeDeLaFatigue(0, 0), 'Crée aussi une carte au hasard de ta pile de fatigue.')
    ],
    owl3_night: [
      st(5, 1, 0),
      ex(10, meule(1), 'Fin de ton tour : meule une carte.', 'turnEnd'),
      aura(15, { scope: 'otherAllies', hp: 1 }, 'Aura : tes autres alliés ont +0/+1.'),
      ex(20, buffAll(1, 1), 'Quand tu pioches dans la fatigue, tes alliés gagnent +1/+1.', 'on_fatigue_self')
    ],
    owl3_chancellor: [
      st(6, 0, 1),
      ex(11, meule(2), 'Cri de guerre : meule 2 cartes.'),
      ex(16, dmgH(2), 'Quand tu pioches dans la fatigue, 2 dégâts au héros adverse.', 'on_fatigue_self'),
      ex(19, pumpSujet(1, 1), 'Quand tu pioches dans la fatigue, la carte piochée gagne +1/+1.', 'on_fatigue_self')
    ],
    owl3_barn: [
      st(2, 0, 1),
      ex(7, buffSelf(1, 0), 'Quand tu meules une carte, gagne +1/+0.', 'on_meule_self'),
      aura(15, { scope: 'sameTypeAllies', atk: 1 }, 'Aura : tes autres Oiseaux ont +1/+0.')
    ],
    owl3_index: [
      cost(3),
      ex(9, draw(1), 'Pioche une carte.'),
      ex(13, creeDeLaFatigue(2, 2), 'Crée aussi une seconde carte de ta pile de fatigue : elle gagne +2/+2.')
    ],
    owl3_bookmark: [
      st(4, 1, 0),
      ex(10, meule(1), 'Fin de ton tour : meule une carte.', 'turnEnd'),
      ex(14, armor(3), 'Quand tu pioches dans la fatigue, ton héros gagne 3 d’armure.', 'on_fatigue_self')
    ],
    owl3_dean: [
      st(5, 1, 0),
      ex(11, renforceLaFatigue(1, 1), 'Cri de guerre : les cartes de ta pile de fatigue gagnent +1/+1.'),
      ex(12, dmgRU(2), 'Quand tu pioches dans la fatigue, 2 dégâts à une unité adverse au hasard.', 'on_fatigue_self')
    ],
    owl3_grand: [
      cost(6),
      ex(8, meule(3), 'Cri de guerre : meule 3 cartes.'),
      aura(16, { scope: 'otherAllies', atk: 1, hp: 1 }, 'Aura : tes autres alliés ont +1/+1.')
    ],

    // =================================================================== PASTICHE (caméléon 3) — l'usurpateur
    cam3_clerk: [
      cost(2),
      ex(7, enregistre(1), 'Cri de guerre : le Registre enregistre une carte au hasard de ta main.'),
      ex(14, draw(1), 'Quand tu joues une carte qui partage un type avec le Registre, pioche une carte.', 'on_registre_self')
    ],
    cam3_librarian: [
      st(3, 0, 1),
      ex(8, typeDuRegistre('self', 'un'), 'Cri de guerre : reçoit un type du Registre au hasard.'),
      sta(13, { op: 'cout_des_cartes', qui: 'toi', quoi: 'typeDuRegistre', argCard: '', sens: 'moins', v: 1 }, 'Statique : les cartes qui partagent un type avec le Registre coûtent 1 de moins de plus.'),
      sta(17, { op: 'cout_des_cartes', qui: 'toi', quoi: 'all', argCard: '', sens: 'moins', v: 1 }, 'Statique : tes cartes coûtent 1 de moins.')
    ],
    cam3_chronicler: [
      st(4, 1, 0),
      ex(9, draw(1), 'Râle d’agonie : pioche une carte.', 'death'),
      ex(12, mana1, 'Quand un type entre pour la première fois dans le Registre, gagne 1 mana au prochain tour.', 'on_typeNouveau_any'),
      ex(18, draw(1), 'Quand un type entre pour la première fois dans le Registre, pioche aussi une carte.', 'on_typeNouveau_any')
    ],
    cam3_specimen: [
      amp(5),
      ex(10, draw(1), 'Pioche aussi une carte.'),
      ex(16, { op: 'dmg', t: 'randomEnemyAny', v: nTypes }, 'Inflige aussi X dégâts à une autre cible adverse au hasard.'),
      ex(20, dmgH(nTypes), 'Inflige aussi X dégâts au héros adverse.')
    ],
    cam3_grand: [
      cost(6),
      ex(11, buffSelf(1, 1), 'Quand un type entre pour la première fois dans le Registre, gagne +1/+1.', 'on_typeNouveau_any'),
      ex(15, typeDuRegistre('allAllies', 'un'), 'Début de ton tour : tes autres alliés reçoivent un type du Registre au hasard.', 'turnStart'),
      ex(19, relance('hasard', 1), 'Cri de guerre : relance aussi une carte du Registre au hasard.')
    ],
    cam3_copyist: [
      st(2, 1, 0),
      ex(9, buffSelf(1, 1), 'Quand un type entre pour la première fois dans le Registre, gagne +1/+1.', 'on_typeNouveau_any'),
      ex(13, enregistre(1), 'Début de ton tour : le Registre enregistre une carte au hasard de ta main.', 'turnStart')
    ],
    cam3_mimic: [
      cost(3),
      ex(7, draw(1), 'Pioche aussi une carte.'),
      ex(12, typeDuRegistre('allyUnit', 'un'), 'L’unité reçoit aussi un deuxième type du Registre.')
    ],
    cam3_ruthless: [
      st(4, 1, 0),
      ex(8, dmgH(1), 'Fin de ton tour : 1 dégât au héros adverse.', 'turnEnd'),
      aura(14, { scope: 'enemyUnits', atk: -1 }, 'Aura : les unités adverses ont -1/-0.')
    ],
    cam3_index: [
      cost(5),
      ex(10, heal(4), 'Soigne aussi ton héros de 4.'),
      ex(16, { op: 'cree', choix: 'hasard', quoi: 'typeDuRegistre', n: 1, lvl: LVL }, 'Crée aussi une carte au hasard d’un type du Registre.')
    ],
    cam3_retro: [
      cost(6),
      ex(11, draw(1), 'Pioche aussi une carte.'),
      ex(15, relance('hasard', 1), 'Relance aussi une carte du Registre au hasard.')
    ]
  };

  // Gardes a poser d'avance : un moment ajoute par un palier ne dit pas lui-meme QUI il ecoute.
  const GARDES = {
    // « Quand CETTE unite attaque » (et non « quand tu attaques avec une unite » : Rapace Maigre, 12).
    crow3_hungry: { on_attack_self: 'moi' },
    crow3_vulture: { on_attack_self: 'moi' },
    crow3_lord: { on_attack_self: 'moi' },
    crow3_skel: { on_attack_self: 'moi' }
  };

  return { TIERS, GARDES };
}
