<template>
  <div class="form-field">
    <label v-if="label" :for="id" class="form-label">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <slot />
    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-else-if="hint" class="form-hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  id?: string
  label?: string
  error?: string
  hint?: string
  required?: boolean
}

withDefaults(defineProps<Props>(), {
  id: undefined,
  label: undefined,
  error: undefined,
  hint: undefined,
  required: false,
})
</script>

<style scoped>
.form-field {
  margin-bottom: var(--spacing-5);
}

.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-1_5);
}

.form-error {
  margin-top: var(--spacing-1_5);
  font-size: var(--text-sm);
  color: var(--color-error-500);
}

.form-hint {
  margin-top: var(--spacing-1_5);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
</style>
