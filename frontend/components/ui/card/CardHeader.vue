<template>
  <div class="card-header">
    <slot />
  </div>
</template>

<style scoped>
.card-header {
  padding-bottom: var(--spacing-4);
  border-bottom: var(--border-width-1) solid var(--color-border-default);
  margin-bottom: var(--spacing-4);
}

.card-header:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}
</style>
