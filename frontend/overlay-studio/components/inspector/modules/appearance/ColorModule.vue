<template>
  <div class="color-module">
    <label v-if="label" class="module-label">{{ label }}</label>
    <div class="color-input-wrapper">
      <!-- Color swatch button -->
      <UPopover v-model:open="pickerOpen" :ui="{ content: 'p-0' }">
        <button class="color-swatch-button" type="button">
          <span class="color-swatch-fill" :style="swatchStyle" />
          <span class="sr-only">Ouvrir le sélecteur de couleur</span>
        </button>

        <template #content>
          <div class="color-picker-panel">
            <!-- Saturation/Brightness picker -->
            <div
              ref="saturationRef"
              class="saturation-picker"
              :style="saturationBackgroundStyle"
              @mousedown="startSaturationDrag"
              @touchstart.prevent="startSaturationDrag"
            >
              <div class="saturation-white" />
              <div class="saturation-black" />
              <div class="saturation-cursor" :style="saturationCursorStyle" />
            </div>

            <!-- Hue slider -->
            <div class="picker-slider-row">
              <label class="picker-label">Teinte</label>
              <div
                ref="hueRef"
                class="hue-slider"
                @mousedown="startHueDrag"
                @touchstart.prevent="startHueDrag"
              >
                <div class="hue-cursor" :style="hueCursorStyle" />
              </div>
            </div>

            <!-- Alpha slider -->
            <div v-if="showAlpha" class="picker-slider-row">
              <label class="picker-label">Opacité</label>
              <div
                ref="alphaRef"
                class="alpha-slider"
                @mousedown="startAlphaDrag"
                @touchstart.prevent="startAlphaDrag"
              >
                <div class="alpha-checkerboard" />
                <div class="alpha-gradient" :style="alphaGradientStyle" />
                <div class="alpha-cursor" :style="alphaCursorStyle" />
              </div>
              <span class="alpha-value">{{ Math.round(currentAlpha * 100) }}%</span>
            </div>

            <!-- Color input -->
            <div class="picker-input-row">
              <input
                :value="displayValue"
                class="picker-input"
                placeholder="#000000"
                @input="handleTextInput"
                @blur="handleTextBlur"
              />
            </div>

            <!-- Presets -->
            <div v-if="presets && presets.length > 0" class="picker-presets">
              <button
                v-for="preset in presets"
                :key="preset"
                class="preset-color"
                :class="{ active: isPresetActive(preset) }"
                :style="{ backgroundColor: preset }"
                :title="preset"
                type="button"
                @click="applyPreset(preset)"
              />
            </div>
          </div>
        </template>
      </UPopover>

      <!-- Text input -->
      <UInput
        :model-value="displayValue"
        size="xs"
        class="color-text"
        :ui="inputUi"
        placeholder="#000000"
        @update:model-value="handleMainTextInput"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    showAlpha?: boolean
    presets?: string[]
  }>(),
  {
    label: '',
    showAlpha: true,
    presets: () => [],
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const pickerOpen = ref(false)
const saturationRef = ref<HTMLElement | null>(null)
const hueRef = ref<HTMLElement | null>(null)
const alphaRef = ref<HTMLElement | null>(null)

// Internal HSV state
const internalHue = ref(0)
const internalSaturation = ref(100)
const internalValue = ref(100)
const internalAlpha = ref(1)

// Drag state
const isDraggingSaturation = ref(false)
const isDraggingHue = ref(false)
const isDraggingAlpha = ref(false)

const inputUi = {
  root: 'ring-0 border-0 rounded-lg overflow-hidden',
  base: 'px-2 py-1.5 bg-neutral-100 text-neutral-700 placeholder:text-neutral-400 rounded-lg text-xs font-mono',
}

// === Color conversion utilities ===

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1] || '0', 16),
        g: parseInt(result[2] || '0', 16),
        b: parseInt(result[3] || '0', 16),
      }
    : null
}

const rgbToHex = (r: number, g: number, b: number): string => {
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

const rgbToHsv = (r: number, g: number, b: number): { h: number; s: number; v: number } => {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return { h: h * 360, s: s * 100, v: v * 100 }
}

const hsvToRgb = (h: number, s: number, v: number): { r: number; g: number; b: number } => {
  h /= 360
  s /= 100
  v /= 100
  let r = 0,
    g = 0,
    b = 0
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)

  switch (i % 6) {
    case 0:
      r = v
      g = t
      b = p
      break
    case 1:
      r = q
      g = v
      b = p
      break
    case 2:
      r = p
      g = v
      b = t
      break
    case 3:
      r = p
      g = q
      b = v
      break
    case 4:
      r = t
      g = p
      b = v
      break
    case 5:
      r = v
      g = p
      b = q
      break
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}

// Parse color from modelValue
const parseColor = (color: string): { r: number; g: number; b: number; a: number } => {
  if (!color) return { r: 0, g: 0, b: 0, a: 1 }

  // Format rgba(r, g, b, a)
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1] || '0'),
      g: parseInt(rgbaMatch[2] || '0'),
      b: parseInt(rgbaMatch[3] || '0'),
      a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
    }
  }

  // Format #RRGGBBAA
  if (color.match(/^#[0-9a-fA-F]{8}$/)) {
    const rgb = hexToRgb(color.slice(0, 7))
    const a = parseInt(color.slice(7, 9), 16) / 255
    return rgb ? { ...rgb, a } : { r: 0, g: 0, b: 0, a: 1 }
  }

  // Format #RRGGBB
  if (color.match(/^#[0-9a-fA-F]{6}$/)) {
    const rgb = hexToRgb(color)
    return rgb ? { ...rgb, a: 1 } : { r: 0, g: 0, b: 0, a: 1 }
  }

  // Format #RGB
  if (color.match(/^#[0-9a-fA-F]{3}$/)) {
    const r = parseInt((color[1] || '0') + (color[1] || '0'), 16)
    const g = parseInt((color[2] || '0') + (color[2] || '0'), 16)
    const b = parseInt((color[3] || '0') + (color[3] || '0'), 16)
    return { r, g, b, a: 1 }
  }

  return { r: 0, g: 0, b: 0, a: 1 }
}

// Update internal state from modelValue
const syncFromModelValue = () => {
  const { r, g, b, a } = parseColor(props.modelValue)
  const hsv = rgbToHsv(r, g, b)
  internalHue.value = hsv.h
  internalSaturation.value = hsv.s
  internalValue.value = hsv.v
  internalAlpha.value = a
}

// Emit color change
const emitColor = () => {
  const { r, g, b } = hsvToRgb(internalHue.value, internalSaturation.value, internalValue.value)
  const a = internalAlpha.value

  if (a >= 1) {
    emit('update:modelValue', rgbToHex(r, g, b))
  } else {
    emit('update:modelValue', `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`)
  }
}

// Computed values
const currentAlpha = computed(() => internalAlpha.value)

const displayValue = computed(() => {
  const { r, g, b } = hsvToRgb(internalHue.value, internalSaturation.value, internalValue.value)
  const a = internalAlpha.value
  if (a >= 1) {
    return rgbToHex(r, g, b)
  }
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`
})

const swatchStyle = computed(() => {
  const { r, g, b } = hsvToRgb(internalHue.value, internalSaturation.value, internalValue.value)
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${internalAlpha.value})`,
  }
})

const saturationBackgroundStyle = computed(() => {
  const { r, g, b } = hsvToRgb(internalHue.value, 100, 100)
  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
  }
})

const saturationCursorStyle = computed(() => ({
  left: `${internalSaturation.value}%`,
  top: `${100 - internalValue.value}%`,
}))

const hueCursorStyle = computed(() => ({
  left: `${(internalHue.value / 360) * 100}%`,
}))

const alphaGradientStyle = computed(() => {
  const { r, g, b } = hsvToRgb(internalHue.value, internalSaturation.value, internalValue.value)
  return {
    background: `linear-gradient(to right, transparent, rgb(${r}, ${g}, ${b}))`,
  }
})

const alphaCursorStyle = computed(() => ({
  left: `${internalAlpha.value * 100}%`,
}))

// === Drag handlers ===

const startSaturationDrag = (e: MouseEvent | TouchEvent) => {
  isDraggingSaturation.value = true
  updateSaturation(e)
}

const startHueDrag = (e: MouseEvent | TouchEvent) => {
  isDraggingHue.value = true
  updateHue(e)
}

const startAlphaDrag = (e: MouseEvent | TouchEvent) => {
  isDraggingAlpha.value = true
  updateAlpha(e)
}

const updateSaturation = (e: MouseEvent | TouchEvent) => {
  if (!saturationRef.value) return
  const rect = saturationRef.value.getBoundingClientRect()
  const clientX = 'touches' in e ? (e.touches[0]?.clientX ?? 0) : e.clientX
  const clientY = 'touches' in e ? (e.touches[0]?.clientY ?? 0) : e.clientY

  const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))

  internalSaturation.value = x * 100
  internalValue.value = (1 - y) * 100
  emitColor()
}

const updateHue = (e: MouseEvent | TouchEvent) => {
  if (!hueRef.value) return
  const rect = hueRef.value.getBoundingClientRect()
  const clientX = 'touches' in e ? (e.touches[0]?.clientX ?? 0) : e.clientX

  const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  internalHue.value = x * 360
  emitColor()
}

const updateAlpha = (e: MouseEvent | TouchEvent) => {
  if (!alphaRef.value) return
  const rect = alphaRef.value.getBoundingClientRect()
  const clientX = 'touches' in e ? (e.touches[0]?.clientX ?? 0) : e.clientX

  const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  internalAlpha.value = x
  emitColor()
}

const handleMouseMove = (e: MouseEvent) => {
  if (isDraggingSaturation.value) updateSaturation(e)
  if (isDraggingHue.value) updateHue(e)
  if (isDraggingAlpha.value) updateAlpha(e)
}

const handleTouchMove = (e: TouchEvent) => {
  if (isDraggingSaturation.value) updateSaturation(e)
  if (isDraggingHue.value) updateHue(e)
  if (isDraggingAlpha.value) updateAlpha(e)
}

const handleMouseUp = () => {
  isDraggingSaturation.value = false
  isDraggingHue.value = false
  isDraggingAlpha.value = false
}

// Text input handlers
const handleTextInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  const value = target.value.trim()
  if (value) {
    const parsed = parseColor(value)
    if (
      parsed.r !== 0 ||
      parsed.g !== 0 ||
      parsed.b !== 0 ||
      value === '#000000' ||
      value === 'rgba(0, 0, 0, 1)'
    ) {
      const hsv = rgbToHsv(parsed.r, parsed.g, parsed.b)
      internalHue.value = hsv.h
      internalSaturation.value = hsv.s
      internalValue.value = hsv.v
      internalAlpha.value = parsed.a
      emitColor()
    }
  }
}

const handleTextBlur = () => {
  // Re-sync display on blur
}

const handleMainTextInput = (value: string | number) => {
  const strValue = String(value).trim()
  if (strValue) {
    const parsed = parseColor(strValue)
    const hsv = rgbToHsv(parsed.r, parsed.g, parsed.b)
    internalHue.value = hsv.h
    internalSaturation.value = hsv.s
    internalValue.value = hsv.v
    internalAlpha.value = parsed.a
    emitColor()
  }
}

const isPresetActive = (preset: string) => {
  const presetParsed = parseColor(preset)
  const { r, g, b } = hsvToRgb(internalHue.value, internalSaturation.value, internalValue.value)
  return presetParsed.r === r && presetParsed.g === g && presetParsed.b === b
}

const applyPreset = (preset: string) => {
  const parsed = parseColor(preset)
  const hsv = rgbToHsv(parsed.r, parsed.g, parsed.b)
  internalHue.value = hsv.h
  internalSaturation.value = hsv.s
  internalValue.value = hsv.v
  // Keep current alpha when applying preset
  emitColor()
}

// Lifecycle
onMounted(() => {
  syncFromModelValue()
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('touchmove', handleTouchMove)
  document.addEventListener('touchend', handleMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('touchmove', handleTouchMove)
  document.removeEventListener('touchend', handleMouseUp)
})

// Watch for external changes
watch(
  () => props.modelValue,
  () => {
    if (!isDraggingSaturation.value && !isDraggingHue.value && !isDraggingAlpha.value) {
      syncFromModelValue()
    }
  }
)
</script>

<style scoped>
.color-module {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.module-label {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
  font-weight: 500;
}

.color-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Color swatch button */
.color-swatch-button {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid var(--ui-border);
  cursor: pointer;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  /* Checkerboard background for transparency */
  background-image: repeating-conic-gradient(var(--ui-bg-accented) 0% 25%, var(--ui-bg) 0% 50%);
  background-size: 8px 8px;
}

.color-swatch-fill {
  position: absolute;
  inset: 0;
  border-radius: 5px;
}

.color-swatch-button:hover {
  border-color: var(--ui-primary);
}

.color-swatch-button:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--ui-primary);
}

.color-text {
  flex: 1;
  min-width: 100px;
}

/* Color picker panel */
.color-picker-panel {
  width: 240px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--ui-bg);
  border-radius: 8px;
}

/* Saturation picker */
.saturation-picker {
  position: relative;
  width: 100%;
  height: 140px;
  border-radius: 6px;
  cursor: crosshair;
  overflow: hidden;
}

.saturation-white {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, white, transparent);
}

.saturation-black {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, black, transparent);
}

.saturation-cursor {
  position: absolute;
  width: 14px;
  height: 14px;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.2);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* Slider rows */
.picker-slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.picker-label {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--ui-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  width: 50px;
  flex-shrink: 0;
}

/* Hue slider */
.hue-slider {
  position: relative;
  flex: 1;
  height: 12px;
  border-radius: 6px;
  cursor: pointer;
  background: linear-gradient(
    to right,
    #ff0000 0%,
    #ffff00 17%,
    #00ff00 33%,
    #00ffff 50%,
    #0000ff 67%,
    #ff00ff 83%,
    #ff0000 100%
  );
}

.hue-cursor {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  background: white;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.2),
    0 2px 4px rgba(0, 0, 0, 0.15);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* Alpha slider */
.alpha-slider {
  position: relative;
  flex: 1;
  height: 12px;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
}

.alpha-checkerboard {
  position: absolute;
  inset: 0;
  background: repeating-conic-gradient(var(--ui-bg-accented) 0% 25%, var(--ui-bg) 0% 50%) 50% / 8px
    8px;
  border-radius: 6px;
}

.alpha-gradient {
  position: absolute;
  inset: 0;
  border-radius: 6px;
}

.alpha-cursor {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  background: white;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.2),
    0 2px 4px rgba(0, 0, 0, 0.15);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.alpha-value {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
  font-variant-numeric: tabular-nums;
  width: 36px;
  text-align: right;
  flex-shrink: 0;
}

/* Input row */
.picker-input-row {
  display: flex;
}

.picker-input {
  flex: 1;
  padding: 6px 10px;
  font-size: 0.75rem;
  font-family: ui-monospace, monospace;
  color: var(--ui-text);
  background: var(--ui-bg-elevated);
  border: none;
  border-radius: 6px;
  outline: none;
  transition: box-shadow 0.15s ease;
}

.picker-input:focus {
  box-shadow: 0 0 0 2px var(--ui-primary);
}

/* Presets */
.picker-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--ui-border);
}

.preset-color {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-color:hover {
  transform: scale(1.15);
}

.preset-color.active {
  border-color: var(--ui-primary);
  box-shadow: 0 0 0 2px var(--ui-primary);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
