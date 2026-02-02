import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // ========================================
    // Ajouter l'état 'armed' à l'enum des statuts d'instance
    // ========================================
    this.schema.raw(`
      ALTER TYPE gamification_instance_status_enum
      ADD VALUE IF NOT EXISTS 'armed'
    `)

    // ========================================
    // TABLE: streamer_gamification_configs
    // Configuration des événements de gamification par streamer
    // Permet à chaque streamer de personnaliser le coût et gérer son reward Twitch
    // ========================================
    this.schema.createTable('streamer_gamification_configs', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      // Liens
      table
        .uuid('campaign_id')
        .notNullable()
        .references('id')
        .inTable('campaigns')
        .onDelete('CASCADE')

      table
        .uuid('streamer_id')
        .notNullable()
        .references('id')
        .inTable('streamers')
        .onDelete('CASCADE')

      table
        .uuid('event_id')
        .notNullable()
        .references('id')
        .inTable('gamification_events')
        .onDelete('CASCADE')

      // État d'activation par le streamer
      table.boolean('is_enabled').notNullable().defaultTo(false)

      // Override du coût en points de chaîne (null = utilise config MJ ou défaut événement)
      table.integer('cost_override').nullable()

      // Reward Twitch créé pour ce streamer
      table.string('twitch_reward_id', 100).nullable()
      table
        .enum('twitch_reward_status', ['not_created', 'active', 'paused', 'deleted'], {
          useNative: true,
          enumName: 'twitch_reward_status_enum',
        })
        .notNullable()
        .defaultTo('not_created')

      // Timestamps
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Une seule config par streamer par événement par campagne
      table.unique(['campaign_id', 'streamer_id', 'event_id'])
    })

    // ========================================
    // Ajouter colonne refunded aux contributions
    // Pour tracker les remboursements en cas d'échec de la jauge
    // ========================================
    this.schema.alterTable('gamification_contributions', (table) => {
      table.boolean('refunded').notNullable().defaultTo(false)
    })

    // ========================================
    // Ajouter timestamp armed_at aux instances
    // Pour savoir quand l'instance est passée en mode "armed"
    // ========================================
    this.schema.alterTable('gamification_instances', (table) => {
      table.timestamp('armed_at', { useTz: true }).nullable()
    })

    // Index pour recherches fréquentes
    this.schema.raw(`
      CREATE INDEX idx_streamer_gamification_configs_streamer_campaign
      ON streamer_gamification_configs(streamer_id, campaign_id)
    `)
    this.schema.raw(`
      CREATE INDEX idx_streamer_gamification_configs_twitch_reward
      ON streamer_gamification_configs(twitch_reward_id)
      WHERE twitch_reward_id IS NOT NULL
    `)
  }

  async down() {
    // Supprimer les index
    this.schema.raw('DROP INDEX IF EXISTS idx_streamer_gamification_configs_streamer_campaign')
    this.schema.raw('DROP INDEX IF EXISTS idx_streamer_gamification_configs_twitch_reward')

    // Supprimer la colonne armed_at des instances
    this.schema.alterTable('gamification_instances', (table) => {
      table.dropColumn('armed_at')
    })

    // Supprimer la colonne refunded des contributions
    this.schema.alterTable('gamification_contributions', (table) => {
      table.dropColumn('refunded')
    })

    // Supprimer la table
    this.schema.dropTable('streamer_gamification_configs')

    // Supprimer l'enum
    this.schema.raw('DROP TYPE IF EXISTS twitch_reward_status_enum')

    // Note: On ne peut pas supprimer une valeur d'enum en PostgreSQL
    // L'état 'armed' restera dans l'enum
  }
}
