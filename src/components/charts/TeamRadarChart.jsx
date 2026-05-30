import { useState, useEffect, useMemo } from 'react'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from 'recharts'

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

export default function TeamRadarChart({ data, rawTeams }) {
  // data: [ { subject: 'Revenue', 'Team A': 80, 'Team B': 40 ... }, ... ]
  // rawTeams: [ { id, name, revenue, growth, compliance, leads, efficiency, membersCount } ]
  const [selectedTeams, setSelectedTeams] = useState({})

  useEffect(() => {
    if (rawTeams && rawTeams.length > 0) {
      setSelectedTeams(prev => {
        // If we already have selected teams, check if they exist in rawTeams
        const newMap = {}
        let hasSelection = false
        rawTeams.forEach(t => {
          if (prev[t.name]) {
            newMap[t.name] = true
            hasSelection = true
          }
        })
        if (hasSelection) return newMap

        // Otherwise, select the first 3 teams by default so it's not cluttered
        const defaultMap = {}
        rawTeams.slice(0, 3).forEach(t => {
          defaultMap[t.name] = true
        })
        return defaultMap
      })
    }
  }, [rawTeams])

  // Assign colors to all teams
  const teamColors = useMemo(() => {
    const map = {}
    rawTeams.forEach((t, i) => {
      map[t.name] = COLORS[i % COLORS.length]
    })
    return map
  }, [rawTeams])

  const toggleTeam = (name) => {
    setSelectedTeams(prev => ({
      ...prev,
      [name]: !prev[name]
    }))
  }

  const activeTeamNames = useMemo(() => {
    return Object.keys(selectedTeams).filter(name => selectedTeams[name])
  }, [selectedTeams])

  return (
    <div className="card" style={{ padding: '24px', background: 'var(--card-bg)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: '#f1f5f9' }}>Team Comparison Radar</h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Normalized performance index (0-100) across key business dimensions.
        </p>
      </div>

      {/* Team select pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        {rawTeams.map(t => {
          const active = !!selectedTeams[t.name]
          const color = teamColors[t.name]
          return (
            <button
              key={t.id}
              onClick={() => toggleTeam(t.name)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '16px',
                border: active ? `1px solid ${color}` : '1px solid var(--border-color)',
                background: active ? `rgba(${active ? '59,130,246' : '0,0,0'}, 0.05)` : 'transparent',
                backgroundColor: active ? `${color}15` : 'transparent',
                color: active ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: active ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none'
              }}
            >
              <span style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                background: active ? color : 'rgba(255,255,255,0.2)',
                boxShadow: active ? `0 0 8px ${color}` : 'none'
              }} />
              {t.name}
            </button>
          )
        })}
      </div>

      {/* Radar Chart Container */}
      {activeTeamNames.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '280px', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '12px' }}>
          <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🕸️</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Select one or more teams to overlay.</span>
        </div>
      ) : (
        <div style={{ width: '100%', height: 280, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <ResponsiveContainer>
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
              <PolarGrid stroke="rgba(255, 255, 255, 0.05)" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: 'var(--text-secondary)', fontSize: '0.75rem' }} 
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}
                axisLine={false}
              />
              
              {activeTeamNames.map(name => (
                <Radar
                  key={name}
                  name={name}
                  dataKey={name}
                  stroke={teamColors[name]}
                  fill={teamColors[name]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Raw Metrics Comparison Table */}
      {activeTeamNames.length > 0 && (
        <div style={{ marginTop: '16px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '6px 4px' }}>Team</th>
                <th style={{ padding: '6px 4px' }}>Total Rev</th>
                <th style={{ padding: '6px 4px' }}>MoM Growth</th>
                <th style={{ padding: '6px 4px' }}>DIS Comp.</th>
                <th style={{ padding: '6px 4px' }}>Leads</th>
                <th style={{ padding: '6px 4px' }}>Rev/Member</th>
              </tr>
            </thead>
            <tbody>
              {rawTeams.filter(t => selectedTeams[t.name]).map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#e2e8f0' }}>
                  <td style={{ padding: '8px 4px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: teamColors[t.name] }} />
                    {t.name}
                  </td>
                  <td style={{ padding: '8px 4px' }}>${Math.round(t.revenue).toLocaleString()}</td>
                  <td style={{ padding: '8px 4px' }}>{Math.round(t.growth)}%</td>
                  <td style={{ padding: '8px 4px' }}>{Math.round(t.compliance)}%</td>
                  <td style={{ padding: '8px 4px' }}>{t.leads}</td>
                  <td style={{ padding: '8px 4px' }}>${Math.round(t.efficiency).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
