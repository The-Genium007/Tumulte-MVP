# Services Reference

This document describes the main service classes in Tumulte backend.

## Service Architecture

Services contain business logic and orchestrate operations between repositories, external APIs, and other services.

```
Controller
    │
    ▼
Service ──────┬──────────────────┐
    │         │                  │
    ▼         ▼                  ▼
Repository  External API    Other Services
```

---

## AuthService

Handles authentication and Twitch OAuth.

### Methods

#### `redirectToTwitch(): string`
Returns the Twitch OAuth authorization URL.

#### `handleCallback(code: string): Promise<User>`
Exchanges OAuth code for tokens, creates/updates user.

**Flow**:
1. Exchange code for tokens with Twitch
2. Fetch user profile from Twitch
3. Create or update User record
4. Create or update Streamer record with encrypted tokens
5. Return authenticated user

#### `logout(session: Session): Promise<void>`
Invalidates the user session.

---

## CampaignService

Manages campaign operations.

### Methods

#### `getUserCampaigns(userId: number): Promise<Campaign[]>`
Returns all campaigns owned by the user.

#### `create(userId: number, data: CreateCampaignData): Promise<Campaign>`
Creates a new campaign.

**Validation**:
- Name must be 3-100 characters
- User must have GM role

#### `update(campaignId: number, userId: number, data: UpdateCampaignData): Promise<Campaign>`
Updates campaign details.

**Authorization**: User must be campaign owner.

#### `archive(campaignId: number, userId: number): Promise<void>`
Archives a campaign (soft delete).

#### `inviteStreamer(campaignId: number, twitchUsername: string): Promise<CampaignMembership>`
Invites a streamer to the campaign.

**Flow**:
1. Find user by Twitch username
2. Check not already invited
3. Create pending membership

---

## SessionService

Manages poll sessions within campaigns.

### Methods

#### `getCampaignSessions(campaignId: number): Promise<PollSession[]>`
Returns all sessions for a campaign.

#### `create(campaignId: number, data: CreateSessionData): Promise<PollSession>`
Creates a new session in draft status.

#### `launch(sessionId: number, userId: number): Promise<PollSession>`
Launches a session, making it active.

**Effects**:
- Sets status to `active`
- Sets `started_at` timestamp
- Notifies connected streamers via WebSocket

#### `end(sessionId: number): Promise<PollSession>`
Ends an active session.

---

## PollService

Manages polls and voting.

### Methods

#### `getSessionPolls(sessionId: number): Promise<Poll[]>`
Returns all polls in a session.

#### `create(sessionId: number, data: CreatePollData): Promise<Poll>`
Creates a poll template.

**Data structure**:
```typescript
{
  question: string
  choices: string[]
  durationSeconds: number
}
```

#### `launch(pollId: number): Promise<PollInstance>`
Launches a poll instance.

**Flow**:
1. Create PollInstance record
2. Create Twitch poll on each authorized channel
3. Broadcast poll start via WebSocket
4. Schedule poll end job

#### `aggregateResults(instanceId: number): Promise<AggregatedResults>`
Aggregates votes across all channels.

**Returns**:
```typescript
{
  totalVotes: number
  choices: [
    { id: 1, text: "Option A", votes: 150, percentage: 45 },
    { id: 2, text: "Option B", votes: 180, percentage: 55 }
  ]
}
```

---

## TwitchService

Handles Twitch API interactions.

### Methods

#### `exchangeCode(code: string): Promise<TwitchTokens>`
Exchanges OAuth code for access/refresh tokens.

#### `refreshToken(refreshToken: string): Promise<TwitchTokens>`
Refreshes an expired access token.

#### `getUser(accessToken: string): Promise<TwitchUser>`
Fetches user profile from Twitch.

#### `createPoll(channelId: string, accessToken: string, poll: PollData): Promise<TwitchPoll>`
Creates a poll on a Twitch channel.

**Parameters**:
- `channelId`: Broadcaster ID
- `accessToken`: Decrypted OAuth token
- `poll`: Poll configuration

#### `getPollResults(channelId: string, accessToken: string, pollId: string): Promise<TwitchPollResults>`
Fetches current poll results from Twitch.

---

## StreamerService

Manages streamer-specific operations.

### Methods

#### `getInvitations(userId: number): Promise<CampaignMembership[]>`
Returns pending campaign invitations for a streamer.

#### `acceptInvitation(invitationId: number, userId: number): Promise<void>`
Accepts a campaign invitation.

#### `authorizeChannel(campaignId: number, userId: number): Promise<void>`
Authorizes the streamer's channel for a campaign.

**Requirements**:
- Must be a member of the campaign
- Must have valid Twitch tokens

---

## TransmitService

Manages WebSocket broadcasts.

### Methods

#### `broadcastPollStart(sessionId: number, poll: PollInstance): void`
Broadcasts poll start to all session subscribers.

**Channel**: `polls/session-{sessionId}`
**Payload**:
```typescript
{
  type: 'poll-started',
  poll: PollInstance
}
```

#### `broadcastVoteUpdate(sessionId: number, results: AggregatedResults): void`
Broadcasts vote count updates.

**Channel**: `polls/session-{sessionId}`
**Payload**:
```typescript
{
  type: 'vote-update',
  results: AggregatedResults
}
```

#### `broadcastPollEnd(sessionId: number, instanceId: number, results: AggregatedResults): void`
Broadcasts poll end with final results.

---

## EncryptionService

Handles sensitive data encryption.

### Methods

#### `encrypt(value: string): string`
Encrypts a value using APP_KEY.

#### `decrypt(encrypted: string): string`
Decrypts an encrypted value.

**Usage**:
```typescript
// Storing token
streamer.accessToken = encryption.encrypt(token)

// Reading token
const token = encryption.decrypt(streamer.accessToken)
```

---

## Error Handling

Services throw typed exceptions:

```typescript
throw new NotFoundException('Campaign not found')
throw new UnauthorizedException('Not authenticated')
throw new ForbiddenException('Access denied')
throw new ValidationException('Invalid data', errors)
throw new TwitchApiException('Twitch API error', response)
```

These are caught by exception handlers and converted to appropriate HTTP responses.
