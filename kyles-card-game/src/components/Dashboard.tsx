import { useGameStore } from '../store/gameStore';
import { ROLES } from '../data/roles';
import { getAlternativeById } from '../data/alternatives';
import { ReservoirChart } from './ReservoirChart';
import { GameLog } from './GameLog';

const TIER_LABELS = ['Tier 0 — Normal', 'Tier 1 — Shortage', 'Tier 2 — Severe', 'Tier 3 — Emergency'];
const TIER_COLORS = ['#4ade80', '#facc15', '#fb923c', '#f87171'];
const PHASE_LABELS: Record<string, string> = {
  hydrology: '1 · Hydrology Draw',
  federal: '2 · Federal Phase',
  negotiation: '3 · Negotiation',
  commitment: '4 · Commitment',
  resolution: '5 · Resolution',
};

// TUNING: display constants matching roles.ts totals
const TOTAL_LEGAL = 18.5;
const AVG_RECENT_FLOW = 12.5;

export function Dashboard() {
  const phase = useGameStore(s => s.phase);
  const year = useGameStore(s => s.year);
  const reservoirHistory = useGameStore(s => s.reservoirHistory);
  const reservoirLevel = useGameStore(s => s.reservoirLevel);
  const shortageTier = useGameStore(s => s.shortageTier);
  const players = useGameStore(s => s.players);
  const currentFlowCard = useGameStore(s => s.currentFlowCard);
  const climateDrift = useGameStore(s => s.climateDrift);
  const agreements = useGameStore(s => s.agreements);
  const gameLog = useGameStore(s => s.gameLog);
  const activeAlternatives = useGameStore(s => s.activeAlternatives);
  const federalFunding = useGameStore(s => s.federalFunding);

  const inProgress = activeAlternatives.filter(a => a.status === 'in_progress');
  const binding = agreements.filter(a => a.isBinding);

  return (
    <div className="flex flex-col gap-3">
      <div className="panel-dark">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold tracking-wide" style={{ color: '#c8a87a' }}>
            Stag Hunt on the Colorado
          </h1>
          <span className="text-sm text-stone-400">Year {year}/10</span>
        </div>
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className="font-semibold">{PHASE_LABELS[phase] ?? phase}</span>
          <span style={{ color: TIER_COLORS[shortageTier] }} className="font-semibold">
            {TIER_LABELS[shortageTier]}
          </span>
        </div>
      </div>

      {/* The pedagogical core — always visible */}
      <div className="panel-dark border-l-4" style={{ borderLeftColor: '#7a1a1a' }}>
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Structural Over-allocation</div>
        <div className="grid grid-cols-3 gap-1 text-center">
          <div>
            <div className="text-xs text-stone-400">Legal claims</div>
            <div className="font-bold" style={{ color: '#f87171' }}>~{TOTAL_LEGAL} MAF</div>
          </div>
          <div>
            <div className="text-xs text-stone-400">Avg flow</div>
            <div className="font-bold" style={{ color: '#60a5fa' }}>~{AVG_RECENT_FLOW} MAF</div>
          </div>
          <div>
            <div className="text-xs text-stone-400">Gap</div>
            <div className="font-bold" style={{ color: '#fb923c' }}>
              ~{(TOTAL_LEGAL - AVG_RECENT_FLOW).toFixed(0)} MAF/yr
            </div>
          </div>
        </div>
        {climateDrift < -0.01 && (
          <div className="text-xs text-stone-500 mt-1 text-center">
            Climate drift: {climateDrift.toFixed(1)} MAF cumulative
          </div>
        )}
      </div>

      <div className="panel">
        <ReservoirChart
          history={reservoirHistory}
          currentLevel={reservoirLevel}
          currentYear={year}
        />
      </div>

      {currentFlowCard && (
        <div className="panel border-l-4" style={{ borderLeftColor: '#2a7a8a' }}>
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">This Year's Flow</div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-bold" style={{ color: '#60a5fa' }}>{currentFlowCard.name}</span>
            {currentFlowCard.isExtreme && (
              <span className="text-xs bg-red-900 text-red-300 px-1 rounded">EXTREME</span>
            )}
            <span className="text-lg font-bold" style={{ color: '#60a5fa' }}>
              {currentFlowCard.naturalFlow.toFixed(1)} MAF
            </span>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-wider text-stone-500">Players</div>
          <div className="text-xs text-stone-500">Fed pot: <span style={{ color: '#4ade80' }}>${federalFunding}M</span></div>
        </div>
        <div className="space-y-1">
          {ROLES.map(role => {
            const p = players.find(pl => pl.id === role.id);
            if (!p) return null;
            return (
              <div key={role.id} className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
                <span className="text-stone-300 w-24 shrink-0 text-xs">{role.abbreviation}</span>
                <span className="font-bold">{p.publicScore}</span>
                <span className="text-stone-500 text-xs">PC {p.politicalCapital}</span>
                <span className="text-stone-500 text-xs">${p.budget}M</span>
                {p.litigationBlock > 0 && (
                  <span className="text-xs" style={{ color: '#fb923c' }}>⚖{p.litigationBlock}</span>
                )}
                {p.hasCommittedThisYear && phase === 'commitment' && (
                  <span className="text-xs" style={{ color: '#4ade80' }}>✓</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {inProgress.length > 0 && (
        <div className="panel">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Building</div>
          {inProgress.map(alt => (
            <div key={alt.id} className="text-xs text-stone-300 flex gap-2">
              <span style={{ color: '#c084fc' }}>⚙</span>
              <span>{getAlternativeById(alt.optionId).name}</span>
              <span className="text-stone-500">({ROLES.find(r => r.id === alt.playerId)?.abbreviation}, {alt.turnsRemaining}yr)</span>
            </div>
          ))}
        </div>
      )}

      {binding.length > 0 && (
        <div className="panel">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Binding Agreements</div>
          {binding.slice(-4).map(ag => (
            <div key={ag.id} className="text-xs mb-1" style={{ color: '#4ade80' }}>
              Y{ag.year}: {ag.text}
            </div>
          ))}
        </div>
      )}

      <div className="panel">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Event Log</div>
        <GameLog entries={gameLog} maxHeight="160px" />
      </div>
    </div>
  );
}
