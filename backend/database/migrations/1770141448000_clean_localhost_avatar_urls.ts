import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Migration to clean up localhost avatar URLs in characters table.
 *
 * These URLs were created when syncing characters from Foundry VTT running locally.
 * They cause Mixed Content errors when the app is served over HTTPS.
 *
 * This migration:
 * 1. Extracts the relative path from http://localhost:XXXXX/... URLs
 * 2. Sets avatar_url to NULL for any remaining invalid URLs
 */
export default class extends BaseSchema {
  async up() {
    // First, convert localhost URLs to relative paths
    // This preserves the path for potential future use with a Foundry proxy
    this.schema.raw(`
      UPDATE characters
      SET avatar_url = regexp_replace(avatar_url, '^https?://localhost(:\\d+)?', '')
      WHERE avatar_url ~ '^https?://localhost(:\\d+)?/'
    `)

    // Set to NULL any remaining http:// URLs (they won't work due to Mixed Content)
    this.schema.raw(`
      UPDATE characters
      SET avatar_url = NULL
      WHERE avatar_url ~ '^http://'
    `)
  }

  async down() {
    // Cannot restore original URLs - they're lost
    // This is intentional as the original URLs don't work anyway
  }
}
