<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div v-if="bannerVisible" class="fixed bottom-0 inset-x-0 z-50 safe-area-bottom">
      <div class="bg-(--theme-card-bg) border-t border-(--theme-border) shadow-lg">
        <div class="container mx-auto px-4 py-4 max-w-4xl">
          <!-- Mode simple (vue initiale) -->
          <template v-if="!showDetails">
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div class="flex-1">
                <p class="text-sm text-primary font-medium mb-1">Nous utilisons des cookies</p>
                <p class="text-xs text-muted">
                  Nous utilisons des cookies pour analyser notre trafic et ameliorer votre
                  experience.
                  <button
                    class="text-primary underline hover:no-underline ml-1"
                    @click="showDetails = true"
                  >
                    Personnaliser
                  </button>
                </p>
              </div>
              <div class="flex gap-2 w-full sm:w-auto">
                <UButton
                  color="neutral"
                  variant="outline"
                  size="sm"
                  class="flex-1 sm:flex-none"
                  @click="handleRejectAll"
                >
                  Refuser
                </UButton>
                <UButton
                  color="primary"
                  variant="solid"
                  size="sm"
                  class="flex-1 sm:flex-none"
                  @click="handleAcceptAll"
                >
                  Accepter tout
                </UButton>
              </div>
            </div>
          </template>

          <!-- Mode detaille (personnalisation) -->
          <template v-else>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold text-primary">Preferences de cookies</h3>
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-x"
                  @click="showDetails = false"
                />
              </div>

              <div class="space-y-3">
                <!-- Cookies essentiels -->
                <div
                  class="flex items-center justify-between p-3 bg-(--theme-bg-elevated) rounded-lg"
                >
                  <div class="flex-1 min-w-0 pr-4">
                    <p class="font-medium text-primary">Cookies essentiels</p>
                    <p class="text-xs text-muted">
                      Necessaires au fonctionnement du site (authentification, session)
                    </p>
                  </div>
                  <USwitch :model-value="true" disabled />
                </div>

                <!-- Cookies analytiques -->
                <div
                  class="flex items-center justify-between p-3 bg-(--theme-bg-elevated) rounded-lg"
                >
                  <div class="flex-1 min-w-0 pr-4">
                    <p class="font-medium text-primary">Cookies analytiques</p>
                    <p class="text-xs text-muted">
                      Nous aident a comprendre comment vous utilisez le site, incluant
                      l'enregistrement anonymise de votre navigation (PostHog)
                    </p>
                  </div>
                  <USwitch v-model="localAnalytics" />
                </div>

                <!-- Cookies marketing -->
                <div
                  class="flex items-center justify-between p-3 bg-(--theme-bg-elevated) rounded-lg"
                >
                  <div class="flex-1 min-w-0 pr-4">
                    <p class="font-medium text-primary">Cookies marketing</p>
                    <p class="text-xs text-muted">
                      Permettent de mesurer l'efficacite de nos campagnes publicitaires
                    </p>
                  </div>
                  <USwitch v-model="localMarketing" />
                </div>
              </div>

              <div class="flex flex-col sm:flex-row gap-2 pt-2">
                <UButton
                  color="neutral"
                  variant="outline"
                  size="sm"
                  class="flex-1"
                  @click="handleRejectAll"
                >
                  Tout refuser
                </UButton>
                <UButton
                  color="primary"
                  variant="solid"
                  size="sm"
                  class="flex-1"
                  @click="handleSavePreferences"
                >
                  Enregistrer mes preferences
                </UButton>
              </div>

              <p class="text-xs text-muted text-center">
                <NuxtLink to="/privacy" class="underline hover:no-underline">
                  Politique de confidentialite
                </NuxtLink>
              </p>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCookieConsent } from '@/composables/useCookieConsent'

const { bannerVisible, preferences, acceptAll, rejectAll, savePreferences } = useCookieConsent()

// Mode detail ou simple
const showDetails = ref(false)

// Etat local pour les switches (avant sauvegarde)
const localAnalytics = ref(false)
const localMarketing = ref(false)

// Synchroniser l'etat local avec les preferences stockees
watch(
  preferences,
  (newPrefs) => {
    if (newPrefs) {
      localAnalytics.value = newPrefs.analytics
      localMarketing.value = newPrefs.marketing
    }
  },
  { immediate: true }
)

const handleAcceptAll = () => {
  acceptAll()
}

const handleRejectAll = () => {
  rejectAll()
}

const handleSavePreferences = () => {
  savePreferences({
    analytics: localAnalytics.value,
    marketing: localMarketing.value,
  })
}
</script>

<style scoped>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
