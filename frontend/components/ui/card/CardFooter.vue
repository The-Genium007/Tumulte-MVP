<template>
  <div class="card-footer">
    <slot />
  </div>
</template>

<style scoped>
.card-footer {
  padding-top: 1rem;
  border-top: 1px solid rgb(229 231 235);
  margin-top: 1rem;
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: flex-end;
}

.card-footer:first-child {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}
</style>
