import vine from '@vinejs/vine'

/**
 * Validator pour l'import de campagne depuis un VTT
 */
export const importCampaignValidator = vine.compile(
  vine.object({
    vttConnectionId: vine.string().uuid(),
    vttCampaignId: vine.string().minLength(1),
    name: vine.string().minLength(1).maxLength(255),
    description: vine.string().maxLength(1000).optional(),
  })
)
