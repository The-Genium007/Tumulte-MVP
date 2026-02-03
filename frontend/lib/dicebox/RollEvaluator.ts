/**
 * Roll Evaluator
 * Evaluates dice rolls with full support for modifiers (keep, drop, reroll, explode)
 * Works with data already processed by Foundry VTT
 */

import type { TermData, DieResult, MappedRoll, MappedDie } from '~/types/dice'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Modifier types supported
 */
export type ModifierType =
  | 'kh' // Keep Highest
  | 'kl' // Keep Lowest
  | 'dh' // Drop Highest
  | 'dl' // Drop Lowest
  | 'k' // Keep (alias for kh)
  | 'd' // Drop (alias for dl)
  | 'r' // Reroll
  | 'ro' // Reroll Once
  | 'x' // Explode
  | 'xo' // Explode Once
  | 'cs' // Count Successes
  | 'cf' // Count Failures
  | 'ms' // Margin of Success
  | 'min' // Minimum value
  | 'max' // Maximum value

/**
 * Parsed modifier
 */
export interface ParsedModifier {
  type: ModifierType
  value?: number
  comparison?: '=' | '<' | '>' | '<=' | '>='
  target?: number
}

/**
 * Evaluated dice group
 */
export interface EvaluatedDiceGroup {
  /** All results (including dropped/inactive) */
  allResults: DieResult[]
  /** Active results only */
  activeResults: DieResult[]
  /** Dropped results */
  droppedResults: DieResult[]
  /** Total of active results */
  total: number
  /** Number of successes (for pool systems) */
  successes: number
  /** Number of failures (for pool systems) */
  failures: number
  /** Applied modifiers */
  appliedModifiers: ParsedModifier[]
}

/**
 * Complete evaluated roll
 */
export interface EvaluatedRoll {
  /** Evaluated dice groups */
  groups: EvaluatedDiceGroup[]
  /** Operators between groups */
  operators: string[]
  /** Constant modifier */
  constant: number
  /** Final total */
  total: number
  /** Formula representation */
  formula: string
}

// =============================================================================
// MODIFIER PARSER
// =============================================================================

/**
 * Parse a modifier string into structured data
 */
export function parseModifier(modifier: string): ParsedModifier | null {
  if (!modifier) return null

  const modLower = modifier.toLowerCase()

  // Keep Highest: kh, kh3, k, k3
  const khMatch = modLower.match(/^k(?:h)?(\d*)$/)
  if (khMatch) {
    return {
      type: 'kh',
      value: khMatch[1] ? parseInt(khMatch[1]) : 1,
    }
  }

  // Keep Lowest: kl, kl2
  const klMatch = modLower.match(/^kl(\d*)$/)
  if (klMatch) {
    return {
      type: 'kl',
      value: klMatch[1] ? parseInt(klMatch[1]) : 1,
    }
  }

  // Drop Highest: dh, dh1
  const dhMatch = modLower.match(/^dh(\d*)$/)
  if (dhMatch) {
    return {
      type: 'dh',
      value: dhMatch[1] ? parseInt(dhMatch[1]) : 1,
    }
  }

  // Drop Lowest: dl, dl1, d, d1
  const dlMatch = modLower.match(/^d(?:l)?(\d*)$/)
  if (dlMatch && !modLower.startsWith('dh')) {
    return {
      type: 'dl',
      value: dlMatch[1] ? parseInt(dlMatch[1]) : 1,
    }
  }

  // Reroll: r, r1, r<3, r<=2
  const rMatch = modLower.match(/^ro?([<>=]*)(\d*)$/)
  if (rMatch) {
    const isOnce = modLower.startsWith('ro')
    return {
      type: isOnce ? 'ro' : 'r',
      comparison: (rMatch[1] as ParsedModifier['comparison']) || '=',
      target: rMatch[2] ? parseInt(rMatch[2]) : 1,
    }
  }

  // Explode: x, x10, x>=10
  const xMatch = modLower.match(/^xo?([<>=]*)(\d*)$/)
  if (xMatch) {
    const isOnce = modLower.startsWith('xo')
    return {
      type: isOnce ? 'xo' : 'x',
      comparison: (xMatch[1] as ParsedModifier['comparison']) || '>=',
      target: xMatch[2] ? parseInt(xMatch[2]) : undefined, // undefined = max value
    }
  }

  // Count Successes: cs, cs>=5
  const csMatch = modLower.match(/^cs([<>=]*)(\d+)$/)
  if (csMatch && csMatch[2]) {
    return {
      type: 'cs',
      comparison: (csMatch[1] as ParsedModifier['comparison']) || '>=',
      target: parseInt(csMatch[2]),
    }
  }

  // Count Failures: cf, cf<=2
  const cfMatch = modLower.match(/^cf([<>=]*)(\d+)$/)
  if (cfMatch && cfMatch[2]) {
    return {
      type: 'cf',
      comparison: (cfMatch[1] as ParsedModifier['comparison']) || '<=',
      target: parseInt(cfMatch[2]),
    }
  }

  // Minimum: min3
  const minMatch = modLower.match(/^min(\d+)$/)
  if (minMatch && minMatch[1]) {
    return {
      type: 'min',
      value: parseInt(minMatch[1]),
    }
  }

  // Maximum: max5
  const maxMatch = modLower.match(/^max(\d+)$/)
  if (maxMatch && maxMatch[1]) {
    return {
      type: 'max',
      value: parseInt(maxMatch[1]),
    }
  }

  return null
}

/**
 * Parse all modifiers from a modifier array
 */
export function parseModifiers(modifiers: string[]): ParsedModifier[] {
  return modifiers.map((m) => parseModifier(m)).filter((m): m is ParsedModifier => m !== null)
}

// =============================================================================
// ROLL EVALUATOR CLASS
// =============================================================================

export class RollEvaluator {
  /**
   * Evaluate a complete roll with all modifiers
   * Note: Foundry VTT already applies modifiers, so we mainly reconstruct/verify
   */
  evaluateRoll(terms: TermData[]): EvaluatedRoll {
    const groups: EvaluatedDiceGroup[] = []
    const operators: string[] = []
    let constant = 0

    for (const term of terms) {
      switch (term.type) {
        case 'die':
          groups.push(this.evaluateDieTerm(term))
          break

        case 'operator':
          if (term.operator) {
            operators.push(term.operator)
          }
          break

        case 'number':
          // Handle as constant
          if (term.value !== undefined) {
            const lastOp = operators[operators.length - 1] || '+'
            if (lastOp === '+') {
              constant += term.value
            } else if (lastOp === '-') {
              constant -= term.value
            } else if (lastOp === '*') {
              // Multiplication affects the last group's total
              const lastGroupMul = groups[groups.length - 1]
              if (lastGroupMul) {
                lastGroupMul.total *= term.value
              }
            } else if (lastOp === '/') {
              const lastGroupDiv = groups[groups.length - 1]
              if (lastGroupDiv) {
                lastGroupDiv.total = Math.floor(lastGroupDiv.total / term.value)
              }
            }
          }
          break

        case 'pool':
          if (term.rolls) {
            for (const poolRoll of term.rolls) {
              for (const poolTerm of poolRoll) {
                if (poolTerm.type === 'die') {
                  groups.push(this.evaluateDieTerm(poolTerm))
                }
              }
            }
          }
          break

        case 'parenthetical':
          if (term.rolls) {
            // Evaluate inner terms recursively
            for (const innerRoll of term.rolls) {
              const innerEval = this.evaluateRoll(innerRoll)
              groups.push(...innerEval.groups)
              constant += innerEval.constant
            }
          }
          break
      }
    }

    // Calculate total
    let total = constant
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i]
      if (!group) continue
      const op = i > 0 ? operators[i - 1] || '+' : '+'

      if (op === '+') {
        total += group.total
      } else if (op === '-') {
        total -= group.total
      } else if (op === '*') {
        total *= group.total
      } else if (op === '/') {
        total = Math.floor(total / group.total)
      }
    }

    // Build formula
    const formula = this.buildFormula(groups, operators, constant)

    return {
      groups,
      operators,
      constant,
      total,
      formula,
    }
  }

  /**
   * Evaluate a single die term
   */
  private evaluateDieTerm(term: TermData): EvaluatedDiceGroup {
    const results = term.results || []
    const modifiers = term.modifiers || []
    const parsedMods = parseModifiers(modifiers)

    // Results from Foundry already have active/inactive flags set
    const activeResults = results.filter((r) => r.active)
    const droppedResults = results.filter((r) => !r.active)

    // Calculate total from active results
    let total = activeResults.reduce((sum, r) => sum + r.value, 0)

    // Count successes/failures for pool systems
    let successes = 0
    let failures = 0

    for (const result of activeResults) {
      if (result.success) successes++
      if (result.failure) failures++
    }

    // Apply min/max modifiers if present
    for (const mod of parsedMods) {
      if (mod.type === 'min' && mod.value !== undefined) {
        total = Math.max(total, mod.value)
      } else if (mod.type === 'max' && mod.value !== undefined) {
        total = Math.min(total, mod.value)
      }
    }

    return {
      allResults: results,
      activeResults,
      droppedResults,
      total,
      successes,
      failures,
      appliedModifiers: parsedMods,
    }
  }

  /**
   * Build a formula string from evaluated data
   */
  private buildFormula(
    groups: EvaluatedDiceGroup[],
    operators: string[],
    constant: number
  ): string {
    const parts: string[] = []

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i]
      if (!group) continue

      // Add operator if not first
      const opStr = operators[i - 1]
      if (i > 0 && opStr) {
        parts.push(opStr)
      }

      // Build group representation
      const activeCount = group.activeResults.length
      const totalCount = group.allResults.length
      const faces =
        group.allResults[0]?.value !== undefined ? this.inferFaces(group.allResults) : '?'

      let groupStr = `${totalCount}d${faces}`

      // Add modifier annotations
      if (group.droppedResults.length > 0) {
        const kept = activeCount
        groupStr += `kh${kept}`
      }

      // Show individual results
      const resultStr = group.allResults
        .map((r) => {
          if (!r.active) return `~~${r.value}~~`
          if (r.exploded) return `${r.value}!`
          if (r.rerolled) return `${r.value}r`
          return String(r.value)
        })
        .join(', ')

      parts.push(`${groupStr} [${resultStr}]`)
    }

    // Add constant
    if (constant !== 0) {
      parts.push(constant > 0 ? `+${constant}` : String(constant))
    }

    return parts.join(' ')
  }

  /**
   * Infer the number of faces from results
   */
  private inferFaces(results: DieResult[]): number {
    if (results.length === 0) return 6

    const maxValue = Math.max(...results.map((r) => r.value))

    // Common die types
    const commonDice = [4, 6, 8, 10, 12, 20, 100]
    for (const faces of commonDice) {
      if (maxValue <= faces) {
        return faces
      }
    }

    return maxValue
  }

  /**
   * Apply keep highest modifier to results
   * (For manual re-evaluation if needed)
   */
  applyKeepHighest(results: DieResult[], count: number): DieResult[] {
    const sorted = [...results].sort((a, b) => b.value - a.value)
    const toKeep = new Set(sorted.slice(0, count))

    return results.map((r) => ({
      ...r,
      active: toKeep.has(r),
    }))
  }

  /**
   * Apply keep lowest modifier to results
   */
  applyKeepLowest(results: DieResult[], count: number): DieResult[] {
    const sorted = [...results].sort((a, b) => a.value - b.value)
    const toKeep = new Set(sorted.slice(0, count))

    return results.map((r) => ({
      ...r,
      active: toKeep.has(r),
    }))
  }

  /**
   * Apply drop highest modifier to results
   */
  applyDropHighest(results: DieResult[], count: number): DieResult[] {
    const sorted = [...results].sort((a, b) => b.value - a.value)
    const toDrop = new Set(sorted.slice(0, count))

    return results.map((r) => ({
      ...r,
      active: !toDrop.has(r),
    }))
  }

  /**
   * Apply drop lowest modifier to results
   */
  applyDropLowest(results: DieResult[], count: number): DieResult[] {
    const sorted = [...results].sort((a, b) => a.value - b.value)
    const toDrop = new Set(sorted.slice(0, count))

    return results.map((r) => ({
      ...r,
      active: !toDrop.has(r),
    }))
  }

  /**
   * Check if a value matches a comparison
   */
  matchesComparison(value: number, comparison: string, target: number): boolean {
    switch (comparison) {
      case '=':
      case '==':
        return value === target
      case '<':
        return value < target
      case '>':
        return value > target
      case '<=':
        return value <= target
      case '>=':
        return value >= target
      default:
        return value === target
    }
  }

  /**
   * Count successes in a roll based on threshold
   */
  countSuccesses(results: DieResult[], threshold: number, comparison: string = '>='): number {
    return results.filter((r) => r.active && this.matchesComparison(r.value, comparison, threshold))
      .length
  }

  /**
   * Count failures in a roll based on threshold
   */
  countFailures(results: DieResult[], threshold: number, comparison: string = '<='): number {
    return results.filter((r) => r.active && this.matchesComparison(r.value, comparison, threshold))
      .length
  }

  /**
   * Get a summary of modifiers applied to a roll
   */
  getModifierSummary(mappedRoll: MappedRoll): string[] {
    const summaries: string[] = []

    for (const die of mappedRoll.dice) {
      if (die.droppedCount > 0) {
        summaries.push(`Dropped ${die.droppedCount} lowest`)
      }

      for (const result of die.results) {
        if (result.isCritical && result.criticalType === 'success') {
          summaries.push('Critical Success!')
        }
        if (result.isCritical && result.criticalType === 'failure') {
          summaries.push('Critical Failure!')
        }
      }
    }

    return [...new Set(summaries)] // Remove duplicates
  }

  /**
   * Calculate the probability of getting at least N successes in a pool
   */
  calculatePoolProbability(
    diceCount: number,
    faces: number,
    successThreshold: number,
    targetSuccesses: number
  ): number {
    // Probability of success on one die
    const p = (faces - successThreshold + 1) / faces

    // Binomial probability: P(X >= k) = sum of P(X = i) for i = k to n
    let probability = 0
    for (let i = targetSuccesses; i <= diceCount; i++) {
      probability += this.binomialProbability(diceCount, i, p)
    }

    return probability
  }

  /**
   * Binomial probability: P(X = k) = C(n,k) * p^k * (1-p)^(n-k)
   */
  private binomialProbability(n: number, k: number, p: number): number {
    return this.combinations(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k)
  }

  /**
   * Calculate combinations: C(n, k) = n! / (k! * (n-k)!)
   */
  private combinations(n: number, k: number): number {
    if (k > n) return 0
    if (k === 0 || k === n) return 1

    let result = 1
    for (let i = 0; i < k; i++) {
      result = (result * (n - i)) / (i + 1)
    }
    return result
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let evaluatorInstance: RollEvaluator | null = null

/**
 * Get the singleton RollEvaluator instance
 */
export function getRollEvaluator(): RollEvaluator {
  if (!evaluatorInstance) {
    evaluatorInstance = new RollEvaluator()
  }
  return evaluatorInstance
}

export default RollEvaluator
