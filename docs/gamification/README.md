# Gamification System Documentation

This directory contains comprehensive technical documentation for Tumulte's gamification system.

## Overview

The gamification system enables real-time, event-driven interactions between tabletop RPG campaigns and Twitch viewers. It bridges Foundry VTT gameplay events with Twitch channel point rewards, allowing viewers to influence the game through collective contributions.

**Core Architecture:**
- Event-driven trigger system (dice rolls, manual GM launches, custom triggers)
- Registry-based handler architecture (eliminates switch statements)
- Twitch channel point reward integration (automatic creation, synchronization, deletion)
- Real-time WebSocket broadcasting to overlays and streamers
- Pre-flight validation system for operational readiness
- Goal-based contribution tracking with atomic database operations

## Documentation Index

| Document | Description | Reading Time |
|----------|-------------|--------------|
| [architecture.md](./architecture.md) | Complete technical documentation covering models, services, lifecycle flows, reward management, preflight checks, and testing strategies | 30-40 min |
| [code-patterns.md](./code-patterns.md) | 13 implementation patterns with working code examples for common development tasks | 20-30 min |

## Quick Reference

### Key Concepts

**Triggers**: Events that can launch a gamification instance (dice critical, manual GM launch, custom events)

**Actions**: Operations executed when a goal is reached (dice invert, stat modify, chat message, custom actions)

**Instances**: Active gamification sessions tracking progress toward a goal

**Handlers**: Type-specific classes implementing trigger evaluation or action execution logic

**Registries**: Centralized registration systems that eliminate switch statements (`TriggerHandlerRegistry`, `ActionHandlerRegistry`)

**Contributions**: Viewer actions that progress an instance toward its goal (tracked atomically per viewer)

**Rewards**: Twitch channel point rewards automatically created/synced for redemption-based events

## Reading Guide by Use Case

### Adding a New Action/Trigger Type
1. Read [code-patterns.md](./code-patterns.md), **Pattern 2** (Adding a Trigger Handler)
2. Read [code-patterns.md](./code-patterns.md), **Pattern 3** (Adding an Action Handler)
3. Reference [architecture.md](./architecture.md), **Section 4** (Handler Registries) for registration details

### Understanding the Lifecycle
1. Read [architecture.md](./architecture.md), **Section 6** (Lifecycle State Machine)
2. Read [architecture.md](./architecture.md), **Section 7** (Instance Manager Service)
3. Review [code-patterns.md](./code-patterns.md), **Pattern 1** (Creating an Event Template) for practical examples

### Debugging Execution
1. Read [architecture.md](./architecture.md), **Section 10** (Action Executor Service)
2. Read [architecture.md](./architecture.md), **Section 11** (Logging, Monitoring, Error Handling)
3. Reference [code-patterns.md](./code-patterns.md), **Pattern 10** (Error Handling) for recovery strategies

### Understanding Twitch Rewards
1. Read [architecture.md](./architecture.md), **Section 7.2** (Reward Creation and Management)
2. Read [architecture.md](./architecture.md), **Section 8** (Twitch Reward Reconciler)
3. Reference [code-patterns.md](./code-patterns.md), **Pattern 11** (Twitch Reward Lifecycle) for practical flows

### Testing Gamification Features
1. Read [architecture.md](./architecture.md), **Section 15** (Testing Strategy)
2. Review [code-patterns.md](./code-patterns.md), **Pattern 13** (Testing Gamification) for test examples
3. Reference existing test files in `backend/tests/unit/services/gamification/`

## Related Documentation

- [Pre-Flight System](../architecture/preflight.md) — Health check system used by gamification
- [API Reference](../api/reference.md) — Gamification endpoints
- [WebSocket Events](../api/websocket.md) — Real-time broadcast channels
- [Foundry VTT Integration](../vtt/foundry.md) — VTT webhook integration

## Contributing

When adding new gamification features:

1. **Add handler registration** in `backend/start/container.ts`
2. **Write comprehensive JSDoc** for all public methods
3. **Add unit tests** following Pattern 13 in code-patterns.md
4. **Update this documentation** if introducing new concepts
5. **Follow the registry pattern** — no switch statements in core services

For questions or contributions, see [Contributing Guide](../guides/contributing.md).
