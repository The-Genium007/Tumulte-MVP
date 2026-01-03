import { z } from 'zod'

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

export default launchPollSchema
