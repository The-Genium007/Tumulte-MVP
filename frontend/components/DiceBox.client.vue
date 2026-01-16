<template>
  <div :id="containerId" class="dicebox-container" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'

const props = withDefaults(defineProps<{
  notation?: string
  colorset?: string
  texture?: string
  material?: string
  sounds?: boolean
  volume?: number
}>(), {
  notation: '',
  colorset: 'white',
  texture: '',
  material: 'glass',
  sounds: true,
  volume: 50,
})

const emit = defineEmits<{
  rollComplete: [results: unknown]
  ready: []
}>()

// Generate unique ID for container
const containerId = `dicebox-${Math.random().toString(36).substring(2, 9)}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let diceBox: any = null

onMounted(async () => {
  // Dynamic import for client-side only
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { DiceBox } = await import('@/lib/dicebox/DiceBox.js')

  // Initialize DiceBox with CSS selector
  // Note: DiceBox API uses snake_case for config options
  /* eslint-disable camelcase */
  diceBox = new DiceBox(`#${containerId}`, {
    assetPath: '/textures/dice/',
    sounds: props.sounds,
    volume: props.volume,
    theme_colorset: props.colorset,
    theme_texture: props.texture,
    theme_material: props.material,
    baseScale: 150, // 50% bigger than default (100)
    onRollComplete: (results: unknown) => {
      emit('rollComplete', results)
    },
  })
  /* eslint-enable camelcase */

  await diceBox.initialize()
  emit('ready')
})

onUnmounted(() => {
  if (diceBox) {
    diceBox.clearDice()
    diceBox = null
  }
})

// Watch for notation changes to auto-roll
watch(() => props.notation, async (newNotation) => {
  if (newNotation && diceBox) {
    await roll(newNotation)
  }
})

// Exposed methods
const roll = async (notation: string): Promise<unknown> => {
  if (!diceBox) {
    console.warn('DiceBox not initialized')
    return null
  }
  return diceBox.roll(notation)
}

const clear = () => {
  if (diceBox) {
    diceBox.clearDice()
  }
}

const updateConfig = async (options: {
  colorset?: string
  texture?: string
  material?: string
}) => {
  if (diceBox) {
    // Note: DiceBox API uses snake_case for config options
    /* eslint-disable camelcase */
    await diceBox.updateConfig({
      theme_colorset: options.colorset,
      theme_texture: options.texture,
      theme_material: options.material,
    })
    /* eslint-enable camelcase */
  }
}

defineExpose({
  roll,
  clear,
  updateConfig,
})
</script>

<style scoped>
.dicebox-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.dicebox-container :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
}
</style>
