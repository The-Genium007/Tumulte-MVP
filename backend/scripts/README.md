# Scripts Backend

## test-sentry.ts

Script de test pour vérifier que Sentry est correctement configuré.

### Utilisation

```bash
npm run test:sentry
```

### Ce que fait le script

1. ✅ Vérifie que Sentry est activé (SENTRY_DSN configuré)
2. 📤 Envoie 6 types d'événements différents :
   - Erreur simple
   - Erreur avec contexte utilisateur (tags, user, context)
   - Messages de différents niveaux (info, warning, error)
   - Console.error/warn (auto-capturés)
   - Erreur avec breadcrumbs (historique d'actions)
   - Erreur filtrée (E_ROW_NOT_FOUND - ne devrait PAS apparaître)

### Résultat attendu

Sur [sentry.io](https://sentry.io), vous devriez voir **5 erreurs** dans les 1-2 minutes suivant l'exécution.

L'erreur `E_ROW_NOT_FOUND` ne devrait **PAS** apparaître car elle est filtrée dans la configuration.

### Vérifications

Pour chaque erreur, vérifiez :
- ✅ Le message d'erreur
- ✅ Les tags (`test: true`, `environment: test-script`)
- ✅ Le contexte utilisateur (user id, username, email)
- ✅ Les breadcrumbs (historique des actions)
- ✅ L'environment (development, staging, production)
- ✅ La release version (`tumulte-backend@0.3.0`)

### Troubleshooting

**Le script affiche "Sentry est DÉSACTIVÉ" ?**
→ Vérifiez que `SENTRY_DSN` est défini dans `backend/.env`

**Aucune erreur n'apparaît sur Sentry ?**
→ Voir [SENTRY_SETUP.md](../../SENTRY_SETUP.md#5-troubleshooting)
