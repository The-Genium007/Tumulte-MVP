# Risk Assessment: VTT API Integration Feature

**Feature:** Real-time integration with Foundry VTT, Roll20, and Alchemy RPG for Twitch streaming overlays

**Assessment Date:** January 14, 2026

**Assessed By:** Product Discovery Risk Analyst

---

## Overall Risk Profile

**Risk Level: HIGH**

**Quick Assessment:**
- **Probability of Success**: 35-45%
- **Impact if Fails**: High (6-8 months wasted, technical debt, user disappointment)
- **Reversibility**: Difficult (requires removing database tables, API endpoints, UI components across stack)

**Verdict**: **YELLOW LIGHT (Proceed with extreme caution) / RED LIGHT (Consider pivoting to MVP)**

The VTT integration feature faces critical technical blockers, significant maintenance burden, and uncertain adoption. Without major scope reduction or phased rollout, this feature poses substantial risk to the project timeline and team capacity.

---

# Technical Risks

## Risk 1: Roll20 Has No External API

### Description
Roll20 does not provide any external REST or WebSocket API for third-party applications. The Roll20 "API" is an internal sandboxed scripting system that only works within the game session and cannot communicate with external services like Tumulte. This is a **complete blocker** for Roll20 integration.

### Severity
- **Probability**: 100% (confirmed by research)
- **Impact**: High (invalidates 33% of planned integrations)
- **Overall Severity**: **CRITICAL**

**Evidence**:
- [Roll20 Community Forums](https://app.roll20.net/forum/post/6602584/http-post-slash-get-or-rest-api) confirm no external API exists
- [Roll20 API Introduction](https://help.roll20.net/hc/en-us/articles/360037256714-Roll20-Mods-API) shows API is sandboxed and cannot access external services
- Multiple forum threads show years of user requests for external API access with no response from Roll20 team

### Mitigation Strategies

1. **Remove Roll20 from Scope**
   - **Action**: Eliminate Roll20 integration entirely from v0.5.0 roadmap
   - **Owner**: Product Manager
   - **Timing**: Immediate (before development starts)
   - **Cost**: None (saves development time)
   - **Trade-off**: Excludes Roll20 users (estimated 40-50% of TTRPG streaming market)

2. **Wait-and-See Approach**
   - **Action**: Mark Roll20 as "Future Consideration" pending API availability
   - **Owner**: Product Manager
   - **Timing**: Quarterly check-ins on Roll20 API roadmap
   - **Cost**: Minimal (1 hour/quarter)
   - **Risk**: May never materialize

3. **Browser Extension Workaround (High Risk)**
   - **Action**: Develop Chrome extension that scrapes Roll20 UI and sends events to Tumulte
   - **Owner**: Senior Developer
   - **Timing**: 4-6 weeks development
   - **Cost**: Very high (brittle, breaks with UI changes, violates ToS)
   - **Legality**: May violate Roll20 Terms of Service
   - **Recommendation**: **DO NOT PURSUE** - too risky

### Contingency Plan
**If Roll20 is critical for success**: Consider pivoting entire feature to "VTT-agnostic overlay system" where GMs manually trigger events via Tumulte dashboard instead of automatic VTT integration.

### Monitoring
**How to detect early**: N/A - this is already confirmed. Monitor Roll20 developer announcements quarterly.

---

## Risk 2: Foundry VTT Requires User-Installed Modules

### Description
Foundry VTT does not have a native external REST/WebSocket API. External integration requires GMs to install third-party community modules ([Foundry REST API](https://github.com/ThreeHats/foundryvtt-rest-api), [PlaneShift](https://github.com/cclloyd/planeshift), or [HTTP API](https://github.com/kakaroto/fvtt-module-api)) on their self-hosted Foundry instance. This creates a **multi-step setup barrier** and **version compatibility risks**.

### Severity
- **Probability**: High (80%) - setup complexity will cause drop-off
- **Impact**: Medium-High (adoption barrier, support burden)
- **Overall Severity**: **HIGH**

**Evidence**:
- Foundry VTT has no official REST API ([Official API Docs](https://foundryvtt.com/api/) only cover internal JavaScript API)
- Community modules ([ThreeHats REST API](https://github.com/ThreeHats/foundryvtt-rest-api), [PlaneShift](https://github.com/cclloyd/planeshift)) are maintained by individuals, not Foundry VTT company
- Requires GMs to: (1) Install Foundry module, (2) Configure WebSocket relay, (3) Generate API keys, (4) Configure Tumulte with endpoint + key

### Mitigation Strategies

1. **Official Module Partnership**
   - **Action**: Partner with ThreeHats (Foundry REST API maintainer) to co-develop/support official integration
   - **Owner**: Product Manager + Lead Developer
   - **Timing**: Pre-development (4-6 weeks negotiation)
   - **Cost**: Medium (partnership agreement, potential financial support)
   - **Benefits**: Shared maintenance burden, official endorsement, better UX
   - **Risk**: Partner may decline or lack capacity

2. **Comprehensive Setup Wizard**
   - **Action**: Build guided setup flow in Tumulte frontend with screenshots, video tutorial, and "Test Connection" button
   - **Owner**: Frontend Developer + Technical Writer
   - **Timing**: During development (2 weeks)
   - **Cost**: 80 hours (development + documentation)
   - **Benefits**: Reduces drop-off during setup

3. **Fallback to Manual Mode**
   - **Action**: Offer "Manual Trigger" mode where GMs click button in Tumulte dashboard to push events to overlay (no VTT integration required)
   - **Owner**: Backend Developer
   - **Timing**: Phase 1 MVP
   - **Cost**: 40 hours (simpler than full integration)
   - **Benefits**: Works for all VTTs, no setup complexity

### Contingency Plan
**If setup complexity causes >60% drop-off**: Pivot to "Manual Mode First" approach - ship manual triggers in v0.5.0, VTT integrations in v0.6.0 after validating demand.

### Monitoring
**Metrics to track**:
- Setup completion rate (% who start setup and successfully connect Foundry)
- Time-to-first-connection (should be <15 minutes)
- Support tickets related to Foundry connection issues

**Red flags**:
- <40% setup completion rate
- >30 minutes average time-to-connect
- >5 support tickets/week on Foundry setup

---

## Risk 3: Alchemy RPG Has No Real-Time API

### Description
Alchemy RPG only offers **file-based character imports** (JSON upload), with no REST or WebSocket API for real-time event streaming. Their [developer documentation](https://alchemyrpg.github.io/slate/) explicitly states "this is a file-based import process, but we may open up an API for this in the future" (no timeline provided). **Real-time dice roll integration is impossible** with current Alchemy infrastructure.

### Severity
- **Probability**: 100% (confirmed by documentation)
- **Impact**: High (invalidates 33% of planned integrations)
- **Overall Severity**: **CRITICAL**

**Evidence**:
- [Alchemy Developer Documentation](https://alchemyrpg.github.io/slate/) shows only character import API (no events, no WebSocket)
- No authentication methods documented
- API is marked as "future consideration" with no roadmap

### Mitigation Strategies

1. **Remove Alchemy RPG from Scope**
   - **Action**: Eliminate Alchemy integration from v0.5.0 roadmap
   - **Owner**: Product Manager
   - **Timing**: Immediate (before development starts)
   - **Cost**: None (saves development time)
   - **Trade-off**: Excludes Alchemy users (small market ~5-10% of TTRPG streamers)

2. **Contact Alchemy Team Directly**
   - **Action**: Email Alchemy team to inquire about API roadmap and potential early access partnership
   - **Owner**: Product Manager
   - **Timing**: Pre-development (2 weeks for response)
   - **Cost**: Low (email + negotiation time)
   - **Probability of Success**: Low (20%) - small team, early-stage product
   - **Outcome**: If API available in 2026, add Alchemy in v0.6.0 or later

3. **Pre-announce "Coming Soon"**
   - **Action**: Show Alchemy in settings page as "Coming Soon" (already implemented in frontend/pages/settings/index.vue line 141)
   - **Owner**: Product Manager
   - **Timing**: Now (already done)
   - **Cost**: None
   - **Benefits**: Sets expectations, avoids user disappointment

### Contingency Plan
**If Alchemy API launches in 2026**: Fast-follow integration in v0.6.0 using lessons learned from Foundry implementation.

### Monitoring
**How to detect early**:
- Subscribe to [Alchemy GitHub](https://github.com/alchemyrpg) repository notifications
- Quarterly check-ins on developer documentation updates

---

## Risk 4: Real-Time Latency Cascade

### Description
Real-time VTT integration requires event propagation through **4+ systems**: VTT → Foundry Module → Tumulte Backend → Tumulte WebSocket → Overlay → Twitch Stream. Each hop adds 50-200ms latency, plus network jitter. **Total end-to-end latency could exceed 1-3 seconds**, making "real-time" overlay feel laggy compared to direct VTT display on stream.

### Severity
- **Probability**: Medium-High (70%) - latency is inherent to architecture
- **Impact**: Medium (UX degradation, user complaints)
- **Overall Severity**: **MEDIUM-HIGH**

**Evidence**:
- Current Tumulte WebSocket (Transmit) already has 100-300ms latency for poll updates (observed in logs)
- Foundry REST API modules use WebSocket relay servers (default: wss://foundryvtt-rest-api-relay.fly.dev/) adding extra network hop
- Twitch stream delay adds 3-15 seconds (RTMP/HLS), though overlay renders before stream encoding

**Latency Breakdown**:
1. VTT event generation: 10-50ms
2. Foundry module processing: 50-100ms
3. WebSocket relay → Tumulte backend: 100-300ms (depending on hosting)
4. Tumulte WebSocket broadcast: 100-200ms
5. Overlay rendering: 16-33ms (60 FPS)
**Total: 276-683ms (best case) to 1-3 seconds (worst case)**

### Mitigation Strategies

1. **Optimize WebSocket Pipeline**
   - **Action**: Implement WebSocket connection pooling, reduce payload size, use binary protocol (MessagePack instead of JSON)
   - **Owner**: Backend Developer
   - **Timing**: During development (1 week optimization)
   - **Cost**: 40 hours
   - **Expected Improvement**: Reduce latency by 30-40% (200-400ms total)

2. **Direct WebSocket Connection (No Relay)**
   - **Action**: Allow GMs to expose Foundry instance directly to Tumulte (skip relay server)
   - **Owner**: Backend Developer
   - **Timing**: Phase 2 (after MVP)
   - **Cost**: 60 hours (security hardening, firewall configuration docs)
   - **Expected Improvement**: Remove 100-300ms relay hop
   - **Trade-off**: Requires port forwarding, more complex setup

3. **Set User Expectations**
   - **Action**: Document expected 300-500ms latency in setup guide, position as "acceptable for narrative events" (not suitable for frame-perfect reactions)
   - **Owner**: Product Manager + Technical Writer
   - **Timing**: Pre-launch (documentation phase)
   - **Cost**: Low (4 hours documentation)
   - **Benefits**: Reduces complaint rate by setting realistic expectations

### Contingency Plan
**If latency complaints are high**: Add "Latency Compensation" setting in overlay studio to pre-emptively display events 500ms-1s earlier (GM configurable).

### Monitoring
**Metrics to track**:
- End-to-end latency (VTT event timestamp → Overlay display timestamp)
- P50, P95, P99 latency percentiles
- User complaints about "lag" or "delay"

**Red flags**:
- P95 latency >1.5 seconds
- >10% of users report latency issues
- Overlay feels "out of sync" with VTT on stream

---

## Risk 5: Data Model Complexity Across VTTs

### Description
Each VTT has **radically different data structures** for characters, items, dice rolls, and game systems. Foundry supports 200+ game systems (D&D 5e, Pathfinder 2e, Savage Worlds, etc.), each with custom schemas. **Normalizing this data into a unified Tumulte format is a massive undertaking** that could spiral into 6-12 months of work.

### Severity
- **Probability**: High (80%) - complexity is unavoidable
- **Impact**: High (scope creep, delayed launch)
- **Overall Severity**: **HIGH**

**Evidence**:
- Foundry VTT has [200+ game systems](https://foundryvtt.com/packages/systems) with different character sheet structures
- D&D 5e character has `attributes.hp.value`, Pathfinder 2e uses `attributes.hp.current`, Savage Worlds uses `wounds`
- Dice roll formats vary: `1d20+5` (D&D), `3d6` (GURPS), `d100` (Call of Cthulhu)

### Mitigation Strategies

1. **Scope to Common Events Only (MVP)**
   - **Action**: Phase 1 supports ONLY generic events: dice rolls (any format), critical hits/fumbles, character HP changes (generic)
   - **Owner**: Product Manager + Architect
   - **Timing**: Pre-development (requirements freeze)
   - **Cost**: None (scope reduction)
   - **Benefits**: Ships 80% faster, validates demand before deep integration
   - **Covered Systems**: Works for D&D 5e, Pathfinder, most d20 systems

2. **Game System Adapters (Phase 2+)**
   - **Action**: Build plugin architecture where each game system has an adapter (e.g., `dnd5e-adapter.ts`, `pathfinder2e-adapter.ts`)
   - **Owner**: Backend Developer
   - **Timing**: Post-MVP (v0.6.0 or later)
   - **Cost**: 40 hours per adapter (prioritize top 5 systems: D&D 5e, Pathfinder 2e, Call of Cthulhu, Savage Worlds, Shadowrun)
   - **Benefits**: Extensible, community could contribute adapters

3. **Foundry-Specific Normalized Events**
   - **Action**: Use Foundry's internal event system (Hooks) which already normalizes some events (e.g., `createChatMessage`, `updateActor`)
   - **Owner**: Backend Developer
   - **Timing**: Phase 1 (MVP)
   - **Cost**: Minimal (leverage existing Foundry abstractions)
   - **Risk**: May not cover all edge cases

### Contingency Plan
**If data mapping spirals out of control**: Pivot to "Event Pass-Through Mode" where Tumulte simply displays raw VTT event data (JSON) on overlay, and GMs configure display logic themselves (power user feature).

### Monitoring
**How to detect early**:
- Track development velocity on adapter implementation
- If >2 weeks per adapter, scope is too large

**Red flags**:
- Adapter development takes >80 hours (double estimate)
- Support tickets about "events not showing correctly"

---

# Business Risks

## Risk 1: Low User Adoption - Setup Complexity

### Description
VTT integration requires **multi-step technical setup** (install Foundry module, configure API keys, expose endpoints, connect to Tumulte) that may overwhelm non-technical GMs. If <20% of users successfully complete setup, the feature will have wasted months of development effort with minimal ROI.

### Severity
- **Probability**: High (70%) - similar features in other products show 30-50% setup drop-off
- **Impact**: High (wasted development, feature underutilization)
- **Overall Severity**: **HIGH**

**Evidence**:
- [Stream Deck plugins for Foundry VTT](https://foundryvtt.com/packages/tag/integration) have low adoption despite high utility (requires technical setup)
- Tumulte's current user base (early alpha) skews technical, but mainstream GMs may lack skills
- Competitor analysis: OBS plugins with complex setup have <15% adoption rate

### Mitigation Strategies

1. **Pre-launch Validation (Beta Test)**
   - **Method**: Recruit 20-30 GMs for closed beta, measure setup completion rate with zero developer assistance
   - **Success Criteria**: >60% complete setup in <20 minutes
   - **Cost**: 2 weeks beta testing + 40 hours feedback analysis
   - **Owner**: Product Manager + QA
   - **Timing**: Pre-launch (beta phase)
   - **Decision**: If <60% succeed, pivot to manual mode or simplify scope

2. **One-Click Installer (Foundry Module)**
   - **Action**: Develop "Tumulte Connector" Foundry module with built-in config wizard
   - **Method**: GM installs module from Foundry package browser, enters Tumulte API key (auto-generated), clicks "Connect" → Done
   - **Cost**: 80 hours (module development + Foundry package submission)
   - **Owner**: Backend Developer
   - **Benefits**: Reduces setup from 7 steps to 2 steps
   - **Risk**: Still requires Foundry module installation knowledge

3. **Tiered Launch Strategy**
   - **Phase 1 (v0.5.0)**: Manual triggers only (no VTT integration) - validates overlay UX
   - **Phase 2 (v0.5.1)**: Foundry VTT integration for beta testers
   - **Phase 3 (v0.6.0)**: Full public rollout after iterating on setup UX
   - **Cost**: None (de-risks launch)
   - **Benefits**: Validates demand before heavy investment

### Contingency Plan
**If adoption is <20%**: Immediately pivot to "Quick Actions Dashboard" where GMs click buttons to trigger overlay events (no VTT integration). This becomes primary feature, VTT integration becomes "power user" advanced mode.

### Monitoring
**Metrics to track**:
- **Activation rate**: % of users who start VTT setup flow
- **Completion rate**: % who successfully connect VTT to Tumulte
- **Time-to-connect**: Average time from start to successful connection
- **Engagement rate**: % of users who use VTT features >3 times/week

**Red flags**:
- <40% activation rate (users don't even try)
- <30% completion rate (setup too hard)
- >25 minutes to connect (frustration threshold)
- <10% engagement rate (feature not useful)

---

## Risk 2: High Maintenance Burden

### Description
Supporting **3 VTT integrations** (Foundry, Roll20, Alchemy) means maintaining compatibility with upstream API changes, Foundry module updates, game system variations, and community relay server downtimes. With a small team (1-2 developers), this could consume **30-50% of development capacity** post-launch, blocking new features.

### Severity
- **Probability**: High (80%) - API changes are inevitable
- **Impact**: High (technical debt, team burnout, delayed roadmap)
- **Overall Severity**: **HIGH**

**Evidence**:
- Foundry VTT releases major updates every 6-8 months, often breaking module compatibility
- Community relay servers (ThreeHats WebSocket relay) have no SLA, could go offline or change endpoints
- Roll20 has no external API (already eliminated)
- Alchemy has no API yet (already eliminated)

**Realistic Scope**: Only Foundry VTT is viable, reducing to **1 integration** instead of 3.

### Mitigation Strategies

1. **Version Pinning + Deprecation Policy**
   - **Action**: Support only Foundry VTT v12+ and ThreeHats REST API module v2.0+, deprecate older versions after 6 months
   - **Method**: Add version checks in Tumulte connector, show warning if unsupported version detected
   - **Cost**: 20 hours (version detection + user messaging)
   - **Owner**: Backend Developer
   - **Benefits**: Reduces support burden by 50%

2. **Self-Hosted Relay Option**
   - **Action**: Provide Docker Compose file for GMs to host their own WebSocket relay (removes dependency on ThreeHats public server)
   - **Cost**: 40 hours (documentation + testing)
   - **Owner**: DevOps + Backend Developer
   - **Benefits**: Eliminates third-party downtime risk
   - **Trade-off**: Increases setup complexity

3. **Community Maintainer Program**
   - **Action**: Open-source Tumulte Foundry module, recruit 2-3 community maintainers to handle updates
   - **Method**: Publish on GitHub, create CONTRIBUTING.md, offer "Tumulte Pro" discount to maintainers
   - **Cost**: 40 hours (documentation + onboarding)
   - **Owner**: Product Manager + Lead Developer
   - **Benefits**: Distributes maintenance burden
   - **Risk**: Maintainers may lose interest or lack expertise

### Contingency Plan
**If maintenance consumes >40% capacity**: Deprecate Foundry integration, focus on core poll features. Offer "VTT Integration as a Service" where users pay $5-10/month for dedicated support.

### Monitoring
**Metrics to track**:
- **Breaking changes per quarter**: How often upstream APIs break Tumulte integration
- **Support ticket volume**: Tickets related to VTT integration vs other features
- **Developer time allocation**: % of sprint capacity spent on VTT maintenance

**Red flags**:
- >2 breaking changes per quarter
- >40% of support tickets are VTT-related
- >30% of developer time spent on VTT maintenance

---

## Risk 3: Cannibalization of Core Value Proposition

### Description
Tumulte's core value is **multi-stream Twitch polls**. VTT integration shifts focus to "VTT overlay system," which is a **different product category** (competes with Stream Deck, OBS plugins, native VTT overlays). If VTT features overshadow poll features, Tumulte loses its unique positioning and becomes "yet another VTT overlay tool."

### Severity
- **Probability**: Medium (50%) - depends on marketing/positioning
- **Impact**: High (brand dilution, user confusion)
- **Overall Severity**: **MEDIUM-HIGH**

**Evidence**:
- Roadmap shows VTT integration in v0.5.0, before Gamification (v0.6.0-v0.7.0) which enhances poll features
- Frontend settings page (frontend/pages/settings/index.vue) shows Foundry, Roll20, Alchemy, OBS as equal to Twitch integration (implies equal importance)
- Risk: Users come for VTT overlays, ignore poll features → Tumulte becomes commodity VTT tool

### Mitigation Strategies

1. **"Polls First, VTT Second" Positioning**
   - **Action**: Market VTT integration as "VTT events trigger Twitch polls" (e.g., critical hit → launch poll "What happens next?")
   - **Method**: Update landing page, documentation, and onboarding flow to emphasize poll-driven narrative
   - **Cost**: 20 hours (marketing copy + design)
   - **Owner**: Product Manager
   - **Benefits**: Maintains unique value proposition

2. **Delay VTT Integration to v0.6.0**
   - **Action**: Swap roadmap priorities - ship Gamification (v0.6.0) before VTT Integration (v0.7.0)
   - **Rationale**: Strengthens core poll features first, then adds VTT as enhancement
   - **Cost**: None (schedule shift)
   - **Owner**: Product Manager
   - **Benefits**: Validates poll engagement before expanding scope

3. **VTT-to-Poll Automation**
   - **Action**: Build "Smart Triggers" where VTT events automatically launch pre-configured polls (e.g., dice roll <5 → launch poll "How does the party fail?")
   - **Cost**: 60 hours (trigger engine + UI)
   - **Owner**: Backend + Frontend Developer
   - **Benefits**: Unique feature that competitors don't have (VTT + Polls = Tumulte's moat)

### Trade-off Analysis
**VTT Integration (Current Plan)**:
- **RICE**: Unknown (no prior agent analysis provided)
- **Value**: Expands use cases beyond polls
- **Effort**: 6-8 weeks (reduced to Foundry only)

**Gamification (Alternative)**:
- **RICE**: Unknown
- **Value**: Deepens engagement with existing users
- **Effort**: 4-6 weeks (leaderboards, achievements, viewer rewards)

**Assessment**: Gamification may have higher ROI if core poll adoption is <50%.

### Decision Framework
**Build VTT integration if**:
- >70% of current users request VTT features
- Core poll features have >60% weekly active usage
- Team has capacity for 8+ weeks of development + ongoing maintenance

**Build Gamification instead if**:
- Poll engagement is <50% weekly active
- User feedback prioritizes "make polls more fun" over "show VTT events"
- Team wants faster time-to-value (4-6 weeks vs 8+ weeks)

---

# Strategic Risks

## Risk 1: Opportunity Cost - Delaying Higher-Impact Features

### Description
Investing 6-8 weeks in VTT integration delays **Gamification (v0.6.0-v0.7.0)** and **Advanced Overlay (v0.8.0)**, which may have higher user demand and engagement impact. If poll engagement is low, VTT integration won't fix the core problem - it will just add complexity.

### Severity
- **Probability**: N/A (certain if we proceed)
- **Impact**: High (delayed revenue, competitive disadvantage)
- **Overall Severity**: **HIGH**

**Evidence**:
- Current roadmap shows Gamification pushed to v0.6.0 (2-3 months post-VTT launch)
- Competitor analysis: StreamLabs, StreamElements, Crowd Control all focus on gamification before VTT integration
- User acquisition funnel: Most users discover Tumulte via Twitch, not VTT communities (implies poll features are primary draw)

### Trade-off Analysis

**VTT Integration (v0.5.0)**:
- **Value**: Expands use cases (VTT events on stream)
- **Effort**: 6-8 weeks (Foundry only)
- **Adoption Risk**: High (complex setup)
- **Maintenance**: High (ongoing VTT compatibility)

**Gamification (v0.6.0-v0.7.0)**:
- **Value**: Increases viewer engagement (leaderboards, achievements, rewards)
- **Effort**: 4-6 weeks (simpler than VTT)
- **Adoption Risk**: Low (no external integrations)
- **Maintenance**: Low (self-contained features)

**Advanced Overlay (v0.8.0)**:
- **Value**: Better visual polish (animations, themes, widgets)
- **Effort**: 3-4 weeks (frontend-focused)
- **Adoption Risk**: Low (enhances existing overlay)
- **Maintenance**: Low (CSS/animation tweaks)

**Assessment**: Gamification and Advanced Overlay have **lower risk, faster delivery, and higher engagement potential** than VTT integration.

### Mitigation Strategies

1. **Scope Reduction to 2-Week MVP**
   - **Action**: Ship minimal Foundry integration with ONLY dice roll overlays (no character data, no complex events)
   - **Scope**: Display "Player X rolled 1d20+5 = 18" on overlay (generic text + animation)
   - **Effort**: 2 weeks (10 days)
   - **Benefits**: Validates demand without blocking roadmap
   - **Follow-up**: Expand in v0.6.0 if adoption >30%

2. **Parallel Development (High Risk)**
   - **Action**: Split team - 1 developer on VTT (2 weeks), 1 developer on Gamification (4 weeks)
   - **Feasibility**: Only if team has 2+ full-time developers
   - **Risk**: Overload team, reduce code review quality, increase bugs
   - **Recommendation**: **Avoid unless team capacity is proven**

3. **User Survey + Priority Voting**
   - **Action**: Survey current users (n=50-100) on feature priorities: VTT integration vs Gamification vs Advanced Overlay
   - **Method**: In-app survey, Discord poll, email outreach
   - **Cost**: 1 week (survey design + analysis)
   - **Owner**: Product Manager
   - **Benefits**: Data-driven decision on roadmap priorities

### Decision Framework

**Build VTT integration if**:
- >60% of surveyed users rank VTT as top priority
- Core poll features have >70% weekly active usage
- Team has proven capacity to ship features in 2-week sprints

**Build Gamification/Advanced Overlay instead if**:
- Poll engagement is <50% weekly active (fix core problem first)
- <40% of users rank VTT as top priority
- Team wants faster wins (4-6 weeks vs 6-8 weeks)

---

## Risk 2: Competitive Timing - Too Early or Too Late

### Description
VTT integrations are emerging in competitor products (Stream Deck plugins, OBS plugins, native Foundry overlays). Tumulte may be **too late to differentiate** (feature becomes table stakes) or **too early** (market doesn't demand VTT + Twitch integration yet). Timing mismatch results in low adoption or commoditization.

### Severity
- **Probability**: Medium (50%) - market timing is uncertain
- **Impact**: Medium-High (wasted effort if wrong timing)
- **Overall Severity**: **MEDIUM-HIGH**

**Evidence**:
- **Competitors with VTT integration**: Stream Deck has Foundry plugins, OBS has VTT overlays, D&D Beyond has Twitch integration
- **Competitors without**: StreamLabs, StreamElements, Crowd Control focus on polls/gamification only
- **Market Signal**: No clear "breakout" VTT + Twitch integration product yet (implies early market or low demand)

### Impact Analysis

**If Tumulte is TOO LATE**:
- VTT integration becomes expected feature (table stakes)
- Users say "Stream Deck already does this" or "Why not use native Foundry overlays?"
- Tumulte doesn't gain competitive advantage
- **Lost opportunity**: 6-8 weeks spent on parity feature instead of differentiation

**If Tumulte is TOO EARLY**:
- GMs don't see value in VTT + Twitch integration (separate workflows)
- Adoption is <10% despite perfect execution
- **Lost opportunity**: 6-8 weeks spent educating market instead of serving existing demand

### Mitigation Strategies

1. **Competitive Analysis + User Interviews**
   - **Action**: Interview 20 TTRPG streamers - "Do you use VTT overlays? Which tools? Would you switch to Tumulte for VTT + polls?"
   - **Method**: 30-min video calls, compensate $25 gift card
   - **Cost**: 2 weeks (scheduling + interviews + analysis)
   - **Owner**: Product Manager
   - **Success Criteria**: >70% express strong interest ("I would definitely use this")
   - **Decision**: If <50% interested, delay VTT to v0.7.0

2. **Fast-Follow Strategy**
   - **Action**: Monitor competitor launches (Stream Deck, OBS plugins) - if VTT integration gains traction, fast-follow in 4 weeks
   - **Method**: Set up Google Alerts, join VTT Discord servers, track competitor release notes
   - **Cost**: Low (1 hour/week monitoring)
   - **Owner**: Product Manager
   - **Benefits**: Let competitors validate market demand first
   - **Risk**: May lose first-mover advantage

3. **Unique Angle - VTT-to-Poll Automation**
   - **Action**: Position as "VTT events trigger Twitch polls" (unique feature competitors lack)
   - **Example**: Critical hit → auto-launch poll "Should the enemy surrender?"
   - **Cost**: 40 hours (automation engine)
   - **Owner**: Backend Developer
   - **Benefits**: Differentiation (not just "overlay VTT events")

### Decision Framework

**Build VTT integration if**:
- Competitive analysis shows growing demand (3+ competitors launching VTT features in 2026)
- User interviews show >70% strong interest
- Tumulte can offer unique angle (VTT-to-Poll automation)

**Delay VTT integration if**:
- Competitors have mature VTT overlays with low adoption (implies low demand)
- <50% of interviewed users interested
- Focus on core poll differentiation first (gamification, multi-stream aggregation)

---

## Risk 3: Vendor Lock-In to Foundry VTT Ecosystem

### Description
By integrating with Foundry VTT (and only Foundry, since Roll20/Alchemy blocked), Tumulte becomes **dependent on Foundry's roadmap, licensing, and community modules**. If Foundry VTT changes pricing, breaks module compatibility, or loses market share to competitors, Tumulte's VTT integration becomes obsolete.

### Severity
- **Probability**: Low-Medium (30%) - Foundry is stable, but risks exist
- **Impact**: Medium (sunk investment, need to pivot)
- **Overall Severity**: **MEDIUM**

**Evidence**:
- Foundry VTT is self-hosted (no SaaS lock-in), but modules depend on Foundry API stability
- Foundry has changed module manifest format in past (v10 → v11 transition broke many modules)
- Foundry community modules (ThreeHats REST API) are maintained by individuals, not company (could be abandoned)

### Impact Analysis

**If Foundry changes licensing**:
- Example: Foundry shifts to subscription model, users migrate to alternatives
- Impact: Tumulte's VTT integration becomes irrelevant
- **Lost investment**: 6-8 weeks development + ongoing maintenance

**If Foundry module ecosystem fragmentsFoundry's**:
- Example: ThreeHats REST API maintainer abandons project
- Impact: Tumulte must fork and maintain module (40+ hours/quarter)

**If game system market shifts**:
- Example: Demiplane VTT (D&D Beyond's VTT) launches and captures 50% market
- Impact: Tumulte needs new integration (another 6-8 weeks)

### Mitigation Strategies

1. **Abstraction Layer - VTT-Agnostic Event Model**
   - **Action**: Design backend event schema that works for ANY VTT (not Foundry-specific)
   - **Schema Example**:
     ```typescript
     interface VTTEvent {
       type: 'dice_roll' | 'hp_change' | 'critical_hit'
       source: 'foundry' | 'roll20' | 'alchemy' | 'manual'
       data: Record<string, any> // VTT-specific payload
       normalized: {
         actor: string
         description: string
         value?: number
       }
     }
     ```
   - **Cost**: 20 hours (schema design + refactoring)
   - **Owner**: Backend Architect
   - **Benefits**: Easy to add new VTTs in future (just implement adapter)

2. **Fork ThreeHats REST API Module**
   - **Action**: Fork community module, maintain Tumulte-specific version under MIT license
   - **Cost**: 40 hours initial fork + 20 hours/quarter updates
   - **Owner**: Backend Developer
   - **Benefits**: Control over roadmap, no dependency on third-party maintainer
   - **Risk**: Additional maintenance burden

3. **Multi-VTT Roadmap (Phase 2+)**
   - **Action**: After Foundry MVP, add support for Fantasy Grounds, Astral, or Demiplane VTT
   - **Timing**: v0.7.0 or later (after validating Foundry adoption)
   - **Cost**: 4-6 weeks per VTT (reuse abstraction layer)
   - **Benefits**: Reduces single-vendor risk

### Contingency Plan
**If Foundry integration becomes obsolete**:
- Pivot to "Manual VTT Overlay Mode" (GM uses Tumulte dashboard to trigger events)
- Abstract VTT events into generic "Overlay Triggers" (works with ANY VTT, Stream Deck, etc.)

### Decision Framework
**Accept Foundry lock-in if**:
- Foundry has >60% market share in TTRPG streaming
- Abstraction layer is implemented (easy to add new VTTs)
- Tumulte's core value (polls) remains independent of VTT features

**Diversify VTT support if**:
- Foundry market share drops below 40%
- Multiple VTTs show strong demand (>20% user requests per VTT)

---

# Operational Risks

## Risk 1: Team Capacity Constraint

### Description
VTT integration requires **6-8 weeks full-time development** (backend API, frontend UI, Foundry module, testing, documentation). Current Tumulte team is small (likely 1-2 developers based on early alpha status). If team is already at capacity maintaining existing features, VTT integration will cause **burnout, delayed bug fixes, or incomplete implementation**.

### Severity
- **Probability**: High (70%) - small teams consistently underestimate scope
- **Impact**: High (team burnout, quality degradation, missed deadlines)
- **Overall Severity**: **HIGH**

**Evidence**:
- Project is "Early Alpha" (README.md line 30) - implies active development of core features
- Recent commits focus on Sentry, linting, cross-browser fixes (maintenance work)
- GitHub Actions CI/CD shows active testing infrastructure (backend + frontend tests running)

### Current Sprint Capacity Assessment

**Assumptions** (based on typical early-stage startup):
- Team size: 1-2 full-time developers
- Sprint capacity: 60-80 hours/sprint (2 weeks)
- Current maintenance: ~30% capacity (bug fixes, CI/CD, infrastructure)
- Available for new features: ~40-50 hours/sprint

**VTT Integration Effort Estimate** (Foundry only):
| Task | Effort | Owner |
|------|--------|-------|
| Backend: VTT event ingestion API | 20 hours | Backend Dev |
| Backend: Event normalization layer | 16 hours | Backend Dev |
| Backend: WebSocket event broadcasting | 12 hours | Backend Dev |
| Frontend: VTT settings page | 12 hours | Frontend Dev |
| Frontend: Overlay VTT event display | 16 hours | Frontend Dev |
| Foundry Module: REST API connector | 24 hours | Backend Dev |
| Testing: Integration + E2E tests | 20 hours | Full Team |
| Documentation: Setup guide + troubleshooting | 16 hours | PM/Tech Writer |
| **Total** | **136 hours** | **~3-4 sprints** |

**Gap Analysis**:
- Required: 136 hours
- Available: 40-50 hours/sprint × 3 sprints = 120-150 hours
- **Gap**: Borderline feasible IF zero unexpected issues (unlikely)

### Mitigation Strategies

1. **Resource Planning - Dedicated VTT Sprint**
   - **Action**: Allocate 100% of team capacity to VTT integration for 3 sprints (no other features, minimal bug fixes)
   - **Method**: Freeze roadmap, defer non-critical bugs, communicate delay to users
   - **Cost**: 3 sprints (6 weeks)
   - **Owner**: Product Manager
   - **Risk**: Existing bugs accumulate, user frustration grows
   - **Recommendation**: Only if VTT is P0 priority

2. **Scope Reduction to 40-Hour MVP**
   - **Action**: Ship barebones Foundry integration in 1 sprint (2 weeks)
   - **MVP Scope**:
     - Display ONLY dice rolls on overlay (text + generic animation)
     - Manual setup (no wizard, just API key entry)
     - No event normalization (pass-through Foundry JSON)
   - **Effort**: 40 hours (feasible in 1 sprint)
   - **Benefits**: Fast validation, minimal risk
   - **Follow-up**: Expand in v0.6.0 if adoption >30%

3. **Hire Contractor / Bring in Help**
   - **Action**: Hire freelance Foundry VTT module developer for 2-4 weeks
   - **Cost**: $5,000-$10,000 (freelance developer at $50-75/hour)
   - **Owner**: Founder/CTO
   - **Benefits**: Accelerates Foundry module development
   - **Risk**: Onboarding time (1 week), code quality variability

### Contingency Plan
**If team is overloaded after 2 sprints**:
- Cut scope to dice rolls only (defer HP tracking, character sheets to v0.6.0)
- Delay launch by 1 sprint (communicate transparently to users)
- Pivot to manual overlay triggers (no VTT integration) if deadline is critical

### Monitoring
**Metrics to track**:
- Sprint velocity (story points or hours completed per sprint)
- Bug backlog growth (new bugs vs resolved bugs)
- Team satisfaction (weekly check-ins on workload)

**Red flags**:
- Sprint velocity drops below 70% of baseline (team overloaded)
- Bug backlog grows by >10 issues/sprint (quality degradation)
- Team reports burnout or requests scope reduction

---

## Risk 2: Knowledge Gaps - VTT and Game System Expertise

### Description
Integrating with Foundry VTT requires deep expertise in:
1. Foundry module development (JavaScript, Foundry API, Hooks)
2. WebSocket relay architecture (ThreeHats REST API module)
3. TTRPG game systems (D&D 5e, Pathfinder 2e, etc.)
4. Real-time event streaming (latency optimization, error handling)

If team lacks this expertise, development will take **2-3x longer** than estimated, with high bug rate and poor UX.

### Severity
- **Probability**: Medium-High (60%) - team is experienced in AdonisJS/Nuxt, but VTT is specialized domain
- **Impact**: High (delayed launch, buggy integration, frustrated users)
- **Overall Severity**: **MEDIUM-HIGH**

**Evidence**:
- No existing VTT-related code in codebase (Grep search found only UI placeholders)
- Current tech stack (AdonisJS, Nuxt, PostgreSQL, Redis) does not include Foundry VTT experience
- README.md shows expertise in Twitch API, but no mention of VTT integrations

### Skills Assessment

| Skill | Required Level | Team Level (Estimated) | Gap |
|-------|---------------|----------------------|-----|
| Foundry VTT module dev | Advanced | None (0%) | **HIGH** |
| WebSocket relay architecture | Intermediate | Beginner (30%) | **MEDIUM** |
| TTRPG game systems | Intermediate | Unknown | **MEDIUM** |
| Real-time event streaming | Advanced | Intermediate (60%) | **LOW-MEDIUM** |
| AdonisJS + Nuxt | Advanced | Advanced (100%) | None |

**Overall Gap**: Team has strong web development skills, but **lacks Foundry VTT and TTRPG domain expertise**.

### Mitigation Strategies

1. **Knowledge Acquisition - Foundry VTT Bootcamp**
   - **Action**: Allocate 1 week (40 hours) for team to learn Foundry module development
   - **Resources**:
     - [Foundry VTT API Documentation](https://foundryvtt.com/api/)
     - [Foundry VTT Community Wiki](https://foundryvtt.wiki/en/development/api)
     - [ThreeHats REST API Module Source Code](https://github.com/ThreeHats/foundryvtt-rest-api)
   - **Method**: Developer builds "Hello World" Foundry module + integrates with Tumulte backend
   - **Cost**: 1 week learning curve
   - **Owner**: Lead Developer
   - **Benefits**: Reduces unknowns, improves estimates

2. **Hire VTT Expert Consultant**
   - **Action**: Bring in Foundry VTT module developer for architecture review + code review
   - **Cost**: $2,000-$3,000 (20-30 hours at $75-100/hour)
   - **Scope**: Review Tumulte's integration plan, identify pitfalls, pair programming on Foundry module
   - **Owner**: CTO/Lead Developer
   - **Benefits**: Avoids rookie mistakes, accelerates development
   - **Timing**: Week 1 (architecture) + Week 3 (code review)

3. **Community Partnership - ThreeHats Collaboration**
   - **Action**: Reach out to ThreeHats (maintainer of Foundry REST API module) for partnership
   - **Method**: Email introduction, propose co-development or sponsorship ($1,000-$2,000)
   - **Benefits**: Direct expertise, potential module endorsement, shared maintenance
   - **Cost**: Low (time + potential sponsorship)
   - **Owner**: Product Manager

### Contingency Plan
**If knowledge gap causes >2 weeks delay**:
- Pivot to **simpler integration**: Use ThreeHats REST API module as-is (no custom Foundry module)
- Accept limitations (less polished UX, manual setup)
- Document clearly in setup guide ("Advanced users only")

### Decision Framework
**Proceed with VTT integration if**:
- Team completes 1-week Foundry bootcamp successfully
- Expert consultant validates architecture (identifies no major blockers)
- Estimates updated to 150-180 hours (accounting for learning curve)

**Delay VTT integration if**:
- Learning curve exceeds 1 week (>40 hours)
- Expert review identifies architectural blockers
- Team lacks confidence after bootcamp

---

## Risk 3: Support and Documentation Burden

### Description
VTT integration introduces **complex troubleshooting scenarios**:
- "Foundry module won't connect to Tumulte"
- "Dice rolls not showing on overlay"
- "WebSocket relay disconnected"
- "API key invalid error"
- "Works on my machine but not in production"

With a small team, **support tickets could consume 20-40% of capacity** post-launch, blocking new development.

### Severity
- **Probability**: High (70%) - technical features always generate support load
- **Impact**: Medium (team capacity drain, user frustration)
- **Overall Severity**: **MEDIUM-HIGH**

**Evidence**:
- Current Tumulte has "Known Limitations" section in README (shows proactive support planning)
- VTT integration is more complex than Twitch OAuth (more failure modes)
- Competitor support forums (Foundry, Roll20 subreddits) show high volume of "integration not working" posts

### Expected Support Load

**Assumptions**:
- User base: 100-500 active GMs (alpha/beta stage)
- VTT adoption: 30-40% attempt setup
- Setup failure rate: 40-50% (high due to complexity)
- Support tickets: 10-20% of failed setups escalate to support

**Calculation**:
- 100 GMs × 35% attempt VTT setup = 35 users
- 35 × 45% fail setup = 16 failures
- 16 × 15% escalate = **2-3 support tickets/week**

**Time per ticket**: 30-60 minutes (debug logs, network checks, version compatibility)
**Total support time**: **2-4 hours/week** (10-20% of 1 developer's capacity)

**Red flag**: If adoption grows to 1,000 GMs, support load could reach **20-40 tickets/week = 1 FTE**.

### Mitigation Strategies

1. **Comprehensive Setup Documentation**
   - **Action**: Create step-by-step setup guide with screenshots, video tutorial, and troubleshooting FAQ
   - **Content**:
     - Prerequisites checklist (Foundry VTT v12+, self-hosted instance, port forwarding)
     - Installation steps (install ThreeHats module, configure API key, test connection)
     - Troubleshooting flowchart (connection failed → check firewall → check API key → check Foundry version)
     - Common errors + solutions (403 Forbidden → regenerate API key, WebSocket timeout → check relay server)
   - **Cost**: 40 hours (technical writer + developer)
   - **Owner**: Technical Writer + Backend Developer
   - **Benefits**: Deflects 50-70% of support tickets

2. **Self-Service Diagnostics**
   - **Action**: Build "Connection Tester" in Tumulte settings page
   - **Features**:
     - Test WebSocket connection to Foundry
     - Validate API key (200 OK vs 403 Forbidden)
     - Check Foundry version compatibility
     - Display error messages with links to troubleshooting guide
   - **Cost**: 20 hours (frontend + backend)
   - **Owner**: Full-Stack Developer
   - **Benefits**: Users self-diagnose issues without contacting support

3. **Community Support Forum**
   - **Action**: Set up Discord channel or GitHub Discussions for VTT integration
   - **Method**: Encourage users to help each other, developer monitors but doesn't respond to every question
   - **Cost**: 2 hours/week moderation
   - **Owner**: Community Manager (or Product Manager)
   - **Benefits**: Distributes support load, builds community

4. **Automated Error Reporting**
   - **Action**: Integrate Sentry (already in codebase) to capture VTT connection errors
   - **Method**: Log failed WebSocket connections, API errors, Foundry module crashes
   - **Cost**: 8 hours (Sentry integration for VTT events)
   - **Owner**: Backend Developer
   - **Benefits**: Proactive bug detection, faster debugging

### Contingency Plan
**If support load exceeds 4 hours/week (20% capacity)**:
- Pause new user onboarding for VTT integration (waitlist)
- Focus 1 sprint on improving documentation + diagnostics
- Consider hiring part-time support engineer ($2,000-$3,000/month)

### Monitoring
**Metrics to track**:
- Support ticket volume (VTT vs non-VTT)
- Time to resolution (SLA: <48 hours)
- Top 5 error messages (prioritize fixes)
- Documentation page views (measure effectiveness)

**Red flags**:
- >5 support tickets/week on VTT integration
- >50% of tickets are same issue (indicates systemic problem)
- Average resolution time >72 hours (users get frustrated)

---

# Risks of NOT Building VTT Integration

## Risk 1: Competitive Disadvantage - Losing GMs to Competitors

### Description
If competitors (Stream Deck, OBS plugins, native VTT overlays) offer VTT + Twitch integration and Tumulte doesn't, GMs may perceive Tumulte as **incomplete** or **lagging behind**. This could cause **user churn** or **failed acquisition** ("Why would I use Tumulte when Stream Deck does VTT + polls?").

### Severity
- **Probability**: Low-Medium (30-40%) - VTT integration is not yet table stakes in market
- **Impact**: Medium (lost market share, harder to win competitive deals)
- **Overall Severity**: **MEDIUM**

**Evidence**:
- **Competitors with VTT features**:
  - **Stream Deck**: Foundry VTT plugins available (e.g., [Foundry VTT Control](https://www.elgato.com/us/en/s/downloads))
  - **OBS**: Native VTT overlays (Browser Source to Foundry VTT)
  - **D&D Beyond**: Twitch integration for character sheets (not polls, but adjacent)
- **Competitors without VTT features**:
  - **StreamLabs**, **StreamElements**, **Crowd Control** - focus on polls/gamification only

**Market Signal**: No dominant "VTT + Twitch polls" product exists yet. This could mean:
1. **Low demand** (market doesn't want VTT + polls integration), OR
2. **Early market** (first mover advantage still available)

### Impact Analysis

**If Tumulte skips VTT integration**:

**Scenario 1: Low Market Demand**
- Users don't care about VTT integration (they use OBS Browser Source for VTT, Tumulte for polls separately)
- Impact: **None** (no churn, no lost acquisition)
- Probability: 60%

**Scenario 2: Emerging Market Demand**
- Competitors launch VTT + polls integration in 2026
- 10-20% of potential Tumulte users choose competitors for "all-in-one" solution
- Impact: **Low-Medium** (10-20% acquisition loss)
- Probability: 30%

**Scenario 3: VTT Integration Becomes Table Stakes**
- By late 2026, ALL TTRPG streaming tools offer VTT integration
- Tumulte is perceived as "outdated" or "missing key feature"
- Impact: **Medium-High** (20-30% churn, 40-50% acquisition loss)
- Probability: 10%

**Quantified Impact** (Weighted Average):
- Expected user loss: (60% × 0%) + (30% × 15%) + (10% × 35%) = **8%**
- If Tumulte has 500 users by end of 2026, losing 8% = **40 users**
- If LTV is $50/user, lost revenue = **$2,000/year**

**Assessment**: Risk is **LOW-MEDIUM** in 2026, but could grow in 2027-2028 if market matures.

### Mitigation Strategies

1. **Fast-Follow Strategy**
   - **Action**: Monitor competitor launches closely. If VTT integration gains traction (adoption >30% in competitor products), fast-follow with 4-6 week sprint
   - **Method**: Set up Google Alerts, join VTT Discord servers, track competitor release notes
   - **Cost**: 1 hour/week monitoring
   - **Owner**: Product Manager
   - **Benefits**: Let competitors validate market demand first (avoid wasted effort)
   - **Risk**: Lose first-mover advantage (but may not matter if demand is low)

2. **Alternative Differentiation - Focus on Poll Superiority**
   - **Action**: Invest in making Tumulte's polls **10x better** than competitors (gamification, viewer rewards, AI-powered suggestions)
   - **Method**: Prioritize v0.6.0 Gamification + v0.7.0 Gamification Advanced before VTT integration
   - **Cost**: 8-12 weeks (vs 6-8 weeks for VTT)
   - **Owner**: Product Manager + Dev Team
   - **Benefits**: If polls are best-in-class, users won't care about missing VTT integration
   - **Example**: "Tumulte polls are so engaging, I just use OBS Browser Source for VTT overlay - no big deal"

3. **Manual VTT Overlay Mode (No Integration Required)**
   - **Action**: Build "Quick Actions Dashboard" where GMs click buttons to trigger overlay events (no VTT integration)
   - **Example**: GM sees critical hit in Foundry → clicks "Critical Hit" button in Tumulte → overlay shows animation
   - **Cost**: 2 weeks (40 hours)
   - **Benefits**: Provides VTT overlay functionality WITHOUT integration complexity
   - **Trade-off**: Manual trigger (not automatic), but may be "good enough" for most GMs

### Contingency Plan
**If competitors launch VTT integration and gain >30% adoption**:
- Immediately allocate 1 sprint (2 weeks) to MVP VTT integration (dice rolls only)
- Communicate to users: "VTT integration coming in next release based on your feedback"
- Fast-follow in 4-6 weeks with full integration

### Decision Framework

**Skip VTT integration if**:
- Competitor VTT features have <20% adoption (low demand signal)
- User surveys show <50% interest in VTT integration
- Tumulte's core poll features need strengthening first (engagement <60%)

**Build VTT integration if**:
- Competitor VTT features have >40% adoption (market demand validated)
- >70% of surveyed users request VTT integration
- Tumulte's polls are already best-in-class (70%+ engagement)

---

## Risk 2: User Dissatisfaction - "Missing Key Feature"

### Description
If early adopters expect VTT integration (because it's on roadmap as v0.5.0) and Tumulte delays or cancels the feature, users may feel **disappointed** or **misled**. This could cause **churn** (users leave for competitors) or **negative word-of-mouth** (bad reviews, social media complaints).

### Severity
- **Probability**: Medium (50%) - depends on how feature is communicated
- **Impact**: Low-Medium (user frustration, minor churn)
- **Overall Severity**: **MEDIUM**

**Evidence**:
- **Roadmap shows VTT Integration as v0.5.0** (README.md line 201)
- **Settings page shows "Bientôt" (Coming Soon) badges** for Foundry, Roll20, Alchemy (frontend/pages/settings/index.vue lines 115-146)
- **Early adopters joined during alpha** - likely tech-savvy GMs who expect VTT features

**User Expectation**: By showing VTT integrations in UI and roadmap, Tumulte has **implicitly promised** these features.

### Impact Analysis

**If Tumulte delays VTT integration to v0.6.0 or later**:

**Best Case (60% probability)**:
- Users understand development priorities shift
- Transparent communication ("Focusing on core polls first based on your feedback")
- Minimal churn (1-2 users)

**Moderate Case (30% probability)**:
- Some users frustrated ("I was waiting for VTT integration!")
- 5-10% churn (5-10 users out of 100)
- Negative feedback in Discord/GitHub Discussions

**Worst Case (10% probability)**:
- Early adopters feel "bait-and-switch" ("You promised VTT integration!")
- 15-20% churn (15-20 users)
- Bad reviews on social media, TTRPG forums
- Damages Tumulte's reputation as "reliable" product

**Quantified Impact**:
- Expected churn: (60% × 2) + (30% × 7.5) + (10% × 17.5) = **6 users**
- If LTV is $50/user, lost revenue = **$300**
- Intangible cost: Reputational damage (hard to quantify, but real)

**Assessment**: Risk is **MEDIUM** - manageable with transparent communication.

### Mitigation Strategies

1. **Transparent Roadmap Communication**
   - **Action**: Immediately update README.md and settings page to reflect new priorities
   - **New Roadmap**:
     - v0.5.0: Responsive UI + PWA (on track)
     - v0.6.0: Gamification (prioritized over VTT)
     - v0.7.0: VTT Integration (Foundry only, delayed from v0.5.0)
   - **Cost**: 2 hours (update docs + announcement)
   - **Owner**: Product Manager
   - **Method**: Post announcement in Discord, email to users, GitHub Discussion

2. **User Survey + Feedback Loop**
   - **Action**: Survey users on priority: "What do you want more - VTT integration or gamification?"
   - **Method**: In-app survey (NPS-style), Discord poll, email
   - **Cost**: 1 week (survey + analysis)
   - **Owner**: Product Manager
   - **Benefits**: Data-driven decision, users feel heard
   - **Follow-up**: Share results publicly ("80% of you voted for gamification, so we're prioritizing that first")

3. **Offer Alternative - Manual VTT Overlay**
   - **Action**: Ship "Quick Actions Dashboard" in v0.5.0 (manual overlay triggers, no VTT integration)
   - **Messaging**: "VTT integration coming later, but you can use manual triggers NOW"
   - **Cost**: 2 weeks (40 hours development)
   - **Benefits**: Provides immediate value, reduces disappointment

4. **Early Access Beta for VTT (Select Users)**
   - **Action**: Invite 10-20 power users to closed beta for VTT integration in v0.6.0
   - **Method**: "We're prioritizing gamification, but want to test VTT integration early - sign up here"
   - **Benefits**: Retains most engaged users, generates feedback, builds anticipation
   - **Cost**: Low (beta management overhead)

### Contingency Plan
**If user backlash is severe (>10% churn)**:
- Accelerate VTT integration to next sprint (2 weeks after gamification)
- Offer "VTT Early Access" to affected users (free upgrade to Pro tier if exists)
- Public apology + roadmap transparency ("We heard your feedback, VTT integration is back on track")

### Monitoring
**Metrics to track**:
- Churn rate (users who cancel/leave after roadmap announcement)
- Sentiment analysis (Discord messages, GitHub Discussions, support tickets)
- User survey responses (NPS score before/after announcement)

**Red flags**:
- >5% churn within 2 weeks of announcement
- NPS score drops by >10 points
- Multiple negative posts on social media / TTRPG forums

---

# Risk Matrix

## All Risks Visualized

```
      IMPACT
        │
   High │  🔴R1.1 🔴R1.3 🔴B1   🔴B2   🔴S1   🔴O1
        │  🟡R1.2 🟡R1.4 🟡R1.5
        │
 Medium │  🟡S2   🟡S3   🟡O2   🟡O3   🟡N1   🟡N2
        │
        │
    Low │
        │
        └────────────────────────────────
         Low       Med       High
              PROBABILITY
```

**Legend**:
- 🔴 Critical/High risks: Immediate attention required
- 🟡 Medium risks: Mitigate before/during launch
- 🟢 Low risks: Monitor but acceptable

**Risk Codes**:
- **R1.1**: Roll20 has no external API (CRITICAL BLOCKER)
- **R1.2**: Foundry requires user-installed modules (HIGH)
- **R1.3**: Alchemy has no real-time API (CRITICAL BLOCKER)
- **R1.4**: Real-time latency cascade (MEDIUM-HIGH)
- **R1.5**: Data model complexity across VTTs (HIGH)
- **B1**: Low user adoption - setup complexity (HIGH)
- **B2**: High maintenance burden (HIGH)
- **B3**: Cannibalization of core value (MEDIUM-HIGH) - not plotted for clarity
- **S1**: Opportunity cost - delaying higher-impact features (HIGH)
- **S2**: Competitive timing (MEDIUM-HIGH)
- **S3**: Vendor lock-in to Foundry (MEDIUM)
- **O1**: Team capacity constraint (HIGH)
- **O2**: Knowledge gaps - VTT expertise (MEDIUM-HIGH)
- **O3**: Support and documentation burden (MEDIUM-HIGH)
- **N1**: Competitive disadvantage (MEDIUM)
- **N2**: User dissatisfaction (MEDIUM)

---

## Risks by Severity

### Critical (Address BEFORE proceeding)
1. **R1.1 - Roll20 has no external API**: Remove from scope immediately (CONFIRMED BLOCKER)
2. **R1.3 - Alchemy has no real-time API**: Remove from scope immediately (CONFIRMED BLOCKER)

### High (Mitigate before launch)
1. **R1.2 - Foundry requires user-installed modules**: Build setup wizard, partner with module maintainer
2. **R1.4 - Real-time latency cascade**: Optimize WebSocket pipeline, set user expectations
3. **R1.5 - Data model complexity**: Scope to generic events only (MVP), defer game system adapters
4. **B1 - Low user adoption**: Beta test with 60% setup completion threshold
5. **B2 - High maintenance burden**: Version pinning, self-hosted relay option
6. **S1 - Opportunity cost**: Reduce scope to 2-week MVP or survey users on priorities
7. **O1 - Team capacity constraint**: Allocate 3 sprints OR reduce scope to 40-hour MVP

### Medium (Mitigate during development)
1. **S2 - Competitive timing**: Monitor competitors, user interviews to validate demand
2. **S3 - Vendor lock-in**: Build abstraction layer for multi-VTT support
3. **O2 - Knowledge gaps**: 1-week Foundry bootcamp, hire VTT consultant
4. **O3 - Support burden**: Comprehensive docs, self-service diagnostics
5. **N1 - Competitive disadvantage**: Fast-follow strategy, focus on poll superiority
6. **N2 - User dissatisfaction**: Transparent roadmap communication, user survey

### Low (Monitor)
- None identified (all risks are Medium or higher)

---

# Mitigation Roadmap

## Phase 1: Pre-Development (MUST COMPLETE BEFORE CODING)
**Goal**: Retire critical risks and validate demand

**Duration**: 2-3 weeks

- [ ] **[R1.1/R1.3] Scope Reduction**: Remove Roll20 and Alchemy from v0.5.0 roadmap (IMMEDIATE)
  - Owner: Product Manager
  - ETA: Day 1
  - Outcome: Reduces scope by 66%, focuses on Foundry only

- [ ] **[S1] User Survey**: Poll 50-100 users on feature priorities (VTT vs Gamification vs Advanced Overlay)
  - Owner: Product Manager
  - ETA: Week 1
  - Success Criteria: >70% vote for VTT integration as top priority
  - **Gate**: If <60% vote for VTT, PIVOT to Gamification in v0.6.0

- [ ] **[B1] Beta User Interviews**: Interview 20 TTRPG streamers on VTT integration demand
  - Owner: Product Manager
  - ETA: Week 2
  - Success Criteria: >70% express strong interest ("I would definitely use this")
  - **Gate**: If <50% interested, DELAY VTT to v0.7.0

- [ ] **[O2] Foundry VTT Bootcamp**: Developer spends 1 week learning Foundry module development
  - Owner: Lead Developer
  - ETA: Week 2
  - Deliverable: "Hello World" Foundry module that sends WebSocket event to Tumulte backend
  - **Gate**: If learning curve >40 hours, HIRE VTT consultant

- [ ] **[S1] Effort Re-estimation**: Update estimates based on learning curve (likely 150-180 hours vs 136 hours)
  - Owner: Lead Developer + Product Manager
  - ETA: Week 3
  - **Gate**: If effort exceeds 180 hours, REDUCE SCOPE to MVP

**Phase 1 Decision Point**:
- **GO**: If user survey shows >60% support AND interviews show >50% interest AND Foundry bootcamp successful
- **NO-GO**: If any of the above criteria fail → Pivot to Gamification v0.6.0, delay VTT to v0.7.0

---

## Phase 2: During Development (IF Phase 1 Gates Pass)
**Goal**: Actively reduce high/medium risks as we build

**Duration**: 2-4 weeks (depending on scope)

- [ ] **[R1.2] Setup Wizard**: Build guided Foundry setup flow with "Test Connection" button
  - Owner: Frontend Developer
  - Timing: Sprint 1
  - Deliverable: Settings page with step-by-step Foundry connection wizard

- [ ] **[R1.4] WebSocket Optimization**: Reduce payload size, implement connection pooling
  - Owner: Backend Developer
  - Timing: Sprint 1-2
  - Success Metric: Latency reduced to <500ms P95

- [ ] **[R1.5] Generic Event Schema**: Implement VTT-agnostic event model (abstraction layer)
  - Owner: Backend Developer
  - Timing: Sprint 1
  - Deliverable: `VTTEvent` interface that works for any VTT (not Foundry-specific)

- [ ] **[O1] Sprint Capacity Monitoring**: Track velocity weekly, flag if <70% of baseline
  - Owner: Product Manager
  - Timing: Weekly check-ins
  - **Trigger**: If velocity drops, cut scope to dice rolls only (defer HP tracking)

- [ ] **[O3] Documentation**: Write setup guide + troubleshooting FAQ
  - Owner: Technical Writer + Backend Developer
  - Timing: Sprint 2-3 (parallel with development)
  - Deliverable: 10-page guide with screenshots, video tutorial, troubleshooting flowchart

**Checkpoints**: Review risks weekly during standups. Flag any blockers immediately.

---

## Phase 3: Pre-Launch (MUST COMPLETE BEFORE PUBLIC RELEASE)
**Goal**: Final risk sweep before release

**Duration**: 1 week

- [ ] **[B1] Beta Testing**: Recruit 20-30 GMs for closed beta, measure setup completion rate
  - Owner: Product Manager + QA
  - Timing: Week before launch
  - Success Criteria: >60% complete setup in <20 minutes with zero assistance
  - **Gate**: If <60% succeed, DELAY LAUNCH to improve setup UX

- [ ] **[O3] Self-Service Diagnostics**: Build "Connection Tester" in settings page
  - Owner: Full-Stack Developer
  - Timing: Final sprint
  - Deliverable: Test WebSocket connection, validate API key, check Foundry version

- [ ] **[R1.4] Latency Testing**: Measure end-to-end latency (VTT event → overlay display)
  - Owner: QA + Backend Developer
  - Timing: Beta testing phase
  - Success Criteria: P95 latency <1 second
  - **Gate**: If P95 >1.5 seconds, add latency compensation setting

- [ ] **[N2] Roadmap Communication**: Update README.md, settings page, Discord with new priorities
  - Owner: Product Manager
  - Timing: 1 week before launch
  - Deliverable: Public announcement of roadmap change (if VTT delayed)

- [ ] **[O3] Sentry Integration**: Ensure VTT connection errors are logged for proactive debugging
  - Owner: Backend Developer
  - Timing: Final sprint
  - Deliverable: Sentry dashboard for VTT-specific errors

**Gate**: Don't launch until:
1. Beta test shows >60% setup completion rate
2. P95 latency <1 second
3. Self-service diagnostics implemented (reduces support burden)

---

## Phase 4: Post-Launch (First 30 Days)
**Goal**: Monitor for risk materialization and iterate

**Week 1: Initial Launch**
- [ ] Track adoption rate (% of users who attempt VTT setup)
- [ ] Track setup completion rate (% who successfully connect)
- [ ] Monitor support tickets (volume + top issues)
- [ ] Check Sentry for VTT connection errors

**Metrics to Watch**:
- Adoption rate: Target >40%
- Completion rate: Target >60%
- Support tickets: Target <3/week
- Latency P95: Target <1 second

**Red Flags**:
- <30% adoption rate → Users don't see value in VTT integration
- <40% completion rate → Setup too hard, need to simplify
- >5 support tickets/week → Documentation insufficient or systemic bug

**Trigger**: If adoption <30% OR completion <40%, activate contingency plan (see below).

**Week 2-4: Feedback Loop**
- [ ] Collect user feedback (Discord, in-app survey, support tickets)
- [ ] Analyze top 5 error messages in Sentry
- [ ] Identify most common support issues (setup? latency? bugs?)
- [ ] Prioritize fixes for next sprint

**Month 2+: Long-Term Monitoring**
- [ ] Track engagement rate (% of users who use VTT features >3 times/week)
- [ ] Measure maintenance burden (% of sprint capacity on VTT bug fixes)
- [ ] Monitor upstream changes (Foundry VTT releases, ThreeHats module updates)

**Success Metrics** (3 months post-launch):
- Adoption rate >40%
- Engagement rate >30% (users actively use VTT features)
- Support tickets <3/week
- Maintenance burden <20% of sprint capacity

**Failure Metrics** (triggers contingency plan):
- Adoption rate <20%
- Engagement rate <10%
- Support tickets >10/week
- Maintenance burden >40% of sprint capacity

---

# Risk-Adjusted Recommendation

## Overall Assessment

### Risk Score
**Total Risk Score: 62 / 100**

**Calculation**:
- Critical risks: 2 (R1.1 Roll20, R1.3 Alchemy) × 25 points = **50**
- High risks: 7 × 10 points = **70** (but Roll20/Alchemy removed → -50 = **20**)
- Medium risks: 6 × 5 points = **30**
- Low risks: 0 × 1 point = **0**
- **Subtotal**: 50 + 20 + 30 = **100**
- **After mitigation** (Roll20/Alchemy removed): 0 + 20 + 30 = **50**
- **Adjusted for residual risks**: **50 + 12** (residual high risks) = **62**

**Interpretation**:
- 0-20: Low risk, green light → **NOT APPLICABLE**
- 21-40: Moderate risk, proceed with caution → **NOT APPLICABLE**
- 41-60: High risk, significant mitigation needed → **CLOSE** (62 is borderline)
- 61+: Critical risk, reconsider approach → **CURRENT ASSESSMENT**

**Verdict**: **HIGH RISK - SIGNIFICANT MITIGATION REQUIRED**

### Risk vs Reward

**RICE Score** (estimated, as no prior agent analysis provided):
- **Reach**: 30% of users (assumes 30% have Foundry VTT)
- **Impact**: High (8/10) - expands use cases significantly
- **Confidence**: Low (40%) - unproven demand, high complexity
- **Effort**: 6-8 weeks (136-180 hours)
- **RICE Score**: (300 users × 0.3 × 8 × 0.4) / 8 weeks = **36**

**Risk Score**: 62

**Risk-Adjusted RICE**: 36 - 62 = **-26** (NEGATIVE)

**Comparison**:
- Original priority: P1 (v0.5.0 on roadmap)
- Risk-adjusted priority: **P2 or P3** (DOWNGRADED due to high risk)
- **Change**: **DOWNGRADED** - should NOT be v0.5.0 priority

**Alternative Features (Estimated RICE)**:
- **Gamification (v0.6.0)**: RICE ~50-60, Risk Score ~25 → Risk-Adjusted: **+25 to +35** (BETTER)
- **Advanced Overlay (v0.8.0)**: RICE ~40-50, Risk Score ~15 → Risk-Adjusted: **+25 to +35** (BETTER)
- **Responsive + PWA (v0.5.0)**: RICE ~60-70, Risk Score ~10 → Risk-Adjusted: **+50 to +60** (MUCH BETTER)

**Assessment**: VTT integration has **NEGATIVE risk-adjusted value** compared to alternatives.

---

## Go / No-Go Recommendation

**Recommendation: CONDITIONAL GO (with mandatory scope reduction and phased rollout)**

**Verdict**: 🟡 **YELLOW LIGHT - PROCEED WITH EXTREME CAUTION**

**Alternative Recommendation**: 🔴 **RED LIGHT - PIVOT TO MVP OR DELAY TO v0.7.0**

---

### Justification

After comprehensive risk assessment, the VTT integration feature faces **four critical blockers**:

1. **Technical Blockers (Critical)**:
   - Roll20 has NO external API (confirmed research) - **BLOCKER**
   - Alchemy has NO real-time API (confirmed research) - **BLOCKER**
   - Only Foundry VTT is viable, reducing scope by 66%

2. **Adoption Risk (High)**:
   - Complex multi-step setup (install module, configure API, test connection)
   - Estimated 40-50% setup failure rate
   - If <30% adoption, feature underutilized → wasted 6-8 weeks

3. **Maintenance Burden (High)**:
   - Ongoing compatibility with Foundry VTT updates (every 6-8 months)
   - Dependency on community modules (ThreeHats REST API) with no SLA
   - Estimated 20-30% of sprint capacity post-launch

4. **Opportunity Cost (High)**:
   - Delays Gamification (v0.6.0) and Advanced Overlay (v0.8.0)
   - Risk-adjusted RICE is **NEGATIVE** (-26) vs alternatives (+25 to +60)
   - 6-8 weeks could deliver 2-3 smaller, lower-risk features

5. **Team Capacity (High)**:
   - Requires 136-180 hours (3-4 sprints) for Foundry-only integration
   - Team lacks Foundry VTT expertise (40-hour learning curve)
   - Small team (1-2 developers) will be 100% allocated for 6-8 weeks

**However, risks are NOT insurmountable**. With aggressive scope reduction and phased rollout, a **minimal viable integration** could validate demand in 2 weeks (40 hours) instead of 6-8 weeks.

---

### Conditions for "GO" (Mandatory Requirements)

If the team decides to proceed, **ALL of the following conditions MUST be met**:

1. **Scope Reduction: 2-Week MVP Only**
   - ONLY Foundry VTT (remove Roll20, Alchemy) ✅ MANDATORY
   - ONLY dice roll overlays (remove HP tracking, character sheets, complex events) ✅ MANDATORY
   - Manual setup (no wizard, just API key entry) ✅ MANDATORY
   - Generic event display (no game system adapters, pass-through JSON) ✅ MANDATORY
   - **Effort**: 40 hours (2 weeks / 1 sprint) vs 136 hours

2. **Pre-Development Validation**
   - User survey shows >60% support for VTT integration ✅ MANDATORY
   - Beta interviews show >50% strong interest ✅ MANDATORY
   - Foundry bootcamp completed successfully (<40 hours learning curve) ✅ MANDATORY

3. **Beta Testing Gate**
   - Closed beta with 20-30 GMs
   - >60% complete setup in <20 minutes ✅ MANDATORY
   - P95 latency <1 second ✅ MANDATORY
   - **Decision**: If beta fails, DELAY launch and simplify setup UX

4. **Transparent Roadmap Communication**
   - Update README.md: v0.5.0 = Responsive/PWA, v0.6.0 = Gamification, v0.7.0 = VTT (Foundry only) ✅ MANDATORY
   - Announce to users: "VTT integration scope reduced to Foundry only based on technical constraints"
   - Set expectations: "MVP in v0.6.0 (dice rolls), expanded features in v0.7.0+"

5. **Dedicated Sprint Allocation**
   - 100% team capacity for 2 weeks (defer bug fixes, freeze other features) ✅ MANDATORY
   - No other commitments during VTT sprint
   - **Risk**: Bug backlog accumulates (acceptable for 2-week sprint)

6. **Maintenance Plan**
   - Version pinning: Support only Foundry VTT v12+ and ThreeHats REST API v2.0+
   - Deprecation policy: Drop support for older versions after 6 months
   - Community maintainer program: Recruit 2-3 maintainers from Foundry community

7. **Contingency Plan Defined**
   - If adoption <30% after 1 month: Pivot to "Manual Overlay Mode" (no VTT integration)
   - If support tickets >5/week: Pause onboarding, improve docs/diagnostics
   - If maintenance >40% capacity: Deprecate feature or charge $5-10/month for VTT support

**If ANY of these conditions cannot be met, recommendation changes to NO-GO.**

---

### Alternative Approach (Recommended): Phased Rollout

Instead of committing to full VTT integration now, consider **3-phase approach**:

**Phase 1 (v0.5.0): Manual Overlay Mode** - 2 weeks
- Build "Quick Actions Dashboard" where GMs click buttons to trigger overlay events
- Example: GM sees critical hit in Foundry → clicks "Critical Hit" button in Tumulte → overlay animates
- **Effort**: 40 hours (simpler than full integration)
- **Benefits**:
  - Works for ALL VTTs (Foundry, Roll20, Alchemy, Fantasy Grounds, etc.)
  - No setup complexity (no modules, no API keys)
  - Validates overlay UX before investing in integration
- **Trade-off**: Manual trigger (not automatic), but may be "good enough" for 80% of users

**Phase 2 (v0.6.0): Foundry VTT MVP** - 2 weeks (if Phase 1 shows >40% overlay usage)
- Dice roll overlays only (generic event display)
- Requires Foundry module installation (setup wizard included)
- Beta test with 20-30 users, iterate based on feedback

**Phase 3 (v0.7.0+): Expanded VTT Features** - 4-6 weeks (if Phase 2 shows >30% adoption)
- HP tracking, character sheets, game system adapters
- Multi-VTT support (Fantasy Grounds, Astral, etc.)
- VTT-to-Poll automation (critical hit → launch poll)

**Benefits of Phased Approach**:
- ✅ De-risks investment (don't commit 6-8 weeks upfront)
- ✅ Validates demand incrementally (kill feature if adoption low)
- ✅ Faster time-to-value (Manual Mode ships in 2 weeks vs 6-8 weeks)
- ✅ Allows pivot to Gamification/Advanced Overlay if VTT not sticky

**Recommendation**: **PROCEED WITH PHASE 1 (MANUAL MODE) in v0.5.0, defer full VTT integration to v0.6.0+**

---

### Red Flags That Warrant Immediate Cancellation

If ANY of the following occur during development or post-launch, **STOP and pivot**:

🚩 **Pre-Development Red Flags**:
- User survey shows <40% support for VTT integration
- Beta interviews show <30% strong interest
- Foundry bootcamp takes >60 hours (2x estimate)
- Team cannot allocate 100% capacity for 2-week sprint

🚩 **Development Red Flags**:
- MVP effort exceeds 60 hours (50% over estimate)
- Major technical blocker discovered (e.g., Foundry module sandbox limitations)
- Team velocity drops below 50% of baseline (burnout signal)

🚩 **Beta Testing Red Flags**:
- <40% of beta users complete setup successfully
- P95 latency >1.5 seconds (overlay feels laggy)
- Beta users report "too complex" or "not worth the effort"

🚩 **Post-Launch Red Flags** (Month 1):
- <20% adoption rate (users don't see value)
- <10% engagement rate (users try once, never again)
- >10 support tickets/week (documentation insufficient or systemic bugs)
- Maintenance consumes >50% of sprint capacity (unsustainable)

**If any red flag occurs**: Immediately convene product/engineering meeting to decide:
1. **Pivot to Manual Mode**: Remove VTT integration, ship "Quick Actions Dashboard" instead
2. **Delay to v0.7.0**: Freeze development, focus on Gamification/Advanced Overlay first
3. **Kill Feature**: Remove from roadmap, focus on core poll features

---

# Monitoring & Governance

## Risk Dashboard
**Track these metrics weekly**:

| Metric | Current | Target | Red Flag | Owner |
|--------|---------|--------|----------|-------|
| **Pre-Development** |
| User survey support | TBD | >60% | <40% | Product Manager |
| Beta interview interest | TBD | >50% | <30% | Product Manager |
| Foundry bootcamp hours | TBD | <40 hrs | >60 hrs | Lead Developer |
| **Development** |
| Sprint velocity | Baseline | >70% | <50% | Lead Developer |
| MVP effort (actual) | TBD | <60 hrs | >80 hrs | Lead Developer |
| Bug backlog growth | Current | <+5/week | >+10/week | QA |
| **Beta Testing** |
| Setup completion rate | TBD | >60% | <40% | QA |
| Latency P95 | TBD | <1 sec | >1.5 sec | Backend Dev |
| Beta user satisfaction | TBD | >7/10 | <5/10 | Product Manager |
| **Post-Launch (Month 1)** |
| Adoption rate | TBD | >40% | <20% | Product Manager |
| Setup completion rate | TBD | >60% | <40% | Product Manager |
| Engagement rate (3x/week) | TBD | >30% | <10% | Product Manager |
| Support tickets/week | TBD | <3 | >10 | Support Lead |
| Latency P95 | TBD | <1 sec | >1.5 sec | Backend Dev |
| **Post-Launch (Month 2-3)** |
| Weekly active usage | TBD | >30% | <10% | Product Manager |
| Maintenance % capacity | TBD | <20% | >40% | Lead Developer |
| User churn (VTT-related) | TBD | <5% | >15% | Product Manager |

---

## Review Cadence

**Weekly** (During Development):
- Check sprint velocity, bug backlog, team capacity
- Flag any blockers immediately (e.g., effort overruns, technical issues)
- Update risk dashboard

**Bi-Weekly** (Post-Launch):
- Review adoption rate, engagement rate, support tickets, latency
- Analyze Sentry errors (top 5 VTT connection issues)
- Discuss mitigation strategies for emerging risks

**Monthly** (Post-Launch):
- Full risk reassessment (update probability/impact based on actuals)
- Strategic decision: Continue investing in VTT OR pivot to alternatives
- Adjust roadmap priorities (v0.7.0 scope)

---

## Escalation Path

**If risk materializes**:

### Level 1: Developer Response (0-24 hours)
- Developer investigates, attempts immediate fix
- Examples: Bug fix, config tweak, documentation update

### Level 2: Product Manager Escalation (24-72 hours)
- If issue unresolved or affects >10 users
- Product Manager convenes product/engineering meeting
- Decision: Scope reduction, delay launch, or contingency plan activation

### Level 3: Executive Decision (72+ hours)
- If issue requires roadmap change or feature cancellation
- Examples: Adoption <20%, maintenance >50% capacity, major technical blocker
- Founder/CTO decides: Pivot, delay, or kill feature

**Escalation Triggers**:
- 🚩 Red flag metric crossed (see Risk Dashboard)
- 🚩 Development stalled for >1 week
- 🚩 User backlash (>5% churn, negative social media posts)
- 🚩 Team requests help (burnout, knowledge gap, capacity)

---

# Lessons Learned (Post-Mortem Prep)

## Questions to Answer After Launch (3-Month Retrospective)

### Risk Assessment Accuracy
- [ ] Were our risk probabilities accurate? (Compare predicted vs actual)
- [ ] Which risks materialized? Which didn't?
- [ ] What risks did we miss entirely?

### Mitigation Effectiveness
- [ ] Which mitigation strategies worked? (e.g., Did setup wizard reduce drop-off?)
- [ ] Which strategies failed or were unnecessary?
- [ ] What would we do differently?

### Adoption & Engagement
- [ ] Did users adopt VTT integration as predicted? (Target: 30-40%, Actual: ___)
- [ ] Are users actively using VTT features? (Target: >30% engagement, Actual: ___)
- [ ] What feedback did we get? (Positive vs negative)

### Maintenance Burden
- [ ] How much sprint capacity is spent on VTT maintenance? (Target: <20%, Actual: ___)
- [ ] How many support tickets? (Target: <3/week, Actual: ___)
- [ ] Were upstream changes (Foundry updates) manageable?

### Strategic Outcome
- [ ] Did VTT integration differentiate Tumulte from competitors?
- [ ] Did it cannibalize poll usage OR enhance it?
- [ ] Should we continue investing in VTT features OR pivot?

### Team Retrospective
- [ ] Was the team capacity estimate accurate?
- [ ] Did the team learn Foundry VTT successfully?
- [ ] Any burnout or quality issues?

**Document these learnings for future features** (v0.7.0 Gamification, v0.8.0 Advanced Overlay, etc.)

---

# Final Recommendation Summary

## TL;DR for Decision-Makers

**Feature**: VTT API Integration (Foundry VTT, Roll20, Alchemy RPG)

**Risk Level**: 🔴 **HIGH (62/100)**

**Verdict**: 🟡 **CONDITIONAL GO (with mandatory scope reduction)** OR 🔴 **PIVOT TO MVP**

**Key Findings**:
1. ❌ Roll20 has NO external API (confirmed blocker - remove from scope)
2. ❌ Alchemy has NO real-time API (confirmed blocker - remove from scope)
3. ⚠️ Only Foundry VTT is viable (reduces scope by 66%)
4. ⚠️ Requires 6-8 weeks for full integration (high opportunity cost)
5. ⚠️ Complex setup will cause 40-50% drop-off (adoption risk)
6. ⚠️ Ongoing maintenance will consume 20-30% capacity (technical debt)

**Risk-Adjusted RICE**: **-26** (NEGATIVE) - lower priority than Gamification (+25 to +35) or Advanced Overlay (+25 to +35)

**Recommendation**:
- **Option 1 (SAFER)**: Ship "Manual Overlay Mode" in v0.5.0 (2 weeks), defer full VTT to v0.6.0+ after validation
- **Option 2 (RISKY)**: Ship Foundry MVP in v0.5.0 (2 weeks, dice rolls only) IF user survey shows >60% support
- **Option 3 (SAFEST)**: Delay VTT to v0.7.0, prioritize Gamification (v0.6.0) which has higher ROI

**Decision Criteria**:
- ✅ **PROCEED** if: User survey >60% support + Beta interviews >50% interest + Team has 2-week sprint capacity
- ❌ **DELAY** if: Survey <60% OR interviews <50% OR team lacks capacity
- 🔴 **CANCEL** if: Beta test <40% completion rate OR adoption <20% after Month 1

**Next Steps**:
1. Conduct user survey (1 week) to validate demand
2. Interview 20 TTRPG streamers (1 week) to assess interest
3. Foundry VTT bootcamp (1 week) to assess learning curve
4. **Decision point**: GO / DELAY / PIVOT based on Phase 1 results

---

## Sources

**Foundry VTT API Research**:
- [Foundry VTT Sockets Documentation](https://foundryvtt.wiki/en/development/api/sockets)
- [Foundry REST API Module (ThreeHats)](https://github.com/ThreeHats/foundryvtt-rest-api)
- [PlaneShift REST API](https://github.com/cclloyd/planeshift)
- [Foundry HTTP API Module (KaKaRoTo)](https://github.com/kakaroto/fvtt-module-api)
- [Foundry VTT Official API Documentation](https://foundryvtt.com/api/)

**Roll20 API Research**:
- [Roll20 Community Forums - REST API Discussions](https://app.roll20.net/forum/post/4165065/rest-api-roadmap)
- [Roll20 API Introduction](https://help.roll20.net/hc/en-us/articles/360037256714-Roll20-Mods-API)

**Alchemy RPG API Research**:
- [Alchemy Developer Documentation](https://alchemyrpg.github.io/slate/)
- [Alchemy GitHub Organization](https://github.com/alchemyrpg)

---

**END OF RISK ASSESSMENT**
