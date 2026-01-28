import { ref, computed, type Ref } from 'vue'
import type { OverlayElement } from '@/overlay-studio/types'

/**
 * Élément dice par défaut pour les tests
 * Utilise la nouvelle structure DiceProperties avec diceBox et hud
 */
const DEFAULT_DICE_ELEMENT: OverlayElement = {
  id: 'default-dice-element',
  type: 'dice',
  name: 'Dés 3D',
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  visible: true,
  locked: true,
  zIndex: 0,
  properties: {
    // Configuration DiceBox (rendu 3D)
    diceBox: {
      colors: {
        foreground: '#000000',
        background: '#ffffff',
        outline: 'none',
      },
      texture: 'none',
      material: 'glass',
      lightIntensity: 1.0,
    },
    // Configuration HUD
    hud: {
      container: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(148, 163, 184, 0.3)',
        borderWidth: 2,
        borderRadius: 16,
        padding: { top: 24, right: 24, bottom: 24, left: 24 },
        backdropBlur: 10,
        boxShadow: {
          enabled: true,
          color: 'rgba(0, 0, 0, 0.5)',
          blur: 60,
          offsetX: 0,
          offsetY: 20,
        },
      },
      criticalBadge: {
        successBackground: 'rgba(34, 197, 94, 0.3)',
        successTextColor: 'rgb(74, 222, 128)',
        successBorderColor: 'rgba(34, 197, 94, 0.5)',
        failureBackground: 'rgba(239, 68, 68, 0.3)',
        failureTextColor: 'rgb(252, 165, 165)',
        failureBorderColor: 'rgba(239, 68, 68, 0.5)',
      },
      formula: {
        typography: {
          fontFamily: "'Courier New', monospace",
          fontSize: 20,
          fontWeight: 600,
          color: 'rgb(148, 163, 184)',
        },
      },
      result: {
        typography: {
          fontFamily: 'system-ui',
          fontSize: 48,
          fontWeight: 800,
          color: 'rgb(226, 232, 240)',
        },
        criticalSuccessColor: 'rgb(74, 222, 128)',
        criticalFailureColor: 'rgb(252, 165, 165)',
      },
      diceBreakdown: {
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        borderColor: 'rgba(148, 163, 184, 0.3)',
        borderRadius: 6,
        typography: {
          fontFamily: "'Courier New', monospace",
          fontSize: 16,
          fontWeight: 600,
          color: 'rgb(203, 213, 225)',
        },
      },
      skillInfo: {
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        borderRadius: 8,
        skillTypography: {
          fontFamily: 'system-ui',
          fontSize: 16,
          fontWeight: 700,
          color: 'rgb(147, 197, 253)',
        },
        abilityTypography: {
          fontFamily: 'system-ui',
          fontSize: 14,
          fontWeight: 500,
          color: 'rgb(148, 163, 184)',
        },
      },
      minWidth: 320,
      maxWidth: 400,
    },
    // Transform indépendant du HUD (position et scale)
    hudTransform: {
      position: { x: 0, y: -300 },
      scale: 1,
    },
    // Couleurs des critiques (glow)
    colors: {
      criticalSuccessGlow: '#22c55e',
      criticalFailureGlow: '#ef4444',
    },
    // Audio
    audio: {
      rollSound: { enabled: true, volume: 0.7 },
      criticalSuccessSound: { enabled: true, volume: 0.9 },
      criticalFailureSound: { enabled: true, volume: 0.9 },
    },
    // Animations
    animations: {
      entry: {
        type: 'throw',
        duration: 0.5,
      },
      settle: {
        timeout: 5,
      },
      result: {
        glowIntensity: 1.5,
        glowDuration: 0.5,
      },
      exit: {
        type: 'fade',
        duration: 0.5,
        delay: 2,
      },
    },
    // Données mock pour prévisualisation
    mockData: {
      rollFormula: '1d20',
      diceTypes: ['d20'],
      diceValues: [20],
      isCritical: true,
      criticalType: 'success',
    },
  },
}

interface OverlayConfigResponse {
  data: {
    config: {
      version: string
      canvas: {
        width: number
        height: number
      }
      elements: OverlayElement[]
    }
  }
}

/**
 * Composable pour charger la configuration overlay d'un streamer
 * Utilisé par la page overlay OBS pour afficher les éléments configurés dans le Studio
 */
export const useOverlayConfig = (streamerId: Ref<string>) => {
  const elements = ref<OverlayElement[]>([])
  const loading = ref(true)
  const error = ref<Error | null>(null)
  const hasConfig = computed(() => elements.value.length > 0)

  // ID de la campagne active (mis à jour via WebSocket)
  const activeCampaignId = ref<string | null>(null)

  // Éléments visibles uniquement
  const visibleElements = computed(() => elements.value.filter((el) => el.visible))

  /**
   * Charge la configuration depuis l'API
   * @param campaignId - (optionnel) ID de la campagne pour charger la config spécifique
   */
  const fetchConfig = async (campaignId?: string): Promise<void> => {
    if (!streamerId.value) {
      loading.value = false
      return
    }

    loading.value = true
    error.value = null

    try {
      const config = useRuntimeConfig()

      // Construire l'URL avec le paramètre campaign si fourni
      let url = `${config.public.apiBase}/overlay/${streamerId.value}/config`
      if (campaignId) {
        url += `?campaign=${campaignId}`
      }

      const response = await fetch(url, {
        credentials: 'include',
      })

      if (response.ok) {
        const data: OverlayConfigResponse = await response.json()
        elements.value = data.data.config.elements || []
        // Si pas d'éléments, ajouter l'élément dice par défaut pour les tests
        if (elements.value.length === 0) {
          elements.value = [DEFAULT_DICE_ELEMENT]
        }
      } else if (response.status === 404) {
        // Pas de config, utiliser l'élément dice par défaut pour les tests
        elements.value = [DEFAULT_DICE_ELEMENT]
      } else {
        throw new Error(`Failed to fetch config: ${response.status}`)
      }
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
      console.error('Error fetching overlay config:', e)
      elements.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Met à jour la campagne active et recharge la configuration si nécessaire
   */
  const setActiveCampaign = async (campaignId: string | null): Promise<void> => {
    // Ne recharger que si la campagne a changé
    if (activeCampaignId.value !== campaignId) {
      activeCampaignId.value = campaignId
      console.log('[useOverlayConfig] Campaign changed, reloading config for:', campaignId)
      await fetchConfig(campaignId ?? undefined)
    }
  }

  return {
    elements,
    visibleElements,
    loading,
    error,
    hasConfig,
    activeCampaignId,
    fetchConfig,
    setActiveCampaign,
  }
}
