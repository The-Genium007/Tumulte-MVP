import type { ComputedRef } from 'vue'
import type {
  OverlayElement,
  OverlayElementType,
  DiceProperties,
  PollProperties,
  DiceReverseProperties,
  DiceReverseGoalBarProperties,
  DiceReverseImpactHudProperties,
  SpellGoalBarProperties,
  SpellImpactHudProperties,
  MonsterGoalBarProperties,
  MonsterImpactHudProperties,
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
    elementType: OverlayElementType
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

  // ===== Spell Goal Bar Updates =====

  function updateSpellGoalBarProperty(path: string, value: unknown): void {
    updatePropertyByPath(path, value, 'spellGoalBar')
  }

  function updateSpellGoalBarContainer(key: string, value: string | number): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as SpellGoalBarProperties
    updateSpellGoalBarProperty('container', { ...props.container, [key]: value })
  }

  function updateSpellGoalBarProgressBar(key: string, value: string | number | boolean): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as SpellGoalBarProperties
    updateSpellGoalBarProperty('progressBar', { ...props.progressBar, [key]: value })
  }

  function updateSpellGoalBarShake(key: string, value: number): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as SpellGoalBarProperties
    updateSpellGoalBarProperty('shake', { ...props.shake, [key]: value })
  }

  function updateSpellGoalBarMockData(key: string, value: string | number | boolean): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as SpellGoalBarProperties
    updateSpellGoalBarProperty('mockData', { ...props.mockData, [key]: value })
  }

  function updateSpellGoalBarTypography(
    section: string,
    key: string,
    value: string | number
  ): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as SpellGoalBarProperties
    const currentTypography = props.typography[section as keyof typeof props.typography]
    updateSpellGoalBarProperty('typography', {
      ...props.typography,
      [section]: { ...currentTypography, [key]: value },
    })
  }

  function updateSpellGoalBarWidth(value: number): void {
    updateSpellGoalBarProperty('width', value)
  }

  function updateSpellGoalBarAudio(key: string, value: { enabled: boolean; volume: number }): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as SpellGoalBarProperties
    updateSpellGoalBarProperty('audio', { ...props.audio, [key]: value })
  }

  // ===== Spell Impact HUD Updates =====

  function updateSpellImpactHudProperty(path: string, value: unknown): void {
    updatePropertyByPath(path, value, 'spellImpactHud')
  }

  function updateSpellImpactHudContainer(key: string, value: string | number): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as SpellImpactHudProperties
    updateSpellImpactHudProperty('container', { ...props.container, [key]: value })
  }

  function updateSpellImpactHudAnimations(key: string, value: number): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as SpellImpactHudProperties
    updateSpellImpactHudProperty('animations', { ...props.animations, [key]: value })
  }

  function updateSpellImpactHudAudio(
    key: string,
    value: { enabled: boolean; volume: number }
  ): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as SpellImpactHudProperties
    updateSpellImpactHudProperty('audio', { ...props.audio, [key]: value })
  }

  function updateSpellImpactHudTypography(
    section: string,
    key: string,
    value: string | number
  ): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as SpellImpactHudProperties
    const currentTypography = props.typography[section as keyof typeof props.typography]
    updateSpellImpactHudProperty('typography', {
      ...props.typography,
      [section]: { ...currentTypography, [key]: value },
    })
  }

  function updateSpellImpactHudWidth(value: number): void {
    updateSpellImpactHudProperty('width', value)
  }

  // ===== Monster Goal Bar Updates =====

  function updateMonsterGoalBarProperty(path: string, value: unknown): void {
    updatePropertyByPath(path, value, 'monsterGoalBar')
  }

  function updateMonsterGoalBarContainer(key: string, value: string | number): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as MonsterGoalBarProperties
    updateMonsterGoalBarProperty('container', { ...props.container, [key]: value })
  }

  function updateMonsterGoalBarProgressBar(key: string, value: string | number | boolean): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as MonsterGoalBarProperties
    updateMonsterGoalBarProperty('progressBar', { ...props.progressBar, [key]: value })
  }

  function updateMonsterGoalBarShake(key: string, value: number): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as MonsterGoalBarProperties
    updateMonsterGoalBarProperty('shake', { ...props.shake, [key]: value })
  }

  function updateMonsterGoalBarMockData(key: string, value: string | number | boolean): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as MonsterGoalBarProperties
    updateMonsterGoalBarProperty('mockData', { ...props.mockData, [key]: value })
  }

  function updateMonsterGoalBarTypography(
    section: string,
    key: string,
    value: string | number
  ): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as MonsterGoalBarProperties
    const currentTypography = props.typography[section as keyof typeof props.typography]
    updateMonsterGoalBarProperty('typography', {
      ...props.typography,
      [section]: { ...currentTypography, [key]: value },
    })
  }

  function updateMonsterGoalBarWidth(value: number): void {
    updateMonsterGoalBarProperty('width', value)
  }

  function updateMonsterGoalBarAudio(
    key: string,
    value: { enabled: boolean; volume: number }
  ): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as MonsterGoalBarProperties
    updateMonsterGoalBarProperty('audio', { ...props.audio, [key]: value })
  }

  // ===== Monster Impact HUD Updates =====

  function updateMonsterImpactHudProperty(path: string, value: unknown): void {
    updatePropertyByPath(path, value, 'monsterImpactHud')
  }

  function updateMonsterImpactHudContainer(key: string, value: string | number): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as MonsterImpactHudProperties
    updateMonsterImpactHudProperty('container', { ...props.container, [key]: value })
  }

  function updateMonsterImpactHudAnimations(key: string, value: number): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as MonsterImpactHudProperties
    updateMonsterImpactHudProperty('animations', { ...props.animations, [key]: value })
  }

  function updateMonsterImpactHudAudio(
    key: string,
    value: { enabled: boolean; volume: number }
  ): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as MonsterImpactHudProperties
    updateMonsterImpactHudProperty('audio', { ...props.audio, [key]: value })
  }

  function updateMonsterImpactHudTypography(
    section: string,
    key: string,
    value: string | number
  ): void {
    if (!selectedElement.value) return
    const props = selectedElement.value.properties as MonsterImpactHudProperties
    const currentTypography = props.typography[section as keyof typeof props.typography]
    updateMonsterImpactHudProperty('typography', {
      ...props.typography,
      [section]: { ...currentTypography, [key]: value },
    })
  }

  function updateMonsterImpactHudWidth(value: number): void {
    updateMonsterImpactHudProperty('width', value)
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
    // Spell Goal Bar
    updateSpellGoalBarContainer,
    updateSpellGoalBarProgressBar,
    updateSpellGoalBarShake,
    updateSpellGoalBarMockData,
    updateSpellGoalBarTypography,
    updateSpellGoalBarWidth,
    updateSpellGoalBarAudio,
    // Spell Impact HUD
    updateSpellImpactHudContainer,
    updateSpellImpactHudAnimations,
    updateSpellImpactHudAudio,
    updateSpellImpactHudTypography,
    updateSpellImpactHudWidth,
    // Monster Goal Bar
    updateMonsterGoalBarContainer,
    updateMonsterGoalBarProgressBar,
    updateMonsterGoalBarShake,
    updateMonsterGoalBarMockData,
    updateMonsterGoalBarTypography,
    updateMonsterGoalBarWidth,
    updateMonsterGoalBarAudio,
    // Monster Impact HUD
    updateMonsterImpactHudContainer,
    updateMonsterImpactHudAnimations,
    updateMonsterImpactHudAudio,
    updateMonsterImpactHudTypography,
    updateMonsterImpactHudWidth,
  }
}
