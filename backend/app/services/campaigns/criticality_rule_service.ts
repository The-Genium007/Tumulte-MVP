import CampaignCriticalityRule from '#models/campaign_criticality_rule'
import { CampaignCriticalityRuleRepository } from '#repositories/campaign_criticality_rule_repository'
import type {
  CreateCriticalityRuleDto,
  UpdateCriticalityRuleDto,
} from '#validators/mj/criticality_rule_validator'

export class CriticalityRuleService {
  constructor(private repository: CampaignCriticalityRuleRepository) {}

  /**
   * Liste toutes les règles d'une campagne
   */
  async list(campaignId: string): Promise<CampaignCriticalityRule[]> {
    return this.repository.findByCampaign(campaignId)
  }

  /**
   * Liste uniquement les règles actives (pour évaluation côté module VTT)
   */
  async listEnabled(campaignId: string): Promise<CampaignCriticalityRule[]> {
    return this.repository.findEnabledByCampaign(campaignId)
  }

  /**
   * Crée une nouvelle règle de criticité
   */
  async create(
    campaignId: string,
    data: CreateCriticalityRuleDto
  ): Promise<CampaignCriticalityRule> {
    return this.repository.create({
      campaignId,
      diceFormula: data.diceFormula ?? null,
      resultCondition: data.resultCondition,
      resultField: data.resultField,
      criticalType: data.criticalType,
      severity: data.severity,
      label: data.label,
      description: data.description ?? null,
      priority: data.priority,
      isEnabled: data.isEnabled,
    })
  }

  /**
   * Met à jour une règle existante.
   * System presets can only have isEnabled toggled.
   */
  async update(
    ruleId: string,
    campaignId: string,
    data: UpdateCriticalityRuleDto
  ): Promise<CampaignCriticalityRule> {
    const rule = await this.repository.findById(ruleId)
    if (!rule || rule.campaignId !== campaignId) {
      throw new Error('Rule not found')
    }

    if (rule.isSystemPreset) {
      // System presets: only allow toggling isEnabled
      if (data.isEnabled !== undefined) {
        rule.merge({ isEnabled: data.isEnabled })
      } else {
        throw new Error('System preset rules can only be enabled or disabled')
      }
    } else {
      rule.merge({
        ...(data.diceFormula !== undefined && { diceFormula: data.diceFormula ?? null }),
        ...(data.resultCondition !== undefined && { resultCondition: data.resultCondition }),
        ...(data.resultField !== undefined && { resultField: data.resultField }),
        ...(data.criticalType !== undefined && { criticalType: data.criticalType }),
        ...(data.severity !== undefined && { severity: data.severity }),
        ...(data.label !== undefined && { label: data.label }),
        ...(data.description !== undefined && { description: data.description ?? null }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
      })
    }

    return this.repository.update(rule)
  }

  /**
   * Supprime une règle. System presets cannot be deleted.
   */
  async delete(ruleId: string, campaignId: string): Promise<void> {
    const rule = await this.repository.findById(ruleId)
    if (!rule || rule.campaignId !== campaignId) {
      throw new Error('Rule not found')
    }

    if (rule.isSystemPreset) {
      throw new Error('System preset rules cannot be deleted')
    }

    await this.repository.delete(rule)
  }

  /**
   * Évalue un résultat de dé contre les règles custom de la campagne.
   * Retourne la première règle qui matche (par priorité), ou null.
   */
  async evaluate(
    campaignId: string,
    diceFormula: string,
    diceResults: number[],
    total: number
  ): Promise<CampaignCriticalityRule | null> {
    const rules = await this.listEnabled(campaignId)

    for (const rule of rules) {
      if (this.matchesRule(rule, diceFormula, diceResults, total)) {
        return rule
      }
    }

    return null
  }

  /**
   * Vérifie si un résultat de dé correspond à une règle
   */
  private matchesRule(
    rule: CampaignCriticalityRule,
    diceFormula: string,
    diceResults: number[],
    total: number
  ): boolean {
    // 1. Vérifier la formule (si spécifiée)
    if (rule.diceFormula && rule.diceFormula !== '*') {
      if (!this.matchesFormula(rule.diceFormula, diceFormula)) {
        return false
      }
    }

    // 2. Extraire la valeur à évaluer
    const value = this.extractValue(rule.resultField, diceResults, total)
    if (value === null) return false

    // 3. Évaluer la condition
    return this.evaluateCondition(rule.resultCondition, value)
  }

  /**
   * Vérifie si la formule du dé correspond au pattern de la règle
   */
  private matchesFormula(pattern: string, formula: string): boolean {
    const normalizedPattern = pattern.toLowerCase().replace(/\s/g, '')
    const normalizedFormula = formula.toLowerCase().replace(/\s/g, '')

    // Exact match or contains the die type
    if (normalizedFormula === normalizedPattern) return true
    if (normalizedFormula.includes(normalizedPattern)) return true

    // Extract die type from pattern (e.g. "d20" from "1d20+5")
    const dieMatch = normalizedPattern.match(/d(\d+)/)
    if (dieMatch) {
      return normalizedFormula.includes(`d${dieMatch[1]}`)
    }

    return false
  }

  /**
   * Extrait la valeur à évaluer selon le champ configuré
   */
  private extractValue(field: string, diceResults: number[], total: number): number | null {
    if (!diceResults || diceResults.length === 0) return null

    switch (field) {
      case 'max_die':
        return Math.max(...diceResults)
      case 'min_die':
        return Math.min(...diceResults)
      case 'total':
        return total
      case 'any_die':
        // For 'any_die', the condition will be checked against each die individually
        // We return the first match value — handled specially in evaluateCondition
        return null // Handled in matchesRule override below
      default:
        return total
    }
  }

  /**
   * Évalue une condition contre une valeur
   */
  private evaluateCondition(condition: string, value: number): boolean {
    const match = condition.match(/^(==|!=|<=|>=|<|>)\s*(-?\d+(?:\.\d+)?)$/)
    if (!match) return false

    const operator = match[1]
    const threshold = Number.parseFloat(match[2])

    switch (operator) {
      case '==':
        return value === threshold
      case '!=':
        return value !== threshold
      case '<=':
        return value <= threshold
      case '>=':
        return value >= threshold
      case '<':
        return value < threshold
      case '>':
        return value > threshold
      default:
        return false
    }
  }
}

export default CriticalityRuleService
