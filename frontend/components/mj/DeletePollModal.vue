<script setup lang="ts">
import type { Poll } from "~/types";

const props = defineProps<{
  poll: Poll | null;
}>();

const model = defineModel<boolean>({ default: false });

const emit = defineEmits<{
  confirm: [pollId: string];
}>();

const deleting = ref(false);

const handleConfirm = async () => {
  if (!props.poll) return;

  deleting.value = true;
  try {
    emit("confirm", props.poll.id);
  } finally {
    deleting.value = false;
  }
};

const handleCancel = () => {
  model.value = false;
};
</script>

<template>
  <UModal v-model:open="model" class="w-full max-w-lg mx-4">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <div class="p-2 bg-error-50 rounded-lg">
              <UIcon name="i-lucide-trash-2" class="size-5 text-error-500" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-primary">
                Supprimer ce sondage ?
              </h3>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-muted">
            Vous êtes sur le point de supprimer le sondage :
          </p>
          <div
            v-if="poll"
            class="p-3 bg-neutral-50 rounded-lg border border-neutral-200"
          >
            <p class="font-medium text-primary">{{ poll.question }}</p>
            <p class="text-sm text-muted mt-1">
              {{ poll.options.length }} options
            </p>
          </div>
          <p class="text-sm text-muted">
            Cette action est irréversible. Le sondage et son historique seront
            supprimés définitivement.
          </p>
        </div>

        <template #footer>
          <div class="flex flex-col sm:flex-row justify-end gap-3 w-full">
            <UButton
              color="neutral"
              variant="outline"
              label="Annuler"
              class="w-full sm:w-auto"
              :disabled="deleting"
              @click="handleCancel"
            />
            <UButton
              color="error"
              variant="solid"
              label="Supprimer"
              icon="i-lucide-trash-2"
              class="w-full sm:w-auto"
              :loading="deleting"
              @click="handleConfirm"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
