import type { ComputedRef } from 'vue'
import type {
  OverlayElement,
  DiceProperties,
  PollProperties,
  DiceReverseProperties,
  DiceReverseGoalBarProperties,
  DiceReverseImpactHudProperties,
  TypographySettings,
  BoxStyleSettings,
  MedalColors,
  ProgressBarConfig,
  PollAnimationsConfig,
  PollGamificationConfig,
  PollMockData,
} from '../types'
import { deepMerge } from './usePropertyUpdater'

/**
 * Composable pour gérer les mises à jour des propriétés d'éléments dans le studio
 * Encapsule la logique de deep-merge pour les éléments Dice et Poll
 */
export function useElementUpdater(
  selectedElement: ComputedRef<OverlayElement | null>,
  updateElement: (id: string, updates: Partial<OverlayElement>) => void,
  onUpdate: (label: string, debounceKey: string) => void
) {
  // ===== Utilitaire de mise à jour de propriété par chemin =====

  function updatePropertyByPath(
    path: string,
    value: unknown,
    elementType: 'dice' | 'poll' | 'diceReverse' | 'diceReverseGoalBar' | 'diceReverseImpactHud'
  ): void {
    if (!selectedElement.value || selectedElement.value.type !== elementType) return

    const props = selectedElement.value.properties
    const keys = path.split('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newProps = JSON.parse(JSON.stringify(props)) as any

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = newProps
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (key) {
        current = current[key]
      }
    }
    const lastKey = keys[keys.length - 1]
    if (lastKey) {
      current[lastKey] = value
    }

    updateElement(selectedElement.value.id, { properties: newProps })
    onUpdate(`Modifier ${path}`, `${elementType}.${path}`)
  }

  // ===== Dice Updates =====

  function updateDiceProperty(path: string, value: unknown): void {
    updatePropertyByPath(path, value, 'dice')
  }

  function updateDiceBox(diceBox: Partial<DiceProperties['diceBox']>): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as DiceProperties
    const merged = deepMerge(props.diceBox, diceBox)
    updateDiceProperty('diceBox', merged)
  }

  function updateDiceHud(hud: Partial<DiceProperties['hud']>): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as DiceProperties
    const merged = deepMerge(props.hud, hud)
    updateDiceProperty('hud', merged)
  }

  function updateDiceColors(colors: Partial<DiceProperties['colors']>): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as DiceProperties
    updateDiceProperty('colors', { ...props.colors, ...colors })
  }

  function updateDiceAnimations(animations: Partial<DiceProperties['animations']>): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as DiceProperties
    const merged = deepMerge(props.animations, animations)
    updateDiceProperty('animations', merged)
  }

  function updateDiceAudio(audio: Partial<DiceProperties['audio']>): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as DiceProperties
    const merged = deepMerge(props.audio, audio)
    updateDiceProperty('audio', merged)
  }

  function updateDiceMockData(mockData: Partial<DiceProperties['mockData']>): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as DiceProperties
    updateDiceProperty('mockData', { ...props.mockData, ...mockData })
  }

  // ===== Poll Updates =====

  function updatePollProperty(path: string, value: unknown): void {
    updatePropertyByPath(path, value, 'poll')
  }

  function updatePollQuestionStyle(style: Partial<TypographySettings>): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as PollProperties
    const merged = deepMerge(props.questionStyle, style)
    updatePollProperty('questionStyle', merged)
  }

  function updatePollQuestionBoxStyle(style: Partial<BoxStyleSettings>): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as PollProperties
    const defaultQuestionBoxStyle = {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: 0,
      opacity: 1,
      padding: { top: 0, right: 0, bottom: 16, left: 0 },
    }
    const base = { ...defaultQuestionBoxStyle, ...props.questionBoxStyle }
    const merged = deepMerge(base, style)
    updatePollProperty('questionBoxStyle', merged)
  }

  function updatePollOptionBoxStyle(style: Partial<BoxStyleSettings>): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as PollProperties
    const merged = deepMerge(props.optionBoxStyle, style)
    updatePollProperty('optionBoxStyle', merged)
  }

  function updatePollOptionTextStyle(style: Partial<TypographySettings>): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as PollProperties
    const merged = deepMerge(props.optionTextStyle, style)
    updatePollProperty('optionTextStyle', merged)
  }

  function updatePollPercentageStyle(style: Partial<TypographySettings>): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as PollProperties
    updatePollProperty('optionPercentageStyle', { ...props.optionPercentageStyle, ...style })
  }

  function updatePollOptionSpacing(spacing: number): void {
    updatePollProperty('optionSpacing', spacing)
  }

  function updatePollMedalColors(colors: Partial<MedalColors>): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as PollProperties
    updatePollProperty('medalColors', { ...props.medalColors, ...colors })
  }

  function updatePollProgressBar(config: Partial<ProgressBarConfig>): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as PollProperties
    const merged = deepMerge(props.progressBar, config)
    updatePollProperty('progressBar', merged)
  }

  function updatePollAnimations(animations: Partial<PollAnimationsConfig>): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as PollProperties
    const merged = deepMerge(props.animations, animations)
    updatePollProperty('animations', merged)
  }

  function updatePollGamification(gamification: Partial<PollGamificationConfig>): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as PollProperties
    const merged = deepMerge(props.gamification, gamification)
    updatePollProperty('gamification', merged)
  }

  function updatePollLayout(
    layout: Partial<{ maxWidth: number; minOptionsToShow: number; maxOptionsToShow: number }>
  ): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as PollProperties
    updatePollProperty('layout', { ...props.layout, ...layout })
  }

  function updatePollMockData(mockData: Partial<PollMockData>): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as PollProperties
    updatePollProperty('mockData', { ...props.mockData, ...mockData })
  }

  // ===== Dice Reverse Updates =====

  function updateDiceReverseProperty(path: string, value: unknown): void {
    updatePropertyByPath(path, value, 'diceReverse')
  }

  function updateDiceReverseGoalBar(goalBar: Partial<DiceReverseProperties['goalBar']>): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as DiceReverseProperties
    const merged = deepMerge(props.goalBar, goalBar)
    updateDiceReverseProperty('goalBar', merged)
  }

  function updateDiceReverseImpactHud(
    impactHud: Partial<DiceReverseProperties['impactHud']>
  ): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as DiceReverseProperties
    const merged = deepMerge(props.impactHud, impactHud)
    updateDiceReverseProperty('impactHud', merged)
  }

  function updateDiceReverseMockData(mockData: Partial<DiceReverseProperties['mockData']>): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as DiceReverseProperties
    updateDiceReverseProperty('mockData', { ...props.mockData, ...mockData })
  }

  // ===== Goal Bar (Separate Element) Updates =====

  function updateGoalBarProperty(path: string, value: unknown): void {
    updatePropertyByPath(path, value, 'diceReverseGoalBar')
  }

  function updateGoalBarContainer(key: string, value: string | number): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as DiceReverseGoalBarProperties
    updateGoalBarProperty('container', { ...props.container, [key]: value })
  }

  function updateGoalBarProgressBar(key: string, value: string | number | boolean): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as DiceReverseGoalBarProperties
    updateGoalBarProperty('progressBar', { ...props.progressBar, [key]: value })
  }

  function updateGoalBarShake(key: string, value: number): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as DiceReverseGoalBarProperties
    updateGoalBarProperty('shake', { ...props.shake, [key]: value })
  }

  function updateGoalBarMockData(key: string, value: string | number | boolean): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as DiceReverseGoalBarProperties
    updateGoalBarProperty('mockData', { ...props.mockData, [key]: value })
  }

  function updateGoalBarTypography(section: string, key: string, value: string | number): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as DiceReverseGoalBarProperties
    const currentTypography = props.typography[section as keyof typeof props.typography]
    updateGoalBarProperty('typography', {
      ...props.typography,
      [section]: { ...currentTypography, [key]: value },
    })
  }

  function updateGoalBarWidth(value: number): void {
    updateGoalBarProperty('width', value)
  }

  function updateGoalBarAudio(key: string, value: { enabled: boolean; volume: number }): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as DiceReverseGoalBarProperties
    updateGoalBarProperty('audio', { ...props.audio, [key]: value })
  }

  // ===== Impact HUD (Separate Element) Updates =====

  function updateImpactHudProperty(path: string, value: unknown): void {
    updatePropertyByPath(path, value, 'diceReverseImpactHud')
  }

  function updateImpactHudContainer(key: string, value: string | number): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as DiceReverseImpactHudProperties
    updateImpactHudProperty('container', { ...props.container, [key]: value })
  }

  function updateImpactHudAnimations(key: string, value: number): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as DiceReverseImpactHudProperties
    updateImpactHudProperty('animations', { ...props.animations, [key]: value })
  }

  function updateImpactHudAudio(key: string, value: { enabled: boolean; volume: number }): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as DiceReverseImpactHudProperties
    updateImpactHudProperty('audio', { ...props.audio, [key]: value })
  }

  function updateImpactHudTypography(section: string, key: string, value: string | number): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as DiceReverseImpactHudProperties
    const currentTypography = props.typography[section as keyof typeof props.typography]
    updateImpactHudProperty('typography', {
      ...props.typography,
      [section]: { ...currentTypography, [key]: value },
    })
  }

  function updateImpactHudWidth(value: number): void {
    updateImpactHudProperty('width', value)
  }

  return {
    // Dice
    updateDiceProperty,
    updateDiceBox,
    updateDiceHud,
    updateDiceColors,
    updateDiceAnimations,
    updateDiceAudio,
    updateDiceMockData,
    // Poll
    updatePollProperty,
    updatePollQuestionStyle,
    updatePollQuestionBoxStyle,
    updatePollOptionBoxStyle,
    updatePollOptionTextStyle,
    updatePollPercentageStyle,
    updatePollOptionSpacing,
    updatePollMedalColors,
    updatePollProgressBar,
    updatePollAnimations,
    updatePollGamification,
    updatePollLayout,
    updatePollMockData,
    // Dice Reverse (legacy)
    updateDiceReverseProperty,
    updateDiceReverseGoalBar,
    updateDiceReverseImpactHud,
    updateDiceReverseMockData,
    // Goal Bar (separate element)
    updateGoalBarProperty,
    updateGoalBarContainer,
    updateGoalBarProgressBar,
    updateGoalBarShake,
    updateGoalBarMockData,
    updateGoalBarTypography,
    updateGoalBarWidth,
    updateGoalBarAudio,
    // Impact HUD (separate element)
    updateImpactHudProperty,
    updateImpactHudContainer,
    updateImpactHudAnimations,
    updateImpactHudAudio,
    updateImpactHudTypography,
    updateImpactHudWidth,
  }
}
