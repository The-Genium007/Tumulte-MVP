<template>
  <div class="glow-module">
    <!-- Enable Toggle -->
    <div class="inline-field">
      <label>Effet glow</label>
      <USwitch
        :model-value="modelValue.enabled"
        size="sm"
        @update:model-value="(v: boolean) => updateField('enabled', v)"
      />
    </div>

    <template v-if="modelValue.enabled">
      <!-- Glow Color -->
      <ColorModule
        :model-value="modelValue.color"
        label="Couleur"
        :presets="colorPresetValues"
        @update:model-value="(v) => updateField('color', v)"
      />

      <!-- Intensity -->
      <div class="slider-field">
        <div class="slider-header">
          <label>Intensité</label>
          <span class="slider-value">{{ modelValue.intensity.toFixed(1) }}</span>
        </div>
        <URange
          :model-value="modelValue.intensity"
          :min="0.1"
          :max="3"
          :step="0.1"
          size="sm"
          @update:model-value="(v: number) => updateField('intensity', v)"
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
          :min="5"
          :max="50"
          :step="1"
          size="sm"
          @update:model-value="(v: number) => updateField('spread', v)"
        />
      </div>

      <!-- Animation -->
      <div v-if="showAnimation" class="field">
        <label>Animation</label>
        <USelect
          :model-value="modelValue.animation || 'none'"
          :items="animationOptions"
          size="xs"
          :ui="selectUi"
          @update:model-value="(v: string) => updateField('animation', v)"
        />
      </div>

      <!-- Animation Speed -->
      <div
        v-if="showAnimation && modelValue.animation && modelValue.animation !== 'none'"
        class="slider-field"
      >
        <div class="slider-header">
          <label>Vitesse</label>
          <span class="slider-value">{{ (modelValue.animationSpeed || 1).toFixed(1) }}s</span>
        </div>
        <URange
          :model-value="modelValue.animationSpeed || 1"
          :min="0.5"
          :max="5"
          :step="0.1"
          size="sm"
          @update:model-value="(v: number) => updateField('animationSpeed', v)"
        />
      </div>

      <!-- Preview -->
      <div v-if="showPreview" class="glow-preview">
        <div
          class="preview-box"
          :style="previewStyle"
          :class="{
            'animate-pulse': modelValue.animation === 'pulse',
            'animate-breathe': modelValue.animation === 'breathe',
          }"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ColorModule from '../appearance/ColorModule.vue'

export interface GlowConfig {
  enabled: boolean
  color: string
  intensity: number
  spread: number
  animation?: string
  animationSpeed?: number
}

const props = withDefaults(
  defineProps<{
    modelValue: GlowConfig
    showAnimation?: boolean
    showPreview?: boolean
  }>(),
  {
    showAnimation: true,
    showPreview: true,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: GlowConfig]
}>()

const colorPresets = [
  { label: 'Bleu néon', value: '#00d4ff' },
  { label: 'Rose néon', value: '#ff00ff' },
  { label: 'Vert néon', value: '#00ff88' },
  { label: 'Jaune néon', value: '#ffff00' },
  { label: 'Orange néon', value: '#ff8800' },
  { label: 'Rouge néon', value: '#ff0044' },
  { label: 'Violet néon', value: '#aa00ff' },
  { label: 'Blanc', value: '#ffffff' },
  { label: 'Or', value: '#ffd700' },
  { label: 'Argent', value: '#c0c0c0' },
]

const colorPresetValues = colorPresets.map((p) => p.value)

const animationOptions = [
  { label: 'Aucune', value: 'none' },
  { label: 'Pulsation', value: 'pulse' },
  { label: 'Respiration', value: 'breathe' },
  { label: 'Clignotement', value: 'blink' },
]

// UI customization for selects
const selectUi = {
  base: 'bg-(--ui-bg-elevated) text-(--ui-text) border border-(--ui-border)',
  content: 'bg-(--ui-bg-elevated) border border-(--ui-border)',
  item: 'text-(--ui-text) data-highlighted:bg-(--ui-bg-accented)',
}

const previewStyle = computed(() => {
  const { color, intensity, spread } = props.modelValue
  const glowSize = spread * intensity
  return {
    boxShadow: `
      0 0 ${glowSize * 0.5}px ${color},
      0 0 ${glowSize}px ${color},
      0 0 ${glowSize * 1.5}px ${color}
    `,
    borderColor: color,
    animationDuration: `${props.modelValue.animationSpeed || 1}s`,
  }
})

const updateField = <K extends keyof GlowConfig>(field: K, value: GlowConfig[K]) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  })
}
</script>

<style scoped>
.glow-module {
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

.glow-preview {
  display: flex;
  justify-content: center;
  padding: 2rem;
  background: #1a1a2e;
  border: 1px solid var(--ui-border);
  border-radius: 8px;
}

.preview-box {
  width: 60px;
  height: 40px;
  background: #1a1a2e;
  border: 2px solid;
  border-radius: 8px;
}

.preview-box.animate-pulse {
  animation: pulse-glow var(--animation-duration, 1s) ease-in-out infinite;
}

.preview-box.animate-breathe {
  animation: breathe-glow var(--animation-duration, 1s) ease-in-out infinite;
}

@keyframes pulse-glow {
  0%,
  100% {
    opacity: 1;
    filter: brightness(1);
  }
  50% {
    opacity: 0.7;
    filter: brightness(1.3);
  }
}

@keyframes breathe-glow {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}
</style>
