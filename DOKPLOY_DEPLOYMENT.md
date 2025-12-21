# Guide de Déploiement Dokploy - Tumulte

## 📋 Prérequis

- Serveur Dokploy configuré avec le réseau `dokploy-network`
- PostgreSQL 16 accessible (hébergé ou service Dokploy)
- Redis 7 accessible (hébergé ou service Dokploy)
- Tunnel Cloudflare configuré (production uniquement)

---

## 🚀 Déploiement Backend

### 1. Créer le Service Backend dans Dokploy

1. **Nouveau Projet** → `tumulte-backend`
2. **Type** : Docker Compose
3. **Source** : GitHub/Git → Sélectionner le dépôt
4. **Branche** : `main` (production) ou `staging` (pré-production)
5. **Chemin Docker Compose** : `backend/docker-compose.yml`
6. **Dockerfile Path** : `backend/Dockerfile`

### 2. Configuration des Variables d'Environnement

Dans Dokploy UI → Variables d'environnement :

#### **Variables Projet (Partagées)**

```env
# Database PostgreSQL (à configurer selon votre service PostgreSQL)
DB_HOST=postgres-service-name
DB_PORT=5432
DB_USER=tumulte_user
DB_PASSWORD=VOTRE_MOT_DE_PASSE_FORT
DB_DATABASE=tumulte_db

# Redis (à configurer selon votre service Redis)
REDIS_HOST=redis-service-name
REDIS_PORT=6379
REDIS_PASSWORD=VOTRE_MOT_DE_PASSE_REDIS
REDIS_CONNECTION=main
REDIS_DB=0
```

#### **Variables Service Backend**

```env
# Application
NODE_ENV=production
PORT=3333
HOST=0.0.0.0
APP_KEY=GENERER_AVEC_node_ace_generate:key
LOG_LEVEL=info
TZ=Europe/Paris

# Twitch OAuth (à obtenir depuis https://dev.twitch.tv/console)
TWITCH_CLIENT_ID=votre_client_id
TWITCH_CLIENT_SECRET=votre_client_secret
TWITCH_REDIRECT_URI=https://api.votre-domaine.com/auth/twitch/callback

# Discord Support
DISCORD_SUPPORT_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_SUPPORT_ROLE_ID=votre_role_id

# Session & Security
SESSION_DRIVER=cookie

# Frontend URL (pour CORS)
FRONTEND_URL=https://votre-domaine.com

# Sentry (optionnel)
SENTRY_DSN=
```

### 3. Configuration du Domaine

Dans Dokploy UI → Domaines :

- **Production** : `api.votre-domaine.com`
- **Pré-production** : `api-staging.votre-domaine.com`

Dokploy configurera automatiquement Traefik et les certificats SSL.

### 4. Déploiement

Cliquez sur **Deploy** dans l'interface Dokploy.

**Le container va automatiquement :**
1. ✅ Attendre que PostgreSQL soit prêt
2. ✅ Attendre que Redis soit prêt
3. ✅ Exécuter les migrations de base de données
4. ✅ Démarrer l'application

---

## 🎨 Déploiement Frontend

### 1. Créer le Service Frontend dans Dokploy

1. **Nouveau Projet** → `tumulte-frontend`
2. **Type** : Docker Compose
3. **Source** : GitHub/Git → Sélectionner le dépôt
4. **Branche** : `main` (production) ou `staging` (pré-production)
5. **Chemin Docker Compose** : `frontend/docker-compose.yml`
6. **Dockerfile Path** : `frontend/Dockerfile`

### 2. Configuration des Variables d'Environnement

#### **Variables Service Frontend**

```env
# Application
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# API & WebSocket URLs
VITE_API_URL=https://api.votre-domaine.com
VITE_WS_URL=wss://api.votre-domaine.com
```

**⚠️ Important** : Les variables `VITE_*` doivent aussi être définies comme **Build Arguments** dans Dokploy :
- Aller dans **Advanced Settings** → **Build Args**
- Ajouter :
  - `VITE_API_URL=https://api.votre-domaine.com`
  - `VITE_WS_URL=wss://api.votre-domaine.com`

### 3. Configuration du Domaine

Dans Dokploy UI → Domaines :

- **Production** : `votre-domaine.com` ou `app.votre-domaine.com`
- **Pré-production** : `staging.votre-domaine.com`

### 4. Déploiement

Cliquez sur **Deploy** dans l'interface Dokploy.

---

## 🗄️ Configuration PostgreSQL & Redis

### Option A : Services Dokploy Intégrés

Dokploy peut créer des services PostgreSQL et Redis pour vous :

1. **Nouveau Service** → **PostgreSQL 16**
   - Nom : `tumulte-postgres`
   - Mot de passe : Générer un mot de passe fort
   - Base de données : `tumulte_db`
   - Volume persistant : ✅ Activé

2. **Nouveau Service** → **Redis 7**
   - Nom : `tumulte-redis`
   - Mot de passe : Générer un mot de passe fort
   - Volume persistant : ✅ Activé

**Les services seront automatiquement sur le réseau `dokploy-network`.**

Utilisez ces noms comme variables :
- `DB_HOST=tumulte-postgres`
- `REDIS_HOST=tumulte-redis`

### Option B : Services Externes

Si vous utilisez PostgreSQL/Redis hébergés ailleurs :
- Configurez les variables avec les adresses publiques
- Assurez-vous que les ports sont accessibles depuis votre serveur Dokploy

---

## 🔧 Configuration Avancée

### Limites de Ressources

Les fichiers `docker-compose.yml` définissent déjà des limites :

**Backend :**
- CPU : 1-2 cores
- RAM : 1-2 GB

**Frontend :**
- CPU : 0.5-1 cores
- RAM : 512MB-1GB

Vous pouvez les ajuster dans Dokploy UI → **Advanced Settings** → **Resources**.

### Health Checks

Les health checks sont configurés automatiquement :

**Backend :** `GET /health` toutes les 30s
**Frontend :** `GET /` toutes les 30s

En cas d'échec, Dokploy peut automatiquement :
- Redémarrer le container
- Effectuer un rollback vers la version précédente

### Rollback Automatique

Configuré dans les fichiers `docker-compose.yml` :
```yaml
update_config:
  parallelism: 1
  delay: 10s
  failure_action: rollback
```

---

## 🌍 Différences Pré-production vs Production

### Pré-production (Staging)
```env
# Backend
VITE_API_URL=https://api-staging.votre-domaine.com
VITE_WS_URL=wss://api-staging.votre-domaine.com
LOG_LEVEL=debug
SENTRY_DSN=  # Désactivé ou environnement séparé

# Frontend
VITE_API_URL=https://api-staging.votre-domaine.com
```

### Production
```env
# Backend
VITE_API_URL=https://api.votre-domaine.com
VITE_WS_URL=wss://api.votre-domaine.com
LOG_LEVEL=info
SENTRY_DSN=votre_sentry_dsn_production

# Frontend
VITE_API_URL=https://api.votre-domaine.com
```

**💡 Astuce** : Utilisez la fonctionnalité **Environments** de Dokploy pour gérer plusieurs environnements facilement.

---

## 🔍 Vérification du Déploiement

### Backend

```bash
# Vérifier les logs
dokploy logs tumulte-backend

# Tester l'endpoint health
curl https://api.votre-domaine.com/health

# Vérifier les migrations
dokploy exec tumulte-backend -- node ace migration:status
```

### Frontend

```bash
# Vérifier les logs
dokploy logs tumulte-frontend

# Tester l'accès
curl https://votre-domaine.com
```

---

## 🚨 Troubleshooting

### Erreur : "container name already in use"

**Solution** : Les fichiers Docker Compose ont été configurés SANS `container_name` pour éviter ce problème. Dokploy gère les noms automatiquement.

### Les migrations ne s'exécutent pas

**Vérifier** :
1. PostgreSQL est accessible : `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` sont corrects
2. Logs du container : `dokploy logs tumulte-backend`
3. Le script `docker-entrypoint.sh` a les bonnes permissions

### Frontend ne se connecte pas au backend

**Vérifier** :
1. Les variables `VITE_API_URL` et `VITE_WS_URL` sont correctes
2. Les variables ont été définies comme **Build Args** (pas seulement env)
3. Rebuild le frontend après modification des Build Args

### Redis/PostgreSQL non accessible

**Si services Dokploy** :
- Vérifier qu'ils sont sur le même réseau : `dokploy-network`
- Vérifier les noms de services (pas d'IP, utiliser les noms)

**Si services externes** :
- Vérifier les règles de firewall
- Vérifier que les credentials sont corrects

---

## 📚 Ressources

- [Documentation Dokploy](https://docs.dokploy.com)
- [AdonisJS Documentation](https://adonisjs.com)
- [Nuxt Documentation](https://nuxt.com)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

## 🔐 Sécurité

### Bonnes Pratiques

- ✅ Utilisez des mots de passe forts pour PostgreSQL et Redis
- ✅ Générez un nouveau `APP_KEY` pour chaque environnement
- ✅ Ne committez JAMAIS les fichiers `.env` dans Git
- ✅ Utilisez Sentry pour le monitoring en production
- ✅ Activez HTTPS via Traefik (automatique avec Dokploy)
- ✅ Limitez les accès réseau aux services nécessaires

### Génération de l'APP_KEY

```bash
# Depuis votre machine locale
cd backend
node ace generate:key

# Copiez la clé générée dans les variables Dokploy
```

---

**Créé avec ❤️ pour Tumulte v0.1.0-alpha**
