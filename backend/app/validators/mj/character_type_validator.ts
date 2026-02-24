import { z } from 'zod'

export const toggleCharacterTypeSchema = z.object({
  characterType: z.enum(['npc', 'monster'], {
    error: 'Le type doit être "npc" ou "monster"',
  }),
})

export type ToggleCharacterTypeDto = z.infer<typeof toggleCharacterTypeSchema>
