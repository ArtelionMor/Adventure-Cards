// LES SITUATIONS A TESTER — les positions qu'on veut pouvoir monter sans jouer les
// tours d'avant. Le texte qui les explique est dans `docs/SITUATIONS-A-TESTER.md` ;
// ce fichier-ci est ce que la machine en lit, et les deux se suivent (meme `id`).
//
// C'est de la DONNEE, pas de l'equilibrage : rien ici ne se tune, tout se decrit.
// Le montage, lui, est dans `game/src/tools/situation.js`.
//
// LE FORMAT D'UN COTE (`p` = toi, `e` = en face) :
//   heros     ['dog','owl']   une equipe de personnages (exclusif avec `pnj`)
//   cote      'cards'|'switches'  quelles cartes de chaque slot (defaut : base)
//   pnj       'owlboss'       un adversaire des donnees (exclusif avec `heros`)
//   pv        20              points de vie actuels (defaut : le maximum)
//   pvMax     30              si on veut un maximum different de celui du camp
//   mana      4               mana disponible ; `manaMax` si different
//   tours     6               tours joues PAR CE CAMP — c'est ce que lisent les
//                             compteurs (« X = tes tours joues »), pas `tour`
//   main      ['owl_wisdom']  exactement ces cartes-la ; `[]` = une main vide expres.
//                             Un NOMBRE = autant de cartes prises dans la pioche.
//                             ABSENT = une main normale, comme au debut d'un tour —
//                             c'est ce qu'il faut a une situation qu'on joue du debut.
//   plateau   ['grunt3']      les unites en jeu ; elles arrivent SANS declencher
//                             « A la pose » — le plateau decrit est celui qu'on obtient
//   defausse  ['bolt'] ou 6   les cartes de la defausse, nommees ou tirees du deck
//   pioche    1               tronque la pioche a ce nombre de cartes
//
// Une carte citee est prise dans la pioche du camp quand elle s'y trouve (le compte
// reste honnete), sinon elle est fabriquee a partir du catalogue.
export const SITUATIONS = [

  // ---------------------------------------------------------------- famille A
  // Les decisions ou le bot est probablement faux. Les plus rentables : c'est ce que
  // le journal de decisions cherche — un coup ou tu fais autrement, et tu sais pourquoi.
  {
    id: 'A1', famille: 'A', titre: 'Le létal qui demande de poser une aura d’abord',
    question: 'Il y a létal, et un seul chemin. Le Rempart 3/6 est en Provocation : il faut passer par lui. Sans rien poser, Chiot (5) + Chef de Meute (3) le tuent et le Toutou enragé (3) passe : 8 PV deviennent 5. Avec le Chien de Berger à 2 mana d’abord (+1/+1 aux autres), le Chiot passe à 6 et le tue TOUT SEUL — Toutou enragé 4 + Chef de Meute 4 partent au visage, et ça fait exactement 8.',
    regarde: 'Le seul test sans ambiguïté de la famille : il gagne, ou il ne gagne pas. Il faut voir trois choses à la fois — que l’aura doit partir AVANT les attaques, que c’est le Chiot qui doit tuer le Rempart (pas les deux petits), et que le reste suffit pile. Compare avec `montecarlo` : lui finit la partie, donc il voit le létal. ⚠ Une position déjà perdue rend 0 % partout et le Monte-Carlo n’y distingue plus rien — c’est pour ça que celle-ci est réglée au point exact.',
    niveau: 8, tour: 11, qui: 'p',
    p: { heros: ['dog', 'owl'], pv: 24, mana: 2, tours: 6, main: ['dog_guard'], plateau: ['dog_pup', 'dog_bite', 'dog_alpha'] },
    e: { pnj: 'owlboss', pv: 8, mana: 10, tours: 5, plateau: ['wall2'] }
  },
  {
    id: 'A2', famille: 'A', titre: 'Garder le retrait pour la vraie menace',
    question: 'Chasse Nocturne maintenant sur une Brute 3/4, ou la garder ? Son deck contient 3 Lapin-Colosse 8/8 Provocation+Bouclier et une Pieuvre Mécanique.',
    regarde: 'C’est LA situation que le réglage `malin` prétend gérer. Vérifie qu’il ne brûle pas Chasse Nocturne sur un 3/4 — et lis l’écart de notes entre les deux coups : il dit s’il a hésité ou s’il n’a pas vu la question.',
    niveau: 8, tour: 6, qui: 'p',
    p: { heros: ['owl', 'frog'], pv: 20, mana: 4, tours: 3, main: ['owl_wisdom', 'frog_venom'], plateau: ['frog_tad'] },
    e: { pnj: 'frogboss', pv: 60, mana: 6, tours: 3, plateau: ['grunt3'] }
  },
  {
    id: 'A3', famille: 'A', titre: 'Le balayage symétrique, et son timing',
    question: 'Nuit Sans Lune détruit TOUT (les tiens aussi) et te soigne 6. Tu es derrière au plateau, mais tes deux unités ne sont pas rien. Maintenant, ou dans un tour ?',
    regarde: 'Les Corbeaux-Éclaireurs Fous se détruisent tout seuls en fin de tour : attendre coûte 0. Le bot ne le sait pas — il lit une cible mixte comme « ce qu’on gagne en face moins ce qu’on perd chez soi ».',
    niveau: 8, tour: 9, qui: 'p',
    p: { heros: ['crow', 'cat'], pv: 15, mana: 5, tours: 5, main: ['crow_night', 'crow_peck'], plateau: ['crow_scout', 'crow_feather'] },
    e: { pnj: 'fox1', pv: 30, mana: 8, tours: 4, plateau: ['rush1', 'rush1', 'grunt4'] }
  },
  {
    id: 'A4', famille: 'A', titre: 'Deux petites cartes ou une grosse',
    question: 'Chef de Meute 3/4 (+1/+1 aux autres, mais il n’y a personne), ou Chien de Berger 4/5 + Coup de Sifflet (qui pose un Chiot 5/6ET donne +1/+1) ?',
    regarde: '`malin` fait un sac à dos sur la main pour ça. La réponse est franche ici : si le bot prend le Chef de Meute, le sac à dos ne marche pas, ou `cardValue()` surévalue un cri de guerre dans le vide.',
    niveau: 8, tour: 9, qui: 'p',
    p: { heros: ['dog'], pv: 28, mana: 5, tours: 5, main: ['dog_alpha', 'dog_guard', 'dog_growl'] },
    e: { pnj: 'frog1', pv: 32, mana: 5, tours: 4, plateau: ['wall1'] }
  },
  {
    id: 'A5', famille: 'A', titre: 'Passe-Murailles contre une Provocation',
    question: 'Deux Provocations en face, deux unités qui les ignorent. 2 au visage par tour, 14 PV : sept tours. Ou tu construis.',
    regarde: 'Que le bot voie que la Provocation ne s’applique pas, et que le Piège à Souris pioche + 2 dégâts à chaque attaque — donc qu’attaquer est presque toujours juste. Un bot planté se voit tout de suite.',
    niveau: 8, tour: 13, qui: 'p',
    p: { heros: ['cat'], pv: 18, mana: 4, tours: 7, main: ['cat_pounce'], plateau: ['cat_trap', 'cat_alley'] },
    e: { pnj: 'octo1', pv: 14, mana: 7, tours: 6, plateau: ['grunt4', 'wall1'] }
  },
  {
    id: 'A6', famille: 'A', titre: 'Le mana flottant du premier tour',
    question: 'Coup de Bec (3 au visage, pioche 2) au tour 1, ou garder le mana et poser l’Éclaireur au tour 2 ?',
    regarde: 'La question la plus banale du jeu, et celle qu’on rejoue le plus. Si le bot brûle toujours son 1-drop de tempo, ça se voit dans `analyse-cartes` — mais c’est ici qu’on comprend pourquoi.',
    niveau: 8, tour: 1, qui: 'p',
    p: { heros: ['crow'], pv: 24, mana: 1, tours: 1, main: ['crow_peck', 'crow_scout'] },
    e: { pnj: 'crow1', mana: 0, tours: 0 }
  },

  // ---------------------------------------------------------------- famille B
  // Les mecaniques dont le piege ne se voit qu'en jouant. Elles sont correctes (les
  // bancs le disent) : la question est de savoir si elles sont JOUABLES.
  {
    id: 'B1', famille: 'B', titre: 'Volte-Face sur une unité adverse',
    question: 'Le switch se fait CHEZ CELUI QU’ON VISE. Si l’autre face est un sort, c’est l’adversaire qui en profite.',
    regarde: 'Décision de game design assumée, pas un oubli — mais il faut la vivre pour trancher si « mal la lancer arrange l’adversaire » est amusant ou juste punitif. Une carte de PNJ n’a pas d’autre face : le journal doit le dire au lieu de ne rien faire en silence.',
    niveau: 8, tour: 12, qui: 'p',
    p: { heros: ['cameleon'], pv: 20, mana: 2, tours: 6, main: ['fox_wild'] },
    e: { pnj: 'frogboss', pv: 60, mana: 6, tours: 6, plateau: ['wall2'] }
  },
  {
    id: 'B2', famille: 'B', titre: 'Voler un Colosse',
    question: 'Prendre le contrôle du Colosse : tu enlèves la Provocation d’en face ET tu gagnes un 8/8 à Bouclier.',
    regarde: 'Il n’attaque pas ce tour-ci (pas de Charge), et à sa mort sa carte part dans la défausse de SON propriétaire. Regarde surtout ce que ça vaut contre 70 PV : un 8/8 volé, c’est neuf tours.',
    niveau: 8, tour: 10, qui: 'p',
    p: { heros: ['cameleon', 'owl'], pv: 16, mana: 3, tours: 5, main: ['fox_ambush'] },
    e: { pnj: 'owlboss', pv: 70, mana: 10, tours: 5, plateau: ['grunt4', 'wall2'] }
  },
  {
    id: 'B3', famille: 'B', titre: 'Métamorphose Ultime',
    question: '1 mana : tous tes alliés deviennent une copie du Colosse adverse. Quatre 8/8. Ou tu copies ton propre Chiot de Garde, pour quatre râles d’agonie.',
    regarde: 'Le modèle est lu UNE fois : c’est la même carte pour tous. Les copies gardent leur `uid` et le fait d’avoir déjà attaqué — la Charge du modèle ne les relance donc pas. À 1 mana, est-ce que cette carte est simplement cassée ?',
    niveau: 8, tour: 8, qui: 'p',
    p: { heros: ['cameleon', 'dog'], pv: 22, mana: 1, tours: 4, main: ['fox_king'], plateau: ['dog_pup', 'dog_bite', 'dog_bone', 'dog_alpha'] },
    e: { pnj: 'fox1', pv: 40, mana: 8, tours: 4, plateau: ['grunt4'] }
  },
  {
    id: 'B4', famille: 'B', titre: 'Prince des cabots dans le vide',
    question: 'Le poser sur un plateau vide : il vaut 0/0 et meurt au prochain ramassage. Après un Coup de Sifflet : il vaut 2/2, puis grandit.',
    regarde: 'Une caractéristique variable tombée à 0 tue l’unité, et le compteur bouge sans qu’on joue. Vérifie que le bot ne pose pas un 0/0 dans le vide — et que la fiche d’unité explique pourquoi il est mort.',
    niveau: 8, tour: 5, qui: 'p',
    p: { heros: ['dog'], pv: 30, mana: 5, tours: 3, main: ['dog_bone', 'dog_growl'] },
    e: { pnj: 'rabbit1', pv: 20, mana: 3, tours: 2, plateau: ['grunt1'] }
  },
  {
    id: 'B5', famille: 'B', titre: 'Le Chien de la fatigue',
    question: 'Attaque et vie = tes tours joués, cri de guerre −7/−7. Combien vaut-il vraiment en arrivant ?',
    regarde: 'Mesuré : mort en arrivant à ton tour 3, 2/2 au tour 9, 8/8 au tour 15 — soit `tours − 7` pour 7 mana. Il est dans la pile de fatigue, donc il sort tard, donc au moment où il commence à valoir quelque chose. Monte la situation aux trois tours.',
    niveau: 8, tour: 17, qui: 'p',
    p: { heros: ['dog'], pv: 20, mana: 9, tours: 9, main: ['card_njt2j1'] },
    e: { pnj: 'frog1', pv: 20, mana: 7, tours: 8 }
  },
  {
    id: 'B6', famille: 'B', titre: 'Finir sa pioche',
    question: 'Le tour prochain tu tires dans la pile de fatigue. Six cartes possibles, toutes différentes, au hasard. Ressource ou punition ?',
    regarde: '⚠ Avec une pile non vide, `peutAgir()` est toujours vrai : la fin « plus personne ne peut jouer » ne se déclenche plus, et c’est `maxTurns` (100) qui devient le garde-fou. Le premier chiffre à relire est la longueur des combats.',
    niveau: 8, tour: 14, qui: 'p',
    p: { heros: ['owl', 'crow'], pv: 12, mana: 8, tours: 7, pioche: 1, defausse: 12 },
    e: { pnj: 'owlboss', pv: 40, mana: 10, tours: 7, plateau: ['wall2'] }
  },
  {
    id: 'B7', famille: 'B', titre: 'L’Impératrice qui ne s’épuise jamais',
    question: 'Tes sorts reviennent en pioche, ta pioche ne se vide plus, tu pioches 2 par tour. La partie se termine-t-elle un jour ?',
    regarde: 'Le plafond `maxRecyclageParTour` (30) est la seule chose qui ferme la boucle, et il est généreux. Ajoute Grand Corbeau et regarde le nombre de tours : si ça touche 100, l’archétype Fatigue est cassé avant d’exister.',
    niveau: 8, tour: 12, qui: 'p',
    p: { heros: ['owl'], pv: 20, mana: 10, tours: 6, main: ['owl_study', 'owl_gaze'], plateau: ['owl_night'] },
    e: { pnj: 'octo1', pv: 36, mana: 7, tours: 6 }
  },
  {
    id: 'B8', famille: 'B', titre: 'Neuf Vies : à quel tour devient-elle jouable ?',
    question: 'Quand devient-elle payable, et que vaut-elle à ce moment-là ?',
    regarde: 'Mesuré : 9 mana à ton tour 5, 6 au tour 8, 4 au tour 10, 0 au tour 14 — et elle crée autant de Griffures que de tours joués, ce qui dépasse la main max (8) à partir du tour 9. Vérifie le cumul avec Ombre Feutrée (sorts −1).',
    niveau: 8, tour: 15, qui: 'p',
    p: { heros: ['cat'], pv: 22, mana: 8, tours: 8, main: ['cat_nine', 'cat_shadow'] },
    e: { pnj: 'frog1', pv: 32, mana: 7, tours: 7 }
  },
  {
    id: 'B9', famille: 'B', titre: 'Type : tous, et la chaîne par type',
    question: 'Les Colosses sont « Lapin », le Rempart est « Chien ». Coup de Langue sur un Colosse touche l’autre Colosse ; sur le Rempart, il ne touche que lui.',
    regarde: '⚠ La portée d’une aura « du même type » se décide sur les types IMPRIMÉS, pas sur les types reçus — sinon le Maître élargirait sa propre portée. Un type reçu compte pour les CIBLES mais pas pour la portée. La règle la plus subtile du moteur.',
    niveau: 8, tour: 13, qui: 'p',
    p: { heros: ['cameleon'], pv: 20, mana: 4, tours: 7, main: ['fox_bandit'], plateau: ['fox_cunning', 'fox_kit', 'dog_pup'] },
    e: { pnj: 'owlboss', pv: 80, mana: 10, tours: 6, plateau: ['wall2', 'grunt4', 'grunt4'] }
  },
  {
    id: 'B10', famille: 'B', titre: 'Retrouvailles sur une défausse vide',
    question: 'Tour 5, défausse presque vide : 5 mana pour rien. Tour 12, défausse pleine : cinq corps d’un coup.',
    regarde: 'Une carte dont la valeur dépend entièrement du tour. `cardValue()` ne regarde pas la défausse : candidat évident pour « le bot la joue trop tôt ». Ça se mesure dans `analyse-cartes`, ça se comprend ici. Monte-la aux deux tours.',
    niveau: 8, tour: 5, qui: 'p',
    p: { heros: ['dog'], pv: 30, mana: 5, tours: 3, main: ['dog_lick'], defausse: 1 },
    e: { pnj: 'cat1', pv: 24, mana: 3, tours: 2, plateau: ['grunt2'] }
  },

  // ---------------------------------------------------------------- famille C
  // Les murs de la courbe. `simulate` dit : Grand-Duc 0 a 40 % (mediane 15), Capitaine
  // Grenouille 5 a 80 % (mediane 50). La question n'est pas « est-ce dur ? » mais
  // « est-ce le bot qui est nul, ou est-ce vraiment un mur ? ».
  {
    id: 'C1', famille: 'C', titre: 'Grand-Duc, du premier tour',
    question: 'Joue-la en manuel, du début. 84 PV cumulés contre 105, et en face un deck qui balaye trois fois et se blinde derrière des Provocations.',
    regarde: 'LE test du journal : si tu passes là où le bot fait 0 %, l’écart entre ton coup et `choixBot` sur chaque décision est exactement ce qu’il faut pour corriger `ai.js`. Si tu perds aussi, ce sont les 3 Kamaji et le Hiboux de la domination qu’il faut regarder.',
    niveau: 8, tour: 1, qui: 'p',
    p: { heros: ['dog', 'crow', 'frog'], tours: 1 },
    e: { pnj: 'owlboss', mana: 0, tours: 0 }
  },
  {
    id: 'C2a', famille: 'C', titre: 'Après un Kamaji — l’équipe à 10 mana',
    question: 'Colère de Kamaji vient de tout détruire des deux côtés. Qui reconstruit le plus vite ?',
    regarde: 'À monter avec C2b, qui ne change qu’une chose : le mana. Même PV (83 contre 84), même main, même plateau vide. Si celle-ci reconstruit et pas l’autre, la réponse est le PLAN (monter Athena), pas la tactique.',
    niveau: 8, tour: 20, qui: 'p',
    p: { heros: ['dog', 'owl', 'cameleon'], pv: 18, tours: 10, main: 3 },
    e: { pnj: 'owlboss', pv: 75, tours: 10 }
  },
  {
    id: 'C2b', famille: 'C', titre: 'Après un Kamaji — l’équipe à 8 mana',
    question: 'La même position, avec 2 mana de moins et 1 PV de plus.',
    regarde: 'Le témoin de C2a. Les bonnes équipes contre le Grand-Duc contiennent toutes Athena, et c’est son mana (10, contre 7 ou 8 aux autres) qui la distingue — elle seule monte au plafond du boss.',
    niveau: 8, tour: 20, qui: 'p',
    p: { heros: ['dog', 'crow', 'frog'], pv: 18, tours: 10, main: 3 },
    e: { pnj: 'owlboss', pv: 75, tours: 10 }
  },
  {
    id: 'C3', famille: 'C', titre: 'Hiboux de la domination en jeu',
    question: 'Une carte par tour, à +1 de coût, contre un boss à 105 PV. Position ou condamnation ?',
    regarde: 'Un plafond statique se compose par le MINIMUM. Vérifie que le bot cesse de proposer une 2ᵉ carte — et demande-toi si cette carte a sa place dans un deck qu’on affronte au niveau 8.',
    niveau: 8, tour: 9, qui: 'p',
    p: { heros: ['dog', 'owl', 'cameleon'], pv: 40, mana: 5, tours: 5 },
    e: { pnj: 'owlboss', pv: 90, mana: 10, tours: 4, plateau: ['card_4vap0r'] }
  },
  {
    id: 'C4', famille: 'C', titre: 'La Pieuvre Mécanique',
    question: 'Tout ce que tu envoies au visage la fait grossir (+4/+4 par PV perdu), et elle est en Provocation.',
    regarde: 'Existe-t-il une réponse ? Chasse Nocturne, Bourrasque, Hypnose. Si les trois sont chez Athena et Miracle, c’est une contrainte de STRATÉGIE (le choix d’équipe avant le match) et pas de tactique — ce qui est sain. Si aucune ne suffit, c’est un mur.',
    niveau: 8, tour: 10, qui: 'p',
    p: { heros: ['crow', 'cat'], pv: 22, mana: 5, tours: 5 },
    e: { pnj: 'frogboss', pv: 70, mana: 9, tours: 5, plateau: ['card_winkd1'] }
  },

  // ---------------------------------------------------------------- famille D
  // Les archetypes. La, on ne teste pas une position mais une IDEE DE DECK : une
  // partie entiere, depuis le tour 1, en manuel.
  {
    id: 'D1', famille: 'D', titre: 'Médor turbo (Aggro Turbo) contre le Pillow Fort',
    question: 'Tout base sauf le slot 4 en switch. Ne se préoccupe pas de l’adversaire : pose, renforce, frappe.',
    regarde: 'Est-ce que Turbo bat un Pillow Fort avant qu’il se blinde, ou est-ce que les trois Kamaji suffisent à le tuer ? C’est ce matchup qui dit si l’archétype existe.',
    niveau: 8, tour: 1, qui: 'p',
    p: { heros: ['dog'], tours: 1 },
    e: { pnj: 'owlboss', mana: 0, tours: 0 }
  },
  {
    id: 'D2', famille: 'D', titre: 'Felix combo',
    question: 'Ombre Feutrée (sorts −1) + Griffeur de doigt (1 dégât par sort) + Neuf Vies (N Griffures) + Matou Invocateur (un Chat par sort).',
    regarde: 'Combien de mana pour que la chaîne parte, et le deck survit-il jusque-là ? Un Combo qui a besoin du tour 9 contre un Aggro est un Combo qui n’existe pas.',
    niveau: 8, tour: 1, qui: 'p',
    p: { heros: ['cat'], tours: 1 },
    e: { pnj: 'fox1', mana: 0, tours: 0 }
  },
  {
    id: 'D3', famille: 'D', titre: 'Athena contrôle (Contrôle Hard)',
    question: 'Chasse Nocturne, Colère d’Athéna, Bourrasque, Chouette Tourbillon : ne fait que de la gestion, cherche le 1 pour 1.',
    regarde: 'Avec quoi gagne-t-elle ? Archichouette (3 dégâts par pioche) est la seule condition de victoire — c’est donc un Contrôle qui vire Pillow Fort. Vérifie que ça tient sous `maxTurns`.',
    niveau: 8, tour: 1, qui: 'p',
    p: { heros: ['owl'], tours: 1 },
    e: { pnj: 'frogboss', mana: 0, tours: 0 }
  },
  {
    id: 'D4', famille: 'D', titre: 'Fatigue, si ça existe',
    question: 'Impératrice + Grand Corbeau : ta pioche ne se vide jamais, la sienne si. Sauf que la pile de fatigue est commune aux deux camps et ne s’épuise pas.',
    regarde: 'Y a-t-il un avantage, même minime, à aller à la fatigue en premier ? Si non, l’archétype Fatigue est impossible dans les règles actuelles — et ça se décide maintenant, pas après avoir écrit les cartes.',
    niveau: 8, tour: 1, qui: 'p',
    p: { heros: ['owl', 'crow'], tours: 1 },
    e: { pnj: 'octo1', mana: 0, tours: 0 }
  }
];

export const FAMILLES = {
  A: 'Les décisions où le bot est probablement faux',
  B: 'Les mécaniques dont le piège ne se voit qu’en jouant',
  C: 'Les murs de la courbe',
  D: 'Les archétypes'
};
