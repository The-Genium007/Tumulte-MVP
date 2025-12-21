import { z } from 'zod'

export const addPollSchema = z.object({
  question: z.string().min(1, 'La question est requise').max(60, 'Maximum 60 caractères'),
  options: z
    .array(z.string().min(1).max(25))
    .min(2, 'Minimum 2 options')
    .max(5, 'Maximum 5 options'),
  type: z.enum(['SIMPLE', 'MULTIPLE']).default('SIMPLE'),
  channelPointsPerVote: z.number().int().positive().optional().nullable(),
})

export type AddPollDto = z.infer<typeof addPollSchema>

export default addPollSchema
