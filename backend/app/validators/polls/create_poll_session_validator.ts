import { z } from 'zod'

export const createPollSessionSchema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères').max(100),
  defaultDurationSeconds: z
    .number()
    .int()
    .min(15, 'Durée minimum: 15 secondes')
    .max(1800, 'Durée maximum: 30 minutes'),
})

export type CreatePollSessionDto = z.infer<typeof createPollSessionSchema>

export default createPollSessionSchema
