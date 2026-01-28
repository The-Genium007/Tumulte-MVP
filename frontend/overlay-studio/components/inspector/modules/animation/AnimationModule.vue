<template>
  <div class="animation-module">
    <!-- Entry Animation -->
    <div v-if="showEntry" class="sub-section">
      <button class="sub-section-header" @click="toggleSection('entry')">
        <div class="header-left">
          <UIcon name="i-lucide-log-in" class="size-4" />
          <span>Animation d'entrée</span>
        </div>
        <UIcon
          :name="expandedSections.entry ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-3"
        />
      </button>

      <div v-show="expandedSections.entry" class="sub-section-content">
        <div class="field">
          <label>Type</label>
          <USelect
            :model-value="modelValue.entry.type"
            :items="entryAnimationOptions"
            size="xs"
            :ui="selectUi"
            @update:model-value="(v: string) => updateEntry('type', v)"
          />
        </div>

        <div class="inline-field">
          <label>Durée</label>
          <div class="input-with-unit">
            <NumberInput
              :model-value="modelValue.entry.duration"
              :min="0.1"
              :max="3"
              :step="0.1"
              @update:model-value="(v) => updateEntry('duration', v)"
            />
            <span class="unit">s</span>
          </div>
        </div>

        <div v-if="showDelay" class="inline-field">
          <label>Délai</label>
          <div class="input-with-unit">
            <NumberInput
              :model-value="modelValue.entry.delay || 0"
              :min="0"
              :max="5"
              :step="0.1"
              @update:model-value="(v) => updateEntry('delay', v)"
            />
            <span class="unit">s</span>
          </div>
        </div>

        <div v-if="showEasing" class="field">
          <label>Easing</label>
          <USelect
            :model-value="modelValue.entry.easing || 'ease-out'"
            :items="easingOptions"
            size="xs"
            :ui="selectUi"
            @update:model-value="(v: string) => updateEntry('easing', v)"
          />
        </div>
      </div>
    </div>

    <!-- Exit Animation -->
    <div v-if="showExit" class="sub-section">
      <button class="sub-section-header" @click="toggleSection('exit')">
        <div class="header-left">
          <UIcon name="i-lucide-log-out" class="size-4" />
          <span>Animation de sortie</span>
        </div>
        <UIcon
          :name="expandedSections.exit ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-3"
        />
      </button>

      <div v-show="expandedSections.exit" class="sub-section-content">
        <div class="field">
          <label>Type</label>
          <USelect
            :model-value="modelValue.exit.type"
            :items="exitAnimationOptions"
            size="xs"
            :ui="selectUi"
            @update:model-value="(v: string) => updateExit('type', v)"
          />
        </div>

        <div class="inline-field">
          <label>Durée</label>
          <div class="input-with-unit">
            <NumberInput
              :model-value="modelValue.exit.duration"
              :min="0.1"
              :max="3"
              :step="0.1"
              @update:model-value="(v) => updateExit('duration', v)"
            />
            <span class="unit">s</span>
          </div>
        </div>

        <div class="inline-field">
          <label>Délai avant sortie</label>
          <div class="input-with-unit">
            <NumberInput
              :model-value="modelValue.exit.delay || 0"
              :min="0"
              :max="10"
              :step="0.5"
              @update:model-value="(v) => updateExit('delay', v)"
            />
            <span class="unit">s</span>
          </div>
        </div>

        <div v-if="showEasing" class="field">
          <label>Easing</label>
          <USelect
            :model-value="modelValue.exit.easing || 'ease-in'"
            :items="easingOptions"
            size="xs"
            :ui="selectUi"
            @update:model-value="(v: string) => updateExit('easing', v)"
          />
        </div>
      </div>
    </div>

    <!-- Preview Button -->
    <UButton
      v-if="showPreviewButton"
      color="neutral"
      variant="soft"
      icon="i-lucide-play"
      label="Prévisualiser"
      size="xs"
      block
      @click="$emit('preview')"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import NumberInput from '../shared/NumberInput.vue'

export interface AnimationConfig {
  entry: {
    type: string
    duration: number
    delay?: number
    easing?: string
  }
  exit: {
    type: string
    duration: number
    delay?: number
    easing?: string
  }
}

const props = withDefaults(
  defineProps<{
    modelValue: AnimationConfig
    showEntry?: boolean
    showExit?: boolean
    showDelay?: boolean
    showEasing?: boolean
    showPreviewButton?: boolean
    customEntryOptions?: { label: string; value: string }[]
    customExitOptions?: { label: string; value: string }[]
  }>(),
  {
    showEntry: true,
    showExit: true,
    showDelay: true,
    showEasing: false,
    showPreviewButton: false,
    customEntryOptions: undefined,
    customExitOptions: undefined,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: AnimationConfig]
  preview: []
}>()

// Options par défaut pour les animations d'entrée
const defaultEntryOptions = [
  { label: 'Aucune', value: 'none' },
  { label: 'Fondu', value: 'fade' },
  { label: 'Glissement haut', value: 'slide-up' },
  { label: 'Glissement bas', value: 'slide-down' },
  { label: 'Glissement gauche', value: 'slide-left' },
  { label: 'Glissement droite', value: 'slide-right' },
  { label: 'Zoom', value: 'zoom' },
  { label: 'Bounce', value: 'bounce' },
  { label: 'Flip', value: 'flip' },
  { label: 'Rotation', value: 'rotate' },
]

// Options par défaut pour les animations de sortie
const defaultExitOptions = [
  { label: 'Aucune', value: 'none' },
  { label: 'Fondu', value: 'fade' },
  { label: 'Glissement haut', value: 'slide-up' },
  { label: 'Glissement bas', value: 'slide-down' },
  { label: 'Glissement gauche', value: 'slide-left' },
  { label: 'Glissement droite', value: 'slide-right' },
  { label: 'Zoom out', value: 'zoom-out' },
  { label: 'Shrink', value: 'shrink' },
]

const easingOptions = [
  { label: 'Linear', value: 'linear' },
  { label: 'Ease', value: 'ease' },
  { label: 'Ease In', value: 'ease-in' },
  { label: 'Ease Out', value: 'ease-out' },
  { label: 'Ease In Out', value: 'ease-in-out' },
  { label: 'Bounce', value: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' },
  { label: 'Elastic', value: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)' },
]

const entryAnimationOptions = props.customEntryOptions || defaultEntryOptions
const exitAnimationOptions = props.customExitOptions || defaultExitOptions

// Expanded state for collapsible sections
const expandedSections = reactive({
  entry: true,
  exit: false,
})

const toggleSection = (section: keyof typeof expandedSections) => {
  expandedSections[section] = !expandedSections[section]
}

// UI customization for selects
const selectUi = {
  base: 'bg-(--ui-bg-elevated) text-(--ui-text) border border-(--ui-border)',
  content: 'bg-(--ui-bg-elevated) border border-(--ui-border)',
  item: 'text-(--ui-text) data-highlighted:bg-(--ui-bg-accented)',
}

const updateEntry = (key: string, value: string | number) => {
  emit('update:modelValue', {
    ...props.modelValue,
    entry: { ...props.modelValue.entry, [key]: value },
  })
}

const updateExit = (key: string, value: string | number) => {
  emit('update:modelValue', {
    ...props.modelValue,
    exit: { ...props.modelValue.exit, [key]: value },
  })
}
</script>

<style scoped>
.animation-module {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Sub-sections collapsibles */
.sub-section {
  display: flex;
  flex-direction: column;
}

.sub-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: var(--ui-text-muted);
  transition: all 0.15s ease;
}

.sub-section-header:hover {
  color: var(--ui-text);
  border-color: var(--ui-border);
  background: var(--ui-bg-elevated);
}

.sub-section-header .header-left {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sub-section-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-left: 0.5rem;
  padding-bottom: 0.5rem;
  border-left: 2px solid var(--ui-border);
  margin-left: 0.5rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field label {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

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
