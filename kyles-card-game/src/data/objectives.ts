import type { PrivateObjective } from './types';

// TUNING: Coordination bonus (reservoir stays >= 30% every year of a completed
// game): +60 public points per player. Must exceed cumulative defection gains
// so that mutual cooperation is the payoff-dominant equilibrium.
export const COORDINATION_BONUS = 60;

export const PRIVATE_OBJECTIVES: PrivateObjective[] = [
  {
    playerId: 'bureau',
    title: 'Systemic Steward',
    description:
      'Your mandate is the long-term viability of the system, not any single constituency.',
    criteria: [
      { id: 'bureau_survive', description: 'Game reaches Year 10 without dead pool: +30', maxPoints: 30 },
      { id: 'bureau_reservoir', description: 'Average reservoir level ≥ 40% of capacity: +20', maxPoints: 20 },
      { id: 'bureau_alternatives', description: '+5 per federally funded investment (max 15)', maxPoints: 15 },
    ],
  },
  {
    playerId: 'upper_basin',
    title: 'Western Growth Advocate',
    description:
      'Your four states are growing and entitled to 7.5 MAF. You want development room and predictability.',
    criteria: [
      { id: 'ub_delivery', description: 'Average diversion ≥ 5.0 MAF/yr: +25', maxPoints: 25 },
      { id: 'ub_no_litigation', description: 'Never successfully sued: +15', maxPoints: 15 },
      { id: 'ub_alternatives', description: '+5 per own completed investment (max 15)', maxPoints: 15 },
    ],
  },
  {
    playerId: 'california',
    title: 'IID First',
    description:
      'The Imperial Irrigation District is your most powerful constituency. Deep cuts are political suicide.',
    criteria: [
      { id: 'ca_iid', description: 'Actual diversion ≥ 3.5 MAF every year: +30', maxPoints: 30 },
      { id: 'ca_desal', description: 'Desalination completed during the game: +15', maxPoints: 15 },
      { id: 'ca_pc', description: 'End with ≥ 8 political capital: +10', maxPoints: 10 },
    ],
  },
  {
    playerId: 'arizona_nevada',
    title: 'CAP Defender',
    description:
      'Phoenix and Tucson depend on the Central Arizona Project. Every cut is a crisis at home; federal money softens the blow.',
    criteria: [
      { id: 'az_cap', description: 'Average diversion ≥ 2.0 MAF/yr: +25', maxPoints: 25 },
      { id: 'az_federal', description: '+8 per federal grant received (max 24)', maxPoints: 24 },
      { id: 'az_recycled', description: 'Recycled water or conservation completed: +10', maxPoints: 10 },
    ],
  },
  {
    playerId: 'mexico',
    title: 'Treaty Symmetry',
    description:
      'Minute 323 promised genuinely shared management. You want the treaty honored — cuts shared proportionally, never dumped on you.',
    criteria: [
      { id: 'mx_treaty', description: 'Every year, receive within 0.15 MAF of your treaty share (1.5 minus lawful cuts): +30', maxPoints: 30 },
      { id: 'mx_reservoir', description: '+3 per year the reservoir ends ≥ 30% (max 30)', maxPoints: 30 },
    ],
  },
  {
    playerId: 'tribal',
    title: 'Rights & Recognition',
    description:
      'Your rights predate the Compact and the states. Quantify them, and turn paper seniority into real resources.',
    criteria: [
      { id: 'tribal_quantify', description: 'Rights Quantification Settlement completed: +35', maxPoints: 35 },
      { id: 'tribal_leases', description: '+8 per water lease completed (max 24)', maxPoints: 24 },
      { id: 'tribal_budget', description: 'End with ≥ $150M (lease revenue counts): +10', maxPoints: 10 },
    ],
  },
];

export function getObjectiveByPlayerId(id: string): PrivateObjective {
  const obj = PRIVATE_OBJECTIVES.find(o => o.playerId === id);
  if (!obj) throw new Error(`Unknown objective player: ${id}`);
  return obj;
}
