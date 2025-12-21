<template>
  <div :class="spinnerClasses">
    <svg
      class="animate-spin"
      :style="{ width: sizeValue, height: sizeValue }"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      ></circle>
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'secondary' | 'white'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  color: 'primary',
})

const sizeValue = computed(() => {
  const sizes = {
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
  }
  return sizes[props.size]
})

const spinnerClasses = computed(() => {
  const classes = ['loading-spinner', 'inline-flex']

  const colors = {
    primary: 'text-indigo-600',
    secondary: 'text-gray-600',
    white: 'text-white',
  }

  classes.push(colors[props.color])

  return classes.join(' ')
})
</script>
