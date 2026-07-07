import { useGameStore } from '../store/gameStore';
import { COORDINATION_BONUS } from '../data/objectives';

const STEPS = [
  {
    title: 'Welcome to Water Year 1',
    body: 'You are about to draw your first Hydrology Card. It sets how much water actually flows through the Colorado River system this year. Compare it to the legal allocations on the dashboard — the gap is the structural problem at the heart of this game.',
  },
  {
    title: 'The Structural Over-allocation',
    body: 'The 1922 Compact divided the river using flow estimates from unusually wet years. Legal entitlements total ~18.5 MAF/year; recent average flow is ~12.5 MAF. Nobody lied — law and climate did this together. Your job is to navigate it.',
  },
  {
    title: 'Shortage Tiers',
    body: 'After the flow card, the Bureau declares a shortage tier (0–3). Higher tiers impose mandatory cuts — first on Arizona/Nevada (junior rights), then California and Mexico. Refusing a cut is a defection move with consequences.',
  },
  {
    title: 'Negotiate, then Commit',
    body: 'During Negotiation you talk openly and can log binding agreements. During Commitment, the device is passed to each player, who privately enters what they will actually take — which may differ from what they promised. The difference is the game.',
  },
  {
    title: 'The Stag Hunt',
    body: `If everyone cooperates and cuts to sustainable levels, the reservoir stabilizes and every player earns a +${COORDINATION_BONUS} point coordination bonus. If enough players defect, the reservoir falls — and dead pool means nobody wins. The math favors cooperation; the politics make it hard. Good luck.`,
  },
];

export function TutorialOverlay() {
  const showTutorial = useGameStore(s => s.showTutorial);
  const tutorialStep = useGameStore(s => s.tutorialStep);
  const advanceTutorial = useGameStore(s => s.advanceTutorial);
  const dismissTutorial = useGameStore(s => s.dismissTutorial);

  if (!showTutorial) return null;

  const step = STEPS[Math.min(tutorialStep, STEPS.length - 1)];
  const isLast = tutorialStep >= STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.78)' }}
    >
      <div
        className="max-w-lg w-full mx-4 rounded-lg border p-6 space-y-4"
        style={{ backgroundColor: '#2d1f0a', borderColor: '#4a3520' }}
      >
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider" style={{ color: '#d97706' }}>
            Tutorial — Step {tutorialStep + 1} of {STEPS.length}
          </div>
          <button
            className="text-stone-500 hover:text-stone-300 text-sm cursor-pointer"
            onClick={dismissTutorial}
          >
            Skip tutorial
          </button>
        </div>

        <h2 className="text-xl font-bold" style={{ color: '#f0e8d8' }}>{step.title}</h2>
        <p className="text-stone-300 leading-relaxed">{step.body}</p>

        <div className="flex items-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: i <= tutorialStep ? '#d97706' : '#4a3520' }}
            />
          ))}
        </div>

        <button
          className="btn-primary w-full"
          onClick={isLast ? dismissTutorial : advanceTutorial}
        >
          {isLast ? 'Start Playing →' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
