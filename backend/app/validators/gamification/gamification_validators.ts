import { z } from 'zod'

// ========================================
// TYPES COMMUNS
// ========================================

const eventTypeEnum = z.enum(['individual', 'group'])
const triggerTypeEnum = z.enum(['dice_critical', 'manual', 'custom'])
const actionTypeEnum = z.enum(['dice_invert', 'chat_message', 'stat_modify', 'custom'])
const cooldownTypeEnum = z.enum(['time', 'gm_validation', 'event_complete'])

// ========================================
// CONFIGURATION TRIGGER
// ========================================

const criticalConfigSchema = z
  .object({
    enabled: z.boolean(),
    threshold: z.number().int().min(1).max(100).optional(),
    diceType: z.string().max(10).optional(),
  })
  .optional()

const triggerConfigSchema = z
  .object({
    criticalSuccess: criticalConfigSchema,
    criticalFailure: criticalConfigSchema,
    customRules: z.record(z.string(), z.unknown()).optional(),
  })
  .optional()
  .nullable()

// ========================================
// CONFIGURATION ACTION
// ========================================

const diceInvertConfigSchema = z
  .object({
    trollMessage: z.string().max(500).optional(),
    deleteOriginal: z.boolean().optional(),
  })
  .optional()

const chatMessageConfigSchema = z
  .object({
    content: z.string().max(2000).optional(),
    speaker: z.string().max(100).optional(),
  })
  .optional()

const statModifyConfigSchema = z
  .object({
    actorId: z.string().max(100).optional(),
    updates: z.record(z.string(), z.unknown()).optional(),
  })
  .optional()

const actionConfigSchema = z
  .object({
    diceInvert: diceInvertConfigSchema,
    chatMessage: chatMessageConfigSchema,
    statModify: statModifyConfigSchema,
    customActions: z.record(z.string(), z.unknown()).optional(),
  })
  .optional()
  .nullable()

// ========================================
// CONFIGURATION COOLDOWN
// ========================================

const cooldownConfigSchema = z
  .object({
    durationSeconds: z.number().int().min(0).max(86400).optional(), // Max 24h
    waitForEventId: z.string().uuid().optional(),
  })
  .optional()
  .nullable()

// ========================================
// UPDATE CONFIG CAMPAGNE
// ========================================

export const updateCampaignGamificationConfigSchema = z.object({
  isEnabled: z.boolean().optional(),
  cost: z.number().int().min(1).max(1000000).optional().nullable(),
  objectiveCoefficient: z.number().min(0.01).max(10).optional().nullable(),
  minimumObjective: z.number().int().min(1).max(1000).optional().nullable(),
  duration: z.number().int().min(10).max(600).optional().nullable(), // 10s à 10min
  cooldown: z.number().int().min(0).max(86400).optional().nullable(), // Max 24h
  maxClicksPerUserPerSession: z.number().int().min(0).max(100).optional(),
})

export type UpdateCampaignGamificationConfigDto = z.infer<
  typeof updateCampaignGamificationConfigSchema
>

// ========================================
// CREATE EVENT (pour événements custom futurs)
// ========================================

export const createGamificationEventSchema = z.object({
  name: z
    .string()
    .min(3, 'Le nom doit contenir au moins 3 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  slug: z
    .string()
    .min(3, 'Le slug doit contenir au moins 3 caractères')
    .max(50, 'Le slug ne peut pas dépasser 50 caractères')
    .regex(
      /^[a-z0-9-]+$/,
      'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'
    ),
  description: z.string().max(500).optional().nullable(),
  type: eventTypeEnum,
  triggerType: triggerTypeEnum,
  triggerConfig: triggerConfigSchema,
  actionType: actionTypeEnum,
  actionConfig: actionConfigSchema,
  defaultCost: z.number().int().min(1).max(1000000).default(1000),
  defaultObjectiveCoefficient: z.number().min(0.01).max(10).default(0.3),
  defaultMinimumObjective: z.number().int().min(1).max(1000).default(3),
  defaultDuration: z.number().int().min(10).max(600).default(60),
  cooldownType: cooldownTypeEnum.default('time'),
  cooldownConfig: cooldownConfigSchema,
  rewardColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'La couleur doit être au format hexadécimal (#RRGGBB)')
    .default('#9146FF'),
})

export type CreateGamificationEventDto = z.infer<typeof createGamificationEventSchema>

// ========================================
// TRIGGER MANUEL
// ========================================

export const triggerManualEventSchema = z.object({
  eventId: z.string().uuid("ID d'événement invalide"),
  streamerId: z.string().uuid('ID de streamer invalide'),
  viewerCount: z.number().int().min(0).max(1000000),
  customData: z.record(z.string(), z.unknown()).optional(),
})

export type TriggerManualEventDto = z.infer<typeof triggerManualEventSchema>

// ========================================
// CANCEL INSTANCE
// ========================================

export const cancelInstanceSchema = z.object({
  instanceId: z.string().uuid("ID d'instance invalide"),
})

export type CancelInstanceDto = z.infer<typeof cancelInstanceSchema>

// ========================================
// TWITCH REDEMPTION (webhook interne)
// ========================================

export const twitchRedemptionSchema = z.object({
  redemptionId: z.string().min(1),
  rewardId: z.string().min(1),
  streamerId: z.string().uuid(),
  twitchUserId: z.string().min(1),
  twitchUsername: z.string().min(1).max(100),
  amount: z.number().int().min(1),
})

export type TwitchRedemptionDto = z.infer<typeof twitchRedemptionSchema>
