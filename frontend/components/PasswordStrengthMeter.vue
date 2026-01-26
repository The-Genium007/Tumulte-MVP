<template>
  <div class="space-y-2">
    <!-- Strength bar -->
    <div class="flex gap-1">
      <div
        v-for="i in 5"
        :key="i"
        class="h-1.5 flex-1 rounded-full transition-all duration-300"
        :class="getBarClass(i)"
      />
    </div>

    <!-- Strength label and crack time -->
    <div v-if="password.length > 0" class="flex justify-between items-center text-xs">
      <span :class="getLabelClass()">
        {{ scoreLabel }}
      </span>
      <span v-if="crackTimeDisplay" class="text-muted">
        Temps de crack : {{ crackTimeDisplay }}
      </span>
    </div>

    <!-- Feedback -->
    <div v-if="showFeedback && password.length > 0" class="space-y-1">
      <p v-if="feedback.warning" class="text-xs text-warning-500 flex items-start gap-1">
        <UIcon name="i-lucide-alert-triangle" class="size-3.5 mt-0.5 shrink-0" />
        <span>{{ feedback.warning }}</span>
      </p>
      <ul v-if="feedback.suggestions.length > 0" class="text-xs text-muted space-y-0.5">
        <li
          v-for="(suggestion, idx) in feedback.suggestions"
          :key="idx"
          class="flex items-start gap-1"
        >
          <UIcon name="i-lucide-lightbulb" class="size-3.5 mt-0.5 shrink-0 text-primary-400" />
          <span>{{ suggestion }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, toRef } from 'vue'
import { usePasswordStrength } from '@/composables/usePasswordStrength'

const props = withDefaults(
  defineProps<{
    modelValue: string
    showFeedback?: boolean
  }>(),
  {
    showFeedback: true,
  }
)

const emit = defineEmits<{
  'update:score': [score: number]
  'update:isStrong': [isStrong: boolean]
}>()

const { password, score, scoreLabel, scoreColor, feedback, crackTimeDisplay, isStrong } =
  usePasswordStrength()

// Sync password from props
watch(
  toRef(props, 'modelValue'),
  (newValue) => {
    password.value = newValue
  },
  { immediate: true }
)

// Emit score and strength changes (immediate: true to sync initial state)
watch(
  score,
  (newScore) => {
    emit('update:score', newScore)
  },
  { immediate: true }
)

watch(
  isStrong,
  (newIsStrong) => {
    emit('update:isStrong', newIsStrong)
  },
  { immediate: true }
)

function getBarClass(index: number): string {
  const filled = index <= score.value + 1
  if (!filled || password.value.length === 0) {
    return 'bg-default-200'
  }

  const colorMap: Record<string, string> = {
    error: 'bg-error-500',
    warning: 'bg-warning-500',
    success: 'bg-success-500',
  }

  return colorMap[scoreColor.value] || 'bg-default-200'
}

function getLabelClass(): string {
  const colorMap: Record<string, string> = {
    error: 'text-error-500',
    warning: 'text-warning-500',
    success: 'text-success-500',
  }

  return colorMap[scoreColor.value] || 'text-muted'
}
</script>
