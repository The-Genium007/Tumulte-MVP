/**
 * Universal Dice Types
 * Type definitions for the universal dice system supporting all Foundry VTT game systems
 */

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * Individual die result
 */
export interface DieResult {
  /** The rolled value */
  value: number
  /** Whether this result is counted (not dropped/rerolled) */
  active: boolean
  /** Whether this die was rerolled */
  rerolled?: boolean
  /** Whether this die exploded (rolled max and added another die) */
  exploded?: boolean
  /** For pool systems: is this a success? */
  success?: boolean
  /** For pool systems: is this a critical failure? */
  failure?: boolean
  /** Whether this result was discarded */
  discarded?: boolean
}

/**
 * Term data extracted from Foundry Roll
 */
export interface TermData {
  /** Type of term */
  type: 'die' | 'operator' | 'number' | 'pool' | 'function' | 'parenthetical' | 'unknown'
  /** Original Foundry class name */
  class?: string
  /** Number of faces (for dice) */
  faces?: number
  /** Number of dice rolled */
  count?: number
  /** Individual die results */
  results?: DieResult[]
  /** Applied modifiers (kh, kl, r, x, etc.) */
  modifiers?: string[]
  /** Operator symbol (+, -, *, /) */
  operator?: string
  /** Numeric value */
  value?: number
  /** Nested rolls (for pools and parenthetical) */
  rolls?: TermData[][]
  /** Original expression */
  expression?: string
  /** Custom die denomination (for exotic dice) */
  denomination?: string
}

/**
 * Narrative dice symbol result (for Genesys, L5R, etc.)
 */
export interface SymbolResult {
  /** Symbol type (success, failure, advantage, threat, triumph, despair, etc.) */
  type: string
  /** Number of this symbol */
  count: number
  /** Display icon/emoji */
  icon?: string
}

/**
 * System-specific metadata
 */
export interface SystemData {
  /** PF2e degree of success (0-3) */
  degreeOfSuccess?: number
  /** Is this a dice pool system? */
  isPool?: boolean
  /** Number of successes in pool */
  poolSuccesses?: number
  /** Number of failures in pool */
  poolFailures?: number
  /** Narrative dice symbols */
  symbols?: SymbolResult[]
  /** System-specific outcome type */
  outcomeType?: string
  /** Raw system-specific data */
  raw?: Record<string, unknown>
}

/**
 * Universal roll data from Foundry VTT
 */
export interface UniversalRollData {
  /** Unique roll identifier */
  rollId: string
  /** Character/Actor ID */
  characterId: string
  /** Character name */
  characterName: string
  /** Game system ID */
  systemId: string
  /** Original roll formula */
  rollFormula: string
  /** Final total */
  result: number
  /** Extracted term data */
  terms: TermData[]
  /** Flat array of all active die results */
  diceResults: number[]
  /** Whether this is a critical result */
  isCritical: boolean
  /** Critical type: 'success' or 'failure' */
  criticalType: 'success' | 'failure' | null
  /** Whether this roll is hidden/whispered */
  isHidden: boolean
  /** Type of roll (attack, damage, skill, etc.) */
  rollType: string | null
  /** System-specific metadata */
  systemData: SystemData
  /** Parsed skill from flavor */
  skill?: string | null
  /** Raw skill name from flavor */
  skillRaw?: string | null
  /** Parsed ability from flavor */
  ability?: string | null
  /** Raw ability name from flavor */
  abilityRaw?: string | null
  /** Extracted modifiers */
  modifiers?: string[]
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

// =============================================================================
// DICE MAPPING TYPES
// =============================================================================

/**
 * Render mode for a die
 */
export type DiceRenderMode = '3d' | '2d' | 'symbol'

/**
 * Sound profile for dice
 */
export type DiceSoundProfile = 'plastic' | 'metal' | 'wood' | 'coin' | 'none'

/**
 * Configuration for rendering a specific die type
 */
export interface DieRenderConfig {
  /** How to render this die */
  render: DiceRenderMode
  /** DiceBox type to use for 3D rendering */
  diceboxType?: string
  /** Symbol set to use for symbol rendering */
  symbolSet?: string
  /** Sound profile to use */
  soundProfile?: DiceSoundProfile
  /** Custom color override */
  color?: string
  /** Custom label mapping */
  labels?: string[]
}

/**
 * System-specific dice configuration
 */
export interface SystemDiceConfig {
  /** Display name of the system */
  name: string
  /** Mapping of die types to render configs */
  diceMap: Record<string, DieRenderConfig>
  /** Whether this system uses dice pools */
  isPoolSystem?: boolean
  /** Whether this system uses narrative dice */
  isNarrativeSystem?: boolean
  /** Custom success threshold for pools */
  poolSuccessThreshold?: number
  /** Custom critical rules */
  criticalRules?: {
    successValue?: number
    failureValue?: number
    faces?: number
  }
}

/**
 * Fallback rule for unknown dice
 */
export interface FallbackRule {
  /** Condition function to check if this rule applies */
  condition: (term: TermData) => boolean
  /** Action to take if condition matches */
  action: DieRenderConfig
  /** Priority (higher = checked first) */
  priority?: number
}

/**
 * Complete dice mapping configuration
 */
export interface DiceMappingConfig {
  /** System-specific mappings */
  systemMappings: Record<string, SystemDiceConfig>
  /** Fallback rules for unknown dice */
  fallbackRules: FallbackRule[]
}

// =============================================================================
// RENDERING TYPES
// =============================================================================

/**
 * Mapped die ready for rendering
 */
export interface MappedDie {
  /** Original term data */
  term: TermData
  /** Render configuration */
  config: DieRenderConfig
  /** Individual results to display */
  results: MappedDieResult[]
  /** Total for this die group */
  total: number
  /** Number of active (non-dropped) dice */
  activeCount: number
  /** Number of dropped dice */
  droppedCount: number
}

/**
 * Single mapped die result
 */
export interface MappedDieResult {
  /** The value */
  value: number
  /** Display label (may differ from value for exotic dice) */
  label: string
  /** Whether this result is active */
  active: boolean
  /** Whether this was a critical result */
  isCritical: boolean
  /** Critical type if applicable */
  criticalType?: 'success' | 'failure'
  /** Additional styling class */
  styleClass?: string
}

/**
 * Complete mapped roll ready for rendering
 */
export interface MappedRoll {
  /** Original roll data */
  original: UniversalRollData
  /** Mapped dice groups */
  dice: MappedDie[]
  /** Operators between groups */
  operators: string[]
  /** Constant modifier (if any) */
  constant: number | null
  /** Final total */
  total: number
  /** Whether any dice need 3D rendering */
  has3D: boolean
  /** Whether any dice need 2D fallback */
  has2D: boolean
  /** Whether any dice use symbols */
  hasSymbols: boolean
  /** System symbols (for narrative dice) */
  symbols?: SymbolResult[]
}

// =============================================================================
// SYMBOL SETS
// =============================================================================

/**
 * Symbol definition for narrative dice
 */
export interface DiceSymbol {
  /** Symbol identifier */
  id: string
  /** Display name */
  name: string
  /** Icon/emoji to display */
  icon: string
  /** CSS class for styling */
  cssClass: string
  /** Whether this is a positive result */
  isPositive: boolean
}

/**
 * Symbol set for a narrative dice system
 */
export interface SymbolSet {
  /** Set identifier */
  id: string
  /** Display name */
  name: string
  /** Available symbols */
  symbols: Record<string, DiceSymbol>
  /** Cancellation rules (e.g., success cancels failure) */
  cancellations?: Array<{
    positive: string
    negative: string
  }>
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Dice roll event from WebSocket
 */
export interface DiceRollEvent extends UniversalRollData {
  /** World/Campaign ID */
  worldId?: string
  /** Campaign ID */
  campaignId?: string
  /** Timestamp */
  timestamp?: number
}

/**
 * Dice animation complete event
 */
export interface DiceAnimationCompleteEvent {
  /** Roll ID */
  rollId: string
  /** Final results */
  results: number[]
  /** Animation duration in ms */
  duration: number
}
