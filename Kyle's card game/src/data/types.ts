// Core domain types for Stag Hunt on the Colorado

export type PlayerId =
  | 'bureau'
  | 'upper_basin'
  | 'california'
  | 'arizona_nevada'
  | 'mexico'
  | 'tribal';

export type GamePhase =
  | 'setup'
  | 'hydrology'
  | 'federal'
  | 'negotiation'
  | 'commitment'
  | 'resolution'
  | 'game_over';

export type ShortageTier = 0 | 1 | 2 | 3;

export type DefectionType = 'none' | 'overdraw' | 'refuse_cut' | 'litigation';

export type EffectType =
  | 'demand_reduction_temporary'
  | 'demand_reduction_permanent'
  | 'supply_increase'
  | 'water_lease';

// ─── Static data shapes ────────────────────────────────────────────────────

export interface HydrologyCard {
  id: string;
  name: string;
  historicalYear: number;
  naturalFlow: number;       // MAF — TUNING
  description: string;
  isExtreme: boolean;
  weight: number;            // relative draw probability — TUNING
}

export interface AlternativeOption {
  id: string;
  name: string;
  description: string;
  cost: number;              // $M — TUNING
  leadTurns: number;         // turns until active — TUNING
  effectType: EffectType;
  effectMagnitude: number;   // MAF — TUNING
  effectDuration: number;    // turns; 0 = permanent — TUNING
  eligiblePlayers: PlayerId[];
  requiresFederalFunding: boolean;
}

export interface PlayerRole {
  id: PlayerId;
  name: string;
  abbreviation: string;
  description: string;
  legalBasis: string[];
  baseDiversion: number;           // baseline annual draw MAF — TUNING
  maxDiversion: number;            // legal ceiling MAF — TUNING
  startingBudget: number;          // $M — TUNING
  startingPoliticalCapital: number; // — TUNING
  color: string;                   // hex for UI accent
  powers: string[];
  constraints: string[];
}

export interface ObjectiveCriteria {
  id: string;
  description: string;
  maxPoints: number;               // — TUNING
  checkType: string;
}

export interface PrivateObjective {
  playerId: PlayerId;
  title: string;
  description: string;
  criteria: ObjectiveCriteria[];
}

// ─── Live game shapes ──────────────────────────────────────────────────────

export interface PlayerState {
  id: PlayerId;
  publicScore: number;
  politicalCapital: number;
  budget: number;
  totalDiversionThisGame: number;
  yearlyWaterDelivered: number[];
  demandReduction: number;         // MAF reduction from completed alternatives
  litigationDelay: number;         // turns remaining blocked by litigation
  hasCommittedThisYear: boolean;
  activeAlternativeIds: string[];
}

export interface PlayerCommitment {
  playerId: PlayerId;
  intendedDiversion: number;
  defectionType: DefectionType;
  litigationTarget: PlayerId | null;
  alternativeOptionId: string | null;
  federalFundingTargetId: PlayerId | null; // Bureau only: who gets funded
}

export interface ActiveAlternative {
  id: string;
  optionId: string;
  playerId: PlayerId;
  fundedBy: PlayerId;
  turnsRemaining: number;
  status: 'in_progress' | 'completed';
  effectType: EffectType;
  effectMagnitude: number;
  effectDuration: number;
  effectTurnsLeft: number; // for temporary effects
}

export interface Agreement {
  id: string;
  text: string;
  parties: PlayerId[];
  year: number;
  isBinding: boolean;
}

export interface LitigationCase {
  id: string;
  filer: PlayerId;
  target: PlayerId;
  year: number;
  turnsRemaining: number;          // TUNING
  description: string;
}

export interface PlayerYearResult {
  playerId: PlayerId;
  intendedDiversion: number;
  actualDiversion: number;
  mandatoryCut: number;
  defectionType: DefectionType;
  waterScore: number;
  politicalCapitalChange: number;
  budgetSpent: number;
  notes: string[];
}

export interface YearResult {
  year: number;
  flowCardId: string;
  naturalFlow: number;
  effectiveFlow: number;
  totalDiversions: number;
  evaporation: number;
  reservoirChange: number;
  reservoirLevelAfter: number;
  shortageTierAfter: ShortageTier;
  playerResults: PlayerYearResult[];
}

export interface LogEntry {
  id: string;
  year: number;
  phase: GamePhase;
  type: 'info' | 'agreement' | 'defection' | 'litigation' | 'resolution' | 'alternative' | 'shortage';
  text: string;
}

// ─── Top-level game state ──────────────────────────────────────────────────

export interface GameState {
  phase: GamePhase;
  year: number;                    // 1–10
  phaseTimeRemaining: number;      // seconds
  phaseTimerActive: boolean;

  reservoirLevel: number;          // MAF
  reservoirHistory: Array<{ year: number; level: number }>;
  supplyBonus: number;             // MAF from completed supply-increase alternatives

  currentFlowCard: HydrologyCard | null;
  shortageTier: ShortageTier;
  climateDrift: number;            // cumulative negative modifier, grows each year

  players: PlayerState[];

  // Commitment sub-phase
  commitmentPlayerIndex: number;   // 0–5
  commitments: Partial<Record<PlayerId, PlayerCommitment>>;

  // Federal phase inputs
  bureauDeclaredTier: ShortageTier;
  bureauFundingTargetId: PlayerId | null;
  bureauFundingOptionId: string | null;

  bindingAgreements: Agreement[];
  negotiationNote: string;

  activeAlternatives: ActiveAlternative[];
  activeLitigation: LitigationCase[];
  federalFunding: number;          // Bureau's remaining budget $M

  gameLog: LogEntry[];
  yearHistory: YearResult[];

  showTutorial: boolean;
  tutorialStep: number;

  hydrologyDeckIds: string[];      // remaining card IDs (shuffled)
  usedCardIds: string[];
}
