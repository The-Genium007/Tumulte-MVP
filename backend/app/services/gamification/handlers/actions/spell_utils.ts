import Character from '#models/character'
import type { SpellInfo } from '#models/character'
import CharacterAssignment from '#models/character_assignment'
import { campaign as Campaign } from '#models/campaign'
import { streamer as Streamer } from '#models/streamer'
import { CampaignItemCategoryRuleRepository } from '#repositories/campaign_item_category_rule_repository'
import type CampaignItemCategoryRule from '#models/campaign_item_category_rule'
import logger from '@adonisjs/core/services/logger'

/**
 * Resolve the Foundry VTT actor ID and Character model for a given streamer in a campaign.
 *
 * Resolution order:
 * 1. CharacterAssignment (streamer → character) — standard player path
 * 2. Campaign.gmActiveCharacterId — only if the streamer IS the campaign owner (GM)
 */
export async function resolveActorForStreamer(
  campaignId: string,
  streamerId: string
): Promise<{ actorId: string; character: Character } | null> {
  // 1. Try CharacterAssignment (standard streamer-player path)
  const assignment = await CharacterAssignment.query()
    .where('campaign_id', campaignId)
    .where('streamer_id', streamerId)
    .preload('character')
    .first()

  if (assignment?.character && assignment.character.vttCharacterId) {
    logger.debug(
      {
        campaignId,
        streamerId,
        characterId: assignment.character.id,
        vttCharacterId: assignment.character.vttCharacterId,
        characterName: assignment.character.name,
      },
      '[spell_utils] Resolved via CharacterAssignment'
    )
    return { actorId: assignment.character.vttCharacterId, character: assignment.character }
  }

  // 2. Fallback: GM active character — only if this streamer is the campaign owner
  const campaign = await Campaign.query()
    .where('id', campaignId)
    .preload('gmActiveCharacter')
    .first()

  if (!campaign) {
    logger.warn({ campaignId, streamerId }, '[spell_utils] Campaign not found')
    return null
  }

  // Verify this streamer is the GM (campaign owner)
  const streamer = await Streamer.find(streamerId)
  if (!streamer?.userId || streamer.userId !== campaign.ownerId) {
    logger.warn(
      {
        campaignId,
        streamerId,
        streamerUserId: streamer?.userId ?? null,
        campaignOwnerId: campaign.ownerId,
      },
      '[spell_utils] Streamer is not the GM — cannot use gmActiveCharacter fallback'
    )
    return null
  }

  // 2a. GM has explicitly selected an active character
  if (campaign.gmActiveCharacterId && campaign.gmActiveCharacter) {
    const gmChar = campaign.gmActiveCharacter
    if (gmChar.vttCharacterId) {
      logger.info(
        {
          campaignId,
          streamerId,
          characterId: gmChar.id,
          vttCharacterId: gmChar.vttCharacterId,
          characterName: gmChar.name,
        },
        '[spell_utils] Using GM active character (streamer is campaign owner)'
      )
      return { actorId: gmChar.vttCharacterId, character: gmChar }
    }
    logger.warn(
      {
        campaignId,
        streamerId,
        characterId: gmChar.id,
        characterName: gmChar.name,
      },
      '[spell_utils] GM active character has no vttCharacterId — character not synced from Foundry?'
    )
    return null
  }

  logger.warn(
    {
      campaignId,
      streamerId,
      gmActiveCharacterId: campaign.gmActiveCharacterId,
    },
    '[spell_utils] GM has no active character set — please select a character via incarnation UI'
  )
  return null
}

/**
 * Pick a random spell from the character's spell list.
 * Supports optional weighted selection when weights are provided.
 * Optionally excludes cantrips (level 0).
 * Excludes spells with active Tumulte effects by default (anti-duplicate),
 * but falls back to all spells if every spell is already affected.
 */
export function pickRandomSpell(
  spells: SpellInfo[],
  excludeCantrips: boolean = false,
  weights?: Map<string, number>,
  excludeAffected: boolean = true
): SpellInfo | null {
  let eligible = spells

  if (excludeCantrips) {
    eligible = spells.filter((s) => s.level !== 0)
  }

  // Filter only spells that have a name (safety)
  eligible = eligible.filter((s) => s.name)

  if (eligible.length === 0) return null

  // Exclude spells that already have an active Tumulte effect
  if (excludeAffected) {
    const unaffected = eligible.filter((s) => !s.activeEffect)
    if (unaffected.length > 0) {
      eligible = unaffected
    } else {
      // Fallback: all spells are affected — allow re-targeting rather than blocking
      logger.warn(
        { totalSpells: eligible.length },
        '[pickRandomSpell] All spells have active effects — bypassing activeEffect filter to avoid blocking action'
      )
    }
  }

  // Weighted random selection if weights are provided
  if (weights && weights.size > 0) {
    const weightedEntries = eligible.map((spell) => ({
      spell,
      weight: weights.get(spell.id) ?? 1,
    }))
    const totalWeight = weightedEntries.reduce((sum, e) => sum + e.weight, 0)
    let random = Math.random() * totalWeight
    for (const entry of weightedEntries) {
      random -= entry.weight
      if (random <= 0) return entry.spell
    }
    // Fallback
    return weightedEntries[weightedEntries.length - 1].spell
  }

  const index = Math.floor(Math.random() * eligible.length)
  return eligible[index]
}

/**
 * Resolve the value of a matchField from a SpellInfo object.
 * Maps Foundry VTT system paths (e.g. 'system.school') to the flattened SpellInfo fields.
 */
function resolveSpellField(spell: SpellInfo, matchField: string): string | null {
  const fieldMap: Record<string, string | null> = {
    'system.school': spell.school,
    'system.level': spell.level !== null ? String(spell.level) : null,
    'system.prepared': spell.prepared !== null ? String(spell.prepared) : null,
  }
  return fieldMap[matchField] ?? null
}

/**
 * Check if a spell matches a category rule's criteria.
 */
function spellMatchesRule(spell: SpellInfo, rule: CampaignItemCategoryRule): boolean {
  // Must match item type (spell type in SpellInfo is always 'spell' for spell items)
  if (rule.itemType !== spell.type && rule.itemType !== 'spell') {
    return false
  }

  // If no matchField, any spell of the correct itemType matches
  if (!rule.matchField || !rule.matchValue) {
    return true
  }

  // Resolve field value and compare
  const fieldValue = resolveSpellField(spell, rule.matchField)
  return fieldValue !== null && fieldValue === rule.matchValue
}

/**
 * Filter a character's spells using campaign item category rules.
 * Returns only spells that match at least one targetable & enabled category rule,
 * along with a weight map for weighted random selection.
 *
 * Falls back to all spells (unweighted) if no category rules are configured.
 */
export async function getTargetableSpells(
  campaignId: string,
  spells: SpellInfo[]
): Promise<{ eligible: SpellInfo[]; weights: Map<string, number> }> {
  const repository = new CampaignItemCategoryRuleRepository()
  const rules = await repository.findTargetableByCampaign(campaignId, 'spell')

  // If no rules configured, all spells are eligible with uniform weight
  if (rules.length === 0) {
    logger.debug({ campaignId }, '[spell_utils] No category rules found, all spells eligible')
    return { eligible: spells, weights: new Map() }
  }

  const eligible: SpellInfo[] = []
  const weights = new Map<string, number>()

  for (const spell of spells) {
    // Find the first matching rule (ordered by priority desc)
    const matchingRule = rules.find((rule) => spellMatchesRule(spell, rule))
    if (matchingRule) {
      eligible.push(spell)
      weights.set(spell.id, matchingRule.weight)
    }
  }

  logger.debug(
    {
      campaignId,
      totalSpells: spells.length,
      eligibleSpells: eligible.length,
      rulesChecked: rules.length,
    },
    '[spell_utils] Filtered spells by category rules'
  )

  return { eligible, weights }
}
