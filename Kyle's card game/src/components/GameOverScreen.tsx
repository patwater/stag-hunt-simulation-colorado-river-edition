import { useGameStore, RESERVOIR_CAPACITY, DEAD_POOL_THRESHOLD, selectIsDeadPool } from '../store/gameStore';
import { ROLES, PLAYER_ORDER } from '../data/roles';
import { COORDINATION_BONUS } from '../data/objectives';
import { ReservoirChart } from './ReservoirChart';
import { GameLog } from './GameLog';

const PEDAGOGICAL_TAKEAWAYS = [
  {
    headline: 'Why the 1922 Compact is the structural root',
    body: 'Compact-era negotiators divided water based on 1905–1921 flow data — an anomalously wet period. They allocated ~18.5 MAF/year when long-run average flow is closer to 13–14 MAF. Everyone negotiated in good faith; no one lied. Climate did the rest.',
  },
  {
    headline: 'How federal funding shapes state behavior',
    body: 'The Bureau\'s funding pot creates a carrot for cooperation. States that invest in alternatives receive federal co-funding that makes cooperation economically rational — but only if the Bureau declares tiers high enough to motivate action.',
  },
  {
    headline: 'Why tribal rights are pivotal',
    body: 'Under the Winters Doctrine, tribal reserved rights are legally senior to virtually all compact-era rights. The Tribal Coalition held the most powerful legal position in the game — yet historically, tribes have had the least political power. Rights on paper vs. rights in practice.',
  },
  {
    headline: 'How hydrological variance interacts with rigid law',
    body: 'Legal frameworks assume predictable annual flows. When hydrology varies ±4–6 MAF year to year, static compact allocations become impossible to honor. Every extreme card revealed this structural mismatch.',
  },
  {
    headline: 'Why coordination is hard even when everyone agrees on the math',
    body: 'Every player knew defection risked dead pool. Yet each player had constituents demanding their full allocation. This is the stag hunt: collective rationality points toward cooperation; individual rationality pulls toward defection.',
  },
];

export function GameOverScreen() {
  const { reservoirLevel, reservoirHistory, players, yearHistory, gameLog, year, resetGame } = useGameStore();

  const isDeadPool = selectIsDeadPool({ reservoirLevel } as never);
  const allAbove30 = yearHistory.every(y => y.reservoirLevelAfter / RESERVOIR_CAPACITY >= 0.30);

  const sortedPlayers = [...PLAYER_ORDER].sort((a, b) => {
    const pa = players.find(p => p.id === a)!;
    const pb = players.find(p => p.id === b)!;
    return pb.publicScore - pa.publicScore;
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1c1208' }}>
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="text-center pt-6">
          {isDeadPool ? (
            <>
              <h1 className="text-4xl font-bold mb-2" style={{ color: '#f87171' }}>
                Dead Pool
              </h1>
              <p className="text-xl text-stone-300">
                Lake Mead and Powell have reached dead pool. No water can pass Hoover Dam.
                No hydropower. No municipal water. No agriculture.
              </p>
              <p className="text-lg font-bold mt-3" style={{ color: '#f87171' }}>
                Nobody wins. This is the stag hunt failure mode.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold mb-2" style={{ color: '#c8a87a' }}>
                Game Complete — Water Year 10
              </h1>
              {allAbove30 && (
                <div
                  className="inline-block px-4 py-2 rounded text-lg font-bold mt-2"
                  style={{ backgroundColor: '#1a3a1a', color: '#4ade80', border: '2px solid #2a5a2a' }}
                >
                  🏆 Coordination Bonus Achieved! Reservoir stayed above 30% all game.
                  +{COORDINATION_BONUS} pts per player.
                </div>
              )}
            </>
          )}
        </div>

        {/* Final reservoir */}
        <div className="panel">
          <ReservoirChart
            history={reservoirHistory}
            currentLevel={reservoirLevel}
            currentYear={year}
          />
          <div className="mt-2 text-center text-sm text-stone-400">
            Final reservoir level:{' '}
            <span className="font-bold" style={{
              color: reservoirLevel <= DEAD_POOL_THRESHOLD ? '#f87171'
                : reservoirLevel / RESERVOIR_CAPACITY > 0.40 ? '#4ade80'
                : '#facc15',
            }}>
              {reservoirLevel.toFixed(1)} MAF ({(reservoirLevel / RESERVOIR_CAPACITY * 100).toFixed(0)}%)
            </span>
          </div>
        </div>

        {/* Scores */}
        <div className="panel">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-3">Final Scores</div>
          <div className="space-y-2">
            {sortedPlayers.map((id, rank) => {
              const player = players.find(p => p.id === id)!;
              const role = ROLES.find(r => r.id === id)!;
              const avgDiversion = player.totalDiversionThisGame / Math.max(yearHistory.length, 1);
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 p-3 rounded"
                  style={{
                    backgroundColor: rank === 0 && !isDeadPool ? '#1a2a1a' : '#1c1208',
                    border: `1px solid ${rank === 0 && !isDeadPool ? '#2a5a2a' : '#3a2a10'}`,
                  }}
                >
                  <span className="text-xl font-bold text-stone-500 w-6">
                    {isDeadPool ? '—' : `#${rank + 1}`}
                  </span>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} />
                  <div className="flex-1">
                    <div className="font-semibold" style={{ color: role.color }}>{role.name}</div>
                    <div className="text-xs text-stone-400">
                      Avg diversion: {avgDiversion.toFixed(1)} MAF/yr ·
                      PC: {player.politicalCapital} ·
                      Budget: ${player.budget}M
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-2xl font-bold"
                      style={{ color: isDeadPool ? '#f87171' : '#f0e8d8' }}
                    >
                      {player.publicScore} pts
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {isDeadPool && (
            <div
              className="mt-3 text-center text-sm rounded p-2"
              style={{ backgroundColor: '#2a0a0a', color: '#f87171' }}
            >
              Dead pool: all scores nullified. Collective failure supersedes individual outcomes.
            </div>
          )}
        </div>

        {/* Year-by-year summary */}
        {yearHistory.length > 0 && (
          <div className="panel overflow-x-auto">
            <div className="text-xs uppercase tracking-wider text-stone-500 mb-3">Year-by-Year</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-stone-500 text-left">
                  <th className="pb-2 pr-3">Year</th>
                  <th className="pb-2 pr-3">Flow</th>
                  <th className="pb-2 pr-3">Diversions</th>
                  <th className="pb-2 pr-3">Δ Reservoir</th>
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
                    <td
                      className="py-1 pr-3 font-semibold"
                      style={{ color: y.reservoirChange >= 0 ? '#4ade80' : '#f87171' }}
                    >
                      {y.reservoirChange >= 0 ? '+' : ''}{y.reservoirChange.toFixed(1)}
                    </td>
                    <td className="py-1 pr-3 text-stone-200">
                      {y.reservoirLevelAfter.toFixed(1)} ({(y.reservoirLevelAfter / RESERVOIR_CAPACITY * 100).toFixed(0)}%)
                    </td>
                    <td className={`py-1 tier-${y.shortageTierAfter}`}>{y.shortageTierAfter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pedagogical takeaways */}
        <div className="panel space-y-4">
          <div className="text-xs uppercase tracking-wider text-stone-500">
            Five Things to Take Home
          </div>
          {PEDAGOGICAL_TAKEAWAYS.map((t, i) => (
            <div key={i} className="border-l-2 pl-3" style={{ borderColor: '#4a3520' }}>
              <div className="font-semibold text-stone-200 mb-1">{i + 1}. {t.headline}</div>
              <div className="text-sm text-stone-400">{t.body}</div>
            </div>
          ))}
        </div>

        {/* Event log */}
        <div className="panel">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Full Game Log</div>
          <GameLog entries={gameLog} maxHeight="300px" />
        </div>

        <div className="text-center pb-6">
          <button className="btn-primary text-lg px-8 py-3" onClick={resetGame}>
            Start New Game
          </button>
        </div>
      </div>
    </div>
  );
}
