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
  background-color: white;
  border-radius: 0.5rem;
  overflow: hidden;
  transition: all 0.2s ease;
}

/* Variants */
.card-default {
  border: 1px solid rgb(229 231 235);
}

.card-bordered {
  border: 2px solid rgb(209 213 219);
}

.card-elevated {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Padding */
.card-padding-none {
  padding: 0;
}

.card-padding-sm {
  padding: 0.75rem;
}

.card-padding-md {
  padding: 1.25rem;
}

.card-padding-lg {
  padding: 2rem;
}

/* Hoverable */
.card-hoverable {
  cursor: pointer;
}

.card-hoverable:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
</style>
