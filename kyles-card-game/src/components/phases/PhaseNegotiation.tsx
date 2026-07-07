import { useState } from 'react';
import { useGameStore, getTierCuts, getDemandReduction } from '../../store/gameStore';
import { ROLES, PLAYER_ORDER } from '../../data/roles';
import { Timer } from '../Timer';
import type { PlayerId } from '../../data/types';

export function PhaseNegotiation() {
  const year = useGameStore(s => s.year);
  const phaseTimeRemaining = useGameStore(s => s.phaseTimeRemaining);
  const bureauDeclaredTier = useGameStore(s => s.bureauDeclaredTier);
  const agreements = useGameStore(s => s.agreements);
  const currentFlowCard = useGameStore(s => s.currentFlowCard);
  const reservoirLevel = useGameStore(s => s.reservoirLevel);
  const players = useGameStore(s => s.players);
  const activeAlternatives = useGameStore(s => s.activeAlternatives);
  const addAgreement = useGameStore(s => s.addAgreement);
  const advancePhase = useGameStore(s => s.advancePhase);

  const [text, setText] = useState('');
  const [parties, setParties] = useState<PlayerId[]>([]);
  const [isBinding, setIsBinding] = useState(true);

  const tierCuts = getTierCuts(bureauDeclaredTier);
  const thisYear = agreements.filter(a => a.year === year);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold" style={{ color: '#c8a87a' }}>
          Phase 3 — Negotiation
        </h2>
        <Timer seconds={phaseTimeRemaining} onSkip={advancePhase} />
      </div>

      <p className="text-sm text-stone-400">
        Everyone talks. Deals struck out loud can be logged below — binding agreements are public record.
        Whisper deals are your own business (and your own risk).
      </p>

      <div className="panel">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Context — Year {year}</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-center">
          <div>
            <div className="text-stone-400 text-xs">Flow</div>
            <div className="font-bold" style={{ color: '#60a5fa' }}>
              {currentFlowCard ? currentFlowCard.naturalFlow.toFixed(1) : '—'} MAF
            </div>
          </div>
          <div>
            <div className="text-stone-400 text-xs">Reservoir</div>
            <div className="font-bold" style={{ color: '#4ade80' }}>{reservoirLevel.toFixed(1)} MAF</div>
          </div>
          <div>
            <div className="text-stone-400 text-xs">Declared Tier</div>
            <div className={`font-bold tier-${bureauDeclaredTier}`}>Tier {bureauDeclaredTier}</div>
          </div>
          <div>
            <div className="text-stone-400 text-xs">Legal demand</div>
            <div className="font-bold" style={{ color: '#f87171' }}>~18.5 MAF</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Public Positions</div>
        <div className="space-y-1">
          {PLAYER_ORDER.filter(id => id !== 'bureau').map(id => {
            const role = ROLES.find(r => r.id === id)!;
            const p = players.find(pl => pl.id === id)!;
            const cut = tierCuts[id] ?? 0;
            const reduction = getDemandReduction(id, activeAlternatives);
            const target = Math.max(0, role.baseDiversion - cut - reduction);
            return (
              <div key={id} className="flex items-center gap-2 text-xs flex-wrap">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
                <span className="text-stone-300 w-24 shrink-0">{role.abbreviation}</span>
                <span className="text-stone-400">base {role.baseDiversion.toFixed(1)}</span>
                {cut > 0 && <span style={{ color: '#f87171' }}>−{cut.toFixed(1)} cut</span>}
                {reduction > 0 && <span style={{ color: '#4ade80' }}>−{reduction.toFixed(2)} invested</span>}
                <span className="ml-auto font-semibold text-stone-200">target {target.toFixed(1)} MAF</span>
                {p.litigationBlock > 0 && <span style={{ color: '#fb923c' }}>⚖ frozen {p.litigationBlock}yr</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Log an Agreement</div>
        <textarea
          rows={2}
          placeholder="e.g. CA and AZ/NV each cut 0.3 MAF below their tier target this year"
          value={text}
          onChange={e => setText(e.target.value)}
          className="mb-2"
        />
        <div className="flex flex-wrap gap-1 mb-2 items-center">
          <span className="text-xs text-stone-400 mr-1">Parties:</span>
          {PLAYER_ORDER.map(id => {
            const role = ROLES.find(r => r.id === id)!;
            const on = parties.includes(id);
            return (
              <button
                key={id}
                className="text-xs px-2 py-0.5 rounded border cursor-pointer"
                style={{
                  borderColor: on ? role.color : '#4a3520',
                  backgroundColor: on ? `${role.color}22` : 'transparent',
                  color: on ? role.color : '#a09080',
                }}
                onClick={() => setParties(prev => on ? prev.filter(p => p !== id) : [...prev, id])}
              >
                {role.abbreviation}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
          <input type="checkbox" checked={isBinding} onChange={e => setIsBinding(e.target.checked)} />
          <span className="text-stone-300">Binding (publicly logged on the dashboard)</span>
        </label>
        <button
          className="btn-secondary w-full"
          disabled={!text.trim()}
          onClick={() => {
            addAgreement(text.trim(), parties, isBinding);
            setText('');
            setParties([]);
          }}
        >
          Log Agreement
        </button>
      </div>

      {thisYear.length > 0 && (
        <div className="panel">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Agreements This Year</div>
          {thisYear.map(ag => (
            <div key={ag.id} className="text-sm mb-1">
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
      )}

      <button className="btn-primary w-full" onClick={advancePhase} data-testid="to-commitment">
        End Negotiation → Commitment Phase
      </button>
    </div>
  );
}
