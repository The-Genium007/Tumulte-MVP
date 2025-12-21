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
  margin-bottom: 1.25rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(55 65 81);
  margin-bottom: 0.375rem;
}

.form-error {
  margin-top: 0.375rem;
  font-size: 0.875rem;
  color: rgb(239 68 68);
}

.form-hint {
  margin-top: 0.375rem;
  font-size: 0.875rem;
  color: rgb(107 114 128);
}
</style>
