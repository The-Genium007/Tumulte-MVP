<template>

    <div class="min-h-screen">
      <div class="max-w-300 mx-auto space-y-6">


        <!-- Header -->
        <UCard>
          <div class="flex items-center gap-4">
            <div>
                      <!-- Bouton retour -->
        <UButton
          color="neutral"
          variant="soft"
          size="xl"
          square
          class="group"
          @click="_router.push('/mj')"
        >
          <template #leading>
            <UIcon name="i-lucide-arrow-left" class="size-12 transition-transform duration-200 group-hover:-translate-x-1" />
          </template>
        </UButton>
            </div>
            <div>
              <h1 class="text-3xl font-bold text-primary">Créer une campagne</h1>
              <p class="text-muted mt-1">
                Configurez votre nouvelle campagne
              </p>
            </div>
          </div>
        </UCard>

        <!-- Form Card -->
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold text-primary">
              Informations de la campagne
            </h2>
          </template>

          <div class="space-y-6 w-full lg:w-1/2 xl:w-1/3">
            <!-- Name Field -->
            <div>
              <label class="block text-sm font-bold text-secondary ml-4 uppercase">
                Nom de la campagne <span class="text-error-500">*</span>
              </label>
              <UInput
                v-model="name"
                type="text"
                placeholder="Ma super campagne"
                size="lg"
                autofocus
                :ui="{
                  root: 'ring-0 border-0 rounded-lg overflow-hidden',
                  base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg',
                }"
              />
            </div>

            <!-- Description Field -->
            <div>
              <label class="block text-sm font-bold text-secondary ml-4 uppercase">
                Description
              </label>
              <UTextarea
                v-model="description"
                type="textarea"
                placeholder="Description de la campagne..."
                :rows="6"
                :ui="{
                  root: 'ring-0 border-0 rounded-lg overflow-hidden',
                  base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg',
                }"
              />
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                color="primary"
                label="Créer la campagne"
                icon="i-lucide-check"
                :loading="creating"
                @click="handleCreate"
              />
            </div>
          </template>
        </UCard>
      </div>
    </div>
  
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useCampaigns } from "@/composables/useCampaigns";

definePageMeta({
  layout: "authenticated" as const,
  middleware: ["auth"],
});

const _router = useRouter();
const { createCampaign } = useCampaigns();

const name = ref("");
const description = ref("");
const creating = ref(false);

const handleCreate = async () => {
  if (!name.value.trim()) {
    return;
  }

  creating.value = true;
  try {
    await createCampaign({
      name: name.value.trim(),
      description: description.value.trim() || undefined,
    });

    _router.push("/mj");
  } catch (error: unknown) {
    console.error("Failed to create campaign:", error);
  } finally {
    creating.value = false;
  }
};
</script>
