<template>
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="transform -translate-y-full opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform -translate-y-full opacity-0"
  >
    <div v-if="shouldShowInstallUI" class="fixed top-0 inset-x-0 z-50 safe-area-top">
      <div class="bg-primary-600 text-white px-4 py-3 shadow-lg">
        <div class="container mx-auto max-w-7xl flex items-center justify-between gap-4">
          <!-- Chrome/Edge: Standard install prompt -->
          <template v-if="canInstall">
            <div class="flex items-center gap-3 flex-1">
              <UIcon name="i-lucide-download" class="size-5 shrink-0" />
              <p class="text-sm font-medium">Installez Tumulte pour un accès rapide</p>
            </div>

            <div class="flex items-center gap-2">
              <UButton color="neutral" variant="solid" size="xs" @click="handleInstall">
                Installer
              </UButton>
              <UButton color="neutral" variant="ghost" size="xs" @click="handleDismiss">
                Plus tard
              </UButton>
            </div>
          </template>

          <!-- Safari macOS: Installation guide -->
          <template v-else-if="platform === 'safari-mac'">
            <div class="flex items-center gap-3 flex-1">
              <UIcon name="i-lucide-monitor" class="size-5 shrink-0" />
              <p class="text-sm">
                <span class="font-medium">Installez Tumulte :</span>
                Menu Fichier → Ajouter au Dock
              </p>
            </div>

            <div class="flex items-center gap-2">
              <UButton color="neutral" variant="solid" size="xs" @click="handleDismiss">
                Compris
              </UButton>
              <UButton color="neutral" variant="ghost" size="xs" @click="handleDismiss">
                Plus tard
              </UButton>
            </div>
          </template>

          <!-- Safari iOS: Installation guide -->
          <template v-else-if="platform === 'safari-ios'">
            <div class="flex items-center gap-3 flex-1">
              <UIcon name="i-lucide-smartphone" class="size-5 shrink-0" />
              <p class="text-sm">
                <span class="font-medium">Installez Tumulte :</span>
                Partager
                <UIcon name="i-lucide-share" class="size-4 inline-block mx-1" />
                → Sur l'écran d'accueil
              </p>
            </div>

            <div class="flex items-center gap-2">
              <UButton color="neutral" variant="solid" size="xs" @click="handleDismiss">
                Compris
              </UButton>
              <UButton color="neutral" variant="ghost" size="xs" @click="handleDismiss">
                Plus tard
              </UButton>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { usePwaInstall } from '@/composables/usePwaInstall'

const { canInstall, canShowGuide, shouldShowInstallUI, platform, install, dismiss } =
  usePwaInstall()

// Silence unused variable warning - canShowGuide is used indirectly via shouldShowInstallUI
void canShowGuide

const handleInstall = async () => {
  await install()
}

const handleDismiss = () => {
  dismiss()
}
</script>
