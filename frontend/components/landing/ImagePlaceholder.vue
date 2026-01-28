<template>
  <div
    class="relative flex items-center justify-center rounded-2xl overflow-hidden"
    :class="[aspectClass, 'bg-gradient-to-br from-primary-100 via-secondary-100 to-primary-50']"
  >
    <!-- Pattern de fond décoratif -->
    <div class="absolute inset-0 opacity-10">
      <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" stroke-width="0.5" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" class="text-primary-400" />
      </svg>
    </div>

    <!-- Contenu central -->
    <div class="relative z-10 flex flex-col items-center gap-3 p-6 text-center">
      <div
        class="size-16 rounded-2xl bg-white/50 backdrop-blur-sm flex items-center justify-center"
      >
        <UIcon :name="icon" class="size-8 text-primary-400" />
      </div>
      <div class="space-y-1">
        <p class="text-sm font-medium text-primary-500">Future image</p>
        <p class="text-xs text-primary-400">{{ label }}</p>
      </div>
    </div>

    <!-- Bordure décorative -->
    <div
      class="absolute inset-0 rounded-2xl border-2 border-dashed border-primary-200 pointer-events-none"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  label?: string
  aspect?: 'square' | 'video' | 'wide' | 'tall' | 'hero'
  icon?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Image placeholder',
  aspect: 'video',
  icon: 'i-lucide-image',
})

const aspectClass = computed(() => {
  switch (props.aspect) {
    case 'square':
      return 'aspect-square'
    case 'video':
      return 'aspect-video'
    case 'wide':
      return 'aspect-[2/1]'
    case 'tall':
      return 'aspect-[3/4]'
    case 'hero':
      return 'aspect-[4/3] lg:aspect-[3/2]'
    default:
      return 'aspect-video'
  }
})
</script>
