import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { normalizeMonth, getLastNMonths, MONTH_NAMES, sumRevenues } from '../../utils/revenueUtils'

const PERIOD_OPTIONS = [
  { label: '2M', value: 2 },
  { label: '3M', value: 3 },
  { label: '6M', value: 6 },
  { label: '12M', value: 12 },
  { label: 'All', value: 0 },
]

export default function AverageRevenueChart({ revenues = [], title = "Performance Trend" }) {
  const [selectedPeriod, setSelectedPeriod] = useState(6)

  // Build monthly trend data
  const chartData = useMemo(() => {
    let months
    if (selectedPeriod > 0) {
      months = getLastNMonths(selectedPeriod).reverse()
    } else {
      // All time: collect unique months from revenues, sorted ascending
      const uniqueMonths = [...new Set(revenues.map(r => normalizeMonth(r.revenue_month)))]
      months = uniqueMonths.sort()
      if (months.length === 0) {
        months = getLastNMonths(6).reverse()
      }
    }

    return months.map(monthStr => {
      const monthRevs = revenues.filter(r => normalizeMonth(r.revenue_month) === monthStr)
      const total = sumRevenues(monthRevs)
      const d = new Date(monthStr)
      const shortLabel = MONTH_NAMES[d.getMonth()].substring(0, 3)
      const fullLabel = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`

      return {
        month: monthStr,
        label: shortLabel,
        fullLabel,
        revenue: Number(total.toFixed(2))
      }
    })
  }, [revenues, selectedPeriod])

  // Determine trend direction for color
  const trendInfo = useMemo(() => {
    if (chartData.length < 2) return { isUp: true, change: 0 }
    const dataWithRevenue = chartData.filter(d => d.revenue > 0)
    if (dataWithRevenue.length < 2) return { isUp: true, change: 0 }
    const first = dataWithRevenue[0].revenue
    const last = dataWithRevenue[dataWithRevenue.length - 1].revenue
    const change = first > 0 ? ((last - first) / first) * 100 : 0
    return { isUp: last >= first, change: Number(change.toFixed(1)) }
  }, [chartData])

  const trendColor = trendInfo.isUp ? '#30d5c8' : '#ff453a'

  // Current total and average
  const stats = useMemo(() => {
    const total = chartData.reduce((s, d) => s + d.revenue, 0)
    
    let divisor = chartData.length
    if (selectedPeriod === 0 && chartData.length === 0) {
       divisor = 1
    }

    const avg = divisor > 0 ? total / divisor : 0
    return { total, avg: Number(avg.toFixed(2)), months: divisor }
  }, [chartData, selectedPeriod])

  // Average line value
  const avgValue = stats.avg

  const hasData = chartData.some(d => d.revenue > 0)

  // Custom tooltip styled like stock market
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div style={{
          background: 'var(--apple-card-bg)',
          border: `1px solid var(--apple-border)`,
          padding: '12px 16px',
          borderRadius: '10px',
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.15), 0 0 20px ${trendColor}15`,
          backdropFilter: 'blur(12px)',
          minWidth: '140px'
        }}>
          <p style={{ color: 'var(--apple-text-secondary)', margin: '0 0 6px 0', fontSize: '0.78rem', fontWeight: '500' }}>
            {data.fullLabel}
          </p>
          <p style={{ color: 'var(--apple-text-primary)', margin: 0, fontWeight: '700', fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
            ${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="apple-card" style={{ padding: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 className="apple-title-small" style={{ margin: '0 0 4px 0' }}>{title}</h3>
          {hasData && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--apple-text-primary)', letterSpacing: '-0.03em' }}>
                ${stats.avg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--apple-text-secondary)', fontWeight: '500' }}>
                avg/mo
              </span>
              {trendInfo.change !== 0 && (
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  color: trendColor,
                  background: `${trendColor}15`,
                  padding: '3px 10px',
                  borderRadius: '6px'
                }}>
                  {trendInfo.isUp ? '▲' : '▼'} {Math.abs(trendInfo.change)}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Period selector tabs */}
        <div style={{
          display: 'flex',
          gap: '2px',
          background: 'var(--apple-bg)',
          borderRadius: '10px',
          padding: '3px',
          border: '1px solid var(--apple-border)'
        }}>
          {PERIOD_OPTIONS.map(p => {
            const isActive = selectedPeriod === p.value
            return (
              <button
                key={p.value}
                onClick={() => setSelectedPeriod(p.value)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? 'rgba(0, 113, 227, 0.25)' : 'transparent',
                  color: isActive ? 'var(--apple-text-primary)' : 'var(--apple-text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.02em'
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Chart */}
      {hasData ? (
        <div style={{ width: '100%', height: 280, marginTop: '16px' }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={trendColor} stopOpacity={0.25} />
                  <stop offset="50%" stopColor={trendColor} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={trendColor} stopOpacity={0.01} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <XAxis
                dataKey="label"
                stroke="transparent"
                tick={{ fill: 'var(--apple-text-secondary)', fontSize: '0.78rem', fontWeight: '500' }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="transparent"
                tick={{ fill: 'var(--apple-text-secondary)', fontSize: '0.75rem' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}`}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--apple-border)', strokeWidth: 1, strokeDasharray: '4 4' }} />
              {/* Average reference line */}
              <ReferenceLine
                y={avgValue}
                stroke="var(--apple-border)"
                strokeDasharray="6 4"
                label={{
                  value: `Avg $${avgValue >= 1000 ? `${(avgValue / 1000).toFixed(1)}k` : avgValue.toFixed(0)}`,
                  position: 'right',
                  fill: 'var(--apple-text-secondary)',
                  fontSize: '0.7rem',
                  fontWeight: '500'
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={trendColor}
                strokeWidth={2.5}
                fill="url(#trendGradient)"
                dot={{
                  r: 4,
                  fill: '#0a0a0e',
                  stroke: trendColor,
                  strokeWidth: 2
                }}
                activeDot={{
                  r: 6,
                  fill: trendColor,
                  stroke: '#0a0a0e',
                  strokeWidth: 3,
                  filter: 'url(#glow)'
                }}
                animationDuration={1200}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{
          height: 280,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--apple-text-secondary)',
          fontSize: '0.9rem',
          fontStyle: 'italic',
          background: 'var(--apple-bg)',
          borderRadius: '12px',
          marginTop: '16px'
        }}>
          No revenue data available for this period.
        </div>
      )}
    </div>
  )
}
