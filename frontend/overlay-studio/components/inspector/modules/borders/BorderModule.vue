<template>
  <div class="border-module">
    <!-- Border Width -->
    <div class="inline-field">
      <label>Épaisseur</label>
      <div class="input-with-unit">
        <NumberInput
          :model-value="modelValue.width"
          :min="0"
          :max="20"
          :step="1"
          @update:model-value="(v) => updateField('width', v)"
        />
        <span class="unit">px</span>
      </div>
    </div>

    <!-- Border Style -->
    <div v-if="modelValue.width > 0" class="field">
      <label>Style</label>
      <USelect
        :model-value="modelValue.style"
        :items="borderStyleOptions"
        size="xs"
        :ui="selectUi"
        @update:model-value="(v: string) => updateField('style', v as BorderStyle)"
      />
    </div>

    <!-- Border Color -->
    <div v-if="modelValue.width > 0">
      <ColorModule
        :model-value="modelValue.color"
        label="Couleur"
        @update:model-value="(v) => updateField('color', v)"
      />
    </div>

    <!-- Individual Sides Toggle -->
    <div v-if="showIndividualSides && modelValue.width > 0" class="inline-field">
      <label>Côtés individuels</label>
      <USwitch
        :model-value="individualSidesEnabled"
        size="sm"
        @update:model-value="toggleIndividualSides"
      />
    </div>

    <!-- Individual Sides -->
    <div v-if="individualSidesEnabled && modelValue.width > 0" class="individual-sides">
      <div v-for="side in sides" :key="side.key" class="side-field">
        <div class="side-header">
          <UIcon :name="side.icon" class="size-3" />
          <span>{{ side.label }}</span>
        </div>
        <div class="input-with-unit">
          <NumberInput
            :model-value="
              (modelValue[side.key as keyof BorderConfig] as number) || modelValue.width
            "
            :min="0"
            :max="20"
            :step="1"
            @update:model-value="(v) => updateField(side.key as keyof BorderConfig, v)"
          />
          <span class="unit">px</span>
        </div>
      </div>
    </div>

    <!-- Preview -->
    <div v-if="showPreview && modelValue.width > 0" class="border-preview">
      <div class="preview-box" :style="previewStyle" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import NumberInput from '../shared/NumberInput.vue'
import ColorModule from '../appearance/ColorModule.vue'

type BorderStyle = 'solid' | 'dashed' | 'dotted' | 'double' | 'none'

export interface BorderConfig {
  width: number
  style: BorderStyle
  color: string
  topWidth?: number
  rightWidth?: number
  bottomWidth?: number
  leftWidth?: number
}

const props = withDefaults(
  defineProps<{
    modelValue: BorderConfig
    showIndividualSides?: boolean
    showPreview?: boolean
  }>(),
  {
    showIndividualSides: false,
    showPreview: true,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: BorderConfig]
}>()

const individualSidesEnabled = ref(false)

const borderStyleOptions = [
  { label: 'Solid', value: 'solid' },
  { label: 'Dashed', value: 'dashed' },
  { label: 'Dotted', value: 'dotted' },
  { label: 'Double', value: 'double' },
]

// UI customization for select to make it more visible
const selectUi = {
  base: 'bg-(--ui-bg-elevated) text-(--ui-text) border border-(--ui-border)',
  content: 'bg-(--ui-bg-elevated) border border-(--ui-border)',
  item: 'text-(--ui-text) data-highlighted:bg-(--ui-bg-accented)',
}

const sides = [
  { key: 'topWidth', label: 'Haut', icon: 'i-lucide-arrow-up' },
  { key: 'rightWidth', label: 'Droite', icon: 'i-lucide-arrow-right' },
  { key: 'bottomWidth', label: 'Bas', icon: 'i-lucide-arrow-down' },
  { key: 'leftWidth', label: 'Gauche', icon: 'i-lucide-arrow-left' },
]

const previewStyle = computed(() => {
  const { width, style, color, topWidth, rightWidth, bottomWidth, leftWidth } = props.modelValue

  if (individualSidesEnabled.value) {
    return {
      borderTopWidth: `${topWidth ?? width}px`,
      borderRightWidth: `${rightWidth ?? width}px`,
      borderBottomWidth: `${bottomWidth ?? width}px`,
      borderLeftWidth: `${leftWidth ?? width}px`,
      borderStyle: style,
      borderColor: color,
    }
  }

  return {
    borderWidth: `${width}px`,
    borderStyle: style,
    borderColor: color,
  }
})

const toggleIndividualSides = (enabled: boolean) => {
  individualSidesEnabled.value = enabled
  if (enabled) {
    // Initialiser les côtés individuels avec la valeur globale
    emit('update:modelValue', {
      ...props.modelValue,
      topWidth: props.modelValue.width,
      rightWidth: props.modelValue.width,
      bottomWidth: props.modelValue.width,
      leftWidth: props.modelValue.width,
    })
  }
}

const updateField = <K extends keyof BorderConfig>(field: K, value: BorderConfig[K]) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  })
}
</script>

<style scoped>
.border-module {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field label {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

.inline-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.inline-field label {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

.input-with-unit {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.unit {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

.individual-sides {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--ui-bg-elevated);
  border-radius: 8px;
}

.side-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.side-header {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.625rem;
  color: var(--ui-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.border-preview {
  display: flex;
  justify-content: center;
  padding: 1rem;
  background: var(--ui-bg-elevated);
  border-radius: 8px;
}

.preview-box {
  width: 60px;
  height: 40px;
  background: var(--ui-bg-accented);
  border-radius: 4px;
}
</style>
