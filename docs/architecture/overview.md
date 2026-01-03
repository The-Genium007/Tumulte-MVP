# Architecture Overview

Tumulte is a monorepo containing two main applications that work together to provide multi-channel Twitch poll management.

## System Architecture

```
┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │
│    (Nuxt 3)     │◀────│   (AdonisJS)    │
└─────────────────┘     └────────┬────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │PostgreSQL│ │  Redis   │ │  Twitch  │
              │    16    │ │    7     │ │   API    │
              └──────────┘ └──────────┘ └──────────┘
```

## Components

### Frontend (Nuxt 3)

- **Framework**: Nuxt 3.15 with Vue 3.5
- **UI**: Nuxt UI v3 (TailwindCSS-based components)
- **State**: Pinia for state management
- **HTTP**: Axios for API calls

The frontend provides:
- User interface for GMs and Streamers
- Real-time poll display via WebSocket
- OBS overlay for streamers

### Backend (AdonisJS 6)

- **Framework**: AdonisJS 6.18 (TypeScript)
- **ORM**: Lucid (PostgreSQL)
- **Cache**: Redis for session and poll data
- **WebSocket**: Transmit for real-time updates

The backend provides:
- REST API for all operations
- WebSocket for real-time poll updates
- Twitch OAuth authentication
- Poll result aggregation

### Data Flow

```
1. GM creates campaign and polls
   └──▶ Backend stores in PostgreSQL

2. Streamer connects to campaign
   └──▶ Backend validates membership
   └──▶ Backend stores channel authorization

3. GM starts poll
   └──▶ Backend creates poll instance
   └──▶ Backend broadcasts via WebSocket (Transmit)
   └──▶ Frontend/Overlay receives poll

4. Viewers vote on Twitch
   └──▶ Twitch API receives votes
   └──▶ Backend polls Twitch for results
   └──▶ Backend aggregates across channels
   └──▶ Backend broadcasts updates via WebSocket

5. Poll ends
   └──▶ Backend stores final results
   └──▶ Frontend displays results
```

## Backend Architecture

The backend follows a layered architecture:

```
HTTP Request
     │
     ▼
┌─────────────┐
│  Middleware │  ← Auth, Rate limiting
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Controller │  ← Request handling, validation
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Service   │  ← Business logic
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Repository  │  ← Database queries
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Model    │  ← Lucid ORM entities
└─────────────┘
```

### Layer Responsibilities

| Layer | Responsibility |
|-------|---------------|
| **Controller** | HTTP handling, input validation, response formatting |
| **Service** | Business logic, orchestration, external API calls |
| **Repository** | Database queries, data access patterns |
| **Model** | Entity definition, relationships, hooks |
| **DTO** | Data transformation for API responses |
| **Validator** | Input validation schemas |

## Real-time Communication

Tumulte uses WebSocket (Transmit) for real-time features:

- Poll broadcast to streamers
- Vote count updates
- Session status changes

```typescript
// Server broadcasts
transmit.broadcast('polls/session-123', { type: 'poll-started', poll })
transmit.broadcast('polls/session-123', { type: 'vote-update', results })

// Client subscribes
const subscription = transmit.subscription('polls/session-123')
subscription.onMessage((data) => {
  // Handle real-time updates
})
```

## Security Architecture

### Authentication Flow

```
1. User clicks "Login with Twitch"
2. Backend redirects to Twitch OAuth
3. User authorizes on Twitch
4. Twitch redirects back with auth code
5. Backend exchanges code for tokens
6. Backend encrypts and stores tokens
7. Backend creates session cookie
```

### Authorization Model

- **Double Validation**: Streamers must be:
  1. Invited to the campaign (CampaignMembership)
  2. Authorized their Twitch channel

- **Role-based Access**:
  - GM: Full campaign management
  - Streamer: View campaigns, display overlays

## Database Schema Overview

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

## See Also

- [Backend Architecture](backend.md)
- [Frontend Architecture](frontend.md)
- [API Reference](../api/reference.md)
