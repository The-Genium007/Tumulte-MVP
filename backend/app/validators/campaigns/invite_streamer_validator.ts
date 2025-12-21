import { z } from 'zod'

export const inviteStreamerSchema = z.object({
  twitchUsername: z.string().min(1, "Le nom d'utilisateur Twitch est requis"),
})

export type InviteStreamerDto = z.infer<typeof inviteStreamerSchema>

export default inviteStreamerSchema
