<template>
  <div class="dice-inspector">
    <!-- Section Dé 3D -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('dice3d')">
        <UIcon name="i-lucide-dice-5" class="size-4" />
        <span>Dé 3D</span>
        <UIcon
          :name="expandedSections.dice3d ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.dice3d" class="section-content">
        <ColorModule
          :model-value="props.diceBox.colors.background"
          label="Couleur du dé"
          @update:model-value="(v: string) => updateDiceBoxColor('background', v)"
        />
        <ColorModule
          :model-value="props.diceBox.colors.foreground"
          label="Couleur des chiffres"
          @update:model-value="(v: string) => updateDiceBoxColor('foreground', v)"
        />
        <div class="inline-field">
          <label>Texture</label>
          <USelect
            :model-value="props.diceBox.texture"
            :items="textureOptions"
            size="xs"
            :ui="selectUiConfig"
            @update:model-value="(v: string) => updateDiceBox('texture', v)"
          />
        </div>
        <div class="inline-field">
          <label>Matériau</label>
          <USelect
            :model-value="props.diceBox.material"
            :items="materialOptions"
            size="xs"
            :ui="selectUiConfig"
            @update:model-value="(v: string) => updateDiceBox('material', v)"
          />
        </div>
      </div>
    </div>

    <!-- Section HUD -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('hud')">
        <UIcon name="i-lucide-layout-template" class="size-4" />
        <span>HUD</span>
        <UIcon
          :name="expandedSections.hud ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.hud" class="section-content">
        <!-- Sous-section Conteneur (collapsible) -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleHudSubsection('container')">
            <span>Conteneur</span>
            <UIcon
              :name="
                expandedHudSections.container ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
              "
              class="size-3"
            />
          </button>
          <div v-show="expandedHudSections.container" class="sub-section-content">
            <ColorModule
              :model-value="props.hud.container.backgroundColor"
              label="Fond"
              @update:model-value="(v: string) => updateHudContainer('backgroundColor', v)"
            />
            <ColorModule
              :model-value="props.hud.container.borderColor"
              label="Bordure"
              @update:model-value="(v: string) => updateHudContainer('borderColor', v)"
            />
            <div class="inline-field">
              <label>Épaisseur bordure</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.hud.container.borderWidth"
                  :min="0"
                  :max="20"
                  :step="1"
                  @update:model-value="(v) => updateHudContainer('borderWidth', v)"
                />
                <span class="unit">px</span>
              </div>
            </div>
            <div class="inline-field">
              <label>Arrondi</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.hud.container.borderRadius"
                  :min="0"
                  :max="64"
                  :step="1"
                  @update:model-value="(v) => updateHudContainer('borderRadius', v)"
                />
                <span class="unit">px</span>
              </div>
            </div>
            <div class="inline-field">
              <label>Flou arrière-plan</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.hud.container.backdropBlur"
                  :min="0"
                  :max="50"
                  :step="1"
                  @update:model-value="(v) => updateHudContainer('backdropBlur', v)"
                />
                <span class="unit">px</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sous-section Résultat (collapsible) -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleHudSubsection('result')">
            <span>Résultat</span>
            <UIcon
              :name="expandedHudSections.result ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              class="size-3"
            />
          </button>
          <div v-show="expandedHudSections.result" class="sub-section-content">
            <TextModule
              :model-value="resultTypographyConfig"
              :show-font-family="true"
              :show-font-size="true"
              :show-font-weight="true"
              :font-size-min="24"
              :font-size-max="96"
              @update:model-value="updateResultTypography"
            />
            <ColorModule
              :model-value="props.hud.result.typography.color"
              label="Couleur"
              @update:model-value="(v: string) => updateHudResultTypography('color', v)"
            />
            <ColorModule
              :model-value="props.hud.result.criticalSuccessColor"
              label="Couleur critique succès"
              :presets="['#4ade80', '#22c55e', '#10b981']"
              @update:model-value="(v: string) => updateHudResult('criticalSuccessColor', v)"
            />
            <ColorModule
              :model-value="props.hud.result.criticalFailureColor"
              label="Couleur critique échec"
              :presets="['#fca5a5', '#ef4444', '#dc2626']"
              @update:model-value="(v: string) => updateHudResult('criticalFailureColor', v)"
            />
          </div>
        </div>

        <!-- Sous-section Formule (collapsible) -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleHudSubsection('formula')">
            <span>Formule</span>
            <UIcon
              :name="expandedHudSections.formula ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              class="size-3"
            />
          </button>
          <div v-show="expandedHudSections.formula" class="sub-section-content">
            <TextModule
              :model-value="formulaTypographyConfig"
              :show-font-family="true"
              :show-font-size="true"
              :show-font-weight="true"
              :font-size-min="12"
              :font-size-max="32"
              @update:model-value="updateFormulaTypography"
            />
            <ColorModule
              :model-value="props.hud.formula.typography.color"
              label="Couleur"
              @update:model-value="(v: string) => updateHudFormulaTypography('color', v)"
            />
          </div>
        </div>

        <!-- Sous-section Badge critique succès (collapsible) -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleHudSubsection('badgeSuccess')">
            <span>Badge critique succès</span>
            <UIcon
              :name="
                expandedHudSections.badgeSuccess ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
              "
              class="size-3"
            />
          </button>
          <div v-show="expandedHudSections.badgeSuccess" class="sub-section-content">
            <ColorModule
              :model-value="props.hud.criticalBadge.successBackground"
              label="Fond"
              @update:model-value="(v: string) => updateHudCriticalBadge('successBackground', v)"
            />
            <ColorModule
              :model-value="props.hud.criticalBadge.successTextColor"
              label="Texte"
              @update:model-value="(v: string) => updateHudCriticalBadge('successTextColor', v)"
            />
            <ColorModule
              :model-value="props.hud.criticalBadge.successBorderColor"
              label="Bordure"
              @update:model-value="(v: string) => updateHudCriticalBadge('successBorderColor', v)"
            />
          </div>
        </div>

        <!-- Sous-section Badge critique échec (collapsible) -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleHudSubsection('badgeFailure')">
            <span>Badge critique échec</span>
            <UIcon
              :name="
                expandedHudSections.badgeFailure ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
              "
              class="size-3"
            />
          </button>
          <div v-show="expandedHudSections.badgeFailure" class="sub-section-content">
            <ColorModule
              :model-value="props.hud.criticalBadge.failureBackground"
              label="Fond"
              @update:model-value="(v: string) => updateHudCriticalBadge('failureBackground', v)"
            />
            <ColorModule
              :model-value="props.hud.criticalBadge.failureTextColor"
              label="Texte"
              @update:model-value="(v: string) => updateHudCriticalBadge('failureTextColor', v)"
            />
            <ColorModule
              :model-value="props.hud.criticalBadge.failureBorderColor"
              label="Bordure"
              @update:model-value="(v: string) => updateHudCriticalBadge('failureBorderColor', v)"
            />
          </div>
        </div>

        <!-- Sous-section Détail des dés (collapsible) -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleHudSubsection('diceBreakdown')">
            <span>Détail des dés</span>
            <UIcon
              :name="
                expandedHudSections.diceBreakdown ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
              "
              class="size-3"
            />
          </button>
          <div v-show="expandedHudSections.diceBreakdown" class="sub-section-content">
            <ColorModule
              :model-value="props.hud.diceBreakdown.backgroundColor"
              label="Fond"
              @update:model-value="(v: string) => updateHudDiceBreakdown('backgroundColor', v)"
            />
            <ColorModule
              :model-value="props.hud.diceBreakdown.borderColor"
              label="Bordure"
              @update:model-value="(v: string) => updateHudDiceBreakdown('borderColor', v)"
            />
            <TextModule
              :model-value="diceBreakdownTypographyConfig"
              :show-font-size="true"
              :show-font-weight="true"
              :font-size-min="10"
              :font-size-max="24"
              @update:model-value="updateDiceBreakdownTypography"
            />
            <ColorModule
              :model-value="props.hud.diceBreakdown.typography.color"
              label="Couleur texte"
              @update:model-value="(v: string) => updateHudDiceBreakdownTypography('color', v)"
            />
          </div>
        </div>

        <!-- Sous-section Compétence (collapsible) -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleHudSubsection('skillInfo')">
            <span>Info compétence</span>
            <UIcon
              :name="
                expandedHudSections.skillInfo ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
              "
              class="size-3"
            />
          </button>
          <div v-show="expandedHudSections.skillInfo" class="sub-section-content">
            <ColorModule
              :model-value="props.hud.skillInfo.backgroundColor"
              label="Fond"
              @update:model-value="(v: string) => updateHudSkillInfo('backgroundColor', v)"
            />
            <ColorModule
              :model-value="props.hud.skillInfo.borderColor"
              label="Bordure"
              @update:model-value="(v: string) => updateHudSkillInfo('borderColor', v)"
            />
            <div class="field-group">
              <label class="group-label">Typographie skill</label>
              <ColorModule
                :model-value="props.hud.skillInfo.skillTypography.color"
                label="Couleur"
                @update:model-value="(v: string) => updateHudSkillTypography('color', v)"
              />
            </div>
            <div class="field-group">
              <label class="group-label">Typographie ability</label>
              <ColorModule
                :model-value="props.hud.skillInfo.abilityTypography.color"
                label="Couleur"
                @update:model-value="(v: string) => updateHudAbilityTypography('color', v)"
              />
            </div>
          </div>
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
        <!-- Sous-section Entrée (collapsible) -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleAnimSubsection('entry')">
            <span>Entrée</span>
            <UIcon
              :name="expandedAnimSections.entry ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              class="size-3"
            />
          </button>
          <div v-show="expandedAnimSections.entry" class="sub-section-content">
            <div class="inline-field">
              <label>Type</label>
              <USelect
                :model-value="props.animations.entry.type"
                :items="entryTypes"
                size="xs"
                :ui="selectUiConfig"
                @update:model-value="(v: string) => updateAnimationEntry('type', v)"
              />
            </div>
            <div class="inline-field">
              <label>Durée</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.animations.entry.duration"
                  :min="0.1"
                  :max="5"
                  :step="0.1"
                  @update:model-value="(v) => updateAnimationEntry('duration', v)"
                />
                <span class="unit">s</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sous-section Sortie (collapsible) -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleAnimSubsection('exit')">
            <span>Sortie</span>
            <UIcon
              :name="expandedAnimSections.exit ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              class="size-3"
            />
          </button>
          <div v-show="expandedAnimSections.exit" class="sub-section-content">
            <div class="inline-field">
              <label>Type</label>
              <USelect
                :model-value="props.animations.exit.type"
                :items="exitTypes"
                size="xs"
                :ui="selectUiConfig"
                @update:model-value="(v: string) => updateAnimationExit('type', v)"
              />
            </div>
            <div class="inline-field">
              <label>Durée</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.animations.exit.duration"
                  :min="0.1"
                  :max="5"
                  :step="0.1"
                  @update:model-value="(v) => updateAnimationExit('duration', v)"
                />
                <span class="unit">s</span>
              </div>
            </div>
            <div class="inline-field">
              <label>Délai</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.animations.exit.delay"
                  :min="0"
                  :max="10"
                  :step="0.1"
                  @update:model-value="(v) => updateAnimationExit('delay', v)"
                />
                <span class="unit">s</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sous-section Glow critique (collapsible) -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleAnimSubsection('glow')">
            <span>Glow critique</span>
            <UIcon
              :name="expandedAnimSections.glow ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              class="size-3"
            />
          </button>
          <div v-show="expandedAnimSections.glow" class="sub-section-content">
            <ColorModule
              :model-value="props.colors.criticalSuccessGlow"
              label="Succès"
              :presets="['#22c55e', '#10b981', '#34d399']"
              @update:model-value="(v: string) => updateCriticalColor('criticalSuccessGlow', v)"
            />
            <ColorModule
              :model-value="props.colors.criticalFailureGlow"
              label="Échec"
              :presets="['#ef4444', '#dc2626', '#f87171']"
              @update:model-value="(v: string) => updateCriticalColor('criticalFailureGlow', v)"
            />
            <div class="inline-field">
              <label>Intensité</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.animations.result.glowIntensity"
                  :min="0"
                  :max="3"
                  :step="0.1"
                  @update:model-value="(v) => updateAnimationResult('glowIntensity', v)"
                />
                <span class="unit">x</span>
              </div>
            </div>
            <div class="inline-field">
              <label>Durée</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.animations.result.glowDuration"
                  :min="0.1"
                  :max="10"
                  :step="0.1"
                  @update:model-value="(v) => updateAnimationResult('glowDuration', v)"
                />
                <span class="unit">s</span>
              </div>
            </div>
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
        <AudioModule
          :model-value="rollSoundConfig"
          label="Son de lancer"
          :show-preview="false"
          @update:model-value="(v: AudioConfig) => updateAudioFromModule('rollSound', v)"
        />
        <AudioModule
          :model-value="criticalSuccessSoundConfig"
          label="Son critique succès"
          :show-preview="false"
          @update:model-value="(v: AudioConfig) => updateAudioFromModule('criticalSuccessSound', v)"
        />
        <AudioModule
          :model-value="criticalFailureSoundConfig"
          label="Son critique échec"
          :show-preview="false"
          @update:model-value="(v: AudioConfig) => updateAudioFromModule('criticalFailureSound', v)"
        />
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
            :ui="{
              base: 'w-24 bg-(--ui-bg-elevated) border border-(--ui-border)',
              trailingIcon: 'text-(--ui-primary)',
            }"
          />
        </div>

        <!-- Nombre de dés -->
        <div class="inline-field">
          <label>Nombre de dés</label>
          <NumberInput
            :model-value="previewDiceCount"
            :min="1"
            :max="10"
            :step="1"
            @update:model-value="(v) => (previewDiceCount = v)"
          />
        </div>

        <!-- Résultat attendu -->
        <div class="inline-field">
          <label>Résultat</label>
          <div class="result-input-wrapper">
            <NumberInput
              :model-value="currentTotalResult"
              :min="resultMin"
              :max="resultMax"
              :step="1"
              @update:model-value="(v) => updateTotalResult(v)"
            />
            <span class="result-range-hint">({{ resultMin }}-{{ resultMax }})</span>
          </div>
        </div>

        <!-- Affichage formule générée -->
        <div class="formula-display">
          <UIcon name="i-lucide-function-square" class="size-4 text-neutral-400" />
          <span class="formula-text">{{ props.mockData.rollFormula }}</span>
          <span
            v-if="props.mockData.isCritical"
            class="critical-badge"
            :class="props.mockData.criticalType"
          >
            {{ props.mockData.criticalType === 'success' ? 'Critique !' : 'Échec critique' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ColorModule,
  AudioModule,
  TextModule,
  NumberInput,
  type AudioConfig,
  type TextStyleConfig,
} from './modules'
import { useCollapsibleSections } from '~/overlay-studio/composables'
import type {
  DiceBoxConfig,
  DiceHudConfig,
  DiceCriticalColors,
  DiceAnimationsConfig,
  DiceAudioConfig,
  DiceMockData,
  DiceType,
  DiceTexture,
  DiceMaterial,
} from '~/overlay-studio/types'

const props = defineProps<{
  diceBox: DiceBoxConfig
  hud: DiceHudConfig
  colors: DiceCriticalColors
  animations: DiceAnimationsConfig
  audio: DiceAudioConfig
  mockData: DiceMockData
}>()

const emit = defineEmits<{
  updateDiceBox: [diceBox: Partial<DiceBoxConfig>]
  updateHud: [hud: Partial<DiceHudConfig>]
  updateColors: [colors: Partial<DiceCriticalColors>]
  updateAnimations: [animations: Partial<DiceAnimationsConfig>]
  updateAudio: [audio: Partial<DiceAudioConfig>]
  updateMockData: [mockData: Partial<DiceMockData>]
}>()

// Sections collapsed/expanded state - using composable
const { sections: expandedSections, toggle: toggleSection } = useCollapsibleSections({
  dice3d: true,
  hud: false,
  animations: false,
  audio: false,
  preview: true,
})

// HUD subsections
const { sections: expandedHudSections, toggle: toggleHudSubsection } = useCollapsibleSections({
  container: true,
  result: false,
  formula: false,
  badgeSuccess: false,
  badgeFailure: false,
  diceBreakdown: false,
  skillInfo: false,
})

// Animation subsections
const { sections: expandedAnimSections, toggle: toggleAnimSubsection } = useCollapsibleSections({
  entry: true,
  exit: false,
  glow: false,
})

// Options pour les textures
const textureOptions: { label: string; value: DiceTexture }[] = [
  { label: 'Aucune', value: 'none' },
  { label: 'Nuages', value: 'cloudy' },
  { label: 'Feu', value: 'fire' },
  { label: 'Marbre', value: 'marble' },
  { label: 'Eau', value: 'water' },
  { label: 'Glace', value: 'ice' },
  { label: 'Papier', value: 'paper' },
  { label: 'Taches', value: 'speckles' },
  { label: 'Paillettes', value: 'glitter' },
  { label: 'Étoiles', value: 'stars' },
  { label: 'Vitrail', value: 'stainedglass' },
  { label: 'Bois', value: 'wood' },
  { label: 'Métal', value: 'metal' },
  { label: 'Crânes', value: 'skulls' },
  { label: 'Léopard', value: 'leopard' },
  { label: 'Tigre', value: 'tiger' },
  { label: 'Dragon', value: 'dragon' },
  { label: 'Lézard', value: 'lizard' },
  { label: 'Plumes', value: 'bird' },
  { label: 'Astral', value: 'astral' },
]

// Options pour les matériaux
const materialOptions: { label: string; value: DiceMaterial }[] = [
  { label: 'Plastique', value: 'none' },
  { label: 'Verre', value: 'glass' },
  { label: 'Métal', value: 'metal' },
  { label: 'Bois', value: 'wood' },
]

// Options pour les animations
const entryTypes = [
  { label: 'Drop', value: 'drop' },
  { label: 'Throw', value: 'throw' },
  { label: 'Appear', value: 'appear' },
]

const exitTypes = [
  { label: 'Fade', value: 'fade' },
  { label: 'Fall', value: 'fall' },
]

// Options de types de dés avec leur valeur maximale
const diceTypeOptions: { label: string; value: DiceType; maxValue: number }[] = [
  { label: 'd4', value: 'd4', maxValue: 4 },
  { label: 'd6', value: 'd6', maxValue: 6 },
  { label: 'd8', value: 'd8', maxValue: 8 },
  { label: 'd10', value: 'd10', maxValue: 10 },
  { label: 'd12', value: 'd12', maxValue: 12 },
  { label: 'd20', value: 'd20', maxValue: 20 },
]

// Configuration UI pour les selects (fond neutre comme les inputs, chevron coloré)
const selectUiConfig = {
  base: 'bg-(--ui-bg-elevated) text-(--ui-text) border border-(--ui-border)',
  trailingIcon: 'text-(--ui-primary)',
  content: 'bg-(--ui-bg-elevated) border border-(--ui-border)',
  item: 'text-(--ui-text) data-highlighted:bg-(--ui-bg-accented)',
}

// ===== DiceBox Updates =====
const updateDiceBoxColor = (key: keyof DiceBoxConfig['colors'], value: string) => {
  emit('updateDiceBox', {
    colors: { ...props.diceBox.colors, [key]: value },
  })
}

const updateDiceBox = (key: 'texture' | 'material' | 'lightIntensity', value: string | number) => {
  emit('updateDiceBox', { [key]: value })
}

// ===== HUD Updates =====
const updateHudContainer = (key: keyof DiceHudConfig['container'], value: string | number) => {
  emit('updateHud', {
    container: { ...props.hud.container, [key]: value },
  })
}

const updateHudResult = (key: keyof DiceHudConfig['result'], value: string) => {
  emit('updateHud', {
    result: { ...props.hud.result, [key]: value },
  })
}

const updateHudResultTypography = (key: string, value: string | number) => {
  emit('updateHud', {
    result: {
      ...props.hud.result,
      typography: { ...props.hud.result.typography, [key]: value },
    },
  })
}

const updateHudFormulaTypography = (key: string, value: string | number) => {
  emit('updateHud', {
    formula: {
      ...props.hud.formula,
      typography: { ...props.hud.formula.typography, [key]: value },
    },
  })
}

const updateHudCriticalBadge = (key: keyof DiceHudConfig['criticalBadge'], value: string) => {
  emit('updateHud', {
    criticalBadge: { ...props.hud.criticalBadge, [key]: value },
  })
}

const updateHudDiceBreakdown = (
  key: keyof DiceHudConfig['diceBreakdown'],
  value: string | number
) => {
  emit('updateHud', {
    diceBreakdown: { ...props.hud.diceBreakdown, [key]: value },
  })
}

const updateHudDiceBreakdownTypography = (key: string, value: string | number) => {
  emit('updateHud', {
    diceBreakdown: {
      ...props.hud.diceBreakdown,
      typography: { ...props.hud.diceBreakdown.typography, [key]: value },
    },
  })
}

const updateHudSkillInfo = (key: keyof DiceHudConfig['skillInfo'], value: string | number) => {
  emit('updateHud', {
    skillInfo: { ...props.hud.skillInfo, [key]: value },
  })
}

const updateHudSkillTypography = (key: string, value: string | number) => {
  emit('updateHud', {
    skillInfo: {
      ...props.hud.skillInfo,
      skillTypography: { ...props.hud.skillInfo.skillTypography, [key]: value },
    },
  })
}

const updateHudAbilityTypography = (key: string, value: string | number) => {
  emit('updateHud', {
    skillInfo: {
      ...props.hud.skillInfo,
      abilityTypography: { ...props.hud.skillInfo.abilityTypography, [key]: value },
    },
  })
}

// ===== Typography Adapters for TextModule =====
const resultTypographyConfig = computed<TextStyleConfig>(() => ({
  fontFamily: props.hud.result.typography.fontFamily,
  fontSize: props.hud.result.typography.fontSize,
  fontWeight: props.hud.result.typography.fontWeight,
}))

const updateResultTypography = (config: TextStyleConfig) => {
  emit('updateHud', {
    result: {
      ...props.hud.result,
      typography: {
        ...props.hud.result.typography,
        ...(config.fontFamily !== undefined && { fontFamily: config.fontFamily }),
        ...(config.fontSize !== undefined && { fontSize: config.fontSize }),
        ...(config.fontWeight !== undefined && { fontWeight: config.fontWeight }),
      },
    },
  })
}

const formulaTypographyConfig = computed<TextStyleConfig>(() => ({
  fontFamily: props.hud.formula.typography.fontFamily,
  fontSize: props.hud.formula.typography.fontSize,
  fontWeight: props.hud.formula.typography.fontWeight,
}))

const updateFormulaTypography = (config: TextStyleConfig) => {
  emit('updateHud', {
    formula: {
      ...props.hud.formula,
      typography: {
        ...props.hud.formula.typography,
        ...(config.fontFamily !== undefined && { fontFamily: config.fontFamily }),
        ...(config.fontSize !== undefined && { fontSize: config.fontSize }),
        ...(config.fontWeight !== undefined && { fontWeight: config.fontWeight }),
      },
    },
  })
}

const diceBreakdownTypographyConfig = computed<TextStyleConfig>(() => ({
  fontSize: props.hud.diceBreakdown.typography.fontSize,
  fontWeight: props.hud.diceBreakdown.typography.fontWeight,
}))

const updateDiceBreakdownTypography = (config: TextStyleConfig) => {
  emit('updateHud', {
    diceBreakdown: {
      ...props.hud.diceBreakdown,
      typography: {
        ...props.hud.diceBreakdown.typography,
        ...(config.fontSize !== undefined && { fontSize: config.fontSize }),
        ...(config.fontWeight !== undefined && { fontWeight: config.fontWeight }),
      },
    },
  })
}

// ===== Critical Colors Updates =====
const updateCriticalColor = (key: keyof DiceCriticalColors, value: string) => {
  emit('updateColors', { [key]: value })
}

// ===== Animation Updates =====
const updateAnimationEntry = (key: string, value: string | number) => {
  emit('updateAnimations', {
    entry: { ...props.animations.entry, [key]: value },
  })
}

const updateAnimationExit = (key: string, value: string | number) => {
  emit('updateAnimations', {
    exit: { ...props.animations.exit, [key]: value },
  })
}

const updateAnimationResult = (key: string, value: number) => {
  emit('updateAnimations', {
    result: { ...props.animations.result, [key]: value },
  })
}

// ===== Audio Module Adapters =====
const rollSoundConfig = computed<AudioConfig>(() => ({
  enabled: props.audio.rollSound.enabled,
  volume: props.audio.rollSound.volume,
}))

const criticalSuccessSoundConfig = computed<AudioConfig>(() => ({
  enabled: props.audio.criticalSuccessSound.enabled,
  volume: props.audio.criticalSuccessSound.volume,
}))

const criticalFailureSoundConfig = computed<AudioConfig>(() => ({
  enabled: props.audio.criticalFailureSound.enabled,
  volume: props.audio.criticalFailureSound.volume,
}))

const updateAudioFromModule = (soundKey: keyof DiceAudioConfig, config: AudioConfig) => {
  emit('updateAudio', {
    [soundKey]: { enabled: config.enabled, volume: config.volume },
  })
}

// ===== Preview / Mock Data =====
const previewDiceType = computed({
  get: () => props.mockData.diceTypes[0] || 'd20',
  set: (value: DiceType) => {
    const diceCount = props.mockData.diceTypes.length || 1
    const newTypes = Array(diceCount).fill(value) as DiceType[]
    const maxVal = getDiceMaxValue(value)
    const currentTotal = computeTotalResult()
    const newMin = diceCount
    const newMax = diceCount * maxVal
    const clampedTotal = Math.min(Math.max(currentTotal, newMin), newMax)
    const newValues = distributeTotal(clampedTotal, diceCount, maxVal)
    emit('updateMockData', {
      diceTypes: newTypes,
      diceValues: newValues,
      rollFormula: `${diceCount}${value}`,
    })
  },
})

const previewDiceCount = computed({
  get: () => props.mockData.diceTypes.length || 1,
  set: (value: number) => {
    const diceType = props.mockData.diceTypes[0] || 'd20'
    const newTypes = Array(value).fill(diceType) as DiceType[]
    const maxVal = getDiceMaxValue(diceType)
    const currentTotal = computeTotalResult()
    const newMin = value
    const newMax = value * maxVal
    const clampedTotal = Math.min(Math.max(currentTotal, newMin), newMax)
    const newValues = distributeTotal(clampedTotal, value, maxVal)
    emit('updateMockData', {
      diceTypes: newTypes,
      diceValues: newValues,
      rollFormula: `${value}${diceType}`,
    })
  },
})

const resultMin = computed(() => props.mockData.diceTypes.length || 1)

const resultMax = computed(() => {
  const diceType = props.mockData.diceTypes[0] || 'd20'
  const count = props.mockData.diceTypes.length || 1
  return count * getDiceMaxValue(diceType)
})

const currentTotalResult = computed(() => {
  return props.mockData.diceValues.reduce((sum, val) => sum + val, 0)
})

function getDiceMaxValue(diceType: DiceType): number {
  const option = diceTypeOptions.find((opt) => opt.value === diceType)
  return option?.maxValue || parseInt(diceType.slice(1), 10)
}

function computeTotalResult(): number {
  return props.mockData.diceValues.reduce((sum, val) => sum + val, 0)
}

function distributeTotal(total: number, diceCount: number, maxPerDie: number): number[] {
  const values: number[] = []
  let remaining = total

  for (let i = 0; i < diceCount; i++) {
    const diceLeft = diceCount - i
    const minForThis = Math.max(1, remaining - (diceLeft - 1) * maxPerDie)
    const maxForThis = Math.min(maxPerDie, remaining - (diceLeft - 1))
    const idealValue = Math.round(remaining / diceLeft)
    const value = Math.min(Math.max(idealValue, minForThis), maxForThis)
    values.push(value)
    remaining -= value
  }

  return values
}

function updateTotalResult(newTotal: number) {
  const diceType = props.mockData.diceTypes[0] || 'd20'
  const count = props.mockData.diceTypes.length || 1
  const maxVal = getDiceMaxValue(diceType)
  const newValues = distributeTotal(newTotal, count, maxVal)

  const isCriticalSuccess = newTotal === count * maxVal
  const isCriticalFailure = newTotal === count

  emit('updateMockData', {
    diceValues: newValues,
    isCritical: isCriticalSuccess || isCriticalFailure,
    criticalType: isCriticalSuccess ? 'success' : isCriticalFailure ? 'failure' : null,
  })
}
</script>

<style scoped>
.dice-inspector {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.inspector-section {
  border-bottom: 1px solid var(--ui-border);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ui-text);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.section-header:hover {
  background: var(--ui-bg-elevated);
}

.section-content {
  padding: 0 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Sub-sections (collapsible) */
.sub-section {
  border-bottom: 1px solid var(--ui-border);
}

.sub-section:last-child {
  border-bottom: none;
}

.sub-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.5rem 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ui-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: color 0.15s ease;
}

.sub-section-header:hover {
  color: var(--ui-text);
}

.sub-section-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-bottom: 0.75rem;
}

/* Field groups */
.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.group-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ui-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
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

/* Outline control */
.outline-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.outline-color {
  width: auto;
}

/* Preview section - result input */
.result-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.result-range-hint {
  font-size: 0.625rem;
  color: var(--ui-text-muted);
  font-variant-numeric: tabular-nums;
}

/* Formula display */
.formula-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--ui-bg-elevated);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  margin-top: 0.5rem;
}

.formula-text {
  font-family: ui-monospace, monospace;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ui-text);
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
</style>
