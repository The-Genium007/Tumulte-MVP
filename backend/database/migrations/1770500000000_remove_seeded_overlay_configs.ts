import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Migration pour supprimer les overlay_configs créées par l'ancien seeder.
 * Ces configs sont identifiées par leur nom "Configuration par défaut".
 *
 * Le système utilise maintenant des configs hard-codées dans le modèle
 * (OverlayConfig.getDefaultConfigWithPoll()) qui sont appliquées à la volée
 * quand un streamer n'a pas de config personnalisée.
 */
export default class extends BaseSchema {
  async up() {
    // 1. Récupérer les IDs des configs seedées
    const seededConfigs = await this.db
      .from('overlay_configs')
      .where('name', 'Configuration par défaut')
      .select('id')

    const seededConfigIds = seededConfigs.map((c) => c.id)

    if (seededConfigIds.length > 0) {
      // 2. Mettre à null les références dans campaign_memberships
      await this.db
        .from('campaign_memberships')
        .whereIn('overlay_config_id', seededConfigIds)
        .update({ overlay_config_id: null })

      // 3. Supprimer les configs seedées
      await this.db.from('overlay_configs').whereIn('id', seededConfigIds).delete()
    }
  }

  async down() {
    // Pas de rollback possible - les configs étaient générées dynamiquement
    // et le système fonctionne maintenant sans elles
  }
}
