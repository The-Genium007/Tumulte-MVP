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
  color: var(--color-text-primary);
  background: var(--color-neutral-100);
  border: none;
  border-radius: 6px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  -moz-appearance: textfield;
  appearance: textfield;
}

.number-input::-webkit-inner-spin-button,
.number-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}

.number-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-primary-200);
}

.spin-buttons {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  width: 20px;
  border-left: 1px solid var(--color-neutral-200);
  border-radius: 0 6px 6px 0;
  overflow: hidden;
}

.spin-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-neutral-100);
  border: none;
  cursor: pointer;
  color: var(--color-neutral-400);
  padding: 0;
  transition: all 0.15s ease;
}

.spin-button:hover {
  background: var(--color-neutral-200);
  color: var(--color-primary-500);
}

.spin-button:active {
  background: var(--color-primary-100);
  color: var(--color-primary-600);
}

.spin-button-up {
  border-bottom: 1px solid var(--color-neutral-200);
}
</style>
