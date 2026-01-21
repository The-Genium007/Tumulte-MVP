# Plan d'Implémentation : Flavor Parsing Intelligent

## Objectif

Créer un système universel capable d'extraire des informations structurées (compétence, caractéristique, modificateurs) à partir du flavor text des jets de dés Foundry VTT, compatible avec n'importe quel système de règles de JDR.

## Principes de conception

1. **Langue** : Utiliser `game.i18n.lang` pour détecter la langue du système
2. **Normalisation** : Dictionnaires de mapping par système/langue → clé normalisée
3. **Affichage** : Priorité au skill parsé, fallback sur le flavor brut
4. **Stockage** : Mappings hardcodés dans le module (pas de fichier externe)

---

## Phase 1 : Structure des fichiers

### Nouveaux fichiers à créer

```
modules-vtt/foundry/scripts/
├── utils/
│   ├── localization-mappings.js   # Dictionnaires skills/abilities par système
│   └── flavor-parser.js           # Parser universel de flavor text
```

### Fichiers à modifier

```
modules-vtt/foundry/scripts/
├── utils/
│   └── system-adapters.js         # Intégrer le flavor parser
├── collectors/
│   └── dice-collector.js          # Enrichir les données envoyées

backend/
├── app/services/vtt/
│   └── vtt_websocket_service.ts   # Accepter les nouvelles données
├── database/migrations/
│   └── xxx_add_skill_fields_to_dice_rolls.ts  # Nouveaux champs

frontend/
├── components/overlay/
│   └── DiceRollOverlay.vue        # Afficher skill/ability
├── types/
│   └── index.ts                   # Mettre à jour DiceRollEvent
```

---

## Phase 2 : Dictionnaires de localisation

### Structure du fichier `localization-mappings.js`

```javascript
export const SYSTEM_MAPPINGS = {
  // Système Foundry ID → mappings
  'dnd5e': { ... },
  'pf2e': { ... },
  'CoC7': { ... },
  'k4lt': { ... },
  'wfrp4e': { ... },
  'wrath-and-glory': { ... },
  // ... 100+ systèmes
}
```

### Systèmes prioritaires (Tier S - Top 10)

| Priorité | Système | ID Foundry | Statut |
|----------|---------|------------|--------|
| 1 | D&D 5e | `dnd5e` | À faire |
| 2 | Pathfinder 2e | `pf2e` | À faire |
| 3 | Pathfinder 1e | `pf1` | À faire |
| 4 | Warhammer Fantasy 4e | `wfrp4e` | À faire |
| 5 | LANCER | `lancer` | À faire |
| 6 | Simple Worldbuilding | `worldbuilding` | Skip (générique) |
| 7 | Cyberpunk RED | `cyberpunk-red-core` | À faire |
| 8 | Call of Cthulhu 7e | `CoC7` | À faire |
| 9 | Custom System Builder | `custom-system-builder` | Skip (générique) |
| 10 | Savage Worlds | `swade` | À faire |

### Exemple de mapping D&D 5e

```javascript
'dnd5e': {
  en: {
    skills: {
      'acrobatics': 'acrobatics',
      'animal handling': 'animal_handling',
      'arcana': 'arcana',
      'athletics': 'athletics',
      'deception': 'deception',
      'history': 'history',
      'insight': 'insight',
      'intimidation': 'intimidation',
      'investigation': 'investigation',
      'medicine': 'medicine',
      'nature': 'nature',
      'perception': 'perception',
      'performance': 'performance',
      'persuasion': 'persuasion',
      'religion': 'religion',
      'sleight of hand': 'sleight_of_hand',
      'stealth': 'stealth',
      'survival': 'survival'
    },
    abilities: {
      'strength': 'str',
      'dexterity': 'dex',
      'constitution': 'con',
      'intelligence': 'int',
      'wisdom': 'wis',
      'charisma': 'cha'
    },
    rollTypes: {
      'attack roll': 'attack',
      'damage roll': 'damage',
      'saving throw': 'save',
      'ability check': 'ability',
      'skill check': 'skill',
      'death saving throw': 'death_save',
      'initiative': 'initiative',
      'hit dice': 'hit_dice'
    }
  },
  fr: {
    skills: {
      'acrobaties': 'acrobatics',
      'dressage': 'animal_handling',
      'arcanes': 'arcana',
      'athlétisme': 'athletics',
      'tromperie': 'deception',
      'histoire': 'history',
      'perspicacité': 'insight',
      'intimidation': 'intimidation',
      'investigation': 'investigation',
      'médecine': 'medicine',
      'nature': 'nature',
      'perception': 'perception',
      'représentation': 'performance',
      'persuasion': 'persuasion',
      'religion': 'religion',
      'escamotage': 'sleight_of_hand',
      'discrétion': 'stealth',
      'survie': 'survival'
    },
    abilities: {
      'force': 'str',
      'dextérité': 'dex',
      'constitution': 'con',
      'intelligence': 'int',
      'sagesse': 'wis',
      'charisme': 'cha'
    },
    rollTypes: {
      'jet d\'attaque': 'attack',
      'jet de dégâts': 'damage',
      'jet de sauvegarde': 'save',
      'test de caractéristique': 'ability',
      'test de compétence': 'skill',
      'jet de sauvegarde contre la mort': 'death_save',
      'initiative': 'initiative',
      'dé de vie': 'hit_dice'
    }
  }
}
```

---

## Phase 3 : Flavor Parser

### Algorithme de parsing

```javascript
class FlavorParser {
  constructor(systemId, language) {
    this.systemId = systemId
    this.language = language
    this.mappings = SYSTEM_MAPPINGS[systemId]?.[language]
                 || SYSTEM_MAPPINGS[systemId]?.['en']
                 || SYSTEM_MAPPINGS['generic']
  }

  parse(flavorText) {
    const result = {
      skill: null,           // Compétence normalisée
      skillRaw: null,        // Compétence brute (pour affichage)
      ability: null,         // Caractéristique normalisée
      abilityRaw: null,      // Caractéristique brute
      rollType: null,        // Type de jet normalisé
      modifiers: [],         // Modificateurs détectés
      rawFlavor: flavorText  // Flavor original
    }

    if (!flavorText) return result

    const lowerFlavor = flavorText.toLowerCase()

    // 1. Détecter le type de jet
    result.rollType = this.detectRollType(lowerFlavor)

    // 2. Extraire skill
    const skillMatch = this.extractSkill(lowerFlavor)
    if (skillMatch) {
      result.skill = skillMatch.normalized
      result.skillRaw = skillMatch.raw
    }

    // 3. Extraire ability
    const abilityMatch = this.extractAbility(lowerFlavor)
    if (abilityMatch) {
      result.ability = abilityMatch.normalized
      result.abilityRaw = abilityMatch.raw
    }

    // 4. Extraire modifiers
    result.modifiers = this.extractModifiers(flavorText)

    return result
  }
}
```

### Patterns de détection universels

```javascript
// Patterns communs à plusieurs systèmes
const UNIVERSAL_PATTERNS = {
  // "Skill Check: Perception" ou "Perception Check"
  skillCheck: /(?:skill\s*check|test\s*de\s*compétence|check)[\s:]*(\w+)/i,

  // "Saving Throw: Dexterity" ou "Dexterity Save"
  savingThrow: /(?:saving\s*throw|jet\s*de\s*sauvegarde|save)[\s:]*(\w+)/i,

  // "Attack Roll" ou "Jet d'attaque"
  attackRoll: /(?:attack\s*roll|jet\s*d'attaque|attaque)/i,

  // Modificateurs "+2 bonus" ou "-1 penalty"
  modifier: /([+-]\d+)\s*(?:bonus|penalty|malus)?/gi,

  // Parenthèses contenant des infos "(Dexterity)"
  parenthetical: /\(([^)]+)\)/g
}
```

---

## Phase 4 : Intégration dans system-adapters.js

### Modifications

```javascript
import { FlavorParser } from './flavor-parser.js'

class GenericAdapter {
  constructor() {
    this.flavorParser = null
  }

  initialize() {
    const lang = game.i18n?.lang || 'en'
    this.flavorParser = new FlavorParser(game.system.id, lang)
  }

  extractRollData(message, roll) {
    // ... code existant ...

    // NOUVEAU : Parser le flavor
    const parsedFlavor = this.flavorParser.parse(message.flavor)

    return {
      // ... données existantes ...

      // Nouvelles données enrichies
      skill: parsedFlavor.skill,
      skillRaw: parsedFlavor.skillRaw,
      ability: parsedFlavor.ability,
      abilityRaw: parsedFlavor.abilityRaw,
      modifiers: parsedFlavor.modifiers,
      parsedRollType: parsedFlavor.rollType,

      metadata: {
        // ... existant ...
        flavor: message.flavor,
        parsedFlavor: parsedFlavor
      }
    }
  }
}
```

---

## Phase 5 : Modifications Backend

### Migration de base de données

```typescript
// database/migrations/xxx_add_skill_fields_to_dice_rolls.ts
import BaseSchema from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dice_rolls'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('skill').nullable()
      table.string('skill_raw').nullable()
      table.string('ability').nullable()
      table.string('ability_raw').nullable()
      table.jsonb('modifiers').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('skill')
      table.dropColumn('skill_raw')
      table.dropColumn('ability')
      table.dropColumn('ability_raw')
      table.dropColumn('modifiers')
    })
  }
}
```

### Interface mise à jour

```typescript
// backend/app/services/vtt/dice_roll_service.ts
interface CreateDiceRollData {
  // ... existant ...

  // Nouveaux champs
  skill: string | null
  skillRaw: string | null
  ability: string | null
  abilityRaw: string | null
  modifiers: string[] | null
}
```

---

## Phase 6 : Modifications Frontend

### Type DiceRollEvent enrichi

```typescript
// frontend/types/index.ts
export interface DiceRollEvent {
  // ... existant ...

  // Nouveaux champs
  skill?: string | null
  skillRaw?: string | null
  ability?: string | null
  abilityRaw?: string | null
  modifiers?: string[] | null
}
```

### Affichage dans l'overlay

```vue
<!-- DiceRollOverlay.vue -->
<div v-if="displaySkillInfo" class="skill-info">
  <span class="skill-name">{{ skillDisplay }}</span>
  <span v-if="diceRoll?.ability" class="ability-tag">
    ({{ abilityDisplay }})
  </span>
</div>

<script setup>
const skillDisplay = computed(() => {
  // Priorité : skill parsé > flavor brut
  if (props.diceRoll?.skillRaw) {
    return props.diceRoll.skillRaw
  }
  return null
})

const displaySkillInfo = computed(() => {
  return props.diceRoll?.skill || props.diceRoll?.rollType
})
</script>
```

---

## Phase 7 : Liste des 100+ systèmes

### Tier S (Top 10) - Phase 1

| ID | Système | Type de dés | Complexité |
|----|---------|-------------|------------|
| `dnd5e` | D&D 5e | d20 | Moyenne |
| `pf2e` | Pathfinder 2e | d20 | Haute |
| `pf1` | Pathfinder 1e | d20 | Haute |
| `wfrp4e` | WFRP 4e | d100 | Moyenne |
| `lancer` | LANCER | d20/d6 | Moyenne |
| `cyberpunk-red-core` | Cyberpunk RED | d10 | Moyenne |
| `CoC7` | Call of Cthulhu 7e | d100 | Moyenne |
| `swade` | Savage Worlds | Step dice | Haute |

### Tier A (11-25) - Phase 2

| ID | Système | Type de dés |
|----|---------|-------------|
| `sfrpg` | Starfinder | d20 |
| `starwarsffg` | Star Wars FFG | Narrative |
| `wod5e` | World of Darkness 5e | d10 pool |
| `gurps` | GURPS 4e | 3d6 |
| `dsa5` | Das Schwarze Auge | d20 |
| `alienrpg` | Alien RPG | d6 pool |
| `tormenta20` | Tormenta20 | d20 |
| `shadowdark` | Shadowdark | d20 |
| `wrath-and-glory` | Wrath & Glory | d6 pool |
| `dragonbane` | Dragonbane | d20 |
| `a5e` | Level Up A5E | d20 |
| `wod20` | WoD 20th | d10 pool |
| `forbidden-lands` | Forbidden Lands | d6 pool |
| `deltagreen` | Delta Green | d100 |
| `D35E` | D&D 3.5e | d20 |

### Tier B (26-50) - Phase 3

| ID | Système |
|----|---------|
| `blades-in-the-dark` | Blades in the Dark |
| `ose` | Old-School Essentials |
| `morkborg` | MÖRK BORG |
| `archmage` | 13th Age |
| `vaesen` | Vaesen |
| `demonlord` | Shadow of Demon Lord |
| `dcc` | Dungeon Crawl Classics |
| `symbaroum` | Symbaroum |
| `t2k4e` | Twilight: 2000 |
| `blade-runner` | Blade Runner |
| `mutant-year-zero` | Mutant Year Zero |
| `twodsix` | Traveller |
| `genesys` | Genesys |
| `age-of-sigmar-soulbound` | AoS Soulbound |
| `dungeonworld` | Dungeon World |
| `zweihander` | Zweihänder |
| `yzecoriolis` | Coriolis |
| `fate-core-official` | FATE Core |
| `kids-on-bikes` | Kids on Bikes |
| `cairn` | Cairn |
| `pirateborg` | Pirate Borg |
| `icrpg` | ICRPG |
| `rmu` | Rolemaster |
| `mythras` | Mythras |
| `pendragon` | Pendragon |

### Tier C (51-75) - Phase 4

| ID | Système |
|----|---------|
| `mosh` | Mothership |
| `knave` | Knave |
| `foundry-ironsworn` | Ironsworn |
| `the-one-ring` | The One Ring |
| `runequest` | RuneQuest |
| `l5r5e` | L5R 5e |
| `numenera` | Numenera |
| `cyphersystem` | Cypher System |
| `city-of-mist` | City of Mist |
| `k4lt` | KULT: Divinity Lost |
| `heart` | Heart |
| `spire` | Spire |
| `scum-and-villainy` | Scum and Villainy |
| `band-of-blades` | Band of Blades |
| `masks` | Masks |
| `motw` | Monster of the Week |
| `apocalypse-world` | Apocalypse World |
| `burningwheel` | Burning Wheel |
| `swnr` | Stars Without Number |
| `wwn` | Worlds Without Number |
| `electric-bastionland` | Electric Bastionland |
| `into-the-odd` | Into the Odd |
| `troika` | Troika! |
| `mausritter` | Mausritter |
| `daggerheart` | Daggerheart |

### Tier D (76-100+) - Phase 5

| ID | Système |
|----|---------|
| `shadowrun5e` | Shadowrun 5e |
| `shadowrun6e` | Shadowrun 6e |
| `cofd` | Chronicles of Darkness |
| `dark-heresy` | Dark Heresy |
| `rogue-trader` | Rogue Trader |
| `deathwatch` | Deathwatch |
| `foundryvtt-reve-de-dragon` | Rêve de Dragon |
| `co2` | Chroniques Oubliées |
| `animabf` | Anima Beyond Fantasy |
| `torgeternity` | Torg Eternity |
| `earthdawn4e` | Earthdawn 4e |
| `wfrp3e` | WFRP 3e |
| `hero6efoundryvttv2` | Hero System 6e |
| `arm5e` | Ars Magica |
| `foundry-fe2` | Fragged Empire 2e |
| `splittermond` | Splittermond |
| `hexxen-1733` | HeXXen 1733 |
| `fvtt-yggdrasill` | Yggdrasill |
| `sta` | Star Trek Adventures |
| `conan2d20` | Conan 2d20 |
| `fallout` | Fallout 2d20 |
| `dune` | Dune 2d20 |
| `dishonored` | Dishonored 2d20 |
| `black-flag` | Black Flag |
| `dc20rpg` | DC20 |

---

## Chronologie d'implémentation

### Sprint 1 : Infrastructure (Priorité haute)

1. ✅ Créer `localization-mappings.js` avec D&D 5e (EN + FR)
2. ✅ Créer `flavor-parser.js` avec l'algorithme de base
3. ✅ Intégrer dans `system-adapters.js`
4. ✅ Mettre à jour `dice-collector.js`
5. ✅ Tester le flux complet avec D&D 5e

### Sprint 2 : Backend + Frontend

1. Migration BDD pour nouveaux champs
2. Mettre à jour `vtt_websocket_service.ts`
3. Mettre à jour `DiceRollOverlay.vue`
4. Tester l'affichage enrichi

### Sprint 3 : Tier S complet

1. Ajouter PF2e (EN + FR)
2. Ajouter WFRP4e (EN + FR)
3. Ajouter CoC7 (EN + FR)
4. Ajouter les autres Tier S

### Sprint 4-6 : Tier A, B, C, D

1. Ajouter progressivement les systèmes par tier
2. Le fallback générique assure la compatibilité de base

---

## Tests et validation

### Checklist par système

- [ ] Flavor parsing correct en anglais
- [ ] Flavor parsing correct en français (si supporté)
- [ ] Skills correctement normalisés
- [ ] Abilities correctement détectées
- [ ] Roll types correctement identifiés
- [ ] Affichage correct dans l'overlay

### Commandes de test

```javascript
// Dans la console Foundry VTT
const parser = new FlavorParser('dnd5e', 'en')
console.log(parser.parse('Skill Check: Perception'))
// Expected: { skill: 'perception', skillRaw: 'Perception', ... }

console.log(parser.parse('Dexterity Saving Throw'))
// Expected: { ability: 'dex', rollType: 'save', ... }
```

---

## Métriques de succès

1. **Couverture** : 80% des jets de dés ont au moins un champ enrichi
2. **Précision** : 95%+ de détection correcte pour les systèmes Tier S
3. **Performance** : Parsing < 1ms par jet
4. **Maintenance** : Ajout d'un nouveau système en < 30 min

---

## Notes techniques

### Gestion des cas limites

1. **Flavor vide** : Retourner le fallback générique
2. **Langue non supportée** : Fallback sur anglais
3. **Système inconnu** : Utiliser le parser générique
4. **Flavor ambigu** : Prioriser le premier match trouvé

### Extensibilité future

- API pour ajouter des systèmes custom via settings
- Support de langues additionnelles (DE, ES, PT, IT, etc.)
- Intégration avec les modules de traduction Foundry
