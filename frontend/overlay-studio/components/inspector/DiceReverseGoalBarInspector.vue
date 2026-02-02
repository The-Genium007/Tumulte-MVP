<template>
  <div class="goal-bar-inspector">
    <!-- Section Conteneur -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('container')">
        <UIcon name="i-lucide-box" class="size-4" />
        <span>Conteneur</span>
        <UIcon
          :name="expandedSections.container ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.container" class="section-content">
        <ColorModule
          :model-value="props.container.backgroundColor"
          label="Couleur de fond"
          @update:model-value="(v: string) => updateContainer('backgroundColor', v)"
        />
        <ColorModule
          :model-value="props.container.borderColor"
          label="Couleur bordure"
          @update:model-value="(v: string) => updateContainer('borderColor', v)"
        />
        <div class="inline-field">
          <label>Épaisseur bordure</label>
          <div class="input-with-unit">
            <NumberInput
              :model-value="props.container.borderWidth"
              :min="0"
              :max="10"
              :step="1"
              @update:model-value="(v) => updateContainer('borderWidth', v)"
            />
            <span class="unit">px</span>
          </div>
        </div>
        <div class="inline-field">
          <label>Rayon bordure</label>
          <div class="input-with-unit">
            <NumberInput
              :model-value="props.container.borderRadius"
              :min="0"
              :max="32"
              :step="1"
              @update:model-value="(v) => updateContainer('borderRadius', v)"
            />
            <span class="unit">px</span>
          </div>
        </div>
        <div class="inline-field">
          <label>Largeur</label>
          <div class="input-with-unit">
            <NumberInput
              :model-value="props.width"
              :min="200"
              :max="800"
              :step="10"
              @update:model-value="(v) => emit('update-width', v)"
            />
            <span class="unit">px</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Section Barre de progression -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('progressBar')">
        <UIcon name="i-lucide-bar-chart-3" class="size-4" />
        <span>Barre de progression</span>
        <UIcon
          :name="expandedSections.progressBar ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.progressBar" class="section-content">
        <div class="inline-field">
          <label>Hauteur</label>
          <div class="input-with-unit">
            <NumberInput
              :model-value="props.progressBar.height"
              :min="8"
              :max="48"
              :step="2"
              @update:model-value="(v) => updateProgressBar('height', v)"
            />
            <span class="unit">px</span>
          </div>
        </div>
        <ColorModule
          :model-value="props.progressBar.backgroundColor"
          label="Couleur de fond"
          @update:model-value="(v: string) => updateProgressBar('backgroundColor', v)"
        />

        <!-- Gradient toggle -->
        <div class="inline-field">
          <label>Utiliser un dégradé</label>
          <USwitch
            :model-value="props.progressBar.fillGradientEnabled"
            size="sm"
            @update:model-value="(v: boolean) => updateProgressBar('fillGradientEnabled', v)"
          />
        </div>

        <!-- Single color (when gradient disabled) -->
        <ColorModule
          v-if="!props.progressBar.fillGradientEnabled"
          :model-value="props.progressBar.fillColor"
          label="Couleur de remplissage"
          :presets="['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b']"
          @update:model-value="(v: string) => updateProgressBar('fillColor', v)"
        />

        <!-- Gradient colors (when gradient enabled) -->
        <template v-if="props.progressBar.fillGradientEnabled">
          <ColorModule
            :model-value="props.progressBar.fillGradientStart"
            label="Couleur début"
            :presets="['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b']"
            @update:model-value="(v: string) => updateProgressBar('fillGradientStart', v)"
          />
          <ColorModule
            :model-value="props.progressBar.fillGradientEnd"
            label="Couleur fin"
            :presets="['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b']"
            @update:model-value="(v: string) => updateProgressBar('fillGradientEnd', v)"
          />
        </template>

        <ColorModule
          :model-value="props.progressBar.glowColor"
          label="Couleur de lueur"
          :presets="['#22c55e', '#3b82f6', '#ffd700', '#ff6b6b']"
          @update:model-value="(v: string) => updateProgressBar('glowColor', v)"
        />
      </div>
    </div>

    <!-- Section Typographie -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('typography')">
        <UIcon name="i-lucide-type" class="size-4" />
        <span>Typographie</span>
        <UIcon
          :name="expandedSections.typography ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.typography" class="section-content">
        <!-- Titre -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleSubSection('title')">
            <span>Titre</span>
            <UIcon
              :name="expandedSubSections.title ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              class="size-3"
            />
          </button>
          <div v-show="expandedSubSections.title" class="sub-section-content">
            <TextModule
              :model-value="titleTextStyle"
              :show-font-family="true"
              :show-font-size="true"
              :show-font-weight="true"
              :font-size-min="12"
              :font-size-max="32"
              @update:model-value="handleTitleStyleUpdate"
            />
            <ColorModule
              :model-value="props.typography.title.color"
              label="Couleur"
              @update:model-value="(v: string) => updateTypography('title', 'color', v)"
            />
          </div>
        </div>

        <!-- Progression -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleSubSection('progress')">
            <span>Texte de progression</span>
            <UIcon
              :name="expandedSubSections.progress ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              class="size-3"
            />
          </button>
          <div v-show="expandedSubSections.progress" class="sub-section-content">
            <TextModule
              :model-value="progressTextStyle"
              :show-font-family="true"
              :show-font-size="true"
              :show-font-weight="true"
              :font-size-min="10"
              :font-size-max="24"
              @update:model-value="handleProgressStyleUpdate"
            />
            <ColorModule
              :model-value="props.typography.progress.color"
              label="Couleur"
              @update:model-value="(v: string) => updateTypography('progress', 'color', v)"
            />
          </div>
        </div>

        <!-- Timer -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleSubSection('timer')">
            <span>Timer</span>
            <UIcon
              :name="expandedSubSections.timer ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              class="size-3"
            />
          </button>
          <div v-show="expandedSubSections.timer" class="sub-section-content">
            <TextModule
              :model-value="timerTextStyle"
              :show-font-family="true"
              :show-font-size="true"
              :show-font-weight="true"
              :font-size-min="10"
              :font-size-max="24"
              @update:model-value="handleTimerStyleUpdate"
            />
            <ColorModule
              :model-value="props.typography.timer.color"
              label="Couleur"
              @update:model-value="(v: string) => updateTypography('timer', 'color', v)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Section Effet de secousse -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('shake')">
        <UIcon name="i-lucide-vibrate" class="size-4" />
        <span>Secousse</span>
        <UIcon
          :name="expandedSections.shake ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.shake" class="section-content">
        <div class="inline-field">
          <label>Début (% progression)</label>
          <div class="input-with-unit">
            <NumberInput
              :model-value="props.shake.startPercent"
              :min="0"
              :max="100"
              :step="5"
              @update:model-value="(v) => updateShake('startPercent', v)"
            />
            <span class="unit">%</span>
          </div>
        </div>
        <div class="inline-field">
          <label>Intensité max</label>
          <div class="input-with-unit">
            <NumberInput
              :model-value="props.shake.maxIntensity"
              :min="0"
              :max="20"
              :step="1"
              @update:model-value="(v) => updateShake('maxIntensity', v)"
            />
            <span class="unit">px</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Section Audio -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('audio')">
        <UIcon name="i-lucide-volume-2" class="size-4" />
        <span>Audio</span>
        <UIcon
          :name="expandedSections.audio ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.audio" class="section-content">
        <AudioModule
          :model-value="progressSoundConfig"
          label="Son de progression"
          :show-preview="false"
          @update:model-value="(v) => updateAudioConfig('progressSound', v)"
        />
        <AudioModule
          :model-value="successSoundConfig"
          label="Son de succès"
          :show-preview="false"
          @update:model-value="(v) => updateAudioConfig('successSound', v)"
        />
      </div>
    </div>

    <!-- Section Prévisualisation -->
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
        <div class="field">
          <label>Nom de l'événement</label>
          <UInput
            :model-value="props.mockData.eventName"
            size="sm"
            :ui="inputUi"
            @update:model-value="(v: string | number) => updateMockData('eventName', String(v))"
          />
        </div>
        <div class="inline-field">
          <label>Progression actuelle</label>
          <NumberInput
            :model-value="props.mockData.currentProgress"
            :min="0"
            :max="props.mockData.objectiveTarget"
            :step="1"
            @update:model-value="(v) => updateMockData('currentProgress', v)"
          />
        </div>
        <div class="inline-field">
          <label>Objectif</label>
          <NumberInput
            :model-value="props.mockData.objectiveTarget"
            :min="1"
            :max="10000"
            :step="10"
            @update:model-value="(v) => updateMockData('objectiveTarget', v)"
          />
        </div>
        <div class="inline-field">
          <label>Temps restant</label>
          <div class="input-with-unit">
            <NumberInput
              :model-value="props.mockData.timeRemaining"
              :min="0"
              :max="3600"
              :step="10"
              @update:model-value="(v) => updateMockData('timeRemaining', v)"
            />
            <span class="unit">s</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ColorModule,
  TextModule,
  AudioModule,
  NumberInput,
  type TextStyleConfig,
  type AudioConfig,
} from './modules'
import { useCollapsibleSections } from '~/overlay-studio/composables'
import type {
  DiceReverseContainerStyle,
  DiceReverseProgressBarStyle,
  DiceReverseShakeConfig,
  DiceReverseGoalBarTypography,
  DiceReverseGoalBarAudioConfig,
  DiceReverseMockData,
} from '~/overlay-studio/types'

const props = defineProps<{
  container: DiceReverseContainerStyle
  progressBar: DiceReverseProgressBarStyle
  shake: DiceReverseShakeConfig
  typography: DiceReverseGoalBarTypography
  audio: DiceReverseGoalBarAudioConfig
  width: number
  mockData: DiceReverseMockData
}>()

const emit = defineEmits<{
  'update-container': [key: string, value: string | number]
  'update-progress-bar': [key: string, value: string | number | boolean]
  'update-shake': [key: string, value: number]
  'update-typography': [section: string, key: string, value: string | number]
  'update-audio': [key: string, value: { enabled: boolean; volume: number }]
  'update-width': [value: number]
  'update-mock-data': [key: string, value: string | number | boolean]
}>()

// Sections collapsed/expanded state - using composable
const { sections: expandedSections, toggle: toggleSection } = useCollapsibleSections({
  container: true,
  progressBar: false,
  typography: false,
  shake: false,
  audio: false,
  preview: true,
})

// Sub-sections for typography
const { sections: expandedSubSections, toggle: toggleSubSection } = useCollapsibleSections({
  title: true,
  progress: false,
  timer: false,
})

// UI customization for text inputs
const inputUi = {
  base: 'bg-(--ui-bg-elevated) text-(--ui-text) border border-(--ui-border) placeholder:text-(--ui-text-muted)',
}

// ===== TextModule Adapters =====

const titleTextStyle = computed<TextStyleConfig>(() => ({
  fontFamily: props.typography.title.fontFamily,
  fontSize: props.typography.title.fontSize,
  fontWeight: props.typography.title.fontWeight,
}))

const progressTextStyle = computed<TextStyleConfig>(() => ({
  fontFamily: props.typography.progress.fontFamily,
  fontSize: props.typography.progress.fontSize,
  fontWeight: props.typography.progress.fontWeight,
}))

const timerTextStyle = computed<TextStyleConfig>(() => ({
  fontFamily: props.typography.timer.fontFamily,
  fontSize: props.typography.timer.fontSize,
  fontWeight: props.typography.timer.fontWeight,
}))

// ===== AudioModule Adapters =====

const progressSoundConfig = computed<AudioConfig>(() => ({
  enabled: props.audio.progressSound.enabled,
  volume: props.audio.progressSound.volume,
}))

const successSoundConfig = computed<AudioConfig>(() => ({
  enabled: props.audio.successSound.enabled,
  volume: props.audio.successSound.volume,
}))

// ===== Update handlers =====

const updateContainer = (key: string, value: string | number) => {
  emit('update-container', key, value)
}

const updateProgressBar = (key: string, value: string | number | boolean) => {
  emit('update-progress-bar', key, value)
}

const updateShake = (key: string, value: number) => {
  emit('update-shake', key, value)
}

const updateTypography = (section: string, key: string, value: string | number) => {
  emit('update-typography', section, key, value)
}

const handleTitleStyleUpdate = (config: TextStyleConfig) => {
  if (config.fontFamily !== undefined) updateTypography('title', 'fontFamily', config.fontFamily)
  if (config.fontSize !== undefined) updateTypography('title', 'fontSize', config.fontSize)
  if (config.fontWeight !== undefined) updateTypography('title', 'fontWeight', config.fontWeight)
}

const handleProgressStyleUpdate = (config: TextStyleConfig) => {
  if (config.fontFamily !== undefined) updateTypography('progress', 'fontFamily', config.fontFamily)
  if (config.fontSize !== undefined) updateTypography('progress', 'fontSize', config.fontSize)
  if (config.fontWeight !== undefined) updateTypography('progress', 'fontWeight', config.fontWeight)
}

const handleTimerStyleUpdate = (config: TextStyleConfig) => {
  if (config.fontFamily !== undefined) updateTypography('timer', 'fontFamily', config.fontFamily)
  if (config.fontSize !== undefined) updateTypography('timer', 'fontSize', config.fontSize)
  if (config.fontWeight !== undefined) updateTypography('timer', 'fontWeight', config.fontWeight)
}

const updateAudioConfig = (soundKey: string, config: AudioConfig) => {
  emit('update-audio', soundKey, { enabled: config.enabled, volume: config.volume })
}

const updateMockData = (key: string, value: string | number | boolean) => {
  emit('update-mock-data', key, value)
}
</script>

<style scoped>
.goal-bar-inspector {
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

/* Generic field */
.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field label {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}
</style>
