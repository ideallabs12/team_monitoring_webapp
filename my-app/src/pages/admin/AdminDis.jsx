import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { 
  Users, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Zap, 
  RefreshCw, 
  Search, 
  UsersRound, 
  Activity, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react'

let adminDisCache = { loaded: false, teams: [], profiles: [], revenues: [], reports: [], submittedToday: new Set() }

export default function AdminDis() {
  const [loading, setLoading] = useState(!adminDisCache.loaded)
  const [teams, setTeams] = useState(adminDisCache.teams)
  const [profiles, setProfiles] = useState(adminDisCache.profiles)
  const [revenues, setRevenues] = useState(adminDisCache.revenues)
  const [reports, setReports] = useState(adminDisCache.reports)
  const [submittedToday, setSubmittedToday] = useState(adminDisCache.submittedToday)

  // Filter States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTeamId, setSelectedTeamId] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const loadData = async () => {
    try {
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
        .order('report_date', { ascending: false })

      const missingReportsQuery = supabase
        .from('dis_reports')
        .select('user_id')
        .eq('report_date', selectedDate)

      const [teamsRes, profilesRes, revenuesRes, reportsRes, selectedDateReportsRes] = await Promise.all([
        supabase.from('teams').select('*').order('name', { ascending: true }),
        supabase.from('profiles').select('*'),
        supabase.from('monthly_revenues').select('*'),
        query,
        missingReportsQuery
      ])

      const teamsData = teamsRes.data || []
      const profilesData = profilesRes.data || []
      const revenuesData = revenuesRes.data || []
      const reportsData = reportsRes.data || []
      const selectedDateReports = selectedDateReportsRes.data || []

      // Filter out admins
      const nonAdminProfiles = profilesData.filter(p => p.platform_role !== 'admin')

      const submittedUserIds = new Set(selectedDateReports.map(r => r.user_id))

      setTeams(teamsData)
      setProfiles(nonAdminProfiles)
      setRevenues(revenuesData)
      setReports(reportsData)
      setSubmittedToday(submittedUserIds)

      adminDisCache = {
        loaded: true,
        teams: teamsData,
        profiles: nonAdminProfiles,
        revenues: revenuesData,
        reports: reportsData || [],
        submittedToday: submittedUserIds
      }
    } catch (err) {
      console.error("Error loading admin DIS data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
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
          id: m.id,
          name: `${m.first_name} ${m.last_name}`,
          email: m.email,
          teamName: team.name
        }
      })

      const submittedCount = teamMems.length - missing.length
      const progress = teamMems.length > 0 ? Math.round((submittedCount / teamMems.length) * 100) : 0

      return {
        ...team,
        membersCount: teamMems.length,
        submissions: teamReps,
        missing,
        submittedCount,
        progress,
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

  // Compute global submissions/missed statistics for "All Teams"
  const globalStats = useMemo(() => {
    const totalMembers = profiles.length
    const submittedCount = profiles.filter(m => submittedToday.has(m.id)).length
    const missedCount = totalMembers - submittedCount
    const progress = totalMembers > 0 ? Math.round((submittedCount / totalMembers) * 100) : 0
    return { totalMembers, submittedCount, missedCount, progress }
  }, [profiles, submittedToday])

  // Submissions to display
  const displayedSubmissions = useMemo(() => {
    if (isAllTeams) return reports
    return activeTeam ? activeTeam.submissions : []
  }, [isAllTeams, reports, activeTeam])

  // Submissions filtered by search term
  const filteredSubmissions = useMemo(() => {
    let list = displayedSubmissions
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase()
      list = list.filter(r => {
        const fullName = `${r.profiles?.first_name || ''} ${r.profiles?.last_name || ''}`.toLowerCase()
        const email = (r.profiles?.email || '').toLowerCase()
        return fullName.includes(term) || email.includes(term)
      })
    }
    return list
  }, [displayedSubmissions, searchTerm])

  // Missing filtered by search term
  const filteredMissing = useMemo(() => {
    let list = isAllTeams ? allMissing : (activeTeam ? activeTeam.missing : [])
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase()
      list = list.filter(m => {
        const nameMatch = m.name.toLowerCase().includes(term)
        const emailMatch = (m.email || '').toLowerCase().includes(term)
        return nameMatch || emailMatch
      })
    }
    return list
  }, [isAllTeams, allMissing, activeTeam, searchTerm])

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

  if (loading && !adminDisCache.loaded) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', gap: '16px' }}>
        <RefreshCw size={36} className="spin-anim" style={{ color: 'var(--primary)' }} />
        <div style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', fontWeight: '500' }}>Loading DIS Dashboard...</div>
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* ===== HEADER SECTION ===== */}
      <div className="dis-header-section">
        <div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: '#fff' }}>DIS Audit Hub</h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Track, search, and audit Daily Information Sheets submissions.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="btn btn-secondary"
          style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* ===== METRICS SUMMARY ROW ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        
        {/* MTD Revenue */}
        <div className="card dis-card-glass" style={{ position: 'relative', overflow: 'hidden', padding: '20px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#10b981' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              {isAllTeams ? 'All Teams Revenue (MTD)' : `${activeTeam?.name || ''} Revenue`}
            </h3>
            <TrendingUp size={16} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#10b981' }}>
            ${displayedStats.totalRevenue.toFixed(2)}
          </div>
        </div>

        {/* Expected Revenue */}
        <div className="card dis-card-glass" style={{ position: 'relative', overflow: 'hidden', padding: '20px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#3b82f6' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Expected Revenue (MTD)
            </h3>
            <DollarSign size={16} style={{ color: '#3b82f6' }} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#3b82f6' }}>
            ${displayedStats.totalExpected.toFixed(2)}
          </div>
        </div>

        {/* Positive Leads */}
        <div className="card dis-card-glass" style={{ position: 'relative', overflow: 'hidden', padding: '20px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#fbbf24' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Positive Leads
            </h3>
            <Zap size={16} style={{ color: '#fbbf24' }} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#fbbf24' }}>
            {displayedStats.totalLeads}
          </div>
        </div>

      </div>

      {/* ===== SEARCH & DATE FILTER CONTROLS ===== */}
      <div className="card dis-card-glass" style={{ marginBottom: '28px', padding: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', flex: 1 }}>
            
            {/* Date Selection */}
            <div style={{ minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Report Date
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Calendar size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="form-control"
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>

            {/* Search Input */}
            <div className="dis-search-container">
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Search Employee
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={16} className="dis-search-icon" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-control dis-search-input"
                />
              </div>
            </div>

          </div>

          <div style={{ alignSelf: 'flex-end', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Active Filter: <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{isAllTeams ? 'All Teams' : (activeTeam?.name || '')}</strong>
          </div>
        </div>
      </div>

      {/* ===== INTERACTIVE TEAM SELECTOR BOARD ===== */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Select Team to Filter
        </h3>
        
        <div className="dis-team-selector-grid">
          
          {/* "All Teams" Card */}
          <div 
            className={`dis-team-card ${isAllTeams ? 'active' : ''}`}
            onClick={() => setSelectedTeamId('all')}
          >
            <div className="dis-team-card-glow" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontWeight: '700', fontSize: '0.98rem', color: '#fff' }}>All Teams</div>
              <UsersRound size={16} style={{ color: isAllTeams ? 'var(--primary)' : 'var(--text-secondary)' }} />
            </div>
            
            <div className="dis-progress-bar-container">
              <div 
                className="dis-progress-bar-fill" 
                style={{ width: `${globalStats.progress}%`, background: 'linear-gradient(to right, #4F46E5, #3b82f6)' }}
              />
            </div>

            <div className="dis-team-card-stats">
              <span>{globalStats.progress}% Compliance</span>
              <span style={{ display: 'flex', gap: '6px' }}>
                <span className="dis-badge-submitted" title="Submitted count">{globalStats.submittedCount}</span>
                <span className="dis-badge-missed" title="Missed count">{globalStats.missedCount}</span>
              </span>
            </div>
          </div>

          {/* Each Team Card */}
          {teamData.map(team => {
            const isActive = selectedTeamId === team.id;
            const colorGrad = team.progress > 75 
              ? 'linear-gradient(to right, #10b981, #34d399)' 
              : team.progress > 40 
                ? 'linear-gradient(to right, #f59e0b, #fbbf24)' 
                : 'linear-gradient(to right, #ef4444, #f87171)';
            
            return (
              <div 
                key={team.id}
                className={`dis-team-card ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedTeamId(team.id)}
              >
                <div className="dis-team-card-glow" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {team.name}
                  </div>
                  <Users size={15} style={{ color: isActive ? 'var(--primary)' : 'var(--text-secondary)', flexShrink: 0 }} />
                </div>
                
                <div className="dis-progress-bar-container">
                  <div 
                    className="dis-progress-bar-fill" 
                    style={{ width: `${team.progress}%`, background: colorGrad }}
                  />
                </div>

                <div className="dis-team-card-stats">
                  <span>{team.progress}% Compliance</span>
                  <span style={{ display: 'flex', gap: '6px' }}>
                    <span className="dis-badge-submitted" title="Submitted count">{team.submittedCount}</span>
                    <span className="dis-badge-missed" title="Missed count">{team.missing.length}</span>
                  </span>
                </div>
              </div>
            )
          })}

        </div>
      </div>



      {/* ===== SUBMITTED REPORTS SECTION (FIRST) ===== */}
      <div className="dis-card-grid-container">
        <div className="dis-section-title">
          <CheckCircle2 size={18} style={{ color: '#10b981' }} />
          <span>Submitted Reports</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px' }}>
            {filteredSubmissions.length} report{filteredSubmissions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filteredSubmissions.length > 0 ? (
          <div className="dis-grid-cols">
            {filteredSubmissions.map(row => {
              const monthStr = `${row.report_date.split('-')[0]}-${row.report_date.split('-')[1]}-01`

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

              const displayTeamName = row.teams?.name || (() => {
                const userProfile = profiles.find(p => p.id === row.user_id)
                if (userProfile?.team_id) {
                  const userTeam = teams.find(t => t.id === userProfile.team_id)
                  return userTeam?.name || ''
                }
                return ''
              })()

              return (
                <div
                  key={row.id}
                  className="card dis-card-glass dis-report-submitted-card"
                  style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '10px' }}>
                    <div style={{ fontWeight: '600', color: '#fff', fontSize: '1rem' }}>
                      {row.profiles?.first_name} {row.profiles?.last_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                      {row.profiles?.email}
                    </div>
                    {isAllTeams && displayTeamName && (
                      <div style={{ marginTop: '8px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '0.68rem',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          background: 'rgba(96,165,250,0.1)',
                          border: '1px solid rgba(96,165,250,0.2)',
                          color: '#60a5fa'
                        }}>{displayTeamName}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Zap size={13} style={{ color: '#fbbf24' }} /> Positive Leads:
                      </span>
                      <span style={{ fontWeight: 'bold', color: '#fbbf24' }}>{row.positive_leads}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <DollarSign size={13} style={{ color: '#10b981' }} /> MTD Revenue:
                      </span>
                      <span style={{ fontWeight: 'bold', color: '#10b981' }}>${teamSpecificRevenue.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Activity size={13} style={{ color: '#3b82f6' }} /> Expected Revenue:
                      </span>
                      <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>${Number(row.expected_revenue).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card dis-card-glass" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            No submitted reports found matching the criteria.
          </div>
        )}
      </div>

      {/* ===== MISSING DIS REPORTS SECTION (SECOND) ===== */}
      <div className="dis-card-grid-container" style={{ marginBottom: '60px' }}>
        <div className="dis-section-title">
          <AlertCircle size={18} style={{ color: '#f87171' }} />
          <span>Missing DIS Reports</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500', background: 'rgba(239, 68, 68, 0.05)', padding: '2px 8px', borderRadius: '10px' }}>
            {filteredMissing.length} pending
          </span>
        </div>

        {filteredMissing.length > 0 ? (
          <div className="dis-grid-cols">
            {filteredMissing.map((item, idx) => (
              <div 
                key={idx} 
                className="dis-report-missed-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#fff', fontSize: '0.95rem' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                      {item.email || 'No email registered'}
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.65rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    flexShrink: 0
                  }}>Pending</span>
                </div>
                
                {item.teamName && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Team:</span>
                    <span style={{ fontWeight: '500', color: '#fff' }}>{item.teamName}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card dis-card-glass" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            No missing reports. 100% compliance achieved! 🎉
          </div>
        )}
      </div>

    </div>
  )
}
