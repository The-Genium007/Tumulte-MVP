<template>
  <div class="text-shadow-module">
    <!-- Enable Toggle -->
    <div class="inline-field">
      <label>Ombre de texte</label>
      <USwitch
        :model-value="modelValue.enabled"
        size="sm"
        @update:model-value="(v: boolean) => updateField('enabled', v)"
      />
    </div>

    <template v-if="modelValue.enabled">
      <!-- Shadow Color -->
      <ColorModule
        :model-value="modelValue.color"
        label="Couleur"
        :presets="colorPresets"
        @update:model-value="(v) => updateField('color', v)"
      />

      <!-- Blur -->
      <div class="slider-field">
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

      <!-- Offset X -->
      <div class="slider-field">
        <div class="slider-header">
          <label>Décalage X</label>
          <span class="slider-value">{{ modelValue.offsetX }}px</span>
        </div>
        <URange
          :model-value="modelValue.offsetX"
          :min="-20"
          :max="20"
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
          :min="-20"
          :max="20"
          :step="1"
          size="sm"
          @update:model-value="(v: number) => updateField('offsetY', v)"
        />
      </div>

      <!-- Preview -->
      <div v-if="showPreview" class="text-shadow-preview">
        <span class="preview-text" :style="previewStyle">Aperçu</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ColorModule from '../appearance/ColorModule.vue'

export interface TextShadowConfig {
  enabled: boolean
  color: string
  blur: number
  offsetX: number
  offsetY: number
}

const props = withDefaults(
  defineProps<{
    modelValue: TextShadowConfig
    showPreview?: boolean
  }>(),
  {
    showPreview: true,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: TextShadowConfig]
}>()

const colorPresets = [
  'rgba(0,0,0,0.5)',
  'rgba(0,0,0,0.8)',
  '#000000',
  'rgba(255,255,255,0.5)',
  '#ffffff',
  '#8b5cf6',
  '#3b82f6',
  '#22c55e',
]

const previewStyle = computed(() => {
  const { color, blur, offsetX, offsetY } = props.modelValue
  return {
    textShadow: `${offsetX}px ${offsetY}px ${blur}px ${color}`,
  }
})

const updateField = <K extends keyof TextShadowConfig>(field: K, value: TextShadowConfig[K]) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  })
}
</script>

<style scoped>
.text-shadow-module {
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

.text-shadow-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5rem;
  background: #1a1a2e;
  border: 1px solid var(--ui-border);
  border-radius: 8px;
}

.preview-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
}
</style>
