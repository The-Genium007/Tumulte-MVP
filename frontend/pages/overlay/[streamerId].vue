<template>
  <div class="overlay">
    <!-- Indicateur de reconnexion discret (point orange) -->
    <div
      v-if="!isWsConnected && isInitialized"
      class="connection-indicator"
      :title="`Reconnexion... (tentative ${reconnectAttempts})`"
    />

    <template v-for="element in visibleElements" :key="element.id">
      <LivePollElement
        v-if="element.type === 'poll'"
        :ref="(el) => setElementRef(element.id, el)"
        :element="element"
        :poll-data="activePoll"
        :percentages="percentages"
        :is-ending="isEnding"
        @state-change="handlePollStateChange"
      />
      <!-- DiceBox pour les éléments de type dice -->
      <div
        v-else-if="element.type === 'dice'"
        class="dice-element"
        :class="{ 'dice-visible': isDice3DVisible, 'dice-hidden': !isDice3DVisible }"
        :style="getDiceContainerStyle(element)"
      >
        <DiceBox
          :notation="currentDiceNotation"
          :custom-colorset="diceBoxConfig?.customColorset"
          :texture="diceBoxConfig?.texture"
          :material="diceBoxConfig?.material"
          :light-intensity="diceBoxConfig?.lightIntensity"
          :sounds="diceAudioConfig?.rollSound.enabled ?? true"
          :volume="(diceAudioConfig?.rollSound.volume ?? 0.7) * 100"
          @roll-complete="handleDiceRollComplete"
        />
      </div>
    </template>

    <!-- Dice Roll Overlay (VTT Integration) - Visibilité contrôlée par la queue -->
    <!-- Position et scale basés sur hudTransform de l'élément dice -->
    <DiceRollOverlay
      :dice-roll="currentDiceRoll"
      :visible="isPopup2DVisible"
      :hud-config="diceHudConfig"
      :critical-colors="diceCriticalColors"
      :style="diceHudTransformStyle"
      @hidden="handleDiceRollHidden"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import LivePollElement from '@/overlay-studio/components/LivePollElement.vue'
import DiceRollOverlay from '@/components/overlay/DiceRollOverlay.vue'
// Note: LiveDiceElement a été remplacé par DiceBox - voir DiceBox.client.vue
import { useWebSocket } from '@/composables/useWebSocket'
import { useOverlayConfig } from '@/composables/useOverlayConfig'
import { useWorkerTimer } from '@/composables/useWorkerTimer'
import { useOBSEvents } from '@/composables/useOBSEvents'
import type { PollStartEvent, DiceRollEvent } from '@/types'
import type { DiceProperties } from '@/overlay-studio/types'

// State pour l'indicateur de connexion
const isWsConnected = ref(true)
const reconnectAttempts = ref(0)
const isInitialized = ref(false)

// Worker timer pour les vérifications périodiques (résistant au throttling OBS)
const workerTimer = useWorkerTimer()

// Events OBS pour détecter les changements de visibilité de la source
const { isOBS, onVisibilityChange, onActiveChange } = useOBSEvents()

// Désactiver tout layout Nuxt
definePageMeta({
  layout: false,
})

// Récupérer le streamerId depuis les paramètres de route
const route = useRoute()
const streamerId = computed(() => route.params.streamerId as string)

// Mode preview activé via query param ?preview=true
const _isPreviewMode = computed(() => route.query.preview === 'true')

// Charger la configuration de l'overlay
const { visibleElements, fetchConfig, setActiveCampaign } = useOverlayConfig(streamerId)

// Récupérer l'élément dice pour extraire les configs HUD
const diceElement = computed(() => visibleElements.value.find((el) => el.type === 'dice'))

// Config HUD depuis l'élément dice
const diceHudConfig = computed(() => {
  if (!diceElement.value) return undefined
  return (diceElement.value.properties as DiceProperties).hud
})

// Couleurs critiques depuis l'élément dice
const diceCriticalColors = computed(() => {
  if (!diceElement.value) return undefined
  return (diceElement.value.properties as DiceProperties).colors
})

// Config DiceBox (couleurs, texture, matériau) depuis l'élément dice
const diceBoxConfig = computed(() => {
  if (!diceElement.value) return undefined
  const props = diceElement.value.properties as DiceProperties
  return {
    customColorset: {
      foreground: props.diceBox.colors.foreground,
      background: props.diceBox.colors.background,
      outline: props.diceBox.colors.outline,
    },
    texture: props.diceBox.texture,
    material: props.diceBox.material,
    lightIntensity: props.diceBox.lightIntensity,
  }
})

// Config audio depuis l'élément dice
const diceAudioConfig = computed(() => {
  if (!diceElement.value) return undefined
  return (diceElement.value.properties as DiceProperties).audio
})

// Style de positionnement du HUD basé sur hudTransform
// Conversion des coordonnées canvas (centre) vers CSS (top-left)
const diceHudTransformStyle = computed(() => {
  if (!diceElement.value) return {}

  const diceProps = diceElement.value.properties as DiceProperties
  const transform = diceProps.hudTransform || { position: { x: 0, y: 0 }, scale: 1 }

  // Conversion: Canvas (centre à 0,0) -> CSS (top-left)
  // Canvas X: -960 à +960 -> CSS left: 0 à 1920
  // Canvas Y: +540 (haut) à -540 (bas) -> CSS top: 0 à 1080
  const cssLeft = 960 + transform.position.x
  const cssTop = 540 - transform.position.y

  return {
    position: 'absolute' as const,
    left: `${cssLeft}px`,
    top: `${cssTop}px`,
    transform: `translate(-50%, -50%) scale(${transform.scale})`,
    transformOrigin: 'center center',
  }
})

// Refs des éléments pour contrôle externe
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const elementRefs = ref<Record<string, any>>({})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setElementRef = (id: string, el: any) => {
  if (el) {
    elementRefs.value[id] = el
    console.log(
      '[Overlay] Element ref set for:',
      id,
      '- has playEntry:',
      typeof el.playEntry === 'function'
    )
  }
}

// État du poll actif
const activePoll = ref<
  | (PollStartEvent & {
      campaign_id?: string
      totalDuration: number
    })
  | null
>(null)
const percentages = ref<Record<number, number>>({})
const isEnding = ref(false)

// =============================================
// Système de queue unifiée pour les dice rolls
// Synchronise les dés 3D (DiceBox) et pop-ups 2D
// =============================================

// Queue unifiée des dice rolls à afficher
const diceRollQueue = ref<DiceRollEvent[]>([])

// Roll actuellement affiché (3D + 2D synchronisés)
const currentDiceRoll = ref<DiceRollEvent | null>(null)

// Notation actuelle pour DiceBox (format: "2d20@5,15" pour résultats forcés)
const currentDiceNotation = ref('')

// État de visibilité des dés 3D (pour le fade out)
const isDice3DVisible = ref(false)

// État de visibilité de la pop-up 2D
const isPopup2DVisible = ref(false)

// Flag indiquant si un roll est en cours de traitement
const isProcessingRoll = ref(false)

// Timer pour la durée d'affichage du roll
const rollDisplayTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

// Constantes de timing
const ROLL_DISPLAY_DURATION = 5000 // 5s d'affichage après animation 3D
const ROLL_FADE_DURATION = 1500 // 1.5s de fade out (doit correspondre au CSS)
const ROLL_DELAY_BETWEEN = 500 // 0.5s entre deux rolls

const { subscribeToStreamerPolls } = useWebSocket()

// Style du container de dés basé sur la position de l'élément
// Note: DiceBox occupe tout l'espace disponible, la position définit le coin supérieur gauche
const getDiceContainerStyle = (element: {
  position: { x: number; y: number }
  scale: { x: number; y: number }
}) => {
  // Taille par défaut pour le DiceBox (1920x1080 = format overlay standard)
  const baseWidth = 1920
  const baseHeight = 1080
  return {
    position: 'absolute' as const,
    left: `${element.position.x}px`,
    top: `${element.position.y}px`,
    width: `${baseWidth * element.scale.x}px`,
    height: `${baseHeight * element.scale.y}px`,
  }
}

// Handler pour quand DiceBox termine un lancer (animation 3D terminée)
const handleDiceRollComplete = (results: unknown) => {
  console.log('[Overlay] DiceBox 3D animation complete:', results)
  // L'animation 3D est terminée, maintenant on attend ROLL_DISPLAY_DURATION
  // avant de lancer le fade out (le timer est déjà programmé dans processNextRoll)
}

// Handler pour les changements d'état du poll (émis par LivePollElement)
const handlePollStateChange = (newState: string) => {
  console.log('[Overlay] Poll state changed to:', newState)

  // Quand le poll passe en hidden, nettoyer l'état pour le prochain poll
  if (newState === 'hidden') {
    setTimeout(() => {
      activePoll.value = null
      percentages.value = {}
      isEnding.value = false
      console.log('[Overlay] Poll state cleared, ready for next poll')
    }, 100)
  }
}

/**
 * Ajoute un dice roll à la queue unifiée
 * Si aucun roll n'est en cours, lance immédiatement le traitement
 */
const handleDiceRoll = (data: DiceRollEvent) => {
  console.log('[Overlay] Dice roll received:', data)

  // SECURITY: Never display hidden rolls on overlay (GM secret rolls)
  if (data.isHidden) {
    console.log('[Overlay] Ignoring hidden roll (GM secret)')
    return
  }

  // Ajouter à la queue
  diceRollQueue.value.push(data)
  console.log('[Overlay] Dice roll added to queue, queue size:', diceRollQueue.value.length)

  // Si aucun roll n'est en cours, lancer le traitement
  if (!isProcessingRoll.value) {
    processNextRoll()
  }
}

/**
 * Traite le prochain roll dans la queue
 * Lance simultanément l'animation 3D et affiche la pop-up 2D
 */
const processNextRoll = () => {
  // Vérifier s'il y a des rolls en attente
  if (diceRollQueue.value.length === 0) {
    console.log('[Overlay] Queue empty, nothing to process')
    isProcessingRoll.value = false
    return
  }

  isProcessingRoll.value = true

  // Récupérer le prochain roll
  const roll = diceRollQueue.value.shift()!
  console.log(
    '[Overlay] Processing roll:',
    roll.rollFormula,
    '- Queue remaining:',
    diceRollQueue.value.length
  )

  // 1. Définir le roll actuel (utilisé par la pop-up 2D)
  currentDiceRoll.value = roll

  // 2. Construire la notation DiceBox avec résultats forcés
  let notation = roll.rollFormula
  if (roll.diceResults && roll.diceResults.length > 0) {
    notation += '@' + roll.diceResults.join(',')
  }
  currentDiceNotation.value = notation

  // 3. Afficher les deux éléments simultanément (3D + 2D)
  isDice3DVisible.value = true
  isPopup2DVisible.value = true

  // 4. Programmer la fin d'affichage
  // On attend ROLL_DISPLAY_DURATION puis on lance le fade out
  if (rollDisplayTimeout.value) {
    clearTimeout(rollDisplayTimeout.value)
  }

  rollDisplayTimeout.value = setTimeout(() => {
    // Lancer le fade out
    isDice3DVisible.value = false
    isPopup2DVisible.value = false

    // Après le fade, passer au roll suivant
    setTimeout(() => {
      currentDiceRoll.value = null
      currentDiceNotation.value = ''

      // Traiter le prochain roll après un petit délai
      setTimeout(() => {
        processNextRoll()
      }, ROLL_DELAY_BETWEEN)
    }, ROLL_FADE_DURATION)
  }, ROLL_DISPLAY_DURATION)
}

/**
 * Handler appelé quand la pop-up 2D a fini sa transition de sortie
 * (Non utilisé dans le nouveau système mais gardé pour compatibilité)
 */
const handleDiceRollHidden = () => {
  console.log('[Overlay] Dice roll popup transition complete')
}

// Variable pour stocker la fonction de désabonnement
let unsubscribe: (() => Promise<void>) | null = null
// Compteur de ticks du worker pour vérification périodique
let lastCheckTick = 0

// Récupérer le poll actif via HTTP (pour chargement initial et récupération après suspension OBS)
const fetchActivePoll = async () => {
  try {
    const config = useRuntimeConfig()
    const response = await fetch(
      `${config.public.apiBase}/overlay/${streamerId.value}/active-poll`,
      { credentials: 'include' }
    )

    if (response.ok) {
      const data = await response.json()
      if (data.data && !activePoll.value) {
        console.log('[Overlay] Fetched active poll from API:', data.data.pollInstanceId)
        const pollData = data.data
        const startTime = new Date(pollData.startedAt).getTime()
        const endsAt = new Date(startTime + pollData.durationSeconds * 1000).toISOString()

        activePoll.value = {
          pollInstanceId: pollData.pollInstanceId,
          title: pollData.title,
          options: pollData.options,
          durationSeconds: pollData.durationSeconds,
          startedAt: pollData.startedAt,
          endsAt,
          totalDuration: pollData.durationSeconds,
        }
        percentages.value = pollData.percentages || {}
        isEnding.value = false
      }
    }
  } catch (error) {
    console.warn('[Overlay] Failed to fetch active poll:', error)
  }
}

// Gérer les changements de visibilité (suspension OBS browser source)
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    console.log('[Overlay] Page became visible, checking state...')
    // Récupérer le poll actif au cas où on aurait raté des events
    fetchActivePoll()
    // Vérifier la connexion WebSocket
    if (!unsubscribe) {
      console.log('[Overlay] WebSocket disconnected, reconnecting...')
      isWsConnected.value = false
      reconnectAttempts.value++
      setupWebSocketSubscription()
    }
  }
}

// Fonction pour (ré)initialiser la subscription WebSocket (déclarée ici pour être accessible dans handleVisibilityChange)
const setupWebSocketSubscription = () => {
  // Nettoyer l'ancienne subscription si elle existe
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }

  unsubscribe = subscribeToStreamerPolls(streamerId.value, {
    onPollStart: async (data) => {
      // Si un campaign_id est présent, recharger la config spécifique à cette campagne
      if (data.campaign_id) {
        console.log('[Overlay] Poll started with campaign:', data.campaign_id)
        await setActiveCampaign(data.campaign_id)
      }

      const totalDuration = data.durationSeconds || 60
      activePoll.value = { ...data, totalDuration }
      isEnding.value = false
    },

    onPollUpdate: (data) => {
      if (activePoll.value?.pollInstanceId === data.pollInstanceId) {
        percentages.value = data.percentages
      }
    },

    onPollEnd: (data) => {
      if (activePoll.value?.pollInstanceId === data.pollInstanceId) {
        percentages.value = data.percentages
        isEnding.value = true
      }
    },

    onPreviewCommand: (data) => {
      console.log('[Overlay] Preview command received:', data)
      const { elementId, command, duration, mockData } = data
      const component = elementRefs.value[elementId]
      if (!component) {
        console.warn('[Overlay] Component not found for elementId:', elementId)
        return
      }

      if (mockData) {
        const now = new Date()
        const fakeEndsAt = new Date(now.getTime() + mockData.timeRemaining * 1000).toISOString()
        activePoll.value = {
          pollInstanceId: `preview-${Date.now()}`,
          title: mockData.question,
          options: mockData.options,
          durationSeconds: mockData.totalDuration,
          startedAt: now.toISOString(),
          endsAt: fakeEndsAt,
          totalDuration: mockData.totalDuration,
        }
        const newPercentages: Record<number, number> = {}
        mockData.percentages.forEach((p: number, i: number) => {
          newPercentages[i] = p
        })
        percentages.value = newPercentages
        isEnding.value = false
      }

      switch (command) {
        case 'playEntry':
          component.playEntry()
          break
        case 'playLoop':
          component.playLoop()
          break
        case 'stopLoop':
          component.stopLoop()
          break
        case 'playResult':
          component.playResult()
          break
        case 'playExit':
          component.playExit()
          break
        case 'playFullSequence':
          component.playFullSequence(duration || 10)
          break
        case 'reset':
          component.reset()
          activePoll.value = null
          percentages.value = {}
          break
      }
    },

    onLeftCampaign: (data) => {
      if (activePoll.value?.campaign_id === data.campaign_id) {
        activePoll.value = null
        isEnding.value = false
      }
    },

    // VTT Integration - Dice Rolls
    onDiceRoll: async (data) => {
      // Recharger la config spécifique à la campagne si nécessaire
      if (data.campaignId) {
        await setActiveCampaign(data.campaignId)
      }
      handleDiceRoll(data)
    },

    onDiceRollCritical: async (data) => {
      // SECURITY: Never display hidden rolls on overlay (GM secret rolls)
      if (data.isHidden) {
        console.log('[Overlay] Ignoring hidden critical roll (GM secret)')
        return
      }

      // Recharger la config spécifique à la campagne si nécessaire
      if (data.campaignId) {
        await setActiveCampaign(data.campaignId)
      }

      // Les rolls critiques passent devant la queue
      if (currentDiceRoll.value) {
        diceRollQueue.value.unshift(data) // Ajouter au début de la queue
      } else {
        currentDiceRoll.value = data
      }
    },
  })

  isWsConnected.value = true
  reconnectAttempts.value = 0
  console.log('[Overlay] WebSocket subscription established')
}

onMounted(async () => {
  console.log('[Overlay] Mounting overlay for streamer:', streamerId.value)

  // Charger la configuration de l'overlay
  await fetchConfig()
  console.log('[Overlay] Config loaded, visible elements:', visibleElements.value.length)

  // Récupérer le poll actif au chargement (recovery après refresh)
  await fetchActivePoll()

  // Marquer comme initialisé (pour l'indicateur de connexion)
  isInitialized.value = true

  // S'abonner aux events de poll
  console.log('[Overlay] ========== SUBSCRIBING TO WEBSOCKET ==========')
  console.log('[Overlay] StreamerId:', streamerId.value)

  // Initialiser la subscription WebSocket
  setupWebSocketSubscription()

  // Écouter les changements de visibilité (OBS browser source suspension)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // Utiliser le Worker Timer pour les vérifications périodiques
  // (résistant au throttling quand l'onglet/source OBS est en arrière-plan)
  workerTimer.onTick(() => {
    lastCheckTick++

    // Vérifier la connexion toutes les 30 secondes (30 ticks à 1s)
    if (lastCheckTick >= 30) {
      lastCheckTick = 0

      if (!unsubscribe) {
        console.log('[Overlay] Worker detected disconnection, attempting reconnect...')
        isWsConnected.value = false
        reconnectAttempts.value++
        setupWebSocketSubscription()
      }

      // Récupérer le poll actif périodiquement pour rattraper les events manqués
      fetchActivePoll()
    }
  })
  workerTimer.start(1000)
  console.log('[Overlay] Worker timer started for connection monitoring')

  // Écouter les events OBS pour récupérer l'état quand la source redevient visible
  if (isOBS.value) {
    console.log('[Overlay] Running in OBS, setting up OBS event listeners')

    onVisibilityChange((visible) => {
      if (visible) {
        console.log('[Overlay] OBS source became visible, syncing state...')
        fetchActivePoll()
        if (!unsubscribe) {
          reconnectAttempts.value++
          setupWebSocketSubscription()
        }
      }
    })

    onActiveChange((active) => {
      if (active) {
        console.log('[Overlay] OBS source became active, syncing state...')
        fetchActivePoll()
      }
    })
  }
})

// Nettoyage au démontage
onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }

  // Arrêter le worker timer (cleanup automatique via le composable)
  workerTimer.stop()

  // Nettoyer le timer d'affichage des rolls
  if (rollDisplayTimeout.value) {
    clearTimeout(rollDisplayTimeout.value)
  }

  // Retirer le listener de visibilité
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style>
/* Reset complet pour OBS */
html,
body,
#__nuxt {
  margin: 0;
  padding: 0;
  background: transparent !important;
  overflow: hidden;
}
</style>

<style scoped>
.overlay {
  width: 100vw;
  height: 100vh;
  position: relative;
  background: transparent;
  overflow: hidden;
}

/* Indicateur de reconnexion discret (point orange) */
.connection-indicator {
  position: fixed;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background-color: #f97316;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
  z-index: 9999;
  opacity: 0.8;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

/* Container pour DiceBox */
.dice-element {
  z-index: 10;
  transition: opacity 1.5s ease-out;
}

/* États de visibilité des dés 3D */
.dice-visible {
  opacity: 1;
}

.dice-hidden {
  opacity: 0;
  pointer-events: none;
}
</style>
