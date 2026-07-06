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
  | 'demand_reduction_temporary'   // reduces owner's diversion need for N years
  | 'demand_reduction_permanent'   // reduces owner's diversion need forever
  | 'supply_increase'              // adds to effective flow forever
  | 'water_lease'                  // transfers water from Tribal to a lessee for N years
  | 'quantification';              // Tribal rights quantification (scores, no water effect)

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
  pcCost: number;            // political capital cost — TUNING
  leadTurns: number;         // resolutions until active — TUNING
  effectType: EffectType;
  effectMagnitude: number;   // MAF — TUNING
  effectDuration: number;    // active years once complete; 0 = permanent — TUNING
  eligiblePlayers: PlayerId[];
  requiresFederalFunding: boolean; // too expensive without a federal grant
}

export interface PlayerRole {
  id: PlayerId;
  name: string;
  abbreviation: string;
  description: string;
  legalBasis: string[];
  baseDiversion: number;            // baseline annual draw MAF — TUNING
  maxDiversion: number;             // legal ceiling MAF — TUNING
  startingBudget: number;           // $M — TUNING
  startingPoliticalCapital: number; // — TUNING
  color: string;
  powers: string[];
  constraints: string[];
}

export interface ObjectiveCriteria {
  id: string;
  description: string;
  maxPoints: number; // — TUNING
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
  publicScore: number;          // accumulated water-delivery points
  privateScore: number;         // filled in at game end
  politicalCapital: number;
  budget: number;
  totalDiversionThisGame: number;
  litigationBlock: number;      // years remaining unable to defect/invest
  wasSued: boolean;             // ever targeted by litigation
  hasCommittedThisYear: boolean;
}

export interface PlayerCommitment {
  playerId: PlayerId;
  intendedDiversion: number;
  defectionType: DefectionType;
  litigationTarget: PlayerId | null;
  alternativeOptionId: string | null;
  leaseTargetId: PlayerId | null;   // tribal leasing: who receives the water
}

export interface ActiveAlternative {
  id: string;
  optionId: string;
  playerId: PlayerId;               // owner / initiator
  leaseTargetId: PlayerId | null;   // water_lease only
  federallyFunded: boolean;
  startYear: number;
  turnsRemaining: number;           // build countdown; 0 = complete
  status: 'in_progress' | 'completed';
  effectTurnsLeft: number;          // remaining active years for temporary effects; 999 ≈ permanent
}

export interface Agreement {
  id: string;
  text: string;
  parties: PlayerId[];
  year: number;
  isBinding: boolean;
}

export interface PlayerYearResult {
  playerId: PlayerId;
  intendedDiversion: number;
  actualDiversion: number;
  mandatoryCut: number;
  defectionType: DefectionType;
  waterScore: number;
  politicalCapitalChange: number;
  budgetChange: number;
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
  shortageTierDeclared: ShortageTier;
  playerResults: PlayerYearResult[];
}

export interface LogEntry {
  id: string;
  year: number;
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
  supplyBonus: number;             // MAF from completed supply alternatives
  climateDrift: number;            // cumulative negative flow modifier

  currentFlowCard: HydrologyCard | null;
  shortageTier: ShortageTier;      // tier in force (declared this year)

  players: PlayerState[];

  commitmentPlayerIndex: number;
  commitments: Partial<Record<PlayerId, PlayerCommitment>>;

  bureauDeclaredTier: ShortageTier;
  bureauFundingTargetId: PlayerId | null;
  bureauFundingOptionId: string | null;
  federalFunding: number;          // $M remaining

  agreements: Agreement[];
  activeAlternatives: ActiveAlternative[];

  gameLog: LogEntry[];
  yearHistory: YearResult[];

  deadPool: boolean;
  coordinationBonusEarned: boolean;

  showTutorial: boolean;
  tutorialStep: number;

  hydrologyDeckIds: string[];
}
