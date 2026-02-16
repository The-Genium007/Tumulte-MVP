# Infrastructure Documentation

This directory contains documentation for Tumulte's infrastructure, deployment, and operational aspects.

## Overview

Tumulte runs on a Docker-based production infrastructure with automated CI/CD via GitHub Actions. The monitoring stack uses Prometheus and Grafana with Discord alerts for operational visibility.

## Contents

- [**CI/CD Workflows**](ci-cd.md) - GitHub Actions configuration, pipeline structure, and deployment automation
- [**Branch Protection**](branch-protection.md) - Branch protection rules, deployment workflow, and release management
- [**Monitoring & Docker**](monitoring.md) - Production Docker setup, monitoring stack (Prometheus, Grafana, AlertManager), and health checks

## Quick Reference

### Production Stack

- **Containerization**: Multi-stage Docker builds for backend (AdonisJS) and frontend (Nuxt SSR)
- **CI/CD**: GitHub Actions with quality gates, automated testing, and build verification
- **Monitoring**: Prometheus for metrics collection, Grafana for dashboards, AlertManager for Discord notifications
- **Infrastructure**: PostgreSQL 16, Redis 7, Node Exporter, cAdvisor, database exporters

### Key Resources

- Monitoring stack configuration: `/monitoring` directory at project root
- Docker Compose files: `/backend/docker-compose.yml`, `/backend/docker-compose.test.yml`
- GitHub Actions workflows: `/.github/workflows/`
- Deployment scripts: `/monitoring/scripts/deploy.sh`

## Related Documentation

- [Architecture Overview](../architecture/overview.md)
- [Deployment Guide](../guides/deployment.md)
- [Contributing Guide](../guides/contributing.md)
