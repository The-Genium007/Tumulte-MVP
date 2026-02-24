import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Migration: Backfill criticality enrichment for existing dice rolls
 *
 * Populates severity/critical_label/critical_category for existing critical rolls
 * using generic defaults derived from the existing critical_type column.
 *
 * IDEMPOTENT: Only updates rows where severity IS NULL, safe to re-run.
 *
 * SAFE MIGRATION:
 * - DML only (UPDATE), no schema changes
 * - Conditional on severity IS NULL (won't overwrite enriched data)
 * - down() reverses only the generic backfill values
 */
export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      await db.rawQuery(`
        UPDATE dice_rolls
        SET
          severity = 'major',
          critical_label = CASE
            WHEN critical_type = 'success' THEN 'Critical Success'
            WHEN critical_type = 'failure' THEN 'Critical Failure'
          END,
          critical_category = CASE
            WHEN critical_type = 'success' THEN 'generic_success'
            WHEN critical_type = 'failure' THEN 'generic_failure'
          END
        WHERE is_critical = true
          AND severity IS NULL
      `)
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.rawQuery(`
        UPDATE dice_rolls
        SET
          severity = NULL,
          critical_label = NULL,
          critical_category = NULL
        WHERE critical_category IN ('generic_success', 'generic_failure')
      `)
    })
  }
}
