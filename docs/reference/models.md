# Database Models

This document describes the database schema and model relationships in Tumulte.

## Entity Relationship Diagram

```
┌─────────┐      ┌──────────────────┐      ┌──────────┐
│  User   │─────▶│CampaignMembership│◀─────│ Campaign │
└────┬────┘      └──────────────────┘      └────┬─────┘
     │                                          │
     ▼                                          ▼
┌──────────┐                             ┌─────────────┐
│ Streamer │                             │ PollSession │
└──────────┘                             └──────┬──────┘
                                                │
                                                ▼
                                          ┌──────────┐
                                          │   Poll   │
                                          └────┬─────┘
                                               │
                                               ▼
                                       ┌──────────────┐
                                       │ PollInstance │
                                       └──────┬───────┘
                                              │
                                              ▼
                                       ┌────────────┐
                                       │ PollResult │
                                       └────────────┘
```

## Models

### User

Represents an authenticated user (GM or Streamer).

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| twitch_id | string | Twitch user ID (unique) |
| username | string | Twitch username |
| display_name | string | Twitch display name |
| email | string | User email (optional) |
| role | enum | Current role: `gm` or `streamer` |
| created_at | timestamp | Creation date |
| updated_at | timestamp | Last update |

**Relationships**:
- Has one Streamer
- Has many Campaigns (as owner)
- Has many CampaignMemberships

---

### Streamer

Stores Twitch channel information and OAuth tokens.

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| user_id | integer | Foreign key to User |
| access_token | string | Encrypted Twitch access token |
| refresh_token | string | Encrypted Twitch refresh token |
| token_expires_at | timestamp | Token expiration date |
| broadcaster_type | string | Twitch broadcaster type |
| created_at | timestamp | Creation date |
| updated_at | timestamp | Last update |

**Relationships**:
- Belongs to User

**Security Note**: Tokens are encrypted before storage.

---

### Campaign

Represents a game campaign that groups poll sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| user_id | integer | Foreign key to User (owner) |
| name | string | Campaign name |
| description | text | Campaign description (optional) |
| status | enum | Status: `active` or `archived` |
| created_at | timestamp | Creation date |
| updated_at | timestamp | Last update |

**Relationships**:
- Belongs to User (owner)
- Has many PollSessions
- Has many CampaignMemberships

---

### CampaignMembership

Junction table for campaign-streamer invitations.

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| campaign_id | integer | Foreign key to Campaign |
| user_id | integer | Foreign key to User (streamer) |
| status | enum | Status: `pending`, `accepted`, `declined` |
| channel_authorized | boolean | Whether channel is authorized |
| invited_at | timestamp | Invitation date |
| responded_at | timestamp | Response date (optional) |

**Relationships**:
- Belongs to Campaign
- Belongs to User

---

### PollSession

Represents a game session during which polls can be run.

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| campaign_id | integer | Foreign key to Campaign |
| name | string | Session name |
| status | enum | Status: `draft`, `active`, `ended` |
| started_at | timestamp | When session started (optional) |
| ended_at | timestamp | When session ended (optional) |
| created_at | timestamp | Creation date |
| updated_at | timestamp | Last update |

**Relationships**:
- Belongs to Campaign
- Has many Polls

---

### Poll

Defines a poll template with question and choices.

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| session_id | integer | Foreign key to PollSession |
| question | string | Poll question |
| choices | json | Array of choice objects |
| duration_seconds | integer | Poll duration in seconds |
| created_at | timestamp | Creation date |
| updated_at | timestamp | Last update |

**Choices JSON structure**:
```json
[
  { "id": 1, "text": "Option A" },
  { "id": 2, "text": "Option B" }
]
```

**Relationships**:
- Belongs to PollSession
- Has many PollInstances

---

### PollInstance

Represents a launched instance of a poll.

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| poll_id | integer | Foreign key to Poll |
| status | enum | Status: `active`, `closed` |
| twitch_poll_id | string | Twitch poll ID (optional) |
| started_at | timestamp | When poll started |
| ends_at | timestamp | When poll will end |
| ended_at | timestamp | When poll actually ended (optional) |
| created_at | timestamp | Creation date |

**Relationships**:
- Belongs to Poll
- Has many PollResults

---

### PollResult

Stores aggregated poll results per channel.

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| poll_instance_id | integer | Foreign key to PollInstance |
| streamer_id | integer | Foreign key to Streamer |
| choice_id | integer | Choice ID from poll |
| votes | integer | Number of votes |
| updated_at | timestamp | Last update |

**Relationships**:
- Belongs to PollInstance
- Belongs to Streamer

---

## Indexes

Key indexes for query performance:

```sql
-- User lookups
CREATE UNIQUE INDEX users_twitch_id_unique ON users(twitch_id);

-- Campaign queries
CREATE INDEX campaigns_user_id_index ON campaigns(user_id);
CREATE INDEX campaigns_status_index ON campaigns(status);

-- Membership queries
CREATE INDEX memberships_campaign_id_index ON campaign_memberships(campaign_id);
CREATE INDEX memberships_user_id_index ON campaign_memberships(user_id);

-- Session queries
CREATE INDEX sessions_campaign_id_index ON poll_sessions(campaign_id);
CREATE INDEX sessions_status_index ON poll_sessions(status);

-- Poll result aggregation
CREATE INDEX results_instance_id_index ON poll_results(poll_instance_id);
CREATE INDEX results_streamer_id_index ON poll_results(streamer_id);
```

## Migrations

Migrations are located in `backend/database/migrations/`.

Run migrations:
```bash
node --loader ts-node-maintained/esm bin/console.ts migration:run
```

Rollback:
```bash
node --loader ts-node-maintained/esm bin/console.ts migration:rollback
```
