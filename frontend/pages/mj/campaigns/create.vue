<template>

    <div class="min-h-screen py-6">
      <div class="space-y-6">
        <!-- Header -->
        <UCard>
          <div class="flex items-center gap-4">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-arrow-left"
              @click="_router.push('/mj/campaigns')"
            />
            <div class="bg-primary-500/10 p-3 rounded-xl">
              <UIcon name="i-lucide-folder-plus" class="size-8 text-primary-500" />
            </div>
            <div>
              <h1 class="text-3xl font-bold text-white">Créer une campagne</h1>
              <p class="text-gray-400 mt-1">
                Configurez votre nouvelle campagne multi-stream
              </p>
            </div>
          </div>
        </UCard>

        <!-- Form Card -->
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold text-white">
              Informations de la campagne
            </h2>
          </template>

          <div class="space-y-6">
            <!-- Name Field -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Nom de la campagne <span class="text-red-400">*</span>
              </label>
              <UInput
                v-model="name"
                type="text"
                placeholder="Ma super campagne"
                size="lg"
                icon="i-lucide-folder"
                autofocus
              />
              <p class="text-xs text-gray-400 mt-1">
                Le nom de votre campagne (visible par tous les membres)
              </p>
            </div>

            <!-- Description Field -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <UInput
                v-model="description"
                type="textarea"
                placeholder="Description de la campagne..."
                :rows="6"
              />
              <p class="text-xs text-gray-400 mt-1">
                Une brève description (optionnel)
              </p>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                color="neutral"
                variant="soft"
                label="Annuler"
                icon="i-lucide-x"
                @click="_router.push('/mj/campaigns')"
              />
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
  breadcrumbs: [
    { label: "Campagnes", to: "/mj/campaigns", icon: "i-lucide-folder-kanban" },
    { label: "Nouvelle campagne", to: null, icon: "i-lucide-folder-plus" }
  ]
});

const _router = useRouter();
const toast = useToast();
const { createCampaign } = useCampaigns();

const name = ref("");
const description = ref("");
const creating = ref(false);

const handleCreate = async () => {
  if (!name.value.trim()) {
    toast.add({
      title: "Erreur",
      description: "Le nom de la campagne est requis",
      color: "error",
    });
    return;
  }

  creating.value = true;
  try {
    await createCampaign({
      name: name.value.trim(),
      description: description.value.trim() || undefined,
    });

    toast.add({
      title: "Succès",
      description: `Campagne "${name.value}" créée avec succès`,
      color: "success",
    });

    _router.push("/mj/campaigns");
  } catch (error: unknown) {
    console.error("Failed to create campaign:", error);
    toast.add({
      title: "Erreur",
      description: (error as { data?: { error?: string } })?.data?.error || "Impossible de créer la campagne",
      color: "error",
    });
  } finally {
    creating.value = false;
  }
};
</script>
