import { z } from 'zod'

export const updateCharacterSchema = z.object({
  characterId: z.string().uuid('ID de personnage invalide'),
})

export type UpdateCharacterDto = z.infer<typeof updateCharacterSchema>

export default updateCharacterSchema
