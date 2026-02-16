# Branch Protection & Deployment Workflow

This document describes the branch protection rules, deployment workflow, and release management for the Tumulte project.

---

## Branch Strategy

Tumulte uses a Git Flow-inspired branching strategy with two long-lived branches and feature branches.

### Long-Lived Branches

| Branch | Purpose | Protection Level | Deployment Target |
|--------|---------|------------------|-------------------|
| `main` | Production-ready code | Strict | Production environment |
| `staging` | Pre-production testing | Moderate | Staging environment |
| `developement` | Active development | Minimal | Development environment |

### Branch Naming

**Feature branches**:
- Format: `feature/<short-description>`
- Example: `feature/poll-templates`
- Branched from: `developement`
- Merged to: `developement`

**Bugfix branches**:
- Format: `fix/<issue-description>`
- Example: `fix/poll-countdown-timer`
- Branched from: `developement` or `staging`
- Merged to: `developement` or `staging`

**Hotfix branches**:
- Format: `hotfix/<critical-issue>`
- Example: `hotfix/token-refresh-error`
- Branched from: `main`
- Merged to: `main` AND `staging` AND `developement`

---

## Branch Protection Rules

### `main` Branch (Production)

**Protection rules**:
- Require pull request before merging
- Require 1 approval from code owner
- Dismiss stale approvals when new commits are pushed
- Require status checks to pass before merging:
  - `backend-quality`
  - `backend-unit-tests`
  - `backend-functional-tests`
  - `frontend-quality`
  - `frontend-unit-tests`
  - `frontend-e2e-tests`
  - `build`
- Require branches to be up to date before merging
- Require linear history (no merge commits)
- Do not allow force pushes
- Do not allow deletions

**Who can merge**:
- Repository administrators
- Code owners with approval

**Deployment**:
- Automatic deployment to production environment on merge
- Requires all CI/CD checks to pass

### `staging` Branch (Pre-Production)

**Protection rules**:
- Require pull request before merging
- Require status checks to pass before merging:
  - `backend-quality`
  - `backend-unit-tests`
  - `backend-functional-tests` (non-blocking, warnings only)
  - `frontend-quality`
  - `frontend-unit-tests`
  - `build`
- Require branches to be up to date before merging
- Do not allow force pushes
- Do not allow deletions

**Who can merge**:
- Repository administrators
- Contributors with write access

**Deployment**:
- Automatic deployment to staging environment on merge
- Functional test failures generate warnings but do not block deployment

### `developement` Branch (Development)

**Protection rules**:
- Require pull request before merging (optional)
- No required status checks
- Allow force pushes (with lease only)

**Who can merge**:
- All contributors

**Deployment**:
- No automatic deployment
- Manual deployment to development environment

---

## Deployment Workflow

### Development → Staging → Production

```
feature/x ──► developement ──► staging ──► main
                    ↓             ↓          ↓
                  (dev)      (pre-prod)  (production)
```

**Steps**:
1. Develop feature in `feature/*` branch
2. Open PR to `developement`
3. Merge to `developement` after review
4. When ready for testing, open PR from `developement` to `staging`
5. Merge to `staging` (triggers CI/CD, deploys to staging)
6. Test in staging environment
7. When validated, open PR from `staging` to `main`
8. Merge to `main` (triggers full CI/CD, deploys to production)

### Hotfix Workflow

Critical production issues require a fast-track hotfix workflow:

```
hotfix/critical-issue ──► main
         │
         ├──────────────► staging
         │
         └──────────────► developement
```

**Steps**:
1. Create `hotfix/*` branch from `main`
2. Fix the issue and commit
3. Open PR to `main` with `[HOTFIX]` prefix in title
4. After approval and CI/CD pass, merge to `main` (deploys to production)
5. Immediately cherry-pick or merge the hotfix to `staging` and `developement`

**Important**: Hotfixes must be backported to all long-lived branches to prevent regression.

---

## Pull Request Process

### Required Information

All pull requests must include:

- **Title**: Clear, descriptive title (e.g., "Add poll template management")
- **Description**: What changed and why
- **Type**: Feature, bugfix, hotfix, refactor, docs
- **Testing**: Steps to test the changes
- **Breaking changes**: Clearly marked if applicable
- **Related issues**: Link to GitHub issues if applicable

### Review Process

**For `main` (production)**:
1. Code owner review required
2. All CI/CD checks must pass (blocking)
3. No merge commits allowed (squash or rebase)
4. PR must be up to date with `main`

**For `staging` (pre-production)**:
1. At least one reviewer approval recommended
2. Quality and unit tests must pass
3. Functional tests may fail (non-blocking warnings)

**For `developement` (development)**:
1. Self-merge allowed for maintainers
2. No required status checks

### Merge Strategies

| Branch | Merge Strategy | Reason |
|--------|---------------|--------|
| `main` | Squash or rebase | Clean linear history |
| `staging` | Merge commit | Preserve feature branch context |
| `developement` | Any | Flexibility for rapid iteration |

---

## Release Management

### Versioning

Tumulte follows Semantic Versioning (SemVer): `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (e.g., API contract changes, database schema redesign)
- **MINOR**: New features (backward-compatible)
- **PATCH**: Bug fixes (backward-compatible)

**Current version**: `0.6.x` (pre-1.0 development phase)

### Release Process

**Steps**:
1. Merge all features and fixes to `staging`
2. Test thoroughly in staging environment
3. Update version in `package.json` (both backend and frontend)
4. Update `CHANGELOG.md` with release notes
5. Create PR from `staging` to `main` with title `Release v0.6.x`
6. After approval, merge to `main`
7. Tag the release: `git tag v0.6.x`
8. Push tag: `git push origin v0.6.x`
9. GitHub Actions deploys to production
10. Monitor production for issues

### Rollback Procedure

If a deployment causes critical issues:

1. Identify the last known good commit on `main`
2. Create a revert PR or hotfix branch
3. Merge to `main` (triggers redeployment)
4. Investigate root cause and fix in `developement`
5. Follow normal deployment workflow for the fix

**Emergency rollback** (production down):
1. Manually revert Docker images to previous tag
2. Restart containers
3. Follow up with a proper revert PR to `main`

---

## CI/CD Integration

### GitHub Actions Workflows

**Triggered on PR to `main`** (`production-ci.yml`):
- All quality checks (ESLint, Prettier, TypeScript)
- All unit tests (backend + frontend)
- All functional tests (backend API)
- Frontend E2E tests (Playwright)
- Docker build verification

**Triggered on PR to `staging`** (`staging-ci.yml`):
- All quality checks
- All unit tests
- Functional tests (non-blocking warnings)
- Docker build verification

**Triggered on push to `main` or `staging`**:
- Same checks as PR, plus deployment

**Triggered on tag push**:
- Build and tag Docker images with version
- Push to container registry
- Create GitHub release with auto-generated notes

### Required Checks

For a PR to `main` to be mergeable:

- [x] `backend-quality` (ESLint, Prettier, TypeScript)
- [x] `backend-unit-tests` (Japa unit tests, 80%+ coverage)
- [x] `backend-functional-tests` (Japa API tests)
- [x] `frontend-quality` (ESLint, Prettier, TypeScript)
- [x] `frontend-unit-tests` (Vitest unit tests)
- [x] `frontend-e2e-tests` (Playwright browser tests)
- [x] `build` (Docker multi-stage builds)

---

## Environment-Specific Configurations

### Development Environment

- **Branch**: `developement`
- **Database**: Local PostgreSQL (port 5432)
- **Redis**: Local Redis (port 6379)
- **Frontend**: `http://localhost:3000`
- **Backend**: `http://localhost:3333`
- **Monitoring**: Optional (disabled by default)

### Staging Environment

- **Branch**: `staging`
- **Database**: Staging PostgreSQL (separate from production)
- **Redis**: Staging Redis (separate from production)
- **Frontend**: `https://staging.tumulte.app`
- **Backend**: `https://api-staging.tumulte.app`
- **Monitoring**: Enabled (Prometheus + Grafana)

### Production Environment

- **Branch**: `main`
- **Database**: Production PostgreSQL (automated backups)
- **Redis**: Production Redis (persistence enabled)
- **Frontend**: `https://tumulte.app`
- **Backend**: `https://api.tumulte.app`
- **Monitoring**: Enabled (Prometheus + Grafana + AlertManager)

---

## GitHub Configuration Guide

### Creating Branches

If the long-lived branches don't exist yet:

```bash
# Create staging branch
git checkout -b staging
git push -u origin staging

# Create main branch
git checkout -b main
git push -u origin main
```

### Configuring Branch Protection on GitHub

**Access**: `https://github.com/{owner}/Tumulte/settings/branches`

#### Staging Branch Setup

1. Click **Add branch protection rule**
2. Branch name pattern: `staging`
3. Configure settings:

**Basic Protection**:
- [x] Require a pull request before merging
  - Require approvals: `0` (or `1` for self-approval)
  - Dismiss stale pull request approvals when new commits are pushed
- [x] Require status checks to pass before merging
  - [x] Require branches to be up to date before merging
  - Required status checks:
    - `Quality Checks (TypeCheck + Lint)`
    - `Unit Tests`
    - `Build Backend & Frontend`
    - `Functional Tests (Warning Only)` (optional, non-blocking)
- [x] Require conversation resolution before merging
- [ ] Require signed commits (optional)
- [x] Include administrators (can bypass if needed)

4. Click **Create**

#### Main Branch Setup (Production)

1. Click **Add branch protection rule**
2. Branch name pattern: `main`
3. Configure **STRICTER** settings:

**Enhanced Protection**:
- [x] Require a pull request before merging
  - Require approvals: `1` (mandatory code owner review)
  - Dismiss stale pull request approvals when new commits are pushed
- [x] Require status checks to pass before merging
  - [x] Require branches to be up to date before merging
  - Required status checks (ALL BLOCKING):
    - `Quality Checks`
    - `Security Audit`
    - `Unit Tests (Required)`
    - `Functional Tests (Required)`
    - `Build Production`
    - `E2E Tests`
- [x] Require conversation resolution before merging
- [x] Require linear history (forces rebase, clean history)
- [x] Include administrators (no bypass allowed)
- [ ] Restrict who can push to matching branches (optional, restrict to admins only)

4. Click **Create**

---

## Development Workflows

### Daily Development → Staging

```bash
# 1. Work on developement
git checkout developement
git add .
git commit -m "feat: new feature"
git push origin developement

# 2. Create a Pull Request on GitHub (developement → staging)

# 3. GitHub Actions automatically runs:
#    ✅ Type-check + Lint
#    ✅ Unit tests
#    ✅ Build
#    ⚠️ Functional tests (warning only)

# 4. If checks pass, merge the PR on GitHub
```

### Staging → Production

```bash
# 1. Create a Pull Request on GitHub (staging → main)

# 2. GitHub Actions automatically runs (FULL CI/CD):
#    ✅ Type-check + Lint
#    ✅ Security Audit
#    ✅ Unit tests (BLOCKING)
#    ✅ Functional tests (BLOCKING)
#    ✅ Production build
#    ✅ E2E tests (BLOCKING)

# 3. If ALL checks are green, merge the PR on GitHub
# 4. Automatic deployment to production via Docker
```

---

## Useful Commands

### Update Staging from Development

```bash
git checkout staging
git pull origin staging
git merge developement
git push origin staging
```

### Create Pull Requests via CLI

Using GitHub CLI (`gh`):

```bash
# Install: https://cli.github.com/

# Create PR developement → staging
gh pr create --base staging --head developement \
  --title "Deploy to staging" \
  --body "Deployment of latest changes"

# Create PR staging → main
gh pr create --base main --head staging \
  --title "Deploy to production v0.6.x" \
  --body "Release v0.6.x - Production deployment"
```

### Monitor CI/CD Runs

```bash
# View GitHub Actions runs
gh run list --branch staging
gh run list --branch main

# View run details
gh run view <run-id>

# View logs
gh run view <run-id> --log
```

**Direct URLs**:
- Staging CI: `https://github.com/{owner}/Tumulte/actions/workflows/staging-ci.yml`
- Production CI: `https://github.com/{owner}/Tumulte/actions/workflows/production-ci.yml`

---

## Best Practices

### For Contributors

1. **Always branch from `developement`** for new features
2. **Keep PRs small and focused** (one feature or fix per PR)
3. **Write descriptive commit messages** (follow Conventional Commits)
4. **Add tests for new features** (unit + functional)
5. **Update documentation** when changing behavior
6. **Run tests locally** before pushing

### For Reviewers

1. **Check for breaking changes** (API contracts, database schema)
2. **Verify test coverage** (new code should be tested)
3. **Review for security issues** (input validation, authentication)
4. **Test locally** for complex features
5. **Ensure documentation is updated**

### For Maintainers

1. **Monitor CI/CD pipelines** for failures
2. **Review deployment logs** after merging to `main`
3. **Keep `staging` in sync** with `main` after hotfixes
4. **Tag releases** consistently with SemVer
5. **Maintain CHANGELOG.md** with user-facing changes

---

## Troubleshooting

### Temporary Bypass (Emergency Only)

If you absolutely must merge without passing checks:

1. Go to Settings → Branches on GitHub
2. Temporarily modify the protection rule
3. Uncheck "Require status checks to pass"
4. Merge the PR
5. **IMMEDIATELY RE-ENABLE THE PROTECTION**

**Warning**: Only use this for critical production hotfixes. Document the reason.

### Debugging a Failing Test Locally

Reproduce CI conditions locally:

```bash
cd backend

# Use the same environment variables as CI
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

### Common Issues

**PR blocked by status checks**:
- Verify all required checks are defined in the workflow file
- Ensure the workflow file is on the target branch (e.g., `main`)
- Check that check names match exactly (case-sensitive)

**Merge conflicts**:
- Rebase your branch on the target branch: `git rebase staging`
- Resolve conflicts and force-push: `git push --force-with-lease`

**Failed migrations in CI**:
- Ensure migrations run cleanly on a fresh database
- Test with `docker-compose.test.yml` environment locally
- Check for missing `down()` methods or non-idempotent migrations

---

## Pre-First Merge Checklist

Before enabling branch protection:

- [ ] `staging` and `main` branches created on GitHub
- [ ] Protection configured for `staging` (progressive CI)
- [ ] Protection configured for `main` (full CI)
- [ ] Backend unit tests working locally
- [ ] Backend functional tests working locally
- [ ] Frontend build succeeds locally
- [ ] Test environment variables configured (see `.env.example`)
- [ ] PostgreSQL 16 and Redis 7 available for local tests
- [ ] GitHub Actions workflows committed to repository

---

## Related Documentation

- [CI/CD Workflows](ci-cd.md)
- [Monitoring & Docker](monitoring.md)
- [Contributing Guide](../guides/contributing.md)
- [Deployment Guide](../guides/deployment.md)

## Resources

- [GitHub Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub CLI Documentation](https://cli.github.com/manual/)
