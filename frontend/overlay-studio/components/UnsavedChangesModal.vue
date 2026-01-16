<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="modal-header">
            <UIcon name="i-lucide-alert-triangle" class="size-6 text-warning-500" />
            <h3 class="modal-title">Modifications non sauvegardées</h3>
          </div>
        </template>

        <p class="modal-message">
          Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter sans sauvegarder ?
        </p>

        <template #footer>
          <div class="modal-actions">
            <UButton
              color="neutral"
              variant="outline"
              @click="handleCancel"
            >
              Annuler
            </UButton>
            <UButton
              color="error"
              @click="handleConfirm"
            >
              Quitter sans sauvegarder
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  confirm: [];
  cancel: [];
}>();

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit("update:open", value),
});

const handleConfirm = () => {
  emit("confirm");
};

const handleCancel = () => {
  emit("cancel");
};
</script>

<style scoped>
.modal-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.modal-message {
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>
