// PROPOSITION DE NOMS POUR LES 120 CARTES (9 octobre 2026) — A VALIDER PAR LE GAME DESIGNER.
//
// Rien n'est applique aux cartes : `game/data/characters.data.js` vit sur le Pi et se modifie dans le Card Builder.
// Ce fichier ne sert qu'a la RELECTURE (onglet « Noms » du wiki). Une fois les noms valides, ils s'appliquent en une
// fois (nom de la carte + textes des cartes qui la citent + jetons + docs/tests qui la nomment), puis ce fichier
// disparait.
//
// Les criteres : le nom dit ce que fait la carte (on doit comprendre sans la connaitre) ; il colle au heros et a son
// theme ; il est court (une vignette fait 92 px, deux lignes au plus) ; pas deux noms qui se confondent, pas de nom
// de mot-cle (« Charge ») ni de terme medical ou guerrier reel ; accents et majuscules partout, pas de point final.
// `garder: true` : le nom actuel est deja bon — `alt` propose quand meme une autre piste.
export const NOMS_PROPOSES = {
  // ---- Médor (Chien, Gardien : tient la ligne, appelle la meute)
  dog_pup: { nom: 'Chiot de Garde', pourquoi: 'Provocation : il garde. À sa mort, son « Grand Frère » 2/2 prend la relève (le jeton « Chien » renommé).' },
  dog_guard: { nom: 'Chien de Berger', pourquoi: 'Il veille sur le troupeau : tes autres alliés ont +0/+1.' },
  dog_growl: { nom: 'Coup de Sifflet', pourquoi: 'Un sifflet appelle un chiot et galvanise toute la meute (+1/+1). Évite le doublon « Appel » / « Appel de la meute ».' },
  dog_lick: { nom: 'Retrouvailles', pourquoi: 'Cinq alliés reviennent de la défausse : « Rappel » ne disait pas la joie du retour.' },
  dog_pack: { nom: 'Chien Rassembleur', pourquoi: 'Il ramène avec lui un Chiot de Garde et un Roquet.' },
  dog_bite: { nom: 'Roquet Enragé', pourquoi: 'Petit, hargneux, il fonce (Charge) : « Enragé » seul ne disait pas que c\'est un chien.' },
  dog_alpha: { nom: 'Chef de Meute', pourquoi: '+1/+1 à tous les autres. « Alpha » se confondait avec la Louve Alpha de Croc.' },
  dog_bone: { nom: 'Toutou Populaire', pourquoi: 'Plus il y a de chiens autour de lui, plus il est fort. « Prince Foufi » ne disait rien de l\'effet.' },
  dog_shield: { nom: 'Clairon de la Meute', pourquoi: 'La carte s\'appelait « Charge », comme le mot-clé. Il sonne la charge : +2/+0 et Charge à tes alliés.' },
  dog_bark: { nom: 'Toute la Bande', pourquoi: 'Le Chef de Meute, le Roquet et le Chiot arrivent ensemble.' },
  // ---- Felix (Chat, Mille coupures : les sorts)
  cat_claw: { nom: 'Chat Griffu', pourquoi: 'C\'est une unité, pas une attaque : à chaque sort lancé, il griffe un ennemi.' },
  cat_alley: { nom: 'Chat de Gouttière', garder: true, alt: 'Chat Bagarreur', pourquoi: 'Déjà évocateur (il passe par les toits, il se bat).' },
  cat_pounce: { nom: 'Coup de Griffe', pourquoi: '« Foudre » surprenait chez un chat : 2 dégâts d\'un coup de griffe. Les cartes qui créent des Foudres en créeraient des Coups de Griffe.' },
  cat_nine: { nom: 'Mille Coupures', pourquoi: 'Elle crée une pluie de Coups de Griffe : c\'est la devise de Felix. « Neuf Vies » parlait des chats, pas de l\'effet.' },
  cat_shadow: { nom: 'Chat Noir', pourquoi: 'Le chat de sorcière : tes sorts coûtent moins et il en glisse cinq dans ta pioche. Libère « Ombre » pour Mistigri.' },
  cat_scratch: { nom: 'Tempête de Patounes', garder: true, alt: 'Rafale de Pattes', pourquoi: 'Drôle et juste : X coups, X = tes sorts lancés (juste la majuscule).' },
  cat_hunt: { nom: 'Coup de Patte', garder: true, alt: 'Petite Tape', pourquoi: 'Le petit frère du Coup de Griffe (1 dégât).' },
  cat_curio: { nom: 'Chat Prudent', pourquoi: 'Chaque sort lui fait gagner de l\'armure. « Curiosité » ne disait rien de l\'effet.' },
  cat_trap: { nom: 'Chat Souricier', pourquoi: 'C\'est un chat qui chasse, pas un piège : en attaquant, il pioche et blesse.' },
  cat_king: { nom: 'Matou Invocateur', pourquoi: 'Chaque sort fait apparaître un chaton. Libère « Roi des Toits » pour Mistigri (les deux se confondaient).' },
  // ---- Corax (Corbeau, Filou : pioche et dégâts directs)
  crow_peck: { nom: 'Coup de Bec', garder: true, alt: 'Picorée', pourquoi: 'Clair : 2 dégâts au héros et une carte.' },
  crow_scout: { nom: 'Corbeau Espion', pourquoi: 'Il observe chaque attaque et en tire une carte. « Éclaireur » existe déjà chez un adversaire.' },
  crow_murder: { nom: 'Volée de Corbeaux', pourquoi: 'C\'est une attaque de groupe (2 dégâts à toutes les unités adverses), pas un envol.' },
  crow_omen: { nom: 'Présage', garder: true, alt: 'Mauvais Augure', pourquoi: 'Juste : il brasse la pioche et en tire deux cartes.' },
  crow_raven: { nom: 'Corbeau Envieux', pourquoi: 'Quand l\'adversaire pioche, il pioche aussi : l\'envie dit l\'effet.' },
  crow_thief: { nom: 'Pie Voleuse', pourquoi: 'La pie vole du mana et une carte. « Frappeur Nocturne » faisait penser à une attaque.' },
  crow_curse: { nom: 'Mauvais Œil', pourquoi: 'Un regard qui foudroie (5 dégâts), plus imagé que « Malédiction ».' },
  crow_feather: { nom: 'Corneille Gourmande', pourquoi: 'Elle grossit à chaque carte piochée.' },
  crow_swarm: { nom: 'Nid de Corbeaux', pourquoi: 'Il fait éclore un corbeau et brasse ta pioche à chaque tour.' },
  crow_night: { nom: 'Nuit Sans Lune', garder: true, alt: 'Éclipse', pourquoi: 'Parfait pour « tout est détruit ».' },
  // ---- Bulle (Grenouille, Venin)
  frog_tad: { nom: 'Têtard Glouton', pourquoi: 'Il profite plus que les autres de chaque renfort. Distingue la carte du jeton Têtard 1/1.' },
  frog_tongue: { nom: 'Langue Collante', garder: true, alt: 'Langue Lasso', pourquoi: 'Déjà clair et drôle.' },
  frog_venom: { nom: 'Grenouille Venimeuse', pourquoi: '« Grenouille » tout court ne disait pas son Venin.' },
  frog_swamp: { nom: 'Coulée de Boue', pourquoi: '2 dégâts à toutes les unités adverses : une vague de boue, pas un simple « Vase ».' },
  frog_toad: { nom: 'Crapaud-Rocher', pourquoi: 'Une Provocation 4/6 qu\'on ne déplace pas.' },
  frog_prince: { nom: 'Prince Grenouille', garder: true, alt: 'Prince Charmant', pourquoi: 'Le conte suffit.' },
  frog_spit: { nom: 'Guérisseuse Gluante', pourquoi: 'Elle soigne 10 PV. Plus de point final (« Soigneur visqueux. »).' },
  frog_lily: { nom: 'Grenouille Nourrice', pourquoi: 'Provocation ; à sa mort, de l\'armure et un têtard.' },
  frog_brew: { nom: 'Élixir Venimeux', pourquoi: '+2/+2 et Venin : on comprend qu\'il empoisonne.' },
  frog_leap: { nom: 'Grand Bond', pourquoi: '+1/+1 et Charge : un bond, pas un simple « Saut ».' },
  // ---- Athéna (Chouette, Contrôle : mana et cartes)
  owl_study: { nom: 'Étude', garder: true, alt: 'Révisions', pourquoi: 'Une carte et du mana au prochain tour.' },
  owl_scholar: { nom: 'Chouette Érudite', garder: true, alt: 'Chouette Bibliothécaire', pourquoi: 'Ta main coûte 1 de moins (juste l\'accent).' },
  owl_gaze: { nom: 'Regard Perçant', garder: true, alt: 'Œil de Chouette', pourquoi: 'Clair : 4 dégâts.' },
  owl_wisdom: { nom: 'Chasse Nocturne', pourquoi: 'La chouette fond sur sa proie et la détruit : « Chasse » seul était vague.' },
  owl_night: { nom: 'Impératrice de la Nuit', pourquoi: 'Plus de point final (« Impératrice nocturne. »).' },
  owl_focus: { nom: 'Coup d\'Aile', pourquoi: 'Une bourrasque renvoie l\'unité dans la main de son propriétaire. « Exclusion » sonnait administratif.' },
  owl_lecture: { nom: 'Chouette Tourbillon', pourquoi: 'On voit que c\'est une chouette ; son tourbillon renvoie une unité.' },
  owl_watch: { nom: 'Chouette Sentinelle', pourquoi: 'Blessée, elle tire une leçon (une carte). « Guet » ne disait pas que c\'est une unité.' },
  owl_storm: { nom: 'Colère d\'Athéna', garder: true, alt: 'Jugement d\'Athéna', pourquoi: 'Parfait pour « détruit toutes les unités adverses ».' },
  owl_arch: { nom: 'Archichouette', garder: true, alt: 'Grande-Duchesse', pourquoi: 'Le jeu de mots fonctionne.' },
  // ---- Miracle (Caméléon : copie, transformation, types)
  fox_kit: { nom: 'Caméléon Copieur', pourquoi: 'Il devient la copie d\'une carte du terrain : « Caméléon » seul était le nom de l\'espèce.' },
  fox_dash: { nom: 'Tour de Passe-Passe', pourquoi: 'La cible devient une carte au hasard de son paquet.' },
  fox_snare: { nom: 'Gobeur de Mouches', garder: true, alt: 'Langue Agile', pourquoi: 'Juste le pluriel.' },
  fox_raid: { nom: 'Découverte', garder: true, alt: 'Trouvaille', pourquoi: 'Clair : tu crées une carte.' },
  fox_wild: { nom: 'Volte-Face', pourquoi: 'L\'unité montre son autre face. « Bipolarité » désigne un trouble réel.' },
  fox_cunning: { nom: 'Maître du Camouflage', garder: true, alt: 'Maître des Couleurs', pourquoi: 'Juste la majuscule.' },
  fox_ambush: { nom: 'Hypnose', pourquoi: 'Tu prends le contrôle d\'une unité adverse : plus court et plus clair que « Captif dans le miroir ».' },
  fox_bandit: { nom: 'Coup de Langue', garder: true, alt: 'Langue Fourchue', pourquoi: 'Juste la majuscule.' },
  fox_frenzy: { nom: 'Chef de Tribu', pourquoi: 'Chaque allié joué renforce sa tribu. « Cohorte Divergente » ne se comprenait pas.' },
  fox_king: { nom: 'Métamorphose Ultime', garder: true, alt: 'Mille Visages', pourquoi: 'Le grand moment de Miracle (juste la majuscule).' },
  // ---- Croc (Chien, Meute : aggro)
  dog2_cub: { nom: 'Louveteau Affamé', garder: true, alt: 'Louveteau Vorace', pourquoi: 'Parfait.' },
  dog2_hunt: { nom: 'Traque', garder: true, alt: 'Flair', pourquoi: 'Court et juste.' },
  dog2_beater: { nom: 'Rabatteur', garder: true, alt: 'Loup Rabatteur', pourquoi: 'Le mot de chasse dit l\'effet.' },
  dog2_pack: { nom: 'Meute Affamée', garder: true, alt: 'Portée de Louveteaux', pourquoi: 'Clair : trois louveteaux.' },
  dog2_alpha: { nom: 'Loup Hurleur', pourquoi: 'Son hurlement donne +1/+0 aux autres chiens. « Grand Loup » se confondait avec le Grand Méchant Loup.' },
  dog2_kami: { nom: 'Chiot Pétard', pourquoi: 'Il explose à sa mort (2 dégâts au héros) ; évite un mot de guerre réel.' },
  dog2_curee: { nom: 'Curée', garder: true, alt: 'Hallali', pourquoi: 'Le mot de chasse.' },
  dog2_queen: { nom: 'Louve Vengeresse', pourquoi: 'Elle grandit à chaque perte : on comprend pourquoi. Libère « Alpha ».' },
  dog2_feast: { nom: 'Festin', garder: true, alt: 'Sacrifice', pourquoi: 'Le sacrifice qui nourrit la meute.' },
  dog2_moon: { nom: 'Lune de Sang', garder: true, alt: 'Pleine Lune', pourquoi: 'Parfait.' },
  // ---- Mistigri (Chat, Maraudeur)
  cat2_kit: { nom: 'Chaton Fureteur', garder: true, alt: 'Chaton Fouineur', pourquoi: 'Parfait.' },
  cat2_stray: { nom: 'Matou Têtu', garder: true, alt: 'Matou Increvable', pourquoi: 'Il revient toujours : c\'est dit.' },
  cat2_sneak: { nom: 'Passe-Partout', pourquoi: 'Il donne Passe-Murailles : la clé qui ouvre toutes les portes.' },
  cat2_burglar: { nom: 'Cambrioleur', garder: true, alt: 'Monte-en-l\'Air', pourquoi: 'Clair : il vole du mana en attaquant.' },
  cat2_lord: { nom: 'Parrain des Ruelles', pourquoi: 'Le patron des chats voleurs ; « Grand Matou » ne disait rien.' },
  cat2_ghost: { nom: 'Ombre Furtive', garder: true, alt: 'Chat Fantôme', pourquoi: 'Parfait (Élusif, Passe-Murailles).' },
  cat2_matriarch: { nom: 'Mère des Chatons', pourquoi: 'Chaque perte fait venir un chaton : « Matriarche » était vague.' },
  cat2_yowl: { nom: 'Concert Nocturne', garder: true, alt: 'Sérénade de Gouttière', pourquoi: 'Parfait.' },
  cat2_pick: { nom: 'Tire-Laine', pourquoi: 'Le mot français pour pickpocket (et un chat qui tire la laine).' },
  cat2_roof: { nom: 'Roi des Toits', pourquoi: 'Plus court que « Seigneur des Gouttières », et il règne sur les autres chats (+1/+0).' },
  // ---- Sirocco (Faucon, Rapace : la main pleine)
  crow2_eaglet: { nom: 'Aiglon', garder: true, alt: 'Aiglon Pressé', pourquoi: 'Court et juste.' },
  crow2_dive: { nom: 'Piqué', garder: true, alt: 'Plongée', pourquoi: 'Juste : un allié fonce (Charge).' },
  crow2_hawk: { nom: 'Faucon Avare', pourquoi: 'Plus ta main est pleine, plus il frappe fort : il garde tout.' },
  crow2_gust: { nom: 'Courant Ascendant', garder: true, alt: 'Vent Porteur', pourquoi: 'Parfait.' },
  crow2_roc: { nom: 'Oiseau-Roc', pourquoi: 'L\'oiseau géant des légendes : chaque pioche le fait frapper.' },
  crow2_sparrow: { nom: 'Moineau Messager', garder: true, alt: 'Moineau Facteur', pourquoi: 'Parfait : il apporte une carte.' },
  crow2_dart: { nom: 'Serres Plongeantes', pourquoi: 'Des dégâts selon ta main ; se distingue de « Piqué ».' },
  crow2_robin: { nom: 'Rouge-Gorge Chanceux', garder: true, alt: 'Rouge-Gorge Porte-Bonheur', pourquoi: 'Parfait.' },
  crow2_cry: { nom: 'Cri du Faucon', garder: true, alt: 'Appel des Cimes', pourquoi: 'Clair.' },
  crow2_storm: { nom: 'Faucon Foudroyant', garder: true, alt: 'Faucon Tempête', pourquoi: 'Parfait.' },
  // ---- Reinette (Grenouille, Marais : chaque renfort déclenche quelque chose)
  frog2_spawn: { nom: 'Frai', garder: true, alt: 'Ponte du Marais', pourquoi: 'Le mot juste pour des œufs de grenouille.' },
  frog2_croak: { nom: 'Coasseur', pourquoi: 'Chaque renfort le fait coasser (2 dégâts au héros) ; plus court que « Hurleur du Marais ».' },
  frog2_bull: { nom: 'Crapaud-Buffle', garder: true, alt: 'Grenouille-Taureau', pourquoi: 'Parfait.' },
  frog2_rain: { nom: 'Pluie Fertile', garder: true, alt: 'Averse Bienfaisante', pourquoi: 'Parfait.' },
  frog2_elder: { nom: 'Doyen du Marais', garder: true, alt: 'Vieux Sage du Marais', pourquoi: 'Parfait.' },
  frog2_pond: { nom: 'Étang Fécond', garder: true, alt: 'Mare aux Têtards', pourquoi: 'Parfait.' },
  frog2_mud: { nom: 'Bain de Boue', garder: true, alt: 'Spa des Têtards', pourquoi: 'Parfait.' },
  frog2_queen: { nom: 'Reine des Nénuphars', garder: true, alt: 'Reine du Marais', pourquoi: 'Parfait.' },
  frog2_leaper: { nom: 'Sauteur Électrique', garder: true, alt: 'Grenouille Électrique', pourquoi: 'Clair.' },
  frog2_king: { nom: 'Roi Crapaud', garder: true, alt: 'Crapaud Couronné', pourquoi: 'Parfait.' },
  // ---- Morphée (Hibou, Veilleur : le temps joue pour lui)
  owl2_nest: { nom: 'Nid Douillet', garder: true, alt: 'Nid Moelleux', pourquoi: 'Parfait.' },
  owl2_sand: { nom: 'Sablier', garder: true, alt: 'Sable du Temps', pourquoi: 'Parfait.' },
  owl2_watch: { nom: 'Hibou Centenaire', pourquoi: 'Il grandit à chaque tour ; libère « Veilleur » pour le Grand Veilleur.' },
  owl2_lull: { nom: 'Hibou Berceur', garder: true, alt: 'Marchand de Sable', pourquoi: 'Parfait.' },
  owl2_elder: { nom: 'Grand Veilleur', garder: true, alt: 'Hibou Gardien', pourquoi: 'Parfait (une fois le petit « Veilleur » renommé).' },
  owl2_egg: { nom: 'Œuf de Hibou', garder: true, alt: 'Œuf Couvé', pourquoi: 'Parfait.' },
  owl2_dream: { nom: 'Songe', garder: true, alt: 'Rêve Lucide', pourquoi: 'Parfait.' },
  owl2_clock: { nom: 'Coucou', pourquoi: 'Une horloge… à oiseau, qui frappe à chaque fin de tour.' },
  owl2_pillow: { nom: 'Oreiller Géant', garder: true, alt: 'Gros Coussin', pourquoi: 'Parfait.' },
  owl2_midnight: { nom: 'Minuit', garder: true, alt: 'Douze Coups', pourquoi: 'Parfait.' },
  // ---- Mirage (Caméléon, Imitateur : les types)
  cam2_prism: { nom: 'Prisme', garder: true, alt: 'Caméléon Prisme', pourquoi: 'Parfait.' },
  cam2_mirror: { nom: 'Reflet', garder: true, alt: 'Jeu de Miroirs', pourquoi: 'Parfait.' },
  cam2_choir: { nom: 'Chœur Chromatique', garder: true, alt: 'Chœur Arc-en-Ciel', pourquoi: 'Parfait.' },
  cam2_shed: { nom: 'Mue', garder: true, alt: 'Changement de Peau', pourquoi: 'Parfait.' },
  cam2_ball: { nom: 'Bal Masqué', garder: true, alt: 'Carnaval', pourquoi: 'Parfait.' },
  cam2_bud: { nom: 'Bourgeon', garder: true, alt: 'Bouton de Couleur', pourquoi: 'Parfait.' },
  cam2_double: { nom: 'Doublure', garder: true, alt: 'Sosies', pourquoi: 'Parfait.' },
  cam2_veil: { nom: 'Voile Chromatique', garder: true, alt: 'Voile d\'Invisibilité', pourquoi: 'Parfait.' },
  cam2_mime: { nom: 'Mime', garder: true, alt: 'Caméléon Mime', pourquoi: 'Parfait.' },
  cam2_chimera: { nom: 'Chimère', garder: true, alt: 'Chimère Arc-en-Ciel', pourquoi: 'Parfait.' }
};

// Les JETONS dont le nom changerait (ils n'ont pas de carte : leur nom est dans l'effet qui les invoque).
export const JETONS_PROPOSES = [
  { ou: 'Chiot de Garde (râle d\'agonie)', avant: 'Chien', apres: 'Grand Frère', pourquoi: 'Le grand frère qui prend la relève.' }
];
