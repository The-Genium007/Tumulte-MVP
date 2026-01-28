import { computed, unref, type CSSProperties, type MaybeRef } from 'vue'
import type {
  OverlayElement,
  DiceProperties,
  DiceHudConfig,
  DiceCriticalColors,
  HudTransform,
  DiceAudioConfig,
  DiceAnimationsConfig,
} from '@/overlay-studio/types'

/**
 * Configuration extraite pour le composant DiceBox (rendu 3D)
 */
export interface DiceBoxConfig {
  customColorset: {
    foreground: string
    background: string
    outline: string
  }
  texture: string
  material: string
  lightIntensity: number
}

/**
 * Configuration complète extraite pour un élément dice
 */
export interface DiceElementConfig {
  diceBox: DiceBoxConfig
  hud: DiceHudConfig
  criticalColors: DiceCriticalColors
  hudTransform: HudTransform
  audio: DiceAudioConfig
  animations: DiceAnimationsConfig
}

/**
 * Composable générique pour extraire les propriétés d'un élément overlay.
 *
 * Ce composable centralise l'extraction des configurations selon le type d'élément,
 * facilitant la réutilisation et l'extensibilité pour de futurs types d'éléments.
 *
 * @example
 * ```typescript
 * // Avec une ref
 * const { diceConfig, diceHudTransformStyle } = useOverlayElement(diceElementRef)
 *
 * // Avec un élément direct dans un v-for
 * const { diceConfig, diceHudTransformStyle } = useOverlayElement(() => element)
 * ```
 */
export function useOverlayElement(element: MaybeRef<OverlayElement | undefined>) {
  // Computed pour vérifier le type d'élément
  const isDice = computed(() => unref(element)?.type === 'dice')
  const isPoll = computed(() => unref(element)?.type === 'poll')

  /**
   * Configuration complète pour un élément de type dice
   * Retourne null si l'élément n'est pas de type dice
   */
  const diceConfig = computed<DiceElementConfig | null>(() => {
    const el = unref(element)
    if (!el || el.type !== 'dice') return null

    const props = el.properties as DiceProperties

    return {
      diceBox: {
        customColorset: {
          foreground: props.diceBox.colors.foreground,
          background: props.diceBox.colors.background,
          outline: props.diceBox.colors.outline,
        },
        texture: props.diceBox.texture,
        material: props.diceBox.material,
        lightIntensity: props.diceBox.lightIntensity,
      },
      hud: props.hud,
      criticalColors: props.colors,
      hudTransform: props.hudTransform || { position: { x: 0, y: 0 }, scale: 1 },
      audio: props.audio,
      animations: props.animations,
    }
  })

  /**
   * Style CSS pour le positionnement du HUD des dés
   * Convertit les coordonnées canvas (centre à 0,0) vers CSS (top-left)
   */
  const diceHudTransformStyle = computed<CSSProperties>(() => {
    const config = diceConfig.value
    if (!config) return {}

    const transform = config.hudTransform
    // Canvas X: -960 à +960 -> CSS left: 0 à 1920
    // Canvas Y: +540 (haut) à -540 (bas) -> CSS top: 0 à 1080
    const cssLeft = 960 + transform.position.x
    const cssTop = 540 - transform.position.y

    return {
      position: 'absolute',
      left: `${cssLeft}px`,
      top: `${cssTop}px`,
      transform: `translate(-50%, -50%) scale(${transform.scale})`,
      transformOrigin: 'center center',
    }
  })

  /**
   * Style CSS pour le conteneur 3D des dés
   * Basé sur position et scale de l'élément
   */
  const diceContainerStyle = computed<CSSProperties>(() => {
    const el = unref(element)
    if (!el || el.type !== 'dice') return {}

    // Taille de base pour le DiceBox (format overlay standard)
    const baseWidth = 1920
    const baseHeight = 1080

    return {
      position: 'absolute',
      left: `${el.position.x}px`,
      top: `${el.position.y}px`,
      width: `${baseWidth * el.scale.x}px`,
      height: `${baseHeight * el.scale.y}px`,
    }
  })

  return {
    // Type checks
    isDice,
    isPoll,

    // Dice specific
    diceConfig,
    diceHudTransformStyle,
    diceContainerStyle,
  }
}

/**
 * Helper function pour extraire la config dice d'un élément (version non-réactive)
 * Utile dans les templates avec v-for où on ne peut pas utiliser de composables
 */
export function getDiceConfigFromElement(element: OverlayElement): DiceElementConfig | null {
  if (element.type !== 'dice') return null

  const props = element.properties as DiceProperties

  return {
    diceBox: {
      customColorset: {
        foreground: props.diceBox.colors.foreground,
        background: props.diceBox.colors.background,
        outline: props.diceBox.colors.outline,
      },
      texture: props.diceBox.texture,
      material: props.diceBox.material,
      lightIntensity: props.diceBox.lightIntensity,
    },
    hud: props.hud,
    criticalColors: props.colors,
    hudTransform: props.hudTransform || { position: { x: 0, y: 0 }, scale: 1 },
    audio: props.audio,
    animations: props.animations,
  }
}

/**
 * Helper function pour calculer le style CSS du HUD (version non-réactive)
 * Utile dans les templates avec v-for
 */
export function getDiceHudStyleFromElement(element: OverlayElement): CSSProperties {
  if (element.type !== 'dice') return {}

  const props = element.properties as DiceProperties
  const transform = props.hudTransform || { position: { x: 0, y: 0 }, scale: 1 }

  const cssLeft = 960 + transform.position.x
  const cssTop = 540 - transform.position.y

  return {
    position: 'absolute',
    left: `${cssLeft}px`,
    top: `${cssTop}px`,
    transform: `translate(-50%, -50%) scale(${transform.scale})`,
    transformOrigin: 'center center',
  }
}
