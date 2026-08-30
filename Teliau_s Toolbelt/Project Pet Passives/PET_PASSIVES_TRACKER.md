# Pet Passives — Suivi du projet

> Fichier de suivi central (rôle "secrétaire"). On y note tout : pets, passifs, biomes à
> compléter, et la logique de builds. Source de données : `V3.2 SA - Minions.csv`.
> Outil associé : `site/pet-builds.html` (éditeur de builds visuel, import/export JSON).
>
> Dernière mise à jour : 2026-06-24

---

## 1. Objectifs du projet

1. **Donner un passif à chaque pet** (la plupart n'en ont pas encore — voir colonne *Passif*).
2. **Compléter les biomes** auxquels il manque des pets (`fire` et `space` sont vides ;
   `cave` et `snow` sont maigres).
3. **Définir une logique de builds** :
   - un build par **Biome** (Meadow, Forest, Jungle, Sea, Cave, Snow, Savanna, Fire, Space) ;
   - un build par **famille d'animaux** (Oiseaux, Équidés, Encornés, Félins, Aquatiques…).

---

## 2. Inventaire des pets (34)

Rareté : 🟩 common · 🟦 rare · 🟪 epic · 🟧 legendary

| Pet | Rareté | Biome | Famille | Type (CSV) | Passif (passive_id) | Statut passif |
|-----|--------|-------|---------|------------|---------------------|---------------|
| Bear | 🟧 legendary | forest | Ursidés | Mammal_Large | — | ❌ à définir |
| Cat | 🟩 common | meadow | Félins | Mammal_Small | — | ❌ à définir |
| Goat | 🟪 epic | meadow | Encornés | Mammal_Medium | rock_breaker | ✅ |
| Cow | 🟧 legendary | meadow | Encornés | Mammal_Large | squash_lover | ✅ |
| Deer | 🟦 rare | forest | Encornés | Mammal_Medium | blueberry_lover | ✅ |
| Dog | 🟩 common | meadow | Canidés | Mammal_Medium | hole_digger | ✅ |
| Frog | 🟪 epic | jungle | Reptiles & Amphibiens | Amphibian | — | ❌ à définir |
| Jaguar | 🟧 legendary | jungle | Félins | Mammal_Large | — | ❌ à définir |
| Rabbit | 🟦 rare | meadow | Rongeurs & petits mammifères | Mammal_Small | carrot_lover | ✅ |
| Beaver | 🟪 epic | forest | Rongeurs & petits mammifères | Mammal_Medium | log_chewer | ✅ |
| Badger | 🟩 common | forest | Rongeurs & petits mammifères | Mammal_Medium | — | ❌ à définir |
| Caiman | 🟦 rare | jungle | Reptiles & Amphibiens | Reptile | — | ❌ à définir |
| Capybara | 🟧 legendary | jungle | Rongeurs & petits mammifères | Mammal_Medium | — | ❌ à définir |
| Crab | 🟩 common | sea | Aquatiques | Invertebrate | — | ❌ à définir |
| Dolphin | 🟧 legendary | sea | Aquatiques | Aquatic_Mammal | damage_aoe | ✅ |
| Duck | 🟩 common | meadow | Oiseaux | Bird_Large | plum_lover | ✅ |
| Iguana | 🟦 rare | sea | Reptiles & Amphibiens | Reptile | watermelon_lover | ✅ |
| Moose | 🟦 rare | forest | Encornés | Mammal_Large | apple_lover | ✅ |
| Otter | 🟪 epic | meadow | Aquatiques | Mammal_Medium | — | ❌ à définir |
| Owl | 🟪 epic | forest | Oiseaux | Bird_Large | blueberry_lover | ✅ |
| Raccoon | 🟦 rare | forest | Rongeurs & petits mammifères | Mammal_Medium | — | ❌ à définir |
| Seagull | 🟩 common | sea | Oiseaux | Bird_Large | gojiberry_lover | ✅ |
| Shark | 🟪 epic | sea | Aquatiques | Aquatic_Predator | instant_kill | ✅ |
| Toucan | 🟦 rare | jungle | Oiseaux | Bird_Large | watermelon_lover | ✅ |
| Bat | 🟦 rare | cave | Rongeurs & petits mammifères | Mammal_Small | crystalberry_lover | ✅ |
| Axolotl | 🟧 legendary | cave | Reptiles & Amphibiens | Amphibian | — | ❌ à définir |
| Squirrel | 🟩 common | snow | Rongeurs & petits mammifères | Mammal_Small | chestnut_lover | ✅ |
| Red Fox | 🟪 epic | snow | Canidés | Mammal_Medium | — | ❌ à définir |
| Flamingo | 🟧 legendary | savanna | Oiseaux | Bird_Large | — | ❌ à définir |
| Monkey | 🟦 rare | jungle | Rongeurs & petits mammifères | Mammal_Medium | banana_lover | ✅ |
| Horse | 🟪 epic | meadow | Équidés | Mammal_Large | apple_lover | ✅ |
| Zebra | 🟦 rare | savanna | Équidés | Mammal_Large | mango_lover | ✅ |
| Giraffe | 🟪 epic | savanna | Encornés | Mammal_Large | gojiberry_lover | ✅ |
| Lion | 🟧 legendary | savanna | Félins | Mammal_Large | damage_buff | ✅ |

**Passifs à définir : 12 pets** → Bear, Cat, Frog, Jaguar, Badger, Caiman, Capybara, Crab, Otter, Axolotl, Red Fox, Flamingo.

---

## 3. Complétude par biome

| Biome | Pets actuels | Statut |
|-------|--------------|--------|
| Meadow | 8 (cat, goat, cow, dog, rabbit, duck, otter, horse) | ✅ complet |
| Forest | 7 (bear, deer, beaver, badger, moose, owl, raccoon) | ✅ |
| Jungle | 6 (frog, jaguar, caiman, capybara, toucan, monkey) | 🟡 |
| Sea | 5 (crab, dolphin, iguana, seagull, shark) | 🟡 |
| Savanna | 4 (flamingo, zebra, giraffe, lion) | 🟠 à étoffer |
| Cave | 2 (bat, axolotl) | 🔴 à compléter |
| Snow | 2 (squirrel, red fox) | 🔴 à compléter |
| **Fire** | **0** | 🔴 **roster entier à créer** |
| **Space** | **0** | 🔴 **roster entier à créer** |

### Icônes de pets disponibles sans pet attribué (candidats pour les biomes vides)
`Rhino`, `SeaHorse`, `WhiteFox`, `WildYak`, `Tiger`, `OctopusPurple`, `FrogYellow`
(plus variantes `BearAI`, `BadgerAI`). → réserve pour Fire / Space / Cave / Snow.

---

## 4. Familles d'animaux (groupement thématique proposé)

> Groupements éditables — utilisés pour les builds "par famille".

- **Oiseaux** : Duck, Owl, Seagull, Toucan, Flamingo
- **Équidés** : Horse, Zebra
- **Encornés** : Cow, Goat, Deer, Moose, Giraffe
- **Félins** : Cat, Jaguar, Lion
- **Canidés** : Dog, Red Fox
- **Ursidés** : Bear
- **Reptiles & Amphibiens** : Frog, Caiman, Iguana, Axolotl
- **Aquatiques** : Crab, Dolphin, Shark, Otter
- **Rongeurs & petits mammifères** : Rabbit, Squirrel, Bat, Beaver, Raccoon, Capybara, Monkey, Badger

---

## 5. Passifs connus (passive_id référencés dans le CSV)

| passive_id | Type | Pets concernés |
|------------|------|----------------|
| apple_lover | Candy/fruit | Moose, Horse |
| banana_lover | Candy/fruit | Monkey |
| blueberry_lover | Candy/fruit | Deer, Owl |
| carrot_lover | Candy/fruit | Rabbit |
| chestnut_lover | Candy/fruit | Squirrel |
| crystalberry_lover | Candy/fruit | Bat |
| gojiberry_lover | Candy/fruit | Seagull, Giraffe |
| mango_lover | Candy/fruit | Zebra |
| plum_lover | Candy/fruit | Duck |
| squash_lover | Candy/fruit | Cow |
| watermelon_lover | Candy/fruit | Iguana, Toucan |
| rock_breaker | Utilitaire | Goat |
| hole_digger | Utilitaire | Dog |
| log_chewer | Utilitaire | Beaver |
| damage_aoe | Combat | Dolphin |
| damage_buff | Combat | Lion |
| instant_kill | Combat | Shark |

Icônes de passifs disponibles aussi : `ButternutLover`, `CoconutLover` (fruits sans pet attribué).

---

## 6. Builds (rempli via l'outil `pet-builds.html`)

Les builds (6 pets max, nom, catégorie Biome/Famille/Custom, description, notes de passifs)
sont créés et stockés dans l'outil, puis exportés en JSON. On garde ici la liste de référence
des builds validés au fur et à mesure.

| Build | Catégorie | Pets | Statut |
|-------|-----------|------|--------|
| _(à remplir)_ | | | |

---

## 7. Journal

- **2026-06-24** — Mise en place : inventaire des 34 pets, mapping des icônes, copie des assets
  dans `site/assets/`, création de l'outil `site/pet-builds.html` (éditeur de builds + export JSON)
  et de ce fichier de suivi.
