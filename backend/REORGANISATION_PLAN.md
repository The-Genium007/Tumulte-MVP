# Plan de Reorganisation du Backend Tumulte

**Date**: 2026-01-24
**Statut**: En attente de validation

---

## Resume Executif

Apres analyse complete du backend (143 fichiers TypeScript, ~22 000 lignes de code), voici les problemes identifies et les solutions proposees pour ameliorer la maintenabilite et la clarte de la structure.

---

## 1. Nettoyage Immediat (Priorite Haute)

### 1.1 Supprimer les repertoires vides

| Repertoire | Action |
|------------|--------|
| `app/controllers/shared/` | Supprimer |
| `app/validators/support/` | Supprimer |
| `app/dtos/twitch/` | Supprimer |

### 1.2 Supprimer le fichier backup orphelin

```
start/routes.ts.backup → Supprimer
```

**Verification effectuee**: Ce fichier est la seule reference au `AuthController` legacy.

### 1.3 Fichier deprecie - CONFIRME SUPPRIMABLE

Le fichier `app/controllers/auth_controller.ts` (328 lignes) contient du code OAuth Twitch legacy.

**Verification effectuee**:
- Le `routes.ts` actuel utilise `OAuthController` et `LoginController` depuis `#controllers/auth/`
- L'ancien `AuthController` n'est reference QUE dans `routes.ts.backup`
- **Action**: Supprimer sans risque

---

## 2. Consolidation des DTOs (Priorite Haute)

### Probleme
5 fichiers de re-export de 3 lignes chacun qui n'apportent aucune valeur :

| Fichier | Contenu actuel |
|---------|----------------|
| `dtos/polls/poll_instance_dto.ts` | `export { PollInstanceDto } from './poll_dto.js'` |
| `dtos/polls/poll_results_dto.ts` | `export { PollResultsDto } from './poll_dto.js'` |
| `dtos/polls/poll_template_dto.ts` | `export { PollTemplateDto } from './poll_dto.js'` |
| `dtos/campaigns/campaign_detail_dto.ts` | `export { CampaignDetailDto } from './campaign_dto.js'` |
| `dtos/campaigns/campaign_invitation_dto.ts` | `export { CampaignInvitationDto } from './campaign_dto.js'` |

### Fichiers a mettre a jour (5 imports trouves)

```typescript
// mj/polls_controller.ts - 2 imports a changer
- import { PollInstanceDto } from '#dtos/polls/poll_instance_dto'
- import { PollResultsDto } from '#dtos/polls/poll_results_dto'
+ import { PollInstanceDto, PollResultsDto } from '#dtos/polls/poll_dto'

// mj/campaigns_controller.ts - 2 imports a changer
- import { CampaignDetailDto } from '#dtos/campaigns/campaign_detail_dto'
- import { CampaignInvitationDto } from '#dtos/campaigns/campaign_invitation_dto'
+ import { CampaignDetailDto, CampaignInvitationDto } from '#dtos/campaigns/campaign_dto'

// streamer/campaigns_controller.ts - 1 import a changer
- import { CampaignInvitationDto } from '#dtos/campaigns/campaign_invitation_dto'
+ import { CampaignInvitationDto } from '#dtos/campaigns/campaign_dto'
```

---

## 3. Consolidation des Validators (Priorite Moyenne)

### Probleme decouvert : DOUBLON

Le fichier `campaigns/update_campaign_validator.ts` est un **doublon inutilise** !
- `create_campaign_validator.ts` contient deja `updateCampaignSchema`
- `update_campaign_validator.ts` a 0 references dans le code

### Structure actuelle vs proposee

```
AVANT (15 fichiers)                          APRES (6 fichiers)
validators/                                   validators/
├── auth/                                     ├── auth/
│   └── auth_validators.ts (VineJS)          │   └── auth_validators.ts (→ Zod)
├── campaigns/                                ├── campaigns/
│   ├── create_campaign_validator.ts         │   └── campaign_validators.ts (fusionner 4)
│   ├── update_campaign_validator.ts ⚠️      │
│   ├── invite_streamer_validator.ts         │
│   └── import_campaign_validator.ts (VineJS)│
├── polls/                                    ├── polls/
│   ├── poll_validator.ts                    │   └── poll_validators.ts (fusionner 4)
│   ├── add_poll_validator.ts                │
│   ├── launch_poll_validator.ts             │
│   └── create_poll_session_validator.ts     │
├── streamer/                                 ├── streamer/
│   ├── accept_invitation_validator.ts       │   └── streamer_validators.ts (fusionner 3)
│   ├── update_character_validator.ts        │
│   └── update_overlay_validator.ts          │
├── notifications/                            ├── notifications/
│   ├── update_preferences_validator.ts      │   └── notification_validators.ts (fusionner 2)
│   └── subscribe_push_validator.ts          │
├── overlay-studio/                           ├── overlay-studio/
│   └── overlay_config_validator.ts          │   └── overlay_config_validator.ts ✓ (garder)
└── support/ (VIDE)                           └── (supprime)

⚠️ = doublon/inutilise
```

### Exemple concret : `campaigns/campaign_validators.ts`

```typescript
import { z } from 'zod'

// ========================================
// CREATE CAMPAIGN
// ========================================
export const createCampaignSchema = z.object({
  name: z
    .string()
    .min(3, 'Le nom doit contenir au moins 3 caracteres')
    .max(100, 'Le nom ne peut pas depasser 100 caracteres'),
  description: z
    .string()
    .max(500, 'La description ne peut pas depasser 500 caracteres')
    .optional()
    .nullable(),
})
export type CreateCampaignDto = z.infer<typeof createCampaignSchema>

// ========================================
// UPDATE CAMPAIGN
// ========================================
export const updateCampaignSchema = z.object({
  name: z
    .string()
    .min(3, 'Le nom doit contenir au moins 3 caracteres')
    .max(100, 'Le nom ne peut pas depasser 100 caracteres')
    .optional(),
  description: z
    .string()
    .max(500, 'La description ne peut pas depasser 500 caracteres')
    .optional()
    .nullable(),
})
export type UpdateCampaignDto = z.infer<typeof updateCampaignSchema>

// ========================================
// INVITE STREAMER
// ========================================
export const inviteStreamerSchema = z.object({
  twitch_user_id: z
    .string()
    .min(1, "L'ID utilisateur Twitch est requis")
    .regex(/^\d+$/, "L'ID utilisateur Twitch doit etre numerique"),
  twitch_login: z
    .string()
    .min(1, 'Le login Twitch est requis')
    .regex(/^[a-zA-Z0-9_]+$/, 'Le login Twitch contient des caracteres invalides'),
  twitch_display_name: z.string().min(1, "Le nom d'affichage Twitch est requis"),
  profile_image_url: z.string().url().optional().nullable(),
})
export type InviteStreamerDto = z.infer<typeof inviteStreamerSchema>

// ========================================
// IMPORT CAMPAIGN (VTT) - Converti depuis VineJS
// ========================================
export const importCampaignSchema = z.object({
  vttConnectionId: z.string().uuid(),
  vttCampaignId: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
})
export type ImportCampaignDto = z.infer<typeof importCampaignSchema>
```

### Exemple concret : `streamer/streamer_validators.ts`

```typescript
import { z } from 'zod'

// ========================================
// ACCEPT INVITATION
// ========================================
export const acceptInvitationSchema = z.object({
  characterId: z.string().uuid('ID de personnage invalide'),
})
export type AcceptInvitationDto = z.infer<typeof acceptInvitationSchema>

// ========================================
// UPDATE CHARACTER
// ========================================
export const updateCharacterSchema = z.object({
  characterId: z.string().uuid('ID de personnage invalide'),
})
export type UpdateCharacterDto = z.infer<typeof updateCharacterSchema>

// ========================================
// UPDATE OVERLAY
// ========================================
export const updateOverlaySchema = z.object({
  overlayConfigId: z.string().uuid('ID de configuration invalide').nullable(),
})
export type UpdateOverlayDto = z.infer<typeof updateOverlaySchema>
```

### Exemple concret : `polls/poll_validators.ts`

```typescript
import { z } from 'zod'

// ========================================
// CREATE POLL
// ========================================
export const createPollSchema = z.object({
  question: z.string().min(1, 'La question est requise').max(45, 'Maximum 45 caracteres'),
  options: z
    .array(z.string().min(1).max(25))
    .min(2, 'Minimum 2 options')
    .max(5, 'Maximum 5 options'),
  type: z.enum(['UNIQUE', 'STANDARD']).default('STANDARD'),
  durationSeconds: z.number().int().min(15).max(1800).default(60),
  channelPointsAmount: z.number().int().positive().optional().nullable(),
})
export type CreatePollDto = z.infer<typeof createPollSchema>

// ========================================
// UPDATE POLL
// ========================================
export const updatePollSchema = z.object({
  question: z.string().min(1).max(45).optional(),
  options: z.array(z.string().min(1).max(25)).min(2).max(5).optional(),
  type: z.enum(['UNIQUE', 'STANDARD']).optional(),
  durationSeconds: z.number().int().min(15).max(1800).optional(),
  channelPointsAmount: z.number().int().positive().optional().nullable(),
})
export type UpdatePollDto = z.infer<typeof updatePollSchema>

// ========================================
// ADD POLL (to session)
// ========================================
export const addPollSchema = z.object({
  question: z.string().min(1, 'La question est requise').max(60, 'Maximum 60 caracteres'),
  options: z
    .array(z.string().min(1).max(25))
    .min(2, 'Minimum 2 options')
    .max(5, 'Maximum 5 options'),
  type: z.enum(['UNIQUE', 'STANDARD']).default('STANDARD'),
  channelPointsPerVote: z.number().int().positive().optional().nullable(),
})
export type AddPollDto = z.infer<typeof addPollSchema>

// ========================================
// LAUNCH POLL
// ========================================
export const launchPollSchema = z.object({
  title: z.string().min(1).max(60),
  options: z.array(z.string()).min(2).max(5),
  durationSeconds: z.number().int().min(15).max(1800).optional(),
  templateId: z.string().uuid().optional().nullable(),
  type: z.enum(['UNIQUE', 'STANDARD']).optional(),
  channelPointsEnabled: z.boolean().optional(),
  channelPointsAmount: z.number().int().min(1).max(1000000).optional().nullable(),
})
export type LaunchPollDto = z.infer<typeof launchPollSchema>

// ========================================
// CREATE POLL SESSION
// ========================================
export const createPollSessionSchema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caracteres').max(100),
  defaultDurationSeconds: z
    .number()
    .int()
    .min(15, 'Duree minimum: 15 secondes')
    .max(1800, 'Duree maximum: 30 minutes')
    .optional()
    .default(60),
})
export type CreatePollSessionDto = z.infer<typeof createPollSessionSchema>
```

### Exemple concret : `notifications/notification_validators.ts`

```typescript
import { z } from 'zod'

// ========================================
// UPDATE PREFERENCES
// ========================================
export const updatePreferencesSchema = z.object({
  pushEnabled: z.boolean().optional(),
  campaignInvitations: z.boolean().optional(),
  criticalAlerts: z.boolean().optional(),
  pollStarted: z.boolean().optional(),
  pollEnded: z.boolean().optional(),
  campaignMemberJoined: z.boolean().optional(),
  sessionReminder: z.boolean().optional(),
  tokenRefreshFailed: z.boolean().optional(),
  sessionActionRequired: z.boolean().optional(),
})
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>

// ========================================
// SUBSCRIBE PUSH
// ========================================
export const subscribePushSchema = z.object({
  endpoint: z.string().url('URL endpoint invalide'),
  keys: z.object({
    p256dh: z.string().min(1, 'La cle p256dh est requise'),
    auth: z.string().min(1, 'La cle auth est requise'),
  }),
  deviceName: z.string().max(100, 'Le nom ne peut pas depasser 100 caracteres').optional(),
})
export type SubscribePushInput = z.infer<typeof subscribePushSchema>

// ========================================
// UNSUBSCRIBE PUSH
// ========================================
export const unsubscribePushSchema = z.object({
  endpoint: z.string().url('URL endpoint invalide'),
})
export type UnsubscribePushInput = z.infer<typeof unsubscribePushSchema>
```

---

## 4. Migration VineJS → Zod (Priorite Moyenne)

### Contexte

Le backend utilise actuellement **2 librairies de validation** :

| Librairie | Version | Fichiers | Usage |
|-----------|---------|----------|-------|
| **Zod** | ^4.3.5 | 12 fichiers (86%) | Majorite du code |
| **VineJS** | ^4.2.0 | 2 fichiers (14%) | Auth + Import Campaign |

### Problemes

1. **2 dependances** pour la meme fonctionnalite
2. **2 patterns d'utilisation** differents dans le code
3. **Confusion** pour les developpeurs

### Fichiers VineJS a convertir

#### 4.1 `validators/auth/auth_validators.ts` (7 schemas)

**AVANT (VineJS):**
```typescript
import vine from '@vinejs/vine'

export const registerValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
    password: vine.string().minLength(8).maxLength(100),
    displayName: vine.string().minLength(2).maxLength(50).trim(),
  })
)

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
    password: vine.string().minLength(1),
    rememberMe: vine.boolean().optional(),
  })
)

export const forgotPasswordValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
  })
)

export const resetPasswordValidator = vine.compile(
  vine.object({
    token: vine.string().minLength(64).maxLength(64),
    password: vine.string().minLength(8).maxLength(100),
  })
)

export const verifyEmailValidator = vine.compile(
  vine.object({
    token: vine.string().minLength(64).maxLength(64),
  })
)

export const changePasswordValidator = vine.compile(
  vine.object({
    currentPassword: vine.string().minLength(1),
    newPassword: vine.string().minLength(8).maxLength(100),
  })
)

export const setPasswordValidator = vine.compile(
  vine.object({
    password: vine.string().minLength(8).maxLength(100),
  })
)
```

**APRES (Zod):**
```typescript
import { z } from 'zod'

// ========================================
// REGISTER
// ========================================
export const registerSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(100),
  displayName: z.string().min(2).max(50).trim(),
})
export type RegisterDto = z.infer<typeof registerSchema>

// ========================================
// LOGIN
// ========================================
export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
})
export type LoginDto = z.infer<typeof loginSchema>

// ========================================
// FORGOT PASSWORD
// ========================================
export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
})
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>

// ========================================
// RESET PASSWORD
// ========================================
export const resetPasswordSchema = z.object({
  token: z.string().length(64),
  password: z.string().min(8).max(100),
})
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>

// ========================================
// VERIFY EMAIL
// ========================================
export const verifyEmailSchema = z.object({
  token: z.string().length(64),
})
export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>

// ========================================
// CHANGE PASSWORD
// ========================================
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
})
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>

// ========================================
// SET PASSWORD
// ========================================
export const setPasswordSchema = z.object({
  password: z.string().min(8).max(100),
})
export type SetPasswordDto = z.infer<typeof setPasswordSchema>
```

#### 4.2 `validators/campaigns/import_campaign_validator.ts`

**AVANT (VineJS):**
```typescript
import vine from '@vinejs/vine'

export const importCampaignValidator = vine.compile(
  vine.object({
    vttConnectionId: vine.string().uuid(),
    vttCampaignId: vine.string().minLength(1),
    name: vine.string().minLength(1).maxLength(255),
    description: vine.string().maxLength(1000).optional(),
  })
)
```

**APRES (Zod):** → Integre dans `campaign_validators.ts` (voir section 3)

### Controllers a mettre a jour

Les controllers utilisant `request.validateUsing()` (methode VineJS) doivent etre mis a jour pour utiliser le middleware Zod :

| Controller | Methode actuelle | Nouvelle methode |
|------------|------------------|------------------|
| `auth/login_controller.ts` | `request.validateUsing(loginValidator)` | `validateRequest(loginSchema)` |
| `auth/register_controller.ts` | `request.validateUsing(registerValidator)` | `validateRequest(registerSchema)` |
| `auth/password_controller.ts` | `request.validateUsing(...)` x4 | `validateRequest(...)` x4 |
| `auth/verification_controller.ts` | `request.validateUsing(verifyEmailValidator)` | `validateRequest(verifyEmailSchema)` |
| `mj/campaigns_controller.ts` | `request.validateUsing(importCampaignValidator)` | `validateRequest(importCampaignSchema)` |

**Exemple de mise a jour du controller :**

```typescript
// AVANT (VineJS)
import { loginValidator } from '#validators/auth/auth_validators'

async handle({ request, response, auth }: HttpContext) {
  const data = await request.validateUsing(loginValidator)
  // ...
}

// APRES (Zod)
import { loginSchema } from '#validators/auth/auth_validators'
import { validateRequest } from '#middleware/validate_middleware'

async handle({ request, response, auth }: HttpContext) {
  await validateRequest(loginSchema)({ request, response } as HttpContext, async () => {})
  const data = request.all() as LoginDto
  // ...
}
```

### Suppression de la dependance VineJS

Apres migration, supprimer VineJS du projet :

```bash
cd backend
npm uninstall @vinejs/vine
```

---

## 5. Organisation des Services (Priorite Moyenne)

### Probleme actuel
Mix de services a la racine et dans des sous-dossiers :

```
services/
├── poll_service.ts              (racine - 400 lignes)
├── health_check_service.ts      (racine - 413 lignes)
├── support_report_service.ts    (racine - 514 lignes)
├── github_issue_service.ts      (racine)
├── github_discussion_service.ts (racine)
├── polls/                       (sous-dossier)
├── campaigns/                   (sous-dossier)
├── twitch/                      (sous-dossier)
└── ...
```

### Solution
Deplacer les services orphelins a la racine vers des sous-dossiers appropries :

| Fichier actuel | Destination |
|----------------|-------------|
| `poll_service.ts` | `polls/poll_orchestration_service.ts` |
| `github_issue_service.ts` | `support/github_issue_service.ts` |
| `github_discussion_service.ts` | `support/github_discussion_service.ts` |
| `support_report_service.ts` | `support/support_report_service.ts` |
| `health_check_service.ts` | `core/health_check_service.ts` |

### Structure finale proposee

```
services/
├── auth/                    (7 fichiers - OK)
├── cache/                   (1 fichier - OK)
├── campaigns/               (4 fichiers - OK)
├── core/                    (NOUVEAU)
│   └── health_check_service.ts
├── notifications/           (2 fichiers - OK)
├── overlay-studio/          (1 fichier - OK)
├── polls/                   (6 fichiers apres fusion)
│   ├── poll_aggregation_service.ts
│   ├── poll_creation_service.ts
│   ├── poll_lifecycle_service.ts
│   ├── poll_orchestration_service.ts  ← (ex poll_service.ts)
│   ├── poll_polling_service.ts
│   └── poll_results_announcement_service.ts
├── resilience/              (5 fichiers - OK)
├── scheduler/               (1 fichier - OK)
├── support/                 (4 fichiers apres reorganisation)
│   ├── backend_log_service.ts
│   ├── github_discussion_service.ts  ← deplace
│   ├── github_issue_service.ts       ← deplace
│   └── support_report_service.ts     ← deplace
├── twitch/                  (4 fichiers - OK)
├── vtt/                     (6 fichiers - OK)
└── websocket/               (1 fichier - OK)
```

---

## 6. Gros Fichiers a Surveiller (Information)

Ces fichiers sont volumineux mais fonctionnels. Pas de changement immediat necessaire :

| Fichier | Lignes | Observation |
|---------|--------|-------------|
| `vtt/vtt_websocket_service.ts` | 761 | Gere connexion, heartbeat, sync |
| `polls/poll_polling_service.ts` | 739 | Polling + aggregation |
| `polls/poll_creation_service.ts` | 663 | Validation + creation + optimisation |
| `twitch/twitch_chat_service.ts` | 575 | Chat + commandes + formatage |
| `twitch/twitch_api_service.ts` | 537 | Multiple endpoints API |
| `mj/campaigns_controller.ts` | 488 | Multi-responsabilite |

---

## 7. Recapitulatif des Actions

### Phase 1 - Nettoyage (immediat)
- [ ] Supprimer `app/controllers/shared/` (vide)
- [ ] Supprimer `app/validators/support/` (vide)
- [ ] Supprimer `app/dtos/twitch/` (vide)
- [ ] Supprimer `start/routes.ts.backup`
- [ ] Supprimer `app/controllers/auth_controller.ts` (legacy, non utilise)

### Phase 2 - Consolidation DTOs
- [ ] Supprimer `dtos/polls/poll_instance_dto.ts`
- [ ] Supprimer `dtos/polls/poll_results_dto.ts`
- [ ] Supprimer `dtos/polls/poll_template_dto.ts`
- [ ] Supprimer `dtos/campaigns/campaign_detail_dto.ts`
- [ ] Supprimer `dtos/campaigns/campaign_invitation_dto.ts`
- [ ] Mettre a jour 5 imports dans 3 controllers

### Phase 3 - Consolidation Validators + Migration Zod
- [ ] Creer `campaigns/campaign_validators.ts` (fusion de 4 fichiers, tout en Zod)
- [ ] Creer `polls/poll_validators.ts` (fusion de 4 fichiers)
- [ ] Creer `streamer/streamer_validators.ts` (fusion de 3 fichiers)
- [ ] Creer `notifications/notification_validators.ts` (fusion de 2 fichiers)
- [ ] Convertir `auth/auth_validators.ts` de VineJS vers Zod
- [ ] Supprimer les 14 anciens fichiers
- [ ] Mettre a jour les imports dans les controllers
- [ ] Mettre a jour les controllers auth pour utiliser `validateRequest()` au lieu de `request.validateUsing()`
- [ ] Supprimer la dependance `@vinejs/vine` du package.json

### Phase 4 - Reorganisation Services
- [ ] Creer `services/core/`
- [ ] Deplacer `health_check_service.ts` → `core/`
- [ ] Deplacer `poll_service.ts` → `polls/poll_orchestration_service.ts`
- [ ] Deplacer `github_issue_service.ts` → `support/`
- [ ] Deplacer `github_discussion_service.ts` → `support/`
- [ ] Deplacer `support_report_service.ts` → `support/`
- [ ] Mettre a jour les imports

---

## 8. Benefices Attendus

| Metrique | Avant | Apres |
|----------|-------|-------|
| Fichiers validators | 15 | 6 |
| Fichiers DTOs | 14 | 9 |
| Repertoires vides | 3 | 0 |
| Services a la racine | 5 | 0 |
| Fichiers orphelins | 2 | 0 |
| Fichiers re-export inutiles | 5 | 0 |
| Fichiers doublons | 1 | 0 |
| Librairies de validation | 2 | 1 |
| Dependances npm | N | N-1 |

**Resultat**: Structure plus claire, navigation plus facile, moins de fichiers "bruit", une seule librairie de validation.

---

## 9. Questions pour Validation

1. **Phases a executer** : Veux-tu que j'execute toutes les phases (1-4) ou seulement certaines ?

2. **Autre chose** : Y a-t-il d'autres aspects de l'organisation que tu voudrais revoir ?
