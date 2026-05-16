import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { ROLES, PLAYER_ORDER } from '../data/roles';
import { getObjectiveByPlayerId } from '../data/objectives';
import { COORDINATION_BONUS } from '../data/objectives';

export function SetupScreen() {
  const startGame = useGameStore(s => s.startGame);
  const [readIndex, setReadIndex] = useState<number | null>(null);
  const [rolesRead, setRolesRead] = useState<Set<string>>(new Set());

  const allRead = rolesRead.size >= PLAYER_ORDER.length;

  function markRead(id: string) {
    setRolesRead(prev => new Set([...prev, id]));
    setReadIndex(null);
  }

  if (readIndex !== null) {
    const role = ROLES[readIndex];
    const objective = getObjectiveByPlayerId(role.id);
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#1c1208' }}>
        <div className="max-w-2xl w-full panel space-y-4">
          <div className="flex items-center gap-3 border-b pb-3" style={{ borderColor: '#4a3520' }}>
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: role.color }} />
            <h2 className="text-xl font-bold" style={{ color: role.color }}>{role.name}</h2>
            <span className="text-stone-400 text-sm">({role.abbreviation})</span>
          </div>

          <div className="text-stone-300 leading-relaxed">{role.description}</div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Baseline Diversion</div>
              <div className="font-bold text-lg" style={{ color: '#60a5fa' }}>
                {role.baseDiversion > 0 ? `${role.baseDiversion} MAF/yr` : 'N/A (oversight role)'}
              </div>
              {role.maxDiversion > 0 && (
                <div className="text-stone-400 text-xs">Legal max: {role.maxDiversion} MAF</div>
              )}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Starting Resources</div>
              <div className="text-stone-200">
                {role.startingBudget > 0 ? `$${role.startingBudget}M budget` : 'Federal funding pot'}
              </div>
              <div className="text-stone-200">{role.startingPoliticalCapital} political capital</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Powers</div>
              <ul className="space-y-1">
                {role.powers.map((p, i) => (
                  <li key={i} className="text-stone-300 flex gap-2">
                    <span style={{ color: '#4ade80' }}>+</span>{p}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Constraints</div>
              <ul className="space-y-1">
                {role.constraints.map((c, i) => (
                  <li key={i} className="text-stone-300 flex gap-2">
                    <span style={{ color: '#f87171' }}>–</span>{c}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="text-xs text-stone-500">
            <div className="mb-1">Legal basis:</div>
            <ul className="list-disc list-inside space-y-0.5">
              {role.legalBasis.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>

          {/* Private objective — shown only to this player */}
          <div className="panel-dark border-l-4" style={{ borderLeftColor: '#d97706' }}>
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>
              Private Objective — Do not show other players
            </div>
            <div className="font-semibold mb-1" style={{ color: '#f0e8d8' }}>{objective.title}</div>
            <div className="text-sm text-stone-300 mb-2">{objective.description}</div>
            <ul className="space-y-1">
              {objective.criteria.map(c => (
                <li key={c.id} className="text-xs text-stone-400 flex gap-2">
                  <span style={{ color: '#c084fc' }}>◆</span>{c.description}
                </li>
              ))}
            </ul>
          </div>

          <button
            className="btn-primary w-full text-center"
            onClick={() => markRead(role.id)}
          >
            I have read my role — cover screen before passing device
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6" style={{ backgroundColor: '#1c1208' }}>
      <div className="max-w-2xl w-full space-y-6">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#c8a87a' }}>
            Stag Hunt on the Colorado
          </h1>
          <p className="text-stone-400 text-lg">A Water Allocation Game for 6 Players</p>
        </div>

        {/* Concept */}
        <div className="panel">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">The Situation</div>
          <p className="text-stone-300 leading-relaxed">
            The Colorado River is structurally over-allocated. Legal entitlements total roughly{' '}
            <span className="font-bold" style={{ color: '#f87171' }}>18.5 MAF/year</span>, but recent
            average natural flow is only about{' '}
            <span className="font-bold" style={{ color: '#60a5fa' }}>12.5 MAF/year</span> — a gap of{' '}
            <span className="font-bold" style={{ color: '#fb923c' }}>6+ MAF/year</span>.
          </p>
          <p className="text-stone-300 leading-relaxed mt-2">
            You will play 10 water years. Every year: a hydrology card sets actual flow, the Bureau
            declares shortage tiers, players negotiate, then each privately commits to how much water
            they'll take and whether they'll cooperate or defect.
          </p>
          <p className="text-stone-300 leading-relaxed mt-2">
            If Lake Mead and Powell reach dead pool, <span className="font-bold" style={{ color: '#f87171' }}>nobody wins</span>.
            If you all keep reservoirs above 30% for the whole game, everyone gets a{' '}
            <span className="font-bold" style={{ color: '#4ade80' }}>+{COORDINATION_BONUS} point coordination bonus</span>.
            The stag hunt is real.
          </p>
        </div>

        {/* Game structure */}
        <div className="panel">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Each Turn (~10 minutes)</div>
          <div className="space-y-1 text-sm">
            {[
              ['1 min', 'Hydrology Draw', 'Reveal this year\'s natural flow'],
              ['2 min', 'Federal Phase', 'Bureau declares shortage tier, offers funding'],
              ['4 min', 'Negotiation', 'Open negotiation; log binding agreements'],
              ['~2 min', 'Commitment', 'Each player privately commits their actions'],
              ['1 min', 'Resolution', 'Reveal all commitments; update reservoir'],
            ].map(([time, name, desc]) => (
              <div key={name} className="flex gap-3">
                <span className="text-stone-500 w-10 shrink-0">{time}</span>
                <span className="font-semibold text-stone-200 w-32 shrink-0">{name}</span>
                <span className="text-stone-400">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Role selection */}
        <div className="panel">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-3">
            Each player: read your role card privately, then cover the screen before passing
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PLAYER_ORDER.map((id, index) => {
              const role = ROLES.find(r => r.id === id)!;
              const read = rolesRead.has(id);
              return (
                <button
                  key={id}
                  className="text-left p-3 rounded border transition-all"
                  style={{
                    backgroundColor: read ? '#1a2a1a' : '#2d1f0a',
                    borderColor: read ? '#2a5a2a' : '#4a3520',
                    opacity: read ? 0.7 : 1,
                  }}
                  onClick={() => setReadIndex(index)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} />
                    <span className="font-semibold text-sm" style={{ color: role.color }}>
                      {role.name}
                    </span>
                    {read && <span className="text-xs" style={{ color: '#4ade80' }}>✓ Read</span>}
                  </div>
                  <div className="text-xs text-stone-400">
                    {role.baseDiversion > 0
                      ? `${role.baseDiversion} MAF baseline | $${role.startingBudget}M`
                      : `Federal oversight | $${ROLES[0].startingPoliticalCapital} PC`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          className="btn-primary w-full text-lg py-3"
          onClick={startGame}
          disabled={!allRead}
        >
          {allRead ? 'Begin Water Year 1 →' : `Read all 6 roles before starting (${rolesRead.size}/6 done)`}
        </button>
        {!allRead && (
          <p className="text-center text-sm text-stone-500">
            Each player must read their role privately. Pass the device around.
          </p>
        )}
      </div>
    </div>
  );
}
