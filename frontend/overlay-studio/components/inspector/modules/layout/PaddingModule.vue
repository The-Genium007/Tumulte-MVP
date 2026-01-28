<template>
  <div class="padding-module">
    <!-- Mode Toggle -->
    <div class="mode-toggle">
      <button
        class="mode-button"
        :class="{ active: !individualSidesEnabled }"
        @click="individualSidesEnabled = false"
      >
        <UIcon name="i-lucide-square" class="size-4" />
        <span>Uniforme</span>
      </button>
      <button
        class="mode-button"
        :class="{ active: individualSidesEnabled }"
        @click="individualSidesEnabled = true"
      >
        <UIcon name="i-lucide-move" class="size-4" />
        <span>Côtés</span>
      </button>
    </div>

    <!-- Uniform Padding -->
    <div v-if="!individualSidesEnabled" class="inline-field">
      <label>Padding</label>
      <div class="input-with-unit">
        <NumberInput
          :model-value="uniformPadding"
          :min="0"
          :max="maxPadding"
          :step="1"
          @update:model-value="updateUniformPadding"
        />
        <span class="unit">px</span>
      </div>
    </div>

    <!-- Individual Sides -->
    <div v-else class="sides-grid">
      <!-- Top -->
      <div class="side-field top">
        <UIcon name="i-lucide-arrow-up" class="size-3" />
        <NumberInput
          :model-value="modelValue.top"
          :min="0"
          :max="maxPadding"
          :step="1"
          @update:model-value="(v) => updateSide('top', v)"
        />
      </div>

      <!-- Middle row: Left - Preview - Right -->
      <div class="side-field left">
        <UIcon name="i-lucide-arrow-left" class="size-3" />
        <NumberInput
          :model-value="modelValue.left"
          :min="0"
          :max="maxPadding"
          :step="1"
          @update:model-value="(v) => updateSide('left', v)"
        />
      </div>

      <div class="preview-center">
        <div class="preview-box" :style="previewStyle">
          <div class="preview-content" />
        </div>
      </div>

      <div class="side-field right">
        <NumberInput
          :model-value="modelValue.right"
          :min="0"
          :max="maxPadding"
          :step="1"
          @update:model-value="(v) => updateSide('right', v)"
        />
        <UIcon name="i-lucide-arrow-right" class="size-3" />
      </div>

      <!-- Bottom -->
      <div class="side-field bottom">
        <UIcon name="i-lucide-arrow-down" class="size-3" />
        <NumberInput
          :model-value="modelValue.bottom"
          :min="0"
          :max="maxPadding"
          :step="1"
          @update:model-value="(v) => updateSide('bottom', v)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import NumberInput from '../shared/NumberInput.vue'

export interface PaddingConfig {
  top: number
  right: number
  bottom: number
  left: number
}

const props = withDefaults(
  defineProps<{
    modelValue: PaddingConfig
    maxPadding?: number
  }>(),
  {
    maxPadding: 64,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: PaddingConfig]
}>()

const individualSidesEnabled = ref(false)

const uniformPadding = computed(() => {
  const { top, right, bottom, left } = props.modelValue
  // Retourne la valeur si tous les côtés sont égaux, sinon la moyenne
  if (top === right && right === bottom && bottom === left) {
    return top
  }
  return Math.round((top + right + bottom + left) / 4)
})

const previewStyle = computed(() => ({
  padding: `${Math.min(props.modelValue.top, 12)}px ${Math.min(props.modelValue.right, 12)}px ${Math.min(props.modelValue.bottom, 12)}px ${Math.min(props.modelValue.left, 12)}px`,
}))

const updateUniformPadding = (value: number) => {
  emit('update:modelValue', {
    top: value,
    right: value,
    bottom: value,
    left: value,
  })
}

const updateSide = (side: keyof PaddingConfig, value: number) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [side]: Math.max(0, Math.min(value, props.maxPadding)),
  })
}
</script>

<style scoped>
.padding-module {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mode-toggle {
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  background: var(--ui-bg-elevated);
  border-radius: 8px;
}

.mode-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--ui-text-muted);
  transition: all 0.15s ease;
}

.mode-button:hover {
  color: var(--ui-text);
  border-color: var(--ui-border);
}

.mode-button.active {
  background: var(--ui-bg);
  color: var(--ui-text);
  border-color: var(--ui-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

.sides-grid {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto auto auto;
  gap: 0.5rem;
  align-items: center;
  justify-items: center;
}

.side-field {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--ui-text-muted);
}

.side-field.top {
  grid-column: 2;
  grid-row: 1;
  flex-direction: column;
}

.side-field.left {
  grid-column: 1;
  grid-row: 2;
}

.side-field.right {
  grid-column: 3;
  grid-row: 2;
}

.side-field.bottom {
  grid-column: 2;
  grid-row: 3;
  flex-direction: column;
}

.preview-center {
  grid-column: 2;
  grid-row: 2;
  padding: 0.25rem;
}

.preview-box {
  width: 40px;
  height: 28px;
  background: var(--ui-bg-accented);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: padding 0.15s ease;
}

.preview-content {
  width: 100%;
  height: 100%;
  background: var(--ui-primary);
  border-radius: 2px;
}
</style>
