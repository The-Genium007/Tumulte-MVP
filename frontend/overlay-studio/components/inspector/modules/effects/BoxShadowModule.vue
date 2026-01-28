<template>
  <div class="box-shadow-module">
    <!-- Enable Toggle -->
    <div class="inline-field">
      <label>Ombre portée</label>
      <USwitch
        :model-value="modelValue.enabled"
        size="sm"
        @update:model-value="(v: boolean) => updateField('enabled', v)"
      />
    </div>

    <template v-if="modelValue.enabled">
      <!-- Shadow Type -->
      <div v-if="showInset" class="field">
        <label>Type</label>
        <div class="button-group">
          <button
            class="toggle-button"
            :class="{ active: !modelValue.inset }"
            @click="updateField('inset', false)"
          >
            Externe
          </button>
          <button
            class="toggle-button"
            :class="{ active: modelValue.inset }"
            @click="updateField('inset', true)"
          >
            Interne
          </button>
        </div>
      </div>

      <!-- Offset X -->
      <div class="slider-field">
        <div class="slider-header">
          <label>Décalage X</label>
          <span class="slider-value">{{ modelValue.offsetX }}px</span>
        </div>
        <URange
          :model-value="modelValue.offsetX"
          :min="-50"
          :max="50"
          :step="1"
          size="sm"
          @update:model-value="(v: number) => updateField('offsetX', v)"
        />
      </div>

      <!-- Offset Y -->
      <div class="slider-field">
        <div class="slider-header">
          <label>Décalage Y</label>
          <span class="slider-value">{{ modelValue.offsetY }}px</span>
        </div>
        <URange
          :model-value="modelValue.offsetY"
          :min="-50"
          :max="50"
          :step="1"
          size="sm"
          @update:model-value="(v: number) => updateField('offsetY', v)"
        />
      </div>

      <!-- Blur -->
      <div class="slider-field">
        <div class="slider-header">
          <label>Flou</label>
          <span class="slider-value">{{ modelValue.blur }}px</span>
        </div>
        <URange
          :model-value="modelValue.blur"
          :min="0"
          :max="100"
          :step="1"
          size="sm"
          @update:model-value="(v: number) => updateField('blur', v)"
        />
      </div>

      <!-- Spread -->
      <div class="slider-field">
        <div class="slider-header">
          <label>Étendue</label>
          <span class="slider-value">{{ modelValue.spread }}px</span>
        </div>
        <URange
          :model-value="modelValue.spread"
          :min="-20"
          :max="50"
          :step="1"
          size="sm"
          @update:model-value="(v: number) => updateField('spread', v)"
        />
      </div>

      <!-- Color -->
      <ColorModule
        :model-value="modelValue.color"
        label="Couleur"
        @update:model-value="(v) => updateField('color', v)"
      />

      <!-- Preview -->
      <div v-if="showPreview" class="shadow-preview">
        <div class="preview-box" :style="previewStyle" />
      </div>

      <!-- Presets -->
      <div v-if="showPresets" class="presets">
        <button
          v-for="preset in presets"
          :key="preset.label"
          class="preset-button"
          @click="applyPreset(preset)"
        >
          <div class="preset-preview" :style="{ boxShadow: preset.css }" />
          <span>{{ preset.label }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ColorModule from '../appearance/ColorModule.vue'

export interface BoxShadowConfig {
  enabled: boolean
  offsetX: number
  offsetY: number
  blur: number
  spread: number
  color: string
  inset?: boolean
}

interface ShadowPreset {
  label: string
  values: Omit<BoxShadowConfig, 'enabled'>
  css: string
}

const props = withDefaults(
  defineProps<{
    modelValue: BoxShadowConfig
    showInset?: boolean
    showPreview?: boolean
    showPresets?: boolean
  }>(),
  {
    showInset: false,
    showPreview: true,
    showPresets: true,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: BoxShadowConfig]
}>()

const presets: ShadowPreset[] = [
  {
    label: 'Subtile',
    values: { offsetX: 0, offsetY: 1, blur: 3, spread: 0, color: 'rgba(0,0,0,0.1)' },
    css: '0 1px 3px rgba(0,0,0,0.1)',
  },
  {
    label: 'Légère',
    values: { offsetX: 0, offsetY: 4, blur: 6, spread: -1, color: 'rgba(0,0,0,0.1)' },
    css: '0 4px 6px -1px rgba(0,0,0,0.1)',
  },
  {
    label: 'Moyenne',
    values: { offsetX: 0, offsetY: 10, blur: 15, spread: -3, color: 'rgba(0,0,0,0.1)' },
    css: '0 10px 15px -3px rgba(0,0,0,0.1)',
  },
  {
    label: 'Forte',
    values: { offsetX: 0, offsetY: 20, blur: 25, spread: -5, color: 'rgba(0,0,0,0.15)' },
    css: '0 20px 25px -5px rgba(0,0,0,0.15)',
  },
  {
    label: 'Élevée',
    values: { offsetX: 0, offsetY: 25, blur: 50, spread: -12, color: 'rgba(0,0,0,0.25)' },
    css: '0 25px 50px -12px rgba(0,0,0,0.25)',
  },
]

const previewStyle = computed(() => {
  const { offsetX, offsetY, blur, spread, color, inset } = props.modelValue
  const insetStr = inset ? 'inset ' : ''
  return {
    boxShadow: `${insetStr}${offsetX}px ${offsetY}px ${blur}px ${spread}px ${color}`,
  }
})

const updateField = <K extends keyof BoxShadowConfig>(field: K, value: BoxShadowConfig[K]) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  })
}

const applyPreset = (preset: ShadowPreset) => {
  emit('update:modelValue', {
    ...props.modelValue,
    ...preset.values,
    enabled: true,
  })
}
</script>

<style scoped>
.box-shadow-module {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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
  color: var(--ui-text-muted);
}

.slider-value {
  font-size: 0.75rem;
  color: var(--ui-text);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.button-group {
  display: flex;
  gap: 0.25rem;
  background: var(--ui-bg-elevated);
  border-radius: 6px;
  padding: 0.25rem;
}

.toggle-button {
  flex: 1;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--ui-text-muted);
  transition: all 0.15s ease;
}

.toggle-button:hover {
  color: var(--ui-text);
  border-color: var(--ui-border);
}

.toggle-button.active {
  background: var(--ui-bg);
  color: var(--ui-text);
  border-color: var(--ui-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.shadow-preview {
  display: flex;
  justify-content: center;
  padding: 1.5rem;
  background: var(--ui-bg-elevated);
  border-radius: 8px;
}

.preview-box {
  width: 80px;
  height: 50px;
  background: var(--ui-bg);
  border-radius: 8px;
}

.presets {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.preset-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg-elevated);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-button:hover {
  border-color: var(--ui-primary);
  background: var(--ui-bg-accented);
}

.preset-preview {
  width: 32px;
  height: 20px;
  background: var(--ui-bg);
  border-radius: 4px;
}

.preset-button span {
  font-size: 0.625rem;
  color: var(--ui-text-muted);
}
</style>
