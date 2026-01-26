import { z } from 'zod'

// ========================================
// CREATE POLL
// ========================================
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
export type CreatePollDto = z.infer<typeof createPollSchema>

// ========================================
// UPDATE POLL
// ========================================
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
export type UpdatePollDto = z.infer<typeof updatePollSchema>

// ========================================
// ADD POLL (to session)
// ========================================
export const addPollSchema = z.object({
  question: z.string().min(1, 'La question est requise').max(60, 'Maximum 60 caractères'),
  options: z
    .array(z.string().min(1).max(25))
    .min(2, 'Minimum 2 options')
    .max(5, 'Maximum 5 options'),
  type: z.enum(['UNIQUE', 'STANDARD']).default('STANDARD'),
  channelPointsPerVote: z.number().int().positive().optional().nullable(),
})
export type AddPollDto = z.infer<typeof addPollSchema>

// ========================================
// LAUNCH POLL
// ========================================
export const launchPollSchema = z.object({
  title: z.string().min(1).max(60),
  options: z.array(z.string()).min(2).max(5),
  durationSeconds: z.number().int().min(15).max(1800).optional(),
  templateId: z.string().uuid().optional().nullable(),
  type: z.enum(['UNIQUE', 'STANDARD']).optional(),
  channelPointsEnabled: z.boolean().optional(),
  channelPointsAmount: z.number().int().min(1).max(1000000).optional().nullable(),
})
export type LaunchPollDto = z.infer<typeof launchPollSchema>

// ========================================
// CREATE POLL SESSION
// ========================================
export const createPollSessionSchema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères').max(100),
  defaultDurationSeconds: z
    .number()
    .int()
    .min(15, 'Durée minimum: 15 secondes')
    .max(1800, 'Durée maximum: 30 minutes')
    .optional()
    .default(60),
})
export type CreatePollSessionDto = z.infer<typeof createPollSessionSchema>
