import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Migration de données pour les utilisateurs existants
 *
 * Cette migration initialise les données pour les fonctionnalités ajoutées :
 * 1. token_expires_at pour les streamers existants (force refresh au prochain appel)
 * 2. notification_preferences pour les users existants (avec valeurs par défaut)
 */
export default class extends BaseSchema {
  async up() {
    // 1. Mettre à jour token_expires_at pour les streamers existants
    // On met NOW() pour forcer le système à considérer le token comme "à vérifier"
    await this.db.rawQuery(`
      UPDATE streamers
      SET token_expires_at = NOW()
      WHERE token_expires_at IS NULL
        AND encrypted_access_token IS NOT NULL
    `)

    // 2. Créer notification_preferences pour les users qui n'en ont pas
    // Les valeurs par défaut sont définies dans la table (push_enabled = true, etc.)
    await this.db.rawQuery(`
      INSERT INTO notification_preferences (id, user_id, push_enabled, campaign_invitations, critical_alerts, poll_started, poll_ended, campaign_member_joined, session_reminder, token_refresh_failed, created_at, updated_at)
      SELECT
        gen_random_uuid(),
        u.id,
        true,   -- push_enabled
        true,   -- campaign_invitations
        true,   -- critical_alerts
        true,   -- poll_started
        true,   -- poll_ended
        false,  -- campaign_member_joined
        false,  -- session_reminder
        true,   -- token_refresh_failed
        NOW(),
        NOW()
      FROM users u
      WHERE NOT EXISTS (
        SELECT 1 FROM notification_preferences np WHERE np.user_id = u.id
      )
    `)
  }

  async down() {
    // Rollback : on ne peut pas vraiment annuler ces changements de manière fiable
    // On pourrait supprimer les notification_preferences créées, mais on risque
    // de supprimer des préférences légitimement configurées par les utilisateurs
    // On laisse donc le rollback vide (no-op)
  }
}
