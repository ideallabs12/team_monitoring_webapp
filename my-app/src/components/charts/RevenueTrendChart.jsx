import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import {
  getLastNMonths,
  normalizeMonth,
  toRevenueMonthString,
  getAvailableYears,
  MONTH_NAMES,
} from '../../utils/revenueUtils'

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ec4899',
  '#8b5cf6', '#06b6d4', '#f43f5e', '#a855f7',
  '#14b8a6', '#f97316'
]

const PRESET_OPTIONS = [
  { label: 'This Month', value: 1 },
  { label: '2M', value: 2 },
  { label: '3M', value: 3 },
  { label: '6M', value: 6 },
  { label: '12M', value: 12 },
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
      <rect
        x={rx} y={ry}
        width={cardWidth} height={cardHeight}
        rx={6} ry={6}
        fill="var(--apple-card-bg)"
        stroke={fill}
        strokeWidth={1.8}
        style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))' }}
      />
      <rect x={rx + 10} y={y - 5} width={10} height={10} rx={3} fill={fill} />
      <text
        x={rx + 28} y={y}
        fill="var(--apple-text-primary)"
        dominantBaseline="central"
        style={{ fontSize: '0.78rem', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}
      >
        <tspan fill="var(--apple-text-primary)" fontWeight="bold">{name}</tspan>
        <tspan fill="var(--apple-text-secondary)">: </tspan>
        <tspan fill="var(--apple-accent-green)">${value.toLocaleString()}</tspan>
      </text>
    </g>
  )
}

export default function RevenueTrendChart({ revenues = [], teams = [] }) {
  const [revDistPeriod, setRevDistPeriod] = useState(1)
  const [revDistMode, setRevDistMode] = useState('preset') // 'preset' | 'custom'
  const [revDistYear, setRevDistYear] = useState(new Date().getFullYear())
  const [revDistMonth, setRevDistMonth] = useState(new Date().getMonth())

  // Compute active months based on mode
  const activeMonths = useMemo(() => {
    if (revDistMode === 'custom') {
      return [toRevenueMonthString(revDistYear, revDistMonth)]
    }
    return getLastNMonths(revDistPeriod).reverse()
  }, [revDistMode, revDistPeriod, revDistYear, revDistMonth])

  const activeMonthSet = useMemo(() => new Set(activeMonths), [activeMonths])

  // Compute total per team for the selected period (totals only, no averages)
  const pieData = useMemo(() => {
    if (!revenues.length || !teams.length) return []

    const teamTotals = {}
    teams.forEach(t => { teamTotals[t.id] = { name: t.name, value: 0 } })

    revenues.forEach(r => {
      const monthKey = normalizeMonth(r.revenue_month)
      if (activeMonthSet.has(monthKey) && teamTotals[r.team_id]) {
        teamTotals[r.team_id].value += Number(r.amount || 0)
      }
    })

    return Object.values(teamTotals)
      .filter(t => t.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [revenues, teams, activeMonthSet])

  const grandTotal = useMemo(() => pieData.reduce((s, d) => s + d.value, 0), [pieData])

  const handlePresetClick = (value) => {
    setRevDistMode('preset')
    setRevDistPeriod(value)
  }

  const handleYearChange = (y) => {
    setRevDistMode('custom')
    setRevDistYear(Number(y))
  }

  const handleMonthChange = (m) => {
    setRevDistMode('custom')
    setRevDistMonth(Number(m))
  }

  const isCustomActive = revDistMode === 'custom'

  return (
    <div className="card" style={{ padding: '24px', background: 'var(--card-bg)' }}>

      {/* ── HEADER + FILTER ROW ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: 'var(--apple-text-primary)' }}>Revenue Distribution</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Total team revenue share for the selected period.
          </p>
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>

          {/* Preset pills */}
          <div style={{
            display: 'flex', gap: '3px',
            background: 'var(--apple-bg)',
            border: `1px solid ${!isCustomActive ? 'rgba(59,130,246,0.4)' : 'var(--apple-border)'}`,
            borderRadius: '20px',
            padding: '3px',
            transition: 'border-color 0.2s',
          }}>
            {PRESET_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handlePresetClick(opt.value)}
                style={{
                  padding: '5px 11px',
                  borderRadius: '16px',
                  border: 'none',
                  background: !isCustomActive && revDistPeriod === opt.value
                    ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                    : 'transparent',
                  color: !isCustomActive && revDistPeriod === opt.value ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.76rem',
                  fontWeight: '600',
                  transition: 'all 0.18s ease',
                  boxShadow: !isCustomActive && revDistPeriod === opt.value ? '0 2px 8px rgba(59,130,246,0.35)' : 'none',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Separator */}
          <span style={{ color: 'var(--apple-border)', fontSize: '0.9rem', userSelect: 'none' }}>|</span>

          {/* Custom Year picker */}
          <select
            value={revDistYear}
            onChange={e => handleYearChange(e.target.value)}
            style={{
              padding: '5px 26px 5px 10px',
              fontSize: '0.76rem',
              borderRadius: '8px',
              background: isCustomActive ? 'rgba(59,130,246,0.12)' : 'var(--apple-card)',
              color: isCustomActive ? 'var(--apple-accent)' : 'var(--apple-text-primary)',
              border: `1px solid ${isCustomActive ? 'rgba(59,130,246,0.4)' : 'var(--apple-border)'}`,
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 7px center',
              transition: 'all 0.2s',
              fontWeight: isCustomActive ? '600' : '400',
            }}
          >
            {getAvailableYears().map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Custom Month picker */}
          <select
            value={revDistMonth}
            onChange={e => handleMonthChange(e.target.value)}
            style={{
              padding: '5px 26px 5px 10px',
              fontSize: '0.76rem',
              borderRadius: '8px',
              background: isCustomActive ? 'rgba(59,130,246,0.12)' : 'var(--apple-card)',
              color: isCustomActive ? 'var(--apple-accent)' : 'var(--apple-text-primary)',
              border: `1px solid ${isCustomActive ? 'rgba(59,130,246,0.4)' : 'var(--apple-border)'}`,
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 7px center',
              transition: 'all 0.2s',
              fontWeight: isCustomActive ? '600' : '400',
            }}
          >
            {MONTH_NAMES.map((name, idx) => <option key={idx} value={idx}>{name}</option>)}
          </select>
        </div>
      </div>

      {/* ── CHART AREA ── */}
      {grandTotal === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 350,
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          gap: '8px',
          background: 'rgba(255,255,255,0.01)',
          borderRadius: '10px',
          border: '1px dashed var(--apple-border)',
        }}>
          <span style={{ fontSize: '1.8rem' }}>📊</span>
          <span>No revenue data available for this period.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          {/* Pie Chart */}
          <div style={{ flex: '1 1 350px', height: 350, minWidth: '300px', minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
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
                   labelLine={{ stroke: 'var(--apple-border)', strokeWidth: 1 }}
                >
                  {pieData.map((_, index) => (
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

          {/* Breakdown list */}
          <div style={{ flex: '0 1 260px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Grand total */}
            <div style={{
              background: 'var(--apple-bg)',
              border: '1px solid var(--apple-border)',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '4px',
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Revenue
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--apple-text-primary)', marginTop: '2px' }}>
                ${grandTotal.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                {isCustomActive
                  ? `${MONTH_NAMES[revDistMonth]} ${revDistYear}`
                  : revDistPeriod === 1 ? 'This Month' : `Last ${revDistPeriod} Months`}
              </div>
            </div>

            {/* Team rows */}
            {pieData.map((item, idx) => {
              const pct = grandTotal > 0 ? ((item.value / grandTotal) * 100).toFixed(1) : 0
              return (
                <div key={item.name} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'default',
                }}>
                  <span style={{
                    width: '10px', height: '10px', borderRadius: '3px',
                    background: COLORS[idx % COLORS.length], flexShrink: 0,
                  }} />
                  <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: '400', color: 'var(--apple-text-secondary)' }}>
                    {item.name}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--apple-text-primary)' }}>
                    ${item.value.toLocaleString()}
                  </span>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: '600',
                    color: COLORS[idx % COLORS.length],
                    background: `${COLORS[idx % COLORS.length]}18`,
                    padding: '2px 6px', borderRadius: '4px',
                    minWidth: '38px', textAlign: 'center',
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
