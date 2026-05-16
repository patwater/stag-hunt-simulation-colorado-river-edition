import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { SetupScreen } from './components/SetupScreen';
import { Dashboard } from './components/Dashboard';
import { TutorialOverlay } from './components/TutorialOverlay';
import { GameOverScreen } from './components/GameOverScreen';
import { PhaseHydrology } from './components/phases/PhaseHydrology';
import { PhaseFederal } from './components/phases/PhaseFederal';
import { PhaseNegotiation } from './components/phases/PhaseNegotiation';
import { PhaseCommitment } from './components/phases/PhaseCommitment';
import { PhaseResolution } from './components/phases/PhaseResolution';

function PhasePanel() {
  const phase = useGameStore(s => s.phase);
  switch (phase) {
    case 'hydrology':   return <PhaseHydrology />;
    case 'federal':     return <PhaseFederal />;
    case 'negotiation': return <PhaseNegotiation />;
    case 'commitment':  return <PhaseCommitment />;
    case 'resolution':  return <PhaseResolution />;
    default:            return null;
  }
}

export default function App() {
  const { phase, phaseTimerActive, tickTimer } = useGameStore();

  // Global 1-second tick for phase timers
  useEffect(() => {
    if (!phaseTimerActive) return;
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [phaseTimerActive, tickTimer]);

  if (phase === 'setup') return <SetupScreen />;
  if (phase === 'game_over') return <GameOverScreen />;

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row gap-0"
      style={{ backgroundColor: '#1c1208' }}
    >
      {/* Left: Shared dashboard (always visible) */}
      <div
        className="lg:w-80 xl:w-96 shrink-0 border-r p-3 overflow-y-auto"
        style={{ borderColor: '#3a2a10', backgroundColor: '#1c1208', minHeight: '100vh' }}
      >
        <Dashboard />
      </div>

      {/* Right: Current phase panel */}
      <div className="flex-1 p-4 overflow-y-auto" style={{ minHeight: '100vh' }}>
        <PhasePanel />
      </div>

      {/* Tutorial overlay */}
      <TutorialOverlay />
    </div>
  );
}
