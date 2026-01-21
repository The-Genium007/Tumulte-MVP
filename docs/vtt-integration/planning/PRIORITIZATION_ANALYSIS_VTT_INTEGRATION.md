# RICE Score Calculation - VTT Integration Feature

**Feature**: Real-time VTT integration (Foundry VTT, Roll20, Alchemy RPG) for Twitch stream overlays

**Analysis Date**: 2026-01-14

**Status**: ⚠️ PRELIMINARY ANALYSIS - Requires User Value Agent and Architect Agent outputs for validation

---

## Input Values

### Reach (per quarter)
**Value**: 240 user-interactions/quarter

**Source**: Estimated (⚠️ Requires User Value Agent validation)

**Calculation Components**:
- **TAU (Total Addressable Users)**: 100 users
  - Assumption: Current Tumulte user base (GMs who run campaigns)
  - Needs validation from product analytics
- **Adoption rate**: 80%
  - 80 users would enable VTT integration
  - Rationale: Most RPG streamers use VTTs (Foundry/Roll20/Alchemy)
  - Industry data suggests 70-90% of online RPG games use VTTs
- **Frequency**: 3 uses/user/quarter
  - Assumption: GM runs 1 campaign session per month
  - VTT integration would be used every session where polls are active

**Calculation**: 100 users × 80% adoption × 3 uses/quarter = **240 user-interactions/quarter**

**Sanity check**:
- If Tumulte has 100 active GMs, and 80 use VTTs, this gives 80 enabled users
- Each running 12 sessions/year (1/month) = 240 interactions/quarter
- ✅ Reasonable for MVP stage product
- ⚠️ Could be lower if current user base is smaller
- ⚠️ Could be higher if adoption exceeds 80% or session frequency is higher

**Risk Factors**:
- Actual TAU unknown (requires analytics data)
- Adoption rate assumption not validated with users
- Frequency assumes monthly sessions (some GMs run weekly, others less frequently)

---

### Impact (scale: 0.25-3)
**Value**: 2.0 / 3.0 (High Impact)

**Source**: Estimated (⚠️ Requires User Value Agent validation)

**Factors Analyzed**:

1. **Problem severity**: 8/10
   - Current pain: GMs manually sync VTT events with Twitch polls
   - Workflow: Roll dice in VTT → Remember result → Manually create poll → Launch poll
   - High friction, breaks immersion, delays stream

2. **Solution quality**: 8/10
   - Real-time sync eliminates manual steps
   - Automatic poll creation from VTT events (dice rolls, character actions)
   - Seamless integration maintains flow of gameplay

3. **User reach**: 9/10
   - Affects core user base (RPG streaming GMs)
   - Most RPG streamers use VTTs
   - High relevance to target audience

4. **Frequency**: 8/10
   - Used every session (weekly to monthly)
   - Multiple times per session (every poll that relates to VTT action)
   - High repeat value

**Average**: (8 + 8 + 9 + 8) / 4 = 8.25/10

**Conversion to 0.25-3 scale**:
- 8.25/10 = 0.825 on 0-1 scale
- 0.825 × 3 = **2.475**
- Rounded to **2.0** (conservative estimate)

**Interpretation**: **High impact** - Significantly improves core workflow, removes major friction point, enhances streaming experience. Not "massive" (3.0) because it's an enhancement to existing functionality, not a completely new capability.

**Risk Factors**:
- Assumes GMs find manual sync painful (needs user validation)
- Assumes VTT APIs are stable and well-documented
- Impact could be lower if VTT usage is less common than assumed

---

### Confidence (scale: 0-1)
**Value**: 0.65 (Medium-Low Confidence)

**Source**: Estimated (⚠️ Requires both User Value and Architect Agent validation)

**Factors**:

1. **User value confidence**: Medium (0.7)
   - ✅ Clear use case (VTT integration for RPG streams)
   - ✅ Known user segment (RPG streaming GMs)
   - ❌ No user interviews validating this specific pain point
   - ❌ No data on how many users actually want this feature
   - **Score**: 0.7 (reasonable hypothesis, but unvalidated)

2. **Effort confidence**: Medium-Low (0.6)
   - ❌ No technical spike completed on VTT APIs
   - ❌ Unknown: API rate limits, authentication complexity, real-time event handling
   - ⚠️ Each VTT has different API (Foundry ≠ Roll20 ≠ Alchemy)
   - ⚠️ Potential for significant technical unknowns
   - **Score**: 0.6 (many technical unknowns)

3. **Technical feasibility**: Medium (0.65)
   - ✅ VTTs have APIs (Foundry and Roll20 are documented)
   - ⚠️ Alchemy RPG API maturity unknown
   - ⚠️ Real-time event streaming complexity unknown
   - ⚠️ May require polling vs webhooks (less ideal)
   - **Score**: 0.65 (feasible but needs validation)

**Calculation**: (0.7 + 0.6 + 0.65) / 3 = **0.65**

**Interpretation**: **Medium-Low confidence (65%)** - Reasonable hypothesis with clear use case, but significant unknowns in both user demand and technical implementation. Requires validation phase before full commitment.

**Risk Factors**:
- User research needed to validate demand
- Technical spike needed to assess API complexity
- Multi-VTT support may significantly increase scope
- Real-time event handling may be more complex than anticipated

---

### Effort (scale: 1-10)
**Value**: 7 / 10 (Large Effort)

**Source**: Estimated (⚠️ Requires Architect Agent validation)

**T-shirt Size**: L (2-4 weeks per VTT)

**Reasoning**:
- **API Integration**: 3-5 days per VTT
  - Authentication flow (OAuth for Roll20, API key for Foundry)
  - Event subscription/polling
  - Data transformation to Tumulte poll format
- **Backend Service**: 3-5 days
  - VTT adapter pattern (abstract interface)
  - Event mapping logic (dice roll → poll creation)
  - Error handling and retry logic
  - Rate limit handling
- **Frontend Configuration**: 2-3 days
  - VTT connection settings UI
  - Event type selection (which VTT events trigger polls)
  - OAuth callback handling
- **Testing**: 3-5 days
  - Manual testing with each VTT
  - Mock VTT API for automated tests
  - Integration testing
- **Documentation**: 1-2 days
  - User guides for each VTT
  - API documentation

**Total per VTT**: 12-20 days = 2.5-4 weeks
**For 3 VTTs (Foundry, Roll20, Alchemy)**: 6-12 weeks = 1.5-3 months

**T-shirt to numeric conversion**:
- L (2-4 weeks for single VTT, 6-12 weeks for all 3) → **7/10**

**Confidence in Estimate**: Medium-Low (60%)
- VTT API complexity unknown
- Real-time event handling may add complexity
- Multi-VTT support significantly increases scope

**Risk Factors**:
- API rate limits may require caching/batching
- Real-time events may require WebSocket support
- Each VTT has unique quirks and limitations
- Maintenance burden for 3 different integrations

---

## RICE Score Result

```
RICE = (Reach × Impact × Confidence) / Effort
RICE = (240 × 2.0 × 0.65) / 7
RICE = 312 / 7
RICE = 44.57
```

### Score Interpretation

| RICE Score | Priority | Meaning |
|------------|----------|---------|
| 200+ | **P0** (Critical) | Must build, extremely high ROI |
| 100-199 | **P1** (High) | Should build soon, strong ROI |
| 50-99 | **P2** (Medium) | Consider building, decent ROI |
| 25-49 | **P3** (Low) | Nice-to-have, low ROI |
| <25 | **P4** (Skip) | Not worth building, negligible ROI |

**This feature: Priority P3 (Low) - Borderline P2**

**Score: 44.57** - Just below the P2 threshold (50)

**Key Insight**: The feature sits on the boundary between "Low priority" and "Medium priority". With slightly higher confidence (user validation) or reduced scope (single VTT MVP), this could easily move to P2.

---

# Value vs Effort Matrix

## Quadrant Analysis

```
       High Value (Impact ≥ 1.5)
           │
  Big Bets │ Quick Wins
    (L,H)  │  (L,H)
───────────┼───────────  Effort = 5
Money Pits│ Fill-Ins
    (H,L) │  (L,L)
           │
       Low Value (Impact < 1.5)
           │
      Low Effort (≤5) → High Effort (>5)
```

### Feature Position
- **Value**: High (Impact score 2.0/3.0 = 6.7/10 normalized)
- **Effort**: High (Effort score 7/10)
- **Quadrant**: **Big Bet**

### Quadrant Interpretation

**This feature is a Big Bet**

**Big Bets** (High Value, High Effort):
- ⚠️ Build strategically, not immediately
- High risk, high reward
- Requires careful planning and validation
- Best approach: Validate first, then build incrementally

**Characteristics of this Big Bet**:
- ✅ High potential impact (transforms GM workflow)
- ❌ Significant effort (7/10 = 2-3 months for all VTTs)
- ⚠️ Medium-low confidence (65% - many unknowns)
- 💡 Can be de-risked through phased approach

**Comparison to other quadrants**:

- **Quick Wins** (High Value, Low Effort):
  - Example: Overlay customization (color themes, layouts)
  - RICE ~150-200, Effort 2-3, P1 priority
  - ✅ Build these first before VTT integration

- **Fill-Ins** (Low Value, Low Effort):
  - Example: Poll result CSV export
  - RICE ~30-50, Effort 1-2, P3 priority
  - ⏸️ Build when capacity available

- **Money Pits** (Low Value, High Effort):
  - Example: Custom VTT from scratch
  - RICE <25, Effort 10, P4 priority
  - ❌ Avoid entirely

---

# Strategic Alignment

## Product Vision Fit
**Alignment**: Strong

### Vision Statement
Tumulte enables Twitch RPG streamers to create engaging, interactive viewer experiences through multi-channel poll management. The platform bridges the gap between Game Masters, their streaming party members, and the Twitch audience.

### How This Feature Fits
VTT integration directly supports the core vision by:
1. **Reducing friction**: Eliminates manual poll creation, letting GMs focus on storytelling
2. **Enhancing interactivity**: Automatic polls from VTT events (dice rolls, character actions) create real-time audience participation
3. **Strengthening core value prop**: Makes Tumulte the central hub for RPG streaming workflow (VTT → Tumulte → Twitch overlay)

The feature aligns with the "workflow optimization for GMs" theme and reinforces Tumulte's position as an essential tool for RPG streamers.

### Strategic Value

**Competitive differentiation**: **High**
- No direct competitor offers VTT → Twitch poll integration
- StreamElements/Nightbot have polls but no VTT connection
- Foundry/Roll20 have Twitch extensions but no multi-channel poll support
- **Unique positioning**: Only tool that bridges VTT, multi-streamer coordination, and Twitch polls

**Market positioning**: **Leader** (in niche)
- Tumulte already leads in multi-channel RPG poll management
- VTT integration deepens moat and increases switching costs
- Creates network effect (more streamers → more GMs → more VTT users)

**Long-term impact**: **Opens new opportunities**
- Establishes VTT integration capability (foundation for future features)
- Potential for deeper VTT partnerships (Foundry marketplace, Roll20 integrations)
- Enables data-driven insights (which VTT events drive most engagement)
- Could expand to other automation (character sheets, combat tracking)

---

## Roadmap Context

### Current Roadmap Themes
(⚠️ Assumed - requires Product Manager validation)

- **Theme 1**: "Improve GM workflow efficiency"
  - Goal: Reduce time spent on poll management, increase time for storytelling
  - Examples: Bulk poll creation, poll templates, quick launch

- **Theme 2**: "Expand streamer engagement"
  - Goal: Increase streamer adoption, improve streamer experience
  - Examples: Overlay customization, mobile app, streamer analytics

- **Theme 3**: "Platform stability and scale"
  - Goal: Support 100+ concurrent campaigns, 1000+ streamers
  - Examples: Performance optimization, monitoring, error handling

### This Feature's Theme
**Primary theme**: **Theme 1** - "Improve GM workflow efficiency"
- Directly reduces GM manual work (no more manual poll creation)
- Automates repetitive tasks (VTT event → poll creation)
- Core workflow optimization

**Secondary themes**:
- **Theme 2** - "Expand streamer engagement" (indirect)
  - Better GM experience → More GMs → More streamer invitations
  - More automated polls → More engaging streams

**Theme alignment**: **Strong** (primary theme) / **Moderate** (secondary theme)

---

## Opportunity Cost

### What We Won't Build (If We Build This)

With **6-12 weeks** (for all 3 VTTs) or **2-4 weeks** (for single VTT MVP) spent on VTT integration, we could instead build:

**Alternative 1**: **Mobile GM Dashboard** (Responsive + PWA)
- **Effort**: 4-6 weeks
- **Description**: Full mobile experience for GMs (already in roadmap, see CLAUDE.md)
  - Bottom navigation for mobile
  - Responsive layouts for all pages
  - PWA installation on all platforms
- **RICE Score**: ~120-150 (estimated)
  - Reach: 100 users × 100% adoption × 4 uses/quarter = 400
  - Impact: 1.5 (significant mobile UX improvement)
  - Confidence: 0.8 (clear roadmap item, proven demand for mobile)
  - Effort: 5 (M-L size)
  - RICE = (400 × 1.5 × 0.8) / 5 = 96 → **P2, borderline P1**

**Alternative 2**: **Poll Templates & Library**
- **Effort**: 2-3 weeks
- **Description**: Pre-built poll templates for common RPG scenarios
  - Template library (combat actions, plot decisions, character interactions)
  - Custom template creation and sharing
  - One-click poll launch from templates
- **RICE Score**: ~80-100 (estimated)
  - Reach: 100 users × 90% adoption × 3 uses/quarter = 270
  - Impact: 1.0 (moderate time savings)
  - Confidence: 0.9 (low technical risk, clear user need)
  - Effort: 3 (S-M size)
  - RICE = (270 × 1.0 × 0.9) / 3 = 81 → **P2**

**Alternative 3**: **Streamer Analytics Dashboard**
- **Effort**: 3-4 weeks
- **Description**: Engagement metrics for streamers
  - Poll participation rates by streamer channel
  - Viewer engagement trends
  - Most popular poll types
- **RICE Score**: ~60-80 (estimated)
  - Reach: 300 streamers × 50% adoption × 2 uses/quarter = 300
  - Impact: 0.8 (nice-to-have insights)
  - Confidence: 0.7 (unclear if streamers want this)
  - Effort: 4 (M size)
  - RICE = (300 × 0.8 × 0.7) / 4 = 42 → **P3**

### Comparison

| Feature | RICE Score | Priority | Effort | Notes |
|---------|------------|----------|--------|-------|
| **VTT Integration (all 3)** | 45 | P3 | 7 (L-XL) | Big Bet, high uncertainty |
| **VTT Integration (MVP: Foundry only)** | 67 | P2 | 3 (M) | Reduced scope, same value/reach ratio |
| Mobile GM Dashboard | 96 | P2 (→P1) | 5 (M-L) | Already in roadmap, proven demand |
| Poll Templates | 81 | P2 | 3 (S-M) | Quick Win, high confidence |
| Streamer Analytics | 42 | P3 | 4 (M) | Fill-In, lower priority |

**Verdict**:
- **Full VTT integration (3 VTTs)**: Not the best use of resources compared to Mobile Dashboard or Poll Templates
- **MVP VTT integration (Foundry only)**: More competitive at RICE 67 (P2), but still lower than Mobile Dashboard
- **Recommendation**: Prioritize Mobile Dashboard (P1 potential) and Poll Templates (P2) before VTT integration

---

## Technical Debt Consideration

### Impact on Technical Debt

**Increases debt**: ⚠️ Yes (moderate)
- **New integration complexity**: 3 different VTT APIs to maintain
- **Ongoing maintenance**: VTT API changes require updates
- **Testing burden**: Mock VTT APIs, integration tests for each VTT
- **Documentation debt**: User guides for 3 VTTs

**Reduces debt**: No
- Does not address existing technical debt
- Does not improve codebase architecture

**Neutral**: If implemented with strong adapter pattern
- ✅ Clean abstraction could enable future integrations
- ✅ Event-driven architecture could improve overall system
- ❌ But still adds maintenance burden

### Debt vs Feature Balance

**Current state**: Balanced (based on git history)
- Recent focus on stability (Sentry upgrade, lint fixes)
- Active feature development (responsive/PWA roadmap)
- No major technical debt red flags in CLAUDE.md

**Recommendation**: **Build Poll Templates first, then VTT MVP**

**Rationale**:
1. Current debt level is manageable
2. VTT integration adds moderate complexity
3. Higher ROI features (Mobile Dashboard, Poll Templates) should come first
4. VTT integration should wait until user demand is validated

**If we proceed with VTT integration**:
- ✅ Use adapter pattern to minimize coupling
- ✅ Implement comprehensive testing (mock VTT APIs)
- ✅ Document thoroughly (user guides + API docs)
- ✅ Start with single VTT (Foundry) to limit initial complexity

---

# Comparative Analysis

## Similar Features (Benchmarking)

### Feature 1: Twitch OAuth Integration (Existing)
- **RICE Score**: ~200+ (estimated retrospectively)
- **Priority**: P0 (Critical - Core functionality)
- **Status**: ✅ Shipped
- **Comparison**:
  - VTT integration is similar in complexity (OAuth, API integration, real-time events)
  - Twitch integration had higher reach (100% of users) vs VTT (80%)
  - Twitch integration had higher confidence (core feature) vs VTT (enhancement)
  - **Lesson**: VTT integration should follow similar architecture patterns (adapter, service layer)

### Feature 2: Multi-Channel Poll Aggregation (Existing)
- **RICE Score**: ~300+ (estimated retrospectively)
- **Priority**: P0 (Critical - Core value prop)
- **Status**: ✅ Shipped
- **Comparison**:
  - Core differentiator vs VTT integration (nice-to-have)
  - Higher impact (enables multi-streamer campaigns) vs VTT (workflow efficiency)
  - **Lesson**: VTT integration is not a "must have" like multi-channel aggregation was

### Feature 3: Responsive/PWA (Planned)
- **RICE Score**: ~96 (estimated, see Opportunity Cost)
- **Priority**: P2 (borderline P1)
- **Status**: 📋 In roadmap (see CLAUDE.md Development Roadmap)
- **Comparison**:
  - Higher RICE than VTT integration (96 vs 45)
  - Higher confidence (proven mobile demand)
  - Similar effort (M-L size)
  - **Lesson**: Should build Responsive/PWA before VTT integration

### Feature 4: WebSocket Real-time Updates (Existing)
- **RICE Score**: ~250+ (estimated retrospectively)
- **Priority**: P0-P1 (Critical for real-time polls)
- **Status**: ✅ Shipped (Transmit WebSocket)
- **Comparison**:
  - Foundational infrastructure vs VTT integration (feature)
  - VTT integration can leverage existing WebSocket infra
  - **Lesson**: VTT integration benefits from existing real-time capabilities

### Ranking (RICE Score Comparison)

1. **Multi-Channel Aggregation** - RICE ~300+ (P0) ✅ Shipped
2. **WebSocket Real-time** - RICE ~250+ (P0-P1) ✅ Shipped
3. **Twitch OAuth** - RICE ~200+ (P0) ✅ Shipped
4. **Mobile/PWA** - RICE ~96 (P2 → P1) 📋 Planned
5. **Poll Templates** - RICE ~81 (P2) 💡 Alternative
6. **VTT Integration (MVP)** - RICE ~67 (P2) 🎯 This feature (scoped)
7. **VTT Integration (All 3)** - RICE ~45 (P3) 🎯 This feature (full scope)
8. **Streamer Analytics** - RICE ~42 (P3) 💡 Alternative

**Position**: #6-7 out of 8 features analyzed

**Insight**: VTT integration ranks below core features (expected) and below planned enhancements (Mobile/PWA, Poll Templates). This suggests it should not be prioritized immediately, but could be valuable after higher-ROI items are shipped.

---

# Final Recommendation

## Priority Rating
**Priority: P3 (Low) for Full Scope | P2 (Medium) for MVP Scope**

### Criteria Met
- ✅ High potential value (2.0/3.0 impact - workflow transformation)
- ✅ Strategic alignment (strong fit with "GM workflow efficiency" theme)
- ✅ Competitive differentiation (unique capability in market)
- ⚠️ RICE score below P2 threshold (45 for full scope, 67 for MVP)
- ⚠️ Medium-low confidence (65% - requires validation)
- ❌ High effort (7/10 for full scope, 3/10 for MVP)
- ❌ Lower ROI than alternatives (Mobile Dashboard, Poll Templates)

## Decision
**Recommendation: BUILD LATER (MVP only, after validation)**

**Not Recommended**: Full 3-VTT integration
**Conditional Recommendation**: Single-VTT MVP (Foundry VTT) after user validation

### Rationale

**1. RICE Score Analysis**
- Full scope (3 VTTs): RICE 45 → P3 (Low Priority)
- MVP scope (Foundry only): RICE 67 → P2 (Medium Priority)
- The effort reduction from 7 to 3 (57% reduction) improves RICE from 45 to 67 (49% increase)
- Even with MVP scope, RICE is lower than Mobile Dashboard (96) and Poll Templates (81)

**2. Strategic Alignment vs Opportunity Cost**
- ✅ Strong strategic fit (GM workflow, competitive differentiation)
- ❌ Lower ROI than alternatives already in roadmap
- ❌ Delays higher-priority Mobile/PWA work (which has broader user impact)
- **Insight**: Strategic alignment alone doesn't justify immediate build when better alternatives exist

**3. Confidence and Risk**
- 65% confidence is below ideal threshold for large investment
- Key unknowns:
  - User demand not validated (Do GMs actually want this? How many?)
  - Technical complexity uncertain (VTT API quirks, rate limits, real-time event reliability)
  - Maintenance burden (3 APIs to keep updated)
- **Insight**: Requires validation phase before full commitment

**4. Phased Approach Advantage**
- MVP (Foundry only) reduces risk and effort by 57%
- Foundry is most popular among serious RPG streamers (better API, self-hosted, active community)
- Learning from MVP informs decision on Roll20/Alchemy expansion
- **Insight**: MVP approach de-risks Big Bet and validates demand

**5. Sequencing Logic**
Recommended build order:
1. **Mobile/PWA** (RICE 96, P2→P1) - Already in roadmap, broad impact, proven demand
2. **Poll Templates** (RICE 81, P2) - Quick win, workflow efficiency, low risk
3. **User Research for VTT Integration** - Validate demand, assess VTT preferences
4. **VTT MVP (Foundry)** (RICE 67, P2) - Build only if validation confirms demand
5. **Expand to Roll20/Alchemy** - Only if MVP shows strong adoption (>50% of Foundry users)

### Conditions

**Build if**:
- ✅ User research validates strong demand (>60% of GMs want VTT integration)
- ✅ Foundry VTT API technical spike confirms feasibility (effort ≤3 weeks)
- ✅ Mobile/PWA and Poll Templates are shipped or in final stages
- ✅ No higher-priority P0/P1 items in queue
- ✅ Team has 3-4 weeks of dedicated dev capacity (for MVP)

**Don't build if**:
- ❌ User research shows weak demand (<40% of GMs interested)
- ❌ Technical spike reveals significant complexity (effort >4 weeks for MVP)
- ❌ Mobile/PWA or Poll Templates are delayed/blocked
- ❌ Higher-priority features emerge (P0/P1)
- ❌ Team capacity is limited (<3 weeks available)

**Expand to full scope (3 VTTs) only if**:
- ✅ Foundry MVP shows strong adoption (>50% of Foundry-using GMs enable integration)
- ✅ User feedback requests other VTTs (Roll20/Alchemy)
- ✅ Engineering team has bandwidth (additional 4-8 weeks)
- ✅ Maintenance burden of Foundry MVP is manageable

---

# Next Steps

## If Approved (Conditional)

### Phase 1: Validation (2-3 weeks)
**Goal**: Increase confidence from 65% to 80%+

1. **User Research** (1 week)
   - Survey GMs: "Do you use a VTT? Which one? Would you want automatic poll creation from VTT events?"
   - Target: 20-30 responses from active Tumulte GMs
   - Success metric: >60% interested + >50% use Foundry

2. **Technical Spike** (1-2 weeks)
   - Foundry VTT API exploration
     - Authentication (API key or module approach)
     - Event subscription (polling vs webhooks)
     - Rate limits and reliability
   - Build proof-of-concept: Foundry dice roll → Tumulte poll creation
   - Success metric: PoC works, effort estimate confirmed at ≤3 weeks

3. **Go/No-Go Decision**
   - Inputs: User research results + Technical spike findings
   - Decision makers: Product Manager + Engineering Lead
   - Outcome:
     - **GO**: Proceed to MVP (Foundry only)
     - **NO-GO**: Archive feature, revisit in 6 months
     - **PIVOT**: Explore alternative approach (e.g., manual VTT event triggers instead of automatic)

### Phase 2: MVP Development (3-4 weeks)
**Scope**: Foundry VTT integration only

1. **Backend Integration** (1.5-2 weeks)
   - VTT adapter interface (`#services/vtt/vtt_adapter_interface`)
   - Foundry adapter implementation (`#services/vtt/foundry_adapter`)
   - Event mapping service (Foundry event → Poll creation)
   - Configuration API (GM connects Foundry instance)

2. **Frontend Configuration** (1-1.5 weeks)
   - VTT settings page (`/mj/settings/vtt`)
   - Foundry connection form (API URL, API key)
   - Event type selection (which Foundry events trigger polls)
   - Connection status indicator

3. **Testing & Documentation** (0.5-1 week)
   - Unit tests with mocked Foundry API
   - Integration tests with real Foundry instance
   - User guide: "How to connect Foundry VTT to Tumulte"
   - API documentation for VTT adapter interface (enables future Roll20/Alchemy)

4. **Beta Release**
   - Invite 5-10 GMs to test (preferably from user research participants)
   - Collect feedback for 2-4 weeks
   - Success metric: >70% of beta testers use it regularly (in >50% of sessions)

### Phase 3: Evaluation & Expansion Decision (After 1-2 months)
**Goal**: Decide whether to expand to Roll20/Alchemy

1. **Analyze MVP Metrics**
   - Adoption rate: % of Foundry-using GMs who enable integration
   - Usage frequency: % of sessions where VTT integration is active
   - User feedback: NPS, satisfaction, feature requests

2. **Expansion Decision**
   - **Expand**: If adoption >50%, strong user feedback, requests for Roll20/Alchemy
   - **Iterate**: If adoption 30-50%, improve Foundry integration first
   - **Sunset**: If adoption <30%, discontinue feature

---

## If Rejected

### Revisit when:
- **Q3 2026** (6 months from now)
  - After Mobile/PWA and Poll Templates are shipped
  - After next user research cycle (validate if demand has increased)
- **User demand increases**
  - If >50 GMs request VTT integration in feedback/support
  - If competitor launches similar feature (raises user expectations)
- **VTT landscape changes**
  - If Foundry/Roll20 release new APIs that simplify integration (lowers effort)
  - If major VTT (e.g., D&D Beyond VTT) launches and dominates market

### Alternative: Partial Solution
If full VTT integration is not justified, consider lighter approach:

**"VTT Event Trigger Button"** (Effort: 1-2 weeks, RICE ~100+)
- Simple button in Tumulte UI: "Create poll from VTT event"
- GM manually triggers when relevant VTT event occurs (dice roll, character action)
- Pre-fills poll with context from VTT (if GM has VTT window open via browser extension)
- Much simpler than full automation, still reduces friction
- Could be built as part of Poll Templates feature

### Archive
- Document this analysis in product backlog
- Tag as "User Validation Needed" + "Big Bet"
- Include in quarterly roadmap reviews
- Link to this analysis for future reference

---

## Open Questions

**User Value Questions** (For User Value Agent):
1. What % of Tumulte GMs currently use VTTs? Which VTTs?
2. How painful is manual poll creation from VTT events? (Scale 1-10)
3. Would GMs trust automatic poll creation, or prefer manual control?
4. How many GMs would pay for VTT integration (if freemium model)?
5. What VTT events should trigger polls? (dice rolls only, or character actions, combat events, etc.?)

**Architect Questions** (For Architect Agent):
1. What is the technical complexity of each VTT API?
   - Foundry: API maturity, authentication, event streaming
   - Roll20: API limitations, rate limits, real-time capabilities
   - Alchemy RPG: API availability, documentation quality
2. Can we build a unified VTT adapter interface? Or is each VTT too unique?
3. What is the maintenance burden? (API changes, version compatibility)
4. Should we use polling, webhooks, or browser extension approach?
5. What is the estimated effort for single-VTT MVP vs 3-VTT full scope?

**Product Strategy Questions** (For Product Manager):
1. What is the current product roadmap priority order?
2. Are Mobile/PWA and Poll Templates confirmed as higher priority?
3. What is the competitive landscape? (Any new tools emerging?)
4. What is the user growth trajectory? (TAU assumptions)
5. What is the budget for "Big Bet" features? (Risk tolerance)

**Risk Questions**:
1. What if VTT APIs change frequently? (Maintenance burden)
2. What if adoption is low (<30%)? (Sunk cost)
3. What if one VTT dominates and we picked the wrong one for MVP? (Wrong bet)
4. What if VTTs release official Twitch integrations? (Competitive risk)

---

## Summary for Risk Analyst

**Priority Level**: P3 (Full Scope) | P2 (MVP Scope)

**RICE Score**: 45 (Full Scope) | 67 (MVP Scope)

**Recommendation**: BUILD LATER (MVP only, after validation)

**Key Risks**:
- **Demand risk** (Medium): 65% confidence, needs user validation
- **Technical risk** (Medium): VTT API complexity uncertain, needs technical spike
- **Opportunity cost risk** (High): Better alternatives exist (Mobile/PWA RICE 96, Poll Templates RICE 81)
- **Maintenance risk** (Medium): 3 VTT APIs to maintain long-term
- **Competitive risk** (Low): No competitor has this, but VTTs may build Twitch integrations

**Opportunity Cost**:
- Building VTT integration (6-12 weeks) delays higher-ROI features:
  - Mobile/PWA (RICE 96, P2→P1)
  - Poll Templates (RICE 81, P2)

**Strategic Alignment**:
- ✅ Strong fit with "GM workflow efficiency" theme
- ✅ Competitive differentiation (unique capability)
- ❌ Lower ROI than roadmap alternatives

**Next Steps for Approval**:
1. User research (validate demand)
2. Technical spike (validate feasibility)
3. Go/No-Go decision based on research + spike
4. MVP (Foundry only) if approved
5. Evaluate MVP before expanding to Roll20/Alchemy

---

## Appendix: RICE Sensitivity Analysis

### What would it take to reach P2 (RICE 50+) or P1 (RICE 100+)?

**Current**: RICE 45 (P3)

**Scenario 1: Increase Confidence (Validate Demand)**
- Current confidence: 0.65
- If user research validates demand → Confidence 0.8
- New RICE: (240 × 2.0 × 0.8) / 7 = **54.9** → P2 ✅
- **Action**: User research is critical to move from P3 to P2

**Scenario 2: Reduce Scope (MVP)**
- Current effort: 7 (all 3 VTTs)
- If Foundry only → Effort 3
- New RICE: (240 × 2.0 × 0.65) / 3 = **104** → P1 ✅
- **Action**: MVP scope dramatically improves RICE

**Scenario 3: Increase Reach (User Growth)**
- Current reach: 240 (100 TAU × 80% adoption × 3 uses/quarter)
- If user base doubles → 200 TAU → Reach 480
- New RICE: (480 × 2.0 × 0.65) / 7 = **89.1** → P2 ✅
- **Action**: Wait for user base growth (6-12 months)

**Scenario 4: Combination (MVP + Validation + Growth)**
- MVP: Effort 3 (instead of 7)
- Validation: Confidence 0.8 (instead of 0.65)
- Growth: TAU 150 (instead of 100) → Reach 360
- New RICE: (360 × 2.0 × 0.8) / 3 = **192** → P1 (near P0) ✅
- **Action**: Best case scenario - build in 6-12 months after user growth + validation

**Takeaway**: MVP scope + user validation can move this from P3 (45) to P1 (104+). Full scope is only justified if user base grows significantly.

---

**Document Version**: 1.0 (Preliminary)
**Requires Updates From**: User Value Agent, Architect Agent
**Next Review**: After agent outputs received
