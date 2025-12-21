<template>
  <div class="card-header">
    <slot />
  </div>
</template>

<style scoped>
.card-header {
  padding-bottom: 1rem;
  border-bottom: 1px solid rgb(229 231 235);
  margin-bottom: 1rem;
}

.card-header:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}
</style>
