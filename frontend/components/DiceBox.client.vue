<template>
  <div :id="containerId" class="dicebox-container" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'

/**
 * Configuration de couleurs personnalisées pour le dé
 */
export interface DiceCustomColorset {
  foreground: string
  background: string
  outline: string
  texture?: string
  material?: string
}

const props = withDefaults(defineProps<{
  notation?: string
  colorset?: string
  customColorset?: DiceCustomColorset | null
  texture?: string
  material?: string
  sounds?: boolean
  volume?: number
  lightIntensity?: number
}>(), {
  notation: '',
  colorset: 'white',
  customColorset: null,
  texture: '',
  material: 'glass',
  sounds: true,
  volume: 50,
  lightIntensity: 1.0,
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

  // Build custom colorset config if provided
  // Note: DiceBox API uses snake_case for config options
  /* eslint-disable camelcase */
  const customColorsetConfig = props.customColorset ? {
    name: `custom-${Date.now()}`,
    foreground: props.customColorset.foreground,
    background: props.customColorset.background,
    outline: props.customColorset.outline,
    texture: props.customColorset.texture || props.texture || 'none',
    material: props.customColorset.material || props.material || 'glass',
  } : null

  // Initialize DiceBox with CSS selector
  diceBox = new DiceBox(`#${containerId}`, {
    assetPath: '/textures/dice/',
    sounds: props.sounds,
    volume: props.volume,
    theme_colorset: props.colorset,
    theme_texture: props.texture,
    theme_material: props.material,
    theme_customColorset: customColorsetConfig,
    light_intensity: props.lightIntensity,
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

// Watch for customColorset changes to update dice appearance
watch(() => props.customColorset, async (newColorset) => {
  if (diceBox && newColorset) {
    /* eslint-disable camelcase */
    await diceBox.updateConfig({
      theme_customColorset: {
        name: `custom-${Date.now()}`,
        foreground: newColorset.foreground,
        background: newColorset.background,
        outline: newColorset.outline,
        texture: newColorset.texture || props.texture || 'none',
        material: newColorset.material || props.material || 'glass',
      },
    })
    /* eslint-enable camelcase */
  }
}, { deep: true })

// Watch for lightIntensity changes to update scene lighting
watch(() => props.lightIntensity, async (newIntensity) => {
  if (diceBox && newIntensity !== undefined) {
    /* eslint-disable camelcase */
    await diceBox.updateConfig({
      light_intensity: newIntensity,
    })
    /* eslint-enable camelcase */
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
  customColorset?: DiceCustomColorset | null
}) => {
  if (diceBox) {
    // Note: DiceBox API uses snake_case for config options
    /* eslint-disable camelcase */
    const config: Record<string, unknown> = {}

    if (options.colorset) {
      config.theme_colorset = options.colorset
    }
    if (options.texture) {
      config.theme_texture = options.texture
    }
    if (options.material) {
      config.theme_material = options.material
    }
    if (options.customColorset) {
      config.theme_customColorset = {
        name: `custom-${Date.now()}`,
        foreground: options.customColorset.foreground,
        background: options.customColorset.background,
        outline: options.customColorset.outline,
        texture: options.customColorset.texture || options.texture || 'none',
        material: options.customColorset.material || options.material || 'glass',
      }
    }

    await diceBox.updateConfig(config)
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
