import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f43f5e', // rose
  '#a855f7', // purple-500
  '#14b8a6', // teal
  '#f97316'  // orange
]

const renderCustomLabel = (props) => {
  const { cx, cy, midAngle, outerRadius, value, name, fill } = props
  if (!value || value === 0) return null

  const RADIAN = Math.PI / 180
  const radius = outerRadius + 22
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  
  const labelText = `${name}: $${value.toLocaleString()}`
  const cardWidth = Math.max(140, labelText.length * 8.6 + 42)
  const cardHeight = 32
  
  const rx = x > cx ? x + 8 : x - cardWidth - 8
  const ry = y - cardHeight / 2

  return (
    <g>
      {/* Card Background */}
      <rect
        x={rx}
        y={ry}
        width={cardWidth}
        height={cardHeight}
        rx={6}
        ry={6}
        fill="rgba(15, 23, 42, 0.95)"
        stroke={fill}
        strokeWidth={1.8}
        style={{
          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))'
        }}
      />
      {/* Color Indicator Dot */}
      <rect
        x={rx + 10}
        y={y - 5}
        width={10}
        height={10}
        rx={3}
        fill={fill}
      />
      {/* Card Text */}
      <text
        x={rx + 28}
        y={y}
        fill="#f1f5f9"
        dominantBaseline="central"
        style={{
          fontSize: '0.78rem',
          fontWeight: '600',
          fontFamily: 'Inter, sans-serif'
        }}
      >
        <tspan fill="#f1f5f9" fontWeight="bold">{name}</tspan>
        <tspan fill="#94a3b8">: </tspan>
        <tspan fill="#34d399">${value.toLocaleString()}</tspan>
      </text>
    </g>
  )
}

export default function RevenueTrendChart({ data, teams }) {
  const pieData = useMemo(() => {
    if (!data || data.length === 0 || !teams || teams.length === 0) return []

    const teamTotals = {}
    teams.forEach(t => { teamTotals[t.name] = 0 })

    data.forEach(row => {
      teams.forEach(t => {
        teamTotals[t.name] = (teamTotals[t.name] || 0) + Number(row[t.name] || 0)
      })
    })

    return Object.entries(teamTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [data, teams])

  const grandTotal = useMemo(
    () => pieData.reduce((sum, d) => sum + d.value, 0),
    [pieData]
  )

  return (
    <div className="card" style={{ padding: '24px', background: 'var(--card-bg)' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: '#f1f5f9' }}>Revenue Distribution</h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Team revenue share for the selected period.
        </p>
      </div>

      {grandTotal === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 350, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          No revenue data available for this period.
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          {/* Pie Chart — no hover interactions */}
          <div style={{ flex: '1 1 350px', height: 350, minWidth: '300px' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  isAnimationActive={true}
                  animationBegin={0}
                  animationDuration={1200}
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth={1}
                  label={renderCustomLabel}
                  labelLine={{ stroke: 'rgba(255, 255, 255, 0.15)', strokeWidth: 1 }}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      style={{ cursor: 'default' }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend / Breakdown List */}
          <div style={{ flex: '0 1 260px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Grand total header */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '4px'
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Revenue</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
                ${grandTotal.toLocaleString()}
              </div>
            </div>

            {/* Team items */}
            {pieData.map((item, idx) => {
              const pct = grandTotal > 0 ? ((item.value / grandTotal) * 100).toFixed(1) : 0
              return (
                <div
                  key={item.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid transparent',
                    cursor: 'default'
                  }}
                >
                  <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '3px',
                    background: COLORS[idx % COLORS.length],
                    flexShrink: 0
                  }} />
                  <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: '400', color: '#94a3b8' }}>
                    {item.name}
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#cbd5e1' }}>
                    ${item.value.toLocaleString()}
                  </span>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: '600',
                    color: COLORS[idx % COLORS.length],
                    background: `${COLORS[idx % COLORS.length]}18`,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    minWidth: '38px',
                    textAlign: 'center'
                  }}>
                    {pct}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
