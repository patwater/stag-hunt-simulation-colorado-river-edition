import { useGameStore } from '../../store/gameStore';
import { Timer } from '../Timer';
import { RESERVOIR_CAPACITY } from '../../store/gameStore';

export function PhaseHydrology() {
  const {
    year, currentFlowCard, reservoirLevel, shortageTier, climateDrift,
    phaseTimeRemaining, drawCard, advancePhase, supplyBonus,
  } = useGameStore();

  const legalDemand = 18.5; // TUNING: approximate total legal allocations (MAF)
  const effectiveFlow = currentFlowCard
    ? Math.max(0, currentFlowCard.naturalFlow + climateDrift + supplyBonus)
    : null;
  const gap = effectiveFlow != null ? effectiveFlow - legalDemand : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: '#c8a87a' }}>
          Phase 1 — Hydrology Draw
        </h2>
        <Timer
          seconds={phaseTimeRemaining}
          label="Time:"
          onSkip={currentFlowCard ? advancePhase : undefined}
        />
      </div>

      <div className="text-sm text-stone-400">
        Water Year <span className="font-bold text-stone-200">{year}</span> of 10.
        Draw the hydrology card to see this year's natural flow.
      </div>

      {!currentFlowCard ? (
        <div className="text-center py-8">
          <div className="text-stone-400 mb-4">
            Place the hydrology card face-down. When all players are ready, reveal it.
          </div>
          <button className="btn-primary text-lg px-8 py-3" onClick={drawCard}>
            Draw Hydrology Card
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Card reveal */}
          <div
            className="rounded-lg border-2 p-5"
            style={{
              borderColor: currentFlowCard.isExtreme ? '#dc2626' : '#2a7a8a',
              backgroundColor: currentFlowCard.isExtreme ? '#2a0a0a' : '#0a1a2a',
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-2xl" style={{ color: '#60a5fa' }}>
                    {currentFlowCard.name}
                  </span>
                  {currentFlowCard.isExtreme && (
                    <span className="text-xs font-bold bg-red-900 text-red-300 px-2 py-0.5 rounded uppercase tracking-wider">
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

          {/* Flow vs demand analysis */}
          <div className="panel">
            <div className="text-xs uppercase tracking-wider text-stone-500 mb-3">
              Flow Analysis
            </div>
            <div className="grid grid-cols-3 gap-4 text-center mb-3">
              <div>
                <div className="text-xs text-stone-400 mb-1">Natural Flow</div>
                <div className="text-xl font-bold" style={{ color: '#60a5fa' }}>
                  {currentFlowCard.naturalFlow.toFixed(1)} MAF
                </div>
              </div>
              {(climateDrift < 0 || supplyBonus > 0) && (
                <div>
                  <div className="text-xs text-stone-400 mb-1">Adjustments</div>
                  <div className="text-xl font-bold" style={{ color: climateDrift < 0 ? '#fb923c' : '#4ade80' }}>
                    {(climateDrift + supplyBonus).toFixed(1)} MAF
                  </div>
                  <div className="text-xs text-stone-500">
                    {climateDrift.toFixed(1)} drift + {supplyBonus.toFixed(1)} supply
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs text-stone-400 mb-1">Effective Flow</div>
                <div className="text-xl font-bold" style={{ color: '#4ade80' }}>
                  {(effectiveFlow ?? 0).toFixed(1)} MAF
                </div>
              </div>
              <div>
                <div className="text-xs text-stone-400 mb-1">Total Legal Demand</div>
                <div className="text-xl font-bold" style={{ color: '#f87171' }}>
                  {legalDemand.toFixed(1)} MAF
                </div>
              </div>
              <div>
                <div className="text-xs text-stone-400 mb-1">Flow vs Demand</div>
                <div
                  className="text-xl font-bold"
                  style={{ color: (gap ?? 0) >= 0 ? '#4ade80' : '#f87171' }}
                >
                  {gap != null && gap >= 0 ? '+' : ''}{(gap ?? 0).toFixed(1)} MAF
                </div>
              </div>
            </div>

            {gap != null && gap < 0 && (
              <div
                className="text-sm rounded p-2 text-center"
                style={{ backgroundColor: '#2a0a0a', color: '#f87171' }}
              >
                ⚠ Flow is {Math.abs(gap).toFixed(1)} MAF below legal demand.
                Reservoir drawdown likely unless players cut diversions.
              </div>
            )}
          </div>

          {/* Reservoir context */}
          <div className="panel">
            <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">
              Current Reservoir Status
            </div>
            <div className="flex items-center gap-4">
              <div>
                <div className="text-2xl font-bold" style={{
                  color: reservoirLevel / RESERVOIR_CAPACITY > 0.40 ? '#4ade80'
                    : reservoirLevel / RESERVOIR_CAPACITY > 0.30 ? '#facc15'
                    : reservoirLevel / RESERVOIR_CAPACITY > 0.20 ? '#fb923c'
                    : '#f87171'
                }}>
                  {reservoirLevel.toFixed(1)} MAF
                </div>
                <div className="text-stone-400 text-sm">
                  {(reservoirLevel / RESERVOIR_CAPACITY * 100).toFixed(0)}% of capacity
                </div>
              </div>
              <div className="text-sm text-stone-400">
                Current shortage tier:{' '}
                <span className={`font-bold tier-${shortageTier}`}>Tier {shortageTier}</span>
              </div>
            </div>
          </div>

          <button className="btn-primary w-full" onClick={advancePhase}>
            Proceed to Federal Phase →
          </button>
        </div>
      )}
    </div>
  );
}
