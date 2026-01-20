<template>
  <div class="filter-module">
    <!-- Blur -->
    <div v-if="showBlur" class="slider-field">
      <div class="slider-header">
        <label>Flou</label>
        <span class="slider-value">{{ modelValue.blur }}px</span>
      </div>
      <URange
        :model-value="modelValue.blur"
        :min="0"
        :max="20"
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
        :min="0"
        :max="200"
        :step="5"
        size="sm"
        @update:model-value="(v: number) => updateField('brightness', v)"
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
        :min="0"
        :max="200"
        :step="5"
        size="sm"
        @update:model-value="(v: number) => updateField('contrast', v)"
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

    <!-- Grayscale -->
    <div v-if="showGrayscale" class="slider-field">
      <div class="slider-header">
        <label>Niveaux de gris</label>
        <span class="slider-value">{{ modelValue.grayscale }}%</span>
      </div>
      <URange
        :model-value="modelValue.grayscale"
        :min="0"
        :max="100"
        :step="5"
        size="sm"
        @update:model-value="(v: number) => updateField('grayscale', v)"
      />
    </div>

    <!-- Sepia -->
    <div v-if="showSepia" class="slider-field">
      <div class="slider-header">
        <label>Sépia</label>
        <span class="slider-value">{{ modelValue.sepia }}%</span>
      </div>
      <URange
        :model-value="modelValue.sepia"
        :min="0"
        :max="100"
        :step="5"
        size="sm"
        @update:model-value="(v: number) => updateField('sepia', v)"
      />
    </div>

    <!-- Hue Rotate -->
    <div v-if="showHueRotate" class="slider-field">
      <div class="slider-header">
        <label>Rotation teinte</label>
        <span class="slider-value">{{ modelValue.hueRotate }}°</span>
      </div>
      <URange
        :model-value="modelValue.hueRotate"
        :min="0"
        :max="360"
        :step="5"
        size="sm"
        @update:model-value="(v: number) => updateField('hueRotate', v)"
      />
    </div>

    <!-- Invert -->
    <div v-if="showInvert" class="slider-field">
      <div class="slider-header">
        <label>Inverser</label>
        <span class="slider-value">{{ modelValue.invert }}%</span>
      </div>
      <URange
        :model-value="modelValue.invert"
        :min="0"
        :max="100"
        :step="5"
        size="sm"
        @update:model-value="(v: number) => updateField('invert', v)"
      />
    </div>

    <!-- Opacity -->
    <div v-if="showOpacity" class="slider-field">
      <div class="slider-header">
        <label>Opacité</label>
        <span class="slider-value">{{ modelValue.opacity }}%</span>
      </div>
      <URange
        :model-value="modelValue.opacity"
        :min="0"
        :max="100"
        :step="5"
        size="sm"
        @update:model-value="(v: number) => updateField('opacity', v)"
      />
    </div>

    <!-- Reset Button -->
    <UButton
      v-if="showReset && hasChanges"
      color="neutral"
      variant="ghost"
      icon="i-lucide-rotate-ccw"
      label="Réinitialiser"
      size="xs"
      @click="resetFilters"
    />

    <!-- Presets -->
    <div v-if="showPresets" class="presets">
      <button
        v-for="preset in presets"
        :key="preset.label"
        class="preset-button"
        @click="applyPreset(preset)"
      >
        <div class="preset-preview" :style="{ filter: preset.css }" />
        <span>{{ preset.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface FilterConfig {
  blur: number
  brightness: number
  contrast: number
  saturation: number
  grayscale: number
  sepia: number
  hueRotate: number
  invert: number
  opacity: number
}

interface FilterPreset {
  label: string
  values: Partial<FilterConfig>
  css: string
}

const props = withDefaults(
  defineProps<{
    modelValue: FilterConfig
    showBlur?: boolean
    showBrightness?: boolean
    showContrast?: boolean
    showSaturation?: boolean
    showGrayscale?: boolean
    showSepia?: boolean
    showHueRotate?: boolean
    showInvert?: boolean
    showOpacity?: boolean
    showReset?: boolean
    showPresets?: boolean
  }>(),
  {
    showBlur: true,
    showBrightness: true,
    showContrast: true,
    showSaturation: true,
    showGrayscale: false,
    showSepia: false,
    showHueRotate: false,
    showInvert: false,
    showOpacity: false,
    showReset: true,
    showPresets: true,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: FilterConfig]
}>()

const defaultValues: FilterConfig = {
  blur: 0,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
  sepia: 0,
  hueRotate: 0,
  invert: 0,
  opacity: 100,
}

const presets: FilterPreset[] = [
  {
    label: 'Normal',
    values: defaultValues,
    css: 'none',
  },
  {
    label: 'Vintage',
    values: { brightness: 110, contrast: 90, saturation: 80, sepia: 20 },
    css: 'brightness(110%) contrast(90%) saturate(80%) sepia(20%)',
  },
  {
    label: 'Noir & Blanc',
    values: { grayscale: 100 },
    css: 'grayscale(100%)',
  },
  {
    label: 'Vif',
    values: { brightness: 105, contrast: 110, saturation: 130 },
    css: 'brightness(105%) contrast(110%) saturate(130%)',
  },
  {
    label: 'Dramatique',
    values: { contrast: 140, brightness: 90 },
    css: 'contrast(140%) brightness(90%)',
  },
  {
    label: 'Froid',
    values: { brightness: 100, saturation: 90, hueRotate: 180 },
    css: 'saturate(90%) hue-rotate(180deg)',
  },
]

const hasChanges = computed(() => {
  return Object.keys(defaultValues).some(
    (key) =>
      props.modelValue[key as keyof FilterConfig] !== defaultValues[key as keyof FilterConfig]
  )
})

const updateField = <K extends keyof FilterConfig>(field: K, value: FilterConfig[K]) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  })
}

const resetFilters = () => {
  emit('update:modelValue', { ...defaultValues })
}

const applyPreset = (preset: FilterPreset) => {
  emit('update:modelValue', {
    ...defaultValues,
    ...preset.values,
  })
}
</script>

<style scoped>
.filter-module {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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

.presets {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
  margin-top: 0.25rem;
}

.preset-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  border: 1px solid var(--color-neutral-200);
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-button:hover {
  border-color: var(--color-primary-300);
  background: var(--color-primary-50);
}

.preset-preview {
  width: 32px;
  height: 24px;
  background: linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1);
  border-radius: 4px;
}

.preset-button span {
  font-size: 0.625rem;
  color: var(--color-text-muted);
}
</style>
