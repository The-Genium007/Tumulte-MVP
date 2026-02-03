import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Migration pour supprimer les overlay_configs "Tumulte Défaut" créées
 * automatiquement lors de l'inscription OAuth.
 *
 * Le système utilise maintenant OverlayConfig.getDefaultConfigWithPoll()
 * comme fallback hard-codé - pas besoin de stocker en base.
 *
 * Les configs personnalisées par les utilisateurs (avec un nom différent)
 * sont conservées.
 */
export default class extends BaseSchema {
  async up() {
    // 1. Récupérer les IDs des configs "Tumulte Défaut"
    const defaultConfigs = await this.db
      .from('overlay_configs')
      .where('name', 'Tumulte Défaut')
      .select('id')

    const configIds = defaultConfigs.map((c) => c.id)

    if (configIds.length > 0) {
      // 2. Mettre à null les références dans campaign_memberships
      await this.db
        .from('campaign_memberships')
        .whereIn('overlay_config_id', configIds)
        .update({ overlay_config_id: null })

      // 3. Supprimer les configs par défaut
      await this.db.from('overlay_configs').whereIn('id', configIds).delete()
    }
  }

  async down() {
    // Pas de rollback - le système fonctionne avec le fallback hard-codé
  }
}
