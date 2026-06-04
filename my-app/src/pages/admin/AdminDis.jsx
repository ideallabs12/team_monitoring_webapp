import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'

export default function AdminDis() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])
  const [profiles, setProfiles] = useState([])
  const [revenues, setRevenues] = useState([])
  const [reports, setReports] = useState([])

  // Submitted User IDs for the selectedDate
  const [submittedToday, setSubmittedToday] = useState(new Set())

  // Filter States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTeamId, setSelectedTeamId] = useState('all')

  const loadData = async () => {
    try {
      const [teamsRes, profilesRes, revenuesRes] = await Promise.all([
        supabase.from('teams').select('*').order('name', { ascending: true }),
        supabase.from('profiles').select('*'),
        supabase.from('monthly_revenues').select('*'),
      ])

      const teamsData = teamsRes.data || []
      const profilesData = profilesRes.data || []
      const revenuesData = revenuesRes.data || []

      // Filter out admins
      const nonAdminProfiles = profilesData.filter(p => p.platform_role !== 'admin')

      // DIS reports are intentionally single-day only to avoid double-counting leads.
      const query = supabase
        .from('dis_reports')
        .select(`
          *,
          profiles (
            first_name,
            last_name,
            email
          ),
          teams (
            name
          )
        `)
        .eq('report_date', selectedDate)

      const { data: reportsData } = await query.order('report_date', { ascending: false })

      // Calculate missing reports specifically for the selectedDate
      const { data: selectedDateReports } = await supabase
        .from('dis_reports')
        .select('user_id')
        .eq('report_date', selectedDate)

      const submittedUserIds = new Set(selectedDateReports?.map(r => r.user_id) || [])

      setTeams(teamsData)
      setProfiles(nonAdminProfiles)
      // memberships data no longer needed - using profiles.team_id instead
      setRevenues(revenuesData)
      setReports(reportsData || [])
      setSubmittedToday(submittedUserIds)
    } catch (err) {
      console.error("Error loading admin DIS data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    loadData()
  }, [selectedDate])

  // Global totals for selected date (used only for "All Teams" view)
  const globalSummary = useMemo(() => {
    let totalLeads = 0
    let totalExpected = 0
    const userLatestRevenue = {}

    for (const r of reports) {
      totalLeads += Number(r.positive_leads)
      totalExpected += Number(r.expected_revenue)

      if (userLatestRevenue[r.user_id] === undefined) {
        const monthStr = `${r.report_date.split('-')[0]}-${r.report_date.split('-')[1]}-01`
        const userMonthRevs = revenues.filter(rv => rv.user_id === r.user_id && rv.revenue_month === monthStr)
        userLatestRevenue[r.user_id] = userMonthRevs.reduce((sum, rv) => sum + Number(rv.amount), 0)
      }
    }

    const totalRevenue = Object.values(userLatestRevenue).reduce((acc, val) => acc + val, 0)
    return { totalRevenue, totalLeads, totalExpected }
  }, [reports, revenues])

  // Group reports and missing list by team
  const teamData = useMemo(() => {
    const nonAdminIds = new Set(profiles.map(p => p.id))

    return teams.map(team => {
      const teamMems = profiles.filter(p => p.team_id === team.id && nonAdminIds.has(p.id))
      const teamMemberIds = new Set(teamMems.map(m => m.id))

      const teamReps = reports.filter(r => {
        const isCurrentMember = teamMemberIds.has(r.user_id)
        if (isCurrentMember) return true
        const monthStr = `${r.report_date.split('-')[0]}-${r.report_date.split('-')[1]}-01`
        const hasHistRev = revenues.some(
          rv => rv.user_id === r.user_id &&
                rv.team_id === team.id &&
                rv.revenue_month === monthStr
        )
        return hasHistRev
      })

      const teamUserLatestRevenue = {}
      let teamTotalLeads = 0
      let teamTotalExpected = 0

      for (const r of teamReps) {
        teamTotalLeads += Number(r.positive_leads)
        teamTotalExpected += Number(r.expected_revenue)
        if (teamUserLatestRevenue[r.user_id] === undefined) {
          const monthStr = `${r.report_date.split('-')[0]}-${r.report_date.split('-')[1]}-01`
          const revRecord = revenues.find(
            rv => rv.user_id === r.user_id &&
                  rv.team_id === team.id &&
                  rv.revenue_month === monthStr
          )
          teamUserLatestRevenue[r.user_id] = revRecord ? Number(revRecord.amount) : 0
        }
      }

      const teamTotalRevenue = Object.values(teamUserLatestRevenue).reduce((acc, val) => acc + val, 0)

      // Missing users: active members who haven't submitted, with team info
      const missing = teamMems.filter(m => !submittedToday.has(m.id)).map(m => {
        return {
          name: `${m.first_name} ${m.last_name}`,
          teamName: team.name
        }
      })

      return {
        ...team,
        membersCount: teamMems.length,
        submissions: teamReps,
        missing,
        totalRevenue: teamTotalRevenue,
        totalLeads: teamTotalLeads,
        totalExpected: teamTotalExpected
      }
    })
  }, [teams, profiles, reports, submittedToday, revenues])

  // Derived data for current view
  const isAllTeams = selectedTeamId === 'all'

  const activeTeam = !isAllTeams ? teamData.find(t => t.id === selectedTeamId) : null

  // All missing across all teams (for "All Teams" view)
  const allMissing = useMemo(() => {
    return teamData.flatMap(t => t.missing)
  }, [teamData])

  // Submissions to display
  const displayedSubmissions = useMemo(() => {
    if (isAllTeams) return reports
    return activeTeam ? activeTeam.submissions : []
  }, [isAllTeams, reports, activeTeam])

  // Stats for the displayed team
  const displayedStats = useMemo(() => {
    if (isAllTeams) return globalSummary
    if (!activeTeam) return { totalRevenue: 0, totalLeads: 0, totalExpected: 0 }
    return {
      totalRevenue: activeTeam.totalRevenue,
      totalLeads: activeTeam.totalLeads,
      totalExpected: activeTeam.totalExpected
    }
  }, [isAllTeams, globalSummary, activeTeam])

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>Loading DIS Dashboard...</div>

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>DIS Dashboard</h2>
        <button
          onClick={loadData}
          className="btn btn-secondary"
          style={{ padding: '6px 16px', fontSize: '0.85rem' }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* ===== FILTER CONTROLS ===== */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="form-control"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>
              Select Team
            </label>
            <select
              value={selectedTeamId}
              onChange={e => setSelectedTeamId(e.target.value)}
              className="form-control"
            >
              <option value="all">All Teams</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ===== GLOBAL SUMMARY METRICS — only for All Teams ===== */}
      {isAllTeams && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.08), rgba(59, 130, 246, 0.08))', border: '1px solid rgba(74, 222, 128, 0.25)' }}>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '6px', textTransform: 'uppercase' }}>
              All Teams Revenue (MTD)
            </h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4ade80' }}>
              ${displayedStats.totalRevenue.toFixed(2)}
            </div>
          </div>

          <div className="card" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '6px', textTransform: 'uppercase' }}>
              All Teams Expected Revenue (MTD)
            </h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#60a5fa' }}>
              ${displayedStats.totalExpected.toFixed(2)}
            </div>
          </div>

          <div className="card" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '6px', textTransform: 'uppercase' }}>
              All Teams Positive Leads
            </h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fbbf24' }}>
              {displayedStats.totalLeads}
            </div>
          </div>
        </div>
      )}

      {/* ===== TEAM-SPECIFIC STATS (when a specific team is selected) ===== */}
      {!isAllTeams && activeTeam && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <div className="card" style={{ padding: '16px 20px', background: 'rgba(74, 222, 128, 0.03)', border: '1px solid rgba(74, 222, 128, 0.15)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>This Month ({activeTeam.name})</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4ade80' }}>${activeTeam.totalRevenue.toFixed(2)}</div>
          </div>
          <div className="card" style={{ padding: '16px 20px', background: 'rgba(96, 165, 250, 0.03)', border: '1px solid rgba(96, 165, 250, 0.15)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Expected Revenue ({activeTeam.name})</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#60a5fa' }}>${activeTeam.totalExpected.toFixed(2)}</div>
          </div>
          <div className="card" style={{ padding: '16px 20px', background: 'rgba(251, 191, 36, 0.03)', border: '1px solid rgba(251, 191, 36, 0.15)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Positive Leads ({activeTeam.name})</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fbbf24' }}>{activeTeam.totalLeads}</div>
          </div>
        </div>
      )}

      {/* ===== MISSING DIS REPORTS ===== */}
      {isAllTeams ? (
        allMissing.length > 0 && (
          <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.15)', background: 'rgba(239, 68, 68, 0.02)', padding: '20px', marginBottom: '28px' }}>
            <h4 style={{ color: '#ef4444', fontSize: '1.05rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
              ⚠️ Missing DIS Reports ({allMissing.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allMissing.map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 12px',
                  background: 'rgba(239, 68, 68, 0.04)',
                  borderRadius: '8px',
                  border: '1px solid rgba(239,68,68,0.08)'
                }}>
                  <span style={{ color: '#fff', fontWeight: '500', fontSize: '0.9rem' }}>{item.name}</span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.72rem',
                    fontWeight: '600',
                    textTransform: 'capitalize',
                    background: 'rgba(96,165,250,0.1)',
                    border: '1px solid rgba(96,165,250,0.2)',
                    color: '#60a5fa'
                  }}>{item.teamName}</span>
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        activeTeam && activeTeam.missing.length > 0 && (
          <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.15)', background: 'rgba(239, 68, 68, 0.02)', padding: '20px', marginBottom: '28px' }}>
            <h4 style={{ color: '#ef4444', fontSize: '1.05rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
              ⚠️ Missing DIS Reports ({activeTeam.missing.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeTeam.missing.map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 12px',
                  background: 'rgba(239, 68, 68, 0.04)',
                  borderRadius: '8px',
                  border: '1px solid rgba(239,68,68,0.08)'
                }}>
                  <span style={{ color: '#fff', fontWeight: '500', fontSize: '0.9rem' }}>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* ===== SUBMITTED REPORTS GRID ===== */}
      <div>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#fff' }}>
          Submitted Reports
          <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '400' }}>
            ({displayedSubmissions.length} submission{displayedSubmissions.length !== 1 ? 's' : ''})
          </span>
        </h4>
        {displayedSubmissions.length > 0 ? (
          <div className="dis-grid">
            {displayedSubmissions.map(row => {
              const monthStr = `${row.report_date.split('-')[0]}-${row.report_date.split('-')[1]}-01`

              // Find revenue — if all teams, sum across all teams for this user
              let teamSpecificRevenue = 0
              if (isAllTeams) {
                const userMonthRevs = revenues.filter(rv => rv.user_id === row.user_id && rv.revenue_month === monthStr)
                teamSpecificRevenue = userMonthRevs.reduce((sum, rv) => sum + Number(rv.amount), 0)
              } else {
                const revRecord = revenues.find(
                  rv => rv.user_id === row.user_id &&
                        rv.team_id === (activeTeam?.id) &&
                        rv.revenue_month === monthStr
                )
                teamSpecificRevenue = revRecord ? Number(revRecord.amount) : 0
              }

              return (
                <div
                  key={row.id}
                  className="card"
                  style={{
                    padding: '20px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                >
                  <div>
                    <div style={{ fontWeight: '600', color: '#fff', fontSize: '1.05rem' }}>{row.profiles?.first_name} {row.profiles?.last_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.profiles?.email}</div>
                    {isAllTeams && row.teams?.name && (
                      <div style={{ marginTop: '4px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '0.72rem',
                          fontWeight: '600',
                          textTransform: 'capitalize',
                          background: 'rgba(96,165,250,0.1)',
                          border: '1px solid rgba(96,165,250,0.2)',
                          color: '#60a5fa'
                        }}>{row.teams.name}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Positive Leads:</span>
                      <span style={{ fontWeight: 'bold', color: '#fbbf24' }}>{row.positive_leads}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>MTD Revenue:</span>
                      <span style={{ fontWeight: 'bold', color: '#4ade80' }}>${teamSpecificRevenue.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Expected Revenue:</span>
                      <span style={{ fontWeight: 'bold', color: '#60a5fa' }}>${Number(row.expected_revenue).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.95rem' }}>No reports submitted for the selected date.</p>
        )}
      </div>
    </div>
  )
}
