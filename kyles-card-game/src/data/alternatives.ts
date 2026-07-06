import type { AlternativeOption } from './types';

// TUNING: Alternative investments. Adjust cost, leadTurns, effectMagnitude to
// change the economic viability of cooperation vs. defection.
export const ALTERNATIVES: AlternativeOption[] = [
  {
    id: 'ag_fallowing',
    name: 'Agricultural Fallowing Program',
    description:
      'Pay irrigators to fallow fields for two seasons, leaving the water in the reservoir. Fast but temporary.',
    cost: 150,            // TUNING: $M
    pcCost: 0,
    leadTurns: 1,         // TUNING: active starting next year
    effectType: 'demand_reduction_temporary',
    effectMagnitude: 0.5, // TUNING: MAF/yr while active
    effectDuration: 2,    // TUNING: active years
    eligiblePlayers: ['upper_basin', 'california', 'arizona_nevada', 'mexico'],
    requiresFederalFunding: false,
  },
  {
    id: 'conservation',
    name: 'Urban Conservation Program',
    description:
      'Turf removal, tiered pricing, and efficiency retrofits. Cheap, slow, permanent.',
    cost: 80,             // TUNING: $M
    pcCost: 0,
    leadTurns: 2,         // TUNING
    effectType: 'demand_reduction_permanent',
    effectMagnitude: 0.1, // TUNING: MAF/yr forever
    effectDuration: 0,
    eligiblePlayers: ['upper_basin', 'california', 'arizona_nevada', 'mexico', 'tribal'],
    requiresFederalFunding: false,
  },
  {
    id: 'desalination',
    name: 'Gulf Desalination Plant',
    description:
      'Binational seawater desalination in the Gulf of California under the Minute 323 framework. Very expensive, slow, permanent new supply. Realistically needs a federal grant.',
    cost: 500,            // TUNING: $M — designed to require Bureau co-funding
    pcCost: 0,
    leadTurns: 3,         // TUNING
    effectType: 'supply_increase',
    effectMagnitude: 0.2, // TUNING: MAF/yr added to effective flow
    effectDuration: 0,
    eligiblePlayers: ['california', 'mexico'],
    requiresFederalFunding: true,
  },
  {
    id: 'recycled_water',
    name: 'Advanced Water Recycling',
    description:
      'Treat municipal wastewater to potable standards, reducing the draw on river water.',
    cost: 120,            // TUNING: $M
    pcCost: 0,
    leadTurns: 2,         // TUNING
    effectType: 'demand_reduction_permanent',
    effectMagnitude: 0.15, // TUNING: MAF/yr forever
    effectDuration: 0,
    eligiblePlayers: ['upper_basin', 'california', 'arizona_nevada'],
    requiresFederalFunding: false,
  },
  {
    id: 'tribal_leasing',
    name: 'Tribal Water Lease',
    description:
      'Lease 0.5 MAF/yr of senior tribal water to another player for 3 years. The lessee pays the Tribal Coalition $30M per active year and gets the water credited to their diversion.',
    cost: 0,
    pcCost: 3,            // TUNING: political cost to the Tribal Coalition
    leadTurns: 1,         // TUNING
    effectType: 'water_lease',
    effectMagnitude: 0.5, // TUNING: MAF/yr transferred
    effectDuration: 3,    // TUNING: lease term
    eligiblePlayers: ['tribal'],
    requiresFederalFunding: false,
  },
  {
    id: 'tribal_quantification',
    name: 'Rights Quantification Settlement',
    description:
      'A negotiated settlement quantifying tribal reserved rights. Costly and slow, but transforms the Tribal Coalition’s legal position — and is worth a large private-objective bonus.',
    cost: 50,             // TUNING: $M in legal/technical costs
    pcCost: 2,            // TUNING
    leadTurns: 3,         // TUNING: settlements take years
    effectType: 'quantification',
    effectMagnitude: 0,
    effectDuration: 0,
    eligiblePlayers: ['tribal'],
    requiresFederalFunding: false,
  },
];

// TUNING: lessee pays Tribal this much per active lease year ($M)
export const LEASE_REVENUE_PER_YEAR = 30;

export function getAlternativeById(id: string): AlternativeOption {
  const opt = ALTERNATIVES.find(a => a.id === id);
  if (!opt) throw new Error(`Unknown alternative: ${id}`);
  return opt;
}
