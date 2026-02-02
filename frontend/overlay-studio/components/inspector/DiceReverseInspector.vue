<template>
  <div class="dice-reverse-inspector">
    <!-- Section Goal Bar -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('goalBar')">
        <UIcon name="i-lucide-goal" class="size-4" />
        <span>Goal Bar</span>
        <UIcon
          :name="expandedSections.goalBar ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.goalBar" class="section-content">
        <!-- Sous-section Conteneur -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleGoalBarSubsection('container')">
            <span>Conteneur</span>
            <UIcon
              :name="
                expandedGoalBarSections.container ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
              "
              class="size-3"
            />
          </button>
          <div v-show="expandedGoalBarSections.container" class="sub-section-content">
            <ColorModule
              :model-value="props.goalBar.container.backgroundColor"
              label="Fond"
              @update:model-value="(v: string) => updateGoalBarContainer('backgroundColor', v)"
            />
            <ColorModule
              :model-value="props.goalBar.container.borderColor"
              label="Bordure"
              @update:model-value="(v: string) => updateGoalBarContainer('borderColor', v)"
            />
            <div class="inline-field">
              <label>Épaisseur bordure</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.goalBar.container.borderWidth"
                  :min="0"
                  :max="10"
                  :step="1"
                  @update:model-value="(v) => updateGoalBarContainer('borderWidth', v)"
                />
                <span class="unit">px</span>
              </div>
            </div>
            <div class="inline-field">
              <label>Arrondi</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.goalBar.container.borderRadius"
                  :min="0"
                  :max="32"
                  :step="1"
                  @update:model-value="(v) => updateGoalBarContainer('borderRadius', v)"
                />
                <span class="unit">px</span>
              </div>
            </div>
            <div class="inline-field">
              <label>Largeur</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.goalBar.width"
                  :min="300"
                  :max="800"
                  :step="10"
                  @update:model-value="(v) => updateGoalBarWidth(v)"
                />
                <span class="unit">px</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sous-section Barre de progression -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleGoalBarSubsection('progressBar')">
            <span>Barre de progression</span>
            <UIcon
              :name="
                expandedGoalBarSections.progressBar
                  ? 'i-lucide-chevron-up'
                  : 'i-lucide-chevron-down'
              "
              class="size-3"
            />
          </button>
          <div v-show="expandedGoalBarSections.progressBar" class="sub-section-content">
            <div class="inline-field">
              <label>Hauteur</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.goalBar.progressBar.height"
                  :min="10"
                  :max="50"
                  :step="1"
                  @update:model-value="(v) => updateGoalBarProgressBar('height', v)"
                />
                <span class="unit">px</span>
              </div>
            </div>
            <ColorModule
              :model-value="props.goalBar.progressBar.fillColor"
              label="Couleur remplissage"
              @update:model-value="(v: string) => updateGoalBarProgressBar('fillColor', v)"
            />
            <div class="inline-field">
              <label>Dégradé</label>
              <UToggle
                :model-value="props.goalBar.progressBar.fillGradientEnabled"
                @update:model-value="
                  (v: boolean) => updateGoalBarProgressBar('fillGradientEnabled', v)
                "
              />
            </div>
            <template v-if="props.goalBar.progressBar.fillGradientEnabled">
              <ColorModule
                :model-value="props.goalBar.progressBar.fillGradientStart"
                label="Début dégradé"
                @update:model-value="
                  (v: string) => updateGoalBarProgressBar('fillGradientStart', v)
                "
              />
              <ColorModule
                :model-value="props.goalBar.progressBar.fillGradientEnd"
                label="Fin dégradé"
                @update:model-value="(v: string) => updateGoalBarProgressBar('fillGradientEnd', v)"
              />
            </template>
          </div>
        </div>

        <!-- Sous-section Shake -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleGoalBarSubsection('shake')">
            <span>Shake</span>
            <UIcon
              :name="
                expandedGoalBarSections.shake ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
              "
              class="size-3"
            />
          </button>
          <div v-show="expandedGoalBarSections.shake" class="sub-section-content">
            <div class="inline-field">
              <label>Début shake</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.goalBar.shake.startPercent"
                  :min="0"
                  :max="100"
                  :step="5"
                  @update:model-value="(v) => updateGoalBarShake('startPercent', v)"
                />
                <span class="unit">%</span>
              </div>
            </div>
            <div class="inline-field">
              <label>Intensité max</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.goalBar.shake.maxIntensity"
                  :min="1"
                  :max="20"
                  :step="1"
                  @update:model-value="(v) => updateGoalBarShake('maxIntensity', v)"
                />
                <span class="unit">px</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sous-section Audio Goal Bar -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleGoalBarSubsection('audio')">
            <span>Audio</span>
            <UIcon
              :name="
                expandedGoalBarSections.audio ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
              "
              class="size-3"
            />
          </button>
          <div v-show="expandedGoalBarSections.audio" class="sub-section-content">
            <AudioModule
              :model-value="progressSoundConfig"
              label="Son progression"
              :show-preview="false"
              @update:model-value="(v: AudioConfig) => updateGoalBarAudio('progressSound', v)"
            />
            <AudioModule
              :model-value="successSoundConfig"
              label="Son succès"
              :show-preview="false"
              @update:model-value="(v: AudioConfig) => updateGoalBarAudio('successSound', v)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Section Impact HUD -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('impactHud')">
        <UIcon name="i-lucide-zap" class="size-4" />
        <span>Impact HUD</span>
        <UIcon
          :name="expandedSections.impactHud ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.impactHud" class="section-content">
        <!-- Sous-section Conteneur Impact -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleImpactSubsection('container')">
            <span>Conteneur</span>
            <UIcon
              :name="
                expandedImpactSections.container ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
              "
              class="size-3"
            />
          </button>
          <div v-show="expandedImpactSections.container" class="sub-section-content">
            <ColorModule
              :model-value="props.impactHud.container.backgroundColor"
              label="Fond"
              @update:model-value="(v: string) => updateImpactContainer('backgroundColor', v)"
            />
            <ColorModule
              :model-value="props.impactHud.container.borderColor"
              label="Bordure"
              :presets="['#FFD700', '#9146FF', '#22c55e', '#ef4444']"
              @update:model-value="(v: string) => updateImpactContainer('borderColor', v)"
            />
            <div class="inline-field">
              <label>Épaisseur bordure</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.impactHud.container.borderWidth"
                  :min="0"
                  :max="10"
                  :step="1"
                  @update:model-value="(v) => updateImpactContainer('borderWidth', v)"
                />
                <span class="unit">px</span>
              </div>
            </div>
            <div class="inline-field">
              <label>Arrondi</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.impactHud.container.borderRadius"
                  :min="0"
                  :max="32"
                  :step="1"
                  @update:model-value="(v) => updateImpactContainer('borderRadius', v)"
                />
                <span class="unit">px</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sous-section Animation Impact -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleImpactSubsection('animations')">
            <span>Animation</span>
            <UIcon
              :name="
                expandedImpactSections.animations ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
              "
              class="size-3"
            />
          </button>
          <div v-show="expandedImpactSections.animations" class="sub-section-content">
            <div class="inline-field">
              <label>Distance chute</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.impactHud.animations.dropDistance"
                  :min="50"
                  :max="500"
                  :step="10"
                  @update:model-value="(v) => updateImpactAnimations('dropDistance', v)"
                />
                <span class="unit">px</span>
              </div>
            </div>
            <div class="inline-field">
              <label>Durée chute</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.impactHud.animations.dropDuration"
                  :min="50"
                  :max="500"
                  :step="10"
                  @update:model-value="(v) => updateImpactAnimations('dropDuration', v)"
                />
                <span class="unit">ms</span>
              </div>
            </div>
            <div class="inline-field">
              <label>Durée affichage</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.impactHud.animations.displayDuration"
                  :min="1000"
                  :max="10000"
                  :step="500"
                  @update:model-value="(v) => updateImpactAnimations('displayDuration', v)"
                />
                <span class="unit">ms</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sous-section Audio Impact -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleImpactSubsection('audio')">
            <span>Audio</span>
            <UIcon
              :name="expandedImpactSections.audio ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              class="size-3"
            />
          </button>
          <div v-show="expandedImpactSections.audio" class="sub-section-content">
            <AudioModule
              :model-value="impactSoundConfig"
              label="Son impact"
              :show-preview="false"
              @update:model-value="(v: AudioConfig) => updateImpactAudio(v)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Section Preview (Mock Data) -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('preview')">
        <UIcon name="i-lucide-play" class="size-4" />
        <span>Prévisualisation</span>
        <UIcon
          :name="expandedSections.preview ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.preview" class="section-content">
        <div class="inline-field">
          <label>Progression</label>
          <div class="input-with-unit">
            <NumberInput
              :model-value="props.mockData.currentProgress"
              :min="0"
              :max="props.mockData.objectiveTarget"
              :step="1"
              @update:model-value="(v) => updateMockDataField('currentProgress', v)"
            />
            <span class="unit">/ {{ props.mockData.objectiveTarget }}</span>
          </div>
        </div>
        <div class="inline-field">
          <label>Objectif</label>
          <NumberInput
            :model-value="props.mockData.objectiveTarget"
            :min="10"
            :max="500"
            :step="10"
            @update:model-value="(v) => updateMockDataField('objectiveTarget', v)"
          />
        </div>
        <div class="inline-field">
          <label>Temps restant</label>
          <div class="input-with-unit">
            <NumberInput
              :model-value="props.mockData.timeRemaining"
              :min="0"
              :max="300"
              :step="5"
              @update:model-value="(v) => updateMockDataField('timeRemaining', v)"
            />
            <span class="unit">s</span>
          </div>
        </div>

        <!-- Progress display -->
        <div class="preview-info">
          <div class="progress-display">
            <span
              >{{
                Math.round((props.mockData.currentProgress / props.mockData.objectiveTarget) * 100)
              }}%</span
            >
            <span
              v-if="props.mockData.currentProgress >= props.mockData.objectiveTarget"
              class="complete-badge"
            >
              Objectif atteint !
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ColorModule, AudioModule, NumberInput, type AudioConfig } from './modules'
import { useCollapsibleSections } from '~/overlay-studio/composables'
import type { DiceReverseProperties } from '~/overlay-studio/types'

const props = defineProps<{
  goalBar: DiceReverseProperties['goalBar']
  impactHud: DiceReverseProperties['impactHud']
  mockData: DiceReverseProperties['mockData']
}>()

const emit = defineEmits<{
  updateGoalBar: [goalBar: Partial<DiceReverseProperties['goalBar']>]
  updateImpactHud: [impactHud: Partial<DiceReverseProperties['impactHud']>]
  updateMockData: [mockData: Partial<DiceReverseProperties['mockData']>]
}>()

// Main sections
const { sections: expandedSections, toggle: toggleSection } = useCollapsibleSections({
  goalBar: true,
  impactHud: false,
  preview: true,
})

// Goal Bar subsections
const { sections: expandedGoalBarSections, toggle: toggleGoalBarSubsection } =
  useCollapsibleSections({
    container: true,
    progressBar: false,
    shake: false,
    audio: false,
  })

// Impact HUD subsections
const { sections: expandedImpactSections, toggle: toggleImpactSubsection } = useCollapsibleSections(
  {
    container: true,
    animations: false,
    audio: false,
  }
)

// ===== Goal Bar Updates =====
const updateGoalBarContainer = (
  key: keyof DiceReverseProperties['goalBar']['container'],
  value: string | number
) => {
  emit('updateGoalBar', {
    container: { ...props.goalBar.container, [key]: value },
  })
}

const updateGoalBarProgressBar = (
  key: keyof DiceReverseProperties['goalBar']['progressBar'],
  value: string | number | boolean
) => {
  emit('updateGoalBar', {
    progressBar: { ...props.goalBar.progressBar, [key]: value },
  })
}

const updateGoalBarShake = (
  key: keyof DiceReverseProperties['goalBar']['shake'],
  value: number
) => {
  emit('updateGoalBar', {
    shake: { ...props.goalBar.shake, [key]: value },
  })
}

const updateGoalBarWidth = (value: number) => {
  emit('updateGoalBar', { width: value })
}

// Audio configs for Goal Bar
const progressSoundConfig = computed<AudioConfig>(() => ({
  enabled: props.goalBar.audio.progressSound.enabled,
  volume: props.goalBar.audio.progressSound.volume,
}))

const successSoundConfig = computed<AudioConfig>(() => ({
  enabled: props.goalBar.audio.successSound.enabled,
  volume: props.goalBar.audio.successSound.volume,
}))

const updateGoalBarAudio = (soundKey: 'progressSound' | 'successSound', config: AudioConfig) => {
  emit('updateGoalBar', {
    audio: {
      ...props.goalBar.audio,
      [soundKey]: { enabled: config.enabled, volume: config.volume },
    },
  })
}

// ===== Impact HUD Updates =====
const updateImpactContainer = (
  key: keyof DiceReverseProperties['impactHud']['container'],
  value: string | number
) => {
  emit('updateImpactHud', {
    container: { ...props.impactHud.container, [key]: value },
  })
}

const updateImpactAnimations = (
  key: keyof DiceReverseProperties['impactHud']['animations'],
  value: number
) => {
  emit('updateImpactHud', {
    animations: { ...props.impactHud.animations, [key]: value },
  })
}

// Audio config for Impact
const impactSoundConfig = computed<AudioConfig>(() => ({
  enabled: props.impactHud.audio.impactSound.enabled,
  volume: props.impactHud.audio.impactSound.volume,
}))

const updateImpactAudio = (config: AudioConfig) => {
  emit('updateImpactHud', {
    audio: {
      impactSound: { enabled: config.enabled, volume: config.volume },
    },
  })
}

// ===== Mock Data Updates =====
const updateMockDataField = (
  key: keyof DiceReverseProperties['mockData'],
  value: number | string | boolean
) => {
  emit('updateMockData', { [key]: value })
}
</script>

<style scoped>
.dice-reverse-inspector {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.inspector-section {
  border-bottom: 1px solid var(--ui-border);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ui-text);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.section-header:hover {
  background: var(--ui-bg-elevated);
}

.section-content {
  padding: 0 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Sub-sections (collapsible) */
.sub-section {
  border-bottom: 1px solid var(--ui-border);
}

.sub-section:last-child {
  border-bottom: none;
}

.sub-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.5rem 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ui-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: color 0.15s ease;
}

.sub-section-header:hover {
  color: var(--ui-text);
}

.sub-section-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-bottom: 0.75rem;
}

/* Inline fields */
.inline-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.inline-field label {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

.input-with-unit {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.unit {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

/* Preview info */
.preview-info {
  background: var(--ui-bg-elevated);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  margin-top: 0.5rem;
}

.progress-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ui-text);
}

.complete-badge {
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  background: rgba(34, 197, 94, 0.2);
  color: rgb(22, 163, 74);
}
</style>
