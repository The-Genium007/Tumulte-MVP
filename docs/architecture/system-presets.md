# System Presets Architecture

## Overview

When a campaign is connected to Foundry VTT, the game system is detected automatically via `game.system.id`. If the system is recognized, criticality rules and gamification recommendations are auto-configured.

Tumulte supports **364+ Foundry VTT game systems** through a three-tier architecture:

- **Tier 1** (15 systems, ~85% of users): Full support with dedicated adapters and presets
- **Tier 2** (~25 systems, ~10% of users): Degraded support via GenericAdapter
- **Tier 3** (~320+ systems, ~5% of users): Basic dice extraction, manual configuration required

See [System Compatibility Tiers](#system-compatibility-tiers) for the complete breakdown.

---

## Criticality Detection Fallback Chain

The system uses a three-tier fallback mechanism to determine when a dice roll is critical:

### 1. System Adapter (Foundry VTT Module)

**Location**: `modules-vtt/foundry/scripts/utils/system-adapters.js`

Client-side JavaScript adapters enriches dice rolls with system-specific criticality data before sending to the backend. This is the first line of detection.

**Responsibilities**:
- Parse roll data from Foundry's Roll API
- Detect critical success/failure based on system rules
- Attach `isCriticalSuccess` and `isCriticalFailure` flags to roll metadata

**Example** (D&D 5e):
```javascript
dnd5e: {
  name: 'D&D 5th Edition',
  detectCritical: (roll) => {
    const d20Result = roll.dice.find(d => d.faces === 20)?.results?.[0]?.result
    return {
      isCriticalSuccess: d20Result === 20,
      isCriticalFailure: d20Result === 1
    }
  }
}
```

### 2. System Preset (Backend Registry)

**Location**: `backend/app/services/campaigns/system_preset_registry.ts`

If the adapter doesn't provide criticality data (or the module is outdated), the backend applies preset rules from the registry. These rules are stored in the database and evaluated against incoming dice rolls.

**Responsibilities**:
- Define criticality rules per system (e.g., "natural 20 on d20 = critical success")
- Auto-generate database rows on first system detection
- Provide gamification event recommendations based on system capabilities

**Example** (D&D 5e):
```typescript
dnd5e: {
  name: 'D&D 5th Edition',
  criticalityRules: [
    {
      name: 'Natural 20 (Critical Success)',
      slug: 'nat20',
      diceType: 'd20',
      minValue: 20,
      maxValue: 20,
      isCriticalSuccess: true,
      priority: 100
    },
    {
      name: 'Natural 1 (Critical Failure)',
      slug: 'nat1',
      diceType: 'd20',
      minValue: 1,
      maxValue: 1,
      isCriticalFailure: true,
      priority: 100
    }
  ],
  capabilities: {
    hasSpells: true,
    hasTraditionalCriticals: true,
    hasDicePool: false,
    hasPercentile: false
  }
}
```

### 3. Custom Rules (Game Master)

**Managed via**: Frontend UI (`/mj/campaigns/[id]/criticality-rules`)

GMs can override or supplement system presets with custom rules. Custom rules have higher priority and are always evaluated first.

**Use cases**:
- House rules (e.g., "rolling 19-20 on d20 is critical")
- Campaign-specific mechanics
- Rare systems not supported by presets

---

## Key Files

### Backend

| File | Description |
|------|-------------|
| `backend/app/services/campaigns/system_preset_registry.ts` | TypeScript registry of all presets. Code-defined, no database table. |
| `backend/app/services/campaigns/system_preset_service.ts` | Applies and clears presets per campaign. Idempotent operations. |
| `backend/app/models/campaign.ts` | Stores `gameSystemId` (e.g., `dnd5e`) detected from Foundry. |
| `backend/app/models/campaign_criticality_rule.ts` | Database model for criticality rules. Includes `isSystemPreset` and `presetKey` fields. |

### Foundry VTT Module

| File | Description |
|------|-------------|
| `modules-vtt/foundry/scripts/utils/system-adapters.js` | 15 Tier 1 adapters + GenericAdapter fallback. Client-side criticality detection. |
| `modules-vtt/foundry/scripts/lib/pairing-manager.js` | Sends `gameSystemId` during pairing handshake. |
| `modules-vtt/foundry/scripts/collectors/combat-collector.js` | Sends `metadata.system` with dice rolls. |

---

## Detection Points (3-Point Chain)

The system detects `gameSystemId` at three possible moments, listed by preference order:

### 1. Pairing (Highest Priority)

**Triggered**: When the GM pairs Foundry VTT with the backend via pairing code.

**Flow**:
```
pairing-manager.js → POST /webhooks/foundry/pairing
  → VttPairingService.processPairingRequest()
    → campaign.gameSystemId = game.system.id
      → SystemPresetService.applyPresetsIfNeeded()
```

**Advantage**: Presets are applied immediately after connection. GMs see auto-configured rules before the first roll.

### 2. First Dice Roll (Lazy Fallback)

**Triggered**: When the first dice roll is received via webhook, if `gameSystemId` is still `null`.

**Flow**:
```
combat-collector.js → POST /webhooks/vtt/dice-roll
  → VttWebhookService.handleDiceRoll()
    → metadata.system detected
      → campaign.gameSystemId = metadata.system
        → SystemPresetService.applyPresetsIfNeeded()
```

**Advantage**: Catches campaigns created before system detection was implemented.

### 3. Campaign Sync (Alternative)

**Triggered**: When the Foundry module sends a sync payload (e.g., character import, combat state sync).

**Flow**:
```
socket-client.js → POST /webhooks/foundry/sync
  → VttWebhookService.handleSync()
    → payload.gameSystemId
      → campaign.gameSystemId = payload.gameSystemId
        → SystemPresetService.applyPresetsIfNeeded()
```

**Advantage**: Redundant safety net if pairing or dice rolls don't capture the system ID.

---

## Adding a New System Preset

Follow these steps to support a new RPG system:

### Step 1: Add System Adapter (Foundry Module)

**File**: `modules-vtt/foundry/scripts/utils/system-adapters.js`

Add a new entry to the `SYSTEM_ADAPTERS` object:

```javascript
export const SYSTEM_ADAPTERS = {
  // ... existing adapters

  'my-system-id': {
    name: 'My System Name',
    detectCritical: (roll) => {
      // Parse roll data
      const diceResult = roll.dice[0]?.results?.[0]?.result

      // Apply system-specific logic
      return {
        isCriticalSuccess: diceResult >= 6, // Example: d6 rolls 6
        isCriticalFailure: diceResult === 1
      }
    }
  }
}
```

**Important**: Use the exact `game.system.id` as the key (lowercase, hyphen-separated).

### Step 2: Add Preset to Registry (Backend)

**File**: `backend/app/services/campaigns/system_preset_registry.ts`

Add a new entry to the `SYSTEM_PRESETS` constant:

```typescript
export const SYSTEM_PRESETS: Record<string, SystemPreset> = {
  // ... existing presets

  'my-system-id': {
    name: 'My System Name',
    criticalityRules: [
      {
        name: 'Critical Success',
        slug: 'critical-success',
        diceType: 'd6',
        minValue: 6,
        maxValue: 6,
        isCriticalSuccess: true,
        isCriticalFailure: false,
        priority: 100,
        description: 'Rolling the maximum value on d6 is a critical success'
      },
      {
        name: 'Critical Failure',
        slug: 'critical-failure',
        diceType: 'd6',
        minValue: 1,
        maxValue: 1,
        isCriticalSuccess: false,
        isCriticalFailure: true,
        priority: 100,
        description: 'Rolling 1 on d6 is a critical failure'
      }
    ],
    capabilities: {
      hasSpells: false,
      hasTraditionalCriticals: true,
      hasDicePool: false,
      hasPercentile: false,
      hasSuccessThreshold: false,
      hasAdvantageDisadvantage: false
    }
  }
}
```

### Step 3: No Migration Required

Presets are defined in code, not in the database. The `SystemPresetService.applyPresetsIfNeeded()` method creates database rows lazily when the system is first detected.

**Idempotence**: The unique index `(campaign_id, preset_key)` prevents duplicate rows. Subsequent calls are no-ops.

### Step 4: Test Detection

1. Create a campaign and pair with Foundry VTT
2. Verify `campaign.gameSystemId` is set to `my-system-id`
3. Check criticality rules are auto-created via `GET /mj/campaigns/:id/criticality-rules`
4. Roll dice in Foundry and verify criticality detection works

---

## System Compatibility Tiers

Tumulte classifies Foundry VTT game systems into three tiers based on the level of support provided. This classification is based on Foundry VTT 2025 usage statistics (~364 systems total, data from 51% of license holders who opt into analytics).

### Tier 1 — Full Support (15 systems, ~85% of Foundry VTT users)

Each Tier 1 system has:
- A **dedicated Foundry Adapter** (`system-adapters.js`) with system-specific criticality detection, roll type parsing, character stats, spells, and features extraction
- A **backend Preset** (`system_preset_registry.ts`) with criticality rules, capabilities, and recommended gamification events
- **Enriched criticality data** (severity, labels, system-specific categories like "Messy Critical", "Glitch", "Facehugger")

| System ID | Name | Install % | Dice | Crits | Pool | %ile | Spells |
|-----------|------|-----------|------|-------|------|------|--------|
| `dnd5e` | D&D 5th Edition | 64.28% | d20 | Yes | — | — | Yes |
| `pf2e` | Pathfinder 2e | 30.52% | d20 | Yes | — | — | Yes |
| `CoC7` | Call of Cthulhu 7e | 6.71% | d100 | — | — | Yes | Yes |
| `wfrp4e` | Warhammer Fantasy 4e | 4.16% | d100 | — | — | Yes | Yes |
| `swade` | Savage Worlds | 3.94% | Variable | Aces | — | — | Yes |
| `cyberpunk-red-core` | Cyberpunk RED | 3.50% | d10 | Yes | — | — | — |
| `vtm5e` / `wod5e` | Vampire 5e / WoD 5e | 3.61% | d10 | — | Yes | — | — |
| `starwarsffg` / `genesys` | Star Wars FFG / Genesys | 3.28% | d12 | — | — | — | Yes |
| `alienrpg` | Alien RPG | 3.02% | d6 | — | Yes | — | — |
| `shadowrun5e` / `shadowrun6-eden` | Shadowrun 5e/6e | ~2.0% | d6 | — | Yes | — | Yes |
| `forbidden-lands` | Forbidden Lands | 1.87% | d6 | — | Yes | — | Yes |
| `blades-in-the-dark` | Blades in the Dark | ~1.5% | d6 | — | Yes | — | — |
| `vaesen` | Vaesen | ~1.0% | d6 | — | Yes | — | — |
| `fate-core-official` | Fate Core | ~0.8% | 4dF | Yes | — | — | — |

**Aliases**: `wod5e` → `vtm5e`, `shadowrun6-eden` → `shadowrun5e`, `genesys` → `starwarsffg`.

### Tier 2 — Degraded Support (~25 systems, ~10% of Foundry VTT users)

Tier 2 systems work with Tumulte but with reduced functionality:
- **No dedicated Foundry Adapter** — the `GenericAdapter` handles dice extraction
- **Criticality detection is generic**: only d20 natural 1/20 is detected by the client-side adapter. Systems not based on d20 will have no client-side criticality detection.
- **Backend presets could be added** without code changes in the Foundry module (preset-only support)
- **No enriched criticality data** (no system-specific labels, severity defaults to "major")
- **No system-specific roll type detection** (attacks, saves, skill checks are not identified)
- **No system-specific character extraction** (stats, spells, features return generic/empty data)

Tier 2 is subdivided by dice mechanics compatibility:

#### Tier 2a — d20-based systems (GenericAdapter detects nat 1/20)

These systems benefit from the `GenericAdapter`'s built-in d20 detection. Criticality works out of the box for natural 1 and 20.

| System ID | Name | Install % | Notes |
|-----------|------|-----------|-------|
| `pf1` | Pathfinder 1e | 4.32% | Pure d20, confirmation rolls not detected |
| `sfrpg` | Starfinder | 4.06% | Pure d20, compatible with generic adapter |
| `a5e` | Level Up: Advanced 5e | 2.34% | d20-based, modified crit ranges not detected |
| `d35e` | D&D 3.5e | 1.51% | Pure d20, confirmation rolls not detected |
| `shadowdark` | Shadowdark RPG | 1.85% | d20 with advantage, generic detection works |
| `tormenta20` | Tormenta20 | 0.90% | Brazilian d20 system, generic detection works |
| `dcc` | Dungeon Crawl Classics | ~0.7% | d20-based but "dice chain" (d3→d30) not handled |
| `lancer` | LANCER | 3.87% | d20 + d6 accuracy; d20 crits detected, accuracy ignored |

#### Tier 2b — d100/percentile systems (GenericAdapter does NOT detect crits)

These systems share mechanics with existing Tier 1 percentile systems (CoC7, WFRP4e) but have no dedicated adapter. The GM must create custom criticality rules.

| System ID | Name | Install % | Notes |
|-----------|------|-----------|-------|
| `deltagreen` | Delta Green | 2.26% | d100, similar to CoC7 (01 = crit, doubles = special) |
| `dsa5` | Das Schwarze Auge 5e | 1.01% | 3d20 vs attributes, unique roll-under mechanic |

#### Tier 2c — d6/d10 dice pool systems (GenericAdapter does NOT detect crits)

These systems use dice pools similar to existing Tier 1 systems but have no dedicated adapter. No criticality detection occurs.

| System ID | Name | Install % | Notes |
|-----------|------|-----------|-------|
| `wrath-and-glory` | Warhammer 40K: Wrath & Glory | 2.37% | d6 pool, icons on 4-5, wrath die on 6 |
| `worldofdarkness` | World of Darkness 20th | 2.10% | d10 pool, similar to VtM5e but different success rules |
| `dragonbane` | Dragonbane | 1.43% | d20 roll-UNDER (inverted logic), 1 = Dragon, 20 = Demon |
| `blade-runner` | Blade Runner RPG | ~0.5% | Year Zero Engine variant, stepped dice (d6→d12) |

#### Tier 2d — Other mechanics (GenericAdapter provides basic dice extraction only)

| System ID | Name | Install % | Notes |
|-----------|------|-----------|-------|
| `gurps` | GURPS 4th Edition | 1.85% | 3d6 roll-under, no crit concept in adapter |
| `foundry-ironsworn` | Ironsworn / Starforged | ~0.7% | d6 + 2d10 narrative, 3-tier outcomes |
| `demonlord` | Shadow of the Demon Lord | ~0.5% | d20-based but boons/banes system |
| `city-of-mist` | City of Mist | ~0.4% | PbtA 2d6, 6-/7-9/10+ outcomes |
| `torgeternity` | Torg Eternity | ~0.3% | d20 + bonus die, unique drama deck |

### Tier 3 — Basic/Untested (~320+ systems, ~5% of Foundry VTT users)

All remaining Foundry VTT systems fall into Tier 3:
- **`GenericAdapter` only** — basic dice result extraction
- **d20 criticality only** — natural 1/20 detection for d20-based systems; no detection for other dice types
- **No backend preset** — the GM must manually create all criticality rules
- **No system-specific features** — spells, features, and stats extraction returns generic/empty results
- **No guarantees** — these systems have not been tested with Tumulte

The GM can still use Tumulte with Tier 3 systems by:
1. Connecting Foundry VTT normally (pairing works regardless of system)
2. Creating custom criticality rules manually in the campaign settings
3. Using gamification events that don't depend on system-specific detection (dice-invert works with any roll)

### Coverage Summary

| Tier | Systems | Foundry Users | Adapter | Preset | Criticality | Spells/Features |
|------|---------|---------------|---------|--------|-------------|-----------------|
| **Tier 1** | 15 | ~85% | Dedicated | Yes | Full (enriched) | System-specific |
| **Tier 2a** | 8 | ~5% | Generic (d20 works) | No | Partial (nat 1/20 only) | Generic |
| **Tier 2b-d** | ~17 | ~5% | Generic (no detection) | No | None (manual rules) | Generic |
| **Tier 3** | ~320+ | ~5% | Generic (no detection) | No | None (manual rules) | Generic |

**Total estimated coverage**: ~85% of Foundry VTT users get full support. ~95% get at least basic d20 detection or can use manual rules. Remaining ~5% are niche/regional systems where basic dice extraction still works.

---

## Idempotence & Database Design

### Preset Key Format

System preset rules are uniquely identified by a composite key:

```
{systemId}:{ruleSlug}
```

**Examples**:
- `dnd5e:nat20` (D&D 5e Natural 20)
- `pf2e:crit-success` (Pathfinder 2e Critical Success)
- `CoC7:extreme-success` (Call of Cthulhu 7e Extreme Success)

### Partial Unique Index

```sql
CREATE UNIQUE INDEX campaign_criticality_rules_preset_key_unique
ON campaign_criticality_rules (campaign_id, preset_key)
WHERE preset_key IS NOT NULL;
```

**Behavior**:
- Prevents duplicate preset rules per campaign
- Custom rules (where `preset_key IS NULL`) are not constrained
- Allows `applyPresetsIfNeeded()` to be called multiple times safely

### Database Schema

**Table**: `campaign_criticality_rules`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `campaign_id` | UUID | Foreign key to `campaigns` |
| `name` | VARCHAR | Human-readable rule name |
| `slug` | VARCHAR | URL-friendly identifier (e.g., `nat20`) |
| `dice_type` | VARCHAR | Dice notation (e.g., `d20`, `d100`) |
| `min_value` | INTEGER | Minimum value for criticality |
| `max_value` | INTEGER | Maximum value for criticality |
| `is_critical_success` | BOOLEAN | Triggers critical success events |
| `is_critical_failure` | BOOLEAN | Triggers critical failure events |
| `priority` | INTEGER | Evaluation order (higher = first) |
| `is_enabled` | BOOLEAN | Can be toggled by GM |
| `is_system_preset` | BOOLEAN | Read-only flag (true for presets) |
| `preset_key` | VARCHAR | Unique key (e.g., `dnd5e:nat20`) |
| `description` | TEXT | Optional explanation |

---

## Protection Mechanisms

System preset rules are protected against accidental deletion or modification:

### Backend Validation

**File**: `backend/app/services/campaigns/criticality_rule_service.ts`

```typescript
async delete(ruleId: string): Promise<void> {
  const rule = await this.repository.findById(ruleId)

  if (rule.isSystemPreset) {
    throw new Error('System preset rules cannot be deleted')
  }

  await this.repository.delete(ruleId)
}

async update(ruleId: string, data: UpdateCriticalityRuleDto): Promise<CriticalityRule> {
  const rule = await this.repository.findById(ruleId)

  if (rule.isSystemPreset) {
    // Only allow toggling isEnabled
    const allowedFields = ['isEnabled']
    const providedFields = Object.keys(data)
    const forbidden = providedFields.filter(f => !allowedFields.includes(f))

    if (forbidden.length > 0) {
      throw new Error(`System preset rules cannot modify: ${forbidden.join(', ')}`)
    }
  }

  return this.repository.update(ruleId, data)
}
```

### Frontend UI

**File**: `frontend/pages/mj/campaigns/[id]/criticality-rules.vue`

**Visual indicators**:
- Lock icon (`i-lucide-lock`) next to preset rule names
- "Auto" badge with system name (e.g., "Auto: D&D 5e")
- Delete button is disabled for preset rules
- Edit form only shows "Enabled" toggle for preset rules

**Example**:
```vue
<div v-if="rule.isSystemPreset" class="flex items-center gap-2">
  <UIcon name="i-lucide-lock" class="size-4 text-muted" />
  <UBadge color="primary" variant="soft">
    Auto: {{ systemName }}
  </UBadge>
</div>
```

---

## System Capabilities

Each preset declares its mechanical capabilities via the `SystemCapabilities` interface. This enables smart UI recommendations and feature filtering.

### Capability Flags

| Flag | Description | Example Systems |
|------|-------------|-----------------|
| `hasSpells` | System has spellcasting mechanics | D&D 5e, Pathfinder 2e, Warhammer |
| `hasTraditionalCriticals` | Natural 1/20 or similar | D&D 5e, Pathfinder 2e, Cyberpunk RED |
| `hasDicePool` | Uses multiple dice for success counting | Vampire 5e, Alien RPG, Blades in the Dark |
| `hasPercentile` | d100 or d%-based rolls | Call of Cthulhu, Warhammer Fantasy |
| `hasSuccessThreshold` | Target number mechanics | Shadowrun, World of Darkness |
| `hasAdvantageDisadvantage` | Advantage/disadvantage or similar | D&D 5e (only) |

### Frontend Usage

**File**: `frontend/composables/useGamificationRecommendations.ts`

```typescript
export function useGamificationRecommendations(campaign: Campaign) {
  const capabilities = getSystemCapabilities(campaign.gameSystemId)

  const recommendedEvents = computed(() => {
    const events: GamificationEvent[] = []

    if (capabilities.hasSpells) {
      events.push('spell_buff', 'spell_debuff', 'spell_disable')
    }

    if (capabilities.hasTraditionalCriticals) {
      events.push('dice_critical_success', 'dice_critical_failure', 'dice_invert')
    }

    if (capabilities.hasDicePool) {
      events.push('dice_pool_modifier', 'dice_pool_reroll')
    }

    return events
  })

  return { recommendedEvents, capabilities }
}
```

**Example UI**:
- D&D 5e campaign shows spell-based gamification events prominently
- Call of Cthulhu hides spell events, shows percentile-based rewards
- Vampire 5e emphasizes dice pool mechanics

---

## Lazy Application Flow

Presets are applied lazily to avoid unnecessary database writes for campaigns that never connect to Foundry VTT.

### Service Method

**File**: `backend/app/services/campaigns/system_preset_service.ts`

```typescript
async applyPresetsIfNeeded(campaign: Campaign): Promise<void> {
  // Guard: Campaign must have a detected game system
  if (!campaign.gameSystemId) {
    return
  }

  // Guard: Check if presets already applied
  const existingPresets = await this.criticalityRuleRepository.findByCampaign(
    campaign.id,
    { isSystemPreset: true }
  )

  if (existingPresets.length > 0) {
    return // Already applied
  }

  // Fetch preset from registry
  const preset = SYSTEM_PRESETS[campaign.gameSystemId]
  if (!preset) {
    return // No preset available for this system
  }

  // Create rules in database
  for (const rule of preset.criticalityRules) {
    await this.criticalityRuleRepository.create({
      campaignId: campaign.id,
      name: rule.name,
      slug: rule.slug,
      diceType: rule.diceType,
      minValue: rule.minValue,
      maxValue: rule.maxValue,
      isCriticalSuccess: rule.isCriticalSuccess,
      isCriticalFailure: rule.isCriticalFailure,
      priority: rule.priority,
      isEnabled: true,
      isSystemPreset: true,
      presetKey: `${campaign.gameSystemId}:${rule.slug}`,
      description: rule.description
    })
  }
}
```

### Invocation Points

**1. After Pairing**:
```typescript
// VttPairingService.processPairingRequest()
campaign.gameSystemId = pairingRequest.gameSystemId
await campaign.save()
await systemPresetService.applyPresetsIfNeeded(campaign)
```

**2. After First Dice Roll**:
```typescript
// VttWebhookService.handleDiceRoll()
if (!campaign.gameSystemId && metadata.system) {
  campaign.gameSystemId = metadata.system
  await campaign.save()
  await systemPresetService.applyPresetsIfNeeded(campaign)
}
```

**3. After Sync**:
```typescript
// VttWebhookService.handleSync()
if (!campaign.gameSystemId && syncPayload.gameSystemId) {
  campaign.gameSystemId = syncPayload.gameSystemId
  await campaign.save()
  await systemPresetService.applyPresetsIfNeeded(campaign)
}
```

---

## Error Handling

### Unknown System Detected

If Foundry sends a `gameSystemId` not present in `SYSTEM_PRESETS`, the backend:

1. Stores the `gameSystemId` on the campaign (for future extensibility)
2. Logs a warning to Sentry with breadcrumb: `Unknown game system detected: {systemId}`
3. Does not create any preset rules
4. Falls back to custom rules defined by the GM

**Frontend behavior**:
- Shows a notice: "This system is not supported yet. You can create custom criticality rules."
- Provides a link to the support/suggestion form

### Partial Application Failure

If rule creation fails mid-loop (e.g., database constraint violation), the transaction is rolled back and:

1. Error is logged to Sentry
2. HTTP 500 returned to Foundry module (pairing fails)
3. GM must retry pairing or contact support

**Idempotence protection**: The unique index prevents duplicate rules. Retrying the operation is safe.

---

## Related Documentation

- [VTT Integration](vtt-integration.md) - Foundry module architecture
- [Gamification System](gamification.md) - How criticality rules trigger gamification events
- [API Reference](../api/reference.md) - Criticality rule endpoints
- [Contributing Guide](../guides/contributing.md) - Submitting new system presets

---

## Glossary

| Term | Definition |
|------|------------|
| **System Adapter** | Client-side JavaScript module in Foundry VTT that parses roll data. Tier 1 systems have a dedicated adapter; all others use `GenericAdapter`. |
| **System Preset** | Backend-defined criticality rules auto-applied for recognized systems. Only Tier 1 systems have presets. |
| **Criticality Rule** | Database row defining when a dice roll is critical (success or failure) |
| **Preset Key** | Unique identifier for preset rules (`{systemId}:{ruleSlug}`) |
| **Game System ID** | Foundry VTT's internal identifier for RPG systems (e.g., `dnd5e`) |
| **Lazy Application** | Presets are created in the database only when the system is first detected |
| **System Capabilities** | Flags indicating which mechanics a system supports (spells, dice pools, etc.) |
| **Tier 1** | Full support: dedicated adapter + backend preset + enriched criticality. 15 systems covering ~85% of users. |
| **Tier 2** | Degraded support: `GenericAdapter` only, no preset. d20 systems get partial crit detection; others require manual rules. |
| **Tier 3** | Basic/untested: `GenericAdapter` with d20-only detection. GM must configure everything manually. |
| **GenericAdapter** | Default client-side adapter used for all unrecognized systems. Detects d20 natural 1/20 only. |
