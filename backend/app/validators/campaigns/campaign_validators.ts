import { z } from 'zod'

// ========================================
// CREATE CAMPAIGN
// ========================================
export const createCampaignSchema = z.object({
  name: z
    .string()
    .min(3, 'Le nom doit contenir au moins 3 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  description: z
    .string()
    .max(500, 'La description ne peut pas dépasser 500 caractères')
    .optional()
    .nullable(),
})
export type CreateCampaignDto = z.infer<typeof createCampaignSchema>

// ========================================
// UPDATE CAMPAIGN
// ========================================
export const updateCampaignSchema = z.object({
  name: z
    .string()
    .min(3, 'Le nom doit contenir au moins 3 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .optional(),
  description: z
    .string()
    .max(500, 'La description ne peut pas dépasser 500 caractères')
    .optional()
    .nullable(),
})
export type UpdateCampaignDto = z.infer<typeof updateCampaignSchema>

// ========================================
// INVITE STREAMER
// ========================================
export const inviteStreamerSchema = z.object({
  twitch_user_id: z
    .string()
    .min(1, "L'ID utilisateur Twitch est requis")
    .regex(/^\d+$/, "L'ID utilisateur Twitch doit être numérique"),
  twitch_login: z
    .string()
    .min(1, 'Le login Twitch est requis')
    .regex(/^[a-zA-Z0-9_]+$/, 'Le login Twitch contient des caractères invalides'),
  twitch_display_name: z.string().min(1, "Le nom d'affichage Twitch est requis"),
  profile_image_url: z.string().url().optional().nullable(),
})
export type InviteStreamerDto = z.infer<typeof inviteStreamerSchema>

// ========================================
// IMPORT CAMPAIGN (VTT) - Converti depuis VineJS
// ========================================
export const importCampaignSchema = z.object({
  vttConnectionId: z.string().uuid(),
  vttCampaignId: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
})
export type ImportCampaignDto = z.infer<typeof importCampaignSchema>
