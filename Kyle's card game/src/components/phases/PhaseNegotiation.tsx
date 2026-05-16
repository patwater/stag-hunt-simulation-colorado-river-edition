import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ROLES, PLAYER_ORDER } from '../../data/roles';
import { Timer } from '../Timer';
import { getTierCuts } from '../../store/gameStore';
import type { PlayerId } from '../../data/types';

export function PhaseNegotiation() {
  const {
    year, phaseTimeRemaining, bureauDeclaredTier, bindingAgreements,
    addAgreement, advancePhase, currentFlowCard, reservoirLevel,
    players,
  } = useGameStore();

  const [agreementText, setAgreementText] = useState('');
  const [selectedParties, setSelectedParties] = useState<PlayerId[]>([]);
  const [isBinding, setIsBinding] = useState(true);

  const tierCuts = getTierCuts(bureauDeclaredTier);

  function handleAddAgreement() {
    if (!agreementText.trim()) return;
    addAgreement(agreementText.trim(), selectedParties, isBinding);
    setAgreementText('');
    setSelectedParties([]);
  }

  function toggleParty(id: PlayerId) {
    setSelectedParties(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id],
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: '#c8a87a' }}>
          Phase 3 — Negotiation
        </h2>
        <Timer seconds={phaseTimeRemaining} label="Time:" onSkip={advancePhase} />
      </div>

      <div className="text-sm text-stone-400">
        Open negotiation — all players. Discuss verbally. Log any agreements below. Binding agreements
        are publicly recorded; whisper deals are private and non-binding.
      </div>

      {/* Situation summary */}
      <div className="panel">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">
          Negotiation Context — Year {year}
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-stone-400">Natural Flow</div>
            <div className="font-bold" style={{ color: '#60a5fa' }}>
              {currentFlowCard ? `${currentFlowCard.naturalFlow.toFixed(1)} MAF` : '—'}
            </div>
          </div>
          <div>
            <div className="text-stone-400">Reservoir</div>
            <div className="font-bold" style={{ color: '#4ade80' }}>
              {reservoirLevel.toFixed(1)} MAF
            </div>
          </div>
          <div>
            <div className="text-stone-400">Declared Tier</div>
            <div className={`font-bold tier-${bureauDeclaredTier}`}>
              Tier {bureauDeclaredTier}
            </div>
          </div>
          <div>
            <div className="text-stone-400">Total Legal Demand</div>
            <div className="font-bold" style={{ color: '#f87171' }}>~18.5 MAF</div>
          </div>
        </div>

        {bureauDeclaredTier > 0 && (
          <div className="mt-3">
            <div className="text-xs text-stone-500 mb-1">Mandatory cuts this year:</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(tierCuts).map(([pid, cut]) => {
                const role = ROLES.find(r => r.id === pid);
                return (
                  <span
                    key={pid}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ backgroundColor: '#3a0a0a', color: '#f87171' }}
                  >
                    {role?.abbreviation}: −{cut.toFixed(1)} MAF
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Negotiation table — who needs what */}
      <div className="panel">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">
          Player Positions (public)
        </div>
        <div className="space-y-1">
          {PLAYER_ORDER.filter(id => id !== 'bureau').map(id => {
            const role = ROLES.find(r => r.id === id)!;
            const player = players.find(p => p.id === id)!;
            const cut = tierCuts[id] ?? 0;
            const effectiveDemand = Math.max(0, role.baseDiversion - cut - player.demandReduction);
            return (
              <div key={id} className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
                <span className="text-stone-300 w-28 shrink-0 text-xs">{role.name}</span>
                <span className="text-stone-400 text-xs w-20 shrink-0">
                  Base: {role.baseDiversion.toFixed(1)} MAF
                </span>
                {cut > 0 && (
                  <span className="text-xs" style={{ color: '#f87171' }}>
                    −{cut.toFixed(1)} mandatory
                  </span>
                )}
                {player.demandReduction > 0 && (
                  <span className="text-xs" style={{ color: '#4ade80' }}>
                    −{player.demandReduction.toFixed(1)} alternatives
                  </span>
                )}
                <span className="ml-auto text-xs font-semibold text-stone-200">
                  Effective: {effectiveDemand.toFixed(1)} MAF
                </span>
                {player.litigationDelay > 0 && (
                  <span className="text-xs" style={{ color: '#fb923c' }}>
                    ⚖ blocked {player.litigationDelay}t
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Log agreement */}
      <div className="panel">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-3">
          Log Agreement
        </div>
        <textarea
          rows={2}
          placeholder="Describe the agreement reached verbally..."
          value={agreementText}
          onChange={e => setAgreementText(e.target.value)}
          className="mb-2"
        />

        <div className="flex flex-wrap gap-1 mb-2">
          <span className="text-xs text-stone-400 mr-1">Parties:</span>
          {PLAYER_ORDER.map(id => {
            const role = ROLES.find(r => r.id === id)!;
            return (
              <button
                key={id}
                className="text-xs px-2 py-0.5 rounded border transition-all"
                style={{
                  borderColor: selectedParties.includes(id) ? role.color : '#4a3520',
                  backgroundColor: selectedParties.includes(id) ? `${role.color}22` : 'transparent',
                  color: selectedParties.includes(id) ? role.color : '#a09080',
                }}
                onClick={() => toggleParty(id)}
              >
                {role.abbreviation}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 mb-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isBinding}
              onChange={e => setIsBinding(e.target.checked)}
            />
            <span className="text-stone-300">Binding agreement (publicly logged)</span>
          </label>
          {!isBinding && (
            <span className="text-xs text-stone-500">Informal / whisper (logged privately)</span>
          )}
        </div>

        <button
          className="btn-primary w-full"
          onClick={handleAddAgreement}
          disabled={!agreementText.trim()}
        >
          Log Agreement
        </button>
      </div>

      {/* Recent agreements */}
      {bindingAgreements.filter(a => a.year === year).length > 0 && (
        <div className="panel">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">
            Agreements This Year
          </div>
          <div className="space-y-2">
            {bindingAgreements.filter(a => a.year === year).map(ag => (
              <div key={ag.id} className="text-sm">
                <span
                  className="text-xs px-1 rounded mr-2"
                  style={{
                    backgroundColor: ag.isBinding ? '#1a3a1a' : '#2a2a1a',
                    color: ag.isBinding ? '#4ade80' : '#facc15',
                  }}
                >
                  {ag.isBinding ? 'BINDING' : 'INFORMAL'}
                </span>
                <span className="text-stone-300">{ag.text}</span>
                {ag.parties.length > 0 && (
                  <span className="text-stone-500 text-xs ml-2">
                    ({ag.parties.map(p => ROLES.find(r => r.id === p)?.abbreviation).join(', ')})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="btn-primary w-full" onClick={advancePhase}>
        End Negotiation → Commitment Phase
      </button>
    </div>
  );
}
