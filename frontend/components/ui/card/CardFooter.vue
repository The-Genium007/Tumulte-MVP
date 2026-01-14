<template>
  <div class="card-footer">
    <slot />
  </div>
</template>

<style scoped>
.card-footer {
  padding-top: var(--spacing-4);
  border-top: var(--border-width-1) solid var(--color-border-default);
  margin-top: var(--spacing-4);
  display: flex;
  gap: var(--spacing-3);
  align-items: center;
  justify-content: flex-end;
}

.card-footer:first-child {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}
</style>
