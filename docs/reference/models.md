# Database Models

This document describes all database models in Tumulte, organized by domain.

## Overview

Tumulte uses PostgreSQL 16 with Lucid ORM. All models use UUIDs as primary keys and include `created_at`/`updated_at` timestamps.

### Conventions

- Tables: `snake_case` plural (`poll_instances`)
- Columns: `snake_case` (`created_at`, `user_id`)
- Foreign keys in TypeScript: `camelCase` (`userId`, `campaignId`)
- UUIDs for all primary keys
- 70+ migrations as of v0.6.x

---

## Core Domain

| Model | Table | Description |
|-------|-------|-------------|
| `User` | `users` | Users (email/password + OAuth providers) |
| `AuthProvider` | `auth_providers` | OAuth providers linked to users (Twitch, Google) |
| `Streamer` | `streamers` | Twitch channel info (encrypted tokens, scopes) |
| `Campaign` | `campaigns` | RPG campaigns created by GM |
| `CampaignMembership` | `campaign_memberships` | Streamer invitations and authorization status |

### Key Relationships

```
User ──has one──► Streamer
User ──has many──► Campaign (as owner)
User ──has many──► AuthProvider
Campaign ──has many──► CampaignMembership
CampaignMembership ──belongs to──► User (streamer)
```

---

## Polls

| Model | Table | Description |
|-------|-------|-------------|
| `Poll` | `polls` | Poll definition (question, options, duration) |
| `PollTemplate` | `poll_templates` | Reusable poll templates |
| `PollSession` | `poll_sessions` | Group of polls launched together |
| `PollInstance` | `poll_instances` | Single launched poll (status: PENDING → STARTED → ENDED/CANCELLED) |
| `PollResult` | `poll_results` | Aggregated results per channel |
| `PollChannelLink` | `poll_channel_links` | Links a poll instance to streamer channels |

### Key Relationships

```
Campaign ──has many──► PollSession
PollSession ──has many──► Poll
Poll ──has many──► PollInstance
PollInstance ──has many──► PollResult
PollInstance ──has many──► PollChannelLink
```

---

## VTT Integration

| Model | Table | Description |
|-------|-------|-------------|
| `VttProvider` | `vtt_providers` | VTT platform definitions (Foundry, Roll20, etc.) |
| `VttConnection` | `vtt_connections` | User's connection to a VTT instance |
| `Character` | `characters` | Imported characters from VTT |
| `CharacterAssignment` | `character_assignments` | Streamer-to-character assignments |
| `DiceRoll` | `dice_rolls` | Dice rolls received from VTT |
| `TokenRevocationList` | `token_revocation_lists` | Revoked VTT connection tokens |

### Key Relationships

```
Campaign ──has many──► VttConnection
VttConnection ──has many──► Character
Character ──has many──► CharacterAssignment
CharacterAssignment ──belongs to──► Streamer
Campaign ──has many──► DiceRoll
```

---

## Gamification

| Model | Table | Description |
|-------|-------|-------------|
| `GamificationEvent` | `gamification_events` | Event definitions (dice roll, poll vote, etc.) |
| `GamificationInstance` | `gamification_instances` | Active gamification session with progress tracking |
| `GamificationContribution` | `gamification_contributions` | Viewer contributions to gamification goals |
| `StreamerGamificationConfig` | `streamer_gamification_configs` | Per-streamer gamification settings and Twitch reward |
| `CampaignGamificationConfig` | `campaign_gamification_configs` | Per-campaign gamification settings |

### Key Relationships

```
GamificationEvent ──has many──► CampaignGamificationConfig
GamificationEvent ──has many──► StreamerGamificationConfig
Campaign ──has many──► GamificationInstance
GamificationInstance ──has many──► GamificationContribution
```

### Instance Status Lifecycle

```
active → armed → completed (executed/failed)
active → expired (refund)
active → cancelled
```

> For complete gamification architecture documentation, see `docs/gamification/architecture.md`.

---

## Criticality Rules

| Model | Table | Description |
|-------|-------|-------------|
| `CampaignCriticalityRule` | `campaign_criticality_rules` | Dice criticality rules per campaign (custom + system presets) |
| `CampaignItemCategoryRule` | `campaign_item_category_rules` | Item category rules per campaign |

---

## Overlay & Notifications

| Model | Table | Description |
|-------|-------|-------------|
| `OverlayConfig` | `overlay_configs` | Overlay Studio visual configurations |
| `PushSubscription` | `push_subscriptions` | Web push notification subscriptions |
| `NotificationPreference` | `notification_preferences` | Per-user notification settings |

---

## System

| Model | Table | Description |
|-------|-------|-------------|
| `RetryEvent` | `retry_events` | Failed operation retry tracking |
| `Subscription` | `subscriptions` | User subscription (future monetization) |
| `PreflightReport` | `preflight_reports` | Pre-flight health check reports (JSONB checks column) |

---

## Migrations

Migrations are located in `backend/database/migrations/`.

```bash
# Run migrations
node --loader ts-node-maintained/esm bin/console.ts migration:run

# Rollback
node --loader ts-node-maintained/esm bin/console.ts migration:rollback

# Check status
node --loader ts-node-maintained/esm bin/console.ts migration:status
```

See the "Database Migration Safety" section in `CLAUDE.md` for production safety rules.
