// DONNEES DE JEU — genere et re-ecrit par le Card Builder (/builder/).
// Tu peux l'editer a la main, mais le builder est fait pour ca : ouvre-le plutot.
export const CHARACTER_DATA = {
  "version": 1,
  "starters": [
    "dog",
    "cat",
    "crow"
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
      "sprite": "Characters/Rabbit.png"
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
      "sprite": "Characters/Rabbit.png"
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
      "sprite": "Characters/Rabbit Robot.png"
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
      "sprite": "Characters/Rabbit English Lop.png"
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
      "sprite": "Characters/Sloth.png"
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
      "sprite": "Characters/Dog Gniocci.png"
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
      "sprite": "Characters/Crow Volcanic.png"
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
      "sprite": "Characters/Cat Bug.png"
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
      "sprite": "Characters/Big Bad Wolf.png"
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
      "sprite": "Characters/Dog.png"
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
      "sprite": "Characters/Rabbit.png"
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
      "sprite": "Characters/Frog Venomous.png"
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
      "sprite": "Characters/Rabbit Myxomatose.png"
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
      "sprite": "Characters/Owl Great Horned Owl.png"
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
      "sprite": "Characters/Owl Great Horned Owl.png"
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
      "sprite": "Characters/Dog German Shepherd.png"
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
      "sprite": "Characters/Cat Siamese.png"
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
      "sprite": "Characters/Dog German Shepherd.png"
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
      "sprite": "Characters/Cat Menkoun.png"
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
      "sprite": "Characters/Crow Three Eyes.png"
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
      "sprite": "Characters/Frog Toad.png"
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
      "sprite": "Characters/Owl Snow.png"
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
      "sprite": "Characters/Falcon.png"
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
      "sprite": "Characters/Robin.png",
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
      "sprite": "Characters/Big Bad Wolf.png"
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
      "sprite": "Characters/Cat Bug.png"
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
      "sprite": "Characters/Falcon.png"
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
      "sprite": "Characters/Owl Great Horned Owl.png"
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
      "sprite": "Characters/Octopus Robot.png",
      "on_heroHurt_self": [
        {
          "op": "buff",
          "t": "self",
          "atk": 2,
          "hp": 2
        }
      ]
    }
  ],
  "npcs": [
    {
      "id": "rabbit1",
      "name": "Lapin Chapardeur",
      "sprite": "Characters/Rabbit.png",
      "hp": 20,
      "mana": 5,
      "hand": 3,
      "level": 1,
      "deck": [
        {
          "card": "grunt1",
          "n": 2
        },
        {
          "card": "grunt2",
          "n": 1
        },
        {
          "card": "bolt",
          "n": 1
        },
        {
          "card": "card_bjidas",
          "n": 1
        }
      ],
      "ia": "naif"
    },
    {
      "id": "cat1",
      "name": "Chat de Ruelle",
      "sprite": "Characters/Cat Ginger.png",
      "hp": 24,
      "mana": 6,
      "hand": 3,
      "level": 1,
      "deck": [
        {
          "card": "grunt2",
          "n": 1
        },
        {
          "card": "rush1",
          "n": 1
        },
        {
          "card": "bolt",
          "n": 1
        },
        {
          "card": "card_i5eghg",
          "n": 1
        },
        {
          "card": "wall1",
          "n": 1
        },
        {
          "card": "card_ta7prz",
          "n": 2
        }
      ],
      "ia": "naif"
    },
    {
      "id": "crow1",
      "name": "Corbeau Rieur",
      "sprite": "Characters/Crow White.png",
      "hp": 26,
      "mana": 6,
      "hand": 4,
      "level": 1,
      "deck": [
        {
          "card": "grunt2",
          "n": 1
        },
        {
          "card": "grunt3",
          "n": 2
        },
        {
          "card": "bolt",
          "n": 1
        },
        {
          "card": "wall1",
          "n": 2
        },
        {
          "card": "card_y5uc9s",
          "n": 1
        }
      ]
    },
    {
      "id": "wolf",
      "name": "Grand Mechant Loup",
      "sprite": "Characters/Big Bad Wolf.png",
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
          "n": 2
        },
        {
          "card": "rush1",
          "n": 2
        },
        {
          "card": "smash",
          "n": 1
        },
        {
          "card": "rally",
          "n": 1
        }
      ],
      "ia": "dur",
      "boss": true
    },
    {
      "id": "frog1",
      "name": "Crapaud Baveux",
      "sprite": "Characters/Frog Toad.png",
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
          "card": "wall1",
          "n": 2
        },
        {
          "card": "grunt3",
          "n": 2
        },
        {
          "card": "potion",
          "n": 1
        },
        {
          "card": "card_urlyni",
          "n": 2
        }
      ]
    },
    {
      "id": "octo1",
      "name": "Pieuvre Pirate",
      "sprite": "Characters/Octopus Pirate.png",
      "hp": 36,
      "mana": 7,
      "hand": 4,
      "level": 1,
      "deck": [
        {
          "card": "grunt3",
          "n": 4
        },
        {
          "card": "grunt4",
          "n": 2
        },
        {
          "card": "smash",
          "n": 3
        },
        {
          "card": "wall1",
          "n": 3
        }
      ]
    },
    {
      "id": "frogboss",
      "name": "Capitaine Grenouille",
      "sprite": "Characters/Frog Captain.png",
      "hp": 76,
      "mana": 9,
      "hand": 5,
      "level": 1,
      "deck": [
        {
          "card": "venomite",
          "n": 4
        },
        {
          "card": "wall2",
          "n": 4
        },
        {
          "card": "grunt4",
          "n": 3
        },
        {
          "card": "smash",
          "n": 3
        },
        {
          "card": "rally",
          "n": 3
        },
        {
          "card": "potion",
          "n": 2
        },
        {
          "card": "card_viekke",
          "n": 1
        },
        {
          "card": "card_winkd1",
          "n": 1
        }
      ],
      "ia": "dur",
      "boss": true
    },
    {
      "id": "fox1",
      "name": "Renard des Neiges",
      "sprite": "Characters/Fox Snow.png",
      "hp": 40,
      "mana": 8,
      "hand": 4,
      "level": 1,
      "deck": [
        {
          "card": "rush1",
          "n": 5
        },
        {
          "card": "grunt4",
          "n": 3
        },
        {
          "card": "smash",
          "n": 4
        },
        {
          "card": "grunt3",
          "n": 3
        }
      ]
    },
    {
      "id": "owlboss",
      "name": "Grand-Duc",
      "sprite": "Characters/Owl Great Horned Owl.png",
      "hp": 105,
      "mana": 10,
      "hand": 5,
      "level": 1,
      "deck": [
        {
          "card": "wall2",
          "n": 5
        },
        {
          "card": "grunt4",
          "n": 5
        },
        {
          "card": "smash",
          "n": 4
        },
        {
          "card": "rally",
          "n": 3
        },
        {
          "card": "potion",
          "n": 3
        },
        {
          "card": "card_viekke",
          "n": 3
        },
        {
          "card": "card_4vap0r",
          "n": 1
        }
      ],
      "ia": "dur",
      "boss": true
    }
  ],
  "characters": [
    {
      "id": "dog",
      "name": "Médor",
      "species": "Chien",
      "sprite": "Characters/Dog.png",
      "role": "Gardien — tient la ligne / Appelle la meute",
      "stats": {
        "hp": 32,
        "mana": 7,
        "hand": 2
      },
      "cards": [
        {
          "id": "dog_pup",
          "name": "Toutou Fidele",
          "type": "ally",
          "cost": 2,
          "keys": [
            "Taunt",
            "type:Chien"
          ],
          "text": "Râle d'agonie : Invoque un Chien 2/2",
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
                "name": "Chien",
                "atk": 2,
                "hp": 2,
                "statics": []
              }
            }
          ]
        },
        {
          "id": "dog_guard",
          "name": "Molosse de Garde",
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
          "statics": []
        },
        {
          "id": "dog_growl",
          "name": "Appel",
          "type": "spell",
          "cost": 3,
          "keys": [
            "type:Chien"
          ],
          "text": "Invoque un toutou fidèle. Donne +1/+1  à tes alliés.",
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
              "text": "Invoque un autre Toutou fidèle.",
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
              "text": "Invoque un Enragé."
            },
            {
              "lvl": 16,
              "text": "Coût -1.",
              "cost": -1
            }
          ]
        },
        {
          "id": "dog_lick",
          "name": "Rappel",
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
          ]
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
          "text": "Cri de guerre : invoque un Toutou Fidèle et un Enragé.",
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
          "statics": []
        }
      ],
      "switches": [
        {
          "id": "dog_bite",
          "name": "Enragé",
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
          "statics": []
        },
        {
          "id": "dog_alpha",
          "name": "Alpha",
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
              "text": "Cri de guerre : Invoque un Enragé.",
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
          "statics": []
        },
        {
          "id": "dog_bone",
          "name": "Prince Foufi",
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
              "text": "Invoque un Chiot 1/1 avec \"Râle d'agonie : Invoque un Chien 2/2\".",
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
                        "name": "Chien",
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
                        "name": "Chien",
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
          "statics": []
        },
        {
          "id": "dog_shield",
          "name": "Charge",
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
          "statics": []
        },
        {
          "id": "dog_bark",
          "name": "Appel de la meute",
          "type": "spell",
          "cost": 5,
          "keys": [
            "type:Chien"
          ],
          "text": "Invoque un Alpha, un Enragé et un Toutou Fidèle.",
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
          ]
        }
      ]
    },
    {
      "id": "cat",
      "name": "Felix",
      "species": "Chat",
      "sprite": "Characters/Cat Bug.png",
      "role": "Mille coupures",
      "stats": {
        "hp": 26,
        "mana": 8,
        "hand": 2
      },
      "cards": [
        {
          "id": "cat_claw",
          "name": "Griffure",
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
          "statics": []
        },
        {
          "id": "cat_alley",
          "name": "Chat de Gouttiere",
          "type": "ally",
          "cost": 2,
          "atk": 1,
          "hp": 2,
          "keys": [
            "type:Chat",
            "Charge",
            "passe_murailles"
          ],
          "text": "Charge. Quand tu attaques avec une unité : Crée une Foudre",
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
          }
        },
        {
          "id": "cat_pounce",
          "name": "Foudre",
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
          ]
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
          "text": "Crée autant de carte \"Foudre\" que de tour joués.",
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
          ]
        },
        {
          "id": "cat_shadow",
          "name": "Ombre Feutree",
          "type": "ally",
          "cost": 2,
          "atk": 1,
          "hp": 1,
          "keys": [
            "type:Chat"
          ],
          "text": "Les sorts de votre main coûtent 1 de moins. Cri de guerre : Mélange dans la pioche 5 sorts.",
          "play": [
            {
              "op": "melange_a_la_pioche",
              "d_ou": "creee",
              "choix": "hasard",
              "carte": "",
              "quoi": "spell",
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
          ]
        }
      ],
      "switches": [
        {
          "id": "cat_scratch",
          "name": "Tempête de patounes",
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
          ]
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
          ]
        },
        {
          "id": "cat_curio",
          "name": "Curiosite",
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
          "statics": []
        },
        {
          "id": "cat_trap",
          "name": "Piege a Souris",
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
          }
        },
        {
          "id": "cat_king",
          "name": "Roi des Toits",
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
          "statics": []
        }
      ]
    },
    {
      "id": "crow",
      "name": "Corax",
      "species": "Corbeau",
      "sprite": "Characters/Crow.png",
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
          ]
        },
        {
          "id": "crow_scout",
          "name": "Eclaireur",
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
          }
        },
        {
          "id": "crow_murder",
          "name": "Envol",
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
          ]
        },
        {
          "id": "crow_omen",
          "name": "Presage",
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
                "carte": "Envol",
                "n": 1
              },
              "text": "Pioche Envol"
            },
            {
              "lvl": 11,
              "extra": {
                "op": "mana",
                "v": 2
              },
              "text": "+2 manas ce tour-ci."
            }
          ]
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
          "statics": []
        }
      ],
      "switches": [
        {
          "id": "crow_thief",
          "name": "Frappeur Nocturne",
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
          "statics": []
        },
        {
          "id": "crow_curse",
          "name": "Malediction",
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
          ]
        },
        {
          "id": "crow_feather",
          "name": "Plume Noire",
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
          "statics": []
        },
        {
          "id": "crow_swarm",
          "name": "Nuee",
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
          ]
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
          ]
        }
      ]
    },
    {
      "id": "frog",
      "name": "Bulle",
      "species": "Grenouille",
      "sprite": "Characters/Frog.png",
      "role": "Venin — use l’adversaire",
      "stats": {
        "hp": 28,
        "mana": 7,
        "hand": 2
      },
      "cards": [
        {
          "id": "frog_tad",
          "name": "Têtard",
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
          ]
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
          ]
        },
        {
          "id": "frog_venom",
          "name": "Grenouille",
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
          "statics": []
        },
        {
          "id": "frog_swamp",
          "name": "Vase",
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
          ]
        },
        {
          "id": "frog_toad",
          "name": "Grand Crapaud",
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
          "statics": []
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
          ]
        },
        {
          "id": "frog_spit",
          "name": "Soigneur visqueux.",
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
          "statics": []
        },
        {
          "id": "frog_lily",
          "name": "Fermier du Nenuphar",
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
          ]
        },
        {
          "id": "frog_brew",
          "name": "Decoction",
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
          ]
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
          ]
        }
      ]
    },
    {
      "id": "owl",
      "name": "Athena",
      "species": "Chouette",
      "sprite": "Characters/Owl.png",
      "role": "Controle — mana et cartes",
      "stats": {
        "hp": 26,
        "mana": 10,
        "hand": 2
      },
      "cards": [
        {
          "id": "owl_study",
          "name": "Etude",
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
          ]
        },
        {
          "id": "owl_scholar",
          "name": "Chouette Erudite",
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
          ]
        },
        {
          "id": "owl_gaze",
          "name": "Regard Percant",
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
          ]
        },
        {
          "id": "owl_wisdom",
          "name": "Chasse",
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
          ]
        },
        {
          "id": "owl_night",
          "name": "Impératrice nocturne.",
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
          ]
        }
      ],
      "switches": [
        {
          "id": "owl_focus",
          "name": "Exclusion",
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
          ]
        },
        {
          "id": "owl_lecture",
          "name": "Maître du tourbillon",
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
          "statics": []
        },
        {
          "id": "owl_watch",
          "name": "Guet",
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
          ]
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
          ]
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
          ]
        }
      ]
    },
    {
      "id": "cameleon",
      "name": "Miracle",
      "species": "Cameleon",
      "sprite": "Characters/Cameleon.png",
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
          "sprite": "Characters/Cameleon.png"
        },
        {
          "id": "fox_dash",
          "name": "Transmigration",
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
          "sprite": "Characters/Cameleon.png"
        },
        {
          "id": "fox_snare",
          "name": "Gobeur de mouche",
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
          "sprite": "Characters/Cameleon.png"
        },
        {
          "id": "fox_raid",
          "name": "Découverte",
          "type": "spell",
          "cost": 2,
          "keys": [],
          "text": "Choisir : Crée une carte du type d'une carte sur le terrain OU à la défausse.",
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
              "text": "les deux choix partent",
              "lesDeux": true
            }
          ],
          "sprite": "Characters/Cameleon.png"
        },
        {
          "id": "fox_wild",
          "name": "Bipolarité",
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
          "sprite": "Characters/Cameleon.png"
        }
      ],
      "switches": [
        {
          "id": "fox_cunning",
          "name": "Maître du camouflage",
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
          "sprite": "Characters/Cameleon.png"
        },
        {
          "id": "fox_ambush",
          "name": "Captif dans le miroir",
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
              "text": "Coût -1.",
              "cost": -1
            }
          ],
          "sprite": "Characters/Cameleon.png"
        },
        {
          "id": "fox_bandit",
          "name": "Coup de langue",
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
          "sprite": "Characters/Cameleon.png"
        },
        {
          "id": "fox_frenzy",
          "name": "Cohorte Divergente",
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
          ]
        },
        {
          "id": "fox_king",
          "name": "Métamorphose ultime",
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
          "sprite": "Characters/Cameleon.png"
        }
      ]
    },
    {
      "id": "dog2",
      "name": "Croc",
      "species": "Chien",
      "sprite": "Characters/Dog German Shepherd.png",
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
          ]
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
          ]
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
          "name": "Grand Loup",
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
          "name": "Chiot Kamikaze",
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
          ]
        },
        {
          "id": "dog2_queen",
          "name": "Louve Alpha",
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
          ]
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
          ]
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
          ]
        }
      ]
    },
    {
      "id": "cat2",
      "name": "Mistigri",
      "species": "Chat",
      "sprite": "Characters/Cat Siamese.png",
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
          }
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
              "text": "Râle d’agonie : crée aussi une Foudre dans ta main."
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
          "type": "spell",
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
          ]
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
          ]
        },
        {
          "id": "cat2_lord",
          "name": "Grand Matou",
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
          "text": "Élusif. Passe-Murailles. Râle d'agonie : crée une Foudre dans ta main.",
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
          ]
        },
        {
          "id": "cat2_matriarch",
          "name": "Matriarche",
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
          "name": "Pickpocket",
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
              "text": "Cri de guerre : crée une Foudre dans ta main."
            }
          ],
          "atk": 2,
          "hp": 1,
          "statics": []
        },
        {
          "id": "cat2_roof",
          "name": "Seigneur des Gouttières",
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
      "sprite": "Characters/Falcon.png",
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
          ]
        },
        {
          "id": "crow2_hawk",
          "name": "Faucon Chasseur",
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
          "name": "Courant Ascendant",
          "type": "spell",
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
          ]
        },
        {
          "id": "crow2_roc",
          "name": "Grand Rapace",
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
          "statics": []
        },
        {
          "id": "crow2_dart",
          "name": "Plongeon",
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
          ]
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
          "name": "Faucon Foudroyant",
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
      "sprite": "Characters/Frog Venomous.png",
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
          ]
        },
        {
          "id": "frog2_croak",
          "name": "Hurleur du Marais",
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
          ]
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
          ]
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
          ]
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
          ]
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
          ]
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
          ]
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
          ]
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
          ]
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
          ]
        }
      ]
    },
    {
      "id": "owl2",
      "name": "Morphée",
      "species": "Hibou",
      "sprite": "Characters/Owl Snow.png",
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
          "name": "Veilleur",
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
          "statics": []
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
          ]
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
          ]
        },
        {
          "id": "owl2_clock",
          "name": "Horloge Murale",
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
      "sprite": "Characters/Cameleon.png",
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
          "statics": []
        },
        {
          "id": "cam2_mirror",
          "name": "Reflet",
          "type": "spell",
          "cost": 3,
          "keys": [],
          "text": "Une de tes unités devient une copie d’une unité adverse.",
          "play": [
            {
              "op": "copie",
              "t": "randomAllyUnit",
              "d_ou": "plateau",
              "choix": "precise",
              "carte": "",
              "quoi": "all",
              "argCard": "",
              "tm": "enemyUnit",
              "qui": "adversaire",
              "ordre": "hasard"
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "cost": -1,
              "text": "Coût -1"
            },
            {
              "lvl": 10,
              "extra": {
                "op": "buff",
                "t": "previous",
                "atk": 2,
                "hp": 2
              },
              "text": "L’unité copiée gagne +2/+2."
            },
            {
              "lvl": 12,
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche aussi une carte."
            }
          ]
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
          ]
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
          ]
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
          ]
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
          ]
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
          ]
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
          }
        }
      ]
    }
  ]
};
