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
          <div
            v-if="campaign?.vttConnection"
            class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto"
          >
            <!-- Bouton Mon personnage (VTT only — characters come from Foundry) -->
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
                <UIcon name="i-lucide-users" class="size-5 text-primary" />
              </div>
              <div>
                <p class="text-xs text-primary font-medium">Total</p>
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
                <p class="text-xs text-primary font-medium">En Live</p>
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
                <p class="text-xs text-primary font-medium">Actifs</p>
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
                <p class="text-xs text-primary font-medium">Autorisés</p>
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
                <p class="text-xs text-primary font-medium">En Attente</p>
                <p class="text-lg font-bold text-primary">{{ pendingMembersCount }}</p>
              </div>
            </div>

            <!-- VTT Connection Status (Mobile) — hidden for no-VTT campaigns -->
            <MjVttStatusCard
              v-if="campaign?.vttConnection"
              :vtt-connection="campaign.vttConnection"
              :campaign-id="campaignId"
            />
          </div>
        </UCard>
      </div>

      <!-- Stats Cards - Desktop: grid of 5 square cards -->
      <div class="hidden lg:flex justify-evenly mb-8">
        <div
          class="size-32 bg-primary-light rounded-3xl flex flex-col items-center justify-center text-center gap-2"
        >
          <UIcon name="i-lucide-users" class="size-7 text-primary" />
          <div>
            <p class="text-xs text-primary font-medium">Total Membres</p>
            <p class="text-xl font-bold text-primary">{{ members.length }}</p>
          </div>
        </div>

        <div
          class="size-32 bg-error-light rounded-3xl flex flex-col items-center justify-center text-center gap-2"
        >
          <UIcon name="i-lucide-radio" class="size-7 text-error-500" />
          <div>
            <p class="text-xs text-primary font-medium">En Live</p>
            <p class="text-xl font-bold text-primary">{{ liveMembersCount }}</p>
          </div>
        </div>

        <div
          class="size-32 bg-success-light rounded-3xl flex flex-col items-center justify-center text-center gap-2"
        >
          <UIcon name="i-lucide-user-check" class="size-7 text-success-500" />
          <div>
            <p class="text-xs text-primary font-medium">Actifs</p>
            <p class="text-xl font-bold text-primary">{{ activeMembersCount }}</p>
          </div>
        </div>

        <div
          class="size-32 bg-info-light rounded-3xl flex flex-col items-center justify-center text-center gap-2"
        >
          <UIcon name="i-lucide-shield-check" class="size-7 text-info-500" />
          <div>
            <p class="text-xs text-primary font-medium">Autorisés</p>
            <p class="text-xl font-bold text-primary">{{ authorizedMembersCount }}</p>
          </div>
        </div>

        <div
          class="size-32 bg-warning-light rounded-3xl flex flex-col items-center justify-center text-center gap-2"
        >
          <UIcon name="i-lucide-user-plus" class="size-7 text-warning-500" />
          <div>
            <p class="text-xs text-primary font-medium">En Attente</p>
            <p class="text-xl font-bold text-primary">{{ pendingMembersCount }}</p>
          </div>
        </div>

        <!-- VTT Connection Status — hidden for no-VTT campaigns -->
        <MjVttStatusCard
          v-if="campaign?.vttConnection"
          :vtt-connection="campaign.vttConnection"
          :campaign-id="campaignId"
        />
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
          <UIcon name="i-lucide-users" class="size-12 text-muted mb-4" />
          <p class="text-base font-normal text-muted">Aucun membre</p>
          <p class="text-sm text-muted mt-1 mb-6">
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
            class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-elevated rounded-lg hover:bg-accented border border-muted transition-colors"
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
          <!-- Info Grid: unified 3-column layout -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            <!-- Système de jeu -->
            <div>
              <label class="block text-sm font-bold text-primary ml-4 uppercase mb-2">
                Système de jeu
              </label>
              <div class="flex items-center gap-2 ml-4">
                <UBadge
                  v-if="campaign.vttInfo?.gameSystemName"
                  :color="campaign.vttInfo.isKnownSystem ? 'success' : 'neutral'"
                  variant="soft"
                >
                  {{ campaign.vttInfo.gameSystemName }}
                </UBadge>
                <UBadge v-else-if="campaign.vttInfo?.gameSystemId" color="neutral" variant="soft">
                  {{ campaign.vttInfo.gameSystemId }}
                </UBadge>
                <span v-else class="text-muted text-sm italic">En attente de détection</span>
                <UBadge v-if="campaign.vttInfo?.primaryDie" color="info" variant="subtle" size="xs">
                  {{ campaign.vttInfo.primaryDie }}
                </UBadge>
              </div>
            </div>

            <!-- Monde VTT -->
            <div>
              <label class="block text-sm font-bold text-primary ml-4 uppercase mb-2">
                Monde VTT
              </label>
              <p class="text-primary ml-4">
                {{ campaign.vttConnection.worldName || 'Non configuré' }}
              </p>
            </div>

            <!-- Connecté depuis -->
            <div v-if="campaign.vttInfo?.connectedSince">
              <label class="block text-sm font-bold text-primary ml-4 uppercase mb-2">
                Connecté depuis
              </label>
              <p class="text-muted ml-4">
                {{ formatDate(campaign.vttInfo.connectedSince) }}
              </p>
            </div>

            <!-- Version du Module -->
            <div v-if="campaign.vttConnection.moduleVersion">
              <label class="block text-sm font-bold text-primary ml-4 uppercase mb-2">
                Version du Module
              </label>
              <p class="text-muted ml-4">v{{ campaign.vttConnection.moduleVersion }}</p>
            </div>

            <!-- Dernière activité -->
            <div v-if="campaign.vttConnection.lastHeartbeatAt">
              <label class="block text-sm font-bold text-primary ml-4 uppercase mb-2">
                Dernière activité
              </label>
              <p class="text-muted ml-4">
                {{ formatRelativeTime(campaign.vttConnection.lastHeartbeatAt) }}
              </p>
            </div>
          </div>

          <!-- System Capability Badges -->
          <div
            v-if="campaign.vttInfo?.isKnownSystem && campaign.vttInfo.systemCapabilities"
            class="flex flex-wrap gap-2 ml-4"
          >
            <UBadge
              v-if="campaign.vttInfo.systemCapabilities.hasSpells"
              color="primary"
              variant="subtle"
              size="xs"
            >
              <UIcon name="i-lucide-wand-sparkles" class="size-3 mr-1" />
              Sorts
            </UBadge>
            <UBadge
              v-if="campaign.vttInfo.systemCapabilities.hasTraditionalCriticals"
              color="primary"
              variant="subtle"
              size="xs"
            >
              <UIcon name="i-lucide-target" class="size-3 mr-1" />
              Critiques d20
            </UBadge>
            <UBadge
              v-if="campaign.vttInfo.systemCapabilities.hasDicePool"
              color="primary"
              variant="subtle"
              size="xs"
            >
              <UIcon name="i-lucide-dice-5" class="size-3 mr-1" />
              Pool de dés
            </UBadge>
            <UBadge
              v-if="campaign.vttInfo.systemCapabilities.hasPercentile"
              color="primary"
              variant="subtle"
              size="xs"
            >
              <UIcon name="i-lucide-percent" class="size-3 mr-1" />
              Percentile
            </UBadge>
            <UBadge
              v-if="campaign.vttInfo.systemCapabilities.hasFudgeDice"
              color="primary"
              variant="subtle"
              size="xs"
            >
              <UIcon name="i-lucide-plus-minus" class="size-3 mr-1" />
              Dés FATE
            </UBadge>
            <UBadge
              v-if="campaign.vttInfo.systemCapabilities.hasNarrativeDice"
              color="primary"
              variant="subtle"
              size="xs"
            >
              <UIcon name="i-lucide-book-open" class="size-3 mr-1" />
              Dés narratifs
            </UBadge>
          </div>

          <!-- Campaign Stats (visual counters) -->
          <div
            v-if="hasVttStats"
            class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700"
          >
            <div class="text-center p-3 rounded-lg bg-elevated">
              <UIcon name="i-lucide-users" class="size-5 text-primary mx-auto mb-1" />
              <p class="text-lg font-bold text-primary">
                {{ campaign.vttInfo?.characterCounts?.total ?? 0 }}
              </p>
              <p class="text-xs text-muted">Personnages</p>
              <p
                v-if="
                  campaign.vttInfo?.characterCounts && campaign.vttInfo.characterCounts.total > 0
                "
                class="text-xs text-muted mt-0.5"
              >
                {{ campaign.vttInfo.characterCounts.pc }} PJ
                <template v-if="campaign.vttInfo.characterCounts.npc > 0">
                  &middot; {{ campaign.vttInfo.characterCounts.npc }} PNJ
                </template>
                <template v-if="campaign.vttInfo.characterCounts.monster > 0">
                  &middot; {{ campaign.vttInfo.characterCounts.monster }} Monstres
                </template>
              </p>
            </div>
            <div class="text-center p-3 rounded-lg bg-elevated">
              <UIcon name="i-lucide-dice-5" class="size-5 text-primary mx-auto mb-1" />
              <p class="text-lg font-bold text-primary">
                {{ campaign.vttInfo?.diceRollCount ?? 0 }}
              </p>
              <p class="text-xs text-muted">Jets de dés</p>
            </div>
            <div class="text-center p-3 rounded-lg bg-elevated">
              <UIcon name="i-lucide-refresh-cw" class="size-5 text-primary mx-auto mb-1" />
              <p class="text-lg font-bold text-primary">
                {{
                  campaign.vttInfo?.lastVttSyncAt
                    ? formatRelativeTime(campaign.vttInfo.lastVttSyncAt)
                    : '—'
                }}
              </p>
              <p class="text-xs text-muted">Dernière synchro</p>
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
            icon="i-game-icons-dice-twenty-faces-twenty"
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

      <!-- No VTT Connection - Optional invite to connect -->
      <UCard v-else class="mt-8">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="bg-info-light p-3 rounded-lg">
              <UIcon name="i-lucide-plug-zap" class="size-6 text-info-500" />
            </div>
            <div>
              <h3 class="font-semibold text-primary">Connecter un VTT (optionnel)</h3>
              <p class="text-sm text-muted">
                Vous pouvez connecter Foundry VTT à tout moment pour activer la synchronisation des
                jets de dés et des personnages.
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

      <!-- Intégration Twitch Section (VTT only — gamification events depend on VTT) -->
      <UCard v-if="campaign?.vttConnection" class="mt-8">
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-twitch" class="size-6 text-[#9146FF]" />
            <h2 class="text-xl font-bold text-primary">Intégration Twitch</h2>
          </div>
        </template>

        <div class="space-y-6">
          <!-- Loading State -->
          <div v-if="gamificationLoading" class="flex items-center justify-center py-8">
            <UIcon
              name="i-game-icons-dice-twenty-faces-twenty"
              class="size-10 text-primary animate-spin-slow"
            />
          </div>

          <!-- Error State -->
          <UAlert
            v-else-if="gamificationError"
            color="error"
            variant="soft"
            icon="i-lucide-alert-circle"
            :title="gamificationError"
          />

          <!-- Content -->
          <template v-else>
            <!-- Info Banner -->
            <UAlert
              color="info"
              variant="soft"
              icon="i-lucide-sparkles"
              title="Points de chaîne Twitch"
              description="Configurez les événements d'intégration pour permettre à vos viewers d'influencer le jeu. Chaque événement sera créé comme récompense sur les chaînes des streamers actifs."
            />

            <!-- Armed Instances (gauges filled, waiting to trigger) -->
            <div v-if="armedGamificationInstances.length > 0" class="space-y-3">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-zap" class="size-5 text-warning-500" />
                <h3 class="text-lg font-semibold text-primary">Événements à venir</h3>
              </div>
              <MjGamificationInstanceRow
                v-for="instance in armedGamificationInstances"
                :key="instance.id"
                :instance="instance"
                :is-dev="isDev"
                @cancel="handleCancelGamificationInstance"
                @force-complete="handleForceCompleteInstance"
              />
            </div>

            <!-- Event Cards (grouped grid) -->
            <div v-if="gamificationEvents.length > 0" class="space-y-6">
              <h3 class="text-lg font-semibold text-primary">Configuration des événements</h3>

              <div v-for="group in eventGroups" :key="group.label" class="space-y-3">
                <!-- Group header -->
                <div class="flex items-center gap-2">
                  <UIcon :name="group.icon" class="size-4 text-muted" />
                  <h4 class="text-sm font-medium text-muted uppercase tracking-wide">
                    {{ group.label }}
                  </h4>
                </div>

                <!-- Grid: 3 cols desktop, 2 tablet, 1 mobile -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <MjGamificationEventCard
                    v-for="event in group.events"
                    :key="event.id"
                    :event="event"
                    :config="getConfigForEvent(event.id)"
                    :loading="savingGamificationEventId === event.id"
                    :is-dev="isDev"
                    :campaign-id="campaignId"
                    @toggle="handleToggleGamificationEvent"
                    @update="handleUpdateGamificationConfig"
                    @simulate-redemption="handleSimulateRedemption"
                  />
                </div>
              </div>
            </div>

            <!-- No Events -->
            <div v-else class="flex flex-col items-center justify-center text-center py-8">
              <UIcon name="i-lucide-gamepad-2" class="size-10 text-muted mb-4" />
              <p class="text-base font-normal text-muted">Aucun événement disponible</p>
              <p class="text-sm text-muted mt-1">
                Les événements de gamification seront bientôt disponibles.
              </p>
            </div>
          </template>
        </div>
      </UCard>

      <!-- Criticality Rules Section (VTT only — rules are for VTT dice rolls) -->
      <UCard v-if="campaign?.vttConnection" class="mt-8">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-dice-5" class="size-6 text-primary" />
              <div>
                <h2 class="text-lg font-bold text-primary">Règles de criticité</h2>
                <p class="text-sm text-muted">
                  Définissez quand un jet de dé est considéré comme critique
                </p>
              </div>
            </div>
            <UButton
              color="primary"
              icon="i-lucide-plus"
              size="sm"
              @click="openCriticalityCreateModal"
            >
              <span class="hidden sm:inline">Ajouter une règle</span>
            </UButton>
          </div>
        </template>

        <!-- System Detection Banner -->
        <UAlert
          v-if="criticalitySystemInfo?.isKnownSystem"
          color="success"
          variant="soft"
          icon="i-lucide-shield-check"
          class="mb-4"
        >
          <template #title> Système détecté : {{ criticalitySystemInfo.systemName }} </template>
          <template #description>
            Les règles de criticité ont été configurées automatiquement pour ce système. Vous pouvez
            les désactiver ou ajouter vos propres règles.
          </template>
        </UAlert>
        <UAlert
          v-else-if="
            criticalitySystemInfo &&
            criticalitySystemInfo.gameSystemId &&
            !criticalitySystemInfo.isKnownSystem
          "
          color="neutral"
          variant="soft"
          icon="i-lucide-info"
          class="mb-4"
        >
          <template #title> Système détecté : {{ criticalitySystemInfo.gameSystemId }} </template>
          <template #description>
            Ce système n'a pas de presets intégrés. Configurez vos règles manuellement.
          </template>
        </UAlert>
        <UAlert
          v-else-if="!criticalitySystemInfo?.gameSystemId && campaign?.vttConnection"
          color="neutral"
          variant="soft"
          icon="i-lucide-plug-zap"
          class="mb-4"
        >
          <template #title> En attente de détection </template>
          <template #description>
            Le système de jeu sera détecté au premier jet de dé depuis Foundry VTT.
          </template>
        </UAlert>

        <!-- Loading -->
        <div v-if="criticalityLoading" class="flex justify-center py-6">
          <UIcon
            name="i-game-icons-dice-twenty-faces-twenty"
            class="size-8 text-muted animate-spin-slow"
          />
        </div>

        <!-- Empty State -->
        <div v-else-if="criticalityRules.length === 0" class="text-center py-6 space-y-2">
          <UIcon name="i-lucide-dice-5" class="size-8 text-muted mx-auto" />
          <p class="text-sm text-muted">
            Aucune règle configurée. Connectez Foundry VTT pour détecter automatiquement votre
            système.
          </p>
        </div>

        <!-- Rules List (compact) -->
        <div v-else class="space-y-2">
          <div
            v-for="rule in sortedCriticalityRules"
            :key="rule.id"
            class="flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer"
            :class="[
              rule.isEnabled ? '' : 'opacity-50',
              rule.isSystemPreset
                ? 'bg-elevated/60 border border-dashed border-muted hover:bg-accented/60'
                : 'bg-elevated hover:bg-accented',
            ]"
            @click="openCriticalityEditModal(rule)"
          >
            <!-- Type icon -->
            <UIcon
              :name="rule.criticalType === 'success' ? 'i-lucide-trophy' : 'i-lucide-skull'"
              class="size-4 shrink-0"
              :class="rule.criticalType === 'success' ? 'text-success-500' : 'text-error-500'"
            />

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-primary truncate">{{ rule.label }}</span>
                <UBadge v-if="rule.isSystemPreset" color="info" variant="subtle" size="xs">
                  <UIcon name="i-lucide-lock" class="size-3 mr-0.5" />
                  Auto
                </UBadge>
                <UBadge :color="criticalitySeverityColor(rule.severity)" variant="subtle" size="xs">
                  {{ criticalitySeverityLabel(rule.severity) }}
                </UBadge>
              </div>
              <p class="text-xs text-muted truncate">
                <span v-if="rule.diceFormula" class="font-mono">{{ rule.diceFormula }}</span>
                <span v-else>Tout dé</span>
                &middot;
                <span class="font-mono">{{ rule.resultCondition }}</span>
              </p>
            </div>

            <!-- Toggle + View icon -->
            <UButton
              :icon="rule.isEnabled ? 'i-lucide-eye' : 'i-lucide-eye-off'"
              color="neutral"
              variant="ghost"
              size="xs"
              square
              @click.stop="handleCriticalityToggle(rule)"
            />
            <UIcon name="i-lucide-chevron-right" class="size-4 text-muted shrink-0" />
          </div>
        </div>
      </UCard>

      <!-- Item Category Rules Section (VTT only — items come from Foundry) -->
      <UCard v-if="campaign?.vttConnection" class="mt-8">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-sparkles" class="size-6 text-primary" />
              <div>
                <h2 class="text-lg font-bold text-primary">Catégories d'items</h2>
                <p class="text-sm text-muted">
                  Sorts, capacités et objets ciblables par la gamification
                </p>
              </div>
            </div>
            <div class="flex gap-2">
              <UButton
                color="neutral"
                variant="soft"
                icon="i-lucide-scan-search"
                size="sm"
                :loading="isDetectingCategories"
                @click="handleDetectCategories"
              >
                <span class="hidden sm:inline">Détecter</span>
              </UButton>
              <UButton
                color="primary"
                variant="soft"
                icon="i-lucide-settings-2"
                size="sm"
                :to="`/mj/campaigns/${campaignId}/item-category-rules`"
              >
                <span class="hidden sm:inline">Configurer</span>
              </UButton>
            </div>
          </div>
        </template>

        <!-- Loading -->
        <div v-if="itemCategoryLoading" class="flex justify-center py-6">
          <UIcon
            name="i-game-icons-dice-twenty-faces-twenty"
            class="size-8 text-primary animate-spin-slow"
          />
        </div>

        <!-- Empty State -->
        <div v-else-if="itemCategoryRules.length === 0" class="text-center py-6 space-y-2">
          <UIcon name="i-lucide-sparkles" class="size-8 text-muted mx-auto" />
          <p class="text-sm text-muted">
            Aucune catégorie configurée. Cliquez sur "Détecter" pour auto-configurer.
          </p>
        </div>

        <!-- Summary -->
        <div v-else class="grid grid-cols-3 gap-4">
          <div class="text-center p-3 rounded-lg bg-elevated">
            <UIcon name="i-lucide-sparkles" class="size-5 text-violet-500 mx-auto mb-1" />
            <p class="text-lg font-bold text-primary">{{ itemCategoryCounts.spell }}</p>
            <p class="text-xs text-muted">Sorts</p>
          </div>
          <div class="text-center p-3 rounded-lg bg-elevated">
            <UIcon name="i-lucide-swords" class="size-5 text-amber-500 mx-auto mb-1" />
            <p class="text-lg font-bold text-primary">{{ itemCategoryCounts.feature }}</p>
            <p class="text-xs text-muted">Capacités</p>
          </div>
          <div class="text-center p-3 rounded-lg bg-elevated">
            <UIcon name="i-lucide-backpack" class="size-5 text-blue-500 mx-auto mb-1" />
            <p class="text-lg font-bold text-primary">{{ itemCategoryCounts.inventory }}</p>
            <p class="text-xs text-muted">Inventaire</p>
          </div>
        </div>
      </UCard>

      <!-- Outils de maintenance MJ — Reset cooldowns & instances actives -->
      <UCard v-if="hasEnabledEvents" class="mt-8">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-wrench" class="size-5 text-warning-500" />
              <div>
                <h2 class="text-lg font-bold text-primary">Outils de maintenance</h2>
                <p class="text-xs text-muted">
                  Déblocage rapide en cas de problème avec la gamification
                </p>
              </div>
            </div>
            <UButton
              icon="i-lucide-info"
              color="neutral"
              variant="ghost"
              size="sm"
              square
              @click="showMaintenanceInfoModal = true"
            />
          </div>
        </template>

        <div class="flex flex-col sm:flex-row gap-3">
          <UButton
            icon="i-lucide-timer-reset"
            label="Reset des cooldowns"
            color="warning"
            variant="soft"
            class="w-full sm:w-auto"
            @click="showResetCooldownsModal = true"
          />
          <UButton
            icon="i-lucide-ban"
            label="Annuler les instances actives"
            color="error"
            variant="soft"
            class="w-full sm:w-auto"
            @click="showResetStateModal = true"
          />
          <UButton
            icon="i-lucide-eraser"
            label="Nettoyer Foundry"
            color="info"
            variant="soft"
            class="w-full sm:w-auto"
            @click="showCleanupFoundryModal = true"
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
        <p class="text-primary">
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
        <p class="text-primary">
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

  <!-- Modal Criticality Rule (Create / Edit) -->
  <UModal v-model:open="showCriticalityModal">
    <template #header>
      <div class="flex items-center gap-3">
        <h3 class="text-xl font-bold text-primary">
          {{
            editingCriticalityRule
              ? isEditingPreset
                ? 'Règle système'
                : 'Modifier la règle'
              : 'Nouvelle règle de criticité'
          }}
        </h3>
        <UBadge v-if="isEditingPreset" color="info" variant="subtle" size="sm">
          <UIcon name="i-lucide-lock" class="size-3 mr-0.5" />
          Auto
        </UBadge>
      </div>
    </template>

    <template #body>
      <!-- Preset info banner -->
      <UAlert
        v-if="isEditingPreset"
        color="info"
        variant="soft"
        icon="i-lucide-info"
        class="mb-4"
        title="Règle générée automatiquement"
        description="Cette règle a été créée d'après les presets du système. Vous pouvez uniquement l'activer ou la désactiver."
      />

      <form id="criticalityForm" class="space-y-6" @submit.prevent="handleCriticalitySubmit">
        <!-- 1. Nom de la règle -->
        <div>
          <label class="block text-sm font-medium text-primary pl-2 mb-1"> Nom de la règle </label>
          <UInput
            v-model="criticalityForm.label"
            placeholder="Ex: Natural 20, Fumble, Messy Critical..."
            size="lg"
            maxlength="255"
            :disabled="isEditingPreset"
            :ui="{
              root: 'ring-0 border-0 rounded-lg overflow-hidden',
              base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg',
            }"
          />
        </div>

        <!-- 2. Type : chips visuels -->
        <div>
          <label class="block text-sm font-medium text-primary pl-2 mb-2"> C'est un... </label>
          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all text-sm"
              :class="
                criticalityForm.criticalType === 'success'
                  ? 'bg-success-100 text-success-700 ring-2 ring-success-400 dark:bg-success-900/30 dark:text-success-400 dark:ring-success-600'
                  : 'bg-elevated text-muted hover:bg-accented'
              "
              :disabled="isEditingPreset"
              @click="criticalityForm.criticalType = 'success'"
            >
              <UIcon name="i-lucide-trophy" class="size-5" />
              Réussite critique
            </button>
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all text-sm"
              :class="
                criticalityForm.criticalType === 'failure'
                  ? 'bg-error-100 text-error-700 ring-2 ring-error-400 dark:bg-error-900/30 dark:text-error-400 dark:ring-error-600'
                  : 'bg-elevated text-muted hover:bg-accented'
              "
              :disabled="isEditingPreset"
              @click="criticalityForm.criticalType = 'failure'"
            >
              <UIcon name="i-lucide-skull" class="size-5" />
              Échec critique
            </button>
          </div>
        </div>

        <!-- 3. Condition en phrase naturelle -->
        <div>
          <label class="block text-sm font-medium text-primary pl-2 mb-2"> Déclenchement </label>
          <div class="bg-elevated rounded-lg p-4 space-y-3">
            <p class="text-sm text-muted pl-1">Quand un jet de</p>

            <!-- Dé -->
            <UInput
              v-model="criticalityForm.diceFormula"
              placeholder="n'importe quel dé (ex: d20, d100, 2d6)"
              size="lg"
              maxlength="50"
              :disabled="isEditingPreset"
              :ui="{
                root: 'ring-0 border-0 rounded-lg overflow-hidden',
                base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg',
              }"
            />

            <p class="text-sm text-muted pl-1">fait</p>

            <!-- Opérateur + Valeur -->
            <div class="grid grid-cols-2 gap-3">
              <USelect
                v-model="critConditionOperator"
                :items="criticalityConditionOperators"
                size="lg"
                :disabled="isEditingPreset"
                :ui="{
                  base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) rounded-lg ring-0 border-0',
                }"
              />
              <UInput
                v-model.number="critConditionValue"
                type="number"
                placeholder="20"
                size="lg"
                :disabled="isEditingPreset"
                :ui="{
                  root: 'ring-0 border-0 rounded-lg overflow-hidden',
                  base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg',
                }"
              />
            </div>

            <p class="text-sm text-muted pl-1">sur</p>

            <!-- Valeur évaluée -->
            <USelect
              v-model="criticalityForm.resultField"
              :items="criticalityResultFieldOptions"
              size="lg"
              :disabled="isEditingPreset"
              :ui="{
                base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) rounded-lg ring-0 border-0',
              }"
            />
          </div>
        </div>

        <!-- 4. Activé -->
        <div class="flex items-center gap-3 pl-2">
          <USwitch v-model="criticalityForm.isEnabled" />
          <span class="text-sm text-primary">Règle active</span>
        </div>

        <!-- 5. Options avancées (accordéon) — hidden for presets -->
        <div v-if="!isEditingPreset">
          <button
            type="button"
            class="flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors pl-2"
            @click="showCriticalityAdvanced = !showCriticalityAdvanced"
          >
            <UIcon
              name="i-lucide-chevron-right"
              class="size-4 transition-transform duration-200"
              :class="{ 'rotate-90': showCriticalityAdvanced }"
            />
            Options avancées
          </button>

          <div v-if="showCriticalityAdvanced" class="mt-3 space-y-4 pl-2">
            <!-- Gravité -->
            <div>
              <label class="block text-sm font-medium text-primary mb-2">Gravité</label>
              <div class="flex gap-2">
                <button
                  v-for="opt in criticalitySeverityOptions"
                  :key="opt.value"
                  type="button"
                  class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
                  :class="
                    criticalityForm.severity === opt.value
                      ? 'bg-primary text-white'
                      : 'bg-elevated text-muted hover:bg-accented'
                  "
                  @click="criticalityForm.severity = opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <!-- Priorité -->
            <div>
              <label class="block text-sm font-medium text-primary mb-1"> Priorité </label>
              <p class="text-xs text-muted mb-2">
                Si plusieurs règles correspondent, la plus prioritaire gagne
              </p>
              <UInput
                v-model.number="criticalityForm.priority"
                type="number"
                :min="0"
                :max="1000"
                placeholder="0"
                size="lg"
                :ui="{
                  root: 'ring-0 border-0 rounded-lg overflow-hidden',
                  base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg',
                }"
              />
            </div>

            <!-- Note -->
            <div>
              <label class="block text-sm font-medium text-primary mb-1"> Note </label>
              <UTextarea
                v-model="criticalityForm.description"
                placeholder="Note optionnelle pour vous rappeler à quoi sert cette règle..."
                :rows="2"
                maxlength="1000"
                size="lg"
                :ui="{
                  root: 'ring-0 border-0 rounded-lg overflow-hidden',
                  base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg',
                }"
              />
            </div>
          </div>
        </div>
      </form>
    </template>

    <template #footer>
      <div class="flex items-center justify-between">
        <!-- Delete (only when editing custom rules — not presets) -->
        <UButton
          v-if="editingCriticalityRule && !isEditingPreset"
          color="error"
          variant="ghost"
          icon="i-lucide-trash-2"
          size="sm"
          :loading="criticalitySubmitting"
          @click="handleCriticalityDelete"
        >
          Supprimer
        </UButton>
        <div v-else />

        <div class="flex gap-3">
          <UButton color="neutral" variant="soft" @click="showCriticalityModal = false">
            {{ isEditingPreset ? 'Fermer' : 'Annuler' }}
          </UButton>
          <UButton
            v-if="isEditingPreset"
            color="primary"
            :loading="criticalitySubmitting"
            @click="handlePresetToggle"
          >
            {{ criticalityForm.isEnabled ? 'Désactiver' : 'Activer' }}
          </UButton>
          <UButton
            v-else
            type="submit"
            form="criticalityForm"
            color="primary"
            :loading="criticalitySubmitting"
            :disabled="!isCriticalityFormValid || criticalitySubmitting"
          >
            {{ editingCriticalityRule ? 'Enregistrer' : 'Créer' }}
          </UButton>
        </div>
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
          <label class="block text-sm font-medium text-primary pl-2 mb-0">
            Rechercher un streamer
          </label>
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Nom ou login Twitch..."
            size="lg"
            :ui="{
              root: 'ring-0 border-0 rounded-lg overflow-hidden',
              base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg [&>span:first-child]:text-(--theme-input-text)',
            }"
          />
          <p class="text-xs text-muted mt-1">Tapez au moins 2 caractères</p>
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
            class="flex items-center justify-between p-3 bg-elevated rounded-lg hover:bg-accented border border-muted transition-colors"
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
          <UIcon name="i-lucide-search-x" class="size-12 text-muted mb-4" />
          <p class="text-base font-normal text-muted">
            {{
              searchResults.length > 0
                ? 'Tous les streamers trouvés sont déjà invités'
                : 'Aucun streamer trouvé'
            }}
          </p>
        </div>

        <!-- Initial State -->
        <div v-else class="flex flex-col items-center justify-center text-center py-8">
          <UIcon name="i-lucide-search" class="size-12 text-muted mb-4" />
          <p class="text-sm text-muted">Tapez au moins 2 caractères pour rechercher</p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <UButton color="primary" variant="solid" label="Fermer" @click="showInviteModal = false" />
      </div>
    </template>
  </UModal>

  <!-- Modal Reset Cooldowns -->
  <UModal v-model:open="showResetCooldownsModal">
    <template #header>
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-timer-reset" class="size-6 text-warning-500" />
        <h3 class="text-lg font-bold text-primary">Réinitialiser les cooldowns</h3>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">
          Les cooldowns des événements de gamification seront réinitialisés. Les événements pourront
          se déclencher à nouveau immédiatement.
        </p>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-primary">Cibler</label>
          <div class="space-y-2">
            <label
              class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
              :class="
                resetCooldownsTarget === 'all'
                  ? 'border-warning-500 bg-warning-50 dark:bg-warning-950/20'
                  : 'border-default hover:bg-elevated'
              "
            >
              <input
                v-model="resetCooldownsTarget"
                type="radio"
                value="all"
                class="accent-warning-500"
              />
              <UIcon name="i-lucide-users" class="size-5 text-muted" />
              <span class="text-primary font-medium">Tous les joueurs</span>
            </label>

            <label
              v-for="member in activeMembers"
              :key="member.streamer.id"
              class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
              :class="
                resetCooldownsTarget === member.streamer.id
                  ? 'border-warning-500 bg-warning-50 dark:bg-warning-950/20'
                  : 'border-default hover:bg-elevated'
              "
            >
              <input
                v-model="resetCooldownsTarget"
                type="radio"
                :value="member.streamer.id"
                class="accent-warning-500"
              />
              <img
                v-if="member.streamer.profileImageUrl"
                :src="member.streamer.profileImageUrl"
                :alt="member.streamer.twitchDisplayName"
                class="size-6 rounded-full"
              />
              <UIcon v-else name="i-lucide-user" class="size-5 text-muted" />
              <span class="text-primary">{{ member.streamer.twitchDisplayName }}</span>
            </label>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-3 justify-end">
        <UButton
          color="neutral"
          variant="soft"
          label="Annuler"
          @click="showResetCooldownsModal = false"
        />
        <UButton
          color="warning"
          icon="i-lucide-timer-reset"
          label="Réinitialiser"
          :loading="resettingCooldowns"
          @click="handleResetCooldownsConfirm"
        />
      </div>
    </template>
  </UModal>

  <!-- Modal Reset Gamification State -->
  <UModal v-model:open="showResetStateModal">
    <template #header>
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-ban" class="size-6 text-error-500" />
        <h3 class="text-lg font-bold text-primary">Annuler les instances actives</h3>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">
          Toutes les instances de gamification actives ou armées seront annulées. Les jauges en
          cours sur les overlays seront retirées.
        </p>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-primary">Cibler</label>
          <div class="space-y-2">
            <label
              class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
              :class="
                resetStateTarget === 'all'
                  ? 'border-error-500 bg-error-50 dark:bg-error-950/20'
                  : 'border-default hover:bg-elevated'
              "
            >
              <input v-model="resetStateTarget" type="radio" value="all" class="accent-error-500" />
              <UIcon name="i-lucide-users" class="size-5 text-muted" />
              <span class="text-primary font-medium">Tous les joueurs</span>
            </label>

            <label
              v-for="member in activeMembers"
              :key="member.streamer.id"
              class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
              :class="
                resetStateTarget === member.streamer.id
                  ? 'border-error-500 bg-error-50 dark:bg-error-950/20'
                  : 'border-default hover:bg-elevated'
              "
            >
              <input
                v-model="resetStateTarget"
                type="radio"
                :value="member.streamer.id"
                class="accent-error-500"
              />
              <img
                v-if="member.streamer.profileImageUrl"
                :src="member.streamer.profileImageUrl"
                :alt="member.streamer.twitchDisplayName"
                class="size-6 rounded-full"
              />
              <UIcon v-else name="i-lucide-user" class="size-5 text-muted" />
              <span class="text-primary">{{ member.streamer.twitchDisplayName }}</span>
            </label>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-3 justify-end">
        <UButton
          color="neutral"
          variant="soft"
          label="Annuler"
          @click="showResetStateModal = false"
        />
        <UButton
          color="error"
          icon="i-lucide-ban"
          label="Annuler les instances"
          :loading="resettingState"
          @click="handleResetStateConfirm"
        />
      </div>
    </template>
  </UModal>

  <!-- Modal Nettoyer Foundry -->
  <UModal v-model:open="showCleanupFoundryModal">
    <template #header>
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-eraser" class="size-6 text-info-500" />
        <h3 class="text-lg font-bold text-primary">Nettoyer les effets Foundry</h3>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">
          Cette action envoie une commande au module Foundry pour supprimer
          <strong class="text-primary">tous les effets ajoutés par Tumulte</strong> :
        </p>

        <ul class="text-sm text-muted space-y-1 list-disc pl-5">
          <li>Sorts désactivés : restaurés et rendus de nouveau utilisables</li>
          <li>Buffs et debuffs sur les sorts : supprimés (avantage, désavantage, bonus, malus)</li>
          <li>Couleurs et indicateurs visuels : retirés des fiches de personnages</li>
          <li>Timers de réactivation : annulés</li>
        </ul>

        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-plug"
          title="Connexion VTT requise"
          description="Cette commande nécessite que Foundry soit connecté à Tumulte. Si aucune connexion VTT n'est active, une erreur sera affichée."
        />
      </div>
    </template>

    <template #footer>
      <div class="space-y-3">
        <UCheckbox
          v-model="cleanupFoundryChat"
          color="info"
          label="Supprimer aussi les messages Tumulte du chat Foundry"
        />
        <div class="flex gap-3">
          <UButton
            color="neutral"
            variant="soft"
            label="Annuler"
            @click="showCleanupFoundryModal = false"
          />
          <UButton
            color="info"
            variant="soft"
            icon="i-lucide-eraser"
            label="Nettoyer"
            :loading="cleaningFoundry"
            @click="handleCleanupFoundryConfirm"
          />
        </div>
      </div>
    </template>
  </UModal>

  <!-- Modal Info Outils de maintenance -->
  <UModal v-model:open="showMaintenanceInfoModal">
    <template #header>
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-info" class="size-6 text-info-500" />
        <h3 class="text-lg font-bold text-primary">Comment fonctionnent ces outils ?</h3>
      </div>
    </template>

    <template #body>
      <div class="space-y-6">
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-timer-reset" class="size-5 text-warning-500" />
            <h4 class="font-semibold text-primary">Reset des cooldowns</h4>
          </div>
          <p class="text-sm text-muted leading-relaxed">
            Après chaque événement de gamification réussi ou expiré, un
            <strong class="text-primary">temps de recharge</strong> (cooldown) empêche le même
            événement de se déclencher à nouveau pendant une durée configurée.
          </p>
          <p class="text-sm text-muted leading-relaxed">
            Ce bouton <strong class="text-primary">supprime immédiatement</strong> tous les
            cooldowns actifs, permettant aux événements de se déclencher à nouveau sans attendre.
            Utile si un événement est bloqué par un cooldown trop long ou si vous souhaitez relancer
            rapidement la gamification en cours de session.
          </p>
        </div>

        <hr class="border-default" />

        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-ban" class="size-5 text-error-500" />
            <h4 class="font-semibold text-primary">Annuler les instances actives</h4>
          </div>
          <p class="text-sm text-muted leading-relaxed">
            Quand un événement de gamification est déclenché, une
            <strong class="text-primary">instance</strong> est créée : c'est la jauge visible sur
            les overlays des streamers, qui collecte les contributions des viewers.
          </p>
          <p class="text-sm text-muted leading-relaxed">
            Ce bouton <strong class="text-primary">annule toutes les instances en cours</strong>
            (actives ou armées). Les jauges disparaissent immédiatement des overlays OBS. Utile si
            une instance est buguée, bloquée en état "armé", ou si vous souhaitez faire table rase
            pour repartir de zéro.
          </p>
        </div>

        <hr class="border-default" />

        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-eraser" class="size-5 text-info-500" />
            <h4 class="font-semibold text-primary">Nettoyer Foundry</h4>
          </div>
          <p class="text-sm text-muted leading-relaxed">
            Quand Tumulte applique des effets dans Foundry (désactivation de sort, buff, debuff),
            ces modifications <strong class="text-primary">persistent dans Foundry</strong> même
            après annulation côté Tumulte. Un sort peut rester bloqué, un buff peut rester affiché.
          </p>
          <p class="text-sm text-muted leading-relaxed">
            Ce bouton envoie une commande au module Foundry pour
            <strong class="text-primary">supprimer tous les effets Tumulte</strong> : sorts
            réactivés, buffs/debuffs supprimés, indicateurs visuels retirés, timers annulés. Option
            : supprimer aussi les messages Tumulte du chat.
          </p>
        </div>

        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-shield"
          title="Ciblage par joueur"
          description="Les outils Reset cooldowns et Annuler instances permettent de cibler un joueur spécifique ou tous les joueurs. Le nettoyage Foundry agit sur l'ensemble du monde Foundry connecté."
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <UButton
          color="primary"
          variant="solid"
          label="Compris"
          @click="showMaintenanceInfoModal = false"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCampaigns } from '@/composables/useCampaigns'
import { useGamification } from '@/composables/useGamification'
import {
  useCriticalityRules,
  type CriticalityRule,
  type CreateCriticalityRuleData,
  type UpdateCriticalityRuleData,
} from '@/composables/useCriticalityRules'
import { useItemCategoryRules } from '@/composables/useItemCategoryRules'
import type { Campaign, CampaignMembership, StreamerSearchResult, LiveStatusMap } from '@/types'
import type { GamificationInstance, UpdateGamificationConfigRequest } from '@/types/api'

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

// Gamification composable
const {
  events: gamificationEvents,
  loading: gamificationLoading,
  error: gamificationError,
  hasEnabledEvents,
  fetchEvents,
  fetchCampaignConfigs,
  enableEvent,
  updateConfig,
  disableEvent,
  fetchActiveInstances,
  cancelInstance,
  forceCompleteInstance,
  simulateRedemption,
  resetCooldowns,
  resetState,
  cleanupFoundry,
  getConfigForEvent,
} = useGamification()

// Criticality rules composable
const {
  rules: criticalityRules,
  systemInfo: criticalitySystemInfo,
  loading: criticalityLoading,
  fetchRules: fetchCriticalityRules,
  fetchSystemInfo: fetchCriticalitySystemInfo,
  createRule: createCriticalityRule,
  updateRule: updateCriticalityRule,
  deleteRule: deleteCriticalityRule,
  toggleRule: toggleCriticalityRule,
} = useCriticalityRules()

// Item category rules composable
const {
  rules: itemCategoryRules,
  loading: itemCategoryLoading,
  fetchRules: fetchItemCategoryRules,
  detectCategories,
} = useItemCategoryRules()

const itemCategoryCounts = computed(() => ({
  spell: itemCategoryRules.value.filter((r) => r.category === 'spell').length,
  feature: itemCategoryRules.value.filter((r) => r.category === 'feature').length,
  inventory: itemCategoryRules.value.filter((r) => r.category === 'inventory').length,
}))

const isDetectingCategories = ref(false)
const handleDetectCategories = async () => {
  isDetectingCategories.value = true
  try {
    await detectCategories(campaignId)
  } catch {
    // Error handled by composable
  } finally {
    isDetectingCategories.value = false
  }
}

// Criticality modal state
const showCriticalityModal = ref(false)
const editingCriticalityRule = ref<CriticalityRule | null>(null)
const criticalitySubmitting = ref(false)

const defaultCriticalityForm: CreateCriticalityRuleData = {
  diceFormula: null,
  resultCondition: '== 20',
  resultField: 'max_die',
  criticalType: 'success',
  severity: 'major',
  label: '',
  description: null,
  priority: 0,
  isEnabled: true,
}
const criticalityForm = ref<CreateCriticalityRuleData>({ ...defaultCriticalityForm })

const criticalityResultFieldOptions = [
  { label: 'le dé le plus haut', value: 'max_die' },
  { label: 'le dé le plus bas', value: 'min_die' },
  { label: 'le total', value: 'total' },
  { label: "n'importe quel dé", value: 'any_die' },
]
const criticalityConditionOperators = [
  { label: 'exactement', value: '==' },
  { label: 'au moins', value: '>=' },
  { label: 'au plus', value: '<=' },
  { label: 'plus de', value: '>' },
  { label: 'moins de', value: '<' },
  { label: 'différent de', value: '!=' },
]
const criticalitySeverityOptions = [
  { label: 'Mineure', value: 'minor' as const },
  { label: 'Majeure', value: 'major' as const },
  { label: 'Extrême', value: 'extreme' as const },
]

// Decomposed condition for natural language form
const critConditionOperator = ref('==')
const critConditionValue = ref(20)
const showCriticalityAdvanced = ref(false)

// Sync decomposed condition → resultCondition string
const syncCritCondition = () => {
  criticalityForm.value.resultCondition = `${critConditionOperator.value} ${critConditionValue.value}`
}
watch([critConditionOperator, critConditionValue], syncCritCondition)

// Parse resultCondition string → decomposed (for edit mode)
const parseCritCondition = (condition: string) => {
  const match = condition.trim().match(/^(==|!=|<=|>=|<|>)\s*(-?\d+(?:\.\d+)?)$/)
  if (match?.[1] && match[2]) {
    critConditionOperator.value = match[1]
    critConditionValue.value = Number(match[2])
  }
}

const isCriticalityFormValid = computed(() => {
  return (
    criticalityForm.value.label.trim().length > 0 &&
    critConditionValue.value !== null &&
    !isNaN(critConditionValue.value)
  )
})

const isEditingPreset = computed(() => editingCriticalityRule.value?.isSystemPreset === true)

const openCriticalityCreateModal = () => {
  editingCriticalityRule.value = null
  criticalityForm.value = { ...defaultCriticalityForm }
  critConditionOperator.value = '=='
  critConditionValue.value = 20
  showCriticalityAdvanced.value = false
  showCriticalityModal.value = true
}

const openCriticalityEditModal = (rule: CriticalityRule) => {
  editingCriticalityRule.value = rule
  criticalityForm.value = {
    diceFormula: rule.diceFormula,
    resultCondition: rule.resultCondition,
    resultField: rule.resultField,
    criticalType: rule.criticalType,
    severity: rule.severity,
    label: rule.label,
    description: rule.description,
    priority: rule.priority,
    isEnabled: rule.isEnabled,
  }
  parseCritCondition(rule.resultCondition)
  // Show advanced section if non-default values are set
  showCriticalityAdvanced.value =
    rule.severity !== 'major' || rule.priority !== 0 || !!rule.description
  showCriticalityModal.value = true
}

const handleCriticalitySubmit = async () => {
  if (!isCriticalityFormValid.value || criticalitySubmitting.value) return
  criticalitySubmitting.value = true
  try {
    if (editingCriticalityRule.value) {
      await updateCriticalityRule(
        campaignId,
        editingCriticalityRule.value.id,
        criticalityForm.value as UpdateCriticalityRuleData
      )
    } else {
      await createCriticalityRule(campaignId, criticalityForm.value)
    }
    showCriticalityModal.value = false
  } catch (err) {
    console.error('Failed to save criticality rule:', err)
  } finally {
    criticalitySubmitting.value = false
  }
}

const handleCriticalityDelete = async () => {
  if (!editingCriticalityRule.value || criticalitySubmitting.value) return
  criticalitySubmitting.value = true
  try {
    await deleteCriticalityRule(campaignId, editingCriticalityRule.value.id)
    showCriticalityModal.value = false
    editingCriticalityRule.value = null
  } catch (err) {
    console.error('Failed to delete criticality rule:', err)
  } finally {
    criticalitySubmitting.value = false
  }
}

const handleCriticalityToggle = async (rule: CriticalityRule) => {
  try {
    await toggleCriticalityRule(campaignId, rule)
  } catch (err) {
    console.error('Failed to toggle criticality rule:', err)
  }
}

const handlePresetToggle = async () => {
  if (!editingCriticalityRule.value) return
  criticalitySubmitting.value = true
  try {
    await updateCriticalityRule(campaignId, editingCriticalityRule.value.id, {
      isEnabled: !editingCriticalityRule.value.isEnabled,
    })
    showCriticalityModal.value = false
  } catch (err) {
    console.error('Failed to toggle preset rule:', err)
  } finally {
    criticalitySubmitting.value = false
  }
}

const criticalitySeverityColor = (severity: string) => {
  switch (severity) {
    case 'minor':
      return 'info'
    case 'major':
      return 'warning'
    case 'extreme':
      return 'error'
    default:
      return 'neutral'
  }
}

const criticalitySeverityLabel = (severity: string) => {
  switch (severity) {
    case 'minor':
      return 'Mineure'
    case 'major':
      return 'Majeure'
    case 'extreme':
      return 'Extrême'
    default:
      return severity
  }
}

// Sorted criticality rules: system presets first, then custom, both sorted by priority
const sortedCriticalityRules = computed(() => {
  return [...criticalityRules.value].sort((a, b) => {
    if (a.isSystemPreset !== b.isSystemPreset) return a.isSystemPreset ? -1 : 1
    return (b.priority ?? 0) - (a.priority ?? 0)
  })
})

// Check if we're in dev/staging mode
const config = useRuntimeConfig()
const isDev = computed(() => {
  // Check if we're in dev/staging by looking at the API URL or NODE_ENV
  const apiBase = config.public.apiBase as string
  return apiBase.includes('localhost') || apiBase.includes('staging') || import.meta.dev
})

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

// Gamification state
const activeGamificationInstances = ref<GamificationInstance[]>([])
const armedGamificationInstances = computed(() =>
  activeGamificationInstances.value.filter((i) => i.status === 'armed')
)
const savingGamificationEventId = ref<string | null>(null)

// Outils de maintenance MJ
const showMaintenanceInfoModal = ref(false)
const showResetCooldownsModal = ref(false)
const showResetStateModal = ref(false)
const resetCooldownsTarget = ref<string>('all')
const resetStateTarget = ref<string>('all')
const resettingCooldowns = ref(false)
const resettingState = ref(false)
const showCleanupFoundryModal = ref(false)
const cleanupFoundryChat = ref(false)
const cleaningFoundry = ref(false)

const activeMembers = computed(() => members.value.filter((m) => m.status === 'ACTIVE'))

// Group gamification events by family (dice, spells, monsters)
const SPELL_ACTION_TYPES = ['spell_disable', 'spell_buff', 'spell_debuff']
const MONSTER_ACTION_TYPES = ['monster_buff', 'monster_debuff']

const eventGroups = computed(() => {
  const spellEvents = gamificationEvents.value.filter((e) =>
    SPELL_ACTION_TYPES.includes(e.actionType)
  )
  const monsterEvents = gamificationEvents.value.filter((e) =>
    MONSTER_ACTION_TYPES.includes(e.actionType)
  )
  const otherEvents = gamificationEvents.value.filter(
    (e) =>
      !SPELL_ACTION_TYPES.includes(e.actionType) && !MONSTER_ACTION_TYPES.includes(e.actionType)
  )

  const groups: { label: string; icon: string; events: typeof gamificationEvents.value }[] = []
  if (otherEvents.length > 0) {
    groups.push({ label: 'Événements de dés', icon: 'i-lucide-dice-5', events: otherEvents })
  }
  if (spellEvents.length > 0) {
    groups.push({
      label: 'Sorts & Capacités',
      icon: 'i-lucide-wand-sparkles',
      events: spellEvents,
    })
  }
  if (monsterEvents.length > 0) {
    groups.push({
      label: 'Mode Monstre',
      icon: 'i-lucide-swords',
      events: monsterEvents,
    })
  }
  return groups
})

// Auto-refresh intervals
let refreshInterval: ReturnType<typeof setInterval> | null = null
let liveStatusInterval: ReturnType<typeof setInterval> | null = null
let gamificationInterval: ReturnType<typeof setInterval> | null = null
const REFRESH_INTERVAL_MS = 60000 // Refresh members every 60 seconds
const GAMIFICATION_REFRESH_INTERVAL_MS = 10000 // Refresh active instances every 10 seconds

// Smart polling intervals for live status
const LIVE_STATUS_INTERVALS = {
  NOBODY_LIVE: 120000, // 2 minutes si personne n'est live
  SOMEONE_LIVE: 30000, // 30 secondes si quelqu'un est live
}
let currentLiveStatusInterval: number = LIVE_STATUS_INTERVALS.NOBODY_LIVE

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

// Handle tab visibility - pause polling when tab is hidden
const handleVisibilityChange = () => {
  if (document.hidden) {
    console.log('[LiveStatus] Tab hidden - pausing polling')
    stopAutoRefresh()
  } else {
    console.log('[LiveStatus] Tab visible - resuming polling')
    // Fetch immediately then restart polling
    fetchLiveStatus()
    startAutoRefresh()
  }
}

// Load campaign, members, and gamification data
onMounted(async () => {
  await Promise.all([
    loadMembers(),
    loadGamificationData(),
    fetchCriticalityRules(campaignId).catch(() => {}),
    fetchCriticalitySystemInfo(campaignId).catch(() => {}),
    fetchItemCategoryRules(campaignId).catch(() => {}),
  ])
  startAutoRefresh()

  // Listen for tab visibility changes
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  stopAutoRefresh()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
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

  // Smart polling for live status - adapts interval based on live streamers
  startSmartLiveStatusPolling()

  // Auto-refresh gamification instances every 10 seconds
  if (!gamificationInterval) {
    gamificationInterval = setInterval(async () => {
      await loadActiveGamificationInstances()
    }, GAMIFICATION_REFRESH_INTERVAL_MS)
  }
}

// Smart live status polling - adjusts interval based on whether anyone is live
const startSmartLiveStatusPolling = () => {
  if (liveStatusInterval) {
    clearInterval(liveStatusInterval)
  }

  liveStatusInterval = setInterval(async () => {
    await fetchLiveStatus()
    adjustLiveStatusPollingInterval()
  }, currentLiveStatusInterval)
}

// Adjust polling interval based on live status
const adjustLiveStatusPollingInterval = () => {
  const anyoneLive = liveMembersCount.value > 0
  const newInterval = anyoneLive
    ? LIVE_STATUS_INTERVALS.SOMEONE_LIVE
    : LIVE_STATUS_INTERVALS.NOBODY_LIVE

  // Only restart if interval changed
  if (newInterval !== currentLiveStatusInterval) {
    console.log(
      `[LiveStatus] Adjusting polling interval: ${currentLiveStatusInterval}ms -> ${newInterval}ms (${anyoneLive ? 'someone live' : 'nobody live'})`
    )
    currentLiveStatusInterval = newInterval
    startSmartLiveStatusPolling()
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
  if (gamificationInterval) {
    clearInterval(gamificationInterval)
    gamificationInterval = null
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

// Gamification handlers
const loadGamificationData = async () => {
  try {
    await Promise.all([
      fetchEvents(),
      fetchCampaignConfigs(campaignId),
      loadActiveGamificationInstances(),
    ])
  } catch (err) {
    console.error('Failed to load gamification data:', err)
  }
}

const loadActiveGamificationInstances = async () => {
  try {
    activeGamificationInstances.value = await fetchActiveInstances(campaignId)
  } catch (err) {
    console.error('Failed to load active instances:', err)
  }
}

const handleToggleGamificationEvent = async (eventId: string, enabled: boolean) => {
  savingGamificationEventId.value = eventId
  try {
    if (enabled) {
      await enableEvent(campaignId, eventId)
    } else {
      await disableEvent(campaignId, eventId)
    }
  } catch (err) {
    console.error('Failed to toggle event:', err)
  } finally {
    savingGamificationEventId.value = null
  }
}

const handleUpdateGamificationConfig = async (
  eventId: string,
  updates: UpdateGamificationConfigRequest
) => {
  savingGamificationEventId.value = eventId
  try {
    await updateConfig(campaignId, eventId, updates)
  } catch (err) {
    console.error('Failed to update config:', err)
  } finally {
    savingGamificationEventId.value = null
  }
}

const handleCancelGamificationInstance = async (instanceId: string) => {
  try {
    await cancelInstance(campaignId, instanceId)
    await loadActiveGamificationInstances()
  } catch (err) {
    console.error('Failed to cancel instance:', err)
  }
}

// Toast (used by maintenance and test handlers)
const toast = useToast()

// Maintenance tool handlers
const handleResetCooldownsConfirm = async () => {
  resettingCooldowns.value = true
  try {
    const streamerId = resetCooldownsTarget.value === 'all' ? undefined : resetCooldownsTarget.value
    const result = await resetCooldowns(campaignId, streamerId)
    toast.add({
      title: 'Cooldowns réinitialisés',
      description: result.message,
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    showResetCooldownsModal.value = false
    resetCooldownsTarget.value = 'all'
  } catch (err) {
    toast.add({
      title: 'Erreur',
      description: err instanceof Error ? err.message : 'Impossible de réinitialiser les cooldowns',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    resettingCooldowns.value = false
  }
}

const handleResetStateConfirm = async () => {
  resettingState.value = true
  try {
    const streamerId = resetStateTarget.value === 'all' ? undefined : resetStateTarget.value
    const result = await resetState(campaignId, streamerId)
    toast.add({
      title: 'Instances annulées',
      description: result.message,
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    showResetStateModal.value = false
    resetStateTarget.value = 'all'
    await loadActiveGamificationInstances()
  } catch (err) {
    toast.add({
      title: 'Erreur',
      description: err instanceof Error ? err.message : "Impossible d'annuler les instances",
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    resettingState.value = false
  }
}

const handleCleanupFoundryConfirm = async () => {
  cleaningFoundry.value = true
  try {
    await cleanupFoundry(campaignId, cleanupFoundryChat.value)
    toast.add({
      title: 'Nettoyage envoyé',
      description: 'La commande de nettoyage a été envoyée à Foundry',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    showCleanupFoundryModal.value = false
    cleanupFoundryChat.value = false
  } catch (err) {
    toast.add({
      title: 'Erreur',
      description: err instanceof Error ? err.message : 'Impossible de nettoyer Foundry',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    cleaningFoundry.value = false
  }
}

// Test handlers (DEV/STAGING only)

const handleSimulateRedemption = async (eventId: string) => {
  if (!isDev.value) return

  savingGamificationEventId.value = eventId
  try {
    const result = await simulateRedemption(campaignId, eventId)
    const data = (result as Record<string, unknown>).data as Record<string, unknown> | undefined
    const actionResult = data?.actionResult as Record<string, unknown> | undefined

    if (actionResult && actionResult.success === false) {
      toast.add({
        title: "L'action a échoué",
        description: String(actionResult.error || 'Erreur inconnue'),
        color: 'warning',
        icon: 'i-lucide-alert-triangle',
      })
    } else {
      toast.add({
        title: 'Simulation réussie',
        description: `${data?.contributionsCount || 1} contributions envoyées — objectif atteint`,
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    }

    await loadActiveGamificationInstances()
  } catch (err) {
    toast.add({
      title: 'Erreur de simulation',
      description: (err as Error).message,
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    savingGamificationEventId.value = null
  }
}

const handleForceCompleteInstance = async (instanceId: string) => {
  if (!isDev.value) return

  try {
    await forceCompleteInstance(campaignId, instanceId)
    await loadActiveGamificationInstances()
  } catch (err) {
    console.error('Failed to force complete instance:', err)
  }
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
const hasVttStats = computed(() => {
  if (!campaign.value?.vttInfo) return false
  const info = campaign.value.vttInfo
  return (
    (info.characterCounts?.total ?? 0) > 0 || (info.diceRollCount ?? 0) > 0 || !!info.lastVttSyncAt
  )
})

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
