<template>
  <DefaultLayout>
    <div
      class="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900 p-6"
    >
      <div class="max-w-7xl mx-auto space-y-6">
        <!-- Header -->
        <UCard>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="bg-primary-500/10 p-3 rounded-xl">
                <UIcon name="i-lucide-terminal" class="size-8 text-primary-500" />
              </div>
              <div>
                <h1 class="text-3xl font-bold text-white">Dashboard MJ</h1>
                <p class="text-gray-400 mt-1">Gérez vos sondages multi-streams</p>
              </div>
            </div>
            <div class="flex gap-3 items-center">
              <RoleToggle />
              <UButton
                color="error"
                variant="soft"
                icon="i-lucide-log-out"
                label="Déconnexion"
                @click="handleLogout"
              />
            </div>
          </div>
        </UCard>

        <!-- Campaigns and Streamers Grid -->
        <div v-if="campaignsLoaded && campaigns.length > 0" class="grid grid-cols-3 gap-6">
          <!-- Campaign List (2/3) -->
          <UCard class="col-span-2">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="bg-purple-500/10 p-3 rounded-xl">
                    <UIcon name="i-lucide-folder-kanban" class="size-6 text-purple-500" />
                  </div>
                  <div>
                    <h2 class="text-xl font-semibold text-white">Campagnes actives</h2>
                    <p class="text-sm text-gray-400">Sélectionnez une campagne pour gérer vos sondages</p>
                  </div>
                </div>
                <UButton
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-folders"
                  label="Toutes les campagnes"
                  @click="router.push('/mj/campaigns')"
                />
              </div>
            </template>

            <div class="space-y-2">
              <div
                v-for="campaign in sortedCampaigns"
                :key="campaign.id"
                class="flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all"
                :class="
                  selectedCampaignId === campaign.id
                    ? 'bg-purple-500/20 border border-purple-500/50'
                    : 'bg-gray-800/30 hover:bg-gray-800/50 border border-transparent'
                "
                @click="selectCampaign(campaign.id)"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-2 h-2 rounded-full"
                    :class="
                      selectedCampaignId === campaign.id
                        ? 'bg-purple-500'
                        : 'bg-gray-600'
                    "
                  ></div>
                  <div>
                    <h3 class="font-semibold text-white">{{ campaign.name }}</h3>
                    <p class="text-sm text-gray-400">
                      {{ campaign.active_member_count || 0 }} streamer(s)
                    </p>
                  </div>
                </div>
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-settings"
                  square
                  @click.stop="router.push(`/mj/campaigns/${campaign.id}`)"
                />
              </div>
            </div>
          </UCard>

          <!-- Streamers List (1/3) -->
          <UCard class="col-span-1">
            <template #header>
              <div class="flex items-center gap-3">
                <UIcon name="i-lucide-users" class="size-6 text-primary-500" />
                <div>
                  <h2 class="text-xl font-semibold text-white">Streamers connectés</h2>
                  <p v-if="selectedCampaignId" class="text-xs text-gray-400">
                    {{ selectedCampaignStreamers.length }} membre(s)
                  </p>
                </div>
              </div>
            </template>

            <!-- Loading -->
            <div
              v-if="streamersLoading"
              class="flex flex-col items-center justify-center py-12"
            >
              <UIcon
                name="i-lucide-loader"
                class="size-10 text-primary-500 animate-spin mb-4"
              />
              <p class="text-gray-400 text-sm">Chargement...</p>
            </div>

            <!-- No Campaign Selected -->
            <div
              v-else-if="!selectedCampaignId"
              class="text-center py-12"
            >
              <div class="bg-purple-500/10 p-4 rounded-2xl mb-4 inline-block">
                <UIcon name="i-lucide-arrow-left" class="size-12 text-purple-500" />
              </div>
              <p class="text-gray-400 text-sm">
                Sélectionnez une campagne pour voir les streamers
              </p>
            </div>

            <!-- Empty State -->
            <div
              v-else-if="selectedCampaignStreamers.length === 0"
              class="text-center py-12"
            >
              <div class="bg-purple-500/10 p-4 rounded-2xl mb-4 inline-block">
                <UIcon name="i-lucide-user-plus" class="size-12 text-purple-500" />
              </div>
              <p class="text-gray-400 text-sm">Aucun streamer dans cette campagne</p>
            </div>

            <!-- Streamers List -->
            <div v-else class="space-y-3">
              <div
                v-for="streamer in selectedCampaignStreamers"
                :key="streamer.id"
                class="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
              >
                <div class="flex items-center gap-2">
                  <img
                    v-if="streamer.profile_image_url"
                    :src="streamer.profile_image_url"
                    :alt="streamer.twitch_display_name"
                    class="size-8 rounded-full ring-2 ring-purple-500/20"
                  />
                  <div
                    v-else
                    class="size-8 rounded-full ring-2 ring-purple-500/20 bg-purple-500/20 flex items-center justify-center"
                  >
                    <UIcon name="i-lucide-user" class="size-4 text-purple-500" />
                  </div>
                  <div>
                    <p class="font-semibold text-white text-sm">
                      {{ streamer.twitch_display_name }}
                    </p>
                    <p class="text-xs text-gray-400">@{{ streamer.twitch_login }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <UBadge
                    v-if="streamer.broadcaster_type === 'partner'"
                    label="Partenaire"
                    color="primary"
                    variant="soft"
                    size="xs"
                  />
                  <UBadge
                    v-else-if="streamer.broadcaster_type === 'affiliate'"
                    label="Affilié"
                    color="info"
                    variant="soft"
                    size="xs"
                  />
                  <UBadge
                    v-else
                    label="Non compatible"
                    color="warning"
                    variant="soft"
                    size="xs"
                  />
                  <UBadge
                    :label="streamer.is_active ? 'Actif' : 'Inactif'"
                    :color="streamer.is_active ? 'success' : 'neutral'"
                    variant="soft"
                    size="xs"
                  />
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- No Campaign Message -->
        <UCard v-else-if="campaignsLoaded && campaigns.length === 0">
          <div class="text-center py-12">
            <div class="bg-yellow-500/10 p-6 rounded-2xl mb-6 inline-block">
              <UIcon name="i-lucide-alert-circle" class="size-16 text-yellow-500" />
            </div>
            <h2 class="text-2xl font-bold text-white mb-2">
              Aucune campagne disponible
            </h2>
            <p class="text-gray-400 mb-6 max-w-md mx-auto">
              Créez une campagne pour commencer à gérer vos sondages multi-streams
            </p>
            <UButton
              color="primary"
              size="lg"
              icon="i-lucide-plus"
              label="Créer ma première campagne"
              @click="router.push('/mj/campaigns')"
            />
          </div>
        </UCard>

        <!-- Active Poll Control Card -->
        <UCard v-if="activeSession && activeSessionPolls.length > 0" class="border-2 border-primary-500/50 bg-gray-900/50">
          <div class="flex items-center justify-between gap-6">
            <!-- Partie gauche: Compteur + Question + Chrono + Actions -->
            <div class="flex items-center gap-4 flex-1">
              <!-- Compteur de questions -->
              <UBadge
                :label="`${currentPollIndex + 1}/${activeSessionPolls.length}`"
                color="primary"
                size="lg"
                variant="soft"
              />

              <!-- Question -->
              <h3 class="text-lg font-semibold text-white flex-1">{{ currentPoll?.question }}</h3>

              <!-- Chrono (si en cours) -->
              <div
                v-if="pollStatus === 'sending' && countdown > 0"
                class="flex items-center gap-2 px-4 py-2 bg-primary-500/10 rounded-lg border border-primary-500/30"
              >
                <UIcon name="i-lucide-clock" class="size-5 text-primary-500" />
                <span class="text-2xl font-bold text-primary-500 tabular-nums">
                  {{ Math.floor(countdown / 60) }}:{{ String(countdown % 60).padStart(2, '0') }}
                </span>
              </div>

              <!-- Bouton Envoyer (carré, sans texte) -->
              <UButton
                v-if="pollStatus === 'idle'"
                color="primary"
                icon="i-lucide-send"
                size="lg"
                square
                @click="sendPoll"
              />
            </div>

            <!-- Partie droite: Navigation + Badges + Fermer -->
            <div class="flex items-center gap-3">
              <!-- Flèches de navigation (avec bordures) -->
              <div class="flex flex-col gap-1">
                <UButton
                  color="primary"
                  variant="solid"
                  icon="i-lucide-chevron-up"
                  size="sm"
                  square
                  class="border border-primary-500"
                  :disabled="currentPollIndex === 0"
                  @click="goToPreviousPoll"
                />
                <UButton
                  color="primary"
                  variant="solid"
                  icon="i-lucide-chevron-down"
                  size="sm"
                  square
                  class="border border-primary-500"
                  :disabled="currentPollIndex === activeSessionPolls.length - 1"
                  @click="goToNextPoll"
                />
              </div>

              <!-- Badge d'état -->
              <UBadge
                v-if="pollStatus === 'sending'"
                label="En cours"
                color="warning"
                variant="soft"
                size="lg"
              />
              <UBadge
                v-else-if="pollStatus === 'sent'"
                label="Envoyé"
                color="success"
                variant="soft"
                size="lg"
              />

              <!-- Bouton fermer/annuler intelligent -->
              <UButton
                :color="pollStatus === 'sending' ? 'error' : 'neutral'"
                variant="solid"
                icon="i-lucide-x"
                size="sm"
                square
                :class="pollStatus === 'sending' ? 'border-2 border-red-500' : 'border border-gray-500'"
                @click="handleCloseOrCancel"
              />
            </div>
          </div>

          <!-- Résultats (en dessous si présents) -->
          <div v-if="pollResults" class="mt-6 pt-6 border-t border-gray-700">
            <div class="grid grid-cols-3 gap-3">
              <div
                v-for="(result, index) in pollResults.results"
                :key="index"
                class="p-3 bg-gray-800/50 rounded-lg border border-gray-700"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-white font-medium text-sm">{{ result.option }}</span>
                  <span class="text-primary-500 font-bold">{{ result.votes }}</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2">
                  <div
                    class="bg-primary-500 h-2 rounded-full transition-all duration-500"
                    :style="{ width: `${(result.votes / pollResults.total_votes) * 100}%` }"
                  ></div>
                </div>
              </div>
            </div>
            <p class="text-gray-400 text-xs text-center mt-3">
              Total: {{ pollResults.total_votes }} votes
            </p>
          </div>
        </UCard>

        <!-- Poll Sessions -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <UIcon name="i-lucide-list-checks" class="size-6 text-primary-500" />
                <h2 class="text-xl font-semibold text-white">Sessions de sondages</h2>
              </div>
              <UButton
                color="primary"
                icon="i-lucide-plus"
                label="Créer une session"
                @click="showCreateSessionModal = true"
              />
            </div>
          </template>

          <!-- No Campaign Selected -->
          <div
            v-if="!selectedCampaignId"
            class="text-center py-16"
          >
            <div class="bg-purple-500/10 p-6 rounded-2xl mb-4 inline-block">
              <UIcon name="i-lucide-arrow-left" class="size-16 text-purple-500" />
            </div>
            <p class="text-gray-400">Sélectionnez une campagne pour gérer vos sessions</p>
          </div>

          <!-- Loading -->
          <div
            v-else-if="sessionsLoading"
            class="flex flex-col items-center justify-center py-16"
          >
            <UIcon
              name="i-lucide-loader"
              class="size-12 text-primary-500 animate-spin mb-4"
            />
            <p class="text-gray-400">Chargement des sessions...</p>
          </div>

          <!-- Empty State -->
          <div
            v-else-if="sessions.length === 0"
            class="text-center py-16"
          >
            <div class="bg-primary-500/10 p-6 rounded-2xl mb-6 inline-block">
              <UIcon name="i-lucide-list-plus" class="size-16 text-primary-500" />
            </div>
            <h3 class="text-xl font-bold text-white mb-2">Aucune session créée</h3>
            <p class="text-gray-400 mb-6">
              Créez votre première session pour commencer
            </p>
            <UButton
              color="primary"
              icon="i-lucide-plus"
              label="Créer une session"
              @click="showCreateSessionModal = true"
            />
          </div>

          <!-- Sessions List -->
          <div v-else class="space-y-3">
            <div
              v-for="session in sessions"
              :key="session.id"
              class="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
            >
              <div class="flex items-center gap-4">
                <div class="bg-purple-500/10 p-3 rounded-lg">
                  <UIcon name="i-lucide-list-checks" class="size-6 text-purple-500" />
                </div>
                <div>
                  <h3 class="font-semibold text-white">{{ session.name }}</h3>
                  <p class="text-sm text-gray-400">
                    {{ session.polls_count }} sondage(s) · {{ session.default_duration_seconds }}s par défaut
                  </p>
                </div>
              </div>
              <div class="flex gap-2">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-plus"
                  label="Sondage"
                  size="sm"
                  @click="openManageSessionModal(session)"
                />
                <UButton
                  color="primary"
                  variant="soft"
                  icon="i-lucide-rocket"
                  label="Lancer"
                  size="sm"
                  @click="launchSession(session)"
                />
              </div>
            </div>
          </div>
        </UCard>
        <!-- The rest of the template remains unchanged; we only modify script setup logic -->

      </div>

      <!-- Create Session Modal -->
      <UModal v-model:open="showCreateSessionModal">
        <template #header>
          <h3 class="text-xl font-bold text-white">Créer une session</h3>
        </template>

        <template #body>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Nom de la session</label>
              <UInput
                v-model="newSession.name"
                type="text"
                placeholder="Ex: Session d'exploration"
                size="lg"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Durée par défaut des sondages (secondes)
              </label>
              <UInput
                v-model.number="newSession.default_duration_seconds"
                type="number"
                :min="15"
                :max="1800"
                size="lg"
              />
              <p class="text-xs text-gray-400 mt-2">
                {{ Math.floor(newSession.default_duration_seconds / 60) }}m
                {{ newSession.default_duration_seconds % 60 }}s
              </p>
            </div>
          </div>
        </template>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="soft" label="Annuler" @click="showCreateSessionModal = false" />
            <UButton
              color="primary"
              icon="i-lucide-check"
              label="Créer"
              :loading="creating"
              @click="handleCreateSession"
            />
          </div>
        </template>
      </UModal>

      <!-- Manage Session Modal -->
      <UModal v-model:open="showManageSessionModal">
        <template #header>
          <h3 class="text-xl font-bold text-white">Gérer la session: {{ currentSession?.name }}</h3>
        </template>

        <template #body>
          <div class="space-y-6">
            <!-- Polls List -->
            <div v-if="currentSessionPolls.length > 0" class="space-y-3">
              <div
                v-for="(poll, index) in currentSessionPolls"
                :key="poll.id"
                class="p-4 bg-gray-800/30 rounded-lg"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 space-y-2">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium text-gray-400">#{{ index + 1 }}</span>
                      <UBadge :label="poll.type" :color="poll.type === 'UNIQUE' ? 'primary' : 'neutral'" variant="soft" size="sm" />
                      <UBadge v-if="poll.channel_points_enabled" :label="`${poll.channel_points_amount} pts`" color="success" variant="soft" size="sm" />
                    </div>
                    <p class="font-semibold text-white">{{ poll.question }}</p>
                    <div class="flex flex-wrap gap-2">
                      <UBadge v-for="(option, i) in poll.options" :key="i" :label="option" color="neutral" variant="soft" size="sm" />
                    </div>
                  </div>
                  <UButton color="error" variant="ghost" icon="i-lucide-trash-2" square @click="handleDeletePoll(poll.id)" />
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else class="text-center py-8">
              <UIcon name="i-lucide-inbox" class="size-12 text-gray-500 mb-2" />
              <p class="text-gray-400">Aucun sondage dans cette session</p>
            </div>

            <!-- Add Poll Form -->
            <div class="border-t border-gray-700 pt-6 space-y-4">
              <h4 class="font-semibold text-white">Ajouter un sondage</h4>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Question</label>
                <UInput
                  v-model="newPoll.question"
                  placeholder="Ex: Quelle direction prendre ?"
                  size="lg"
                  maxlength="45"
                />
                <p class="text-xs text-gray-400 mt-1">
                  {{ newPoll.question.length }}/45 caractères
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Type de sondage</label>
                <div class="flex gap-2">
                  <UButton
                    :color="newPoll.type === 'UNIQUE' ? 'primary' : 'neutral'"
                    :variant="newPoll.type === 'UNIQUE' ? 'solid' : 'soft'"
                    label="Vote unique"
                    @click="handlePollTypeChange('UNIQUE')"
                  />
                  <UButton
                    :color="newPoll.type === 'STANDARD' ? 'primary' : 'neutral'"
                    :variant="newPoll.type === 'STANDARD' ? 'solid' : 'soft'"
                    label="Vote multiple"
                    @click="handlePollTypeChange('STANDARD')"
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Réponses (2-5 max)</label>
                <div class="space-y-2">
                  <div v-for="(option, idx) in newPollOptions" :key="idx" class="flex gap-2">
                    <UInput v-model="newPollOptions[idx]" placeholder="Réponse" size="lg" class="flex-1" />
                    <UButton
                      v-if="newPollOptions.length > 2"
                      color="error"
                      variant="ghost"
                      icon="i-lucide-x"
                      square
                      @click="removePollOption(idx)"
                    />
                  </div>
                  <UButton
                    v-if="newPollOptions.length < 5"
                    color="neutral"
                    variant="soft"
                    icon="i-lucide-plus"
                    label="Ajouter une réponse"
                    size="sm"
                    @click="addPollOption"
                  />
                </div>
              </div>

              <div v-if="newPoll.type === 'UNIQUE'" class="border-t border-gray-700 pt-4 space-y-3">
                <div class="flex items-center justify-between">
                  <label class="text-sm font-medium text-gray-300">Points de chaîne</label>
                  <USwitch v-model="newPoll.channelPointsEnabled" />
                </div>
                <div v-if="newPoll.channelPointsEnabled">
                  <label class="block text-sm font-medium text-gray-300 mb-2">Nombre de points</label>
                  <UInput
                    v-model.number="newPoll.channelPointsAmount"
                    type="number"
                    :min="1"
                    :max="1000000"
                    size="lg"
                    placeholder="50"
                  />
                </div>
              </div>

              <div v-else class="border-t border-gray-700 pt-4">
                <div class="flex items-center gap-2 text-sm text-gray-400">
                  <UIcon name="i-lucide-info" class="size-4" />
                  <span>Les points de chaîne sont automatiquement activés pour les votes multiples</span>
                </div>
                <div class="mt-3">
                  <label class="block text-sm font-medium text-gray-300 mb-2">Nombre de points</label>
                  <UInput
                    v-model.number="newPoll.channelPointsAmount"
                    type="number"
                    :min="1"
                    :max="1000000"
                    size="lg"
                    placeholder="50"
                  />
                </div>
              </div>

              <UButton color="primary" icon="i-lucide-plus" label="Ajouter ce sondage" block @click="handleAddPoll" />
            </div>
          </div>
        </template>

        <template #footer>
          <div class="flex justify-between items-center w-full">
            <UButton
              color="error"
              variant="soft"
              icon="i-lucide-trash-2"
              label="Supprimer la session"
              @click="handleDeleteSession"
            />
            <UButton
              color="neutral"
              variant="soft"
              label="Fermer"
              @click="showManageSessionModal = false"
            />
          </div>
        </template>
      </UModal>

      <!-- Delete Session Confirmation Modal -->
      <UModal v-model:open="showDeleteSessionConfirm">
        <template #header>
          <h3 class="text-xl font-bold text-white">Confirmer la suppression</h3>
        </template>

        <template #body>
          <div class="space-y-4">
            <div class="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <UIcon name="i-lucide-alert-triangle" class="size-8 text-red-500" />
              <div>
                <p class="text-white font-semibold">Attention !</p>
                <p class="text-gray-300 text-sm">
                  Êtes-vous sûr de vouloir supprimer la session "{{ currentSession?.name }}" ?
                </p>
              </div>
            </div>
            <p class="text-gray-400 text-sm">
              Tous les sondages associés à cette session seront également supprimés. Cette action est irréversible.
            </p>
          </div>
        </template>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton
              color="neutral"
              variant="soft"
              label="Annuler"
              @click="showDeleteSessionConfirm = false"
            />
            <UButton
              color="error"
              icon="i-lucide-trash-2"
              label="Supprimer définitivement"
              :loading="deleting"
              @click="confirmDeleteSession"
            />
          </div>
        </template>
      </UModal>

      <!-- Close Active Session Confirmation Modal -->
      <UModal v-model:open="showCloseSessionConfirm">
        <template #header>
          <h3 class="text-xl font-bold text-white">Fermer la session active</h3>
        </template>

        <template #body>
          <div class="space-y-4">
            <div class="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <UIcon name="i-lucide-alert-triangle" class="size-8 text-yellow-500" />
              <div>
                <p class="text-white font-semibold">Attention !</p>
                <p class="text-gray-300 text-sm">
                  Êtes-vous sûr de vouloir fermer la session de sondage en cours ?
                </p>
              </div>
            </div>
            <p class="text-gray-400 text-sm">
              La progression actuelle (sondages lancés, résultats) sera perdue. Vous pourrez relancer la session plus tard.
            </p>
          </div>
        </template>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton
              color="neutral"
              variant="soft"
              label="Annuler"
              @click="showCloseSessionConfirm = false"
            />
            <UButton
              color="error"
              icon="i-lucide-x"
              label="Fermer la session"
              @click="confirmCloseSession"
            />
          </div>
        </template>
      </UModal>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import { usePollTemplates } from "@/composables/usePollTemplates";
import { useCampaigns } from "@/composables/useCampaigns";
import { usePollControlStore } from "@/stores/pollControl";
import DefaultLayout from "@/layouts/DefaultLayout.vue";
import RoleToggle from "@/components/RoleToggle.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { logout } = useAuth();
const {
  templates,
  loading: templatesLoading,
  fetchTemplates,
  createTemplate,
  deleteTemplate,
  launchPoll,
} = usePollTemplates();
const { campaigns, fetchCampaigns, selectedCampaign, getCampaignMembers } = useCampaigns();

// Campaign management
const campaignsLoaded = ref(false);
const selectedCampaignId = ref<string | null>(null);

// Trier les campagnes : la campagne sélectionnée en premier
const sortedCampaigns = computed(() => {
  if (!selectedCampaignId.value) {
    return campaigns.value;
  }

  const selected = campaigns.value.find(c => c.id === selectedCampaignId.value);
  const others = campaigns.value.filter(c => c.id !== selectedCampaignId.value);

  return selected ? [selected, ...others] : campaigns.value;
});

// Fonction de sélection de campagne
const selectCampaign = (campaignId: string) => {
  selectedCampaignId.value = campaignId;
};

const campaignOptions = computed(() =>
  campaigns.value.map((c) => ({
    label: c.name,
    value: c.id,
  })),
);


// Streamers data
const streamers = ref<any[]>([]);
const streamersLoading = ref(false);
const campaignMembers = ref<any[]>([]);

// Filtrer les streamers par campagne sélectionnée
const selectedCampaignStreamers = computed(() => {
  // Retourner uniquement les membres actifs de la campagne
  return campaignMembers.value
    .filter((member: any) => member.status === 'ACTIVE')
    .map((member: any) => ({
      id: member.streamer.id,
      twitch_display_name: member.streamer.twitch_display_name,
      twitch_login: member.streamer.twitch_login,
      profile_image_url: member.streamer.profile_image_url,
      broadcaster_type: member.streamer.broadcaster_type || '',
      is_active: true, // On peut améliorer ça plus tard avec un vrai statut
    }));
});

// Charger les membres de la campagne sélectionnée
const loadCampaignMembers = async (campaignId: string) => {
  streamersLoading.value = true;
  try {
    campaignMembers.value = await getCampaignMembers(campaignId);
    console.log('🎯 Campaign members loaded:', campaignMembers.value);
    console.log('🖼️ Streamers with images:', selectedCampaignStreamers.value);
  } catch (error) {
    console.error('Failed to load campaign members:', error);
    campaignMembers.value = [];
  } finally {
    streamersLoading.value = false;
  }
};

// Template creation modal
const showCreateModal = ref(false);
const creating = ref(false);
const newTemplate = reactive({
  label: "",
  title: "",
  duration_seconds: 60,
});
const optionsText = ref("");

// Load data on mount
onMounted(async () => {
  await fetchCampaigns();
  campaignsLoaded.value = true;

  // Check if campaign is specified in URL
  const campaignFromUrl = route.query.campaign as string | undefined;
  if (campaignFromUrl && campaigns.value.some((c) => c.id === campaignFromUrl)) {
    selectedCampaignId.value = campaignFromUrl;
  } else if (campaigns.value.length > 0) {
    selectedCampaignId.value = campaigns.value[0]?.id ?? null;
  }

  await fetchStreamers();
});

const fetchStreamers = async () => {
  streamersLoading.value = true;
  try {
    const API_URL = import.meta.env.VITE_API_URL;
    const response = await fetch(`${API_URL}/mj/streamers`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch streamers");
    const data = await response.json();
    streamers.value = data.data;
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: "Impossible de charger les streamers",
      color: "error",
    });
  } finally {
    streamersLoading.value = false;
  }
};

const handleCreateTemplate = async () => {
  const options = optionsText.value.split("\n").filter((o) => o.trim());

  if (options.length < 2 || options.length > 5) {
    toast.add({
      title: "Erreur",
      description: "Vous devez fournir entre 2 et 5 options",
      color: "error",
    });
    return;
  }

  if (!selectedCampaignId.value) {
    toast.add({
      title: "Erreur",
      description: "Veuillez sélectionner une campagne",
      color: "error",
    });
    return;
  }

  creating.value = true;
  try {
    await createTemplate(
      {
        ...newTemplate,
        options,
      },
      selectedCampaignId.value,
    );
    toast.add({
      title: "Succès",
      description: "Template créé avec succès",
      color: "success",
    });
    showCreateModal.value = false;
    newTemplate.label = "";
    newTemplate.title = "";
    newTemplate.duration_seconds = 60;
    optionsText.value = "";
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: "Impossible de créer le template",
      color: "error",
    });
  } finally {
    creating.value = false;
  }
};

const handleLaunchPoll = async (templateId: string) => {
  if (!selectedCampaignId.value) {
    toast.add({
      title: "Erreur",
      description: "Veuillez sélectionner une campagne",
      color: "error",
    });
    return;
  }

  try {
    await launchPoll(templateId, selectedCampaignId.value);
    toast.add({
      title: "Succès",
      description: "Sondage lancé sur tous les streamers actifs",
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: "Impossible de lancer le sondage",
      color: "error",
    });
  }
};

const handleDeleteTemplate = async (templateId: string) => {
  if (!confirm("Êtes-vous sûr de vouloir supprimer ce template ?")) {
    return;
  }

  if (!selectedCampaignId.value) {
    toast.add({
      title: "Erreur",
      description: "Veuillez sélectionner une campagne",
      color: "error",
    });
    return;
  }

  try {
    await deleteTemplate(templateId, selectedCampaignId.value);
    toast.add({
      title: "Succès",
      description: "Template supprimé",
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: "Impossible de supprimer le template",
      color: "error",
    });
  }
};

// ==========================================
// POLL SESSIONS MANAGEMENT
// ==========================================

// Sessions data
const sessions = ref<any[]>([]);
const sessionsLoading = ref(false);
const showCreateSessionModal = ref(false);
const showManageSessionModal = ref(false);
const showDeleteSessionConfirm = ref(false);
const showCloseSessionConfirm = ref(false);
const currentSession = ref<any>(null);
const currentSessionPolls = ref<any[]>([]);
const deleting = ref(false);

const newSession = reactive({
  name: "",
  default_duration_seconds: 60,
});

const newPoll = reactive({
  question: "",
  type: "UNIQUE" as "STANDARD" | "UNIQUE",
  channelPointsEnabled: false,
  channelPointsAmount: 50,
});

const newPollOptions = ref<string[]>(["", ""]);

// ==========================================
// POLL CONTROL CARD (Live Session)
// ==========================================

// Utilisation du store Pinia pour la persistance
const pollControlStore = usePollControlStore();
const {
  activeSession,
  activeSessionPolls,
  currentPollIndex,
  pollStatus,
  countdown,
  pollResults,
  launchedPolls,
  pollStartTime,
  pollDuration,
  activeCampaignId,
} = storeToRefs(pollControlStore);

// Computed pour la question actuelle
const currentPoll = computed(() => {
  if (!activeSessionPolls.value.length) return null;
  return activeSessionPolls.value[currentPollIndex.value];
});

// Fonction pour lancer une session
const launchSession = async (session: any) => {
  if (!selectedCampaignId.value) return;

  // Vérifier si une session est déjà active
  if (activeSession.value) {
    toast.add({
      title: "Session déjà active",
      description: "Une session de sondage est déjà en cours. Veuillez l'annuler avant de lancer une nouvelle session.",
      color: "warning",
    });
    return;
  }

  try {
    // Charger les sondages de la session
    const API_URL = import.meta.env.VITE_API_URL;
    const response = await fetch(
      `${API_URL}/mj/campaigns/${selectedCampaignId.value}/poll-sessions/${session.id}`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) throw new Error("Failed to fetch session details");
    const data = await response.json();

    const polls = data.data.polls || [];

    // Vérifier s'il y a au moins un sondage
    if (polls.length === 0) {
      toast.add({
        title: "Session vide",
        description: "Cette session ne contient aucun sondage. Veuillez ajouter au moins un sondage avant de lancer la session.",
        color: "warning",
      });
      return;
    }

    activeSession.value = session;
    activeSessionPolls.value = polls;
    currentPollIndex.value = 0;
    pollStatus.value = 'idle';
    countdown.value = 0;
    pollResults.value = null;
    launchedPolls.value = [];
    pollStartTime.value = null;
    pollDuration.value = null;

    // Mémoriser la campagne courante dans le store pollControl
    pollControlStore.activeCampaignId = selectedCampaignId.value;
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: "Impossible de charger la session",
      color: "error",
    });
  }
};

// Gestion intelligente du bouton fermer/annuler
const handleCloseOrCancel = () => {
  if (pollStatus.value === 'sending') {
    // Si un sondage est en cours, annuler directement (sans popup)
    cancelPoll();
  } else {
    // Sinon, demander confirmation pour fermer la session
    showCloseSessionConfirm.value = true;
  }
};

// Confirmer la fermeture de la session active
const confirmCloseSession = () => {
  pollControlStore.clearState();
  showCloseSessionConfirm.value = false;
};

// Navigation entre questions
const goToPreviousPoll = () => {
  if (currentPollIndex.value > 0) {
    currentPollIndex.value--;
    resetPollState();
  }
};

const goToNextPoll = () => {
  if (currentPollIndex.value < activeSessionPolls.value.length - 1) {
    currentPollIndex.value++;
    resetPollState();
  }
};

// Réinitialiser l'état du sondage
const resetPollState = () => {
  pollStatus.value = 'idle';
  countdown.value = 0;
  pollResults.value = null;
  pollStartTime.value = null;
  pollDuration.value = null;
};

// Annuler le sondage en cours
const cancelPoll = async () => {
  if (!currentPoll.value || !selectedCampaignId.value) {
  // fallback sur l'ID de campagne mémorisé si selectedCampaignId est null
  const campaignId = selectedCampaignId.value ?? activeCampaignId.value ?? null;

  if (!currentPoll.value || !campaignId) {
    resetPollState();
    return;
  }

  // Arrêter le countdown immédiatement pour éviter fetchPollResults()
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  // Si le sondage est en cours d'envoi, appeler l'API pour annuler
  if (pollStatus.value === 'sending') {
    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/mj/campaigns/${selectedCampaignId.value}/polls/${currentPoll.value.id}/cancel`, {
      const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/polls/${currentPoll.value.id}/cancel`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel poll');
      }

      toast.add({
        title: "Sondage annulé",
        description: "Le sondage a été annulé sur tous les streamers",
        color: "warning",
      });
    } catch (error) {
      console.error('Failed to cancel poll:', error);
      toast.add({
        title: "Erreur",
        description: "Impossible d'annuler le sondage",
        color: "error",
      });
    }
  }

  // Réinitialiser l'état local (sans afficher de résultats)
  resetPollState();
};

// Envoyer le sondage
const sendPoll = async () => {
  if (!currentPoll.value || !activeSession.value || !selectedCampaignId.value) return;
  // fallback sur l'ID de campagne mémorisé si selectedCampaignId est null
  const campaignId = selectedCampaignId.value ?? activeCampaignId.value ?? null;

  if (!currentPoll.value || !activeSession.value || !campaignId) return;

  pollStatus.value = 'sending';
  pollStartTime.value = Date.now();
  pollDuration.value = activeSession.value.default_duration_seconds;
  if (!launchedPolls.value.includes(currentPollIndex.value)) {
    launchedPolls.value.push(currentPollIndex.value);
  }

  try {
    // Appeler l'API pour lancer le sondage
    // Appeler l'API pour lancer le sondage - on utilise campaignId obtenu ci-dessus
    const API_URL = import.meta.env.VITE_API_URL;
    const response = await fetch(`${API_URL}/mj/campaigns/${selectedCampaignId.value}/polls/${currentPoll.value.id}/launch`, {
    const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/polls/${currentPoll.value.id}/launch`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to launch poll');
    }

    const result = await response.json();

    // Vérifier s'il y a des streamers en échec
    if (result.data.failed_streamers && result.data.failed_streamers.length > 0) {
      const failedCount = result.data.failed_streamers.length;
      const successCount = result.data.streamers_count - failedCount;

      toast.add({
        title: "Sondage partiellement lancé",
        description: `${successCount} streamer(s) OK, ${failedCount} streamer(s) incompatible(s) (non Affilié/Partenaire)`,
        color: "warning",
      });
    } else {
      toast.add({
        title: "Sondage lancé",
        description: "Le sondage a été envoyé à tous les streamers actifs",
        color: "success",
      });
      const errText = await response.text().catch(() => 'Unknown error');
      throw new Error(errText || 'Failed to launch poll');
    }

    // Démarrer le compte à rebours
    countdown.value = activeSession.value.default_duration_seconds;
    // Démarrer le compteur local
    countdown.value = pollDuration.value;
    startCountdown();
  } catch (error: any) {
    const errorMessage = error?.message || "Impossible d'envoyer le sondage";

    // Détecter les erreurs spécifiques
    const errorMessage = (error && error.message) ? error.message : 'Une erreur est survenue';
    // Détecter les erreurs spécifiques et message utilisateur
    if (errorMessage.includes('No active streamers')) {
      toast.add({
        title: "Aucun streamer actif",
        description: "Aucun streamer n'est connecté dans cette campagne",
        color: "error",
      });
    } else if (errorMessage.includes('not a partner or affiliate')) {
      toast.add({
        title: "Streamers incompatibles",
        description: "Les streamers doivent être Affiliés ou Partenaires Twitch pour utiliser les sondages",
        color: "error",
      });
    } else {
      toast.add({
        title: "Erreur",
        description: errorMessage,
        color: "error",
      });
    }
    pollStatus.value = 'idle';
    pollStartTime.value = null;
    pollDuration.value = null;
  }
};

// Compte à rebours
// Compte à rebours (variable utilisée par startCountdown)
let countdownInterval: ReturnType<typeof setInterval> | null = null;

const startCountdown = () => {
  if (countdownInterval) clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--;
    } else {
      clearInterval(countdownInterval!);
      countdownInterval = null;
      pollStatus.value = 'sent';
      pollStartTime.value = null;
      pollDuration.value = null;
      fetchPollResults();
    }
  }, 1000);
};

// Reprendre le countdown si un sondage était en cours lors du chargement
onMounted(() => {
  // Forcer le rechargement de l'état depuis localStorage côté client
  pollControlStore.loadState();

  console.log('Poll Control - onMounted (après loadState):', {
    activeSession: activeSession.value,
    pollStatus: pollStatus.value,
    countdown: countdown.value,
    activeSessionPolls: activeSessionPolls.value.length
  });

  if (pollStatus.value === 'sending' && countdown.value > 0) {
    console.log('Reprendre le countdown avec', countdown.value, 'secondes restantes');
    startCountdown();
  }
});

// Récupérer les résultats (10 fois en 10 secondes)
const fetchPollResults = async () => {
  if (!currentPoll.value || !selectedCampaignId.value) return;
  if (!currentPoll.value) return;

  // fallback pour la campagne
  const campaignId = selectedCampaignId.value ?? activeCampaignId.value ?? null;
  if (!campaignId || !currentPoll.value) return;

  let attempts = 0;
  const maxAttempts = 10;

  const fetchInterval = setInterval(async () => {
    attempts++;

    try {
      // Appeler l'API pour récupérer les résultats
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/mj/campaigns/${selectedCampaignId.value}/polls/${currentPoll.value.id}/results`, {
      const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/polls/${currentPoll.value.id}/results`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }

      const data = await response.json();
      pollResults.value = data.data;
    } catch (error) {
      console.error("Failed to fetch poll results:", error);
    }

    if (attempts >= maxAttempts) {
      clearInterval(fetchInterval);
    }
  }, 1000);
};

// Charger les sessions quand la campagne change
watch(selectedCampaignId, async (newId) => {
  if (newId) {
    selectedCampaign.value = campaigns.value.find((c) => c.id === newId) || null;
    await loadCampaignMembers(newId);
    await fetchSessions(newId);
  } else {
    campaignMembers.value = [];
    sessions.value = [];
  }
});

const fetchSessions = async (campaignId: string) => {
  sessionsLoading.value = true;
  try {
    const API_URL = import.meta.env.VITE_API_URL;
    const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/poll-sessions`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch sessions");
    const data = await response.json();
    sessions.value = data.data;
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: "Impossible de charger les sessions",
      color: "error",
    });
  } finally {
    sessionsLoading.value = false;
  }
};

const handleCreateSession = async () => {
  if (!newSession.name || !newSession.default_duration_seconds) {
    toast.add({
      title: "Erreur",
      description: "Veuillez remplir tous les champs",
      color: "error",
    });
    return;
  }

  if (!selectedCampaignId.value) {
    toast.add({
      title: "Erreur",
      description: "Veuillez sélectionner une campagne",
      color: "error",
    });
    return;
  }

  creating.value = true;
  try {
    const API_URL = import.meta.env.VITE_API_URL;
    const response = await fetch(
      `${API_URL}/mj/campaigns/${selectedCampaignId.value}/poll-sessions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newSession),
      }
    );

    if (!response.ok) throw new Error("Failed to create session");

    toast.add({
      title: "Succès",
      description: "Session créée avec succès",
      color: "success",
    });

    showCreateSessionModal.value = false;
    newSession.name = "";
    newSession.default_duration_seconds = 60;

    await fetchSessions(selectedCampaignId.value);
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: "Impossible de créer la session",
      color: "error",
    });
  } finally {
    creating.value = false;
  }
};

const handleDeleteSession = () => {
  showDeleteSessionConfirm.value = true;
};

const confirmDeleteSession = async () => {
  if (!selectedCampaignId.value || !currentSession.value) return;

  deleting.value = true;
  try {
    const API_URL = import.meta.env.VITE_API_URL;
    const response = await fetch(
      `${API_URL}/mj/campaigns/${selectedCampaignId.value}/poll-sessions/${currentSession.value.id}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    if (!response.ok) throw new Error("Failed to delete session");

    toast.add({
      title: "Succès",
      description: "Session supprimée avec succès",
      color: "success",
    });

    showDeleteSessionConfirm.value = false;
    showManageSessionModal.value = false;
    currentSession.value = null;
    currentSessionPolls.value = [];

    await fetchSessions(selectedCampaignId.value);
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: "Impossible de supprimer la session",
      color: "error",
    });
  } finally {
    deleting.value = false;
  }
};

const openManageSessionModal = async (session: any) => {
  currentSession.value = session;
  showManageSessionModal.value = true;

  // Charger les sondages de cette session
  if (!selectedCampaignId.value) return;

  try {
    const API_URL = import.meta.env.VITE_API_URL;
    const response = await fetch(
      `${API_URL}/mj/campaigns/${selectedCampaignId.value}/poll-sessions/${session.id}`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) throw new Error("Failed to fetch session details");
    const data = await response.json();
    currentSessionPolls.value = data.data.polls || [];
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: "Impossible de charger les sondages",
      color: "error",
    });
  }
};

const addPollOption = () => {
  if (newPollOptions.value.length < 5) {
    newPollOptions.value.push("");
  }
};

const removePollOption = (index: number) => {
  if (newPollOptions.value.length > 2) {
    newPollOptions.value.splice(index, 1);
  }
};

const handlePollTypeChange = (type: 'STANDARD' | 'UNIQUE') => {
  newPoll.type = type;
  if (type === 'STANDARD') {
    newPoll.channelPointsEnabled = true;
  }
};

const handleAddPoll = async () => {
  const options = newPollOptions.value.filter((o: string) => o.trim());

  if (!newPoll.question) {
    toast.add({
      title: "Erreur",
      description: "Veuillez saisir une question",
      color: "error",
    });
    return;
  }

  // Vérifier si une réponse contient des virgules
  const hasCommas = options.some((o: string) => o.includes(','));
  if (hasCommas) {
    toast.add({
      title: "Erreur",
      description: "Les réponses ne doivent pas contenir de virgules. Utilisez le bouton '+ Ajouter une réponse' pour ajouter plusieurs options.",
      color: "error",
    });
    return;
  }

  if (options.length < 2 || options.length > 5) {
    toast.add({
      title: "Erreur",
      description: "Vous devez fournir entre 2 et 5 réponses",
      color: "error",
    });
    return;
  }

  if (!selectedCampaignId.value || !currentSession.value) return;

  try {
    const API_URL = import.meta.env.VITE_API_URL;
    const response = await fetch(
      `${API_URL}/mj/campaigns/${selectedCampaignId.value}/poll-sessions/${currentSession.value.id}/polls`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          question: newPoll.question,
          options,
          type: newPoll.type,
          channel_points_enabled: newPoll.channelPointsEnabled,
          channel_points_amount: newPoll.channelPointsEnabled ? newPoll.channelPointsAmount : null,
        }),
      }
    );

    if (!response.ok) throw new Error("Failed to add poll");

    const data = await response.json();
    currentSessionPolls.value.push(data.data);

    toast.add({
      title: "Succès",
      description: "Sondage ajouté",
      color: "success",
    });

    // Reset form
    newPoll.question = "";
    newPoll.type = "UNIQUE";
    newPoll.channelPointsEnabled = false;
    newPoll.channelPointsAmount = 50;
    newPollOptions.value = ["", ""];

    // Recharger les sessions pour mettre à jour le compteur
    await fetchSessions(selectedCampaignId.value);
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: "Impossible d'ajouter le sondage",
      color: "error",
    });
  }
};

const handleDeletePoll = async (pollId: string) => {
  if (!confirm("Êtes-vous sûr de vouloir supprimer ce sondage ?")) return;

  if (!selectedCampaignId.value || !currentSession.value) return;

  try {
    const API_URL = import.meta.env.VITE_API_URL;
    const response = await fetch(
      `${API_URL}/mj/campaigns/${selectedCampaignId.value}/poll-sessions/${currentSession.value.id}/polls/${pollId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    if (!response.ok) throw new Error("Failed to delete poll");

    currentSessionPolls.value = currentSessionPolls.value.filter((p) => p.id !== pollId);

    toast.add({
      title: "Succès",
      description: "Sondage supprimé",
      color: "success",
    });

    // Recharger les sessions pour mettre à jour le compteur
    await fetchSessions(selectedCampaignId.value);
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: "Impossible de supprimer le sondage",
      color: "error",
    });
  }
};
// Reprendre le countdown si un sondage était en cours lors du chargement
onMounted(() => {
  // Forcer le rechargement de l'état depuis localStorage côté client
  pollControlStore.loadState();

const handleLogout = async () => {
  try {
    await logout();
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: "Impossible de se déconnecter",
      color: "error",
    });
  }
};
  console.log('Poll Control - onMounted (après loadState):', {
    activeSession: activeSession.value,
    pollStatus: pollStatus.value,
    countdown: countdown.value,
    activeSessionPolls: activeSessionPolls.value.length
  });

// Reset modal on close
watch(showCreateModal, (isOpen) => {
  if (!isOpen) {
    newTemplate.label = "";
    newTemplate.title = "";
    newTemplate.duration_seconds = 60;
    optionsText.value = "";
  if (pollStatus.value === 'sending' && countdown.value > 0) {
    console.log('Reprendre le countdown avec', countdown.value, 'secondes restantes');
    startCountdown();
  }
});

</script>

<style scoped>
/* (styles unchanged) */
</style>
