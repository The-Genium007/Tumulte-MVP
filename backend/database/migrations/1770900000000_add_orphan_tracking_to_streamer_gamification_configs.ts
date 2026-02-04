import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Migration pour ajouter le tracking des rewards orphelins
 *
 * Contexte :
 * Quand la suppression d'un reward Twitch échoue (API down, rate limit, etc.),
 * on doit conserver la référence (twitchRewardId) pour pouvoir réessayer plus tard.
 * Le status 'orphaned' indique qu'un reward existe potentiellement sur Twitch
 * mais que notre tentative de suppression a échoué.
 *
 * Nouvelles colonnes :
 * - deletion_failed_at : timestamp de la première tentative échouée
 * - deletion_retry_count : nombre de tentatives de suppression
 * - next_deletion_retry_at : prochaine tentative planifiée (backoff exponentiel)
 */
export default class extends BaseSchema {
  async up() {
    // Ajouter le status 'orphaned' à l'enum existant
    this.schema.raw(`
      ALTER TYPE twitch_reward_status_enum
      ADD VALUE IF NOT EXISTS 'orphaned'
    `)

    // Ajouter les colonnes de tracking des orphelins
    this.schema.alterTable('streamer_gamification_configs', (table) => {
      // Timestamp de la première tentative de suppression échouée
      table.timestamp('deletion_failed_at', { useTz: true }).nullable()

      // Compteur de tentatives de suppression (pour backoff)
      table.integer('deletion_retry_count').notNullable().defaultTo(0)

      // Prochaine tentative planifiée
      table.timestamp('next_deletion_retry_at', { useTz: true }).nullable()
    })

    // Note: The partial index using 'orphaned' value is created in a separate
    // migration (1770900000001) because PostgreSQL doesn't allow using new
    // enum values in the same transaction where they were added.
  }

  async down() {
    // Supprimer l'index
    this.schema.raw('DROP INDEX IF EXISTS idx_streamer_gamification_configs_orphaned')

    // Supprimer les colonnes
    this.schema.alterTable('streamer_gamification_configs', (table) => {
      table.dropColumn('deletion_failed_at')
      table.dropColumn('deletion_retry_count')
      table.dropColumn('next_deletion_retry_at')
    })

    // Note: On ne peut pas supprimer une valeur d'enum en PostgreSQL
    // Le status 'orphaned' restera dans l'enum mais ne sera plus utilisé
  }
}
