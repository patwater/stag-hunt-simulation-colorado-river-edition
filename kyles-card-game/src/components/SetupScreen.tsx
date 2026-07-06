import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { ROLES, PLAYER_ORDER } from '../data/roles';
import { getObjectiveByPlayerId, COORDINATION_BONUS } from '../data/objectives';

export function SetupScreen() {
  const startGame = useGameStore(s => s.startGame);
  const [readIndex, setReadIndex] = useState<number | null>(null);
  const [rolesRead, setRolesRead] = useState<Set<string>>(new Set());

  const allRead = rolesRead.size >= PLAYER_ORDER.length;

  if (readIndex !== null) {
    const role = ROLES[readIndex];
    const objective = getObjectiveByPlayerId(role.id);
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#1c1208' }}>
        <div className="max-w-2xl w-full panel space-y-4 my-6">
          <div className="flex items-center gap-3 border-b pb-3" style={{ borderColor: '#4a3520' }}>
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: role.color }} />
            <h2 className="text-xl font-bold" style={{ color: role.color }}>{role.name}</h2>
          </div>

          <p className="text-stone-300 leading-relaxed text-sm">{role.description}</p>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Baseline Diversion</div>
              <div className="font-bold" style={{ color: '#60a5fa' }}>
                {role.baseDiversion > 0 ? `${role.baseDiversion} MAF/yr` : 'None (oversight role)'}
              </div>
              {role.maxDiversion > 0 && (
                <div className="text-stone-400 text-xs">Legal max: {role.maxDiversion} MAF</div>
              )}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Starting Resources</div>
              <div className="text-stone-200">
                {role.id === 'bureau' ? '$500M federal funding pot' : `$${role.startingBudget}M budget`}
              </div>
              <div className="text-stone-200">{role.startingPoliticalCapital} political capital</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Powers</div>
              <ul className="space-y-1">
                {role.powers.map((p, i) => (
                  <li key={i} className="text-stone-300 flex gap-2 text-xs">
                    <span style={{ color: '#4ade80' }}>+</span>{p}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Constraints</div>
              <ul className="space-y-1">
                {role.constraints.map((c, i) => (
                  <li key={i} className="text-stone-300 flex gap-2 text-xs">
                    <span style={{ color: '#f87171' }}>–</span>{c}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="panel-dark border-l-4" style={{ borderLeftColor: '#d97706' }}>
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>
              Private Objective — do not show other players
            </div>
            <div className="font-semibold mb-1">{objective.title}</div>
            <p className="text-sm text-stone-300 mb-2">{objective.description}</p>
            <ul className="space-y-1">
              {objective.criteria.map(c => (
                <li key={c.id} className="text-xs text-stone-400 flex gap-2">
                  <span style={{ color: '#c084fc' }}>◆</span>{c.description}
                </li>
              ))}
            </ul>
          </div>

          <button
            className="btn-primary w-full"
            onClick={() => {
              setRolesRead(prev => new Set([...prev, role.id]));
              setReadIndex(null);
            }}
          >
            Done reading — hide this screen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4" style={{ backgroundColor: '#1c1208' }}>
      <div className="max-w-2xl w-full space-y-5 my-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#c8a87a' }}>
            Stag Hunt on the Colorado
          </h1>
          <p className="text-stone-400 text-lg">A water allocation game for exactly 6 players · ~2 hours</p>
        </div>

        <div className="panel">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">The Situation</div>
          <p className="text-stone-300 leading-relaxed text-sm">
            The Colorado River is structurally over-allocated: legal entitlements total{' '}
            <b style={{ color: '#f87171' }}>~18.5 MAF/year</b> against a recent average flow of{' '}
            <b style={{ color: '#60a5fa' }}>~12.5 MAF/year</b>. You will play 10 water years.
            Each year: draw the flow, declare shortage, negotiate, then privately commit.
            If the reservoirs hit dead pool, <b style={{ color: '#f87171' }}>nobody wins</b>.
            Keep them above 30% all game and everyone earns{' '}
            <b style={{ color: '#4ade80' }}>+{COORDINATION_BONUS} points</b>.
          </p>
        </div>

        <div className="panel">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-3">
            Pass the device around — each player reads their role privately
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PLAYER_ORDER.map((id, index) => {
              const role = ROLES.find(r => r.id === id)!;
              const read = rolesRead.has(id);
              return (
                <button
                  key={id}
                  className="text-left p-3 rounded border transition-all cursor-pointer"
                  style={{
                    backgroundColor: read ? '#1a2a1a' : '#2d1f0a',
                    borderColor: read ? '#2a5a2a' : '#4a3520',
                  }}
                  onClick={() => setReadIndex(index)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} />
                    <span className="font-semibold text-sm" style={{ color: role.color }}>{role.name}</span>
                    {read && <span className="text-xs" style={{ color: '#4ade80' }}>✓</span>}
                  </div>
                  <div className="text-xs text-stone-400">
                    {role.baseDiversion > 0
                      ? `${role.baseDiversion} MAF baseline · $${role.startingBudget}M`
                      : 'Federal oversight · $500M funding pot'}
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
          {allRead ? 'Begin Water Year 1 →' : `All 6 players must read their role (${rolesRead.size}/6)`}
        </button>
      </div>
    </div>
  );
}
