# Gamification System - Complete Architecture Analysis

## Overview

The gamification system is a sophisticated event-driven architecture that allows Game Masters (GMs) to create engaging goals with Twitch channel point rewards. The system supports:

- **Multiple event types**: Dice critical hits, manual triggers, custom triggers
- **Multiple action types**: Dice inversion, chat messages, stat modifications, custom actions
- **Individual & group instances**: Per-streamer or multi-streamer goals
- **Progress tracking**: Contributions accumulate toward objectives
- **Twitch integration**: Automatic reward creation and redemption handling
- **Foundry VTT integration**: Execute game effects when goals are reached

---

## 1. Core Models & Database Schema

### GamificationEvent
**File**: `/backend/app/models/gamification_event.ts`

Template definition of a gamification event type. System events are built-in; custom ones created by GMs.

```typescript
class GamificationEvent extends BaseModel {
  // Identifiers
  id: string
  name: string
  slug: string
  description: string | null

  // Type configuration
  type: 'individual' | 'group'                    // Per-streamer or all-streamers
  triggerType: 'dice_critical' | 'manual' | 'custom'
  triggerConfig: TriggerConfig | null             // Dice critical thresholds, etc.
  actionType: 'dice_invert' | 'chat_message' | 'stat_modify' | 'custom'
  actionConfig: ActionConfig | null               // Action-specific parameters

  // Default parameters (overrideable per campaign)
  defaultCost: number                             // Points per click (100)
  defaultObjectiveCoefficient: number             // % of viewers (0.3 = 30%)
  defaultMinimumObjective: number                 // Min clicks protected for small streams (3)
  defaultDuration: number                         // Duration in seconds (60)

  // Cooldown management
  cooldownType: 'time' | 'gm_validation' | 'event_complete'
  cooldownConfig: { durationSeconds?: number } | null

  // Appearance
  rewardColor: string                             // Hex color for Twitch reward

  // Metadata
  isSystemEvent: boolean
  createdById: string | null
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Relations**: `hasMany('CampaignGamificationConfig')`

### GamificationInstance
**File**: `/backend/app/models/gamification_instance.ts`

Active occurrence of a gamification event with progress tracking toward an objective.

```typescript
class GamificationInstance extends BaseModel {
  // Identity
  id: string
  campaignId: string
  eventId: string

  // Instance configuration
  type: 'individual' | 'group'
  status: 'active' | 'armed' | 'completed' | 'expired' | 'cancelled'

  // Progress tracking
  triggerData: TriggerData | null               // Dice roll, activation data, custom data
  objectiveTarget: number                       // Total clicks needed
  currentProgress: number                       // Current clicks
  duration: number                              // Duration in seconds
  startsAt: DateTime
  expiresAt: DateTime

  // Completion & execution
  completedAt: DateTime | null
  resultData: ResultData | null                 // Action result (success/error)
  executionStatus: 'pending' | 'executed' | 'failed' | null
  executedAt: DateTime | null
  armedAt: DateTime | null                      // When goal filled, waiting for critical

  // Cooldown management
  cooldownEndsAt: DateTime | null

  // Individual instance fields
  streamerId: string | null                     // For individual instances
  viewerCountAtStart: number | null

  // Group instance fields
  streamerSnapshots: StreamerSnapshot[] | null  // Per-streamer objectives & contributions

  // Computed properties
  get isActive(): boolean
  get isObjectiveReached(): boolean
  get progressPercentage(): number
  get remainingSeconds(): number
  get isOnCooldown(): boolean
  get isArmed(): boolean
  get canBeConsumed(): boolean
  get acceptsContributions(): boolean
}

interface TriggerData {
  diceRoll?: {
    rollId: string
    characterId: string | null
    characterName: string | null
    formula: string
    result: number
    diceResults: number[]
    criticalType: 'success' | 'failure'
    messageId?: string
  }
  activation?: {
    triggeredBy: string
    twitchUserId: string
    redemptionId: string
  }
  custom?: Record<string, unknown>
}

interface StreamerSnapshot {
  streamerId: string
  streamerName: string
  viewerCount: number
  localObjective: number
  contributions: number
}
```

### CampaignGamificationConfig
**File**: `/backend/app/models/campaign_gamification_config.ts`

GM configuration for an event in a campaign. Allows enable/disable and parameter overrides.

```typescript
class CampaignGamificationConfig extends BaseModel {
  id: string
  campaignId: string
  eventId: string

  // Configuration
  isEnabled: boolean
  cost: number | null                          // Override
  objectiveCoefficient: number | null          // Override
  minimumObjective: number | null              // Override
  duration: number | null                      // Override
  cooldown: number | null                      // Override
  maxClicksPerUserPerSession: number           // (0 = unlimited)

  // Twitch reward
  twitchRewardId: string | null

  // Helpers
  getEffectiveCost(event: GamificationEvent): number
  getEffectiveCoefficient(event: GamificationEvent): number
  getEffectiveMinimumObjective(event: GamificationEvent): number
  getEffectiveDuration(event: GamificationEvent): number
}
```

### StreamerGamificationConfig
**File**: `/backend/app/models/streamer_gamification_config.ts`

Per-streamer configuration for event activation. Streamers can override the cost and control their own reward.

```typescript
class StreamerGamificationConfig extends BaseModel {
  id: string
  campaignId: string
  streamerId: string
  eventId: string

  // Configuration
  isEnabled: boolean
  costOverride: number | null                  // Cost hierarchy: streamer > campaign > event default

  // Twitch reward management
  twitchRewardId: string | null
  twitchRewardStatus: 'not_created' | 'active' | 'paused' | 'deleted' | 'orphaned'

  // Orphan tracking (for failed deletions)
  deletionFailedAt: DateTime | null
  deletionRetryCount: number
  nextDeletionRetryAt: DateTime | null

  // Helpers
  getEffectiveCost(campaignConfig: CampaignGamificationConfig | null, event: GamificationEvent): number
  get isTwitchRewardActive(): boolean
  get canCreateTwitchReward(): boolean
  get isOrphaned(): boolean
  get isCleanupDue(): boolean
}
```

### GamificationContribution
**File**: `/backend/app/models/gamification_contribution.ts`

Records each viewer click/redemption toward a goal.

```typescript
class GamificationContribution extends BaseModel {
  id: string
  instanceId: string
  streamerId: string
  twitchUserId: string                         // Viewer's Twitch ID
  twitchUsername: string
  amount: number                               // Points spent
  twitchRedemptionId: string                   // For deduplication

  // Refund tracking (if instance expires)
  refunded: boolean
  refundedAt: DateTime | null

  createdAt: DateTime
}
```

---

## 2. Handler System (Plugin Architecture)

The gamification system uses a **registry-based handler pattern** for extensibility. New action/trigger types can be added by implementing the interface and registering in the container.

### Handler Interfaces
**File**: `/backend/app/services/gamification/handlers/types.ts`

```typescript
export interface TriggerHandler {
  type: string                                  // Must match triggerType in GamificationEvent
  evaluate(config: TriggerConfig | null, data: unknown): TriggerEvaluationResult
  preFlightCheck?(ctx: CheckContext): Promise<CheckResult>
}

export interface ActionHandler {
  type: string                                  // Must match actionType in GamificationEvent
  requires: string[]                            // Dependencies ('vtt_connection', etc.)
  execute(config: ActionConfig | null, instance: GamificationInstance, connectionId: string): Promise<ResultData>
  preFlightCheck?(ctx: CheckContext): Promise<CheckResult>
}

export interface TriggerEvaluationResult {
  shouldTrigger: boolean
  triggerData: TriggerData | null
  reason?: string
}
```

### Registries
**Files**:
- `/backend/app/services/gamification/handlers/trigger_handler_registry.ts`
- `/backend/app/services/gamification/handlers/action_handler_registry.ts`

```typescript
class TriggerHandlerRegistry {
  private handlers: Map<string, TriggerHandler> = new Map()

  register(handler: TriggerHandler): void
  get(type: string): TriggerHandler | undefined
  has(type: string): boolean
  all(): TriggerHandler[]
  get size(): number
}

class ActionHandlerRegistry {
  private handlers: Map<string, ActionHandler> = new Map()

  register(handler: ActionHandler): void
  get(type: string): ActionHandler | undefined
  has(type: string): boolean
  all(): ActionHandler[]
  get size(): number
}
```

---

## 3. Trigger Handlers

Located in `/backend/app/services/gamification/handlers/triggers/`

### ManualTrigger
**File**: `/backend/app/services/gamification/handlers/triggers/manual_trigger.ts`

GM-initiated events that always trigger.

```typescript
class ManualTrigger implements TriggerHandler {
  type = 'manual'

  evaluate(_config: TriggerConfig | null, data: unknown): TriggerEvaluationResult {
    return {
      shouldTrigger: true,
      triggerData: { custom: data as Record<string, unknown> },
    }
  }
}
```

**Usage**: When GM manually triggers an event via API or UI.

### DiceCriticalTrigger
**File**: `/backend/app/services/gamification/handlers/triggers/dice_critical_trigger.ts`

Evaluates critical dice rolls from Foundry VTT.

```typescript
interface DiceRollData {
  rollId: string
  characterId: string | null
  characterName: string | null
  formula: string
  result: number
  diceResults: number[]
  isCritical: boolean
  criticalType: 'success' | 'failure' | null
  messageId?: string
}

class DiceCriticalTrigger implements TriggerHandler {
  type = 'dice_critical'

  evaluate(config: TriggerConfig | null, data: unknown): TriggerEvaluationResult {
    const diceRoll = data as DiceRollData

    if (!config || !diceRoll.isCritical || !diceRoll.criticalType) {
      return { shouldTrigger: false, triggerData: null }
    }

    // Check if configured threshold is met
    if (diceRoll.criticalType === 'success' && config.criticalSuccess?.enabled) {
      if (config.criticalSuccess.threshold !== undefined) {
        const maxDie = Math.max(...diceRoll.diceResults)
        if (maxDie < config.criticalSuccess.threshold) {
          return { shouldTrigger: false, triggerData: null }
        }
      }
      return { shouldTrigger: true, triggerData: this.extractDiceTriggerData(diceRoll) }
    }

    // Similar check for critical failures...
  }
}
```

**Usage**: Triggers when Foundry VTT sends a critical roll (d20 = 20 or 1) that meets the threshold.

### CustomTrigger
**File**: `/backend/app/services/gamification/handlers/triggers/custom_trigger.ts`

Placeholder for custom rule evaluation.

```typescript
class CustomTrigger implements TriggerHandler {
  type = 'custom'

  evaluate(_config: TriggerConfig | null, data: unknown): TriggerEvaluationResult {
    if (!data) {
      return { shouldTrigger: false, triggerData: null }
    }
    return { shouldTrigger: true, triggerData: { custom: data } }
  }
}
```

---

## 4. Action Handlers

Located in `/backend/app/services/gamification/handlers/actions/`

### DiceInvertAction
**File**: `/backend/app/services/gamification/handlers/actions/dice_invert_action.ts`

Inverts a critical dice result (success → 1, failure → 20).

```typescript
class DiceInvertAction implements ActionHandler {
  type = 'dice_invert'
  requires = ['vtt_connection']  // Needs Foundry VTT connection

  async execute(
    config: ActionConfig | null,
    instance: GamificationInstance,
    connectionId: string
  ): Promise<ResultData> {
    const diceData = instance.triggerData?.diceRoll
    if (!diceData) {
      return { success: false, error: 'Dice data missing' }
    }

    const invertedResult = diceData.criticalType === 'success' ? 1 : 20

    // Delete original message (optional)
    if (config?.diceInvert?.deleteOriginal !== false && diceData.messageId) {
      await this.foundryCommandService.deleteChatMessage(connectionId, diceData.messageId)
    }

    // Re-roll with inverted value
    const result = await this.foundryCommandService.rollDice(
      connectionId,
      diceData.formula,
      invertedResult,
      config?.diceInvert?.trollMessage || "🎭 The chat inverted fate! It's their fault..."
    )

    return {
      success: result.success,
      message: `Dice inverted: ${diceData.result} → ${invertedResult}`,
      actionResult: { originalResult: diceData.result, invertedResult }
    }
  }
}
```

**Usage**: Viewer goal reached → dice critical affected by the goal gets inverted (comedic effect).

### ChatMessageAction
**File**: `/backend/app/services/gamification/handlers/actions/chat_message_action.ts`

Sends a message in Foundry VTT chat.

```typescript
class ChatMessageAction implements ActionHandler {
  type = 'chat_message'
  requires = ['vtt_connection']

  async execute(
    config: ActionConfig | null,
    _instance: GamificationInstance,
    connectionId: string
  ): Promise<ResultData> {
    const chatConfig = config?.chatMessage
    if (!chatConfig?.content) {
      return { success: false, error: 'Message content missing' }
    }

    const result = await this.foundryCommandService.sendChatMessage(
      connectionId,
      chatConfig.content,
      chatConfig.speaker
    )

    return {
      success: result.success,
      message: result.success ? 'Message sent' : undefined,
      error: result.error
    }
  }
}
```

### StatModifyAction
**File**: `/backend/app/services/gamification/handlers/actions/stat_modify_action.ts`

Modifies actor stats (HP, attributes, etc.) in Foundry VTT.

```typescript
class StatModifyAction implements ActionHandler {
  type = 'stat_modify'
  requires = ['vtt_connection']

  async execute(
    config: ActionConfig | null,
    _instance: GamificationInstance,
    connectionId: string
  ): Promise<ResultData> {
    const statConfig = config?.statModify
    if (!statConfig?.actorId || !statConfig?.updates) {
      return { success: false, error: 'Stat config incomplete' }
    }

    const result = await this.foundryCommandService.modifyActor(
      connectionId,
      statConfig.actorId,
      statConfig.updates
    )

    return { success: result.success, error: result.error }
  }
}
```

### CustomAction
**File**: `/backend/app/services/gamification/handlers/actions/custom_action.ts`

Placeholder for custom actions.

```typescript
class CustomAction implements ActionHandler {
  type = 'custom'
  requires: string[] = []

  async execute(config: ActionConfig | null, instance: GamificationInstance, _connectionId: string): Promise<ResultData> {
    logger.info({ instanceId: instance.id, customActions: config?.customActions }, 'Custom action executed')
    return { success: true, actionResult: config?.customActions }
  }
}
```

---

## 5. Core Services

### TriggerEvaluator
**File**: `/backend/app/services/gamification/trigger_evaluator.ts`

Evaluates whether a trigger condition is met by delegating to registered handlers.

```typescript
class TriggerEvaluator {
  constructor(private registry: TriggerHandlerRegistry) {}

  evaluate(event: GamificationEvent, data: unknown): TriggerEvaluationResult {
    const handler = this.registry.get(event.triggerType)
    if (!handler) {
      return { shouldTrigger: false, triggerData: null, reason: 'Unknown trigger type' }
    }
    return handler.evaluate(event.triggerConfig, data)
  }

  isSupportedTriggerType(triggerType: string): boolean {
    return this.registry.has(triggerType)
  }
}
```

### ActionExecutor
**File**: `/backend/app/services/gamification/action_executor.ts`

Executes actions by delegating to registered handlers.

```typescript
class ActionExecutor {
  constructor(private registry?: ActionHandlerRegistry) {}

  setFoundryCommandService(service: FoundryCommandService): void {
    // Propagate to all handlers that need it
    if (this.registry) {
      for (const handler of this.registry.all()) {
        if ('setFoundryCommandService' in handler) {
          handler.setFoundryCommandService(service)
        }
      }
    }
  }

  async execute(
    event: GamificationEvent,
    instance: GamificationInstance,
    connectionId: string
  ): Promise<ResultData> {
    const handler = this.registry?.get(event.actionType)
    if (!handler) {
      return { success: false, error: `Unknown action type: ${event.actionType}` }
    }
    return handler.execute(event.actionConfig, instance, connectionId)
  }
}
```

### InstanceManager
**File**: `/backend/app/services/gamification/instance_manager.ts`

Manages the full lifecycle of instances: creation, progress, completion, expiration.

```typescript
class InstanceManager {
  constructor(
    private objectiveCalculator: ObjectiveCalculator,
    private actionExecutor: ActionExecutor,
    private executionTracker: ExecutionTracker
  ) {}

  // Create individual instance (per-streamer goal)
  async createIndividual(data: CreateIndividualInstanceData): Promise<GamificationInstance>

  // Create group instance (all-streamers goal)
  async createGroup(data: CreateGroupInstanceData): Promise<GamificationInstance>

  // Add a contribution (viewer click)
  async addContribution(
    instanceId: string,
    contribution: ContributionData
  ): Promise<{ instance: GamificationInstance; objectiveReached: boolean }>

  // Complete when objective reached
  async complete(
    instance: GamificationInstance,
    event: GamificationEvent,
    config: CampaignGamificationConfig,
    connectionId: string,
    executeImmediately: boolean = false
  ): Promise<GamificationInstance>

  // Mark executed (Foundry callback)
  async markExecuted(
    instanceId: string,
    success: boolean,
    message?: string
  ): Promise<GamificationInstance | null>

  // Expire when time runs out
  async expire(instance: GamificationInstance): Promise<GamificationInstance>

  // Cancel manually
  async cancel(instance: GamificationInstance): Promise<GamificationInstance>

  // Check if on cooldown
  async isOnCooldown(
    campaignId: string,
    eventId: string,
    streamerId?: string
  ): Promise<{ onCooldown: boolean; endsAt: DateTime | null }>

  // Get active instances
  async getActiveInstances(campaignId: string): Promise<GamificationInstance[]>

  // Get armed instance for streamer (for consumption)
  async getArmedInstanceForStreamer(
    campaignId: string,
    streamerId: string,
    eventId?: string
  ): Promise<GamificationInstance | null>

  // Consume armed instance (execute action on critical dice roll)
  async consumeArmedInstance(
    instance: GamificationInstance,
    event: GamificationEvent,
    config: CampaignGamificationConfig,
    connectionId: string,
    diceData: DiceRollData
  ): Promise<GamificationInstance>
}

interface CreateIndividualInstanceData {
  campaign: Campaign
  event: GamificationEvent
  config: CampaignGamificationConfig
  streamerId: string
  streamerName: string
  viewerCount: number
  triggerData: TriggerData
}

interface CreateGroupInstanceData {
  campaign: Campaign
  event: GamificationEvent
  config: CampaignGamificationConfig
  streamersData: StreamerData[]
  triggerData: TriggerData
}

interface ContributionData {
  streamerId: string
  twitchUserId: string
  twitchUsername: string
  amount: number
  twitchRedemptionId: string
}
```

### ObjectiveCalculator
**File**: `/backend/app/services/gamification/objective_calculator.ts`

Calculates fair objectives based on viewer count.

```typescript
class ObjectiveCalculator {
  // Formula: max(minimumObjective, viewerCount × coefficient)
  calculateIndividual(
    viewerCount: number,
    config: CampaignGamificationConfig,
    event: GamificationEvent
  ): number {
    const coefficient = config.getEffectiveCoefficient(event)
    const minimumObjective = config.getEffectiveMinimumObjective(event)
    const calculatedObjective = Math.round(viewerCount * coefficient)
    return Math.max(minimumObjective, calculatedObjective)
  }

  calculateGroup(
    streamersData: StreamerData[],
    config: CampaignGamificationConfig,
    event: GamificationEvent
  ): GroupObjectiveResult {
    const streamerSnapshots = streamersData.map((streamer) => {
      const localObjective = this.calculateIndividual(streamer.viewerCount, config, event)
      return { ...streamer, localObjective, contributions: 0 }
    })
    const totalObjective = streamerSnapshots.reduce((sum, s) => sum + s.localObjective, 0)
    return { totalObjective, streamerSnapshots }
  }

  // Recalculate if viewers fluctuate significantly (>20% by default)
  recalculateIfSignificantChange(
    currentObjective: number,
    oldViewerCount: number,
    newViewerCount: number,
    config: CampaignGamificationConfig,
    event: GamificationEvent,
    variationThreshold: number = 0.2
  ): number | null
}
```

### ExecutionTracker
**File**: `/backend/app/services/gamification/execution_tracker.ts`

Tracks instances waiting for Foundry VTT execution. Uses Redis for fast lookups, PostgreSQL as source of truth.

```typescript
class ExecutionTracker {
  // Mark instance as pending execution (in Redis + PostgreSQL)
  async markPendingExecution(
    instance: GamificationInstance,
    eventName: string,
    actionType: string
  ): Promise<void>

  // Mark as executed (callback from Foundry VTT)
  async markExecuted(
    instanceId: string,
    success: boolean,
    message?: string
  ): Promise<{ instance: GamificationInstance; payload: ActionExecutedPayload } | null>

  // Get all pending instances for a campaign
  async getPendingInstances(campaignId: string): Promise<GamificationInstance[]>

  // Get pending for specific streamer
  async getPendingInstancesForStreamer(streamerId: string): Promise<GamificationInstance[]>

  // Check if instance is pending
  async isPending(instanceId: string): Promise<boolean>

  // Cleanup orphaned Redis entries
  async cleanupOrphaned(): Promise<number>
}

interface PendingExecutionData {
  instanceId: string
  campaignId: string
  eventId: string
  streamerId: string | null
  actionType: string
  eventName: string
  triggerData: { diceRoll?: { originalValue: number; invertedValue: number; characterName: string } } | null
  completedAt: string
}

interface ActionExecutedPayload {
  instanceId: string
  eventName: string
  actionType: 'dice_invert' | 'chat_message' | 'stat_modify'
  success: boolean
  message?: string
  originalValue?: number
  invertedValue?: number
}
```

**WebSocket Broadcast**: When action is executed, broadcasts to `streamer:{streamerId}:polls` channel.

### GamificationService
**File**: `/backend/app/services/gamification/gamification_service.ts`

Main orchestrator service. Handles event management, triggers, contributions, and lifecycle.

```typescript
class GamificationService {
  constructor(
    private triggerEvaluator: TriggerEvaluator,
    private instanceManager: InstanceManager,
    private actionExecutor: ActionExecutor
  ) {}

  // Event management
  async getAvailableEvents(): Promise<GamificationEvent[]>
  async getEventBySlug(slug: string): Promise<GamificationEvent | null>
  async getCampaignConfig(campaignId: string, eventId: string): Promise<CampaignGamificationConfig | null>
  async getCampaignConfigs(campaignId: string): Promise<CampaignGamificationConfig[]>
  async enableEventForCampaign(
    campaignId: string,
    eventId: string,
    overrides?: { cost?: number; objectiveCoefficient?: number; /* ... */ }
  ): Promise<CampaignGamificationConfig>
  async disableEventForCampaign(campaignId: string, eventId: string): Promise<void>

  // Triggers
  async onDiceRoll(
    campaignId: string,
    streamerId: string,
    streamerName: string,
    viewerCount: number,
    diceRollData: DiceRollData
  ): Promise<GamificationInstance | null>

  async triggerManualEvent(
    campaignId: string,
    eventId: string,
    streamerId: string,
    streamerName: string,
    viewerCount: number,
    customData?: Record<string, unknown>
  ): Promise<GamificationInstance | null>

  // Contributions
  async onRedemption(redemption: TwitchRedemptionData): Promise<{
    processed: boolean
    instance?: GamificationInstance
    objectiveReached?: boolean
  }>

  // Instance management
  async getActiveInstance(campaignId: string, streamerId: string, eventId?: string): Promise<GamificationInstance | null>
  async completeInstance(
    instanceId: string,
    connectionId: string,
    executeImmediately?: boolean
  ): Promise<GamificationInstance | null>
  async consumeArmedInstance(
    instanceId: string,
    diceRollData: DiceRollData,
    connectionId: string
  ): Promise<GamificationInstance | null>
  async cancelInstance(instanceId: string): Promise<GamificationInstance | null>
}
```

### RewardManagerService
**File**: `/backend/app/services/gamification/reward_manager_service.ts`

Orchestrates Twitch Channel Point reward creation and deletion for gamification events.

**Strategy**: "Delete-before-recreate" — Always delete the old reward before creating a new one to ensure the "New" badge appears on Twitch, increasing visibility.

```typescript
class RewardManagerService {
  // Enable an event for a streamer (create Twitch reward)
  async enableForStreamer(
    streamer: Streamer,
    campaignId: string,
    eventId: string,
    costOverride?: number
  ): Promise<StreamerGamificationConfig>

  // Disable for streamer (pause Twitch reward)
  async disableForStreamer(streamer: Streamer, campaignId: string, eventId: string): Promise<void>

  // Disable for entire campaign (pause all streamer rewards)
  async disableForCampaign(campaignId: string, eventId: string): Promise<void>

  // Delete orphaned rewards (failed deletion tracking)
  async cleanupOrphanedRewards(): Promise<void>

  // Update reward cost
  async updateRewardCost(
    streamer: Streamer,
    campaignId: string,
    eventId: string,
    newCost: number
  ): Promise<StreamerGamificationConfig | null>
}
```

**Lifecycle**:
1. GM enables event for campaign
2. Streamer activates for their channel → `enableForStreamer()`
3. Creates Twitch reward with effective cost (streamer override > campaign config > event default)
4. Creates EventSub subscription to receive redemptions
5. When disabled → pause reward (don't delete to preserve ID)

### RefundService
**File**: `/backend/app/services/gamification/refund_service.ts`

Automatically refunds channel points when an instance expires without reaching the objective.

```typescript
class RefundService {
  async refundInstance(instance: GamificationInstance): Promise<RefundResult>
}

interface RefundResult {
  instanceId: string
  totalContributions: number
  refundedCount: number
  failedCount: number
  errors: Array<{ contributionId: string; twitchUserId: string; error: string }>
}
```

**Flow**:
1. Instance expires → status = 'expired'
2. Job/scheduler detects expiration
3. Calls `refundInstance()` for each expired instance
4. For each contribution → calls Twitch API refund
5. Marks contribution as `refunded = true`
6. Broadcasts refund event via WebSocket

---

## 6. Gamification Instance Lifecycle

### States & Transitions

```
CREATION
   │
   ├─ Trigger evaluation (dice critical, manual, custom)
   │
   ├─ Create instance with status='active'
   │  - Calculate objective (viewers × coefficient)
   │  - Set expiration time
   │
   ├─ Broadcast instance created
   │
   └─────────────────────────────┐
                                 │
                     ACTIVE STATE (accepting contributions)
                                 │
                     ┌───────────┴───────────┐
                     │                       │
             Contributions arrive    No more time
             (Twitch redemptions)   (expiration)
                     │                       │
                     ▼                       ▼
              Progress += 1          EXPIRED STATE
              Check: objective?       │
                     │                ├─ Refund all contributions
                     │                └─ Broadcast expiration
                     │
           ┌─────────┴──────────┐
           │                    │
        Reached!           Not reached
           │
           ▼
    ARMED STATE (if event supports arming)
    (waiting for critical dice roll)
    │
    ├─ Critical roll received
    │  - Matches trigger config?
    │  - Try consume armed instance
    │
    └─────────────┬──────────────┐
                  │              │
             Can consume    No trigger match
                  │              │
                  ▼              ▼
              COMPLETED      Stay ARMED
           (execute action)   (expires later)
                  │
        ┌─────────┼─────────┐
        │         │         │
        ▼         ▼         ▼
     PENDING  EXECUTED  FAILED
    (waiting) (success) (error)
        │
        ├─ Foundry VTT executes action
        │
        ├─ Set cooldown (time-based)
        │
        └─ Broadcast action_executed via WebSocket
```

### Status Meanings

| Status | Meaning | Actions Allowed |
|--------|---------|-----------------|
| `active` | Accepting contributions, waiting for objective | Add contributions, cancel, force-complete |
| `armed` | Objective reached, waiting for critical dice roll to consume | Wait for dice roll, cancel |
| `completed` | Objective reached and action executed (or pending execution) | None |
| `expired` | Time ran out without reaching objective | None (refund happens async) |
| `cancelled` | Manually cancelled by GM | None |

### Key Instance Methods (computed properties)

```typescript
get isActive(): boolean              // status === 'active' && not expired
get isObjectiveReached(): boolean    // currentProgress >= objectiveTarget
get progressPercentage(): number     // (currentProgress / objectiveTarget) * 100
get remainingSeconds(): number       // Math.max(0, diff seconds to expiration)
get isOnCooldown(): boolean          // cooldownEndsAt !== null && now < cooldownEndsAt
get isArmed(): boolean               // status === 'armed'
get canBeConsumed(): boolean         // status === 'armed'
get acceptsContributions(): boolean  // status === 'active' && not expired
```

---

## 7. Twitch Channel Point Rewards

### RewardManagerService - Delete-Before-Recreate Strategy

When enabling an event for a streamer:

```typescript
async enableForStreamer(streamer: Streamer, campaignId: string, eventId: string, costOverride?: number) {
  // 1. Verify event is enabled by GM
  const campaignConfig = await this.campaignConfigRepo.findByCampaignAndEvent(campaignId, eventId)
  if (!campaignConfig?.isEnabled) throw new Error("Event not enabled for campaign")

  // 2. Find or create streamer config
  let streamerConfig = await this.streamerConfigRepo.findByStreamerCampaignAndEvent(...)
  if (!streamerConfig) {
    streamerConfig = await this.streamerConfigRepo.create({ campaignId, streamerId, eventId, isEnabled: true, ... })
  }

  // 3. DELETE old reward if it exists (delete-before-recreate strategy)
  if (streamerConfig.twitchRewardId) {
    await this.deleteExistingReward(streamer, streamerConfig, logCtx)
  }

  // 4. CREATE fresh reward
  const effectiveCost = streamerConfig.getEffectiveCost(campaignConfig, event)
  const reward = await this.createFreshReward(streamer, streamerConfig, event, effectiveCost, logCtx)

  // 5. CREATE EventSub subscription for redemptions
  await this.ensureEventSubSubscription(streamer, reward.id, logCtx)

  return streamerConfig
}
```

**Why delete-before-recreate?**
- Ensures fresh "New" badge on Twitch (improves discoverability)
- Avoids `DUPLICATE_REWARD` API errors
- Clean slate for configuration

### Cost Hierarchy

```
StreamerGamificationConfig.costOverride
  ↑
  (if null, fallback to:)

CampaignGamificationConfig.cost
  ↑
  (if null, fallback to:)

GamificationEvent.defaultCost
```

---

## 8. Routes

Located in `/backend/start/routes.ts`

### GM Routes (authenticated, requires campaign membership)

```
GET    /mj/gamification/events
       → GamificationController.listEvents()

GET    /mj/gamification/events/:eventId
       → GamificationController.showEvent()

GET    /mj/campaigns/:id/gamification
       → GamificationController.getCampaignConfig()

POST   /mj/campaigns/:id/gamification/events/:eventId/enable
       → GamificationController.enableEvent()

DELETE /mj/campaigns/:id/gamification/events/:eventId/disable
       → GamificationController.disableEvent()

PATCH  /mj/campaigns/:id/gamification/events/:eventId
       → GamificationController.updateConfig()

GET    /mj/campaigns/:id/gamification/instances
       → GamificationController.listInstances()

POST   /mj/campaigns/:id/gamification/trigger
       → GamificationController.triggerEvent()

DELETE /mj/campaigns/:id/gamification/instances/:instanceId/cancel
       → GamificationController.cancelInstance()

POST   /mj/campaigns/:id/gamification/instances/:instanceId/force-complete
       → GamificationController.forceComplete()

POST   /mj/campaigns/:id/gamification/events/:eventId/simulate-redemption
       → GamificationController.simulateRedemption()

POST   /mj/campaigns/:id/gamification/reset-cooldowns
       → GamificationController.resetCooldowns()

GET    /mj/campaigns/:id/gamification/stats
       → GamificationController.getStats()
```

### Streamer Routes (authenticated)

```
GET    /streamer/campaigns/:campaignId/gamification
       → Lists available events with per-streamer config

POST   /streamer/campaigns/:campaignId/gamification/events/:eventId/enable
       → Enable event for streamer (creates Twitch reward)

POST   /streamer/campaigns/:campaignId/gamification/events/:eventId/disable
       → Disable event for streamer (pauses Twitch reward)

PATCH  /streamer/campaigns/:campaignId/gamification/events/:eventId/cost
       → Update reward cost override
```

### Webhook Routes (public, authentication via headers)

```
POST   /webhooks/twitch/eventsub
       → TwitchEventSubController (handles channel point redemptions)

POST   /webhooks/foundry/gamification/action-executed
       → FoundryController (callback when action is executed in VTT)
```

---

## 9. Dependency Injection & Container Setup

**File**: `/backend/start/container.ts`

```typescript
// Registries (singletons)
app.container.singleton('triggerHandlerRegistry', async () => {
  const registry = new TriggerHandlerRegistry()
  registry.register(new DiceCriticalTrigger())
  registry.register(new ManualTrigger())
  registry.register(new CustomTrigger())
  return registry
})

app.container.singleton('actionHandlerRegistry', async () => {
  const registry = new ActionHandlerRegistry()
  registry.register(new DiceInvertAction())
  registry.register(new ChatMessageAction())
  registry.register(new StatModifyAction())
  registry.register(new CustomAction())
  return registry
})

// Services
app.container.singleton('gamificationService', async () => {
  const triggerRegistry = await app.container.make('triggerHandlerRegistry')
  const actionRegistry = await app.container.make('actionHandlerRegistry')

  const triggerEvaluator = new TriggerEvaluator(triggerRegistry)
  const actionExecutor = new ActionExecutor(actionRegistry)
  const objectiveCalculator = new ObjectiveCalculator()
  const executionTracker = new ExecutionTracker()
  const instanceManager = new InstanceManager(objectiveCalculator, actionExecutor, executionTracker)

  const gamificationService = new GamificationService(triggerEvaluator, instanceManager, actionExecutor)

  // Inject Foundry command service
  const foundryCommandAdapter = await app.container.make('foundryCommandAdapter')
  gamificationService.setFoundryCommandService(foundryCommandAdapter)

  return gamificationService
})

app.container.bind('rewardManagerService', async () => {
  const rewardManager = await app.container.make(RewardManagerService)
  const eventSubService = await app.container.make('twitchEventSubService')
  rewardManager.setEventSubService(eventSubService)
  return rewardManager
})

// PreFlight auto-discovery
app.booted(async () => {
  const preFlightRegistry = await app.container.make('preFlightRegistry')
  const triggerRegistry = await app.container.make('triggerHandlerRegistry')
  const actionRegistry = await app.container.make('actionHandlerRegistry')

  // Handlers with preFlightCheck() method are auto-registered
  const allHandlers = [...triggerRegistry.all(), ...actionRegistry.all()]
  for (const handler of allHandlers) {
    if ('preFlightCheck' in handler) {
      preFlightRegistry.register({
        name: `handler:${handler.type}`,
        appliesTo: ['gamification'],
        priority: 20,
        execute: handler.preFlightCheck.bind(handler)
      })
    }
  }
})
```

---

## 10. Flow Examples

### Example 1: Dice Critical Event Triggers & Consumes

**Scenario**: GM enabled "Critical Success Counter" event. Viewers start clicking. After 3 clicks (objective), next critical success on d20 should invert to 1 (critical failure).

```
1. POST /webhooks/foundry/dice-roll
   - Receives: { rollId, characterName, formula: '1d20', result: 20, diceResults: [20], isCritical: true, criticalType: 'success' }

2. GamificationService.onDiceRoll()
   - Evaluate trigger: DiceCriticalTrigger.evaluate()
   - No instance 'armed' → create new 'active' instance
   - Instance created with objectiveTarget = 3 (example)
   - Broadcast instance_created via WebSocket

3. POST /webhooks/twitch/eventsub (channel point redemption)
   - Viewer 1 redeems 100 points
   - GamificationService.onRedemption()
   - InstanceManager.addContribution()
   - Progress: 1/3

4. Viewer 2 redeems 100 points
   - Progress: 2/3

5. Viewer 3 redeems 100 points
   - Progress: 3/3
   - isObjectiveReached() = true
   - Status changes: 'active' → 'armed'
   - armedAt timestamp set
   - Broadcast instance_armed via WebSocket

6. Later: Critical roll received
   - POST /webhooks/foundry/dice-roll
   - Result: 20 (critical success)
   - GamificationService.onDiceRoll()
   - Try consumeArmedInstance()
   - Evaluation: criticalType === 'success' && event.triggerType configured for success → MATCH
   - InstanceManager.consumeArmedInstance()
   - DiceInvertAction.execute()
   - Foundry VTT sends action execution to chat
   - Status: 'armed' → 'completed'
   - executionStatus: 'pending'
   - Broadcast action_executed via WebSocket
   - Set cooldown (e.g., 5 minutes)

7. POST /webhooks/foundry/gamification/action-executed (Foundry callback)
   - ExecutionTracker.markExecuted(instanceId, success=true)
   - resultData updated with execution details
   - WebSocket broadcast to streamers
```

### Example 2: Manual Trigger

**Scenario**: GM manually triggers an event (e.g., "Super Chat Surge" when many viewers join).

```
1. POST /mj/campaigns/:campaignId/gamification/trigger
   - Body: { eventId, streamerId, customData: { reason: "Raid incoming" } }

2. GamificationService.triggerManualEvent()
   - Create instance with status='active'
   - triggerData = { custom: { reason: "Raid incoming" } }
   - Broadcast instance_created

3. (same contribution/completion flow as above)
```

### Example 3: Streamer Enables Reward

**Scenario**: GM enables "Critical Failure Counter" event. Streamer logs in and activates it.

```
1. POST /streamer/campaigns/:campaignId/gamification/events/:eventId/enable
   - Streamer: @luna, Campaign: "D&D Campaign"
   - Event: "Critical Failure Counter"

2. GamificationController.enableEventForStreamer()
   - RewardManagerService.enableForStreamer()

3. enableForStreamer() logic:
   a) Find StreamerGamificationConfig (or create)
   b) Check if twitchRewardId exists → DELETE it (delete-before-recreate)
   c) CREATE fresh Twitch reward:
      - Title: "Critical Failure Counter"
      - Cost: 100 points (effective cost from hierarchy)
      - Color: #9146FF (from event)
      - Description: "Help prevent critical failures!"
   d) Store reward ID in StreamerGamificationConfig.twitchRewardId
   e) CREATE EventSub subscription for this reward
      - Will receive webhook calls when viewers redeem

4. Twitch shows "New" badge on reward (because it was just created)
   - Higher visibility → more redemptions

5. Viewers can now click the reward to contribute points
   - Each click → redemption webhook → onRedemption() → contribution
```

---

## 11. Configuration Hierarchy & Overrides

### Cost per Click

```
Cost Calculation Order:
1. StreamerGamificationConfig.costOverride (if set)
   ↓ (if null)
2. CampaignGamificationConfig.cost (if set)
   ↓ (if null)
3. GamificationEvent.defaultCost

Example:
Event default: 100 points
Campaign override: 150 points
Streamer override: 200 points
→ Effective cost: 200 points per click
```

### Objective Calculation

```
Formula: max(minimumObjective, viewerCount × coefficient)

Example:
- 50 viewers, coefficient 0.3, minimum 3
- Objective = max(3, 50 × 0.3) = max(3, 15) = 15 clicks

- 5 viewers, coefficient 0.3, minimum 3
- Objective = max(3, 5 × 0.3) = max(3, 1.5) = max(3, 2) = 3 clicks (protected by minimum)
```

### Duration

```
Duration Hierarchy:
1. CampaignGamificationConfig.duration (if set)
   ↓ (if null)
2. GamificationEvent.defaultDuration
```

---

## 12. PreFlight Checks Integration

Handlers can optionally declare a `preFlightCheck()` method that's auto-registered:

```typescript
interface ActionHandler {
  type: string
  requires: string[]
  execute(...): Promise<ResultData>
  preFlightCheck?(ctx: CheckContext): Promise<CheckResult>  // Optional
}
```

**Auto-discovery in container**:
```typescript
// All handlers with preFlightCheck() are registered
for (const handler of allHandlers) {
  if ('preFlightCheck' in handler) {
    preFlightRegistry.register({
      name: `handler:${handler.type}`,
      appliesTo: ['gamification'],
      priority: 20,
      execute: handler.preFlightCheck.bind(handler)
    })
  }
}
```

**Examples of checks**:
- `DiceInvertAction` requires VTT connection
- `ChatMessageAction` requires Foundry command service
- `StatModifyAction` requires VTT connection

---

## 13. WebSocket Broadcasting

Gamification events are broadcast via Transmit (AdonisJS WebSocket):

### Channels

| Channel | Data | When |
|---------|------|------|
| `streamer:{streamerId}:polls` | `{ event: 'gamification:instance_created', data: instance }` | Instance created |
| `streamer:{streamerId}:polls` | `{ event: 'gamification:instance_armed', data: instance }` | Objective reached |
| `streamer:{streamerId}:polls` | `{ event: 'gamification:action_executed', data: ActionExecutedPayload }` | Action executed |
| `streamer:{streamerId}:polls` | `{ event: 'gamification:instance_expired', data: instance }` | Instance expired |
| `streamer:{streamerId}:polls` | `{ event: 'gamification:instance_cancelled', data: instance }` | Instance cancelled |
| `streamer:{streamerId}:polls` | `{ event: 'gamification:contributions_refunded', data: { instanceId, count } }` | Refunds issued |

---

## 14. Adding New Handler Types

### Adding a New Trigger Type

1. Create handler in `/backend/app/services/gamification/handlers/triggers/my_trigger.ts`:
```typescript
import type { TriggerHandler, TriggerEvaluationResult } from '../types.js'

export class MyTrigger implements TriggerHandler {
  type = 'my_trigger'  // Must be unique

  evaluate(config: TriggerConfig | null, data: unknown): TriggerEvaluationResult {
    // Your evaluation logic
    return {
      shouldTrigger: boolean,
      triggerData: triggerData || null,
      reason?: string
    }
  }

  // Optional: pre-flight check
  async preFlightCheck?(ctx: CheckContext): Promise<CheckResult> {
    // Check required dependencies
  }
}
```

2. Register in container (`/backend/start/container.ts`):
```typescript
app.container.singleton('triggerHandlerRegistry', async () => {
  const registry = new TriggerHandlerRegistry()

  // ... existing registrations ...

  const { MyTrigger } = await import('#services/gamification/handlers/triggers/my_trigger')
  registry.register(new MyTrigger())

  return registry
})
```

3. Update types in `/backend/app/models/gamification_event.ts`:
```typescript
export type GamificationTriggerType = 'dice_critical' | 'manual' | 'custom' | 'my_trigger'
```

4. Update database enum in migration if needed.

### Adding a New Action Type

Same approach, but in `/backend/app/services/gamification/handlers/actions/`:

```typescript
import type { ActionHandler } from '../types.js'

export class MyAction implements ActionHandler {
  type = 'my_action'
  requires = ['dependency1', 'dependency2']  // Dependencies for PreFlight

  async execute(config: ActionConfig | null, instance: GamificationInstance, connectionId: string): Promise<ResultData> {
    // Your action logic
    return { success: boolean, message?: string, actionResult?: Record<string, unknown>, error?: string }
  }
}
```

---

## 15. Testing Patterns

### Testing Triggers

```typescript
test('should evaluate dice critical success', () => {
  const trigger = new DiceCriticalTrigger()
  const config = { criticalSuccess: { enabled: true, threshold: 20 } }
  const diceData = { isCritical: true, criticalType: 'success', diceResults: [20], /* ... */ }

  const result = trigger.evaluate(config, diceData)

  assert.isTrue(result.shouldTrigger)
  assert.isNotNull(result.triggerData)
})
```

### Testing Actions

```typescript
test('should invert dice roll', async () => {
  const action = new DiceInvertAction()
  action.setFoundryCommandService(mockFoundryService)

  const instance = {
    id: 'inst-1',
    triggerData: {
      diceRoll: { result: 20, criticalType: 'success', /* ... */ }
    }
  } as GamificationInstance

  const result = await action.execute(config, instance, connectionId)

  assert.isTrue(result.success)
  assert.equal(result.actionResult.invertedResult, 1)
})
```

### Testing Instance Lifecycle

```typescript
test('instance should complete when objective reached', async () => {
  const instance = await manager.createIndividual({
    campaign, event, config, streamerId, streamerName, viewerCount: 100, triggerData: {}
  })

  assert.equal(instance.status, 'active')
  assert.equal(instance.objectiveTarget, 30)  // 100 × 0.3

  for (let i = 0; i < 30; i++) {
    const { instance: updated, objectiveReached } = await manager.addContribution(instance.id, {
      streamerId, twitchUserId: `user-${i}`, twitchUsername: `viewer-${i}`, amount: 100, twitchRedemptionId: `redemp-${i}`
    })
    instance = updated
  }

  assert.isTrue(instance.isObjectiveReached)
})
```

---

## Summary Table

| Component | File | Purpose |
|-----------|------|---------|
| **Models** |
| `GamificationEvent` | `/app/models/gamification_event.ts` | Event template |
| `GamificationInstance` | `/app/models/gamification_instance.ts` | Active goal instance |
| `CampaignGamificationConfig` | `/app/models/campaign_gamification_config.ts` | GM configuration |
| `StreamerGamificationConfig` | `/app/models/streamer_gamification_config.ts` | Streamer configuration |
| `GamificationContribution` | `/app/models/gamification_contribution.ts` | Viewer clicks |
| **Handlers** |
| `TriggerHandler` interface | `/handlers/types.ts` | Pluggable trigger evaluators |
| `ActionHandler` interface | `/handlers/types.ts` | Pluggable action executors |
| `DiceCriticalTrigger` | `/handlers/triggers/dice_critical_trigger.ts` | Dice critical evaluation |
| `ManualTrigger` | `/handlers/triggers/manual_trigger.ts` | GM manual triggers |
| `DiceInvertAction` | `/handlers/actions/dice_invert_action.ts` | Dice inversion |
| `ChatMessageAction` | `/handlers/actions/chat_message_action.ts` | Send chat message |
| `StatModifyAction` | `/handlers/actions/stat_modify_action.ts` | Modify stats |
| **Registries** |
| `TriggerHandlerRegistry` | `/handlers/trigger_handler_registry.ts` | Lookup triggers |
| `ActionHandlerRegistry` | `/handlers/action_handler_registry.ts` | Lookup actions |
| **Services** |
| `TriggerEvaluator` | `/trigger_evaluator.ts` | Evaluate triggers |
| `ActionExecutor` | `/action_executor.ts` | Execute actions |
| `InstanceManager` | `/instance_manager.ts` | Lifecycle management |
| `ObjectiveCalculator` | `/objective_calculator.ts` | Fair objective math |
| `ExecutionTracker` | `/execution_tracker.ts` | Track execution state |
| `GamificationService` | `/gamification_service.ts` | Main orchestrator |
| `RewardManagerService` | `/reward_manager_service.ts` | Twitch reward mgmt |
| `RefundService` | `/refund_service.ts` | Automatic refunds |

---

## Key Patterns & Conventions

1. **Handler-based extensibility**: New actions/triggers only require implementing an interface + registering.
2. **Dependency injection**: All services wired in container; repositories passed via constructor.
3. **Cost hierarchy**: Streamer override → Campaign config → Event default.
4. **Objective fairness**: Protected minimum ensures small streams aren't disadvantaged.
5. **Two-stage completion** (armed → consumed): Allows dice rolls to "trigger" actions.
6. **Async execution**: Actions marked "pending" until Foundry VTT confirms execution (via webhook).
7. **Redis caching**: Pending executions cached for fast lookup.
8. **WebSocket broadcasting**: Instance state changes broadcast to connected overlays/clients.
9. **Delete-before-recreate**: Twitch rewards deleted before recreation to ensure "New" badge.
10. **Refund automation**: Expired instances trigger automatic viewer refunds via Twitch API.
