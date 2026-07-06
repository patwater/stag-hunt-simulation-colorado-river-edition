import {
  useGameStore, RESERVOIR_CAPACITY, DEAD_POOL_THRESHOLD, getTierCuts,
} from '../../store/gameStore';
import { getRoleById } from '../../data/roles';
import { getAlternativeById } from '../../data/alternatives';
import { Timer } from '../Timer';
import type { DefectionType, PlayerId } from '../../data/types';

const DEFECTION_LABELS: Record<DefectionType, [string, string]> = {
  none: ['Cooperated', '#4ade80'],
  overdraw: ['OVERDRAW', '#f87171'],
  refuse_cut: ['REFUSED CUT', '#fb923c'],
  litigation: ['LITIGATION', '#facc15'],
};

export function PhaseResolution() {
  const commitments = useGameStore(s => s.commitments);
  const currentFlowCard = useGameStore(s => s.currentFlowCard);
  const reservoirLevel = useGameStore(s => s.reservoirLevel);
  const bureauDeclaredTier = useGameStore(s => s.bureauDeclaredTier);
  const phaseTimeRemaining = useGameStore(s => s.phaseTimeRemaining);
  const year = useGameStore(s => s.year);
  const climateDrift = useGameStore(s => s.climateDrift);
  const supplyBonus = useGameStore(s => s.supplyBonus);
  const advancePhase = useGameStore(s => s.advancePhase);

  const effectiveFlow = currentFlowCard
    ? Math.max(0, currentFlowCard.naturalFlow + climateDrift + supplyBonus) : 0;
  const tierCuts = getTierCuts(bureauDeclaredTier);

  // Projection mirrors the engine's diversion rules (leases net ~zero)
  let projectedDiversions = 0;
  for (const [id, c] of Object.entries(commitments)) {
    if (id === 'bureau') continue;
    const role = getRoleById(id as PlayerId);
    const cutTarget = Math.max(0, role.baseDiversion - (tierCuts[id as PlayerId] ?? 0));
    if (c.defectionType === 'overdraw') {
      projectedDiversions += Math.min(c.intendedDiversion * 1.2, role.maxDiversion);
    } else if (c.defectionType === 'refuse_cut') {
      projectedDiversions += Math.min(c.intendedDiversion, role.maxDiversion);
    } else {
      projectedDiversions += Math.min(c.intendedDiversion, cutTarget);
    }
  }

  const evaporation = Math.max(0.3, reservoirLevel * 0.04);
  const projectedChange = effectiveFlow - projectedDiversions - evaporation;
  const projectedLevel = Math.min(RESERVOIR_CAPACITY, Math.max(0, reservoirLevel + projectedChange));
  const projectedPct = (projectedLevel / RESERVOIR_CAPACITY) * 100;
  const projectedDeadPool = projectedLevel <= DEAD_POOL_THRESHOLD;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold" style={{ color: '#c8a87a' }}>Phase 5 — Resolution</h2>
        <Timer seconds={phaseTimeRemaining} />
      </div>

      <p className="text-sm text-stone-400">
        All commitments revealed. Read the table out loud, then resolve the year.
      </p>

      <div className="panel overflow-x-auto">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-3">The Reveal</div>
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="text-left text-stone-500 text-xs">
              <th className="pb-2 pr-3">Player</th>
              <th className="pb-2 pr-3">Committed</th>
              <th className="pb-2 pr-3">Choice</th>
              <th className="pb-2">Investment</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(commitments).map(([id, c]) => {
              const role = getRoleById(id as PlayerId);
              const [label, color] = DEFECTION_LABELS[c.defectionType];
              const alt = c.alternativeOptionId ? getAlternativeById(c.alternativeOptionId) : null;
              return (
                <tr key={id} className="border-t" style={{ borderColor: '#3a2a10' }}>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} />
                      <span className="text-stone-200">{role.abbreviation}</span>
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    {id === 'bureau'
                      ? <span className="text-stone-500 text-xs">oversight</span>
                      : <b style={{ color: '#60a5fa' }}>{c.intendedDiversion.toFixed(1)} MAF</b>}
                  </td>
                  <td className="py-2 pr-3">
                    <span className="text-xs font-semibold" style={{ color }}>{label}</span>
                    {c.defectionType === 'litigation' && c.litigationTarget && (
                      <span className="text-xs text-stone-400 ml-1">
                        vs {getRoleById(c.litigationTarget).abbreviation}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-xs text-stone-400">
                    {alt ? alt.name : '—'}
                    {alt?.effectType === 'water_lease' && c.leaseTargetId &&
                      ` → ${getRoleById(c.leaseTargetId).abbreviation}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-3">Projected Water Balance</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
          <div>
            <div className="text-xs text-stone-400">Effective flow</div>
            <div className="font-bold" style={{ color: '#60a5fa' }}>{effectiveFlow.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-xs text-stone-400">Diversions</div>
            <div className="font-bold" style={{ color: '#f87171' }}>−{projectedDiversions.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-xs text-stone-400">Evaporation</div>
            <div className="font-bold text-stone-300">−{evaporation.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-xs text-stone-400">Reservoir →</div>
            <div
              className="font-bold"
              style={{
                color: projectedPct > 40 ? '#4ade80' : projectedPct > 30 ? '#facc15'
                  : projectedPct > 20 ? '#fb923c' : '#f87171',
              }}
            >
              {projectedLevel.toFixed(1)} ({projectedPct.toFixed(0)}%)
            </div>
          </div>
        </div>
        {projectedDeadPool && (
          <div
            className="mt-3 text-center font-bold rounded p-3"
            style={{ backgroundColor: '#3a0000', color: '#f87171', border: '2px solid #dc2626' }}
          >
            ⚠ PROJECTED DEAD POOL — resolving will end the game for everyone.
          </div>
        )}
      </div>

      <button
        className={projectedDeadPool ? 'btn-danger w-full text-lg py-3' : 'btn-primary w-full text-lg py-3'}
        onClick={advancePhase}
        data-testid="resolve-year"
      >
        {year >= 10 ? 'Resolve Final Year → Scores' : `Resolve Year ${year} →`}
      </button>
    </div>
  );
}
