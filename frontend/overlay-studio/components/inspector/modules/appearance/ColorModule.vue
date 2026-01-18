<template>
  <div class="color-module">
    <label v-if="label" class="module-label">{{ label }}</label>
    <div class="color-input-wrapper">
      <input
        type="color"
        :value="modelValue"
        class="color-picker"
        @input="handleColorInput"
      />
      <UInput
        :model-value="modelValue"
        size="xs"
        class="color-text"
        :ui="inputUi"
        @update:model-value="handleTextInput"
      />
      <div v-if="showOpacity" class="opacity-control">
        <URange
          :model-value="opacity"
          :min="0"
          :max="100"
          :step="1"
          size="sm"
          class="opacity-slider"
          @update:model-value="handleOpacityChange"
        />
        <span class="opacity-value">{{ opacity }}%</span>
      </div>
    </div>
    <div v-if="presets && presets.length > 0" class="color-presets">
      <button
        v-for="preset in presets"
        :key="preset"
        class="preset-color"
        :class="{ active: modelValue === preset }"
        :style="{ backgroundColor: preset }"
        :title="preset"
        @click="$emit('update:modelValue', preset)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    label?: string;
    showOpacity?: boolean;
    opacity?: number;
    presets?: string[];
  }>(),
  {
    label: "",
    showOpacity: false,
    opacity: 100,
    presets: () => [],
  },
);

 
const emit = defineEmits<{
  "update:modelValue": [value: string];
  "update:opacity": [value: number];
}>();

const inputUi = {
  root: "ring-0 border-0 rounded-lg overflow-hidden",
  base: "px-2 py-1.5 bg-neutral-100 text-neutral-700 placeholder:text-neutral-400 rounded-lg text-xs",
};

// Convertit hex en rgba si opacité < 100
const _displayColor = computed(() => {
  if (!props.showOpacity || props.opacity === 100) {
    return props.modelValue;
  }
  return props.modelValue;
});

const handleColorInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit("update:modelValue", target.value);
};

const handleTextInput = (value: string | number) => {
  emit("update:modelValue", String(value));
};

const handleOpacityChange = (value: number) => {
  emit("update:opacity", value);
};
</script>

<style scoped>
.color-module {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.module-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

.color-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.color-picker {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--color-neutral-300);
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
  background: transparent;
}

.color-picker::-webkit-color-swatch-wrapper {
  padding: 2px;
}

.color-picker::-webkit-color-swatch {
  border-radius: 4px;
  border: none;
}

.color-text {
  flex: 1;
  min-width: 80px;
}

.opacity-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  margin-top: 0.25rem;
}

.opacity-slider {
  flex: 1;
}

.opacity-value {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  min-width: 36px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.color-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.25rem;
}

.preset-color {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-color:hover {
  transform: scale(1.1);
}

.preset-color.active {
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 2px var(--color-primary-200);
}
</style>
