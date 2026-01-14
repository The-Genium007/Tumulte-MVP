<template>
  <UModal v-model:open="isOpen" class="w-full max-w-lg mx-4">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="bg-warning-light p-2 rounded-lg">
          <UIcon name="i-lucide-bell-off" class="size-6 text-warning-500" />
        </div>
        <h3 class="text-xl font-semibold text-primary">
          Notifications désactivées
        </h3>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <p class="text-secondary">
          Les notifications push vous permettent de ne rien manquer :
        </p>

        <ul class="space-y-2 text-muted">
          <li class="flex items-start gap-2">
            <UIcon
              name="i-lucide-mail"
              class="size-5 text-primary-500 mt-0.5 shrink-0"
            />
            <span
              ><strong class="text-primary">Invitations</strong> - Soyez averti
              quand un MJ vous invite à une campagne</span
            >
          </li>
          <li class="flex items-start gap-2">
            <UIcon
              name="i-lucide-bar-chart-3"
              class="size-5 text-primary-500 mt-0.5 shrink-0"
            />
            <span
              ><strong class="text-primary">Sondages</strong> - Recevez une alerte
              quand un sondage démarre ou se termine</span
            >
          </li>
          <li class="flex items-start gap-2">
            <UIcon
              name="i-lucide-alert-triangle"
              class="size-5 text-primary-500 mt-0.5 shrink-0"
            />
            <span
              ><strong class="text-primary">Alertes</strong> - Problèmes de
              connexion, tokens expirés...</span
            >
          </li>
        </ul>

        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-info"
          title="Comment réactiver ?"
          description="Vous pouvez autoriser les notifications à tout moment dans les paramètres de votre navigateur, puis revenir dans les Paramètres de Tumulte."
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton
          color="neutral"
          variant="soft"
          label="Compris"
          class="w-full sm:w-auto"
          @click="close"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel<boolean>("open", { default: false });

const close = () => {
  isOpen.value = false;
};
</script>
