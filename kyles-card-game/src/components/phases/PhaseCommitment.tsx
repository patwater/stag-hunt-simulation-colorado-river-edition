import { useState } from 'react';
import {
  useGameStore, getTierCuts, getDemandReduction, FEDERAL_SHARE,
} from '../../store/gameStore';
import { PLAYER_ORDER, getRoleById } from '../../data/roles';
import { ALTERNATIVES } from '../../data/alternatives';
import { getObjectiveByPlayerId } from '../../data/objectives';
import type { PlayerId, DefectionType } from '../../data/types';

// ─── Private input for one player ───────────────────────────────────────────

function PlayerInput({ playerId, onCommit }: { playerId: PlayerId; onCommit: () => void }) {
  const bureauDeclaredTier = useGameStore(s => s.bureauDeclaredTier);
  const players = useGameStore(s => s.players);
  const activeAlternatives = useGameStore(s => s.activeAlternatives);
  const bureauFundingTargetId = useGameStore(s => s.bureauFundingTargetId);
  const bureauFundingOptionId = useGameStore(s => s.bureauFundingOptionId);
  const setPlayerCommitment = useGameStore(s => s.setPlayerCommitment);

  const role = getRoleById(playerId);
  const player = players.find(p => p.id === playerId)!;
  const objective = getObjectiveByPlayerId(playerId);
  const isBureau = playerId === 'bureau';
  const blocked = player.litigationBlock > 0;

  const cut = getTierCuts(bureauDeclaredTier)[playerId] ?? 0;
  const reduction = getDemandReduction(playerId, activeAlternatives);
  const cutTarget = Math.max(0, role.baseDiversion - cut);
  const suggested = Math.max(0, cutTarget - reduction);

  const [diversion, setDiversion] = useState(Math.round(suggested * 10) / 10);
  const [defectionType, setDefectionType] = useState<DefectionType>('none');
  const [litigationTarget, setLitigationTarget] = useState<PlayerId | null>(null);
  const [alternativeId, setAlternativeId] = useState<string | null>(null);
  const [leaseTarget, setLeaseTarget] = useState<PlayerId | null>(null);

  const eligible = ALTERNATIVES.filter(a => {
    if (!a.eligiblePlayers.includes(playerId)) return false;
    const repeatable = a.effectType === 'water_lease';
    const inProgress = activeAlternatives.some(x => x.playerId === playerId && x.optionId === a.id && x.status === 'in_progress');
    const done = activeAlternatives.some(x => x.playerId === playerId && x.optionId === a.id && x.status === 'completed');
    return !inProgress && (repeatable || !done);
  });

  const selectedAlt = alternativeId ? ALTERNATIVES.find(a => a.id === alternativeId) : null;
  const granted = bureauFundingTargetId === playerId && bureauFundingOptionId === alternativeId;
  const playerCost = selectedAlt ? selectedAlt.cost - (granted ? Math.round(selectedAlt.cost * FEDERAL_SHARE) : 0) : 0;
  const affordable = !selectedAlt ||
    (player.budget >= playerCost && player.politicalCapital >= selectedAlt.pcCost);
  const needsLeaseTarget = selectedAlt?.effectType === 'water_lease' && !leaseTarget;
  const needsLitTarget = defectionType === 'litigation' && !litigationTarget;

  function commit() {
    setPlayerCommitment({
      playerId,
      intendedDiversion: isBureau ? 0 : diversion,
      defectionType: blocked ? 'none' : defectionType,
      litigationTarget: defectionType === 'litigation' ? litigationTarget : null,
      alternativeOptionId: blocked ? null : alternativeId,
      leaseTargetId: selectedAlt?.effectType === 'water_lease' ? leaseTarget : null,
    });
    onCommit();
  }

  return (
    <div className="space-y-4">
      <div className="rounded border-2 p-4" style={{ borderColor: role.color, backgroundColor: '#1a1208' }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: role.color }} />
          <h3 className="text-xl font-bold" style={{ color: role.color }}>{role.name}</h3>
          {blocked && (
            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#3a2000', color: '#fb923c' }}>
              ⚖ Under litigation ({player.litigationBlock}yr) — no defection or investment
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div><div className="text-stone-400 text-xs">Budget</div><b>${player.budget}M</b></div>
          <div><div className="text-stone-400 text-xs">Political Capital</div><b>{player.politicalCapital}</b></div>
          <div><div className="text-stone-400 text-xs">Score</div><b>{player.publicScore}</b></div>
        </div>
      </div>

      <div className="panel-dark border-l-4" style={{ borderLeftColor: '#d97706' }}>
        <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>
          Your Private Objective — {objective.title}
        </div>
        <ul className="space-y-0.5">
          {objective.criteria.map(c => (
            <li key={c.id} className="text-xs text-stone-400 flex gap-1">
              <span style={{ color: '#c084fc' }}>◆</span>{c.description}
            </li>
          ))}
        </ul>
      </div>

      {isBureau ? (
        <div className="panel text-sm text-stone-300 space-y-2">
          <div className="text-xs uppercase tracking-wider text-stone-500">Bureau Commitment</div>
          <p>
            You divert no water. Your Tier {bureauDeclaredTier} declaration and any grant offer are locked in.
            You may file federal litigation against a compact violator below.
          </p>
        </div>
      ) : (
        <div className="panel space-y-2">
          <div className="text-xs uppercase tracking-wider text-stone-500">Diversion Commitment</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-400">You will take:</span>
            <span className="text-2xl font-bold" style={{ color: '#60a5fa' }} data-testid="diversion-value">
              {diversion.toFixed(1)} MAF
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={role.maxDiversion}
            step={0.1}
            value={diversion}
            onChange={e => setDiversion(parseFloat(e.target.value))}
            data-testid="diversion-slider"
          />
          <div className="flex justify-between text-xs text-stone-500">
            <span>0</span>
            <span style={{ color: '#facc15' }}>tier target: {suggested.toFixed(1)}</span>
            <span>max {role.maxDiversion}</span>
          </div>
          {reduction > 0 && (
            <div className="text-xs rounded p-2" style={{ backgroundColor: '#0a2a1a', color: '#4ade80' }}>
              Your investments cover {reduction.toFixed(2)} MAF of demand — you score full delivery
              even taking that much less water.
            </div>
          )}
          {cut > 0 && (
            <div className="text-xs rounded p-2" style={{ backgroundColor: '#2a1a00', color: '#facc15' }}>
              Tier {bureauDeclaredTier} cut: −{cut.toFixed(1)} MAF. Committing above{' '}
              {cutTarget.toFixed(1)} MAF only sticks if you choose "Refuse cut" below.
            </div>
          )}
        </div>
      )}

      <div className="panel space-y-2" style={{ opacity: blocked ? 0.5 : 1 }}>
        <div className="text-xs uppercase tracking-wider text-stone-500">
          Defection {blocked && '(unavailable — under litigation)'}
        </div>
        {([
          ['none', 'Cooperate', 'Honor cuts and your committed number.', '#4ade80'],
          ['overdraw', 'Overdraw (+20% water, −2 PC)', 'Quietly take 20% above your commitment.', '#f87171'],
          ['refuse_cut', 'Refuse shortage cut (−2 PC)', 'Ignore the mandatory tier cut this year.', '#fb923c'],
          ['litigation', 'File litigation (−3 PC)', 'Freeze another player\'s defection & investment for 2 years.', '#facc15'],
        ] as [DefectionType, string, string, string][]).map(([type, label, desc, color]) => {
          const disabled = blocked ||
            (type === 'refuse_cut' && cut === 0) ||
            (type === 'overdraw' && isBureau) ||
            (type === 'refuse_cut' && isBureau);
          return (
            <label
              key={type}
              className="flex items-start gap-3 p-2 rounded cursor-pointer"
              style={{
                border: `1px solid ${defectionType === type ? color : '#3a2a10'}`,
                opacity: disabled ? 0.4 : 1,
              }}
            >
              <input
                type="radio"
                name="defection"
                checked={defectionType === type}
                disabled={disabled}
                onChange={() => setDefectionType(type)}
                className="mt-1"
                data-testid={`defect-${type}`}
              />
              <div>
                <div className="font-semibold text-sm" style={{ color }}>{label}</div>
                <div className="text-xs text-stone-400">{desc}</div>
              </div>
            </label>
          );
        })}
        {defectionType === 'litigation' && !blocked && (
          <select
            className="w-full"
            value={litigationTarget ?? ''}
            onChange={e => setLitigationTarget((e.target.value || null) as PlayerId | null)}
          >
            <option value="">— Sue which player? —</option>
            {PLAYER_ORDER.filter(id => id !== playerId).map(id => (
              <option key={id} value={id}>{getRoleById(id).name}</option>
            ))}
          </select>
        )}
      </div>

      {!isBureau && eligible.length > 0 && !blocked && (
        <div className="panel space-y-2">
          <div className="text-xs uppercase tracking-wider text-stone-500">Investment (optional)</div>
          <select
            className="w-full"
            value={alternativeId ?? ''}
            onChange={e => { setAlternativeId(e.target.value || null); setLeaseTarget(null); }}
            data-testid="alt-select"
          >
            <option value="">— No new investment —</option>
            {eligible.map(a => {
              const g = bureauFundingTargetId === playerId && bureauFundingOptionId === a.id;
              const cost = a.cost - (g ? Math.round(a.cost * FEDERAL_SHARE) : 0);
              return (
                <option key={a.id} value={a.id}>
                  {a.name} — ${cost}M{a.pcCost > 0 ? ` + ${a.pcCost} PC` : ''}{g ? ' (federal grant!)' : ''}
                </option>
              );
            })}
          </select>
          {selectedAlt && (
            <div className="text-xs rounded p-2 space-y-1" style={{ backgroundColor: '#1a1208' }}>
              <div className="text-stone-300">{selectedAlt.description}</div>
              <div className="text-stone-400">
                Cost to you: ${playerCost}M{selectedAlt.pcCost > 0 ? ` + ${selectedAlt.pcCost} PC` : ''}
                {granted && ' (after federal grant)'} · ready in {selectedAlt.leadTurns} yr
              </div>
              {!affordable && <div style={{ color: '#f87171' }}>You cannot afford this.</div>}
            </div>
          )}
          {selectedAlt?.effectType === 'water_lease' && (
            <select
              className="w-full"
              value={leaseTarget ?? ''}
              onChange={e => setLeaseTarget((e.target.value || null) as PlayerId | null)}
              data-testid="lease-target"
            >
              <option value="">— Lease water to whom? —</option>
              {PLAYER_ORDER.filter(id => id !== 'tribal' && id !== 'bureau').map(id => (
                <option key={id} value={id}>{getRoleById(id).name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      <button
        className="btn-primary w-full text-lg py-3"
        onClick={commit}
        disabled={needsLitTarget || needsLeaseTarget || (!!selectedAlt && !affordable)}
        data-testid="lock-commitment"
      >
        Lock In Commitment ✓
      </button>
      <p className="text-xs text-stone-500 text-center">
        Hidden until Resolution. Press, then pass the device.
      </p>
    </div>
  );
}

// ─── Orchestrator ───────────────────────────────────────────────────────────

export function PhaseCommitment() {
  const commitmentPlayerIndex = useGameStore(s => s.commitmentPlayerIndex);
  const players = useGameStore(s => s.players);
  const year = useGameStore(s => s.year);
  const advanceCommitmentPlayer = useGameStore(s => s.advanceCommitmentPlayer);
  const [showInput, setShowInput] = useState(false);

  const currentId = PLAYER_ORDER[commitmentPlayerIndex];
  const currentRole = getRoleById(currentId);
  const allCommitted = players.every(p => p.hasCommittedThisYear);

  if (showInput && !allCommitted) {
    return (
      <div className="space-y-3">
        <div className="text-xs text-stone-500 uppercase tracking-wider">
          Commitment — Year {year} — private input
        </div>
        <PlayerInput
          key={currentId}
          playerId={currentId}
          onCommit={() => {
            setShowInput(false);
            advanceCommitmentPlayer();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" style={{ color: '#c8a87a' }}>Phase 4 — Commitment</h2>
      <p className="text-sm text-stone-400">
        Each player privately commits. Choices stay hidden until Resolution.
      </p>

      <div className="panel">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Progress</div>
        <div className="space-y-1">
          {PLAYER_ORDER.map((id, i) => {
            const role = getRoleById(id);
            const p = players.find(pl => pl.id === id)!;
            const isCurrent = i === commitmentPlayerIndex && !allCommitted;
            return (
              <div
                key={id}
                className="flex items-center gap-3 p-2 rounded"
                style={{
                  backgroundColor: isCurrent ? '#1a2a1a' : 'transparent',
                  border: `1px solid ${isCurrent ? '#2a5a2a' : '#3a2a10'}`,
                }}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} />
                <span className="text-sm flex-1" style={{ color: p.hasCommittedThisYear ? '#a09080' : '#f0e8d8' }}>
                  {role.name}
                </span>
                {p.hasCommittedThisYear && <span className="text-xs" style={{ color: '#4ade80' }}>✓ locked</span>}
                {isCurrent && <span className="text-xs" style={{ color: '#facc15' }}>← up now</span>}
              </div>
            );
          })}
        </div>
      </div>

      {!allCommitted ? (
        <div
          className="rounded border-2 p-5 text-center space-y-3"
          style={{ borderColor: currentRole.color, backgroundColor: '#1a1208' }}
        >
          <div className="text-stone-400 text-sm">Pass the device to:</div>
          <div className="text-2xl font-bold" style={{ color: currentRole.color }}>
            {currentRole.name}
          </div>
          <button
            className="btn-primary text-lg px-8 py-3 w-full"
            onClick={() => setShowInput(true)}
            data-testid="im-ready"
          >
            I am {currentRole.abbreviation} — show my screen
          </button>
          <p className="text-xs text-stone-500">Everyone else: look away.</p>
        </div>
      ) : (
        <div className="panel text-center space-y-2">
          <div className="text-xl font-bold" style={{ color: '#4ade80' }}>All commitments locked.</div>
          <p className="text-stone-400 text-sm">Place the device where everyone can see, then reveal.</p>
        </div>
      )}
    </div>
  );
}
