# Stag Hunt on the Colorado

A web-based, single-device, 6-player hot-seat board game simulating Colorado River water allocation as a game-theory exercise. Total playtime: ~2 hours (10 water years × ~10 min/year).

**The app lives in [`kyles-card-game/`](kyles-card-game/).**

## Quick Start

```bash
cd kyles-card-game
npm install
npm run dev
```

Open on a tablet (landscape) and pass around the table. No backend, no networking, no auth. State persists to localStorage, so a paused game survives a refresh.

## Deploy to Cloudflare Pages

**Git integration** (dashboard → Workers & Pages → Create → Pages → connect this repo):

| Setting | Value |
|---|---|
| Root directory | `kyles-card-game` |
| Build command | `npm install && npm run build` |
| Build output directory | `dist` |

**Direct upload** (from your machine):

```bash
cd kyles-card-game
npm run build
npx wrangler pages deploy dist --project-name kyles-card-game
```

`public/_redirects` handles SPA routing; `public/_headers` sets cache and security headers. Both are copied into `dist/` automatically by Vite.

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

### Turn Structure (10 turns)

1. **Hydrology Draw (1 min)** — Draw a flow card revealing actual natural flow.
2. **Federal Phase (2 min)** — Bureau declares shortage tier (0–3, floored by reservoir level) and may offer one federal grant covering 50% of an investment.
3. **Negotiation (4 min)** — Open verbal negotiation; log binding agreements digitally.
4. **Commitment (untimed)** — Device passes to each player privately: diversion amount, defection choice, optional investment. Hidden until reveal.
5. **Resolution (1.5 min)** — Reveal all commitments, update the reservoir, score the year.

Timed phases auto-advance; if the hydrology timer expires undrawn, the card auto-draws.

### Reservoir Math

```
Δreservoir = effectiveFlow − totalDiversions − evaporation
effectiveFlow = cardFlow + climateDrift (−0.1/yr cumulative) + completed supply projects
evaporation ≈ 4% of current storage
```

- Combined Mead + Powell capacity: 52 MAF; start: 26 MAF (50%)
- Dead pool: 4.16 MAF (8%) → **game over, no one wins**
- Shortage tiers floor at 40% / 30% / 20%

### Defection Moves

| Move | Effect | Cost |
|------|--------|------|
| Overdraw | Take +20% over your commitment | −2 PC |
| Refuse cut | Ignore your mandatory tier cut | −2 PC |
| Litigation | Target can't defect or invest for 2 years | −3 PC (filer), −1 PC (target) |

Players under litigation cannot defect or start investments until the freeze expires.

### Investments

| Investment | Cost | Lead | Effect |
|-----------|------|------|--------|
| Ag Fallowing | $150M | 1 yr | −0.5 MAF demand for 2 yrs |
| Conservation | $80M | 2 yrs | −0.1 MAF demand, permanent |
| Desalination | $500M (needs grant) | 3 yrs | +0.2 MAF supply, permanent |
| Recycled Water | $120M | 2 yrs | −0.15 MAF demand, permanent |
| Tribal Water Lease | 3 PC | 1 yr | 0.5 MAF to lessee for 3 yrs; lessee pays Tribes $30M/yr |
| Rights Quantification | $50M + 2 PC (Tribes) | 3 yrs | Major private-objective bonus |

Demand-reduction investments count toward your delivery score — you score full delivery while taking less water. That's what makes cooperation affordable.

### Win Condition

- **Dead pool** → no one wins; all scores nullified.
- **Otherwise** → highest public + private score wins.
- **Coordination bonus** → reservoir ≥ 30% every year of a completed game = **+60 points for every player**. Tuned so sustained cooperation beats defection in expectation.

---

## Verified Playability

`kyles-card-game/scripts/playthrough.mjs` drives the real UI through a complete game in headless Chromium:

```bash
cd kyles-card-game
npm run build && npx vite preview --port 4173 &   # serve the build
npm run test:playthrough                            # cooperative: survives 10 years
MODE=defect npm run test:playthrough                # defection: dead pool by ~year 4
```

Observed behavior: full cooperation at tier targets survives all 10 years; aggressive overdraw by the states reaches dead pool in year 4. The stag hunt gap is real.

---

## Tuning Guide

All balance numbers are marked `// TUNING:` in source:

- `src/data/roles.ts` — baseline/max diversions, budgets, political capital
- `src/data/hydrology.ts` — 30-card flow deck, draw weights (post-2000 dry years weighted up)
- `src/data/alternatives.ts` — investment costs, lead times, effects, lease revenue
- `src/data/objectives.ts` — private objective points, `COORDINATION_BONUS`
- `src/store/gameStore.ts` — reservoir geometry, evaporation, climate drift, tier cuts, defection economics, phase timers

Playtest targets:
- Pure defection → dead pool by year 4–6
- Full cooperation → stable reservoir + coordination bonus
- Mixed play → mid-game crisis forcing a coalition

## File Structure

```
kyles-card-game/
  public/            _redirects, _headers, favicon (Cloudflare-ready)
  scripts/
    playthrough.mjs  headless full-game smoke test
  src/
    data/            roles, hydrology deck, alternatives, objectives (all tunable)
    store/
      gameStore.ts   entire game engine: phases, resolution, scoring
    components/
      phases/        one component per phase
      ...            dashboard, chart, log, setup, game-over, tutorial
  wrangler.toml      Cloudflare Pages config
  .node-version      Node 20 for CF build workers
```

## Pedagogical Goals

Players should leave understanding:
1. Why the 1922 Compact's overallocation is the structural root of the problem
2. How federal funding leverage shapes state behavior
3. Why tribal water rights are pivotal and historically marginalized
4. How hydrological variance interacts with rigid legal frameworks
5. Why coordination is hard even when everyone agrees on the math
