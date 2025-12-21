<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="buttonClasses"
    @click="handleClick"
  >
    <span v-if="loading" class="button-spinner">
      <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </span>
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  disabled: false,
  loading: false,
  fullWidth: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonClasses = computed(() => {
  const classes = [
    'button',
    `button-${props.variant}`,
    `button-${props.size}`,
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200',
  ]

  if (props.fullWidth) {
    classes.push('w-full')
  }

  if (props.disabled || props.loading) {
    classes.push('opacity-50 cursor-not-allowed')
  }

  return classes.join(' ')
})

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<style scoped>
/* Button base */
.button {
  border: 1px solid transparent;
  cursor: pointer;
}

.button:focus {
  outline: none;
  ring: 2px;
  ring-offset: 2px;
}

/* Sizes */
.button-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.button-md {
  padding: 0.625rem 1.25rem;
  font-size: 1rem;
  line-height: 1.5rem;
}

.button-lg {
  padding: 0.75rem 1.5rem;
  font-size: 1.125rem;
  line-height: 1.75rem;
}

/* Variants */
.button-primary {
  background-color: rgb(99 102 241);
  color: white;
}

.button-primary:hover:not(:disabled) {
  background-color: rgb(79 70 229);
}

.button-primary:focus {
  ring-color: rgb(99 102 241);
}

.button-secondary {
  background-color: rgb(107 114 128);
  color: white;
}

.button-secondary:hover:not(:disabled) {
  background-color: rgb(75 85 99);
}

.button-danger {
  background-color: rgb(239 68 68);
  color: white;
}

.button-danger:hover:not(:disabled) {
  background-color: rgb(220 38 38);
}

.button-ghost {
  background-color: transparent;
  color: rgb(107 114 128);
}

.button-ghost:hover:not(:disabled) {
  background-color: rgb(243 244 246);
}

.button-outline {
  background-color: transparent;
  border-color: rgb(209 213 219);
  color: rgb(55 65 81);
}

.button-outline:hover:not(:disabled) {
  background-color: rgb(249 250 251);
}

/* Spinner */
.button-spinner {
  display: inline-flex;
  align-items: center;
}
</style>
