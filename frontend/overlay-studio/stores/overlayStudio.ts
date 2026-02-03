import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  OverlayElement,
  OverlayConfig,
  OverlayConfigData,
  EditMode,
  Vector3,
  OverlayElementType,
  ElementProperties,
  PollProperties,
  PollGamificationConfig,
  DiceProperties,
  DiceReverseProperties,
  DiceReverseGoalBarProperties,
  DiceReverseImpactHudProperties,
  HudTransform,
} from '../types'

/**
 * Valeurs par défaut pour la gamification du poll
 */
const DEFAULT_POLL_GAMIFICATION: PollGamificationConfig = {
  timer: {
    showBadge: true,
    urgentThreshold: 10,
    urgentColor: '#ef4444',
  },
  timeBar: {
    enabled: true,
    shimmerEnabled: true,
    glowEdgeEnabled: true,
    shakeWhenUrgent: true,
    shakeIntensity: 5,
  },
  leader: {
    showCrown: true,
    pulseAnimation: true,
    changeSound: { enabled: true, volume: 0.4 },
  },
  result: {
    displayDuration: 5000,
    winnerColor: '#FFD700',
    winnerScale: 1.05,
    winnerGlow: true,
    winnerGlowColor: '#FFD700',
    loserFadeOut: true,
    loserFadeDuration: 300,
    loserFinalOpacity: 0,
  },
  tieBreaker: {
    showAllWinners: true,
    titleText: 'EX-ÆQUO !',
  },
}

/**
 * Types pour le cache des defaults
 */
type DefaultsType = 'poll' | 'dice' | 'diceReverseGoalBar' | 'diceReverseImpactHud'

/**
 * Store principal pour l'Overlay Studio
 * Gère l'état de l'éditeur et les éléments de l'overlay
 */
export const useOverlayStudioStore = defineStore('overlayStudio', () => {
  // ===== État des configurations =====
  const configs = ref<OverlayConfig[]>([])
  const activeConfigId = ref<string | null>(null)
  const loading = ref(false)
  const saving = ref(false)

  // ===== État de l'éditeur =====
  const elements = ref<OverlayElement[]>([])
  const selectedElementId = ref<string | null>(null)
  const editMode = ref<EditMode>('translate')
  const gridSnap = ref(0.1)
  const showGrid = ref(true)
  const isDragging = ref(false)

  // ===== État de sauvegarde =====
  const isDirty = ref(false)
  const lastSavedSnapshot = ref<string | null>(null)

  // ===== Cache des propriétés par défaut (chargées depuis l'API) =====
  const defaultsCache = ref<Record<DefaultsType, Record<string, unknown> | null>>({
    poll: null,
    dice: null,
    diceReverseGoalBar: null,
    diceReverseImpactHud: null,
  })
  const defaultsLoaded = ref(false)

  // ===== Canvas =====
  const canvasWidth = ref(1920)
  const canvasHeight = ref(1080)

  // ===== Computed =====
  const selectedElement = computed(() => {
    if (!selectedElementId.value) return null
    return elements.value.find((el) => el.id === selectedElementId.value) || null
  })

  const activeConfig = computed(() => {
    if (!activeConfigId.value) return null
    return configs.value.find((c) => c.id === activeConfigId.value) || null
  })

  const visibleElements = computed(() => {
    return elements.value.filter((el) => el.visible)
  })

  /**
   * Éléments visibles triés par zIndex avec l'élément sélectionné en dernier
   * Utilisé par le canvas pour l'ordre de rendu (l'élément sélectionné est au-dessus)
   */
  const sortedVisibleElements = computed(() => {
    const visible = elements.value.filter((el) => el.visible)

    // Trier par zIndex (les plus bas d'abord)
    const sorted = [...visible].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))

    // Si un élément est sélectionné, le déplacer à la fin pour qu'il soit rendu au-dessus
    if (selectedElementId.value) {
      const selectedIndex = sorted.findIndex((el) => el.id === selectedElementId.value)
      if (selectedIndex !== -1) {
        const [selected] = sorted.splice(selectedIndex, 1)
        if (selected) {
          sorted.push(selected)
        }
      }
    }

    return sorted
  })

  // ===== Actions - Chargement des defaults =====

  /**
   * Charge les propriétés par défaut depuis l'API backend
   * Doit être appelé au démarrage de l'Overlay Studio
   */
  async function loadDefaults(): Promise<void> {
    if (defaultsLoaded.value) return

    const config = useRuntimeConfig()
    const API_URL = config.public.apiBase
    const types: DefaultsType[] = ['poll', 'dice', 'diceReverseGoalBar', 'diceReverseImpactHud']

    try {
      const results = await Promise.allSettled(
        types.map(async (type) => {
          const response = await fetch(`${API_URL}/overlay-studio/defaults/${type}`)
          if (!response.ok) throw new Error(`Failed to fetch defaults for ${type}`)
          const data = await response.json()
          return { type, properties: data.data.properties }
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled') {
          defaultsCache.value[result.value.type] = result.value.properties
        }
      }

      defaultsLoaded.value = true
      console.log('[OverlayStudio] Defaults loaded from API')
    } catch (error) {
      console.warn('[OverlayStudio] Failed to load defaults from API, using local fallback:', error)
    }
  }

  // ===== Actions - Éléments =====

  /**
   * Génère un ID unique pour un nouvel élément
   */
  function generateId(): string {
    return `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Crée les propriétés par défaut selon le type d'élément
   * Utilise le cache API si disponible, sinon fallback sur les valeurs locales
   */
  function getDefaultProperties(type: OverlayElementType): ElementProperties {
    // Vérifier si on a des defaults chargés depuis l'API
    const apiDefaults = defaultsCache.value[type as DefaultsType]
    if (apiDefaults) {
      return apiDefaults as unknown as ElementProperties
    }

    // Fallback sur les valeurs locales (utilisé si l'API n'a pas répondu)
    return getLocalDefaultProperties(type)
  }

  /**
   * Propriétés par défaut locales (fallback si l'API échoue)
   * NOTE: Ces valeurs doivent rester synchronisées avec le backend
   */
  function getLocalDefaultProperties(type: OverlayElementType): ElementProperties {
    switch (type) {
      case 'poll':
        return {
          questionStyle: {
            fontFamily: 'Inter',
            fontSize: 48,
            fontWeight: 700,
            color: '#ffffff',
            textShadow: {
              enabled: true,
              color: 'rgba(0, 0, 0, 0.5)',
              blur: 4,
              offsetX: 0,
              offsetY: 2,
            },
          },
          questionBoxStyle: {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            borderWidth: 0,
            borderRadius: 0,
            opacity: 1,
            padding: { top: 0, right: 0, bottom: 16, left: 0 },
          },
          optionBoxStyle: {
            backgroundColor: 'rgba(17, 17, 17, 0.9)',
            borderColor: '#9333ea',
            borderWidth: 2,
            borderRadius: 12,
            opacity: 1,
            padding: { top: 16, right: 24, bottom: 16, left: 24 },
          },
          optionTextStyle: {
            fontFamily: 'Inter',
            fontSize: 24,
            fontWeight: 600,
            color: '#ffffff',
          },
          optionPercentageStyle: {
            fontFamily: 'Inter',
            fontSize: 28,
            fontWeight: 800,
            color: '#e0d0ff',
          },
          optionSpacing: 16,
          medalColors: {
            gold: '#FFD700',
            silver: '#C0C0C0',
            bronze: '#CD7F32',
            base: '#9333ea',
          },
          progressBar: {
            height: 8,
            backgroundColor: 'rgba(147, 51, 234, 0.2)',
            fillColor: '#9333ea',
            fillGradient: {
              enabled: true,
              startColor: '#9333ea',
              endColor: '#ec4899',
            },
            borderRadius: 4,
            position: 'bottom',
            showTimeText: true,
            timeTextStyle: {
              fontFamily: 'Inter',
              fontSize: 20,
              fontWeight: 700,
              color: '#ffffff',
            },
          },
          animations: {
            entry: {
              animation: { duration: 0.5, easing: 'ease-out', delay: 0 },
              slideDirection: 'up',
              sound: { enabled: true, volume: 0.8 },
              soundLeadTime: 1.5,
            },
            loop: {
              music: { enabled: true, volume: 0.3 },
            },
            exit: {
              animation: { duration: 0.5, easing: 'ease-in', delay: 0 },
            },
            result: {
              winnerEnlarge: { scale: 1.1, duration: 0.3 },
              loserFadeOut: { opacity: 0.3, duration: 0.5 },
              sound: { enabled: true, volume: 0.8 },
              displayDuration: 20,
            },
          },
          gamification: DEFAULT_POLL_GAMIFICATION,
          layout: {
            maxWidth: 600,
            minOptionsToShow: 2,
            maxOptionsToShow: 5,
          },
          mockData: {
            question: 'Quelle action pour le héros ?',
            options: ['Attaquer', 'Fuir', 'Négocier', 'Explorer'],
            percentages: [35, 28, 22, 15],
            timeRemaining: 45,
            totalDuration: 60,
          },
        } as PollProperties

      case 'dice':
        return {
          // Configuration DiceBox (rendu 3D) - Dés blancs avec chiffres violet Tumulte
          diceBox: {
            colors: {
              foreground: '#9146FF', // Tumulte Purple pour les chiffres
              background: '#ffffff', // Dés blancs
              outline: 'none',
            },
            texture: 'none',
            material: 'glass',
            lightIntensity: 1.0,
          },
          // Configuration HUD - Style harmonisé avec Goal Bar
          hud: {
            container: {
              backgroundColor: 'rgba(26, 26, 46, 0.98)', // Même que Goal Bar
              borderColor: '#9146FF', // Tumulte Purple
              borderWidth: 2,
              borderRadius: 16,
              padding: { top: 24, right: 24, bottom: 24, left: 24 },
              backdropBlur: 10,
              boxShadow: {
                enabled: true,
                color: 'rgba(145, 70, 255, 0.3)', // Glow violet subtil
                blur: 40,
                offsetX: 0,
                offsetY: 10,
              },
            },
            criticalBadge: {
              successBackground: 'rgba(34, 197, 94, 0.3)',
              successTextColor: '#22c55e',
              successBorderColor: 'rgba(34, 197, 94, 0.5)',
              failureBackground: 'rgba(239, 68, 68, 0.3)',
              failureTextColor: '#ef4444',
              failureBorderColor: 'rgba(239, 68, 68, 0.5)',
            },
            formula: {
              typography: {
                fontFamily: 'Inter',
                fontSize: 20,
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.85)', // Même que Goal Bar progress
              },
            },
            result: {
              typography: {
                fontFamily: 'Inter',
                fontSize: 48,
                fontWeight: 800,
                color: '#ffffff',
              },
              criticalSuccessColor: '#22c55e',
              criticalFailureColor: '#ef4444',
            },
            diceBreakdown: {
              backgroundColor: 'rgba(145, 70, 255, 0.15)', // Tumulte Purple transparent
              borderColor: 'rgba(145, 70, 255, 0.3)',
              borderRadius: 8,
              typography: {
                fontFamily: 'Inter',
                fontSize: 16,
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.85)',
              },
            },
            skillInfo: {
              backgroundColor: 'rgba(145, 70, 255, 0.15)', // Tumulte Purple transparent
              borderColor: 'rgba(145, 70, 255, 0.3)',
              borderRadius: 8,
              skillTypography: {
                fontFamily: 'Inter',
                fontSize: 16,
                fontWeight: 700,
                color: '#ffffff',
              },
              abilityTypography: {
                fontFamily: 'Inter',
                fontSize: 14,
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.7)',
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
          // Couleurs des critiques (glow sur les dés 3D)
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
            diceValues: [18],
            isCritical: false,
            criticalType: null,
          },
        } as DiceProperties

      // Legacy type - kept for backward compatibility
      case 'diceReverse':
        return {
          goalBar: {
            container: {
              backgroundColor: 'rgba(26, 26, 46, 0.98)',
              borderColor: '#9146FF',
              borderWidth: 2,
              borderRadius: 16,
              opacity: 1,
            },
            progressBar: {
              height: 28,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              fillColor: '#9146FF',
              fillGradientEnabled: true,
              fillGradientStart: '#9146FF',
              fillGradientEnd: '#ff6b9d',
              glowColor: '#ffffff',
            },
            shake: {
              startPercent: 70,
              maxIntensity: 8,
            },
            animations: {
              entry: {
                duration: 500,
                easing: 'ease-out',
              },
              exit: {
                duration: 350,
                easing: 'ease-in',
              },
              success: {
                displayDuration: 3000,
              },
            },
            audio: {
              progressSound: { enabled: true, volume: 0.3 },
              successSound: { enabled: true, volume: 0.5 },
            },
            typography: {
              title: {
                fontFamily: 'Inter',
                fontSize: 20,
                fontWeight: 800,
                color: '#ffffff',
              },
              progress: {
                fontFamily: 'Inter',
                fontSize: 16,
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.85)',
              },
              timer: {
                fontFamily: 'Inter',
                fontSize: 18,
                fontWeight: 700,
                color: '#ffffff',
              },
            },
            transform: {
              position: { x: 0, y: 460 },
              scale: 1,
            },
            width: 500,
          },
          impactHud: {
            container: {
              backgroundColor: 'rgba(26, 26, 46, 0.98)',
              borderColor: '#FFD700',
              borderWidth: 3,
              borderRadius: 16,
            },
            animations: {
              dropDistance: 200,
              dropDuration: 150,
              displayDuration: 3000,
            },
            audio: {
              impactSound: { enabled: true, volume: 0.6 },
            },
            typography: {
              title: {
                fontFamily: 'Inter',
                fontSize: 28,
                fontWeight: 900,
                color: '#FFD700',
              },
              detail: {
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: 42,
                fontWeight: 800,
                color: '#ffffff',
              },
            },
            transform: {
              position: { x: 0, y: 0 },
              scale: 1,
            },
          },
          mockData: {
            eventName: '🎲 Critique de Gandalf!',
            currentProgress: 45,
            objectiveTarget: 100,
            timeRemaining: 25,
            isComplete: false,
          },
        } as DiceReverseProperties

      // New separate types for individual canvas elements
      case 'diceReverseGoalBar':
        return {
          container: {
            backgroundColor: 'rgba(26, 26, 46, 0.98)',
            borderColor: '#9146FF',
            borderWidth: 2,
            borderRadius: 16,
            opacity: 1,
          },
          progressBar: {
            height: 28,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            fillColor: '#9146FF',
            fillGradientEnabled: true,
            fillGradientStart: '#9146FF',
            fillGradientEnd: '#ff6b9d',
            glowColor: '#ffffff',
          },
          shake: {
            startPercent: 70,
            maxIntensity: 8,
          },
          animations: {
            entry: { duration: 500, easing: 'ease-out' },
            exit: { duration: 350, easing: 'ease-in' },
            success: { displayDuration: 3000 },
          },
          audio: {
            progressSound: { enabled: true, volume: 0.3 },
            successSound: { enabled: true, volume: 0.5 },
          },
          typography: {
            title: { fontFamily: 'Inter', fontSize: 20, fontWeight: 800, color: '#ffffff' },
            progress: {
              fontFamily: 'Inter',
              fontSize: 16,
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.85)',
            },
            timer: { fontFamily: 'Inter', fontSize: 18, fontWeight: 700, color: '#ffffff' },
          },
          width: 500,
          height: 100, // Approximate height for gizmo
          mockData: {
            eventName: '🎲 Critique de Gandalf!',
            currentProgress: 45,
            objectiveTarget: 100,
            timeRemaining: 25,
            isComplete: false,
          },
        } as DiceReverseGoalBarProperties

      case 'diceReverseImpactHud':
        return {
          container: {
            backgroundColor: 'rgba(26, 26, 46, 0.98)',
            borderColor: '#FFD700',
            borderWidth: 3,
            borderRadius: 16,
          },
          animations: {
            dropDistance: 200,
            dropDuration: 150,
            displayDuration: 3000,
          },
          audio: {
            impactSound: { enabled: true, volume: 0.6 },
          },
          typography: {
            title: { fontFamily: 'Inter', fontSize: 28, fontWeight: 900, color: '#FFD700' },
            detail: {
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: 42,
              fontWeight: 800,
              color: '#ffffff',
            },
          },
          width: 350,
          height: 120, // Approximate height for gizmo
        } as DiceReverseImpactHudProperties
    }
  }

  /**
   * Génère un nom lisible pour un type d'élément
   */
  function getElementDisplayName(type: OverlayElementType): string {
    const names: Record<OverlayElementType, string> = {
      poll: 'Sondage',
      dice: 'Dés 3D',
      diceReverse: 'Inversion',
      diceReverseGoalBar: 'Goal Bar',
      diceReverseImpactHud: 'Impact HUD',
    }
    return names[type] || type
  }

  /**
   * Ajoute un nouvel élément à la scène
   */
  function addElement(
    type: OverlayElementType,
    position: Vector3 = { x: 0, y: 0, z: 0 }
  ): OverlayElement {
    // Les éléments Dice sont toujours centrés et verrouillés (couvrent tout le canvas)
    const isDice = type === 'dice'
    const finalPosition = isDice ? { x: 0, y: 0, z: 0 } : position

    const element: OverlayElement = {
      id: generateId(),
      type,
      name: `${getElementDisplayName(type)} ${elements.value.length + 1}`,
      position: finalPosition,
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      visible: true,
      locked: isDice, // Les Dice sont verrouillés car ils couvrent tout le canvas
      zIndex: 0, // Ordre des calques (0 = base)
      properties: getDefaultProperties(type),
    }

    elements.value.push(element)
    selectedElementId.value = element.id
    isDirty.value = true

    return element
  }

  /**
   * Ajoute les deux éléments DiceReverse (Goal Bar + Impact HUD) en une seule action
   * Appelé quand l'utilisateur clique sur "Inversion" dans le sidebar
   */
  function addDiceReverseElements(): { goalBar: OverlayElement; impactHud: OverlayElement } {
    // Créer la Goal Bar (en haut du canvas)
    const goalBar: OverlayElement = {
      id: generateId(),
      type: 'diceReverseGoalBar',
      name: `Goal Bar ${elements.value.length + 1}`,
      position: { x: 0, y: 400, z: 0 }, // Haut du canvas
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      visible: true,
      locked: false,
      zIndex: 0,
      properties: getDefaultProperties('diceReverseGoalBar'),
    }

    // Créer l'Impact HUD (au centre)
    const impactHud: OverlayElement = {
      id: generateId(),
      type: 'diceReverseImpactHud',
      name: `Impact HUD ${elements.value.length + 2}`,
      position: { x: 0, y: 0, z: 0 }, // Centre du canvas
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      visible: true,
      locked: false,
      zIndex: 1, // Au-dessus de la Goal Bar
      properties: getDefaultProperties('diceReverseImpactHud'),
    }

    elements.value.push(goalBar, impactHud)
    selectedElementId.value = goalBar.id // Sélectionner la Goal Bar par défaut
    isDirty.value = true

    return { goalBar, impactHud }
  }

  /**
   * Supprime un élément
   */
  function removeElement(id: string): void {
    const index = elements.value.findIndex((el) => el.id === id)
    if (index !== -1) {
      elements.value.splice(index, 1)
      if (selectedElementId.value === id) {
        selectedElementId.value = null
      }
      isDirty.value = true
    }
  }

  /**
   * Met à jour un élément
   * Remplace l'élément entier pour garantir la réactivité Vue sur les propriétés imbriquées
   */
  function updateElement(id: string, updates: Partial<OverlayElement>): void {
    const index = elements.value.findIndex((el) => el.id === id)
    if (index !== -1) {
      const element = elements.value[index]
      if (element) {
        // Remplacer l'élément entier pour garantir la réactivité
        elements.value[index] = {
          ...element,
          ...updates,
        }
        isDirty.value = true
      }
    }
  }

  /**
   * Met à jour la position d'un élément
   */
  function updateElementPosition(id: string, position: Vector3): void {
    updateElement(id, { position })
  }

  /**
   * Met à jour la rotation d'un élément
   */
  function updateElementRotation(id: string, rotation: Vector3): void {
    updateElement(id, { rotation })
  }

  /**
   * Met à jour l'échelle d'un élément
   */
  function updateElementScale(id: string, scale: Vector3): void {
    updateElement(id, { scale })
  }

  /**
   * Met à jour le transform du HUD pour un élément dice
   * Permet de positionner et redimensionner le HUD indépendamment de la zone 3D
   */
  function updateDiceHudTransform(id: string, transform: Partial<HudTransform>): void {
    const element = elements.value.find((el) => el.id === id)
    if (!element || element.type !== 'dice') return

    const props = element.properties as DiceProperties
    const currentTransform = props.hudTransform || {
      position: { x: 0, y: -300 },
      scale: 1,
    }

    const newHudTransform: HudTransform = {
      position: {
        ...currentTransform.position,
        ...(transform.position || {}),
      },
      scale: transform.scale ?? currentTransform.scale,
    }

    updateElement(id, {
      properties: {
        ...props,
        hudTransform: newHudTransform,
      },
    })
  }

  /**
   * Duplique un élément
   */
  function duplicateElement(id: string): OverlayElement | null {
    const element = elements.value.find((el) => el.id === id)
    if (!element) return null

    const duplicate: OverlayElement = {
      ...JSON.parse(JSON.stringify(element)),
      id: generateId(),
      name: `${element.name} (copie)`,
      position: {
        x: element.position.x + 0.5,
        y: element.position.y,
        z: element.position.z,
      },
    }

    elements.value.push(duplicate)
    selectedElementId.value = duplicate.id

    return duplicate
  }

  // ===== Actions - Sélection =====

  /**
   * Sélectionne un élément
   */
  function selectElement(id: string | null): void {
    selectedElementId.value = id
  }

  /**
   * Désélectionne l'élément actuel
   */
  function deselectElement(): void {
    selectedElementId.value = null
  }

  // ===== Actions - Mode d'édition =====

  /**
   * Change le mode d'édition
   */
  function setEditMode(mode: EditMode): void {
    editMode.value = mode
  }

  /**
   * Active/désactive la grille
   */
  function toggleGrid(): void {
    showGrid.value = !showGrid.value
  }

  // ===== Actions - Configuration =====

  /**
   * Retourne la configuration actuelle sous forme sérialisable
   */
  function getCurrentConfig(): OverlayConfigData {
    return {
      version: '1.0',
      canvas: {
        width: canvasWidth.value,
        height: canvasHeight.value,
      },
      elements: JSON.parse(JSON.stringify(elements.value)),
    }
  }

  /**
   * Migre les propriétés d'un élément pour ajouter les valeurs par défaut manquantes
   * Cela garantit la rétrocompatibilité avec les configurations créées avant l'ajout de nouvelles propriétés
   */
  function migrateElementProperties(element: OverlayElement): OverlayElement {
    const defaults = getDefaultProperties(element.type)

    // Migration pour ajouter zIndex aux configs existantes
    if (element.zIndex === undefined) {
      element.zIndex = 0
    }

    // Pour les éléments poll, s'assurer que les propriétés existent
    if (element.type === 'poll') {
      const pollProps = element.properties as PollProperties
      const pollDefaults = defaults as PollProperties

      if (!pollProps.questionBoxStyle) {
        pollProps.questionBoxStyle = pollDefaults.questionBoxStyle
      }
      // Migration pour ajouter gamification aux configs existantes
      if (!pollProps.gamification) {
        pollProps.gamification = DEFAULT_POLL_GAMIFICATION
      }
    }

    // Pour les éléments dice, migrer vers la nouvelle structure
    if (element.type === 'dice') {
      const diceProps = element.properties as DiceProperties
      const diceDefaults = defaults as DiceProperties

      // Si l'ancienne structure existe (colors.baseColor), migrer vers la nouvelle
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oldProps = diceProps as any
      if (oldProps.colors?.baseColor !== undefined && !diceProps.diceBox) {
        // Migration de l'ancienne structure vers la nouvelle
        diceProps.diceBox = {
          colors: {
            foreground: oldProps.colors?.numberColor || diceDefaults.diceBox.colors.foreground,
            background: oldProps.colors?.baseColor || diceDefaults.diceBox.colors.background,
            outline: 'none',
          },
          texture: 'none',
          material: 'glass',
          lightIntensity: diceDefaults.diceBox.lightIntensity,
        }
        diceProps.hud = diceDefaults.hud
        diceProps.colors = {
          criticalSuccessGlow:
            oldProps.colors?.criticalSuccessGlow || diceDefaults.colors.criticalSuccessGlow,
          criticalFailureGlow:
            oldProps.colors?.criticalFailureGlow || diceDefaults.colors.criticalFailureGlow,
        }
        // Nettoyer les anciennes propriétés
        delete oldProps.textures
        delete oldProps.physics
        delete oldProps.resultText
        delete oldProps.layout
      }

      // S'assurer que toutes les nouvelles propriétés existent
      if (!diceProps.diceBox) {
        diceProps.diceBox = diceDefaults.diceBox
      } else if (diceProps.diceBox.lightIntensity === undefined) {
        // Migration pour ajouter lightIntensity aux configs existantes
        diceProps.diceBox.lightIntensity = diceDefaults.diceBox.lightIntensity
      }
      if (!diceProps.hud) {
        diceProps.hud = diceDefaults.hud
      }
      // Migration pour ajouter hudTransform aux configs existantes
      if (!diceProps.hudTransform) {
        diceProps.hudTransform = diceDefaults.hudTransform
      }
    }

    return element
  }

  /**
   * Charge une configuration
   */
  function loadConfig(config: OverlayConfigData): void {
    canvasWidth.value = config.canvas.width
    canvasHeight.value = config.canvas.height
    // Migrer les éléments pour ajouter les propriétés manquantes
    elements.value = config.elements.map(migrateElementProperties)
    selectedElementId.value = null
    // Sauvegarder le snapshot initial et marquer comme propre
    lastSavedSnapshot.value = JSON.stringify(config)
    isDirty.value = false
  }

  /**
   * Réinitialise l'éditeur
   */
  function resetEditor(): void {
    elements.value = []
    selectedElementId.value = null
    editMode.value = 'translate'
    canvasWidth.value = 1920
    canvasHeight.value = 1080
    lastSavedSnapshot.value = null
    isDirty.value = false
  }

  /**
   * Marque la configuration actuelle comme sauvegardée
   */
  function markAsSaved(): void {
    lastSavedSnapshot.value = JSON.stringify(getCurrentConfig())
    isDirty.value = false
  }

  /**
   * Restaure un snapshot de l'état (pour undo/redo)
   */
  function restoreSnapshot(snapshot: {
    elements: OverlayElement[]
    selectedElementId: string | null
  }): void {
    elements.value = JSON.parse(JSON.stringify(snapshot.elements))
    selectedElementId.value = snapshot.selectedElementId
  }

  return {
    // État
    configs,
    activeConfigId,
    loading,
    saving,
    elements,
    selectedElementId,
    editMode,
    gridSnap,
    showGrid,
    isDragging,
    canvasWidth,
    canvasHeight,
    isDirty,
    defaultsLoaded,

    // Computed
    selectedElement,
    activeConfig,
    visibleElements,
    sortedVisibleElements,

    // Actions - Initialisation
    loadDefaults,

    // Actions - Éléments
    addElement,
    addDiceReverseElements,
    removeElement,
    updateElement,
    updateElementPosition,
    updateElementRotation,
    updateElementScale,
    updateDiceHudTransform,
    duplicateElement,

    // Actions - Sélection
    selectElement,
    deselectElement,

    // Actions - Mode
    setEditMode,
    toggleGrid,

    // Actions - Configuration
    getCurrentConfig,
    loadConfig,
    resetEditor,
    restoreSnapshot,
    markAsSaved,
  }
})
