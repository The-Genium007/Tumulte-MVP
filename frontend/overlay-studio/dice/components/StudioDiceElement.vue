<template>
  <TresGroup
    ref="groupRef"
    :position="[element.position.x, element.position.y, element.position.z]"
    :rotation="[element.rotation.x, element.rotation.y, element.rotation.z]"
    :scale="[element.scale.x, element.scale.y, element.scale.z]"
  >
    <!-- Zone de fond cliquable pour la sélection -->
    <Html
      :center="true"
      :transform="true"
      :scale="50"
      :occlude="false"
      :sprite="false"
    >
      <div
        class="dice-preview"
        :style="containerStyle"
        @pointerdown.stop="handlePointerDown"
        @click.stop
      >
        <!-- Conteneur flex pour le dé 3D et le HUD -->
        <div class="dice-content">
          <!-- Zone du dé 3D (vrai DiceBox comme en production) -->
          <div class="dice-3d-container">
            <ClientOnly>
              <DiceBox
                ref="diceBoxRef"
                :custom-colorset="diceCustomColorset"
                :texture="diceTexture"
                :material="diceMaterial"
                :light-intensity="diceLightIntensity"
                :sounds="false"
                @ready="onDiceBoxReady"
              />
            </ClientOnly>
          </div>

          <!-- HUD de résultat réel (même composant que l'overlay OBS) -->
          <div class="hud-container">
            <DiceRollOverlay
              :dice-roll="mockDiceRollEvent"
              :visible="true"
              :hud-config="diceProperties.hud"
              :critical-colors="diceProperties.colors"
            />
          </div>
        </div>
      </div>
    </Html>
  </TresGroup>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { Html } from "@tresjs/cientos";
import type { Object3D } from "three";
import type { OverlayElement, DiceProperties } from "../../types";
import type { DiceRollEvent } from "~/types";
import DiceRollOverlay from "~/components/overlay/DiceRollOverlay.vue";
import DiceBox from "~/components/DiceBox.client.vue";

const props = defineProps<{
  element: OverlayElement;
  isSelected: boolean;
}>();

const emit = defineEmits<{
  select: [id: string, meshRef: Object3D];
  moveStart: [];
  move: [deltaX: number, deltaY: number];
  moveEnd: [];
}>();

const groupRef = ref<Object3D | null>(null);
const diceBoxRef = ref<InstanceType<typeof DiceBox> | null>(null);

// Propriétés typées du Dice
const diceProperties = computed(() => props.element.properties as DiceProperties);

// Configuration custom colorset pour le DiceBox
const diceCustomColorset = computed(() => {
  const { colors } = diceProperties.value.diceBox;
  return {
    foreground: colors.foreground,
    background: colors.background,
    outline: colors.outline,
  };
});

// Texture du dé
const diceTexture = computed(() => diceProperties.value.diceBox.texture);

// Matériau du dé
const diceMaterial = computed(() => diceProperties.value.diceBox.material);

// Intensité lumineuse de la scène 3D
const diceLightIntensity = computed(() => diceProperties.value.diceBox.lightIntensity);

// Quand le DiceBox est prêt, lancer un dé statique pour l'aperçu
const onDiceBoxReady = async () => {
  if (diceBoxRef.value) {
    const formula = diceProperties.value.mockData.rollFormula || "1d20";
    await diceBoxRef.value.roll(formula);
  }
};

// Fonction debounced pour relancer le dé après modification des propriétés visuelles
const debouncedReroll = useDebounceFn(async () => {
  if (diceBoxRef.value) {
    const formula = diceProperties.value.mockData.rollFormula || "1d20";
    await diceBoxRef.value.roll(formula);
  }
}, 500);

// Watcher sur les propriétés visuelles du dé (couleurs, texture, matériau)
// Relance automatiquement le dé après 500ms d'inactivité pour voir les changements
watch(
  () => diceProperties.value.diceBox,
  () => {
    debouncedReroll();
  },
  { deep: true }
);

// Création d'un DiceRollEvent mocké basé sur les mockData
const mockDiceRollEvent = computed<DiceRollEvent>(() => {
  const mock = diceProperties.value.mockData;
  const totalResult = mock.diceValues.reduce((sum, val) => sum + val, 0);

  return {
    id: "mock-preview",
    characterId: "mock-char",
    characterName: "Prévisualisation",
    characterAvatar: null,
    rollFormula: mock.rollFormula,
    result: totalResult,
    diceResults: mock.diceValues,
    isCritical: mock.isCritical,
    criticalType: mock.criticalType,
    isHidden: false,
    rollType: "skill",
    rolledAt: new Date().toISOString(),
    isOwnCharacter: false,
    skill: null,
    skillRaw: null,
    ability: null,
    abilityRaw: null,
    modifiers: null,
  };
});

// Style du conteneur - couvre tout le canvas (1920x1080)
const containerStyle = computed(() => {
  return {
    width: "1920px",
    height: "1080px",
  };
});

// Gestion du pointerdown - sélection uniquement, pas de drag
const handlePointerDown = (event: PointerEvent) => {
  event.stopPropagation();

  if (groupRef.value) {
    emit("select", props.element.id, groupRef.value);
  }
};
</script>

<style scoped>
.dice-preview {
  background: transparent;
  cursor: default;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dice-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 48px;
  width: 100%;
  height: 100%;
}

.dice-3d-container {
  width: 500px;
  height: 400px;
  border-radius: 12px;
  overflow: hidden;
}

.hud-container {
  position: relative;
}

/* Override le positionnement fixed du DiceRollOverlay pour l'afficher inline */
.hud-container :deep(.dice-roll-container) {
  position: relative !important;
  top: auto !important;
  left: auto !important;
  transform: none !important;
}
</style>
