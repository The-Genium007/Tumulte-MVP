<template>
  <div class="flex items-center justify-between px-4 py-2">
    <span class="text-sm text-(--theme-text-secondary)">Thème</span>
    <div
      class="relative flex items-center gap-0.5 rounded-full bg-(--theme-bg-muted) border border-(--theme-border) p-0.5"
    >
      <!-- Sliding indicator -->
      <div
        class="absolute size-7 rounded-full shadow-sm transition-all duration-200 ease-out"
        :class="indicatorClass"
        :style="{ left: `${activeIndex * 30 + 2}px` }"
      />

      <!-- Buttons -->
      <button
        v-for="mode in modes"
        :key="mode.value"
        :aria-label="mode.label"
        :title="mode.label"
        class="relative z-10 size-7 flex items-center justify-center rounded-full transition-colors duration-200"
        :class="
          colorMode.preference === mode.value
            ? activeTextClass
            : 'text-(--theme-text-muted) hover:text-(--theme-text-secondary)'
        "
        @click.stop="setMode(mode.value)"
      >
        <UIcon :name="mode.icon" class="size-3.5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const colorMode = useColorMode()

const modes = [
  { value: 'light', label: 'Mode clair', icon: 'i-lucide-sun' },
  { value: 'system', label: 'Automatique', icon: 'i-lucide-monitor' },
  { value: 'dark', label: 'Mode sombre', icon: 'i-lucide-moon' },
] as const

type ModeValue = (typeof modes)[number]['value']

const activeIndex = computed(() => {
  const idx = modes.findIndex((m) => m.value === colorMode.preference)
  return idx === -1 ? 1 : idx
})

const indicatorClass = computed(() => {
  switch (colorMode.preference) {
    case 'light':
      return 'bg-amber-400/80'
    case 'dark':
      return 'bg-indigo-500/80'
    default:
      return 'bg-(--color-brand-400)/60'
  }
})

const activeTextClass = computed(() => {
  switch (colorMode.preference) {
    case 'light':
      return 'text-amber-950'
    case 'dark':
      return 'text-white'
    default:
      return 'text-(--theme-text)'
  }
})

function setMode(mode: ModeValue) {
  colorMode.preference = mode
}
</script>
