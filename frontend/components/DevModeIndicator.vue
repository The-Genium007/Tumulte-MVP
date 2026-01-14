<template>
  <div
    v-if="isDev"
    ref="indicatorRef"
    class="fixed z-50 transition-all duration-300 ease-out select-none"
    :class="[positionClasses, { 'transition-none': isDragging, 'cursor-grabbing': isDragging, 'cursor-grab': !isDragging }]"
    @mousedown="startDrag"
    @touchstart.passive="startDrag"
  >
    <UCard class="bg-warning-light border-warning-light backdrop-blur-sm shadow-lg">
      <!-- Handle de drag -->
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-grip-vertical"
            class="size-4 text-warning-400"
          />
          <UIcon
            name="i-lucide-construction"
            class="size-5 text-warning-500 animate-pulse"
          />
        </div>
        <div>
          <p class="text-sm font-semibold text-warning-500">Mode Développement</p>
          <p class="text-xs text-warning-400">Environnement de test actif</p>
        </div>
      </div>

      <!-- Toggle pour les données mockées -->
      <div class="mt-3 pt-3 border-t border-warning-200">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-database"
              class="size-4"
              :class="mockDataEnabled ? 'text-success-500' : 'text-warning-400'"
            />
            <span class="text-xs" :class="mockDataEnabled ? 'text-success-600 font-medium' : 'text-warning-400'">
              Données de test
            </span>
          </div>
          <USwitch
            v-model="mockDataEnabled"
            size="sm"
            @mousedown.stop
            @touchstart.stop
          />
        </div>
        <p v-if="mockDataEnabled" class="text-xs text-success-500 mt-1">
          Les pages affichent des données mockées
        </p>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useMockDataStore } from "@/stores/mockData";

const isDev = import.meta.env.MODE === "development";

const mockDataStore = useMockDataStore();

// Position management
type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
const STORAGE_KEY = "dev-indicator-corner";
const currentCorner = ref<Corner>("bottom-left");

// Drag state
const indicatorRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const currentPosition = ref({ x: 0, y: 0 });

// Position classes based on corner
const positionClasses = computed(() => {
  if (isDragging.value) {
    return ""; // Position handled by inline style during drag
  }

  const classes: Record<Corner, string> = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-20 left-4 lg:bottom-4",
    "bottom-right": "bottom-20 right-4 lg:bottom-4",
  };
  return classes[currentCorner.value];
});

// Load saved position
onMounted(() => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY) as Corner | null;
    if (saved && ["top-left", "top-right", "bottom-left", "bottom-right"].includes(saved)) {
      currentCorner.value = saved;
    }
  }
});

// Save position
const savePosition = (corner: Corner) => {
  currentCorner.value = corner;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, corner);
  }
};

// Calculate nearest corner
const getNearestCorner = (x: number, y: number): Corner => {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  const isLeft = x < windowWidth / 2;
  const isTop = y < windowHeight / 2;

  if (isTop && isLeft) return "top-left";
  if (isTop && !isLeft) return "top-right";
  if (!isTop && isLeft) return "bottom-left";
  return "bottom-right";
};

// Get client position from mouse or touch event
const getEventPosition = (e: MouseEvent | TouchEvent) => {
  if ("touches" in e) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
};

// Start dragging
const startDrag = (e: MouseEvent | TouchEvent) => {
  if (!indicatorRef.value) return;

  const rect = indicatorRef.value.getBoundingClientRect();
  const pos = getEventPosition(e);

  dragOffset.value = {
    x: pos.x - rect.left,
    y: pos.y - rect.top,
  };

  currentPosition.value = {
    x: rect.left,
    y: rect.top,
  };

  isDragging.value = true;

  // Apply initial position
  if (indicatorRef.value) {
    indicatorRef.value.style.left = `${currentPosition.value.x}px`;
    indicatorRef.value.style.top = `${currentPosition.value.y}px`;
    indicatorRef.value.style.right = "auto";
    indicatorRef.value.style.bottom = "auto";
  }

  document.addEventListener("mousemove", onDrag);
  document.addEventListener("mouseup", endDrag);
  document.addEventListener("touchmove", onDrag, { passive: false });
  document.addEventListener("touchend", endDrag);
};

// Handle drag movement
const onDrag = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value || !indicatorRef.value) return;

  if ("touches" in e) {
    e.preventDefault();
  }

  const pos = getEventPosition(e);
  const newX = pos.x - dragOffset.value.x;
  const newY = pos.y - dragOffset.value.y;

  // Clamp to window bounds
  const rect = indicatorRef.value.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width;
  const maxY = window.innerHeight - rect.height;

  currentPosition.value = {
    x: Math.max(0, Math.min(newX, maxX)),
    y: Math.max(0, Math.min(newY, maxY)),
  };

  indicatorRef.value.style.left = `${currentPosition.value.x}px`;
  indicatorRef.value.style.top = `${currentPosition.value.y}px`;
};

// End drag and snap to corner
const endDrag = () => {
  if (!isDragging.value || !indicatorRef.value) return;

  document.removeEventListener("mousemove", onDrag);
  document.removeEventListener("mouseup", endDrag);
  document.removeEventListener("touchmove", onDrag);
  document.removeEventListener("touchend", endDrag);

  // Calculate center of the element
  const rect = indicatorRef.value.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  // Find nearest corner and snap
  const nearestCorner = getNearestCorner(centerX, centerY);
  savePosition(nearestCorner);

  // Reset inline styles to let CSS take over
  indicatorRef.value.style.left = "";
  indicatorRef.value.style.top = "";
  indicatorRef.value.style.right = "";
  indicatorRef.value.style.bottom = "";

  isDragging.value = false;
};

// Cleanup
onUnmounted(() => {
  document.removeEventListener("mousemove", onDrag);
  document.removeEventListener("mouseup", endDrag);
  document.removeEventListener("touchmove", onDrag);
  document.removeEventListener("touchend", endDrag);
});

const mockDataEnabled = computed({
  get: () => mockDataStore.isEnabled,
  set: (value: boolean) => {
    if (value) {
      mockDataStore.enable();
    } else {
      mockDataStore.disable();
    }
  },
});
</script>
