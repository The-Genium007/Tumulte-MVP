# CI/CD and GitHub Workflows

This folder contains CI/CD configurations and automation scripts for the Tumulte project.

## Structure

```
.github/
├── workflows/
│   ├── staging-ci.yml        # Progressive CI/CD for staging
│   └── production-ci.yml     # Full CI/CD for production
├── scripts/
│   ├── deploy-staging.sh     # Helper for deploying to staging
│   └── deploy-production.sh  # Helper for deploying to production
├── BRANCH_PROTECTION.md      # GitHub configuration guide
└── WORKFLOWS.md              # This file
```

## CI/CD Workflows

### Staging CI/CD (`staging-ci.yml`)

**Triggered on**: Pull Request or push to `staging`

**Progressive pipeline**:
1. **Quality Checks** (~2 min)
   - TypeCheck backend + frontend
   - Lint backend + frontend
   - Blocking

2. **Unit Tests** (~3 min)
   - Backend unit tests with PostgreSQL + Redis
   - Blocking

3. **Build** (~2 min)
   - Backend compilation (TypeScript)
   - Frontend build (Nuxt)
   - Blocking

4. **Functional Tests** (~5 min)
   - Backend functional tests
   - Warning only (non-blocking)

**Total time**: ~12 minutes

### Production CI/CD (`production-ci.yml`)

**Triggered on**: Pull Request or push to `main`

**Full pipeline**:
1. **Quality Checks** (~2 min) - Blocking
2. **Security Audit** (~1 min) - Blocking
3. **Unit Tests** (~3 min) - Blocking
4. **Functional Tests** (~5 min) - Blocking (different from staging!)
5. **Build Production** (~3 min) - Blocking
6. **E2E Tests** (~5 min) - Warning only

**Total time**: ~19 minutes

## Helper Scripts

### Deploy to Staging

```bash
# From the developement branch
./.github/scripts/deploy-staging.sh
```

This script:
1. Verifies you're on `developement`
2. Checks for uncommitted changes
3. Offers to create a PR to `staging`
4. Automatically triggers CI/CD workflows

### Deploy to Production

```bash
# From the staging branch
./.github/scripts/deploy-production.sh "v0.1.0" "Release notes"
```

This script:
1. Verifies you're on `staging`
2. Asks for version and release notes
3. Creates a PR to `main`
4. Triggers full CI/CD

## Status Badges

CI/CD badges are displayed in the main README:

```markdown
[![Staging CI](https://github.com/The-Genium007/Tumulte/actions/workflows/staging-ci.yml/badge.svg?branch=staging)](...)
[![Production CI](https://github.com/The-Genium007/Tumulte/actions/workflows/production-ci.yml/badge.svg?branch=main)](...)
```

## Required Configuration

### GitHub Actions Services

The workflows use the following Docker services:
- **PostgreSQL 16**: Database for tests
- **Redis 7**: Cache for tests

### Required Secrets

No GitHub secrets are required for tests (mocked test environment).

For automatic deployment to Dokploy (future), you'll need to add:
- `DOKPLOY_API_KEY`
- `DOKPLOY_URL`

## Documentation

- **Full configuration**: See [`BRANCH_PROTECTION.md`](./BRANCH_PROTECTION.md)
- **GitFlow workflow**: See the main README
- **Backend tests**: See [`backend/tests/README.md`](../backend/tests/README.md)

## Monitoring

### View CI/CD Runs

```bash
# Via GitHub CLI
gh run list --workflow=staging-ci.yml
gh run list --workflow=production-ci.yml

# View run details
gh run view <run-id> --log
```

### Direct URLs

- Staging CI: https://github.com/The-Genium007/Tumulte/actions/workflows/staging-ci.yml
- Production CI: https://github.com/The-Genium007/Tumulte/actions/workflows/production-ci.yml

## Optimizations

The workflows use several optimizations:
- **NPM Cache**: Dependencies are cached between runs
- **Parallel Jobs**: Quality checks + Security audit run in parallel
- **Docker Services**: PostgreSQL and Redis start automatically
- **Artifacts**: Builds and test reports are saved

## Troubleshooting

### Workflow Fails in Staging

1. Check the logs: `gh run view <run-id> --log`
2. Reproduce locally:
   ```bash
   cd backend
   npm run typecheck  # Phase 1
   npm run lint       # Phase 1
   npm run test       # Phase 2
   ```
3. Fix and re-push

### Workflow Fails in Production

1. **DO NOT merge** until all checks are green
2. Check detailed logs
3. If it's a false positive (rare), you can:
   - Temporarily disable branch protection
   - Merge
   - **Immediately re-enable protection**

### Unstable Functional Tests

Functional tests can be unstable (timeouts, race conditions). That's why they're set to "warning" on staging.

To debug:
```bash
cd backend
NODE_ENV=test npm run test -- --filter=functional --bail
```

## Next Steps

- [ ] Add automatic deployment to Dokploy after merge to `main`
- [ ] Configure Playwright E2E tests
- [ ] Add Discord/Slack notifications on failure
- [ ] Set up performance tests
- [ ] Add workflow for automatic releases with changelog

## Tips

- **Staging**: Use it to validate that everything compiles and unit tests pass
- **Production**: Only merge when you're 100% sure (all tests must be green)
- **Development**: Commit often, push regularly to save your work
- **Helper scripts**: Use them to avoid Git manipulation errors

## Support

Questions or issues with CI/CD workflows? Open an issue with the `ci/cd` label.
