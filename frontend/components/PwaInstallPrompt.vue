<template>
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="transform -translate-y-full opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform -translate-y-full opacity-0"
  >
    <div
      v-if="canInstall && !dismissed"
      class="fixed top-0 inset-x-0 z-50 safe-area-top"
    >
      <div class="bg-primary-600 text-white px-4 py-3 shadow-lg">
        <div class="container mx-auto max-w-7xl flex items-center justify-between gap-4">
          <div class="flex items-center gap-3 flex-1">
            <UIcon name="i-lucide-download" class="size-5 shrink-0" />
            <p class="text-sm font-medium">
              Installez Tumulte pour un accès rapide
            </p>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              color="neutral"
              variant="solid"
              size="xs"
              @click="handleInstall"
            >
              Installer
            </UButton>

            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              @click="handleDismiss"
            >
              Plus tard
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { usePwaInstall } from '@/composables/usePwaInstall'

/**
 * PwaInstallPrompt component displays a banner prompting users to install the PWA.
 *
 * @example
 * <PwaInstallPrompt />
 */

const { canInstall, dismissed, install, dismiss } = usePwaInstall()

/**
 * Handles the install button click.
 */
const handleInstall = async () => {
  await install()
}

/**
 * Handles the dismiss button click.
 */
const handleDismiss = () => {
  dismiss()
}
</script>
