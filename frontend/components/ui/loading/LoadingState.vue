<template>
  <div class="loading-state">
    <LoadingSpinner :size="size" :color="color" />
    <p v-if="message" class="loading-message">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import LoadingSpinner from './LoadingSpinner.vue'

interface Props {
  message?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'secondary' | 'white'
}

withDefaults(defineProps<Props>(), {
  message: undefined,
  size: 'lg',
  color: 'primary',
})
</script>

<style scoped>
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-4);
  padding: var(--spacing-12);
}

.loading-message {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}
</style>
