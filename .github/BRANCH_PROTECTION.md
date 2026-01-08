# Branch Protection Configuration

This guide explains how to configure branch protection on GitHub to automate CI/CD workflows.

## Branch Strategy

```
developement (daily development)
    ↓ merge via PR
staging (pre-production with progressive CI/CD)
    ↓ merge via PR
main (production with full CI/CD)
```

## GitHub Configuration

### 1. Create Branches

If they don't exist yet:

```bash
# Create staging branch
git checkout -b staging
git push -u origin staging

# Create main branch
git checkout -b main
git push -u origin main
```

### 2. Staging Branch Configuration

1. Go to GitHub: `https://github.com/The-Genium007/Tumulte/settings/branches`
2. Click **Add branch protection rule**
3. Branch name pattern: `staging`
4. Check the following options:

**Basic Protection:**
- **Require a pull request before merging**
  - Require approvals: `0` (or `1` if you want self-approval)
  - Dismiss stale pull request approvals when new commits are pushed

- **Require status checks to pass before merging**
  - Require branches to be up to date before merging
  - Required status checks:
    - `Quality Checks (TypeCheck + Lint)`
    - `Unit Tests`
    - `Build Backend & Frontend`
    - `Functional Tests (Warning Only)` → **DO NOT CHECK** (optional)

- **Require conversation resolution before merging**

- **Require signed commits** (optional)

- **Include administrators** (you can bypass if needed)

5. Click **Create**

### 3. Main Branch Configuration (Production)

1. Same process, Branch name pattern: `main`
2. **STRICTER** configuration:

**Enhanced Protection:**
- **Require a pull request before merging**
  - Require approvals: `1` (you must self-approve or have a reviewer)

- **Require status checks to pass before merging**
  - Require branches to be up to date before merging
  - Required status checks (ALL BLOCKING):
    - `Quality Checks`
    - `Security Audit`
    - `Unit Tests (Required)`
    - `Functional Tests (Required)`
    - `Build Production`

- **Require conversation resolution before merging**

- **Require linear history** (optional, forces rebase)

- **Include administrators** (even you cannot bypass)

- **Restrict who can push to matching branches** (optional)
  - Add your account only

3. Click **Create**

### 4. Development Branch Configuration

**No protection** - Full freedom for daily development.

Optional: You can enable only:
- **Require conversation resolution before merging** (if you use PRs to organize your work)

## Development Workflow

### Daily Development → Staging

```bash
# 1. Work on developement
git checkout developement
git add .
git commit -m "feat: new feature"
git push origin developement

# 2. Create a Pull Request on GitHub
# developement → staging

# 3. GitHub Actions automatically runs:
#    ✅ Type-check + Lint
#    ✅ Unit tests
#    ✅ Build
#    ⚠️ Functional tests (warning)

# 4. If everything is green, merge the PR on GitHub
```

### Staging → Production

```bash
# 1. Create a Pull Request on GitHub
# staging → main

# 2. GitHub Actions automatically runs (FULL CI/CD):
#    ✅ Type-check + Lint
#    ✅ Security Audit
#    ✅ Unit tests (BLOCKING)
#    ✅ Functional tests (BLOCKING)
#    ✅ Production build
#    ⚠️ E2E tests (warning for now)

# 3. If ALL checks are green, merge the PR on GitHub
# 4. Deploy from main to Dokploy
```

## Useful Commands

### Update staging from developement

```bash
git checkout staging
git pull origin staging
git merge developement
git push origin staging
```

### Create a Pull Request via CLI (with GitHub CLI)

```bash
# Install gh CLI: https://cli.github.com/

# Create a PR developement → staging
gh pr create --base staging --head developement --title "Deploy to staging" --body "Deployment of latest changes"

# Create a PR staging → main
gh pr create --base main --head staging --title "Deploy to production v0.1.0" --body "Release v0.1.0 - Production deployment"
```

## CI/CD Monitoring

### View GitHub Actions Runs

```bash
# Via GitHub CLI
gh run list --branch staging
gh run list --branch main

# View run details
gh run view <run-id>

# View logs
gh run view <run-id> --log
```

### Direct URLs

- Staging CI: `https://github.com/The-Genium007/Tumulte/actions/workflows/staging-ci.yml`
- Production CI: `https://github.com/The-Genium007/Tumulte/actions/workflows/production-ci.yml`

## Troubleshooting

### Temporary Bypass (Emergency Only)

If you absolutely must merge without passing checks:

1. Go to Settings → Branches
2. Temporarily modify the rule
3. Uncheck "Require status checks to pass"
4. Merge
5. **IMMEDIATELY RE-ENABLE THE PROTECTION**

### Debugging a Failing Test

```bash
# Reproduce CI conditions locally
cd backend

# With the same environment variables as CI
NODE_ENV=test \
DB_HOST=localhost \
DB_PORT=5432 \
DB_USER=postgres \
DB_PASSWORD=postgres \
DB_DATABASE=twitch_polls_test \
REDIS_HOST=localhost \
REDIS_PORT=6379 \
SESSION_DRIVER=memory \
APP_KEY=test_key_32_characters_long_1234 \
npm run test
```

## Updating Workflows

Workflows are in `.github/workflows/`:
- `staging-ci.yml`: Progressive CI/CD for staging
- `production-ci.yml`: Full CI/CD for production

To modify:
1. Edit the YAML file
2. Commit to `developement`
3. The workflow will be updated on the next merge

## Pre-First Merge Checklist

- [ ] `staging` and `main` branches created on GitHub
- [ ] Protection configured for `staging` (progressive CI)
- [ ] Protection configured for `main` (full CI)
- [ ] Backend unit tests working locally
- [ ] Backend functional tests working locally
- [ ] Frontend build succeeds locally
- [ ] Test environment variables configured (see `.env.example`)
- [ ] PostgreSQL 16 and Redis 7 available for local tests

## Resources

- [GitHub Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub CLI Documentation](https://cli.github.com/manual/)
