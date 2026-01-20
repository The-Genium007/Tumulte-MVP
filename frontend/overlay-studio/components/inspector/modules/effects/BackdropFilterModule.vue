<template>
  <div class="backdrop-filter-module">
    <!-- Enable Toggle -->
    <div class="inline-field">
      <label>Effet de fond</label>
      <USwitch
        :model-value="modelValue.enabled"
        size="sm"
        @update:model-value="(v: boolean) => updateField('enabled', v)"
      />
    </div>

    <template v-if="modelValue.enabled">
      <!-- Blur -->
      <div class="slider-field">
        <div class="slider-header">
          <label>Flou</label>
          <span class="slider-value">{{ modelValue.blur }}px</span>
        </div>
        <URange
          :model-value="modelValue.blur"
          :min="0"
          :max="50"
          :step="1"
          size="sm"
          @update:model-value="(v: number) => updateField('blur', v)"
        />
      </div>

      <!-- Brightness -->
      <div v-if="showBrightness" class="slider-field">
        <div class="slider-header">
          <label>Luminosité</label>
          <span class="slider-value">{{ modelValue.brightness }}%</span>
        </div>
        <URange
          :model-value="modelValue.brightness"
          :min="50"
          :max="150"
          :step="5"
          size="sm"
          @update:model-value="(v: number) => updateField('brightness', v)"
        />
      </div>

      <!-- Saturation -->
      <div v-if="showSaturation" class="slider-field">
        <div class="slider-header">
          <label>Saturation</label>
          <span class="slider-value">{{ modelValue.saturation }}%</span>
        </div>
        <URange
          :model-value="modelValue.saturation"
          :min="0"
          :max="200"
          :step="5"
          size="sm"
          @update:model-value="(v: number) => updateField('saturation', v)"
        />
      </div>

      <!-- Contrast -->
      <div v-if="showContrast" class="slider-field">
        <div class="slider-header">
          <label>Contraste</label>
          <span class="slider-value">{{ modelValue.contrast }}%</span>
        </div>
        <URange
          :model-value="modelValue.contrast"
          :min="50"
          :max="150"
          :step="5"
          size="sm"
          @update:model-value="(v: number) => updateField('contrast', v)"
        />
      </div>

      <!-- Preview -->
      <div v-if="showPreview" class="backdrop-preview">
        <div class="preview-background">
          <div class="preview-pattern" />
          <div class="preview-overlay" :style="previewStyle">
            <span>Aperçu</span>
          </div>
        </div>
      </div>

      <!-- Presets -->
      <div v-if="showPresets" class="presets">
        <button
          v-for="preset in presets"
          :key="preset.label"
          class="preset-button"
          :class="{ active: isPresetActive(preset) }"
          @click="applyPreset(preset)"
        >
          {{ preset.label }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface BackdropFilterConfig {
  enabled: boolean
  blur: number
  brightness: number
  saturation: number
  contrast: number
}

interface BackdropPreset {
  label: string
  values: Omit<BackdropFilterConfig, 'enabled'>
}

const props = withDefaults(
  defineProps<{
    modelValue: BackdropFilterConfig
    showBrightness?: boolean
    showSaturation?: boolean
    showContrast?: boolean
    showPreview?: boolean
    showPresets?: boolean
  }>(),
  {
    showBrightness: true,
    showSaturation: false,
    showContrast: false,
    showPreview: true,
    showPresets: true,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: BackdropFilterConfig]
}>()

const presets: BackdropPreset[] = [
  {
    label: 'Léger',
    values: { blur: 4, brightness: 100, saturation: 100, contrast: 100 },
  },
  {
    label: 'Glass',
    values: { blur: 12, brightness: 105, saturation: 100, contrast: 100 },
  },
  {
    label: 'Frosted',
    values: { blur: 20, brightness: 110, saturation: 80, contrast: 100 },
  },
  {
    label: 'Heavy',
    values: { blur: 30, brightness: 100, saturation: 100, contrast: 100 },
  },
]

const previewStyle = computed(() => {
  const { blur, brightness, saturation, contrast } = props.modelValue
  const filters = [
    `blur(${blur}px)`,
    brightness !== 100 ? `brightness(${brightness}%)` : '',
    saturation !== 100 ? `saturate(${saturation}%)` : '',
    contrast !== 100 ? `contrast(${contrast}%)` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return {
    backdropFilter: filters,
    WebkitBackdropFilter: filters,
  }
})

const isPresetActive = (preset: BackdropPreset) => {
  return (
    props.modelValue.blur === preset.values.blur &&
    props.modelValue.brightness === preset.values.brightness &&
    props.modelValue.saturation === preset.values.saturation &&
    props.modelValue.contrast === preset.values.contrast
  )
}

const updateField = <K extends keyof BackdropFilterConfig>(
  field: K,
  value: BackdropFilterConfig[K]
) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  })
}

const applyPreset = (preset: BackdropPreset) => {
  emit('update:modelValue', {
    ...props.modelValue,
    ...preset.values,
    enabled: true,
  })
}
</script>

<style scoped>
.backdrop-filter-module {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.inline-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.inline-field label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.slider-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slider-header label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.slider-value {
  font-size: 0.75rem;
  color: var(--color-text-primary);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.backdrop-preview {
  border-radius: 8px;
  overflow: hidden;
}

.preview-background {
  position: relative;
  height: 80px;
}

.preview-pattern {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(45deg, #ff6b6b 25%, transparent 25%),
    linear-gradient(-45deg, #4ecdc4 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #45b7d1 75%),
    linear-gradient(-45deg, transparent 75%, #96ceb4 75%);
  background-size: 20px 20px;
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0;
}

.preview-overlay {
  position: absolute;
  inset: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  font-size: 0.75rem;
  font-weight: 500;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.presets {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.preset-button {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-neutral-200);
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  transition: all 0.15s ease;
}

.preset-button:hover {
  border-color: var(--color-neutral-300);
  background: var(--color-neutral-50);
}

.preset-button.active {
  border-color: var(--color-primary-500);
  background: var(--color-primary-50);
  color: var(--color-primary-600);
}
</style>
