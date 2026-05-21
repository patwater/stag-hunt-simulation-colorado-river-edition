import type { PlayerRole, PlayerId } from './types';

// TUNING: All role parameters (budgets, diversions, political capital) live here.
// Adjust baseDiversion / maxDiversion to change structural overallocation intensity.
export const ROLES: PlayerRole[] = [
  {
    id: 'bureau',
    name: 'Bureau of Reclamation',
    abbreviation: 'USBR',
    description:
      'Federal operator of Hoover and Glen Canyon Dams. Controls reservoir releases, declares shortage tiers, and holds the federal infrastructure funding pot. Does not divert water itself — manages the system on behalf of all users.',
    legalBasis: [
      'Reclamation Act of 1902',
      'Boulder Canyon Project Act (1928)',
      'Colorado River Basin Project Act (1968)',
      'Shortage Guidelines (2007, updated 2019)',
    ],
    baseDiversion: 0,
    maxDiversion: 0,
    startingBudget: 0,
    startingPoliticalCapital: 12,
    color: '#3b82f6',
    powers: [
      'Declare shortage tier (0–3) each Federal Phase',
      'Allocate federal infrastructure funding to alternatives',
      'File federal litigation for compact violations',
      'Veto egregious overdraw (costs 3 PC)',
    ],
    constraints: [
      'Cannot unilaterally redistribute allocated water rights',
      'Shortage tiers must follow Shortage Guidelines precedent',
      'Federal funding finite — once spent, cannot be replenished mid-game',
    ],
  },
  {
    id: 'upper_basin',
    name: 'Upper Basin Coalition',
    abbreviation: 'Upper Basin',
    description:
      'Represents Colorado, Utah, Wyoming, and New Mexico. Compact-obligated to deliver 7.5 MAF/yr to the Lee Ferry gauge. Actual use constrained by hydrology — Upper Basin states have not historically consumed their full apportionment, but demand is growing.',
    legalBasis: [
      '1922 Colorado River Compact (Article III)',
      'Upper Colorado River Basin Compact (1948)',
      'CRSP Authorization Act (1956)',
    ],
    baseDiversion: 5.5,   // TUNING: current Upper Basin consumptive use (MAF)
    maxDiversion: 7.5,    // TUNING: legal compact apportionment (MAF)
    startingBudget: 200,
    startingPoliticalCapital: 10,
    color: '#8b5cf6',
    powers: [
      'Propose compact renegotiation in Negotiation phase (non-binding)',
      'Invest in efficiency or fallowing to earn federal funding',
      'Assert right to develop remaining unused apportionment',
    ],
    constraints: [
      'Must deliver 7.5 MAF at Lee Ferry — shortfall triggers deficit accounting',
      'Cannot take from Lower Basin share',
      'Overdraw triggers immediate federal oversight',
    ],
  },
  {
    id: 'california',
    name: 'California',
    abbreviation: 'California',
    description:
      'Largest Lower Basin user. Imperial Irrigation District (IID) holds some of the most senior rights on the river. California was last to agree to shortage sharing and has historically resisted cuts. Senior priority means cuts hit California last — but at Tier 3, no one is exempt.',
    legalBasis: [
      '1963 Arizona v. California Supreme Court decree',
      "California's 4.4 MAF apportionment",
      'Seven-Party Agreement (1931)',
      'QSA (Quantification Settlement Agreement, 2003)',
    ],
    baseDiversion: 4.4,   // TUNING: California draws its full apportionment (MAF)
    maxDiversion: 4.4,    // TUNING: legal ceiling
    startingBudget: 300,
    startingPoliticalCapital: 10,
    color: '#f59e0b',
    powers: [
      'Invoke senior priority to resist Tier 1/2 cuts (at PC cost)',
      'Fund desalination (with federal co-investment)',
      'Broker QSA-style fallowing deals with IID',
    ],
    constraints: [
      'Cannot exceed 4.4 MAF apportionment',
      'IID constituency resists any fallowing',
      'Exposed at Tier 3 — cannot refuse emergency cuts',
    ],
  },
  {
    id: 'arizona_nevada',
    name: 'Arizona + Nevada',
    abbreviation: 'AZ/NV',
    description:
      "Junior Lower Basin users. Arizona's Central Arizona Project is the primary delivery mechanism; Nevada takes ~300k AF. Junior priority status means AZ/NV are first in line for shortage cuts under every tier.",
    legalBasis: [
      'Colorado River Basin Project Act (1968) — CAP authorization',
      'Arizona v. California (1963) — AZ 2.8 MAF',
      "Nevada's 300k AF allotment",
      'Arizona Drought Contingency Plan (2019)',
    ],
    baseDiversion: 2.8,   // TUNING: current AZ+NV combined use (MAF)
    maxDiversion: 3.1,    // TUNING: AZ 2.8 + NV 0.3 legal max
    startingBudget: 250,
    startingPoliticalCapital: 10,
    color: '#ef4444',
    powers: [
      'Invoke DCP provisions to claim credit for voluntary cuts',
      'Negotiate side deals for water banking',
      'Invest in recycled water to reduce CAP dependence',
    ],
    constraints: [
      'First to take mandatory cuts at every shortage tier',
      'Cannot override federal shortage tier declarations',
      'CAP infrastructure costs increase budget drain each turn',
    ],
  },
  {
    id: 'mexico',
    name: 'Mexico',
    abbreviation: 'Mexico',
    description:
      "Mexico's 1.5 MAF treaty allocation flows through the Morelos Dam. Minute 319/323 created a cooperative framework: Mexico shares shortage cuts proportionally but also receives surplus flows in wet years. An international obligation the U.S. cannot unilaterally abrogate.",
    legalBasis: [
      '1944 U.S.–Mexico Treaty (1.5 MAF)',
      'Minute 319 (2012)',
      'Minute 323 (2017) — shortage sharing + environmental flows',
      'IBWC jurisdiction',
    ],
    baseDiversion: 1.5,   // TUNING: treaty allocation (MAF)
    maxDiversion: 1.5,    // TUNING: treaty ceiling
    startingBudget: 150,
    startingPoliticalCapital: 8,
    color: '#10b981',
    powers: [
      'Invoke treaty protections to limit cuts below Minute 323 floor',
      'Participate in desalination investment (Gulf of California)',
      'Negotiate water banking credits in wet years',
    ],
    constraints: [
      'Cannot take more than treaty allowance',
      'Subject to proportional shortage cuts under Minute 323',
      'Political vulnerability if U.S. actors ignore treaty obligations',
    ],
  },
  {
    id: 'tribal',
    name: 'Tribal Coalition',
    abbreviation: 'Tribes',
    description:
      'Represents ~30 federally recognized tribes with water rights across the basin. Under the Winters Doctrine, tribal reserved rights are senior to virtually all other rights. Roughly 25% of basin rights belong to tribes, much still unquantified — the pivotal swing actor.',
    legalBasis: [
      'Winters v. United States (1908) — reserved rights doctrine',
      'Arizona v. California (1963) — affirmed tribal rights',
      'Individual tribal settlements (Navajo, Hopi, ongoing)',
      'White House Tribal Water Security Initiative (2023)',
    ],
    baseDiversion: 2.0,   // TUNING: current tribal consumptive use (MAF)
    maxDiversion: 3.5,    // TUNING: estimated full Winters-doctrine senior rights (MAF)
    startingBudget: 100,
    startingPoliticalCapital: 8,
    color: '#d97706',
    powers: [
      'Assert unquantified rights (up to 3.5 MAF) — senior priority',
      'Offer water leases to other players for revenue',
      'Initiate rights-quantification process (3-turn legal action)',
      'Federal trust responsibility: appeal to Bureau for protection',
    ],
    constraints: [
      'Limited budget without leasing income',
      'Rights quantification takes time and political capital',
      'Asserting maximum rights may trigger counter-litigation',
    ],
  },
];

export function getRoleById(id: PlayerId): PlayerRole {
  const role = ROLES.find(r => r.id === id);
  if (!role) throw new Error(`Unknown role: ${id}`);
  return role;
}

export const PLAYER_ORDER: PlayerId[] = [
  'bureau',
  'upper_basin',
  'california',
  'arizona_nevada',
  'mexico',
  'tribal',
];
