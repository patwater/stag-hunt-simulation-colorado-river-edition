import type { HydrologyCard } from './types';

// TUNING: Hydrology deck calibrated to USBR historical flow data (1906–2023).
// naturalFlow values are approximate basin-wide unregulated inflow (MAF/year).
// weight controls draw probability: post-2000 dry years weighted 2x to reflect
// current hydrological regime. Extreme cards add variance.
//
// Total legal allocations: ~18.5 MAF/yr (compact + treaty)
// Recent average natural flow: ~12.5 MAF/yr
// Structural gap: ~6 MAF/yr — this is the heart of the problem.

export const HYDROLOGY_DECK: HydrologyCard[] = [
  // ── Extreme wet years ──────────────────────────────────────────────────
  {
    id: 'h_1984',
    name: 'Flood Year',
    historicalYear: 1984,
    naturalFlow: 24.0,  // TUNING
    description: 'Record snowpack sends water surging through Glen Canyon. Reservoirs overflow. A rare respite — but infrastructure was not built for this.',
    isExtreme: true,
    weight: 1,
  },
  {
    id: 'h_1983',
    name: 'El Niño Surge',
    historicalYear: 1983,
    naturalFlow: 22.0,  // TUNING
    description: 'El Niño drives exceptional precipitation across the Rockies. Mead and Powell both near capacity.',
    isExtreme: true,
    weight: 1,
  },
  {
    id: 'h_2017',
    name: 'Miracle March',
    historicalYear: 2017,
    naturalFlow: 20.2,  // TUNING
    description: 'After years of drought, back-to-back atmospheric rivers refill California and Upper Basin snowpack. A "miracle" that masks structural problems.',
    isExtreme: false,
    weight: 1,
  },
  // ── Wet years ─────────────────────────────────────────────────────────
  {
    id: 'h_2011',
    name: 'La Niña Rebound',
    historicalYear: 2011,
    naturalFlow: 18.5,  // TUNING
    description: 'Exceptional mountain snowpack after La Niña. Powell refills to near capacity. Brief hope.',
    isExtreme: false,
    weight: 2,
  },
  {
    id: 'h_2005',
    name: 'Strong Snowpack',
    historicalYear: 2005,
    naturalFlow: 18.3,  // TUNING
    description: 'Above-average Rocky Mountain snowpack and spring precipitation.',
    isExtreme: false,
    weight: 2,
  },
  {
    id: 'h_1997',
    name: 'El Niño Year',
    historicalYear: 1997,
    naturalFlow: 19.5,  // TUNING
    description: 'One of the strongest El Niño events on record drives above-average flow.',
    isExtreme: false,
    weight: 1,
  },
  {
    id: 'h_2019',
    name: 'Wet Year',
    historicalYear: 2019,
    naturalFlow: 17.1,  // TUNING
    description: 'A welcome wet year after years of drought. Temporary reservoir recovery.',
    isExtreme: false,
    weight: 2,
  },
  // ── Near-average years ────────────────────────────────────────────────
  {
    id: 'h_1995',
    name: 'Average Year',
    historicalYear: 1995,
    naturalFlow: 14.8,  // TUNING
    description: 'Near the historical average. Allocations still exceed flow by several MAF.',
    isExtreme: false,
    weight: 2,
  },
  {
    id: 'h_1998',
    name: 'Moderate Flow',
    historicalYear: 1998,
    naturalFlow: 15.0,  // TUNING
    description: 'Moderate flows following El Niño. Reservoirs holding but demand presses hard.',
    isExtreme: false,
    weight: 2,
  },
  {
    id: 'h_1986',
    name: 'Normal Operations',
    historicalYear: 1986,
    naturalFlow: 15.2,  // TUNING
    description: 'A year that once seemed unremarkable. The gap between allocations and flow was already apparent to those looking.',
    isExtreme: false,
    weight: 2,
  },
  {
    id: 'h_2001',
    name: 'Transition Year',
    historicalYear: 2001,
    naturalFlow: 13.9,  // TUNING
    description: 'The first year of what would become a 20-year drought begins here. Flow below average.',
    isExtreme: false,
    weight: 3,
  },
  {
    id: 'h_2003',
    name: 'Continuing Drought',
    historicalYear: 2003,
    naturalFlow: 13.8,  // TUNING
    description: 'Drought continues. Reservoir drawdown accelerates as demand holds steady.',
    isExtreme: false,
    weight: 3,
  },
  // ── Below-average years ───────────────────────────────────────────────
  {
    id: 'h_2009',
    name: 'Dry Year',
    historicalYear: 2009,
    naturalFlow: 12.5,  // TUNING
    description: 'Flows roughly half the compact-era assumed average. Legal allocations exceed flow by ~6 MAF.',
    isExtreme: false,
    weight: 3,
  },
  {
    id: 'h_2013',
    name: 'Below Average',
    historicalYear: 2013,
    naturalFlow: 12.8,  // TUNING
    description: 'Extended dry conditions. Water managers begin discussing unprecedented shortage protocols.',
    isExtreme: false,
    weight: 3,
  },
  {
    id: 'h_2015',
    name: 'Hot Drought',
    historicalYear: 2015,
    naturalFlow: 11.9,  // TUNING
    description: 'Record temperatures amplify drought effects. Snowpack melts early, soil absorbs water before it reaches the river.',
    isExtreme: false,
    weight: 3,
  },
  {
    id: 'h_2016',
    name: 'Dry Stretch',
    historicalYear: 2016,
    naturalFlow: 11.7,  // TUNING
    description: 'Another dry year. Reservoir levels continue their decline.',
    isExtreme: false,
    weight: 3,
  },
  {
    id: 'h_2000',
    name: 'Drought Onset',
    historicalYear: 2000,
    naturalFlow: 11.2,  // TUNING
    description: 'The millennium drought begins. Flows drop significantly below legal allocations.',
    isExtreme: false,
    weight: 3,
  },
  {
    id: 'h_2006',
    name: 'Moderate Drought',
    historicalYear: 2006,
    naturalFlow: 11.5,  // TUNING
    description: 'Ongoing drought. Upper Basin snowpack disappoints. Reservoir drawdown continues.',
    isExtreme: false,
    weight: 3,
  },
  {
    id: 'h_2007',
    name: 'Shallow Snowpack',
    historicalYear: 2007,
    naturalFlow: 11.4,  // TUNING
    description: 'Snowpack well below average. Flow models revised downward.',
    isExtreme: false,
    weight: 3,
  },
  {
    id: 'h_2020',
    name: 'Pandemic Drought',
    historicalYear: 2020,
    naturalFlow: 11.0,  // TUNING
    description: 'Low flows continue. Reduced agricultural demand (COVID economic shock) masks severity briefly.',
    isExtreme: false,
    weight: 3,
  },
  // ── Severe drought years ──────────────────────────────────────────────
  {
    id: 'h_2002',
    name: 'Extreme Drought',
    historicalYear: 2002,
    naturalFlow: 9.6,   // TUNING
    description: 'One of the worst drought years in the instrumental record. Reservoirs begin steep decline from which they never fully recover.',
    isExtreme: true,
    weight: 2,
  },
  {
    id: 'h_2012',
    name: 'Record Low',
    historicalYear: 2012,
    naturalFlow: 8.1,   // TUNING
    description: 'The worst flow year in a century of measurement. Lake Mead drops to near-record lows. Shock waves through every water agency in the basin.',
    isExtreme: true,
    weight: 2,
  },
  {
    id: 'h_2018',
    name: 'Severe Shortage',
    historicalYear: 2018,
    naturalFlow: 9.5,   // TUNING
    description: 'Continued drought with above-average temperatures. Evaporation and plant transpiration consume more of the available flow.',
    isExtreme: true,
    weight: 2,
  },
  {
    id: 'h_2021',
    name: 'Crisis Year',
    historicalYear: 2021,
    naturalFlow: 8.5,   // TUNING
    description: 'Bureau declares Tier 1 shortage for first time in history. Lake Mead at 35% capacity. The system\'s overallocation is undeniable.',
    isExtreme: true,
    weight: 2,
  },
  {
    id: 'h_2022',
    name: 'Historic Low',
    historicalYear: 2022,
    naturalFlow: 7.9,   // TUNING
    description: 'Lake Mead hits lowest recorded level since filling. Glen Canyon Dam\'s hydropower threatened. Emergency operations.',
    isExtreme: true,
    weight: 2,
  },
  // ── Additional average/below cards for deck depth ─────────────────────
  {
    id: 'h_avg_a',
    name: 'Dry Normal',
    historicalYear: 2004,
    naturalFlow: 12.2,  // TUNING
    description: 'A year representative of the new normal: flow well below legal allocations.',
    isExtreme: false,
    weight: 3,
  },
  {
    id: 'h_avg_b',
    name: 'Below Median',
    historicalYear: 2008,
    naturalFlow: 12.9,  // TUNING
    description: 'Below-median flow. Demand management discussions intensify.',
    isExtreme: false,
    weight: 3,
  },
  {
    id: 'h_avg_c',
    name: 'Low Flow Year',
    historicalYear: 2010,
    naturalFlow: 11.6,  // TUNING
    description: 'Low but not record-breaking flows. The slow crisis continues.',
    isExtreme: false,
    weight: 3,
  },
  {
    id: 'h_avg_d',
    name: 'Warm Dry Year',
    historicalYear: 2014,
    naturalFlow: 10.8,  // TUNING
    description: 'Warm temperatures reduce snowpack efficiency. Less water in the river per inch of snow.',
    isExtreme: false,
    weight: 3,
  },
  {
    id: 'h_avg_e',
    name: 'Modest Recovery',
    historicalYear: 2023,
    naturalFlow: 14.2,  // TUNING
    description: 'A slightly better year after emergency cuts. Reservoirs begin to stabilize — but structural overallocation remains.',
    isExtreme: false,
    weight: 3,
  },
];

// Builds a shuffled deck weighted by card.weight
export function buildShuffledDeck(): string[] {
  const weighted: string[] = [];
  for (const card of HYDROLOGY_DECK) {
    for (let i = 0; i < card.weight; i++) {
      weighted.push(card.id);
    }
  }
  // Fisher-Yates shuffle
  for (let i = weighted.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [weighted[i], weighted[j]] = [weighted[j], weighted[i]];
  }
  return weighted;
}

export function getCardById(id: string): HydrologyCard {
  const card = HYDROLOGY_DECK.find(c => c.id === id);
  if (!card) throw new Error(`Unknown card: ${id}`);
  return card;
}
