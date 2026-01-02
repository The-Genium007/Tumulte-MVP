import { z } from 'zod'

export const inviteStreamerSchema = z.object({
  twitch_user_id: z.string().min(1, "L'ID utilisateur Twitch est requis"),
  twitch_login: z.string().min(1, 'Le login Twitch est requis'),
  twitch_display_name: z.string().min(1, "Le nom d'affichage Twitch est requis"),
  profile_image_url: z.string().optional().nullable(),
})

export type InviteStreamerDto = z.infer<typeof inviteStreamerSchema>

export default inviteStreamerSchema
