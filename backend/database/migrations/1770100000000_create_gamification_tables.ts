import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // ========================================
    // TABLE: gamification_events
    // Définition des types d'événements de gamification
    // ========================================
    this.schema.createTable('gamification_events', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table.string('name', 100).notNullable()
      table.string('slug', 50).notNullable().unique()
      table.text('description').nullable()

      // Type d'événement: individuel (par streamer) ou groupe (tous les streamers)
      table
        .enum('type', ['individual', 'group'], {
          useNative: true,
          enumName: 'gamification_event_type_enum',
        })
        .notNullable()

      // Type de déclencheur
      table
        .enum('trigger_type', ['dice_critical', 'manual', 'custom'], {
          useNative: true,
          enumName: 'gamification_trigger_type_enum',
        })
        .notNullable()

      // Configuration du déclencheur (JSON)
      table.jsonb('trigger_config').nullable()

      // Type d'action à exécuter
      table
        .enum('action_type', ['dice_invert', 'chat_message', 'stat_modify', 'custom'], {
          useNative: true,
          enumName: 'gamification_action_type_enum',
        })
        .notNullable()

      // Configuration de l'action (JSON)
      table.jsonb('action_config').nullable()

      // Paramètres par défaut
      table.integer('default_cost').notNullable().defaultTo(100) // Points de chaîne par clic
      table.decimal('default_objective_coefficient', 5, 2).notNullable().defaultTo(0.3) // 30% des viewers
      table.integer('default_minimum_objective').notNullable().defaultTo(3) // Minimum 3 clics
      table.integer('default_duration').notNullable().defaultTo(60) // 60 secondes

      // Cooldown après succès
      table
        .enum('cooldown_type', ['time', 'gm_validation', 'event_complete'], {
          useNative: true,
          enumName: 'gamification_cooldown_type_enum',
        })
        .notNullable()
        .defaultTo('time')

      table.jsonb('cooldown_config').nullable()

      // Apparence
      table.string('reward_color', 7).notNullable().defaultTo('#9146FF') // Couleur Twitch par défaut

      // Métadonnées
      table.boolean('is_system_event').notNullable().defaultTo(false)
      table.uuid('created_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })

    // ========================================
    // TABLE: campaign_gamification_configs
    // Configuration des événements par campagne
    // ========================================
    this.schema.createTable('campaign_gamification_configs', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table
        .uuid('campaign_id')
        .notNullable()
        .references('id')
        .inTable('campaigns')
        .onDelete('CASCADE')

      table
        .uuid('event_id')
        .notNullable()
        .references('id')
        .inTable('gamification_events')
        .onDelete('CASCADE')

      table.boolean('is_enabled').notNullable().defaultTo(true)

      // Overrides (null = utilise la valeur par défaut de l'événement)
      table.integer('cost').nullable()
      table.decimal('objective_coefficient', 5, 2).nullable()
      table.integer('minimum_objective').nullable()
      table.integer('duration').nullable() // Durée en secondes
      table.integer('cooldown').nullable() // Cooldown en secondes après succès

      // Limite de clics par utilisateur par session (0 = illimité)
      table.integer('max_clicks_per_user_per_session').notNullable().defaultTo(0)

      // ID du reward Twitch créé
      table.string('twitch_reward_id', 100).nullable()

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Une seule config par événement par campagne
      table.unique(['campaign_id', 'event_id'])
    })

    // ========================================
    // TABLE: gamification_instances
    // Instances actives d'événements
    // ========================================
    this.schema.createTable('gamification_instances', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table
        .uuid('campaign_id')
        .notNullable()
        .references('id')
        .inTable('campaigns')
        .onDelete('CASCADE')

      table
        .uuid('event_id')
        .notNullable()
        .references('id')
        .inTable('gamification_events')
        .onDelete('CASCADE')

      // Type hérité de l'événement
      table
        .enum('type', ['individual', 'group'], {
          useNative: true,
          existingType: true,
          enumName: 'gamification_event_type_enum',
        })
        .notNullable()

      table
        .enum('status', ['active', 'completed', 'expired', 'cancelled'], {
          useNative: true,
          enumName: 'gamification_instance_status_enum',
        })
        .notNullable()
        .defaultTo('active')

      // Données du déclencheur (ex: infos du dé critique)
      table.jsonb('trigger_data').nullable()

      // Objectif et progression
      table.integer('objective_target').notNullable()
      table.integer('current_progress').notNullable().defaultTo(0)
      table.integer('duration').notNullable() // Durée en secondes

      // Timing
      table.timestamp('starts_at', { useTz: true }).notNullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.timestamp('completed_at', { useTz: true }).nullable()

      // Résultat de l'action
      table.jsonb('result_data').nullable()

      // Cooldown
      table.timestamp('cooldown_ends_at', { useTz: true }).nullable()

      // Pour instances individuelles
      table.uuid('streamer_id').nullable().references('id').inTable('streamers').onDelete('CASCADE')
      table.integer('viewer_count_at_start').nullable()

      // Pour instances groupées (snapshots des streamers)
      table.jsonb('streamer_snapshots').nullable()

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Index pour requêtes fréquentes
      table.index(['campaign_id', 'status'])
      table.index(['streamer_id', 'status'])
      table.index('expires_at')
    })

    // ========================================
    // TABLE: gamification_contributions
    // Tracking des clics/contributions
    // ========================================
    this.schema.createTable('gamification_contributions', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table
        .uuid('instance_id')
        .notNullable()
        .references('id')
        .inTable('gamification_instances')
        .onDelete('CASCADE')

      table
        .uuid('streamer_id')
        .notNullable()
        .references('id')
        .inTable('streamers')
        .onDelete('CASCADE')

      // Données du viewer Twitch
      table.string('twitch_user_id', 50).notNullable()
      table.string('twitch_username', 100).notNullable()
      table.integer('amount').notNullable() // Points dépensés

      // ID de la redemption Twitch (pour déduplication)
      table.string('twitch_redemption_id', 100).notNullable().unique()

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Index pour tracking des contributions par user
      table.index(['instance_id', 'twitch_user_id'])
      table.index(['streamer_id', 'twitch_user_id'])
    })
  }

  async down() {
    // Drop tables dans l'ordre inverse (dépendances)
    this.schema.dropTable('gamification_contributions')
    this.schema.dropTable('gamification_instances')
    this.schema.dropTable('campaign_gamification_configs')
    this.schema.dropTable('gamification_events')

    // Drop les enums créés
    this.schema.raw('DROP TYPE IF EXISTS gamification_instance_status_enum')
    this.schema.raw('DROP TYPE IF EXISTS gamification_cooldown_type_enum')
    this.schema.raw('DROP TYPE IF EXISTS gamification_action_type_enum')
    this.schema.raw('DROP TYPE IF EXISTS gamification_trigger_type_enum')
    this.schema.raw('DROP TYPE IF EXISTS gamification_event_type_enum')
  }
}
