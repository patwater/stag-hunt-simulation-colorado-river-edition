import { useGameStore } from '../store/gameStore';
import { ROLES } from '../data/roles';
import { ReservoirChart } from './ReservoirChart';
import { GameLog } from './GameLog';

const TIER_LABELS = ['Tier 0 — Normal', 'Tier 1 — Shortage', 'Tier 2 — Severe', 'Tier 3 — Emergency'];
const TIER_COLORS = ['#4ade80', '#facc15', '#fb923c', '#f87171'];
const PHASE_LABELS: Record<string, string> = {
  setup: 'Setup',
  hydrology: '1 — Hydrology Draw',
  federal: '2 — Federal Phase',
  negotiation: '3 — Negotiation',
  commitment: '4 — Commitment',
  resolution: '5 — Resolution',
  game_over: 'Game Over',
};

export function Dashboard() {
  const {
    phase, year, reservoirHistory, reservoirLevel, shortageTier,
    players, currentFlowCard, climateDrift, bindingAgreements, gameLog,
    activeAlternatives,
  } = useGameStore();

  // TUNING: these totals match roles.ts baseDiversion values
  const totalLegalAllocations = 18.5; // MAF — compact + treaty, approximate
  const avgRecentFlow = 12.5;         // MAF — post-2000 average, approximate

  const tierColor = TIER_COLORS[shortageTier];

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto">
      {/* Header */}
      <div className="panel-dark">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold tracking-wide" style={{ color: '#c8a87a' }}>
            Stag Hunt on the Colorado
          </h1>
          <span className="text-sm text-stone-400">Water Year {year} / 10</span>
        </div>
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className="text-stone-400">Phase:</span>
          <span className="font-semibold" style={{ color: '#f0e8d8' }}>
            {PHASE_LABELS[phase] ?? phase}
          </span>
          <span style={{ color: tierColor }} className="font-semibold">
            {TIER_LABELS[shortageTier]}
          </span>
        </div>
      </div>

      {/* Structural overallocation banner — always visible, the pedagogical core */}
      <div className="panel-dark border-l-4" style={{ borderLeftColor: '#7a1a1a' }}>
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Structural Over-allocation</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-sm text-stone-400">Legal Allocations</div>
            <div className="text-lg font-bold" style={{ color: '#f87171' }}>~{totalLegalAllocations} MAF/yr</div>
          </div>
          <div>
            <div className="text-sm text-stone-400">Avg Flow (post-2000)</div>
            <div className="text-lg font-bold" style={{ color: '#60a5fa' }}>~{avgRecentFlow} MAF/yr</div>
          </div>
          <div>
            <div className="text-sm text-stone-400">Structural Gap</div>
            <div className="text-lg font-bold" style={{ color: '#fb923c' }}>
              ~{(totalLegalAllocations - avgRecentFlow).toFixed(1)} MAF/yr
            </div>
          </div>
        </div>
        {climateDrift < 0 && (
          <div className="text-xs text-stone-500 mt-1 text-center">
            Climate drift: {climateDrift.toFixed(1)} MAF cumulative
          </div>
        )}
      </div>

      {/* Reservoir chart */}
      <div className="panel">
        <ReservoirChart
          history={reservoirHistory}
          currentLevel={reservoirLevel}
          currentYear={year}
        />
      </div>

      {/* Current hydrology card */}
      {currentFlowCard && (
        <div className="panel border-l-4" style={{ borderLeftColor: '#2a7a8a' }}>
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">
            Hydrology Draw — Year {year}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-lg" style={{ color: '#60a5fa' }}>
              {currentFlowCard.name}
            </span>
            {currentFlowCard.isExtreme && (
              <span className="text-xs bg-red-900 text-red-300 px-1 rounded">EXTREME</span>
            )}
            <span className="text-stone-400 text-sm">({currentFlowCard.historicalYear})</span>
          </div>
          <div className="text-xl font-bold" style={{ color: '#60a5fa' }}>
            {currentFlowCard.naturalFlow.toFixed(1)} MAF natural flow
          </div>
          <div className="text-sm text-stone-400 mt-1">{currentFlowCard.description}</div>
        </div>
      )}

      {/* Player scores */}
      <div className="panel">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Players</div>
        <div className="space-y-1">
          {ROLES.map(role => {
            const player = players.find(p => p.id === role.id);
            if (!player) return null;
            return (
              <div key={role.id} className="flex items-center gap-2 text-sm">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: role.color }}
                />
                <span className="text-stone-300 w-24 shrink-0 text-xs">{role.abbreviation}</span>
                <span className="font-bold" style={{ color: '#f0e8d8' }}>
                  {player.publicScore}pts
                </span>
                <span className="text-stone-500 text-xs">
                  PC:{player.politicalCapital}
                </span>
                <span className="text-stone-500 text-xs">
                  ${player.budget}M
                </span>
                {player.litigationDelay > 0 && (
                  <span className="text-xs" style={{ color: '#fb923c' }}>⚖ {player.litigationDelay}t</span>
                )}
                {player.hasCommittedThisYear && (
                  <span className="text-xs" style={{ color: '#4ade80' }}>✓</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active alternatives */}
      {activeAlternatives.filter(a => a.status === 'in_progress').length > 0 && (
        <div className="panel">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Active Investments</div>
          <div className="space-y-1">
            {activeAlternatives.filter(a => a.status === 'in_progress').map(alt => (
              <div key={alt.id} className="text-xs text-stone-300 flex gap-2">
                <span style={{ color: '#c084fc' }}>⚙</span>
                <span>{alt.optionId.replace(/_/g, ' ')} ({alt.playerId})</span>
                <span className="text-stone-500">{alt.turnsRemaining}t remaining</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Binding agreements */}
      {bindingAgreements.filter(a => a.isBinding).length > 0 && (
        <div className="panel">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Binding Agreements</div>
          <div className="space-y-1">
            {bindingAgreements.filter(a => a.isBinding).slice(-5).map(ag => (
              <div key={ag.id} className="text-xs" style={{ color: '#4ade80' }}>
                Y{ag.year}: {ag.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game log */}
      <div className="panel flex-1">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Event Log</div>
        <GameLog entries={gameLog} maxHeight="150px" />
      </div>
    </div>
  );
}
