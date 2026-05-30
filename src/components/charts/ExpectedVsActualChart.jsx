import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ExpectedVsActualChart({ data, title = "Expected vs Actual Revenue", teams = [], selectedTeamId = 'all', onTeamChange }) {
  // data is array of { period, Expected, Actual, Accuracy, monthStr }

  // Compute total accuracy for the period
  const totalExpected = data.reduce((sum, item) => sum + item.Expected, 0)
  const totalActual = data.reduce((sum, item) => sum + item.Actual, 0)
  const averageAccuracy = totalExpected > 0 ? Math.round((totalActual / totalExpected) * 100) : 0

  let badgeColor = '#94a3b8' // stable/neutral
  let badgeBg = 'rgba(148, 163, 184, 0.12)'
  let accuracyDesc = 'No Forecast Data'

  if (totalExpected > 0) {
    if (averageAccuracy >= 90 && averageAccuracy <= 110) {
      badgeColor = '#34d399' // green (Highly Accurate)
      badgeBg = 'rgba(52, 211, 153, 0.12)'
      accuracyDesc = 'Highly Accurate Forecast'
    } else if (averageAccuracy > 110) {
      badgeColor = '#60a5fa' // blue (Under-forecasting / Sandbagging)
      badgeBg = 'rgba(96, 165, 250, 0.12)'
      accuracyDesc = 'Under-forecasting (Conservative)'
    } else {
      badgeColor = '#f87171' // red (Over-forecasting / Aggressive)
      badgeBg = 'rgba(248, 113, 113, 0.12)'
      accuracyDesc = 'Over-forecasting (Aggressive)'
    }
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const expected = payload.find(p => p.dataKey === 'Expected')?.value || 0
      const actual = payload.find(p => p.dataKey === 'Actual')?.value || 0
      const accuracy = expected > 0 ? Math.round((actual / expected) * 100) : 0
      
      return (
        <div style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7)',
          fontFamily: 'Inter, sans-serif'
        }}>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 8px 0', fontSize: '0.8rem', fontWeight: '600' }}>
            {label}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                Expected (DIS)
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>
                ${expected.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                Actual Revenue
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>
                ${actual.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Accuracy Rate</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: accuracy >= 90 && accuracy <= 110 ? '#34d399' : accuracy > 110 ? '#60a5fa' : '#f87171' }}>
                {accuracy > 0 ? `${accuracy}%` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="card" style={{ padding: '24px', background: 'var(--card-bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: '#f1f5f9' }}>{title}</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Comparing forward forecasts (DIS) with finalized monthly revenues.
          </p>
        </div>

        {totalExpected > 0 && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-end',
            background: badgeBg, 
            border: `1px solid rgba(${badgeColor === '#34d399' ? '52, 211, 153' : badgeColor === '#60a5fa' ? '96, 165, 250' : '248, 113, 113'}, 0.25)`, 
            padding: '6px 12px', 
            borderRadius: '8px'
          }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Forecast Accuracy</span>
            <span style={{ fontSize: '1.2rem', fontWeight: '800', color: badgeColor, lineHeight: 1.2 }}>
              {averageAccuracy}%
            </span>
            <span style={{ fontSize: '0.65rem', color: badgeColor, fontWeight: '500' }}>
              {accuracyDesc}
            </span>
          </div>
        )}
      </div>

      <div style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
            barGap={4}
          >
            <defs>
              <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0.5}/>
              </linearGradient>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#064e3b" stopOpacity={0.5}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
            <XAxis
              dataKey="period"
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)', fontSize: '0.75rem' }}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
              tickLine={false}
              dy={10}
            />
            <YAxis
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)', fontSize: '0.75rem' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `$${value >= 1000 ? (value / 1000) + 'k' : value}`}
              dx={-5}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            
            <Bar 
              name="Expected (DIS Forecast)"
              dataKey="Expected" 
              fill="url(#colorExpected)" 
              radius={[4, 4, 0, 0]}
              barSize={20}
              animationDuration={1200}
            />
            <Bar 
              name="Actual Revenue"
              dataKey="Actual" 
              fill="url(#colorActual)" 
              radius={[4, 4, 0, 0]}
              barSize={20}
              animationDuration={1500}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom bar: Legend + Team Selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginTop: '16px',
        paddingTop: '14px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        {/* Legend items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              background: 'linear-gradient(180deg, #3b82f6 0%, #1e3a8a 100%)',
              display: 'inline-block'
            }} />
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>Expected (DIS Forecast)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              background: 'linear-gradient(180deg, #10b981 0%, #064e3b 100%)',
              display: 'inline-block'
            }} />
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>Actual Revenue</span>
          </div>
        </div>

        {/* Team Selector */}
        {onTeamChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Team:</span>
            <select
              value={selectedTeamId}
              onChange={(e) => onTeamChange(e.target.value)}
              className="form-control"
              style={{
                padding: '5px 28px 5px 12px',
                fontSize: '0.78rem',
                width: 'auto',
                borderRadius: '8px',
                height: '30px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#f1f5f9',
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center'
              }}
            >
              <option value="all">All Teams</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  )
}
