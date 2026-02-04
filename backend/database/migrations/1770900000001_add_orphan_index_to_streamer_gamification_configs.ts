import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Migration pour ajouter l'index partiel sur les configs orphelines
 *
 * Cette migration est séparée de la précédente car PostgreSQL ne permet pas
 * d'utiliser une nouvelle valeur d'enum dans la même transaction où elle a été ajoutée.
 */
export default class extends BaseSchema {
  async up() {
    // Index partiel pour trouver rapidement les configs orphelines à nettoyer
    this.schema.raw(`
      CREATE INDEX IF NOT EXISTS idx_streamer_gamification_configs_orphaned
      ON streamer_gamification_configs(twitch_reward_status, next_deletion_retry_at)
      WHERE twitch_reward_status = 'orphaned'
    `)
  }

  async down() {
    this.schema.raw('DROP INDEX IF EXISTS idx_streamer_gamification_configs_orphaned')
  }
}
