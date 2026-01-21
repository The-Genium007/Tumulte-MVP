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
              @click="_router.push('/mj/campaigns/import')"
            >
              <template #leading>
                <UIcon
                  name="i-lucide-arrow-left"
                  class="size-12 transition-transform duration-200 group-hover:-translate-x-1"
                />
              </template>
            </UButton>
          </div>
          <div>
            <h1 class="text-3xl font-bold text-primary">Connecter un VTT</h1>
            <p class="text-muted mt-1">
              Établissez une connexion sécurisée avec votre Virtual Tabletop
            </p>
          </div>
        </div>
      </UCard>

      <!-- Form Card -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-primary">Code de connexion</h2>
            <button
              class="flex items-center justify-center size-8 rounded-full bg-primary-100 hover:bg-primary-200 transition-colors"
              title="Informations de sécurité"
              @click="showSecurityModal = true"
            >
              <UIcon name="i-lucide-info" class="size-5 text-primary-400" />
            </button>
          </div>
        </template>

        <div class="space-y-6">
          <!-- Instructions -->
          <UAlert
            color="primary"
            variant="soft"
            icon="i-lucide-info"
            title="Comment obtenir le code de connexion ?"
          >
            <template #description>
              <ol class="list-decimal list-inside space-y-2 mt-2">
                <li v-for="(step, index) in providerInstructions" :key="index">{{ step }}</li>
              </ol>
            </template>
          </UAlert>

          <!-- Foundry Module Installation Help -->
          <UAlert
            v-if="currentProvider === 'foundry'"
            color="neutral"
            variant="soft"
            icon="i-lucide-package"
            title="Installer le module Foundry VTT"
          >
            <template #description>
              <p class="mt-2">
                Pour installer le module Tumulte dans Foundry VTT, utilisez ce lien dans le menu
                <strong>"Install Module"</strong> :
              </p>
              <div class="mt-3 flex items-center gap-2">
                <code
                  class="flex-1 px-3 py-2 bg-neutral-200 rounded text-xs break-all select-all font-mono"
                >
                  {{ foundryModuleUrl }}
                </code>
                <UButton
                  color="neutral"
                  variant="soft"
                  size="sm"
                  square
                  title="Copier le lien"
                  @click="copyModuleUrl"
                >
                  <UIcon name="i-lucide-copy" class="size-4" />
                </UButton>
              </div>
            </template>
          </UAlert>

          <!-- Code Input -->
          <div class="w-full max-w-64">
            <label class="block text-sm font-bold text-secondary ml-4 uppercase mb-2">
              Code de connexion <span class="text-error-500">*</span>
            </label>
            <div class="flex items-center gap-2">
              <UInput
                v-model="pairingCode"
                type="text"
                placeholder="ABC-123"
                size="lg"
                :disabled="pairing"
                :ui="{
                  root: 'ring-0 border-0 rounded-lg overflow-hidden flex-1',
                  base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg font-mono text-2xl tracking-widest text-center uppercase',
                }"
                @input="formatCode"
              />
              <UButton
                color="primary"
                variant="solid"
                size="lg"
                square
                :disabled="pairing"
                title="Coller depuis le presse-papier"
                @click="pasteFromClipboard"
              >
                <UIcon name="i-lucide-clipboard-paste" class="size-5" />
              </UButton>
            </div>
            <p v-if="codeError" class="text-xs text-error-500 mt-2 ml-4">
              {{ codeError }}
            </p>
          </div>

          <!-- Pairing Error -->
          <UAlert
            v-if="pairingError"
            color="error"
            variant="soft"
            icon="i-lucide-alert-circle"
            title="Échec de la connexion"
          >
            <template #description>
              <p class="mt-2">{{ pairingError }}</p>
            </template>
          </UAlert>

          <!-- Pairing Success -->
          <UAlert
            v-if="pairingSuccess"
            color="success"
            variant="soft"
            icon="i-lucide-check-circle-2"
            title="Connexion établie avec succès !"
          >
            <template #description>
              <p class="mt-2">
                Votre VTT <strong>{{ pairingSuccess.connection.name }}</strong> est maintenant
                connecté à Tumulte.
              </p>
              <p class="mt-2">
                La campagne <strong>{{ pairingSuccess.campaign.name }}</strong> a été créée
                automatiquement.
              </p>
              <p class="mt-2 text-sm text-muted flex items-center gap-2">
                <UIcon name="i-game-icons-dice-twenty-faces-twenty" class="animate-spin size-4" />
                Redirection vers votre campagne...
              </p>
            </template>
          </UAlert>

          <!-- Connect Button -->
          <div v-if="!pairingSuccess" class="flex gap-3">
            <UButton
              color="primary"
              label="Connecter"
              icon="i-lucide-plug-zap"
              size="lg"
              :loading="pairing"
              :disabled="!isCodeValid"
              @click="handlePairing"
            />
          </div>
        </div>

        <template v-if="pairingSuccess" #footer>
          <div class="flex justify-end">
            <UButton
              color="primary"
              label="Continuer vers l'import de campagne"
              icon="i-lucide-arrow-right"
              trailing
              @click="_router.push('/mj/campaigns/import')"
            />
          </div>
        </template>
      </UCard>

      <!-- Security Info Modal -->
      <UModal v-model:open="showSecurityModal">
        <template #content>
          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-3 min-w-0">
                  <UIcon name="i-lucide-shield" class="size-5 text-primary shrink-0" />
                  <h3 class="text-lg sm:text-xl font-semibold text-primary truncate">
                    Sécurité de la connexion
                  </h3>
                </div>
                <button
                  class="flex items-center justify-center size-8 rounded-full hover:bg-neutral-200 transition-colors shrink-0"
                  @click="showSecurityModal = false"
                >
                  <UIcon name="i-lucide-x" class="size-5 text-muted" />
                </button>
              </div>
            </template>

            <div class="space-y-4">
              <p class="text-sm text-muted">
                La connexion entre Tumulte et votre VTT est sécurisée par plusieurs couches de
                protection :
              </p>

              <div class="space-y-3">
                <div class="flex gap-3">
                  <UIcon name="i-lucide-key" class="size-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <h4 class="font-semibold text-primary text-sm">Authentification JWT</h4>
                    <p class="text-xs text-muted mt-1">
                      Chaque connexion utilise des tokens JWT signés avec une clé secrète unique. La
                      signature est vérifiée à chaque requête.
                    </p>
                  </div>
                </div>

                <div class="flex gap-3">
                  <UIcon name="i-lucide-socket" class="size-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <h4 class="font-semibold text-primary text-sm">Tunnel WebSocket chiffré</h4>
                    <p class="text-xs text-muted mt-1">
                      Les données transitent via un tunnel WebSocket sécurisé (WSS) avec chiffrement
                      TLS end-to-end.
                    </p>
                  </div>
                </div>

                <div class="flex gap-3">
                  <UIcon name="i-lucide-heart-pulse" class="size-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <h4 class="font-semibold text-primary text-sm">Heartbeat automatique</h4>
                    <p class="text-xs text-muted mt-1">
                      Un ping toutes les 30 secondes vérifie que la connexion est active. Détection
                      de déconnexion en moins de 60 secondes.
                    </p>
                  </div>
                </div>

                <div class="flex gap-3">
                  <UIcon name="i-lucide-shield-off" class="size-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <h4 class="font-semibold text-primary text-sm">Révocation instantanée</h4>
                    <p class="text-xs text-muted mt-1">
                      Vous ou votre module VTT pouvez révoquer la connexion à tout moment. La
                      révocation est immédiate et bidirectionnelle.
                    </p>
                  </div>
                </div>
              </div>

              <UAlert color="primary" variant="soft" icon="i-lucide-info" class="mt-4">
                <template #description>
                  <p class="text-xs">
                    Aucune donnée sensible de votre VTT n'est stockée sur nos serveurs. Seuls les
                    identifiants de synchronisation sont conservés de manière chiffrée.
                  </p>
                </template>
              </UAlert>
            </div>

            <template #footer>
              <div class="flex justify-end">
                <UButton
                  color="primary"
                  label="Compris"
                  class="w-full sm:w-auto"
                  @click="showSecurityModal = false"
                />
              </div>
            </template>
          </UCard>
        </template>
      </UModal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from '#ui/composables/useToast'

definePageMeta({
  layout: 'authenticated' as const,
  middleware: ['auth'],
})

const _router = useRouter()
const route = useRoute()
const toast = useToast()
const config = useRuntimeConfig()

// Foundry module URL for installation
const foundryModuleUrl =
  'https://raw.githubusercontent.com/The-Genium007/Tumulte-Foundry-module/main/module.json'

// Provider instructions per VTT type
type VttProvider = 'foundry' | 'owlbear' | 'talespire'

const instructionsByProvider: Record<VttProvider, string[]> = {
  foundry: [
    'Installez le module Tumulte dans Foundry VTT',
    'Activez le module dans votre monde (Menu "Gérer les modules")',
    'Ouvrez les paramètres du module "Tumulte Integration"',
    'Cliquez sur "Manage Connection"',
    'Cliquez sur "Connect to Tumulte"',
    'Copiez le code affiché (ex: ABC-123) et collez-le ci-dessous',
  ],
  owlbear: [
    'Installez le module Tumulte dans Owlbear Rodeo',
    'Activez le module dans votre monde (Menu "Gérer les modules")',
    'Ouvrez les paramètres du module "Tumulte Integration"',
    'Cliquez sur "Manage Connection"',
    'Cliquez sur "Connect to Tumulte"',
    'Copiez le code affiché (ex: ABC-123) et collez-le ci-dessous',
  ],
  talespire: [
    'Installez le module Tumulte dans TaleSpire',
    'Activez le module dans votre monde (Menu "Gérer les modules")',
    'Ouvrez les paramètres du module "Tumulte Integration"',
    'Cliquez sur "Manage Connection"',
    'Cliquez sur "Connect to Tumulte"',
    'Copiez le code affiché (ex: ABC-123) et collez-le ci-dessous',
  ],
}

// Get provider from URL query param, default to foundry
const currentProvider = computed<VttProvider>(() => {
  const provider = route.query.provider as string
  if (provider && provider in instructionsByProvider) {
    return provider as VttProvider
  }
  return 'foundry'
})

const providerInstructions = computed(() => instructionsByProvider[currentProvider.value])

const pairingCode = ref('')
const pairing = ref(false)
const showSecurityModal = ref(false)
const codeError = ref('')
const pairingError = ref('')
const pairingSuccess = ref<{
  connection: {
    id: string
    name: string
    worldId: string
    worldName: string
    moduleVersion: string
  }
  campaign: {
    id: string
    name: string
    description: string
  }
  message: string
} | null>(null)

// Validate code format: ABC-123 or ABC123
const isCodeValid = computed(() => {
  const code = pairingCode.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return code.length === 6
})

// Auto-format code as user types (ABC-123)
const formatCode = () => {
  let value = pairingCode.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (value.length > 3) {
    value = value.slice(0, 3) + '-' + value.slice(3, 6)
  }
  pairingCode.value = value
  codeError.value = ''
  pairingError.value = ''
}

// Paste from clipboard
const pasteFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText()
    pairingCode.value = text
    formatCode()
  } catch {
    toast.add({
      title: 'Erreur',
      description: "Impossible d'accéder au presse-papier",
      color: 'error',
    })
  }
}

// Copy module URL to clipboard
const copyModuleUrl = async () => {
  try {
    await navigator.clipboard.writeText(foundryModuleUrl)
    toast.add({
      title: 'Copié !',
      description: 'Le lien du module a été copié dans le presse-papier',
      color: 'success',
    })
  } catch {
    toast.add({
      title: 'Erreur',
      description: 'Impossible de copier dans le presse-papier',
      color: 'error',
    })
  }
}

const handlePairing = async () => {
  if (!isCodeValid.value) {
    codeError.value = 'Code invalide. Format attendu : ABC-123'
    return
  }

  pairing.value = true
  pairingError.value = ''

  try {
    const response = await fetch(`${config.public.apiBase}/mj/vtt-connections/pair-with-code`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: pairingCode.value.trim(),
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Échec de l'établissement de la connexion")
    }

    pairingSuccess.value = data

    toast.add({
      title: 'Connexion établie',
      description: `Campagne "${data.campaign.name}" créée avec succès`,
      color: 'success',
    })

    // Redirect to the newly created campaign after a short delay
    setTimeout(() => {
      _router.push(`/mj/campaigns/${data.campaign.id}`)
    }, 2000)
  } catch (error: unknown) {
    console.error('Failed to establish pairing:', error)
    pairingError.value =
      error instanceof Error ? error.message : "Impossible d'établir la connexion"
    toast.add({
      title: 'Erreur',
      description: pairingError.value,
      color: 'error',
    })
  } finally {
    pairing.value = false
  }
}
</script>
