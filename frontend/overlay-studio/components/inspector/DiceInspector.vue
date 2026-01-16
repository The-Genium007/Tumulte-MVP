<template>
  <div class="dice-inspector">
    <!-- Section Couleurs -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('colors')">
        <UIcon name="i-lucide-palette" class="size-4" />
        <span>Couleurs</span>
        <UIcon
          :name="expandedSections.colors ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.colors" class="section-content">
        <div class="color-field">
          <label>Couleur de base</label>
          <div class="color-input-wrapper">
            <input
              type="color"
              :value="props.colors.baseColor"
              @input="updateColor('baseColor', ($event.target as HTMLInputElement).value)"
            />
            <UInput
              :model-value="props.colors.baseColor"
              size="xs"
              class="color-text"
              :ui="inputUi"
              @update:model-value="(v: string | number) => updateColor('baseColor', String(v))"
            />
          </div>
        </div>
        <div class="color-field">
          <label>Couleur des numéros</label>
          <div class="color-input-wrapper">
            <input
              type="color"
              :value="props.colors.numberColor"
              @input="updateColor('numberColor', ($event.target as HTMLInputElement).value)"
            />
            <UInput
              :model-value="props.colors.numberColor"
              size="xs"
              class="color-text"
              :ui="inputUi"
              @update:model-value="(v: string | number) => updateColor('numberColor', String(v))"
            />
          </div>
        </div>
        <div class="color-field">
          <label>Glow critique succès</label>
          <div class="color-input-wrapper">
            <input
              type="color"
              :value="props.colors.criticalSuccessGlow"
              @input="updateColor('criticalSuccessGlow', ($event.target as HTMLInputElement).value)"
            />
            <UInput
              :model-value="props.colors.criticalSuccessGlow"
              size="xs"
              class="color-text"
              :ui="inputUi"
              @update:model-value="(v: string | number) => updateColor('criticalSuccessGlow', String(v))"
            />
          </div>
        </div>
        <div class="color-field">
          <label>Glow critique échec</label>
          <div class="color-input-wrapper">
            <input
              type="color"
              :value="props.colors.criticalFailureGlow"
              @input="updateColor('criticalFailureGlow', ($event.target as HTMLInputElement).value)"
            />
            <UInput
              :model-value="props.colors.criticalFailureGlow"
              size="xs"
              class="color-text"
              :ui="inputUi"
              @update:model-value="(v: string | number) => updateColor('criticalFailureGlow', String(v))"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Section Physique -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('physics')">
        <UIcon name="i-lucide-atom" class="size-4" />
        <span>Physique</span>
        <UIcon
          :name="expandedSections.physics ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.physics" class="section-content">
        <div class="slider-field">
          <div class="slider-header">
            <label>Gravité</label>
            <span class="slider-value">{{ props.physics.gravity }}</span>
          </div>
          <URange
            :model-value="props.physics.gravity"
            :min="-50"
            :max="-10"
            :step="1"
            size="sm"
            @update:model-value="(v: number) => updatePhysics('gravity', v)"
          />
        </div>
        <div class="slider-field">
          <div class="slider-header">
            <label>Rebond</label>
            <span class="slider-value">{{ props.physics.bounciness.toFixed(2) }}</span>
          </div>
          <URange
            :model-value="props.physics.bounciness"
            :min="0"
            :max="1"
            :step="0.05"
            size="sm"
            @update:model-value="(v: number) => updatePhysics('bounciness', v)"
          />
        </div>
        <div class="slider-field">
          <div class="slider-header">
            <label>Friction</label>
            <span class="slider-value">{{ props.physics.friction.toFixed(2) }}</span>
          </div>
          <URange
            :model-value="props.physics.friction"
            :min="0"
            :max="1"
            :step="0.05"
            size="sm"
            @update:model-value="(v: number) => updatePhysics('friction', v)"
          />
        </div>
        <div class="slider-field">
          <div class="slider-header">
            <label>Force de lancer</label>
            <span class="slider-value">{{ props.physics.rollForce.toFixed(1) }}</span>
          </div>
          <URange
            :model-value="props.physics.rollForce"
            :min="0.5"
            :max="3"
            :step="0.1"
            size="sm"
            @update:model-value="(v: number) => updatePhysics('rollForce', v)"
          />
        </div>
        <div class="slider-field">
          <div class="slider-header">
            <label>Force de rotation</label>
            <span class="slider-value">{{ props.physics.spinForce.toFixed(1) }}</span>
          </div>
          <URange
            :model-value="props.physics.spinForce"
            :min="0.5"
            :max="3"
            :step="0.1"
            size="sm"
            @update:model-value="(v: number) => updatePhysics('spinForce', v)"
          />
        </div>
      </div>
    </div>

    <!-- Section Animations -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('animations')">
        <UIcon name="i-lucide-sparkles" class="size-4" />
        <span>Animations</span>
        <UIcon
          :name="expandedSections.animations ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.animations" class="section-content">
        <div class="field-group">
          <label class="group-label">Entrée</label>
          <div class="inline-field">
            <label>Type</label>
            <USelect
              :model-value="props.animations.entry.type"
              :items="entryTypes"
              size="xs"
              :ui="{ base: 'w-24' }"
              @update:model-value="(v: string) => updateAnimationEntry('type', v)"
            />
          </div>
          <div class="slider-field">
            <div class="slider-header">
              <label>Durée</label>
              <span class="slider-value">{{ props.animations.entry.duration.toFixed(1) }}s</span>
            </div>
            <URange
              :model-value="props.animations.entry.duration"
              :min="0.1"
              :max="2"
              :step="0.1"
              size="sm"
              @update:model-value="(v: number) => updateAnimationEntry('duration', v)"
            />
          </div>
        </div>

        <div class="field-group">
          <label class="group-label">Sortie</label>
          <div class="inline-field">
            <label>Type</label>
            <USelect
              :model-value="props.animations.exit.type"
              :items="exitTypes"
              size="xs"
              :ui="{ base: 'w-24' }"
              @update:model-value="(v: string) => updateAnimationExit('type', v)"
            />
          </div>
          <div class="slider-field">
            <div class="slider-header">
              <label>Durée</label>
              <span class="slider-value">{{ props.animations.exit.duration.toFixed(1) }}s</span>
            </div>
            <URange
              :model-value="props.animations.exit.duration"
              :min="0.1"
              :max="2"
              :step="0.1"
              size="sm"
              @update:model-value="(v: number) => updateAnimationExit('duration', v)"
            />
          </div>
          <div class="slider-field">
            <div class="slider-header">
              <label>Délai</label>
              <span class="slider-value">{{ props.animations.exit.delay.toFixed(1) }}s</span>
            </div>
            <URange
              :model-value="props.animations.exit.delay"
              :min="0"
              :max="5"
              :step="0.1"
              size="sm"
              @update:model-value="(v: number) => updateAnimationExit('delay', v)"
            />
          </div>
        </div>

        <div class="field-group">
          <label class="group-label">Résultat</label>
          <div class="slider-field">
            <div class="slider-header">
              <label>Intensité glow</label>
              <span class="slider-value">{{ props.animations.result.glowIntensity.toFixed(1) }}</span>
            </div>
            <URange
              :model-value="props.animations.result.glowIntensity"
              :min="0"
              :max="2"
              :step="0.1"
              size="sm"
              @update:model-value="(v: number) => updateAnimationResult('glowIntensity', v)"
            />
          </div>
          <div class="slider-field">
            <div class="slider-header">
              <label>Durée glow</label>
              <span class="slider-value">{{ props.animations.result.glowDuration.toFixed(1) }}s</span>
            </div>
            <URange
              :model-value="props.animations.result.glowDuration"
              :min="0.5"
              :max="5"
              :step="0.1"
              size="sm"
              @update:model-value="(v: number) => updateAnimationResult('glowDuration', v)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Section Audio -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('audio')">
        <UIcon name="i-lucide-volume-2" class="size-4" />
        <span>Audio</span>
        <UIcon
          :name="expandedSections.audio ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.audio" class="section-content">
        <div class="audio-field">
          <div class="audio-header">
            <UCheckbox
              :model-value="props.audio.rollSound.enabled"
              label="Son de lancer"
              @update:model-value="(v: boolean | 'indeterminate') => updateAudio('rollSound', 'enabled', v === true)"
            />
          </div>
          <div v-if="props.audio.rollSound.enabled" class="slider-field">
            <URange
              :model-value="props.audio.rollSound.volume"
              :min="0"
              :max="1"
              :step="0.05"
              size="sm"
              @update:model-value="(v: number) => updateAudio('rollSound', 'volume', v)"
            />
          </div>
        </div>
        <div class="audio-field">
          <div class="audio-header">
            <UCheckbox
              :model-value="props.audio.criticalSuccessSound.enabled"
              label="Son critique succès"
              @update:model-value="(v: boolean | 'indeterminate') => updateAudio('criticalSuccessSound', 'enabled', v === true)"
            />
          </div>
          <div v-if="props.audio.criticalSuccessSound.enabled" class="slider-field">
            <URange
              :model-value="props.audio.criticalSuccessSound.volume"
              :min="0"
              :max="1"
              :step="0.05"
              size="sm"
              @update:model-value="(v: number) => updateAudio('criticalSuccessSound', 'volume', v)"
            />
          </div>
        </div>
        <div class="audio-field">
          <div class="audio-header">
            <UCheckbox
              :model-value="props.audio.criticalFailureSound.enabled"
              label="Son critique échec"
              @update:model-value="(v: boolean | 'indeterminate') => updateAudio('criticalFailureSound', 'enabled', v === true)"
            />
          </div>
          <div v-if="props.audio.criticalFailureSound.enabled" class="slider-field">
            <URange
              :model-value="props.audio.criticalFailureSound.volume"
              :min="0"
              :max="1"
              :step="0.05"
              size="sm"
              @update:model-value="(v: number) => updateAudio('criticalFailureSound', 'volume', v)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Section Texte résultat -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('resultText')">
        <UIcon name="i-lucide-type" class="size-4" />
        <span>Texte résultat</span>
        <UIcon
          :name="expandedSections.resultText ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.resultText" class="section-content">
        <div class="checkbox-field">
          <UCheckbox
            :model-value="props.resultText.enabled"
            label="Afficher le résultat"
            @update:model-value="(v: boolean | 'indeterminate') => updateResultText('enabled', v === true)"
          />
        </div>
        <template v-if="props.resultText.enabled">
          <div class="slider-field">
            <div class="slider-header">
              <label>Taille police</label>
              <span class="slider-value">{{ props.resultText.typography.fontSize }}px</span>
            </div>
            <URange
              :model-value="props.resultText.typography.fontSize"
              :min="12"
              :max="72"
              :step="1"
              size="sm"
              @update:model-value="(v: number) => updateResultTextTypography('fontSize', v)"
            />
          </div>
          <div class="color-field">
            <label>Couleur</label>
            <div class="color-input-wrapper">
              <input
                type="color"
                :value="props.resultText.typography.color"
                @input="updateResultTextTypography('color', ($event.target as HTMLInputElement).value)"
              />
              <UInput
                :model-value="props.resultText.typography.color"
                size="xs"
                class="color-text"
                :ui="inputUi"
                @update:model-value="(v: string | number) => updateResultTextTypography('color', String(v))"
              />
            </div>
          </div>
          <div class="slider-field">
            <div class="slider-header">
              <label>Décalage Y</label>
              <span class="slider-value">{{ props.resultText.offsetY }}px</span>
            </div>
            <URange
              :model-value="props.resultText.offsetY"
              :min="-100"
              :max="100"
              :step="1"
              size="sm"
              @update:model-value="(v: number) => updateResultText('offsetY', v)"
            />
          </div>
          <div class="slider-field">
            <div class="slider-header">
              <label>Durée affichage</label>
              <span class="slider-value">{{ props.resultText.persistDuration.toFixed(1) }}s</span>
            </div>
            <URange
              :model-value="props.resultText.persistDuration"
              :min="1"
              :max="10"
              :step="0.5"
              size="sm"
              @update:model-value="(v: number) => updateResultText('persistDuration', v)"
            />
          </div>
        </template>
      </div>
    </div>

    <!-- Section Layout -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('layout')">
        <UIcon name="i-lucide-layout-grid" class="size-4" />
        <span>Disposition</span>
        <UIcon
          :name="expandedSections.layout ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.layout" class="section-content">
        <div class="slider-field">
          <div class="slider-header">
            <label>Dés maximum</label>
            <span class="slider-value">{{ props.layout.maxDice }}</span>
          </div>
          <URange
            :model-value="props.layout.maxDice"
            :min="1"
            :max="10"
            :step="1"
            size="sm"
            @update:model-value="(v: number) => updateLayout('maxDice', v)"
          />
        </div>
        <div class="slider-field">
          <div class="slider-header">
            <label>Taille des dés</label>
            <span class="slider-value">{{ props.layout.diceSize }}px</span>
          </div>
          <URange
            :model-value="props.layout.diceSize"
            :min="40"
            :max="120"
            :step="5"
            size="sm"
            @update:model-value="(v: number) => updateLayout('diceSize', v)"
          />
        </div>
      </div>
    </div>

    <!-- Section Preview (Mock Data) -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('preview')">
        <UIcon name="i-lucide-play" class="size-4" />
        <span>Prévisualisation</span>
        <UIcon
          :name="expandedSections.preview ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.preview" class="section-content">
        <!-- Type de dé -->
        <div class="inline-field">
          <label>Type de dé</label>
          <USelect
            v-model="previewDiceType"
            :items="diceTypeOptions"
            size="xs"
            :ui="{ base: 'w-24' }"
          />
        </div>

        <!-- Nombre de dés -->
        <div class="slider-field">
          <div class="slider-header">
            <label>Nombre de dés</label>
            <span class="slider-value">{{ previewDiceCount }}</span>
          </div>
          <URange
            v-model="previewDiceCount"
            :min="1"
            :max="props.layout.maxDice"
            :step="1"
            size="sm"
          />
        </div>

        <!-- Résultat attendu avec min/max dynamiques -->
        <div class="slider-field">
          <div class="slider-header">
            <label>Résultat attendu</label>
            <span class="slider-value">{{ currentTotalResult }}</span>
          </div>
          <div class="result-range-info">
            <span class="range-min">min: {{ resultMin }}</span>
            <span class="range-max">max: {{ resultMax }}</span>
          </div>
          <URange
            :model-value="currentTotalResult"
            :min="resultMin"
            :max="resultMax"
            :step="1"
            size="sm"
            @update:model-value="(v: number) => updateTotalResult(v)"
          />
        </div>

        <!-- Affichage formule générée -->
        <div class="formula-display">
          <UIcon name="i-lucide-function-square" class="size-4 text-neutral-400" />
          <span class="formula-text">{{ props.mockData.rollFormula }}</span>
          <span v-if="props.mockData.isCritical" class="critical-badge" :class="props.mockData.criticalType">
            {{ props.mockData.criticalType === 'success' ? '🎯 Critique !' : '💀 Échec critique' }}
          </span>
        </div>

        <!-- Détails des dés (si plusieurs) -->
        <div v-if="props.mockData.diceValues.length > 1" class="dice-values-display">
          <span
            v-for="(value, index) in props.mockData.diceValues"
            :key="index"
            class="dice-value-chip"
          >
            {{ value }}
          </span>
          <span class="dice-total">= {{ currentTotalResult }}</span>
        </div>

        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-dice-5"
          label="Lancer les dés"
          size="sm"
          block
          class="mt-3"
          @click="emit('playPreview')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from "vue";
import type {
  DiceColorConfig,
  DicePhysicsConfig,
  DiceAnimationsConfig,
  DiceAudioConfig,
  DiceResultTextConfig,
  DiceMockData,
  DiceType,
} from "~/overlay-studio/types";

const props = defineProps<{
  colors: DiceColorConfig;
  physics: DicePhysicsConfig;
  animations: DiceAnimationsConfig;
  audio: DiceAudioConfig;
  resultText: DiceResultTextConfig;
  layout: { maxDice: number; diceSize: number };
  mockData: DiceMockData;
}>();

const emit = defineEmits<{
  updateColors: [colors: Partial<DiceColorConfig>];
  updatePhysics: [physics: Partial<DicePhysicsConfig>];
  updateAnimations: [animations: Partial<DiceAnimationsConfig>];
  updateAudio: [audio: Partial<DiceAudioConfig>];
  updateResultText: [resultText: Partial<DiceResultTextConfig>];
  updateLayout: [layout: Partial<{ maxDice: number; diceSize: number }>];
  updateMockData: [mockData: Partial<DiceMockData>];
  playPreview: [];
}>();

// UI config for inputs
const inputUi = {
  root: "ring-0 border-0 rounded-lg overflow-hidden",
  base: "px-2 py-1.5 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg text-xs",
};

// Sections collapsed/expanded state
const expandedSections = reactive({
  colors: true,
  physics: false,
  animations: false,
  audio: false,
  resultText: false,
  layout: false,
  preview: true,
});

const toggleSection = (section: keyof typeof expandedSections) => {
  expandedSections[section] = !expandedSections[section];
};

// Options pour les selects
const entryTypes = [
  { label: "Drop", value: "drop" },
  { label: "Throw", value: "throw" },
  { label: "Appear", value: "appear" },
];

const exitTypes = [
  { label: "Fade", value: "fade" },
  { label: "Fall", value: "fall" },
];

// Options de types de dés avec leur valeur maximale
const diceTypeOptions: { label: string; value: DiceType; maxValue: number }[] = [
  { label: "d4", value: "d4", maxValue: 4 },
  { label: "d6", value: "d6", maxValue: 6 },
  { label: "d8", value: "d8", maxValue: 8 },
  { label: "d10", value: "d10", maxValue: 10 },
  { label: "d12", value: "d12", maxValue: 12 },
  { label: "d20", value: "d20", maxValue: 20 },
  { label: "d100", value: "d100", maxValue: 100 },
  { label: "d3", value: "d3", maxValue: 3 },
  { label: "d5", value: "d5", maxValue: 5 },
  { label: "d7", value: "d7", maxValue: 7 },
  { label: "d14", value: "d14", maxValue: 14 },
  { label: "d16", value: "d16", maxValue: 16 },
  { label: "d24", value: "d24", maxValue: 24 },
  { label: "d30", value: "d30", maxValue: 30 },
];

// État local pour les contrôles de prévisualisation
const previewDiceType = computed({
  get: () => props.mockData.diceTypes[0] || "d20",
  set: (value: DiceType) => {
    const diceCount = props.mockData.diceTypes.length || 1;
    const newTypes = Array(diceCount).fill(value) as DiceType[];
    const maxVal = getDiceMaxValue(value);
    // Recalculer les valeurs pour que le total reste dans les bornes
    const currentTotal = computeTotalResult();
    const newMin = diceCount;
    const newMax = diceCount * maxVal;
    const clampedTotal = Math.min(Math.max(currentTotal, newMin), newMax);
    const newValues = distributeTotal(clampedTotal, diceCount, maxVal);
    emit("updateMockData", {
      diceTypes: newTypes,
      diceValues: newValues,
      rollFormula: `${diceCount}${value}`,
    });
  },
});

const previewDiceCount = computed({
  get: () => props.mockData.diceTypes.length || 1,
  set: (value: number) => {
    const diceType = props.mockData.diceTypes[0] || "d20";
    const newTypes = Array(value).fill(diceType) as DiceType[];
    const maxVal = getDiceMaxValue(diceType);
    // Distribuer le total actuel sur le nouveau nombre de dés
    const currentTotal = computeTotalResult();
    const newMin = value;
    const newMax = value * maxVal;
    const clampedTotal = Math.min(Math.max(currentTotal, newMin), newMax);
    const newValues = distributeTotal(clampedTotal, value, maxVal);
    emit("updateMockData", {
      diceTypes: newTypes,
      diceValues: newValues,
      rollFormula: `${value}${diceType}`,
    });
  },
});

// Calculs min/max dynamiques
const resultMin = computed(() => {
  const count = props.mockData.diceTypes.length || 1;
  return count;
});

const resultMax = computed(() => {
  const diceType = props.mockData.diceTypes[0] || "d20";
  const count = props.mockData.diceTypes.length || 1;
  const maxVal = getDiceMaxValue(diceType);
  return count * maxVal;
});

const currentTotalResult = computed(() => {
  return props.mockData.diceValues.reduce((sum, val) => sum + val, 0);
});

// Fonctions utilitaires
function getDiceMaxValue(diceType: DiceType): number {
  const option = diceTypeOptions.find((opt) => opt.value === diceType);
  return option?.maxValue || parseInt(diceType.slice(1), 10);
}

function computeTotalResult(): number {
  return props.mockData.diceValues.reduce((sum, val) => sum + val, 0);
}

/**
 * Distribue un total sur N dés de manière réaliste
 * Essaie de garder les valeurs proches entre elles
 */
function distributeTotal(total: number, diceCount: number, maxPerDie: number): number[] {
  const values: number[] = [];
  let remaining = total;

  for (let i = 0; i < diceCount; i++) {
    const diceLeft = diceCount - i;
    // Valeur minimale pour ce dé (assure que les dés restants peuvent atteindre leur minimum)
    const minForThis = Math.max(1, remaining - (diceLeft - 1) * maxPerDie);
    // Valeur maximale pour ce dé (assure que les dés restants peuvent atteindre leur minimum)
    const maxForThis = Math.min(maxPerDie, remaining - (diceLeft - 1));
    // Valeur idéale (répartition équitable)
    const idealValue = Math.round(remaining / diceLeft);
    // Clamp à la valeur possible
    const value = Math.min(Math.max(idealValue, minForThis), maxForThis);
    values.push(value);
    remaining -= value;
  }

  return values;
}

/**
 * Met à jour le résultat total et distribue sur les dés
 */
function updateTotalResult(newTotal: number) {
  const diceType = props.mockData.diceTypes[0] || "d20";
  const count = props.mockData.diceTypes.length || 1;
  const maxVal = getDiceMaxValue(diceType);
  const newValues = distributeTotal(newTotal, count, maxVal);

  // Déterminer si c'est un critique
  const isCriticalSuccess = newTotal === count * maxVal;
  const isCriticalFailure = newTotal === count;

  emit("updateMockData", {
    diceValues: newValues,
    isCritical: isCriticalSuccess || isCriticalFailure,
    criticalType: isCriticalSuccess ? "success" : isCriticalFailure ? "failure" : null,
  });
}

// Update handlers
const updateColor = (key: keyof DiceColorConfig, value: string) => {
  emit("updateColors", { [key]: value });
};

const updatePhysics = (key: keyof DicePhysicsConfig, value: number) => {
  emit("updatePhysics", { [key]: value });
};

const updateAnimationEntry = (key: string, value: string | number) => {
  emit("updateAnimations", {
    entry: { ...props.animations.entry, [key]: value },
  });
};

const updateAnimationExit = (key: string, value: string | number) => {
  emit("updateAnimations", {
    exit: { ...props.animations.exit, [key]: value },
  });
};

const updateAnimationResult = (key: string, value: number) => {
  emit("updateAnimations", {
    result: { ...props.animations.result, [key]: value },
  });
};

const updateAudio = (
  soundKey: keyof DiceAudioConfig,
  property: string,
  value: boolean | number,
) => {
  emit("updateAudio", {
    [soundKey]: { ...props.audio[soundKey], [property]: value },
  });
};

const updateResultText = (key: string, value: boolean | number) => {
  emit("updateResultText", { [key]: value });
};

const updateResultTextTypography = (key: string, value: string | number) => {
  emit("updateResultText", {
    typography: { ...props.resultText.typography, [key]: value },
  });
};

const updateLayout = (key: string, value: number) => {
  emit("updateLayout", { [key]: value });
};
</script>

<style scoped>
.dice-inspector {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.inspector-section {
  border-bottom: 1px solid var(--color-neutral-200);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.section-header:hover {
  background: var(--color-neutral-100);
}

.section-content {
  padding: 0 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Color fields */
.color-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.color-field label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.color-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.color-input-wrapper input[type="color"] {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--color-neutral-300);
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
}

.color-text {
  flex: 1;
}

/* Slider fields */
.slider-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slider-header label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.slider-value {
  font-size: 0.75rem;
  color: var(--color-text-primary);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

/* Field groups */
.field-group {
  background: var(--color-neutral-100);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.group-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Inline fields */
.inline-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.inline-field label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* Audio fields */
.audio-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.audio-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Checkbox fields */
.checkbox-field {
  padding: 0.25rem 0;
}

/* Generic field */
.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* Preview section - result range info */
.result-range-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.625rem;
  color: var(--color-text-muted);
  margin-bottom: 0.25rem;
}

.range-min,
.range-max {
  font-variant-numeric: tabular-nums;
}

/* Formula display */
.formula-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-neutral-100);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  margin-top: 0.5rem;
}

.formula-text {
  font-family: ui-monospace, monospace;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.critical-badge {
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  margin-left: auto;
}

.critical-badge.success {
  background: rgba(34, 197, 94, 0.2);
  color: rgb(22, 163, 74);
}

.critical-badge.failure {
  background: rgba(239, 68, 68, 0.2);
  color: rgb(220, 38, 38);
}

/* Dice values display */
.dice-values-display {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.5rem;
}

.dice-value-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 0.375rem;
  background: var(--color-primary-100);
  color: var(--color-primary-600);
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.dice-total {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-left: 0.25rem;
}
</style>
