/**
 * Dice Mapper
 * Intelligently maps Foundry VTT dice to appropriate rendering methods
 * Supports all game systems through configurable mappings and fallback rules
 */

import type {
  TermData,
  DieResult,
  DieRenderConfig,
  SystemDiceConfig,
  FallbackRule,
  MappedDie,
  MappedDieResult,
  MappedRoll,
  UniversalRollData,
  SymbolResult,
  SymbolSet,
  DiceSymbol,
} from '~/types/dice'

// =============================================================================
// SYSTEM MAPPINGS
// =============================================================================

/**
 * Standard dice that can be rendered in 3D
 */
const STANDARD_3D_DICE = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100', 'df', 'dc']

/**
 * System-specific dice configurations
 */
export const SYSTEM_MAPPINGS: Record<string, SystemDiceConfig> = {
  // -------------------------------------------------------------------------
  // D20 SYSTEMS
  // -------------------------------------------------------------------------
  dnd5e: {
    name: 'D&D 5th Edition',
    diceMap: {
      d4: { render: '3d', diceboxType: 'd4', soundProfile: 'plastic' },
      d6: { render: '3d', diceboxType: 'd6', soundProfile: 'plastic' },
      d8: { render: '3d', diceboxType: 'd8', soundProfile: 'plastic' },
      d10: { render: '3d', diceboxType: 'd10', soundProfile: 'plastic' },
      d12: { render: '3d', diceboxType: 'd12', soundProfile: 'plastic' },
      d20: { render: '3d', diceboxType: 'd20', soundProfile: 'plastic' },
      d100: { render: '3d', diceboxType: 'd100', soundProfile: 'plastic' },
    },
    criticalRules: {
      successValue: 20,
      failureValue: 1,
      faces: 20,
    },
  },

  pf2e: {
    name: 'Pathfinder 2nd Edition',
    diceMap: {
      d4: { render: '3d', diceboxType: 'd4', soundProfile: 'plastic' },
      d6: { render: '3d', diceboxType: 'd6', soundProfile: 'plastic' },
      d8: { render: '3d', diceboxType: 'd8', soundProfile: 'plastic' },
      d10: { render: '3d', diceboxType: 'd10', soundProfile: 'plastic' },
      d12: { render: '3d', diceboxType: 'd12', soundProfile: 'plastic' },
      d20: { render: '3d', diceboxType: 'd20', soundProfile: 'plastic' },
      d100: { render: '3d', diceboxType: 'd100', soundProfile: 'plastic' },
    },
    criticalRules: {
      successValue: 20,
      failureValue: 1,
      faces: 20,
    },
  },

  // -------------------------------------------------------------------------
  // WORLD OF DARKNESS
  // -------------------------------------------------------------------------
  wod5e: {
    name: 'World of Darkness 5th Edition',
    isPoolSystem: true,
    poolSuccessThreshold: 6,
    diceMap: {
      // Regular dice
      d10: { render: '3d', diceboxType: 'd10', soundProfile: 'plastic' },
      dv: { render: '3d', diceboxType: 'd10', soundProfile: 'plastic', color: '#1a1a2e' },
      // Hunger/Rage dice (special)
      dg: { render: '3d', diceboxType: 'd10', soundProfile: 'metal', color: '#8b0000' },
      dh: { render: '3d', diceboxType: 'd10', soundProfile: 'plastic', color: '#2d3436' },
      ds: { render: '3d', diceboxType: 'd10', soundProfile: 'metal', color: '#6c5ce7' },
      dr: { render: '3d', diceboxType: 'd10', soundProfile: 'metal', color: '#d63031' },
      dw: { render: '3d', diceboxType: 'd10', soundProfile: 'plastic', color: '#636e72' },
    },
  },

  vtm5e: {
    name: 'Vampire: The Masquerade 5th Edition',
    isPoolSystem: true,
    poolSuccessThreshold: 6,
    diceMap: {
      d10: { render: '3d', diceboxType: 'd10', soundProfile: 'plastic' },
      dv: { render: '3d', diceboxType: 'd10', soundProfile: 'plastic', color: '#1a1a2e' },
      dg: { render: '3d', diceboxType: 'd10', soundProfile: 'metal', color: '#8b0000' },
    },
  },

  // -------------------------------------------------------------------------
  // BLADES IN THE DARK
  // -------------------------------------------------------------------------
  'blades-in-the-dark': {
    name: 'Blades in the Dark',
    isPoolSystem: true,
    diceMap: {
      d6: { render: '3d', diceboxType: 'd6', soundProfile: 'plastic', color: '#2d3436' },
    },
  },

  bitd: {
    name: 'Blades in the Dark',
    isPoolSystem: true,
    diceMap: {
      d6: { render: '3d', diceboxType: 'd6', soundProfile: 'plastic', color: '#2d3436' },
    },
  },

  'scum-and-villainy': {
    name: 'Scum and Villainy',
    isPoolSystem: true,
    diceMap: {
      d6: { render: '3d', diceboxType: 'd6', soundProfile: 'plastic', color: '#0984e3' },
    },
  },

  // -------------------------------------------------------------------------
  // YEAR ZERO ENGINE
  // -------------------------------------------------------------------------
  alienrpg: {
    name: 'Alien RPG',
    isPoolSystem: true,
    poolSuccessThreshold: 6,
    diceMap: {
      d6: { render: '3d', diceboxType: 'd6', soundProfile: 'plastic', color: '#000000' },
      // Base dice (black)
      base: { render: '3d', diceboxType: 'd6', soundProfile: 'plastic', color: '#1a1a1a' },
      // Stress dice (yellow)
      stress: { render: '3d', diceboxType: 'd6', soundProfile: 'metal', color: '#f1c40f' },
    },
  },

  myz: {
    name: 'Mutant Year Zero',
    isPoolSystem: true,
    poolSuccessThreshold: 6,
    diceMap: {
      d6: { render: '3d', diceboxType: 'd6', soundProfile: 'plastic' },
      base: { render: '3d', diceboxType: 'd6', soundProfile: 'plastic', color: '#2d3436' },
      skill: { render: '3d', diceboxType: 'd6', soundProfile: 'plastic', color: '#27ae60' },
      gear: { render: '3d', diceboxType: 'd6', soundProfile: 'metal', color: '#f39c12' },
    },
  },

  'forbidden-lands': {
    name: 'Forbidden Lands',
    isPoolSystem: true,
    poolSuccessThreshold: 6,
    diceMap: {
      d6: { render: '3d', diceboxType: 'd6', soundProfile: 'plastic' },
      d8: { render: '3d', diceboxType: 'd8', soundProfile: 'plastic' },
      d10: { render: '3d', diceboxType: 'd10', soundProfile: 'plastic' },
      d12: { render: '3d', diceboxType: 'd12', soundProfile: 'plastic' },
      base: { render: '3d', diceboxType: 'd6', soundProfile: 'plastic', color: '#1a1a1a' },
      skill: { render: '3d', diceboxType: 'd6', soundProfile: 'plastic', color: '#27ae60' },
      gear: { render: '3d', diceboxType: 'd6', soundProfile: 'metal', color: '#95a5a6' },
    },
  },

  // -------------------------------------------------------------------------
  // FATE / FUDGE
  // -------------------------------------------------------------------------
  fate: {
    name: 'Fate Core',
    diceMap: {
      df: { render: '3d', diceboxType: 'df', soundProfile: 'plastic' },
      d6: { render: '3d', diceboxType: 'd6', soundProfile: 'plastic' },
    },
  },

  'fate-core-official': {
    name: 'Fate Core Official',
    diceMap: {
      df: { render: '3d', diceboxType: 'df', soundProfile: 'plastic' },
      d6: { render: '3d', diceboxType: 'd6', soundProfile: 'plastic' },
    },
  },

  // -------------------------------------------------------------------------
  // SAVAGE WORLDS
  // -------------------------------------------------------------------------
  swade: {
    name: 'Savage Worlds Adventure Edition',
    diceMap: {
      d4: { render: '3d', diceboxType: 'd4', soundProfile: 'plastic' },
      d6: { render: '3d', diceboxType: 'd6', soundProfile: 'plastic' },
      d8: { render: '3d', diceboxType: 'd8', soundProfile: 'plastic' },
      d10: { render: '3d', diceboxType: 'd10', soundProfile: 'plastic' },
      d12: { render: '3d', diceboxType: 'd12', soundProfile: 'plastic' },
      d20: { render: '3d', diceboxType: 'd20', soundProfile: 'plastic' },
    },
  },

  // -------------------------------------------------------------------------
  // CALL OF CTHULHU
  // -------------------------------------------------------------------------
  coc7: {
    name: 'Call of Cthulhu 7th Edition',
    diceMap: {
      d4: { render: '3d', diceboxType: 'd4', soundProfile: 'plastic' },
      d6: { render: '3d', diceboxType: 'd6', soundProfile: 'plastic' },
      d8: { render: '3d', diceboxType: 'd8', soundProfile: 'plastic' },
      d10: { render: '3d', diceboxType: 'd10', soundProfile: 'plastic' },
      d12: { render: '3d', diceboxType: 'd12', soundProfile: 'plastic' },
      d20: { render: '3d', diceboxType: 'd20', soundProfile: 'plastic' },
      d100: { render: '3d', diceboxType: 'd100', soundProfile: 'plastic' },
    },
    criticalRules: {
      successValue: 1,
      failureValue: 100,
      faces: 100,
    },
  },

  // -------------------------------------------------------------------------
  // GENESYS / FFG STAR WARS
  // -------------------------------------------------------------------------
  genesys: {
    name: 'Genesys',
    isNarrativeSystem: true,
    diceMap: {
      ability: {
        render: 'symbol',
        symbolSet: 'genesys',
        soundProfile: 'plastic',
        color: '#27ae60',
      },
      proficiency: {
        render: 'symbol',
        symbolSet: 'genesys',
        soundProfile: 'plastic',
        color: '#f1c40f',
      },
      difficulty: {
        render: 'symbol',
        symbolSet: 'genesys',
        soundProfile: 'plastic',
        color: '#8e44ad',
      },
      challenge: {
        render: 'symbol',
        symbolSet: 'genesys',
        soundProfile: 'plastic',
        color: '#c0392b',
      },
      boost: { render: 'symbol', symbolSet: 'genesys', soundProfile: 'plastic', color: '#3498db' },
      setback: {
        render: 'symbol',
        symbolSet: 'genesys',
        soundProfile: 'plastic',
        color: '#2c3e50',
      },
      force: { render: 'symbol', symbolSet: 'genesys', soundProfile: 'plastic', color: '#ecf0f1' },
    },
  },

  starwarsffg: {
    name: 'Star Wars FFG',
    isNarrativeSystem: true,
    diceMap: {
      ability: {
        render: 'symbol',
        symbolSet: 'genesys',
        soundProfile: 'plastic',
        color: '#27ae60',
      },
      proficiency: {
        render: 'symbol',
        symbolSet: 'genesys',
        soundProfile: 'plastic',
        color: '#f1c40f',
      },
      difficulty: {
        render: 'symbol',
        symbolSet: 'genesys',
        soundProfile: 'plastic',
        color: '#8e44ad',
      },
      challenge: {
        render: 'symbol',
        symbolSet: 'genesys',
        soundProfile: 'plastic',
        color: '#c0392b',
      },
      boost: { render: 'symbol', symbolSet: 'genesys', soundProfile: 'plastic', color: '#3498db' },
      setback: {
        render: 'symbol',
        symbolSet: 'genesys',
        soundProfile: 'plastic',
        color: '#2c3e50',
      },
      force: { render: 'symbol', symbolSet: 'genesys', soundProfile: 'plastic', color: '#ecf0f1' },
      // Also support the Star Wars dice we already have
      dabi: { render: '3d', diceboxType: 'dabi', soundProfile: 'plastic' },
      ddif: { render: '3d', diceboxType: 'ddif', soundProfile: 'plastic' },
      dpro: { render: '3d', diceboxType: 'dpro', soundProfile: 'plastic' },
      dcha: { render: '3d', diceboxType: 'dcha', soundProfile: 'plastic' },
      dfor: { render: '3d', diceboxType: 'dfor', soundProfile: 'plastic' },
      dboo: { render: '3d', diceboxType: 'dboo', soundProfile: 'plastic' },
      dset: { render: '3d', diceboxType: 'dset', soundProfile: 'plastic' },
    },
  },

  // -------------------------------------------------------------------------
  // LEGEND OF THE FIVE RINGS
  // -------------------------------------------------------------------------
  l5r: {
    name: 'Legend of the Five Rings 5E',
    isNarrativeSystem: true,
    diceMap: {
      ring: { render: 'symbol', symbolSet: 'l5r', soundProfile: 'plastic', color: '#1a1a2e' },
      skill: { render: 'symbol', symbolSet: 'l5r', soundProfile: 'plastic', color: '#ecf0f1' },
      d6: { render: '3d', diceboxType: 'd6', soundProfile: 'plastic' },
      d12: { render: '3d', diceboxType: 'd12', soundProfile: 'plastic' },
    },
  },

  // -------------------------------------------------------------------------
  // POWERED BY THE APOCALYPSE
  // -------------------------------------------------------------------------
  pbta: {
    name: 'Powered by the Apocalypse',
    diceMap: {
      d6: { render: '3d', diceboxType: 'd6', soundProfile: 'plastic' },
    },
  },

  masks: {
    name: 'Masks: A New Generation',
    diceMap: {
      d6: { render: '3d', diceboxType: 'd6', soundProfile: 'plastic' },
    },
  },

  // -------------------------------------------------------------------------
  // CYBERPUNK
  // -------------------------------------------------------------------------
  cyberpunk: {
    name: 'Cyberpunk RED',
    diceMap: {
      d6: { render: '3d', diceboxType: 'd6', soundProfile: 'metal' },
      d10: { render: '3d', diceboxType: 'd10', soundProfile: 'metal' },
    },
  },

  // -------------------------------------------------------------------------
  // GENERIC / FALLBACK
  // -------------------------------------------------------------------------
  generic: {
    name: 'Generic System',
    diceMap: {
      d4: { render: '3d', diceboxType: 'd4', soundProfile: 'plastic' },
      d6: { render: '3d', diceboxType: 'd6', soundProfile: 'plastic' },
      d8: { render: '3d', diceboxType: 'd8', soundProfile: 'plastic' },
      d10: { render: '3d', diceboxType: 'd10', soundProfile: 'plastic' },
      d12: { render: '3d', diceboxType: 'd12', soundProfile: 'plastic' },
      d20: { render: '3d', diceboxType: 'd20', soundProfile: 'plastic' },
      d100: { render: '3d', diceboxType: 'd100', soundProfile: 'plastic' },
      df: { render: '3d', diceboxType: 'df', soundProfile: 'plastic' },
    },
  },
}

// =============================================================================
// SYMBOL SETS
// =============================================================================

export const SYMBOL_SETS: Record<string, SymbolSet> = {
  genesys: {
    id: 'genesys',
    name: 'Genesys/FFG',
    symbols: {
      success: {
        id: 'success',
        name: 'Success',
        icon: '⚔️',
        cssClass: 'symbol-success',
        isPositive: true,
      },
      failure: {
        id: 'failure',
        name: 'Failure',
        icon: '✖️',
        cssClass: 'symbol-failure',
        isPositive: false,
      },
      advantage: {
        id: 'advantage',
        name: 'Advantage',
        icon: '🔷',
        cssClass: 'symbol-advantage',
        isPositive: true,
      },
      threat: {
        id: 'threat',
        name: 'Threat',
        icon: '⬛',
        cssClass: 'symbol-threat',
        isPositive: false,
      },
      triumph: {
        id: 'triumph',
        name: 'Triumph',
        icon: '⭐',
        cssClass: 'symbol-triumph',
        isPositive: true,
      },
      despair: {
        id: 'despair',
        name: 'Despair',
        icon: '💀',
        cssClass: 'symbol-despair',
        isPositive: false,
      },
      lightForce: {
        id: 'lightForce',
        name: 'Light Side',
        icon: '⚪',
        cssClass: 'symbol-light',
        isPositive: true,
      },
      darkForce: {
        id: 'darkForce',
        name: 'Dark Side',
        icon: '⚫',
        cssClass: 'symbol-dark',
        isPositive: false,
      },
    },
    cancellations: [
      { positive: 'success', negative: 'failure' },
      { positive: 'advantage', negative: 'threat' },
    ],
  },

  l5r: {
    id: 'l5r',
    name: 'Legend of the Five Rings',
    symbols: {
      success: {
        id: 'success',
        name: 'Success',
        icon: '🎯',
        cssClass: 'symbol-success',
        isPositive: true,
      },
      successStrife: {
        id: 'successStrife',
        name: 'Success + Strife',
        icon: '🎯😰',
        cssClass: 'symbol-success-strife',
        isPositive: true,
      },
      opportunity: {
        id: 'opportunity',
        name: 'Opportunity',
        icon: '🔮',
        cssClass: 'symbol-opportunity',
        isPositive: true,
      },
      opportunityStrife: {
        id: 'opportunityStrife',
        name: 'Opportunity + Strife',
        icon: '🔮😰',
        cssClass: 'symbol-opportunity-strife',
        isPositive: true,
      },
      strife: {
        id: 'strife',
        name: 'Strife',
        icon: '😰',
        cssClass: 'symbol-strife',
        isPositive: false,
      },
      explosive: {
        id: 'explosive',
        name: 'Explosive Success',
        icon: '💥',
        cssClass: 'symbol-explosive',
        isPositive: true,
      },
      blank: {
        id: 'blank',
        name: 'Blank',
        icon: '⬜',
        cssClass: 'symbol-blank',
        isPositive: false,
      },
    },
    cancellations: [],
  },
}

// =============================================================================
// FALLBACK RULES
// =============================================================================

/**
 * Fallback rules for unknown dice types
 * Rules are checked in order of priority (highest first)
 */
export const FALLBACK_RULES: FallbackRule[] = [
  // Standard polyhedral dice
  {
    priority: 100,
    condition: (term) => term.faces === 4,
    action: { render: '3d', diceboxType: 'd4', soundProfile: 'plastic' },
  },
  {
    priority: 100,
    condition: (term) => term.faces === 6,
    action: { render: '3d', diceboxType: 'd6', soundProfile: 'plastic' },
  },
  {
    priority: 100,
    condition: (term) => term.faces === 8,
    action: { render: '3d', diceboxType: 'd8', soundProfile: 'plastic' },
  },
  {
    priority: 100,
    condition: (term) => term.faces === 10,
    action: { render: '3d', diceboxType: 'd10', soundProfile: 'plastic' },
  },
  {
    priority: 100,
    condition: (term) => term.faces === 12,
    action: { render: '3d', diceboxType: 'd12', soundProfile: 'plastic' },
  },
  {
    priority: 100,
    condition: (term) => term.faces === 20,
    action: { render: '3d', diceboxType: 'd20', soundProfile: 'plastic' },
  },
  {
    priority: 100,
    condition: (term) => term.faces === 100,
    action: { render: '3d', diceboxType: 'd100', soundProfile: 'plastic' },
  },

  // Fudge/FATE dice (typically 6-sided with +/0/- values)
  {
    priority: 90,
    condition: (term) =>
      term.denomination === 'f' || (term.class?.toLowerCase().includes('fudge') ?? false),
    action: { render: '3d', diceboxType: 'df', soundProfile: 'plastic' },
  },

  // Coin flip
  {
    priority: 90,
    condition: (term) => term.faces === 2 || term.denomination === 'c',
    action: { render: '3d', diceboxType: 'dc', soundProfile: 'coin' },
  },

  // Weird dice (d3, d5, d7, etc.) - render as 2D
  {
    priority: 50,
    condition: (term) =>
      term.faces !== undefined && ![2, 4, 6, 8, 10, 12, 20, 100].includes(term.faces),
    action: { render: '2d', soundProfile: 'plastic' },
  },

  // Ultimate fallback - anything else goes to 2D
  {
    priority: 0,
    condition: () => true,
    action: { render: '2d', soundProfile: 'plastic' },
  },
]

// =============================================================================
// DICE MAPPER CLASS
// =============================================================================

export class DiceMapper {
  private systemMappings: Record<string, SystemDiceConfig>
  private fallbackRules: FallbackRule[]
  private symbolSets: Record<string, SymbolSet>

  constructor(
    customSystemMappings?: Record<string, SystemDiceConfig>,
    customFallbackRules?: FallbackRule[],
    customSymbolSets?: Record<string, SymbolSet>
  ) {
    this.systemMappings = { ...SYSTEM_MAPPINGS, ...customSystemMappings }
    this.fallbackRules = [...(customFallbackRules || []), ...FALLBACK_RULES].sort(
      (a, b) => (b.priority || 0) - (a.priority || 0)
    )
    this.symbolSets = { ...SYMBOL_SETS, ...customSymbolSets }
  }

  /**
   * Map a complete roll for rendering
   */
  mapRoll(rollData: UniversalRollData): MappedRoll {
    const systemId = rollData.systemId || (rollData.metadata?.system as string) || 'generic'
    const systemConfig = this.getSystemConfig(systemId)

    const dice: MappedDie[] = []
    const operators: string[] = []
    let constant: number | null = null
    let has3D = false
    let has2D = false
    let hasSymbols = false

    // Process each term
    for (const term of rollData.terms) {
      if (term.type === 'die') {
        const mappedDie = this.mapDieTerm(term, systemConfig, systemId)
        dice.push(mappedDie)

        if (mappedDie.config.render === '3d') has3D = true
        if (mappedDie.config.render === '2d') has2D = true
        if (mappedDie.config.render === 'symbol') hasSymbols = true
      } else if (term.type === 'operator' && term.operator) {
        operators.push(term.operator)
      } else if (term.type === 'number' && term.value !== undefined) {
        // Accumulate constants
        const lastOp = operators[operators.length - 1] || '+'
        if (constant === null) {
          constant = term.value
        } else if (lastOp === '+') {
          constant += term.value
        } else if (lastOp === '-') {
          constant -= term.value
        }
      } else if (term.type === 'pool' && term.rolls) {
        // Process pool terms recursively
        for (const poolRoll of term.rolls) {
          for (const poolTerm of poolRoll) {
            if (poolTerm.type === 'die') {
              const mappedDie = this.mapDieTerm(poolTerm, systemConfig, systemId)
              dice.push(mappedDie)

              if (mappedDie.config.render === '3d') has3D = true
              if (mappedDie.config.render === '2d') has2D = true
              if (mappedDie.config.render === 'symbol') hasSymbols = true
            }
          }
        }
      }
    }

    return {
      original: rollData,
      dice,
      operators,
      constant,
      total: rollData.result,
      has3D,
      has2D,
      hasSymbols,
      symbols: rollData.systemData?.symbols,
    }
  }

  /**
   * Map a single die term
   */
  private mapDieTerm(term: TermData, systemConfig: SystemDiceConfig, _systemId: string): MappedDie {
    // Get render configuration
    const config = this.getRenderConfig(term, systemConfig)

    // Map individual results
    const results = this.mapDieResults(term, config, systemConfig)

    // Calculate totals
    const activeResults = results.filter((r) => r.active)
    const total = activeResults.reduce((sum, r) => sum + r.value, 0)

    return {
      term,
      config,
      results,
      total,
      activeCount: activeResults.length,
      droppedCount: results.length - activeResults.length,
    }
  }

  /**
   * Get render configuration for a term
   */
  private getRenderConfig(term: TermData, systemConfig: SystemDiceConfig): DieRenderConfig {
    // Try system-specific mapping first
    const dieKey = this.getDieKey(term)

    if (systemConfig.diceMap[dieKey]) {
      return systemConfig.diceMap[dieKey]
    }

    // Try standard dice notation
    const standardKey = `d${term.faces}`
    const standardConfig = systemConfig.diceMap[standardKey]
    if (standardConfig) {
      return standardConfig
    }

    // Try denomination-based lookup
    if (term.denomination) {
      const denomConfig = systemConfig.diceMap[term.denomination]
      if (denomConfig) {
        return denomConfig
      }
    }

    // Apply fallback rules
    for (const rule of this.fallbackRules) {
      if (rule.condition(term)) {
        return rule.action
      }
    }

    // Ultimate fallback
    return { render: '2d', soundProfile: 'plastic' }
  }

  /**
   * Get the key to look up a die in the system mapping
   */
  private getDieKey(term: TermData): string {
    // Custom denomination takes priority
    if (term.denomination) {
      return term.denomination
    }

    // Class name-based (e.g., "StressDie" -> "stress")
    if (term.class) {
      const classLower = term.class.toLowerCase()
      if (classLower.includes('stress')) return 'stress'
      if (classLower.includes('base')) return 'base'
      if (classLower.includes('skill')) return 'skill'
      if (classLower.includes('gear')) return 'gear'
      if (classLower.includes('hunger')) return 'dg'
      if (classLower.includes('rage')) return 'dr'
      if (classLower.includes('ability')) return 'ability'
      if (classLower.includes('proficiency')) return 'proficiency'
      if (classLower.includes('difficulty')) return 'difficulty'
      if (classLower.includes('challenge')) return 'challenge'
      if (classLower.includes('boost')) return 'boost'
      if (classLower.includes('setback')) return 'setback'
      if (classLower.includes('force')) return 'force'
    }

    // Standard notation
    return `d${term.faces}`
  }

  /**
   * Map die results with critical detection and labels
   */
  private mapDieResults(
    term: TermData,
    config: DieRenderConfig,
    systemConfig: SystemDiceConfig
  ): MappedDieResult[] {
    if (!term.results) return []

    return term.results.map((result) => {
      const { isCritical, criticalType } = this.detectResultCritical(result, term, systemConfig)

      // Generate label
      let label = String(result.value)
      const customLabel = config.labels?.[result.value - 1]
      if (customLabel) {
        label = customLabel
      }

      // Generate style class
      let styleClass = ''
      if (!result.active) {
        styleClass = 'dropped'
      } else if (isCritical) {
        styleClass = criticalType === 'success' ? 'critical-success' : 'critical-failure'
      } else if (result.exploded) {
        styleClass = 'exploded'
      } else if (result.rerolled) {
        styleClass = 'rerolled'
      }

      return {
        value: result.value,
        label,
        active: result.active ?? true,
        isCritical,
        criticalType,
        styleClass,
      }
    })
  }

  /**
   * Detect if a single result is critical
   */
  private detectResultCritical(
    result: DieResult,
    term: TermData,
    systemConfig: SystemDiceConfig
  ): { isCritical: boolean; criticalType?: 'success' | 'failure' } {
    if (!result.active) {
      return { isCritical: false }
    }

    const rules = systemConfig.criticalRules

    // Use system-specific rules if available
    if (rules && term.faces === rules.faces) {
      if (result.value === rules.successValue) {
        return { isCritical: true, criticalType: 'success' }
      }
      if (result.value === rules.failureValue) {
        return { isCritical: true, criticalType: 'failure' }
      }
    }

    // Default: max value = success, 1 = failure
    if (term.faces && result.value === term.faces) {
      return { isCritical: true, criticalType: 'success' }
    }
    if (result.value === 1 && term.faces && term.faces >= 4) {
      return { isCritical: true, criticalType: 'failure' }
    }

    return { isCritical: false }
  }

  /**
   * Get system configuration, with fallback to generic
   */
  getSystemConfig(systemId: string): SystemDiceConfig {
    const config = this.systemMappings[systemId]
    if (config) return config

    const genericConfig = this.systemMappings.generic
    if (genericConfig) return genericConfig

    // Ultimate fallback - should never happen but satisfies TypeScript
    // We know generic always exists in SYSTEM_MAPPINGS, but TypeScript doesn't
    return SYSTEM_MAPPINGS.generic as SystemDiceConfig
  }

  /**
   * Get a symbol set by ID
   */
  getSymbolSet(symbolSetId: string): SymbolSet | undefined {
    return this.symbolSets[symbolSetId]
  }

  /**
   * Check if a die type can be rendered in 3D
   */
  canRender3D(faces: number | undefined, denomination?: string): boolean {
    if (denomination) {
      // Check if we have a 3D type for this denomination
      const diceboxType = `d${denomination}`
      return STANDARD_3D_DICE.includes(diceboxType) || STANDARD_3D_DICE.includes(denomination)
    }

    if (faces === undefined) return false

    return [2, 4, 6, 8, 10, 12, 20, 100].includes(faces)
  }

  /**
   * Get DiceBox notation for a mapped roll
   * Returns the notation string to pass to DiceBox for 3D rendering
   */
  getDiceBoxNotation(mappedRoll: MappedRoll): string {
    const parts: string[] = []

    for (let i = 0; i < mappedRoll.dice.length; i++) {
      const die = mappedRoll.dice[i]
      if (!die) continue

      // Only include 3D dice
      if (die.config.render !== '3d') continue

      // Add operator if not first
      if (parts.length > 0) {
        const op = mappedRoll.operators[i - 1] || '+'
        parts.push(op)
      }

      // Build notation
      const diceboxType = die.config.diceboxType || `d${die.term.faces}`
      const activeCount = die.results.filter((r) => r.active).length

      // Include forced results
      const forcedResults = die.results
        .filter((r) => r.active)
        .map((r) => r.value)
        .join(',')

      parts.push(`${activeCount}${diceboxType}@${forcedResults}`)
    }

    // Add constant
    if (mappedRoll.constant !== null && mappedRoll.constant !== 0) {
      const op = mappedRoll.constant > 0 ? '+' : ''
      parts.push(`${op}${mappedRoll.constant}`)
    }

    return parts.join('')
  }

  /**
   * Get list of 2D fallback dice that need rendering
   */
  get2DFallbackDice(mappedRoll: MappedRoll): MappedDie[] {
    return mappedRoll.dice.filter((d) => d.config.render === '2d')
  }

  /**
   * Get list of symbol dice that need rendering
   */
  getSymbolDice(mappedRoll: MappedRoll): MappedDie[] {
    return mappedRoll.dice.filter((d) => d.config.render === 'symbol')
  }

  /**
   * Calculate net symbols after cancellation (for narrative dice)
   */
  calculateNetSymbols(symbols: SymbolResult[], symbolSetId: string): SymbolResult[] {
    const symbolSet = this.symbolSets[symbolSetId]
    if (!symbolSet || !symbolSet.cancellations) {
      return symbols
    }

    // Create a mutable copy
    const netSymbols = symbols.map((s) => ({ ...s }))

    // Apply cancellations
    for (const { positive, negative } of symbolSet.cancellations) {
      const posSymbol = netSymbols.find((s) => s.type === positive)
      const negSymbol = netSymbols.find((s) => s.type === negative)

      if (posSymbol && negSymbol) {
        const cancelled = Math.min(posSymbol.count, negSymbol.count)
        posSymbol.count -= cancelled
        negSymbol.count -= cancelled
      }
    }

    // Filter out zeros
    return netSymbols.filter((s) => s.count > 0)
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let mapperInstance: DiceMapper | null = null

/**
 * Get the singleton DiceMapper instance
 */
export function getDiceMapper(): DiceMapper {
  if (!mapperInstance) {
    mapperInstance = new DiceMapper()
  }
  return mapperInstance
}

/**
 * Create a new DiceMapper with custom configuration
 */
export function createDiceMapper(
  customSystemMappings?: Record<string, SystemDiceConfig>,
  customFallbackRules?: FallbackRule[],
  customSymbolSets?: Record<string, SymbolSet>
): DiceMapper {
  return new DiceMapper(customSystemMappings, customFallbackRules, customSymbolSets)
}

export default DiceMapper
