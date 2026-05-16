import { useState } from 'react';
import { useGameStore, RESERVOIR_CAPACITY, getTierCuts } from '../../store/gameStore';
import { ALTERNATIVES } from '../../data/alternatives';
import { getRoleById, PLAYER_ORDER } from '../../data/roles';
import { Timer } from '../Timer';
import type { ShortageTier, PlayerId } from '../../data/types';

const TIER_DESCRIPTIONS = [
  'Tier 0 — Normal operations. No mandatory cuts.',
  'Tier 1 — AZ/NV cut 0.5 MAF; Mexico cut 0.1 MAF.',
  'Tier 2 — AZ/NV cut 1.0 MAF; CA cut 0.2 MAF; Mexico cut 0.2 MAF.',
  'Tier 3 — AZ/NV cut 1.5 MAF; CA cut 0.5 MAF; Mexico cut 0.3 MAF; Upper Basin cut 0.5 MAF.',
];

export function PhaseFederal() {
  const {
    year, reservoirLevel, shortageTier, bureauDeclaredTier, federalFunding,
    phaseTimeRemaining, setBureauDeclaredTier, setBureauFunding,
    bureauFundingTargetId, bureauFundingOptionId, advancePhase, players,
  } = useGameStore();

  const [localTier, setLocalTier] = useState<ShortageTier>(bureauDeclaredTier);
  const [localTarget, setLocalTarget] = useState<PlayerId | null>(bureauFundingTargetId);
  const [localOption, setLocalOption] = useState<string | null>(bureauFundingOptionId);

  const reservoirPct = reservoirLevel / RESERVOIR_CAPACITY;
  // Bureau must declare a tier at least as high as current indicator warrants
  const minTier = shortageTier;

  function handleApply() {
    setBureauDeclaredTier(localTier);
    setBureauFunding(localTarget, localOption);
  }

  const selectedOption = localOption ? ALTERNATIVES.find(a => a.id === localOption) : null;
  const fundingCost = selectedOption ? Math.round(selectedOption.cost * 0.5) : 0; // TUNING: 50% Bureau discount
  const canFund = federalFunding >= fundingCost;

  const tierCuts = getTierCuts(localTier);

  const nonBureauPlayers = PLAYER_ORDER.filter(id => id !== 'bureau');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: '#c8a87a' }}>
          Phase 2 — Federal Phase
        </h2>
        <Timer seconds={phaseTimeRemaining} label="Time:" onSkip={advancePhase} />
      </div>

      <div className="text-sm text-stone-400">
        Bureau of Reclamation: declare the shortage tier and optionally allocate federal funding.
        Other players may advocate verbally.
      </div>

      {/* Pass device prompt */}
      <div
        className="rounded border p-3 text-center"
        style={{ backgroundColor: '#0a1a2a', borderColor: '#2a7a8a' }}
      >
        <span className="text-sm" style={{ color: '#60a5fa' }}>
          Pass device to: <strong>Bureau of Reclamation (USBR)</strong>
        </span>
      </div>

      {/* Reservoir status */}
      <div className="panel">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Reservoir Indicator</div>
        <div className="flex items-center gap-4">
          <div>
            <div
              className="text-2xl font-bold"
              style={{
                color: reservoirPct > 0.40 ? '#4ade80'
                  : reservoirPct > 0.30 ? '#facc15'
                  : reservoirPct > 0.20 ? '#fb923c' : '#f87171',
              }}
            >
              {reservoirLevel.toFixed(1)} MAF ({(reservoirPct * 100).toFixed(0)}%)
            </div>
          </div>
          <div className="text-sm text-stone-400">
            Indicator warrants at minimum:{' '}
            <span className={`font-bold tier-${minTier}`}>Tier {minTier}</span>
          </div>
        </div>

        {/* Tier gauge */}
        <div className="mt-2 h-3 rounded-full overflow-hidden bg-stone-800">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(reservoirPct * 100).toFixed(0)}%`,
              backgroundColor: reservoirPct > 0.40 ? '#4ade80'
                : reservoirPct > 0.30 ? '#facc15'
                : reservoirPct > 0.20 ? '#fb923c' : '#f87171',
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-stone-500 mt-0.5">
          <span>Dead Pool 8%</span>
          <span>Tier 3 20%</span>
          <span>Tier 2 30%</span>
          <span>Tier 1 40%</span>
          <span>Full 100%</span>
        </div>
      </div>

      {/* Tier declaration */}
      <div className="panel">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-3">
          Declare Shortage Tier (Year {year})
        </div>
        <div className="space-y-2">
          {([0, 1, 2, 3] as ShortageTier[]).map(tier => (
            <label
              key={tier}
              className="flex items-start gap-3 p-2 rounded cursor-pointer transition-all"
              style={{
                backgroundColor: localTier === tier ? '#1a2a3a' : 'transparent',
                border: `1px solid ${localTier === tier ? '#2a7a8a' : '#3a2a10'}`,
                opacity: tier < minTier ? 0.4 : 1,
              }}
            >
              <input
                type="radio"
                name="tier"
                value={tier}
                checked={localTier === tier}
                disabled={tier < minTier}
                onChange={() => setLocalTier(tier)}
                className="mt-0.5"
              />
              <div>
                <div className={`font-semibold tier-${tier}`}>Tier {tier}</div>
                <div className="text-sm text-stone-400">{TIER_DESCRIPTIONS[tier]}</div>
              </div>
            </label>
          ))}
        </div>

        {localTier > 0 && (
          <div className="mt-3 text-sm" style={{ backgroundColor: '#1a1208', borderRadius: '0.375rem', padding: '0.5rem' }}>
            <div className="text-stone-400 mb-1">Mandatory cuts this tier:</div>
            {Object.entries(tierCuts).map(([pid, cut]) => (
              <div key={pid} className="text-stone-300">
                {getRoleById(pid as PlayerId).name}: -{cut.toFixed(1)} MAF
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Federal funding */}
      <div className="panel">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-3">
          Federal Funding Allocation
        </div>
        <div className="text-sm text-stone-300 mb-3">
          Federal funding pot: <span className="font-bold" style={{ color: '#4ade80' }}>${federalFunding}M</span> remaining.
          Grants cover 50% of alternative cost and remove bureaucratic barriers.
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-stone-400 block mb-1">Fund player:</label>
            <select
              className="w-full"
              value={localTarget ?? ''}
              onChange={e => setLocalTarget((e.target.value || null) as PlayerId | null)}
            >
              <option value="">— No funding this year —</option>
              {nonBureauPlayers.map(id => {
                const role = getRoleById(id);
                const player = players.find(p => p.id === id)!;
                return (
                  <option key={id} value={id}>
                    {role.name} (${player.budget}M budget)
                  </option>
                );
              })}
            </select>
          </div>

          {localTarget && (
            <div>
              <label className="text-xs text-stone-400 block mb-1">For alternative:</label>
              <select
                className="w-full"
                value={localOption ?? ''}
                onChange={e => setLocalOption(e.target.value || null)}
              >
                <option value="">— Select alternative —</option>
                {ALTERNATIVES.filter(a => a.eligiblePlayers.includes(localTarget as PlayerId)).map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} (50% = ${Math.round(a.cost * 0.5)}M)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {selectedOption && (
          <div
            className="text-sm rounded p-2 mb-3"
            style={{ backgroundColor: '#1a1208', borderColor: canFund ? '#2a5a2a' : '#5a1a1a', border: '1px solid' }}
          >
            <div className="font-semibold text-stone-200">{selectedOption.name}</div>
            <div className="text-stone-400 text-xs">{selectedOption.description}</div>
            <div className="mt-1 text-xs">
              Cost to Bureau: <span style={{ color: canFund ? '#4ade80' : '#f87171' }}>${fundingCost}M</span>
              {' '}| Lead time: {selectedOption.leadTurns} turn(s)
              {' '}| Effect: {selectedOption.effectMagnitude.toFixed(2)} MAF {selectedOption.effectType.replace(/_/g, ' ')}
            </div>
            {!canFund && (
              <div style={{ color: '#f87171' }} className="text-xs mt-1">
                Insufficient federal funding.
              </div>
            )}
          </div>
        )}
      </div>

      <button className="btn-primary w-full" onClick={() => { handleApply(); advancePhase(); }}>
        Apply Tier {localTier} Declaration → Proceed to Negotiation
      </button>
    </div>
  );
}
