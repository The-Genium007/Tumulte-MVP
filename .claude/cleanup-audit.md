# Audit de Nettoyage - Tumulte

> Date: 2026-01-13
> Statut: En attente de nettoyage

## Code Inutilisé - Frontend (à supprimer)

### Composants
- `frontend/components/HelloWorld.vue` - Template Vite initial, jamais utilisé

### Composables
- `frontend/composables/useGitHubStats.ts` - Fetch stats GitHub, jamais importé
- `frontend/composables/useServiceStatus.ts` - Check API health, jamais importé

### Pages
- `frontend/pages/home.vue` - Page inaccessible depuis la navigation UI

---

## Code Inutilisé - Backend (à supprimer)

### Services Dupliqués/Inutilisés
- `backend/app/services/websocket_service.ts` - **ANCIEN** fichier dupliqué (le bon est dans `/websocket/`)
- `backend/app/services/resilience/backoff_strategy.ts` - Jamais importé
- `backend/app/services/resilience/retry_event_store.ts` - Jamais importé
- `backend/app/services/resilience/circuit_breaker.ts` - Jamais importé

### Controllers Sans Routes
- `backend/app/controllers/mj/active_session_controller.ts` - Aucune route définie
- `backend/app/controllers/mj/poll_templates_controller.ts` - Aucune route définie

### Repositories
- `backend/app/repositories/poll_template_repository.ts` - Utilisé uniquement par controller sans routes

### Fonctions
- `backend/app/utils/uuid.ts:15` - Fonction `isValidUuidV4()` jamais appelée

---

## Bug Critique - CORRIGÉ

~~**Fichier**: `backend/app/services/campaigns/authorization_service.ts:7`~~

~~**Problème**: Import depuis mauvais chemin + appel méthode inexistante~~

**Résolu** : Import corrigé et méthode ajoutée au bon service.

---

## Correctifs Sécurité Appliqués (2026-01-13)

### Frontend
- [x] `frontend/pages/auth/callback.vue` - Open redirect fixé
- [x] `frontend/public/sw-push.js` - URL validation ajoutée
- [x] `frontend/nuxt.config.ts` - CSP `unsafe-eval` conditionnel (dev only)

### Backend
- [x] `backend/app/middleware/rate_limit_middleware.ts` - Fail closed au lieu de fail open
- [x] `backend/app/controllers/auth_controller.ts` - Logs env vars réduits (dev only)
- [x] `backend/app/services/campaigns/authorization_service.ts` - Import corrigé vers le bon websocket service
- [x] `backend/app/services/websocket/websocket_service.ts` - Méthode `emitStreamerReadinessChange()` ajoutée

---

## Prochaines Actions

1. Supprimer les fichiers frontend listés ci-dessus
2. Supprimer les fichiers backend listés ci-dessus
3. Corriger le bug d'import dans authorization_service.ts
4. Lancer les tests pour valider que rien n'est cassé
