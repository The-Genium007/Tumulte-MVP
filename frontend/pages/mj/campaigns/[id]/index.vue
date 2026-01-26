<template>
  <div class="min-h-screen">
    <div class="max-w-7xl mx-auto">
      <!-- Header avec retour et actions -->
      <UCard class="mb-8">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex items-center gap-3 sm:gap-4">
            <!-- Bouton retour -->
            <UButton
              color="neutral"
              variant="soft"
              size="lg"
              square
              class="group shrink-0"
              to="/mj"
              aria-label="Retour aux campagnes"
            >
              <template #leading>
                <UIcon
                  name="i-lucide-arrow-left"
                  class="size-6 sm:size-8 transition-transform duration-200 group-hover:-translate-x-1"
                />
              </template>
            </UButton>

            <!-- Titre et date -->
            <div class="min-w-0">
              <h1 class="text-xl sm:text-3xl font-bold text-primary truncate">
                {{ campaign?.name || 'Chargement...' }}
              </h1>
              <p v-if="campaign?.description" class="text-muted text-sm sm:text-base line-clamp-1">
                {{ campaign.description }}
              </p>
              <p v-if="campaign" class="text-xs sm:text-sm text-muted mt-1">
                Créée le {{ formatDate(campaign.createdAt) }}
              </p>
            </div>
          </div>

          <!-- Boutons d'action -->
          <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <!-- Bouton Mon personnage -->
            <UButton
              icon="i-lucide-user-circle"
              color="primary"
              variant="soft"
              class="w-full sm:w-auto"
              :to="`/dashboard/campaigns/${campaignId}/settings`"
            >
              <span class="sm:hidden">Mon personnage</span>
              <span class="hidden sm:inline">Mon personnage</span>
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- Stats Cards - Mobile/Tablet: single card with list -->
      <div class="lg:hidden mb-8">
        <UCard>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <!-- Total Membres -->
            <div class="flex items-center gap-3">
              <div
                class="bg-primary-light size-10 rounded-lg flex items-center justify-center shrink-0"
              >
                <UIcon name="i-lucide-users" class="size-5 text-primary-500" />
              </div>
              <div>
                <p class="text-xs text-primary-500 font-medium">Total</p>
                <p class="text-lg font-bold text-primary">{{ members.length }}</p>
              </div>
            </div>

            <!-- En Live -->
            <div class="flex items-center gap-3">
              <div
                class="bg-error-light size-10 rounded-lg flex items-center justify-center shrink-0"
              >
                <UIcon name="i-lucide-radio" class="size-5 text-error-500" />
              </div>
              <div>
                <p class="text-xs text-primary-500 font-medium">En Live</p>
                <p class="text-lg font-bold text-primary">{{ liveMembersCount }}</p>
              </div>
            </div>

            <!-- Actifs -->
            <div class="flex items-center gap-3">
              <div
                class="bg-success-light size-10 rounded-lg flex items-center justify-center shrink-0"
              >
                <UIcon name="i-lucide-user-check" class="size-5 text-success-500" />
              </div>
              <div>
                <p class="text-xs text-primary-500 font-medium">Actifs</p>
                <p class="text-lg font-bold text-primary">{{ activeMembersCount }}</p>
              </div>
            </div>

            <!-- Autorisés -->
            <div class="flex items-center gap-3">
              <div
                class="bg-info-light size-10 rounded-lg flex items-center justify-center shrink-0"
              >
                <UIcon name="i-lucide-shield-check" class="size-5 text-info-500" />
              </div>
              <div>
                <p class="text-xs text-primary-500 font-medium">Autorisés</p>
                <p class="text-lg font-bold text-primary">{{ authorizedMembersCount }}</p>
              </div>
            </div>

            <!-- En Attente -->
            <div class="flex items-center gap-3">
              <div
                class="bg-warning-light size-10 rounded-lg flex items-center justify-center shrink-0"
              >
                <UIcon name="i-lucide-user-plus" class="size-5 text-warning-500" />
              </div>
              <div>
                <p class="text-xs text-primary-500 font-medium">En Attente</p>
                <p class="text-lg font-bold text-primary">{{ pendingMembersCount }}</p>
              </div>
            </div>

            <!-- VTT Connection Status (Mobile) -->
            <MjVttStatusCard :vtt-connection="campaign?.vttConnection" :campaign-id="campaignId" />
          </div>
        </UCard>
      </div>

      <!-- Stats Cards - Desktop: grid of 5 square cards -->
      <div class="hidden lg:flex justify-evenly mb-8">
        <div
          class="size-32 bg-primary-light rounded-3xl flex flex-col items-center justify-center text-center gap-2"
        >
          <UIcon name="i-lucide-users" class="size-7 text-primary-500" />
          <div>
            <p class="text-xs text-primary-500 font-medium">Total Membres</p>
            <p class="text-xl font-bold text-primary">{{ members.length }}</p>
          </div>
        </div>

        <div
          class="size-32 bg-error-light rounded-3xl flex flex-col items-center justify-center text-center gap-2"
        >
          <UIcon name="i-lucide-radio" class="size-7 text-error-500" />
          <div>
            <p class="text-xs text-primary-500 font-medium">En Live</p>
            <p class="text-xl font-bold text-primary">{{ liveMembersCount }}</p>
          </div>
        </div>

        <div
          class="size-32 bg-success-light rounded-3xl flex flex-col items-center justify-center text-center gap-2"
        >
          <UIcon name="i-lucide-user-check" class="size-7 text-success-500" />
          <div>
            <p class="text-xs text-primary-500 font-medium">Actifs</p>
            <p class="text-xl font-bold text-primary">{{ activeMembersCount }}</p>
          </div>
        </div>

        <div
          class="size-32 bg-info-light rounded-3xl flex flex-col items-center justify-center text-center gap-2"
        >
          <UIcon name="i-lucide-shield-check" class="size-7 text-info-500" />
          <div>
            <p class="text-xs text-primary-500 font-medium">Autorisés</p>
            <p class="text-xl font-bold text-primary">{{ authorizedMembersCount }}</p>
          </div>
        </div>

        <div
          class="size-32 bg-warning-light rounded-3xl flex flex-col items-center justify-center text-center gap-2"
        >
          <UIcon name="i-lucide-user-plus" class="size-7 text-warning-500" />
          <div>
            <p class="text-xs text-primary-500 font-medium">En Attente</p>
            <p class="text-xl font-bold text-primary">{{ pendingMembersCount }}</p>
          </div>
        </div>

        <!-- VTT Connection Status -->
        <MjVttStatusCard :vtt-connection="campaign?.vttConnection" :campaign-id="campaignId" />
      </div>

      <!-- Liste des membres -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-primary">Membres de la campagne</h2>
            <UButton
              icon="i-lucide-user-plus"
              label="Inviter un streamer"
              color="primary"
              variant="solid"
              size="lg"
              @click="showInviteModal = true"
            />
          </div>
        </template>

        <div v-if="loadingMembers" class="flex items-center justify-center py-12">
          <UIcon
            name="i-game-icons-dice-twenty-faces-twenty"
            class="size-12 text-primary animate-spin-slow"
          />
        </div>

        <div
          v-else-if="members.length === 0"
          class="flex flex-col items-center justify-center text-center py-12"
        >
          <UIcon name="i-lucide-users" class="size-12 text-neutral-400 mb-4" />
          <p class="text-base font-normal text-neutral-400">Aucun membre</p>
          <p class="text-sm text-neutral-400 mt-1 mb-6">
            Commencez par inviter des streamers à rejoindre cette campagne
          </p>
          <UButton
            icon="i-lucide-user-plus"
            label="Inviter un streamer"
            color="primary"
            variant="solid"
            size="lg"
            @click="showInviteModal = true"
          />
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="member in sortedMembers"
            :key="member.id"
            class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            <div class="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <!-- Avatar with Live Badge -->
              <div class="relative shrink-0">
                <img
                  v-if="member.streamer.profileImageUrl"
                  :src="member.streamer.profileImageUrl"
                  :alt="member.streamer.twitchDisplayName"
                  class="size-10 sm:size-12 rounded-full ring-2"
                  :class="
                    liveStatus[member.streamer.twitchUserId]?.is_live
                      ? 'ring-error-500'
                      : 'ring-brand-light'
                  "
                />
                <div
                  v-else
                  class="size-10 sm:size-12 rounded-full ring-2 ring-brand-light bg-brand-light flex items-center justify-center"
                >
                  <UIcon name="i-lucide-user" class="size-5 sm:size-6 text-brand-500" />
                </div>
                <LiveBadge :live-status="liveStatus[member.streamer.twitchUserId]" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-semibold text-primary text-sm sm:text-base truncate">
                    {{ member.streamer.twitchDisplayName }}
                  </p>
                  <UBadge
                    :label="member.status === 'ACTIVE' ? 'Actif' : 'En attente'"
                    :color="member.status === 'ACTIVE' ? 'success' : 'warning'"
                    variant="soft"
                    size="sm"
                  />
                  <!-- Broadcaster type badge -->
                  <UBadge
                    v-if="member.streamer.broadcasterType === 'partner'"
                    label="Partner"
                    color="primary"
                    variant="soft"
                    size="sm"
                  />
                  <UBadge
                    v-else-if="member.streamer.broadcasterType === 'affiliate'"
                    label="Affiliate"
                    color="info"
                    variant="soft"
                    size="sm"
                  />
                </div>
                <a
                  :href="`https://twitch.tv/${member.streamer.twitchLogin}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs sm:text-sm text-primary-400 hover:text-primary-300 transition-colors inline-flex items-center gap-1"
                >
                  @{{ member.streamer.twitchLogin }}
                  <UIcon name="i-lucide-external-link" class="size-3" />
                </a>
                <!-- Live info -->
                <p
                  v-if="liveStatus[member.streamer.twitchUserId]?.is_live"
                  class="text-xs text-error-500 mt-1 line-clamp-1"
                >
                  🔴 En live{{
                    liveStatus[member.streamer.twitchUserId]?.game_name
                      ? ` sur ${liveStatus[member.streamer.twitchUserId]?.game_name}`
                      : ''
                  }}
                  {{
                    liveStatus[member.streamer.twitchUserId]?.viewer_count !== undefined
                      ? `(${liveStatus[member.streamer.twitchUserId]?.viewer_count} viewers)`
                      : ''
                  }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-end">
              <!-- Authorization status badge with countdown -->
              <MemberAuthorizationBadge
                v-if="member.status === 'ACTIVE'"
                :is-poll-authorized="member.isPollAuthorized"
                :remaining-seconds="member.authorizationRemainingSeconds"
                :is-owner="member.isOwner"
                @expired="handleAuthorizationExpired"
              />

              <UButton
                v-if="!member.isOwner"
                icon="i-lucide-x"
                color="error"
                variant="solid"
                size="sm"
                @click="handleRemoveMember(member.id, member.streamer.twitchDisplayName)"
              >
                <span class="hidden sm:inline">Révoquer</span>
              </UButton>
            </div>
          </div>
        </div>
      </UCard>

      <!-- VTT Connection Section -->
      <UCard v-if="campaign?.vttConnection" class="mt-8">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-primary">Connexion Foundry VTT</h2>
            <UBadge :color="getTunnelStatusColor(campaign.vttConnection.tunnelStatus)" size="lg">
              {{ getTunnelStatusLabel(campaign.vttConnection.tunnelStatus) }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-4">
          <!-- World Information -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-bold text-secondary ml-4 uppercase mb-2">
                Monde VTT
              </label>
              <p class="text-primary ml-4">
                {{ campaign.vttConnection.worldName || 'Non configuré' }}
              </p>
            </div>
            <div v-if="campaign.vttConnection.moduleVersion">
              <label class="block text-sm font-bold text-secondary ml-4 uppercase mb-2">
                Version du Module
              </label>
              <p class="text-muted ml-4">v{{ campaign.vttConnection.moduleVersion }}</p>
            </div>
            <div v-if="campaign.vttConnection.lastHeartbeatAt">
              <label class="block text-sm font-bold text-secondary ml-4 uppercase mb-2">
                Dernière activité
              </label>
              <p class="text-muted ml-4">
                {{ formatRelativeTime(campaign.vttConnection.lastHeartbeatAt) }}
              </p>
            </div>
          </div>

          <!-- Connection Status Alert -->
          <UAlert
            v-if="campaign.vttConnection.tunnelStatus === 'connected'"
            color="success"
            variant="soft"
            icon="i-lucide-check-circle"
            title="Connexion active"
            description="La connexion avec votre VTT est établie et fonctionnelle."
          />
          <UAlert
            v-else-if="campaign.vttConnection.tunnelStatus === 'connecting'"
            color="warning"
            variant="soft"
            icon="i-lucide-loader-circle"
            title="Connexion en cours"
            description="Le tunnel est en cours d'établissement avec votre VTT."
          />
          <UAlert
            v-else-if="campaign.vttConnection.tunnelStatus === 'error'"
            color="error"
            variant="soft"
            icon="i-lucide-alert-circle"
            title="Erreur de connexion"
            description="Le tunnel a rencontré une erreur. Vérifiez que votre VTT est bien en ligne."
          />
          <UAlert
            v-else
            color="neutral"
            variant="soft"
            icon="i-lucide-unplug"
            title="Déconnecté"
            description="Le tunnel n'est pas actif. Lancez votre VTT pour établir la connexion."
          />

          <!-- Revoked Status Alert with Reauthorize button -->
          <div
            v-if="campaign.vttConnection.status === 'revoked'"
            class="pt-4 border-t border-neutral-200"
          >
            <UAlert
              color="warning"
              variant="soft"
              icon="i-lucide-shield-off"
              title="Connexion révoquée"
              description="L'accès à Foundry VTT a été révoqué. Les données sont conservées. Vous pouvez réautoriser l'accès pour reconnecter le module sans refaire l'appairage."
            />
            <div class="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 class="font-semibold text-primary">Réautoriser l'accès</h3>
                <p class="text-sm text-muted">
                  Réactive la connexion Foundry. Le module récupérera automatiquement les nouveaux
                  tokens.
                </p>
              </div>
              <UButton
                color="success"
                variant="soft"
                label="Réautoriser"
                icon="i-lucide-shield-check"
                :loading="reauthorizingVtt"
                class="w-full sm:w-auto"
                @click="handleReauthorizeVtt"
              />
            </div>
          </div>

          <!-- Revoke Connection (only if not already revoked) -->
          <div
            v-else
            class="pt-4 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <h3 class="font-semibold text-primary">Révoquer la connexion</h3>
              <p class="text-sm text-muted">
                Déconnecte le VTT et invalide les tokens d'authentification.
              </p>
            </div>
            <UButton
              color="warning"
              variant="soft"
              label="Révoquer"
              icon="i-lucide-shield-off"
              :loading="revokingVtt"
              class="w-full sm:w-auto"
              @click="handleRevokeVtt"
            />
          </div>
        </div>
      </UCard>

      <!-- No VTT Connection - Invite to connect -->
      <UCard v-else class="mt-8">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="bg-info-light p-3 rounded-lg">
              <UIcon name="i-lucide-plug-zap" class="size-6 text-info-500" />
            </div>
            <div>
              <h3 class="font-semibold text-primary">Connecter Foundry VTT</h3>
              <p class="text-sm text-muted">
                Synchronisez vos jets de dés et vos personnages avec Tumulte.
              </p>
            </div>
          </div>
          <UButton
            color="primary"
            variant="soft"
            label="Connecter"
            icon="i-lucide-link"
            to="/mj/vtt-connections/create"
            class="w-full sm:w-auto"
          />
        </div>
      </UCard>

      <!-- Danger Zone -->
      <UCard class="mt-8">
        <template #header>
          <h2 class="text-xl font-semibold text-error-500">Zone de danger</h2>
        </template>

        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 class="font-semibold text-primary">Supprimer la campagne</h3>
            <p class="text-sm text-muted">
              Cette action est irréversible. Tous les templates, sondages et membres seront
              supprimés.
            </p>
          </div>
          <UButton
            color="error"
            variant="soft"
            label="Supprimer"
            icon="i-lucide-trash-2"
            class="w-full sm:w-auto"
            @click="handleDeleteCampaign"
          />
        </div>
      </UCard>
    </div>
  </div>

  <!-- Modal de confirmation de suppression -->
  <UModal v-model:open="showDeleteModal">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="bg-error-light p-2 rounded-lg">
          <UIcon name="i-lucide-alert-triangle" class="size-6 text-error-500" />
        </div>
        <h3 class="text-xl font-bold text-primary">Supprimer la campagne</h3>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <p class="text-secondary">
          Êtes-vous sûr de vouloir supprimer la campagne
          <strong class="text-primary">{{ campaign?.name }}</strong> ?
        </p>
        <div class="bg-error-light border border-error-light rounded-lg p-4">
          <p class="text-sm text-error-500">
            ⚠️ Cette action est irréversible. Tous les templates, sondages et membres seront
            supprimés définitivement.
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-3 justify-end">
        <UButton color="neutral" variant="soft" label="Annuler" @click="showDeleteModal = false" />
        <UButton
          color="error"
          icon="i-lucide-trash-2"
          label="Supprimer définitivement"
          @click="confirmDeleteCampaign"
        />
      </div>
    </template>
  </UModal>

  <!-- Modal de confirmation de révocation -->
  <UModal v-model:open="showRemoveMemberModal">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="bg-error-light p-2 rounded-lg">
          <UIcon name="i-lucide-user-x" class="size-6 text-error-500" />
        </div>
        <h3 class="text-xl font-bold text-primary">Révoquer l'accès</h3>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <p class="text-secondary">
          Êtes-vous sûr de vouloir révoquer l'accès de
          <strong class="text-primary">{{ memberToRemove?.name }}</strong> ?
        </p>
        <div class="bg-error-light border border-error-light rounded-lg p-4">
          <p class="text-sm text-error-500">
            ⚠️ Cette action retirera immédiatement ce membre de la campagne et de tous les sondages
            en cours.
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-3 justify-end">
        <UButton
          color="neutral"
          variant="soft"
          label="Annuler"
          @click="showRemoveMemberModal = false"
        />
        <UButton
          color="error"
          icon="i-lucide-user-x"
          label="Révoquer l'accès"
          @click="confirmRemoveMember"
        />
      </div>
    </template>
  </UModal>

  <!-- Modal d'invitation -->
  <UModal v-model:open="showInviteModal">
    <template #header>
      <h3 class="text-xl font-bold text-primary">Inviter un streamer</h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-primary-500 pl-2 mb-0">
            Rechercher un streamer
          </label>
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Nom ou login Twitch..."
            size="lg"
            :ui="{
              root: 'ring-0 border-0 rounded-lg overflow-hidden',
              base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg [&>span:first-child]:text-primary-500',
            }"
          />
          <p class="text-xs text-neutral-400 mt-1">Tapez au moins 2 caractères</p>
        </div>

        <!-- Loading -->
        <div v-if="searching" class="flex items-center justify-center py-8">
          <UIcon
            name="i-game-icons-dice-twenty-faces-twenty"
            class="size-8 text-primary animate-spin-slow"
          />
        </div>

        <!-- Search Results -->
        <div
          v-else-if="filteredSearchResults.length > 0"
          class="space-y-2 max-h-96 overflow-y-auto"
        >
          <div
            v-for="streamer in filteredSearchResults"
            :key="streamer.id"
            class="flex items-center justify-between p-3 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            <div class="flex items-center gap-3">
              <img
                v-if="streamer.profileImageUrl"
                :src="streamer.profileImageUrl"
                :alt="streamer.displayName"
                class="size-10 rounded-full ring-2 ring-brand-light"
              />
              <div
                v-else
                class="size-10 rounded-full ring-2 ring-brand-light bg-brand-light flex items-center justify-center"
              >
                <UIcon name="i-lucide-user" class="size-5 text-brand-500" />
              </div>
              <div>
                <p class="font-semibold text-primary">{{ streamer.displayName }}</p>
                <p class="text-sm text-muted">@{{ streamer.login }}</p>
              </div>
            </div>
            <UButton
              color="primary"
              size="sm"
              label="Inviter"
              icon="i-lucide-user-plus"
              @click="handleInvite(streamer)"
            />
          </div>
        </div>

        <!-- No Results -->
        <div
          v-else-if="searchQuery.length >= 2"
          class="flex flex-col items-center justify-center text-center py-8"
        >
          <UIcon name="i-lucide-search-x" class="size-12 text-neutral-400 mb-4" />
          <p class="text-base font-normal text-neutral-400">
            {{
              searchResults.length > 0
                ? 'Tous les streamers trouvés sont déjà invités'
                : 'Aucun streamer trouvé'
            }}
          </p>
        </div>

        <!-- Initial State -->
        <div v-else class="flex flex-col items-center justify-center text-center py-8">
          <UIcon name="i-lucide-search" class="size-12 text-neutral-400 mb-4" />
          <p class="text-sm text-neutral-400">Tapez au moins 2 caractères pour rechercher</p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <UButton color="primary" variant="solid" label="Fermer" @click="showInviteModal = false" />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCampaigns } from '@/composables/useCampaigns'
import type { Campaign, CampaignMembership, StreamerSearchResult, LiveStatusMap } from '@/types'

const _router = useRouter()
const route = useRoute()
const campaignId = route.params.id as string

const {
  getCampaignDetails,
  inviteStreamer,
  removeMember,
  searchTwitchStreamers,
  deleteCampaign,
  getLiveStatus,
} = useCampaigns()

const campaign = ref<Campaign | null>(null)
const liveStatus = ref<LiveStatusMap>({})

definePageMeta({
  layout: 'authenticated' as const,
  middleware: ['auth'],
})
const members = ref<CampaignMembership[]>([])
const loadingMembers = ref(false)
const showInviteModal = ref(false)
const showDeleteModal = ref(false)
const showRemoveMemberModal = ref(false)
const revokingVtt = ref(false)
const reauthorizingVtt = ref(false)
const memberToRemove = ref<{ id: string; name: string } | null>(null)
const searchQuery = ref('')
const searchResults = ref<StreamerSearchResult[]>([])
const searching = ref(false)

// Auto-refresh intervals
let refreshInterval: ReturnType<typeof setInterval> | null = null
let liveStatusInterval: ReturnType<typeof setInterval> | null = null
const REFRESH_INTERVAL_MS = 60000 // Refresh members every 60 seconds
const LIVE_STATUS_INTERVAL_MS = 30000 // Refresh live status every 30 seconds

// Computed properties
const activeMembersCount = computed(() => members.value.filter((m) => m.status === 'ACTIVE').length)
const pendingMembersCount = computed(
  () => members.value.filter((m) => m.status === 'PENDING').length
)
const authorizedMembersCount = computed(
  () => members.value.filter((m) => m.status === 'ACTIVE' && m.isPollAuthorized).length
)
const liveMembersCount = computed(() => {
  return members.value.filter((m) => {
    const twitchUserId = m.streamer?.twitchUserId
    return twitchUserId && liveStatus.value[twitchUserId]?.is_live
  }).length
})

// Helper to get broadcaster type priority (lower = higher priority)
const getBroadcasterTypePriority = (broadcasterType?: string): number => {
  switch (broadcasterType) {
    case 'partner':
      return 0
    case 'affiliate':
      return 1
    default:
      return 2 // Non-affiliated
  }
}

// Sorted members by priority: Live > Authorized > Partner > Affiliate > Non-affiliated > Not authorized
const sortedMembers = computed(() => {
  return [...members.value].sort((a, b) => {
    const aLive = liveStatus.value[a.streamer?.twitchUserId]?.is_live ?? false
    const bLive = liveStatus.value[b.streamer?.twitchUserId]?.is_live ?? false

    // 1. Live status (live first)
    if (aLive !== bLive) return aLive ? -1 : 1

    // 2. Authorization status (authorized first, but only for ACTIVE members)
    const aAuthorized = a.status === 'ACTIVE' && a.isPollAuthorized
    const bAuthorized = b.status === 'ACTIVE' && b.isPollAuthorized
    if (aAuthorized !== bAuthorized) return aAuthorized ? -1 : 1

    // 3. Member status (ACTIVE before PENDING)
    if (a.status !== b.status) return a.status === 'ACTIVE' ? -1 : 1

    // 4. Broadcaster type (partner > affiliate > non-affiliated)
    const aPriority = getBroadcasterTypePriority(a.streamer?.broadcasterType)
    const bPriority = getBroadcasterTypePriority(b.streamer?.broadcasterType)
    if (aPriority !== bPriority) return aPriority - bPriority

    // 5. Alphabetical by display name
    return (a.streamer?.twitchDisplayName || '').localeCompare(b.streamer?.twitchDisplayName || '')
  })
})

// Check if streamer is already invited
const isStreamerAlreadyInvited = (streamerId: string | null) => {
  if (!streamerId) return false
  return members.value.some((m) => m.streamer.id === streamerId)
}

// Filter search results to exclude already invited streamers
const filteredSearchResults = computed(() => {
  return searchResults.value.filter((streamer) => !isStreamerAlreadyInvited(streamer.id))
})

// Load campaign and members
onMounted(async () => {
  await loadMembers()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
  if (searchTimeout) {
    clearTimeout(searchTimeout)
    searchTimeout = null
  }
})

const startAutoRefresh = () => {
  if (!refreshInterval) {
    refreshInterval = setInterval(async () => {
      await refreshMembersQuietly()
    }, REFRESH_INTERVAL_MS)
  }

  // Auto-refresh live status every 30 seconds
  if (!liveStatusInterval) {
    liveStatusInterval = setInterval(async () => {
      await fetchLiveStatus()
    }, LIVE_STATUS_INTERVAL_MS)
  }
}

const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
  if (liveStatusInterval) {
    clearInterval(liveStatusInterval)
    liveStatusInterval = null
  }
}

// Fetch live status for all members
const fetchLiveStatus = async () => {
  try {
    console.log('[LiveStatus] Fetching live status for campaign:', campaignId)
    const status = await getLiveStatus(campaignId)
    console.log('[LiveStatus] Response:', JSON.stringify(status))
    liveStatus.value = status
  } catch (error) {
    console.error('[LiveStatus] Error fetching live status:', error)
    liveStatus.value = {}
  }
}

// Refresh members without showing loading state (background refresh)
const refreshMembersQuietly = async () => {
  try {
    const [data] = await Promise.all([getCampaignDetails(campaignId), fetchLiveStatus()])
    campaign.value = data.campaign
    members.value = data.members
  } catch (error) {
    console.error('Error refreshing members:', error)
  }
}

// Handle authorization expiry - trigger a refresh
const handleAuthorizationExpired = () => {
  refreshMembersQuietly()
}

const loadMembers = async () => {
  loadingMembers.value = true
  try {
    const [data] = await Promise.all([getCampaignDetails(campaignId), fetchLiveStatus()])
    campaign.value = data.campaign
    members.value = data.members
  } catch (error) {
    console.error('Error loading campaign:', error)
    campaign.value = null
    members.value = []
  } finally {
    loadingMembers.value = false
  }
}

// Search with debounce
let searchTimeout: ReturnType<typeof setTimeout> | null = null

watch(searchQuery, () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  if (searchQuery.value.length < 2) {
    searchResults.value = []
    return
  }

  searchTimeout = setTimeout(async () => {
    searching.value = true
    try {
      const results = await searchTwitchStreamers(searchQuery.value)
      searchResults.value = results
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      searching.value = false
    }
  }, 500)
})

// Handle invite
const handleInvite = async (streamer: StreamerSearchResult) => {
  try {
    const payload = {
      twitch_user_id: streamer.id,

      twitch_login: streamer.login,

      twitch_display_name: streamer.displayName,

      profile_image_url: streamer.profileImageUrl,
    }

    await inviteStreamer(campaignId, payload)
    showInviteModal.value = false
    searchQuery.value = ''
    searchResults.value = []
    await loadMembers()
  } catch (error) {
    console.error('Error inviting streamer:', error)
  }
}

// Handle remove member - open modal
const handleRemoveMember = (memberId: string, memberName: string) => {
  memberToRemove.value = { id: memberId, name: memberName }
  showRemoveMemberModal.value = true
}

// Confirm remove member - execute removal
const confirmRemoveMember = async () => {
  if (!memberToRemove.value) return

  try {
    await removeMember(campaignId, memberToRemove.value.id)
    showRemoveMemberModal.value = false
    memberToRemove.value = null
    await loadMembers()
  } catch (error) {
    console.error('Error removing member:', error)
  }
}

// Handle delete campaign - open modal
const handleDeleteCampaign = () => {
  showDeleteModal.value = true
}

// Confirm delete campaign - execute deletion
const confirmDeleteCampaign = async () => {
  try {
    await deleteCampaign(campaignId)
    showDeleteModal.value = false
    _router.push({ path: '/mj' })
  } catch (error) {
    console.error('Error deleting campaign:', error)
  }
}

// VTT Connection helpers
const config = useRuntimeConfig()

const getTunnelStatusColor = (status?: string): 'success' | 'warning' | 'error' | 'neutral' => {
  switch (status) {
    case 'connected':
      return 'success'
    case 'connecting':
      return 'warning'
    case 'error':
      return 'error'
    case 'disconnected':
    default:
      return 'neutral'
  }
}

const getTunnelStatusLabel = (status?: string): string => {
  switch (status) {
    case 'connected':
      return 'Connecté'
    case 'connecting':
      return 'Connexion...'
    case 'error':
      return 'Erreur'
    case 'disconnected':
      return 'Déconnecté'
    default:
      return status || 'Inconnu'
  }
}

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return "À l'instant"
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`
  return date.toLocaleDateString()
}

// Handle revoke VTT connection
const handleRevokeVtt = async () => {
  if (!campaign.value?.vttConnection) return

  revokingVtt.value = true
  try {
    const response = await fetch(
      `${config.public.apiBase}/mj/vtt-connections/${campaign.value.vttConnection.id}/revoke`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: "Révoqué par l'utilisateur depuis l'interface Tumulte",
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Échec de la révocation')
    }

    // Reload campaign data to reflect the change
    await loadMembers()
  } catch (error) {
    console.error('Failed to revoke VTT connection:', error)
  } finally {
    revokingVtt.value = false
  }
}

// Handle reauthorize VTT connection
const handleReauthorizeVtt = async () => {
  if (!campaign.value?.vttConnection) return

  reauthorizingVtt.value = true
  try {
    const response = await fetch(
      `${config.public.apiBase}/mj/vtt-connections/${campaign.value.vttConnection.id}/reauthorize`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Échec de la réautorisation')
    }

    // Reload campaign data to reflect the change
    await loadMembers()
  } catch (error) {
    console.error('Failed to reauthorize VTT connection:', error)
  } finally {
    reauthorizingVtt.value = false
  }
}

// Format date
const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Date invalide'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

// Reset modal when it closes
watch(showInviteModal, (isOpen) => {
  if (!isOpen) {
    searchQuery.value = ''
    searchResults.value = []
  }
})
</script>
