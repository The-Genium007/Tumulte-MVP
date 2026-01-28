import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Migration to create AuthProvider entries for existing Twitch users
 *
 * This ensures existing users who authenticated via Twitch have their
 * provider info stored in the new auth_providers table.
 *
 * The Streamer table remains for Twitch-specific data (scopes, broadcaster_type, etc.)
 * while AuthProvider handles the generic OAuth provider linking.
 */
export default class extends BaseSchema {
  async up() {
    // Create auth_provider entries for existing users with streamers
    await this.db.rawQuery(`
      INSERT INTO auth_providers (
        id,
        user_id,
        provider,
        provider_user_id,
        provider_email,
        access_token_encrypted,
        refresh_token_encrypted,
        created_at,
        updated_at
      )
      SELECT
        gen_random_uuid(),
        s.user_id,
        'twitch',
        s.twitch_user_id,
        u.email,
        s.access_token_encrypted,
        s.refresh_token_encrypted,
        s.created_at,
        s.updated_at
      FROM streamers s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.user_id IS NOT NULL
      ON CONFLICT (provider, provider_user_id) DO NOTHING
    `)

    // Mark existing users with Twitch as having verified email
    // (they authenticated via Twitch OAuth, so their identity is verified)
    await this.db.rawQuery(`
      UPDATE users
      SET email_verified_at = NOW()
      WHERE id IN (
        SELECT user_id FROM streamers WHERE user_id IS NOT NULL
      )
      AND email IS NOT NULL
      AND email_verified_at IS NULL
    `)
  }

  async down() {
    // Remove auth_provider entries that were created from streamers
    await this.db.rawQuery(`
      DELETE FROM auth_providers
      WHERE provider = 'twitch'
      AND provider_user_id IN (
        SELECT twitch_user_id FROM streamers
      )
    `)

    // Reset email_verified_at for users who only had Twitch
    await this.db.rawQuery(`
      UPDATE users
      SET email_verified_at = NULL
      WHERE id IN (
        SELECT user_id FROM streamers WHERE user_id IS NOT NULL
      )
      AND id NOT IN (
        SELECT user_id FROM auth_providers WHERE provider != 'twitch'
      )
    `)
  }
}
