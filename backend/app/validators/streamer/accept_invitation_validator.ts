import { z } from 'zod'

export const acceptInvitationSchema = z.object({
  characterId: z.string().uuid('ID de personnage invalide'),
})

export type AcceptInvitationDto = z.infer<typeof acceptInvitationSchema>

export default acceptInvitationSchema
