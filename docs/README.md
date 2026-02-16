# Tumulte Documentation

Welcome to the Tumulte documentation. Tumulte is a multi-channel Twitch poll management platform designed for tabletop RPG Game Masters.

## For Users (GM/Streamers)

If you want to self-host Tumulte or learn how to use it:

- [Installation](getting-started/installation.md) - Self-hosting setup guide
- [Configuration](getting-started/configuration.md) - Environment variables and options
- [First Campaign](getting-started/first-campaign.md) - Create your first campaign tutorial

## Features

### Gamification

Create interactive goals with Twitch channel point rewards that trigger effects in Foundry VTT:

- [Gamification Overview](gamification/README.md) - System overview and reading guide
- [Gamification Architecture](gamification/architecture.md) - Complete technical documentation
- [Gamification Code Patterns](gamification/code-patterns.md) - Implementation patterns and examples

### VTT Integration

Connect Tumulte with your Virtual Tabletop for real-time overlay events:

- [VTT Integration Overview](vtt-integration/overview.md) - Supported platforms and architecture
- [VTT Integration Complete Guide](vtt-integration/complete-guide.md) - Complete technical documentation
- [VTT Quick Start Testing Guide](vtt-integration/quick-start.md) - Test integration without VTT setup
- [Foundry VTT Setup Guide](vtt-integration/foundry-module.md) - Install and configure Foundry integration
- [VTT Webhook API Reference](vtt-integration/api-reference.md) - API documentation for VTT events

### Overlay Studio

Create custom streaming overlays with our visual editor:

- [Overlay Studio Overview](overlay-studio/overview.md) - Features and interface guide
- [Overlay Customization](overlay-studio/customization.md) - Styling, animations, and branding

## For Developers

If you want to contribute or understand the codebase:

- [Architecture Overview](architecture/overview.md) - System design and patterns
- [Backend Guide](architecture/backend.md) - AdonisJS patterns and conventions
- [Frontend Guide](architecture/frontend.md) - Nuxt 3 patterns and conventions
- [PreFlight System](architecture/preflight.md) - Health check system documentation
- [Security Architecture](architecture/security.md) - Authentication, tokens, HTTP security
- [System Presets](architecture/system-presets.md) - Foundry VTT system detection and presets
- [API Reference](api/reference.md) - Complete API endpoint documentation
- [Testing Guide](guides/testing.md) - Backend and frontend testing patterns
- [Contributing](guides/contributing.md) - How to contribute to Tumulte

## Infrastructure

- [CI/CD Workflows](infrastructure/ci-cd.md) - GitHub Actions pipelines
- [Branch Protection](infrastructure/branch-protection.md) - GitHub branch rules and deployment workflow
- [Monitoring & Docker](infrastructure/monitoring.md) - Prometheus, Grafana, Docker production setup
- [Deployment Guide](guides/deployment.md) - Docker and Dokploy deployment

## Reference

- [Database Models](reference/models.md) - Database schema documentation
- [Services](reference/services.md) - Business logic documentation
- [Design System](reference/design-system.md) - Frontend visual consistency guide
- [VTT Feature Matrix](reference/vtt-feature-matrix.md) - Feature support levels per VTT system

---

## Quick Links

- [GitHub Repository](https://github.com/your-repo/tumulte)
- [Report an Issue](https://github.com/your-repo/tumulte/issues)

## License

Tumulte is licensed under the MIT License.
