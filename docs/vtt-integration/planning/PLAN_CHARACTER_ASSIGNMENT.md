# Plan : Assignation de Personnages aux Streamers

## Vue d'Ensemble

Permettre aux streamers de choisir quel personnage (PJ) ils jouent dans chaque campagne. Le choix se fait :
1. **Obligatoirement** lors de l'acceptation d'une invitation de campagne
2. **Modifiable** via une page de paramètres de campagne (avec conditions)
3. **Synchronisé** avec les données du VTT

## Décisions Prises (Questions Utilisateur)

1. **Permanence** → Modifiable avec conditions (seulement quand aucun poll actif)
2. **Obligation** → Obligatoire dès l'acceptation (doit choisir un personnage pour accepter)
3. **Emplacement bouton** → Sur chaque carte de campagne dans la liste
4. **Sync VTT** → Désassigner automatiquement si le personnage n'existe plus dans le VTT

## Architecture Technique

### Modèles Existants (Déjà en Place)

✅ **Character** (`backend/app/models/character.ts`)
- `id`, `campaignId`, `vttCharacterId`, `name`, `avatarUrl`
- `characterType` : 'pc' | 'npc'
- Relation avec Campaign

✅ **CharacterAssignment** (`backend/app/models/character_assignment.ts`)
- `id`, `characterId`, `streamerId`, `campaignId`, `assignedAt`
- Relations : Character, Streamer, Campaign

### Modifications Base de Données

Aucune migration nécessaire ! Les tables existent déjà :
- `characters` - Pour stocker les personnages importés du VTT
- `character_assignments` - Pour lier un streamer à un personnage

### Flux Utilisateur

#### Flux 1 : Acceptation d'Invitation avec Choix de Personnage

```
Streamer reçoit invitation
  ↓
/streamer/campaigns → Liste des invitations
  ↓
Clic "Accepter" sur une invitation
  ↓
NOUVELLE Modal d'acceptation s'ouvre
  ↓
Affiche :
  - Nom de la campagne
  - Description
  - Liste des personnages (PJ) disponibles
  - Sélecteur de personnage (dropdown ou cards)
  ↓
Streamer choisit un personnage
  ↓
Clic "Confirmer et accepter"
  ↓
Backend :
  1. Accepte l'invitation (CampaignMembership PENDING → ACTIVE)
  2. Crée CharacterAssignment (streamer ↔ character)
  ↓
Redirection vers /streamer ou refresh de la liste
```

#### Flux 2 : Modification du Personnage via Paramètres

```
/streamer/campaigns → Campagnes actives
  ↓
Chaque carte de campagne a un bouton "Paramètres"
  ↓
Clic sur "Paramètres"
  ↓
Navigation vers /streamer/campaigns/:campaignId/settings
  ↓
Page de paramètres affiche :
  - Header avec nom de campagne + retour
  - Section "Mon personnage"
    - Personnage actuellement assigné (nom + avatar)
    - Bouton "Changer de personnage"
  ↓
Clic "Changer de personnage"
  ↓
Vérification :
  - Poll actif ? → Bloquer avec message
  - Pas de poll actif ? → Ouvrir modal de sélection
  ↓
Modal affiche liste des personnages (PJ) disponibles
  ↓
Streamer choisit un nouveau personnage
  ↓
Backend :
  1. Vérifie qu'aucun poll n'est actif
  2. Met à jour CharacterAssignment
  ↓
Retour à la page de paramètres avec nouveau personnage
```

#### Flux 3 : Synchronisation VTT et Désassignation Automatique

```
GM modifie/supprime un personnage dans le VTT
  ↓
Module VTT envoie webhook de sync à Tumulte
  ↓
Backend sync les personnages de la campagne
  ↓
Détecte : Personnage assigné à un streamer n'existe plus
  ↓
Actions :
  1. Supprime CharacterAssignment
  2. Crée notification pour le streamer
  3. Envoie notification push si activé
  ↓
Streamer voit notification :
  "Votre personnage [Nom] a été supprimé de la campagne [Nom].
   Veuillez choisir un nouveau personnage dans les paramètres."
  ↓
Streamer va dans /streamer/campaigns/:id/settings
  ↓
Affiche message : "Aucun personnage assigné" + Bouton "Choisir un personnage"
```

## Modifications Backend

### 1. Nouveaux Endpoints

#### `GET /streamer/campaigns/:campaignId/characters`
Récupère la liste des personnages (PJ uniquement) disponibles pour une campagne.

**Contrôleur** : `StreamerCampaignsController.getCharacters()`
```typescript
async getCharacters({ auth, params, response }: HttpContext) {
  const streamerId = auth.user!.streamer!.id

  // Vérifier que le streamer est membre de cette campagne
  const membership = await CampaignMembership.query()
    .where('campaign_id', params.campaignId)
    .where('streamer_id', streamerId)
    .firstOrFail()

  // Récupérer les personnages PJ de cette campagne
  const characters = await Character.query()
    .where('campaign_id', params.campaignId)
    .where('character_type', 'pc')
    .orderBy('name', 'asc')

  // Récupérer l'assignation actuelle du streamer
  const currentAssignment = await CharacterAssignment.query()
    .where('campaign_id', params.campaignId)
    .where('streamer_id', streamerId)
    .preload('character')
    .first()

  return response.ok({
    characters: characters.map(c => CharacterDto.fromModel(c)),
    currentCharacterId: currentAssignment?.characterId || null,
  })
}
```

#### `POST /streamer/campaigns/:campaignId/accept`
Accepte une invitation avec choix de personnage.

**Contrôleur** : `StreamerCampaignsController.acceptInvitation()`
```typescript
async acceptInvitation({ auth, params, request, response }: HttpContext) {
  const streamerId = auth.user!.streamer!.id
  const { characterId } = await request.validateUsing(acceptInvitationValidator)

  // Récupérer l'invitation
  const membership = await CampaignMembership.query()
    .where('campaign_id', params.campaignId)
    .where('streamer_id', streamerId)
    .where('status', 'PENDING')
    .firstOrFail()

  // Vérifier que le personnage existe et est bien un PJ de cette campagne
  const character = await Character.query()
    .where('id', characterId)
    .where('campaign_id', params.campaignId)
    .where('character_type', 'pc')
    .firstOrFail()

  // Transaction pour accepter + assigner
  await Database.transaction(async (trx) => {
    // 1. Accepter l'invitation
    membership.status = 'ACTIVE'
    membership.acceptedAt = DateTime.now()
    await membership.save()

    // 2. Créer l'assignation de personnage
    await CharacterAssignment.create({
      characterId,
      streamerId,
      campaignId: params.campaignId,
    })
  })

  return response.ok({ message: 'Invitation accepted and character assigned' })
}
```

#### `PUT /streamer/campaigns/:campaignId/character`
Modifie le personnage assigné (avec vérification poll actif).

**Contrôleur** : `StreamerCampaignsController.updateCharacter()`
```typescript
async updateCharacter({ auth, params, request, response }: HttpContext) {
  const streamerId = auth.user!.streamer!.id
  const { characterId } = await request.validateUsing(updateCharacterValidator)

  // Vérifier membership ACTIVE
  const membership = await CampaignMembership.query()
    .where('campaign_id', params.campaignId)
    .where('streamer_id', streamerId)
    .where('status', 'ACTIVE')
    .firstOrFail()

  // Vérifier qu'aucun poll n'est actif pour cette campagne
  const activePoll = await PollInstance.query()
    .where('campaign_id', params.campaignId)
    .where('status', 'RUNNING')
    .first()

  if (activePoll) {
    return response.badRequest({
      error: 'Cannot change character while a poll is active',
      pollId: activePoll.id,
    })
  }

  // Vérifier que le personnage existe
  const character = await Character.query()
    .where('id', characterId)
    .where('campaign_id', params.campaignId)
    .where('character_type', 'pc')
    .firstOrFail()

  // Mettre à jour ou créer l'assignation
  const assignment = await CharacterAssignment.query()
    .where('campaign_id', params.campaignId)
    .where('streamer_id', streamerId)
    .first()

  if (assignment) {
    assignment.characterId = characterId
    await assignment.save()
  } else {
    await CharacterAssignment.create({
      characterId,
      streamerId,
      campaignId: params.campaignId,
    })
  }

  return response.ok({ message: 'Character updated successfully' })
}
```

#### `GET /streamer/campaigns/:campaignId/settings`
Récupère les paramètres de la campagne pour le streamer.

**Contrôleur** : `StreamerCampaignsController.getSettings()`
```typescript
async getSettings({ auth, params, response }: HttpContext) {
  const streamerId = auth.user!.streamer!.id

  // Vérifier membership
  const membership = await CampaignMembership.query()
    .where('campaign_id', params.campaignId)
    .where('streamer_id', streamerId)
    .where('status', 'ACTIVE')
    .preload('campaign')
    .firstOrFail()

  // Récupérer l'assignation de personnage
  const assignment = await CharacterAssignment.query()
    .where('campaign_id', params.campaignId)
    .where('streamer_id', streamerId)
    .preload('character')
    .first()

  // Vérifier s'il y a un poll actif
  const hasActivePoll = await PollInstance.query()
    .where('campaign_id', params.campaignId)
    .where('status', 'RUNNING')
    .first()

  return response.ok({
    campaign: CampaignDto.fromModel(membership.campaign),
    assignedCharacter: assignment ? CharacterDto.fromModel(assignment.character) : null,
    canChangeCharacter: !hasActivePoll,
  })
}
```

### 2. Modification des Endpoints Existants

#### `GET /streamer/campaigns/invitations` (Modifier)
Ajouter la liste des personnages pour chaque invitation.

**Modification** dans `StreamerCampaignsController.getInvitations()`
```typescript
// Après avoir récupéré les invitations
for (const invitation of invitations) {
  // Charger les personnages PJ de la campagne
  const characters = await Character.query()
    .where('campaign_id', invitation.campaignId)
    .where('character_type', 'pc')
    .orderBy('name', 'asc')

  invitation.campaign.characters = characters.map(c => CharacterDto.fromModel(c))
}
```

### 3. Nouveau Service

**Fichier** : `backend/app/services/character_sync_service.ts`

```typescript
import Character from '#models/character'
import CharacterAssignment from '#models/character_assignment'
import { notificationService } from '#services/notification_service'
import logger from '@adonisjs/core/services/logger'

export class CharacterSyncService {
  /**
   * Synchronise les personnages d'une campagne depuis le VTT
   * et gère les désassignations automatiques
   */
  async syncCharactersFromVtt(
    campaignId: string,
    vttCharacters: VttCharacterData[]
  ): Promise<void> {
    // 1. Récupérer les personnages existants en BD
    const existingCharacters = await Character.query()
      .where('campaign_id', campaignId)
      .where('character_type', 'pc')

    const existingVttIds = existingCharacters.map(c => c.vttCharacterId)
    const incomingVttIds = vttCharacters.map(c => c.id)

    // 2. Identifier les personnages supprimés dans le VTT
    const deletedVttIds = existingVttIds.filter(id => !incomingVttIds.includes(id))

    // 3. Pour chaque personnage supprimé, désassigner et notifier
    for (const vttCharacterId of deletedVttIds) {
      const character = existingCharacters.find(c => c.vttCharacterId === vttCharacterId)
      if (!character) continue

      // Récupérer les assignations actives
      const assignments = await CharacterAssignment.query()
        .where('character_id', character.id)
        .preload('streamer', (query) => {
          query.preload('user')
        })
        .preload('campaign')

      // Désassigner et notifier chaque streamer
      for (const assignment of assignments) {
        await assignment.delete()

        // Créer notification
        await notificationService.createNotification({
          userId: assignment.streamer.user.id,
          type: 'CHARACTER_UNASSIGNED',
          title: 'Personnage supprimé',
          message: `Votre personnage "${character.name}" a été supprimé de la campagne "${assignment.campaign.name}". Veuillez choisir un nouveau personnage.`,
          data: {
            campaignId,
            characterId: character.id,
            characterName: character.name,
          },
        })

        logger.info(
          `Character unassigned: ${character.name} from streamer ${assignment.streamer.id}`
        )
      }

      // Supprimer le personnage de la BD
      await character.delete()
    }

    // 4. Mettre à jour ou créer les personnages existants/nouveaux
    for (const vttChar of vttCharacters) {
      await Character.updateOrCreate(
        {
          campaignId,
          vttCharacterId: vttChar.id,
        },
        {
          campaignId,
          vttCharacterId: vttChar.id,
          name: vttChar.name,
          avatarUrl: vttChar.avatarUrl,
          characterType: 'pc',
          lastSyncAt: DateTime.now(),
        }
      )
    }
  }
}

interface VttCharacterData {
  id: string
  name: string
  avatarUrl: string | null
}

export const characterSyncService = new CharacterSyncService()
```

### 4. Validation Schemas

**Fichier** : `backend/app/validators/streamer/accept_invitation_validator.ts`
```typescript
import { z } from 'zod'

export const acceptInvitationValidator = z.object({
  characterId: z.string().uuid(),
})
```

**Fichier** : `backend/app/validators/streamer/update_character_validator.ts`
```typescript
import { z } from 'zod'

export const updateCharacterValidator = z.object({
  characterId: z.string().uuid(),
})
```

### 5. Nouveau DTO

**Fichier** : `backend/app/dtos/character_dto.ts`
```typescript
import Character from '#models/character'

export class CharacterDto {
  id: string
  name: string
  avatarUrl: string | null
  characterType: 'pc' | 'npc'
  vttCharacterId: string

  static fromModel(character: Character): CharacterDto {
    return {
      id: character.id,
      name: character.name,
      avatarUrl: character.avatarUrl,
      characterType: character.characterType,
      vttCharacterId: character.vttCharacterId,
    }
  }

  static fromModelArray(characters: Character[]): CharacterDto[] {
    return characters.map(c => CharacterDto.fromModel(c))
  }
}
```

### 6. Nouvelles Routes

**Fichier** : `backend/start/routes.ts` (ajouts dans groupe /streamer)
```typescript
// Dans le groupe /streamer
router.get('/campaigns/:campaignId/characters', '#controllers/streamer/campaigns_controller.getCharacters')
router.post('/campaigns/:campaignId/accept', '#controllers/streamer/campaigns_controller.acceptInvitation')
router.get('/campaigns/:campaignId/settings', '#controllers/streamer/campaigns_controller.getSettings')
router.put('/campaigns/:campaignId/character', '#controllers/streamer/campaigns_controller.updateCharacter')
```

## Modifications Frontend

### 1. Nouveau Composable

**Fichier** : `frontend/composables/useCampaignCharacters.ts`
```typescript
import { ref } from 'vue'

export const useCampaignCharacters = () => {
  const characters = ref<Character[]>([])
  const currentCharacterId = ref<string | null>(null)
  const loading = ref(false)

  const fetchCharacters = async (campaignId: string) => {
    loading.value = true
    try {
      const config = useRuntimeConfig()
      const response = await fetch(
        `${config.public.apiBase}/streamer/campaigns/${campaignId}/characters`,
        { credentials: 'include' }
      )

      if (!response.ok) throw new Error('Failed to fetch characters')

      const data = await response.json()
      characters.value = data.characters
      currentCharacterId.value = data.currentCharacterId
    } catch (error) {
      console.error('Failed to fetch characters:', error)
      characters.value = []
      currentCharacterId.value = null
    } finally {
      loading.value = false
    }
  }

  const acceptInvitation = async (campaignId: string, characterId: string) => {
    const config = useRuntimeConfig()
    const response = await fetch(
      `${config.public.apiBase}/streamer/campaigns/${campaignId}/accept`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to accept invitation')
    }

    return response.json()
  }

  const updateCharacter = async (campaignId: string, characterId: string) => {
    const config = useRuntimeConfig()
    const response = await fetch(
      `${config.public.apiBase}/streamer/campaigns/${campaignId}/character`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update character')
    }

    return response.json()
  }

  return {
    characters,
    currentCharacterId,
    loading,
    fetchCharacters,
    acceptInvitation,
    updateCharacter,
  }
}

interface Character {
  id: string
  name: string
  avatarUrl: string | null
  characterType: 'pc' | 'npc'
  vttCharacterId: string
}
```

### 2. Nouveau Composant : Modal de Sélection de Personnage

**Fichier** : `frontend/components/streamer/CharacterSelectionModal.vue`
```vue
<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="bg-primary-light p-2 rounded-lg">
          <UIcon name="i-lucide-user-circle" class="size-6 text-primary-500" />
        </div>
        <h3 class="text-xl font-bold text-primary">
          {{ title }}
        </h3>
      </div>
    </template>

    <template #body>
      <div class="space-y-6">
        <p class="text-secondary">
          {{ description }}
        </p>

        <!-- Liste des personnages -->
        <div v-if="characters.length > 0" class="space-y-3">
          <div
            v-for="character in characters"
            :key="character.id"
            class="flex items-center gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer hover:border-primary-500"
            :class="{
              'border-primary-500 bg-primary-50': selectedCharacterId === character.id,
              'border-gray-200': selectedCharacterId !== character.id,
            }"
            @click="selectedCharacterId = character.id"
          >
            <!-- Avatar -->
            <div class="shrink-0">
              <img
                v-if="character.avatarUrl"
                :src="character.avatarUrl"
                :alt="character.name"
                class="size-12 rounded-full object-cover"
              />
              <div
                v-else
                class="size-12 rounded-full bg-primary-100 flex items-center justify-center"
              >
                <UIcon name="i-lucide-user" class="size-6 text-primary-500" />
              </div>
            </div>

            <!-- Info -->
            <div class="flex-1">
              <h4 class="font-semibold text-primary">{{ character.name }}</h4>
              <p class="text-sm text-muted">Personnage joueur</p>
            </div>

            <!-- Radio indicator -->
            <div class="shrink-0">
              <div
                class="size-6 rounded-full border-2 flex items-center justify-center"
                :class="{
                  'border-primary-500 bg-primary-500': selectedCharacterId === character.id,
                  'border-gray-300': selectedCharacterId !== character.id,
                }"
              >
                <UIcon
                  v-if="selectedCharacterId === character.id"
                  name="i-lucide-check"
                  class="size-4 text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="py-12 text-center">
          <UIcon name="i-lucide-users-round" class="size-16 text-muted mx-auto mb-4" />
          <p class="text-muted">Aucun personnage disponible dans cette campagne</p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-3 justify-end">
        <UButton
          color="neutral"
          variant="soft"
          label="Annuler"
          @click="handleCancel"
        />
        <UButton
          color="primary"
          :label="confirmLabel"
          :disabled="!selectedCharacterId || characters.length === 0"
          :loading="loading"
          @click="handleConfirm"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Character {
  id: string
  name: string
  avatarUrl: string | null
  characterType: 'pc' | 'npc'
}

const props = defineProps<{
  modelValue: boolean
  characters: Character[]
  currentCharacterId?: string | null
  title?: string
  description?: string
  confirmLabel?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': [characterId: string]
  'cancel': []
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const selectedCharacterId = ref<string | null>(props.currentCharacterId || null)

watch(() => props.currentCharacterId, (newValue) => {
  selectedCharacterId.value = newValue || null
})

const handleConfirm = () => {
  if (selectedCharacterId.value) {
    emit('confirm', selectedCharacterId.value)
  }
}

const handleCancel = () => {
  emit('cancel')
  isOpen.value = false
}
</script>
```

### 3. Modification de la Page Invitations

**Fichier** : `frontend/pages/streamer/campaigns.vue` (modifications)

Ajouter dans le script :
```typescript
import { useCampaignCharacters } from '@/composables/useCampaignCharacters'

const { characters, fetchCharacters, acceptInvitation } = useCampaignCharacters()

const showAcceptModal = ref(false)
const selectedInvitation = ref<any>(null)
const acceptLoading = ref(false)

const handleAcceptClick = async (invitation: any) => {
  selectedInvitation.value = invitation
  await fetchCharacters(invitation.campaign.id)
  showAcceptModal.value = true
}

const handleConfirmAccept = async (characterId: string) => {
  acceptLoading.value = true
  try {
    await acceptInvitation(selectedInvitation.value.campaign.id, characterId)

    toast.add({
      title: 'Invitation acceptée',
      description: 'Vous avez rejoint la campagne avec succès',
      color: 'success',
    })

    showAcceptModal.value = false
    await loadInvitations() // Recharger la liste
  } catch (error) {
    toast.add({
      title: 'Erreur',
      description: error.message,
      color: 'error',
    })
  } finally {
    acceptLoading.value = false
  }
}
```

Modifier le bouton Accepter dans le template :
```vue
<button
  class="..."
  @click="handleAcceptClick(invitation)"
>
  <UIcon name="i-lucide-check" class="size-5" />
  <span>Accepter</span>
</button>

<!-- Ajouter le modal en bas du template -->
<StreamerCharacterSelectionModal
  v-model="showAcceptModal"
  :characters="characters"
  :loading="acceptLoading"
  title="Choisir votre personnage"
  description="Sélectionnez le personnage que vous allez jouer dans cette campagne."
  confirm-label="Accepter et rejoindre"
  @confirm="handleConfirmAccept"
  @cancel="showAcceptModal = false"
/>
```

### 4. Modification de la Liste des Campagnes Actives

**Fichier** : `frontend/pages/streamer/campaigns.vue` (suite)

Ajouter un bouton "Paramètres" sur chaque carte de campagne active :

```vue
<!-- Dans la section "Autorisations" -->
<div class="space-y-4">
  <div
    v-for="campaign in authorizationStatuses"
    :key="campaign.campaignId"
    class="p-4 rounded-lg bg-neutral-100"
  >
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-semibold text-primary">{{ campaign.campaignName }}</h3>

      <!-- NOUVEAU : Bouton Paramètres -->
      <UButton
        color="neutral"
        variant="soft"
        size="sm"
        icon="i-lucide-settings"
        label="Paramètres"
        :to="`/streamer/campaigns/${campaign.campaignId}/settings`"
      />
    </div>

    <!-- ... reste du contenu existant ... -->
  </div>
</div>
```

### 5. Nouvelle Page : Paramètres de Campagne

**Fichier** : `frontend/pages/streamer/campaigns/[id]/settings.vue` (NOUVEAU)

```vue
<template>
  <div class="min-h-screen">
    <div class="max-w-300 mx-auto space-y-6">
      <!-- Header -->
      <UCard>
        <div class="flex items-center gap-4">
          <UButton
            color="neutral"
            variant="soft"
            size="xl"
            square
            class="group"
            @click="router.push('/streamer/campaigns')"
          >
            <template #leading>
              <UIcon
                name="i-lucide-arrow-left"
                class="size-12 transition-transform duration-200 group-hover:-translate-x-1"
              />
            </template>
          </UButton>
          <div>
            <h1 class="text-3xl font-bold text-primary">
              Paramètres de campagne
            </h1>
            <p v-if="campaign" class="text-muted mt-1">
              {{ campaign.name }}
            </p>
          </div>
        </div>
      </UCard>

      <!-- Loading State -->
      <UCard v-if="loading">
        <div class="flex items-center justify-center py-12">
          <UIcon
            name="i-lucide-loader-circle"
            class="size-12 text-primary animate-spin"
          />
        </div>
      </UCard>

      <!-- Settings Content -->
      <template v-else-if="campaign">
        <!-- Section : Mon Personnage -->
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold text-primary">Mon personnage</h2>
          </template>

          <!-- Personnage assigné -->
          <div v-if="assignedCharacter" class="space-y-6">
            <div class="flex items-center gap-4 p-4 rounded-lg bg-primary-50">
              <!-- Avatar -->
              <div class="shrink-0">
                <img
                  v-if="assignedCharacter.avatarUrl"
                  :src="assignedCharacter.avatarUrl"
                  :alt="assignedCharacter.name"
                  class="size-16 rounded-full object-cover"
                />
                <div
                  v-else
                  class="size-16 rounded-full bg-primary-100 flex items-center justify-center"
                >
                  <UIcon name="i-lucide-user" class="size-8 text-primary-500" />
                </div>
              </div>

              <!-- Info -->
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-primary">
                  {{ assignedCharacter.name }}
                </h3>
                <p class="text-sm text-muted">Personnage joueur</p>
              </div>
            </div>

            <!-- Bouton Changer -->
            <div>
              <UButton
                color="primary"
                variant="soft"
                icon="i-lucide-refresh-cw"
                label="Changer de personnage"
                :disabled="!canChangeCharacter"
                @click="handleChangeCharacter"
              />

              <UAlert
                v-if="!canChangeCharacter"
                color="warning"
                variant="soft"
                icon="i-lucide-alert-circle"
                class="mt-4"
                title="Changement impossible"
                description="Vous ne pouvez pas changer de personnage pendant qu'un sondage est actif."
              />
            </div>
          </div>

          <!-- Aucun personnage assigné -->
          <div v-else class="py-12 text-center space-y-6">
            <div>
              <UIcon
                name="i-lucide-user-x"
                class="size-16 text-muted mx-auto mb-4"
              />
              <h3 class="text-xl font-semibold text-primary mb-2">
                Aucun personnage assigné
              </h3>
              <p class="text-muted max-w-md mx-auto">
                Vous devez choisir un personnage pour participer aux sondages de cette campagne.
              </p>
            </div>

            <UButton
              color="primary"
              icon="i-lucide-user-plus"
              label="Choisir un personnage"
              size="lg"
              @click="handleChangeCharacter"
            />
          </div>
        </UCard>
      </template>
    </div>

    <!-- Modal de sélection de personnage -->
    <StreamerCharacterSelectionModal
      v-model="showCharacterModal"
      :characters="characters"
      :current-character-id="assignedCharacter?.id"
      :loading="updateLoading"
      title="Changer de personnage"
      description="Sélectionnez le personnage que vous souhaitez jouer dans cette campagne."
      confirm-label="Confirmer le changement"
      @confirm="handleConfirmChange"
      @cancel="showCharacterModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCampaignCharacters } from '@/composables/useCampaignCharacters'
import { useToast } from '@nuxt/ui'

definePageMeta({
  layout: 'authenticated',
  middleware: ['auth'],
})

const router = useRouter()
const route = useRoute()
const toast = useToast()
const config = useRuntimeConfig()

const {
  characters,
  fetchCharacters,
  updateCharacter,
} = useCampaignCharacters()

const campaign = ref<any>(null)
const assignedCharacter = ref<any>(null)
const canChangeCharacter = ref(true)
const loading = ref(true)
const showCharacterModal = ref(false)
const updateLoading = ref(false)

onMounted(async () => {
  await loadSettings()
})

const loadSettings = async () => {
  loading.value = true
  try {
    const response = await fetch(
      `${config.public.apiBase}/streamer/campaigns/${route.params.id}/settings`,
      { credentials: 'include' }
    )

    if (!response.ok) throw new Error('Failed to load settings')

    const data = await response.json()
    campaign.value = data.campaign
    assignedCharacter.value = data.assignedCharacter
    canChangeCharacter.value = data.canChangeCharacter
  } catch (error) {
    console.error('Failed to load settings:', error)
    toast.add({
      title: 'Erreur',
      description: 'Impossible de charger les paramètres',
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}

const handleChangeCharacter = async () => {
  if (!canChangeCharacter.value) return

  await fetchCharacters(route.params.id as string)
  showCharacterModal.value = true
}

const handleConfirmChange = async (characterId: string) => {
  updateLoading.value = true
  try {
    await updateCharacter(route.params.id as string, characterId)

    toast.add({
      title: 'Personnage modifié',
      description: 'Votre personnage a été mis à jour avec succès',
      color: 'success',
    })

    showCharacterModal.value = false
    await loadSettings() // Recharger les paramètres
  } catch (error) {
    toast.add({
      title: 'Erreur',
      description: error.message,
      color: 'error',
    })
  } finally {
    updateLoading.value = false
  }
}
</script>
```

### 6. Type Definitions

**Fichier** : `frontend/types/character.d.ts` (NOUVEAU)
```typescript
export interface Character {
  id: string
  name: string
  avatarUrl: string | null
  characterType: 'pc' | 'npc'
  vttCharacterId: string
}

export interface CharacterAssignment {
  id: string
  characterId: string
  streamerId: string
  campaignId: string
  assignedAt: string
  character?: Character
}
```

## Intégration avec l'Import de Campagne

### Modification de VttImportService

Dans `backend/app/services/vtt/vtt_import_service.ts`, la section d'import des personnages est déjà en place (lignes 37-55 dans le plan initial).

S'assurer que :
1. Les personnages de type 'pc' sont bien importés
2. Les personnages de type 'npc' ne sont PAS importés (ou importés séparément)

## Tests à Effectuer

### Test 1 : Acceptation d'invitation avec personnage
1. GM invite un streamer à une campagne contenant des PJ
2. Streamer reçoit notification
3. Streamer va sur /streamer/campaigns
4. Clic sur "Accepter"
5. Modal s'ouvre avec liste des personnages
6. Streamer sélectionne un personnage
7. Clic "Accepter et rejoindre"
8. Vérifier que l'invitation passe à ACTIVE
9. Vérifier que CharacterAssignment est créé en BD

### Test 2 : Changement de personnage (sans poll actif)
1. Streamer a une campagne active avec personnage assigné
2. Aller sur /streamer/campaigns/:id/settings
3. Vérifier affichage du personnage actuel
4. Clic "Changer de personnage"
5. Modal s'ouvre
6. Sélectionner un autre personnage
7. Confirmer
8. Vérifier que CharacterAssignment est mis à jour

### Test 3 : Blocage changement avec poll actif
1. GM lance un poll sur la campagne
2. Streamer tente de changer de personnage
3. Vérifier que le bouton est désactivé
4. Vérifier message d'avertissement
5. GM termine le poll
6. Vérifier que le bouton redevient actif

### Test 4 : Désassignation automatique
1. Streamer a un personnage assigné
2. GM supprime ce personnage dans le VTT
3. Sync VTT déclenché
4. Vérifier que CharacterAssignment est supprimé
5. Vérifier que notification est créée
6. Streamer reçoit la notification
7. Aller sur /streamer/campaigns/:id/settings
8. Vérifier affichage "Aucun personnage assigné"

### Test 5 : Acceptation sans personnages disponibles
1. GM invite streamer à une campagne sans PJ
2. Streamer tente d'accepter
3. Modal s'ouvre avec message "Aucun personnage disponible"
4. Vérifier que bouton "Accepter" est désactivé

## Ordre d'Implémentation Recommandé

### Phase 1 : Backend Foundation
1. Créer CharacterDto
2. Créer validation schemas
3. Implémenter CharacterSyncService
4. Ajouter méthodes dans StreamerCampaignsController
5. Ajouter routes

### Phase 2 : Backend Testing
1. Tests unitaires pour CharacterSyncService
2. Tests fonctionnels pour les endpoints

### Phase 3 : Frontend Components
1. Créer useCampaignCharacters composable
2. Créer CharacterSelectionModal component
3. Créer types TypeScript

### Phase 4 : Frontend Pages
1. Modifier page /streamer/campaigns (modal d'acceptation)
2. Créer page /streamer/campaigns/[id]/settings
3. Ajouter boutons "Paramètres" sur les cartes

### Phase 5 : Intégration & Tests
1. Tests end-to-end
2. Tests de synchronisation VTT
3. Tests de notifications

### Phase 6 : Polish
1. Animations et transitions
2. Messages d'erreur clairs
3. États de chargement
4. Responsive design

## Fichiers à Créer

### Backend (5 nouveaux fichiers)
- `backend/app/services/character_sync_service.ts`
- `backend/app/dtos/character_dto.ts`
- `backend/app/validators/streamer/accept_invitation_validator.ts`
- `backend/app/validators/streamer/update_character_validator.ts`
- `backend/tests/functional/streamer/character_assignment.spec.ts` (optionnel)

### Frontend (4 nouveaux fichiers)
- `frontend/composables/useCampaignCharacters.ts`
- `frontend/components/streamer/CharacterSelectionModal.vue`
- `frontend/pages/streamer/campaigns/[id]/settings.vue`
- `frontend/types/character.d.ts`

## Fichiers à Modifier

### Backend (3 fichiers)
- `backend/app/controllers/streamer/campaigns_controller.ts` - Ajouter 4 nouvelles méthodes
- `backend/start/routes.ts` - Ajouter 4 nouvelles routes
- `backend/app/services/vtt/vtt_import_service.ts` - Vérifier import des PJ

### Frontend (2 fichiers)
- `frontend/pages/streamer/campaigns.vue` - Ajouter modal d'acceptation + boutons paramètres
- `frontend/composables/useVttConnections.ts` - Potentiellement ajouter gestion des personnages

## Notes Importantes

### Sécurité
- Toujours vérifier que le streamer est membre de la campagne avant toute opération
- Vérifier que le personnage appartient bien à la campagne
- Vérifier qu'aucun poll n'est actif avant de permettre le changement

### Performance
- Charger les personnages seulement quand nécessaire (modal ouvert)
- Utiliser des index sur character_assignments (campaignId, streamerId)
- Mettre en cache la liste des personnages côté frontend

### UX
- Messages clairs quand pas de personnages disponibles
- Feedback immédiat lors du changement
- Animations fluides pour les modals
- Responsive design pour mobile

### Notifications
- Notification push quand personnage désassigné
- Toast de confirmation après changement
- Badge sur la page campagnes si aucun personnage assigné
