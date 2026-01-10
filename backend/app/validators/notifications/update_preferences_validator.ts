import { z } from 'zod'

export const updatePreferencesSchema = z.object({
  pushEnabled: z.boolean().optional(),
  campaignInvitations: z.boolean().optional(),
  criticalAlerts: z.boolean().optional(),
  pollStarted: z.boolean().optional(),
  pollEnded: z.boolean().optional(),
  campaignMemberJoined: z.boolean().optional(),
  sessionReminder: z.boolean().optional(),
  tokenRefreshFailed: z.boolean().optional(),
  sessionActionRequired: z.boolean().optional(),
})

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>

export default updatePreferencesSchema
