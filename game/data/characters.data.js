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
  "library": [
    {
      "id": "grunt1",
      "name": "Rongeur",
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
      "statics": []
    },
    {
      "id": "grunt2",
      "name": "Chapardeur",
      "type": "ally",
      "cost": 2,
      "keys": [
        "passe_murailles"
      ],
      "text": "Passe-Murailles",
      "play": [],
      "tiers": [],
      "atk": 2,
      "hp": 2,
      "statics": []
    },
    {
      "id": "grunt3",
      "name": "Brute",
      "type": "ally",
      "cost": 3,
      "keys": [
        "type:Lapin",
        "Taunt"
      ],
      "text": "Provocation. Fin du tour, soigne 6 à elle-même.",
      "play": [],
      "tiers": [],
      "atk": 3,
      "hp": 4,
      "statics": [],
      "turnEnd": [
        {
          "op": "heal",
          "t": "self",
          "v": 6
        }
      ]
    },
    {
      "id": "grunt4",
      "name": "Colosse",
      "type": "ally",
      "cost": 5,
      "keys": [],
      "text": "",
      "play": [],
      "tiers": [],
      "atk": 5,
      "hp": 5
    },
    {
      "id": "wall1",
      "name": "Garde",
      "type": "ally",
      "cost": 2,
      "keys": [
        "Taunt"
      ],
      "text": "Provocation.",
      "play": [],
      "tiers": [],
      "atk": 1,
      "hp": 4
    },
    {
      "id": "wall2",
      "name": "Rempart",
      "type": "ally",
      "cost": 4,
      "keys": [
        "Taunt"
      ],
      "text": "Provocation.",
      "play": [],
      "tiers": [],
      "atk": 3,
      "hp": 6
    },
    {
      "id": "rush1",
      "name": "Eclaireur Fou",
      "type": "ally",
      "cost": 2,
      "keys": [
        "Charge"
      ],
      "text": "Charge.",
      "play": [],
      "tiers": [],
      "atk": 3,
      "hp": 1
    },
    {
      "id": "bolt",
      "name": "Caillou",
      "type": "spell",
      "cost": 1,
      "keys": [],
      "text": "2 degats.",
      "play": [
        {
          "op": "dmg",
          "t": "enemyAny",
          "v": 2
        }
      ],
      "tiers": []
    },
    {
      "id": "smash",
      "name": "Massue",
      "type": "spell",
      "cost": 3,
      "keys": [],
      "text": "4 degats.",
      "play": [
        {
          "op": "dmg",
          "t": "enemyAny",
          "v": 4
        }
      ],
      "tiers": []
    },
    {
      "id": "potion",
      "name": "Fiole",
      "type": "spell",
      "cost": 2,
      "keys": [],
      "text": "Rend 5 PV.",
      "play": [
        {
          "op": "heal",
          "t": "ownHero",
          "v": 5
        }
      ],
      "tiers": []
    },
    {
      "id": "rally",
      "name": "Ralliement",
      "type": "spell",
      "cost": 3,
      "keys": [],
      "text": "+1/+1 a tous ses allies.",
      "play": [
        {
          "op": "buff",
          "t": "allAllies",
          "atk": 1,
          "hp": 1
        }
      ],
      "tiers": []
    },
    {
      "id": "venomite",
      "name": "Bestiole Venimeuse",
      "type": "ally",
      "cost": 3,
      "keys": [
        "Venin"
      ],
      "text": "Venin.",
      "play": [],
      "tiers": [],
      "atk": 2,
      "hp": 3
    },
    {
      "id": "card_bjidas",
      "name": "Lapin Garou",
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
          "atk": 5,
          "hp": 5,
          "key": "Taunt"
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
          "n": 4
        },
        {
          "card": "grunt2",
          "n": 4
        },
        {
          "card": "bolt",
          "n": 2
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
          "n": 4
        },
        {
          "card": "rush1",
          "n": 4
        },
        {
          "card": "bolt",
          "n": 3
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
          "n": 3
        },
        {
          "card": "grunt3",
          "n": 3
        },
        {
          "card": "bolt",
          "n": 3
        },
        {
          "card": "wall1",
          "n": 2
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
          "n": 4
        },
        {
          "card": "wall2",
          "n": 3
        },
        {
          "card": "rush1",
          "n": 3
        },
        {
          "card": "smash",
          "n": 3
        },
        {
          "card": "rally",
          "n": 2
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
          "n": 3
        },
        {
          "card": "wall1",
          "n": 3
        },
        {
          "card": "grunt3",
          "n": 4
        },
        {
          "card": "potion",
          "n": 3
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
        "hand": 4
      },
      "cards": [
        {
          "id": "dog_pup",
          "name": "Toutou Fidele",
          "type": "ally",
          "cost": 3,
          "keys": [
            "Taunt",
            "type:Chien"
          ],
          "text": "Provocation.",
          "play": [],
          "tiers": [
            {
              "lvl": 2,
              "text": "Gagne +0/+1 à la fin du tour.",
              "extra": {
                "op": "buff",
                "t": "self",
                "atk": 0,
                "hp": 1
              },
              "slot": "turnEnd"
            },
            {
              "lvl": 5,
              "stats": {
                "atk": 1,
                "hp": 2
              },
              "text": "+1/+2"
            },
            {
              "lvl": 10,
              "text": "gagne Bouclier",
              "key": "Bouclier"
            }
          ],
          "turnStart": [
            {
              "op": "heal",
              "t": "ownHero",
              "v": 1
            }
          ],
          "atk": 1,
          "hp": 3,
          "statics": []
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
          }
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
              "lvl": 4,
              "amp": 1,
              "text": "Effet +1"
            },
            {
              "lvl": 7,
              "extra": {
                "op": "buff",
                "t": "allAllies",
                "atk": 0,
                "hp": 0,
                "key": "Charge"
              },
              "text": "Donne charge à tout tes alliés"
            },
            {
              "lvl": 15,
              "text": "Inflige 1 blessure à toutes les unités adverses",
              "extra": {
                "op": "dmg",
                "t": "allEnemyUnits",
                "v": 1
              },
              "slot": "play"
            }
          ]
        },
        {
          "id": "dog_lick",
          "name": "Coup de Langue",
          "type": "spell",
          "cost": 2,
          "keys": [],
          "text": "Rend 6 PV à une cible.",
          "play": [
            {
              "op": "heal",
              "t": "allyUnit",
              "v": 6
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
                "op": "mana_au_prochain_tour",
                "x": 2
              },
              "text": "Donne 2 manas au prochain tour seulement."
            },
            {
              "lvl": 16,
              "text": "Donne +6/+6 et provocation à un de tes alliés.",
              "extra": {
                "op": "buff",
                "t": "allyUnit",
                "atk": 6,
                "hp": 6,
                "key": "Taunt"
              },
              "slot": "play"
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
          "text": "Cri de guerre : invoque deux Chiots 1/1.",
          "play": [
            {
              "op": "summon",
              "n": 2,
              "unit": {
                "name": "Chiot",
                "atk": 1,
                "hp": 1,
                "keys": [
                  "type:Chien"
                ]
              }
            }
          ],
          "tiers": [
            {
              "lvl": 6,
              "text": "Donne +1/+0 aux Chiots.",
              "extra": {
                "op": "buff",
                "t": "previous",
                "atk": 1,
                "hp": 0
              },
              "slot": "play"
            },
            {
              "lvl": 12,
              "text": "Donne Charge aux Chiots.",
              "extra": {
                "op": "buff",
                "t": "previous",
                "atk": 0,
                "hp": 0,
                "key": "Charge"
              },
              "slot": "play"
            },
            {
              "lvl": 15,
              "text": "Donne +3/+1 aux Chiots.",
              "extra": {
                "op": "buff",
                "t": "previous",
                "atk": 3,
                "hp": 1
              },
              "slot": "play"
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
          ]
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
          "play": [],
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
              "text": "Arrive : Invoque un Chiot 1/1 avec Charge",
              "extra": {
                "op": "summon",
                "n": 1,
                "unit": {
                  "name": "Jeton",
                  "atk": 1,
                  "hp": 1,
                  "keys": [
                    "type:Chien",
                    "Charge"
                  ],
                  "death": [],
                  "turnStart": [],
                  "turnEnd": []
                }
              },
              "slot": "play"
            }
          ],
          "aura": {
            "scope": "otherAllies",
            "atk": 1,
            "hp": 1,
            "key": ""
          }
        },
        {
          "id": "dog_shield",
          "name": "Charge",
          "type": "spell",
          "cost": 3,
          "keys": [],
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
                  "turnEnd": []
                }
              },
              "text": "Invoque deux Chiots 4/1 Charge."
            },
            {
              "lvl": 15,
              "amp": 2,
              "text": "Effet +2"
            }
          ]
        },
        {
          "id": "dog_bone",
          "name": "Prince Foufi",
          "type": "ally",
          "cost": 4,
          "keys": [
            "type:Chien",
            "characteristique_variable:both:alliesOfType:Chien"
          ],
          "text": "Force et Vie égales au nombre de Chien sur le terrain",
          "play": [],
          "tiers": [
            {
              "lvl": 10,
              "text": "+1/+1 sur les Chiens",
              "aura": {
                "scope": "sameTypeAllies",
                "atk": 1,
                "hp": 1,
                "key": ""
              }
            },
            {
              "lvl": 12,
              "text": "Invoque un Chiot 1/1",
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
                  "death": [],
                  "turnStart": [],
                  "turnEnd": []
                }
              },
              "slot": "play"
            },
            {
              "lvl": 16,
              "text": "Invoque un Chiot 1/1",
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
                  "death": [],
                  "turnStart": [],
                  "turnEnd": []
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
          "hp": 0
        },
        {
          "id": "dog_growl",
          "name": "Surpasser",
          "type": "spell",
          "cost": 3,
          "keys": [],
          "text": "Inflige X blessures, X est le nombre de Chien que vous contrôlez.",
          "play": [
            {
              "op": "dmg",
              "t": "enemyAny",
              "v": {
                "src": "alliesOfType",
                "arg": "Chien",
                "plus": 0
              }
            }
          ],
          "tiers": [
            {
              "lvl": 11,
              "text": "Invoque un Chiot 1/1",
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
                  "death": [],
                  "turnStart": [],
                  "turnEnd": []
                }
              },
              "slot": "play"
            },
            {
              "lvl": 13,
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
                  "death": [],
                  "turnStart": [],
                  "turnEnd": []
                }
              },
              "text": "Invoque un Chiot 1/1"
            },
            {
              "lvl": 15,
              "text": "Pioche une carte pour chaque Chien que vous contrôlez",
              "extra": {
                "op": "draw",
                "v": {
                  "src": "alliesOfType",
                  "arg": "Chien",
                  "plus": 0
                }
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
        "hand": 5
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
            "type:Chat"
          ],
          "text": "Réduit le coût des cartes ",
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
              "op": "pioche_x",
              "carte": "Coup de Griffe",
              "n": 1
            }
          ]
        },
        {
          "id": "cat_pounce",
          "name": "Coup de Griffe",
          "type": "spell",
          "cost": 1,
          "keys": [
            "type:Chat"
          ],
          "text": "Inflige 2 degats a une unité adverse aléatoire.",
          "play": [
            {
              "op": "dmg",
              "t": "randomEnemyUnit",
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
              "lvl": 17,
              "text": "Inflige 3 blessure à une unité adverse aléatoire",
              "extra": {
                "op": "dmg",
                "t": "enemyAny",
                "v": 2
              },
              "slot": "play"
            },
            {
              "lvl": 17,
              "text": "Pioche une carte",
              "extra": {
                "op": "draw",
                "v": 1
              },
              "slot": "play"
            }
          ]
        },
        {
          "id": "cat_nine",
          "name": "Neuf Vies",
          "type": "spell",
          "cost": 9,
          "keys": [
            "cout_x_de_moins_de_plus:X:1:ownTurns:",
            "type:Chat"
          ],
          "text": "Pioche autant de carte \"Coup de Griffe\" que de tour joués",
          "play": [
            {
              "op": "pioche_x",
              "carte": "Coup de Griffe",
              "n": {
                "src": "ownTurns",
                "arg": "",
                "plus": 0
              }
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "extra": {
                "op": "dmg",
                "t": "allEnemyUnits",
                "v": 3
              },
              "text": "Inflige 3 blessures à toutes les unités adverses"
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
                  ],
                  "death": [],
                  "turnStart": [],
                  "turnEnd": [],
                  "statics": []
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
          "cost": 2,
          "atk": 1,
          "hp": 1,
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
              "text": "Cri de guerre : Pioche un sort",
              "extra": {
                "op": "pioche_une_carte_de_type",
                "type": "spell",
                "n": 1
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
                "src": "ownTurns",
                "arg": "",
                "plus": 0
              }
            }
          ],
          "tiers": [
            {
              "lvl": 3,
              "text": "Au prochain tour, gagne 2 manas.",
              "extra": {
                "op": "mana_au_prochain_tour",
                "x": 2
              },
              "slot": "play"
            },
            {
              "lvl": 6,
              "text": "coût -1",
              "cost": -1
            },
            {
              "lvl": 11,
              "text": "coût -1",
              "cost": -1
            },
            {
              "lvl": 14,
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
          "text": "Quand tu lances un sort : Gagnez deux armures",
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
              "v": 2
            }
          ]
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
            "Charge"
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
          ]
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
          "text": "Charge. Passe-Murailles. Quand vous lancez un Chat, invoquez un Chat 1/1.",
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
                ]
              }
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
          ]
        },
        {
          "id": "crow_murder",
          "name": "Envol",
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
          "atk": 4,
          "hp": 4,
          "keys": [],
          "text": "Quand l'adversaire pioche une carte, vous aussi. Cri de guerre : inflige 3 blessures à toutes les unités adverses.",
          "play": [
            {
              "op": "dmg",
              "t": "allEnemyUnits",
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
          ],
          "on_draw_foe": [
            {
              "op": "draw",
              "v": 1
            }
          ]
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
          "keys": [],
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
          ]
        },
        {
          "id": "crow_curse",
          "name": "Malediction",
          "type": "spell",
          "cost": 3,
          "keys": [],
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
              "text": "Quand tu pioches une carte, soigne 2 PV à votre héro.",
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
          ]
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
          "text": "Cri de guerre : invoque un Corbeau avec \"Quand vous piochez une carte, gagne +1/+1\"",
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
          "statics": []
        },
        {
          "id": "crow_night",
          "name": "Nuit Sans Lune",
          "type": "spell",
          "cost": 4,
          "keys": [],
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
              "text": "Soigne 6 PV à votre héro."
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
