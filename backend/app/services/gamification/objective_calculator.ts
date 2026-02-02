import GamificationEvent from '#models/gamification_event'
import CampaignGamificationConfig from '#models/campaign_gamification_config'
import type { StreamerSnapshot } from '#models/gamification_instance'

/**
 * Données d'un streamer pour le calcul d'objectif
 */
export interface StreamerData {
  streamerId: string
  streamerName: string
  viewerCount: number
}

/**
 * Résultat du calcul d'objectif pour un groupe
 */
export interface GroupObjectiveResult {
  totalObjective: number
  streamerSnapshots: StreamerSnapshot[]
}

/**
 * ObjectiveCalculator - Calcul des objectifs de gamification
 *
 * Gère le calcul équitable des objectifs en fonction du nombre de viewers.
 * Protège les petites audiences avec un objectif minimum.
 *
 * Formule: objectif = max(minimumObjective, viewerCount × coefficient)
 */
export class ObjectiveCalculator {
  /**
   * Calcule l'objectif pour une instance individuelle
   *
   * @param viewerCount - Nombre de viewers actuels du streamer
   * @param config - Configuration de la campagne pour cet événement
   * @param event - Définition de l'événement
   * @returns Nombre de clics/contributions nécessaires
   */
  calculateIndividual(
    viewerCount: number,
    config: CampaignGamificationConfig,
    event: GamificationEvent
  ): number {
    const coefficient = config.getEffectiveCoefficient(event)
    const minimumObjective = config.getEffectiveMinimumObjective(event)

    // Formule: max(minimum, viewers × coefficient)
    const calculatedObjective = Math.round(viewerCount * coefficient)

    return Math.max(minimumObjective, calculatedObjective)
  }

  /**
   * Calcule l'objectif pour une instance groupée (multi-streamers)
   *
   * Chaque streamer a son propre objectif local calculé équitablement,
   * puis on fait la somme pour l'objectif global.
   *
   * @param streamersData - Données des streamers (ID, nom, viewers)
   * @param config - Configuration de la campagne pour cet événement
   * @param event - Définition de l'événement
   * @returns Objectif total et snapshots par streamer
   */
  calculateGroup(
    streamersData: StreamerData[],
    config: CampaignGamificationConfig,
    event: GamificationEvent
  ): GroupObjectiveResult {
    const streamerSnapshots: StreamerSnapshot[] = streamersData.map((streamer) => {
      const localObjective = this.calculateIndividual(streamer.viewerCount, config, event)

      return {
        streamerId: streamer.streamerId,
        streamerName: streamer.streamerName,
        viewerCount: streamer.viewerCount,
        localObjective,
        contributions: 0, // Sera mis à jour pendant l'instance
      }
    })

    const totalObjective = streamerSnapshots.reduce(
      (sum, snapshot) => sum + snapshot.localObjective,
      0
    )

    return {
      totalObjective,
      streamerSnapshots,
    }
  }

  /**
   * Recalcule l'objectif si le nombre de viewers change significativement
   *
   * Utile pour les instances longues où les viewers peuvent fluctuer.
   * Ne recalcule que si la variation dépasse le seuil (20% par défaut).
   *
   * @param currentObjective - Objectif actuel
   * @param oldViewerCount - Ancien nombre de viewers
   * @param newViewerCount - Nouveau nombre de viewers
   * @param config - Configuration de la campagne
   * @param event - Définition de l'événement
   * @param variationThreshold - Seuil de variation pour recalcul (défaut: 0.2 = 20%)
   * @returns Nouvel objectif ou null si pas de changement nécessaire
   */
  recalculateIfSignificantChange(
    currentObjective: number,
    oldViewerCount: number,
    newViewerCount: number,
    config: CampaignGamificationConfig,
    event: GamificationEvent,
    variationThreshold: number = 0.2
  ): number | null {
    // Évite la division par zéro
    if (oldViewerCount === 0) {
      return this.calculateIndividual(newViewerCount, config, event)
    }

    // Calcul de la variation
    const variation = Math.abs(newViewerCount - oldViewerCount) / oldViewerCount

    // Si variation insuffisante, pas de recalcul
    if (variation < variationThreshold) {
      return null
    }

    // Recalcul avec le nouveau nombre de viewers
    const newObjective = this.calculateIndividual(newViewerCount, config, event)

    // Si l'objectif est le même (ex: on reste au minimum), pas de changement
    if (newObjective === currentObjective) {
      return null
    }

    return newObjective
  }

  /**
   * Calcule le coût total pour atteindre l'objectif
   *
   * @param objective - Nombre de clics nécessaires
   * @param costPerClick - Coût en points par clic
   * @returns Coût total en points de chaîne
   */
  calculateTotalCost(objective: number, costPerClick: number): number {
    return objective * costPerClick
  }
}

export default ObjectiveCalculator
