/**
 * System Preset Service
 *
 * Applies / clears system-defined criticality rule presets for campaigns.
 * Presets are defined in system_preset_registry.ts and inserted as real rows
 * in campaign_criticality_rules with is_system_preset = true.
 *
 * Idempotent: uses the unique (campaign_id, preset_key) index to avoid duplicates.
 */

import CampaignCriticalityRule from '#models/campaign_criticality_rule'
import {
  getSystemPreset,
  getSystemDisplayName,
  hasSystemPreset,
  type SystemCapabilities,
  type SystemPreset,
} from '#services/campaigns/system_preset_registry'

export class SystemPresetService {
  /**
   * Apply preset criticality rules for a game system to a campaign.
   * Idempotent — skips rules whose preset_key already exists for this campaign.
   */
  async applyPresetsIfNeeded(
    campaignId: string,
    gameSystemId: string
  ): Promise<{ applied: boolean; rulesCreated: number; systemName: string | null }> {
    const preset = getSystemPreset(gameSystemId)
    if (!preset) {
      return { applied: false, rulesCreated: 0, systemName: null }
    }

    let rulesCreated = 0

    for (const rule of preset.criticalityRules) {
      const exists = await CampaignCriticalityRule.query()
        .where('campaignId', campaignId)
        .where('presetKey', rule.presetKey)
        .first()

      if (!exists) {
        await CampaignCriticalityRule.create({
          campaignId,
          diceFormula: rule.diceFormula,
          resultCondition: rule.resultCondition,
          resultField: rule.resultField,
          criticalType: rule.criticalType,
          severity: rule.severity,
          label: rule.label,
          description: rule.description,
          priority: rule.priority,
          isEnabled: true,
          isSystemPreset: true,
          presetKey: rule.presetKey,
        })
        rulesCreated++
      }
    }

    return {
      applied: rulesCreated > 0,
      rulesCreated,
      systemName: preset.displayName,
    }
  }

  /**
   * Remove all system preset rules for a campaign.
   * Only touches rows with is_system_preset = true.
   */
  async clearPresets(campaignId: string): Promise<number> {
    const deleted = await CampaignCriticalityRule.query()
      .where('campaignId', campaignId)
      .where('isSystemPreset', true)
      .delete()

    // Knex .delete() returns the number of affected rows as a number[]
    return Array.isArray(deleted) ? deleted[0] : (deleted as number)
  }

  /**
   * Clear existing presets and apply new ones (when game system changes).
   */
  async reapplyPresets(
    campaignId: string,
    newSystemId: string
  ): Promise<{ cleared: number; rulesCreated: number; systemName: string | null }> {
    const cleared = await this.clearPresets(campaignId)
    const result = await this.applyPresetsIfNeeded(campaignId, newSystemId)
    return { cleared, ...result }
  }

  /**
   * Return compatibility/recommendation info for a given system.
   * Used by the system-info endpoint and frontend.
   */
  getCompatibilityInfo(gameSystemId: string | null): {
    systemName: string | null
    capabilities: SystemCapabilities | null
    recommendedEvents: string[]
    availableWithWarning: string[]
    isKnownSystem: boolean
    presetRulesCount: number
  } {
    if (!gameSystemId || !hasSystemPreset(gameSystemId)) {
      return {
        systemName: gameSystemId ? null : null,
        capabilities: null,
        recommendedEvents: [],
        availableWithWarning: [],
        isKnownSystem: false,
        presetRulesCount: 0,
      }
    }

    const preset = getSystemPreset(gameSystemId)!
    return {
      systemName: preset.displayName,
      capabilities: preset.capabilities,
      recommendedEvents: preset.recommendedEvents,
      availableWithWarning: preset.availableWithWarning,
      isKnownSystem: true,
      presetRulesCount: preset.criticalityRules.length,
    }
  }

  /**
   * Count how many preset rules are currently active for a campaign.
   */
  async countActivePresets(campaignId: string): Promise<number> {
    const result = await CampaignCriticalityRule.query()
      .where('campaignId', campaignId)
      .where('isSystemPreset', true)
      .count('* as total')

    return Number(result[0].$extras.total) || 0
  }

  /**
   * Get display name for a system (even if not detected on a campaign).
   */
  getSystemDisplayName(systemId: string): string | null {
    return getSystemDisplayName(systemId)
  }

  /**
   * Check if a system ID has known presets.
   */
  isKnownSystem(systemId: string): boolean {
    return hasSystemPreset(systemId)
  }
}

export default SystemPresetService
