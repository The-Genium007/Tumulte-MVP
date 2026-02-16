import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Enum values are added by the previous migration (1771300000001)
    const events = [
      {
        slug: 'spell-disable',
        name: 'Blocage de Sort',
        description:
          'Les viewers remplissent une jauge via Channel Points. Une fois remplie, un sort aléatoire du personnage est bloqué pendant une durée configurable.',
        type: 'individual',
        trigger_type: 'manual',
        trigger_config: null,
        action_type: 'spell_disable',
        action_config: JSON.stringify({
          spellDisable: {
            durationSeconds: 600,
            disableMessage: 'Un sort a été bloqué par le chat !',
            enableMessage: 'Le sort est de nouveau disponible !',
          },
        }),
        default_cost: 50,
        default_objective_coefficient: 0.2,
        default_minimum_objective: 3,
        default_duration: 90,
        cooldown_type: 'time',
        cooldown_config: JSON.stringify({ durationSeconds: 180 }),
        reward_color: '#8B5CF6',
        is_system_event: true,
      },
      {
        slug: 'spell-buff',
        name: 'Amplification de Sort',
        description:
          'Les viewers remplissent une jauge via Channel Points. Une fois remplie, un sort aléatoire du personnage est amplifié (avantage ou bonus) pour sa prochaine utilisation.',
        type: 'individual',
        trigger_type: 'manual',
        trigger_config: null,
        action_type: 'spell_buff',
        action_config: JSON.stringify({
          spellBuff: {
            buffType: 'advantage',
            bonusValue: 2,
            highlightColor: '#10B981',
            buffMessage: 'Un sort a été amplifié par le chat !',
          },
        }),
        default_cost: 50,
        default_objective_coefficient: 0.2,
        default_minimum_objective: 3,
        default_duration: 90,
        cooldown_type: 'time',
        cooldown_config: JSON.stringify({ durationSeconds: 180 }),
        reward_color: '#10B981',
        is_system_event: true,
      },
      {
        slug: 'spell-debuff',
        name: 'Malédiction de Sort',
        description:
          'Les viewers remplissent une jauge via Channel Points. Une fois remplie, un sort aléatoire du personnage est maudit (désavantage ou pénalité) pour sa prochaine utilisation.',
        type: 'individual',
        trigger_type: 'manual',
        trigger_config: null,
        action_type: 'spell_debuff',
        action_config: JSON.stringify({
          spellDebuff: {
            debuffType: 'disadvantage',
            penaltyValue: 2,
            highlightColor: '#EF4444',
            debuffMessage: 'Un sort a été maudit par le chat !',
          },
        }),
        default_cost: 50,
        default_objective_coefficient: 0.2,
        default_minimum_objective: 3,
        default_duration: 90,
        cooldown_type: 'time',
        cooldown_config: JSON.stringify({ durationSeconds: 180 }),
        reward_color: '#EF4444',
        is_system_event: true,
      },
    ]

    for (const event of events) {
      // Idempotent: skip if already exists
      const existing = await this.db.from('gamification_events').where('slug', event.slug).first()
      if (!existing) {
        await this.db.table('gamification_events').insert(event)
      }
    }
  }

  async down() {
    await this.db
      .from('gamification_events')
      .whereIn('slug', ['spell-disable', 'spell-buff', 'spell-debuff'])
      .andWhere('is_system_event', true)
      .delete()
  }
}
