import type { ResultData } from '#models/gamification_instance'

export interface NotificationContext {
  actionType: string
  resultData: ResultData | null
}

type TemplateBuilder = (ctx: NotificationContext) => string | null

const NOTIFICATION_TEMPLATES = new Map<string, TemplateBuilder>([
  [
    'dice_invert',
    (ctx) => {
      const original = ctx.resultData?.actionResult?.originalResult
      const inverted = ctx.resultData?.actionResult?.invertedResult
      if (original === undefined || inverted === undefined) return null
      return `🎭 Le chat a parlé ! Le dé a été inversé : ${original} → ${inverted}. C'est leur faute...`
    },
  ],
  [
    'spell_buff',
    (ctx) => {
      const spellName = ctx.resultData?.actionResult?.spellName ?? 'un sort'
      return `✨ Le chat bénit ${spellName} ! Prochain lancer amélioré.`
    },
  ],
  [
    'spell_debuff',
    (ctx) => {
      const spellName = ctx.resultData?.actionResult?.spellName ?? 'un sort'
      return `💀 Le chat maudit ${spellName} ! Prochain lancer affaibli.`
    },
  ],
  [
    'spell_disable',
    (ctx) => {
      const spellName = ctx.resultData?.actionResult?.spellName ?? 'un sort'
      const duration = ctx.resultData?.actionResult?.effectDuration as number | undefined
      const mins = duration ? Math.round(duration / 60) : '?'
      return `🔒 Le chat a scellé ${spellName} ! Sort indisponible pendant ${mins} min.`
    },
  ],
  [
    'monster_buff',
    (ctx) => {
      const name = ctx.resultData?.actionResult?.monsterName ?? 'un monstre'
      return `⚔️ Le chat renforce ${name} ! CA augmentée et PV temporaires.`
    },
  ],
  [
    'monster_debuff',
    (ctx) => {
      const name = ctx.resultData?.actionResult?.monsterName ?? 'un monstre'
      return `💥 Le chat affaiblit ${name} ! CA réduite et PV diminués.`
    },
  ],
])

/**
 * Builds a Twitch chat notification message for a gamification action.
 * Returns null if no notification should be sent for this action type.
 */
export function buildNotificationMessage(ctx: NotificationContext): string | null {
  const builder = NOTIFICATION_TEMPLATES.get(ctx.actionType)
  if (!builder) return null

  return builder(ctx)
}
