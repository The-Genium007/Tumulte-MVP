import { BaseSchema } from '@adonisjs/lucid/schema'
import logger from '@adonisjs/core/services/logger'

/**
 * Data migration: multiply default_cost by 10 for all system gamification events.
 *
 * Before → After:
 *   dice-invert:   100 → 1000
 *   spell-disable:  50 →  500
 *   spell-buff:     50 →  500
 *   spell-debuff:   50 →  500
 *   monster-buff:   50 →  500
 *   monster-debuff:  50 →  500
 *
 * Also updates the column default from 100 to 1000.
 * Idempotent: only applies the multiplier to rows still at the old values.
 */
export default class extends BaseSchema {
  async up() {
    // Update each system event to its new cost (idempotent with WHERE clause)
    const costMap: Record<string, { from: number; to: number }> = {
      'dice-invert': { from: 100, to: 1000 },
      'spell-disable': { from: 50, to: 500 },
      'spell-buff': { from: 50, to: 500 },
      'spell-debuff': { from: 50, to: 500 },
      'monster-buff': { from: 50, to: 500 },
      'monster-debuff': { from: 50, to: 500 },
    }

    for (const [slug, { from, to }] of Object.entries(costMap)) {
      const result = await this.db.rawQuery(
        `UPDATE gamification_events
         SET default_cost = ?, updated_at = NOW()
         WHERE slug = ?
           AND is_system_event = true
           AND default_cost = ?`,
        [to, slug, from]
      )
      const affected = result.rowCount ?? 0
      if (affected > 0) {
        logger.info(`[Migration] Updated ${slug} default_cost: ${from} → ${to}`)
      } else {
        logger.info(`[Migration] ${slug} already at target cost or not found, skipping`)
      }
    }

    // Update column default for new events
    this.schema.alterTable('gamification_events', (table) => {
      table.integer('default_cost').notNullable().defaultTo(1000).alter()
    })
  }

  async down() {
    // Revert each system event to its original cost
    const costMap: Record<string, { from: number; to: number }> = {
      'dice-invert': { from: 1000, to: 100 },
      'spell-disable': { from: 500, to: 50 },
      'spell-buff': { from: 500, to: 50 },
      'spell-debuff': { from: 500, to: 50 },
      'monster-buff': { from: 500, to: 50 },
      'monster-debuff': { from: 500, to: 50 },
    }

    for (const [slug, { from, to }] of Object.entries(costMap)) {
      await this.db.rawQuery(
        `UPDATE gamification_events
         SET default_cost = ?, updated_at = NOW()
         WHERE slug = ?
           AND is_system_event = true
           AND default_cost = ?`,
        [to, slug, from]
      )
    }

    // Revert column default
    this.schema.alterTable('gamification_events', (table) => {
      table.integer('default_cost').notNullable().defaultTo(100).alter()
    })
  }
}
