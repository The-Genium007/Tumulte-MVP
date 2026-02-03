import { z } from 'zod'

// ========================================
// ACCEPT INVITATION
// ========================================
export const acceptInvitationSchema = z.object({
  characterId: z.string().uuid('ID de personnage invalide').optional(),
})
export type AcceptInvitationDto = z.infer<typeof acceptInvitationSchema>

// ========================================
// UPDATE CHARACTER
// ========================================
export const updateCharacterSchema = z.object({
  characterId: z.string().uuid('ID de personnage invalide'),
})
export type UpdateCharacterDto = z.infer<typeof updateCharacterSchema>

// ========================================
// UPDATE OVERLAY
// ========================================
export const updateOverlaySchema = z.object({
  overlayConfigId: z.string().uuid('ID de configuration invalide').nullable(),
})
export type UpdateOverlayDto = z.infer<typeof updateOverlaySchema>
