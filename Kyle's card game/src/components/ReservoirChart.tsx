import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import { RESERVOIR_CAPACITY, DEAD_POOL_THRESHOLD } from '../store/gameStore';

interface DataPoint {
  year: number;
  level: number;
}

interface ReservoirChartProps {
  history: DataPoint[];
  currentLevel: number;
  currentYear: number;
}

// TUNING: threshold lines on the chart (fraction of capacity)
const THRESHOLDS = [
  { pct: 0.40, label: 'Tier 1', color: '#facc15' },
  { pct: 0.30, label: 'Tier 2', color: '#fb923c' },
  { pct: 0.20, label: 'Tier 3', color: '#f87171' },
  { pct: DEAD_POOL_THRESHOLD / RESERVOIR_CAPACITY, label: 'Dead Pool', color: '#dc2626' },
];

export function ReservoirChart({ history, currentLevel, currentYear }: ReservoirChartProps) {
  const data = history.map(h => ({
    year: h.year === 0 ? 'Start' : `Y${h.year}`,
    'Reservoir (MAF)': parseFloat(h.level.toFixed(1)),
  }));

  // Add current if not yet in history
  if (history.length > 0 && history[history.length - 1].year < currentYear) {
    data.push({
      year: `Y${currentYear}*`,
      'Reservoir (MAF)': parseFloat(currentLevel.toFixed(1)),
    });
  }

  const pct = currentLevel / RESERVOIR_CAPACITY;
  const levelColor = pct > 0.40 ? '#4ade80'
    : pct > 0.30 ? '#facc15'
    : pct > 0.20 ? '#fb923c'
    : '#f87171';

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-xs text-stone-400 uppercase tracking-wider">Mead + Powell Storage</span>
        <span className="font-bold text-lg" style={{ color: levelColor }}>
          {currentLevel.toFixed(1)} MAF
        </span>
        <span className="text-sm text-stone-500">
          ({(pct * 100).toFixed(0)}% full)
        </span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3a2a10" />
          <XAxis
            dataKey="year"
            tick={{ fill: '#a09080', fontSize: 11 }}
            stroke="#3a2a10"
          />
          <YAxis
            domain={[0, RESERVOIR_CAPACITY]}
            tick={{ fill: '#a09080', fontSize: 11 }}
            stroke="#3a2a10"
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#2d1f0a', border: '1px solid #4a3520', color: '#f0e8d8' }}
          />
          {THRESHOLDS.map(t => (
            <ReferenceLine
              key={t.label}
              y={parseFloat((t.pct * RESERVOIR_CAPACITY).toFixed(1))}
              stroke={t.color}
              strokeDasharray="4 2"
              label={{ value: t.label, fill: t.color, fontSize: 10, position: 'right' }}
            />
          ))}
          <Line
            type="monotone"
            dataKey="Reservoir (MAF)"
            stroke="#2a7a8a"
            strokeWidth={2}
            dot={{ fill: '#2a7a8a', r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Legend wrapperStyle={{ color: '#a09080', fontSize: 11 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
