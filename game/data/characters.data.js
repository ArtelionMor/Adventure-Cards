// DONNEES DE JEU — genere et re-ecrit par le Card Builder (/builder/).
// Tu peux l'editer a la main, mais le builder est fait pour ca : ouvre-le plutot.
export const CHARACTER_DATA = {
  "version": 1,
  "starters": [
    "lapin1"
  ],
  "customMechanics": [],
  "fatigue": [
    {
      "card": "card_4hz1f1",
      "n": 1
    },
    {
      "card": "card_l7cd1z",
      "n": 1
    },
    {
      "card": "card_kgwz53",
      "n": 1
    },
    {
      "card": "card_njt2j1",
      "n": 1
    },
    {
      "card": "card_r7qoup",
      "n": 1
    },
    {
      "card": "card_9g5803",
      "n": 1
    }
  ],
  "library": [
    {
      "id": "miroir",
      "name": "Miroir",
      "type": "spell",
      "cost": 0,
      "keys": [
        "miroir"
      ],
      "text": "Miroir : en main, devient la dernière carte jouée par l'adversaire, avec 1 mana de moins.",
      "play": [],
      "tiers": []
    },
    {
      "id": "grunt1",
      "name": "Lapin - Rongeur",
      "type": "ally",
      "cost": 1,
      "keys": [
        "type:Lapin"
      ],
      "text": "",
      "play": [],
      "tiers": [],
      "atk": 1,
      "hp": 2,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Rabbit/Rabbit.png"
    },
    {
      "id": "grunt2",
      "name": "Lapin - Chapardeur",
      "type": "ally",
      "cost": 2,
      "keys": [
        "passe_murailles",
        "type:Lapin"
      ],
      "text": "Passe-Murailles",
      "play": [],
      "tiers": [],
      "atk": 2,
      "hp": 2,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Rabbit/Rabbit.png"
    },
    {
      "id": "grunt3",
      "name": "Lapin - Brute",
      "type": "ally",
      "cost": 3,
      "keys": [
        "type:Lapin",
        "Taunt"
      ],
      "text": "Provocation. Fin du tour, soigne 1 à elle-même.",
      "play": [],
      "tiers": [],
      "atk": 3,
      "hp": 4,
      "statics": [],
      "turnEnd": [
        {
          "op": "heal",
          "t": "self",
          "v": 1
        }
      ],
      "sprite": "Graphical Assets/Characters/Rabbit/Rabbit Robot.png"
    },
    {
      "id": "grunt4",
      "name": "Lapin - Colosse",
      "type": "ally",
      "cost": 8,
      "keys": [
        "Taunt",
        "type:Lapin"
      ],
      "text": "Provocation.",
      "play": [],
      "tiers": [],
      "atk": 8,
      "hp": 8,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Rabbit/Rabbit English Lop.png"
    },
    {
      "id": "wall1",
      "name": "Paresseux - Garde",
      "type": "ally",
      "cost": 2,
      "keys": [
        "Taunt",
        "type:Paresseux"
      ],
      "text": "Provocation. Cri de guerre : donne +2/+2 à un allié.",
      "play": [
        {
          "op": "buff",
          "t": "allyUnit",
          "atk": 2,
          "hp": 2
        }
      ],
      "tiers": [],
      "atk": 1,
      "hp": 4,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Sloth/Sloth.png"
    },
    {
      "id": "wall2",
      "name": "Chien - Rempart",
      "type": "ally",
      "cost": 4,
      "keys": [
        "Taunt",
        "type:Chien"
      ],
      "text": "Provocation.",
      "play": [],
      "tiers": [],
      "atk": 3,
      "hp": 6,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Dog/Dog Gniocci.png"
    },
    {
      "id": "rush1",
      "name": "Corbeau - Eclaireur Fou",
      "type": "ally",
      "cost": 2,
      "keys": [
        "Charge",
        "elusif",
        "type:Oiseau"
      ],
      "text": "Charge. Se détruit à la fin du tour.",
      "play": [],
      "tiers": [],
      "atk": 5,
      "hp": 1,
      "statics": [],
      "turnEnd": [
        {
          "op": "detruit",
          "t": "self"
        }
      ],
      "sprite": "Graphical Assets/Characters/Crow/Crow Volcanic.png"
    },
    {
      "id": "bolt",
      "name": "Éclair",
      "type": "spell",
      "cost": 1,
      "keys": [],
      "text": "3 blessures.",
      "play": [
        {
          "op": "dmg",
          "t": "enemyAny",
          "v": 3
        }
      ],
      "tiers": [],
      "sprite": "Graphical Assets/Cards/Cat Decks/Cat Deck 1/Eclair.png"
    },
    {
      "id": "smash",
      "name": "Loup - Souffle",
      "type": "spell",
      "cost": 3,
      "keys": [],
      "text": "4 degats à toutes les unités adverses.",
      "play": [
        {
          "op": "dmg",
          "t": "allEnemyUnits",
          "v": 4
        }
      ],
      "tiers": [],
      "sprite": "Graphical Assets/Characters/Big Bad Wolf/Big Bad Wolf.png"
    },
    {
      "id": "potion",
      "name": "Chien - Fiole",
      "type": "spell",
      "cost": 2,
      "keys": [
        "type:Chien"
      ],
      "text": "Rend 5 PV. Pioche une carte.",
      "play": [
        {
          "op": "heal",
          "t": "ownHero",
          "v": 5
        },
        {
          "op": "draw",
          "v": 1
        }
      ],
      "tiers": [],
      "sprite": "Graphical Assets/Characters/Dog/Dog.png"
    },
    {
      "id": "rally",
      "name": "Lapin - Ralliement",
      "type": "spell",
      "cost": 2,
      "keys": [
        "type:Lapin"
      ],
      "text": "+1/+1 à tous les alliés. Pioche une carte.",
      "play": [
        {
          "op": "buff",
          "t": "allAllies",
          "atk": 1,
          "hp": 1
        },
        {
          "op": "draw",
          "v": 1
        }
      ],
      "tiers": [],
      "sprite": "Graphical Assets/Characters/Rabbit/Rabbit.png"
    },
    {
      "id": "venomite",
      "name": "Grenouille - Princesse Venimeuse",
      "type": "ally",
      "cost": 2,
      "keys": [
        "Venin",
        "type:Grenouille"
      ],
      "text": "Venin.",
      "play": [],
      "tiers": [],
      "atk": 1,
      "hp": 1,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Frog/Frog Venomous.png"
    },
    {
      "id": "card_bjidas",
      "name": "Lapin - Lapin Garou",
      "type": "ally",
      "cost": 3,
      "keys": [
        "type:Lapin"
      ],
      "text": "Début de ton tour : gagne +2/+2 et Provocation.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 1,
      "hp": 1,
      "statics": [],
      "turnStart": [
        {
          "op": "buff",
          "t": "self",
          "atk": 2,
          "hp": 2,
          "key": "Taunt"
        }
      ],
      "sprite": "Graphical Assets/Characters/Rabbit/Rabbit Myxomatose.png"
    },
    {
      "id": "card_viekke",
      "name": "Hiboux - Colère de Kamaji",
      "type": "spell",
      "cost": 5,
      "keys": [],
      "text": "Détruit toutes les unités",
      "play": [
        {
          "op": "detruit",
          "t": "allEnemyUnits"
        },
        {
          "op": "detruit",
          "t": "allAllies"
        }
      ],
      "tiers": [],
      "statics": [],
      "sprite": "Graphical Assets/Characters/Owl/Owl Great Horned Owl.png"
    },
    {
      "id": "card_uge5tx",
      "name": "Hiboux - Assassin Royale",
      "type": "ally",
      "cost": 4,
      "keys": [
        "type:Oiseau"
      ],
      "text": "",
      "play": [],
      "tiers": [],
      "atk": 1,
      "hp": 1,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Owl/Owl Great Horned Owl.png"
    },
    {
      "id": "card_urlyni",
      "name": "Chien - Sergent",
      "type": "ally",
      "cost": 4,
      "keys": [
        "type:Chien"
      ],
      "text": "+1/+0 à toutes les unités alliés.",
      "play": [],
      "tiers": [],
      "atk": 3,
      "hp": 3,
      "statics": [],
      "aura": {
        "scope": "otherAllies",
        "atk": 1,
        "hp": 0,
        "key": ""
      },
      "sprite": "Graphical Assets/Characters/Dog/Dog German Shepherd.png"
    },
    {
      "id": "card_i5eghg",
      "name": "Chat - Griffes",
      "type": "spell",
      "cost": 3,
      "keys": [],
      "text": "Inflige 1 blessure à trois reprises, à des adversaires au hasard.",
      "play": [
        {
          "op": "dmg",
          "t": "randomEnemyAny",
          "v": 1
        },
        {
          "op": "dmg",
          "t": "randomEnemyAny",
          "v": 1
        },
        {
          "op": "dmg",
          "t": "randomEnemyAny",
          "v": 1
        }
      ],
      "tiers": [],
      "statics": [],
      "sprite": "Graphical Assets/Characters/Cat/Cat Siamese.png"
    },
    {
      "id": "card_njt2j1",
      "name": "Chien de la fatigue",
      "type": "ally",
      "cost": 7,
      "keys": [
        "Taunt",
        "type:Chien",
        "characteristique_variable:both:ownTurns:"
      ],
      "text": "Gagne +1/+1 pour chaque tour passés cette partie. Cri de guerre : Gagne -7/-7.",
      "play": [
        {
          "op": "buff",
          "t": "self",
          "atk": -7,
          "hp": -7
        }
      ],
      "tiers": [],
      "atk": 1,
      "hp": 1,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Dog/Dog German Shepherd.png"
    },
    {
      "id": "card_kgwz53",
      "name": "Chat de la fatigue",
      "type": "ally",
      "cost": 4,
      "keys": [
        "type:Chat"
      ],
      "text": "Cri de guerre : Inflige X blessures où X est le nombre de sorts lancés cette partie.",
      "play": [
        {
          "op": "dmg",
          "t": "enemyAny",
          "v": {
            "src": "spellsGame",
            "arg": "",
            "plus": 0
          }
        }
      ],
      "tiers": [],
      "atk": 2,
      "hp": 2,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Cat/Cat Menkoun.png"
    },
    {
      "id": "card_l7cd1z",
      "name": "Corbeau de la fatigue",
      "type": "ally",
      "cost": 4,
      "keys": [
        "elusif"
      ],
      "text": "Elusif. Cri de guerre : Draine X PV à l'adversaire. X est le nombre de cartes dans la défausse.",
      "play": [
        {
          "op": "dmg",
          "t": "enemyHero",
          "v": {
            "src": "discardCards",
            "arg": "",
            "plus": 0
          }
        },
        {
          "op": "heal",
          "t": "ownHero",
          "v": {
            "src": "discardCards",
            "arg": "",
            "plus": 0
          }
        }
      ],
      "tiers": [],
      "atk": 1,
      "hp": 1,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Crow/Crow Three Eyes.png"
    },
    {
      "id": "card_4hz1f1",
      "name": "Grenouille de la fatigue",
      "type": "ally",
      "cost": 4,
      "keys": [
        "elusif",
        "Venin"
      ],
      "text": "Venin. Donne +2/+2 à un allié et Venin.",
      "play": [
        {
          "op": "buff",
          "t": "allyUnit",
          "atk": 2,
          "hp": 2,
          "key": "Venin"
        }
      ],
      "tiers": [],
      "atk": 2,
      "hp": 2,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Frog/Frog Toad.png"
    },
    {
      "id": "card_r7qoup",
      "name": "Chouette de la fatigue",
      "type": "ally",
      "cost": 6,
      "keys": [],
      "text": "Détruit une unité adverse",
      "play": [
        {
          "op": "detruit",
          "t": "enemyUnit"
        }
      ],
      "tiers": [],
      "atk": 2,
      "hp": 2,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Owl/Owl Snow.png"
    },
    {
      "id": "card_fhdq9s",
      "name": "Faucon de la fatigue",
      "type": "ally",
      "cost": 5,
      "keys": [],
      "text": "Cri de guerre : Remélange une carte de votre défausse à votre deck, lui donne +2/+2",
      "play": [
        {
          "op": "melange_a_la_pioche",
          "d_ou": "defausse",
          "choix": "precise",
          "carte": "",
          "quoi": "all",
          "t": "enemyUnit",
          "qui": "toi",
          "n": 1,
          "atk": 2,
          "hp": 2
        }
      ],
      "tiers": [],
      "atk": 2,
      "hp": 2,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Birds/Falcon.png"
    },
    {
      "id": "card_9g5803",
      "name": "Rouge Gorge de la Fatigue",
      "type": "ally",
      "cost": 3,
      "keys": [
        "Charge"
      ],
      "text": "Quand tu attaques avec une unité, pioche une carte.",
      "play": [],
      "tiers": [],
      "atk": 2,
      "hp": 1,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Birds/Robin.png",
      "on_attack_self": [
        {
          "op": "draw",
          "v": 1
        }
      ]
    },
    {
      "id": "card_80uilg",
      "name": "Loup - Louveteau",
      "type": "ally",
      "cost": 2,
      "keys": [
        "Taunt"
      ],
      "text": "Râle d'agonie : Pioche une carte et inflige 1 blessure à toutes les unités adverses.",
      "play": [],
      "tiers": [],
      "atk": 1,
      "hp": 1,
      "statics": [],
      "death": [
        {
          "op": "draw",
          "v": 1
        },
        {
          "op": "dmg",
          "t": "allEnemyUnits",
          "v": 1
        }
      ],
      "sprite": "Graphical Assets/Characters/Big Bad Wolf/Big Bad Wolf.png"
    },
    {
      "id": "card_ta7prz",
      "name": "Chat - Dompteur de foudre",
      "type": "ally",
      "cost": 3,
      "keys": [],
      "text": "Ajoute \"Éclair\" à la main.",
      "play": [
        {
          "op": "cree",
          "choix": "precise",
          "carte": "bolt",
          "quoi": "all",
          "argCard": "",
          "n": 1,
          "lvl": 1
        }
      ],
      "tiers": [],
      "atk": 1,
      "hp": 1,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Cat/Cat Bug.png"
    },
    {
      "id": "card_y5uc9s",
      "name": "Jeune Faucon",
      "type": "ally",
      "cost": 1,
      "keys": [],
      "text": "Donne +1/+1 à toutes les cartes de la main.",
      "play": [
        {
          "op": "renforce_les_cartes",
          "d_ou": "main",
          "qui": "toi",
          "quoi": "all",
          "argCard": "",
          "ordre": "hasard",
          "n": 1,
          "atk": 1,
          "hp": 1
        }
      ],
      "tiers": [],
      "atk": 1,
      "hp": 1,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Birds/Falcon.png"
    },
    {
      "id": "card_4vap0r",
      "name": "Hiboux de la domination",
      "type": "ally",
      "cost": 8,
      "keys": [],
      "text": "Votre adversaire ne peut pas jouer plus d'une carte par tour. Toutes ses cartes coûtent un de plus.",
      "play": [],
      "tiers": [],
      "atk": 8,
      "hp": 8,
      "statics": [
        {
          "op": "cout_des_cartes",
          "qui": "adversaire",
          "quoi": "all",
          "argCard": "",
          "sens": "plus",
          "v": 1
        },
        {
          "op": "limite_de_cartes_jouees",
          "qui": "adversaire",
          "v": 1
        }
      ],
      "sprite": "Graphical Assets/Characters/Owl/Owl Great Horned Owl.png"
    },
    {
      "id": "card_winkd1",
      "name": "Pieuvre Mécanique",
      "type": "ally",
      "cost": 6,
      "keys": [
        "type:Poisson",
        "Taunt"
      ],
      "text": "Quand tu perds des PV, cette carte gagne +2/+2. Début de ton tour : perds 1 point de vie.",
      "play": [],
      "tiers": [],
      "atk": 4,
      "hp": 4,
      "statics": [],
      "turnStart": [
        {
          "op": "dmg",
          "t": "ownHero",
          "v": 1
        }
      ],
      "sprite": "Graphical Assets/Characters/Octopus/Octopus Robot.png",
      "on_heroHurt_self": [
        {
          "op": "buff",
          "t": "self",
          "atk": 2,
          "hp": 2
        }
      ]
    },
    {
      "id": "adv_lapin_terrier",
      "name": "Lapin - Terrier",
      "type": "ally",
      "cost": 2,
      "keys": [
        "type:Lapin"
      ],
      "text": "Râle d’agonie : invoque un Lapereau 1/1.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 2,
      "hp": 1,
      "statics": [],
      "death": [
        {
          "op": "summon",
          "n": 1,
          "unit": {
            "name": "Lapereau",
            "atk": 1,
            "hp": 1,
            "keys": [
              "type:Lapin"
            ],
            "statics": []
          }
        }
      ],
      "sprite": "Graphical Assets/Characters/Rabbit/Rabbit.png"
    },
    {
      "id": "adv_lapin_sauteur",
      "name": "Lapin - Sauteur de haies",
      "type": "ally",
      "cost": 3,
      "keys": [
        "passe_murailles",
        "type:Lapin"
      ],
      "text": "Passe-Murailles.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 3,
      "hp": 2,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Rabbit/Rabbit English Lop.png"
    },
    {
      "id": "adv_lapin_carotte",
      "name": "Lapin - Carotte volée",
      "type": "spell",
      "cost": 1,
      "keys": [
        "type:Lapin"
      ],
      "text": "Pioche une carte. Tu auras 1 mana de plus au prochain tour.",
      "play": [
        {
          "op": "draw",
          "v": 1
        },
        {
          "op": "mana_au_prochain_tour",
          "x": 1
        }
      ],
      "tiers": [
        {
          "lvl": 6,
          "cost": -1,
          "text": "coût -1"
        }
      ],
      "statics": [],
      "sprite": "Graphical Assets/Characters/Rabbit/Rabbit.png"
    },
    {
      "id": "adv_chat_gouttiere",
      "name": "Chat - Matou de gouttière",
      "type": "ally",
      "cost": 2,
      "keys": [
        "Charge",
        "type:Chat"
      ],
      "text": "Charge. Quand il attaque, 1 dégât au héros adverse.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 3,
      "hp": 1,
      "statics": [],
      "gardes": {
        "on_attack_self": "moi"
      },
      "on_attack_self": [
        {
          "op": "dmg",
          "t": "enemyHero",
          "v": 1
        }
      ],
      "sprite": "Graphical Assets/Characters/Cat/Cat Chat de Gouttière V2.png"
    },
    {
      "id": "adv_chat_caid",
      "name": "Chat - Caïd du quartier",
      "type": "ally",
      "cost": 4,
      "keys": [
        "type:Chat"
      ],
      "text": "Les dégâts subis par le héros adverse : 1 de plus.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 3,
      "hp": 3,
      "statics": [
        {
          "op": "degats_du_heros",
          "qui": "adversaire",
          "sens": "plus",
          "v": 1
        }
      ],
      "sprite": "Graphical Assets/Characters/Cat/Cat Ginger.png"
    },
    {
      "id": "adv_chat_course",
      "name": "Chat - Course effrénée",
      "type": "spell",
      "cost": 2,
      "keys": [
        "type:Chat"
      ],
      "text": "Un allié gagne +2/+0 et Charge. Pioche une carte.",
      "play": [
        {
          "op": "buff",
          "t": "allyUnit",
          "atk": 2,
          "hp": 0,
          "key": "Charge"
        },
        {
          "op": "draw",
          "v": 1
        }
      ],
      "tiers": [
        {
          "lvl": 3,
          "amp": 1,
          "text": "Effet +1"
        },
        {
          "lvl": 6,
          "cost": -1,
          "text": "coût -1"
        },
        {
          "lvl": 11,
          "amp": 2,
          "text": "Effet +2"
        }
      ],
      "statics": [],
      "sprite": "Graphical Assets/Characters/Cat/Cat Siamese.png"
    },
    {
      "id": "adv_corbeau_glaneur",
      "name": "Corbeau - Glaneur",
      "type": "ally",
      "cost": 2,
      "keys": [
        "type:Oiseau",
        "type:Corbeau"
      ],
      "text": "Fin de ton tour : gagne +1/+1.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 1,
      "hp": 2,
      "statics": [],
      "turnEnd": [
        {
          "op": "buff",
          "t": "self",
          "atk": 1,
          "hp": 1
        }
      ],
      "sprite": "Graphical Assets/Characters/Crow/Crow.png"
    },
    {
      "id": "adv_corbeau_nuee",
      "name": "Corbeau - Nuée",
      "type": "ally",
      "cost": 4,
      "keys": [
        "type:Oiseau",
        "type:Corbeau",
        "characteristique_variable:atk:allyUnits::1"
      ],
      "text": "Attaque = le nombre de tes alliés en jeu, +1.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 1,
      "hp": 3,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Crow/Crow Three Eyes.png"
    },
    {
      "id": "adv_corbeau_rire",
      "name": "Corbeau - Rire moqueur",
      "type": "spell",
      "cost": 2,
      "keys": [
        "type:Oiseau"
      ],
      "text": "Au choix : 3 dégâts à une unité adverse, ou +2/+2 à un allié.",
      "play": [
        {
          "op": "choisir",
          "a": [
            {
              "op": "dmg",
              "t": "enemyUnit",
              "v": 3
            }
          ],
          "b": [
            {
              "op": "buff",
              "t": "allyUnit",
              "atk": 2,
              "hp": 2
            }
          ]
        }
      ],
      "tiers": [
        {
          "lvl": 3,
          "amp": 1,
          "text": "Effet +1"
        },
        {
          "lvl": 6,
          "cost": -1,
          "text": "coût -1"
        },
        {
          "lvl": 11,
          "amp": 2,
          "text": "Effet +2"
        }
      ],
      "statics": [],
      "sprite": "Graphical Assets/Characters/Crow/Crow White.png"
    },
    {
      "id": "adv_loup_hurlement",
      "name": "Loup - Hurlement",
      "type": "spell",
      "cost": 3,
      "keys": [
        "type:Loup"
      ],
      "text": "2 dégâts à toutes les unités adverses. Gagne 2 d’armure.",
      "play": [
        {
          "op": "dmg",
          "t": "allEnemyUnits",
          "v": 2
        },
        {
          "op": "armor",
          "v": 2
        }
      ],
      "tiers": [
        {
          "lvl": 3,
          "amp": 1,
          "text": "Effet +1"
        },
        {
          "lvl": 6,
          "cost": -1,
          "text": "coût -1"
        },
        {
          "lvl": 11,
          "amp": 2,
          "text": "Effet +2"
        }
      ],
      "statics": [],
      "sprite": "Graphical Assets/Characters/Big Bad Wolf/Big Bad Wolf.png"
    },
    {
      "id": "adv_loup_mere",
      "name": "Loup - Mère de la meute",
      "type": "ally",
      "cost": 5,
      "keys": [
        "Taunt",
        "type:Loup"
      ],
      "text": "Provocation. Quand l’adversaire joue un allié, 1 dégât à cet allié.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 4,
      "hp": 5,
      "statics": [],
      "on_ally_foe": [
        {
          "op": "dmg",
          "t": "previous",
          "v": 1
        }
      ],
      "sprite": "Graphical Assets/Characters/Big Bad Wolf/Big Bad Wolf Mythic.png"
    },
    {
      "id": "adv_loup_fourrure",
      "name": "Loup - Garde à fourrure",
      "type": "ally",
      "cost": 3,
      "keys": [
        "Taunt",
        "Bouclier",
        "type:Loup"
      ],
      "text": "Provocation. Bouclier.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 2,
      "hp": 3,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Big Bad Wolf/Big Bad Wolf.png"
    },
    {
      "id": "adv_loup_flair",
      "name": "Loup - Flair",
      "type": "spell",
      "cost": 1,
      "keys": [
        "type:Loup"
      ],
      "text": "Piste 2 cartes de la main adverse. Pioche une carte.",
      "play": [
        {
          "op": "piste",
          "n": 2
        },
        {
          "op": "draw",
          "v": 1
        }
      ],
      "tiers": [
        {
          "lvl": 6,
          "cost": -1,
          "text": "coût -1"
        }
      ],
      "statics": [],
      "sprite": "Graphical Assets/Characters/Big Bad Wolf/Big Bad Wolf.png"
    },
    {
      "id": "adv_crapaud_bave",
      "name": "Crapaud - Bave",
      "type": "spell",
      "cost": 1,
      "keys": [
        "type:Grenouille"
      ],
      "text": "Pose 2 Toxines sur une unité adverse.",
      "play": [
        {
          "op": "toxine",
          "t": "enemyUnit",
          "v": 2
        }
      ],
      "tiers": [
        {
          "lvl": 3,
          "amp": 1,
          "text": "Effet +1"
        },
        {
          "lvl": 6,
          "cost": -1,
          "text": "coût -1"
        },
        {
          "lvl": 11,
          "amp": 2,
          "text": "Effet +2"
        }
      ],
      "statics": [],
      "sprite": "Graphical Assets/Characters/Frog/Frog Toad.png"
    },
    {
      "id": "adv_crapaud_tetard",
      "name": "Crapaud - Têtard venimeux",
      "type": "ally",
      "cost": 1,
      "keys": [
        "Venin",
        "type:Grenouille"
      ],
      "text": "Venin. Râle d’agonie : pose 1 Toxine sur une unité adverse au hasard.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 1,
      "hp": 1,
      "statics": [],
      "death": [
        {
          "op": "toxine",
          "t": "randomEnemyUnit",
          "v": 1
        }
      ],
      "sprite": "Graphical Assets/Characters/Frog/Frog Venomous.png"
    },
    {
      "id": "adv_crapaud_roi",
      "name": "Crapaud - Roi du marais",
      "type": "ally",
      "cost": 4,
      "keys": [
        "type:Grenouille"
      ],
      "text": "Tes Toxines en posent 1 de plus. Quand une unité adverse qui porte une Toxine meurt, pioche une carte.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 3,
      "hp": 4,
      "statics": [
        {
          "op": "montant_des_effets",
          "qui": "toi",
          "sens": "plus",
          "v": 1,
          "cible": "toxine",
          "zone": "toutes"
        }
      ],
      "on_unitToxinee_foe": [
        {
          "op": "draw",
          "v": 1
        }
      ],
      "sprite": "Graphical Assets/Characters/Frog/Frog.png"
    },
    {
      "id": "adv_pieuvre_ancre",
      "name": "Pieuvre - Ancre rouillée",
      "type": "ally",
      "cost": 3,
      "keys": [
        "Taunt",
        "type:Pieuvre"
      ],
      "text": "Provocation. Tes autres alliés ont +0/+1.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 2,
      "hp": 5,
      "statics": [],
      "aura": {
        "scope": "otherAllies",
        "atk": 0,
        "hp": 1,
        "key": ""
      },
      "sprite": "Graphical Assets/Characters/Octopus/Octopus Pirate.png"
    },
    {
      "id": "adv_pieuvre_encre",
      "name": "Pieuvre - Nuage d’encre",
      "type": "ally",
      "cost": 5,
      "keys": [
        "Taunt",
        "type:Pieuvre"
      ],
      "text": "Provocation. L’adversaire n’attaque pas avec plus de 2 unités par tour.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 3,
      "hp": 5,
      "statics": [
        {
          "op": "nombre_d_attaques",
          "qui": "adversaire",
          "v": 2
        }
      ],
      "sprite": "Graphical Assets/Characters/Octopus/Octopus.png"
    },
    {
      "id": "adv_pieuvre_tresor",
      "name": "Pieuvre - Coffre au trésor",
      "type": "spell",
      "cost": 2,
      "keys": [
        "type:Pieuvre"
      ],
      "text": "Gagne 4 d’armure. Pioche un allié de ton deck.",
      "play": [
        {
          "op": "armor",
          "v": 4
        },
        {
          "op": "pioche_une_carte_de_type",
          "type": "ally",
          "n": 1
        }
      ],
      "tiers": [
        {
          "lvl": 3,
          "amp": 1,
          "text": "Effet +1"
        },
        {
          "lvl": 6,
          "cost": -1,
          "text": "coût -1"
        },
        {
          "lvl": 11,
          "amp": 2,
          "text": "Effet +2"
        }
      ],
      "statics": [],
      "sprite": "Graphical Assets/Characters/Octopus/Octopus Pirate.png"
    },
    {
      "id": "adv_capitaine_abordage",
      "name": "Grenouille - À l’abordage",
      "type": "spell",
      "cost": 3,
      "keys": [
        "reprise",
        "type:Grenouille"
      ],
      "text": "Détruit une unité adverse. Reprise.",
      "play": [
        {
          "op": "detruit",
          "t": "enemyUnit"
        }
      ],
      "tiers": [
        {
          "lvl": 6,
          "cost": -1,
          "text": "coût -1"
        }
      ],
      "statics": [],
      "sprite": "Graphical Assets/Characters/Frog/Frog Captain.png"
    },
    {
      "id": "adv_capitaine_canonnade",
      "name": "Grenouille - Canonnade",
      "type": "spell",
      "cost": 4,
      "keys": [
        "type:Grenouille"
      ],
      "text": "3 dégâts à toutes les unités adverses.",
      "play": [
        {
          "op": "dmg",
          "t": "allEnemyUnits",
          "v": 3
        }
      ],
      "tiers": [
        {
          "lvl": 3,
          "amp": 1,
          "text": "Effet +1"
        },
        {
          "lvl": 6,
          "cost": -1,
          "text": "coût -1"
        },
        {
          "lvl": 11,
          "amp": 2,
          "text": "Effet +2"
        }
      ],
      "statics": [],
      "sprite": "Graphical Assets/Characters/Frog/Frog Captain.png"
    },
    {
      "id": "adv_capitaine_quartier",
      "name": "Grenouille - Quartier-maître",
      "type": "ally",
      "cost": 3,
      "keys": [
        "type:Grenouille"
      ],
      "text": "Cri de guerre : gagne 2 d’armure. Quand tu lances un sort depuis ta défausse, pioche une carte.",
      "play": [
        {
          "op": "armor",
          "v": 2
        }
      ],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 2,
      "hp": 4,
      "statics": [],
      "on_reprise_self": [
        {
          "op": "draw",
          "v": 1
        }
      ],
      "sprite": "Graphical Assets/Characters/Frog/Frog.png"
    },
    {
      "id": "adv_renard_bourrasque",
      "name": "Renard - Bourrasque",
      "type": "spell",
      "cost": 2,
      "keys": [
        "type:Renard"
      ],
      "text": "Renvoie une unité adverse dans la main de son propriétaire.",
      "play": [
        {
          "op": "renvoie_en_main",
          "d_ou": "plateau",
          "choix": "precise",
          "carte": "",
          "quoi": "all",
          "argCard": "",
          "t": "enemyUnit",
          "qui": "toi",
          "ordre": "hasard",
          "n": 1,
          "fatigue": false,
          "atk": 0,
          "hp": 0
        }
      ],
      "tiers": [
        {
          "lvl": 6,
          "cost": -1,
          "text": "coût -1"
        }
      ],
      "statics": [],
      "sprite": "Graphical Assets/Characters/Fox/Fox Snow.png"
    },
    {
      "id": "adv_renard_givre",
      "name": "Renard - Renard de givre",
      "type": "ally",
      "cost": 3,
      "keys": [
        "elusif",
        "type:Renard"
      ],
      "text": "Élusif. Cri de guerre : une unité adverse perd 2 d’attaque.",
      "play": [
        {
          "op": "buff",
          "t": "enemyUnit",
          "atk": -2,
          "hp": 0
        }
      ],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 3,
      "hp": 2,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Fox/Fox Snow.png"
    },
    {
      "id": "adv_renard_traque",
      "name": "Renard - Meneur de traque",
      "type": "ally",
      "cost": 4,
      "keys": [
        "Charge",
        "type:Renard"
      ],
      "text": "Charge. Quand une de tes unités attaque, elle gagne +1/+0.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 3,
      "hp": 3,
      "statics": [],
      "on_attack_self": [
        {
          "op": "buff",
          "t": "previous",
          "atk": 1,
          "hp": 0
        }
      ],
      "sprite": "Graphical Assets/Characters/Fox/Fox Wild.png"
    },
    {
      "id": "adv_duc_sentence",
      "name": "Hibou - Sentence",
      "type": "spell",
      "cost": 5,
      "keys": [
        "cout_x_de_moins_de_plus:moins:0:enemyUnits:",
        "type:Hibou"
      ],
      "text": "Coûte 1 de moins par unité adverse. Détruit une unité adverse.",
      "play": [
        {
          "op": "detruit",
          "t": "enemyUnit"
        }
      ],
      "tiers": [
        {
          "lvl": 6,
          "cost": -1,
          "text": "coût -1"
        }
      ],
      "statics": [],
      "sprite": "Graphical Assets/Characters/Owl/Owl Great Horned Owl.png"
    },
    {
      "id": "adv_duc_archiviste",
      "name": "Hibou - Archiviste",
      "type": "ally",
      "cost": 4,
      "keys": [
        "type:Oiseau",
        "type:Hibou"
      ],
      "text": "Tu pioches 1 carte de plus par tour.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 2,
      "hp": 5,
      "statics": [
        {
          "op": "pioche_du_tour",
          "qui": "toi",
          "sens": "plus",
          "v": 1
        }
      ],
      "sprite": "Graphical Assets/Characters/Owl/Owl Academic.png"
    },
    {
      "id": "adv_duc_eclipse",
      "name": "Hibou - Éclipse",
      "type": "ally",
      "cost": 6,
      "keys": [
        "type:Oiseau",
        "type:Hibou"
      ],
      "text": "L’adversaire a 1 mana de moins par tour.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 5,
      "hp": 6,
      "statics": [
        {
          "op": "mana_du_tour",
          "qui": "adversaire",
          "sens": "moins",
          "v": 1
        }
      ],
      "sprite": "Graphical Assets/Characters/Owl/Owl Cosmonaute.png"
    },
    {
      "id": "adv_paresseux_hamac",
      "name": "Paresseux - Hamac",
      "type": "ally",
      "cost": 2,
      "keys": [
        "Taunt",
        "type:Paresseux"
      ],
      "text": "Provocation. Fin de ton tour : soigne 2 PV à ton héros.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 1,
      "hp": 5,
      "statics": [],
      "turnEnd": [
        {
          "op": "heal",
          "t": "ownHero",
          "v": 2
        }
      ],
      "sprite": "Graphical Assets/Characters/Sloth/Sloth.png"
    },
    {
      "id": "adv_paresseux_sieste",
      "name": "Paresseux - Grande sieste",
      "type": "spell",
      "cost": 3,
      "keys": [
        "type:Paresseux"
      ],
      "text": "Gagne 5 d’armure. Tes alliés gagnent +0/+2.",
      "play": [
        {
          "op": "armor",
          "v": 5
        },
        {
          "op": "buff",
          "t": "allAllies",
          "atk": 0,
          "hp": 2
        }
      ],
      "tiers": [
        {
          "lvl": 3,
          "amp": 1,
          "text": "Effet +1"
        },
        {
          "lvl": 6,
          "cost": -1,
          "text": "coût -1"
        },
        {
          "lvl": 11,
          "amp": 2,
          "text": "Effet +2"
        }
      ],
      "statics": [],
      "sprite": "Graphical Assets/Characters/Sloth/Sloth CosmoSloth.png"
    },
    {
      "id": "adv_paresseux_coussin",
      "name": "Paresseux - Coussin géant",
      "type": "ally",
      "cost": 4,
      "keys": [
        "Taunt",
        "type:Paresseux"
      ],
      "text": "Provocation. Les dégâts subis par ton héros : 1 de moins.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 2,
      "hp": 6,
      "statics": [
        {
          "op": "degats_du_heros",
          "qui": "toi",
          "sens": "moins",
          "v": 1
        }
      ],
      "sprite": "Graphical Assets/Characters/Sloth/Sloth VolcanoSloth.png"
    },
    {
      "id": "adv_rougegorge_pique",
      "name": "Rouge-Gorge - Piqué",
      "type": "spell",
      "cost": 1,
      "keys": [
        "reprise",
        "type:Oiseau"
      ],
      "text": "2 dégâts au héros adverse. Reprise.",
      "play": [
        {
          "op": "dmg",
          "t": "enemyHero",
          "v": 2
        }
      ],
      "tiers": [
        {
          "lvl": 3,
          "amp": 1,
          "text": "Effet +1"
        },
        {
          "lvl": 6,
          "cost": -1,
          "text": "coût -1"
        },
        {
          "lvl": 11,
          "amp": 2,
          "text": "Effet +2"
        }
      ],
      "statics": [],
      "sprite": "Graphical Assets/Characters/Birds/Robin.png"
    },
    {
      "id": "adv_rougegorge_chant",
      "name": "Rouge-Gorge - Chant de l’aube",
      "type": "ally",
      "cost": 2,
      "keys": [
        "Charge",
        "type:Oiseau"
      ],
      "text": "Charge. Quand tu lances un sort, gagne +1/+0.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 2,
      "hp": 1,
      "statics": [],
      "on_spell_self": [
        {
          "op": "buff",
          "t": "self",
          "atk": 1,
          "hp": 0
        }
      ],
      "sprite": "Graphical Assets/Characters/Birds/Robin.png"
    },
    {
      "id": "adv_rougegorge_kamikaze",
      "name": "Rouge-Gorge - Kamikaze",
      "type": "ally",
      "cost": 1,
      "keys": [
        "Charge",
        "type:Oiseau"
      ],
      "text": "Charge. Râle d’agonie : 1 dégât au héros adverse.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 2,
      "hp": 1,
      "statics": [],
      "death": [
        {
          "op": "dmg",
          "t": "enemyHero",
          "v": 1
        }
      ],
      "sprite": "Graphical Assets/Characters/Birds/Robin.png"
    },
    {
      "id": "adv_kitsune_illusion",
      "name": "Kitsune - Illusion",
      "type": "spell",
      "cost": 2,
      "keys": [
        "type:Panda"
      ],
      "text": "Crée un Miroir en main. Pioche une carte.",
      "play": [
        {
          "op": "cree",
          "choix": "precise",
          "carte": "miroir",
          "quoi": "all",
          "argCard": "",
          "n": 1,
          "lvl": 1
        },
        {
          "op": "draw",
          "v": 1
        }
      ],
      "tiers": [
        {
          "lvl": 6,
          "cost": -1,
          "text": "coût -1"
        }
      ],
      "statics": [],
      "sprite": "Graphical Assets/Characters/Red Panda/Red Panda Kitsune.png"
    },
    {
      "id": "adv_kitsune_metamorphe",
      "name": "Kitsune - Métamorphe",
      "type": "ally",
      "cost": 3,
      "keys": [
        "type_tous"
      ],
      "text": "Type : tous. Cri de guerre : devient la copie d’une unité en jeu.",
      "play": [
        {
          "op": "copie",
          "t": "self",
          "d_ou": "plateau",
          "choix": "precise",
          "carte": "",
          "quoi": "all",
          "argCard": "",
          "tm": "anyUnit",
          "qui": "toi",
          "ordre": "hasard"
        }
      ],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 2,
      "hp": 2,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Red Panda/Red Panda.png"
    },
    {
      "id": "adv_kitsune_queues",
      "name": "Kitsune - Neuf Queues",
      "type": "ally",
      "cost": 7,
      "keys": [
        "cout_x_de_moins_de_plus:moins:0:spellsGame:",
        "type:Panda"
      ],
      "text": "Coûte 1 de moins par sort joué cette partie. Râle d’agonie : crée 2 sorts au hasard.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 5,
      "hp": 5,
      "statics": [],
      "death": [
        {
          "op": "cree",
          "choix": "hasard",
          "carte": "",
          "quoi": "spell",
          "argCard": "",
          "n": 2,
          "lvl": 1
        }
      ],
      "sprite": "Graphical Assets/Characters/Red Panda/Red Panda Kitsune.png"
    },
    {
      "id": "adv_chevre_rumination",
      "name": "Chèvre - Rumination",
      "type": "spell",
      "cost": 2,
      "keys": [
        "type:Chèvre"
      ],
      "text": "L’adversaire meule 2 cartes. Gagne 2 d’armure.",
      "play": [
        {
          "op": "met_a_la_defausse",
          "d_ou": "pioche",
          "choix": "precise",
          "carte": "",
          "quoi": "all",
          "argCard": "",
          "t": "enemyUnit",
          "qui": "adversaire",
          "ordre": "dessus",
          "n": 2
        },
        {
          "op": "armor",
          "v": 2
        }
      ],
      "tiers": [
        {
          "lvl": 3,
          "amp": 1,
          "text": "Effet +1"
        },
        {
          "lvl": 6,
          "cost": -1,
          "text": "coût -1"
        },
        {
          "lvl": 11,
          "amp": 2,
          "text": "Effet +2"
        }
      ],
      "statics": [],
      "sprite": "Graphical Assets/Characters/Goat/Goat.png"
    },
    {
      "id": "adv_chevre_bouquetin",
      "name": "Chèvre - Bouquetin obstiné",
      "type": "ally",
      "cost": 3,
      "keys": [
        "Taunt",
        "ex_libris",
        "type:Chèvre"
      ],
      "text": "Provocation. Ex-libris.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 2,
      "hp": 5,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Goat/Goat.png"
    },
    {
      "id": "adv_chevre_vieille",
      "name": "Chèvre - Vieille bique",
      "type": "ally",
      "cost": 5,
      "keys": [
        "type:Chèvre"
      ],
      "text": "Quand l’adversaire pioche dans la fatigue, il perd 2 PV.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 3,
      "hp": 6,
      "statics": [],
      "on_fatigue_foe": [
        {
          "op": "dmg",
          "t": "enemyHero",
          "v": 2
        }
      ],
      "sprite": "Graphical Assets/Characters/Goat/Goat.png"
    },
    {
      "id": "adv_chevre_mangetout",
      "name": "Chèvre - Mange-tout",
      "type": "ally",
      "cost": 2,
      "keys": [
        "type:Chèvre"
      ],
      "text": "Quand l’adversaire meule une carte, gagne +1/+1.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 2,
      "hp": 3,
      "statics": [],
      "on_meule_foe": [
        {
          "op": "buff",
          "t": "self",
          "atk": 1,
          "hp": 1
        }
      ],
      "sprite": "Graphical Assets/Characters/Goat/Goat.png"
    },
    {
      "id": "adv_robot_tentacule",
      "name": "Pieuvre - Tentacule mécanique",
      "type": "ally",
      "cost": 2,
      "keys": [
        "type:Pieuvre"
      ],
      "text": "Quand une unité adverse meurt, gagne +1/+1.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 2,
      "hp": 2,
      "statics": [],
      "on_unitDies_foe": [
        {
          "op": "buff",
          "t": "self",
          "atk": 1,
          "hp": 1
        }
      ],
      "sprite": "Graphical Assets/Characters/Octopus/Octopus Robot.png"
    },
    {
      "id": "adv_robot_recycleuse",
      "name": "Pieuvre - Recycleuse",
      "type": "ally",
      "cost": 4,
      "keys": [
        "type:Pieuvre"
      ],
      "text": "Cri de guerre : Charogne 2 (dévore les 2 dernières cartes de la défausse adverse).",
      "play": [
        {
          "op": "charogne",
          "n": 2,
          "t": "self"
        }
      ],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 3,
      "hp": 3,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Octopus/Octopus Robot.png"
    },
    {
      "id": "adv_robot_usine",
      "name": "Pieuvre - Chaîne de montage",
      "type": "spell",
      "cost": 5,
      "keys": [
        "type:Pieuvre"
      ],
      "text": "Pose sur le plateau 2 alliés au hasard de ta pioche.",
      "play": [
        {
          "op": "pose_sur_le_plateau",
          "d_ou": "pioche",
          "choix": "precise",
          "carte": "",
          "quoi": "ally",
          "typeDe": "ecrit",
          "typeQui": "toi",
          "argCard": "",
          "t": "enemyUnit",
          "qui": "toi",
          "ordre": "hasard",
          "n": 2,
          "fatigue": false,
          "atk": 0,
          "hp": 0
        }
      ],
      "tiers": [
        {
          "lvl": 6,
          "cost": -1,
          "text": "coût -1"
        }
      ],
      "statics": [],
      "sprite": "Graphical Assets/Characters/Octopus/Octopus Robot.png"
    },
    {
      "id": "adv_souris_souriceau",
      "name": "Souris - Souriceau",
      "type": "ally",
      "cost": 1,
      "keys": [
        "type:Souris"
      ],
      "text": "",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 1,
      "hp": 1,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Mouse/Mouse.png"
    },
    {
      "id": "adv_souris_grise",
      "name": "Souris - Souris grise",
      "type": "ally",
      "cost": 2,
      "keys": [
        "type:Souris"
      ],
      "text": "",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 2,
      "hp": 2,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Mouse/Mouse.png"
    },
    {
      "id": "adv_souris_tetue",
      "name": "Souris - Têtue",
      "type": "ally",
      "cost": 2,
      "keys": [
        "Taunt",
        "type:Souris"
      ],
      "text": "Provocation.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 1,
      "hp": 3,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Mouse/Mouse.png"
    },
    {
      "id": "adv_souris_rat",
      "name": "Souris - Rat des greniers",
      "type": "ally",
      "cost": 3,
      "keys": [
        "type:Souris"
      ],
      "text": "",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 3,
      "hp": 2,
      "statics": [],
      "sprite": "Graphical Assets/Characters/Mouse/Mouse.png"
    },
    {
      "id": "adv_souris_chef",
      "name": "Souris - Chef de bande",
      "type": "ally",
      "cost": 5,
      "keys": [
        "type:Souris"
      ],
      "text": "Tes autres Souris ont +1/+0.",
      "play": [],
      "tiers": [
        {
          "lvl": 2,
          "stats": {
            "atk": 0,
            "hp": 1
          },
          "text": "+0/+1"
        },
        {
          "lvl": 5,
          "stats": {
            "atk": 1,
            "hp": 0
          },
          "text": "+1/+0"
        },
        {
          "lvl": 10,
          "stats": {
            "atk": 1,
            "hp": 2
          },
          "text": "+1/+2"
        }
      ],
      "atk": 4,
      "hp": 4,
      "statics": [],
      "aura": {
        "scope": "sameTypeAllies",
        "atk": 1,
        "hp": 0,
        "key": ""
      },
      "sprite": "Graphical Assets/Characters/Mouse/Mouse.png"
    },
    {
      "id": "adv_souris_grignotage",
      "name": "Souris - Grignotage",
      "type": "spell",
      "cost": 1,
      "keys": [
        "type:Souris"
      ],
      "text": "Inflige 1 dégât à une unité adverse.",
      "play": [
        {
          "op": "dmg",
          "t": "enemyUnit",
          "v": 1
        }
      ],
      "tiers": [
        {
          "lvl": 3,
          "amp": 1,
          "text": "Effet +1"
        },
        {
          "lvl": 6,
          "cost": -1,
          "text": "Coût −1"
        },
        {
          "lvl": 11,
          "amp": 1,
          "text": "Effet +1"
        }
      ],
      "statics": [],
      "sprite": "Graphical Assets/Characters/Mouse/Mouse.png"
    }
  ],
  "npcs": [
    {
      "id": "rabbit1",
      "name": "Souris chapardeuses",
      "sprite": "Graphical Assets/Characters/Mouse/Mouse.png",
      "hp": 10,
      "mana": 5,
      "hand": 3,
      "level": 1,
      "ia": "naif",
      "deck": [
        {
          "card": "adv_souris_souriceau",
          "n": 5
        },
        {
          "card": "adv_souris_grise",
          "n": 5
        },
        {
          "card": "adv_souris_tetue",
          "n": 2
        },
        {
          "card": "adv_souris_grignotage",
          "n": 3
        },
        {
          "card": "adv_souris_rat",
          "n": 4
        },
        {
          "card": "adv_souris_chef",
          "n": 1
        }
      ]
    },
    {
      "id": "cat1",
      "name": "Chat de Ruelle",
      "sprite": "Graphical Assets/Characters/Cat/Cat Ginger.png",
      "hp": 24,
      "mana": 6,
      "hand": 3,
      "level": 1,
      "deck": [
        {
          "card": "grunt2",
          "n": 2
        },
        {
          "card": "rush1",
          "n": 4
        },
        {
          "card": "bolt",
          "n": 4
        },
        {
          "card": "card_i5eghg",
          "n": 3
        },
        {
          "card": "wall1",
          "n": 3
        },
        {
          "card": "card_ta7prz",
          "n": 2
        },
        {
          "card": "adv_chat_gouttiere",
          "n": 4
        },
        {
          "card": "adv_chat_caid",
          "n": 2
        },
        {
          "card": "adv_chat_course",
          "n": 3
        }
      ],
      "ia": "naif"
    },
    {
      "id": "crow1",
      "name": "Corbeau Rieur",
      "sprite": "Graphical Assets/Characters/Crow/Crow White.png",
      "hp": 26,
      "mana": 6,
      "hand": 4,
      "level": 1,
      "deck": [
        {
          "card": "grunt3",
          "n": 4
        },
        {
          "card": "bolt",
          "n": 4
        },
        {
          "card": "wall1",
          "n": 3
        },
        {
          "card": "card_y5uc9s",
          "n": 4
        },
        {
          "card": "adv_corbeau_glaneur",
          "n": 4
        },
        {
          "card": "adv_corbeau_nuee",
          "n": 3
        },
        {
          "card": "adv_corbeau_rire",
          "n": 3
        }
      ]
    },
    {
      "id": "wolf",
      "name": "Grand Mechant Loup",
      "sprite": "Graphical Assets/Characters/Big Bad Wolf/Big Bad Wolf.png",
      "hp": 42,
      "mana": 8,
      "hand": 4,
      "level": 1,
      "deck": [
        {
          "card": "grunt3",
          "n": 2
        },
        {
          "card": "wall2",
          "n": 1
        },
        {
          "card": "smash",
          "n": 1
        },
        {
          "card": "rally",
          "n": 1
        },
        {
          "card": "adv_loup_hurlement",
          "n": 1
        },
        {
          "card": "adv_loup_mere",
          "n": 1
        },
        {
          "card": "adv_loup_fourrure",
          "n": 2
        },
        {
          "card": "adv_loup_flair",
          "n": 1
        }
      ],
      "ia": "dur",
      "boss": true
    },
    {
      "id": "frog1",
      "name": "Crapaud Baveux",
      "sprite": "Graphical Assets/Characters/Frog/Frog Toad.png",
      "hp": 32,
      "mana": 7,
      "hand": 4,
      "level": 1,
      "deck": [
        {
          "card": "venomite",
          "n": 2
        },
        {
          "card": "grunt3",
          "n": 1
        },
        {
          "card": "card_urlyni",
          "n": 1
        },
        {
          "card": "adv_crapaud_bave",
          "n": 2
        },
        {
          "card": "adv_crapaud_tetard",
          "n": 2
        },
        {
          "card": "adv_crapaud_roi",
          "n": 1
        }
      ]
    },
    {
      "id": "octo1",
      "name": "Pieuvre Pirate",
      "sprite": "Graphical Assets/Characters/Octopus/Octopus Pirate.png",
      "hp": 36,
      "mana": 7,
      "hand": 4,
      "level": 1,
      "deck": [
        {
          "card": "grunt3",
          "n": 2
        },
        {
          "card": "grunt4",
          "n": 2
        },
        {
          "card": "smash",
          "n": 2
        },
        {
          "card": "wall1",
          "n": 1
        },
        {
          "card": "adv_pieuvre_ancre",
          "n": 2
        },
        {
          "card": "adv_pieuvre_encre",
          "n": 1
        },
        {
          "card": "adv_pieuvre_tresor",
          "n": 2
        }
      ]
    },
    {
      "id": "frogboss",
      "name": "Capitaine Grenouille",
      "sprite": "Graphical Assets/Characters/Frog/Frog Captain.png",
      "hp": 76,
      "mana": 9,
      "hand": 5,
      "level": 1,
      "deck": [
        {
          "card": "venomite",
          "n": 3
        },
        {
          "card": "wall2",
          "n": 3
        },
        {
          "card": "grunt4",
          "n": 3
        },
        {
          "card": "smash",
          "n": 2
        },
        {
          "card": "rally",
          "n": 2
        },
        {
          "card": "potion",
          "n": 1
        },
        {
          "card": "card_viekke",
          "n": 1
        },
        {
          "card": "card_winkd1",
          "n": 1
        },
        {
          "card": "adv_capitaine_abordage",
          "n": 2
        },
        {
          "card": "adv_capitaine_canonnade",
          "n": 1
        },
        {
          "card": "adv_capitaine_quartier",
          "n": 2
        }
      ],
      "ia": "dur",
      "boss": true
    },
    {
      "id": "fox1",
      "name": "Renard des Neiges",
      "sprite": "Graphical Assets/Characters/Fox/Fox Snow.png",
      "hp": 40,
      "mana": 8,
      "hand": 4,
      "level": 1,
      "deck": [
        {
          "card": "rush1",
          "n": 3
        },
        {
          "card": "grunt4",
          "n": 2
        },
        {
          "card": "smash",
          "n": 2
        },
        {
          "card": "grunt3",
          "n": 2
        },
        {
          "card": "adv_renard_bourrasque",
          "n": 2
        },
        {
          "card": "adv_renard_givre",
          "n": 2
        },
        {
          "card": "adv_renard_traque",
          "n": 2
        }
      ]
    },
    {
      "id": "owlboss",
      "name": "Grand-Duc",
      "sprite": "Graphical Assets/Characters/Owl/Owl Great Horned Owl.png",
      "hp": 105,
      "mana": 10,
      "hand": 5,
      "level": 1,
      "deck": [
        {
          "card": "wall2",
          "n": 4
        },
        {
          "card": "grunt4",
          "n": 4
        },
        {
          "card": "smash",
          "n": 3
        },
        {
          "card": "rally",
          "n": 2
        },
        {
          "card": "potion",
          "n": 2
        },
        {
          "card": "card_viekke",
          "n": 3
        },
        {
          "card": "card_4vap0r",
          "n": 1
        },
        {
          "card": "adv_duc_sentence",
          "n": 2
        },
        {
          "card": "adv_duc_archiviste",
          "n": 2
        },
        {
          "card": "adv_duc_eclipse",
          "n": 1
        }
      ],
      "ia": "dur",
      "boss": true
    }
  ],
  "characters": [
    {
      "id": "lapin1",
      "name": "Pompon",
      "species": "Lapin",
      "sprite": "Graphical Assets/Characters/Rabbit/Rabbit.png",
      "role": "Le premier compagnon — Aggro simple : poser, attaquer, grandir ensemble",
      "stats": {
        "hp": 20,
        "mana": 5,
        "hand": 3
      },
      "cards": [
        {
          "id": "lap1_lapereau",
          "name": "Lapereau",
          "type": "ally",
          "cost": 1,
          "keys": [
            "type:Lapin"
          ],
          "text": "",
          "play": [],
          "tiers": [
            {
              "lvl": 3,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "buff",
                "t": "randomAllyUnit",
                "atk": 1,
                "hp": 1
              },
              "slot": "death",
              "text": "Râle d’agonie : un de tes alliés au hasard gagne +1/+1."
            },
            {
              "lvl": 14,
              "key": "Charge",
              "text": "Gagne Charge."
            }
          ],
          "atk": 1,
          "hp": 1,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 1/Lapereau.png"
        },
        {
          "id": "lap1_pres",
          "name": "Lapin des Prés",
          "type": "ally",
          "cost": 1,
          "keys": [
            "type:Lapin"
          ],
          "text": "",
          "play": [],
          "tiers": [
            {
              "lvl": 5,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "buff",
                "t": "randomAllyUnit",
                "atk": 1,
                "hp": 0
              },
              "text": "Cri de guerre : un de tes alliés au hasard gagne +1/+0."
            },
            {
              "lvl": 13,
              "extra": {
                "op": "buff",
                "t": "self",
                "atk": 1,
                "hp": 1
              },
              "slot": "turnEnd",
              "text": "Fin de ton tour : gagne +1/+1."
            }
          ],
          "atk": 1,
          "hp": 1,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 1/Lapin des Près.png"
        },
        {
          "id": "lap1_garenne",
          "name": "Lapin Voleur",
          "type": "ally",
          "cost": 2,
          "keys": [
            "type:Lapin"
          ],
          "text": "",
          "play": [],
          "tiers": [
            {
              "lvl": 4,
              "key": "Charge",
              "text": "Gagne Charge."
            },
            {
              "lvl": 10,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Lapereau",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Lapin"
                  ],
                  "statics": []
                }
              },
              "slot": "death",
              "text": "Râle d’agonie : invoque un Lapereau 1/1."
            },
            {
              "lvl": 15,
              "aura": {
                "key": "",
                "atk": 0,
                "hp": 1,
                "scope": "otherAllies"
              },
              "text": "Aura : tes autres unités ont +0/+1."
            }
          ],
          "atk": 2,
          "hp": 2,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 1/Lapin Voleur.png"
        },
        {
          "id": "lap1_costaud",
          "name": "Lapin Costaud",
          "type": "ally",
          "cost": 3,
          "keys": [
            "type:Lapin"
          ],
          "text": "",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 1,
                "hp": 1
              },
              "text": "+1/+1"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "buff",
                "t": "allAllies",
                "atk": 1,
                "hp": 0
              },
              "text": "Cri de guerre : tes autres unités gagnent +1/+0."
            },
            {
              "lvl": 12,
              "key": "Taunt",
              "text": "Gagne Provocation."
            },
            {
              "lvl": 19,
              "extra": {
                "op": "buff",
                "t": "allAllies",
                "atk": 1,
                "hp": 0
              },
              "slot": "turnEnd",
              "text": "Fin de ton tour : tes autres unités gagnent +1/+0."
            }
          ],
          "atk": 3,
          "hp": 3,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 1/Lapin Costaud.png"
        },
        {
          "id": "lap1_grandpere",
          "name": "Grand-Père Lapin",
          "type": "ally",
          "cost": 5,
          "keys": [
            "type:Lapin"
          ],
          "text": "Tes autres unités ont +1/+1.",
          "play": [],
          "tiers": [
            {
              "lvl": 6,
              "key": "Taunt",
              "text": "Gagne Provocation."
            },
            {
              "lvl": 11,
              "extra": {
                "op": "summon",
                "n": 2,
                "unit": {
                  "name": "Lapereau",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Lapin"
                  ],
                  "statics": []
                }
              },
              "text": "Cri de guerre : invoque deux Lapereaux 1/1."
            },
            {
              "lvl": 16,
              "aura": {
                "key": "",
                "atk": 0,
                "hp": 1,
                "scope": "otherAllies"
              },
              "text": "Aura : tes autres unités ont +0/+1 de plus."
            },
            {
              "lvl": 17,
              "aura": {
                "key": "",
                "atk": 1,
                "hp": 0,
                "scope": "otherAllies"
              },
              "text": "Aura : tes autres unités ont +1/+0 de plus."
            }
          ],
          "atk": 5,
          "hp": 5,
          "statics": [],
          "aura": {
            "scope": "otherAllies",
            "atk": 1,
            "hp": 1,
            "key": ""
          },
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 1/Grand-Père Lapin.png"
        }
      ],
      "switches": [
        {
          "id": "lap1_hardi",
          "name": "Lapin Hardi",
          "type": "ally",
          "cost": 1,
          "keys": [
            "type:Lapin"
          ],
          "text": "",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "key": "Charge",
              "text": "Gagne Charge."
            },
            {
              "lvl": 8,
              "extra": {
                "op": "dmg",
                "t": "randomEnemyAny",
                "v": 1
              },
              "slot": "death",
              "text": "Râle d’agonie : inflige 1 dégât à un ennemi au hasard."
            },
            {
              "lvl": 15,
              "extra": {
                "op": "buff",
                "t": "self",
                "atk": 1,
                "hp": 0
              },
              "slot": "turnStart",
              "text": "Début de ton tour : gagne +1/+0."
            }
          ],
          "atk": 2,
          "hp": 1,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 1/Lapin Hardi.png"
        },
        {
          "id": "lap1_coureur",
          "name": "Lapin Coureur",
          "type": "ally",
          "cost": 1,
          "keys": [
            "Charge",
            "type:Lapin"
          ],
          "text": "Charge.",
          "play": [],
          "tiers": [
            {
              "lvl": 3,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "dmg",
                "t": "randomEnemyUnit",
                "v": 1
              },
              "text": "Cri de guerre : inflige 1 dégât à une unité adverse au hasard."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Lapereau",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Lapin"
                  ],
                  "statics": []
                }
              },
              "slot": "death",
              "text": "Râle d’agonie : invoque un Lapereau 1/1."
            }
          ],
          "atk": 1,
          "hp": 1,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 1/Lapin Coureur.png"
        },
        {
          "id": "lap1_bagarreur",
          "name": "Lapin Bagarreur",
          "type": "ally",
          "cost": 2,
          "keys": [
            "type:Lapin"
          ],
          "text": "",
          "play": [],
          "tiers": [
            {
              "lvl": 5,
              "stats": {
                "atk": 0,
                "hp": 2
              },
              "text": "+0/+2"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "buff",
                "t": "randomAllyUnit",
                "atk": 1,
                "hp": 0
              },
              "slot": "turnEnd",
              "text": "Fin de ton tour : un de tes alliés au hasard gagne +1/+0."
            },
            {
              "lvl": 14,
              "key": "Bouclier",
              "text": "Gagne Bouclier."
            }
          ],
          "atk": 3,
          "hp": 1,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 1/Lapin Bagarreur.png"
        },
        {
          "id": "lap1_bondissant",
          "name": "Lapin Nomade",
          "type": "ally",
          "cost": 3,
          "keys": [
            "Charge",
            "type:Lapin"
          ],
          "text": "Charge.",
          "play": [],
          "tiers": [
            {
              "lvl": 6,
              "stats": {
                "atk": 1,
                "hp": 1
              },
              "text": "+1/+1"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "buff",
                "t": "randomAllyUnit",
                "atk": 1,
                "hp": 1
              },
              "text": "Cri de guerre : un de tes alliés au hasard gagne +1/+1."
            },
            {
              "lvl": 13,
              "extra": {
                "op": "summon",
                "n": 2,
                "unit": {
                  "name": "Lapereau",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Lapin"
                  ],
                  "statics": []
                }
              },
              "slot": "death",
              "text": "Râle d’agonie : invoque deux Lapereaux 1/1."
            },
            {
              "lvl": 20,
              "aura": {
                "key": "",
                "atk": 1,
                "hp": 0,
                "scope": "otherAllies"
              },
              "text": "Aura : tes autres unités ont +1/+0."
            }
          ],
          "atk": 3,
          "hp": 2,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 2/Lapin Nomade.png"
        },
        {
          "id": "lap1_chef",
          "name": "Chef de Clapier",
          "type": "ally",
          "cost": 5,
          "keys": [
            "type:Lapin"
          ],
          "text": "Cri de guerre : tes autres unités gagnent +1/+1.",
          "play": [
            {
              "op": "buff",
              "t": "allAllies",
              "atk": 1,
              "hp": 1
            }
          ],
          "tiers": [
            {
              "lvl": 4,
              "key": "Taunt",
              "text": "Gagne Provocation."
            },
            {
              "lvl": 11,
              "extra": {
                "op": "buff",
                "t": "allAllies",
                "atk": 1,
                "hp": 1
              },
              "slot": "death",
              "text": "Râle d’agonie : tes unités gagnent +1/+1."
            },
            {
              "lvl": 16,
              "amp": 1,
              "text": "Cri de guerre : +2/+2 au lieu de +1/+1."
            },
            {
              "lvl": 18,
              "aura": {
                "key": "",
                "atk": 1,
                "hp": 1,
                "scope": "otherAllies"
              },
              "text": "Aura : tes autres unités ont +1/+1."
            }
          ],
          "atk": 4,
          "hp": 4,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 1/Chef de Clapier.png"
        }
      ]
    },
    {
      "id": "lapin2",
      "name": "Caramel",
      "species": "Lapin",
      "sprite": "Graphical Assets/Characters/Rabbit/Rabbit English Lop.png",
      "role": "Le gardien — tenir : l’endurance et la Provocation",
      "stats": {
        "hp": 24,
        "mana": 5,
        "hand": 3
      },
      "cards": [
        {
          "id": "lap2_nain",
          "name": "Lapin Nain",
          "type": "ally",
          "cost": 1,
          "keys": [
            "type:Lapin"
          ],
          "text": "",
          "play": [],
          "tiers": [
            {
              "lvl": 3,
              "key": "Taunt",
              "text": "Gagne Provocation."
            },
            {
              "lvl": 8,
              "extra": {
                "op": "heal",
                "t": "ownHero",
                "v": 2
              },
              "slot": "death",
              "text": "Râle d’agonie : ton héros gagne 2 PV."
            },
            {
              "lvl": 13,
              "extra": {
                "op": "heal",
                "t": "ownHero",
                "v": 1
              },
              "slot": "turnEnd",
              "text": "Fin de ton tour : ton héros gagne 1 PV."
            }
          ],
          "atk": 1,
          "hp": 2,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 2/Lapin Nain.png"
        },
        {
          "id": "lap2_gardien",
          "name": "Gardien du Clapier",
          "type": "ally",
          "cost": 1,
          "keys": [
            "Taunt",
            "type:Lapin"
          ],
          "text": "Provocation.",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 0,
                "hp": 2
              },
              "text": "+0/+2"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "buff",
                "t": "self",
                "atk": 0,
                "hp": 1
              },
              "slot": "turnStart",
              "text": "Début de ton tour : gagne +0/+1."
            },
            {
              "lvl": 14,
              "key": "Bouclier",
              "text": "Gagne Bouclier."
            }
          ],
          "atk": 1,
          "hp": 2,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 2/Gardien du Clapier.png"
        },
        {
          "id": "lap2_oreilles",
          "name": "Lapin Boulanger",
          "type": "ally",
          "cost": 2,
          "keys": [
            "Taunt",
            "type:Lapin"
          ],
          "text": "Provocation.",
          "play": [],
          "tiers": [
            {
              "lvl": 4,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "buff",
                "t": "randomAllyUnit",
                "atk": 0,
                "hp": 2
              },
              "text": "Cri de guerre : un de tes alliés au hasard gagne +0/+2."
            },
            {
              "lvl": 12,
              "aura": {
                "key": "",
                "atk": 0,
                "hp": 1,
                "scope": "otherAllies"
              },
              "text": "Aura : tes autres unités ont +0/+1."
            }
          ],
          "atk": 1,
          "hp": 3,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 1/Lapin Boulanger.png"
        },
        {
          "id": "lap2_grange",
          "name": "Lapin de Grange",
          "type": "ally",
          "cost": 3,
          "keys": [
            "type:Lapin"
          ],
          "text": "",
          "play": [],
          "tiers": [
            {
              "lvl": 5,
              "key": "Taunt",
              "text": "Gagne Provocation."
            },
            {
              "lvl": 10,
              "extra": {
                "op": "heal",
                "t": "ownHero",
                "v": 2
              },
              "slot": "turnEnd",
              "text": "Fin de ton tour : ton héros gagne 2 PV."
            },
            {
              "lvl": 15,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Lapin de Garde",
                  "atk": 2,
                  "hp": 2,
                  "keys": [
                    "Taunt",
                    "type:Lapin"
                  ],
                  "statics": []
                }
              },
              "slot": "death",
              "text": "Râle d’agonie : invoque un Lapin de Garde 2/2 avec Provocation."
            },
            {
              "lvl": 19,
              "aura": {
                "key": "",
                "atk": 0,
                "hp": 2,
                "scope": "otherAllies"
              },
              "text": "Aura : tes autres unités ont +0/+2."
            }
          ],
          "atk": 2,
          "hp": 4,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 2/Lapin de Grange.png"
        },
        {
          "id": "lap2_doyenne",
          "name": "Doyenne du Clapier",
          "type": "ally",
          "cost": 5,
          "keys": [
            "Taunt",
            "type:Lapin"
          ],
          "text": "Provocation. Tes autres unités ont +0/+2.",
          "play": [],
          "tiers": [
            {
              "lvl": 6,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "heal",
                "t": "ownHero",
                "v": 2
              },
              "slot": "turnStart",
              "text": "Début de ton tour : ton héros gagne 2 PV."
            },
            {
              "lvl": 16,
              "aura": {
                "key": "",
                "atk": 1,
                "hp": 0,
                "scope": "otherAllies"
              },
              "text": "Aura : tes autres unités ont aussi +1/+0."
            },
            {
              "lvl": 17,
              "extra": {
                "op": "buff",
                "t": "allAllies",
                "atk": 0,
                "hp": 1
              },
              "slot": "turnEnd",
              "text": "Fin de ton tour : tes autres unités gagnent +0/+1."
            }
          ],
          "atk": 3,
          "hp": 7,
          "statics": [],
          "aura": {
            "scope": "otherAllies",
            "atk": 0,
            "hp": 2,
            "key": ""
          },
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 2/Doyenne du Clapier.png"
        }
      ],
      "switches": [
        {
          "id": "lap2_angora",
          "name": "Lapin Infirmier",
          "type": "ally",
          "cost": 1,
          "keys": [
            "type:Lapin"
          ],
          "text": "Cri de guerre : ton héros gagne 2 PV.",
          "play": [
            {
              "op": "heal",
              "t": "ownHero",
              "v": 2
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "heal",
                "t": "ownHero",
                "v": 2
              },
              "slot": "death",
              "text": "Râle d’agonie : ton héros gagne 2 PV."
            },
            {
              "lvl": 14,
              "key": "Taunt",
              "text": "Gagne Provocation."
            }
          ],
          "atk": 1,
          "hp": 1,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 2/Lapin Infirmier.png"
        },
        {
          "id": "lap2_sentinelle",
          "name": "Lapin Soldat",
          "type": "ally",
          "cost": 1,
          "keys": [
            "Taunt",
            "type:Lapin"
          ],
          "text": "Provocation.",
          "play": [],
          "tiers": [
            {
              "lvl": 3,
              "key": "Bouclier",
              "text": "Gagne Bouclier."
            },
            {
              "lvl": 9,
              "extra": {
                "op": "buff",
                "t": "randomAllyUnit",
                "atk": 0,
                "hp": 2
              },
              "slot": "death",
              "text": "Râle d’agonie : un de tes alliés au hasard gagne +0/+2."
            },
            {
              "lvl": 13,
              "extra": {
                "op": "buff",
                "t": "self",
                "atk": 1,
                "hp": 0
              },
              "slot": "turnStart",
              "text": "Début de ton tour : gagne +1/+0."
            }
          ],
          "atk": 2,
          "hp": 1,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 2/Lapin Soldat.png"
        },
        {
          "id": "lap2_tetu",
          "name": "Lapin Têtu",
          "type": "ally",
          "cost": 2,
          "keys": [
            "type:Lapin"
          ],
          "text": "",
          "play": [],
          "tiers": [
            {
              "lvl": 4,
              "key": "Taunt",
              "text": "Gagne Provocation."
            },
            {
              "lvl": 8,
              "extra": {
                "op": "buff",
                "t": "self",
                "atk": 0,
                "hp": 1
              },
              "slot": "turnEnd",
              "text": "Fin de ton tour : gagne +0/+1."
            },
            {
              "lvl": 15,
              "aura": {
                "key": "",
                "atk": 0,
                "hp": 1,
                "scope": "otherAllies"
              },
              "text": "Aura : tes autres unités ont +0/+1."
            }
          ],
          "atk": 2,
          "hp": 3,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 2/Lapin Avocat.png"
        },
        {
          "id": "lap2_cuirasse",
          "name": "Lapin Cuirassé",
          "type": "ally",
          "cost": 3,
          "keys": [
            "Bouclier",
            "type:Lapin"
          ],
          "text": "Bouclier.",
          "play": [],
          "tiers": [
            {
              "lvl": 5,
              "stats": {
                "atk": 1,
                "hp": 1
              },
              "text": "+1/+1"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Lapin de Garde",
                  "atk": 2,
                  "hp": 2,
                  "keys": [
                    "Taunt",
                    "type:Lapin"
                  ],
                  "statics": []
                }
              },
              "slot": "death",
              "text": "Râle d’agonie : invoque un Lapin de Garde 2/2 avec Provocation."
            },
            {
              "lvl": 12,
              "key": "Taunt",
              "text": "Gagne Provocation."
            },
            {
              "lvl": 20,
              "extra": {
                "op": "buff",
                "t": "allAllies",
                "atk": 0,
                "hp": 1
              },
              "slot": "turnStart",
              "text": "Début de ton tour : tes autres unités gagnent +0/+1."
            }
          ],
          "atk": 2,
          "hp": 3,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 2/Lapin Cuirassé.png"
        },
        {
          "id": "lap2_belier",
          "name": "Grand Bélier",
          "type": "ally",
          "cost": 5,
          "keys": [
            "Taunt",
            "type:Lapin"
          ],
          "text": "Provocation. Cri de guerre : tes autres unités gagnent +0/+2.",
          "play": [
            {
              "op": "buff",
              "t": "allAllies",
              "atk": 0,
              "hp": 2
            }
          ],
          "tiers": [
            {
              "lvl": 6,
              "key": "Bouclier",
              "text": "Gagne Bouclier."
            },
            {
              "lvl": 11,
              "extra": {
                "op": "buff",
                "t": "allAllies",
                "atk": 0,
                "hp": 2
              },
              "slot": "death",
              "text": "Râle d’agonie : tes unités gagnent +0/+2."
            },
            {
              "lvl": 16,
              "aura": {
                "key": "",
                "atk": 0,
                "hp": 1,
                "scope": "otherAllies"
              },
              "text": "Aura : tes autres unités ont +0/+1."
            },
            {
              "lvl": 18,
              "aura": {
                "key": "Taunt",
                "atk": 0,
                "hp": 0,
                "scope": "otherAllies"
              },
              "text": "Aura : tes autres unités ont Provocation."
            }
          ],
          "atk": 4,
          "hp": 6,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 2/Grand Bélier.png"
        }
      ]
    },
    {
      "id": "lapin3",
      "name": "Séléné",
      "species": "Lapin",
      "sprite": "Graphical Assets/Characters/Rabbit/Rabbit Wherewolf.png",
      "role": "La portée — Go Wide : les moments d’une carte et les sorts",
      "stats": {
        "hp": 22,
        "mana": 5,
        "hand": 3
      },
      "cards": [
        {
          "id": "lap3_prolifique",
          "name": "Lapine Mère",
          "type": "ally",
          "cost": 1,
          "keys": [
            "type:Lapin"
          ],
          "text": "Râle d’agonie : invoque un Lapereau 1/1.",
          "play": [],
          "tiers": [
            {
              "lvl": 3,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Lapereau",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Lapin"
                  ],
                  "statics": []
                }
              },
              "text": "Cri de guerre : invoque un Lapereau 1/1."
            },
            {
              "lvl": 14,
              "aura": {
                "key": "",
                "atk": 1,
                "hp": 0,
                "scope": "sameTypeAllies"
              },
              "text": "Aura : tes autres Lapins ont +1/+0."
            }
          ],
          "atk": 1,
          "hp": 1,
          "statics": [],
          "death": [
            {
              "op": "summon",
              "n": 1,
              "unit": {
                "name": "Lapereau",
                "atk": 1,
                "hp": 1,
                "keys": [
                  "type:Lapin"
                ],
                "statics": []
              }
            }
          ],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 3/Lapine Mère.png"
        },
        {
          "id": "lap3_trefle",
          "name": "Festin de Trèfle",
          "type": "spell",
          "cost": 1,
          "keys": [
            "type:Lapin"
          ],
          "text": "Un de tes alliés gagne +2/+1.",
          "play": [
            {
              "op": "buff",
              "t": "allyUnit",
              "atk": 2,
              "hp": 1
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "amp": 1,
              "text": "Effet +1 : +3/+2."
            },
            {
              "lvl": 7,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Lapereau",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Lapin"
                  ],
                  "statics": []
                }
              },
              "text": "Invoque aussi un Lapereau 1/1."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "buff",
                "t": "previous",
                "atk": 0,
                "hp": 0,
                "key": "Charge"
              },
              "text": "L’allié renforcé gagne aussi Charge."
            }
          ],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 3/Festin de Trèfle.png"
        },
        {
          "id": "lap3_portee",
          "name": "Portée de Lapereaux",
          "type": "spell",
          "cost": 2,
          "keys": [
            "type:Lapin"
          ],
          "text": "Invoque deux Lapereaux 1/1.",
          "play": [
            {
              "op": "summon",
              "n": 2,
              "unit": {
                "name": "Lapereau",
                "atk": 1,
                "hp": 1,
                "keys": [
                  "type:Lapin"
                ],
                "statics": []
              }
            }
          ],
          "tiers": [
            {
              "lvl": 4,
              "cost": -1,
              "text": "Coût −1"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Lapin de Garde",
                  "atk": 2,
                  "hp": 2,
                  "keys": [
                    "Taunt",
                    "type:Lapin"
                  ],
                  "statics": []
                }
              },
              "text": "Invoque aussi un Lapin de Garde 2/2 avec Provocation."
            },
            {
              "lvl": 13,
              "extra": {
                "op": "buff",
                "t": "allyType:Lapin",
                "atk": 1,
                "hp": 0
              },
              "text": "Tes Lapins gagnent ensuite +1/+0."
            }
          ],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 3/Portée de Lapereaux.png"
        },
        {
          "id": "lap3_lune",
          "name": "Lapin de Pleine Lune",
          "type": "ally",
          "cost": 4,
          "keys": [
            "type:Lapin"
          ],
          "text": "Début de ton tour : gagne +1/+1.",
          "play": [],
          "tiers": [
            {
              "lvl": 5,
              "key": "Charge",
              "text": "Gagne Charge."
            },
            {
              "lvl": 10,
              "extra": {
                "op": "summon",
                "n": 2,
                "unit": {
                  "name": "Lapereau",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Lapin"
                  ],
                  "statics": []
                }
              },
              "slot": "death",
              "text": "Râle d’agonie : invoque deux Lapereaux 1/1."
            },
            {
              "lvl": 15,
              "aura": {
                "key": "",
                "atk": 0,
                "hp": 1,
                "scope": "sameTypeAllies"
              },
              "text": "Aura : tes autres Lapins ont +0/+1."
            },
            {
              "lvl": 19,
              "extra": {
                "op": "buff",
                "t": "allyType:Lapin",
                "atk": 1,
                "hp": 1
              },
              "slot": "turnStart",
              "text": "Début de ton tour : tes Lapins gagnent +1/+1."
            }
          ],
          "atk": 3,
          "hp": 3,
          "statics": [],
          "turnStart": [
            {
              "op": "buff",
              "t": "self",
              "atk": 1,
              "hp": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 3/Lapin de Pleine Lune.png"
        },
        {
          "id": "lap3_reine",
          "name": "Reine de Pleine Lune",
          "type": "ally",
          "cost": 5,
          "keys": [
            "type:Lapin"
          ],
          "text": "Fin de ton tour : invoque un Lapereau 1/1.",
          "play": [],
          "tiers": [
            {
              "lvl": 6,
              "stats": {
                "atk": 0,
                "hp": 2
              },
              "text": "+0/+2"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Lapereau",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Lapin"
                  ],
                  "statics": []
                }
              },
              "text": "Cri de guerre : invoque un Lapereau 1/1."
            },
            {
              "lvl": 16,
              "extra": {
                "op": "buff",
                "t": "allyType:Lapin",
                "atk": 1,
                "hp": 0
              },
              "slot": "turnStart",
              "text": "Début de ton tour : tes Lapins gagnent +1/+0."
            },
            {
              "lvl": 17,
              "aura": {
                "key": "",
                "atk": 1,
                "hp": 1,
                "scope": "sameTypeAllies"
              },
              "text": "Aura : tes autres Lapins ont +1/+1."
            }
          ],
          "atk": 4,
          "hp": 4,
          "statics": [],
          "turnEnd": [
            {
              "op": "summon",
              "n": 1,
              "unit": {
                "name": "Lapereau",
                "atk": 1,
                "hp": 1,
                "keys": [
                  "type:Lapin"
                ],
                "statics": []
              }
            }
          ],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 3/Reine de Pleine Lune.png"
        }
      ],
      "switches": [
        {
          "id": "lap3_farceur",
          "name": "Lapereau Farceur",
          "type": "ally",
          "cost": 1,
          "keys": [
            "type:Lapin"
          ],
          "text": "Râle d’agonie : inflige 1 dégât à un ennemi au hasard.",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "dmg",
                "t": "randomEnemyUnit",
                "v": 1
              },
              "text": "Cri de guerre : inflige 1 dégât à une unité adverse au hasard."
            },
            {
              "lvl": 13,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Lapereau",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Lapin"
                  ],
                  "statics": []
                }
              },
              "slot": "death",
              "text": "Râle d’agonie : invoque aussi un Lapereau 1/1."
            }
          ],
          "atk": 1,
          "hp": 1,
          "statics": [],
          "death": [
            {
              "op": "dmg",
              "t": "randomEnemyAny",
              "v": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 3/Lapereau Farceur.png"
        },
        {
          "id": "lap3_quatre",
          "name": "Trèfle à Quatre Feuilles",
          "type": "spell",
          "cost": 1,
          "keys": [
            "type:Lapin"
          ],
          "text": "Tes unités gagnent +1/+0.",
          "play": [
            {
              "op": "buff",
              "t": "allAllies",
              "atk": 1,
              "hp": 0
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "amp": 1,
              "text": "Effet +1 : +2/+0."
            },
            {
              "lvl": 9,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Lapereau",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Lapin"
                  ],
                  "statics": []
                }
              },
              "text": "Invoque ensuite un Lapereau 1/1."
            },
            {
              "lvl": 14,
              "extra": {
                "op": "buff",
                "t": "allAllies",
                "atk": 0,
                "hp": 1
              },
              "text": "Tes unités gagnent aussi +0/+1."
            }
          ],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 3/Trèfle à Quatre Feuilles.png"
        },
        {
          "id": "lap3_terrier",
          "name": "Terrier Secret",
          "type": "spell",
          "cost": 2,
          "keys": [
            "type:Lapin"
          ],
          "text": "Invoque un Lapin de Garde 2/2 avec Provocation.",
          "play": [
            {
              "op": "summon",
              "n": 1,
              "unit": {
                "name": "Lapin de Garde",
                "atk": 2,
                "hp": 2,
                "keys": [
                  "Taunt",
                  "type:Lapin"
                ],
                "statics": []
              }
            }
          ],
          "tiers": [
            {
              "lvl": 4,
              "cost": -1,
              "text": "Coût −1"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Lapereau",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Lapin"
                  ],
                  "statics": []
                }
              },
              "text": "Invoque aussi un Lapereau 1/1."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "buff",
                "t": "allyType:Lapin",
                "atk": 0,
                "hp": 1
              },
              "text": "Tes Lapins gagnent ensuite +0/+1."
            }
          ],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 3/Terrier Secret.png"
        },
        {
          "id": "lap3_mars",
          "name": "Lapin Duelliste",
          "type": "ally",
          "cost": 4,
          "keys": [
            "type:Lapin"
          ],
          "text": "Cri de guerre : invoque deux Lapereaux 1/1.",
          "play": [
            {
              "op": "summon",
              "n": 2,
              "unit": {
                "name": "Lapereau",
                "atk": 1,
                "hp": 1,
                "keys": [
                  "type:Lapin"
                ],
                "statics": []
              }
            }
          ],
          "tiers": [
            {
              "lvl": 5,
              "stats": {
                "atk": 1,
                "hp": 1
              },
              "text": "+1/+1"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Lapereau",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Lapin"
                  ],
                  "statics": []
                }
              },
              "slot": "death",
              "text": "Râle d’agonie : invoque un Lapereau 1/1."
            },
            {
              "lvl": 15,
              "key": "Taunt",
              "text": "Gagne Provocation."
            },
            {
              "lvl": 20,
              "aura": {
                "key": "",
                "atk": 1,
                "hp": 0,
                "scope": "sameTypeAllies"
              },
              "text": "Aura : tes autres Lapins ont +1/+0."
            }
          ],
          "atk": 2,
          "hp": 2,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 3/Lapin Duelliste.png"
        },
        {
          "id": "lap3_eclipse",
          "name": "Lapin d’Éclipse",
          "type": "ally",
          "cost": 5,
          "keys": [
            "type:Lapin"
          ],
          "text": "Râle d’agonie : invoque trois Lapereaux 1/1.",
          "play": [],
          "tiers": [
            {
              "lvl": 6,
              "key": "Taunt",
              "text": "Gagne Provocation."
            },
            {
              "lvl": 11,
              "extra": {
                "op": "buff",
                "t": "allyType:Lapin",
                "atk": 1,
                "hp": 0
              },
              "slot": "turnEnd",
              "text": "Fin de ton tour : tes Lapins gagnent +1/+0."
            },
            {
              "lvl": 16,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Lapereau",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Lapin"
                  ],
                  "statics": []
                }
              },
              "text": "Cri de guerre : invoque un Lapereau 1/1."
            },
            {
              "lvl": 18,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Lapereau",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Lapin"
                  ],
                  "statics": []
                }
              },
              "slot": "turnStart",
              "text": "Début de ton tour : invoque un Lapereau 1/1."
            }
          ],
          "atk": 4,
          "hp": 4,
          "statics": [],
          "death": [
            {
              "op": "summon",
              "n": 3,
              "unit": {
                "name": "Lapereau",
                "atk": 1,
                "hp": 1,
                "keys": [
                  "type:Lapin"
                ],
                "statics": []
              }
            }
          ],
          "sprite": "Graphical Assets/Cards/Rabbit Decks/Rabbit Deck 3/Lapin d'Eclipse.png"
        }
      ]
    },
    {
      "id": "dog",
      "name": "Médor",
      "species": "Chien",
      "sprite": "Graphical Assets/Characters/Dog/Dog.png",
      "role": "Gardien — tient la ligne / Appelle la meute",
      "stats": {
        "hp": 32,
        "mana": 7,
        "hand": 2
      },
      "cards": [
        {
          "id": "dog_pup",
          "name": "Chiot de Garde",
          "type": "ally",
          "cost": 2,
          "keys": [
            "Taunt",
            "type:Chien"
          ],
          "text": "Râle d'agonie : Invoque un Grand Frère 2/2",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "text": "+1/+1",
              "stats": {
                "atk": 1,
                "hp": 1
              }
            },
            {
              "lvl": 5,
              "stats": {
                "atk": 1,
                "hp": 1
              },
              "text": "+1/+1"
            },
            {
              "lvl": 8,
              "text": "+2/+2",
              "stats": {
                "atk": 2,
                "hp": 2
              }
            }
          ],
          "atk": 1,
          "hp": 2,
          "statics": [],
          "death": [
            {
              "op": "summon",
              "n": 1,
              "unit": {
                "name": "Grand Frère",
                "atk": 2,
                "hp": 2,
                "statics": []
              }
            }
          ],
          "sprite": "Graphical Assets/Cards/Dog Decks/Dog Deck 1/Chiot de Garde.png"
        },
        {
          "id": "dog_guard",
          "name": "Chien de Berger",
          "type": "ally",
          "cost": 2,
          "atk": 1,
          "hp": 2,
          "keys": [
            "Taunt",
            "type:Chien"
          ],
          "text": "Provocation, tes autres alliés ont +0/+1.",
          "play": [],
          "tiers": [
            {
              "lvl": 3,
              "stats": {
                "atk": 1,
                "hp": 1
              },
              "text": "+1/+1"
            },
            {
              "lvl": 6,
              "stats": {
                "atk": 2,
                "hp": 2
              },
              "text": "+2/+2"
            },
            {
              "lvl": 8,
              "text": "aura : +1 attaque → tes autres allies",
              "aura": {
                "scope": "otherAllies",
                "atk": 1,
                "hp": 0,
                "key": ""
              }
            },
            {
              "lvl": 13,
              "stats": {
                "atk": 3,
                "hp": 3
              },
              "text": "+3/+3"
            }
          ],
          "aura": {
            "scope": "otherAllies",
            "atk": 0,
            "hp": 1,
            "key": ""
          },
          "statics": [],
          "sprite": "Graphical Assets/Cards/Dog Decks/Dog Deck 1/Chien de Berger.png"
        },
        {
          "id": "dog_growl",
          "name": "Coup de Sifflet",
          "type": "spell",
          "cost": 3,
          "keys": [
            "type:Chien"
          ],
          "text": "Invoque un Chiot de Garde. Donne +1/+1  à tes alliés.",
          "play": [
            {
              "op": "pose_sur_le_plateau",
              "d_ou": "creee",
              "choix": "precise",
              "carte": "dog_pup",
              "quoi": "all",
              "typeDe": "ecrit",
              "typeQui": "toi",
              "argCard": "",
              "t": "enemyUnit",
              "qui": "toi",
              "ordre": "hasard",
              "n": 1,
              "fatigue": false,
              "atk": 0,
              "hp": 0
            },
            {
              "op": "buff",
              "t": "allAllies",
              "atk": 1,
              "hp": 1
            }
          ],
          "tiers": [
            {
              "lvl": 11,
              "text": "Invoque un autre Chiot de Garde.",
              "extra": {
                "op": "pose_sur_le_plateau",
                "d_ou": "creee",
                "choix": "precise",
                "carte": "dog_pup",
                "quoi": "all",
                "typeDe": "ecrit",
                "typeQui": "toi",
                "argCard": "",
                "t": "enemyUnit",
                "qui": "toi",
                "ordre": "hasard",
                "n": 1,
                "fatigue": false,
                "atk": 0,
                "hp": 0
              },
              "slot": "play"
            },
            {
              "lvl": 13,
              "extra": {
                "op": "pose_sur_le_plateau",
                "d_ou": "creee",
                "choix": "precise",
                "carte": "dog_bite",
                "quoi": "all",
                "typeDe": "ecrit",
                "typeQui": "toi",
                "argCard": "",
                "t": "enemyUnit",
                "qui": "toi",
                "ordre": "hasard",
                "n": 1,
                "fatigue": false,
                "atk": 0,
                "hp": 0
              },
              "text": "Invoque un Toutou enragé."
            },
            {
              "lvl": 16,
              "text": "Coût -1.",
              "cost": -1
            }
          ],
          "sprite": "Graphical Assets/Cards/Dog Decks/Dog Deck 1/Coup de sifflet.png"
        },
        {
          "id": "dog_lick",
          "name": "Retrouvailles",
          "type": "spell",
          "cost": 6,
          "keys": [
            "type:Chien"
          ],
          "text": "Réanime 5 alliés de ta défausse.",
          "play": [
            {
              "op": "pose_sur_le_plateau",
              "d_ou": "defausse",
              "choix": "precise",
              "carte": "",
              "quoi": "all",
              "argCard": "",
              "t": "enemyUnit",
              "qui": "toi",
              "n": 5,
              "atk": 0,
              "hp": 0
            }
          ],
          "tiers": [
            {
              "lvl": 5,
              "text": "coût -1",
              "cost": -1
            },
            {
              "lvl": 10,
              "extra": {
                "op": "buff",
                "t": "previous",
                "atk": 0,
                "hp": 0,
                "key": "Charge"
              },
              "text": "Leur donne Charge"
            },
            {
              "lvl": 16,
              "text": "coût -1",
              "cost": -1
            }
          ],
          "sprite": "Graphical Assets/Cards/Dog Decks/Dog Deck 1/Retrouvaille.png"
        },
        {
          "id": "dog_pack",
          "name": "Meute",
          "type": "ally",
          "cost": 4,
          "atk": 2,
          "hp": 2,
          "keys": [
            "type:Chien"
          ],
          "text": "Cri de guerre : invoque un Chiot de Garde et un Toutou enragé.",
          "play": [
            {
              "op": "pose_sur_le_plateau",
              "d_ou": "creee",
              "choix": "precise",
              "carte": "dog_pup",
              "quoi": "all",
              "typeDe": "ecrit",
              "typeQui": "toi",
              "argCard": "",
              "t": "enemyUnit",
              "qui": "toi",
              "ordre": "hasard",
              "n": 1,
              "fatigue": false,
              "atk": 0,
              "hp": 0
            },
            {
              "op": "pose_sur_le_plateau",
              "d_ou": "creee",
              "choix": "precise",
              "carte": "dog_bite",
              "quoi": "all",
              "typeDe": "ecrit",
              "typeQui": "toi",
              "argCard": "",
              "t": "enemyUnit",
              "qui": "toi",
              "ordre": "hasard",
              "n": 1,
              "fatigue": false,
              "atk": 0,
              "hp": 0
            }
          ],
          "tiers": [
            {
              "lvl": 6,
              "text": "Donne +1/+0 à vos unités.",
              "extra": {
                "op": "buff",
                "t": "allAllies",
                "atk": 1,
                "hp": 0
              },
              "slot": "play"
            },
            {
              "lvl": 12,
              "text": "Donne Charge à vos unités.",
              "extra": {
                "op": "buff",
                "t": "allAllies",
                "atk": 0,
                "hp": 0,
                "key": "Charge"
              },
              "slot": "play"
            },
            {
              "lvl": 15,
              "text": "Donne +3/+1 à vos unités.",
              "extra": {
                "op": "buff",
                "t": "allAllies",
                "atk": 3,
                "hp": 1
              },
              "slot": "play"
            }
          ],
          "statics": [],
          "sprite": "Graphical Assets/Cards/Dog Decks/Dog Deck 1/Meute.png"
        }
      ],
      "switches": [
        {
          "id": "dog_bite",
          "name": "Toutou enragé",
          "type": "ally",
          "cost": 2,
          "atk": 2,
          "hp": 1,
          "keys": [
            "Charge",
            "type:Chien"
          ],
          "text": "Charge.",
          "play": [],
          "tiers": [
            {
              "lvl": 7,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 8,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 10,
              "stats": {
                "atk": 1,
                "hp": 2
              },
              "text": "+1/+2"
            }
          ],
          "statics": [],
          "sprite": "Graphical Assets/Cards/Dog Decks/Dog Deck 1/Toutou Enragé.png"
        },
        {
          "id": "dog_alpha",
          "name": "Chef de Bataillon",
          "type": "ally",
          "cost": 5,
          "atk": 3,
          "hp": 3,
          "keys": [
            "type:Chien"
          ],
          "text": "Cri de guerre : +1/+1 a tes autres allies.",
          "play": [
            {
              "op": "buff",
              "t": "allAllies",
              "atk": 1,
              "hp": 1
            }
          ],
          "tiers": [
            {
              "lvl": 8,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 10,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 12,
              "text": "Cri de guerre : Invoque un Toutou enragé.",
              "extra": {
                "op": "pose_sur_le_plateau",
                "d_ou": "creee",
                "choix": "precise",
                "carte": "dog_bite",
                "quoi": "all",
                "typeDe": "ecrit",
                "typeQui": "toi",
                "argCard": "",
                "t": "enemyUnit",
                "qui": "toi",
                "ordre": "hasard",
                "n": 1,
                "fatigue": false,
                "atk": 0,
                "hp": 0
              },
              "slot": "play"
            }
          ],
          "statics": [],
          "sprite": "Graphical Assets/Cards/Dog Decks/Dog Deck 1/Chef de Bataillon.png"
        },
        {
          "id": "dog_bone",
          "name": "Prince des cabots",
          "type": "ally",
          "cost": 2,
          "keys": [
            "type:Chien",
            "characteristique_variable:both:alliesOfType:Chien"
          ],
          "text": "Force et Vie égales au nombre de Chien sur le terrain",
          "play": [],
          "tiers": [
            {
              "lvl": 10,
              "text": "+1/+1 aux Chiens",
              "aura": {
                "scope": "sameTypeAllies",
                "atk": 1,
                "hp": 1,
                "key": ""
              }
            },
            {
              "lvl": 12,
              "text": "Invoque un Chiot 1/1 avec \"Râle d'agonie : Invoque un Grand Frère 2/2\".",
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Chiot",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Chien"
                  ],
                  "death": [
                    {
                      "op": "summon",
                      "n": 1,
                      "unit": {
                        "name": "Grand Frère",
                        "atk": 2,
                        "hp": 2,
                        "keys": [
                          "type:Chien"
                        ]
                      }
                    }
                  ],
                  "turnStart": [],
                  "turnEnd": [],
                  "statics": []
                }
              },
              "slot": "play"
            },
            {
              "lvl": 16,
              "text": "En invoque un autre.",
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Chiot",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Chien"
                  ],
                  "death": [
                    {
                      "op": "summon",
                      "n": 1,
                      "unit": {
                        "name": "Grand Frère",
                        "atk": 2,
                        "hp": 2,
                        "keys": []
                      }
                    }
                  ],
                  "turnStart": [],
                  "turnEnd": [],
                  "statics": []
                }
              },
              "slot": "play"
            },
            {
              "lvl": 17,
              "text": "Vos Chiens ont Charge",
              "aura": {
                "scope": "sameTypeAllies",
                "atk": 0,
                "hp": 0,
                "key": "Charge"
              }
            }
          ],
          "atk": 0,
          "hp": 0,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Dog Decks/Dog Deck 1/Prince des cabots.png"
        },
        {
          "id": "dog_shield",
          "name": "Clairon de la Meute",
          "type": "ally",
          "cost": 3,
          "keys": [
            "type:Chien"
          ],
          "text": "Donne +2/+0 et Charge à vos alliés",
          "play": [
            {
              "op": "buff",
              "t": "allAllies",
              "atk": 2,
              "hp": 0,
              "key": "Charge"
            }
          ],
          "tiers": [
            {
              "lvl": 9,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 13,
              "extra": {
                "op": "summon",
                "n": 2,
                "unit": {
                  "name": "Jeton",
                  "atk": 4,
                  "hp": 1,
                  "keys": [
                    "type:Chien",
                    "Charge"
                  ],
                  "death": [],
                  "turnStart": [],
                  "turnEnd": [],
                  "statics": []
                }
              },
              "text": "Invoque deux Chiots 4/1 Charge."
            },
            {
              "lvl": 15,
              "amp": 2,
              "text": "Effet +2"
            }
          ],
          "atk": 1,
          "hp": 1,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Dog Decks/Dog Deck 1/Clairon de la meute.png"
        },
        {
          "id": "dog_bark",
          "name": "Bataillon",
          "type": "spell",
          "cost": 5,
          "keys": [
            "type:Chien"
          ],
          "text": "Invoque un Chef de Bataillon, un Toutou enragé et un Chiot de Garde.",
          "play": [
            {
              "op": "pose_sur_le_plateau",
              "d_ou": "creee",
              "choix": "precise",
              "carte": "dog_alpha",
              "quoi": "all",
              "typeDe": "ecrit",
              "typeQui": "toi",
              "argCard": "",
              "t": "enemyUnit",
              "qui": "toi",
              "ordre": "hasard",
              "n": 1,
              "fatigue": false,
              "atk": 0,
              "hp": 0
            },
            {
              "op": "pose_sur_le_plateau",
              "d_ou": "creee",
              "choix": "precise",
              "carte": "dog_bite",
              "quoi": "all",
              "typeDe": "ecrit",
              "typeQui": "toi",
              "argCard": "",
              "t": "enemyUnit",
              "qui": "toi",
              "ordre": "hasard",
              "n": 1,
              "fatigue": false,
              "atk": 0,
              "hp": 0
            },
            {
              "op": "pose_sur_le_plateau",
              "d_ou": "creee",
              "choix": "precise",
              "carte": "dog_pup",
              "quoi": "all",
              "typeDe": "ecrit",
              "typeQui": "toi",
              "argCard": "",
              "t": "enemyUnit",
              "qui": "toi",
              "ordre": "hasard",
              "n": 1,
              "fatigue": false,
              "atk": 0,
              "hp": 0
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "text": "Donne +1/+1 à vos alliés.",
              "extra": {
                "op": "buff",
                "t": "allAllies",
                "atk": 1,
                "hp": 1
              },
              "slot": "play"
            },
            {
              "lvl": 5,
              "text": "Coût -1.",
              "cost": -1
            },
            {
              "lvl": 8,
              "text": "Donne +1/+1 à vos alliés.",
              "extra": {
                "op": "buff",
                "t": "allAllies",
                "atk": 1,
                "hp": 1
              },
              "slot": "play"
            }
          ],
          "sprite": "Graphical Assets/Cards/Dog Decks/Dog Deck 1/Bataillon.png"
        }
      ]
    },
    {
      "id": "cat",
      "name": "Felix",
      "species": "Chat",
      "sprite": "Graphical Assets/Characters/Cat/Cat Bug.png",
      "role": "Mille coupures",
      "stats": {
        "hp": 26,
        "mana": 8,
        "hand": 2
      },
      "cards": [
        {
          "id": "cat_claw",
          "name": "Mage de l'étincelle",
          "type": "ally",
          "cost": 3,
          "atk": 2,
          "hp": 2,
          "keys": [
            "Charge",
            "type:Chat"
          ],
          "text": "Dès que vous lancez un sort, inflige une blessure à un adversaire",
          "play": [],
          "tiers": [
            {
              "lvl": 11,
              "text": "effet +1",
              "amp": 1
            },
            {
              "lvl": 14,
              "text": "effet +1",
              "amp": 1
            },
            {
              "lvl": 17,
              "text": "effet +1",
              "amp": 1
            }
          ],
          "on_spell_self": [
            {
              "op": "dmg",
              "t": "randomEnemyAny",
              "v": 1
            }
          ],
          "statics": [],
          "sprite": "Graphical Assets/Cards/Cat Decks/Cat Deck 1/Mage de l'étincelle.png"
        },
        {
          "id": "cat_alley",
          "name": "Chat de Gouttière",
          "type": "ally",
          "cost": 2,
          "atk": 1,
          "hp": 2,
          "keys": [
            "type:Chat",
            "Charge",
            "passe_murailles"
          ],
          "text": "Charge. Quand tu attaques avec une unité : Crée une Griffure",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "text": "gagne Elusif",
              "key": "elusif"
            },
            {
              "lvl": 5,
              "text": "gagne Passe-Murailles",
              "key": "passe_murailles"
            },
            {
              "lvl": 10,
              "text": "Quand tu lances un sort gagne +1/+0",
              "extra": {
                "op": "buff",
                "t": "self",
                "atk": 1,
                "hp": 0
              },
              "slot": "on_spell_self"
            }
          ],
          "on_attack_self": [
            {
              "op": "cree",
              "carte": "cat_pounce",
              "n": 1,
              "lvl": {
                "src": "ownerLevel",
                "arg": "",
                "plus": 0
              }
            }
          ],
          "statics": [],
          "gardes": {
            "on_attack_self": "moi"
          },
          "sprite": "Graphical Assets/Cards/Cat Decks/Cat Deck 1/Chat de Gouttière.png"
        },
        {
          "id": "cat_pounce",
          "name": "Griffure",
          "type": "spell",
          "cost": 1,
          "keys": [
            "type:Chat"
          ],
          "text": "Inflige 2 degats a une unité adverse.",
          "play": [
            {
              "op": "dmg",
              "t": "enemyAny",
              "v": 2
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 6,
              "extra": {
                "op": "cree",
                "carte": "",
                "n": 1,
                "lvl": 1,
                "choix": "hasard",
                "quoi": "spell"
              },
              "text": "Crée un sort au hasard"
            }
          ],
          "sprite": "Graphical Assets/Cards/Cat Decks/Cat Deck 1/Griffure.png"
        },
        {
          "id": "cat_nine",
          "name": "Neuf Vies",
          "type": "spell",
          "cost": 15,
          "keys": [
            "cout_x_de_moins_de_plus:X:1:ownTurns:",
            "type:Chat"
          ],
          "text": "Crée autant de carte \"Griffure\" que de tour joués.",
          "play": [
            {
              "op": "cree",
              "carte": "cat_pounce",
              "n": {
                "src": "ownTurns",
                "arg": "",
                "plus": 0
              },
              "lvl": {
                "src": "ownerLevel",
                "arg": "",
                "plus": 0
              }
            }
          ],
          "tiers": [
            {
              "lvl": 11,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Chaton",
                  "atk": 1,
                  "hp": 1,
                  "keys": [],
                  "death": [],
                  "turnStart": [],
                  "turnEnd": [],
                  "statics": [],
                  "on_spell_self": [
                    {
                      "op": "buff",
                      "t": "self",
                      "atk": 1,
                      "hp": 1
                    }
                  ]
                }
              },
              "text": "Invoque un chaton qui se renforce quand vous lancez un sort"
            }
          ],
          "sprite": "Graphical Assets/Cards/Cat Decks/Cat Deck 1/Neuf Vies.png"
        },
        {
          "id": "cat_shadow",
          "name": "Ombre Feutree",
          "type": "ally",
          "cost": 2,
          "atk": 2,
          "hp": 2,
          "keys": [
            "type:Chat"
          ],
          "text": "Les sorts de votre main coûtent 1 de moins.",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 1,
                "hp": 1
              },
              "text": "+1/+1"
            },
            {
              "lvl": 10,
              "text": "Cri de guerre : Crée un coup de Griffe",
              "extra": {
                "op": "cree",
                "choix": "precise",
                "carte": "cat_pounce",
                "quoi": "all",
                "n": 1,
                "lvl": 1
              },
              "slot": "play"
            },
            {
              "lvl": 16,
              "text": "Quand vous lancez un sort, inflige 2 blessures à un adversaire aléatoire",
              "extra": {
                "op": "dmg",
                "t": "randomEnemyUnit",
                "v": 2
              },
              "slot": "on_spell_self"
            }
          ],
          "statics": [
            {
              "op": "cout_des_cartes",
              "qui": "toi",
              "quoi": "spell",
              "sens": "moins",
              "v": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Cat Decks/Cat Deck 1/Ombre Feutrée.png"
        }
      ],
      "switches": [
        {
          "id": "cat_scratch",
          "name": "Tempête de Patounes",
          "type": "spell",
          "cost": 3,
          "keys": [
            "type:Chat"
          ],
          "text": "Inflige X blessures, X étant le nombre sorts lancés cette partie.",
          "play": [
            {
              "op": "dmg",
              "t": "enemyAny",
              "v": {
                "src": "spellsGame",
                "arg": "",
                "plus": 0
              }
            }
          ],
          "tiers": [
            {
              "lvl": 6,
              "text": "coût -1",
              "cost": -1
            },
            {
              "lvl": 11,
              "text": "coût -1",
              "cost": -1
            }
          ],
          "sprite": "Graphical Assets/Cards/Cat Decks/Cat Deck 1/Tempêtes de Patounes.png"
        },
        {
          "id": "cat_hunt",
          "name": "Coup de Patte",
          "type": "spell",
          "cost": 1,
          "keys": [
            "type:Chat"
          ],
          "text": "Inflige 1 degat.",
          "play": [
            {
              "op": "dmg",
              "t": "enemyAny",
              "v": 1
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 6,
              "text": "Réduit le coût des sorts",
              "extra": {
                "op": "reduit_le_cout_de",
                "quoi": "spell",
                "v": 1,
                "argType": "Chat"
              },
              "slot": "play"
            },
            {
              "lvl": 9,
              "text": "coût -1",
              "cost": -1
            }
          ],
          "sprite": "Graphical Assets/Cards/Cat Decks/Cat Deck 1/Coup de patte.png"
        },
        {
          "id": "cat_curio",
          "name": "Chat Prudent",
          "type": "ally",
          "cost": 2,
          "keys": [
            "type:Chat"
          ],
          "text": "Quand tu lances un sort : Gagnez un armure",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "text": "+1/+1",
              "stats": {
                "atk": 1,
                "hp": 2
              }
            },
            {
              "lvl": 5,
              "text": "gagne Provocation",
              "key": "Taunt"
            },
            {
              "lvl": 8,
              "text": "Rale d'agonie : Gagne 4 armures",
              "extra": {
                "op": "armor",
                "v": 4
              },
              "slot": "death"
            },
            {
              "lvl": 11,
              "text": "Rale d'agonie : Pioche une carte",
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "death"
            }
          ],
          "atk": 1,
          "hp": 1,
          "on_spell_self": [
            {
              "op": "armor",
              "v": 1
            }
          ],
          "statics": [],
          "sprite": "Graphical Assets/Cards/Cat Decks/Cat Deck 1/Chat Prudent.png"
        },
        {
          "id": "cat_trap",
          "name": "Chat Souricier",
          "type": "ally",
          "cost": 6,
          "atk": 1,
          "hp": 6,
          "keys": [
            "passe_murailles",
            "Charge",
            "type:Chat"
          ],
          "text": "Charge. Passe-Murailles. Quand vous attaquez, piochez une carte et infligez 2 blessures à un adversaire aléatoire.",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "text": "coût -2",
              "cost": -2
            },
            {
              "lvl": 5,
              "text": "Quand tu pioches une carte, gagnez 2 Armures.",
              "extra": {
                "op": "armor",
                "v": 2
              },
              "slot": "on_draw_self"
            },
            {
              "lvl": 10,
              "text": "coût -1",
              "cost": -2
            }
          ],
          "on_attack_self": [
            {
              "op": "draw",
              "v": 1
            },
            {
              "op": "dmg",
              "t": "randomEnemyAny",
              "v": 2
            }
          ],
          "statics": [],
          "gardes": {
            "on_attack_self": "moi"
          },
          "sprite": "Graphical Assets/Cards/Cat Decks/Cat Deck 1/Chat Souricier.png"
        },
        {
          "id": "cat_king",
          "name": "Matou Invocateur",
          "type": "ally",
          "cost": 5,
          "atk": 2,
          "hp": 3,
          "keys": [
            "type:Chat",
            "Charge",
            "passe_murailles"
          ],
          "text": "Charge. Passe-Murailles. Quand vous lancez un sort, invoquez un Chat 1/1 qui mélange un sort à votre pioche quand il meurt.",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "text": "Vos Chats ont Charge",
              "aura": {
                "scope": "sameTypeAllies",
                "atk": 0,
                "hp": 0,
                "key": "Charge"
              }
            },
            {
              "lvl": 5,
              "text": "Vos Chats ont +2/+0",
              "aura": {
                "scope": "sameTypeAllies",
                "atk": 2,
                "hp": 0,
                "key": ""
              }
            },
            {
              "lvl": 10,
              "text": "Vos Chats coûtent 2 de moins",
              "extra": {
                "op": "reduit_le_cout_de",
                "quoi": "ofType",
                "v": 2,
                "argType": "Chat"
              },
              "slot": "play"
            }
          ],
          "on_spell_self": [
            {
              "op": "summon",
              "n": 1,
              "unit": {
                "name": "Jeton",
                "atk": 1,
                "hp": 1,
                "keys": [
                  "type:Chat",
                  "passe_murailles"
                ],
                "statics": [],
                "death": [
                  {
                    "op": "melange_a_la_pioche",
                    "d_ou": "creee",
                    "choix": "hasard",
                    "carte": "",
                    "quoi": "spell",
                    "argCard": "",
                    "t": "enemyUnit",
                    "qui": "toi",
                    "ordre": "hasard",
                    "n": 1,
                    "fatigue": false,
                    "atk": 0,
                    "hp": 0
                  }
                ]
              }
            }
          ],
          "statics": [],
          "sprite": "Graphical Assets/Cards/Cat Decks/Cat Deck 1/Matou Invocateur.png"
        }
      ]
    },
    {
      "id": "crow",
      "name": "Corax",
      "species": "Corbeau",
      "sprite": "Graphical Assets/Characters/Crow/Crow.png",
      "role": "Filou — pioche et degats directs",
      "stats": {
        "hp": 24,
        "mana": 8,
        "hand": 2
      },
      "cards": [
        {
          "id": "crow_peck",
          "name": "Coup de Bec",
          "type": "spell",
          "cost": 1,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Inflige 2 degats au heros adverse et pioche une carte.",
          "play": [
            {
              "op": "dmg",
              "t": "enemyHero",
              "v": 2
            },
            {
              "op": "draw",
              "v": 1
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 6,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche 1 carte en plus"
            },
            {
              "lvl": 11,
              "amp": 2,
              "text": "Effet +2"
            }
          ],
          "sprite": "Graphical Assets/Cards/Raven Decks/Raven Deck 1/Coup de Bec.png"
        },
        {
          "id": "crow_scout",
          "name": "Corbeau Espion",
          "type": "ally",
          "cost": 2,
          "atk": 2,
          "hp": 2,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Quand tu attaques avec une unité, pioche une carte.",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 5,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 10,
              "stats": {
                "atk": 1,
                "hp": 2
              },
              "text": "+1/+2"
            }
          ],
          "on_attack_self": [
            {
              "op": "draw",
              "v": 1
            }
          ],
          "statics": [],
          "gardes": {
            "on_attack_self": "moi"
          },
          "sprite": "Graphical Assets/Cards/Raven Decks/Raven Deck 1/Corbeau Espion.png"
        },
        {
          "id": "crow_murder",
          "name": "Volée de Corbeaux",
          "type": "spell",
          "cost": 4,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Inflige 2 degats a toutes les unites adverses.",
          "play": [
            {
              "op": "dmg",
              "t": "allEnemyUnits",
              "v": 2
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 15,
              "text": "coût -2",
              "cost": -2
            },
            {
              "lvl": 19,
              "text": "Pioche un allié",
              "extra": {
                "op": "pioche_une_carte_de_type",
                "type": "ally",
                "n": 1
              },
              "slot": "play"
            }
          ],
          "sprite": "Graphical Assets/Cards/Raven Decks/Raven Deck 1/Volée de Corbeaux.png"
        },
        {
          "id": "crow_omen",
          "name": "Présage",
          "type": "spell",
          "cost": 4,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Mélange 10 cartes au hasard dans votre pioche. Pioche 2 cartes.",
          "play": [
            {
              "op": "melange_a_la_pioche",
              "d_ou": "creee",
              "choix": "hasard",
              "carte": "",
              "quoi": "all",
              "argCard": "",
              "t": "enemyUnit",
              "qui": "toi",
              "ordre": "hasard",
              "n": 10,
              "fatigue": false,
              "atk": 0,
              "hp": 0
            },
            {
              "op": "draw",
              "v": 2
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "cost": -2,
              "text": "Coût −2"
            },
            {
              "lvl": 6,
              "extra": {
                "op": "pioche_x",
                "carte": "Volée de Corbeaux",
                "n": 1
              },
              "text": "Pioche Volée de Corbeaux"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "mana",
                "v": 2
              },
              "text": "+2 manas ce tour-ci."
            }
          ],
          "sprite": "Graphical Assets/Cards/Raven Decks/Raven Deck 1/Présage.png"
        },
        {
          "id": "crow_raven",
          "name": "Grand Corbeau",
          "type": "ally",
          "cost": 7,
          "atk": 6,
          "hp": 6,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Quand l'adversaire pioche une carte, vous aussi.",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 5,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 10,
              "stats": {
                "atk": 1,
                "hp": 2
              },
              "text": "+1/+2"
            }
          ],
          "on_draw_foe": [
            {
              "op": "draw",
              "v": 1
            }
          ],
          "statics": [],
          "sprite": "Graphical Assets/Cards/Raven Decks/Raven Deck 1/Grand Corbeau.png"
        }
      ],
      "switches": [
        {
          "id": "crow_thief",
          "name": "Pie Glaneuse",
          "type": "ally",
          "cost": 2,
          "atk": 2,
          "hp": 2,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Cri de guerre : +2 mana ce tour, puis Piochez une carte",
          "play": [
            {
              "op": "mana",
              "v": 2
            },
            {
              "op": "draw",
              "v": 1
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 2,
                "hp": 0
              },
              "text": "+2/+0"
            },
            {
              "lvl": 5,
              "text": "gagne Elusif",
              "key": "elusif"
            },
            {
              "lvl": 10,
              "text": "coût -1",
              "cost": -1
            }
          ],
          "statics": [],
          "sprite": "Graphical Assets/Cards/Raven Decks/Raven Deck 1/Pie Glanneuse.png"
        },
        {
          "id": "crow_curse",
          "name": "Mauvais Œil",
          "type": "spell",
          "cost": 3,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Inflige 5 degats à une unité adverse.",
          "play": [
            {
              "op": "dmg",
              "t": "enemyUnit",
              "v": 5
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 6,
              "extra": {
                "op": "pioche_une_carte_de_type",
                "type": "spell",
                "n": 1
              },
              "text": "Pioche un sort"
            },
            {
              "lvl": 11,
              "text": "Réduit le coût des cartes Oiseaux de 2",
              "extra": {
                "op": "reduit_le_cout_de",
                "quoi": "ofType",
                "v": 2,
                "argType": "Oiseau"
              },
              "slot": "play"
            }
          ],
          "sprite": "Graphical Assets/Cards/Raven Decks/Raven Deck 1/Mauvais Oeil.png"
        },
        {
          "id": "crow_feather",
          "name": "Corneille Gourmande",
          "type": "ally",
          "cost": 2,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Gagne +1/+1 à chaque fois que tu pioches une carte.",
          "play": [],
          "tiers": [
            {
              "lvl": 3,
              "text": "Quand tu pioches une carte, soigne 2 PV à votre héros.",
              "extra": {
                "op": "heal",
                "t": "ownHero",
                "v": 2
              },
              "slot": "on_draw_self"
            },
            {
              "lvl": 12,
              "text": "gagne Elusif",
              "key": "elusif"
            },
            {
              "lvl": 16,
              "text": "coût -1",
              "cost": -1
            }
          ],
          "atk": 1,
          "hp": 1,
          "on_draw_self": [
            {
              "op": "buff",
              "t": "self",
              "atk": 1,
              "hp": 1
            }
          ],
          "statics": [],
          "sprite": "Graphical Assets/Cards/Raven Decks/Raven Deck 1/Corneille Gourmande.png"
        },
        {
          "id": "crow_swarm",
          "name": "Armée aux ailes noires",
          "type": "ally",
          "cost": 4,
          "atk": 1,
          "hp": 2,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Cri de guerre : invoque un Corbeau avec \"Quand vous piochez une carte, gagne +1/+1\". Au début du tour, mélange 2 cartes à ta pioche.",
          "play": [
            {
              "op": "summon",
              "n": 1,
              "unit": {
                "name": "Corbeau",
                "atk": 1,
                "hp": 2,
                "keys": [
                  "type:Oiseau"
                ],
                "on_draw_self": [
                  {
                    "op": "buff",
                    "t": "self",
                    "atk": 1,
                    "hp": 1
                  }
                ],
                "statics": []
              }
            }
          ],
          "tiers": [
            {
              "lvl": 10,
              "text": "En invoque un autre",
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Corbeau",
                  "atk": 1,
                  "hp": 2,
                  "keys": [
                    "type:Oiseau"
                  ],
                  "death": [],
                  "turnStart": [],
                  "turnEnd": [],
                  "on_draw_self": [
                    {
                      "op": "buff",
                      "t": "allyUnit",
                      "atk": 1,
                      "hp": 1
                    }
                  ],
                  "statics": []
                }
              },
              "slot": "play"
            },
            {
              "lvl": 12,
              "text": "Cri de guerre : Pioche une carte",
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "play"
            },
            {
              "lvl": 15,
              "text": "Donne +1/+1 aux Oiseaux",
              "aura": {
                "scope": "sameTypeAllies",
                "atk": 1,
                "hp": 1,
                "key": ""
              }
            }
          ],
          "statics": [],
          "turnStart": [
            {
              "op": "melange_a_la_pioche",
              "d_ou": "creee",
              "choix": "hasard",
              "carte": "",
              "quoi": "all",
              "argCard": "",
              "t": "enemyUnit",
              "qui": "toi",
              "ordre": "hasard",
              "n": 2,
              "fatigue": false,
              "atk": 0,
              "hp": 0
            }
          ],
          "sprite": "Graphical Assets/Cards/Raven Decks/Raven Deck 1/Armée aux ailes noires.png"
        },
        {
          "id": "crow_night",
          "name": "Nuit Sans Lune",
          "type": "spell",
          "cost": 4,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Détruit toutes les unités",
          "play": [
            {
              "op": "detruit",
              "x": "allEnemyUnits",
              "t": "allEnemyUnits"
            },
            {
              "op": "detruit",
              "x": "allAllies",
              "t": "allAllies"
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "text": "Piochez un allié.",
              "extra": {
                "op": "pioche_une_carte_de_type",
                "type": "ally",
                "n": 1
              },
              "slot": "play"
            },
            {
              "lvl": 6,
              "extra": {
                "op": "heal",
                "t": "ownHero",
                "v": 6
              },
              "text": "Soigne 6 PV à votre héros."
            },
            {
              "lvl": 11,
              "text": "coût -1",
              "cost": -1
            }
          ],
          "sprite": "Graphical Assets/Cards/Raven Decks/Raven Deck 1/Nuit sans Lune.png"
        }
      ]
    },
    {
      "id": "frog",
      "name": "Bulle",
      "species": "Grenouille",
      "sprite": "Graphical Assets/Characters/Frog/Frog.png",
      "role": "Venin — use l’adversaire",
      "stats": {
        "hp": 28,
        "mana": 7,
        "hand": 2
      },
      "cards": [
        {
          "id": "frog_tad",
          "name": "Têtard Glouton",
          "type": "ally",
          "cost": 1,
          "atk": 1,
          "hp": 1,
          "keys": [
            "type:Têtard"
          ],
          "text": "Gagne +1/+1 de plus quand reçoit du renfort.",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "text": "gagne Elusif",
              "key": "elusif"
            },
            {
              "lvl": 5,
              "text": "A la fin du tour, soigne 10 blessures sur cette unité.",
              "extra": {
                "op": "heal",
                "t": "self",
                "v": 10
              },
              "slot": "turnEnd"
            }
          ],
          "statics": [],
          "on_renfort_self": [
            {
              "op": "buff",
              "t": "self",
              "atk": 1,
              "hp": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 1/Têtard Glouton.png"
        },
        {
          "id": "frog_tongue",
          "name": "Langue Collante",
          "type": "spell",
          "cost": 2,
          "keys": [],
          "text": "Choisir : Inflige 2 degats a une unite OU Renforce une unité alliée.",
          "play": [
            {
              "op": "choisir",
              "a": [
                {
                  "op": "dmg",
                  "t": "enemyAny",
                  "v": 2
                }
              ],
              "b": [
                {
                  "op": "buff",
                  "t": "allyUnit",
                  "atk": 2,
                  "hp": 2
                }
              ]
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 6,
              "text": "Effet +1",
              "amp": 1
            },
            {
              "lvl": 11,
              "amp": 2,
              "text": "Effet +2"
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 1/Langue Collante.png"
        },
        {
          "id": "frog_venom",
          "name": "Grenouille Cuisinière",
          "type": "ally",
          "cost": 3,
          "atk": 2,
          "hp": 2,
          "keys": [
            "Venin"
          ],
          "text": "Renforce une unité ciblée.",
          "play": [
            {
              "op": "buff",
              "t": "allyUnit",
              "atk": 2,
              "hp": 2
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "text": "Cri de guerre : Crée un tétard et le met dans ta main.",
              "extra": {
                "op": "cree",
                "choix": "precise",
                "carte": "frog_tad",
                "quoi": "all",
                "argCard": "",
                "n": 1,
                "lvl": {
                  "src": "ownerLevel",
                  "arg": "",
                  "plus": 0
                }
              },
              "slot": "play"
            },
            {
              "lvl": 5,
              "text": "L'effet donne +1/+1",
              "amp": 1
            },
            {
              "lvl": 10,
              "text": "coût -1",
              "cost": -1
            }
          ],
          "statics": [],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 1/Grenouille Cuisinière.png"
        },
        {
          "id": "frog_swamp",
          "name": "Coulée de Boue",
          "type": "spell",
          "cost": 3,
          "keys": [],
          "text": "Inflige 2 degats a toutes les unites adverses.",
          "play": [
            {
              "op": "dmg",
              "t": "allEnemyUnits",
              "v": 2
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 6,
              "extra": {
                "op": "cree",
                "choix": "precise",
                "carte": "frog_tad",
                "quoi": "all",
                "argCard": "",
                "n": 1,
                "lvl": 1
              },
              "text": "Crée un tétard et l'ajoute à ta main."
            },
            {
              "lvl": 11,
              "amp": 2,
              "text": "Effet +2"
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 1/Coulée de Boue.png"
        },
        {
          "id": "frog_toad",
          "name": "Crapaud-Rocher",
          "type": "ally",
          "cost": 5,
          "atk": 4,
          "hp": 6,
          "keys": [
            "Taunt"
          ],
          "text": "Provocation.",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 5,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 10,
              "stats": {
                "atk": 1,
                "hp": 2
              },
              "text": "+1/+2"
            }
          ],
          "statics": [],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 1/Crapaud-Rocher.png"
        }
      ],
      "switches": [
        {
          "id": "frog_prince",
          "name": "Prince Grenouille",
          "type": "ally",
          "cost": 6,
          "atk": 6,
          "hp": 6,
          "keys": [],
          "text": "Quand il est renforcé, donne +1/+1 à toutes les cartes de la main. Cri de guerre : Crée deux Têtards et les ajoutent à votre main.",
          "play": [
            {
              "op": "cree",
              "choix": "precise",
              "carte": "frog_tad",
              "quoi": "all",
              "argCard": "",
              "n": 2,
              "lvl": {
                "src": "ownerLevel",
                "arg": "",
                "plus": 0
              }
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "text": "Rale d'agonie : Soigne le héros de 6.",
              "extra": {
                "op": "heal",
                "t": "ownHero",
                "v": 6
              },
              "slot": "death"
            },
            {
              "lvl": 5,
              "text": "Gagne Provocation",
              "key": "Taunt"
            },
            {
              "lvl": 10,
              "text": "Aura : Vos autres alliés ont Elusif",
              "aura": {
                "scope": "otherAllies",
                "atk": 0,
                "hp": 0,
                "key": "elusif"
              }
            }
          ],
          "statics": [],
          "on_renfort_self": [
            {
              "op": "renforce_les_cartes",
              "d_ou": "main",
              "qui": "toi",
              "quoi": "all",
              "argCard": "",
              "ordre": "hasard",
              "n": 1,
              "atk": 1,
              "hp": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 1/Prince Grenouille.png"
        },
        {
          "id": "frog_spit",
          "name": "Guérisseuse Gluante",
          "type": "ally",
          "cost": 3,
          "keys": [],
          "text": "Cri de guerre : Soigne une allié de 10 PV et lui donne +1/+1.",
          "play": [
            {
              "op": "heal",
              "t": "allyUnit",
              "v": 10
            },
            {
              "op": "buff",
              "t": "allyUnit",
              "atk": 1,
              "hp": 1
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "amp": 1,
              "text": "Effet +1."
            },
            {
              "lvl": 6,
              "extra": {
                "op": "cree",
                "choix": "precise",
                "carte": "frog_tad",
                "quoi": "all",
                "argCard": "",
                "n": 1,
                "lvl": 1
              },
              "text": "Crée un tétard et l'ajoute à votre main"
            },
            {
              "lvl": 10,
              "amp": 2,
              "text": "Effet +2."
            },
            {
              "lvl": 18,
              "text": "coût -1",
              "cost": -1
            }
          ],
          "atk": 3,
          "hp": 3,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 1/Guérisseuse Gluante.png"
        },
        {
          "id": "frog_lily",
          "name": "Grenouille Nourrice",
          "type": "ally",
          "cost": 2,
          "atk": 2,
          "hp": 5,
          "keys": [
            "Taunt"
          ],
          "text": "Provocation. Râle d'agonie : 3 points d’armure, Crée et pose un Têtard.",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 5,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 10,
              "stats": {
                "atk": 1,
                "hp": 2
              },
              "text": "+1/+2"
            }
          ],
          "statics": [],
          "death": [
            {
              "op": "armor",
              "v": 3
            },
            {
              "op": "summon",
              "n": 1,
              "unit": {
                "name": "Têtard",
                "atk": 1,
                "hp": 1,
                "keys": [
                  "type:Grenouille"
                ],
                "statics": [],
                "on_renfort_self": [
                  {
                    "op": "buff",
                    "t": "self",
                    "atk": 1,
                    "hp": 1
                  }
                ]
              }
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 1/Grenouille Nourrice.png"
        },
        {
          "id": "frog_brew",
          "name": "Élixir Venimeux",
          "type": "spell",
          "cost": 2,
          "keys": [],
          "text": "Donne +2/+2 à un allié et Venin.",
          "play": [
            {
              "op": "buff",
              "t": "allyUnit",
              "atk": 2,
              "hp": 2,
              "key": "Venin"
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 11,
              "amp": 2,
              "text": "Effet +2"
            },
            {
              "lvl": 18,
              "text": "coût -1",
              "cost": -1
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 1/Elixir Venimeux.png"
        },
        {
          "id": "frog_leap",
          "name": "Saut",
          "type": "spell",
          "cost": 1,
          "keys": [],
          "text": "Un allie gagne +1/+1 et Charge.",
          "play": [
            {
              "op": "buff",
              "t": "allyUnit",
              "atk": 1,
              "hp": 1,
              "key": "Charge"
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "text": "Donne +1/+1 à un allié au hasard.",
              "extra": {
                "op": "buff",
                "t": "randomAllyUnit",
                "atk": 1,
                "hp": 1
              },
              "slot": "play"
            },
            {
              "lvl": 6,
              "text": "Donne +1/+1 à un allié au hasard.",
              "extra": {
                "op": "buff",
                "t": "randomAllyUnit",
                "atk": 1,
                "hp": 1
              },
              "slot": "play"
            },
            {
              "lvl": 11,
              "text": "Donne +1/+1 à un allié au hasard.",
              "extra": {
                "op": "buff",
                "t": "randomAllyUnit",
                "atk": 1,
                "hp": 1
              },
              "slot": "play"
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 1/Saut.png"
        }
      ]
    },
    {
      "id": "owl",
      "name": "Athena",
      "species": "Chouette",
      "sprite": "Graphical Assets/Characters/Owl/Owl.png",
      "role": "Controle — mana et cartes",
      "stats": {
        "hp": 26,
        "mana": 10,
        "hand": 2
      },
      "cards": [
        {
          "id": "owl_study",
          "name": "Étude",
          "type": "spell",
          "cost": 1,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Pioche une carte et gagne 1 mana au prochain tour.",
          "play": [
            {
              "op": "draw",
              "v": 1
            },
            {
              "op": "mana_au_prochain_tour",
              "x": 1
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "extra": {
                "op": "mana_au_prochain_tour",
                "x": 1
              },
              "text": "+1 mana en plus."
            },
            {
              "lvl": 6,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche 1 carte."
            },
            {
              "lvl": 11,
              "cost": -1,
              "text": "Coût −1"
            }
          ],
          "sprite": "Graphical Assets/Cards/Owl Decks/Owl Deck 1/Etude.png"
        },
        {
          "id": "owl_scholar",
          "name": "Chouette Érudite",
          "type": "ally",
          "cost": 4,
          "atk": 3,
          "hp": 5,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Toutes les cartes de ta main coûtent 1 de moins.",
          "play": [],
          "tiers": [
            {
              "lvl": 3,
              "text": "Cri de guerre : Pioche une carte.",
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "play"
            },
            {
              "lvl": 6,
              "text": "Toutes les cartes de ton adversaire coûtent 1 de plus.",
              "statique": {
                "op": "cout_des_cartes",
                "qui": "adversaire",
                "quoi": "all",
                "argCard": "",
                "sens": "plus",
                "v": 1
              }
            },
            {
              "lvl": 10,
              "text": "Gagne Elusif.",
              "key": "elusif"
            }
          ],
          "statics": [
            {
              "op": "cout_des_cartes",
              "qui": "toi",
              "quoi": "all",
              "argCard": "",
              "sens": "moins",
              "v": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Owl Decks/Owl Deck 1/Chouette Erudite.png"
        },
        {
          "id": "owl_gaze",
          "name": "Regard Perçant",
          "type": "spell",
          "cost": 3,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Inflige 4 degats.",
          "play": [
            {
              "op": "dmg",
              "t": "enemyUnit",
              "v": 4
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "text": "Coût -1.",
              "cost": -1
            },
            {
              "lvl": 11,
              "text": "effet +2.",
              "amp": 2
            },
            {
              "lvl": 6,
              "text": "A la pose en plus",
              "extra": {
                "op": "buff",
                "t": "allyUnit",
                "atk": 1,
                "hp": 1
              },
              "slot": "play"
            }
          ],
          "sprite": "Graphical Assets/Cards/Owl Decks/Owl Deck 1/Regard Perçant.png"
        },
        {
          "id": "owl_wisdom",
          "name": "Chasse Nocturne",
          "type": "spell",
          "cost": 4,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Détruit une unité adverse.",
          "play": [
            {
              "op": "detruit",
              "t": "enemyUnit"
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "cost": -1,
              "text": "Coût −1."
            },
            {
              "lvl": 6,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche 1 carte en plus."
            },
            {
              "lvl": 11,
              "text": "Coût -1.",
              "cost": -1
            }
          ],
          "sprite": "Graphical Assets/Cards/Owl Decks/Owl Deck 1/Chasse Nocturne-1.png"
        },
        {
          "id": "owl_night",
          "name": "Impératrice Nocturne",
          "type": "ally",
          "cost": 8,
          "atk": 7,
          "hp": 7,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Les cartes jouées retournent dans ta pioche. Cri de guerre : remélange toutes les cartes de ta défausse dans ta pioche.",
          "play": [
            {
              "op": "melange_a_la_pioche",
              "d_ou": "defausse",
              "choix": "precise",
              "carte": "",
              "quoi": "all",
              "argCard": "",
              "t": "enemyUnit",
              "qui": "toi",
              "ordre": "hasard",
              "n": 1,
              "fatigue": false,
              "atk": 0,
              "hp": 0
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "text": "Tu pioches une carte de plus chaque tour.",
              "statique": {
                "op": "pioche_du_tour",
                "qui": "toi",
                "sens": "plus",
                "v": 1
              }
            },
            {
              "lvl": 20,
              "text": "Quand n’importe qui attaque avec une unite, piochez une carte.",
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "on_attack_any"
            }
          ],
          "statics": [
            {
              "op": "cartes_jouees_remelangees",
              "qui": "toi",
              "quoi": "tout",
              "sens": "plus",
              "v": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Owl Decks/Owl Deck 1/Chasse Nocturne.png"
        }
      ],
      "switches": [
        {
          "id": "owl_focus",
          "name": "Bourrasque",
          "type": "spell",
          "cost": 3,
          "keys": [],
          "text": "Renvoie une unité adverse dans la main de son propriétaire.",
          "play": [
            {
              "op": "renvoie_en_main",
              "d_ou": "plateau",
              "choix": "precise",
              "carte": "",
              "quoi": "all",
              "argCard": "",
              "t": "enemyUnit",
              "qui": "toi",
              "ordre": "hasard",
              "n": 1,
              "fatigue": false,
              "atk": 0,
              "hp": 0
            }
          ],
          "tiers": [
            {
              "lvl": 6,
              "text": "Coût -1.",
              "cost": -1
            },
            {
              "lvl": 8,
              "text": "Pioche une carte.",
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "play"
            },
            {
              "lvl": 11,
              "text": "Pioche une carte.",
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "play"
            }
          ],
          "sprite": "Graphical Assets/Cards/Owl Decks/Owl Deck 1/Bourrasque.png"
        },
        {
          "id": "owl_lecture",
          "name": "Chouette Tourbillon",
          "type": "ally",
          "cost": 4,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Cri de guerre : Renvoie une unité dans la main de son propriétaire.",
          "play": [
            {
              "op": "renvoie_en_main",
              "d_ou": "plateau",
              "choix": "precise",
              "carte": "",
              "quoi": "all",
              "argCard": "",
              "t": "enemyUnit",
              "qui": "toi",
              "ordre": "hasard",
              "n": 1,
              "fatigue": false,
              "atk": 0,
              "hp": 0
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "text": "Les cartes de votre adversaire coûtent 1 de plus.",
              "statique": {
                "op": "cout_des_cartes",
                "qui": "adversaire",
                "quoi": "all",
                "argCard": "",
                "sens": "plus",
                "v": 1
              }
            },
            {
              "lvl": 5,
              "text": "toutes tes cartes coutent 1 de moins",
              "statique": {
                "op": "degats_du_heros",
                "qui": "toi",
                "sens": "moins",
                "v": 1
              }
            },
            {
              "lvl": 8,
              "stats": {
                "atk": 3,
                "hp": 3
              },
              "text": "+3/+3"
            }
          ],
          "atk": 2,
          "hp": 2,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Owl Decks/Owl Deck 1/Chouette Tourbillon.png"
        },
        {
          "id": "owl_watch",
          "name": "Chouette Stoïque",
          "type": "ally",
          "cost": 5,
          "atk": 2,
          "hp": 2,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Quand vous perdez des points de vie, piochez une carte.",
          "play": [],
          "tiers": [
            {
              "lvl": 6,
              "text": "Quand tu perds des PV, pioche une carte.",
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "on_heroHurt_self"
            },
            {
              "lvl": 11,
              "text": "Cri de guerre : Gagnez 6 d'Armure.",
              "extra": {
                "op": "armor",
                "v": 6
              },
              "slot": "play"
            },
            {
              "lvl": 15,
              "text": "Quand l’adversaire pioche une carte, gagnez 2 d'Armure.",
              "extra": {
                "op": "armor",
                "v": 2
              },
              "slot": "on_draw_foe"
            }
          ],
          "statics": [],
          "on_heroHurt_self": [
            {
              "op": "draw",
              "v": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Owl Decks/Owl Deck 1/Chouette Stoïque.png"
        },
        {
          "id": "owl_storm",
          "name": "Colère d'Athéna",
          "type": "spell",
          "cost": 8,
          "keys": [],
          "text": "Détruit toutes les unités adverses.",
          "play": [
            {
              "op": "detruit",
              "t": "allEnemyUnits"
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "text": "Coût -1",
              "cost": -1
            },
            {
              "lvl": 5,
              "text": "Remélange toutes les cartes de ta défausse dans ta pioche.",
              "extra": {
                "op": "melange_a_la_pioche",
                "d_ou": "defausse",
                "choix": "precise",
                "carte": "",
                "quoi": "all",
                "argCard": "",
                "t": "enemyUnit",
                "qui": "toi",
                "ordre": "hasard",
                "n": 15,
                "fatigue": false,
                "atk": 0,
                "hp": 0
              },
              "slot": "play"
            },
            {
              "lvl": 8,
              "text": "Coût -2",
              "cost": -2
            }
          ],
          "sprite": "Graphical Assets/Cards/Owl Decks/Owl Deck 1/Colère d'Athéna.png"
        },
        {
          "id": "owl_arch",
          "name": "Archichouette",
          "type": "ally",
          "cost": 8,
          "atk": 8,
          "hp": 8,
          "keys": [],
          "text": "Quand un joueur pioche une carte, l'adversaire perd trois points de vie.",
          "play": [],
          "tiers": [
            {
              "lvl": 7,
              "text": "Dès que vous subissez des blessures, vous en subissez deux de moins.",
              "statique": {
                "op": "degats_du_heros",
                "qui": "toi",
                "sens": "moins",
                "v": 2
              }
            },
            {
              "lvl": 13,
              "text": "Quand n’importe qui pioche une carte, gagne +1/+1.",
              "extra": {
                "op": "buff",
                "t": "self",
                "atk": 1,
                "hp": 1
              },
              "slot": "on_draw_any"
            },
            {
              "lvl": 19,
              "text": "Quand tu attaques avec une unite, piochez une carte.",
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "on_attack_self"
            }
          ],
          "statics": [],
          "on_draw_any": [
            {
              "op": "dmg",
              "t": "enemyHero",
              "v": 3
            }
          ],
          "sprite": "Graphical Assets/Cards/Owl Decks/Owl Deck 1/Archichouette.png"
        }
      ]
    },
    {
      "id": "cameleon",
      "name": "Miracle",
      "species": "Cameleon",
      "sprite": "Graphical Assets/Characters/Cameleon/Cameleon.png",
      "role": "Support Tribal - Améliore et soutien",
      "stats": {
        "hp": 25,
        "mana": 8,
        "hand": 2
      },
      "cards": [
        {
          "id": "fox_kit",
          "name": "Cameleon",
          "type": "ally",
          "cost": 3,
          "atk": 1,
          "hp": 1,
          "keys": [],
          "text": "Cri de guerre : Devient la copie d'une carte sur le terrain.",
          "play": [
            {
              "op": "copie",
              "t": "self",
              "d_ou": "plateau",
              "choix": "precise",
              "carte": "",
              "quoi": "all",
              "argCard": "",
              "tm": "anyUnit",
              "qui": "toi",
              "ordre": "hasard"
            }
          ],
          "tiers": [
            {
              "lvl": 5,
              "extra": {
                "op": "cree",
                "choix": "lui",
                "n": 1
              },
              "slot": "play",
              "text": "Ajoute à ta main une copie de la carte copiée."
            },
            {
              "lvl": 6,
              "text": "+1/+1",
              "stats": {
                "atk": 1,
                "hp": 1
              }
            },
            {
              "lvl": 9,
              "stats": {
                "atk": 1,
                "hp": 1
              },
              "text": "+1/+1"
            },
            {
              "lvl": 12,
              "stats": {
                "atk": 2,
                "hp": 2
              },
              "text": "+2/+2"
            }
          ],
          "statics": [],
          "sprite": "Graphical Assets/Cards/Cameleon Decks/Cameleon Deck 1/Cameleon.png"
        },
        {
          "id": "fox_dash",
          "name": "Tour de Passe-Passe",
          "type": "spell",
          "cost": 2,
          "keys": [],
          "text": "L'unité ciblé se transforme en une carte au hasard de la pioche de son propriétaire.",
          "play": [
            {
              "op": "copie",
              "t": "anyUnit",
              "d_ou": "pioche",
              "choix": "precise",
              "carte": "",
              "quoi": "ally",
              "argCard": "",
              "tm": "enemyUnit",
              "qui": "proprietaire",
              "ordre": "hasard"
            }
          ],
          "tiers": [],
          "statics": [],
          "sprite": "Graphical Assets/Cards/Cameleon Decks/Cameleon Deck 1/Tour de Passe-Passe.png"
        },
        {
          "id": "fox_snare",
          "name": "Gobeur de Mouches",
          "type": "ally",
          "cost": 3,
          "keys": [
            "type_tous"
          ],
          "text": "Choisir : Inflige une blessure à une unité adverse au hasard, répète sur chaque unité adverse du même type. OU Donne +1/+1 à une unité allié et répète sur chaque unité alliée du même type.",
          "play": [
            {
              "op": "choisir",
              "a": [
                {
                  "op": "dmg",
                  "t": "enemyUnit",
                  "v": 1
                },
                {
                  "op": "dmg",
                  "t": "previousType",
                  "v": 1
                }
              ],
              "b": [
                {
                  "op": "buff",
                  "t": "allyUnit",
                  "atk": 1,
                  "hp": 1
                },
                {
                  "op": "buff",
                  "t": "previousType",
                  "atk": 1,
                  "hp": 1
                }
              ]
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "amp": 1,
              "text": "Effet +1."
            },
            {
              "lvl": 6,
              "text": "Effet +1.",
              "amp": 1
            },
            {
              "lvl": 11,
              "text": "Coût -1.",
              "cost": -1
            }
          ],
          "atk": 2,
          "hp": 2,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Cameleon Decks/Cameleon Deck 1/Gobeur de Mouches.png"
        },
        {
          "id": "fox_raid",
          "name": "Découverte",
          "type": "spell",
          "cost": 2,
          "keys": [],
          "text": "Choisir : Crée une carte du type d'une carte sur le terrain OU à la défausse OU un Miroir.",
          "play": [
            {
              "op": "choisir",
              "a": [
                {
                  "op": "cree",
                  "choix": "hasard",
                  "carte": "",
                  "quoi": "ofType",
                  "typeDe": "plateau",
                  "typeQui": "deux",
                  "argCard": "",
                  "n": 1,
                  "lvl": {
                    "src": "ownerLevel",
                    "arg": "",
                    "plus": 0
                  }
                }
              ],
              "b": [
                {
                  "op": "cree",
                  "choix": "hasard",
                  "carte": "",
                  "quoi": "ofType",
                  "typeDe": "defausse",
                  "typeQui": "deux",
                  "argCard": "",
                  "n": 1,
                  "lvl": {
                    "src": "ownerLevel",
                    "arg": "",
                    "plus": 0
                  }
                }
              ],
              "c": [
                {
                  "op": "cree",
                  "choix": "precise",
                  "carte": "miroir",
                  "n": 1
                }
              ]
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "text": "coût -1",
              "cost": -1
            },
            {
              "lvl": 5,
              "text": "coût -1",
              "cost": -1
            },
            {
              "lvl": 8,
              "text": "les trois choix partent",
              "lesDeux": true
            }
          ],
          "sprite": "Graphical Assets/Cards/Cameleon Decks/Cameleon Deck 1/Découverte.png"
        },
        {
          "id": "fox_wild",
          "name": "Volte-Face",
          "type": "spell",
          "cost": 2,
          "keys": [],
          "text": "Switch une unité.",
          "play": [
            {
              "op": "switch",
              "d_ou": "plateau",
              "t": "anyUnit",
              "qui": "toi",
              "quoi": "all",
              "typeDe": "ecrit",
              "typeQui": "toi",
              "argCard": "",
              "ordre": "hasard",
              "n": 1
            }
          ],
          "tiers": [
            {
              "lvl": 10,
              "text": "coût -1",
              "cost": -1
            }
          ],
          "statics": [],
          "sprite": "Graphical Assets/Cards/Cameleon Decks/Cameleon Deck 1/Volte-Face.png"
        }
      ],
      "switches": [
        {
          "id": "fox_cunning",
          "name": "Maître du Camouflage",
          "type": "ally",
          "cost": 3,
          "keys": [
            "type_tous"
          ],
          "text": "Donne à tes autres alliés \"A tout les types d'unités\"",
          "play": [],
          "tiers": [
            {
              "lvl": 4,
              "stats": {
                "atk": 1,
                "hp": 2
              },
              "text": "+1/+2"
            },
            {
              "lvl": 7,
              "stats": {
                "atk": 1,
                "hp": 2
              },
              "text": "+1/+2"
            },
            {
              "lvl": 10,
              "stats": {
                "atk": 1,
                "hp": 2
              },
              "text": "+1/+2"
            }
          ],
          "atk": 3,
          "hp": 4,
          "statics": [],
          "aura": {
            "scope": "otherAllies",
            "atk": 0,
            "hp": 0,
            "key": "type_tous"
          },
          "sprite": "Graphical Assets/Cards/Cameleon Decks/Cameleon Deck 1/Maître du Camouflage.png"
        },
        {
          "id": "fox_ambush",
          "name": "Hypnose",
          "type": "spell",
          "cost": 5,
          "keys": [],
          "text": "Prend le contrôle d'une unité adverse.",
          "play": [
            {
              "op": "prendre_le_controle",
              "t": "enemyUnit"
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "text": "Coût -1.",
              "cost": -1
            },
            {
              "lvl": 5,
              "text": "Coût -1.",
              "cost": -1
            },
            {
              "lvl": 8,
              "extra": {
                "op": "cree",
                "choix": "precise",
                "carte": "miroir",
                "n": 1
              },
              "text": "Crée aussi un Miroir."
            }
          ],
          "sprite": "Graphical Assets/Cards/Cameleon Decks/Cameleon Deck 1/Hypnose.png"
        },
        {
          "id": "fox_bandit",
          "name": "Coup de Langue",
          "type": "spell",
          "cost": 2,
          "keys": [
            "type_tous"
          ],
          "text": "Inflige 2 blessures à une unité et à toutes les unités du même type.",
          "play": [
            {
              "op": "dmg",
              "t": "enemyAny",
              "v": 2
            },
            {
              "op": "dmg",
              "t": "previousType",
              "v": 2
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "text": "Effet +1.",
              "amp": 1
            },
            {
              "lvl": 5,
              "text": "Effet +1.",
              "amp": 1
            },
            {
              "lvl": 8,
              "text": "Effet +1.",
              "amp": 1
            }
          ],
          "statics": [],
          "sprite": "Graphical Assets/Cards/Cameleon Decks/Cameleon Deck 1/Coup de Langue.png"
        },
        {
          "id": "fox_frenzy",
          "name": "Porte-Couleurs",
          "type": "ally",
          "cost": 5,
          "keys": [],
          "text": "Quand vous jouez un allié, les alliés du même type gagnent +1/+1.",
          "play": [],
          "tiers": [
            {
              "lvl": 3,
              "amp": 1,
              "text": "Effet +1."
            },
            {
              "lvl": 6,
              "text": "+1/+1.",
              "stats": {
                "atk": 1,
                "hp": 1
              }
            },
            {
              "lvl": 11,
              "amp": 1,
              "text": "Effet +1."
            }
          ],
          "atk": 4,
          "hp": 4,
          "statics": [],
          "on_ally_self": [
            {
              "op": "buff",
              "t": "previousType",
              "atk": 1,
              "hp": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Cameleon Decks/Cameleon Deck 2/Coeur Chromatique.png"
        },
        {
          "id": "fox_king",
          "name": "Métamorphose Ultime",
          "type": "spell",
          "cost": 5,
          "keys": [],
          "text": "Choisissez une unité. Toutes vos unités deviennent des copies de cette unité.",
          "play": [
            {
              "op": "copie",
              "t": "allAllies",
              "d_ou": "plateau",
              "choix": "precise",
              "carte": "",
              "quoi": "all",
              "typeDe": "ecrit",
              "typeQui": "toi",
              "argCard": "",
              "tm": "anyUnit",
              "qui": "toi",
              "ordre": "hasard"
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "text": "coût -1",
              "cost": -1
            },
            {
              "lvl": 5,
              "text": "coût -1",
              "cost": -1
            },
            {
              "lvl": 8,
              "text": "coût -2",
              "cost": -2
            }
          ],
          "statics": [],
          "sprite": "Graphical Assets/Cards/Cameleon Decks/Cameleon Deck 1/Métamorphose Ultime.png"
        }
      ]
    },
    {
      "id": "dog2",
      "name": "Croc",
      "species": "Chien",
      "sprite": "Graphical Assets/Characters/Dog/Dog German Shepherd.png",
      "role": "Meute — Aggro Turbo : charge, frappe le héros, sacrifie",
      "stats": {
        "hp": 26,
        "mana": 7,
        "hand": 2
      },
      "cards": [
        {
          "id": "dog2_cub",
          "name": "Louveteau Affamé",
          "type": "ally",
          "cost": 1,
          "keys": [
            "Charge",
            "type:Loup",
            "type:Chien"
          ],
          "text": "Charge.",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "dmg",
                "t": "enemyHero",
                "v": 1
              },
              "slot": "death",
              "text": "Râle d’agonie : inflige 1 dégât au héros adverse."
            },
            {
              "lvl": 14,
              "extra": {
                "op": "cree",
                "choix": "precise",
                "carte": "dog2_cub",
                "quoi": "all",
                "argCard": "",
                "n": 1,
                "lvl": {
                  "src": "ownerLevel",
                  "arg": "",
                  "plus": 0
                }
              },
              "slot": "death",
              "text": "Râle d’agonie : revient dans ta main."
            }
          ],
          "atk": 2,
          "hp": 1,
          "statics": []
        },
        {
          "id": "dog2_hunt",
          "name": "Traque",
          "type": "spell",
          "cost": 2,
          "keys": [
            "type:Chien"
          ],
          "text": "Un allié gagne +2/+1 et Charge.",
          "play": [
            {
              "op": "buff",
              "t": "allyUnit",
              "atk": 2,
              "hp": 1,
              "key": "Charge"
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "dmg",
                "t": "enemyHero",
                "v": 2
              },
              "text": "Inflige aussi 2 dégâts au héros adverse."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "buff",
                "t": "allyType:Chien",
                "atk": 1,
                "hp": 0
              },
              "text": "Tes Chiens gagnent aussi +1/+0."
            }
          ],
          "sprite": "Graphical Assets/Cards/Dog Decks/Dog Deck 2/Traque.png"
        },
        {
          "id": "dog2_beater",
          "name": "Rabatteur",
          "type": "ally",
          "cost": 3,
          "keys": [
            "type:Loup",
            "type:Chien"
          ],
          "text": "Quand une de tes unités Chien attaque, inflige 1 dégât au héros adverse.",
          "play": [],
          "tiers": [
            {
              "lvl": 4,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "dmg",
                "t": "enemyHero",
                "v": 1
              },
              "slot": "on_unitDies_self",
              "text": "Quand tu perds une unité, inflige 1 dégât au héros adverse."
            },
            {
              "lvl": 15,
              "aura": {
                "key": "",
                "atk": 1,
                "hp": 0,
                "scope": "sameTypeAllies"
              },
              "text": "Aura : tes autres Chiens ont +1/+0."
            }
          ],
          "atk": 2,
          "hp": 3,
          "statics": [],
          "gardes": {
            "on_attack_self": "type:Chien"
          },
          "on_attack_self": [
            {
              "op": "dmg",
              "t": "enemyHero",
              "v": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Dog Decks/Dog Deck 2/Rabatteur.png"
        },
        {
          "id": "dog2_pack",
          "name": "Meute Affamée",
          "type": "spell",
          "cost": 4,
          "keys": [
            "type:Chien"
          ],
          "text": "Invoque trois Louveteaux 2/1 avec Charge.",
          "play": [
            {
              "op": "summon",
              "n": 3,
              "unit": {
                "name": "Louveteau",
                "atk": 2,
                "hp": 1,
                "keys": [
                  "Charge",
                  "type:Loup",
                  "type:Chien"
                ],
                "statics": []
              }
            }
          ],
          "tiers": [
            {
              "lvl": 5,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Louveteau",
                  "atk": 2,
                  "hp": 1,
                  "keys": [
                    "Charge",
                    "type:Loup",
                    "type:Chien"
                  ],
                  "statics": []
                }
              },
              "text": "Invoque un Louveteau de plus."
            },
            {
              "lvl": 13,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Louveteau Alpha",
                  "atk": 3,
                  "hp": 2,
                  "keys": [
                    "Charge",
                    "type:Loup",
                    "type:Chien"
                  ],
                  "statics": []
                }
              },
              "text": "Invoque aussi un Louveteau Alpha 3/2 Charge."
            },
            {
              "lvl": 20,
              "extra": {
                "op": "buff",
                "t": "allyType:Chien",
                "atk": 2,
                "hp": 2
              },
              "text": "Tes Chiens gagnent +2/+2."
            }
          ]
        },
        {
          "id": "dog2_alpha",
          "name": "Loup Hurleur",
          "type": "ally",
          "cost": 6,
          "keys": [
            "Charge",
            "type:Loup",
            "type:Chien"
          ],
          "text": "Charge. Cri de guerre : tes autres Chiens gagnent +1/+0.",
          "play": [
            {
              "op": "buff",
              "t": "sameTypeAllies",
              "atk": 1,
              "hp": 0
            }
          ],
          "tiers": [
            {
              "lvl": 6,
              "stats": {
                "atk": 1,
                "hp": 1
              },
              "text": "+1/+1"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "summon",
                "n": 2,
                "unit": {
                  "name": "Louveteau",
                  "atk": 2,
                  "hp": 1,
                  "keys": [
                    "Charge",
                    "type:Loup",
                    "type:Chien"
                  ],
                  "statics": []
                }
              },
              "slot": "death",
              "text": "Râle d’agonie : invoque deux Louveteaux."
            },
            {
              "lvl": 16,
              "extra": {
                "op": "buff",
                "t": "allyType:Chat",
                "atk": 1,
                "hp": 0
              },
              "text": "Cri de guerre : tes Chats gagnent aussi +1/+0."
            },
            {
              "lvl": 18,
              "aura": {
                "key": "Charge",
                "atk": 0,
                "hp": 0,
                "scope": "sameTypeAllies"
              },
              "text": "Aura : tes autres Chiens ont Charge."
            }
          ],
          "atk": 5,
          "hp": 4,
          "statics": []
        }
      ],
      "switches": [
        {
          "id": "dog2_kami",
          "name": "Chiot Pétard",
          "type": "ally",
          "cost": 1,
          "keys": [
            "Charge",
            "type:Chien"
          ],
          "text": "Charge. Râle d'agonie : inflige 2 dégâts au héros adverse.",
          "play": [],
          "tiers": [
            {
              "lvl": 4,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 10,
              "key": "passe_murailles",
              "text": "Gagne Passe-Murailles."
            },
            {
              "lvl": 16,
              "extra": {
                "op": "dmg",
                "t": "randomEnemyUnit",
                "v": 2
              },
              "slot": "death",
              "text": "Râle d’agonie : inflige aussi 2 dégâts à une unité adverse au hasard."
            }
          ],
          "atk": 1,
          "hp": 1,
          "statics": [],
          "death": [
            {
              "op": "dmg",
              "t": "enemyHero",
              "v": 2
            }
          ]
        },
        {
          "id": "dog2_curee",
          "name": "Curée",
          "type": "spell",
          "cost": 3,
          "keys": [
            "type:Chien"
          ],
          "text": "Choisis : inflige au héros adverse 1 dégât par Chien que tu contrôles, +1 — OU tes Chiens gagnent +1/+1.",
          "play": [
            {
              "op": "choisir",
              "a": [
                {
                  "op": "dmg",
                  "t": "enemyHero",
                  "v": {
                    "src": "alliesOfType",
                    "arg": "Chien",
                    "plus": 1
                  }
                }
              ],
              "b": [
                {
                  "op": "buff",
                  "t": "allyType:Chien",
                  "atk": 1,
                  "hp": 1
                }
              ]
            }
          ],
          "tiers": [
            {
              "lvl": 5,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "dmg",
                "t": "randomEnemyUnit",
                "v": 1
              },
              "text": "Inflige aussi 1 dégât à une unité adverse au hasard."
            },
            {
              "lvl": 14,
              "lesDeux": true,
              "text": "Les deux choix partent : dégâts ET renfort."
            }
          ],
          "sprite": "Graphical Assets/Cards/Dog Decks/Dog Deck 2/Curée.png"
        },
        {
          "id": "dog2_queen",
          "name": "Louve Vengeresse",
          "type": "ally",
          "cost": 4,
          "keys": [
            "Charge",
            "type:Loup",
            "type:Chien"
          ],
          "text": "Charge. Quand tu perds une unité, gagne +1/+1.",
          "play": [],
          "tiers": [
            {
              "lvl": 6,
              "stats": {
                "atk": 0,
                "hp": 2
              },
              "text": "+0/+2"
            },
            {
              "lvl": 9,
              "key": "elusif",
              "text": "Gagne Élusif."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "on_unitDies_self",
              "text": "Quand tu perds une unité, pioche une carte."
            },
            {
              "lvl": 19,
              "aura": {
                "key": "",
                "atk": 1,
                "hp": 1,
                "scope": "sameTypeAllies"
              },
              "text": "Aura : tes autres Chiens ont +1/+1."
            }
          ],
          "atk": 3,
          "hp": 3,
          "statics": [],
          "on_unitDies_self": [
            {
              "op": "buff",
              "t": "self",
              "atk": 1,
              "hp": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Dog Decks/Dog Deck 2/Louve Vengeresse.png"
        },
        {
          "id": "dog2_feast",
          "name": "Festin",
          "type": "spell",
          "cost": 1,
          "keys": [
            "type:Chien"
          ],
          "text": "Détruit un de tes alliés. Pioche une carte. Inflige 2 dégâts au héros adverse.",
          "play": [
            {
              "op": "detruit",
              "t": "allyUnit"
            },
            {
              "op": "draw",
              "v": 1
            },
            {
              "op": "dmg",
              "t": "enemyHero",
              "v": 2
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Louveteau",
                  "atk": 2,
                  "hp": 1,
                  "keys": [
                    "Charge",
                    "type:Loup",
                    "type:Chien"
                  ],
                  "statics": []
                }
              },
              "text": "Invoque aussi un Louveteau."
            },
            {
              "lvl": 15,
              "extra": {
                "op": "heal",
                "t": "ownHero",
                "v": 4
              },
              "text": "Soigne aussi ton héros de 4."
            }
          ],
          "sprite": "Graphical Assets/Cards/Dog Decks/Dog Deck 2/Festin.png"
        },
        {
          "id": "dog2_moon",
          "name": "Lune de Sang",
          "type": "spell",
          "cost": 5,
          "keys": [
            "type:Chien"
          ],
          "text": "Tes Chiens gagnent +2/+0 et Charge.",
          "play": [
            {
              "op": "buff",
              "t": "allyType:Chien",
              "atk": 2,
              "hp": 0,
              "key": "Charge"
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 13,
              "extra": {
                "op": "dmg",
                "t": "enemyHero",
                "v": {
                  "src": "alliesOfType",
                  "arg": "Chien",
                  "plus": 0
                }
              },
              "text": "Inflige aussi 1 dégât au héros adverse par Chien que tu contrôles."
            },
            {
              "lvl": 17,
              "extra": {
                "op": "draw",
                "v": 2
              },
              "text": "Pioche aussi deux cartes."
            }
          ],
          "sprite": "Graphical Assets/Cards/Dog Decks/Dog Deck 2/Lune de Sang.png"
        }
      ]
    },
    {
      "id": "cat2",
      "name": "Mistigri",
      "species": "Chat",
      "sprite": "Graphical Assets/Characters/Cat/Cat Siamese.png",
      "role": "Maraudeur — Aggro Tempo : des Chats rapides, qui reviennent",
      "stats": {
        "hp": 25,
        "mana": 8,
        "hand": 2
      },
      "cards": [
        {
          "id": "cat2_kit",
          "name": "Chaton Fureteur",
          "type": "ally",
          "cost": 1,
          "keys": [
            "Charge",
            "passe_murailles",
            "type:Chat"
          ],
          "text": "Charge. Passe-Murailles. Quand tu lances un sort, gagne +1/+0.",
          "play": [],
          "tiers": [
            {
              "lvl": 3,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 9,
              "key": "elusif",
              "text": "Gagne Élusif."
            },
            {
              "lvl": 15,
              "extra": {
                "op": "buff",
                "t": "self",
                "atk": 1,
                "hp": 0
              },
              "slot": "on_ally_self",
              "text": "Quand tu joues un Chat, gagne +1/+0."
            }
          ],
          "atk": 1,
          "hp": 1,
          "statics": [],
          "on_spell_self": [
            {
              "op": "buff",
              "t": "self",
              "atk": 1,
              "hp": 0
            }
          ],
          "gardes": {
            "on_ally_self": "type:Chat"
          },
          "sprite": "Graphical Assets/Cards/Cat Decks/Cat Deck 2/Chaton Fureteur.png"
        },
        {
          "id": "cat2_stray",
          "name": "Matou Têtu",
          "type": "ally",
          "cost": 3,
          "keys": [
            "Charge",
            "type:Chat"
          ],
          "text": "Charge. Râle d'agonie : recrée un Matou Têtu dans ta main.",
          "play": [],
          "tiers": [
            {
              "lvl": 4,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 11,
              "key": "passe_murailles",
              "text": "Gagne Passe-Murailles."
            },
            {
              "lvl": 13,
              "extra": {
                "op": "cree",
                "choix": "precise",
                "carte": "cat_pounce",
                "quoi": "all",
                "argCard": "",
                "n": 1,
                "lvl": {
                  "src": "ownerLevel",
                  "arg": "",
                  "plus": 0
                }
              },
              "slot": "death",
              "text": "Râle d’agonie : crée aussi une Griffure dans ta main."
            }
          ],
          "atk": 3,
          "hp": 2,
          "statics": [],
          "death": [
            {
              "op": "cree",
              "choix": "precise",
              "carte": "cat2_stray",
              "quoi": "all",
              "argCard": "",
              "n": 1,
              "lvl": {
                "src": "ownerLevel",
                "arg": "",
                "plus": 0
              }
            }
          ]
        },
        {
          "id": "cat2_sneak",
          "name": "Griffes Sournoises",
          "type": "ally",
          "cost": 2,
          "keys": [
            "type:Chat"
          ],
          "text": "Un allié gagne +2/+0 et Passe-Murailles.",
          "play": [
            {
              "op": "buff",
              "t": "allyUnit",
              "atk": 2,
              "hp": 0,
              "key": "passe_murailles"
            }
          ],
          "tiers": [
            {
              "lvl": 5,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            },
            {
              "lvl": 16,
              "extra": {
                "op": "buff",
                "t": "allyType:Chat",
                "atk": 1,
                "hp": 0
              },
              "text": "Tes Chats gagnent aussi +1/+0."
            }
          ],
          "atk": 1,
          "hp": 1,
          "statics": []
        },
        {
          "id": "cat2_burglar",
          "name": "Cambrioleur",
          "type": "ally",
          "cost": 3,
          "keys": [
            "Charge",
            "passe_murailles",
            "type:Chat"
          ],
          "text": "Charge. Passe-Murailles. Quand il attaque, gagne 1 mana ce tour.",
          "play": [],
          "tiers": [
            {
              "lvl": 6,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "on_attack_self",
              "text": "Quand il attaque, pioche une carte."
            },
            {
              "lvl": 14,
              "statique": {
                "op": "cout_des_cartes",
                "qui": "toi",
                "quoi": "spell",
                "argCard": "",
                "sens": "moins",
                "v": 1
              },
              "text": "Tes sorts coûtent 1 de moins."
            }
          ],
          "atk": 2,
          "hp": 3,
          "statics": [],
          "gardes": {
            "on_attack_self": "moi"
          },
          "on_attack_self": [
            {
              "op": "mana",
              "v": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Cat Decks/Cat Deck 2/Cambrioleur.png"
        },
        {
          "id": "cat2_lord",
          "name": "Parrain des Ruelles",
          "type": "ally",
          "cost": 6,
          "keys": [
            "Charge",
            "passe_murailles",
            "type:Chat"
          ],
          "text": "Charge. Passe-Murailles. Quand il attaque, inflige 2 dégâts au héros adverse.",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 1,
                "hp": 1
              },
              "text": "+1/+1"
            },
            {
              "lvl": 12,
              "extra": {
                "op": "summon",
                "n": 2,
                "unit": {
                  "name": "Chaton",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "passe_murailles",
                    "type:Chat"
                  ],
                  "statics": []
                }
              },
              "slot": "death",
              "text": "Râle d’agonie : invoque deux Chatons."
            },
            {
              "lvl": 17,
              "statique": {
                "op": "montant_des_effets",
                "qui": "toi",
                "cible": "dmg",
                "sens": "plus",
                "v": 1
              },
              "text": "Tes dégâts infligent 1 de plus."
            }
          ],
          "atk": 5,
          "hp": 5,
          "statics": [],
          "gardes": {
            "on_attack_self": "moi"
          },
          "on_attack_self": [
            {
              "op": "dmg",
              "t": "enemyHero",
              "v": 2
            }
          ]
        }
      ],
      "switches": [
        {
          "id": "cat2_ghost",
          "name": "Ombre Furtive",
          "type": "ally",
          "cost": 1,
          "keys": [
            "elusif",
            "passe_murailles",
            "type:Chat"
          ],
          "text": "Élusif. Passe-Murailles. Râle d'agonie : crée une Griffure dans ta main.",
          "play": [],
          "tiers": [
            {
              "lvl": 5,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "death",
              "text": "Râle d’agonie : pioche une carte."
            },
            {
              "lvl": 12,
              "key": "Charge",
              "text": "Gagne Charge."
            }
          ],
          "atk": 2,
          "hp": 1,
          "statics": [],
          "death": [
            {
              "op": "cree",
              "choix": "precise",
              "carte": "cat_pounce",
              "quoi": "all",
              "argCard": "",
              "n": 1,
              "lvl": {
                "src": "ownerLevel",
                "arg": "",
                "plus": 0
              }
            }
          ],
          "sprite": "Graphical Assets/Cards/Cat Decks/Cat Deck 2/Ombre Furtive.png"
        },
        {
          "id": "cat2_matriarch",
          "name": "Mère des Chatons",
          "type": "ally",
          "cost": 4,
          "keys": [
            "type:Chat"
          ],
          "text": "Quand tu perds une unité, invoque un Chaton 1/1 avec Passe-Murailles.",
          "play": [],
          "tiers": [
            {
              "lvl": 6,
              "stats": {
                "atk": 0,
                "hp": 2
              },
              "text": "+0/+2"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "on_unitDies_self",
              "text": "Quand tu perds une unité, pioche une carte."
            },
            {
              "lvl": 15,
              "extra": {
                "op": "buff",
                "t": "allyType:Chat",
                "atk": 1,
                "hp": 0
              },
              "slot": "on_unitDies_self",
              "text": "Quand tu perds une unité, tes Chats gagnent +1/+0."
            },
            {
              "lvl": 19,
              "extra": {
                "op": "dmg",
                "t": "enemyHero",
                "v": 2
              },
              "slot": "on_unitDies_self",
              "text": "Quand tu perds une unité, inflige 2 dégâts au héros adverse."
            }
          ],
          "atk": 2,
          "hp": 4,
          "statics": [],
          "on_unitDies_self": [
            {
              "op": "summon",
              "n": 1,
              "unit": {
                "name": "Chaton",
                "atk": 1,
                "hp": 1,
                "keys": [
                  "passe_murailles",
                  "type:Chat"
                ],
                "statics": []
              }
            }
          ]
        },
        {
          "id": "cat2_yowl",
          "name": "Concert Nocturne",
          "type": "spell",
          "cost": 3,
          "keys": [
            "type:Chat"
          ],
          "text": "Tes Chats gagnent +1/+1 et Passe-Murailles.",
          "play": [
            {
              "op": "buff",
              "t": "allyType:Chat",
              "atk": 1,
              "hp": 1,
              "key": "passe_murailles"
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Chaton",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "passe_murailles",
                    "type:Chat"
                  ],
                  "statics": []
                }
              },
              "text": "Invoque aussi un Chaton."
            },
            {
              "lvl": 13,
              "extra": {
                "op": "mana_au_prochain_tour",
                "x": 1
              },
              "text": "Gagne 1 mana au prochain tour."
            },
            {
              "lvl": 18,
              "extra": {
                "op": "buff",
                "t": "allyType:Chat",
                "atk": 0,
                "hp": 0,
                "key": "Charge"
              },
              "text": "Tes Chats gagnent aussi Charge."
            }
          ]
        },
        {
          "id": "cat2_pick",
          "name": "Tire-Laine",
          "type": "ally",
          "cost": 2,
          "keys": [
            "Charge",
            "type:Chat"
          ],
          "text": "Charge. Cri de guerre : pioche une carte.",
          "play": [
            {
              "op": "draw",
              "v": 1
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "death",
              "text": "Râle d’agonie : pioche une carte."
            },
            {
              "lvl": 16,
              "extra": {
                "op": "cree",
                "choix": "precise",
                "carte": "cat_pounce",
                "quoi": "all",
                "argCard": "",
                "n": 1,
                "lvl": {
                  "src": "ownerLevel",
                  "arg": "",
                  "plus": 0
                }
              },
              "text": "Cri de guerre : crée une Griffure dans ta main."
            }
          ],
          "atk": 2,
          "hp": 1,
          "statics": []
        },
        {
          "id": "cat2_roof",
          "name": "Roi des Toits",
          "type": "ally",
          "cost": 6,
          "keys": [
            "Charge",
            "passe_murailles",
            "type:Chat"
          ],
          "text": "Charge. Passe-Murailles. Tes autres Chats ont +1/+0. Quand tu lances un sort, inflige 1 dégât au héros adverse.",
          "play": [],
          "tiers": [
            {
              "lvl": 4,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 9,
              "aura": {
                "key": "",
                "atk": 0,
                "hp": 1,
                "scope": "sameTypeAllies"
              },
              "text": "Aura : tes autres Chats ont +0/+1 de plus."
            },
            {
              "lvl": 14,
              "extra": {
                "op": "buff",
                "t": "self",
                "atk": 1,
                "hp": 1
              },
              "slot": "on_spell_self",
              "text": "Quand tu lances un sort, gagne +1/+1."
            },
            {
              "lvl": 20,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "on_spell_self",
              "text": "Quand tu lances un sort, pioche une carte."
            }
          ],
          "atk": 4,
          "hp": 6,
          "statics": [],
          "aura": {
            "scope": "sameTypeAllies",
            "atk": 1,
            "hp": 0,
            "key": ""
          },
          "on_spell_self": [
            {
              "op": "dmg",
              "t": "enemyHero",
              "v": 1
            }
          ]
        }
      ]
    },
    {
      "id": "crow2",
      "name": "Sirocco",
      "species": "Faucon",
      "sprite": "Graphical Assets/Characters/Birds/Falcon.png",
      "role": "Rapace — Aggro Tempo : une main pleine, des coups qui comptent",
      "stats": {
        "hp": 24,
        "mana": 8,
        "hand": 2
      },
      "cards": [
        {
          "id": "crow2_eaglet",
          "name": "Aiglon",
          "type": "ally",
          "cost": 2,
          "keys": [
            "Charge",
            "type:Oiseau",
            "type:Faucon"
          ],
          "text": "Charge. Cri de guerre : les cartes de ta main gagnent +1/+0.",
          "play": [
            {
              "op": "renforce_les_cartes",
              "d_ou": "main",
              "qui": "toi",
              "quoi": "all",
              "argCard": "",
              "ordre": "hasard",
              "n": 8,
              "atk": 1,
              "hp": 0
            }
          ],
          "tiers": [
            {
              "lvl": 4,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "renforce_les_cartes",
                "d_ou": "main",
                "qui": "toi",
                "quoi": "all",
                "argCard": "",
                "ordre": "hasard",
                "n": 8,
                "atk": 0,
                "hp": 1
              },
              "text": "Cri de guerre : les cartes de ta main gagnent aussi +0/+1."
            },
            {
              "lvl": 16,
              "extra": {
                "op": "renforce_les_cartes",
                "d_ou": "main",
                "qui": "toi",
                "quoi": "all",
                "argCard": "",
                "ordre": "hasard",
                "n": 8,
                "atk": 1,
                "hp": 0
              },
              "slot": "death",
              "text": "Râle d’agonie : les cartes de ta main gagnent +1/+0."
            },
            {
              "lvl": 18,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Cri de guerre : pioche une carte."
            }
          ],
          "atk": 2,
          "hp": 1,
          "statics": []
        },
        {
          "id": "crow2_dive",
          "name": "Piqué",
          "type": "spell",
          "cost": 2,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Un allié gagne +X/+0 et Charge, X étant le nombre de cartes dans ta main.",
          "play": [
            {
              "op": "buff",
              "t": "allyUnit",
              "atk": {
                "src": "handCards",
                "arg": "",
                "plus": 0
              },
              "hp": 0,
              "key": "Charge"
            }
          ],
          "tiers": [
            {
              "lvl": 5,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            },
            {
              "lvl": 14,
              "extra": {
                "op": "dmg",
                "t": "enemyHero",
                "v": {
                  "src": "handCards",
                  "arg": "",
                  "plus": 0
                }
              },
              "text": "Inflige aussi X dégâts au héros adverse (X = cartes en main)."
            }
          ],
          "sprite": "Graphical Assets/Cards/Raven Decks/Raven Deck 2/Piqué.png"
        },
        {
          "id": "crow2_hawk",
          "name": "Faucon Avare",
          "type": "ally",
          "cost": 3,
          "keys": [
            "type:Oiseau",
            "type:Faucon",
            "characteristique_variable:atk:handCards:"
          ],
          "text": "Son attaque est égale au nombre de cartes dans ta main.",
          "play": [],
          "tiers": [
            {
              "lvl": 6,
              "key": "Charge",
              "text": "Gagne Charge."
            },
            {
              "lvl": 9,
              "extra": {
                "op": "buff",
                "t": "self",
                "atk": 0,
                "hp": 1
              },
              "slot": "on_draw_self",
              "text": "Quand tu pioches une carte, gagne +0/+1."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "on_attack_self",
              "text": "Quand il attaque, pioche une carte."
            }
          ],
          "atk": 0,
          "hp": 3,
          "statics": [],
          "gardes": {
            "on_attack_self": "moi"
          }
        },
        {
          "id": "crow2_gust",
          "name": "Sergent des nuées",
          "type": "ally",
          "cost": 3,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Tes Oiseaux gagnent +2/+1.",
          "play": [
            {
              "op": "buff",
              "t": "allyType:Oiseau",
              "atk": 2,
              "hp": 1
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "renforce_les_cartes",
                "d_ou": "main",
                "qui": "toi",
                "quoi": "all",
                "argCard": "",
                "ordre": "hasard",
                "n": 8,
                "atk": 1,
                "hp": 0
              },
              "text": "Les cartes de ta main gagnent aussi +1/+0."
            },
            {
              "lvl": 15,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            }
          ],
          "atk": 2,
          "hp": 2,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Raven Decks/Raven Deck 2/Sergent des nuées.png"
        },
        {
          "id": "crow2_roc",
          "name": "Oiseau-Roc",
          "type": "ally",
          "cost": 6,
          "keys": [
            "type:Oiseau",
            "type:Faucon"
          ],
          "text": "Quand tu pioches une carte, inflige 1 dégât au héros adverse.",
          "play": [],
          "tiers": [
            {
              "lvl": 3,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 13,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "on_attack_self",
              "text": "Quand il attaque, pioche une carte."
            },
            {
              "lvl": 17,
              "statique": {
                "op": "pioche_du_tour",
                "qui": "toi",
                "sens": "plus",
                "v": 1
              },
              "text": "Tu pioches une carte de plus par tour."
            }
          ],
          "atk": 5,
          "hp": 5,
          "statics": [],
          "on_draw_self": [
            {
              "op": "dmg",
              "t": "enemyHero",
              "v": 1
            }
          ],
          "gardes": {
            "on_attack_self": "moi"
          }
        }
      ],
      "switches": [
        {
          "id": "crow2_sparrow",
          "name": "Moineau Messager",
          "type": "ally",
          "cost": 1,
          "keys": [
            "elusif",
            "type:Oiseau"
          ],
          "text": "Élusif. Cri de guerre : pioche une carte.",
          "play": [
            {
              "op": "draw",
              "v": 1
            }
          ],
          "tiers": [
            {
              "lvl": 6,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "death",
              "text": "Râle d’agonie : pioche une carte."
            },
            {
              "lvl": 13,
              "extra": {
                "op": "renforce_les_cartes",
                "d_ou": "main",
                "qui": "toi",
                "quoi": "all",
                "argCard": "",
                "ordre": "hasard",
                "n": 8,
                "atk": 1,
                "hp": 0
              },
              "text": "Cri de guerre : les cartes de ta main gagnent +1/+0."
            }
          ],
          "atk": 1,
          "hp": 1,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Raven Decks/Raven Deck 2/Moineau Messager.png"
        },
        {
          "id": "crow2_dart",
          "name": "Serres Plongeantes",
          "type": "spell",
          "cost": 1,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Inflige X dégâts à une unité adverse, X étant le nombre de cartes dans ta main.",
          "play": [
            {
              "op": "dmg",
              "t": "enemyUnit",
              "v": {
                "src": "handCards",
                "arg": "",
                "plus": 0
              }
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            },
            {
              "lvl": 16,
              "extra": {
                "op": "dmg",
                "t": "enemyHero",
                "v": 2
              },
              "text": "Inflige aussi 2 dégâts au héros adverse."
            }
          ],
          "sprite": "Graphical Assets/Cards/Raven Decks/Raven Deck 2/Serres Plongeantes.png"
        },
        {
          "id": "crow2_robin",
          "name": "Rouge-Gorge Chanceux",
          "type": "ally",
          "cost": 2,
          "keys": [
            "type:Oiseau",
            "type:Faucon"
          ],
          "text": "Quand tu pioches une carte, un de tes alliés au hasard gagne +1/+0.",
          "play": [],
          "tiers": [
            {
              "lvl": 3,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "dmg",
                "t": "randomEnemyAny",
                "v": 1
              },
              "slot": "on_draw_self",
              "text": "Quand tu pioches une carte, inflige 1 dégât à un ennemi au hasard."
            },
            {
              "lvl": 14,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "death",
              "text": "Râle d’agonie : pioche une carte."
            }
          ],
          "atk": 1,
          "hp": 3,
          "statics": [],
          "on_draw_self": [
            {
              "op": "buff",
              "t": "randomAllyUnit",
              "atk": 1,
              "hp": 0
            }
          ]
        },
        {
          "id": "crow2_cry",
          "name": "Cri du Faucon",
          "type": "spell",
          "cost": 2,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Les cartes de ta main gagnent +2/+2.",
          "play": [
            {
              "op": "renforce_les_cartes",
              "d_ou": "main",
              "qui": "toi",
              "quoi": "all",
              "argCard": "",
              "ordre": "hasard",
              "n": 8,
              "atk": 2,
              "hp": 2
            }
          ],
          "tiers": [
            {
              "lvl": 4,
              "extra": {
                "op": "renforce_les_cartes",
                "d_ou": "main",
                "qui": "toi",
                "quoi": "all",
                "argCard": "",
                "ordre": "hasard",
                "n": 8,
                "atk": 1,
                "hp": 1
              },
              "text": "Les cartes de ta main gagnent +1/+1 de plus."
            },
            {
              "lvl": 8,
              "extra": {
                "op": "mana_au_prochain_tour",
                "x": 1
              },
              "text": "Gagne 1 mana au prochain tour."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            },
            {
              "lvl": 19,
              "extra": {
                "op": "renforce_les_cartes",
                "d_ou": "pioche",
                "qui": "toi",
                "quoi": "all",
                "argCard": "",
                "ordre": "hasard",
                "n": 15,
                "atk": 1,
                "hp": 1
              },
              "text": "Les cartes de ta pioche gagnent +1/+1."
            }
          ]
        },
        {
          "id": "crow2_storm",
          "name": "Faucon Tempête",
          "type": "ally",
          "cost": 5,
          "keys": [
            "Charge",
            "elusif",
            "type:Oiseau",
            "type:Faucon"
          ],
          "text": "Charge. Élusif. Cri de guerre : inflige X dégâts au héros adverse, X étant le nombre de cartes dans ta main.",
          "play": [
            {
              "op": "dmg",
              "t": "enemyHero",
              "v": {
                "src": "handCards",
                "arg": "",
                "plus": 0
              }
            }
          ],
          "tiers": [
            {
              "lvl": 5,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 15,
              "extra": {
                "op": "dmg",
                "t": "enemyHero",
                "v": 1
              },
              "slot": "on_attack_self",
              "text": "Quand il attaque, inflige 1 dégât au héros adverse."
            },
            {
              "lvl": 20,
              "extra": {
                "op": "dmg",
                "t": "enemyHero",
                "v": {
                  "src": "handCards",
                  "arg": "",
                  "plus": 0
                }
              },
              "slot": "death",
              "text": "Râle d’agonie : inflige X dégâts au héros adverse (X = cartes en main)."
            }
          ],
          "atk": 4,
          "hp": 3,
          "statics": [],
          "gardes": {
            "on_attack_self": "moi"
          }
        }
      ]
    },
    {
      "id": "frog2",
      "name": "Reinette",
      "species": "Grenouille",
      "sprite": "Graphical Assets/Characters/Frog/Frog Venomous.png",
      "role": "Marais — Combo croissance : chaque renfort déclenche quelque chose",
      "stats": {
        "hp": 27,
        "mana": 7,
        "hand": 2
      },
      "cards": [
        {
          "id": "frog2_spawn",
          "name": "Frai",
          "type": "spell",
          "cost": 2,
          "keys": [
            "type:Grenouille"
          ],
          "text": "Invoque deux Têtards 1/1.",
          "play": [
            {
              "op": "summon",
              "n": 2,
              "unit": {
                "name": "Têtard",
                "atk": 1,
                "hp": 1,
                "keys": [
                  "type:Têtard",
                  "type:Grenouille"
                ],
                "statics": [],
                "on_renfort_self": [
                  {
                    "op": "buff",
                    "t": "self",
                    "atk": 1,
                    "hp": 1
                  }
                ]
              }
            }
          ],
          "tiers": [
            {
              "lvl": 5,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Têtard",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Têtard",
                    "type:Grenouille"
                  ],
                  "statics": [],
                  "on_renfort_self": [
                    {
                      "op": "buff",
                      "t": "self",
                      "atk": 1,
                      "hp": 1
                    }
                  ]
                }
              },
              "text": "Invoque un Têtard de plus."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "buff",
                "t": "allyType:Têtard",
                "atk": 1,
                "hp": 1
              },
              "text": "Tes Têtards gagnent +1/+1."
            },
            {
              "lvl": 17,
              "extra": {
                "op": "buff",
                "t": "allAllies",
                "atk": 1,
                "hp": 1
              },
              "text": "Tous tes alliés gagnent +1/+1."
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 2/Frai.png"
        },
        {
          "id": "frog2_croak",
          "name": "Coasseur",
          "type": "ally",
          "cost": 2,
          "keys": [
            "type:Grenouille"
          ],
          "text": "Quand cette unité reçoit du renfort, inflige 2 dégâts au héros adverse.",
          "play": [],
          "tiers": [
            {
              "lvl": 6,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "buff",
                "t": "self",
                "atk": 0,
                "hp": 1
              },
              "slot": "turnStart",
              "text": "Début de ton tour : gagne +0/+1 (donc 2 dégâts au héros adverse)."
            },
            {
              "lvl": 15,
              "extra": {
                "op": "dmg",
                "t": "randomEnemyAny",
                "v": 1
              },
              "slot": "on_renfort_self",
              "text": "Quand cette unité reçoit du renfort, inflige aussi 1 dégât à un ennemi au hasard."
            }
          ],
          "atk": 1,
          "hp": 3,
          "statics": [],
          "on_renfort_self": [
            {
              "op": "dmg",
              "t": "enemyHero",
              "v": 2
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 2/Coasseur.png"
        },
        {
          "id": "frog2_bull",
          "name": "Crapaud-Buffle",
          "type": "ally",
          "cost": 4,
          "keys": [
            "Taunt",
            "type:Grenouille"
          ],
          "text": "Provocation. Quand cette unité reçoit du renfort, gagne 3 armures et +1/+1.",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 0,
                "hp": 2
              },
              "text": "+0/+2"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "heal",
                "t": "ownHero",
                "v": 2
              },
              "slot": "on_renfort_self",
              "text": "Quand cette unité reçoit du renfort, soigne ton héros de 2."
            },
            {
              "lvl": 13,
              "extra": {
                "op": "buff",
                "t": "allAllies",
                "atk": 1,
                "hp": 1
              },
              "slot": "death",
              "text": "Râle d’agonie : tes alliés gagnent +1/+1."
            }
          ],
          "atk": 2,
          "hp": 5,
          "statics": [],
          "on_renfort_self": [
            {
              "op": "armor",
              "v": 3
            },
            {
              "op": "buff",
              "t": "self",
              "atk": 1,
              "hp": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 2/Crapaud-Buffle.png"
        },
        {
          "id": "frog2_rain",
          "name": "Pluie Fertile",
          "type": "spell",
          "cost": 3,
          "keys": [
            "type:Grenouille"
          ],
          "text": "Tous tes alliés gagnent +1/+1.",
          "play": [
            {
              "op": "buff",
              "t": "allAllies",
              "atk": 1,
              "hp": 1
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "heal",
                "t": "ownHero",
                "v": 3
              },
              "text": "Soigne aussi ton héros de 3."
            },
            {
              "lvl": 16,
              "extra": {
                "op": "cree",
                "choix": "precise",
                "carte": "frog_tad",
                "quoi": "all",
                "argCard": "",
                "n": 1,
                "lvl": {
                  "src": "ownerLevel",
                  "arg": "",
                  "plus": 0
                }
              },
              "text": "Crée aussi un Têtard dans ta main."
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 2/Pluie Fertile.png"
        },
        {
          "id": "frog2_elder",
          "name": "Doyen du Marais",
          "type": "ally",
          "cost": 5,
          "keys": [
            "type:Grenouille"
          ],
          "text": "Début de ton tour : un de tes alliés au hasard gagne +1/+1.",
          "play": [],
          "tiers": [
            {
              "lvl": 4,
              "stats": {
                "atk": 0,
                "hp": 2
              },
              "text": "+0/+2"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Têtard",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Têtard",
                    "type:Grenouille"
                  ],
                  "statics": [],
                  "on_renfort_self": [
                    {
                      "op": "buff",
                      "t": "self",
                      "atk": 1,
                      "hp": 1
                    }
                  ]
                }
              },
              "slot": "turnStart",
              "text": "Début de ton tour : invoque aussi un Têtard."
            },
            {
              "lvl": 14,
              "extra": {
                "op": "buff",
                "t": "allyType:Têtard",
                "atk": 1,
                "hp": 1
              },
              "slot": "turnStart",
              "text": "Début de ton tour : tes Têtards gagnent +1/+1."
            },
            {
              "lvl": 18,
              "statique": {
                "op": "montant_des_effets",
                "qui": "toi",
                "cible": "buff",
                "sens": "plus",
                "v": 1
              },
              "text": "Tes renforts donnent 1 de plus."
            }
          ],
          "atk": 3,
          "hp": 5,
          "statics": [],
          "turnStart": [
            {
              "op": "buff",
              "t": "randomAllyUnit",
              "atk": 1,
              "hp": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 2/Doyen du Marais.png"
        }
      ],
      "switches": [
        {
          "id": "frog2_pond",
          "name": "Étang Fécond",
          "type": "ally",
          "cost": 2,
          "keys": [
            "Taunt",
            "type:Grenouille"
          ],
          "text": "Provocation. Début de ton tour : invoque un Têtard.",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 0,
                "hp": 2
              },
              "text": "+0/+2"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "armor",
                "v": 1
              },
              "slot": "turnStart",
              "text": "Début de ton tour : gagne aussi 1 armure."
            },
            {
              "lvl": 14,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Têtard",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Têtard",
                    "type:Grenouille"
                  ],
                  "statics": [],
                  "on_renfort_self": [
                    {
                      "op": "buff",
                      "t": "self",
                      "atk": 1,
                      "hp": 1
                    }
                  ]
                }
              },
              "slot": "turnStart",
              "text": "Début de ton tour : invoque un Têtard de plus."
            },
            {
              "lvl": 19,
              "extra": {
                "op": "buff",
                "t": "allAllies",
                "atk": 0,
                "hp": 1
              },
              "slot": "turnStart",
              "text": "Début de ton tour : tes alliés gagnent +0/+1."
            }
          ],
          "atk": 0,
          "hp": 3,
          "statics": [],
          "turnStart": [
            {
              "op": "summon",
              "n": 1,
              "unit": {
                "name": "Têtard",
                "atk": 1,
                "hp": 1,
                "keys": [
                  "type:Têtard",
                  "type:Grenouille"
                ],
                "statics": [],
                "on_renfort_self": [
                  {
                    "op": "buff",
                    "t": "self",
                    "atk": 1,
                    "hp": 1
                  }
                ]
              }
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 2/Etang Fécond.png"
        },
        {
          "id": "frog2_mud",
          "name": "Bain de Boue",
          "type": "spell",
          "cost": 2,
          "keys": [
            "type:Grenouille"
          ],
          "text": "Tes Têtards gagnent +2/+2.",
          "play": [
            {
              "op": "buff",
              "t": "allyType:Têtard",
              "atk": 2,
              "hp": 2
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Têtard",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Têtard",
                    "type:Grenouille"
                  ],
                  "statics": [],
                  "on_renfort_self": [
                    {
                      "op": "buff",
                      "t": "self",
                      "atk": 1,
                      "hp": 1
                    }
                  ]
                }
              },
              "text": "Invoque aussi un Têtard."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 2/Bain de Boue.png"
        },
        {
          "id": "frog2_queen",
          "name": "Reine des Nénuphars",
          "type": "ally",
          "cost": 3,
          "keys": [
            "type:Grenouille"
          ],
          "text": "Quand cette unité reçoit du renfort, crée un Têtard dans ta main.",
          "play": [],
          "tiers": [
            {
              "lvl": 4,
              "stats": {
                "atk": 1,
                "hp": 1
              },
              "text": "+1/+1"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "cree",
                "choix": "precise",
                "carte": "frog_tad",
                "quoi": "all",
                "argCard": "",
                "n": 1,
                "lvl": {
                  "src": "ownerLevel",
                  "arg": "",
                  "plus": 0
                }
              },
              "slot": "death",
              "text": "Râle d’agonie : crée un Têtard dans ta main."
            },
            {
              "lvl": 15,
              "extra": {
                "op": "cree",
                "choix": "precise",
                "carte": "frog_tad",
                "quoi": "all",
                "argCard": "",
                "n": 1,
                "lvl": {
                  "src": "ownerLevel",
                  "arg": "",
                  "plus": 0
                }
              },
              "text": "Cri de guerre : crée un Têtard dans ta main."
            }
          ],
          "atk": 2,
          "hp": 2,
          "statics": [],
          "on_renfort_self": [
            {
              "op": "cree",
              "choix": "precise",
              "carte": "frog_tad",
              "quoi": "all",
              "argCard": "",
              "n": 1,
              "lvl": {
                "src": "ownerLevel",
                "arg": "",
                "plus": 0
              }
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 2/Reine des Nénuphars.png"
        },
        {
          "id": "frog2_leaper",
          "name": "Sauteur Électrique",
          "type": "ally",
          "cost": 3,
          "keys": [
            "type:Grenouille"
          ],
          "text": "Quand cette unité reçoit du renfort, inflige 2 dégâts à un ennemi au hasard.",
          "play": [],
          "tiers": [
            {
              "lvl": 5,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "buff",
                "t": "self",
                "atk": 1,
                "hp": 0
              },
              "slot": "turnEnd",
              "text": "Fin de ton tour : gagne +1/+0 (donc 2 dégâts à un ennemi au hasard)."
            },
            {
              "lvl": 13,
              "key": "elusif",
              "text": "Gagne Élusif."
            }
          ],
          "atk": 2,
          "hp": 2,
          "statics": [],
          "on_renfort_self": [
            {
              "op": "dmg",
              "t": "randomEnemyAny",
              "v": 2
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 2/Sauteur Electrique.png"
        },
        {
          "id": "frog2_king",
          "name": "Roi Crapaud",
          "type": "ally",
          "cost": 7,
          "keys": [
            "Taunt",
            "type:Grenouille"
          ],
          "text": "Provocation. Quand cette unité reçoit du renfort, tes autres alliés gagnent +1/+1.",
          "play": [],
          "tiers": [
            {
              "lvl": 6,
              "stats": {
                "atk": 1,
                "hp": 1
              },
              "text": "+1/+1"
            },
            {
              "lvl": 16,
              "extra": {
                "op": "buff",
                "t": "self",
                "atk": 1,
                "hp": 1
              },
              "slot": "turnStart",
              "text": "Début de ton tour : gagne +1/+1 (donc tes alliés aussi)."
            },
            {
              "lvl": 20,
              "extra": {
                "op": "summon",
                "n": 3,
                "unit": {
                  "name": "Têtard",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Têtard",
                    "type:Grenouille"
                  ],
                  "statics": [],
                  "on_renfort_self": [
                    {
                      "op": "buff",
                      "t": "self",
                      "atk": 1,
                      "hp": 1
                    }
                  ]
                }
              },
              "text": "Cri de guerre : invoque trois Têtards."
            }
          ],
          "atk": 6,
          "hp": 6,
          "statics": [],
          "on_renfort_self": [
            {
              "op": "buff",
              "t": "allAllies",
              "atk": 1,
              "hp": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 2/Roi Crapaud.png"
        }
      ]
    },
    {
      "id": "owl2",
      "name": "Morphée",
      "species": "Hibou",
      "sprite": "Graphical Assets/Characters/Owl/Owl Snow.png",
      "role": "Veilleur — Contrôle Pillow Fort : le temps joue pour lui",
      "stats": {
        "hp": 28,
        "mana": 9,
        "hand": 2
      },
      "cards": [
        {
          "id": "owl2_nest",
          "name": "Nid Douillet",
          "type": "ally",
          "cost": 2,
          "keys": [
            "Taunt",
            "type:Oiseau",
            "type:Hibou"
          ],
          "text": "Provocation. Fin de ton tour : ton héros gagne 1 armure.",
          "play": [],
          "tiers": [
            {
              "lvl": 6,
              "stats": {
                "atk": 0,
                "hp": 2
              },
              "text": "+0/+2"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "buff",
                "t": "self",
                "atk": 0,
                "hp": 1
              },
              "slot": "turnEnd",
              "text": "Fin de ton tour : gagne aussi +0/+1."
            },
            {
              "lvl": 13,
              "statique": {
                "op": "degats_du_heros",
                "qui": "toi",
                "sens": "moins",
                "v": 1
              },
              "text": "Les dégâts subis par ton héros sont réduits de 1."
            }
          ],
          "atk": 0,
          "hp": 4,
          "statics": [],
          "turnEnd": [
            {
              "op": "armor",
              "v": 1
            }
          ]
        },
        {
          "id": "owl2_sand",
          "name": "Sablier",
          "type": "spell",
          "cost": 3,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Inflige au héros adverse autant de dégâts que de tours que tu as joués.",
          "play": [
            {
              "op": "dmg",
              "t": "enemyHero",
              "v": {
                "src": "ownTurns",
                "arg": "",
                "plus": 0
              }
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "heal",
                "t": "ownHero",
                "v": {
                  "src": "ownTurns",
                  "arg": "",
                  "plus": 0
                }
              },
              "text": "Soigne aussi ton héros d’autant."
            },
            {
              "lvl": 16,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            }
          ]
        },
        {
          "id": "owl2_watch",
          "name": "Hibou Centenaire",
          "type": "ally",
          "cost": 5,
          "keys": [
            "Taunt",
            "type:Oiseau",
            "type:Hibou",
            "characteristique_variable:both:ownTurns:"
          ],
          "text": "Provocation. Attaque et vie égales au nombre de tours que tu as joués.",
          "play": [],
          "tiers": [
            {
              "lvl": 3,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "heal",
                "t": "ownHero",
                "v": 2
              },
              "slot": "turnStart",
              "text": "Début de ton tour : soigne ton héros de 2."
            },
            {
              "lvl": 14,
              "extra": {
                "op": "dmg",
                "t": "randomEnemyAny",
                "v": {
                  "src": "ownTurns",
                  "arg": "",
                  "plus": 0
                }
              },
              "slot": "death",
              "text": "Râle d’agonie : inflige X dégâts à un ennemi au hasard (X = tes tours)."
            },
            {
              "lvl": 18,
              "statique": {
                "op": "mana_du_tour",
                "qui": "toi",
                "sens": "plus",
                "v": 1
              },
              "text": "Tu as 1 mana de plus par tour."
            }
          ],
          "atk": 0,
          "hp": 0,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Owl Decks/Owl Deck 2/Hibou Centenaire.png"
        },
        {
          "id": "owl2_lull",
          "name": "Hibou Berceur",
          "type": "ally",
          "cost": 4,
          "keys": [
            "type:Oiseau",
            "type:Hibou"
          ],
          "text": "Les cartes de l'adversaire coûtent 1 de plus.",
          "play": [],
          "tiers": [
            {
              "lvl": 4,
              "stats": {
                "atk": 0,
                "hp": 2
              },
              "text": "+0/+2"
            },
            {
              "lvl": 8,
              "key": "Taunt",
              "text": "Gagne Provocation."
            },
            {
              "lvl": 12,
              "statique": {
                "op": "cout_des_cartes",
                "qui": "adversaire",
                "quoi": "all",
                "argCard": "",
                "sens": "plus",
                "v": 1
              },
              "text": "Les cartes adverses coûtent encore 1 de plus."
            }
          ],
          "atk": 2,
          "hp": 6,
          "statics": [
            {
              "op": "cout_des_cartes",
              "qui": "adversaire",
              "quoi": "all",
              "argCard": "",
              "sens": "plus",
              "v": 1
            }
          ]
        },
        {
          "id": "owl2_elder",
          "name": "Grand Veilleur",
          "type": "ally",
          "cost": 7,
          "keys": [
            "Taunt",
            "type:Oiseau",
            "type:Hibou"
          ],
          "text": "Provocation. Début de ton tour : inflige 2 dégâts à un ennemi au hasard.",
          "play": [],
          "tiers": [
            {
              "lvl": 5,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 15,
              "extra": {
                "op": "armor",
                "v": 2
              },
              "slot": "turnStart",
              "text": "Début de ton tour : gagne aussi 2 armures."
            },
            {
              "lvl": 20,
              "extra": {
                "op": "dmg",
                "t": "enemyHero",
                "v": 2
              },
              "slot": "turnStart",
              "text": "Début de ton tour : inflige aussi 2 dégâts au héros adverse."
            }
          ],
          "atk": 4,
          "hp": 9,
          "statics": [],
          "turnStart": [
            {
              "op": "dmg",
              "t": "randomEnemyAny",
              "v": 2
            }
          ],
          "sprite": "Graphical Assets/Cards/Owl Decks/Owl Deck 2/Grand Veilleur.png"
        }
      ],
      "switches": [
        {
          "id": "owl2_egg",
          "name": "Œuf de Hibou",
          "type": "ally",
          "cost": 1,
          "keys": [
            "Taunt",
            "type:Oiseau",
            "type:Hibou"
          ],
          "text": "Provocation. Début de ton tour : gagne +1/+1.",
          "play": [],
          "tiers": [
            {
              "lvl": 3,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "armor",
                "v": 1
              },
              "slot": "turnEnd",
              "text": "Fin de ton tour : ton héros gagne 1 armure."
            },
            {
              "lvl": 15,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Hibou",
                  "atk": 3,
                  "hp": 3,
                  "keys": [
                    "Taunt",
                    "type:Oiseau",
                    "type:Hibou"
                  ],
                  "statics": []
                }
              },
              "slot": "death",
              "text": "Râle d’agonie : l’œuf éclot — invoque un Hibou 3/3 Provocation."
            }
          ],
          "atk": 0,
          "hp": 3,
          "statics": [],
          "turnStart": [
            {
              "op": "buff",
              "t": "self",
              "atk": 1,
              "hp": 1
            }
          ]
        },
        {
          "id": "owl2_dream",
          "name": "Songe",
          "type": "spell",
          "cost": 2,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Choisis : pioche une carte — OU gagne 3 mana au prochain tour.",
          "play": [
            {
              "op": "choisir",
              "a": [
                {
                  "op": "draw",
                  "v": 1
                }
              ],
              "b": [
                {
                  "op": "mana_au_prochain_tour",
                  "x": 3
                }
              ]
            }
          ],
          "tiers": [
            {
              "lvl": 4,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "armor",
                "v": 3
              },
              "text": "Gagne aussi 3 armures."
            },
            {
              "lvl": 13,
              "lesDeux": true,
              "text": "Les deux choix partent : pioche ET mana."
            }
          ],
          "sprite": "Graphical Assets/Cards/Owl Decks/Owl Deck 2/Songe.png"
        },
        {
          "id": "owl2_clock",
          "name": "Coucou",
          "type": "ally",
          "cost": 3,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Fin de ton tour : inflige 1 dégât au héros adverse.",
          "play": [],
          "tiers": [
            {
              "lvl": 5,
              "stats": {
                "atk": 0,
                "hp": 2
              },
              "text": "+0/+2"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "armor",
                "v": 1
              },
              "slot": "turnEnd",
              "text": "Fin de ton tour : ton héros gagne aussi 1 armure."
            },
            {
              "lvl": 16,
              "extra": {
                "op": "dmg",
                "t": "randomEnemyAny",
                "v": 1
              },
              "slot": "turnEnd",
              "text": "Fin de ton tour : inflige aussi 1 dégât à un ennemi au hasard."
            },
            {
              "lvl": 19,
              "statique": {
                "op": "cartes_jouees_remelangees",
                "qui": "toi",
                "quoi": "sorts",
                "sens": "plus",
                "v": 1
              },
              "text": "Les sorts que tu joues retournent dans ta pioche."
            }
          ],
          "atk": 1,
          "hp": 5,
          "statics": [],
          "turnEnd": [
            {
              "op": "dmg",
              "t": "enemyHero",
              "v": 1
            }
          ]
        },
        {
          "id": "owl2_pillow",
          "name": "Oreiller Géant",
          "type": "ally",
          "cost": 5,
          "keys": [
            "Taunt",
            "type:Oiseau"
          ],
          "text": "Provocation. Les dégâts subis par ton héros sont réduits de 1.",
          "play": [],
          "tiers": [
            {
              "lvl": 6,
              "stats": {
                "atk": 0,
                "hp": 2
              },
              "text": "+0/+2"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "heal",
                "t": "ownHero",
                "v": 2
              },
              "slot": "turnEnd",
              "text": "Fin de ton tour : soigne ton héros de 2."
            },
            {
              "lvl": 14,
              "statique": {
                "op": "degats_du_heros",
                "qui": "toi",
                "sens": "moins",
                "v": 1
              },
              "text": "Les dégâts subis par ton héros sont encore réduits de 1."
            },
            {
              "lvl": 17,
              "extra": {
                "op": "armor",
                "v": 8
              },
              "text": "Cri de guerre : ton héros gagne 8 armures."
            }
          ],
          "atk": 2,
          "hp": 8,
          "statics": [
            {
              "op": "degats_du_heros",
              "qui": "toi",
              "sens": "moins",
              "v": 1
            }
          ]
        },
        {
          "id": "owl2_midnight",
          "name": "Minuit",
          "type": "spell",
          "cost": 14,
          "keys": [
            "cout_x_de_moins_de_plus:moins:1:ownTurns:",
            "type:Oiseau"
          ],
          "text": "Coûte 1 de moins par tour que tu as joué. Inflige 18 dégâts au héros adverse.",
          "play": [
            {
              "op": "dmg",
              "t": "enemyHero",
              "v": 18
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "heal",
                "t": "ownHero",
                "v": 6
              },
              "text": "Soigne aussi ton héros de 6."
            }
          ]
        }
      ]
    },
    {
      "id": "cameleon2",
      "name": "Mirage",
      "species": "Cameleon",
      "sprite": "Graphical Assets/Characters/Cameleon/Cameleon.png",
      "role": "Imitateur — Support : donne à chacun le type qu’il lui faut",
      "stats": {
        "hp": 25,
        "mana": 8,
        "hand": 2
      },
      "cards": [
        {
          "id": "cam2_prism",
          "name": "Prisme",
          "type": "ally",
          "cost": 2,
          "keys": [
            "type_tous"
          ],
          "text": "Type : tous. Cri de guerre : un allié gagne Type : tous.",
          "play": [
            {
              "op": "buff",
              "t": "allyUnit",
              "atk": 0,
              "hp": 0,
              "key": "type_tous"
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "buff",
                "t": "previous",
                "atk": 1,
                "hp": 1
              },
              "text": "Cri de guerre : l’allié choisi gagne aussi +1/+1."
            },
            {
              "lvl": 14,
              "extra": {
                "op": "buff",
                "t": "allAllies",
                "atk": 0,
                "hp": 0,
                "key": "type_tous"
              },
              "slot": "death",
              "text": "Râle d’agonie : tes alliés gagnent Type : tous."
            },
            {
              "lvl": 17,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Cri de guerre : pioche une carte."
            }
          ],
          "atk": 1,
          "hp": 3,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Cameleon Decks/Cameleon Deck 2/Prisme.png"
        },
        {
          "id": "cam2_mirror",
          "name": "Reflet",
          "type": "spell",
          "cost": 3,
          "keys": [],
          "text": "Crée 2 Miroirs.",
          "play": [
            {
              "op": "cree",
              "choix": "precise",
              "carte": "miroir",
              "n": 2
            }
          ],
          "tiers": [
            {
              "lvl": 10,
              "extra": {
                "op": "cree",
                "choix": "precise",
                "carte": "miroir",
                "n": 1
              },
              "text": "Crée un Miroir de plus."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            }
          ],
          "sprite": "Graphical Assets/Cards/Cameleon Decks/Cameleon Deck 2/Reflet.png"
        },
        {
          "id": "cam2_choir",
          "name": "Chœur Chromatique",
          "type": "ally",
          "cost": 4,
          "keys": [
            "type_tous"
          ],
          "text": "Type : tous. Tes autres alliés qui ont un type gagnent +1/+1.",
          "play": [],
          "tiers": [
            {
              "lvl": 4,
              "stats": {
                "atk": 0,
                "hp": 2
              },
              "text": "+0/+2"
            },
            {
              "lvl": 7,
              "aura": {
                "key": "passe_murailles",
                "atk": 0,
                "hp": 0,
                "scope": "sameTypeAllies"
              },
              "text": "Aura : tes autres alliés ont Passe-Murailles."
            },
            {
              "lvl": 15,
              "aura": {
                "key": "",
                "atk": 1,
                "hp": 1,
                "scope": "sameTypeAllies"
              },
              "text": "Aura : tes autres alliés ont +1/+1 de plus."
            }
          ],
          "atk": 3,
          "hp": 4,
          "statics": [],
          "aura": {
            "scope": "sameTypeAllies",
            "atk": 1,
            "hp": 1,
            "key": ""
          }
        },
        {
          "id": "cam2_shed",
          "name": "Mue",
          "type": "spell",
          "cost": 2,
          "keys": [],
          "text": "Renvoie un de tes alliés en main. Tes alliés en main coûtent 1 de moins.",
          "play": [
            {
              "op": "renvoie_en_main",
              "d_ou": "plateau",
              "choix": "precise",
              "carte": "",
              "quoi": "all",
              "argCard": "",
              "t": "allyUnit",
              "qui": "toi",
              "ordre": "hasard",
              "n": 1,
              "fatigue": false,
              "atk": 0,
              "hp": 0
            },
            {
              "op": "reduit_le_cout_de",
              "quoi": "ally",
              "typeDe": "ecrit",
              "argType": "",
              "typeQui": "toi",
              "argKey": "",
              "argCard": "",
              "v": 1
            }
          ],
          "tiers": [
            {
              "lvl": 5,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            },
            {
              "lvl": 13,
              "extra": {
                "op": "reduit_le_cout_de",
                "quoi": "spell",
                "typeDe": "ecrit",
                "argType": "",
                "typeQui": "toi",
                "argKey": "",
                "argCard": "",
                "v": 1
              },
              "text": "Tes sorts en main coûtent aussi 1 de moins."
            }
          ],
          "sprite": "Graphical Assets/Cards/Cameleon Decks/Cameleon Deck 2/Mue.png"
        },
        {
          "id": "cam2_ball",
          "name": "Bal Masqué",
          "type": "spell",
          "cost": 5,
          "keys": [],
          "text": "Tous tes alliés gagnent +1/+1 et Type : tous.",
          "play": [
            {
              "op": "buff",
              "t": "allAllies",
              "atk": 1,
              "hp": 1,
              "key": "type_tous"
            }
          ],
          "tiers": [
            {
              "lvl": 6,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Double",
                  "atk": 2,
                  "hp": 2,
                  "keys": [
                    "type_tous"
                  ],
                  "statics": []
                }
              },
              "text": "Invoque aussi un Double 2/2 Type : tous."
            },
            {
              "lvl": 16,
              "extra": {
                "op": "draw",
                "v": 2
              },
              "text": "Pioche aussi deux cartes."
            },
            {
              "lvl": 18,
              "extra": {
                "op": "buff",
                "t": "allAllies",
                "atk": 1,
                "hp": 1
              },
              "text": "Tous tes alliés gagnent +1/+1 de plus."
            }
          ]
        }
      ],
      "switches": [
        {
          "id": "cam2_bud",
          "name": "Bourgeon",
          "type": "ally",
          "cost": 1,
          "keys": [
            "type_tous"
          ],
          "text": "Type : tous. Début de ton tour : gagne +1/+0.",
          "play": [],
          "tiers": [
            {
              "lvl": 4,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "buff",
                "t": "self",
                "atk": 0,
                "hp": 1
              },
              "slot": "turnStart",
              "text": "Début de ton tour : gagne aussi +0/+1."
            },
            {
              "lvl": 16,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Double",
                  "atk": 2,
                  "hp": 2,
                  "keys": [
                    "type_tous"
                  ],
                  "statics": []
                }
              },
              "slot": "death",
              "text": "Râle d’agonie : invoque un Double 2/2 Type : tous."
            }
          ],
          "atk": 1,
          "hp": 2,
          "statics": [],
          "turnStart": [
            {
              "op": "buff",
              "t": "self",
              "atk": 1,
              "hp": 0
            }
          ],
          "sprite": "Graphical Assets/Cards/Cameleon Decks/Cameleon Deck 2/Bourgeon.png"
        },
        {
          "id": "cam2_double",
          "name": "Doublure",
          "type": "spell",
          "cost": 3,
          "keys": [],
          "text": "Invoque deux Doubles 2/2 avec Type : tous.",
          "play": [
            {
              "op": "summon",
              "n": 2,
              "unit": {
                "name": "Double",
                "atk": 2,
                "hp": 2,
                "keys": [
                  "type_tous"
                ],
                "statics": []
              }
            }
          ],
          "tiers": [
            {
              "lvl": 5,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Double",
                  "atk": 2,
                  "hp": 2,
                  "keys": [
                    "type_tous"
                  ],
                  "statics": []
                }
              },
              "text": "Invoque un Double de plus."
            },
            {
              "lvl": 14,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            },
            {
              "lvl": 19,
              "extra": {
                "op": "summon",
                "n": 2,
                "unit": {
                  "name": "Double",
                  "atk": 2,
                  "hp": 2,
                  "keys": [
                    "type_tous"
                  ],
                  "statics": []
                }
              },
              "text": "Invoque deux Doubles de plus."
            }
          ],
          "sprite": "Graphical Assets/Cards/Cameleon Decks/Cameleon Deck 2/Doublure.png"
        },
        {
          "id": "cam2_veil",
          "name": "Voile Chromatique",
          "type": "spell",
          "cost": 2,
          "keys": [],
          "text": "Un allié gagne +0/+3 et Élusif.",
          "play": [
            {
              "op": "buff",
              "t": "allyUnit",
              "atk": 0,
              "hp": 3,
              "key": "elusif"
            }
          ],
          "tiers": [
            {
              "lvl": 6,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "buff",
                "t": "previous",
                "atk": 0,
                "hp": 0,
                "key": "type_tous"
              },
              "text": "L’allié gagne aussi Type : tous."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "armor",
                "v": 3
              },
              "text": "Ton héros gagne aussi 3 armures."
            }
          ],
          "sprite": "Graphical Assets/Cards/Cameleon Decks/Cameleon Deck 2/Voile Chromatique.png"
        },
        {
          "id": "cam2_mime",
          "name": "Mime",
          "type": "ally",
          "cost": 3,
          "keys": [
            "type_tous"
          ],
          "text": "Type : tous. Quand tu joues un allié, il gagne +1/+0 et Type : tous.",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 0,
                "hp": 2
              },
              "text": "+0/+2"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "heal",
                "t": "ownHero",
                "v": 1
              },
              "slot": "on_ally_self",
              "text": "Quand tu joues un allié, soigne ton héros de 1."
            },
            {
              "lvl": 15,
              "extra": {
                "op": "armor",
                "v": 1
              },
              "slot": "on_ally_self",
              "text": "Quand tu joues un allié, ton héros gagne 1 armure."
            }
          ],
          "atk": 2,
          "hp": 3,
          "statics": [],
          "on_ally_self": [
            {
              "op": "buff",
              "t": "previous",
              "atk": 1,
              "hp": 0,
              "key": "type_tous"
            }
          ],
          "sprite": "Graphical Assets/Cards/Cameleon Decks/Cameleon Deck 2/Mime.png"
        },
        {
          "id": "cam2_chimera",
          "name": "Chimère",
          "type": "ally",
          "cost": 6,
          "keys": [
            "type_tous"
          ],
          "text": "Type : tous. Les unités adverses ont -1/-0.",
          "play": [],
          "tiers": [
            {
              "lvl": 3,
              "stats": {
                "atk": 1,
                "hp": 1
              },
              "text": "+1/+1"
            },
            {
              "lvl": 8,
              "aura": {
                "key": "",
                "atk": -1,
                "hp": 0,
                "scope": "enemyUnits"
              },
              "text": "Aura : les unités adverses ont -1/-0 de plus."
            },
            {
              "lvl": 13,
              "extra": {
                "op": "dmg",
                "t": "randomEnemyAny",
                "v": 1
              },
              "slot": "turnStart",
              "text": "Début de ton tour : inflige 1 dégât à un ennemi au hasard."
            },
            {
              "lvl": 20,
              "statique": {
                "op": "cout_des_cartes",
                "qui": "adversaire",
                "quoi": "all",
                "argCard": "",
                "sens": "plus",
                "v": 1
              },
              "text": "Les cartes adverses coûtent 1 de plus."
            }
          ],
          "atk": 5,
          "hp": 6,
          "statics": [],
          "aura": {
            "scope": "enemyUnits",
            "atk": -1,
            "hp": 0,
            "key": ""
          },
          "sprite": "Graphical Assets/Cards/Cameleon Decks/Cameleon Deck 2/Chimère.png"
        }
      ]
    },
    {
      "id": "dog3",
      "name": "Patou",
      "species": "Chien",
      "sprite": "Graphical Assets/Characters/Dog/Dog Cocker.png",
      "role": "Berger — Contrôle Soft : taxe, punit et défausse ce que l’adversaire veut jouer",
      "stats": {
        "hp": 30,
        "mana": 7,
        "hand": 2
      },
      "cards": [
        {
          "id": "dog3_herd",
          "name": "Chien de Troupeau",
          "type": "ally",
          "cost": 1,
          "keys": [
            "type:Chien"
          ],
          "text": "Cri de guerre : piste une carte. Quand l’adversaire joue une carte pistée, tu gagnes 3 PV.",
          "play": [
            {
              "op": "piste",
              "n": 1
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "piste",
                "n": 1
              },
              "slot": "death",
              "text": "Râle d’agonie : piste une carte."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "on_pistee_foe",
              "text": "Quand l’adversaire joue une carte pistée, pioche une carte."
            },
            {
              "lvl": 18,
              "statique": {
                "op": "pistage_a_la_pioche",
                "qui": "adversaire",
                "sens": "plus",
                "v": 1
              },
              "text": "Statique : les cartes que l’adversaire pioche sont pistées."
            }
          ],
          "atk": 1,
          "hp": 2,
          "statics": [],
          "on_pistee_foe": [
            {
              "op": "heal",
              "t": "ownHero",
              "v": 3
            }
          ]
        },
        {
          "id": "dog3_shepherd",
          "name": "Berger Vigilant",
          "type": "ally",
          "cost": 2,
          "keys": [
            "type:Chien"
          ],
          "text": "Cri de guerre : piste une carte. Les cartes pistées coûtent 2 de plus.",
          "play": [
            {
              "op": "piste",
              "n": 1
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "piste",
                "n": 1
              },
              "slot": "turnEnd",
              "text": "Fin de ton tour : piste une carte."
            },
            {
              "lvl": 13,
              "aura": {
                "key": "",
                "atk": 0,
                "hp": 1,
                "scope": "sameTypeAllies"
              },
              "text": "Aura : tes autres Chiens ont +0/+1."
            },
            {
              "lvl": 20,
              "statique": {
                "op": "limite_de_cartes_jouees",
                "qui": "adversaire",
                "v": 1
              },
              "text": "Statique : l’adversaire ne peut jouer qu’une carte par tour."
            }
          ],
          "atk": 2,
          "hp": 3,
          "statics": [
            {
              "op": "cout_des_cartes",
              "qui": "adversaire",
              "quoi": "pistee",
              "argCard": "",
              "sens": "plus",
              "v": 2
            }
          ]
        },
        {
          "id": "dog3_train",
          "name": "Dressage",
          "type": "spell",
          "cost": 2,
          "keys": [
            "type:Chien"
          ],
          "text": "Piste une carte. Inflige X dégâts à une unité adverse, X étant le nombre de cartes pistées.",
          "play": [
            {
              "op": "piste",
              "n": 1
            },
            {
              "op": "dmg",
              "t": "enemyUnit",
              "v": {
                "src": "cartesPistees",
                "arg": "",
                "plus": 0
              }
            }
          ],
          "tiers": [
            {
              "lvl": 4,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            },
            {
              "lvl": 15,
              "extra": {
                "op": "dmg",
                "t": "enemyHero",
                "v": {
                  "src": "cartesPistees",
                  "arg": "",
                  "plus": 0
                }
              },
              "text": "Inflige aussi X dégâts au héros adverse."
            }
          ]
        },
        {
          "id": "dog3_patou",
          "name": "Patou",
          "type": "ally",
          "cost": 4,
          "keys": [
            "Taunt",
            "type:Chien"
          ],
          "text": "Provocation. Cri de guerre : piste une carte. Quand l’adversaire joue une carte pistée, il perd 5 PV.",
          "play": [
            {
              "op": "piste",
              "n": 1
            }
          ],
          "tiers": [
            {
              "lvl": 5,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "armor",
                "v": 2
              },
              "slot": "turnEnd",
              "text": "Fin de ton tour : ton héros gagne 2 d’armure."
            },
            {
              "lvl": 16,
              "aura": {
                "key": "",
                "atk": -1,
                "hp": 0,
                "scope": "enemyUnits"
              },
              "text": "Aura : les unités adverses ont -1/-0."
            },
            {
              "lvl": 17,
              "extra": {
                "op": "detruit",
                "t": "randomEnemyUnit"
              },
              "slot": "on_pistee_foe",
              "text": "Quand l’adversaire joue une carte pistée, détruis une de ses unités."
            }
          ],
          "atk": 3,
          "hp": 5,
          "statics": [],
          "on_pistee_foe": [
            {
              "op": "dmg",
              "t": "enemyHero",
              "v": 5
            }
          ]
        },
        {
          "id": "dog3_hunt",
          "name": "Chasse au Loup",
          "type": "spell",
          "cost": 5,
          "keys": [
            "type:Chien"
          ],
          "text": "Détruis une unité adverse. Piste deux cartes.",
          "play": [
            {
              "op": "detruit",
              "t": "enemyUnit"
            },
            {
              "op": "piste",
              "n": 2
            }
          ],
          "tiers": [
            {
              "lvl": 6,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            },
            {
              "lvl": 14,
              "extra": {
                "op": "piste",
                "n": 99
              },
              "text": "Piste aussi toute la main adverse."
            }
          ]
        }
      ],
      "switches": [
        {
          "id": "dog3_pup",
          "name": "Chiot Pisteur",
          "type": "ally",
          "cost": 2,
          "keys": [
            "type:Chien"
          ],
          "text": "Cri de guerre : piste une carte. Quand l’adversaire joue une carte pistée, tes Chiens gagnent +1/+1.",
          "play": [
            {
              "op": "piste",
              "n": 1
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "heal",
                "t": "ownHero",
                "v": 3
              },
              "slot": "on_pistee_foe",
              "text": "Quand l’adversaire joue une carte pistée, tu gagnes aussi 3 PV."
            },
            {
              "lvl": 13,
              "aura": {
                "key": "",
                "atk": 1,
                "hp": 0,
                "scope": "sameTypeAllies"
              },
              "text": "Aura : tes autres Chiens ont +1/+0."
            },
            {
              "lvl": 19,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "on_pistee_foe",
              "text": "Quand l’adversaire joue une carte pistée, pioche une carte."
            }
          ],
          "atk": 2,
          "hp": 3,
          "statics": [],
          "on_pistee_foe": [
            {
              "op": "buff",
              "t": "allyType:Chien",
              "atk": 1,
              "hp": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Dog Decks/Dog Deck 3/Chiot Pisteur.png"
        },
        {
          "id": "dog3_muzzle",
          "name": "Muselière",
          "type": "spell",
          "cost": 3,
          "keys": [
            "type:Chien"
          ],
          "text": "Piste une carte, puis l’adversaire défausse une carte pistée.",
          "play": [
            {
              "op": "piste",
              "n": 1
            },
            {
              "op": "met_a_la_defausse",
              "d_ou": "main",
              "choix": "precise",
              "carte": "",
              "quoi": "pistee",
              "argCard": "",
              "t": "enemyUnit",
              "qui": "adversaire",
              "ordre": "hasard",
              "n": 1
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "dmg",
                "t": "enemyHero",
                "v": 2
              },
              "text": "L’adversaire perd aussi 2 PV."
            },
            {
              "lvl": 15,
              "extra": {
                "op": "met_a_la_defausse",
                "d_ou": "main",
                "choix": "precise",
                "carte": "",
                "quoi": "all",
                "argCard": "",
                "t": "enemyUnit",
                "qui": "adversaire",
                "ordre": "hasard",
                "n": 1
              },
              "text": "Il défausse aussi une carte au hasard."
            }
          ]
        },
        {
          "id": "dog3_rott",
          "name": "Rottweiler",
          "type": "ally",
          "cost": 3,
          "keys": [
            "type:Chien"
          ],
          "text": "Cri de guerre : piste une carte. Quand l’adversaire joue une carte pistée, 3 dégâts à une unité adverse au hasard.",
          "play": [
            {
              "op": "piste",
              "n": 1
            }
          ],
          "tiers": [
            {
              "lvl": 4,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "dmg",
                "t": "randomEnemyUnit",
                "v": 2
              },
              "slot": "death",
              "text": "Râle d’agonie : 2 dégâts à une unité adverse au hasard."
            },
            {
              "lvl": 16,
              "statique": {
                "op": "nombre_d_attaques",
                "qui": "adversaire",
                "v": 2
              },
              "text": "Statique : l’adversaire n’attaque qu’avec 2 unités par tour."
            }
          ],
          "atk": 3,
          "hp": 3,
          "statics": [],
          "on_pistee_foe": [
            {
              "op": "dmg",
              "t": "randomEnemyUnit",
              "v": 3
            }
          ]
        },
        {
          "id": "dog3_beat",
          "name": "Battue",
          "type": "spell",
          "cost": 4,
          "keys": [
            "type:Chien"
          ],
          "text": "Piste toute la main adverse. Pioche une carte.",
          "play": [
            {
              "op": "piste",
              "n": 99
            },
            {
              "op": "draw",
              "v": 1
            }
          ],
          "tiers": [
            {
              "lvl": 5,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "dmg",
                "t": "randomEnemyUnit",
                "v": {
                  "src": "cartesPistees",
                  "arg": "",
                  "plus": 0
                }
              },
              "text": "Inflige aussi 1 dégât à une unité adverse au hasard par carte pistée."
            },
            {
              "lvl": 14,
              "extra": {
                "op": "met_a_la_defausse",
                "d_ou": "main",
                "choix": "precise",
                "carte": "",
                "quoi": "pistee",
                "argCard": "",
                "t": "enemyUnit",
                "qui": "adversaire",
                "ordre": "hasard",
                "n": 1
              },
              "text": "L’adversaire défausse aussi une carte pistée."
            }
          ],
          "sprite": "Graphical Assets/Cards/Dog Decks/Dog Deck 3/Battue.png"
        },
        {
          "id": "dog3_elder",
          "name": "Vieux Berger",
          "type": "ally",
          "cost": 5,
          "keys": [
            "type:Chien"
          ],
          "text": "Cri de guerre : piste une carte. Les cartes que l’adversaire pioche sont pistées. Les cartes pistées coûtent 1 de plus.",
          "play": [
            {
              "op": "piste",
              "n": 1
            }
          ],
          "tiers": [
            {
              "lvl": 6,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "dmg",
                "t": "enemyHero",
                "v": {
                  "src": "cartesPistees",
                  "arg": "",
                  "plus": 0
                }
              },
              "slot": "turnEnd",
              "text": "Fin de ton tour : 1 dégât au héros adverse par carte pistée."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "dmg",
                "t": "enemyHero",
                "v": 3
              },
              "slot": "on_pistee_foe",
              "text": "Quand l’adversaire joue une carte pistée, il perd 3 PV."
            }
          ],
          "atk": 4,
          "hp": 6,
          "statics": [
            {
              "op": "pistage_a_la_pioche",
              "qui": "adversaire",
              "sens": "plus",
              "v": 1
            },
            {
              "op": "cout_des_cartes",
              "qui": "adversaire",
              "quoi": "pistee",
              "argCard": "",
              "sens": "plus",
              "v": 1
            }
          ]
        }
      ]
    },
    {
      "id": "cat3",
      "name": "Mélusine",
      "species": "Chat",
      "sprite": "Graphical Assets/Characters/Cat/Cat Witch.png",
      "role": "Sorcière — Combo : ses sorts se relancent depuis la défausse, sa défausse est une seconde main",
      "stats": {
        "hp": 25,
        "mana": 8,
        "hand": 2
      },
      "cards": [
        {
          "id": "cat3_spark",
          "name": "Étincelle",
          "type": "spell",
          "cost": 1,
          "keys": [
            "type:Chat",
            "reprise"
          ],
          "text": "Reprise. Inflige 2 dégâts à une unité adverse.",
          "play": [
            {
              "op": "dmg",
              "t": "enemyUnit",
              "v": 2
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "dmg",
                "t": "enemyHero",
                "v": 1
              },
              "text": "Inflige aussi 1 dégât au héros adverse."
            },
            {
              "lvl": 13,
              "extra": {
                "op": "reduit_le_cout_de",
                "quoi": "spell",
                "typeDe": "ecrit",
                "argType": "",
                "typeQui": "toi",
                "argKey": "",
                "argCard": "",
                "v": 1,
                "n": 1
              },
              "text": "Réduit de 1 le coût d’un sort de ta main."
            }
          ]
        },
        {
          "id": "cat3_kit",
          "name": "Chaton Apprenti",
          "type": "ally",
          "cost": 1,
          "keys": [
            "type:Chat"
          ],
          "text": "Cri de guerre : défausse une carte, puis pioche une carte.",
          "play": [
            {
              "op": "met_a_la_defausse",
              "d_ou": "main",
              "choix": "precise",
              "carte": "",
              "quoi": "all",
              "argCard": "",
              "t": "enemyUnit",
              "qui": "toi",
              "ordre": "hasard",
              "n": 1
            },
            {
              "op": "draw",
              "v": 1
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "met_a_la_defausse",
                "d_ou": "main",
                "choix": "precise",
                "carte": "",
                "quoi": "all",
                "argCard": "",
                "t": "enemyUnit",
                "qui": "toi",
                "ordre": "hasard",
                "n": 1
              },
              "slot": "death",
              "text": "Râle d’agonie : défausse une carte…"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "death",
              "text": "… puis pioche une carte."
            },
            {
              "lvl": 15,
              "extra": {
                "op": "reduit_le_cout_de",
                "quoi": "spell",
                "typeDe": "ecrit",
                "argType": "",
                "typeQui": "toi",
                "argKey": "",
                "argCard": "",
                "v": 1,
                "n": 1
              },
              "slot": "on_defausse_self",
              "text": "Quand tu défausses une carte, un sort de ta main coûte 1 de moins."
            },
            {
              "lvl": 17,
              "statique": {
                "op": "cout_des_cartes",
                "qui": "toi",
                "quoi": "spell",
                "argCard": "",
                "sens": "moins",
                "v": 1
              },
              "text": "Statique : tes sorts coûtent 1 de moins."
            }
          ],
          "atk": 1,
          "hp": 2,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Cat Decks/Cat Deck 3/Chaton Apprenti.png"
        },
        {
          "id": "cat3_cauldron",
          "name": "Chaudron",
          "type": "ally",
          "cost": 3,
          "keys": [
            "type:Chat"
          ],
          "text": "Les cartes de ta défausse coûtent 1 de moins.",
          "play": [],
          "tiers": [
            {
              "lvl": 4,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "dmg",
                "t": "randomEnemyUnit",
                "v": 1
              },
              "slot": "turnEnd",
              "text": "Fin de ton tour : 1 dégât à une unité adverse au hasard."
            },
            {
              "lvl": 14,
              "statique": {
                "op": "montant_des_effets",
                "qui": "toi",
                "cible": "dmg",
                "sens": "plus",
                "v": 1
              },
              "text": "Statique : tes dégâts infligent 1 de plus."
            },
            {
              "lvl": 18,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "on_defausse_self",
              "text": "Quand tu défausses une carte, pioche une carte."
            }
          ],
          "atk": 2,
          "hp": 4,
          "statics": [
            {
              "op": "cout_des_cartes",
              "qui": "toi",
              "quoi": "all",
              "argCard": "",
              "sens": "moins",
              "v": 1,
              "zone": "defausse"
            }
          ]
        },
        {
          "id": "cat3_ash",
          "name": "Sorcière des Cendres",
          "type": "ally",
          "cost": 4,
          "keys": [
            "type:Chat"
          ],
          "text": "Cri de guerre : reprends un sort de ta défausse dans ta main.",
          "play": [
            {
              "op": "renvoie_en_main",
              "d_ou": "defausse",
              "choix": "precise",
              "carte": "",
              "quoi": "spell",
              "argCard": "",
              "t": "enemyUnit",
              "qui": "toi",
              "ordre": "hasard",
              "n": 1,
              "fatigue": false,
              "atk": 0,
              "hp": 0
            }
          ],
          "tiers": [
            {
              "lvl": 5,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "renvoie_en_main",
                "d_ou": "defausse",
                "choix": "precise",
                "carte": "",
                "quoi": "spell",
                "argCard": "",
                "t": "enemyUnit",
                "qui": "toi",
                "ordre": "hasard",
                "n": 1,
                "fatigue": false,
                "atk": 0,
                "hp": 0
              },
              "slot": "death",
              "text": "Râle d’agonie : reprends un sort de ta défausse dans ta main."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "renvoie_en_main",
                "d_ou": "defausse",
                "choix": "precise",
                "carte": "",
                "quoi": "spell",
                "argCard": "",
                "t": "enemyUnit",
                "qui": "toi",
                "ordre": "hasard",
                "n": 1,
                "fatigue": false,
                "atk": 0,
                "hp": 0
              },
              "text": "Cri de guerre : reprends aussi un sort de ta défausse dans ta main."
            }
          ],
          "atk": 3,
          "hp": 4,
          "statics": []
        },
        {
          "id": "cat3_philter",
          "name": "Grand Philtre",
          "type": "spell",
          "cost": 6,
          "keys": [
            "type:Chat"
          ],
          "text": "Inflige à l’adversaire autant de dégâts que de cartes dans ta défausse.",
          "play": [
            {
              "op": "dmg",
              "t": "enemyHero",
              "v": {
                "src": "discardCards",
                "arg": "",
                "plus": 0
              }
            }
          ],
          "tiers": [
            {
              "lvl": 6,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            },
            {
              "lvl": 16,
              "extra": {
                "op": "dmg",
                "t": "randomEnemyUnit",
                "v": 3
              },
              "text": "Inflige aussi 3 dégâts à une unité adverse au hasard."
            }
          ]
        }
      ],
      "switches": [
        {
          "id": "cat3_evil",
          "name": "Mauvais Œil",
          "type": "spell",
          "cost": 2,
          "keys": [
            "type:Chat",
            "reprise"
          ],
          "text": "Reprise. Donne -2/-2 à une unité adverse.",
          "play": [
            {
              "op": "buff",
              "t": "enemyUnit",
              "atk": -2,
              "hp": -2
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "buff",
                "t": "previousType",
                "atk": -1,
                "hp": -1
              },
              "text": "Donne aussi -1/-1 à toutes les unités adverses du même type."
            }
          ],
          "sprite": "Graphical Assets/Cards/Cat Decks/Cat Deck 3/Mauvais Oeil.png"
        },
        {
          "id": "cat3_divin",
          "name": "Divination",
          "type": "spell",
          "cost": 2,
          "keys": [
            "type:Chat",
            "reprise"
          ],
          "text": "Reprise. Pioche une carte.",
          "play": [
            {
              "op": "draw",
              "v": 1
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "mana_au_prochain_tour",
                "x": 1
              },
              "text": "Gagne aussi 1 mana au prochain tour."
            },
            {
              "lvl": 14,
              "extra": {
                "op": "reduit_le_cout_de",
                "quoi": "all",
                "typeDe": "ecrit",
                "argType": "",
                "typeQui": "toi",
                "argKey": "",
                "argCard": "",
                "v": 1,
                "n": 0
              },
              "text": "Réduit de 1 le coût de toutes les cartes de ta main."
            }
          ],
          "sprite": "Graphical Assets/Cards/Cat Decks/Cat Deck 3/Divination.png"
        },
        {
          "id": "cat3_familiar",
          "name": "Familier Affamé",
          "type": "ally",
          "cost": 2,
          "keys": [
            "type:Chat"
          ],
          "text": "Quand tu lances un sort depuis ta défausse, gagne +1/+1.",
          "play": [],
          "tiers": [
            {
              "lvl": 4,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "dmg",
                "t": "enemyHero",
                "v": 1
              },
              "slot": "on_reprise_self",
              "text": "Quand tu lances un sort depuis ta défausse, 1 dégât au héros adverse."
            },
            {
              "lvl": 13,
              "extra": {
                "op": "buff",
                "t": "self",
                "atk": 1,
                "hp": 0
              },
              "slot": "on_defausse_self",
              "text": "Quand tu défausses une carte, gagne +1/+0."
            },
            {
              "lvl": 20,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Chat",
                  "atk": 2,
                  "hp": 2,
                  "keys": [
                    "type:Chat"
                  ],
                  "statics": []
                }
              },
              "slot": "on_reprise_self",
              "text": "Quand tu lances un sort depuis ta défausse, invoque un Chat 2/2."
            }
          ],
          "atk": 1,
          "hp": 3,
          "statics": [],
          "on_reprise_self": [
            {
              "op": "buff",
              "t": "self",
              "atk": 1,
              "hp": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Cat Decks/Cat Deck 3/Familier Affamé.png"
        },
        {
          "id": "cat3_black",
          "name": "Chat Noir",
          "type": "ally",
          "cost": 3,
          "keys": [
            "type:Chat"
          ],
          "text": "Quand tu défausses une carte, 1 dégât au héros adverse.",
          "play": [],
          "tiers": [
            {
              "lvl": 5,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "on_reprise_self",
              "text": "Quand tu lances un sort depuis ta défausse, pioche une carte."
            },
            {
              "lvl": 15,
              "extra": {
                "op": "buff",
                "t": "randomAllyUnit",
                "atk": 1,
                "hp": 1
              },
              "slot": "on_defausse_self",
              "text": "Quand tu défausses une carte, un allié gagne +1/+1."
            }
          ],
          "atk": 3,
          "hp": 3,
          "statics": [],
          "on_defausse_self": [
            {
              "op": "dmg",
              "t": "enemyHero",
              "v": 1
            }
          ]
        },
        {
          "id": "cat3_sabbat",
          "name": "Sabbat",
          "type": "ally",
          "cost": 6,
          "keys": [
            "type:Chat"
          ],
          "text": "Les sorts de ta défausse ont +1 puissance des sorts.",
          "play": [],
          "tiers": [
            {
              "lvl": 6,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "renvoie_en_main",
                "d_ou": "defausse",
                "choix": "precise",
                "carte": "",
                "quoi": "spell",
                "argCard": "",
                "t": "enemyUnit",
                "qui": "toi",
                "ordre": "hasard",
                "n": 1,
                "fatigue": false,
                "atk": 0,
                "hp": 0
              },
              "slot": "turnStart",
              "text": "Début de ton tour : reprends un sort au hasard de ta défausse dans ta main."
            },
            {
              "lvl": 16,
              "statique": {
                "op": "cout_des_cartes",
                "qui": "toi",
                "quoi": "all",
                "argCard": "",
                "sens": "moins",
                "v": 1,
                "zone": "defausse"
              },
              "text": "Statique : les cartes de ta défausse coûtent 1 de moins."
            },
            {
              "lvl": 19,
              "extra": {
                "op": "dmg",
                "t": "randomEnemyUnit",
                "v": 2
              },
              "slot": "on_reprise_self",
              "text": "Quand tu lances un sort depuis ta défausse, 2 dégâts à une unité adverse au hasard."
            }
          ],
          "atk": 4,
          "hp": 5,
          "statics": [
            {
              "op": "montant_des_effets",
              "qui": "toi",
              "cible": "tous",
              "zone": "defausse",
              "sens": "plus",
              "v": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Cat Decks/Cat Deck 3/Sabbat.png"
        }
      ]
    },
    {
      "id": "crow3",
      "name": "Morrigane",
      "species": "Corbeau",
      "sprite": "Graphical Assets/Characters/Crow/Crow Skeleton.png",
      "role": "Charognarde — Aggro MidRange : dévore la défausse adverse, tient mieux la longueur qu’un Turbo",
      "stats": {
        "hp": 24,
        "mana": 8,
        "hand": 2
      },
      "cards": [
        {
          "id": "crow3_hungry",
          "name": "Corbeau Affamé",
          "type": "ally",
          "cost": 1,
          "keys": [
            "type:Oiseau",
            "type:Corbeau"
          ],
          "text": "Cri de guerre : Charogne 1.",
          "play": [
            {
              "op": "charogne",
              "n": 1,
              "t": "self"
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "charogne",
                "n": 1,
                "t": "self"
              },
              "slot": "on_attack_self",
              "text": "Quand cette unité attaque, Charogne 1."
            },
            {
              "lvl": 13,
              "extra": {
                "op": "charogne",
                "n": 1,
                "t": "self"
              },
              "slot": "on_heroHurt_foe",
              "text": "Quand l’adversaire perd des PV, Charogne 1."
            },
            {
              "lvl": 17,
              "statique": {
                "op": "montant_des_effets",
                "qui": "toi",
                "cible": "charogne",
                "sens": "plus",
                "v": 1
              },
              "text": "Statique : tes Charognes dévorent 1 carte de plus."
            }
          ],
          "atk": 2,
          "hp": 1,
          "statics": [],
          "gardes": {
            "on_attack_self": "moi"
          }
        },
        {
          "id": "crow3_magpie",
          "name": "Pie Voleuse",
          "type": "ally",
          "cost": 2,
          "keys": [
            "type:Oiseau",
            "type:Corbeau"
          ],
          "text": "Cri de guerre : appât 2. Quand une carte est exilée d’une défausse, gagne +1/+0.",
          "play": [
            {
              "op": "appat",
              "n": 2
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "buff",
                "t": "allyType:Oiseau",
                "atk": 1,
                "hp": 0
              },
              "slot": "death",
              "text": "Râle d’agonie : tes autres Oiseaux gagnent +1/+0."
            },
            {
              "lvl": 15,
              "extra": {
                "op": "buff",
                "t": "allyType:Oiseau",
                "atk": 1,
                "hp": 0
              },
              "slot": "on_exil_any",
              "text": "Quand une carte est exilée d’une défausse, tes autres Oiseaux gagnent +1/+0."
            }
          ],
          "atk": 2,
          "hp": 2,
          "statics": [],
          "on_exil_any": [
            {
              "op": "buff",
              "t": "self",
              "atk": 1,
              "hp": 0
            }
          ]
        },
        {
          "id": "crow3_vulture",
          "name": "Vautour",
          "type": "ally",
          "cost": 3,
          "keys": [
            "Charge",
            "type:Oiseau",
            "type:Corbeau"
          ],
          "text": "Charge. Quand cette unité attaque, Charogne 1.",
          "play": [],
          "tiers": [
            {
              "lvl": 4,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "charogne",
                "n": 1,
                "t": "self"
              },
              "text": "Cri de guerre : Charogne 1."
            },
            {
              "lvl": 14,
              "aura": {
                "key": "Charge",
                "atk": 0,
                "hp": 0,
                "scope": "sameTypeAllies"
              },
              "text": "Aura : tes autres Oiseaux ont Charge."
            }
          ],
          "atk": 3,
          "hp": 2,
          "statics": [],
          "gardes": {
            "on_attack_self": "moi"
          },
          "on_attack_self": [
            {
              "op": "charogne",
              "n": 1,
              "t": "self"
            }
          ]
        },
        {
          "id": "crow3_knacker",
          "name": "Équarrisseur",
          "type": "ally",
          "cost": 4,
          "keys": [
            "type:Oiseau",
            "type:Corbeau"
          ],
          "text": "Quand une unité adverse meurt, Charogne 1.",
          "play": [],
          "tiers": [
            {
              "lvl": 5,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "charogne",
                "n": 2,
                "t": "self"
              },
              "text": "Cri de guerre : Charogne 2."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "charogne",
                "n": 1,
                "t": "self"
              },
              "slot": "on_spell_foe",
              "text": "Quand l’adversaire lance un sort, Charogne 1."
            }
          ],
          "atk": 3,
          "hp": 3,
          "statics": [],
          "on_unitDies_foe": [
            {
              "op": "charogne",
              "n": 1,
              "t": "self"
            }
          ]
        },
        {
          "id": "crow3_lord",
          "name": "Seigneur des Charognes",
          "type": "ally",
          "cost": 6,
          "keys": [
            "type:Oiseau",
            "type:Corbeau"
          ],
          "text": "Cri de guerre : Charogne 4.",
          "play": [
            {
              "op": "charogne",
              "n": 4,
              "t": "self"
            }
          ],
          "tiers": [
            {
              "lvl": 6,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "charogne",
                "n": 2,
                "t": "self"
              },
              "slot": "on_attack_self",
              "text": "Quand cette unité attaque, Charogne 2."
            },
            {
              "lvl": 16,
              "aura": {
                "key": "",
                "atk": 1,
                "hp": 0,
                "scope": "sameTypeAllies"
              },
              "text": "Aura : tes autres Oiseaux ont +1/+0."
            },
            {
              "lvl": 18,
              "extra": {
                "op": "charogne",
                "n": 1,
                "t": "self"
              },
              "slot": "turnStart",
              "text": "Début de ton tour : Charogne 1."
            }
          ],
          "atk": 4,
          "hp": 5,
          "statics": [],
          "gardes": {
            "on_attack_self": "moi"
          },
          "sprite": "Graphical Assets/Cards/Raven Decks/Raven Deck 3/Seigneur des Charognes.png"
        }
      ],
      "switches": [
        {
          "id": "crow3_charnel",
          "name": "Charnier",
          "type": "spell",
          "cost": 2,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Appât 1, puis Charogne 2 : une unité alliée gagne +1/+1 par carte dévorée et leurs mots-clés.",
          "play": [
            {
              "op": "appat",
              "n": 1
            },
            {
              "op": "charogne",
              "n": 2,
              "t": "allyUnit"
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            },
            {
              "lvl": 13,
              "extra": {
                "op": "buff",
                "t": "allyUnit",
                "atk": 0,
                "hp": 0,
                "key": "Charge"
              },
              "text": "L’unité gagne aussi Charge."
            }
          ],
          "sprite": "Graphical Assets/Cards/Raven Decks/Raven Deck 3/Charnier.png"
        },
        {
          "id": "crow3_skel",
          "name": "Corbeau Squelette",
          "type": "ally",
          "cost": 3,
          "keys": [
            "type:Oiseau",
            "type:Corbeau"
          ],
          "text": "Début de ton tour : Charogne 1.",
          "play": [],
          "tiers": [
            {
              "lvl": 3,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "charogne",
                "n": 1,
                "t": "self"
              },
              "slot": "on_attack_self",
              "text": "Quand cette unité attaque, Charogne 1."
            },
            {
              "lvl": 15,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "on_exil_any",
              "text": "Quand une carte est exilée d’une défausse, pioche une carte."
            }
          ],
          "atk": 2,
          "hp": 3,
          "statics": [],
          "turnStart": [
            {
              "op": "charogne",
              "n": 1,
              "t": "self"
            }
          ],
          "gardes": {
            "on_attack_self": "moi"
          },
          "sprite": "Graphical Assets/Cards/Raven Decks/Raven Deck 3/Corbeau Squelette.png"
        },
        {
          "id": "crow3_prince",
          "name": "Prince des Ossements",
          "type": "ally",
          "cost": 5,
          "keys": [
            "type:Oiseau",
            "type:Corbeau"
          ],
          "text": "Quand une carte est exilée d’une défausse, 1 dégât au héros adverse.",
          "play": [],
          "tiers": [
            {
              "lvl": 4,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "charogne",
                "n": 2,
                "t": "self"
              },
              "text": "Cri de guerre : Charogne 2."
            },
            {
              "lvl": 14,
              "key": "Charge",
              "text": "Gagne Charge."
            },
            {
              "lvl": 19,
              "extra": {
                "op": "met_a_la_defausse",
                "d_ou": "main",
                "choix": "precise",
                "carte": "",
                "quoi": "all",
                "argCard": "",
                "t": "enemyUnit",
                "qui": "adversaire",
                "ordre": "hasard",
                "n": 1
              },
              "slot": "on_exil_any",
              "text": "Quand une carte est exilée d’une défausse, l’adversaire défausse une carte au hasard."
            }
          ],
          "atk": 4,
          "hp": 4,
          "statics": [],
          "on_exil_any": [
            {
              "op": "dmg",
              "t": "enemyHero",
              "v": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Raven Decks/Raven Deck 3/Prince des Ossements.png"
        },
        {
          "id": "crow3_colossus",
          "name": "Colosse d’Os",
          "type": "ally",
          "cost": 7,
          "keys": [
            "type:Oiseau",
            "type:Corbeau"
          ],
          "text": "Cri de guerre : Charogne 5.",
          "play": [
            {
              "op": "charogne",
              "n": 5,
              "t": "self"
            }
          ],
          "tiers": [
            {
              "lvl": 5,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "charogne",
                "n": 1,
                "t": "self"
              },
              "slot": "turnStart",
              "text": "Début de ton tour : Charogne 1."
            },
            {
              "lvl": 16,
              "aura": {
                "key": "",
                "atk": 1,
                "hp": 1,
                "scope": "sameTypeAllies"
              },
              "text": "Aura : tes autres Oiseaux ont +1/+1."
            },
            {
              "lvl": 20,
              "extra": {
                "op": "buff",
                "t": "self",
                "atk": 1,
                "hp": 1
              },
              "slot": "on_exil_any",
              "text": "Quand une carte est exilée d’une défausse, gagne +1/+1."
            }
          ],
          "atk": 5,
          "hp": 5,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Raven Decks/Raven Deck 3/Colosse d'Os.png"
        },
        {
          "id": "crow3_lean",
          "name": "Rapace Maigre",
          "type": "ally",
          "cost": 1,
          "keys": [
            "Charge",
            "type:Oiseau",
            "type:Corbeau"
          ],
          "text": "Charge. Cri de guerre : appât 1. Quand l’adversaire perd des PV, Charogne 1.",
          "play": [
            {
              "op": "appat",
              "n": 1
            }
          ],
          "tiers": [
            {
              "lvl": 6,
              "stats": {
                "atk": 1,
                "hp": 1
              },
              "text": "+1/+1"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "death",
              "text": "Râle d’agonie : pioche une carte."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "charogne",
                "n": 1,
                "t": "self"
              },
              "slot": "on_attack_self",
              "text": "Quand tu attaques avec une unité, Charogne 1."
            }
          ],
          "atk": 2,
          "hp": 1,
          "statics": [],
          "on_heroHurt_foe": [
            {
              "op": "charogne",
              "n": 1,
              "t": "self"
            }
          ],
          "sprite": "Graphical Assets/Cards/Raven Decks/Raven Deck 3/Rapace Maigre.png"
        }
      ]
    },
    {
      "id": "frog3",
      "name": "Dendrobate",
      "species": "Grenouille",
      "sprite": "Graphical Assets/Characters/Frog/Frog Venomous.png",
      "role": "Venin — Contrôle Hard : des Toxines, un 1 pour 1 ou un 1 pour 2, aucune unité au-delà de 5",
      "stats": {
        "hp": 28,
        "mana": 7,
        "hand": 2
      },
      "cards": [
        {
          "id": "frog3_tree",
          "name": "Rainette Toxique",
          "type": "ally",
          "cost": 1,
          "keys": [
            "type:Grenouille"
          ],
          "text": "Cri de guerre : pose 1 Toxine sur une unité adverse.",
          "play": [
            {
              "op": "toxine",
              "t": "enemyUnit",
              "v": 1
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "toxine",
                "t": "randomEnemyUnit",
                "v": 1
              },
              "slot": "death",
              "text": "Râle d’agonie : pose 1 Toxine sur une unité adverse au hasard."
            },
            {
              "lvl": 14,
              "extra": {
                "op": "toxine",
                "t": "randomEnemyUnit",
                "v": 1
              },
              "slot": "turnStart",
              "text": "Début de ton tour : pose 1 Toxine sur une unité adverse au hasard."
            },
            {
              "lvl": 17,
              "statique": {
                "op": "montant_des_effets",
                "qui": "toi",
                "cible": "toxine",
                "sens": "plus",
                "v": 1
              },
              "text": "Statique : tes Toxines en posent 1 de plus."
            }
          ],
          "atk": 1,
          "hp": 2,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 3/Rainette Toxique.png"
        },
        {
          "id": "frog3_dart",
          "name": "Dard Empoisonné",
          "type": "spell",
          "cost": 2,
          "keys": [
            "type:Grenouille"
          ],
          "text": "Pose 3 Toxines sur une unité adverse.",
          "play": [
            {
              "op": "toxine",
              "t": "enemyUnit",
              "v": 3
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "toxine",
                "t": "randomEnemyUnit",
                "v": 1
              },
              "text": "Pose aussi 1 Toxine sur une autre unité adverse au hasard."
            },
            {
              "lvl": 13,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 3/Dard Empoisonné.png"
        },
        {
          "id": "frog3_sentinel",
          "name": "Sentinelle des Roseaux",
          "type": "ally",
          "cost": 3,
          "keys": [
            "Taunt",
            "Venin",
            "type:Grenouille"
          ],
          "text": "Provocation. Venin.",
          "play": [],
          "tiers": [
            {
              "lvl": 4,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "armor",
                "v": 2
              },
              "slot": "turnEnd",
              "text": "Fin de ton tour : ton héros gagne 2 d’armure."
            },
            {
              "lvl": 12,
              "aura": {
                "key": "",
                "atk": -1,
                "hp": 0,
                "scope": "enemyUnits"
              },
              "text": "Aura : les unités adverses ont -1/-0."
            }
          ],
          "atk": 2,
          "hp": 4,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 3/Sentinelle des Roseaux.png"
        },
        {
          "id": "frog3_slow",
          "name": "Poison Lent",
          "type": "spell",
          "cost": 4,
          "keys": [
            "type:Grenouille"
          ],
          "text": "Détruis une unité adverse. Pose 3 Toxines sur une unité adverse au hasard.",
          "play": [
            {
              "op": "detruit",
              "t": "enemyUnit"
            },
            {
              "op": "toxine",
              "t": "randomEnemyUnit",
              "v": 3
            }
          ],
          "tiers": [
            {
              "lvl": 5,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "heal",
                "t": "ownHero",
                "v": 4
              },
              "text": "Soigne aussi ton héros de 4."
            },
            {
              "lvl": 15,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 3/Poison lent.png"
        },
        {
          "id": "frog3_royal",
          "name": "Dendrobate Royale",
          "type": "ally",
          "cost": 5,
          "keys": [
            "type:Grenouille"
          ],
          "text": "Aura : tes autres alliés ont Venin.",
          "play": [],
          "tiers": [
            {
              "lvl": 6,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "armor",
                "v": 2
              },
              "slot": "on_unitDies_foe",
              "text": "Quand une unité adverse meurt, ton héros gagne 2 d’armure."
            },
            {
              "lvl": 16,
              "aura": {
                "key": "",
                "atk": 0,
                "hp": 1,
                "scope": "otherAllies"
              },
              "text": "Aura : tes autres alliés ont +0/+1 de plus."
            },
            {
              "lvl": 18,
              "aura": {
                "key": "Bouclier",
                "atk": 0,
                "hp": 0,
                "scope": "otherAllies"
              },
              "text": "Aura : tes autres alliés ont Bouclier."
            }
          ],
          "atk": 3,
          "hp": 5,
          "statics": [],
          "aura": {
            "scope": "otherAllies",
            "atk": 0,
            "hp": 0,
            "key": "Venin"
          },
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 3/Dendrobate Royale.png"
        }
      ],
      "switches": [
        {
          "id": "frog3_tadpole",
          "name": "Têtard Toxique",
          "type": "ally",
          "cost": 1,
          "keys": [
            "type:Têtard",
            "type:Grenouille"
          ],
          "text": "Râle d’agonie : pose 1 Toxine sur une unité adverse au hasard.",
          "play": [],
          "tiers": [
            {
              "lvl": 4,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "toxine",
                "t": "enemyUnit",
                "v": 1
              },
              "text": "Cri de guerre : pose 1 Toxine sur une unité adverse."
            },
            {
              "lvl": 13,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Têtard",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Têtard",
                    "type:Grenouille"
                  ],
                  "statics": []
                }
              },
              "slot": "death",
              "text": "Râle d’agonie : invoque un Têtard 1/1."
            }
          ],
          "atk": 1,
          "hp": 1,
          "statics": [],
          "death": [
            {
              "op": "toxine",
              "t": "randomEnemyUnit",
              "v": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 3/Têtard Toxique.png"
        },
        {
          "id": "frog3_toad",
          "name": "Crapaud Cornu",
          "type": "ally",
          "cost": 2,
          "keys": [
            "type:Grenouille"
          ],
          "text": "Quand une unité adverse attaque, elle reçoit 1 Toxine.",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "toxine",
                "t": "randomEnemyUnit",
                "v": 2
              },
              "slot": "death",
              "text": "Râle d’agonie : pose 2 Toxines sur une unité adverse au hasard."
            },
            {
              "lvl": 15,
              "key": "Taunt",
              "text": "Gagne Provocation."
            },
            {
              "lvl": 20,
              "statique": {
                "op": "toxine_brule_le_heros",
                "qui": "adversaire",
                "sens": "plus",
                "v": 1
              },
              "text": "Statique : au début de son tour, chaque unité adverse inflige à son contrôleur 1 dégât par Toxine qu’elle porte."
            }
          ],
          "atk": 2,
          "hp": 3,
          "statics": [],
          "on_attack_foe": [
            {
              "op": "toxine",
              "t": "previous",
              "v": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 3/Crapaud Cornu.png"
        },
        {
          "id": "frog3_contagion",
          "name": "Contagion",
          "type": "spell",
          "cost": 2,
          "keys": [
            "type:Grenouille"
          ],
          "text": "Chaque unité adverse qui porte une Toxine en reçoit 1 de plus.",
          "play": [
            {
              "op": "contagion",
              "v": 1,
              "dmg": 0
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "contagion",
                "v": 0,
                "dmg": 1
              },
              "text": "Inflige aussi 1 dégât à chaque unité adverse qui porte une Toxine."
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 3/Contagion.png"
        },
        {
          "id": "frog3_collector",
          "name": "Collectionneur de Poisons",
          "type": "ally",
          "cost": 3,
          "keys": [
            "type:Grenouille"
          ],
          "text": "Quand une unité adverse qui porte une Toxine meurt, pioche une carte.",
          "play": [],
          "tiers": [
            {
              "lvl": 5,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "toxine",
                "t": "randomEnemyUnit",
                "v": 1
              },
              "slot": "on_unitDies_self",
              "text": "Quand une de tes unités meurt, pose 1 Toxine sur une unité adverse au hasard."
            },
            {
              "lvl": 14,
              "aura": {
                "key": "",
                "atk": 0,
                "hp": 1,
                "scope": "otherAllies"
              },
              "text": "Aura : tes autres alliés ont +0/+1."
            },
            {
              "lvl": 19,
              "statique": {
                "op": "pioche_du_tour",
                "qui": "toi",
                "sens": "plus",
                "v": 1
              },
              "text": "Statique : tu pioches une carte de plus au début de ton tour."
            }
          ],
          "atk": 2,
          "hp": 4,
          "statics": [],
          "on_unitToxinee_foe": [
            {
              "op": "draw",
              "v": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 3/Collectionneur de Poisons.png"
        },
        {
          "id": "frog3_epidemic",
          "name": "Épidémie",
          "type": "spell",
          "cost": 5,
          "keys": [
            "type:Grenouille"
          ],
          "text": "Pose 2 Toxines sur chaque unité adverse. Puis chaque unité adverse inflige à son contrôleur autant de dégâts que de Toxines qu’elle porte.",
          "play": [
            {
              "op": "epidemie",
              "v": 2
            }
          ],
          "tiers": [
            {
              "lvl": 6,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            },
            {
              "lvl": 16,
              "extra": {
                "op": "heal",
                "t": "ownHero",
                "v": 6
              },
              "text": "Soigne aussi ton héros de 6."
            }
          ],
          "sprite": "Graphical Assets/Cards/Frog Decks/Frog Deck 3/Epidémie.png"
        }
      ]
    },
    {
      "id": "owl3",
      "name": "Hulotte",
      "species": "Hibou",
      "sprite": "Graphical Assets/Characters/Owl/Owl Academic.png",
      "role": "Bibliothécaire — Fatigue : meule sa pioche pour atteindre la fatigue avant l’adversaire, et y range ses Ex-libris",
      "stats": {
        "hp": 27,
        "mana": 9,
        "hand": 2
      },
      "cards": [
        {
          "id": "owl3_skim",
          "name": "Lecture en diagonale",
          "type": "spell",
          "cost": 1,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Meule 3 cartes, pioche une carte.",
          "play": [
            {
              "op": "met_a_la_defausse",
              "d_ou": "pioche",
              "choix": "precise",
              "carte": "",
              "quoi": "all",
              "argCard": "",
              "t": "enemyUnit",
              "qui": "toi",
              "ordre": "dessus",
              "n": 3
            },
            {
              "op": "draw",
              "v": 1
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "extra": {
                "op": "met_a_la_defausse",
                "d_ou": "pioche",
                "choix": "precise",
                "carte": "",
                "quoi": "all",
                "argCard": "",
                "t": "enemyUnit",
                "qui": "toi",
                "ordre": "dessus",
                "n": 2
              },
              "text": "Meule aussi 2 cartes."
            },
            {
              "lvl": 7,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "renforce_les_cartes",
                "d_ou": "fatigue",
                "qui": "toi",
                "quoi": "all",
                "ordre": "hasard",
                "n": 99,
                "atk": 1,
                "hp": 1
              },
              "text": "Les cartes de ta pile de fatigue gagnent +1/+1."
            }
          ],
          "sprite": "Graphical Assets/Cards/Owl Decks/Owl Deck 3/Lecture en diagonale.png"
        },
        {
          "id": "owl3_archivist",
          "name": "Archiviste",
          "type": "ally",
          "cost": 2,
          "keys": [
            "type:Oiseau",
            "type:Hibou"
          ],
          "text": "Cri de guerre : meule 2 cartes.",
          "play": [
            {
              "op": "met_a_la_defausse",
              "d_ou": "pioche",
              "choix": "precise",
              "carte": "",
              "quoi": "all",
              "argCard": "",
              "t": "enemyUnit",
              "qui": "toi",
              "ordre": "dessus",
              "n": 2
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "met_a_la_defausse",
                "d_ou": "pioche",
                "choix": "precise",
                "carte": "",
                "quoi": "all",
                "argCard": "",
                "t": "enemyUnit",
                "qui": "toi",
                "ordre": "dessus",
                "n": 2
              },
              "slot": "death",
              "text": "Râle d’agonie : meule 2 cartes."
            },
            {
              "lvl": 14,
              "extra": {
                "op": "met_a_la_defausse",
                "d_ou": "pioche",
                "choix": "precise",
                "carte": "",
                "quoi": "all",
                "argCard": "",
                "t": "enemyUnit",
                "qui": "toi",
                "ordre": "dessus",
                "n": 1
              },
              "slot": "turnStart",
              "text": "Début de ton tour : meule une carte."
            },
            {
              "lvl": 17,
              "statique": {
                "op": "mana_du_tour",
                "qui": "toi",
                "sens": "plus",
                "v": 1
              },
              "text": "Statique : tu as 1 mana de plus par tour."
            }
          ],
          "atk": 2,
          "hp": 3,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Owl Decks/Owl Deck 3/Archiviste.png"
        },
        {
          "id": "owl3_annot",
          "name": "Annotation",
          "type": "spell",
          "cost": 2,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Les cartes de ta pile de fatigue gagnent +1/+1.",
          "play": [
            {
              "op": "renforce_les_cartes",
              "d_ou": "fatigue",
              "qui": "toi",
              "quoi": "all",
              "ordre": "hasard",
              "n": 99,
              "atk": 1,
              "hp": 1
            }
          ],
          "tiers": [
            {
              "lvl": 4,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche une carte."
            },
            {
              "lvl": 13,
              "extra": {
                "op": "renforce_les_cartes",
                "d_ou": "main",
                "qui": "toi",
                "quoi": "all",
                "argCard": "",
                "ordre": "hasard",
                "n": 99,
                "atk": 1,
                "hp": 1
              },
              "text": "Les cartes de ta main gagnent aussi +1/+1."
            },
            {
              "lvl": 18,
              "extra": {
                "op": "cree",
                "choix": "fatigue",
                "n": 1,
                "atk": 0,
                "hp": 0
              },
              "text": "Crée aussi une carte au hasard de ta pile de fatigue."
            }
          ],
          "sprite": "Graphical Assets/Cards/Owl Decks/Owl Deck 3/Annotation.png"
        },
        {
          "id": "owl3_night",
          "name": "Veilleuse de Nuit",
          "type": "ally",
          "cost": 3,
          "keys": [
            "type:Oiseau",
            "type:Hibou"
          ],
          "text": "Quand tu pioches dans la fatigue, gagne +1/+1.",
          "play": [],
          "tiers": [
            {
              "lvl": 5,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "met_a_la_defausse",
                "d_ou": "pioche",
                "choix": "precise",
                "carte": "",
                "quoi": "all",
                "argCard": "",
                "t": "enemyUnit",
                "qui": "toi",
                "ordre": "dessus",
                "n": 1
              },
              "slot": "turnEnd",
              "text": "Fin de ton tour : meule une carte."
            },
            {
              "lvl": 15,
              "aura": {
                "key": "",
                "atk": 0,
                "hp": 1,
                "scope": "otherAllies"
              },
              "text": "Aura : tes autres alliés ont +0/+1."
            },
            {
              "lvl": 20,
              "extra": {
                "op": "buff",
                "t": "allAllies",
                "atk": 1,
                "hp": 1
              },
              "slot": "on_fatigue_self",
              "text": "Quand tu pioches dans la fatigue, tes alliés gagnent +1/+1."
            }
          ],
          "atk": 2,
          "hp": 4,
          "statics": [],
          "on_fatigue_self": [
            {
              "op": "buff",
              "t": "self",
              "atk": 1,
              "hp": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Owl Decks/Owl Deck 3/Veilleuse de Nuit.png"
        },
        {
          "id": "owl3_chancellor",
          "name": "Chancelière",
          "type": "ally",
          "cost": 4,
          "keys": [
            "Taunt",
            "ex_libris",
            "type:Oiseau",
            "type:Hibou"
          ],
          "text": "Provocation. Ex-libris.",
          "play": [],
          "tiers": [
            {
              "lvl": 6,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "met_a_la_defausse",
                "d_ou": "pioche",
                "choix": "precise",
                "carte": "",
                "quoi": "all",
                "argCard": "",
                "t": "enemyUnit",
                "qui": "toi",
                "ordre": "dessus",
                "n": 2
              },
              "text": "Cri de guerre : meule 2 cartes."
            },
            {
              "lvl": 16,
              "extra": {
                "op": "dmg",
                "t": "enemyHero",
                "v": 2
              },
              "slot": "on_fatigue_self",
              "text": "Quand tu pioches dans la fatigue, 2 dégâts au héros adverse."
            },
            {
              "lvl": 19,
              "extra": {
                "op": "renforce_les_cartes",
                "d_ou": "main",
                "qui": "toi",
                "quoi": "sujet",
                "argCard": "",
                "ordre": "hasard",
                "n": 1,
                "atk": 1,
                "hp": 1
              },
              "slot": "on_fatigue_self",
              "text": "Quand tu pioches dans la fatigue, la carte piochée gagne +1/+1."
            }
          ],
          "atk": 4,
          "hp": 4,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Owl Decks/Owl Deck 3/Chancelière.png"
        }
      ],
      "switches": [
        {
          "id": "owl3_barn",
          "name": "Chouette Effraie",
          "type": "ally",
          "cost": 1,
          "keys": [
            "elusif",
            "type:Oiseau",
            "type:Hibou"
          ],
          "text": "Élusif. Cri de guerre : meule une carte.",
          "play": [
            {
              "op": "met_a_la_defausse",
              "d_ou": "pioche",
              "choix": "precise",
              "carte": "",
              "quoi": "all",
              "argCard": "",
              "t": "enemyUnit",
              "qui": "toi",
              "ordre": "dessus",
              "n": 1
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "buff",
                "t": "self",
                "atk": 1,
                "hp": 0
              },
              "slot": "on_meule_self",
              "text": "Quand tu meules une carte, gagne +1/+0."
            },
            {
              "lvl": 15,
              "aura": {
                "key": "",
                "atk": 1,
                "hp": 0,
                "scope": "sameTypeAllies"
              },
              "text": "Aura : tes autres Oiseaux ont +1/+0."
            }
          ],
          "atk": 2,
          "hp": 1,
          "statics": [],
          "sprite": "Graphical Assets/Cards/Owl Decks/Owl Deck 3/Chouette Effraie.png"
        },
        {
          "id": "owl3_index",
          "name": "Index",
          "type": "spell",
          "cost": 3,
          "keys": [
            "type:Oiseau"
          ],
          "text": "Crée une carte au hasard de ta pile de fatigue : elle gagne +2/+2.",
          "play": [
            {
              "op": "cree",
              "choix": "fatigue",
              "n": 1,
              "atk": 2,
              "hp": 2
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche une carte."
            },
            {
              "lvl": 13,
              "extra": {
                "op": "cree",
                "choix": "fatigue",
                "n": 1,
                "atk": 2,
                "hp": 2
              },
              "text": "Crée aussi une seconde carte de ta pile de fatigue : elle gagne +2/+2."
            }
          ],
          "sprite": "Graphical Assets/Cards/Owl Decks/Owl Deck 3/Index.png"
        },
        {
          "id": "owl3_bookmark",
          "name": "Marque-page",
          "type": "ally",
          "cost": 4,
          "keys": [
            "Taunt",
            "type:Oiseau",
            "type:Hibou"
          ],
          "text": "Provocation. Tu pioches une carte de plus au début de ton tour.",
          "play": [],
          "tiers": [
            {
              "lvl": 4,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "met_a_la_defausse",
                "d_ou": "pioche",
                "choix": "precise",
                "carte": "",
                "quoi": "all",
                "argCard": "",
                "t": "enemyUnit",
                "qui": "toi",
                "ordre": "dessus",
                "n": 1
              },
              "slot": "turnEnd",
              "text": "Fin de ton tour : meule une carte."
            },
            {
              "lvl": 14,
              "extra": {
                "op": "armor",
                "v": 3
              },
              "slot": "on_fatigue_self",
              "text": "Quand tu pioches dans la fatigue, ton héros gagne 3 d’armure."
            }
          ],
          "atk": 2,
          "hp": 5,
          "statics": [
            {
              "op": "pioche_du_tour",
              "qui": "toi",
              "sens": "plus",
              "v": 1
            }
          ]
        },
        {
          "id": "owl3_dean",
          "name": "Doyenne",
          "type": "ally",
          "cost": 5,
          "keys": [
            "type:Oiseau",
            "type:Hibou"
          ],
          "text": "Quand tu pioches dans la fatigue, la carte piochée coûte 2 de moins.",
          "play": [],
          "tiers": [
            {
              "lvl": 5,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "renforce_les_cartes",
                "d_ou": "fatigue",
                "qui": "toi",
                "quoi": "all",
                "ordre": "hasard",
                "n": 99,
                "atk": 1,
                "hp": 1
              },
              "text": "Cri de guerre : les cartes de ta pile de fatigue gagnent +1/+1."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "dmg",
                "t": "randomEnemyUnit",
                "v": 2
              },
              "slot": "on_fatigue_self",
              "text": "Quand tu pioches dans la fatigue, 2 dégâts à une unité adverse au hasard."
            }
          ],
          "atk": 3,
          "hp": 6,
          "statics": [],
          "on_fatigue_self": [
            {
              "op": "reduit_le_cout_de",
              "quoi": "sujet",
              "typeDe": "ecrit",
              "argType": "",
              "typeQui": "toi",
              "argKey": "",
              "argCard": "",
              "v": 2,
              "n": 0
            }
          ],
          "sprite": "Graphical Assets/Cards/Owl Decks/Owl Deck 3/Doyenne.png"
        },
        {
          "id": "owl3_grand",
          "name": "Grand Chancelier",
          "type": "ally",
          "cost": 6,
          "keys": [
            "ex_libris",
            "type:Oiseau",
            "type:Hibou"
          ],
          "text": "Ex-libris. Quand tu pioches dans la fatigue, un allié gagne +1/+1.",
          "play": [],
          "tiers": [
            {
              "lvl": 6,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "met_a_la_defausse",
                "d_ou": "pioche",
                "choix": "precise",
                "carte": "",
                "quoi": "all",
                "argCard": "",
                "t": "enemyUnit",
                "qui": "toi",
                "ordre": "dessus",
                "n": 3
              },
              "text": "Cri de guerre : meule 3 cartes."
            },
            {
              "lvl": 16,
              "aura": {
                "key": "",
                "atk": 1,
                "hp": 1,
                "scope": "otherAllies"
              },
              "text": "Aura : tes autres alliés ont +1/+1."
            }
          ],
          "atk": 5,
          "hp": 6,
          "statics": [],
          "on_fatigue_self": [
            {
              "op": "buff",
              "t": "randomAllyUnit",
              "atk": 1,
              "hp": 1
            }
          ],
          "sprite": "Graphical Assets/Cards/Owl Decks/Owl Deck 3/Grand Chancelier.png"
        }
      ]
    },
    {
      "id": "cameleon3",
      "name": "Pastiche",
      "species": "Cameleon",
      "sprite": "Graphical Assets/Characters/Cameleon/Cameleon.png",
      "role": "Usurpateur — MidRange : le Registre garde les types de toutes les cartes jouées",
      "stats": {
        "hp": 25,
        "mana": 8,
        "hand": 2
      },
      "cards": [
        {
          "id": "cam3_clerk",
          "name": "Greffier",
          "type": "ally",
          "cost": 2,
          "keys": [
            "type:Cameleon",
            "characteristique_variable:both:typesRegistre::1"
          ],
          "text": "Gagne +1/+1 pour chaque type différent dans le Registre.",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "enregistre",
                "n": 1
              },
              "text": "Cri de guerre : le Registre enregistre une carte au hasard de ta main."
            },
            {
              "lvl": 14,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "on_registre_self",
              "text": "Quand tu joues une carte qui partage un type avec le Registre, pioche une carte."
            }
          ],
          "atk": 0,
          "hp": 0,
          "statics": []
        },
        {
          "id": "cam3_librarian",
          "name": "Bibliothécaire",
          "type": "ally",
          "cost": 3,
          "keys": [
            "type:Cameleon"
          ],
          "text": "Les cartes qui partagent un type avec une carte du Registre coûtent 1 de moins.",
          "play": [],
          "tiers": [
            {
              "lvl": 3,
              "stats": {
                "atk": 0,
                "hp": 1
              },
              "text": "+0/+1"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "donne_type_du_registre",
                "t": "self",
                "quoi": "un"
              },
              "text": "Cri de guerre : reçoit un type du Registre au hasard."
            },
            {
              "lvl": 13,
              "statique": {
                "op": "cout_des_cartes",
                "qui": "toi",
                "quoi": "typeDuRegistre",
                "argCard": "",
                "sens": "moins",
                "v": 1
              },
              "text": "Statique : les cartes qui partagent un type avec le Registre coûtent 1 de moins de plus."
            },
            {
              "lvl": 17,
              "statique": {
                "op": "cout_des_cartes",
                "qui": "toi",
                "quoi": "all",
                "argCard": "",
                "sens": "moins",
                "v": 1
              },
              "text": "Statique : tes cartes coûtent 1 de moins."
            }
          ],
          "atk": 3,
          "hp": 3,
          "statics": [
            {
              "op": "cout_des_cartes",
              "qui": "toi",
              "quoi": "typeDuRegistre",
              "argCard": "",
              "sens": "moins",
              "v": 1
            }
          ]
        },
        {
          "id": "cam3_chronicler",
          "name": "Chroniqueur",
          "type": "ally",
          "cost": 3,
          "keys": [
            "type:Cameleon"
          ],
          "text": "Quand un type entre pour la première fois dans le Registre, pioche une carte.",
          "play": [],
          "tiers": [
            {
              "lvl": 4,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "death",
              "text": "Râle d’agonie : pioche une carte."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "mana_au_prochain_tour",
                "x": 1
              },
              "slot": "on_typeNouveau_any",
              "text": "Quand un type entre pour la première fois dans le Registre, gagne 1 mana au prochain tour."
            },
            {
              "lvl": 18,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "on_typeNouveau_any",
              "text": "Quand un type entre pour la première fois dans le Registre, pioche aussi une carte."
            }
          ],
          "atk": 2,
          "hp": 4,
          "statics": [],
          "on_typeNouveau_any": [
            {
              "op": "draw",
              "v": 1
            }
          ]
        },
        {
          "id": "cam3_specimen",
          "name": "Spécimen",
          "type": "spell",
          "cost": 4,
          "keys": [
            "type:Cameleon"
          ],
          "text": "Inflige X dégâts à une cible adverse (unité ou héros), X étant le nombre de types dans le Registre.",
          "play": [
            {
              "op": "dmg",
              "t": "enemyAny",
              "v": {
                "src": "typesRegistre",
                "arg": "",
                "plus": 0
              }
            }
          ],
          "tiers": [
            {
              "lvl": 5,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            },
            {
              "lvl": 16,
              "extra": {
                "op": "dmg",
                "t": "randomEnemyAny",
                "v": {
                  "src": "typesRegistre",
                  "arg": "",
                  "plus": 0
                }
              },
              "text": "Inflige aussi X dégâts à une autre cible adverse au hasard."
            },
            {
              "lvl": 20,
              "extra": {
                "op": "dmg",
                "t": "enemyHero",
                "v": {
                  "src": "typesRegistre",
                  "arg": "",
                  "plus": 0
                }
              },
              "text": "Inflige aussi X dégâts au héros adverse."
            }
          ]
        },
        {
          "id": "cam3_grand",
          "name": "Grand Registre",
          "type": "ally",
          "cost": 7,
          "keys": [
            "type:Cameleon"
          ],
          "text": "Cri de guerre : tes autres alliés reçoivent chaque type du Registre et +2/+2.",
          "play": [
            {
              "op": "donne_type_du_registre",
              "t": "allAllies",
              "quoi": "tous"
            },
            {
              "op": "buff",
              "t": "allAllies",
              "atk": 2,
              "hp": 2
            }
          ],
          "tiers": [
            {
              "lvl": 6,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "buff",
                "t": "self",
                "atk": 1,
                "hp": 1
              },
              "slot": "on_typeNouveau_any",
              "text": "Quand un type entre pour la première fois dans le Registre, gagne +1/+1."
            },
            {
              "lvl": 15,
              "extra": {
                "op": "donne_type_du_registre",
                "t": "allAllies",
                "quoi": "un"
              },
              "slot": "turnStart",
              "text": "Début de ton tour : tes autres alliés reçoivent un type du Registre au hasard."
            },
            {
              "lvl": 19,
              "extra": {
                "op": "relance_registre",
                "mode": "hasard",
                "n": 1
              },
              "text": "Cri de guerre : relance aussi une carte du Registre au hasard."
            }
          ],
          "atk": 6,
          "hp": 6,
          "statics": []
        }
      ],
      "switches": [
        {
          "id": "cam3_copyist",
          "name": "Copiste",
          "type": "ally",
          "cost": 1,
          "keys": [
            "type:Cameleon"
          ],
          "text": "Cri de guerre : le Registre enregistre une carte au hasard de ta main (elle reste en main).",
          "play": [
            {
              "op": "enregistre",
              "n": 1
            }
          ],
          "tiers": [
            {
              "lvl": 2,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 9,
              "extra": {
                "op": "buff",
                "t": "self",
                "atk": 1,
                "hp": 1
              },
              "slot": "on_typeNouveau_any",
              "text": "Quand un type entre pour la première fois dans le Registre, gagne +1/+1."
            },
            {
              "lvl": 13,
              "extra": {
                "op": "enregistre",
                "n": 1
              },
              "slot": "turnStart",
              "text": "Début de ton tour : le Registre enregistre une carte au hasard de ta main."
            }
          ],
          "atk": 1,
          "hp": 2,
          "statics": []
        },
        {
          "id": "cam3_mimic",
          "name": "Mimétisme",
          "type": "spell",
          "cost": 2,
          "keys": [
            "type:Cameleon"
          ],
          "text": "Une unité alliée gagne +2/+2 et un type du Registre au hasard.",
          "play": [
            {
              "op": "buff",
              "t": "allyUnit",
              "atk": 2,
              "hp": 2
            },
            {
              "op": "donne_type_du_registre",
              "t": "allyUnit",
              "quoi": "un"
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "donne_type_du_registre",
                "t": "allyUnit",
                "quoi": "un"
              },
              "text": "L’unité reçoit aussi un deuxième type du Registre."
            }
          ],
          "sprite": "Graphical Assets/Cards/Cameleon Decks/Cameleon Deck 3/Mimétisme.png"
        },
        {
          "id": "cam3_ruthless",
          "name": "Archiviste Impitoyable",
          "type": "ally",
          "cost": 4,
          "keys": [
            "type:Cameleon"
          ],
          "text": "Quand l’adversaire joue une carte qui partage un type avec le Registre, il perd 1 PV.",
          "play": [],
          "tiers": [
            {
              "lvl": 4,
              "stats": {
                "atk": 1,
                "hp": 0
              },
              "text": "+1/+0"
            },
            {
              "lvl": 8,
              "extra": {
                "op": "dmg",
                "t": "enemyHero",
                "v": 1
              },
              "slot": "turnEnd",
              "text": "Fin de ton tour : 1 dégât au héros adverse."
            },
            {
              "lvl": 14,
              "aura": {
                "key": "",
                "atk": -1,
                "hp": 0,
                "scope": "enemyUnits"
              },
              "text": "Aura : les unités adverses ont -1/-0."
            }
          ],
          "atk": 3,
          "hp": 4,
          "statics": [],
          "on_registre_foe": [
            {
              "op": "dmg",
              "t": "enemyHero",
              "v": 1
            }
          ]
        },
        {
          "id": "cam3_index",
          "name": "Index du Registre",
          "type": "spell",
          "cost": 5,
          "keys": [
            "type:Cameleon"
          ],
          "text": "Pioche autant de cartes que de types dans le Registre.",
          "play": [
            {
              "op": "draw",
              "v": {
                "src": "typesRegistre",
                "arg": "",
                "plus": 0
              }
            }
          ],
          "tiers": [
            {
              "lvl": 5,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "heal",
                "t": "ownHero",
                "v": 4
              },
              "text": "Soigne aussi ton héros de 4."
            },
            {
              "lvl": 16,
              "extra": {
                "op": "cree",
                "choix": "hasard",
                "quoi": "typeDuRegistre",
                "n": 1,
                "lvl": {
                  "src": "ownerLevel",
                  "arg": "",
                  "plus": 0
                }
              },
              "text": "Crée aussi une carte au hasard d’un type du Registre."
            }
          ]
        },
        {
          "id": "cam3_retro",
          "name": "Rétrospective",
          "type": "spell",
          "cost": 8,
          "keys": [
            "type:Cameleon"
          ],
          "text": "Pour chaque type du Registre, relance gratuitement une carte du Registre de ce type, au hasard.",
          "play": [
            {
              "op": "relance_registre",
              "mode": "parType",
              "n": 1
            }
          ],
          "tiers": [
            {
              "lvl": 6,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            },
            {
              "lvl": 15,
              "extra": {
                "op": "relance_registre",
                "mode": "hasard",
                "n": 1
              },
              "text": "Relance aussi une carte du Registre au hasard."
            }
          ],
          "sprite": "Graphical Assets/Cards/Cameleon Decks/Cameleon Deck 3/Rétrospective.png"
        }
      ]
    }
  ],
  "ignores": [
    {
      "ou": "carte:cat_nine",
      "regle": "cout-solo",
      "pourquoi": "Coût alternatif décroissant"
    },
    {
      "ou": "carte:owl2_midnight",
      "regle": "cout-solo",
      "pourquoi": "Coût alternatif décroissant"
    }
  ]
};
