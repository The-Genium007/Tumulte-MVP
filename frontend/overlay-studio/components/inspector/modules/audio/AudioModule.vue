<template>
  <div class="audio-module">
    <!-- Header with label and toggle -->
    <div class="audio-header">
      <div class="audio-label">
        <UIcon name="i-lucide-volume-2" class="size-4" />
        <span>{{ label }}</span>
      </div>
      <USwitch
        :model-value="modelValue.enabled"
        size="sm"
        @update:model-value="(v: boolean) => updateField('enabled', v)"
      />
    </div>

    <!-- Sound Selection (if options provided) -->
    <div v-if="soundOptions.length > 0 && modelValue.enabled" class="field">
      <label>Son</label>
      <USelect
        :model-value="modelValue.soundFile"
        :items="soundOptions"
        size="xs"
        :ui="selectUi"
        @update:model-value="(v: string) => updateField('soundFile', v)"
      />
    </div>

    <!-- Volume Control - Only when enabled -->
    <div v-if="modelValue.enabled" class="volume-control">
      <button class="volume-button" title="Muet" @click="updateField('volume', 0)">
        <UIcon name="i-lucide-volume-x" class="size-4" />
      </button>
      <div class="volume-slider-wrapper">
        <input
          type="range"
          class="volume-range"
          :value="modelValue.volume"
          min="0"
          max="1"
          step="0.05"
          @input="(e) => updateField('volume', parseFloat((e.target as HTMLInputElement).value))"
        />
      </div>
      <button class="volume-button" title="Volume max" @click="updateField('volume', 1)">
        <UIcon name="i-lucide-volume-2" class="size-4" />
      </button>
      <span class="volume-value">{{ Math.round(modelValue.volume * 100) }}%</span>
    </div>

    <!-- Preview Button -->
    <UButton
      v-if="showPreview && modelValue.enabled"
      color="primary"
      variant="solid"
      :icon="isPlaying ? 'i-lucide-square' : 'i-lucide-play'"
      :label="isPlaying ? 'Arrêter' : 'Tester le son'"
      size="xs"
      block
      @click="togglePreview"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

export interface AudioConfig {
  enabled: boolean
  soundFile?: string
  volume: number
}

const props = withDefaults(
  defineProps<{
    modelValue: AudioConfig
    label?: string
    soundOptions?: { label: string; value: string }[]
    showPreview?: boolean
    previewUrl?: string
  }>(),
  {
    label: 'Son',
    soundOptions: () => [],
    showPreview: true,
    previewUrl: '',
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: AudioConfig]
}>()

// UI customization for selects
const selectUi = {
  base: 'bg-(--ui-bg-elevated) text-(--ui-text) border border-(--ui-border)',
  content: 'bg-(--ui-bg-elevated) border border-(--ui-border)',
  item: 'text-(--ui-text) data-highlighted:bg-(--ui-bg-accented)',
}

const isPlaying = ref(false)
let audioElement: HTMLAudioElement | null = null

const updateField = <K extends keyof AudioConfig>(field: K, value: AudioConfig[K]) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  })
}

const togglePreview = () => {
  if (isPlaying.value) {
    stopPreview()
  } else {
    playPreview()
  }
}

const playPreview = () => {
  const soundUrl = props.previewUrl || props.modelValue.soundFile
  if (!soundUrl) return

  stopPreview()

  audioElement = new Audio(soundUrl)
  audioElement.volume = props.modelValue.volume

  audioElement.onended = () => {
    isPlaying.value = false
  }

  audioElement.onerror = () => {
    isPlaying.value = false
    console.warn('Erreur de lecture audio')
  }

  audioElement.play()
  isPlaying.value = true
}

const stopPreview = () => {
  if (audioElement) {
    audioElement.pause()
    audioElement.currentTime = 0
    audioElement = null
  }
  isPlaying.value = false
}

onUnmounted(() => {
  stopPreview()
})
</script>

<style scoped>
.audio-module {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--ui-bg-elevated);
  border-radius: 8px;
}

.audio-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.audio-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--ui-text-muted);
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

.volume-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.volume-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg);
  border-radius: 6px;
  cursor: pointer;
  color: var(--ui-text-muted);
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.volume-button:hover:not(:disabled) {
  background: var(--ui-bg-accented);
  color: var(--ui-text);
  border-color: var(--ui-primary);
}

.volume-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.volume-slider-wrapper {
  flex: 1;
  min-width: 60px;
}

.volume-value {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--ui-text);
  font-variant-numeric: tabular-nums;
  min-width: 36px;
  text-align: right;
  flex-shrink: 0;
}
</style>
