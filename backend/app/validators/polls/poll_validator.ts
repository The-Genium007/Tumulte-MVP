import { z } from 'zod'

export const createPollSchema = z.object({
  question: z.string().min(1, 'La question est requise').max(45, 'Maximum 45 caractères'),
  options: z
    .array(z.string().min(1).max(25))
    .min(2, 'Minimum 2 options')
    .max(5, 'Maximum 5 options'),
  type: z.enum(['UNIQUE', 'STANDARD']).default('STANDARD'),
  durationSeconds: z.number().int().min(15).max(1800).default(60),
  channelPointsAmount: z.number().int().positive().optional().nullable(),
})

export const updatePollSchema = z.object({
  question: z
    .string()
    .min(1, 'La question est requise')
    .max(45, 'Maximum 45 caractères')
    .optional(),
  options: z
    .array(z.string().min(1).max(25))
    .min(2, 'Minimum 2 options')
    .max(5, 'Maximum 5 options')
    .optional(),
  type: z.enum(['UNIQUE', 'STANDARD']).optional(),
  durationSeconds: z.number().int().min(15).max(1800).optional(),
  channelPointsAmount: z.number().int().positive().optional().nullable(),
})

export type CreatePollDto = z.infer<typeof createPollSchema>
export type UpdatePollDto = z.infer<typeof updatePollSchema>
