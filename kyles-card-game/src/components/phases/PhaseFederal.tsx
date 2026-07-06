import { useGameStore, RESERVOIR_CAPACITY, getTierCuts, FEDERAL_SHARE } from '../../store/gameStore';
import { ALTERNATIVES } from '../../data/alternatives';
import { getRoleById, PLAYER_ORDER } from '../../data/roles';
import { Timer } from '../Timer';
import type { ShortageTier, PlayerId } from '../../data/types';

const TIER_DESCRIPTIONS = [
  'Normal operations. No mandatory cuts.',
  'AZ/NV −0.5 MAF; Mexico −0.1 MAF.',
  'AZ/NV −1.0; California −0.2; Mexico −0.2 MAF.',
  'AZ/NV −1.5; California −0.5; Mexico −0.3; Upper Basin −0.5 MAF.',
];

export function PhaseFederal() {
  const year = useGameStore(s => s.year);
  const reservoirLevel = useGameStore(s => s.reservoirLevel);
  const shortageTier = useGameStore(s => s.shortageTier);
  const bureauDeclaredTier = useGameStore(s => s.bureauDeclaredTier);
  const federalFunding = useGameStore(s => s.federalFunding);
  const phaseTimeRemaining = useGameStore(s => s.phaseTimeRemaining);
  const bureauFundingTargetId = useGameStore(s => s.bureauFundingTargetId);
  const bureauFundingOptionId = useGameStore(s => s.bureauFundingOptionId);
  const setBureauDeclaredTier = useGameStore(s => s.setBureauDeclaredTier);
  const setBureauFunding = useGameStore(s => s.setBureauFunding);
  const advancePhase = useGameStore(s => s.advancePhase);

  const pct = reservoirLevel / RESERVOIR_CAPACITY;
  // Bureau may not declare below what the reservoir level warrants
  const minTier = shortageTier;
  const tierCuts = getTierCuts(bureauDeclaredTier);

  const selectedOption = bureauFundingOptionId
    ? ALTERNATIVES.find(a => a.id === bureauFundingOptionId) : null;
  const fedShare = selectedOption ? Math.round(selectedOption.cost * FEDERAL_SHARE) : 0;
  const canFund = federalFunding >= fedShare;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold" style={{ color: '#c8a87a' }}>
          Phase 2 — Federal Phase
        </h2>
        <Timer seconds={phaseTimeRemaining} onSkip={advancePhase} />
      </div>

      <div className="rounded border p-3 text-center" style={{ backgroundColor: '#0a1a2a', borderColor: '#2a7a8a' }}>
        <span className="text-sm" style={{ color: '#60a5fa' }}>
          Device to: <b>Bureau of Reclamation</b> — declare the shortage tier; other players may lobby verbally.
        </span>
      </div>

      <div className="panel">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Reservoir Indicator</div>
        <div className="flex items-center gap-4 flex-wrap">
          <div
            className="text-2xl font-bold"
            style={{ color: pct > 0.40 ? '#4ade80' : pct > 0.30 ? '#facc15' : pct > 0.20 ? '#fb923c' : '#f87171' }}
          >
            {reservoirLevel.toFixed(1)} MAF ({(pct * 100).toFixed(0)}%)
          </div>
          <div className="text-sm text-stone-400">
            Guidelines require at least <b className={`tier-${minTier}`}>Tier {minTier}</b>
          </div>
        </div>
        <div className="mt-2 h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#3a2a10' }}>
          <div
            className="h-full transition-all"
            style={{
              width: `${(pct * 100).toFixed(0)}%`,
              backgroundColor: pct > 0.40 ? '#4ade80' : pct > 0.30 ? '#facc15' : pct > 0.20 ? '#fb923c' : '#f87171',
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-stone-500 mt-0.5">
          <span>8% dead pool</span><span>20%</span><span>30%</span><span>40%</span><span>full</span>
        </div>
      </div>

      <div className="panel">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-3">
          Declare Shortage Tier — Year {year}
        </div>
        <div className="space-y-2">
          {([0, 1, 2, 3] as ShortageTier[]).map(tier => (
            <label
              key={tier}
              className="flex items-start gap-3 p-2 rounded cursor-pointer"
              style={{
                backgroundColor: bureauDeclaredTier === tier ? '#1a2a3a' : 'transparent',
                border: `1px solid ${bureauDeclaredTier === tier ? '#2a7a8a' : '#3a2a10'}`,
                opacity: tier < minTier ? 0.4 : 1,
              }}
            >
              <input
                type="radio"
                name="tier"
                checked={bureauDeclaredTier === tier}
                disabled={tier < minTier}
                onChange={() => setBureauDeclaredTier(tier)}
                className="mt-1"
                data-testid={`tier-${tier}`}
              />
              <div>
                <span className={`font-semibold tier-${tier}`}>Tier {tier}</span>
                <div className="text-sm text-stone-400">{TIER_DESCRIPTIONS[tier]}</div>
              </div>
            </label>
          ))}
        </div>
        {bureauDeclaredTier > 0 && (
          <div className="mt-3 text-sm rounded p-2" style={{ backgroundColor: '#1a1208' }}>
            <div className="text-stone-400 mb-1">Mandatory cuts under Tier {bureauDeclaredTier}:</div>
            {Object.entries(tierCuts).map(([pid, cut]) => (
              <div key={pid} className="text-stone-300">
                {getRoleById(pid as PlayerId).name}: −{cut.toFixed(1)} MAF
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Federal Funding Offer</div>
        <p className="text-sm text-stone-300 mb-3">
          Pot: <b style={{ color: '#4ade80' }}>${federalFunding}M</b>. A grant pays{' '}
          {FEDERAL_SHARE * 100}% of one investment's cost if the recipient starts it this year.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-stone-400 block mb-1">Offer grant to:</label>
            <select
              className="w-full"
              value={bureauFundingTargetId ?? ''}
              onChange={e => setBureauFunding((e.target.value || null) as PlayerId | null, null)}
              data-testid="funding-target"
            >
              <option value="">— No grant this year —</option>
              {PLAYER_ORDER.filter(id => id !== 'bureau').map(id => (
                <option key={id} value={id}>{getRoleById(id).name}</option>
              ))}
            </select>
          </div>
          {bureauFundingTargetId && (
            <div>
              <label className="text-xs text-stone-400 block mb-1">For:</label>
              <select
                className="w-full"
                value={bureauFundingOptionId ?? ''}
                onChange={e => setBureauFunding(bureauFundingTargetId, e.target.value || null)}
                data-testid="funding-option"
              >
                <option value="">— Select investment —</option>
                {ALTERNATIVES
                  .filter(a => a.eligiblePlayers.includes(bureauFundingTargetId) && a.cost > 0)
                  .map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} (grant ${Math.round(a.cost * FEDERAL_SHARE)}M)
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
        {selectedOption && !canFund && (
          <div className="text-xs mt-2" style={{ color: '#f87171' }}>
            Insufficient federal funds for this grant — it will not apply.
          </div>
        )}
      </div>

      <button className="btn-primary w-full" onClick={advancePhase} data-testid="to-negotiation">
        Declare Tier {bureauDeclaredTier} → Negotiation
      </button>
    </div>
  );
}
