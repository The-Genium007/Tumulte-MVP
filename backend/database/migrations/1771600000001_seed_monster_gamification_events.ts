import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Enum values are added by the previous migration (1771600000000)
    const events = [
      {
        slug: 'monster-buff',
        name: 'Rage Bestiale',
        description:
          'Les viewers remplissent une jauge via Channel Points. Une fois remplie et un combat actif, un monstre hostile aléatoire reçoit un bonus de CA et des PV temporaires.',
        type: 'individual',
        trigger_type: 'manual',
        trigger_config: null,
        action_type: 'monster_buff',
        action_config: JSON.stringify({
          monsterBuff: {
            acBonus: 2,
            tempHp: 10,
            highlightColor: '#10B981',
            buffMessage: 'Un monstre a été renforcé par le chat !',
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
        slug: 'monster-debuff',
        name: 'Vulnérabilité',
        description:
          'Les viewers remplissent une jauge via Channel Points. Une fois remplie et un combat actif, un monstre hostile aléatoire subit un malus de CA et une réduction de PV max.',
        type: 'individual',
        trigger_type: 'manual',
        trigger_config: null,
        action_type: 'monster_debuff',
        action_config: JSON.stringify({
          monsterDebuff: {
            acPenalty: 2,
            maxHpReduction: 10,
            highlightColor: '#EF4444',
            debuffMessage: 'Un monstre a été affaibli par le chat !',
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
      .whereIn('slug', ['monster-buff', 'monster-debuff'])
      .andWhere('is_system_event', true)
      .delete()
  }
}
