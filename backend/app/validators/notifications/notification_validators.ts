import { z } from 'zod'

// ========================================
// UPDATE PREFERENCES
// ========================================
export const updatePreferencesSchema = z.object({
  pushEnabled: z.boolean().optional(),
  campaignInvitations: z.boolean().optional(),
  criticalAlerts: z.boolean().optional(),
  pollStarted: z.boolean().optional(),
  pollEnded: z.boolean().optional(),
  campaignMemberJoined: z.boolean().optional(),
  sessionReminder: z.boolean().optional(),
  tokenRefreshFailed: z.boolean().optional(),
  sessionActionRequired: z.boolean().optional(),
})
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>

// ========================================
// SUBSCRIBE PUSH
// ========================================
export const subscribePushSchema = z.object({
  endpoint: z.string().url('URL endpoint invalide'),
  keys: z.object({
    p256dh: z.string().min(1, 'La clé p256dh est requise'),
    auth: z.string().min(1, 'La clé auth est requise'),
  }),
  deviceName: z.string().max(100, 'Le nom ne peut pas dépasser 100 caractères').optional(),
})
export type SubscribePushInput = z.infer<typeof subscribePushSchema>

// ========================================
// UNSUBSCRIBE PUSH
// ========================================
export const unsubscribePushSchema = z.object({
  endpoint: z.string().url('URL endpoint invalide'),
})
export type UnsubscribePushInput = z.infer<typeof unsubscribePushSchema>
