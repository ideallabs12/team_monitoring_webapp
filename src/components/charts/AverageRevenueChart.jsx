import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function AverageRevenueChart({ data, title = "Average Revenue" }) {
  // Custom tooltip to make it match the app's dark theme
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
        }}>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 6px 0', fontSize: '0.85rem' }}>{label}</p>
          <p style={{ color: '#4ade80', margin: 0, fontWeight: 'bold', fontSize: '1.1rem' }}>
            ${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="card" style={{ padding: '28px', background: 'var(--card-bg)' }}>
      <h3 style={{ margin: '0 0 24px 0', fontSize: '1.25rem', color: '#fff' }}>{title}</h3>
      <div style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.8}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="period" 
              stroke="var(--text-secondary)" 
              tick={{ fill: 'var(--text-secondary)', fontSize: '0.85rem' }} 
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
              dy={10}
            />
            <YAxis 
              stroke="var(--text-secondary)" 
              tick={{ fill: 'var(--text-secondary)', fontSize: '0.85rem' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `$${value}`}
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Bar 
              dataKey="average" 
              fill="url(#colorAvg)" 
              radius={[6, 6, 0, 0]}
              barSize={40}
              animationDuration={1500}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
