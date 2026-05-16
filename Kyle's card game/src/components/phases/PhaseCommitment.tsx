import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { PLAYER_ORDER, getRoleById } from '../../data/roles';
import { ALTERNATIVES } from '../../data/alternatives';
import { getObjectiveByPlayerId } from '../../data/objectives';
import { getTierCuts } from '../../store/gameStore';
import type { PlayerId, DefectionType } from '../../data/types';

// ─── Per-player private input ───────────────────────────────────────────────

interface PlayerInputProps {
  playerId: PlayerId;
  onCommit: () => void;
}

function PlayerInput({ playerId, onCommit }: PlayerInputProps) {
  const {
    setPlayerCommitment, bureauDeclaredTier,
    players, activeAlternatives, federalFunding,
    bureauFundingTargetId, bureauFundingOptionId,
  } = useGameStore();

  const role = getRoleById(playerId);
  const player = players.find(p => p.id === playerId)!;
  const tierCuts = getTierCuts(bureauDeclaredTier);
  const mandatoryCut = tierCuts[playerId] ?? 0;
  const objective = getObjectiveByPlayerId(playerId);

  const effectiveBaseline = Math.max(0, role.baseDiversion - player.demandReduction);
  const defaultDiversion = Math.max(0, effectiveBaseline - mandatoryCut);

  const [diversion, setDiversion] = useState(defaultDiversion);
  const [defectionType, setDefectionType] = useState<DefectionType>('none');
  const [litigationTarget, setLitigationTarget] = useState<PlayerId | null>(null);
  const [alternativeId, setAlternativeId] = useState<string | null>(null);

  // Bureau-specific: who to fund
  const [fundingTarget, setFundingTarget] = useState<PlayerId | null>(bureauFundingTargetId);
  const [fundingOption, setFundingOption] = useState<string | null>(bureauFundingOptionId);

  function handleCommit() {
    setPlayerCommitment({
      playerId,
      intendedDiversion: playerId === 'bureau' ? 0 : diversion,
      defectionType,
      litigationTarget: defectionType === 'litigation' ? litigationTarget : null,
      alternativeOptionId: alternativeId,
      federalFundingTargetId: playerId === 'bureau' ? fundingTarget : null,
    });
    onCommit();
  }

  const eligibleAlternatives = ALTERNATIVES.filter(a =>
    a.eligiblePlayers.includes(playerId) &&
    !activeAlternatives.some(active =>
      active.optionId === a.id && active.playerId === playerId && active.status === 'in_progress',
    ),
  );

  const selectedAlt = alternativeId ? ALTERNATIVES.find(a => a.id === alternativeId) : null;
  const isFederallyFunded = bureauFundingTargetId === playerId &&
    bureauFundingOptionId === alternativeId;
  const altCost = selectedAlt
    ? (isFederallyFunded ? Math.round(selectedAlt.cost * 0.5) : selectedAlt.cost)
    : 0;
  const canAffordAlt = !selectedAlt || altCost === 0
    || (selectedAlt.id === 'tribal_leasing' ? player.politicalCapital >= 3 : player.budget >= altCost);

  return (
    <div className="space-y-4">
      <div
        className="rounded border-2 p-4"
        style={{ borderColor: role.color, backgroundColor: '#1a1208' }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: role.color }} />
          <h3 className="text-xl font-bold" style={{ color: role.color }}>{role.name}</h3>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-stone-400">Budget</div>
            <div className="font-bold text-stone-200">${player.budget}M</div>
          </div>
          <div>
            <div className="text-stone-400">Political Capital</div>
            <div className="font-bold text-stone-200">{player.politicalCapital} PC</div>
          </div>
          <div>
            <div className="text-stone-400">Public Score</div>
            <div className="font-bold text-stone-200">{player.publicScore} pts</div>
          </div>
        </div>
      </div>

      {/* Private objective reminder */}
      <div className="panel-dark border-l-4" style={{ borderLeftColor: '#d97706' }}>
        <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>
          Your Private Objective
        </div>
        <div className="text-sm font-semibold text-stone-200 mb-1">{objective.title}</div>
        <ul className="space-y-0.5">
          {objective.criteria.map(c => (
            <li key={c.id} className="text-xs text-stone-400 flex gap-1">
              <span style={{ color: '#c084fc' }}>◆</span>{c.description}
            </li>
          ))}
        </ul>
      </div>

      {/* Bureau-specific input */}
      {playerId === 'bureau' && (
        <div className="panel space-y-3">
          <div className="text-xs uppercase tracking-wider text-stone-500">
            Bureau Commitment
          </div>
          <div className="text-sm text-stone-300">
            As Bureau of Reclamation, you don't divert water. You've already declared Tier{' '}
            <span className={`font-bold tier-${bureauDeclaredTier}`}>{bureauDeclaredTier}</span> shortage.
            Confirm or adjust your funding allocation below.
          </div>
          <div className="text-sm text-stone-400">
            Federal funding: <span className="font-bold text-stone-200">${federalFunding}M</span> remaining
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-stone-400 block mb-1">Fund player:</label>
              <select
                className="w-full"
                value={fundingTarget ?? ''}
                onChange={e => setFundingTarget((e.target.value || null) as PlayerId | null)}
              >
                <option value="">— No additional funding —</option>
                {PLAYER_ORDER.filter(id => id !== 'bureau').map(id => (
                  <option key={id} value={id}>{getRoleById(id).name}</option>
                ))}
              </select>
            </div>
            {fundingTarget && (
              <div>
                <label className="text-xs text-stone-400 block mb-1">For:</label>
                <select
                  className="w-full"
                  value={fundingOption ?? ''}
                  onChange={e => setFundingOption(e.target.value || null)}
                >
                  <option value="">— Select —</option>
                  {ALTERNATIVES.filter(a => a.eligiblePlayers.includes(fundingTarget as PlayerId)).map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="text-xs text-stone-500">
            Litigation option: file litigation in the Defection section below.
          </div>
        </div>
      )}

      {/* Diversion slider — non-Bureau players */}
      {playerId !== 'bureau' && (
        <div className="panel space-y-3">
          <div className="text-xs uppercase tracking-wider text-stone-500">
            Diversion Amount
          </div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-stone-400">Your committed diversion:</span>
            <span className="text-xl font-bold" style={{ color: '#60a5fa' }}>
              {diversion.toFixed(2)} MAF
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={role.maxDiversion}
            step={0.1}
            value={diversion}
            onChange={e => setDiversion(parseFloat(e.target.value))}
          />
          <div className="flex justify-between text-xs text-stone-500">
            <span>0 MAF</span>
            {mandatoryCut > 0 && (
              <span style={{ color: '#facc15' }}>
                Tier {bureauDeclaredTier} target: {defaultDiversion.toFixed(1)} MAF
              </span>
            )}
            <span>Max: {role.maxDiversion} MAF</span>
          </div>
          {mandatoryCut > 0 && (
            <div className="text-xs rounded p-2" style={{ backgroundColor: '#2a1a00', color: '#facc15' }}>
              Tier {bureauDeclaredTier} mandatory cut: −{mandatoryCut.toFixed(1)} MAF.
              Your baseline {role.baseDiversion} → {defaultDiversion.toFixed(1)} MAF.
              Setting diversion above this is a defection.
            </div>
          )}
          {playerId === 'tribal' && (
            <div className="text-xs text-stone-500">
              Your Winters-doctrine rights support up to {role.maxDiversion} MAF.
              Claiming above {role.baseDiversion} MAF may trigger litigation from others.
            </div>
          )}
        </div>
      )}

      {/* Defection choice */}
      <div className="panel space-y-2">
        <div className="text-xs uppercase tracking-wider text-stone-500">
          Defection Choice
        </div>
        {(
          [
            ['none', 'No defection — cooperate', 'Follow your committed diversion, accept mandatory cuts.', null],
            ['overdraw', 'Overdraw (+20% water, −2 PC)', 'Take 20% above your committed amount. Violates compact norms.', '#f87171'],
            ['refuse_cut', 'Refuse shortage cut (−2 PC)', 'Ignore mandatory Tier cut. Legally contested; risks litigation.', '#fb923c'],
            ['litigation', 'File litigation (−3 PC)', 'Sue another player. They lose 2 turns of action; you both lose PC.', '#facc15'],
          ] as [DefectionType, string, string, string | null][]
        ).map(([type, label, desc, color]) => {
          const disabled = type === 'refuse_cut' && mandatoryCut === 0;
          return (
            <label
              key={type}
              className="flex items-start gap-3 p-2 rounded cursor-pointer transition-all"
              style={{
                backgroundColor: defectionType === type ? '#1a1a2a' : 'transparent',
                border: `1px solid ${defectionType === type ? (color ?? '#2a7a8a') : '#3a2a10'}`,
                opacity: disabled ? 0.4 : 1,
              }}
            >
              <input
                type="radio"
                name="defection"
                value={type}
                checked={defectionType === type}
                disabled={disabled}
                onChange={() => setDefectionType(type)}
                className="mt-0.5"
              />
              <div>
                <div className="font-semibold text-sm" style={{ color: color ?? '#4ade80' }}>
                  {label}
                </div>
                <div className="text-xs text-stone-400">{desc}</div>
              </div>
            </label>
          );
        })}

        {defectionType === 'litigation' && (
          <div>
            <label className="text-xs text-stone-400 block mb-1">Sue which player?</label>
            <select
              className="w-full"
              value={litigationTarget ?? ''}
              onChange={e => setLitigationTarget((e.target.value || null) as PlayerId | null)}
            >
              <option value="">— Select target —</option>
              {PLAYER_ORDER.filter(id => id !== playerId).map(id => (
                <option key={id} value={id}>{getRoleById(id).name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Alternative investment */}
      {eligibleAlternatives.length > 0 && (
        <div className="panel space-y-2">
          <div className="text-xs uppercase tracking-wider text-stone-500">
            Alternative Investment (optional)
          </div>
          <select
            className="w-full"
            value={alternativeId ?? ''}
            onChange={e => setAlternativeId(e.target.value || null)}
          >
            <option value="">— No new investment —</option>
            {eligibleAlternatives.map(a => {
              const funded = bureauFundingTargetId === playerId && bureauFundingOptionId === a.id;
              const cost = funded ? Math.round(a.cost * 0.5) : a.cost;
              const canAfford = a.id === 'tribal_leasing'
                ? player.politicalCapital >= 3
                : player.budget >= cost;
              return (
                <option key={a.id} value={a.id} disabled={!canAfford}>
                  {a.name} — {funded ? `Federally funded: $${cost}M` : a.id === 'tribal_leasing' ? '3 PC' : `$${cost}M`}
                  {!canAfford ? ' (insufficient resources)' : ''}
                  {' '}({a.leadTurns}t lead, {a.effectMagnitude.toFixed(2)} MAF {a.effectType.replace(/_/g, ' ')})
                </option>
              );
            })}
          </select>
          {selectedAlt && (
            <div className="text-xs rounded p-2" style={{ backgroundColor: '#1a1208' }}>
              <div className="font-semibold text-stone-200">{selectedAlt.name}</div>
              <div className="text-stone-400">{selectedAlt.description}</div>
              <div className="text-stone-400 mt-1">
                Cost: {selectedAlt.id === 'tribal_leasing' ? '3 PC' : `$${altCost}M`}
                {isFederallyFunded && ' (50% federal grant)'}
                {' '}· {selectedAlt.leadTurns} turn(s) lead time
                {' '}· {selectedAlt.effectMagnitude.toFixed(2)} MAF{' '}
                {selectedAlt.effectType.replace(/_/g, ' ')}
                {selectedAlt.effectDuration > 0 && ` for ${selectedAlt.effectDuration} turns`}
              </div>
              {!canAffordAlt && (
                <div style={{ color: '#f87171' }}>Insufficient resources.</div>
              )}
            </div>
          )}
        </div>
      )}

      <button
        className="btn-primary w-full text-lg py-3"
        onClick={handleCommit}
        disabled={
          (defectionType === 'litigation' && !litigationTarget) ||
          (!!selectedAlt && !canAffordAlt)
        }
      >
        Lock In Commitment ✓
      </button>
      <p className="text-xs text-stone-500 text-center">
        Your choices are hidden until Resolution. Cover screen before passing device.
      </p>
    </div>
  );
}

// ─── Commitment phase orchestrator ──────────────────────────────────────────

export function PhaseCommitment() {
  const { commitmentPlayerIndex, advanceCommitmentPlayer, players, year } = useGameStore();
  const [showInput, setShowInput] = useState(false);

  const currentPlayerId = PLAYER_ORDER[commitmentPlayerIndex];
  const currentRole = getRoleById(currentPlayerId);
  const currentPlayer = players.find(p => p.id === currentPlayerId)!;
  const allCommitted = players.every(p => p.hasCommittedThisYear);

  if (showInput) {
    return (
      <div className="space-y-4">
        <div className="text-xs text-stone-500 uppercase tracking-wider">
          Commitment Phase — Year {year} — Private Input
        </div>
        <PlayerInput
          playerId={currentPlayerId}
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
      <h2 className="text-xl font-bold" style={{ color: '#c8a87a' }}>
        Phase 4 — Commitment
      </h2>
      <div className="text-sm text-stone-400">
        Each player privately commits their actions. Commitments are hidden until Resolution.
        Pass the device to each player in turn.
      </div>

      {/* Progress */}
      <div className="panel">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Progress</div>
        <div className="space-y-1">
          {PLAYER_ORDER.map((id, i) => {
            const role = getRoleById(id);
            const player = players.find(p => p.id === id)!;
            const isDone = player.hasCommittedThisYear;
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
                <span className="text-sm flex-1" style={{ color: isDone ? '#a09080' : '#f0e8d8' }}>
                  {role.name}
                </span>
                {isDone && <span className="text-xs" style={{ color: '#4ade80' }}>✓ Committed</span>}
                {isCurrent && <span className="text-xs" style={{ color: '#facc15' }}>← Current</span>}
                {!isDone && !isCurrent && <span className="text-xs text-stone-500">Waiting</span>}
              </div>
            );
          })}
        </div>
      </div>

      {!allCommitted && (
        <div
          className="rounded border-2 p-5 text-center space-y-3"
          style={{ borderColor: currentRole.color, backgroundColor: '#1a1208' }}
        >
          <div className="text-stone-400 text-sm">Pass device to:</div>
          <div className="text-2xl font-bold" style={{ color: currentRole.color }}>
            {currentRole.name}
          </div>
          <div className="text-stone-400 text-sm">
            Budget: ${currentPlayer.budget}M · PC: {currentPlayer.politicalCapital}
          </div>
          <button
            className="btn-primary text-lg px-8 py-3 w-full"
            onClick={() => setShowInput(true)}
          >
            I am {currentRole.abbreviation} — Enter My Commitment
          </button>
          <p className="text-xs text-stone-500">
            Other players: look away. This player's choices are private.
          </p>
        </div>
      )}

      {allCommitted && (
        <div className="panel text-center space-y-3">
          <div className="text-xl font-bold" style={{ color: '#4ade80' }}>
            All players have committed.
          </div>
          <div className="text-stone-400 text-sm">
            Place device where all can see. Proceed to Resolution.
          </div>
          <div className="text-xs text-stone-500">
            Commitments will now be revealed simultaneously.
          </div>
        </div>
      )}
    </div>
  );
}
