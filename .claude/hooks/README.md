# Claude Code Hooks - Tumulte

## Hook: Pre-Commit Validation

### Fonctionnement

Ce hook s'active **automatiquement** quand Claude détecte le mot "commit" dans votre demande.

### Validations exécutées

Le hook analyse les fichiers modifiés (staged, unstaged, et untracked) et lance:

**Si `backend/` modifié:**
- `npm run lint` (ESLint)
- `npm run typecheck` (TypeScript)

**Si `frontend/` modifié:**
- `npm run lint` (ESLint)
- `npm run typecheck` (TypeScript)

**Si les deux sont modifiés:**
- Validation des deux workspaces

### Comportement

- ✅ **Bloquant**: Le commit est **refusé** si lint ou typecheck échoue
- 🔍 **Détection automatique**: Analyse `git diff` et `git status`
- 📊 **Feedback clair**: Affiche les erreurs à corriger

### Exemples

```bash
# Vous demandez
"Commit les changements avec le message 'fix: user validation'"

# Le hook s'active automatiquement
🔍 Détection d'un commit - Validation automatique activée...
📦 Backend modifié - Lancement des validations...
  → Lint...
  → Typecheck...
✅ Toutes les validations sont passées - Commit autorisé
```

### Désactivation

Pour désactiver temporairement le hook, modifiez `.claude/config.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "enabled": false  // ← Passer à false
      }
    ]
  }
}
```

### Maintenance

**Fichiers:**
- `.claude/config.json` - Configuration du hook
- `.claude/hooks/pre-commit-validation.sh` - Script bash exécuté
- `.claude/hooks/README.md` - Cette documentation
