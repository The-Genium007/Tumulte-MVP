import { z } from 'zod'

export const inviteStreamerSchema = z.object({
  twitchUserId: z.string().min(1, "L'ID utilisateur Twitch est requis"),
  twitchLogin: z.string().min(1, 'Le login Twitch est requis'),
  twitchDisplayName: z.string().min(1, "Le nom d'affichage Twitch est requis"),
  profileImageUrl: z.string().optional().nullable(),
})

export type InviteStreamerDto = z.infer<typeof inviteStreamerSchema>

export default inviteStreamerSchema
