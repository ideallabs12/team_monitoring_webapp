import { LineChart, Line, ResponsiveContainer } from 'recharts'

export default function Sparkline({ data, width = 80, height = 20 }) {
  // data: array of numbers, e.g., [0, 1000, 2000, 1500, 3000]
  if (!data || data.length === 0) return <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>N/A</span>

  const chartData = data.map((val, idx) => ({ idx, val }))
  
  const isAllZero = data.every(val => val === 0)
  
  // Determine trend color (first value vs last value)
  const first = data[0] || 0
  const last = data[data.length - 1] || 0
  
  const strokeColor = isAllZero
    ? 'var(--apple-border)'
    : last > first
      ? '#34d399' // green (growth)
      : last < first
        ? '#ef4444' // red (decline)
        : '#fbbf24' // amber (stable)

  return (
    <div style={{ width, height, display: 'inline-block', verticalAlign: 'middle', minWidth: 0, minHeight: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, bottom: 2, left: 2, right: 2 }}>
          <Line
            type="monotone"
            dataKey="val"
            stroke={strokeColor}
            strokeWidth={1.5}
            dot={false}
            animationDuration={800}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
