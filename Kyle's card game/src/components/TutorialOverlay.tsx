import { useGameStore } from '../store/gameStore';

const STEPS = [
  {
    title: 'Welcome to Water Year 1',
    body: `You are about to draw your first Hydrology Card. This card determines how much water actually flows through the Colorado River system this year. Compare it to the legal allocations shown on the left — the gap is the structural problem at the heart of this game.`,
  },
  {
    title: 'The Structural Over-allocation',
    body: `The 1922 Compact divided water based on optimistic flow estimates from unusually wet years. Legal entitlements total ~18.5 MAF/year. Recent average flow is ~12.5 MAF. Nobody agreed to this gap — it emerged from law and climate together. Your job is to navigate it.`,
  },
  {
    title: 'Shortage Tiers',
    body: `After seeing the flow card, the Bureau of Reclamation declares a shortage tier (0–3). Higher tiers impose mandatory cuts — first on Arizona/Nevada (junior rights), then California and Mexico (at higher tiers). These cuts are legally binding. Refusing them is a defection move with consequences.`,
  },
  {
    title: 'Negotiation & Commitment',
    body: `During Negotiation, you talk openly. Binding agreements you log digitally carry reputational weight. During Commitment, each player privately enters what they'll actually take — which may differ from what they promised. The difference is the game.`,
  },
  {
    title: 'The Stag Hunt',
    body: `If everyone cooperates and cuts to sustainable levels, reservoirs stabilize and you all earn a +${60} coordination bonus. If enough players defect, reservoirs drop — and eventually dead pool means nobody wins. The math favors cooperation; the politics make it hard. Good luck.`,
  },
];

export function TutorialOverlay() {
  const { showTutorial, tutorialStep, advanceTutorial, dismissTutorial } = useGameStore(s => ({
    showTutorial: s.showTutorial,
    tutorialStep: s.tutorialStep,
    advanceTutorial: s.advanceTutorial,
    dismissTutorial: s.dismissTutorial,
  }));

  if (!showTutorial) return null;

  const step = STEPS[Math.min(tutorialStep, STEPS.length - 1)];
  const isLast = tutorialStep >= STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
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
            className="text-stone-500 hover:text-stone-300 text-sm"
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

        <div className="flex gap-3">
          <button
            className="btn-primary flex-1"
            onClick={isLast ? dismissTutorial : advanceTutorial}
          >
            {isLast ? 'Start Playing →' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
