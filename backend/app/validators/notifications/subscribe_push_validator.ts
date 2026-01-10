import { z } from 'zod'

export const subscribePushSchema = z.object({
  endpoint: z.string().url('URL endpoint invalide'),
  keys: z.object({
    p256dh: z.string().min(1, 'La clé p256dh est requise'),
    auth: z.string().min(1, 'La clé auth est requise'),
  }),
  deviceName: z.string().max(100, 'Le nom ne peut pas dépasser 100 caractères').optional(),
})

export type SubscribePushInput = z.infer<typeof subscribePushSchema>

export const unsubscribePushSchema = z.object({
  endpoint: z.string().url('URL endpoint invalide'),
})

export type UnsubscribePushInput = z.infer<typeof unsubscribePushSchema>

export default subscribePushSchema
