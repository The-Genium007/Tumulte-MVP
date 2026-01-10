import { BaseSchema } from '@adonisjs/lucid/schema'
import { overlayConfig as OverlayConfig } from '#models/overlay_config'
import { streamer as Streamer } from '#models/streamer'

/**
 * Migration pour créer une configuration overlay par défaut pour tous les streamers existants
 * qui n'en ont pas encore.
 */
export default class extends BaseSchema {
  async up() {
    // Récupérer tous les streamers
    const streamers = await Streamer.all()

    for (const streamer of streamers) {
      // Vérifier si le streamer a déjà une configuration
      const existingConfig = await OverlayConfig.query().where('streamer_id', streamer.id).first()

      if (!existingConfig) {
        // Créer la configuration par défaut avec le poll
        await OverlayConfig.create({
          streamerId: streamer.id,
          name: 'Configuration par défaut',
          config: OverlayConfig.getDefaultConfigWithPoll(),
          isActive: true,
        })
      }
    }
  }

  async down() {
    // Supprimer les configurations par défaut créées par cette migration
    await OverlayConfig.query().where('name', 'Configuration par défaut').delete()
  }
}
