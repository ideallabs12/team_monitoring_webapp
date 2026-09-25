import { useMemo } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import {
  getLastNMonths, normalizeMonth, formatRevenueMonthShort, getEffectiveTargetAmount, sumRevenues
} from '../../utils/revenueUtils'

const fmtShort = (val) => {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`
  return `$${val}`
}

const ChartTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--apple-card-bg)',
        border: '1px solid var(--apple-border)',
        padding: '12px 16px',
        borderRadius: '12px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        color: 'var(--apple-text-primary)'
      }}>
        <div style={{ fontWeight: '700', marginBottom: '8px', fontSize: '0.9rem' }}>{payload[0].payload.month}</div>
        {payload.map(entry => (
          <div key={entry.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', fontSize: '0.85rem', marginBottom: '4px' }}>
            <span style={{ color: 'var(--apple-text-secondary)' }}>{entry.name}</span>
            <span style={{ fontWeight: '600', color: entry.color }}>
              ${entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function PerformanceTrendChart({ revenues, profiles, targets }) {
  const company12MonthTrend = useMemo(() => {
    const months = getLastNMonths(12).reverse()
    return months.map(m => {
      const monthlyRevs = revenues.filter(r => normalizeMonth(r.revenue_month) === m)
      const totalActual = sumRevenues(monthlyRevs)
      
      const totalExpected = profiles.reduce((sum, member) => {
        return sum + getEffectiveTargetAmount(targets, member.id, member.team_id, m)
      }, 0)

      return {
        month: formatRevenueMonthShort(m),
        actual: totalActual,
        expected: totalExpected,
        total: totalActual, // For backwards compatibility if any
        key: m
      }
    })
  }, [revenues, profiles, targets])

  return (
    <div className="apple-card" style={{ padding: '24px 28px', borderRadius: '20px', marginBottom: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--apple-text-primary)', fontWeight: '700' }}>Performance Trend Analysis</h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>
            Creative overlay comparison: Combined actual sales (bars) vs target expectations (line) for last 12 months.
          </p>
        </div>
        <span className="apple-badge apple-badge-blue" style={{ fontSize: '0.7rem', fontWeight: '600', padding: '3px 8px' }}>
          TARGET VS ACTUAL
        </span>
      </div>

      <div style={{ flex: 1, height: '240px', width: '100%', minWidth: 0, minHeight: 0 }}>
        <ResponsiveContainer width="99%" height={240}>
          <ComposedChart data={company12MonthTrend} margin={{ top: 20, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0071e3" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#0071e3" stopOpacity={0.15} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'var(--apple-text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => fmtShort(v).replace('$', '')} tick={{ fill: 'var(--apple-text-secondary)', fontSize: 9 }} axisLine={false} tickLine={false} width={42} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="actual" name="Actual Revenue" fill="url(#actualGrad)" radius={[6, 6, 0, 0]} barSize={24} />
            <Line type="monotone" dataKey="expected" name="Target Expectation" stroke="#30d5c8" strokeWidth={3} dot={{ fill: '#30d5c8', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#fff', stroke: '#30d5c8', strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
