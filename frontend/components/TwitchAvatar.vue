<template>
  <div class="relative">
    <img
      v-if="imageUrl"
      :src="imageUrl"
      :alt="displayName"
      :class="[
        'rounded-full ring-2 ring-purple-500/20',
        sizeClasses
      ]"
    />
    <div
      v-else
      :class="[
        'rounded-full ring-2 ring-purple-500/20 bg-purple-500/20 flex items-center justify-center',
        sizeClasses
      ]"
    >
      <UIcon name="i-lucide-user" :class="iconSizeClasses" class="text-purple-500" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  imageUrl?: string | null
  displayName: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), {
  imageUrl: null,
  size: 'md'
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'size-8'
    case 'md':
      return 'size-10'
    case 'lg':
      return 'size-12'
    case 'xl':
      return 'size-16'
    default:
      return 'size-10'
  }
})

const iconSizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'size-4'
    case 'md':
      return 'size-5'
    case 'lg':
      return 'size-6'
    case 'xl':
      return 'size-8'
    default:
      return 'size-5'
  }
})
</script>
