<script setup lang="ts">
/**
 * CharacterAvatar - Avatar component with fallback for characters
 *
 * Handles broken images gracefully (e.g., localhost URLs from Foundry)
 * without triggering console errors for Mixed Content or CSP violations.
 */

const props = withDefaults(
  defineProps<{
    src: string | null | undefined
    alt: string
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  }>(),
  {
    size: 'md',
  }
)

const imageError = ref(false)

// Check if the URL is valid for display (HTTPS or data URL)
const isValidUrl = computed(() => {
  if (!props.src) return false
  // Allow HTTPS URLs and data URLs
  if (props.src.startsWith('https://') || props.src.startsWith('data:')) {
    return true
  }
  // Block HTTP URLs (Mixed Content)
  if (props.src.startsWith('http://')) {
    return false
  }
  // Relative paths won't work without a Foundry proxy - use fallback
  return false
})

const showFallback = computed(() => !isValidUrl.value || imageError.value)

// Get initials from alt text for fallback
const initials = computed(() => {
  if (!props.alt) return '?'
  const words = props.alt.trim().split(/\s+/)
  if (words.length === 1) {
    return words[0]?.substring(0, 2).toUpperCase() ?? '?'
  }
  const first = words[0]?.[0] ?? ''
  const second = words[1]?.[0] ?? ''
  return (first + second).toUpperCase() || '?'
})

const handleError = () => {
  imageError.value = true
}

// Reset error state when src changes
watch(
  () => props.src,
  () => {
    imageError.value = false
  }
)
</script>

<template>
  <UAvatar
    v-if="!showFallback"
    :src="src || undefined"
    :alt="alt"
    :size="size"
    @error="handleError"
  />
  <UAvatar v-else :alt="alt" :size="size">
    <span class="text-xs font-medium">{{ initials }}</span>
  </UAvatar>
</template>
