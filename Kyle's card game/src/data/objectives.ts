import type { PrivateObjective } from './types';

// TUNING: Private objective scoring weights.
// Coordination bonus (reservoir stays above 30% all game): +60 per player — TUNING
// This bonus must exceed individual overdraw gains to make cooperation dominant.
export const COORDINATION_BONUS = 60; // TUNING

export const PRIVATE_OBJECTIVES: PrivateObjective[] = [
  {
    playerId: 'bureau',
    title: 'Systemic Steward',
    description:
      'Your mandate is the long-term viability of the Colorado River system — not any single constituency. Success means the river survives AND states develop sustainable paths forward.',
    criteria: [
      {
        id: 'bureau_survive',
        description: 'Game reaches Year 10 without dead pool: +30 pts',
        maxPoints: 30, // TUNING
        checkType: 'game_survived',
      },
      {
        id: 'bureau_reservoir',
        description: 'Average reservoir level above 40% across all years: +20 pts',
        maxPoints: 20, // TUNING
        checkType: 'avg_reservoir_above_40pct',
      },
      {
        id: 'bureau_alternatives',
        description: '+5 pts per alternative investment successfully funded (max 15)',
        maxPoints: 15, // TUNING
        checkType: 'alternatives_funded_count',
      },
    ],
  },
  {
    playerId: 'upper_basin',
    title: 'Western Growth Advocate',
    description:
      'Your four states need water to grow. You are entitled to 7.5 MAF — you haven\'t always used it, but your states are developing fast. You want predictability, not perpetual crisis. And you don\'t want to fund others\' profligacy.',
    criteria: [
      {
        id: 'ub_delivery',
        description: 'Average annual diversion ≥ 5.0 MAF across all years: +25 pts',
        maxPoints: 25, // TUNING
        checkType: 'upper_basin_avg_diversion_5maf',
      },
      {
        id: 'ub_no_litigation',
        description: 'Never targeted by successful litigation: +15 pts',
        maxPoints: 15, // TUNING
        checkType: 'never_targeted_by_litigation',
      },
      {
        id: 'ub_alternatives',
        description: '+5 pts per own alternative investment completed (max 15)',
        maxPoints: 15, // TUNING
        checkType: 'own_alternatives_completed',
      },
    ],
  },
  {
    playerId: 'california',
    title: 'IID First',
    description:
      'The Imperial Irrigation District is your most powerful constituency — and among the most senior rights holders in the entire basin. You cannot let IID take more than a 20% cut in any single year. The agriculture is the economy of the Imperial Valley.',
    criteria: [
      {
        id: 'ca_iid',
        description: 'Never voluntarily cut diversion below 3.5 MAF (20% cut): +30 pts',
        maxPoints: 30, // TUNING
        checkType: 'california_above_3_5maf_all_years',
      },
      {
        id: 'ca_desal',
        description: 'Desalination plant completed by Year 7: +15 pts',
        maxPoints: 15, // TUNING
        checkType: 'desalination_completed_by_7',
      },
      {
        id: 'ca_pc',
        description: 'End game with ≥ 8 political capital: +10 pts',
        maxPoints: 10, // TUNING
        checkType: 'end_political_capital_8',
      },
    ],
  },
  {
    playerId: 'arizona_nevada',
    title: 'CAP Defender',
    description:
      'The Central Arizona Project cost Arizona $4 billion and took decades to build. Phoenix and Tucson depend on it. Yes, you\'re junior — but your cities are real, your people are real. Every cut you take is a political crisis at home. Federal funding helps.',
    criteria: [
      {
        id: 'az_cap',
        description: 'Average annual diversion above 2.0 MAF across all years: +25 pts',
        maxPoints: 25, // TUNING
        checkType: 'az_avg_diversion_2maf',
      },
      {
        id: 'az_federal',
        description: '+8 pts per federal funding award received (max 24)',
        maxPoints: 24, // TUNING
        checkType: 'federal_funding_received_count',
      },
      {
        id: 'az_recycled',
        description: 'Recycled water or conservation alternative completed: +10 pts',
        maxPoints: 10, // TUNING
        checkType: 'recycled_or_conservation_completed',
      },
    ],
  },
  {
    playerId: 'mexico',
    title: 'Treaty Symmetry',
    description:
      'Mexico\'s treaty rights are not charity — they were negotiated in exchange for cooperation on regional development. Minute 323 promised a new era of shared management. You want that era to actually happen, not just as rhetoric.',
    criteria: [
      {
        id: 'mx_treaty',
        description: 'Every year, Mexico\'s actual diversion is within 0.15 MAF of treaty entitlement: +30 pts',
        maxPoints: 30, // TUNING
        checkType: 'mexico_treaty_respected',
      },
      {
        id: 'mx_reservoir',
        description: '+3 pts per year reservoir above 30% (max 30)',
        maxPoints: 30, // TUNING
        checkType: 'reservoir_above_30pct_per_year',
      },
    ],
  },
  {
    playerId: 'tribal',
    title: 'Rights & Recognition',
    description:
      'Your water rights predate the compact. They predate the states. They were recognized by the Supreme Court over a century ago — and yet they remain largely unquantified, marginalizing tribes in every negotiation. This is the moment to change that.',
    criteria: [
      {
        id: 'tribal_quantify',
        description: 'Tribal rights quantification process completed: +35 pts',
        maxPoints: 35, // TUNING
        checkType: 'tribal_rights_quantified',
      },
      {
        id: 'tribal_leases',
        description: '+8 pts per water lease deal completed (max 24)',
        maxPoints: 24, // TUNING
        checkType: 'water_leases_completed',
      },
    ],
  },
];

export function getObjectiveByPlayerId(id: string): PrivateObjective {
  const obj = PRIVATE_OBJECTIVES.find(o => o.playerId === id);
  if (!obj) throw new Error(`Unknown objective player: ${id}`);
  return obj;
}
