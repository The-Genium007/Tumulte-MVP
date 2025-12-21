import { z } from 'zod'

export const launchPollSchema = z.object({
  durationSeconds: z.number().int().min(15).max(1800).optional(),
})

export type LaunchPollDto = z.infer<typeof launchPollSchema>

export default launchPollSchema
