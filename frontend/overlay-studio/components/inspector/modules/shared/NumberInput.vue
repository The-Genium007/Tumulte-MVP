<template>
  <div class="number-input-wrapper">
    <input
      ref="inputRef"
      type="number"
      class="number-input"
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      @input="handleInput"
      @blur="handleBlur"
    />
    <div class="spin-buttons">
      <button
        type="button"
        class="spin-button spin-button-up"
        tabindex="-1"
        @mousedown.prevent="startIncrement"
        @mouseup="stopIncrement"
        @mouseleave="stopIncrement"
      >
        <UIcon name="i-lucide-chevron-up" class="size-3" />
      </button>
      <button
        type="button"
        class="spin-button spin-button-down"
        tabindex="-1"
        @mousedown.prevent="startDecrement"
        @mouseup="stopDecrement"
        @mouseleave="stopDecrement"
      >
        <UIcon name="i-lucide-chevron-down" class="size-3" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: number
    min?: number
    max?: number
    step?: number
  }>(),
  {
    min: 0,
    max: 100,
    step: 1,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
let incrementInterval: ReturnType<typeof setInterval> | null = null
let decrementInterval: ReturnType<typeof setInterval> | null = null

const clamp = (value: number): number => {
  return Math.min(Math.max(value, props.min), props.max)
}

const roundToStep = (value: number): number => {
  const decimals = (props.step.toString().split('.')[1] || '').length
  return Number(value.toFixed(decimals))
}

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  const value = parseFloat(target.value)
  if (!isNaN(value)) {
    emit('update:modelValue', clamp(value))
  }
}

const handleBlur = () => {
  // Ensure value is clamped on blur
  emit('update:modelValue', clamp(props.modelValue))
}

const increment = () => {
  const newValue = roundToStep(props.modelValue + props.step)
  emit('update:modelValue', clamp(newValue))
}

const decrement = () => {
  const newValue = roundToStep(props.modelValue - props.step)
  emit('update:modelValue', clamp(newValue))
}

const startIncrement = () => {
  increment()
  incrementInterval = setInterval(increment, 100)
}

const stopIncrement = () => {
  if (incrementInterval) {
    clearInterval(incrementInterval)
    incrementInterval = null
  }
}

const startDecrement = () => {
  decrement()
  decrementInterval = setInterval(decrement, 100)
}

const stopDecrement = () => {
  if (decrementInterval) {
    clearInterval(decrementInterval)
    decrementInterval = null
  }
}

// Cleanup des intervalles au démontage pour éviter les memory leaks
onUnmounted(() => {
  if (incrementInterval) {
    clearInterval(incrementInterval)
    incrementInterval = null
  }
  if (decrementInterval) {
    clearInterval(decrementInterval)
    decrementInterval = null
  }
})
</script>

<style scoped>
.number-input-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.number-input {
  width: 64px;
  padding: 0.375rem 0.5rem;
  padding-right: 24px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--ui-text);
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: 6px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  -moz-appearance: textfield;
  appearance: textfield;
  transition: border-color 0.15s ease;
}

.number-input:hover {
  border-color: var(--ui-primary);
}

.number-input::-webkit-inner-spin-button,
.number-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}

.number-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--ui-primary);
}

.spin-buttons {
  position: absolute;
  right: 1px;
  top: 1px;
  bottom: 1px;
  display: flex;
  flex-direction: column;
  width: 20px;
  border-left: 1px solid var(--ui-border);
  border-radius: 0 5px 5px 0;
  overflow: hidden;
  background: var(--ui-bg-elevated);
}

.spin-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ui-bg-elevated);
  border: none;
  cursor: pointer;
  color: var(--ui-text-muted);
  padding: 0;
  transition: all 0.15s ease;
}

.spin-button:hover {
  background: var(--ui-bg-accented);
  color: var(--ui-primary);
  border-color: var(--ui-primary);
}

.spin-button:active {
  background: var(--ui-primary);
  color: white;
}

.spin-button-up {
  border-bottom: 1px solid var(--ui-border);
}
</style>
