import { describe, test, expect } from 'vitest'
import { ref } from 'vue'
import {
  useOverlayElement,
  getDiceConfigFromElement,
  getDiceHudStyleFromElement,
} from '~/composables/useOverlayElement'
import type { OverlayElement, DiceProperties } from '~/overlay-studio/types'

function createMockDiceProperties(): DiceProperties {
  return {
    diceBox: {
      colors: {
        foreground: '#FFFFFF',
        background: '#1A1A1A',
        outline: '#FFD700',
      },
      texture: 'marble',
      material: 'metal',
      lightIntensity: 1.5,
    },
    hud: {
      container: {
        backgroundColor: '#000000',
        borderColor: '#333333',
        borderWidth: 1,
        borderRadius: 8,
        opacity: 0.9,
        padding: { top: 8, right: 12, bottom: 8, left: 12 },
      },
      criticalBadge: {
        successColor: '#22C55E',
        failureColor: '#EF4444',
        fontSize: 14,
        fontWeight: 700,
      },
      formula: {
        fontSize: 12,
        fontWeight: 400,
        color: '#AAAAAA',
      },
      result: {
        fontSize: 48,
        fontWeight: 700,
        color: '#FFFFFF',
      },
      diceBreakdown: {
        fontSize: 10,
        fontWeight: 400,
        color: '#888888',
        showIndividualDice: true,
      },
      skillInfo: {
        fontSize: 11,
        fontWeight: 500,
        color: '#CCCCCC',
        showSkill: true,
        showAbility: true,
      },
      minWidth: 120,
      maxWidth: 300,
    },
    hudTransform: {
      position: { x: 200, y: -100 },
      scale: 1.2,
    },
    colors: {
      criticalSuccessGlow: '#22C55E',
      criticalFailureGlow: '#EF4444',
    },
    audio: {
      rollSound: { enabled: true, volume: 0.8 },
      criticalSuccessSound: { enabled: true, volume: 1.0 },
      criticalFailureSound: { enabled: true, volume: 1.0 },
    },
    animations: {
      entry: { type: 'drop', duration: 500 },
      settle: { timeout: 2000 },
      result: { glowIntensity: 0.8, glowDuration: 1500 },
      exit: { type: 'fade', duration: 300, delay: 3000 },
    },
    mockData: {
      formula: '1d20',
      result: 17,
      diceResults: [17],
      isCritical: false,
      criticalType: null,
      rollType: 'attack',
      skill: 'Attaque au corps à corps',
      ability: 'Force',
    },
  }
}

function createMockDiceElement(overrides: Partial<OverlayElement> = {}): OverlayElement {
  return {
    id: 'dice-1',
    type: 'dice',
    name: 'Dés 3D',
    position: { x: 100, y: 200, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    visible: true,
    locked: false,
    zIndex: 0,
    properties: createMockDiceProperties(),
    ...overrides,
  }
}

function createMockPollElement(): OverlayElement {
  return {
    id: 'poll-1',
    type: 'poll',
    name: 'Sondage',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    visible: true,
    locked: false,
    zIndex: 1,
    properties: {} as any,
  }
}

describe('useOverlayElement Composable', () => {
  // ========================================
  // Type checks
  // ========================================

  test('isDice should be true for dice elements', () => {
    const element = ref(createMockDiceElement())
    const { isDice, isPoll } = useOverlayElement(element)

    expect(isDice.value).toBe(true)
    expect(isPoll.value).toBe(false)
  })

  test('isPoll should be true for poll elements', () => {
    const element = ref(createMockPollElement())
    const { isDice, isPoll } = useOverlayElement(element)

    expect(isDice.value).toBe(false)
    expect(isPoll.value).toBe(true)
  })

  test('should handle undefined element', () => {
    const element = ref<OverlayElement | undefined>(undefined)
    const { isDice, isPoll, diceConfig } = useOverlayElement(element)

    expect(isDice.value).toBe(false)
    expect(isPoll.value).toBe(false)
    expect(diceConfig.value).toBeNull()
  })

  // ========================================
  // diceConfig
  // ========================================

  test('diceConfig should extract dice box configuration', () => {
    const element = ref(createMockDiceElement())
    const { diceConfig } = useOverlayElement(element)

    expect(diceConfig.value).not.toBeNull()
    expect(diceConfig.value!.diceBox).toEqual({
      customColorset: {
        foreground: '#FFFFFF',
        background: '#1A1A1A',
        outline: '#FFD700',
      },
      texture: 'marble',
      material: 'metal',
      lightIntensity: 1.5,
    })
  })

  test('diceConfig should extract HUD transform', () => {
    const element = ref(createMockDiceElement())
    const { diceConfig } = useOverlayElement(element)

    expect(diceConfig.value!.hudTransform).toEqual({
      position: { x: 200, y: -100 },
      scale: 1.2,
    })
  })

  test('diceConfig should extract critical colors', () => {
    const element = ref(createMockDiceElement())
    const { diceConfig } = useOverlayElement(element)

    expect(diceConfig.value!.criticalColors).toEqual({
      criticalSuccessGlow: '#22C55E',
      criticalFailureGlow: '#EF4444',
    })
  })

  test('diceConfig should return null for non-dice elements', () => {
    const element = ref(createMockPollElement())
    const { diceConfig } = useOverlayElement(element)

    expect(diceConfig.value).toBeNull()
  })

  test('diceConfig should provide default hudTransform when missing', () => {
    const diceEl = createMockDiceElement()
    const props = diceEl.properties as DiceProperties
    // Remove hudTransform to test fallback
    ;(props as any).hudTransform = undefined

    const element = ref(diceEl)
    const { diceConfig } = useOverlayElement(element)

    expect(diceConfig.value!.hudTransform).toEqual({
      position: { x: 0, y: 0 },
      scale: 1,
    })
  })

  // ========================================
  // diceHudTransformStyle - coordinate conversion
  // ========================================

  test('diceHudTransformStyle should convert canvas to CSS coordinates', () => {
    const element = ref(createMockDiceElement())
    const { diceHudTransformStyle } = useOverlayElement(element)

    // Canvas X=200 -> CSS left = 960 + 200 = 1160
    // Canvas Y=-100 -> CSS top = 540 - (-100) = 640
    expect(diceHudTransformStyle.value).toEqual({
      position: 'absolute',
      left: '1160px',
      top: '640px',
      transform: 'translate(-50%, -50%) scale(1.2)',
      transformOrigin: 'center center',
    })
  })

  test('diceHudTransformStyle should return empty for non-dice', () => {
    const element = ref(createMockPollElement())
    const { diceHudTransformStyle } = useOverlayElement(element)

    expect(diceHudTransformStyle.value).toEqual({})
  })

  test('diceHudTransformStyle should handle center position (0,0)', () => {
    const diceEl = createMockDiceElement()
    const props = diceEl.properties as DiceProperties
    props.hudTransform = { position: { x: 0, y: 0 }, scale: 1 }

    const element = ref(diceEl)
    const { diceHudTransformStyle } = useOverlayElement(element)

    expect(diceHudTransformStyle.value).toEqual({
      position: 'absolute',
      left: '960px',
      top: '540px',
      transform: 'translate(-50%, -50%) scale(1)',
      transformOrigin: 'center center',
    })
  })

  // ========================================
  // diceContainerStyle
  // ========================================

  test('diceContainerStyle should calculate container dimensions', () => {
    const element = ref(createMockDiceElement())
    const { diceContainerStyle } = useOverlayElement(element)

    expect(diceContainerStyle.value).toEqual({
      position: 'absolute',
      left: '100px',
      top: '200px',
      width: '1920px', // 1920 * 1 (scale.x)
      height: '1080px', // 1080 * 1 (scale.y)
    })
  })

  test('diceContainerStyle should scale with element scale', () => {
    const diceEl = createMockDiceElement()
    diceEl.scale = { x: 0.5, y: 0.5, z: 1 }

    const element = ref(diceEl)
    const { diceContainerStyle } = useOverlayElement(element)

    expect(diceContainerStyle.value).toEqual({
      position: 'absolute',
      left: '100px',
      top: '200px',
      width: '960px', // 1920 * 0.5
      height: '540px', // 1080 * 0.5
    })
  })

  test('diceContainerStyle should return empty for non-dice', () => {
    const element = ref(createMockPollElement())
    const { diceContainerStyle } = useOverlayElement(element)

    expect(diceContainerStyle.value).toEqual({})
  })

  // ========================================
  // Reactivity
  // ========================================

  test('should react to element ref changes', () => {
    const element = ref<OverlayElement | undefined>(createMockDiceElement())
    const { isDice, isPoll, diceConfig } = useOverlayElement(element)

    expect(isDice.value).toBe(true)
    expect(diceConfig.value).not.toBeNull()

    // Switch to poll
    element.value = createMockPollElement()

    expect(isDice.value).toBe(false)
    expect(isPoll.value).toBe(true)
    expect(diceConfig.value).toBeNull()
  })
})

// ========================================
// getDiceConfigFromElement (helper)
// ========================================

describe('getDiceConfigFromElement', () => {
  test('should extract config from dice element', () => {
    const element = createMockDiceElement()
    const config = getDiceConfigFromElement(element)

    expect(config).not.toBeNull()
    expect(config!.diceBox.customColorset.foreground).toBe('#FFFFFF')
    expect(config!.hudTransform.scale).toBe(1.2)
  })

  test('should return null for non-dice element', () => {
    const element = createMockPollElement()
    const config = getDiceConfigFromElement(element)

    expect(config).toBeNull()
  })
})

// ========================================
// getDiceHudStyleFromElement (helper)
// ========================================

describe('getDiceHudStyleFromElement', () => {
  test('should convert canvas to CSS coordinates', () => {
    const element = createMockDiceElement()
    const style = getDiceHudStyleFromElement(element)

    expect(style.position).toBe('absolute')
    expect(style.left).toBe('1160px') // 960 + 200
    expect(style.top).toBe('640px') // 540 - (-100)
  })

  test('should return empty for non-dice element', () => {
    const element = createMockPollElement()
    const style = getDiceHudStyleFromElement(element)

    expect(style).toEqual({})
  })

  test('should provide default transform when hudTransform is missing', () => {
    const element = createMockDiceElement()
    const props = element.properties as DiceProperties
    ;(props as any).hudTransform = undefined

    const style = getDiceHudStyleFromElement(element)

    // Default: position {0,0}, scale 1
    expect(style.left).toBe('960px')
    expect(style.top).toBe('540px')
  })
})
