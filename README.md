# Stag Hunt on the Colorado

A web-based, single-device, 6-player hot-seat board game simulating Colorado River water allocation as a game-theory exercise. Total playtime: ~2 hours (10 water years × ~10 min/year).

## Quick Start

```bash
npm install
npm run dev
```

Open on a tablet (landscape) and pass around the table. No backend, no networking, no auth. State is persisted to localStorage so a paused game survives a page refresh.

---

## One-Page Rules

### The Situation

The 1922 Colorado River Compact allocated ~18.5 MAF/year to seven states plus Mexico. Recent average natural flow is ~12.5 MAF/year. The gap (~6 MAF/year) is structural — no single party caused it, and no single party can fix it.

### Players (6 exactly)

| # | Role | Baseline Diversion | Budget |
|---|------|--------------------|--------|
| 1 | Bureau of Reclamation | — (oversight) | $500M federal pot |
| 2 | Upper Basin Coalition | 5.5 MAF/yr | $200M |
| 3 | California | 4.4 MAF/yr | $300M |
| 4 | Arizona + Nevada | 2.8 MAF/yr | $250M |
| 5 | Mexico | 1.5 MAF/yr | $150M |
| 6 | Tribal Coalition | 2.0 MAF/yr | $100M |

### Turn Structure (10 turns, ~10 min each)

1. **Hydrology Draw (1 min)** — Draw a flow card. Reveals actual natural flow this year.
2. **Federal Phase (2 min)** — Bureau declares shortage tier (0–3) and optionally allocates federal funding to an alternative investment.
3. **Negotiation (4 min)** — Open verbal negotiation. Players can log binding agreements digitally.
4. **Commitment (per-player)** — Device passed to each player privately. They commit: diversion amount, defection choice, alternative investment. Choices hidden until reveal.
5. **Resolution (1 min)** — Reveal all commitments simultaneously. Calculate reservoir change. Score the year.

### Reservoir Math

```
Δreservoir = effectiveFlow − totalDiversions − evaporation
```

- Combined Mead + Powell capacity: 52 MAF
- Starting level: 26 MAF (50%)
- Dead pool threshold: 4.16 MAF (8%) → **Game over, no one wins**
- Shortage tiers activate at 40% / 30% / 20%

### Defection Moves

| Move | Effect | Cost |
|------|--------|------|
| Overdraw | +20% water | −2 political capital |
| Refuse cut | Ignore tier cut | −2 PC, litigation risk |
| Litigation | Block target 2 turns | −3 PC (filer), −1 PC (target) |

### Alternative Investments

| Alternative | Cost | Lead Time | Effect |
|-------------|------|-----------|--------|
| Ag Fallowing | $150M | 1 turn | −0.5 MAF demand (2 turns) |
| Conservation | $80M | 2 turns | −0.1 MAF demand (permanent) |
| Desalination | $500M (needs Bureau) | 3 turns | +0.2 MAF supply (permanent) |
| Recycled Water | $120M | 2 turns | −0.15 MAF demand (permanent) |
| Tribal Water Lease | 3 PC | 1 turn | Lease 0.5 MAF/yr for 3 turns |

### Win Condition

- **Dead pool** → No one wins.
- **Otherwise** → Highest combined public + private score wins.
- **Coordination bonus** → If reservoir stays above 30% (15.6 MAF) for all 10 years, every player gets **+60 points**. This bonus is calibrated to make sustained cooperation the dominant long-run strategy.

---

## Reservoir Math (Detailed)

### Structural gap

Total legal allocations: ~18.5 MAF/yr  
Recent average flow: ~12.5 MAF/yr  
Gap: ~6 MAF/yr — this is the pedagogical core.

At full baseline diversions and average flow:
```
Δreservoir ≈ 12.5 − 17.2 − 1.0 = −3.7 MAF/year
```
→ Starting at 26 MAF, dead pool in ~6 years without cooperation.

If all players cut 30%:
```
Δreservoir ≈ 12.5 − 12.0 − 1.0 = +0.5 MAF/year
```
→ Stable. Coordination makes the system viable.

### Climate drift
Each year applies −0.1 MAF cumulative flow reduction (representing aridification trends). By Year 10, effective flow is ~1 MAF lower than the card face value.

### Evaporation
Approximately 4% of current reservoir level per year (min 0.3 MAF).

---

## Design Notes

### Why stag hunt (not prisoner's dilemma)?

In a prisoner's dilemma, defection is dominant regardless of what others do. In a stag hunt, cooperation is better if and only if you believe others will also cooperate. The Colorado River is a stag hunt: the coordination bonus flips the calculus when trust is established. Without trust, individual defection is rational even though collective defection is catastrophic.

### Why 10 turns?

Ten turns provides enough time for:
- Early game: learning the mechanics and establishing cooperation norms
- Mid game: testing whether initial agreements hold under pressure
- Late game: crisis dynamics if cooperation has failed, or consolidation if it held

Ten turns at 10 minutes each = 100 minutes within the 2-hour target.

### Why hot-seat (single device)?

Asymmetric information is the point. Each player has private objectives and private commitments. A single device enforces the informational structure without requiring a backend or networking. The pass-device ritual also slows the game to a human pace and creates a moment of privacy that mirrors real water negotiations.

### Role design

Every role is designed to be played sympathetically. California is not the villain; it has real constituents who depend on IID. The Tribal Coalition is not a spoiler; it has the most legally defensible position and the least historical power. The Bureau is not a neutral arbiter; its funding leverage shapes outcomes.

---

## Tuning Guide

All balance-critical numbers are marked `// TUNING:` in the source. Key files:

### `src/data/roles.ts`
- `baseDiversion`: what players normally draw. Higher values → more structural deficit → faster crisis.
- `maxDiversion`: legal ceiling. Tribal maxDiversion is deliberately higher than base to represent unquantified rights.
- `startingBudget`, `startingPoliticalCapital`: resource abundance affects willingness to invest in alternatives.

### `src/data/hydrology.ts`
- `naturalFlow`: per-card flow in MAF. Calibrated to USBR historical data.
- `weight`: draw probability. Increase post-2000 dry card weights to intensify climate pressure.

### `src/data/alternatives.ts`
- `cost`: higher cost → investment requires Bureau co-funding → Bureau has more leverage.
- `leadTurns`: longer lead times mean investments only pay off with sustained cooperation.
- `effectMagnitude`: larger effects make cooperation more valuable vs. defection.

### `src/data/objectives.ts`
- `COORDINATION_BONUS` (60 pts): must exceed the gain from defecting in every year. If playtests show pure defection still wins, increase this.
- Per-criterion `maxPoints`: calibrate so private objectives reward role-appropriate behavior without dominating total score.

### `src/store/gameStore.ts`
- `RESERVOIR_START` (26 MAF): lower start → earlier crisis → less time to establish cooperation.
- `EVAPORATION_RATE` (4%): higher rate → faster drawdown.
- `CLIMATE_DRIFT_PER_YEAR` (−0.1 MAF): increase to stress-test cooperation under worsening conditions.
- `getTierCuts()`: the mandatory cuts by tier. Real USBR Shortage Guidelines calibrate roughly to these numbers.

### Playtest targets
- Pure defection (everyone overdraw every year) → dead pool by Year 5–6.
- Full cooperation (everyone cuts 30%) → reservoir stable, coordination bonus earned.
- Mixed strategies → dead pool risk forces mid-game coalition.

---

## File Structure

```
src/
  data/
    types.ts          — all TypeScript interfaces
    roles.ts          — 6 player roles with powers, constraints, resources
    hydrology.ts      — 30-card hydrology deck (calibrated to USBR data)
    alternatives.ts   — 5 alternative investment types
    objectives.ts     — 6 private objective cards
  store/
    gameStore.ts      — Zustand store with all game logic and reducers
  components/
    Dashboard.tsx     — always-visible shared info panel
    ReservoirChart.tsx — Recharts reservoir + shortage tier lines
    GameLog.tsx       — chronological event log
    Timer.tsx         — countdown display
    TutorialOverlay.tsx — first-turn tutorial (5 steps)
    SetupScreen.tsx   — role reading + game start
    GameOverScreen.tsx — final scores + pedagogical takeaways
    phases/
      PhaseHydrology.tsx   — card draw + flow analysis
      PhaseFederal.tsx     — Bureau tier declaration + funding
      PhaseNegotiation.tsx — agreement logging
      PhaseCommitment.tsx  — sequential private input (6 players)
      PhaseResolution.tsx  — reveal + projected reservoir update
```

---

## Legal Layer Reference

The game encodes these legal frameworks as rule constraints:

| Framework | Effect in Game |
|-----------|----------------|
| 1922 Compact | Baseline allocations; Upper Basin delivery obligation |
| 1944 Mexico Treaty | Mexico's 1.5 MAF treaty ceiling |
| 1963 AZ v. California | California's senior 4.4 MAF; AZ's 2.8 MAF |
| 1968 Basin Project Act | CAP authorization; AZ junior in shortage |
| Minute 323 (2017) | Mexico shares cuts at shortage tiers |
| Winters Doctrine | Tribal max diversion (3.5 MAF) represents unquantified senior rights |
| Shortage Guidelines | Tier cut amounts in `getTierCuts()` |

---

## Pedagogical Goals

Players should leave understanding:
1. **Why the 1922 Compact is the structural root** — the overallocation was baked in from day one.
2. **How federal funding shapes state behavior** — the Bureau's pot is a carrot for cooperation.
3. **Why tribal rights are pivotal** — senior legal rights, historically marginalized.
4. **How hydrological variance interacts with rigid law** — the compact assumes predictability; the river doesn't comply.
5. **Why coordination is hard** — everyone can see the math; politics makes it hard anyway.
