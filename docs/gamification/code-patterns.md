# Gamification System - Code Patterns & Implementation Examples

## Pattern 1: Handler Registration in Container

**File**: `/backend/start/container.ts`

```typescript
// TRIGGER HANDLERS (singleton, lives for app lifetime)
app.container.singleton('triggerHandlerRegistry', async () => {
  const mod = await import('#services/gamification/handlers/trigger_handler_registry')
  const registry = new mod.TriggerHandlerRegistry()

  const { DiceCriticalTrigger } =
    await import('#services/gamification/handlers/triggers/dice_critical_trigger')
  const { ManualTrigger } = await import('#services/gamification/handlers/triggers/manual_trigger')
  const { CustomTrigger } = await import('#services/gamification/handlers/triggers/custom_trigger')

  registry.register(new DiceCriticalTrigger())
  registry.register(new ManualTrigger())
  registry.register(new CustomTrigger())

  return registry
})

// ACTION HANDLERS (singleton)
app.container.singleton('actionHandlerRegistry', async () => {
  const mod = await import('#services/gamification/handlers/action_handler_registry')
  const registry = new mod.ActionHandlerRegistry()

  const { DiceInvertAction } =
    await import('#services/gamification/handlers/actions/dice_invert_action')
  const { ChatMessageAction } =
    await import('#services/gamification/handlers/actions/chat_message_action')
  const { StatModifyAction } =
    await import('#services/gamification/handlers/actions/stat_modify_action')
  const { CustomAction } = await import('#services/gamification/handlers/actions/custom_action')

  registry.register(new DiceInvertAction())
  registry.register(new ChatMessageAction())
  registry.register(new StatModifyAction())
  registry.register(new CustomAction())

  return registry
})

// MAIN SERVICE
app.container.singleton('gamificationService', async () => {
  const { TriggerEvaluator } = await import('#services/gamification/trigger_evaluator')
  const { ActionExecutor } = await import('#services/gamification/action_executor')
  const { InstanceManager } = await import('#services/gamification/instance_manager')
  const { ObjectiveCalculator } = await import('#services/gamification/objective_calculator')
  const { ExecutionTracker } = await import('#services/gamification/execution_tracker')
  const { GamificationService } = await import('#services/gamification/gamification_service')

  // Wire registries into evaluator/executor
  const triggerRegistry = await app.container.make('triggerHandlerRegistry')
  const actionRegistry = await app.container.make('actionHandlerRegistry')

  const triggerEvaluator = new TriggerEvaluator(triggerRegistry)
  const actionExecutor = new ActionExecutor(actionRegistry)
  const objectiveCalculator = new ObjectiveCalculator()
  const executionTracker = new ExecutionTracker()
  const instanceManager = new InstanceManager(objectiveCalculator, actionExecutor, executionTracker)

  const gamificationService = new GamificationService(
    triggerEvaluator,
    instanceManager,
    actionExecutor
  )

  // Inject Foundry command service
  const foundryCommandAdapter = await app.container.make('foundryCommandAdapter')
  gamificationService.setFoundryCommandService(foundryCommandAdapter)

  return gamificationService
})

// TYPE DECLARATIONS
declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    gamificationService: InstanceType<typeof import('#services/gamification/gamification_service').GamificationService>
    triggerHandlerRegistry: InstanceType<typeof import('#services/gamification/handlers/trigger_handler_registry').TriggerHandlerRegistry>
    actionHandlerRegistry: InstanceType<typeof import('#services/gamification/handlers/action_handler_registry').ActionHandlerRegistry>
  }
}
```

---

## Pattern 2: Creating a Trigger Handler

**Example**: Implementing a new "poll_vote" trigger that fires when a poll reaches a certain vote threshold.

```typescript
// File: /backend/app/services/gamification/handlers/triggers/poll_vote_trigger.ts

import type { TriggerHandler, TriggerEvaluationResult } from '../types.js'
import type { TriggerConfig } from '#models/gamification_event'

export interface PollVoteData {
  pollId: string
  option: string
  voteCount: number
  totalVotes: number
}

/**
 * PollVoteTrigger - Triggers when a poll option reaches a vote threshold
 *
 * Configuration:
 * {
 *   option: "option_name",
 *   threshold: 50,  // Minimum votes
 *   percentageMode: true  // If true, use percentage instead of absolute count
 * }
 */
export class PollVoteTrigger implements TriggerHandler {
  type = 'poll_vote'

  evaluate(config: TriggerConfig | null, data: unknown): TriggerEvaluationResult {
    const pollData = data as PollVoteData

    if (!config || !pollData) {
      return {
        shouldTrigger: false,
        triggerData: null,
        reason: 'Invalid poll data or config'
      }
    }

    const customRules = config.customRules as { option?: string; threshold?: number; percentageMode?: boolean } | undefined

    if (!customRules) {
      return {
        shouldTrigger: false,
        triggerData: null,
        reason: 'Poll vote config missing'
      }
    }

    // Check option match
    if (customRules.option && pollData.option !== customRules.option) {
      return {
        shouldTrigger: false,
        triggerData: null,
        reason: `Wrong option: ${pollData.option} !== ${customRules.option}`
      }
    }

    // Check vote threshold
    const threshold = customRules.threshold || 10
    const targetVotes = customRules.percentageMode
      ? Math.floor((pollData.totalVotes / 100) * threshold)
      : threshold

    if (pollData.voteCount < targetVotes) {
      return {
        shouldTrigger: false,
        triggerData: null,
        reason: `Not enough votes: ${pollData.voteCount} < ${targetVotes}`
      }
    }

    return {
      shouldTrigger: true,
      triggerData: {
        custom: {
          pollId: pollData.pollId,
          option: pollData.option,
          voteCount: pollData.voteCount,
          totalVotes: pollData.totalVotes
        }
      }
    }
  }

  // Optional: Pre-flight check
  async preFlightCheck(ctx: CheckContext): Promise<CheckResult> {
    // Check that poll service is available
    return {
      passed: true,
      details: 'Poll vote trigger ready'
    }
  }
}

export default PollVoteTrigger
```

**Register in container**:
```typescript
const { PollVoteTrigger } = await import('#services/gamification/handlers/triggers/poll_vote_trigger')
registry.register(new PollVoteTrigger())
```

**Update type**:
```typescript
// /backend/app/models/gamification_event.ts
export type GamificationTriggerType = 'dice_critical' | 'manual' | 'custom' | 'poll_vote'
```

---

## Pattern 3: Creating an Action Handler

**Example**: Implementing a "treasure_drop" action that spawns loot in Foundry VTT.

```typescript
// File: /backend/app/services/gamification/handlers/actions/treasure_drop_action.ts

import logger from '@adonisjs/core/services/logger'
import type { ActionConfig } from '#models/gamification_event'
import type GamificationInstance from '#models/gamification_instance'
import type { ResultData } from '#models/gamification_instance'
import type { FoundryCommandService } from '../../action_executor.js'
import type { ActionHandler } from '../types.js'

/**
 * TreasureDropAction - Spawns treasure/loot on the map in Foundry VTT
 *
 * Configuration:
 * {
 *   treasureDrop: {
 *     actorId: "actor-uuid",        // Treasure actor to spawn
 *     position: { x: 100, y: 100 }, // Spawn coordinates
 *     quantity: 1,                  // Number of copies
 *     message: "Golden coins appear!" // Chat message
 *   }
 * }
 *
 * Requires: vtt_connection (to send commands to Foundry)
 */
export class TreasureDropAction implements ActionHandler {
  type = 'treasure_drop'
  requires = ['vtt_connection']

  private foundryCommandService: FoundryCommandService | null = null

  setFoundryCommandService(service: FoundryCommandService): void {
    this.foundryCommandService = service
  }

  async execute(
    config: ActionConfig | null,
    instance: GamificationInstance,
    connectionId: string
  ): Promise<ResultData> {
    if (!this.foundryCommandService) {
      return { success: false, error: 'Foundry service not available' }
    }

    const treasureConfig = config?.customActions?.treasureDrop as {
      actorId?: string
      position?: { x: number; y: number }
      quantity?: number
      message?: string
    } | undefined

    if (!treasureConfig?.actorId) {
      return { success: false, error: 'Treasure actor ID missing' }
    }

    // Log for debugging
    logger.info(
      {
        event: 'treasure_drop_starting',
        instanceId: instance.id,
        actorId: treasureConfig.actorId,
        quantity: treasureConfig.quantity || 1
      },
      'Spawning treasure'
    )

    const spawnedItems: string[] = []
    const errors: string[] = []

    // Spawn treasure copies
    const quantity = treasureConfig.quantity || 1
    for (let i = 0; i < quantity; i++) {
      try {
        // Slight offset for each copy
        const offsetX = (treasureConfig.position?.x || 0) + i * 50
        const offsetY = treasureConfig.position?.y || 0

        // In a real implementation, this would use a Foundry macro/API
        // to spawn the actor on the scene
        const result = await this.foundryCommandService.sendChatMessage(
          connectionId,
          `Spawning treasure at ${offsetX}, ${offsetY}...`,
          'GM'
        )

        if (result.success) {
          spawnedItems.push(`${treasureConfig.actorId}-${i}`)
        } else {
          errors.push(`Failed to spawn copy ${i + 1}: ${result.error}`)
        }
      } catch (error) {
        errors.push(`Error spawning copy ${i + 1}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // Send flavor message if configured
    if (treasureConfig.message) {
      try {
        await this.foundryCommandService.sendChatMessage(
          connectionId,
          treasureConfig.message,
          'GM'
        )
      } catch (error) {
        logger.warn({ error }, 'Failed to send treasure message')
      }
    }

    const success = errors.length === 0
    return {
      success,
      message: success ? `${spawnedItems.length} treasure(s) spawned!` : undefined,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      actionResult: {
        spawnedItems,
        quantity: quantity,
        actorId: treasureConfig.actorId
      }
    }
  }
}

export default TreasureDropAction
```

**Register in container**:
```typescript
const { TreasureDropAction } = await import('#services/gamification/handlers/actions/treasure_drop_action')
registry.register(new TreasureDropAction())
```

**Update type**:
```typescript
export type GamificationActionType = 'dice_invert' | 'chat_message' | 'stat_modify' | 'custom' | 'treasure_drop'
```

---

## Pattern 4: Using TriggerEvaluator

**From**: `/backend/app/services/gamification/gamification_service.ts`

```typescript
async onDiceRoll(
  campaignId: string,
  streamerId: string,
  streamerName: string,
  viewerCount: number,
  diceRollData: DiceRollData
): Promise<GamificationInstance | null> {
  // 1. Check if there's an armed instance to consume
  if (diceRollData.isCritical && diceRollData.criticalType) {
    const consumedInstance = await this.tryConsumeArmedInstance(
      campaignId,
      streamerId,
      diceRollData
    )
    if (consumedInstance) {
      return consumedInstance
    }
  }

  // 2. Check if new instance should be created
  const configs = await CampaignGamificationConfig.query()
    .where('campaignId', campaignId)
    .where('isEnabled', true)
    .preload('event', (query) => {
      query.where('triggerType', 'dice_critical')
    })

  for (const config of configs) {
    if (!config.event) continue

    // Check cooldown
    const cooldownStatus = await this.instanceManager.isOnCooldown(
      campaignId,
      config.eventId,
      config.event.type === 'individual' ? streamerId : undefined
    )

    if (cooldownStatus.onCooldown) {
      logger.debug({ eventId: config.eventId, cooldownEndsAt: cooldownStatus.endsAt?.toISO() }, 'On cooldown')
      continue
    }

    // EVALUATE TRIGGER using TriggerEvaluator
    const evaluation = this.triggerEvaluator.evaluate(config.event, diceRollData)

    if (evaluation.shouldTrigger && evaluation.triggerData) {
      // Create instance
      const campaign = await Campaign.findOrFail(campaignId)

      const instance = await this.instanceManager.createIndividual({
        campaign,
        event: config.event,
        config,
        streamerId,
        streamerName,
        viewerCount,
        triggerData: evaluation.triggerData,  // ← Trigger data from evaluator
      })

      this.broadcastInstanceCreated(instance, config.event)
      return instance
    }
  }

  return null
}
```

---

## Pattern 5: Using ActionExecutor

**From**: `/backend/app/services/gamification/instance_manager.ts`

```typescript
async complete(
  instance: GamificationInstance,
  event: GamificationEvent,
  config: CampaignGamificationConfig,
  connectionId: string,
  executeImmediately: boolean = false
): Promise<GamificationInstance> {
  // Calculate cooldown
  const cooldownSeconds = config.cooldown ?? this.getDefaultCooldown(event)
  const cooldownEndsAt =
    cooldownSeconds > 0 ? DateTime.now().plus({ seconds: cooldownSeconds }) : null

  // Update instance state
  instance.status = 'completed'
  instance.completedAt = DateTime.now()
  instance.cooldownEndsAt = cooldownEndsAt

  if (executeImmediately) {
    // EXECUTE ACTION using ActionExecutor
    const resultData = await this.actionExecutor.execute(event, instance, connectionId)
    instance.resultData = resultData
    instance.executionStatus = resultData.success ? 'executed' : 'failed'
    instance.executedAt = DateTime.now()

    if (!resultData.success) {
      logger.error(
        {
          event: 'action_execution_failed',
          instanceId: instance.id,
          error: resultData.error,
        },
        "Action execution failed"
      )
    }
  } else {
    // Mark as pending - Foundry will execute later
    instance.executionStatus = 'pending'
    instance.resultData = {
      success: false,
      message: "Awaiting VTT execution",
    }

    // Track in Redis for fast lookup
    await this.executionTracker.markPendingExecution(instance, event.name, event.actionType)
  }

  await instance.save()

  return instance
}
```

---

## Pattern 6: Instance Progress Tracking

**From**: `/backend/app/services/gamification/instance_manager.ts`

```typescript
async addContribution(
  instanceId: string,
  contribution: ContributionData
): Promise<{ instance: GamificationInstance; objectiveReached: boolean }> {
  // 1. Check for duplicate redemptions
  const existingContribution = await GamificationContribution.query()
    .where('twitchRedemptionId', contribution.twitchRedemptionId)
    .first()

  if (existingContribution) {
    logger.warn(
      {
        event: 'duplicate_contribution',
        twitchRedemptionId: contribution.twitchRedemptionId,
      },
      'Duplicate contribution ignored'
    )

    const instance = await GamificationInstance.findOrFail(instanceId)
    return { instance, objectiveReached: instance.isObjectiveReached }
  }

  // 2. Get instance and verify it's active
  const instance = await GamificationInstance.findOrFail(instanceId)

  if (!instance.isActive) {
    logger.warn(
      {
        event: 'contribution_to_inactive',
        instanceId,
        status: instance.status,
      },
      'Cannot contribute to inactive instance'
    )
    return { instance, objectiveReached: false }
  }

  // 3. Record contribution
  await GamificationContribution.create({
    instanceId,
    streamerId: contribution.streamerId,
    twitchUserId: contribution.twitchUserId,
    twitchUsername: contribution.twitchUsername,
    amount: contribution.amount,
    twitchRedemptionId: contribution.twitchRedemptionId,
  })

  // 4. Update progress (1 click = 1 progress, regardless of point cost)
  instance.currentProgress += 1
  await instance.save()

  // 5. Update group snapshots if needed
  if (instance.type === 'group' && instance.streamerSnapshots) {
    await this.updateStreamerSnapshot(instance, contribution.streamerId)
  }

  logger.info(
    {
      event: 'contribution_added',
      instanceId,
      streamerId: contribution.streamerId,
      progress: instance.currentProgress,
      target: instance.objectiveTarget,
      percentage: instance.progressPercentage,
    },
    'Contribution added'
  )

  return {
    instance,
    objectiveReached: instance.isObjectiveReached,
  }
}
```

---

## Pattern 7: Objective Calculation

**From**: `/backend/app/services/gamification/objective_calculator.ts`

```typescript
calculateIndividual(
  viewerCount: number,
  config: CampaignGamificationConfig,
  event: GamificationEvent
): number {
  // Get effective parameters (override or default)
  const coefficient = config.getEffectiveCoefficient(event)
  const minimumObjective = config.getEffectiveMinimumObjective(event)

  // Formula: max(minimumObjective, viewerCount × coefficient)
  const calculatedObjective = Math.round(viewerCount * coefficient)

  return Math.max(minimumObjective, calculatedObjective)
}

calculateGroup(
  streamersData: StreamerData[],
  config: CampaignGamificationConfig,
  event: GamificationEvent
): GroupObjectiveResult {
  // Calculate per-streamer objectives fairly
  const streamerSnapshots: StreamerSnapshot[] = streamersData.map((streamer) => {
    const localObjective = this.calculateIndividual(streamer.viewerCount, config, event)

    return {
      streamerId: streamer.streamerId,
      streamerName: streamer.streamerName,
      viewerCount: streamer.viewerCount,
      localObjective,
      contributions: 0, // Will update during instance
    }
  })

  // Sum all local objectives
  const totalObjective = streamerSnapshots.reduce(
    (sum, snapshot) => sum + snapshot.localObjective,
    0
  )

  return {
    totalObjective,
    streamerSnapshots,
  }
}

// Example: 50 viewers × 0.3 coefficient = 15 clicks needed
// Example: 5 viewers × 0.3 = 1.5 → rounded to 2 → but min is 3 → 3 clicks
```

---

## Pattern 8: Twitch Reward Creation (Delete-Before-Recreate)

**From**: `/backend/app/services/gamification/reward_manager_service.ts`

```typescript
async enableForStreamer(
  streamer: Streamer,
  campaignId: string,
  eventId: string,
  costOverride?: number
): Promise<StreamerGamificationConfig> {
  const logCtx = { streamerId: streamer.id, campaignId, eventId }

  // 1. Verify event is enabled by GM
  const campaignConfig = await this.campaignConfigRepo.findByCampaignAndEvent(campaignId, eventId)
  if (!campaignConfig || !campaignConfig.isEnabled) {
    throw new Error("Event not enabled for this campaign")
  }

  await campaignConfig.load('event')
  const event = campaignConfig.event

  // 2. Find or create streamer config
  let streamerConfig = await this.streamerConfigRepo.findByStreamerCampaignAndEvent(
    streamer.id,
    campaignId,
    eventId
  )

  if (!streamerConfig) {
    streamerConfig = await this.streamerConfigRepo.create({
      campaignId,
      streamerId: streamer.id,
      eventId,
      isEnabled: true,
      costOverride: costOverride ?? null,
    })
  } else {
    streamerConfig.isEnabled = true
    if (costOverride !== undefined) {
      streamerConfig.costOverride = costOverride
    }
    await streamerConfig.save()
  }

  logger.info(
    {
      event: 'reward_enable_for_streamer',
      ...logCtx,
      hasEventSubService: !!this.eventSubService,
    },
    '[RewardManager] enableForStreamer called'
  )

  // 3. DELETE OLD REWARD (delete-before-recreate strategy)
  //    Always delete to ensure "New" badge on Twitch
  if (streamerConfig.twitchRewardId) {
    logger.info(
      {
        event: 'reward_delete_before_recreate',
        ...logCtx,
        oldRewardId: streamerConfig.twitchRewardId,
      },
      'Deleting old reward before recreation'
    )

    const deleteSuccess = await this.twitchRewardService.deleteReward(
      streamer,
      streamerConfig.twitchRewardId
    )

    if (deleteSuccess) {
      streamerConfig.twitchRewardId = null
      streamerConfig.twitchRewardStatus = 'not_created'
      await streamerConfig.save()
    } else {
      // Mark as orphaned if deletion failed
      streamerConfig.twitchRewardStatus = 'orphaned'
      streamerConfig.deletionFailedAt = DateTime.now()
      streamerConfig.deletionRetryCount += 1
      streamerConfig.nextDeletionRetryAt = DateTime.now().plus({ minutes: 5 })
      await streamerConfig.save()

      logger.warn(
        {
          event: 'reward_deletion_failed',
          ...logCtx,
          retryCount: streamerConfig.deletionRetryCount,
        },
        'Reward deletion failed, marked as orphaned'
      )
    }
  }

  // 4. CREATE FRESH REWARD
  const effectiveCost = streamerConfig.getEffectiveCost(campaignConfig, event)
  const reward = await this.createFreshReward(
    streamer,
    streamerConfig,
    event,
    effectiveCost,
    logCtx
  )

  // 5. CREATE EventSub SUBSCRIPTION for redemptions
  if (reward) {
    await this.ensureEventSubSubscription(streamer, reward.id, logCtx)
  }

  await streamerConfig.load('event')
  return streamerConfig
}

private async createFreshReward(
  streamer: Streamer,
  streamerConfig: StreamerGamificationConfig,
  event: GamificationEvent,
  cost: number,
  logCtx: Record<string, string>
): Promise<TwitchReward | null> {
  const rewardData: CreateRewardData = {
    title: event.name,
    cost,
    prompt: event.description || undefined,
    backgroundColor: event.rewardColor,
    isEnabled: true,
    isUserInputRequired: false,
    maxPerStream: 0, // Unlimited
    maxPerUserPerStream: 0,
    globalCooldownSeconds: 0,
  }

  const reward = await this.twitchRewardService.createReward(streamer, rewardData)

  if (reward) {
    streamerConfig.twitchRewardId = reward.id
    streamerConfig.twitchRewardStatus = 'active'
    streamerConfig.deletionFailedAt = null
    streamerConfig.deletionRetryCount = 0
    streamerConfig.nextDeletionRetryAt = null
    await streamerConfig.save()

    logger.info(
      {
        event: 'reward_created',
        ...logCtx,
        rewardId: reward.id,
        cost,
      },
      'Fresh reward created'
    )
  }

  return reward
}
```

---

## Pattern 9: Handling Two-Stage Completion (Armed → Consumed)

**From**: `/backend/app/services/gamification/gamification_service.ts`

```typescript
private async tryConsumeArmedInstance(
  campaignId: string,
  streamerId: string,
  diceRollData: DiceRollData
): Promise<GamificationInstance | null> {
  // Get all active event configs
  const configs = await CampaignGamificationConfig.query()
    .where('campaignId', campaignId)
    .where('isEnabled', true)
    .preload('event')

  for (const config of configs) {
    if (!config.event) continue

    // Look for ARMED instance for this event & streamer
    const armedInstance = await this.instanceManager.getArmedInstanceForStreamer(
      campaignId,
      streamerId,
      config.eventId
    )

    if (!armedInstance) continue

    // Check if trigger config allows this critical type to consume
    const triggerConfig = config.event.triggerConfig
    if (!triggerConfig) continue

    const { criticalSuccess, criticalFailure } = triggerConfig

    // Can this dice roll trigger consumption?
    const shouldConsume =
      (diceRollData.criticalType === 'success' && criticalSuccess?.enabled) ||
      (diceRollData.criticalType === 'failure' && criticalFailure?.enabled)

    if (!shouldConsume) continue

    logger.info(
      {
        event: 'consuming_armed_instance',
        instanceId: armedInstance.id,
        campaignId,
        streamerId,
        criticalType: diceRollData.criticalType,
      },
      'Consuming armed instance on critical roll'
    )

    // Get VTT connection to execute action
    const connectionId = await this.getVttConnectionId(campaignId)

    if (!connectionId) {
      logger.error(
        {
          event: 'consume_no_vtt_connection',
          instanceId: armedInstance.id,
          campaignId,
        },
        'No VTT connection for action execution'
      )
      continue
    }

    // CONSUME: Transition from armed → completed → execute action
    const consumedInstance = await this.instanceManager.consumeArmedInstance(
      armedInstance,
      config.event,
      config,
      connectionId,
      {
        rollId: diceRollData.rollId,
        characterId: diceRollData.characterId,
        characterName: diceRollData.characterName,
        formula: diceRollData.formula,
        result: diceRollData.result,
        diceResults: diceRollData.diceResults,
        criticalType: diceRollData.criticalType!,
        messageId: diceRollData.messageId,
      }
    )

    // Broadcast consumption event
    this.broadcastInstanceConsumed(consumedInstance, diceRollData)

    return consumedInstance
  }

  return null
}
```

---

## Pattern 10: WebSocket Broadcasting

**From**: `/backend/app/services/gamification/execution_tracker.ts`

```typescript
private async broadcastActionExecuted(
  instance: GamificationInstance,
  payload: ActionExecutedPayload
): Promise<void> {
  const message = {
    event: 'gamification:action_executed',
    data: payload,
  }

  // For individual instances, broadcast to that streamer
  if (instance.streamerId) {
    const channel = `streamer:${instance.streamerId}:polls`
    transmit.broadcast(channel, message as any)

    logger.debug(
      {
        channel,
        instanceId: instance.id,
      },
      'Action executed broadcast to individual streamer'
    )
  }

  // For group instances, broadcast to ALL streamers in the campaign
  if (instance.type === 'group' && instance.streamerSnapshots) {
    for (const snapshot of instance.streamerSnapshots) {
      const channel = `streamer:${snapshot.streamerId}:polls`
      transmit.broadcast(channel, message as any)
    }

    logger.debug(
      {
        instanceId: instance.id,
        streamersCount: instance.streamerSnapshots.length,
      },
      'Action executed broadcast to all streamers in group'
    )
  }
}
```

**Channels & Events**:
```typescript
// Subscriber listens to:
transmit.subscribe(`streamer:${streamerId}:polls`, (data) => {
  const { event, data: payload } = data

  if (event === 'gamification:instance_created') {
    // Handle new instance
  } else if (event === 'gamification:action_executed') {
    // Handle action result
    const { originalValue, invertedValue } = payload
  }
})
```

---

## Pattern 11: Cost Hierarchy Resolution

**From**: `/backend/app/models/streamer_gamification_config.ts`

```typescript
/**
 * Resolves effective cost following the hierarchy:
 * 1. Streamer override (if set)
 * 2. Campaign config (if set)
 * 3. Event default
 */
getEffectiveCost(
  campaignConfig: CampaignGamificationConfig | null,
  event: GamificationEvent
): number {
  // 1. Check streamer override
  if (this.costOverride !== null) {
    return this.costOverride
  }

  // 2. Check campaign config override
  if (campaignConfig?.cost !== null && campaignConfig?.cost !== undefined) {
    return campaignConfig.cost
  }

  // 3. Use event default
  return event.defaultCost
}

// Example usage in RewardManagerService:
const effectiveCost = streamerConfig.getEffectiveCost(campaignConfig, event)
const reward = await this.twitchRewardService.createReward(streamer, {
  title: event.name,
  cost: effectiveCost,  // ← Uses hierarchy
  // ...
})
```

---

## Pattern 12: Redis-Based Execution Tracking

**From**: `/backend/app/services/gamification/execution_tracker.ts`

```typescript
async markPendingExecution(
  instance: GamificationInstance,
  eventName: string,
  actionType: string
): Promise<void> {
  // Prepare Redis data
  const pendingData: PendingExecutionData = {
    instanceId: instance.id,
    campaignId: instance.campaignId,
    eventId: instance.eventId,
    streamerId: instance.streamerId,
    actionType,
    eventName,
    triggerData: instance.triggerData
      ? {
          diceRoll: instance.triggerData.diceRoll
            ? {
                originalValue: instance.triggerData.diceRoll.result,
                invertedValue: this.calculateInvertedValue(instance.triggerData.diceRoll.result),
                characterName: instance.triggerData.diceRoll.characterName || 'Character',
              }
            : undefined,
        }
      : null,
    completedAt: DateTime.now().toISO()!,
  }

  // Save to PostgreSQL first
  instance.executionStatus = 'pending'
  await instance.save()

  // Cache in Redis for fast lookups (24 hour TTL)
  const redisKey = `gamification:pending:${instance.id}`
  await redis.set(redisKey, JSON.stringify(pendingData), 'EX', 86400)

  logger.info(
    {
      event: 'execution_pending',
      instanceId: instance.id,
      eventName,
      actionType,
    },
    'Instance marked as pending execution'
  )
}

async markExecuted(
  instanceId: string,
  success: boolean,
  message?: string
): Promise<{ instance: GamificationInstance; payload: ActionExecutedPayload } | null> {
  // Try Redis first (fast path)
  const redisKey = `gamification:pending:${instanceId}`
  let pendingData: PendingExecutionData | null = null

  try {
    const cached = await redis.get(redisKey)
    if (cached) {
      pendingData = JSON.parse(cached) as PendingExecutionData
    }
  } catch (error) {
    logger.warn({ error }, 'Redis read failed, falling back to PostgreSQL')
  }

  // Get from PostgreSQL (source of truth)
  const instance = await GamificationInstance.query()
    .where('id', instanceId)
    .preload('event')
    .first()

  if (!instance || instance.executionStatus !== 'pending') {
    return null
  }

  // Update PostgreSQL
  instance.executionStatus = success ? 'executed' : 'failed'
  instance.executedAt = DateTime.now()
  instance.resultData = {
    ...instance.resultData,
    executed: true,
    executedAt: DateTime.now().toISO(),
    executionSuccess: success,
    executionMessage: message,
  }
  await instance.save()

  // Clean up Redis
  try {
    await redis.del(redisKey)
  } catch (error) {
    logger.warn({ error }, 'Redis delete failed')
  }

  // Broadcast via WebSocket
  const payload: ActionExecutedPayload = {
    instanceId: instance.id,
    eventName: pendingData?.eventName || instance.event?.name || 'Action',
    actionType: (pendingData?.actionType || instance.event?.actionType || 'custom') as any,
    success,
    message,
  }

  await this.broadcastActionExecuted(instance, payload)

  return { instance, payload }
}
```

---

## Pattern 13: Automatic Refunds on Expiration

**From**: `/backend/app/services/gamification/refund_service.ts`

```typescript
async refundInstance(instance: GamificationInstance): Promise<RefundResult> {
  const result: RefundResult = {
    instanceId: instance.id,
    totalContributions: 0,
    refundedCount: 0,
    failedCount: 0,
    errors: [],
  }

  // Verify instance is expired
  if (instance.status !== 'expired') {
    return result
  }

  // Get streamer for Twitch tokens
  const streamer = await Streamer.find(instance.streamerId)
  if (!streamer) {
    return result
  }

  // Get all non-refunded contributions
  const contributions = await GamificationContribution.query()
    .where('instanceId', instance.id)
    .where('refunded', false)

  result.totalContributions = contributions.length

  if (contributions.length === 0) {
    return result
  }

  logger.info(
    {
      event: 'refund_starting',
      instanceId: instance.id,
      contributionsCount: contributions.length,
    },
    'Starting refund process'
  )

  // Refund each contribution
  for (const contribution of contributions) {
    try {
      // Call Twitch API to refund
      await this.twitchRewardService.refundRedemption(
        streamer,
        contribution.twitchRedemptionId
      )

      // Mark as refunded
      contribution.refunded = true
      contribution.refundedAt = DateTime.now()
      await contribution.save()

      result.refundedCount++

      logger.debug(
        {
          event: 'contribution_refunded',
          contributionId: contribution.id,
          twitchUserId: contribution.twitchUserId,
          twitchUsername: contribution.twitchUsername,
        },
        'Contribution refunded'
      )
    } catch (error) {
      result.failedCount++
      result.errors.push({
        contributionId: contribution.id,
        twitchUserId: contribution.twitchUserId,
        error: error instanceof Error ? error.message : String(error),
      })

      logger.error(
        {
          event: 'refund_failed',
          contributionId: contribution.id,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to refund contribution'
      )
    }
  }

  logger.info(
    {
      event: 'refund_completed',
      instanceId: instance.id,
      refundedCount: result.refundedCount,
      failedCount: result.failedCount,
    },
    'Refund process completed'
  )

  // Broadcast refund event
  transmit.broadcast(`streamer:${instance.streamerId}:polls`, {
    event: 'gamification:contributions_refunded',
    data: {
      instanceId: instance.id,
      count: result.refundedCount,
    },
  } as any)

  return result
}
```

---

## Key Takeaways

1. **Handler pattern** allows adding new trigger/action types without modifying core logic
2. **Registry-based lookup** via TriggerEvaluator and ActionExecutor
3. **Two-stage completion** (active → armed → consumed) supports dice-triggered actions
4. **Cost hierarchy** (streamer > campaign > event default) provides flexibility
5. **Redis caching** + PostgreSQL source of truth for fast execution tracking
6. **Delete-before-recreate** for Twitch rewards ensures "New" badge visibility
7. **WebSocket broadcasting** keeps UI/overlays in sync with instance state
8. **Automatic refunds** when instances expire
9. **Fair objective calculation** protects small streams with minimums
10. **Dependency injection** makes all services testable and composable
