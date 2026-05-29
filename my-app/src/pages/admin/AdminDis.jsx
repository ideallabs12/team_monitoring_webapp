import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'

export default function AdminDis() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])
  const [profiles, setProfiles] = useState([])
  const [memberships, setMemberships] = useState([])
  const [revenues, setRevenues] = useState([])
  const [reports, setReports] = useState([])

  // Submitted User IDs for the selectedDate
  const [submittedToday, setSubmittedToday] = useState(new Set())

  // Filter States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTeamId, setSelectedTeamId] = useState('')

  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id)
    }
  }, [teams, selectedTeamId])

  const loadData = async () => {
    try {
      const [teamsRes, profilesRes, membershipsRes, revenuesRes] = await Promise.all([
        supabase.from('teams').select('*').order('name', { ascending: true }),
        supabase.from('profiles').select('*'),
        supabase.from('team_members').select('*'),
        supabase.from('monthly_revenues').select('*'),
      ])

      const teamsData = teamsRes.data || []
      const profilesData = profilesRes.data || []
      const membershipsData = membershipsRes.data || []
      const revenuesData = revenuesRes.data || []

      // Filter out admins
      const nonAdminProfiles = profilesData.filter(p => p.platform_role !== 'admin')
      const nonAdminIds = new Set(nonAdminProfiles.map(p => p.id))

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
      setMemberships(membershipsData)
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

  // Global totals for selected date
  const summary = useMemo(() => {
    let totalLeads = 0
    let totalExpected = 0

    // For MTD revenue, we only sum the latest report's MTD revenue per user dynamically
    const userLatestRevenue = {}

    for (const r of reports) {
      totalLeads += Number(r.positive_leads)
      totalExpected += Number(r.expected_revenue)

      // Since reports are sorted by report_date desc, the first one we see is the latest
      if (userLatestRevenue[r.user_id] === undefined) {
        const monthStr = `${r.report_date.split('-')[0]}-${r.report_date.split('-')[1]}-01`
        // Sum all revenues for this user in this month
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
      // Find members of this team
      const teamMems = memberships.filter(m => m.team_id === team.id && nonAdminIds.has(m.user_id))
      const teamMemberIds = new Set(teamMems.map(m => m.user_id))

      // Reports matching this team (based on reporter's current membership or historical revenue in this team for the report's month)
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

      // Totals for the selected date.
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

      // Calculate missing users for selectedDate (active members only)
      const missing = teamMems.filter(m => {
        const hasSubmitted = submittedToday.has(m.user_id)
        return !hasSubmitted
      }).map(m => {
        const prof = profiles.find(p => p.id === m.user_id)
        return prof ? `${prof.first_name} ${prof.last_name}` : 'Unknown'
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
  }, [teams, profiles, memberships, reports, submittedToday, revenues])

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>Loading DIS Dashboard...</div>

  return (
    <div>
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
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
        </div>
      </div>

      {/* ===== GLOBAL SUMMARY METRICS ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.08), rgba(59, 130, 246, 0.08))', border: '1px solid rgba(74, 222, 128, 0.25)' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '6px', textTransform: 'uppercase' }}>
            All Teams Revenue (MTD)
          </h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4ade80' }}>
            ${summary.totalRevenue.toFixed(2)}
          </div>
        </div>

        <div className="card" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '6px', textTransform: 'uppercase' }}>
            All Teams Expected Rev
          </h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#60a5fa' }}>
            ${summary.totalExpected.toFixed(2)}
          </div>
        </div>

        <div className="card" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '6px', textTransform: 'uppercase' }}>
            All Teams Positive Leads
          </h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fbbf24' }}>
            {summary.totalLeads}
          </div>
        </div>
      </div>

      {/* ===== TWO COLUMN CONTENT AREA ===== */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '10px' }}>

        {/* LEFT SIDEBAR: Teams List */}
        <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 0, flexShrink: 0 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', paddingLeft: '8px' }}>
            Teams Breakdown
          </div>
          {teamData.map(team => {
            const isSelected = selectedTeamId === team.id
            return (
              <button
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '14px 18px',
                  borderRadius: '10px',
                  border: isSelected ? '1px solid #4ade80' : '1px solid var(--border-color)',
                  background: isSelected ? 'rgba(74, 222, 128, 0.08)' : 'rgba(255,255,255,0.02)',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  width: '100%',
                  boxShadow: isSelected ? '0 4px 12px rgba(74, 222, 128, 0.1)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                }}
              >
                <span style={{ fontWeight: '600', fontSize: '1rem', textTransform: 'capitalize' }}>{team.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {team.submissions.length} / {team.membersCount} submitted
                </span>
              </button>
            )
          })}
        </div>

        {/* RIGHT SIDEBAR CONTENT: Selected Team Details */}
        <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {selectedTeamId ? (() => {
            const activeTeam = teamData.find(t => t.id === selectedTeamId) || teamData[0]
            const hasReports = activeTeam.submissions.length > 0

            return (
              <>
                {/* Team summary header stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                  <div className="card" style={{ padding: '16px 20px', background: 'rgba(74, 222, 128, 0.03)', border: '1px solid rgba(74, 222, 128, 0.15)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>This Month ({activeTeam.name})</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4ade80' }}>${activeTeam.totalRevenue.toFixed(2)}</div>
                  </div>
                  <div className="card" style={{ padding: '16px 20px', background: 'rgba(96, 165, 250, 0.03)', border: '1px solid rgba(96, 165, 250, 0.15)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>This Expected Revenue ({activeTeam.name})</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#60a5fa' }}>${activeTeam.totalExpected.toFixed(2)}</div>
                  </div>
                  <div className="card" style={{ padding: '16px 20px', background: 'rgba(251, 191, 36, 0.03)', border: '1px solid rgba(251, 191, 36, 0.15)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>This Positive Leads ({activeTeam.name})</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fbbf24' }}>{activeTeam.totalLeads}</div>
                  </div>
                </div>

                {/* Missing reports block */}
                {activeTeam.missing.length > 0 && (
                  <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.15)', background: 'rgba(239, 68, 68, 0.02)', padding: '20px' }}>
                    <h4 style={{ color: '#ef4444', fontSize: '1.05rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
                      ⚠️ Missing DIS Reports ({activeTeam.missing.length})
                    </h4>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {activeTeam.missing.join(', ')}
                    </div>
                  </div>
                )}

                {/* Submissions grid (3-in-a-row) */}
                <div>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#fff' }}>Submitted Reports</h4>
                  {hasReports ? (
                    <div className="dis-grid">
                      {activeTeam.submissions.map(row => {
                        const monthStr = `${row.report_date.split('-')[0]}-${row.report_date.split('-')[1]}-01`
                        const revRecord = revenues.find(
                          rv => rv.user_id === row.user_id &&
                                rv.team_id === activeTeam.id &&
                                rv.revenue_month === monthStr
                        )
                        const teamSpecificRevenue = revRecord ? Number(revRecord.amount) : 0

                        return (
                          <div key={row.id} className="card" style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}>
                            <div>
                              <div style={{ fontWeight: '600', color: '#fff', fontSize: '1.05rem' }}>{row.profiles?.first_name} {row.profiles?.last_name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.profiles?.email}</div>
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
              </>
            )
          })() : (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>
              Select a team from the left to view reports.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
