import redis from '@adonisjs/redis/services/main'
import logger from '@adonisjs/core/services/logger'
import { campaign as Campaign } from '#models/campaign'

/**
 * Data for a hostile monster from cached combat state
 */
export interface MonsterInfo {
  actorId: string
  name: string
  img: string | null
  hp: { current: number; max: number; temp: number } | null
}

/**
 * Cached combat data stored in Redis by vtt_websocket_service
 */
interface CachedCombatData {
  combatId: string
  combatants: Array<{
    id: string
    actorId?: string
    name: string
    img?: string
    initiative: number | null
    isDefeated: boolean
    isNPC: boolean
    characterType?: 'pc' | 'npc' | 'monster'
    isVisible: boolean
    hp: { current: number; max: number; temp: number } | null
  }>
  round: number
  timestamp: number
}

/**
 * Get the active combat data from Redis for a campaign.
 * Returns null if no combat is active.
 */
export async function getActiveCombatData(campaignId: string): Promise<CachedCombatData | null> {
  const cached = await redis.get(`campaign:${campaignId}:combat:active`)
  if (!cached) return null

  try {
    return JSON.parse(cached) as CachedCombatData
  } catch {
    logger.warn({ campaignId }, '[monster_utils] Failed to parse cached combat data')
    return null
  }
}

/**
 * Filter hostile, non-defeated monsters from combatants.
 *
 * Uses `characterType` (from classifyActor) when available for precise filtering:
 * only 'npc' and 'monster' are eligible. Falls back to `isNPC` flag for
 * backward compatibility with older Foundry module versions.
 */
export function getHostileMonsters(combatants: CachedCombatData['combatants']): MonsterInfo[] {
  return combatants
    .filter((c) => {
      if (!c.actorId || c.isDefeated) return false

      // Prefer precise characterType classification when available
      if (c.characterType) {
        return c.characterType === 'npc' || c.characterType === 'monster'
      }

      // Fallback for older module versions without characterType
      return c.isNPC
    })
    .map((c) => ({
      actorId: c.actorId!,
      name: c.name,
      img: c.img ?? null,
      hp: c.hp,
    }))
}

/**
 * Pick a random monster from the list (uniform distribution).
 */
export function pickRandomMonster(monsters: MonsterInfo[]): MonsterInfo | null {
  if (monsters.length === 0) return null
  const index = Math.floor(Math.random() * monsters.length)
  return monsters[index]
}

/**
 * Resolve the active VTT connection ID for a campaign.
 * Returns null if the campaign has no connected VTT.
 */
export async function resolveConnectionForCampaign(campaignId: string): Promise<string | null> {
  const campaign = await Campaign.query().where('id', campaignId).preload('vttConnection').first()

  if (!campaign?.vttConnection) {
    logger.warn({ campaignId }, '[monster_utils] Campaign has no VTT connection')
    return null
  }

  if (campaign.vttConnection.tunnelStatus !== 'connected') {
    logger.warn(
      { campaignId, status: campaign.vttConnection.tunnelStatus },
      '[monster_utils] VTT connection is not active'
    )
    return null
  }

  return campaign.vttConnection.id
}
