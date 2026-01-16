<template>
  <TresGroup
    ref="groupRef"
    :position="[element.position.x, element.position.y, element.position.z]"
    :rotation="[element.rotation.x, element.rotation.y, element.rotation.z]"
    :scale="[element.scale.x, element.scale.y, element.scale.z]"
  >
    <!-- Rendu HTML via Html de @tresjs/cientos -->
    <!-- scale=50 pour rendre le HTML visible dans l'espace 3D (1920x1080) -->
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
      >
        <div class="dice-placeholder">
          <UIcon name="i-lucide-dices" class="dice-icon" />
          <span class="dice-label">Zone de dés 3D</span>
          <span class="dice-sublabel">{{ Math.round(element.scale.x * 100) }}% × {{ Math.round(element.scale.y * 100) }}%</span>
        </div>
      </div>
    </Html>
  </TresGroup>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Html } from "@tresjs/cientos";
import type { Object3D } from "three";
import type { OverlayElement } from "../../types";

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

// État du drag
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);

// Style du conteneur basé sur l'échelle
// Le DiceBox occupe 1920x1080 à scale 1, donc on calcule en proportion
// La zone doit correspondre à tout le canvas à scale 1
const containerStyle = computed(() => {
  // Taille de base en pixels pour l'aperçu dans le studio
  // Cohérent avec le gizmo (1920/2 x 1080/2)
  const baseWidth = 1920 / 2;
  const baseHeight = 1080 / 2;
  return {
    width: `${baseWidth}px`,
    height: `${baseHeight}px`,
  };
});

// Gestion du pointerdown pour démarrer le drag
const handlePointerDown = (event: PointerEvent) => {
  event.stopPropagation();

  // Sélectionner l'élément
  if (groupRef.value) {
    emit("select", props.element.id, groupRef.value);
  }

  // Démarrer le drag
  isDragging.value = true;
  dragStartX.value = event.clientX;
  dragStartY.value = event.clientY;

  emit("moveStart");
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
};

// Gestion du déplacement
const handlePointerMove = (event: PointerEvent) => {
  if (!isDragging.value) return;

  const deltaX = event.clientX - dragStartX.value;
  const deltaY = event.clientY - dragStartY.value;

  // Émettre le delta en pixels écran (sera converti par le parent)
  emit("move", deltaX, deltaY);

  dragStartX.value = event.clientX;
  dragStartY.value = event.clientY;
};

// Fin du drag
const handlePointerUp = () => {
  if (isDragging.value) {
    isDragging.value = false;
    emit("moveEnd");
  }

  window.removeEventListener("pointermove", handlePointerMove);
  window.removeEventListener("pointerup", handlePointerUp);
};
</script>

<style scoped>
.dice-preview {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  border: 2px dashed rgba(255, 255, 255, 0.3);
  cursor: move;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dice-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
}

.dice-icon {
  font-size: 48px;
  color: rgba(255, 255, 255, 0.6);
}

.dice-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
}

.dice-sublabel {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  font-family: ui-monospace, monospace;
}
</style>
