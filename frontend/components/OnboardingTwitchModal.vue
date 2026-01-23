<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()

const connectTwitch = () => {
  console.log('[OnboardingTwitchModal] Linking Twitch to existing account...')
  const config = useRuntimeConfig()
  // Use /auth/link/twitch to link Twitch to the existing authenticated account
  // instead of /auth/twitch/redirect which would create a new account
  window.location.href = `${config.public.apiBase}/auth/link/twitch`
}
</script>

<template>
  <UModal :open="props.open" :close-on-overlay="false" class="w-full max-w-lg mx-4">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-party-popper" class="size-8 text-primary-500" />
            <div>
              <h3 class="text-lg font-semibold text-primary">Bienvenue sur Tumulte !</h3>
              <p class="text-sm text-muted">Une dernière étape avant de commencer</p>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-primary">
            Pour utiliser Tumulte, vous devez connecter votre compte Twitch.
          </p>

          <div class="bg-subtle rounded-lg p-4 space-y-3">
            <p class="text-sm font-medium text-primary">Cela nous permet de :</p>
            <ul class="space-y-2">
              <li class="flex items-start gap-2 text-sm text-muted">
                <UIcon name="i-lucide-vote" class="size-4 text-primary-500 mt-0.5 shrink-0" />
                <span>Créer et gérer des sondages sur votre chaîne</span>
              </li>
              <li class="flex items-start gap-2 text-sm text-muted">
                <UIcon
                  name="i-lucide-monitor-play"
                  class="size-4 text-primary-500 mt-0.5 shrink-0"
                />
                <span>Afficher l'overlay de sondage dans votre stream</span>
              </li>
              <li class="flex items-start gap-2 text-sm text-muted">
                <UIcon name="i-lucide-zap" class="size-4 text-primary-500 mt-0.5 shrink-0" />
                <span>Synchroniser les résultats en temps réel</span>
              </li>
            </ul>
          </div>

          <p class="text-xs text-muted">
            Vos données Twitch sont utilisées uniquement pour les fonctionnalités de l'application.
            Vous pouvez révoquer l'accès à tout moment depuis les paramètres.
          </p>
        </div>

        <template #footer>
          <div class="flex justify-end w-full">
            <UButton
              color="primary"
              variant="solid"
              label="Connecter mon compte Twitch"
              icon="i-simple-icons-twitch"
              size="lg"
              class="w-full sm:w-auto"
              @click="connectTwitch"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
