<template>
  <div class="preview-controls">
    <!-- Header -->
    <div class="controls-header">
      <h3 class="controls-title">Contrôles</h3>
    </div>

    <!-- Catégorisé par type -->
    <template v-for="category in elementCategories" :key="category.key">
      <div v-if="category.elements.length > 0" class="controls-section">
        <div class="category-header">
          <UIcon :name="category.icon" :class="['size-4', category.iconClass]" />
          <h4 class="section-title">{{ category.label }}</h4>
        </div>
        <div class="elements-accordion">
          <div v-for="element in category.elements" :key="element.id" class="accordion-item">
            <!-- Accordion Header -->
            <div
              class="accordion-header"
              :class="{ selected: selectedElementId === element.id }"
              @click="$emit('selectElement', element.id)"
            >
              <UIcon
                :name="
                  selectedElementId === element.id
                    ? 'i-heroicons-chevron-down'
                    : 'i-heroicons-chevron-right'
                "
                class="accordion-chevron"
              />
              <span class="element-name">{{ element.name }}</span>
              <UBadge size="xs" color="neutral" variant="subtle">
                {{ getElementTypeLabel(element.type) }}
              </UBadge>
            </div>

            <!-- Accordion Content (appears directly under the header when selected) -->
            <Transition name="accordion">
              <div v-if="selectedElementId === element.id" class="accordion-content">
                <!-- Poll Controls -->
                <template v-if="element.type === 'poll'">
                  <div class="animation-buttons">
                    <UButton
                      color="primary"
                      variant="soft"
                      icon="i-heroicons-play"
                      size="sm"
                      :disabled="isPlaying"
                      @click="$emit('playEntry')"
                    >
                      Entry
                    </UButton>
                    <UButton
                      color="primary"
                      variant="soft"
                      icon="i-heroicons-arrow-path"
                      size="sm"
                      :disabled="currentState !== 'active'"
                      @click="handleLoopToggle"
                    >
                      {{ isLoopPlaying ? 'Stop' : 'Loop' }}
                    </UButton>
                    <UButton
                      color="primary"
                      variant="soft"
                      icon="i-heroicons-trophy"
                      size="sm"
                      :disabled="currentState !== 'active' && currentState !== 'result'"
                      @click="$emit('playResult')"
                    >
                      Result
                    </UButton>
                    <UButton
                      color="primary"
                      variant="soft"
                      icon="i-heroicons-arrow-right-start-on-rectangle"
                      size="sm"
                      :disabled="currentState === 'hidden' || currentState === 'exiting'"
                      @click="$emit('playExit')"
                    >
                      Exit
                    </UButton>
                  </div>

                  <UButton
                    block
                    color="primary"
                    icon="i-heroicons-play-circle"
                    size="sm"
                    :disabled="isPlaying"
                    @click="$emit('playFullSequence')"
                  >
                    Séquence complète
                  </UButton>
                  <UButton
                    block
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-arrow-path"
                    size="sm"
                    @click="$emit('reset')"
                  >
                    Reset
                  </UButton>

                  <div class="current-state">
                    <span class="state-label">État:</span>
                    <UBadge :color="getStateColor(currentState)" variant="subtle" size="sm">
                      {{ currentState }}
                    </UBadge>
                  </div>
                </template>

                <!-- Dice Controls -->
                <template v-else-if="element.type === 'dice'">
                  <!-- Type de dé -->
                  <div class="control-group">
                    <span class="field-label">Type de dé</span>
                    <div class="dice-type-buttons">
                      <UButton
                        v-for="dieType in standardDiceTypes"
                        :key="dieType"
                        :color="selectedDiceType === dieType ? 'primary' : 'neutral'"
                        :variant="selectedDiceType === dieType ? 'solid' : 'soft'"
                        size="xs"
                        @click="selectedDiceType = dieType"
                      >
                        {{ dieType }}
                      </UButton>
                    </div>
                  </div>

                  <!-- Nombre de dés -->
                  <div class="control-group">
                    <span class="field-label">Nombre de dés</span>
                    <div class="dice-count-controls">
                      <UButton
                        color="neutral"
                        variant="soft"
                        size="xs"
                        square
                        :disabled="diceCount <= 1"
                        @click="diceCount = Math.max(1, diceCount - 1)"
                      >
                        <UIcon name="i-heroicons-minus" />
                      </UButton>
                      <span class="dice-count-value">{{ diceCount }}</span>
                      <UButton
                        color="neutral"
                        variant="soft"
                        size="xs"
                        square
                        :disabled="diceCount >= 10"
                        @click="diceCount = Math.min(10, diceCount + 1)"
                      >
                        <UIcon name="i-heroicons-plus" />
                      </UButton>
                    </div>
                  </div>

                  <!-- Résultat attendu -->
                  <div class="control-group">
                    <span class="field-label">
                      Résultat
                      <span class="result-range">({{ resultMin }} - {{ resultMax }})</span>
                    </span>
                    <div class="result-input-group">
                      <UInput
                        v-model.number="expectedResult"
                        type="number"
                        :min="resultMin"
                        :max="resultMax"
                        size="sm"
                        class="result-input"
                      />
                      <span class="result-formula">{{ diceCount }}{{ selectedDiceType }}</span>
                    </div>
                  </div>

                  <UButton
                    block
                    color="primary"
                    icon="i-lucide-dices"
                    size="sm"
                    :disabled="isPlaying"
                    @click="handleRollDice"
                  >
                    Lancer les dés
                  </UButton>
                  <UButton
                    block
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-arrow-path"
                    size="sm"
                    @click="$emit('reset')"
                  >
                    Reset
                  </UButton>

                  <div class="current-state">
                    <span class="state-label">État:</span>
                    <UBadge :color="getStateColor(currentState)" variant="subtle" size="sm">
                      {{ currentState }}
                    </UBadge>
                  </div>
                </template>

                <!-- Dice Reverse Goal Bar Controls -->
                <template v-else-if="element.type === 'diceReverseGoalBar'">
                  <div class="control-group">
                    <span class="field-label">Progression simulée</span>
                    <USlider v-model="goalBarProgress" :min="0" :max="100" :step="5" size="sm" />
                    <span class="progress-value">{{ goalBarProgress }}%</span>
                  </div>

                  <UButton
                    block
                    color="primary"
                    icon="i-heroicons-play"
                    size="sm"
                    @click="handleShowGoalBar"
                  >
                    Afficher la Goal Bar
                  </UButton>
                  <UButton
                    block
                    color="success"
                    variant="soft"
                    icon="i-heroicons-check-circle"
                    size="sm"
                    @click="handleGoalBarComplete"
                  >
                    Simuler objectif atteint
                  </UButton>
                  <UButton
                    block
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-eye-slash"
                    size="sm"
                    @click="handleHideGoalBar"
                  >
                    Masquer
                  </UButton>
                </template>

                <!-- Dice Reverse Impact HUD Controls -->
                <template v-else-if="element.type === 'diceReverseImpactHud'">
                  <div class="control-group">
                    <span class="field-label">Type d'action</span>
                    <USelect v-model="impactActionType" :items="impactActionTypes" size="sm" />
                  </div>

                  <div v-if="impactActionType === 'dice_invert'" class="control-group">
                    <span class="field-label">Valeurs du dé</span>
                    <div class="dice-values-row">
                      <UInput
                        v-model.number="impactOriginalValue"
                        type="number"
                        :min="1"
                        :max="20"
                        size="sm"
                        placeholder="Original"
                        class="dice-value-input"
                      />
                      <UIcon name="i-heroicons-arrow-right" class="arrow-icon" />
                      <UInput
                        v-model.number="impactInvertedValue"
                        type="number"
                        :min="1"
                        :max="20"
                        size="sm"
                        placeholder="Inversé"
                        class="dice-value-input"
                      />
                    </div>
                  </div>

                  <UButton
                    block
                    color="primary"
                    icon="i-heroicons-bolt"
                    size="sm"
                    @click="handleShowImpactHud"
                  >
                    Déclencher l'animation
                  </UButton>
                </template>

                <!-- Spell Goal Bar Controls -->
                <template v-else-if="element.type === 'spellGoalBar'">
                  <div class="control-group">
                    <span class="field-label">Type de sort</span>
                    <USelect v-model="spellActionType" :items="spellActionTypes" size="sm" />
                  </div>

                  <div class="control-group">
                    <span class="field-label">Progression simulée</span>
                    <USlider
                      v-model="spellGoalBarProgress"
                      :min="0"
                      :max="100"
                      :step="5"
                      size="sm"
                    />
                    <span class="progress-value">{{ spellGoalBarProgress }}%</span>
                  </div>

                  <UButton
                    block
                    color="primary"
                    icon="i-lucide-sparkles"
                    size="sm"
                    @click="handleShowSpellGoalBar"
                  >
                    Afficher la Goal Bar
                  </UButton>
                  <UButton
                    block
                    color="success"
                    variant="soft"
                    icon="i-heroicons-check-circle"
                    size="sm"
                    @click="handleSpellGoalBarComplete"
                  >
                    Simuler objectif atteint
                  </UButton>
                  <UButton
                    block
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-eye-slash"
                    size="sm"
                    @click="$emit('hideSpellGoalBar')"
                  >
                    Masquer
                  </UButton>
                </template>

                <!-- Spell Impact HUD Controls -->
                <template v-else-if="element.type === 'spellImpactHud'">
                  <div class="control-group">
                    <span class="field-label">Type de sort</span>
                    <USelect
                      v-model="spellImpactActionType"
                      :items="spellImpactActionTypes"
                      size="sm"
                    />
                  </div>

                  <UButton
                    block
                    color="primary"
                    icon="i-heroicons-bolt"
                    size="sm"
                    @click="handleShowSpellImpactHud"
                  >
                    Déclencher l'animation
                  </UButton>
                </template>

                <!-- Monster Goal Bar Controls -->
                <template v-else-if="element.type === 'monsterGoalBar'">
                  <div class="control-group">
                    <span class="field-label">Type de combat</span>
                    <USelect v-model="monsterActionType" :items="monsterActionTypes" size="sm" />
                  </div>

                  <div class="control-group">
                    <span class="field-label">Progression simulée</span>
                    <USlider
                      v-model="monsterGoalBarProgress"
                      :min="0"
                      :max="100"
                      :step="5"
                      size="sm"
                    />
                    <span class="progress-value">{{ monsterGoalBarProgress }}%</span>
                  </div>

                  <UButton
                    block
                    color="primary"
                    icon="i-lucide-swords"
                    size="sm"
                    @click="handleShowMonsterGoalBar"
                  >
                    Afficher la Goal Bar
                  </UButton>
                  <UButton
                    block
                    color="success"
                    variant="soft"
                    icon="i-heroicons-check-circle"
                    size="sm"
                    @click="handleMonsterGoalBarComplete"
                  >
                    Simuler objectif atteint
                  </UButton>
                  <UButton
                    block
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-eye-slash"
                    size="sm"
                    @click="$emit('hideMonsterGoalBar')"
                  >
                    Masquer
                  </UButton>
                </template>

                <!-- Monster Impact HUD Controls -->
                <template v-else-if="element.type === 'monsterImpactHud'">
                  <div class="control-group">
                    <span class="field-label">Type de combat</span>
                    <USelect
                      v-model="monsterImpactActionType"
                      :items="monsterImpactActionTypes"
                      size="sm"
                    />
                  </div>

                  <UButton
                    block
                    color="primary"
                    icon="i-heroicons-bolt"
                    size="sm"
                    @click="handleShowMonsterImpactHud"
                  >
                    Déclencher l'animation
                  </UButton>
                </template>

                <!-- Fallback for unknown types -->
                <template v-else>
                  <p class="no-controls-message">
                    Aucun contrôle disponible pour ce type d'élément.
                  </p>
                </template>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { OverlayElement, OverlayElementType, DiceType, DiceRollEvent } from '../types'
import type { AnimationState } from '../composables/useAnimationController'
import type { ImpactData } from '@/components/overlay/DiceReverseImpactHUD.vue'
import type { SpellImpactData } from '@/components/overlay/SpellImpactHUD.vue'
import type { MonsterImpactData } from '@/components/overlay/MonsterImpactHUD.vue'
import type { GamificationInstanceEvent } from '@/types'

const props = defineProps<{
  elements: OverlayElement[]
  selectedElementId: string | null
  currentState: AnimationState
}>()

const emit = defineEmits<{
  (e: 'selectElement', id: string): void
  (e: 'toggleVisibility', id: string): void
  (e: 'playEntry'): void
  (e: 'playLoop'): void
  (e: 'stopLoop'): void
  (e: 'playResult'): void
  (e: 'playExit'): void
  (e: 'playFullSequence'): void
  (e: 'reset'): void
  (e: 'rollDice', data: DiceRollEvent): void
  (e: 'showGoalBar', data: GamificationInstanceEvent): void
  (e: 'hideGoalBar'): void
  (e: 'showImpactHud', data: ImpactData): void
  (e: 'showSpellGoalBar', data: GamificationInstanceEvent): void
  (e: 'hideSpellGoalBar'): void
  (e: 'showSpellImpactHud', data: SpellImpactData): void
  (e: 'showMonsterGoalBar', data: GamificationInstanceEvent): void
  (e: 'hideMonsterGoalBar'): void
  (e: 'showMonsterImpactHud', data: MonsterImpactData): void
}>()

// Types de dés disponibles
const standardDiceTypes: DiceType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20']

// État pour les contrôles de poll
const isLoopPlaying = ref(false)

// État pour les contrôles de dés
const selectedDiceType = ref<DiceType>('d20')
const diceCount = ref(1)
const expectedResult = ref(10)

// État pour Dice Reverse Goal Bar
const goalBarProgress = ref(50)

// État pour Dice Reverse Impact HUD
const impactActionType = ref<'dice_invert' | 'chat_message' | 'stat_modify'>('dice_invert')
const impactOriginalValue = ref(3)
const impactInvertedValue = ref(18)
const impactActionTypes = [
  { label: 'Inversion de dé', value: 'dice_invert' },
  { label: 'Message chat', value: 'chat_message' },
  { label: 'Modification stats', value: 'stat_modify' },
]

// État pour Spell Goal Bar
const spellGoalBarProgress = ref(50)
const spellActionType = ref('spell_disable')
const spellActionTypes = [
  { label: 'Blocage de sort', value: 'spell_disable' },
  { label: 'Amplification', value: 'spell_buff' },
  { label: 'Malédiction', value: 'spell_debuff' },
]

// État pour Spell Impact HUD
const spellImpactActionType = ref<'spell_disable' | 'spell_buff' | 'spell_debuff'>('spell_disable')
const spellImpactActionTypes = [
  { label: 'Blocage de sort', value: 'spell_disable' },
  { label: 'Amplification', value: 'spell_buff' },
  { label: 'Malédiction', value: 'spell_debuff' },
]

// État pour Monster Goal Bar
const monsterGoalBarProgress = ref(50)
const monsterActionType = ref('monster_buff')
const monsterActionTypes = [
  { label: 'Renforcement', value: 'monster_buff' },
  { label: 'Affaiblissement', value: 'monster_debuff' },
]

// État pour Monster Impact HUD
const monsterImpactActionType = ref<'monster_buff' | 'monster_debuff'>('monster_buff')
const monsterImpactActionTypes = [
  { label: 'Renforcement', value: 'monster_buff' },
  { label: 'Affaiblissement', value: 'monster_debuff' },
]

// =============================================
// Categorized elements
// =============================================
interface ElementCategory {
  key: string
  label: string
  icon: string
  iconClass: string
  types: OverlayElementType[]
  elements: OverlayElement[]
}

const elementCategories = computed<ElementCategory[]>(() => {
  const categories: Omit<ElementCategory, 'elements'>[] = [
    {
      key: 'polls',
      label: 'Sondage',
      icon: 'i-lucide-bar-chart-3',
      iconClass: 'text-violet-400',
      types: ['poll'],
    },
    {
      key: 'dice',
      label: 'Dés',
      icon: 'i-lucide-dice-5',
      iconClass: 'text-amber-400',
      types: ['dice', 'diceReverseGoalBar', 'diceReverseImpactHud'],
    },
    {
      key: 'spells',
      label: 'Sorts',
      icon: 'i-lucide-sparkles',
      iconClass: 'text-blue-400',
      types: ['spellGoalBar', 'spellImpactHud'],
    },
    {
      key: 'combat',
      label: 'Combat',
      icon: 'i-lucide-swords',
      iconClass: 'text-emerald-400',
      types: ['monsterGoalBar', 'monsterImpactHud'],
    },
  ]

  return categories.map((cat) => ({
    ...cat,
    elements: props.elements.filter((el) => cat.types.includes(el.type)),
  }))
})

const isPlaying = computed(() => {
  return props.currentState === 'entering' || props.currentState === 'exiting'
})

// Calcul des bornes min/max pour le résultat
const getDiceMaxValue = (diceType: DiceType): number => {
  const match = diceType.match(/d(\d+)/)
  return match ? parseInt(match[1] || '20', 10) : 20
}

const resultMin = computed(() => diceCount.value)
const resultMax = computed(() => diceCount.value * getDiceMaxValue(selectedDiceType.value))

// Réajuster le résultat attendu si hors limites
watch([selectedDiceType, diceCount], () => {
  const min = resultMin.value
  const max = resultMax.value
  if (expectedResult.value < min) {
    expectedResult.value = min
  } else if (expectedResult.value > max) {
    expectedResult.value = max
  }
})

// Label lisible pour le type d'élément
const getElementTypeLabel = (type: OverlayElementType): string => {
  switch (type) {
    case 'poll':
      return 'poll'
    case 'dice':
      return 'dice'
    case 'diceReverseGoalBar':
      return 'goal bar'
    case 'diceReverseImpactHud':
      return 'impact hud'
    case 'spellGoalBar':
      return 'goal bar'
    case 'spellImpactHud':
      return 'impact hud'
    case 'monsterGoalBar':
      return 'goal bar'
    case 'monsterImpactHud':
      return 'impact hud'
    default:
      return type
  }
}

// Distribuer le total sur plusieurs dés
const distributeTotal = (total: number, count: number, maxPerDie: number): number[] => {
  const values: number[] = []
  let remaining = total

  for (let i = 0; i < count; i++) {
    const diceLeft = count - i
    const minForRest = diceLeft - 1
    const maxForRest = (diceLeft - 1) * maxPerDie
    const minThisDie = Math.max(1, remaining - maxForRest)
    const maxThisDie = Math.min(maxPerDie, remaining - minForRest)
    const value = Math.floor(Math.random() * (maxThisDie - minThisDie + 1)) + minThisDie
    values.push(value)
    remaining -= value
  }

  return values
}

// Lancer les dés
const handleRollDice = () => {
  const maxPerDie = getDiceMaxValue(selectedDiceType.value)
  const diceResults = distributeTotal(expectedResult.value, diceCount.value, maxPerDie)

  const isCriticalSuccess = diceResults.every((v) => v === maxPerDie)
  const isCriticalFailure = diceResults.every((v) => v === 1)

  const diceRollEvent: DiceRollEvent = {
    id: `preview-${Date.now()}`,
    characterId: 'preview',
    characterName: 'Preview',
    characterAvatar: null,
    rollFormula: `${diceCount.value}${selectedDiceType.value}`,
    result: expectedResult.value,
    diceResults,
    rollType: 'preview',
    rolledAt: new Date().toISOString(),
    isCritical: isCriticalSuccess || isCriticalFailure,
    criticalType: isCriticalSuccess ? 'success' : isCriticalFailure ? 'failure' : null,
    isHidden: false,
    skill: null,
    skillRaw: null,
    ability: null,
    abilityRaw: null,
    modifiers: null,
  }

  emit('rollDice', diceRollEvent)
}

// Toggle loop pour les polls
const handleLoopToggle = () => {
  if (isLoopPlaying.value) {
    emit('stopLoop')
    isLoopPlaying.value = false
  } else {
    emit('playLoop')
    isLoopPlaying.value = true
  }
}

// =============================================
// Helpers: Create mock GamificationInstanceEvent
// =============================================
const createMockInstance = (
  actionType: string,
  progress: number,
  name: string,
  status: 'active' | 'completed' = 'active'
): GamificationInstanceEvent => {
  const now = new Date()
  return {
    id: `preview-${Date.now()}`,
    campaignId: 'preview-campaign',
    eventId: 'preview-event',
    event: {
      id: 'preview-event',
      slug: actionType,
      name,
      type: 'group',
      actionType,
      rewardColor: getActionColor(actionType),
    },
    type: 'group',
    status,
    objectiveTarget: 100,
    currentProgress: status === 'completed' ? 100 : progress,
    progressPercentage: status === 'completed' ? 100 : progress,
    isObjectiveReached: status === 'completed',
    duration: 300,
    startsAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 300000).toISOString(),
    completedAt: status === 'completed' ? now.toISOString() : null,
    streamerId: null,
    viewerCountAtStart: null,
    triggerData: {
      diceRoll: {
        characterName: 'Preview',
        formula: '1d20',
        result: 20,
        diceResults: [20],
        criticalType: 'success',
      },
    },
  }
}

const getActionColor = (actionType: string): string => {
  switch (actionType) {
    case 'dice_invert':
      return '#9146FF'
    case 'spell_disable':
      return '#8B5CF6'
    case 'spell_buff':
      return '#10B981'
    case 'spell_debuff':
      return '#EF4444'
    case 'monster_buff':
      return '#10B981'
    case 'monster_debuff':
      return '#EF4444'
    default:
      return '#3B82F6'
  }
}

const getSpellEventName = (type: string): string => {
  switch (type) {
    case 'spell_disable':
      return '🔒 Blocage de Sort'
    case 'spell_buff':
      return '⬆️ Amplification de Sort'
    case 'spell_debuff':
      return '⬇️ Malédiction de Sort'
    default:
      return '✨ Sort'
  }
}

const getMonsterEventName = (type: string): string => {
  switch (type) {
    case 'monster_buff':
      return '⚔️ Rage Bestiale'
    case 'monster_debuff':
      return '💀 Vulnérabilité'
    default:
      return '⚔️ Combat'
  }
}

// =============================================
// Dice Reverse Goal Bar handlers
// =============================================
const handleShowGoalBar = () => {
  emit(
    'showGoalBar',
    createMockInstance('dice_invert', goalBarProgress.value, '🎲 Critique de Test!')
  )
}

const handleGoalBarComplete = () => {
  emit('showGoalBar', createMockInstance('dice_invert', 100, '🎲 Critique de Test!', 'completed'))
}

const handleHideGoalBar = () => {
  emit('hideGoalBar')
}

// =============================================
// Dice Reverse Impact HUD handlers
// =============================================
const handleShowImpactHud = () => {
  const mockData: ImpactData = {
    instanceId: `preview-impact-${Date.now()}`,
    eventName: 'Preview Event',
    actionType: impactActionType.value,
    success: true,
    message: impactActionType.value === 'chat_message' ? 'Message de test!' : undefined,
    originalValue: impactActionType.value === 'dice_invert' ? impactOriginalValue.value : undefined,
    invertedValue: impactActionType.value === 'dice_invert' ? impactInvertedValue.value : undefined,
  }
  emit('showImpactHud', mockData)
}

// =============================================
// Spell Goal Bar handlers
// =============================================
const handleShowSpellGoalBar = () => {
  emit(
    'showSpellGoalBar',
    createMockInstance(
      spellActionType.value,
      spellGoalBarProgress.value,
      getSpellEventName(spellActionType.value)
    )
  )
}

const handleSpellGoalBarComplete = () => {
  emit(
    'showSpellGoalBar',
    createMockInstance(
      spellActionType.value,
      100,
      getSpellEventName(spellActionType.value),
      'completed'
    )
  )
}

// =============================================
// Spell Impact HUD handlers
// =============================================
const handleShowSpellImpactHud = () => {
  const mockData: SpellImpactData = {
    instanceId: `preview-spell-impact-${Date.now()}`,
    eventName: getSpellEventName(spellImpactActionType.value),
    actionType: spellImpactActionType.value,
    success: true,
    message:
      spellImpactActionType.value === 'spell_disable'
        ? 'Le sort a été bloqué !'
        : spellImpactActionType.value === 'spell_buff'
          ? 'Sort amplifié !'
          : 'Sort affaibli !',
    spellName: 'Boule de feu',
    effectDuration: 3,
    buffType: spellImpactActionType.value === 'spell_buff' ? 'amplify' : undefined,
    debuffType: spellImpactActionType.value === 'spell_debuff' ? 'weaken' : undefined,
    bonusValue: spellImpactActionType.value === 'spell_buff' ? 2 : undefined,
    penaltyValue: spellImpactActionType.value === 'spell_debuff' ? -2 : undefined,
  }
  emit('showSpellImpactHud', mockData)
}

// =============================================
// Monster Goal Bar handlers
// =============================================
const handleShowMonsterGoalBar = () => {
  emit(
    'showMonsterGoalBar',
    createMockInstance(
      monsterActionType.value,
      monsterGoalBarProgress.value,
      getMonsterEventName(monsterActionType.value)
    )
  )
}

const handleMonsterGoalBarComplete = () => {
  emit(
    'showMonsterGoalBar',
    createMockInstance(
      monsterActionType.value,
      100,
      getMonsterEventName(monsterActionType.value),
      'completed'
    )
  )
}

// =============================================
// Monster Impact HUD handlers
// =============================================
const handleShowMonsterImpactHud = () => {
  const mockData: MonsterImpactData = {
    instanceId: `preview-monster-impact-${Date.now()}`,
    eventName: getMonsterEventName(monsterImpactActionType.value),
    actionType: monsterImpactActionType.value,
    success: true,
    message:
      monsterImpactActionType.value === 'monster_buff'
        ? 'Le monstre est renforcé !'
        : 'Le monstre est affaibli !',
    monsterName: 'Dragon Rouge Ancien',
    acBonus: monsterImpactActionType.value === 'monster_buff' ? 2 : undefined,
    acPenalty: monsterImpactActionType.value === 'monster_debuff' ? -2 : undefined,
    tempHp: monsterImpactActionType.value === 'monster_buff' ? 20 : undefined,
    maxHpReduction: monsterImpactActionType.value === 'monster_debuff' ? 15 : undefined,
  }
  emit('showMonsterImpactHud', mockData)
}

const getStateColor = (
  state: AnimationState
): 'neutral' | 'primary' | 'success' | 'warning' | 'error' => {
  switch (state) {
    case 'hidden':
      return 'neutral'
    case 'entering':
      return 'primary'
    case 'active':
      return 'success'
    case 'result':
      return 'warning'
    case 'exiting':
      return 'error'
    default:
      return 'neutral'
  }
}
</script>

<style scoped>
.preview-controls {
  display: flex;
  flex-direction: column;
  gap: 0;
  height: 100%;
  overflow-y: auto;
}

.controls-header {
  padding: 1rem;
  border-bottom: 1px solid var(--ui-border);
}

.controls-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.controls-section {
  border-bottom: 1px solid var(--ui-border);
  padding: 0.75rem 1rem;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin: 0;
}

/* Accordion styles */
.elements-accordion {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.accordion-item {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg);
}

.accordion-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}

.accordion-header:hover {
  background: var(--ui-bg-elevated);
}

.accordion-header.selected {
  background: var(--ui-bg-accented);
  border-bottom: 1px solid var(--ui-border);
}

.accordion-chevron {
  color: var(--color-text-muted);
  transition: transform 0.2s;
  flex-shrink: 0;
}

.element-name {
  flex: 1;
  font-size: 0.875rem;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.accordion-content {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 0.75rem;
  background: var(--ui-bg-muted);
}

/* Accordion animation */
.accordion-enter-active,
.accordion-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.accordion-enter-from,
.accordion-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.accordion-enter-to,
.accordion-leave-from {
  opacity: 1;
  max-height: 500px;
}

/* Control groups */
.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

/* Dice controls */
.dice-type-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.dice-count-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dice-count-value {
  font-size: 1rem;
  font-weight: 600;
  min-width: 1.5rem;
  text-align: center;
  color: var(--color-text-primary);
}

.result-range {
  font-weight: 400;
  color: var(--color-text-muted);
}

.result-input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.result-input {
  width: 70px;
}

.result-formula {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text-muted);
}

/* Poll animation buttons */
.animation-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.375rem;
}

/* Goal Bar controls */
.progress-value {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
  text-align: right;
}

/* Impact HUD controls */
.dice-values-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dice-value-input {
  width: 70px;
}

.arrow-icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

/* State badge */
.current-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  background: var(--ui-bg);
  border-radius: 6px;
  border: 1px solid var(--ui-border);
  margin-top: 0.25rem;
}

.state-label {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

/* Fallback message */
.no-controls-message {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  text-align: center;
  padding: 0.5rem;
  margin: 0;
}
</style>
