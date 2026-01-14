<template>
  <Transition name="fade">
    <div
      v-if="isVisible"
      class="fixed inset-0 z-[9999] bg-secondary flex items-center justify-center"
    >
      <UIcon
        name="i-game-icons-dice-twenty-faces-twenty"
        class="w-40 h-40 text-primary animate-spin-slow"
      />
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  isVisible: boolean
}>()
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
