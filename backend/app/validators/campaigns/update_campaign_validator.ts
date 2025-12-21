import { z } from 'zod'

export const updateCampaignSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
})

export type UpdateCampaignDto = z.infer<typeof updateCampaignSchema>

export default updateCampaignSchema
