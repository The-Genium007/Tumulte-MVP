import { BaseSeeder } from '@adonisjs/lucid/seeders'
import GamificationEvent from '#models/gamification_event'

/**
 * Seeder pour les événements de gamification système
 *
 * Ces événements sont fournis par défaut et peuvent être activés par les MJ.
 */
export default class GamificationEventsSeeder extends BaseSeeder {
  async run() {
    // Vérifier si l'événement existe déjà (évite les doublons en cas de re-exécution)
    const existingDiceInvert = await GamificationEvent.query().where('slug', 'dice-invert').first()

    if (!existingDiceInvert) {
      await GamificationEvent.create({
        name: 'Inversion de dé',
        slug: 'dice-invert',
        description:
          "Permet aux viewers de se cotiser pour inverser le résultat d'un jet critique. " +
          'Une réussite critique devient un échec critique, et vice-versa. ' +
          'Parfait pour créer des retournements de situation dramatiques !',
        type: 'individual',
        triggerType: 'dice_critical',
        triggerConfig: {
          criticalSuccess: {
            enabled: true,
            threshold: 20, // D20 = 20
            diceType: 'd20',
          },
          criticalFailure: {
            enabled: true,
            threshold: 1, // D20 = 1
            diceType: 'd20',
          },
        },
        actionType: 'dice_invert',
        actionConfig: {
          diceInvert: {
            trollMessage: "🎭 Le chat a inversé le destin ! C'est leur faute...",
            deleteOriginal: true,
          },
        },
        defaultCost: 100, // 100 points de chaîne par clic
        defaultObjectiveCoefficient: 0.3, // 30% des viewers
        defaultMinimumObjective: 3, // Minimum 3 clics
        defaultDuration: 60, // 60 secondes pour remplir la jauge
        cooldownType: 'time',
        cooldownConfig: {
          durationSeconds: 300, // 5 minutes de cooldown après succès
        },
        rewardColor: '#FF6B6B', // Rouge pour l'inversion (danger!)
        isSystemEvent: true,
        createdById: null,
      })

      console.log('✅ Événement "Inversion de dé" créé')
    } else {
      console.log('ℹ️  Événement "Inversion de dé" existe déjà, ignoré')
    }

    // Futur: Ajouter d'autres événements système ici
    // Exemple: boost de stats, message dans le chat, etc.
  }
}
