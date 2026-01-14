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
  outline: 2px solid;
  outline-offset: 2px;
}

/* Sizes */
.button-sm {
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--text-sm);
  line-height: var(--text-sm--line-height);
}

.button-md {
  padding: var(--spacing-2_5) var(--spacing-5);
  font-size: var(--text-base);
  line-height: var(--text-base--line-height);
}

.button-lg {
  padding: var(--spacing-3) var(--spacing-6);
  font-size: var(--text-lg);
  line-height: var(--text-lg--line-height);
}

/* Variants */
.button-primary {
  background-color: var(--color-brand-500);
  color: var(--color-text-inverse);
}

.button-primary:hover:not(:disabled) {
  background-color: var(--color-brand-600);
}

.button-primary:focus {
  outline-color: var(--color-brand-500);
}

.button-secondary {
  background-color: var(--color-neutral-500);
  color: var(--color-text-inverse);
}

.button-secondary:hover:not(:disabled) {
  background-color: var(--color-neutral-600);
}

.button-danger {
  background-color: var(--color-error-500);
  color: var(--color-text-inverse);
}

.button-danger:hover:not(:disabled) {
  background-color: var(--color-error-600);
}

.button-ghost {
  background-color: transparent;
  color: var(--color-neutral-500);
}

.button-ghost:hover:not(:disabled) {
  background-color: var(--color-neutral-100);
}

.button-outline {
  background-color: transparent;
  border-color: var(--color-border-default);
  color: var(--color-text-secondary);
}

.button-outline:hover:not(:disabled) {
  background-color: var(--color-neutral-50);
}

/* Spinner */
.button-spinner {
  display: inline-flex;
  align-items: center;
}
</style>
