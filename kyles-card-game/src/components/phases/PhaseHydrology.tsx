import { useGameStore, RESERVOIR_CAPACITY } from '../../store/gameStore';
import { Timer } from '../Timer';

// TUNING: display constant — total legal demand shown for comparison
const LEGAL_DEMAND = 18.5;

export function PhaseHydrology() {
  const year = useGameStore(s => s.year);
  const currentFlowCard = useGameStore(s => s.currentFlowCard);
  const reservoirLevel = useGameStore(s => s.reservoirLevel);
  const climateDrift = useGameStore(s => s.climateDrift);
  const supplyBonus = useGameStore(s => s.supplyBonus);
  const phaseTimeRemaining = useGameStore(s => s.phaseTimeRemaining);
  const drawCard = useGameStore(s => s.drawCard);
  const advancePhase = useGameStore(s => s.advancePhase);

  const effectiveFlow = currentFlowCard
    ? Math.max(0, currentFlowCard.naturalFlow + climateDrift + supplyBonus)
    : null;
  const gap = effectiveFlow != null ? effectiveFlow - LEGAL_DEMAND : null;
  const pct = reservoirLevel / RESERVOIR_CAPACITY;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold" style={{ color: '#c8a87a' }}>
          Phase 1 — Hydrology Draw
        </h2>
        <Timer seconds={phaseTimeRemaining} onSkip={currentFlowCard ? advancePhase : undefined} />
      </div>

      <p className="text-sm text-stone-400">
        Water Year <b className="text-stone-200">{year}</b> of 10. Reveal this year's natural flow.
      </p>

      {!currentFlowCard ? (
        <div className="text-center py-10">
          <button className="btn-primary text-lg px-8 py-3" onClick={drawCard} data-testid="draw-card">
            Draw Hydrology Card
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            className="rounded-lg border-2 p-5"
            style={{
              borderColor: currentFlowCard.isExtreme ? '#dc2626' : '#2a7a8a',
              backgroundColor: currentFlowCard.isExtreme ? '#2a0a0a' : '#0a1a2a',
            }}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-bold text-2xl" style={{ color: '#60a5fa' }}>
                    {currentFlowCard.name}
                  </span>
                  {currentFlowCard.isExtreme && (
                    <span className="text-xs font-bold bg-red-900 text-red-300 px-2 py-0.5 rounded uppercase">
                      Extreme Year
                    </span>
                  )}
                </div>
                <div className="text-stone-400 text-sm">Historical reference: {currentFlowCard.historicalYear}</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold" style={{ color: '#60a5fa' }}>
                  {currentFlowCard.naturalFlow.toFixed(1)}
                </div>
                <div className="text-stone-400 text-sm">MAF natural flow</div>
              </div>
            </div>
            <p className="text-stone-300 text-sm italic mt-2">{currentFlowCard.description}</p>
          </div>

          <div className="panel">
            <div className="text-xs uppercase tracking-wider text-stone-500 mb-3">Flow vs Demand</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div>
                <div className="text-xs text-stone-400 mb-1">Natural Flow</div>
                <div className="text-lg font-bold" style={{ color: '#60a5fa' }}>
                  {currentFlowCard.naturalFlow.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-xs text-stone-400 mb-1">Drift + Supply</div>
                <div className="text-lg font-bold" style={{ color: climateDrift + supplyBonus < 0 ? '#fb923c' : '#4ade80' }}>
                  {(climateDrift + supplyBonus) >= 0 ? '+' : ''}{(climateDrift + supplyBonus).toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-xs text-stone-400 mb-1">Effective Flow</div>
                <div className="text-lg font-bold" style={{ color: '#4ade80' }}>
                  {(effectiveFlow ?? 0).toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-xs text-stone-400 mb-1">vs Legal Demand</div>
                <div className="text-lg font-bold" style={{ color: (gap ?? 0) >= 0 ? '#4ade80' : '#f87171' }}>
                  {(gap ?? 0) >= 0 ? '+' : ''}{(gap ?? 0).toFixed(1)}
                </div>
              </div>
            </div>
            {gap != null && gap < 0 && (
              <div className="text-sm rounded p-2 text-center mt-3" style={{ backgroundColor: '#2a0a0a', color: '#f87171' }}>
                Flow is {Math.abs(gap).toFixed(1)} MAF below total legal demand.
                Someone has to take less — or the reservoir does.
              </div>
            )}
          </div>

          <div className="panel flex items-center gap-4 flex-wrap">
            <div className="text-xs uppercase tracking-wider text-stone-500">Reservoir</div>
            <div
              className="text-xl font-bold"
              style={{
                color: pct > 0.40 ? '#4ade80' : pct > 0.30 ? '#facc15' : pct > 0.20 ? '#fb923c' : '#f87171',
              }}
            >
              {reservoirLevel.toFixed(1)} MAF · {(pct * 100).toFixed(0)}%
            </div>
          </div>

          <button className="btn-primary w-full" onClick={advancePhase} data-testid="to-federal">
            Proceed to Federal Phase →
          </button>
        </div>
      )}
    </div>
  );
}
