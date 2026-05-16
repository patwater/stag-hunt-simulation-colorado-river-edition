import { useGameStore, RESERVOIR_CAPACITY, DEAD_POOL_THRESHOLD } from '../../store/gameStore';
import { getRoleById } from '../../data/roles';
import { ALTERNATIVES } from '../../data/alternatives';
import { Timer } from '../Timer';
import type { DefectionType, PlayerId } from '../../data/types';

const DEFECTION_LABELS: Record<DefectionType, string> = {
  none: 'Cooperated',
  overdraw: 'OVERDRAW',
  refuse_cut: 'REFUSED CUT',
  litigation: 'LITIGATION',
};

const DEFECTION_COLORS: Record<DefectionType, string> = {
  none: '#4ade80',
  overdraw: '#f87171',
  refuse_cut: '#fb923c',
  litigation: '#facc15',
};

export function PhaseResolution() {
  const {
    commitments, currentFlowCard, reservoirLevel,
    players, phaseTimeRemaining, advancePhase, activeAlternatives,
    year, activeLitigation, climateDrift, supplyBonus,
  } = useGameStore();

  const effectiveFlow = currentFlowCard
    ? Math.max(0, currentFlowCard.naturalFlow + climateDrift + supplyBonus)
    : 0;

  const isDeadPool = reservoirLevel <= DEAD_POOL_THRESHOLD;

  // Total committed diversions (approximate — actual resolution happens in store action)
  const totalCommitted = Object.entries(commitments).reduce((sum, [id, c]) => {
    if (id === 'bureau') return sum;
    const role = getRoleById(id as PlayerId);
    let div = c.intendedDiversion;
    if (c.defectionType === 'overdraw') div = Math.min(div * 1.2, role.maxDiversion);
    return sum + div;
  }, 0);

  const evaporation = Math.max(0.3, reservoirLevel * 0.04);
  const projectedChange = effectiveFlow - totalCommitted - evaporation;
  const projectedLevel = Math.min(52, Math.max(0, reservoirLevel + projectedChange));
  const projectedPct = projectedLevel / RESERVOIR_CAPACITY * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: '#c8a87a' }}>
          Phase 5 — Resolution
        </h2>
        <Timer seconds={phaseTimeRemaining} label="Time:" onSkip={advancePhase} />
      </div>

      <div className="text-sm text-stone-400">
        All commitments revealed. Review the table, then proceed to update the reservoir.
      </div>

      {/* Flow summary */}
      <div className="panel">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-3">Year {year} Summary</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-stone-400">Natural Flow</div>
            <div className="font-bold" style={{ color: '#60a5fa' }}>
              {currentFlowCard ? currentFlowCard.naturalFlow.toFixed(1) : '—'} MAF
            </div>
          </div>
          <div>
            <div className="text-stone-400">Effective Flow (w/ drift)</div>
            <div className="font-bold" style={{ color: '#60a5fa' }}>
              {effectiveFlow.toFixed(1)} MAF
            </div>
          </div>
          <div>
            <div className="text-stone-400">Total Committed Diversions</div>
            <div className="font-bold" style={{ color: '#f87171' }}>
              {totalCommitted.toFixed(1)} MAF
            </div>
          </div>
          <div>
            <div className="text-stone-400">Evaporation (est.)</div>
            <div className="font-bold text-stone-300">{evaporation.toFixed(1)} MAF</div>
          </div>
          <div>
            <div className="text-stone-400">Projected Δ Reservoir</div>
            <div
              className="font-bold"
              style={{ color: projectedChange >= 0 ? '#4ade80' : '#f87171' }}
            >
              {projectedChange >= 0 ? '+' : ''}{projectedChange.toFixed(1)} MAF
            </div>
          </div>
          <div>
            <div className="text-stone-400">Projected New Level</div>
            <div
              className="font-bold"
              style={{
                color: projectedPct > 40 ? '#4ade80'
                  : projectedPct > 30 ? '#facc15'
                  : projectedPct > 20 ? '#fb923c' : '#f87171',
              }}
            >
              {projectedLevel.toFixed(1)} MAF ({projectedPct.toFixed(0)}%)
            </div>
          </div>
        </div>

        {projectedLevel <= DEAD_POOL_THRESHOLD && (
          <div
            className="mt-3 text-center font-bold text-lg rounded p-3"
            style={{ backgroundColor: '#3a0000', color: '#f87171', border: '2px solid #dc2626' }}
          >
            ⚠ WARNING: Reservoir approaching dead pool.
            {projectedLevel <= 0 && ' DEAD POOL REACHED — GAME OVER'}
          </div>
        )}
      </div>

      {/* Commitment reveal table */}
      <div className="panel overflow-x-auto">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-3">
          Commitment Reveal
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-stone-500 text-xs">
              <th className="pb-2 pr-3">Player</th>
              <th className="pb-2 pr-3">Committed</th>
              <th className="pb-2 pr-3">Defection</th>
              <th className="pb-2 pr-3">Alternative</th>
              <th className="pb-2">Notes</th>
            </tr>
          </thead>
          <tbody className="space-y-1">
            {Object.entries(commitments).map(([id, c]) => {
              const role = getRoleById(id as PlayerId);
              const player = players.find(p => p.id === id as PlayerId)!;
              const defLabel = DEFECTION_LABELS[c.defectionType];
              const defColor = DEFECTION_COLORS[c.defectionType];
              const alt = c.alternativeOptionId
                ? ALTERNATIVES.find(a => a.id === c.alternativeOptionId)
                : null;
              return (
                <tr key={id} className="border-t" style={{ borderColor: '#3a2a10' }}>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} />
                      <span className="text-stone-200">{role.abbreviation}</span>
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    {id === 'bureau' ? (
                      <span className="text-stone-400 text-xs">oversight</span>
                    ) : (
                      <span className="font-bold" style={{ color: '#60a5fa' }}>
                        {c.intendedDiversion.toFixed(1)} MAF
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <span className="text-xs font-semibold" style={{ color: defColor }}>
                      {defLabel}
                    </span>
                    {c.defectionType === 'litigation' && c.litigationTarget && (
                      <span className="text-xs text-stone-400 ml-1">
                        vs {getRoleById(c.litigationTarget).abbreviation}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-xs text-stone-400">
                    {alt ? alt.name : '—'}
                  </td>
                  <td className="py-2 text-xs text-stone-500">
                    PC: {player.politicalCapital} · ${player.budget}M
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Active litigation */}
      {activeLitigation.length > 0 && (
        <div className="panel">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">
            Active Litigation
          </div>
          {activeLitigation.map(lit => (
            <div key={lit.id} className="text-sm" style={{ color: '#facc15' }}>
              ⚖ {lit.description} — {lit.turnsRemaining} turn(s) remaining
            </div>
          ))}
        </div>
      )}

      {/* In-progress alternatives */}
      {activeAlternatives.filter(a => a.status === 'in_progress').length > 0 && (
        <div className="panel">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">
            Investments In Progress
          </div>
          {activeAlternatives.filter(a => a.status === 'in_progress').map(alt => (
            <div key={alt.id} className="text-sm text-stone-300 flex gap-2">
              <span style={{ color: '#c084fc' }}>⚙</span>
              {alt.optionId.replace(/_/g, ' ')} ({getRoleById(alt.playerId).abbreviation})
              — {alt.turnsRemaining - 1} turn(s) remaining after this resolution
            </div>
          ))}
        </div>
      )}

      <button
        className="btn-primary w-full text-lg py-3"
        onClick={advancePhase}
        style={isDeadPool ? { backgroundColor: '#7a1a1a' } : {}}
      >
        {year >= 10
          ? 'Resolve Year 10 → Final Scores'
          : isDeadPool
          ? 'Resolve → Dead Pool (Game Over)'
          : `Resolve Year ${year} → Water Year ${year + 1}`}
      </button>
      <p className="text-xs text-stone-500 text-center">
        Clicking resolve will calculate actual diversions, update reservoir, and score the year.
      </p>
    </div>
  );
}
