import { useGameStore, RESERVOIR_CAPACITY } from '../store/gameStore';
import { ROLES, PLAYER_ORDER } from '../data/roles';
import { COORDINATION_BONUS } from '../data/objectives';
import { ReservoirChart } from './ReservoirChart';
import { GameLog } from './GameLog';

const TAKEAWAYS = [
  {
    headline: 'The 1922 Compact is the structural root',
    body: 'Negotiators divided the river using data from unusually wet years, allocating ~18.5 MAF/year against a long-run reality closer to 13. Nobody lied. Law plus climate produced the gap.',
  },
  {
    headline: 'Federal money shapes state behavior',
    body: 'The Bureau diverts nothing, but its grant pot changes what is economically rational for everyone else. Leverage without water.',
  },
  {
    headline: 'Tribal rights are pivotal',
    body: 'Winters-doctrine rights are senior to nearly everything, yet largely unquantified. The strongest legal hand at the table has historically had the least political power.',
  },
  {
    headline: 'Variance breaks rigid law',
    body: 'Fixed annual entitlements meet a river that swings ±6 MAF year to year. Every extreme card exposed the mismatch.',
  },
  {
    headline: 'Coordination is hard even when the math is agreed',
    body: 'Everyone could see the reservoir falling. Everyone also had constituents demanding full deliveries. That tension — not ignorance — is the stag hunt.',
  },
];

export function GameOverScreen() {
  const reservoirLevel = useGameStore(s => s.reservoirLevel);
  const reservoirHistory = useGameStore(s => s.reservoirHistory);
  const players = useGameStore(s => s.players);
  const yearHistory = useGameStore(s => s.yearHistory);
  const gameLog = useGameStore(s => s.gameLog);
  const year = useGameStore(s => s.year);
  const deadPool = useGameStore(s => s.deadPool);
  const coordinationBonusEarned = useGameStore(s => s.coordinationBonusEarned);
  const resetGame = useGameStore(s => s.resetGame);

  const ranked = [...PLAYER_ORDER]
    .map(id => ({ id, p: players.find(pl => pl.id === id)! }))
    .sort((a, b) => (b.p.publicScore + b.p.privateScore) - (a.p.publicScore + a.p.privateScore));

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1c1208' }}>
      <div className="max-w-4xl mx-auto p-4 space-y-6 pb-16">
        <div className="text-center pt-8">
          {deadPool ? (
            <>
              <h1 className="text-5xl font-bold mb-3" style={{ color: '#f87171' }} data-testid="dead-pool-banner">
                DEAD POOL
              </h1>
              <p className="text-lg text-stone-300 max-w-xl mx-auto">
                Mead and Powell can no longer release water. No hydropower, no deliveries, no agriculture.
              </p>
              <p className="text-xl font-bold mt-3" style={{ color: '#f87171' }}>
                Nobody wins. This is the stag hunt failure mode.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold mb-2" style={{ color: '#c8a87a' }} data-testid="game-complete-banner">
                Game Complete — 10 Water Years Survived
              </h1>
              {coordinationBonusEarned && (
                <div
                  className="inline-block px-4 py-2 rounded font-bold mt-2"
                  style={{ backgroundColor: '#1a3a1a', color: '#4ade80', border: '2px solid #2a5a2a' }}
                >
                  Coordination bonus earned — reservoir never fell below 30%. +{COORDINATION_BONUS} pts each.
                </div>
              )}
            </>
          )}
        </div>

        <div className="panel">
          <ReservoirChart history={reservoirHistory} currentLevel={reservoirLevel} currentYear={year} />
        </div>

        <div className="panel">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-3">Final Standings</div>
          <div className="space-y-2">
            {ranked.map(({ id, p }, rank) => {
              const role = ROLES.find(r => r.id === id)!;
              const total = p.publicScore + p.privateScore;
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 p-3 rounded flex-wrap"
                  style={{
                    backgroundColor: rank === 0 && !deadPool ? '#1a2a1a' : '#1c1208',
                    border: `1px solid ${rank === 0 && !deadPool ? '#2a5a2a' : '#3a2a10'}`,
                  }}
                >
                  <span className="text-xl font-bold text-stone-500 w-8">
                    {deadPool ? '✗' : `#${rank + 1}`}
                  </span>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} />
                  <div className="flex-1 min-w-32">
                    <div className="font-semibold" style={{ color: role.color }}>{role.name}</div>
                    <div className="text-xs text-stone-400">
                      public {p.publicScore} + private {p.privateScore} · PC {p.politicalCapital} · ${p.budget}M
                    </div>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: deadPool ? '#f87171' : '#f0e8d8' }}>
                    {deadPool ? '—' : total}
                  </div>
                </div>
              );
            })}
          </div>
          {deadPool && (
            <div className="mt-3 text-center text-sm rounded p-2" style={{ backgroundColor: '#2a0a0a', color: '#f87171' }}>
              Dead pool nullifies all scores. Collective failure supersedes individual play.
            </div>
          )}
        </div>

        {yearHistory.length > 0 && (
          <div className="panel overflow-x-auto">
            <div className="text-xs uppercase tracking-wider text-stone-500 mb-3">Year by Year</div>
            <table className="w-full text-xs min-w-[420px]">
              <thead>
                <tr className="text-stone-500 text-left">
                  <th className="pb-2 pr-3">Yr</th>
                  <th className="pb-2 pr-3">Flow</th>
                  <th className="pb-2 pr-3">Taken</th>
                  <th className="pb-2 pr-3">Δ</th>
                  <th className="pb-2 pr-3">Level</th>
                  <th className="pb-2">Tier</th>
                </tr>
              </thead>
              <tbody>
                {yearHistory.map(y => (
                  <tr key={y.year} className="border-t" style={{ borderColor: '#3a2a10' }}>
                    <td className="py-1 pr-3 text-stone-300">{y.year}</td>
                    <td className="py-1 pr-3" style={{ color: '#60a5fa' }}>{y.effectiveFlow.toFixed(1)}</td>
                    <td className="py-1 pr-3" style={{ color: '#f87171' }}>{y.totalDiversions.toFixed(1)}</td>
                    <td className="py-1 pr-3 font-semibold" style={{ color: y.reservoirChange >= 0 ? '#4ade80' : '#f87171' }}>
                      {y.reservoirChange >= 0 ? '+' : ''}{y.reservoirChange.toFixed(1)}
                    </td>
                    <td className="py-1 pr-3 text-stone-200">
                      {y.reservoirLevelAfter.toFixed(1)} ({((y.reservoirLevelAfter / RESERVOIR_CAPACITY) * 100).toFixed(0)}%)
                    </td>
                    <td className={`py-1 tier-${y.shortageTierDeclared}`}>{y.shortageTierDeclared}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="panel space-y-4">
          <div className="text-xs uppercase tracking-wider text-stone-500">Five Things to Take Home</div>
          {TAKEAWAYS.map((t, i) => (
            <div key={i} className="border-l-2 pl-3" style={{ borderColor: '#4a3520' }}>
              <div className="font-semibold text-stone-200 mb-1">{i + 1}. {t.headline}</div>
              <div className="text-sm text-stone-400">{t.body}</div>
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Full Game Log</div>
          <GameLog entries={gameLog} maxHeight="300px" />
        </div>

        <div className="text-center">
          <button className="btn-primary text-lg px-8 py-3" onClick={resetGame} data-testid="new-game">
            Start New Game
          </button>
        </div>
      </div>
    </div>
  );
}
