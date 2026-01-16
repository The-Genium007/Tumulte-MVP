<template>
  <div
    v-if="element"
    class="transform-gizmo"
    :style="gizmoStyle"
    @pointerdown.stop="handleGizmoPointerDown"
  >
    <!-- Bordure de sélection -->
    <div class="gizmo-border" />

    <!-- Handles d'angle (resize proportionnel) -->
    <div
      class="handle handle-corner handle-nw"
      @pointerdown.stop="(e) => startResize(e, 'nw')"
    />
    <div
      class="handle handle-corner handle-ne"
      @pointerdown.stop="(e) => startResize(e, 'ne')"
    />
    <div
      class="handle handle-corner handle-se"
      @pointerdown.stop="(e) => startResize(e, 'se')"
    />
    <div
      class="handle handle-corner handle-sw"
      @pointerdown.stop="(e) => startResize(e, 'sw')"
    />

    <!-- Handles de côté (resize sur un axe) -->
    <div
      class="handle handle-side handle-n"
      @pointerdown.stop="(e) => startResize(e, 'n')"
    />
    <div
      class="handle handle-side handle-e"
      @pointerdown.stop="(e) => startResize(e, 'e')"
    />
    <div
      class="handle handle-side handle-s"
      @pointerdown.stop="(e) => startResize(e, 's')"
    />
    <div
      class="handle handle-side handle-w"
      @pointerdown.stop="(e) => startResize(e, 'w')"
    />

    <!-- Zones de rotation (coins extérieurs) -->
    <div
      class="rotation-zone rotation-nw"
      @pointerdown.stop="(e) => startRotate(e)"
    />
    <div
      class="rotation-zone rotation-ne"
      @pointerdown.stop="(e) => startRotate(e)"
    />
    <div
      class="rotation-zone rotation-se"
      @pointerdown.stop="(e) => startRotate(e)"
    />
    <div
      class="rotation-zone rotation-sw"
      @pointerdown.stop="(e) => startRotate(e)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onUnmounted } from "vue";
import type { OverlayElement, PollProperties } from "../types";

const props = defineProps<{
  element: OverlayElement | null;
  canvasWidth: number;
  canvasHeight: number;
  containerWidth: number;
  containerHeight: number;
}>();

// Bordures actives pour le magnétisme (basé sur la proximité de la souris)
export interface ActiveEdges {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

const emit = defineEmits<{
  move: [deltaX: number, deltaY: number, activeEdges: ActiveEdges];
  resize: [
    deltaWidth: number,
    deltaHeight: number,
    deltaX: number,
    deltaY: number,
    proportional: boolean,
  ];
  rotate: [deltaAngle: number];
  transformStart: [mode: "move" | "resize" | "rotate"];
  transformEnd: [];
}>();

// Seuil de proximité pour activer le magnétisme sur une bordure (en pixels écran)
const EDGE_PROXIMITY_THRESHOLD = 50;

// Bordures actives pendant le drag
const activeEdges = ref<ActiveEdges>({
  top: false,
  bottom: false,
  left: false,
  right: false,
});

// État du drag
type DragMode = "move" | "resize" | "rotate" | null;
type ResizeHandle = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

const dragMode = ref<DragMode>(null);
const resizeHandle = ref<ResizeHandle | null>(null);
const startX = ref(0);
const startY = ref(0);
const startRotation = ref(0);

// Taille de base de l'élément
// NOTE: Ajouter de nouveaux types ici
const baseSize = computed(() => {
  if (!props.element) return { width: 100, height: 100 };

  if (props.element.type === "poll") {
    const pollProps = props.element.properties as PollProperties;
    const optionCount = pollProps.mockData.options.length;
    // Estimation : question ~80px + chaque option ~70px + progress ~50px + padding ~64px
    // Le Html utilise :scale="0.5", donc on multiplie par 2 pour compenser
    const height = (80 + optionCount * 70 + 50 + 64) * 2;
    const width = pollProps.layout.maxWidth * 2;
    return { width, height };
  }

  if (props.element.type === "dice") {
    // La zone de dés à scale 1 = tout le canvas (1920x1080)
    // Le gizmo doit correspondre au canvas complet
    return { width: 1920 / 2, height: 1080 / 2 };
  }

  // Pour les autres types, taille par défaut
  return { width: 100, height: 100 };
});

// Facteur de conversion entre l'espace canvas (1920x1080) et l'espace écran
const scaleFactor = computed(() => {
  if (props.containerWidth === 0 || props.containerHeight === 0) return 1;
  return props.containerWidth / props.canvasWidth;
});

// Style du gizmo (position et taille en pixels écran)
const gizmoStyle = computed(() => {
  if (!props.element) return {};

  const scale = scaleFactor.value;
  const el = props.element;

  // Dimensions avec scale appliqué
  const width = baseSize.value.width * el.scale.x * scale;
  const height = baseSize.value.height * el.scale.y * scale;

  // Position: convertir de l'espace canvas (origine au centre) vers l'espace écran (origine en haut à gauche)
  const centerX = (el.position.x + props.canvasWidth / 2) * scale;
  const centerY = (props.canvasHeight / 2 - el.position.y) * scale;

  // Position du coin supérieur gauche
  const left = centerX - width / 2;
  const top = centerY - height / 2;

  // Rotation en degrés (Z rotation en radians -> degrés)
  // Inverser car CSS rotate tourne en sens horaire, Three.js en sens anti-horaire
  const rotation = -(el.rotation.z * 180) / Math.PI;

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
    transform: `rotate(${rotation}deg)`,
  };
});

// Calculer les bordures actives basé sur la position de la souris par rapport au gizmo
const calculateActiveEdges = (event: PointerEvent): ActiveEdges => {
  const gizmoEl = document.querySelector(".transform-gizmo") as HTMLElement;
  if (!gizmoEl) {
    return { top: false, bottom: false, left: false, right: false };
  }

  const rect = gizmoEl.getBoundingClientRect();
  const mouseX = event.clientX;
  const mouseY = event.clientY;

  // Distance de la souris à chaque bordure
  const distanceToTop = Math.abs(mouseY - rect.top);
  const distanceToBottom = Math.abs(mouseY - rect.bottom);
  const distanceToLeft = Math.abs(mouseX - rect.left);
  const distanceToRight = Math.abs(mouseX - rect.right);

  return {
    top: distanceToTop <= EDGE_PROXIMITY_THRESHOLD,
    bottom: distanceToBottom <= EDGE_PROXIMITY_THRESHOLD,
    left: distanceToLeft <= EDGE_PROXIMITY_THRESHOLD,
    right: distanceToRight <= EDGE_PROXIMITY_THRESHOLD,
  };
};

// Démarrer le déplacement
const handleGizmoPointerDown = (event: PointerEvent) => {
  dragMode.value = "move";
  startX.value = event.clientX;
  startY.value = event.clientY;

  // Calculer les bordures actives au début du drag
  activeEdges.value = calculateActiveEdges(event);

  document.body.style.cursor = "move";
  emit("transformStart", "move");
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
};

// Démarrer le redimensionnement
const startResize = (event: PointerEvent, handle: ResizeHandle) => {
  dragMode.value = "resize";
  resizeHandle.value = handle;
  startX.value = event.clientX;
  startY.value = event.clientY;
  emit("transformStart", "resize");
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
};

// Démarrer la rotation
const startRotate = (event: PointerEvent) => {
  if (!props.element) return;

  dragMode.value = "rotate";
  startX.value = event.clientX;
  startY.value = event.clientY;

  // Calculer le centre du gizmo en coordonnées écran
  const scale = scaleFactor.value;
  const centerX =
    (props.element.position.x + props.canvasWidth / 2) * scale;
  const centerY =
    (props.canvasHeight / 2 - props.element.position.y) * scale;

  // Angle initial par rapport au centre
  startRotation.value = Math.atan2(
    event.clientY - centerY,
    event.clientX - centerX,
  );

  document.body.style.cursor = "grabbing";
  emit("transformStart", "rotate");
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
};

// Gestion du mouvement
const handlePointerMove = (event: PointerEvent) => {
  if (!props.element) return;

  const scale = scaleFactor.value;
  const deltaScreenX = event.clientX - startX.value;
  const deltaScreenY = event.clientY - startY.value;

  if (dragMode.value === "move") {
    // Recalculer les bordures actives pendant le drag
    activeEdges.value = calculateActiveEdges(event);

    // Convertir le delta écran en delta canvas
    const deltaCanvasX = deltaScreenX / scale;
    const deltaCanvasY = -deltaScreenY / scale; // Inverser Y car canvas Y est inversé
    emit("move", deltaCanvasX, deltaCanvasY, activeEdges.value);
    startX.value = event.clientX;
    startY.value = event.clientY;
  } else if (dragMode.value === "resize" && resizeHandle.value) {
    handleResize(deltaScreenX, deltaScreenY, event);
  } else if (dragMode.value === "rotate") {
    handleRotate(event);
  }
};

// Gestion du redimensionnement
const handleResize = (
  deltaScreenX: number,
  deltaScreenY: number,
  event: PointerEvent,
) => {
  if (!props.element || !resizeHandle.value) return;

  const scale = scaleFactor.value;
  const handle = resizeHandle.value;
  const rotation = props.element.rotation.z;

  // Appliquer la rotation inverse pour obtenir les deltas dans l'espace local
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);
  const localDeltaX = (deltaScreenX * cos - deltaScreenY * sin) / scale;
  // Inverser Y car l'écran a Y vers le bas, mais le canvas a Y vers le haut
  const localDeltaY = -(deltaScreenX * sin + deltaScreenY * cos) / scale;

  let deltaWidth = 0;
  let deltaHeight = 0;
  let deltaX = 0;
  let deltaY = 0;
  const proportional = handle.length === 2; // Corners = proportional

  // Calculer les deltas selon le handle
  // Convention: tirer vers l'extérieur = agrandir
  switch (handle) {
    case "e": // Droite: tirer à droite = agrandir
      deltaWidth = localDeltaX;
      break;
    case "w": // Gauche: tirer à gauche = agrandir
      deltaWidth = -localDeltaX;
      deltaX = localDeltaX / 2;
      break;
    case "s": // Bas: tirer vers le bas = agrandir (mais Y est inversé)
      deltaHeight = -localDeltaY;
      deltaY = localDeltaY / 2;
      break;
    case "n": // Haut: tirer vers le haut = agrandir
      deltaHeight = localDeltaY;
      deltaY = localDeltaY / 2;
      break;
    case "se": // Bas-droite
      deltaWidth = localDeltaX;
      deltaHeight = -localDeltaY;
      deltaY = localDeltaY / 2;
      break;
    case "sw": // Bas-gauche
      deltaWidth = -localDeltaX;
      deltaHeight = -localDeltaY;
      deltaX = localDeltaX / 2;
      deltaY = localDeltaY / 2;
      break;
    case "ne": // Haut-droite
      deltaWidth = localDeltaX;
      deltaHeight = localDeltaY;
      deltaY = localDeltaY / 2;
      break;
    case "nw": // Haut-gauche
      deltaWidth = -localDeltaX;
      deltaHeight = localDeltaY;
      deltaX = localDeltaX / 2;
      deltaY = localDeltaY / 2;
      break;
  }

  emit("resize", deltaWidth, deltaHeight, deltaX, deltaY, proportional);
  startX.value = event.clientX;
  startY.value = event.clientY;
};

// Gestion de la rotation
const handleRotate = (event: PointerEvent) => {
  if (!props.element) return;

  // Calculer le centre du gizmo
  const gizmoRect = document
    .querySelector(".transform-gizmo")
    ?.getBoundingClientRect();
  if (!gizmoRect) return;

  const centerX = gizmoRect.left + gizmoRect.width / 2;
  const centerY = gizmoRect.top + gizmoRect.height / 2;

  // Calculer le nouvel angle
  const newAngle = Math.atan2(
    event.clientY - centerY,
    event.clientX - centerX,
  );

  // Inverser le delta car CSS rotate et Three.js rotation Z tournent en sens opposé
  const deltaAngle = -(newAngle - startRotation.value);
  emit("rotate", deltaAngle);
  startRotation.value = newAngle;
};

// Fin du drag
const handlePointerUp = () => {
  if (dragMode.value) {
    emit("transformEnd");
  }
  dragMode.value = null;
  resizeHandle.value = null;
  document.body.style.cursor = "";
  window.removeEventListener("pointermove", handlePointerMove);
  window.removeEventListener("pointerup", handlePointerUp);
};

// Cleanup
onUnmounted(() => {
  window.removeEventListener("pointermove", handlePointerMove);
  window.removeEventListener("pointerup", handlePointerUp);
});
</script>

<style scoped>
.transform-gizmo {
  position: absolute;
  pointer-events: none;
  transform-origin: center center;
}

.gizmo-border {
  position: absolute;
  inset: 0;
  border: 2px solid var(--color-gizmo-border);
  pointer-events: auto;
  cursor: move;
}

/* Handles communs */
.handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: white;
  border: 2px solid var(--color-gizmo-border);
  border-radius: 2px;
  pointer-events: auto;
  z-index: 10;
}

/* Handles d'angle */
.handle-corner {
  width: 10px;
  height: 10px;
}

.handle-nw {
  top: -5px;
  left: -5px;
  cursor: nwse-resize;
}

.handle-ne {
  top: -5px;
  right: -5px;
  cursor: nesw-resize;
}

.handle-se {
  bottom: -5px;
  right: -5px;
  cursor: nwse-resize;
}

.handle-sw {
  bottom: -5px;
  left: -5px;
  cursor: nesw-resize;
}

/* Handles de côté */
.handle-side {
  width: 8px;
  height: 8px;
}

.handle-n {
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  cursor: ns-resize;
}

.handle-s {
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  cursor: ns-resize;
}

.handle-e {
  top: 50%;
  right: -4px;
  transform: translateY(-50%);
  cursor: ew-resize;
}

.handle-w {
  top: 50%;
  left: -4px;
  transform: translateY(-50%);
  cursor: ew-resize;
}

/* Zones de rotation (coins extérieurs) */
.rotation-zone {
  position: absolute;
  width: 20px;
  height: 20px;
  pointer-events: auto;
  cursor: grab;
  /* Debug: background: rgba(255, 0, 0, 0.2); */
}

.rotation-nw {
  top: -20px;
  left: -20px;
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2'%3E%3Cpath d='M4 12a8 8 0 0 1 8-8V1l5 4-5 4V6a5 5 0 0 0-5 5H4z'/%3E%3C/svg%3E")
      12 12,
    grab;
}

.rotation-ne {
  top: -20px;
  right: -20px;
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2'%3E%3Cpath d='M20 12a8 8 0 0 0-8-8V1l-5 4 5 4V6a5 5 0 0 1 5 5h3z'/%3E%3C/svg%3E")
      12 12,
    grab;
}

.rotation-se {
  bottom: -20px;
  right: -20px;
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2'%3E%3Cpath d='M20 12a8 8 0 0 1-8 8v3l-5-4 5-4v3a5 5 0 0 0 5-5h3z'/%3E%3C/svg%3E")
      12 12,
    grab;
}

.rotation-sw {
  bottom: -20px;
  left: -20px;
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2'%3E%3Cpath d='M4 12a8 8 0 0 0 8 8v3l5-4-5-4v3a5 5 0 0 1-5-5H4z'/%3E%3C/svg%3E")
      12 12,
    grab;
}

.rotation-zone:active {
  cursor: grabbing;
}
</style>
