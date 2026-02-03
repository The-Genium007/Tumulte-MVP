<template>
  <div class="impact-hud-inspector">
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
          :presets="['#ffd700', '#ff6b6b', '#4ade80', '#3b82f6']"
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
              :min="150"
              :max="600"
              :step="10"
              @update:model-value="(v) => emit('update-width', v)"
            />
            <span class="unit">px</span>
          </div>
        </div>
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
              :font-size-min="14"
              :font-size-max="48"
              @update:model-value="handleTitleStyleUpdate"
            />
            <ColorModule
              :model-value="props.typography.title.color"
              label="Couleur"
              :presets="['#9146FF', '#ffffff', '#ffd700', '#ff6b6b', '#4ade80']"
              @update:model-value="(v: string) => updateTypography('title', 'color', v)"
            />
          </div>
        </div>

        <!-- Détail (ex: 20 → 1) -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleSubSection('detail')">
            <span>Détail</span>
            <UIcon
              :name="expandedSubSections.detail ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              class="size-3"
            />
          </button>
          <div v-show="expandedSubSections.detail" class="sub-section-content">
            <TextModule
              :model-value="detailTextStyle"
              :show-font-family="true"
              :show-font-size="true"
              :show-font-weight="true"
              :font-size-min="20"
              :font-size-max="72"
              @update:model-value="handleDetailStyleUpdate"
            />
            <ColorModule
              :model-value="props.typography.detail.color"
              label="Couleur"
              :presets="['#ffffff', '#9146FF', '#ffd700', '#ff6b6b', '#4ade80']"
              @update:model-value="(v: string) => updateTypography('detail', 'color', v)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Section Animations -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('animations')">
        <UIcon name="i-lucide-sparkles" class="size-4" />
        <span>Animations</span>
        <UIcon
          :name="expandedSections.animations ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.animations" class="section-content">
        <div class="inline-field">
          <label>Distance de chute</label>
          <div class="input-with-unit">
            <NumberInput
              :model-value="props.animations.dropDistance"
              :min="50"
              :max="500"
              :step="10"
              @update:model-value="(v) => updateAnimations('dropDistance', v)"
            />
            <span class="unit">px</span>
          </div>
        </div>
        <div class="inline-field">
          <label>Durée de chute</label>
          <div class="input-with-unit">
            <NumberInput
              :model-value="props.animations.dropDuration"
              :min="50"
              :max="500"
              :step="25"
              @update:model-value="(v) => updateAnimations('dropDuration', v)"
            />
            <span class="unit">ms</span>
          </div>
        </div>
        <div class="inline-field">
          <label>Durée d'affichage</label>
          <div class="input-with-unit">
            <NumberInput
              :model-value="props.animations.displayDuration"
              :min="1000"
              :max="10000"
              :step="500"
              @update:model-value="(v) => updateAnimations('displayDuration', v)"
            />
            <span class="unit">ms</span>
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
          :model-value="impactSoundConfig"
          label="Son d'impact"
          :show-preview="false"
          @update:model-value="(v) => updateAudioConfig('impactSound', v)"
        />
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
  DiceReverseImpactContainerStyle,
  DiceReverseImpactAnimationsConfig,
  DiceReverseImpactAudioConfig,
  DiceReverseImpactTypography,
} from '~/overlay-studio/types'

const props = defineProps<{
  container: DiceReverseImpactContainerStyle
  animations: DiceReverseImpactAnimationsConfig
  audio: DiceReverseImpactAudioConfig
  typography: DiceReverseImpactTypography
  width: number
}>()

const emit = defineEmits<{
  'update-container': [key: string, value: string | number]
  'update-animations': [key: string, value: number]
  'update-audio': [key: string, value: { enabled: boolean; volume: number }]
  'update-typography': [section: string, key: string, value: string | number]
  'update-width': [value: number]
}>()

// Sections collapsed/expanded state - using composable
const { sections: expandedSections, toggle: toggleSection } = useCollapsibleSections({
  container: true,
  typography: false,
  animations: false,
  audio: false,
})

// Sub-sections for typography
const { sections: expandedSubSections, toggle: toggleSubSection } = useCollapsibleSections({
  title: true,
  detail: false,
})

// ===== TextModule Adapters =====

const titleTextStyle = computed<TextStyleConfig>(() => ({
  fontFamily: props.typography.title.fontFamily,
  fontSize: props.typography.title.fontSize,
  fontWeight: props.typography.title.fontWeight,
}))

const detailTextStyle = computed<TextStyleConfig>(() => ({
  fontFamily: props.typography.detail.fontFamily,
  fontSize: props.typography.detail.fontSize,
  fontWeight: props.typography.detail.fontWeight,
}))

// ===== AudioModule Adapter =====

const impactSoundConfig = computed<AudioConfig>(() => ({
  enabled: props.audio.impactSound.enabled,
  volume: props.audio.impactSound.volume,
}))

// ===== Update handlers =====

const updateContainer = (key: string, value: string | number) => {
  emit('update-container', key, value)
}

const updateAnimations = (key: string, value: number) => {
  emit('update-animations', key, value)
}

const updateTypography = (section: string, key: string, value: string | number) => {
  emit('update-typography', section, key, value)
}

const handleTitleStyleUpdate = (config: TextStyleConfig) => {
  if (config.fontFamily !== undefined) updateTypography('title', 'fontFamily', config.fontFamily)
  if (config.fontSize !== undefined) updateTypography('title', 'fontSize', config.fontSize)
  if (config.fontWeight !== undefined) updateTypography('title', 'fontWeight', config.fontWeight)
}

const handleDetailStyleUpdate = (config: TextStyleConfig) => {
  if (config.fontFamily !== undefined) updateTypography('detail', 'fontFamily', config.fontFamily)
  if (config.fontSize !== undefined) updateTypography('detail', 'fontSize', config.fontSize)
  if (config.fontWeight !== undefined) updateTypography('detail', 'fontWeight', config.fontWeight)
}

const updateAudioConfig = (soundKey: string, config: AudioConfig) => {
  emit('update-audio', soundKey, { enabled: config.enabled, volume: config.volume })
}
</script>

<style scoped>
.impact-hud-inspector {
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
</style>
