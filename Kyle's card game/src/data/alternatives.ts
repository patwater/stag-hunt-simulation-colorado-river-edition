import type { AlternativeOption } from './types';

// TUNING: Alternative investments. Adjust cost, leadTurns, effectMagnitude to
// change the economic viability of cooperation vs. defection.
export const ALTERNATIVES: AlternativeOption[] = [
  {
    id: 'ag_fallowing',
    name: 'Agricultural Fallowing Program',
    description:
      'Pay irrigators to voluntarily fallow fields and lease water back to municipal users or leave it in the reservoir. Relatively fast but temporary.',
    cost: 150,           // TUNING: $M
    leadTurns: 1,        // TUNING: effect starts next year
    effectType: 'demand_reduction_temporary',
    effectMagnitude: 0.5, // TUNING: 0.5 MAF demand reduction
    effectDuration: 2,   // TUNING: lasts 2 turns
    eligiblePlayers: ['upper_basin', 'california', 'arizona_nevada', 'mexico'],
    requiresFederalFunding: false,
  },
  {
    id: 'conservation',
    name: 'Urban Conservation Program',
    description:
      'Water-efficient appliances, tiered pricing, xeriscape incentives, and turf removal programs. Lower cost, permanent benefit, slower build-out.',
    cost: 80,            // TUNING: $M
    leadTurns: 2,        // TUNING
    effectType: 'demand_reduction_permanent',
    effectMagnitude: 0.1, // TUNING: 0.1 MAF permanent demand reduction
    effectDuration: 0,   // permanent
    eligiblePlayers: ['bureau', 'upper_basin', 'california', 'arizona_nevada', 'mexico', 'tribal'],
    requiresFederalFunding: false,
  },
  {
    id: 'desalination',
    name: 'Gulf Desalination Plant',
    description:
      'Large-scale seawater desalination in the Gulf of California, jointly operated with Mexico under Minute 323 framework. Very expensive, long lead time, but permanent supply increase.',
    cost: 500,           // TUNING: $M (requires federal co-funding to be affordable)
    leadTurns: 3,        // TUNING
    effectType: 'supply_increase',
    effectMagnitude: 0.2, // TUNING: 0.2 MAF effective supply addition
    effectDuration: 0,   // permanent
    eligiblePlayers: ['california', 'mexico'],
    requiresFederalFunding: true,
  },
  {
    id: 'recycled_water',
    name: 'Advanced Water Recycling',
    description:
      'Treat municipal wastewater to potable standards (indirect potable reuse), reducing the draw on Colorado River water for municipal use.',
    cost: 120,           // TUNING: $M
    leadTurns: 2,        // TUNING
    effectType: 'demand_reduction_permanent',
    effectMagnitude: 0.15, // TUNING: 0.15 MAF permanent demand reduction
    effectDuration: 0,   // permanent
    eligiblePlayers: ['upper_basin', 'california', 'arizona_nevada'],
    requiresFederalFunding: false,
  },
  {
    id: 'tribal_leasing',
    name: 'Tribal Water Lease',
    description:
      'Tribal Coalition leases a portion of their senior water rights to another state or user for agreed compensation. Provides revenue to tribes; lessee gets water credit that offsets their diversion.',
    cost: 0,             // TUNING: no cash cost — political cost instead (3 PC to initiate)
    leadTurns: 1,        // TUNING
    effectType: 'water_lease',
    effectMagnitude: 0.5, // TUNING: 0.5 MAF leased per active year
    effectDuration: 3,   // TUNING: lease term (turns)
    eligiblePlayers: ['tribal'],
    requiresFederalFunding: false,
  },
];

export function getAlternativeById(id: string): AlternativeOption {
  const opt = ALTERNATIVES.find(a => a.id === id);
  if (!opt) throw new Error(`Unknown alternative: ${id}`);
  return opt;
}
