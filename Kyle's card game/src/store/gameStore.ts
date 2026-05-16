import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  GameState, GamePhase, PlayerId, PlayerState, PlayerCommitment,
  ShortageTier, YearResult, PlayerYearResult, LogEntry, Agreement,
  ActiveAlternative, LitigationCase, HydrologyCard,
} from '../data/types';
import { ROLES, PLAYER_ORDER, getRoleById } from '../data/roles';
import { buildShuffledDeck, getCardById } from '../data/hydrology';
import { ALTERNATIVES, getAlternativeById } from '../data/alternatives';
import { COORDINATION_BONUS } from '../data/objectives';

// ─── Constants ─────────────────────────────────────────────────────────────

// TUNING: Reservoir geometry (Lake Mead + Lake Powell combined)
const RESERVOIR_CAPACITY = 52;        // MAF total capacity
const RESERVOIR_START = 26;           // MAF starting level (~50%)
const DEAD_POOL_THRESHOLD = 4.16;     // MAF (8% of capacity)
const COORDINATION_BONUS_THRESHOLD = 0.30; // reservoir fraction — TUNING

// TUNING: Evaporation as fraction of current level per year
const EVAPORATION_RATE = 0.04;        // 4% — TUNING

// TUNING: Climate drift per year (negative; cumulative, applied to effective flow)
const CLIMATE_DRIFT_PER_YEAR = -0.1;  // MAF — TUNING

// TUNING: Federal funding pool available at game start ($M)
const FEDERAL_FUNDING_START = 500;    // — TUNING

// TUNING: Federal funding reduces alternative cost by this fraction when approved
const FEDERAL_FUNDING_DISCOUNT = 0.5; // 50% discount — TUNING

// TUNING: Phase durations in seconds
export const PHASE_DURATIONS: Record<string, number> = {
  hydrology: 60,
  federal: 120,
  negotiation: 240,
  commitment: 0,   // no global timer during commitment (per-player flow)
  resolution: 90,
};

// TUNING: Shortage tier mandatory cuts (MAF) per player per tier
function getTierCuts(tier: ShortageTier): Partial<Record<PlayerId, number>> {
  switch (tier) {
    case 0: return {};
    case 1: return { arizona_nevada: 0.5, mexico: 0.1 };
    case 2: return { arizona_nevada: 1.0, california: 0.2, mexico: 0.2 };
    case 3: return { arizona_nevada: 1.5, california: 0.5, mexico: 0.3, upper_basin: 0.5 };
    default: return {};
  }
}

function getTierFromLevel(level: number): ShortageTier {
  const pct = level / RESERVOIR_CAPACITY;
  if (pct > 0.40) return 0;
  if (pct > 0.30) return 1;
  if (pct > 0.20) return 2;
  return 3;
}

function makeid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function makeLog(
  year: number,
  phase: GamePhase,
  type: LogEntry['type'],
  text: string,
): LogEntry {
  return { id: makeid(), year, phase, type, text };
}

// ─── Initial state ──────────────────────────────────────────────────────────

function buildInitialPlayers(): PlayerState[] {
  return ROLES.map(role => ({
    id: role.id,
    publicScore: 0,
    politicalCapital: role.startingPoliticalCapital,
    budget: role.startingBudget,
    totalDiversionThisGame: 0,
    yearlyWaterDelivered: [],
    demandReduction: 0,
    litigationDelay: 0,
    hasCommittedThisYear: false,
    activeAlternativeIds: [],
  }));
}

const INITIAL_STATE: GameState = {
  phase: 'setup',
  year: 1,
  phaseTimeRemaining: 0,
  phaseTimerActive: false,

  reservoirLevel: RESERVOIR_START,
  reservoirHistory: [{ year: 0, level: RESERVOIR_START }],
  supplyBonus: 0,

  currentFlowCard: null,
  shortageTier: 0,
  climateDrift: 0,

  players: buildInitialPlayers(),

  commitmentPlayerIndex: 0,
  commitments: {},

  bureauDeclaredTier: 0,
  bureauFundingTargetId: null,
  bureauFundingOptionId: null,

  bindingAgreements: [],
  negotiationNote: '',

  activeAlternatives: [],
  activeLitigation: [],
  federalFunding: FEDERAL_FUNDING_START,

  gameLog: [],
  yearHistory: [],

  showTutorial: false,
  tutorialStep: 0,

  hydrologyDeckIds: buildShuffledDeck(),
  usedCardIds: [],
};

// ─── Store actions ──────────────────────────────────────────────────────────

interface GameActions {
  // Game lifecycle
  startGame: () => void;
  resetGame: () => void;

  // Phase management
  advancePhase: () => void;
  tickTimer: () => void;

  // Hydrology phase
  drawCard: () => void;

  // Federal phase
  setBureauDeclaredTier: (tier: ShortageTier) => void;
  setBureauFunding: (targetId: PlayerId | null, optionId: string | null) => void;

  // Negotiation phase
  addAgreement: (text: string, parties: PlayerId[], isBinding: boolean) => void;
  setNegotiationNote: (note: string) => void;

  // Commitment phase
  setPlayerCommitment: (commitment: PlayerCommitment) => void;
  advanceCommitmentPlayer: () => void;

  // Tutorial
  advanceTutorial: () => void;
  dismissTutorial: () => void;
}

// ─── Resolution logic ───────────────────────────────────────────────────────

function resolveYearLogic(state: GameState): Partial<GameState> {
  const {
    currentFlowCard, players, commitments, bureauDeclaredTier,
    reservoirLevel, climateDrift, activeAlternatives, activeLitigation,
    supplyBonus, year, gameLog, yearHistory, reservoirHistory,
    federalFunding, bureauFundingTargetId, bureauFundingOptionId,
  } = state;

  if (!currentFlowCard) return {};

  // 1. Compute effective flow
  // TUNING: supply alternatives (desalination) add to effective flow permanently
  const effectiveFlow = Math.max(0, currentFlowCard.naturalFlow + climateDrift + supplyBonus);

  // 2. Mandatory cuts from Bureau tier
  const tierCuts = getTierCuts(bureauDeclaredTier);

  // 3. Process each player's commitment → actual diversion
  const playerResults: PlayerYearResult[] = [];
  let totalDiversions = 0;
  const newLitigation: LitigationCase[] = [];
  let newFederalFunding = federalFunding;

  const updatedPlayers = players.map(p => ({ ...p, hasCommittedThisYear: false }));

  // Track water leases for this year
  const activeLeaseBenefits: Partial<Record<PlayerId, number>> = {};
  for (const alt of activeAlternatives) {
    if (alt.status === 'completed' && alt.effectType === 'water_lease' && alt.effectTurnsLeft > 0) {
      // Lease credit goes to whoever the tribal player leased to — stored in alt.playerId convention:
      // for leases, playerId is the lessee (set during commitment)
      const lessee = alt.playerId;
      activeLeaseBenefits[lessee] = (activeLeaseBenefits[lessee] ?? 0) + alt.effectMagnitude;
    }
  }

  for (const playerId of PLAYER_ORDER) {
    const role = getRoleById(playerId);
    const playerIdx = updatedPlayers.findIndex(p => p.id === playerId);
    const player = updatedPlayers[playerIdx];
    const commitment = commitments[playerId];
    const notes: string[] = [];
    let pcChange = 0;
    let budgetSpent = 0;

    if (playerId === 'bureau') {
      // Bureau: process federal funding allocation
      if (bureauFundingTargetId && bureauFundingOptionId) {
        const option = ALTERNATIVES.find(a => a.id === bureauFundingOptionId);
        if (option && newFederalFunding >= option.cost * FEDERAL_FUNDING_DISCOUNT) {
          newFederalFunding -= option.cost * FEDERAL_FUNDING_DISCOUNT;
          notes.push(`Federal funding allocated to ${bureauFundingTargetId} for ${option.name}`);
        }
      }
      playerResults.push({
        playerId, intendedDiversion: 0, actualDiversion: 0,
        mandatoryCut: 0, defectionType: 'none',
        waterScore: 0, politicalCapitalChange: pcChange, budgetSpent, notes,
      });
      continue;
    }

    if (!commitment) {
      // Player didn't commit — takes baseline diversion (natural)
      const actual = Math.max(0, role.baseDiversion - (tierCuts[playerId] ?? 0) - player.demandReduction);
      totalDiversions += actual;
      playerResults.push({
        playerId, intendedDiversion: role.baseDiversion, actualDiversion: actual,
        mandatoryCut: tierCuts[playerId] ?? 0, defectionType: 'none',
        waterScore: Math.round((actual / Math.max(role.baseDiversion, 0.1)) * 10),
        politicalCapitalChange: 0, budgetSpent: 0, notes: ['No commitment recorded — baseline applied'],
      });
      continue;
    }

    // Litigation delay: player is blocked
    if (player.litigationDelay > 0) {
      notes.push('Blocked by litigation — cannot divert this year');
      playerResults.push({
        playerId, intendedDiversion: commitment.intendedDiversion, actualDiversion: 0,
        mandatoryCut: 0, defectionType: commitment.defectionType,
        waterScore: -5, politicalCapitalChange: -1, budgetSpent: 0, notes,
      });
      continue;
    }

    let actualDiversion = commitment.intendedDiversion;
    const mandatoryCut = tierCuts[playerId] ?? 0;
    const defType = commitment.defectionType;

    if (defType === 'overdraw') {
      // TUNING: overdraw adds 20% on top of intended; costs PC and violates compact
      actualDiversion = Math.min(commitment.intendedDiversion * 1.2, role.maxDiversion);
      pcChange -= 2; // TUNING
      notes.push('Overdraw: +20% water, -2 PC');
    } else if (defType === 'refuse_cut') {
      // Takes intended amount ignoring mandatory cut; costs PC
      pcChange -= 2; // TUNING
      notes.push(`Refused shortage cut of ${mandatoryCut.toFixed(1)} MAF, -2 PC`);
    } else if (defType === 'litigation') {
      // Files suit; costs own PC, targets opponent
      pcChange -= 3; // TUNING
      if (commitment.litigationTarget) {
        newLitigation.push({
          id: `lit_${makeid()}`,
          filer: playerId,
          target: commitment.litigationTarget,
          year,
          turnsRemaining: 2, // TUNING: 2-turn block
          description: `${role.name} filed suit against ${getRoleById(commitment.litigationTarget).name}`,
        });
        notes.push(`Filed litigation against ${commitment.litigationTarget}: -3 PC; target blocked 2 turns`);
      }
    } else {
      // Normal: apply mandatory cut
      actualDiversion = Math.max(0, commitment.intendedDiversion - mandatoryCut);
      if (mandatoryCut > 0) notes.push(`Mandatory Tier ${bureauDeclaredTier} cut: -${mandatoryCut.toFixed(1)} MAF`);
    }

    // Apply demand reduction from completed alternatives
    actualDiversion = Math.max(0, actualDiversion - player.demandReduction);
    // Lease credits allow drawing from Tribal's share
    const leaseCredit = activeLeaseBenefits[playerId] ?? 0;
    actualDiversion = Math.min(actualDiversion + leaseCredit, role.maxDiversion);
    if (leaseCredit > 0) notes.push(`Water lease credit: +${leaseCredit.toFixed(1)} MAF`);

    // Alternative investment
    let alternativeId: string | null = null;
    if (commitment.alternativeOptionId) {
      const option = ALTERNATIVES.find(a => a.id === commitment.alternativeOptionId);
      const isFederallyFunded = bureauFundingTargetId === playerId &&
        bureauFundingOptionId === commitment.alternativeOptionId;
      if (option) {
        const cost = isFederallyFunded ? option.cost * FEDERAL_FUNDING_DISCOUNT : option.cost;
        if (player.budget >= cost || (option.id === 'tribal_leasing' && player.politicalCapital >= 3)) {
          if (option.id === 'tribal_leasing') {
            pcChange -= 3; // political cost for tribal leasing
          } else {
            budgetSpent += cost;
          }
          alternativeId = option.id;
          notes.push(`Started ${option.name} (${option.leadTurns} turn lead time)`);
        }
      }
    }

    // TUNING: water score = delivery ratio × 10 (max 10 pts per year)
    const deliveryRatio = role.baseDiversion > 0
      ? Math.min(1.2, actualDiversion / role.baseDiversion)
      : 0;
    const waterScore = Math.round(deliveryRatio * 10);

    totalDiversions += actualDiversion;

    // Cooperation bonus for not defecting when tier > 0
    if (defType === 'none' && bureauDeclaredTier > 0 && mandatoryCut > 0) {
      pcChange += 1; // TUNING: +1 PC for accepting mandatory cuts gracefully
    }

    updatedPlayers[playerIdx] = {
      ...updatedPlayers[playerIdx],
      budget: Math.max(0, player.budget - budgetSpent),
      politicalCapital: Math.max(0, player.politicalCapital + pcChange),
      publicScore: player.publicScore + waterScore,
      totalDiversionThisGame: player.totalDiversionThisGame + actualDiversion,
      yearlyWaterDelivered: [...player.yearlyWaterDelivered, actualDiversion],
    };

    // Start alternative if chosen
    if (alternativeId) {
      const option = getAlternativeById(alternativeId);
      const newAlt: ActiveAlternative = {
        id: `alt_${makeid()}`,
        optionId: alternativeId,
        playerId,
        fundedBy: bureauFundingTargetId === playerId ? 'bureau' : playerId,
        turnsRemaining: option.leadTurns,
        status: 'in_progress',
        effectType: option.effectType,
        effectMagnitude: option.effectMagnitude,
        effectDuration: option.effectDuration,
        effectTurnsLeft: option.effectDuration,
      };
      updatedPlayers[playerIdx].activeAlternativeIds = [
        ...updatedPlayers[playerIdx].activeAlternativeIds,
        newAlt.id,
      ];
    }

    playerResults.push({
      playerId, intendedDiversion: commitment.intendedDiversion,
      actualDiversion, mandatoryCut, defectionType: defType,
      waterScore, politicalCapitalChange: pcChange, budgetSpent, notes,
    });
  }

  // 4. Evaporation
  // TUNING: evaporation as fraction of current reservoir level
  const evaporation = Math.max(0.3, reservoirLevel * EVAPORATION_RATE);

  // 5. Reservoir update
  const reservoirChange = effectiveFlow - totalDiversions - evaporation;
  const newReservoirLevel = Math.min(
    RESERVOIR_CAPACITY,
    Math.max(0, reservoirLevel + reservoirChange),
  );
  const newTier = getTierFromLevel(newReservoirLevel);

  // 6. Process litigation: apply delays to targets
  const previousLitigation = activeLitigation.map(l => ({
    ...l, turnsRemaining: l.turnsRemaining - 1,
  })).filter(l => l.turnsRemaining > 0);

  for (const lit of newLitigation) {
    const idx = updatedPlayers.findIndex(p => p.id === lit.target);
    if (idx >= 0) {
      updatedPlayers[idx] = {
        ...updatedPlayers[idx],
        litigationDelay: lit.turnsRemaining,
        politicalCapital: Math.max(0, updatedPlayers[idx].politicalCapital - 1),
      };
    }
  }

  // Also tick existing litigation delays
  for (const p of updatedPlayers) {
    const idx = updatedPlayers.findIndex(u => u.id === p.id);
    if (p.litigationDelay > 0) {
      updatedPlayers[idx] = { ...updatedPlayers[idx], litigationDelay: p.litigationDelay - 1 };
    }
  }

  // 7. Process alternatives (tick down, complete, apply permanent effects)
  let newSupplyBonus = supplyBonus;
  const updatedAlternatives: ActiveAlternative[] = [];

  // First, handle newly started alternatives from this turn's commitments
  const thisYearNewAlts: ActiveAlternative[] = [];
  for (const playerId of PLAYER_ORDER) {
    const commitment = commitments[playerId];
    if (commitment?.alternativeOptionId) {
      const option = ALTERNATIVES.find(a => a.id === commitment.alternativeOptionId);
      const isFederallyFunded = bureauFundingTargetId === playerId &&
        bureauFundingOptionId === commitment.alternativeOptionId;
      if (option) {
        const cost = isFederallyFunded ? option.cost * FEDERAL_FUNDING_DISCOUNT : option.cost;
        const playerIdx = updatedPlayers.findIndex(p => p.id === playerId);
        const canAfford = option.id === 'tribal_leasing'
          ? players.find(p => p.id === playerId)!.politicalCapital >= 3
          : players.find(p => p.id === playerId)!.budget >= cost;
        if (canAfford) {
          thisYearNewAlts.push({
            id: `alt_${makeid()}`,
            optionId: commitment.alternativeOptionId,
            playerId,
            fundedBy: isFederallyFunded ? 'bureau' : playerId,
            turnsRemaining: option.leadTurns,
            status: option.leadTurns === 0 ? 'completed' : 'in_progress',
            effectType: option.effectType,
            effectMagnitude: option.effectMagnitude,
            effectDuration: option.effectDuration,
            effectTurnsLeft: option.effectDuration || 999,
          });
          // Update player active list
          if (!updatedPlayers[playerIdx].activeAlternativeIds.includes(thisYearNewAlts[thisYearNewAlts.length - 1].id)) {
            updatedPlayers[playerIdx] = {
              ...updatedPlayers[playerIdx],
              activeAlternativeIds: [
                ...updatedPlayers[playerIdx].activeAlternativeIds,
                thisYearNewAlts[thisYearNewAlts.length - 1].id,
              ],
            };
          }
        }
      }
    }
  }

  for (const alt of [...activeAlternatives, ...thisYearNewAlts]) {
    if (alt.status === 'completed') {
      // Tick temporary effect duration
      if (alt.effectDuration > 0 && alt.effectTurnsLeft > 0) {
        const remaining = alt.effectTurnsLeft - 1;
        if (remaining > 0) {
          updatedAlternatives.push({ ...alt, effectTurnsLeft: remaining });
        }
        // else expired — drop it
      } else {
        updatedAlternatives.push(alt); // permanent — keep forever
      }
    } else {
      const newTurns = alt.turnsRemaining - 1;
      if (newTurns <= 0) {
        // Just completed
        const completed: ActiveAlternative = { ...alt, turnsRemaining: 0, status: 'completed' };
        updatedAlternatives.push(completed);

        // Apply permanent effects
        if (alt.effectType === 'demand_reduction_permanent') {
          const idx = updatedPlayers.findIndex(p => p.id === alt.playerId);
          if (idx >= 0) {
            updatedPlayers[idx] = {
              ...updatedPlayers[idx],
              demandReduction: updatedPlayers[idx].demandReduction + alt.effectMagnitude,
            };
          }
        } else if (alt.effectType === 'supply_increase') {
          newSupplyBonus += alt.effectMagnitude;
        }
      } else {
        updatedAlternatives.push({ ...alt, turnsRemaining: newTurns });
      }
    }
  }

  // 8. Check dead pool
  const isDeadPool = newReservoirLevel <= DEAD_POOL_THRESHOLD;
  const isLastYear = year >= 10;

  // 9. Year result
  const yearResult: YearResult = {
    year,
    flowCardId: currentFlowCard.id,
    naturalFlow: currentFlowCard.naturalFlow,
    effectiveFlow,
    totalDiversions,
    evaporation,
    reservoirChange,
    reservoirLevelAfter: newReservoirLevel,
    shortageTierAfter: newTier,
    playerResults,
  };

  // 10. Compute private objective scores at end of game
  let finalPlayerStates = updatedPlayers;
  if (isDeadPool || isLastYear) {
    finalPlayerStates = computePrivateScores(updatedPlayers, yearHistory.concat(yearResult), newReservoirLevel, updatedAlternatives);

    // Coordination bonus: if reservoir stayed above 30% every recorded turn
    const allAbove30 = [...reservoirHistory, { year, level: newReservoirLevel }]
      .filter(h => h.year > 0)
      .every(h => h.level / RESERVOIR_CAPACITY >= COORDINATION_BONUS_THRESHOLD);
    if (allAbove30 && !isDeadPool) {
      finalPlayerStates = finalPlayerStates.map(p => ({
        ...p,
        publicScore: p.publicScore + COORDINATION_BONUS, // TUNING
      }));
    }
  }

  // 11. Logs
  const newLogs: LogEntry[] = [
    ...gameLog,
    makeLog(year, 'resolution', 'resolution',
      `Year ${year}: Flow ${effectiveFlow.toFixed(1)} MAF — Diversions ${totalDiversions.toFixed(1)} MAF — Reservoir ${reservoirChange >= 0 ? '+' : ''}${reservoirChange.toFixed(1)} → ${newReservoirLevel.toFixed(1)} MAF (${(newReservoirLevel / RESERVOIR_CAPACITY * 100).toFixed(0)}%)`),
  ];
  for (const lit of newLitigation) {
    newLogs.push(makeLog(year, 'resolution', 'litigation', lit.description));
  }

  const nextPhase: GamePhase = (isDeadPool || isLastYear) ? 'game_over' : 'hydrology';
  const nextYear = isLastYear || isDeadPool ? year : year + 1;

  return {
    phase: nextPhase,
    year: nextYear,
    phaseTimeRemaining: nextPhase === 'hydrology' ? PHASE_DURATIONS.hydrology : 0,
    phaseTimerActive: nextPhase === 'hydrology',
    players: finalPlayerStates,
    reservoirLevel: newReservoirLevel,
    reservoirHistory: [...reservoirHistory, { year, level: newReservoirLevel }],
    supplyBonus: newSupplyBonus,
    shortageTier: newTier,
    climateDrift: climateDrift + CLIMATE_DRIFT_PER_YEAR,
    activeAlternatives: updatedAlternatives,
    activeLitigation: [...previousLitigation, ...newLitigation],
    federalFunding: newFederalFunding,
    gameLog: newLogs,
    yearHistory: [...yearHistory, yearResult],
    currentFlowCard: null,
    commitments: {},
    commitmentPlayerIndex: 0,
    bureauDeclaredTier: newTier, // pre-fill for next turn
    bureauFundingTargetId: null,
    bureauFundingOptionId: null,
  };
}

// ─── Private objective scoring ─────────────────────────────────────────────

function computePrivateScores(
  players: PlayerState[],
  history: YearResult[],
  _finalReservoir: number,
  alternatives: ActiveAlternative[],
): PlayerState[] {
  return players.map(player => {
    let privateScore = 0;

    switch (player.id) {
      case 'bureau': {
        // Survived 10 years
        if (history.length >= 10) privateScore += 30; // TUNING
        // Avg reservoir above 40%
        const avgLevel = history.reduce((s, y) => s + y.reservoirLevelAfter, 0) / history.length;
        if (avgLevel / RESERVOIR_CAPACITY >= 0.40) privateScore += 20; // TUNING
        // Alternatives funded (funded by bureau)
        const altsFunded = alternatives.filter(a => a.fundedBy === 'bureau').length;
        privateScore += Math.min(15, altsFunded * 5); // TUNING
        break;
      }
      case 'upper_basin': {
        const myHistory = history.map(y => y.playerResults.find(r => r.playerId === 'upper_basin')!).filter(Boolean);
        const avgDiv = myHistory.reduce((s, r) => s + r.actualDiversion, 0) / Math.max(myHistory.length, 1);
        if (avgDiv >= 5.0) privateScore += 25; // TUNING
        // Never targeted by successful litigation
        const litigated = history.some(y => y.playerResults.find(
          r => r.playerId === 'upper_basin' && r.notes.some(n => n.includes('Blocked by litigation')),
        ));
        if (!litigated) privateScore += 15; // TUNING
        const ownAlts = alternatives.filter(a => a.playerId === 'upper_basin' && a.status === 'completed').length;
        privateScore += Math.min(15, ownAlts * 5); // TUNING
        break;
      }
      case 'california': {
        const caHistory = history.map(y => y.playerResults.find(r => r.playerId === 'california')!).filter(Boolean);
        const neverBelow35 = caHistory.every(r => r.actualDiversion >= 3.5);
        if (neverBelow35) privateScore += 30; // TUNING
        const desal = alternatives.some(a => a.optionId === 'desalination' && a.status === 'completed'
          && history.findIndex(y => y.year === 7) >= (alternatives.indexOf(a)));
        if (desal) privateScore += 15; // TUNING
        if (player.politicalCapital >= 8) privateScore += 10; // TUNING
        break;
      }
      case 'arizona_nevada': {
        const azHistory = history.map(y => y.playerResults.find(r => r.playerId === 'arizona_nevada')!).filter(Boolean);
        const avgAz = azHistory.reduce((s, r) => s + r.actualDiversion, 0) / Math.max(azHistory.length, 1);
        if (avgAz >= 2.0) privateScore += 25; // TUNING
        const fedFunded = alternatives.filter(a => a.fundedBy === 'bureau' && a.playerId === 'arizona_nevada').length;
        privateScore += Math.min(24, fedFunded * 8); // TUNING
        const hasRecycled = alternatives.some(a =>
          (a.optionId === 'recycled_water' || a.optionId === 'conservation') &&
          a.playerId === 'arizona_nevada' && a.status === 'completed');
        if (hasRecycled) privateScore += 10; // TUNING
        break;
      }
      case 'mexico': {
        const mxHistory = history.map(y => y.playerResults.find(r => r.playerId === 'mexico')!).filter(Boolean);
        const treatyRespected = mxHistory.every(r => Math.abs(r.actualDiversion - 1.5) <= 0.15);
        if (treatyRespected) privateScore += 30; // TUNING
        const yearsAbove30 = history.filter(y => y.reservoirLevelAfter / RESERVOIR_CAPACITY >= 0.30).length;
        privateScore += Math.min(30, yearsAbove30 * 3); // TUNING
        break;
      }
      case 'tribal': {
        // Rights quantification: look for a specific alternative or game log marker
        const quantified = alternatives.some(a => a.optionId === 'tribal_leasing' && a.status === 'completed' && a.effectTurnsLeft > 0);
        if (quantified) privateScore += 35; // TUNING (real quantification not yet modeled as separate alternative)
        const leases = alternatives.filter(a => a.optionId === 'tribal_leasing' && a.status === 'completed').length;
        privateScore += Math.min(24, leases * 8); // TUNING
        break;
      }
    }

    return { ...player, publicScore: player.publicScore + privateScore };
  });
}

// ─── Zustand store ──────────────────────────────────────────────────────────

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      startGame: () => {
        set({
          ...INITIAL_STATE,
          hydrologyDeckIds: buildShuffledDeck(),
          players: buildInitialPlayers(),
          phase: 'hydrology',
          year: 1,
          phaseTimeRemaining: PHASE_DURATIONS.hydrology,
          phaseTimerActive: true,
          showTutorial: true,
          tutorialStep: 0,
          gameLog: [makeLog(1, 'hydrology', 'info', 'Game started. Water Year 1 begins.')],
        });
      },

      resetGame: () => set({ ...INITIAL_STATE }),

      tickTimer: () => {
        const { phaseTimeRemaining, phaseTimerActive, phase } = get();
        if (!phaseTimerActive || phase === 'commitment' || phase === 'game_over' || phase === 'setup') return;
        if (phaseTimeRemaining <= 1) {
          get().advancePhase();
        } else {
          set({ phaseTimeRemaining: phaseTimeRemaining - 1 });
        }
      },

      advancePhase: () => {
        const state = get();
        const { phase, year, bureauDeclaredTier } = state;

        const transitions: Partial<Record<GamePhase, () => Partial<GameState>>> = {
          hydrology: () => ({
            phase: 'federal',
            phaseTimeRemaining: PHASE_DURATIONS.federal,
            phaseTimerActive: true,
          }),
          federal: () => ({
            phase: 'negotiation',
            phaseTimeRemaining: PHASE_DURATIONS.negotiation,
            phaseTimerActive: true,
            shortageTier: bureauDeclaredTier,
            gameLog: [...state.gameLog, makeLog(year, 'federal', 'shortage',
              `Bureau declared Tier ${bureauDeclaredTier} shortage`)],
          }),
          negotiation: () => ({
            phase: 'commitment',
            phaseTimeRemaining: 0,
            phaseTimerActive: false,
            commitmentPlayerIndex: 0,
            commitments: {},
            gameLog: [...state.gameLog, makeLog(year, 'negotiation', 'info', 'Negotiation complete. Commitment phase begins.')],
          }),
          resolution: () => resolveYearLogic(state),
        };

        const transition = transitions[phase];
        if (transition) {
          set(transition() as Partial<GameState & GameActions>);
        }
      },

      drawCard: () => {
        const state = get();
        if (state.currentFlowCard) return; // already drawn

        let { hydrologyDeckIds, usedCardIds } = state;
        if (hydrologyDeckIds.length === 0) {
          // Reshuffle
          hydrologyDeckIds = buildShuffledDeck();
          usedCardIds = [];
        }

        const [cardId, ...remaining] = hydrologyDeckIds;
        const card = getCardById(cardId);

        set({
          currentFlowCard: card,
          hydrologyDeckIds: remaining,
          usedCardIds: [...usedCardIds, cardId],
          gameLog: [...state.gameLog, makeLog(state.year, 'hydrology', 'info',
            `Hydrology: ${card.name} (${card.historicalYear}) — ${card.naturalFlow.toFixed(1)} MAF natural flow`)],
        });
      },

      setBureauDeclaredTier: (tier) => set({ bureauDeclaredTier: tier }),

      setBureauFunding: (targetId, optionId) =>
        set({ bureauFundingTargetId: targetId, bureauFundingOptionId: optionId }),

      addAgreement: (text, parties, isBinding) => {
        const state = get();
        const agreement: Agreement = {
          id: makeid(),
          text,
          parties,
          year: state.year,
          isBinding,
        };
        const logType = isBinding ? 'agreement' : 'info';
        set({
          bindingAgreements: [...state.bindingAgreements, agreement],
          gameLog: [...state.gameLog, makeLog(state.year, 'negotiation', logType,
            `${isBinding ? '[BINDING]' : '[Informal]'} ${text}`)],
        });
      },

      setNegotiationNote: (note) => set({ negotiationNote: note }),

      setPlayerCommitment: (commitment) => {
        const state = get();
        set({
          commitments: { ...state.commitments, [commitment.playerId]: commitment },
          players: state.players.map(p =>
            p.id === commitment.playerId ? { ...p, hasCommittedThisYear: true } : p,
          ),
        });
      },

      advanceCommitmentPlayer: () => {
        const state = get();
        const nextIndex = state.commitmentPlayerIndex + 1;
        if (nextIndex >= PLAYER_ORDER.length) {
          // All players committed — move to resolution
          set({
            phase: 'resolution',
            phaseTimeRemaining: PHASE_DURATIONS.resolution,
            phaseTimerActive: true,
            commitmentPlayerIndex: 0,
          });
        } else {
          set({ commitmentPlayerIndex: nextIndex });
        }
      },

      advanceTutorial: () => {
        const { tutorialStep } = get();
        set({ tutorialStep: tutorialStep + 1 });
      },

      dismissTutorial: () => set({ showTutorial: false }),
    }),
    {
      name: 'stag-hunt-colorado-state',
      // Only persist non-function fields
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { startGame, resetGame, advancePhase, tickTimer, drawCard,
          setBureauDeclaredTier, setBureauFunding, addAgreement, setNegotiationNote,
          setPlayerCommitment, advanceCommitmentPlayer, advanceTutorial, dismissTutorial,
          ...rest } = state;
        return rest;
      },
    },
  ),
);

// Selectors
export const selectPlayer = (state: GameState, id: PlayerId): PlayerState =>
  state.players.find(p => p.id === id)!;

export const selectCurrentCommitmentPlayer = (state: GameState): PlayerId =>
  PLAYER_ORDER[state.commitmentPlayerIndex];

export const selectReservoirPct = (state: GameState): number =>
  state.reservoirLevel / RESERVOIR_CAPACITY;

export const selectIsDeadPool = (state: GameState): boolean =>
  state.reservoirLevel <= DEAD_POOL_THRESHOLD;

export { RESERVOIR_CAPACITY, DEAD_POOL_THRESHOLD, getTierFromLevel, getTierCuts };
export type { HydrologyCard };
