/**
 * System Preset Registry
 *
 * Tier 1 presets for the 15 TTRPG systems that have both a dedicated Foundry
 * VTT adapter (modules-vtt/foundry/scripts/utils/system-adapters.js) and a
 * backend preset defined here.
 *
 * ## Tier Architecture (see docs/architecture/system-presets.md)
 *
 * - **Tier 1** (this file): 15 systems, ~85% of users. Dedicated adapter + preset + enriched criticality.
 * - **Tier 2** (~25 systems, ~10%): GenericAdapter only. d20 systems get nat 1/20 detection; others need manual rules.
 * - **Tier 3** (~320+ systems, ~5%): GenericAdapter with d20-only detection. No preset, no guarantees.
 *
 * Each preset declares:
 * - Criticality rules to auto-insert in campaign_criticality_rules
 * - System capabilities (spells, dice pool, percentile, etc.)
 * - Recommended gamification events for the system
 *
 * To add a new Tier 1 system:
 * 1. Create a dedicated adapter class in system-adapters.js
 * 2. Add an entry to SYSTEM_PRESETS below
 * 3. No migration needed — presets are lazily applied at first system detection
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CriticalityRulePreset {
  /** Unique key per preset, e.g. 'dnd5e:nat20'. Used for idempotent upsert. */
  presetKey: string
  /** Dice formula to match, e.g. 'd20', 'd100', null (any) */
  diceFormula: string | null
  /** Condition expression, e.g. '== 20', '== 1', '>= 96' */
  resultCondition: string
  /** Which value to evaluate */
  resultField: 'max_die' | 'min_die' | 'total' | 'any_die'
  /** success or failure */
  criticalType: 'success' | 'failure'
  /** Severity level */
  severity: 'minor' | 'major' | 'extreme'
  /** Human-readable label */
  label: string
  /** Optional explanation */
  description: string | null
  /** Lower = evaluated later. System presets default to 5 so custom rules (0) can override. */
  priority: number
}

export interface SystemCapabilities {
  /** System has traditional spell/magic system */
  hasSpells: boolean
  /** d20-based natural 1/20 criticals */
  hasTraditionalCriticals: boolean
  /** Dice pool mechanics (Shadowrun, BitD, YZE, VtM) */
  hasDicePool: boolean
  /** Percentile-based system (CoC, WFRP) */
  hasPercentile: boolean
  /** Fudge/FATE dice */
  hasFudgeDice: boolean
  /** Narrative/symbol dice (Star Wars FFG, Genesys) */
  hasNarrativeDice: boolean
  /** Primary die type, e.g. 'd20', 'd100', 'd10', 'd6', '4dF' */
  primaryDie: string | null
}

export interface SystemPreset {
  /** Foundry VTT system ID (game.system.id) */
  systemId: string
  /** Human-readable name */
  displayName: string
  /** Criticality rule presets for this system */
  criticalityRules: CriticalityRulePreset[]
  /** What the system supports */
  capabilities: SystemCapabilities
  /** Gamification event slugs recommended for this system */
  recommendedEvents: string[]
  /** Gamification event slugs available but not ideal for this system */
  availableWithWarning: string[]
}

// ---------------------------------------------------------------------------
// Preset definitions
// ---------------------------------------------------------------------------

const SYSTEM_PRESETS: Map<string, SystemPreset> = new Map()

function register(preset: SystemPreset): void {
  SYSTEM_PRESETS.set(preset.systemId, preset)
}

// ── D&D 5th Edition ─────────────────────────────────────────────────────────
register({
  systemId: 'dnd5e',
  displayName: 'D&D 5th Edition',
  criticalityRules: [
    {
      presetKey: 'dnd5e:nat20',
      diceFormula: 'd20',
      resultCondition: '== 20',
      resultField: 'max_die',
      criticalType: 'success',
      severity: 'major',
      label: 'Natural 20',
      description: 'Réussite automatique, lancez les dés de dégâts deux fois',
      priority: 5,
    },
    {
      presetKey: 'dnd5e:nat1',
      diceFormula: 'd20',
      resultCondition: '== 1',
      resultField: 'min_die',
      criticalType: 'failure',
      severity: 'major',
      label: 'Natural 1',
      description: 'Échec automatique',
      priority: 5,
    },
  ],
  capabilities: {
    hasSpells: true,
    hasTraditionalCriticals: true,
    hasDicePool: false,
    hasPercentile: false,
    hasFudgeDice: false,
    hasNarrativeDice: false,
    primaryDie: 'd20',
  },
  recommendedEvents: ['dice-invert', 'spell-disable', 'spell-buff', 'spell-debuff'],
  availableWithWarning: [],
})

// ── Pathfinder 2e ───────────────────────────────────────────────────────────
register({
  systemId: 'pf2e',
  displayName: 'Pathfinder 2e',
  criticalityRules: [
    {
      presetKey: 'pf2e:nat20',
      diceFormula: 'd20',
      resultCondition: '== 20',
      resultField: 'max_die',
      criticalType: 'success',
      severity: 'major',
      label: 'Natural 20',
      description: "Améliore le degré de succès d'un cran",
      priority: 5,
    },
    {
      presetKey: 'pf2e:nat1',
      diceFormula: 'd20',
      resultCondition: '== 1',
      resultField: 'min_die',
      criticalType: 'failure',
      severity: 'major',
      label: 'Natural 1',
      description: "Dégrade le degré de succès d'un cran",
      priority: 5,
    },
  ],
  capabilities: {
    hasSpells: true,
    hasTraditionalCriticals: true,
    hasDicePool: false,
    hasPercentile: false,
    hasFudgeDice: false,
    hasNarrativeDice: false,
    primaryDie: 'd20',
  },
  recommendedEvents: ['dice-invert', 'spell-disable', 'spell-buff', 'spell-debuff'],
  availableWithWarning: [],
})

// ── Call of Cthulhu 7e ──────────────────────────────────────────────────────
register({
  systemId: 'CoC7',
  displayName: "L'Appel de Cthulhu 7e",
  criticalityRules: [
    {
      presetKey: 'coc7:critical',
      diceFormula: 'd100',
      resultCondition: '== 1',
      resultField: 'total',
      criticalType: 'success',
      severity: 'extreme',
      label: 'Critique',
      description: 'Résultat 01 — le meilleur résultat possible',
      priority: 5,
    },
    {
      presetKey: 'coc7:fumble',
      diceFormula: 'd100',
      resultCondition: '== 100',
      resultField: 'total',
      criticalType: 'failure',
      severity: 'extreme',
      label: 'Maladresse',
      description: 'Résultat 100 — échec catastrophique',
      priority: 5,
    },
  ],
  capabilities: {
    hasSpells: true,
    hasTraditionalCriticals: false,
    hasDicePool: false,
    hasPercentile: true,
    hasFudgeDice: false,
    hasNarrativeDice: false,
    primaryDie: 'd100',
  },
  recommendedEvents: ['dice-invert', 'spell-disable'],
  availableWithWarning: ['spell-buff', 'spell-debuff'],
})

// ── Warhammer Fantasy 4e ────────────────────────────────────────────────────
register({
  systemId: 'wfrp4e',
  displayName: 'Warhammer Fantasy 4e',
  criticalityRules: [
    {
      presetKey: 'wfrp4e:doubles_low',
      diceFormula: 'd100',
      resultCondition: '<= 11',
      resultField: 'total',
      criticalType: 'success',
      severity: 'major',
      label: 'Doubles (succès)',
      description: 'Double sur un résultat réussi — coup critique',
      priority: 5,
    },
    {
      presetKey: 'wfrp4e:fumble',
      diceFormula: 'd100',
      resultCondition: '>= 96',
      resultField: 'total',
      criticalType: 'failure',
      severity: 'major',
      label: 'Maladresse',
      description: 'Résultat 96+ — échec critique automatique',
      priority: 5,
    },
  ],
  capabilities: {
    hasSpells: false,
    hasTraditionalCriticals: false,
    hasDicePool: false,
    hasPercentile: true,
    hasFudgeDice: false,
    hasNarrativeDice: false,
    primaryDie: 'd100',
  },
  recommendedEvents: ['dice-invert'],
  availableWithWarning: ['spell-disable', 'spell-buff', 'spell-debuff'],
})

// ── Savage Worlds Adventure Edition ─────────────────────────────────────────
register({
  systemId: 'swade',
  displayName: 'Savage Worlds',
  criticalityRules: [
    {
      presetKey: 'swade:ace',
      diceFormula: null,
      resultCondition: '>= 8',
      resultField: 'total',
      criticalType: 'success',
      severity: 'minor',
      label: 'Relance (Ace)',
      description: 'Dé explosif — relancez et ajoutez',
      priority: 5,
    },
    {
      presetKey: 'swade:fumble',
      diceFormula: null,
      resultCondition: '== 1',
      resultField: 'min_die',
      criticalType: 'failure',
      severity: 'major',
      label: 'Échec critique',
      description: 'Snake Eyes — 1 sur le dé de trait ET le dé sauvage',
      priority: 5,
    },
  ],
  capabilities: {
    hasSpells: true,
    hasTraditionalCriticals: false,
    hasDicePool: false,
    hasPercentile: false,
    hasFudgeDice: false,
    hasNarrativeDice: false,
    primaryDie: null,
  },
  recommendedEvents: ['dice-invert', 'spell-disable', 'spell-buff'],
  availableWithWarning: ['spell-debuff'],
})

// ── Cyberpunk RED ───────────────────────────────────────────────────────────
register({
  systemId: 'cyberpunk-red-core',
  displayName: 'Cyberpunk RED',
  criticalityRules: [
    {
      presetKey: 'cpred:crit',
      diceFormula: 'd10',
      resultCondition: '== 10',
      resultField: 'max_die',
      criticalType: 'success',
      severity: 'major',
      label: 'Succès critique',
      description: '10 naturel — relancez et ajoutez',
      priority: 5,
    },
    {
      presetKey: 'cpred:fumble',
      diceFormula: 'd10',
      resultCondition: '== 1',
      resultField: 'min_die',
      criticalType: 'failure',
      severity: 'major',
      label: 'Échec critique',
      description: '1 naturel — relancez et soustrayez',
      priority: 5,
    },
  ],
  capabilities: {
    hasSpells: false,
    hasTraditionalCriticals: false,
    hasDicePool: false,
    hasPercentile: false,
    hasFudgeDice: false,
    hasNarrativeDice: false,
    primaryDie: 'd10',
  },
  recommendedEvents: ['dice-invert'],
  availableWithWarning: ['spell-disable', 'spell-buff', 'spell-debuff'],
})

// ── Alien RPG ───────────────────────────────────────────────────────────────
register({
  systemId: 'alienrpg',
  displayName: 'Alien RPG',
  criticalityRules: [
    {
      presetKey: 'alien:success',
      diceFormula: 'd6',
      resultCondition: '== 6',
      resultField: 'max_die',
      criticalType: 'success',
      severity: 'minor',
      label: 'Succès',
      description: 'Un 6 dans la pool de dés',
      priority: 5,
    },
    {
      presetKey: 'alien:facehugger',
      diceFormula: 'd6',
      resultCondition: '== 1',
      resultField: 'min_die',
      criticalType: 'failure',
      severity: 'major',
      label: 'Facehugger',
      description: '1 sur un dé de stress — test de panique requis',
      priority: 5,
    },
  ],
  capabilities: {
    hasSpells: false,
    hasTraditionalCriticals: false,
    hasDicePool: true,
    hasPercentile: false,
    hasFudgeDice: false,
    hasNarrativeDice: false,
    primaryDie: 'd6',
  },
  recommendedEvents: ['dice-invert'],
  availableWithWarning: ['spell-disable', 'spell-buff', 'spell-debuff'],
})

// ── Forbidden Lands ─────────────────────────────────────────────────────────
register({
  systemId: 'forbidden-lands',
  displayName: 'Forbidden Lands',
  criticalityRules: [
    {
      presetKey: 'fl:triumph',
      diceFormula: 'd6',
      resultCondition: '== 6',
      resultField: 'max_die',
      criticalType: 'success',
      severity: 'minor',
      label: 'Triomphe',
      description: 'Un 6 sur les dés Year Zero — succès',
      priority: 5,
    },
    {
      presetKey: 'fl:bane',
      diceFormula: 'd6',
      resultCondition: '== 1',
      resultField: 'min_die',
      criticalType: 'failure',
      severity: 'minor',
      label: 'Fléau',
      description: 'Un 1 sur les dés de base — dégâts attribut/équipement',
      priority: 5,
    },
  ],
  capabilities: {
    hasSpells: true,
    hasTraditionalCriticals: false,
    hasDicePool: true,
    hasPercentile: false,
    hasFudgeDice: false,
    hasNarrativeDice: false,
    primaryDie: 'd6',
  },
  recommendedEvents: ['dice-invert', 'spell-disable'],
  availableWithWarning: ['spell-buff', 'spell-debuff'],
})

// ── Vaesen ──────────────────────────────────────────────────────────────────
register({
  systemId: 'vaesen',
  displayName: 'Vaesen',
  criticalityRules: [
    {
      presetKey: 'vaesen:triumph',
      diceFormula: 'd6',
      resultCondition: '== 6',
      resultField: 'max_die',
      criticalType: 'success',
      severity: 'minor',
      label: 'Triomphe',
      description: 'Un 6 sur les dés Year Zero — succès',
      priority: 5,
    },
    {
      presetKey: 'vaesen:bane',
      diceFormula: 'd6',
      resultCondition: '== 1',
      resultField: 'min_die',
      criticalType: 'failure',
      severity: 'minor',
      label: 'Fléau',
      description: 'Un 1 sur les dés — condition appliquée',
      priority: 5,
    },
  ],
  capabilities: {
    hasSpells: false,
    hasTraditionalCriticals: false,
    hasDicePool: true,
    hasPercentile: false,
    hasFudgeDice: false,
    hasNarrativeDice: false,
    primaryDie: 'd6',
  },
  recommendedEvents: ['dice-invert'],
  availableWithWarning: ['spell-disable', 'spell-buff', 'spell-debuff'],
})

// ── Blades in the Dark ──────────────────────────────────────────────────────
register({
  systemId: 'blades-in-the-dark',
  displayName: 'Blades in the Dark',
  criticalityRules: [
    {
      presetKey: 'bitd:critical',
      diceFormula: 'd6',
      resultCondition: '== 6',
      resultField: 'min_die',
      criticalType: 'success',
      severity: 'major',
      label: 'Critique',
      description: 'Deux 6 ou plus — effet amélioré',
      priority: 5,
    },
    {
      presetKey: 'bitd:desperate',
      diceFormula: 'd6',
      resultCondition: '<= 3',
      resultField: 'max_die',
      criticalType: 'failure',
      severity: 'major',
      label: 'Échec désespéré',
      description: 'Plus haut dé ≤ 3 — conséquences graves',
      priority: 5,
    },
  ],
  capabilities: {
    hasSpells: false,
    hasTraditionalCriticals: false,
    hasDicePool: true,
    hasPercentile: false,
    hasFudgeDice: false,
    hasNarrativeDice: false,
    primaryDie: 'd6',
  },
  recommendedEvents: ['dice-invert'],
  availableWithWarning: ['spell-disable', 'spell-buff', 'spell-debuff'],
})

// ── Vampire: The Masquerade 5e / WoD5e ──────────────────────────────────────
register({
  systemId: 'vtm5e',
  displayName: 'Vampire: La Mascarade V5',
  criticalityRules: [
    {
      presetKey: 'vtm5e:messy_critical',
      diceFormula: 'd10',
      resultCondition: '== 10',
      resultField: 'min_die',
      criticalType: 'success',
      severity: 'extreme',
      label: 'Critique sanglant',
      description: 'Deux 10+ avec un dé de Faim — la Bête prend le contrôle',
      priority: 5,
    },
    {
      presetKey: 'vtm5e:bestial_failure',
      diceFormula: 'd10',
      resultCondition: '== 1',
      resultField: 'min_die',
      criticalType: 'failure',
      severity: 'extreme',
      label: 'Échec bestial',
      description: '0 succès avec un 1 sur un dé de Faim — compulsion déclenchée',
      priority: 5,
    },
  ],
  capabilities: {
    hasSpells: false,
    hasTraditionalCriticals: false,
    hasDicePool: true,
    hasPercentile: false,
    hasFudgeDice: false,
    hasNarrativeDice: false,
    primaryDie: 'd10',
  },
  recommendedEvents: ['dice-invert'],
  availableWithWarning: ['spell-disable', 'spell-buff', 'spell-debuff'],
})

// Alias: wod5e → same preset as vtm5e
SYSTEM_PRESETS.set('wod5e', {
  ...SYSTEM_PRESETS.get('vtm5e')!,
  systemId: 'wod5e',
  displayName: 'World of Darkness 5e',
})

// ── Shadowrun 5e / 6e ───────────────────────────────────────────────────────
const shadowrunPreset: SystemPreset = {
  systemId: 'shadowrun5e',
  displayName: 'Shadowrun 5e',
  criticalityRules: [
    {
      presetKey: 'sr:glitch',
      diceFormula: 'd6',
      resultCondition: '== 1',
      resultField: 'any_die',
      criticalType: 'failure',
      severity: 'major',
      label: 'Glitch',
      description: '50%+ de 1 dans la pool — quelque chose tourne mal',
      priority: 5,
    },
    {
      presetKey: 'sr:critical_glitch',
      diceFormula: 'd6',
      resultCondition: '== 1',
      resultField: 'any_die',
      criticalType: 'failure',
      severity: 'extreme',
      label: 'Glitch critique',
      description: 'Glitch + 0 succès — catastrophe totale',
      priority: 6,
    },
  ],
  capabilities: {
    hasSpells: true,
    hasTraditionalCriticals: false,
    hasDicePool: true,
    hasPercentile: false,
    hasFudgeDice: false,
    hasNarrativeDice: false,
    primaryDie: 'd6',
  },
  recommendedEvents: ['dice-invert'],
  availableWithWarning: ['spell-disable', 'spell-buff', 'spell-debuff'],
}

register(shadowrunPreset)
SYSTEM_PRESETS.set('shadowrun6-eden', {
  ...shadowrunPreset,
  systemId: 'shadowrun6-eden',
  displayName: 'Shadowrun 6e',
})

// ── Star Wars FFG / Genesys ─────────────────────────────────────────────────
const swffgPreset: SystemPreset = {
  systemId: 'starwarsffg',
  displayName: 'Star Wars FFG',
  criticalityRules: [
    {
      presetKey: 'swffg:triumph',
      diceFormula: 'd12',
      resultCondition: '== 12',
      resultField: 'max_die',
      criticalType: 'success',
      severity: 'major',
      label: 'Triomphe',
      description: 'Effet narratif positif puissant',
      priority: 5,
    },
    {
      presetKey: 'swffg:despair',
      diceFormula: 'd12',
      resultCondition: '== 12',
      resultField: 'max_die',
      criticalType: 'failure',
      severity: 'major',
      label: 'Désespoir',
      description: 'Effet narratif négatif puissant',
      priority: 5,
    },
  ],
  capabilities: {
    hasSpells: true,
    hasTraditionalCriticals: false,
    hasDicePool: false,
    hasPercentile: false,
    hasFudgeDice: false,
    hasNarrativeDice: true,
    primaryDie: 'd12',
  },
  recommendedEvents: ['dice-invert'],
  availableWithWarning: ['spell-disable', 'spell-buff', 'spell-debuff'],
}

register(swffgPreset)
SYSTEM_PRESETS.set('genesys', {
  ...swffgPreset,
  systemId: 'genesys',
  displayName: 'Genesys',
})

// ── FATE Core ───────────────────────────────────────────────────────────────
register({
  systemId: 'fate-core-official',
  displayName: 'FATE Core',
  criticalityRules: [
    {
      presetKey: 'fate:plus4',
      diceFormula: '4dF',
      resultCondition: '== 4',
      resultField: 'total',
      criticalType: 'success',
      severity: 'major',
      label: '+4',
      description: 'Quatre + sur les dés FATE — résultat légendaire (1.2% de chance)',
      priority: 5,
    },
    {
      presetKey: 'fate:minus4',
      diceFormula: '4dF',
      resultCondition: '== -4',
      resultField: 'total',
      criticalType: 'failure',
      severity: 'major',
      label: '-4',
      description: 'Quatre - sur les dés FATE — catastrophe (1.2% de chance)',
      priority: 5,
    },
  ],
  capabilities: {
    hasSpells: false,
    hasTraditionalCriticals: false,
    hasDicePool: false,
    hasPercentile: false,
    hasFudgeDice: true,
    hasNarrativeDice: false,
    primaryDie: '4dF',
  },
  recommendedEvents: ['dice-invert'],
  availableWithWarning: ['spell-disable', 'spell-buff', 'spell-debuff'],
})

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getSystemPreset(systemId: string): SystemPreset | null {
  return SYSTEM_PRESETS.get(systemId) ?? null
}

export function hasSystemPreset(systemId: string): boolean {
  return SYSTEM_PRESETS.has(systemId)
}

export function getAllSystemPresets(): SystemPreset[] {
  return Array.from(SYSTEM_PRESETS.values())
}

export function getSystemDisplayName(systemId: string): string | null {
  return SYSTEM_PRESETS.get(systemId)?.displayName ?? null
}
