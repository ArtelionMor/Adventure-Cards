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
  "characters": [
    {
      "id": "dog",
      "name": "Gniocci",
      "species": "Chien",
      "sprite": "Characters/Dog Gniocci.png",
      "role": "Gardien — tient la ligne et soigne",
      "stats": {
        "hp": 32,
        "mana": 7,
        "hand": 4
      },
      "cards": [
        {
          "id": "dog_pup",
          "name": "Toutou Fidele",
          "type": "ally",
          "cost": 1,
          "atk": 1,
          "hp": 3,
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
          ]
        },
        {
          "id": "dog_guard",
          "name": "Molosse de Garde",
          "type": "ally",
          "cost": 3,
          "atk": 3,
          "hp": 4,
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
          ]
        },
        {
          "id": "dog_bark",
          "name": "Aboiement",
          "type": "spell",
          "cost": 1,
          "keys": [],
          "text": "Inflige 2 degats.",
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
          "id": "dog_lick",
          "name": "Coup de Langue",
          "type": "spell",
          "cost": 2,
          "keys": [],
          "text": "Rend 6 PV a ton heros.",
          "play": [
            {
              "op": "heal",
              "t": "ownHero",
              "v": 6
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
          "id": "dog_pack",
          "name": "Meute",
          "type": "ally",
          "cost": 4,
          "atk": 2,
          "hp": 2,
          "keys": [],
          "text": "Cri de guerre : invoque deux Chiots 1/1.",
          "play": [
            {
              "op": "summon",
              "n": 2,
              "unit": {
                "name": "Chiot",
                "atk": 1,
                "hp": 1
              }
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
          ]
        }
      ],
      "switches": [
        {
          "id": "dog_bite",
          "name": "Morsure",
          "type": "ally",
          "cost": 2,
          "atk": 3,
          "hp": 2,
          "keys": [
            "Charge"
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
          ]
        },
        {
          "id": "dog_alpha",
          "name": "Alpha",
          "type": "ally",
          "cost": 5,
          "atk": 5,
          "hp": 5,
          "keys": [],
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
          ]
        },
        {
          "id": "dog_shield",
          "name": "Carapace",
          "type": "spell",
          "cost": 2,
          "keys": [],
          "text": "Gagne 6 points d’armure.",
          "play": [
            {
              "op": "armor",
              "v": 6
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
          "id": "dog_bone",
          "name": "Vieil Os",
          "type": "spell",
          "cost": 3,
          "keys": [],
          "text": "Rend 4 PV et pioche une carte.",
          "play": [
            {
              "op": "heal",
              "t": "ownHero",
              "v": 4
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
          "id": "dog_growl",
          "name": "Grondement",
          "type": "spell",
          "cost": 1,
          "keys": [],
          "text": "Un allie gagne +0/+3 et Provocation.",
          "play": [
            {
              "op": "buff",
              "t": "allyUnit",
              "atk": 0,
              "hp": 3,
              "key": "Taunt"
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
        }
      ]
    },
    {
      "id": "cat",
      "name": "Mistral",
      "species": "Chat",
      "sprite": "Characters/Cat.png",
      "role": "Rodeur — vitesse et pression",
      "stats": {
        "hp": 26,
        "mana": 8,
        "hand": 5
      },
      "cards": [
        {
          "id": "cat_claw",
          "name": "Griffure",
          "type": "ally",
          "cost": 1,
          "atk": 2,
          "hp": 1,
          "keys": [
            "Charge"
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
          ]
        },
        {
          "id": "cat_alley",
          "name": "Chat de Gouttiere",
          "type": "ally",
          "cost": 2,
          "atk": 2,
          "hp": 3,
          "keys": [],
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
          ]
        },
        {
          "id": "cat_pounce",
          "name": "Bond",
          "type": "spell",
          "cost": 1,
          "keys": [],
          "text": "Inflige 3 degats a une unite.",
          "play": [
            {
              "op": "dmg",
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
          "id": "cat_nine",
          "name": "Neuf Vies",
          "type": "spell",
          "cost": 3,
          "keys": [],
          "text": "Invoque trois Chatons 1/1 avec Charge.",
          "play": [
            {
              "op": "summon",
              "n": 3,
              "unit": {
                "name": "Chaton",
                "atk": 1,
                "hp": 1,
                "keys": [
                  "Charge"
                ]
              }
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Chaton",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "Charge"
                  ]
                }
              },
              "text": "Un chaton de plus"
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
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Chaton",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "Charge"
                  ]
                }
              },
              "text": "Un chaton de plus"
            }
          ]
        },
        {
          "id": "cat_shadow",
          "name": "Ombre Feutree",
          "type": "ally",
          "cost": 4,
          "atk": 5,
          "hp": 3,
          "keys": [],
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
          ]
        }
      ],
      "switches": [
        {
          "id": "cat_scratch",
          "name": "Coup de Patte",
          "type": "spell",
          "cost": 0,
          "keys": [],
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
          "id": "cat_hunt",
          "name": "Chasse",
          "type": "spell",
          "cost": 2,
          "keys": [],
          "text": "Un allie gagne +2/+0 et Charge.",
          "play": [
            {
              "op": "buff",
              "t": "allyUnit",
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
          "id": "cat_curio",
          "name": "Curiosite",
          "type": "spell",
          "cost": 2,
          "keys": [],
          "text": "Pioche 2 cartes.",
          "play": [
            {
              "op": "draw",
              "v": 2
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "cost": -1,
              "text": "Coût −1"
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
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche 1 carte en plus"
            }
          ]
        },
        {
          "id": "cat_trap",
          "name": "Piege a Souris",
          "type": "ally",
          "cost": 2,
          "atk": 1,
          "hp": 4,
          "keys": [
            "Taunt"
          ],
          "text": "Provocation. Cri de guerre : pioche une carte.",
          "play": [
            {
              "op": "draw",
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
          ]
        },
        {
          "id": "cat_king",
          "name": "Roi des Toits",
          "type": "ally",
          "cost": 5,
          "atk": 4,
          "hp": 5,
          "keys": [],
          "text": "Cri de guerre : +1/+0 a tes autres allies.",
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
          ]
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
        "hand": 5
      },
      "cards": [
        {
          "id": "crow_peck",
          "name": "Coup de Bec",
          "type": "spell",
          "cost": 1,
          "keys": [],
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
          "keys": [],
          "text": "Cri de guerre : pioche une carte.",
          "play": [
            {
              "op": "draw",
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
          ]
        },
        {
          "id": "crow_murder",
          "name": "Nuee",
          "type": "spell",
          "cost": 4,
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
          "id": "crow_omen",
          "name": "Presage",
          "type": "spell",
          "cost": 2,
          "keys": [],
          "text": "Pioche 2 cartes.",
          "play": [
            {
              "op": "draw",
              "v": 2
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "cost": -1,
              "text": "Coût −1"
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
              "extra": {
                "op": "dmg",
                "t": "enemyHero",
                "v": 2
              },
              "text": "Inflige 2 dégâts au héros adverse"
            }
          ]
        },
        {
          "id": "crow_raven",
          "name": "Grand Corbeau",
          "type": "ally",
          "cost": 5,
          "atk": 4,
          "hp": 4,
          "keys": [],
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
          ]
        }
      ],
      "switches": [
        {
          "id": "crow_thief",
          "name": "Voleur de Brillants",
          "type": "ally",
          "cost": 3,
          "atk": 3,
          "hp": 2,
          "keys": [],
          "text": "Cri de guerre : +1 mana ce tour.",
          "play": [
            {
              "op": "mana",
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
          ]
        },
        {
          "id": "crow_curse",
          "name": "Malediction",
          "type": "spell",
          "cost": 3,
          "keys": [],
          "text": "Inflige 5 degats.",
          "play": [
            {
              "op": "dmg",
              "t": "enemyAny",
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
          "id": "crow_feather",
          "name": "Plume Noire",
          "type": "spell",
          "cost": 1,
          "keys": [],
          "text": "Un allie gagne +2/+1.",
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
          "id": "crow_swarm",
          "name": "Envol",
          "type": "ally",
          "cost": 4,
          "atk": 3,
          "hp": 3,
          "keys": [],
          "text": "Cri de guerre : invoque un Corbillat 1/2.",
          "play": [
            {
              "op": "summon",
              "n": 1,
              "unit": {
                "name": "Corbillat",
                "atk": 1,
                "hp": 2
              }
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
          ]
        },
        {
          "id": "crow_night",
          "name": "Nuit Sans Lune",
          "type": "spell",
          "cost": 5,
          "keys": [],
          "text": "3 degats a toutes les unites adverses, 2 au heros adverse.",
          "play": [
            {
              "op": "dmg",
              "t": "allEnemyUnits",
              "v": 3
            },
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
        "hand": 4
      },
      "cards": [
        {
          "id": "frog_tad",
          "name": "Tetard",
          "type": "ally",
          "cost": 1,
          "atk": 1,
          "hp": 2,
          "keys": [],
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
          ]
        },
        {
          "id": "frog_tongue",
          "name": "Langue Collante",
          "type": "spell",
          "cost": 2,
          "keys": [],
          "text": "Inflige 3 degats a une unite.",
          "play": [
            {
              "op": "dmg",
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
          "id": "frog_venom",
          "name": "Crapaud Venimeux",
          "type": "ally",
          "cost": 3,
          "atk": 2,
          "hp": 4,
          "keys": [
            "Venin"
          ],
          "text": "Venin : detruit toute unite qu’il blesse.",
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
          ]
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
          ]
        }
      ],
      "switches": [
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
          "id": "frog_spit",
          "name": "Crachat Acide",
          "type": "spell",
          "cost": 2,
          "keys": [],
          "text": "Inflige 2 degats et rend 2 PV.",
          "play": [
            {
              "op": "dmg",
              "t": "enemyAny",
              "v": 2
            },
            {
              "op": "heal",
              "t": "ownHero",
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
          "id": "frog_lily",
          "name": "Nenuphar",
          "type": "ally",
          "cost": 2,
          "atk": 0,
          "hp": 5,
          "keys": [
            "Taunt"
          ],
          "text": "Provocation. Cri de guerre : 3 points d’armure.",
          "play": [
            {
              "op": "armor",
              "v": 3
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
          ]
        },
        {
          "id": "frog_brew",
          "name": "Decoction",
          "type": "spell",
          "cost": 4,
          "keys": [],
          "text": "Rend 8 PV et pioche une carte.",
          "play": [
            {
              "op": "heal",
              "t": "ownHero",
              "v": 8
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
          "id": "frog_prince",
          "name": "Prince Grenouille",
          "type": "ally",
          "cost": 6,
          "atk": 6,
          "hp": 6,
          "keys": [],
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
        "mana": 9,
        "hand": 5
      },
      "cards": [
        {
          "id": "owl_study",
          "name": "Etude",
          "type": "spell",
          "cost": 1,
          "keys": [],
          "text": "Pioche une carte et gagne 1 mana ce tour.",
          "play": [
            {
              "op": "draw",
              "v": 1
            },
            {
              "op": "mana",
              "v": 1
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "extra": {
                "op": "mana",
                "v": 1
              },
              "text": "+1 mana en plus"
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
              "cost": -1,
              "text": "Coût −1"
            }
          ]
        },
        {
          "id": "owl_scholar",
          "name": "Chouette Erudite",
          "type": "ally",
          "cost": 2,
          "atk": 1,
          "hp": 4,
          "keys": [],
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
          ]
        },
        {
          "id": "owl_gaze",
          "name": "Regard Percant",
          "type": "spell",
          "cost": 3,
          "keys": [],
          "text": "Inflige 4 degats.",
          "play": [
            {
              "op": "dmg",
              "t": "enemyAny",
              "v": 4
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
          "id": "owl_wisdom",
          "name": "Sagesse",
          "type": "spell",
          "cost": 4,
          "keys": [],
          "text": "Pioche 3 cartes.",
          "play": [
            {
              "op": "draw",
              "v": 3
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "cost": -1,
              "text": "Coût −1"
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
              "extra": {
                "op": "draw",
                "v": 1
              },
              "text": "Pioche 1 carte en plus"
            }
          ]
        },
        {
          "id": "owl_night",
          "name": "Chouette Nocturne",
          "type": "ally",
          "cost": 5,
          "atk": 3,
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
          ]
        }
      ],
      "switches": [
        {
          "id": "owl_focus",
          "name": "Concentration",
          "type": "spell",
          "cost": 2,
          "keys": [],
          "text": "Gagne 2 mana ce tour.",
          "play": [
            {
              "op": "mana",
              "v": 2
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "cost": -1,
              "text": "Coût −1"
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
              "extra": {
                "op": "mana",
                "v": 1
              },
              "text": "+1 mana en plus"
            }
          ]
        },
        {
          "id": "owl_lecture",
          "name": "Lecon",
          "type": "spell",
          "cost": 3,
          "keys": [],
          "text": "+1/+2 a tous tes allies.",
          "play": [
            {
              "op": "buff",
              "t": "allAllies",
              "atk": 1,
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
          "id": "owl_watch",
          "name": "Guet",
          "type": "ally",
          "cost": 3,
          "atk": 2,
          "hp": 3,
          "keys": [
            "Taunt"
          ],
          "text": "Provocation. Cri de guerre : 3 armure.",
          "play": [
            {
              "op": "armor",
              "v": 3
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
          ]
        },
        {
          "id": "owl_storm",
          "name": "Tempete d’Idees",
          "type": "spell",
          "cost": 5,
          "keys": [],
          "text": "2 degats a toutes les unites adverses, pioche 2 cartes.",
          "play": [
            {
              "op": "dmg",
              "t": "allEnemyUnits",
              "v": 2
            },
            {
              "op": "draw",
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
          "id": "owl_arch",
          "name": "Archichouette",
          "type": "ally",
          "cost": 6,
          "atk": 5,
          "hp": 7,
          "keys": [],
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
          ]
        }
      ]
    },
    {
      "id": "fox",
      "name": "Roux",
      "species": "Renard",
      "sprite": "Characters/Fox Wild.png",
      "role": "Bandit — burst et tempo",
      "stats": {
        "hp": 25,
        "mana": 8,
        "hand": 4
      },
      "cards": [
        {
          "id": "fox_kit",
          "name": "Renardeau",
          "type": "ally",
          "cost": 1,
          "atk": 1,
          "hp": 1,
          "keys": [],
          "text": "Cri de guerre : pioche une carte.",
          "play": [
            {
              "op": "draw",
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
          ]
        },
        {
          "id": "fox_dash",
          "name": "Fulgurance",
          "type": "ally",
          "cost": 2,
          "atk": 3,
          "hp": 1,
          "keys": [
            "Charge"
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
          ]
        },
        {
          "id": "fox_snare",
          "name": "Collet",
          "type": "spell",
          "cost": 2,
          "keys": [],
          "text": "Inflige 3 degats a une unite.",
          "play": [
            {
              "op": "dmg",
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
          "id": "fox_raid",
          "name": "Razzia",
          "type": "spell",
          "cost": 3,
          "keys": [],
          "text": "Inflige 4 degats au heros adverse.",
          "play": [
            {
              "op": "dmg",
              "t": "enemyHero",
              "v": 4
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
          "id": "fox_wild",
          "name": "Renard Sauvage",
          "type": "ally",
          "cost": 4,
          "atk": 4,
          "hp": 3,
          "keys": [
            "Charge"
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
          ]
        }
      ],
      "switches": [
        {
          "id": "fox_cunning",
          "name": "Ruse",
          "type": "spell",
          "cost": 1,
          "keys": [],
          "text": "Un allie gagne +3/+0.",
          "play": [
            {
              "op": "buff",
              "t": "allyUnit",
              "atk": 3,
              "hp": 0
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
          "id": "fox_ambush",
          "name": "Embuscade",
          "type": "spell",
          "cost": 4,
          "keys": [],
          "text": "Inflige 3 degats a toutes les unites adverses.",
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
          "id": "fox_bandit",
          "name": "Bandit Masque",
          "type": "ally",
          "cost": 3,
          "atk": 3,
          "hp": 3,
          "keys": [],
          "text": "Cri de guerre : 2 degats au heros adverse.",
          "play": [
            {
              "op": "dmg",
              "t": "enemyHero",
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
          ]
        },
        {
          "id": "fox_frenzy",
          "name": "Frenesie",
          "type": "spell",
          "cost": 3,
          "keys": [],
          "text": "Tes allies gagnent +1/+0 et Charge.",
          "play": [
            {
              "op": "buff",
              "t": "allAllies",
              "atk": 1,
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
          "id": "fox_king",
          "name": "Roi Bandit",
          "type": "ally",
          "cost": 6,
          "atk": 6,
          "hp": 4,
          "keys": [
            "Charge"
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
          ]
        }
      ]
    }
  ]
};
