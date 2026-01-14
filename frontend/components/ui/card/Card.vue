<template>
  <div :class="cardClasses">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'default' | 'bordered' | 'elevated'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  padding: 'md',
  hoverable: false,
})

const cardClasses = computed(() => {
  const classes = ['card', `card-${props.variant}`, `card-padding-${props.padding}`]

  if (props.hoverable) {
    classes.push('card-hoverable')
  }

  return classes.join(' ')
})
</script>

<style scoped>
.card {
  background-color: var(--color-bg-elevated);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--transition-normal) ease;
}

/* Variants */
.card-default {
  border: var(--border-width-1) solid var(--color-border-default);
}

.card-bordered {
  border: var(--border-width-2) solid var(--color-border-strong);
}

.card-elevated {
  box-shadow: var(--shadow-md);
}

/* Padding */
.card-padding-none {
  padding: var(--spacing-0);
}

.card-padding-sm {
  padding: var(--spacing-3);
}

.card-padding-md {
  padding: var(--spacing-5);
}

.card-padding-lg {
  padding: var(--spacing-8);
}

/* Hoverable */
.card-hoverable {
  cursor: pointer;
}

.card-hoverable:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
</style>
