import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import {
  filterRevenuesByPeriod,
  filterRevenuesByCompletedPeriod,
  sumRevenues,
  normalizeMonth,
  getLastNMonths,
  getEffectiveTargetAmount,
  TIME_PERIOD_OPTIONS
} from '../../utils/revenueUtils'

let adminRevCache = { loaded: false, teams: [], profiles: [], revenues: [], targets: [] }

export default function AdminRevenue() {
  const [loading, setLoading] = useState(!adminRevCache.loaded)
  const [teams, setTeams] = useState(adminRevCache.teams)
  const [profiles, setProfiles] = useState(adminRevCache.profiles)
  const [revenues, setRevenues] = useState(adminRevCache.revenues)
  const [targets, setTargets] = useState(adminRevCache.targets)

  // Period filter now lives inside the "Expected vs Actual" section
  const [periodFilter, setPeriodFilter] = useState(1)
  const [averagePeriod, setAveragePeriod] = useState(6)
  const [includeCurrentMonth, setIncludeCurrentMonth] = useState(true)
  const [selectedTeamId, setSelectedTeamId] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const [teamsRes, profilesRes, revRes] = await Promise.all([
          supabase.from('teams').select('*'),
          supabase.from('profiles').select('*'),
          supabase.from('monthly_revenues').select('*')
        ])

        const t = teamsRes.data || []; const p = profilesRes.data || []; const r = revRes.data || []
        setTeams(t); setProfiles(p); setRevenues(r)

        const { data: targetData, error: targetError } = await supabase
          .from('monthly_targets')
          .select('*')
        const tgt = (!targetError && targetData) ? targetData : []
        setTargets(tgt)
        adminRevCache = { loaded: true, teams: t, profiles: p, revenues: r, targets: tgt }
      } catch (err) {
        console.error('Error loading admin revenue data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const nonAdminProfiles = useMemo(
    () => profiles.filter(p => p.platform_role !== 'admin'),
    [profiles]
  )
  const nonAdminIds = useMemo(
    () => new Set(nonAdminProfiles.map(p => p.id)),
    [nonAdminProfiles]
  )

  useEffect(() => {
    if (!selectedTeamId && teams.length > 0) {
      setSelectedTeamId(teams[0].id)
    }
  }, [selectedTeamId, teams])

  const nonAdminRevenues = useMemo(
    () => revenues.filter(r => nonAdminIds.has(r.user_id)),
    [revenues, nonAdminIds]
  )

  // Use all-time revenues for top-level cards (no global period filter)
  const allTimeTotal = sumRevenues(nonAdminRevenues)

  const averagePeriodOptions = [
    { label: '2M', value: 2 },
    { label: '3M', value: 3 },
    { label: '6M', value: 6 },
    { label: '12M', value: 12 },
    { label: 'All Time', value: 0 },
  ]

  const teamAverages = useMemo(() => {
    const filtered = includeCurrentMonth 
      ? filterRevenuesByPeriod(nonAdminRevenues, averagePeriod)
      : filterRevenuesByCompletedPeriod(nonAdminRevenues, averagePeriod)

    return teams.map(team => {
      const teamRevs = filtered.filter(r => r.team_id === team.id)
      const sum = sumRevenues(teamRevs)
      
      // Like Excel's AVERAGE(), only divide by the months that actually have data
      const uniqueMonths = new Set(teamRevs.map(r => normalizeMonth(r.revenue_month))).size
      const average = uniqueMonths > 0 ? sum / uniqueMonths : 0
      
      return {
        teamId: team.id,
        teamName: team.name,
        average: Number(average.toFixed(2))
      }
    }).sort((a, b) => b.average - a.average)
  }, [nonAdminRevenues, teams, averagePeriod, includeCurrentMonth])

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e']

  // All-time team leaderboard
  const teamRevenues = teams.map(team => {
    const allTimeSum = sumRevenues(nonAdminRevenues.filter(r => r.team_id === team.id))
    return { ...team, allTimeTotal: allTimeSum }
  }).sort((a, b) => b.allTimeTotal - a.allTimeTotal)

  const highestTeam = teamRevenues.length > 0 && teamRevenues[0].allTimeTotal > 0 ? teamRevenues[0] : null



  // Period-based month set — for the Expected vs Actual section
  const monthSet = useMemo(() => {
    if (periodFilter === 0) {
      const allMonths = [
        ...revenues.map(r => normalizeMonth(r.revenue_month)),
        ...targets.map(t => normalizeMonth(t.target_month))
      ].filter(Boolean)
      return new Set(allMonths)
    }
    return new Set(getLastNMonths(periodFilter))
  }, [periodFilter, revenues, targets])

  const activeTeamMembers = useMemo(() => {
    if (!selectedTeamId) return []
    return nonAdminProfiles.filter(p => p.team_id === selectedTeamId && !p.is_deactivated)
  }, [selectedTeamId, nonAdminProfiles])

  const memberStats = useMemo(() => {
    return nonAdminProfiles.map(member => {
      const expected = Array.from(monthSet).reduce((sum, month) => {
        return sum + getEffectiveTargetAmount(targets, member.id, selectedTeamId, month)
      }, 0)

      const actual = revenues
        .filter(r =>
          r.user_id === member.id &&
          r.team_id === selectedTeamId &&
          monthSet.has(normalizeMonth(r.revenue_month))
        )
        .reduce((sum, r) => sum + Number(r.amount || 0), 0)

      const achievement = expected > 0 ? (actual / expected) * 100 : 0
      return {
        ...member,
        expected,
        actual,
        gap: actual - expected,
        achievement,
        isActiveInTeam: activeTeamMembers.some(a => a.id === member.id)
      }
    }).filter(m => m.isActiveInTeam || m.expected > 0 || m.actual > 0)
      .sort((a, b) => b.actual - a.actual)
  }, [nonAdminProfiles, activeTeamMembers, targets, revenues, selectedTeamId, monthSet])

  const summary = useMemo(() => {
    const expected = memberStats.reduce((sum, m) => sum + m.expected, 0)
    const actual = memberStats.reduce((sum, m) => sum + m.actual, 0)
    const achievement = expected > 0 ? (actual / expected) * 100 : 0
    return { expected, actual, achievement }
  }, [memberStats])

  const filterLabel = TIME_PERIOD_OPTIONS.find(o => o.value === periodFilter)?.label || 'All Time'

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading analytics...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Revenue Analytics</h2>
      </div>

      {/* ===== TOP SUMMARY CARDS (all-time) ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.1), rgba(59, 130, 246, 0.1))',
          border: '1px solid rgba(74, 222, 128, 0.3)'
        }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>All Time Revenue</h3>
          <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#4ade80' }}>
            ${allTimeTotal.toFixed(2)}
          </div>
        </div>
      </div>

      {/* ===== TEAM MEMBERS EXPECTED VS ACTUAL ===== */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>Team Members Expected vs Actual</h3>

        {/* Team selector + period dropdown in the same row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr', gap: '16px', alignItems: 'end', marginBottom: '18px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Team</label>
            <select value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)} className="form-control">
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Period</label>
            <select value={periodFilter} onChange={e => setPeriodFilter(Number(e.target.value))} className="form-control">
              {TIME_PERIOD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary mini-cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div className="card" style={{ border: '1px solid rgba(96,165,250,0.35)', background: 'rgba(96,165,250,0.08)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Expected ({filterLabel})</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#60a5fa' }}>${summary.expected.toFixed(2)}</div>
          </div>
          <div className="card" style={{ border: '1px solid rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.08)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Actual ({filterLabel})</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#4ade80' }}>${summary.actual.toFixed(2)}</div>
          </div>
          <div className="card" style={{ border: '1px solid rgba(251,191,36,0.35)', background: 'rgba(251,191,36,0.08)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Achievement</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fbbf24' }}>
              {summary.expected > 0 ? `${summary.achievement.toFixed(1)}%` : 'N/A'}
            </div>
          </div>
        </div>

        {(() => {
          const activeStats = memberStats.filter(m => m.isActiveInTeam)
          const historicalStats = memberStats.filter(m => !m.isActiveInTeam)

          if (activeStats.length === 0 && historicalStats.length === 0) {
            return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No historical or active non-admin members found for this team in this period.</p>
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {activeStats.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#fff' }}>Active Members</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                        <th style={{ textAlign: 'left', padding: '10px 8px' }}>Member</th>
                        <th style={{ textAlign: 'right', padding: '10px 8px' }}>Expected</th>
                        <th style={{ textAlign: 'right', padding: '10px 8px' }}>Actual</th>
                        <th style={{ textAlign: 'right', padding: '10px 8px' }}>Gap</th>
                        <th style={{ textAlign: 'right', padding: '10px 8px' }}>Achievement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeStats.map(member => (
                        <tr key={member.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px 8px', color: '#fff', fontWeight: '600' }}>
                            {member.first_name} {member.last_name}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', color: '#60a5fa', fontWeight: '700' }}>
                            ${member.expected.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', color: '#4ade80', fontWeight: '700' }}>
                            ${member.actual.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', color: member.gap >= 0 ? '#4ade80' : '#f87171', fontWeight: '700' }}>
                            {member.gap >= 0 ? '+' : ''}${member.gap.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', color: '#fbbf24', fontWeight: '700' }}>
                            {member.expected > 0 ? `${member.achievement.toFixed(1)}%` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {historicalStats.length > 0 && (
                <div style={{ overflowX: 'auto', opacity: 0.85, padding: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Historical Members</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                        <th style={{ textAlign: 'left', padding: '10px 8px' }}>Member</th>
                        <th style={{ textAlign: 'right', padding: '10px 8px' }}>Expected</th>
                        <th style={{ textAlign: 'right', padding: '10px 8px' }}>Actual</th>
                        <th style={{ textAlign: 'right', padding: '10px 8px' }}>Gap</th>
                        <th style={{ textAlign: 'right', padding: '10px 8px' }}>Achievement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historicalStats.map(member => (
                        <tr key={member.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {member.first_name} {member.last_name}
                            <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                              {member.is_deactivated ? 'Former' : 'Transferred'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                            ${member.expected.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                            ${member.actual.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                            {member.gap >= 0 ? '+' : ''}${member.gap.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                            {member.expected > 0 ? `${member.achievement.toFixed(1)}%` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* ===== TEAM AVERAGE REVENUE ===== */}
      <div className="card" style={{ marginBottom: '40px', padding: '24px', background: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#f1f5f9' }}>Team Average Revenue</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Average monthly revenue per team. Select a period to compare.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            {/* Toggle for Current Month */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={includeCurrentMonth}
                onChange={(e) => setIncludeCurrentMonth(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#3b82f6', cursor: 'pointer' }}
              />
              Include Current Month
            </label>

            <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '3px' }}>
              {averagePeriodOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAveragePeriod(opt.value)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  background: averagePeriod === opt.value ? '#3b82f6' : 'transparent',
                  color: averagePeriod === opt.value ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          {teamAverages.map((team, idx) => (
             <div key={team.teamId} style={{
               background: 'rgba(15, 23, 42, 0.4)',
               border: '1px solid rgba(255,255,255,0.05)',
               borderRadius: '12px',
               padding: '20px',
               display: 'flex',
               flexDirection: 'column',
               position: 'relative',
               overflow: 'hidden'
             }}>
               <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: COLORS[idx % COLORS.length] }} />
               <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', paddingLeft: '8px' }}>
                 {team.teamName}
               </div>
               <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', paddingLeft: '8px' }}>
                 ${team.average.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
               </div>
             </div>
          ))}
          {teamAverages.length === 0 && (
            <div style={{ color: 'var(--text-secondary)', padding: '10px' }}>No teams available</div>
          )}
        </div>
      </div>

      {/* ===== TEAM LEADERBOARD (all-time) ===== */}
      <div className="card" style={{ marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '20px' }}>Team Leaderboard</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {teamRevenues.map((team, index) => {
            const maxRev = highestTeam?.allTimeTotal || 1
            const percentage = Math.max(5, (team.allTimeTotal / maxRev) * 100)

            return (
              <div key={team.id} style={{ display: 'grid', gridTemplateColumns: '30px 150px 1fr 100px', alignItems: 'center', gap: '16px' }}>
                <div style={{ color: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : 'var(--text-secondary)', fontWeight: 'bold' }}>
                  #{index + 1}
                </div>
                <div style={{ fontWeight: '500' }}>{team.name}</div>

                <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: index === 0 ? 'linear-gradient(90deg, #4ade80, #3b82f6)' : '#3b82f6',
                    borderRadius: '6px',
                    transition: 'width 0.5s ease'
                  }}></div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold', color: '#e2e8f0' }}>
                    ${team.allTimeTotal.toFixed(2)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
