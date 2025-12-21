import { z } from 'zod'

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

export default createCampaignSchema
