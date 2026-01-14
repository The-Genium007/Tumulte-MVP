<template>
  <div class="min-h-screen bg-linear-to-br from-gray-950 via-purple-950/20 to-gray-950 py-12">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
      <UCard>
        <template #header>
          <div class="text-center space-y-3">
            <div class="flex justify-center">
              <div class="bg-primary-light p-6 rounded-2xl">
                <UIcon name="i-lucide-info" class="size-16 text-primary-500" />
              </div>
            </div>
            <h1 class="text-4xl font-bold text-primary">À propos de Tumulte</h1>
          </div>
        </template>

        <div class="prose prose-invert max-w-none space-y-6">
          <!-- C'est quoi Tumulte ? -->
          <section>
            <h2 class="text-2xl font-semibold text-primary mb-3">C'est quoi Tumulte ?</h2>
            <p class="text-secondary">
              Tumulte est un système de sondages Twitch synchronisés multi-streams,
              conçu spécifiquement pour les sessions de jeux de rôle (RPG) diffusées
              sur plusieurs chaînes simultanément.
            </p>
          </section>

          <!-- Comment ça marche ? -->
          <section>
            <h2 class="text-2xl font-semibold text-primary mb-3">Comment ça marche ?</h2>
            <ul class="space-y-2 text-secondary">
              <li class="flex items-start gap-2">
                <UIcon name="i-lucide-check" class="size-5 text-primary-500 mt-0.5 shrink-0" />
                <span>Le MJ crée une campagne et invite les streamers participants</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon name="i-lucide-check" class="size-5 text-primary-500 mt-0.5 shrink-0" />
                <span>Le MJ lance un sondage depuis son dashboard</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon name="i-lucide-check" class="size-5 text-primary-500 mt-0.5 shrink-0" />
                <span>Le sondage apparaît automatiquement sur tous les chats Twitch liés</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon name="i-lucide-check" class="size-5 text-primary-500 mt-0.5 shrink-0" />
                <span>Les votes de toutes les communautés sont agrégés en temps réel</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon name="i-lucide-check" class="size-5 text-primary-500 mt-0.5 shrink-0" />
                <span>Le résultat final est visible par tous instantanément</span>
              </li>
            </ul>
          </section>

          <!-- Pour qui ? -->
          <section>
            <h2 class="text-2xl font-semibold text-primary mb-3">Pour qui ?</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-brand-light p-4 rounded-lg border border-brand-light">
                <h3 class="text-lg font-semibold text-primary mb-2 flex items-center gap-2">
                  <UIcon name="i-lucide-crown" class="size-5 text-brand-500" />
                  Maîtres du Jeu
                </h3>
                <p class="text-sm text-secondary">
                  Gérez vos campagnes, lancez des sondages synchronisés,
                  et suivez l'engagement de votre audience multi-streams.
                </p>
              </div>
              <div class="bg-primary-light p-4 rounded-lg border border-primary-light">
                <h3 class="text-lg font-semibold text-primary mb-2 flex items-center gap-2">
                  <UIcon name="i-lucide-users" class="size-5 text-primary-500" />
                  Streamers
                </h3>
                <p class="text-sm text-secondary">
                  Rejoignez des campagnes, participez aux sessions,
                  et engagez votre communauté dans l'aventure collective.
                </p>
              </div>
            </div>
          </section>

          <!-- Prérequis -->
          <section>
            <h2 class="text-2xl font-semibold text-primary mb-3">Prérequis</h2>
            <UAlert
              color="warning"
              variant="soft"
              icon="i-lucide-alert-triangle"
              title="Compte Twitch Affilié ou Partenaire requis"
            >
              <template #description>
                Tumulte utilise l'API Twitch Polls, qui nécessite un statut
                Affilié ou Partenaire. Les comptes non-affiliés ne peuvent pas
                utiliser les fonctionnalités de sondage.
              </template>
            </UAlert>
          </section>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default" as const,
});
</script>
