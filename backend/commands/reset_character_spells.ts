import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Character from '#models/character'

/**
 * Temporary command to reset character spell/feature data for a campaign.
 * Forces a full resync from Foundry VTT on next connection.
 *
 * Usage: node --loader ts-node-maintained/esm bin/console.ts reset:character:spells <campaignId>
 */
export default class ResetCharacterSpells extends BaseCommand {
  static commandName = 'reset:character:spells'
  static description =
    'Reset spell/feature data for all characters in a campaign (forces Foundry resync)'
  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'Campaign ID to reset' })
  declare campaignId: string

  async run() {
    // Show current state
    const characters = await Character.query()
      .where('campaignId', this.campaignId)
      .orderBy('name', 'asc')

    if (characters.length === 0) {
      this.logger.error(`No characters found for campaign ${this.campaignId}`)
      return
    }

    this.logger.info(`Found ${characters.length} character(s) in campaign:`)
    for (const char of characters) {
      const spellCount = char.spells?.length ?? 0
      const featureCount = char.features?.length ?? 0
      const spellNames = char.spells?.map((s) => `${s.name} [${s.id}]`).join(', ') || 'none'
      const activeEffects =
        char.spells
          ?.filter((s) => s.activeEffect)
          .map((s) => `${s.name}(${s.activeEffect?.type})`)
          .join(', ') || 'none'

      this.logger.info(`  - ${char.name} (${char.characterType}) | vttId: ${char.vttCharacterId}`)
      this.logger.info(`    Spells: ${spellCount} | Features: ${featureCount}`)
      this.logger.info(`    Spell names: ${spellNames}`)
      this.logger.info(`    Active effects: ${activeEffects}`)
      this.logger.info(`    Last sync: ${char.lastSyncAt?.toISO() ?? 'never'}`)
    }

    // Reset all character spell/feature data
    this.logger.info('')
    this.logger.info('Resetting spell/feature data...')

    for (const char of characters) {
      char.spells = null
      char.features = null
      char.itemCategoryHash = null
      char.itemCategorySummary = null
      char.lastSyncAt = null
      await char.save()
      this.logger.success(`  ✓ ${char.name} — spells/features/categories cleared`)
    }

    this.logger.info('')
    this.logger.success(
      `Done! ${characters.length} character(s) reset. Reload Foundry to trigger resync.`
    )
  }
}
