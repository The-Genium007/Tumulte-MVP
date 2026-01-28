<template>
  <div class="text-module">
    <!-- Font Family -->
    <div v-if="showFontFamily" class="field">
      <label>Police</label>
      <USelect
        :model-value="modelValue.fontFamily"
        :items="fontFamilyOptions"
        size="xs"
        :ui="selectUi"
        @update:model-value="(v: string) => updateField('fontFamily', v)"
      />
    </div>

    <!-- Font Size -->
    <div v-if="showFontSize" class="inline-field">
      <label>Taille</label>
      <div class="input-with-unit">
        <NumberInput
          :model-value="modelValue.fontSize || fontSizeMin"
          :min="fontSizeMin"
          :max="fontSizeMax"
          :step="fontSizeStep"
          @update:model-value="(v) => updateField('fontSize', v)"
        />
        <span class="unit">{{ fontSizeUnit }}</span>
      </div>
    </div>

    <!-- Font Weight -->
    <div v-if="showFontWeight" class="field">
      <label>Graisse</label>
      <USelect
        :model-value="modelValue.fontWeight"
        :items="fontWeightOptions"
        size="xs"
        :ui="selectUi"
        @update:model-value="(v: string | number) => updateField('fontWeight', Number(v))"
      />
    </div>

    <!-- Text Transform -->
    <div v-if="showTextTransform" class="field">
      <label>Casse</label>
      <div class="button-group">
        <button
          v-for="option in textTransformOptions"
          :key="option.value"
          class="toggle-button"
          :class="{ active: modelValue.textTransform === option.value }"
          :title="option.label"
          @click="updateField('textTransform', option.value)"
        >
          <UIcon :name="option.icon" class="size-4" />
        </button>
      </div>
    </div>

    <!-- Letter Spacing -->
    <div v-if="showLetterSpacing" class="inline-field">
      <label>Espacement lettres</label>
      <div class="input-with-unit">
        <NumberInput
          :model-value="modelValue.letterSpacing || 0"
          :min="-0.1"
          :max="0.5"
          :step="0.01"
          @update:model-value="(v) => updateField('letterSpacing', v)"
        />
        <span class="unit">em</span>
      </div>
    </div>

    <!-- Line Height -->
    <div v-if="showLineHeight" class="inline-field">
      <label>Hauteur de ligne</label>
      <NumberInput
        :model-value="modelValue.lineHeight || 1.5"
        :min="0.8"
        :max="3"
        :step="0.1"
        @update:model-value="(v) => updateField('lineHeight', v)"
      />
    </div>

    <!-- Text Align -->
    <div v-if="showTextAlign" class="field">
      <label>Alignement</label>
      <div class="button-group">
        <button
          v-for="option in textAlignOptions"
          :key="option.value"
          class="toggle-button"
          :class="{ active: modelValue.textAlign === option.value }"
          :title="option.label"
          @click="updateField('textAlign', option.value)"
        >
          <UIcon :name="option.icon" class="size-4" />
        </button>
      </div>
    </div>

    <!-- Text Style (italic, underline, strikethrough) -->
    <div v-if="showTextDecoration" class="field">
      <label>Style</label>
      <div class="button-group">
        <button
          class="toggle-button"
          :class="{ active: modelValue.fontStyle === 'italic' }"
          title="Italique"
          @click="toggleFontStyle()"
        >
          <UIcon name="i-lucide-italic" class="size-4" />
        </button>
        <button
          class="toggle-button"
          :class="{ active: modelValue.textDecoration === 'underline' }"
          title="Souligné"
          @click="toggleTextDecoration('underline')"
        >
          <UIcon name="i-lucide-underline" class="size-4" />
        </button>
        <button
          class="toggle-button"
          :class="{ active: modelValue.textDecoration === 'line-through' }"
          title="Barré"
          @click="toggleTextDecoration('line-through')"
        >
          <UIcon name="i-lucide-strikethrough" class="size-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import NumberInput from '../shared/NumberInput.vue'

export interface TextStyleConfig {
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  letterSpacing?: number
  lineHeight?: number
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  fontStyle?: 'normal' | 'italic'
  textDecoration?: 'none' | 'underline' | 'line-through'
}

const props = withDefaults(
  defineProps<{
    modelValue: TextStyleConfig
    showFontFamily?: boolean
    showFontSize?: boolean
    showFontWeight?: boolean
    showTextTransform?: boolean
    showLetterSpacing?: boolean
    showLineHeight?: boolean
    showTextAlign?: boolean
    showTextDecoration?: boolean
    fontSizeMin?: number
    fontSizeMax?: number
    fontSizeStep?: number
    fontSizeUnit?: string
  }>(),
  {
    showFontFamily: true,
    showFontSize: true,
    showFontWeight: true,
    showTextTransform: false,
    showLetterSpacing: false,
    showLineHeight: false,
    showTextAlign: true,
    showTextDecoration: false,
    fontSizeMin: 8,
    fontSizeMax: 72,
    fontSizeStep: 1,
    fontSizeUnit: 'px',
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: TextStyleConfig]
}>()

// Options pour les fonts - liste curatée de polices web-safe + Google Fonts populaires
const fontFamilyOptions = [
  // Sans-serif modernes
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Open Sans', value: "'Open Sans', sans-serif" },
  { label: 'Montserrat', value: 'Montserrat, sans-serif' },
  { label: 'Poppins', value: 'Poppins, sans-serif' },
  { label: 'Nunito', value: 'Nunito, sans-serif' },
  // Sans-serif system
  { label: 'System UI', value: 'system-ui, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  // Serif
  { label: 'Playfair Display', value: "'Playfair Display', serif" },
  { label: 'Merriweather', value: 'Merriweather, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  // Monospace
  { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
  { label: 'Fira Code', value: "'Fira Code', monospace" },
  { label: 'Monospace', value: 'ui-monospace, monospace' },
  // Display / Gaming
  { label: 'Bebas Neue', value: "'Bebas Neue', sans-serif" },
  { label: 'Oswald', value: 'Oswald, sans-serif' },
  { label: 'Bangers', value: 'Bangers, cursive' },
  { label: 'Press Start 2P', value: "'Press Start 2P', cursive" },
]

const fontWeightOptions = [
  { label: 'Thin (100)', value: 100 },
  { label: 'Light (300)', value: 300 },
  { label: 'Regular (400)', value: 400 },
  { label: 'Medium (500)', value: 500 },
  { label: 'Semibold (600)', value: 600 },
  { label: 'Bold (700)', value: 700 },
  { label: 'Extrabold (800)', value: 800 },
  { label: 'Black (900)', value: 900 },
]

const textTransformOptions = [
  { label: 'Normal', value: 'none' as const, icon: 'i-lucide-minus' },
  { label: 'MAJUSCULES', value: 'uppercase' as const, icon: 'i-lucide-arrow-up' },
  { label: 'minuscules', value: 'lowercase' as const, icon: 'i-lucide-arrow-down' },
  { label: 'Capitalize', value: 'capitalize' as const, icon: 'i-lucide-type' },
]

const textAlignOptions = [
  { label: 'Gauche', value: 'left' as const, icon: 'i-lucide-align-left' },
  { label: 'Centre', value: 'center' as const, icon: 'i-lucide-align-center' },
  { label: 'Droite', value: 'right' as const, icon: 'i-lucide-align-right' },
  { label: 'Justifié', value: 'justify' as const, icon: 'i-lucide-align-justify' },
]

// UI customization for selects to make them more visible
const selectUi = {
  base: 'bg-(--ui-bg-elevated) text-(--ui-text) border border-(--ui-border)',
  content: 'bg-(--ui-bg-elevated) border border-(--ui-border)',
  item: 'text-(--ui-text) data-highlighted:bg-(--ui-bg-accented)',
}

const updateField = <K extends keyof TextStyleConfig>(field: K, value: TextStyleConfig[K]) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  })
}

const toggleFontStyle = () => {
  const newStyle = props.modelValue.fontStyle === 'italic' ? 'normal' : 'italic'
  updateField('fontStyle', newStyle)
}

const toggleTextDecoration = (decoration: 'underline' | 'line-through') => {
  const newDecoration = props.modelValue.textDecoration === decoration ? 'none' : decoration
  updateField('textDecoration', newDecoration)
}
</script>

<style scoped>
.text-module {
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

.button-group {
  display: flex;
  gap: 0.25rem;
  background: var(--ui-bg-elevated);
  border-radius: 6px;
  padding: 0.25rem;
}

.toggle-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg);
  border-radius: 6px;
  cursor: pointer;
  color: var(--ui-text-muted);
  transition: all 0.15s ease;
}

.toggle-button:hover {
  background: var(--ui-bg-accented);
  color: var(--ui-text);
  border-color: var(--ui-border);
}

.toggle-button.active {
  background: var(--ui-primary);
  color: white;
  border-color: var(--ui-primary);
}
</style>
