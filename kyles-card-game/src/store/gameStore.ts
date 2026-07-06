import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  GameState, PlayerId, PlayerState, PlayerCommitment,
  ShortageTier, YearResult, PlayerYearResult, LogEntry, ActiveAlternative,
} from '../data/types';
import { ROLES, PLAYER_ORDER, getRoleById } from '../data/roles';
import { buildShuffledDeck, getCardById } from '../data/hydrology';
import { getAlternativeById, LEASE_REVENUE_PER_YEAR } from '../data/alternatives';
import { COORDINATION_BONUS } from '../data/objectives';

// ─── Reservoir geometry ─────────────────────────────────────────────────────
// TUNING: combined Mead + Powell
export const RESERVOIR_CAPACITY = 52;      // MAF
export const RESERVOIR_START = 26;         // MAF (~50%)
export const DEAD_POOL_THRESHOLD = 4.16;   // MAF (8%)
const COORDINATION_THRESHOLD = 0.30;       // fraction — TUNING

// TUNING: system loss
const EVAPORATION_RATE = 0.04;             // fraction of level per year
const EVAPORATION_FLOOR = 0.3;             // MAF minimum

// TUNING: aridification — cumulative flow penalty per year
const CLIMATE_DRIFT_PER_YEAR = -0.1;       // MAF

// TUNING: federal purse
const FEDERAL_FUNDING_START = 500;         // $M
export const FEDERAL_SHARE = 0.5;          // grant covers this fraction of cost

export const TOTAL_YEARS = 10;

// TUNING: phase timers (seconds)
export const PHASE_DURATIONS: Record<string, number> = {
  hydrology: 60,
  federal: 120,
  negotiation: 240,
  resolution: 90,
};

// TUNING: defection economics
const OVERDRAW_MULTIPLIER = 1.2;   // overdraw takes +20%
const OVERDRAW_PC_COST = 2;
const REFUSE_CUT_PC_COST = 2;
const LITIGATION_PC_COST = 3;      // filer
const LITIGATION_TARGET_PC_COST = 1;
const LITIGATION_BLOCK_YEARS = 2;  // target cannot defect/invest
const ACCEPT_CUT_PC_REWARD = 1;    // grace for taking your medicine

// TUNING: shortage-tier mandatory cuts (MAF) — mirrors 2019 DCP proportions
export function getTierCuts(tier: ShortageTier): Partial<Record<PlayerId, number>> {
  switch (tier) {
    case 1: return { arizona_nevada: 0.5, mexico: 0.1 };
    case 2: return { arizona_nevada: 1.0, california: 0.2, mexico: 0.2 };
    case 3: return { arizona_nevada: 1.5, california: 0.5, mexico: 0.3, upper_basin: 0.5 };
    default: return {};
  }
}

export function getTierFromLevel(level: number): ShortageTier {
  const pct = level / RESERVOIR_CAPACITY;
  if (pct > 0.40) return 0;
  if (pct > 0.30) return 1;
  if (pct > 0.20) return 2;
  return 3;
}

// Demand reduction a player currently enjoys from completed alternatives.
// Temporary effects count while effectTurnsLeft > 0.
export function getDemandReduction(playerId: PlayerId, alts: ActiveAlternative[]): number {
  return alts.reduce((sum, alt) => {
    if (alt.playerId !== playerId || alt.status !== 'completed') return sum;
    const opt = getAlternativeById(alt.optionId);
    if (opt.effectType === 'demand_reduction_permanent') return sum + opt.effectMagnitude;
    if (opt.effectType === 'demand_reduction_temporary' && alt.effectTurnsLeft > 0) {
      return sum + opt.effectMagnitude;
    }
    return sum;
  }, 0);
}

// Active lease benefit (MAF) a player receives this year as lessee.
export function getLeaseCredit(playerId: PlayerId, alts: ActiveAlternative[]): number {
  return alts.reduce((sum, alt) => {
    if (alt.status !== 'completed' || alt.leaseTargetId !== playerId || alt.effectTurnsLeft <= 0) return sum;
    const opt = getAlternativeById(alt.optionId);
    return opt.effectType === 'water_lease' ? sum + opt.effectMagnitude : sum;
  }, 0);
}

let idCounter = 0;
function makeid(): string {
  idCounter += 1;
  return `${Date.now().toString(36)}_${idCounter}`;
}

function makeLog(year: number, type: LogEntry['type'], text: string): LogEntry {
  return { id: makeid(), year, type, text };
}

// ─── Initial state ──────────────────────────────────────────────────────────

function buildInitialPlayers(): PlayerState[] {
  return ROLES.map(role => ({
    id: role.id,
    publicScore: 0,
    privateScore: 0,
    politicalCapital: role.startingPoliticalCapital,
    budget: role.startingBudget,
    totalDiversionThisGame: 0,
    litigationBlock: 0,
    wasSued: false,
    hasCommittedThisYear: false,
  }));
}

function buildInitialState(): GameState {
  return {
    phase: 'setup',
    year: 1,
    phaseTimeRemaining: 0,
    phaseTimerActive: false,

    reservoirLevel: RESERVOIR_START,
    reservoirHistory: [{ year: 0, level: RESERVOIR_START }],
    supplyBonus: 0,
    climateDrift: 0,

    currentFlowCard: null,
    shortageTier: 0,

    players: buildInitialPlayers(),

    commitmentPlayerIndex: 0,
    commitments: {},

    bureauDeclaredTier: 0,
    bureauFundingTargetId: null,
    bureauFundingOptionId: null,
    federalFunding: FEDERAL_FUNDING_START,

    agreements: [],
    activeAlternatives: [],

    gameLog: [],
    yearHistory: [],

    deadPool: false,
    coordinationBonusEarned: false,

    showTutorial: false,
    tutorialStep: 0,

    hydrologyDeckIds: buildShuffledDeck(),
  };
}

// ─── Year resolution ────────────────────────────────────────────────────────

function resolveYear(state: GameState): Partial<GameState> {
  const {
    currentFlowCard, players, commitments, bureauDeclaredTier,
    reservoirLevel, climateDrift, activeAlternatives, supplyBonus,
    year, federalFunding, bureauFundingTargetId, bureauFundingOptionId,
  } = state;

  if (!currentFlowCard) return {};

  const effectiveFlow = Math.max(0, currentFlowCard.naturalFlow + climateDrift + supplyBonus);
  const tierCuts = getTierCuts(bureauDeclaredTier);
  const logs: LogEntry[] = [];

  // Working copies
  const P: Record<PlayerId, PlayerState> = Object.fromEntries(
    players.map(p => [p.id, { ...p, hasCommittedThisYear: false }]),
  ) as Record<PlayerId, PlayerState>;
  let alts: ActiveAlternative[] = activeAlternatives.map(a => ({ ...a }));
  let fedPot = federalFunding;

  const playerResults: PlayerYearResult[] = [];
  let totalDiversions = 0;
  const pendingBlocks: Array<{ target: PlayerId }> = [];

  // ── 1. Diversions & defections ──────────────────────────────────────────
  for (const pid of PLAYER_ORDER) {
    const role = getRoleById(pid);
    const player = P[pid];
    const c = commitments[pid];
    const notes: string[] = [];
    let pcChange = 0;
    let budgetChange = 0;
    let actual = 0;
    let waterScore = 0;

    const reduction = getDemandReduction(pid, alts);
    const cut = tierCuts[pid] ?? 0;
    const cutTarget = Math.max(0, role.baseDiversion - cut);
    const blocked = player.litigationBlock > 0;

    const intended = c?.intendedDiversion ?? Math.max(0, cutTarget - reduction);
    let defection = (c && !blocked) ? c.defectionType : 'none';
    if (c && blocked && c.defectionType !== 'none') {
      notes.push('Under litigation: defection moves voided');
    }

    if (pid === 'bureau') {
      // Bureau diverts nothing; scores on stewardship at end of year (below).
      defection = c?.defectionType === 'litigation' && !blocked ? 'litigation' : 'none';
    } else if (defection === 'overdraw') {
      actual = Math.min(intended * OVERDRAW_MULTIPLIER, role.maxDiversion);
      pcChange -= OVERDRAW_PC_COST;
      notes.push(`Overdraw: took ${actual.toFixed(2)} MAF (+20% over commitment), −${OVERDRAW_PC_COST} PC`);
      logs.push(makeLog(year, 'defection', `${role.name} OVERDREW: ${actual.toFixed(2)} MAF`));
    } else if (defection === 'refuse_cut') {
      actual = Math.min(intended, role.maxDiversion);
      pcChange -= REFUSE_CUT_PC_COST;
      notes.push(`Refused Tier ${bureauDeclaredTier} cut of ${cut.toFixed(1)} MAF, −${REFUSE_CUT_PC_COST} PC`);
      logs.push(makeLog(year, 'defection', `${role.name} refused the Tier ${bureauDeclaredTier} shortage cut`));
    } else {
      // Cooperate (or file litigation while cooperating on water)
      actual = Math.min(intended, cutTarget);
      if (cut > 0 && defection === 'none') {
        pcChange += ACCEPT_CUT_PC_REWARD;
        notes.push(`Accepted Tier ${bureauDeclaredTier} cut, +${ACCEPT_CUT_PC_REWARD} PC`);
      }
    }

    // Litigation filing (any role, incl. Bureau)
    if (defection === 'litigation' && c?.litigationTarget) {
      const target = c.litigationTarget;
      pcChange -= LITIGATION_PC_COST;
      pendingBlocks.push({ target });
      notes.push(`Filed suit vs ${getRoleById(target).abbreviation}: −${LITIGATION_PC_COST} PC`);
      logs.push(makeLog(year, 'litigation',
        `${role.name} filed suit against ${getRoleById(target).name} — target frozen ${LITIGATION_BLOCK_YEARS} years`));
    }

    playerResults.push({
      playerId: pid,
      intendedDiversion: pid === 'bureau' ? 0 : intended,
      actualDiversion: actual,
      mandatoryCut: cut,
      defectionType: defection,
      waterScore,        // filled below after leases
      politicalCapitalChange: pcChange,
      budgetChange,
      notes,
    });
  }

  // ── 2. Water leases: shift water from Tribal to lessee, pay revenue ─────
  for (const alt of alts) {
    const opt = getAlternativeById(alt.optionId);
    if (opt.effectType !== 'water_lease' || alt.status !== 'completed' || alt.effectTurnsLeft <= 0) continue;
    const lessee = alt.leaseTargetId;
    if (!lessee) continue;
    const tribalRes = playerResults.find(r => r.playerId === 'tribal')!;
    const lesseeRes = playerResults.find(r => r.playerId === lessee)!;
    const amount = Math.min(opt.effectMagnitude, tribalRes.actualDiversion + opt.effectMagnitude); // tribal fallows this much
    tribalRes.actualDiversion = Math.max(0, tribalRes.actualDiversion - amount);
    lesseeRes.actualDiversion = Math.min(getRoleById(lessee).maxDiversion, lesseeRes.actualDiversion + amount);
    const rent = Math.min(LEASE_REVENUE_PER_YEAR, P[lessee].budget + lesseeRes.budgetChange);
    lesseeRes.budgetChange -= rent;
    tribalRes.budgetChange += rent;
    tribalRes.notes.push(`Leased ${amount.toFixed(1)} MAF to ${getRoleById(lessee).abbreviation}, +$${rent}M`);
    lesseeRes.notes.push(`Lease credit +${amount.toFixed(1)} MAF from Tribal Coalition, −$${rent}M`);
  }

  // ── 3. Score water delivery (conservation counts as delivery) ───────────
  for (const r of playerResults) {
    const role = getRoleById(r.playerId);
    if (r.playerId === 'bureau' || role.baseDiversion === 0) continue;
    const reduction = getDemandReduction(r.playerId, alts);
    // TUNING: alternatives let you score full delivery while diverting less
    const effectiveDelivery = r.actualDiversion + reduction;
    r.waterScore = Math.round(10 * Math.min(1.25, effectiveDelivery / role.baseDiversion));
    totalDiversions += r.actualDiversion;
  }

  // ── 4. Start new alternative investments ────────────────────────────────
  for (const pid of PLAYER_ORDER) {
    const c = commitments[pid];
    if (!c?.alternativeOptionId) continue;
    if (P[pid].litigationBlock > 0) continue; // frozen players can't invest
    const opt = getAlternativeById(c.alternativeOptionId);
    const res = playerResults.find(r => r.playerId === pid)!;

    // Dedupe: one in-progress copy per option per player; non-repeatable once completed
    const repeatable = opt.effectType === 'water_lease';
    const alreadyInProgress = alts.some(a => a.playerId === pid && a.optionId === opt.id && a.status === 'in_progress');
    const alreadyCompleted = alts.some(a => a.playerId === pid && a.optionId === opt.id && a.status === 'completed');
    if (alreadyInProgress || (alreadyCompleted && !repeatable)) {
      res.notes.push(`${opt.name} already underway — investment skipped`);
      continue;
    }

    const granted = bureauFundingTargetId === pid && bureauFundingOptionId === opt.id;
    const fedShare = granted ? Math.round(opt.cost * FEDERAL_SHARE) : 0;
    const playerCost = opt.cost - fedShare;
    const pcOK = P[pid].politicalCapital + res.politicalCapitalChange >= opt.pcCost;
    const cashOK = P[pid].budget + res.budgetChange >= playerCost;
    const fedOK = !granted || fedPot >= fedShare;

    if (!pcOK || !cashOK || !fedOK) {
      res.notes.push(`Could not afford ${opt.name} — investment skipped`);
      continue;
    }

    res.budgetChange -= playerCost;
    res.politicalCapitalChange -= opt.pcCost;
    if (granted) fedPot -= fedShare;

    alts.push({
      id: `alt_${makeid()}`,
      optionId: opt.id,
      playerId: pid,
      leaseTargetId: opt.effectType === 'water_lease' ? (c.leaseTargetId ?? null) : null,
      federallyFunded: granted,
      startYear: year,
      turnsRemaining: opt.leadTurns,
      status: 'in_progress',
      effectTurnsLeft: opt.effectDuration > 0 ? opt.effectDuration : 999,
    });
    res.notes.push(`Started ${opt.name}${granted ? ` (federal grant $${fedShare}M)` : ''} — ready in ${opt.leadTurns} yr`);
    logs.push(makeLog(year, 'alternative',
      `${getRoleById(pid).name} started ${opt.name}${granted ? ' with federal co-funding' : ''}`));
  }

  // ── 5. Tick alternatives ────────────────────────────────────────────────
  let newSupplyBonus = supplyBonus;
  alts = alts.map(alt => {
    const opt = getAlternativeById(alt.optionId);
    if (alt.status === 'in_progress') {
      const left = alt.turnsRemaining - 1;
      if (left <= 0) {
        if (opt.effectType === 'supply_increase') newSupplyBonus += opt.effectMagnitude;
        logs.push(makeLog(year, 'alternative', `${opt.name} (${getRoleById(alt.playerId).abbreviation}) is complete`));
        return { ...alt, turnsRemaining: 0, status: 'completed' as const };
      }
      return { ...alt, turnsRemaining: left };
    }
    // Completed temporary effects burn down one active year
    if (opt.effectDuration > 0 && alt.effectTurnsLeft > 0) {
      return { ...alt, effectTurnsLeft: alt.effectTurnsLeft - 1 };
    }
    return alt;
  });

  // ── 6. Reservoir update ─────────────────────────────────────────────────
  const evaporation = Math.max(EVAPORATION_FLOOR, reservoirLevel * EVAPORATION_RATE);
  const reservoirChange = effectiveFlow - totalDiversions - evaporation;
  const newLevel = Math.min(RESERVOIR_CAPACITY, Math.max(0, reservoirLevel + reservoirChange));

  // ── 7. Apply results to players; litigation blocks ──────────────────────
  for (const r of playerResults) {
    const p = P[r.playerId];
    p.publicScore += r.waterScore;
    p.politicalCapital = Math.max(0, p.politicalCapital + r.politicalCapitalChange);
    p.budget = Math.max(0, p.budget + r.budgetChange);
    p.totalDiversionThisGame += r.actualDiversion;
    if (p.litigationBlock > 0) p.litigationBlock -= 1;
  }
  for (const { target } of pendingBlocks) {
    P[target].litigationBlock = LITIGATION_BLOCK_YEARS;
    P[target].wasSued = true;
    P[target].politicalCapital = Math.max(0, P[target].politicalCapital - LITIGATION_TARGET_PC_COST);
  }

  // Bureau stewardship score — TUNING
  const pct = newLevel / RESERVOIR_CAPACITY;
  const bureauResult = playerResults.find(r => r.playerId === 'bureau')!;
  const stewardship = pct >= 0.40 ? 8 : pct >= 0.30 ? 5 : pct >= 0.20 ? 2 : 0;
  P.bureau.publicScore += stewardship;
  bureauResult.waterScore = stewardship;
  bureauResult.notes.push(`Stewardship: reservoir at ${(pct * 100).toFixed(0)}% → +${stewardship} pts`);

  // ── 8. Book the year ────────────────────────────────────────────────────
  const yearResult: YearResult = {
    year,
    flowCardId: currentFlowCard.id,
    naturalFlow: currentFlowCard.naturalFlow,
    effectiveFlow,
    totalDiversions,
    evaporation,
    reservoirChange,
    reservoirLevelAfter: newLevel,
    shortageTierDeclared: bureauDeclaredTier,
    playerResults,
  };

  logs.push(makeLog(year, 'resolution',
    `Year ${year}: flow ${effectiveFlow.toFixed(1)} − diversions ${totalDiversions.toFixed(1)} − evap ${evaporation.toFixed(1)} → reservoir ${newLevel.toFixed(1)} MAF (${(pct * 100).toFixed(0)}%)`));

  const isDeadPool = newLevel <= DEAD_POOL_THRESHOLD;
  const isLastYear = year >= TOTAL_YEARS;
  const gameOver = isDeadPool || isLastYear;

  const history = [...state.yearHistory, yearResult];
  const reservoirHistory = [...state.reservoirHistory, { year, level: newLevel }];
  let finalPlayers = PLAYER_ORDER.map(pid => P[pid]);
  let coordinationBonusEarned = false;

  if (gameOver) {
    if (isDeadPool) {
      logs.push(makeLog(year, 'shortage', 'DEAD POOL. The system has collapsed. Nobody wins.'));
    } else {
      coordinationBonusEarned = reservoirHistory
        .filter(h => h.year > 0)
        .every(h => h.level / RESERVOIR_CAPACITY >= COORDINATION_THRESHOLD);
      if (coordinationBonusEarned) {
        logs.push(makeLog(year, 'agreement',
          `Coordination bonus: reservoir never fell below 30% — +${COORDINATION_BONUS} pts to every player`));
      }
    }
    finalPlayers = finalPlayers.map(p => ({
      ...p,
      privateScore: isDeadPool ? 0 : scorePrivateObjective(p, history, alts),
      publicScore: p.publicScore + (coordinationBonusEarned ? COORDINATION_BONUS : 0),
    }));
  }

  return {
    phase: gameOver ? 'game_over' : 'hydrology',
    year: gameOver ? year : year + 1,
    phaseTimeRemaining: gameOver ? 0 : PHASE_DURATIONS.hydrology,
    phaseTimerActive: !gameOver,
    players: finalPlayers,
    reservoirLevel: newLevel,
    reservoirHistory,
    supplyBonus: newSupplyBonus,
    shortageTier: getTierFromLevel(newLevel),
    climateDrift: climateDrift + CLIMATE_DRIFT_PER_YEAR,
    activeAlternatives: alts,
    federalFunding: fedPot,
    gameLog: [...state.gameLog, ...logs],
    yearHistory: history,
    deadPool: isDeadPool,
    coordinationBonusEarned,
    currentFlowCard: null,
    commitments: {},
    commitmentPlayerIndex: 0,
    bureauDeclaredTier: getTierFromLevel(newLevel),
    bureauFundingTargetId: null,
    bureauFundingOptionId: null,
  };
}

// ─── Private objective scoring (game end, no dead pool) ────────────────────

function scorePrivateObjective(
  player: PlayerState,
  history: YearResult[],
  alts: ActiveAlternative[],
): number {
  const my = (pid: PlayerId) =>
    history.map(y => y.playerResults.find(r => r.playerId === pid)!).filter(Boolean);
  const avgDiv = (pid: PlayerId) => {
    const rs = my(pid);
    return rs.reduce((s, r) => s + r.actualDiversion, 0) / Math.max(rs.length, 1);
  };
  const completed = (pid: PlayerId, optionId: string) =>
    alts.some(a => a.playerId === pid && a.optionId === optionId && a.status === 'completed');
  let pts = 0;

  switch (player.id) {
    case 'bureau': {
      if (history.length >= TOTAL_YEARS) pts += 30; // TUNING
      const avgLevel = history.reduce((s, y) => s + y.reservoirLevelAfter, 0) / history.length;
      if (avgLevel / RESERVOIR_CAPACITY >= 0.40) pts += 20; // TUNING
      const funded = alts.filter(a => a.federallyFunded).length;
      pts += Math.min(15, funded * 5); // TUNING
      break;
    }
    case 'upper_basin': {
      if (avgDiv('upper_basin') >= 5.0) pts += 25; // TUNING
      if (!player.wasSued) pts += 15; // TUNING
      const own = alts.filter(a => a.playerId === 'upper_basin' && a.status === 'completed').length;
      pts += Math.min(15, own * 5); // TUNING
      break;
    }
    case 'california': {
      if (my('california').every(r => r.actualDiversion >= 3.5)) pts += 30; // TUNING
      if (completed('california', 'desalination') || completed('mexico', 'desalination')) pts += 15; // TUNING
      if (player.politicalCapital >= 8) pts += 10; // TUNING
      break;
    }
    case 'arizona_nevada': {
      if (avgDiv('arizona_nevada') >= 2.0) pts += 25; // TUNING
      const grants = alts.filter(a => a.playerId === 'arizona_nevada' && a.federallyFunded).length;
      pts += Math.min(24, grants * 8); // TUNING
      if (completed('arizona_nevada', 'recycled_water') || completed('arizona_nevada', 'conservation')) pts += 10; // TUNING
      break;
    }
    case 'mexico': {
      const treatyKept = my('mexico').every(r =>
        Math.abs(r.actualDiversion - Math.max(0, 1.5 - r.mandatoryCut)) <= 0.15);
      if (treatyKept) pts += 30; // TUNING
      const goodYears = history.filter(y => y.reservoirLevelAfter / RESERVOIR_CAPACITY >= 0.30).length;
      pts += Math.min(30, goodYears * 3); // TUNING
      break;
    }
    case 'tribal': {
      if (completed('tribal', 'tribal_quantification')) pts += 35; // TUNING
      const leases = alts.filter(a =>
        a.playerId === 'tribal' && a.optionId === 'tribal_leasing' && a.status === 'completed').length;
      pts += Math.min(24, leases * 8); // TUNING
      if (player.budget >= 150) pts += 10; // TUNING
      break;
    }
  }
  return pts;
}

// ─── Store ──────────────────────────────────────────────────────────────────

interface GameActions {
  startGame: () => void;
  resetGame: () => void;
  advancePhase: () => void;
  tickTimer: () => void;
  drawCard: () => void;
  setBureauDeclaredTier: (tier: ShortageTier) => void;
  setBureauFunding: (targetId: PlayerId | null, optionId: string | null) => void;
  addAgreement: (text: string, parties: PlayerId[], isBinding: boolean) => void;
  setPlayerCommitment: (commitment: PlayerCommitment) => void;
  advanceCommitmentPlayer: () => void;
  advanceTutorial: () => void;
  dismissTutorial: () => void;
}

export type GameStore = GameState & GameActions;

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...buildInitialState(),

      startGame: () => set({
        ...buildInitialState(),
        phase: 'hydrology',
        phaseTimeRemaining: PHASE_DURATIONS.hydrology,
        phaseTimerActive: true,
        showTutorial: true,
        gameLog: [makeLog(1, 'info', 'Game started. Water Year 1 begins.')],
      }),

      resetGame: () => set(buildInitialState()),

      tickTimer: () => {
        const s = get();
        if (!s.phaseTimerActive || s.showTutorial) return;
        if (s.phase === 'commitment' || s.phase === 'game_over' || s.phase === 'setup') return;
        if (s.phaseTimeRemaining <= 1) {
          get().advancePhase();
        } else {
          set({ phaseTimeRemaining: s.phaseTimeRemaining - 1 });
        }
      },

      advancePhase: () => {
        const s = get();
        switch (s.phase) {
          case 'hydrology': {
            if (!s.currentFlowCard) { get().drawCard(); return; } // auto-draw if timer expires
            set({
              phase: 'federal',
              phaseTimeRemaining: PHASE_DURATIONS.federal,
              phaseTimerActive: true,
            });
            return;
          }
          case 'federal': {
            set({
              phase: 'negotiation',
              phaseTimeRemaining: PHASE_DURATIONS.negotiation,
              phaseTimerActive: true,
              shortageTier: s.bureauDeclaredTier,
              gameLog: [...s.gameLog, makeLog(s.year, 'shortage',
                `Bureau declared Tier ${s.bureauDeclaredTier}` +
                (s.bureauFundingTargetId && s.bureauFundingOptionId
                  ? `; federal grant offered to ${getRoleById(s.bureauFundingTargetId).abbreviation} for ${getAlternativeById(s.bureauFundingOptionId).name}`
                  : ''))],
            });
            return;
          }
          case 'negotiation': {
            set({
              phase: 'commitment',
              phaseTimeRemaining: 0,
              phaseTimerActive: false,
              commitmentPlayerIndex: 0,
              commitments: {},
              players: s.players.map(p => ({ ...p, hasCommittedThisYear: false })),
            });
            return;
          }
          case 'resolution': {
            set(resolveYear(s));
            return;
          }
        }
      },

      drawCard: () => {
        const s = get();
        if (s.currentFlowCard) return;
        let deck = s.hydrologyDeckIds;
        if (deck.length === 0) deck = buildShuffledDeck();
        const [cardId, ...rest] = deck;
        const card = getCardById(cardId);
        set({
          currentFlowCard: card,
          hydrologyDeckIds: rest,
          gameLog: [...s.gameLog, makeLog(s.year, 'info',
            `Hydrology: ${card.name} (${card.historicalYear}) — ${card.naturalFlow.toFixed(1)} MAF natural flow`)],
        });
      },

      setBureauDeclaredTier: (tier) => set({ bureauDeclaredTier: tier }),

      setBureauFunding: (targetId, optionId) =>
        set({ bureauFundingTargetId: targetId, bureauFundingOptionId: optionId }),

      addAgreement: (text, parties, isBinding) => {
        const s = get();
        set({
          agreements: [...s.agreements, { id: makeid(), text, parties, year: s.year, isBinding }],
          gameLog: [...s.gameLog, makeLog(s.year, isBinding ? 'agreement' : 'info',
            `${isBinding ? '[BINDING] ' : '[Informal] '}${text}`)],
        });
      },

      setPlayerCommitment: (commitment) => {
        const s = get();
        set({
          commitments: { ...s.commitments, [commitment.playerId]: commitment },
          players: s.players.map(p =>
            p.id === commitment.playerId ? { ...p, hasCommittedThisYear: true } : p),
        });
      },

      advanceCommitmentPlayer: () => {
        const s = get();
        const next = s.commitmentPlayerIndex + 1;
        if (next >= PLAYER_ORDER.length) {
          set({
            phase: 'resolution',
            phaseTimeRemaining: PHASE_DURATIONS.resolution,
            phaseTimerActive: true,
            commitmentPlayerIndex: 0,
          });
        } else {
          set({ commitmentPlayerIndex: next });
        }
      },

      advanceTutorial: () => set({ tutorialStep: get().tutorialStep + 1 }),
      dismissTutorial: () => set({ showTutorial: false }),
    }),
    {
      name: 'stag-hunt-colorado-v2',
      version: 2,
      partialize: (state) => {
        const {
          startGame: _a, resetGame: _b, advancePhase: _c, tickTimer: _d, drawCard: _e,
          setBureauDeclaredTier: _f, setBureauFunding: _g, addAgreement: _h,
          setPlayerCommitment: _i, advanceCommitmentPlayer: _j,
          advanceTutorial: _k, dismissTutorial: _l,
          ...rest
        } = state;
        return rest;
      },
    },
  ),
);
