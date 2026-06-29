import { useState, useMemo } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ParetoChart({ data, concentrationStats }) {
  // data is array of { userId, name, revenue, cumulativePercent }
  // concentrationStats is { top20PercentRevenue, zeroRevenueCount, totalCount }
  const [displayCount, setDisplayCount] = useState(15) // '15', '30', 'all'

  const chartData = useMemo(() => {
    if (displayCount === 'all') return data
    return data.slice(0, Number(displayCount))
  }, [data, displayCount])

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const revenue = payload.find(p => p.dataKey === 'revenue')?.value || 0
      const cumulativePercent = payload.find(p => p.dataKey === 'cumulativePercent')?.value || 0
      
      return (
        <div style={{
          background: 'var(--apple-card-bg)',
          border: '1px solid var(--apple-border)',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
          fontFamily: 'Inter, sans-serif'
        }}>
          <p style={{ color: 'var(--apple-text-primary)', margin: '0 0 6px 0', fontSize: '0.85rem', fontWeight: '600' }}>
            {label}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>Revenue:</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#10b981' }}>
                ${revenue.toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>Cumulative:</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#a855f7' }}>
                {cumulativePercent}%
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  // Determine concentration severity
  const isHighRisk = concentrationStats.top20PercentRevenue >= 75
  const riskColor = isHighRisk ? '#f87171' : concentrationStats.top20PercentRevenue >= 50 ? '#fbbf24' : '#34d399'

  return (
    <div className="card" style={{ padding: '24px', background: 'var(--card-bg)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header and Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: '#f1f5f9' }}>Revenue Distribution (Pareto)</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Analyzes user revenue concentration. The curve shows cumulative contribution.
          </p>
        </div>

        {/* Truncation Control */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2px' }}>
          {[15, 30, 'all'].map(count => (
            <button
              key={count}
              onClick={() => setDisplayCount(count)}
              style={{
                padding: '4px 10px',
                borderRadius: '14px',
                border: 'none',
                background: displayCount === count ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: displayCount === count ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: displayCount === count ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.1s'
              }}
            >
              {count === 'all' ? 'All' : `Top ${count}`}
            </button>
          ))}
        </div>
      </div>

      {/* Concentration Key Stat Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* Risk concentration */}
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.4)', 
          border: '1px solid rgba(255,255,255,0.03)', 
          borderRadius: '10px', 
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue Concentration</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: '800', color: riskColor }}>
              {concentrationStats.top20PercentRevenue}%
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>of rev by top 20% members</span>
          </div>
          <span style={{ fontSize: '0.65rem', color: riskColor, marginTop: '2px', fontWeight: '500' }}>
            {isHighRisk ? '⚠️ High Concentration Risk' : '🟢 Healthy Distribution'}
          </span>
        </div>

        {/* Zero revenue contributors */}
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.4)', 
          border: '1px solid rgba(255,255,255,0.03)', 
          borderRadius: '10px', 
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inactive Sales Contributors</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: '800', color: concentrationStats.zeroRevenueCount > 0 ? '#fbbf24' : '#34d399' }}>
              {concentrationStats.zeroRevenueCount}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>members with $0 revenue</span>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Out of {concentrationStats.totalCount} active team members.
          </span>
        </div>

      </div>

      {/* Chart container */}
      {data.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '280px', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '12px' }}>
          <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>📊</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No revenue data recorded in this period.</span>
        </div>
      ) : (
        <div style={{ width: '100%', height: 300, flex: 1 }}>
          <ResponsiveContainer>
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
            >
              <defs>
                <linearGradient id="colorPareto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
              
              <XAxis
                dataKey="name"
                stroke="var(--text-secondary)"
                tick={{ fill: 'var(--text-secondary)', fontSize: '0.65rem' }}
                axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                tickLine={false}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={50}
              />
              
              {/* Left YAxis - Revenue */}
              <YAxis
                yAxisId="left"
                stroke="var(--text-secondary)"
                tick={{ fill: 'var(--text-secondary)', fontSize: '0.75rem' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${value >= 1000 ? (value / 1000) + 'k' : value}`}
              />

              {/* Right YAxis - Cumulative Percentage */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#a855f7"
                domain={[0, 100]}
                tick={{ fill: '#a855f7', fontSize: '0.75rem' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${value}%`}
              />

              <Tooltip content={<CustomTooltip />} />
              
              <Bar 
                yAxisId="left"
                dataKey="revenue" 
                fill="url(#colorPareto)" 
                radius={[4, 4, 0, 0]}
                barSize={24}
              />
              
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="cumulativePercent" 
                stroke="#a855f7" 
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 1, stroke: '#0b0f18', fill: '#a855f7' }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
