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

    return teams
      .map(team => {
        const teamMems = profiles.filter(p => p.team_id === team.id && nonAdminIds.has(p.id) && p.has_dis_reporting !== false)
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
      .filter(t => t.membersCount > 0)
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
    const activeProfiles = profiles.filter(p => p.has_dis_reporting !== false)
    const totalMembers = activeProfiles.length
    const submittedCount = activeProfiles.filter(m => submittedToday.has(m.id)).length
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

  const handleCopyMissingReports = () => {
    const grouped = {}
    filteredMissing.forEach(m => {
      const tName = m.teamName || 'Unassigned'
      if (!grouped[tName]) grouped[tName] = []
      grouped[tName].push(m.name)
    })

    const lines = []
    Object.entries(grouped).forEach(([teamName, members]) => {
      lines.push(teamName)
      members.forEach(name => {
        lines.push(`- ${name}`)
      })
      lines.push('') // Spacer line
    })

    const textToCopy = lines.join('\n').trim()
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          alert('Missing DIS reports copied to clipboard!')
        })
        .catch(err => {
          console.error('Failed to copy: ', err)
        })
    }
  }

  if (loading && !adminDisCache.loaded) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', gap: '16px' }}>
        <RefreshCw size={36} className="spin-anim" style={{ color: 'var(--apple-accent-blue)' }} />
        <div style={{ color: 'var(--apple-text-secondary)', fontSize: '1.05rem', fontWeight: '500' }}>Loading DIS Dashboard...</div>
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      
      {/* ===== HEADER SECTION ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'clamp(24px, 5vw, 40px)', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="apple-kicker">DIS Audit Hub</div>
          <h1 className="apple-title-large">Daily Information Sheets</h1>
          <p className="apple-lead">
            Track, search, and audit Daily Information Sheets submissions.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="apple-btn apple-btn-secondary"
          style={{ padding: '8px 18px', fontSize: '0.85rem' }}
        >
          <RefreshCw size={14} className={loading ? 'spin-anim' : ''} style={{ marginRight: '6px' }} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* ===== METRICS SUMMARY ROW ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        
        {/* MTD Revenue */}
        <div className="apple-card" style={{ position: 'relative', overflow: 'hidden', padding: '20px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--apple-accent-green)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ color: 'var(--apple-text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, fontWeight: '700' }}>
              {isAllTeams ? 'All Teams Revenue (MTD)' : `${activeTeam?.name || ''} Revenue`}
            </h3>
            <TrendingUp size={16} style={{ color: 'var(--apple-accent-green)' }} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: 'var(--apple-accent-green)' }}>
            ${displayedStats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Expected Revenue */}
        <div className="apple-card" style={{ position: 'relative', overflow: 'hidden', padding: '20px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--apple-accent-blue)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ color: 'var(--apple-text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, fontWeight: '700' }}>
              Expected Revenue (MTD)
            </h3>
            <DollarSign size={16} style={{ color: 'var(--apple-accent-blue)' }} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: 'var(--apple-accent-blue)' }}>
            ${displayedStats.totalExpected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Positive Leads */}
        <div className="apple-card" style={{ position: 'relative', overflow: 'hidden', padding: '20px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--apple-accent-orange)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ color: 'var(--apple-text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, fontWeight: '700' }}>
              Positive Leads
            </h3>
            <Zap size={16} style={{ color: 'var(--apple-accent-orange)' }} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: 'var(--apple-accent-orange)' }}>
            {displayedStats.totalLeads}
          </div>
        </div>

      </div>

      {/* ===== SEARCH & DATE FILTER CONTROLS ===== */}
      <div className="apple-card" style={{ marginBottom: '28px', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'center' }} className="apple-two-col-grid">
          
          {/* Date Selection */}
          <div>
            <label className="apple-form-label">
              Report Date
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Calendar size={16} style={{ position: 'absolute', left: '12px', color: 'var(--apple-text-secondary)', pointerEvents: 'none' }} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="apple-form-control has-icon"
              />
            </div>
          </div>

          {/* Search Input */}
          <div>
            <label className="apple-form-label">
              Search Employee
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--apple-text-secondary)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="apple-form-control has-icon"
              />
            </div>
          </div>

        </div>
      </div>

      {/* ===== INTERACTIVE TEAM SELECTOR BOARD ===== */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '0.78rem', color: 'var(--apple-text-secondary)', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Select Team to Filter
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          
          {/* "All Teams" Card */}
          <div 
            className="apple-card"
            style={{
              cursor: 'pointer',
              border: isAllTeams ? '1px solid var(--apple-accent-blue)' : '1px solid var(--apple-border)',
              background: isAllTeams ? 'rgba(0,113,227,0.06)' : 'var(--apple-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              padding: '16px'
            }}
            onClick={() => setSelectedTeamId('all')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontWeight: '700', fontSize: '0.98rem', color: '#fff' }}>All Teams</div>
              <UsersRound size={16} style={{ color: isAllTeams ? 'var(--apple-accent-blue)' : 'var(--apple-text-secondary)' }} />
            </div>
            
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
              <div 
                style={{ width: `${globalStats.progress}%`, height: '100%', background: 'var(--apple-accent-blue)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>
              <span>{globalStats.progress}% Compliance</span>
              <span style={{ display: 'flex', gap: '6px' }}>
                <span style={{ color: 'var(--apple-accent-green)', fontWeight: '700' }} title="Submitted count">{globalStats.submittedCount}</span>
                <span style={{ color: 'var(--apple-accent-red)', fontWeight: '700' }} title="Missed count">{globalStats.missedCount}</span>
              </span>
            </div>
          </div>

          {/* Each Team Card */}
          {teamData.map(team => {
            const isActive = selectedTeamId === team.id;
            const colorCode = team.progress > 75 
              ? 'var(--apple-accent-green)' 
              : team.progress > 40 
                ? 'var(--apple-accent-orange)' 
                : 'var(--apple-accent-red)';
            
            return (
              <div 
                key={team.id}
                className="apple-card"
                style={{
                  cursor: 'pointer',
                  border: isActive ? `1px solid ${colorCode}` : '1px solid var(--apple-border)',
                  background: isActive ? `${colorCode}08` : 'var(--apple-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  padding: '16px'
                }}
                onClick={() => setSelectedTeamId(team.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {team.name}
                  </div>
                  <Users size={15} style={{ color: isActive ? colorCode : 'var(--apple-text-secondary)', flexShrink: 0 }} />
                </div>
                
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div 
                    style={{ width: `${team.progress}%`, height: '100%', background: colorCode }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>
                  <span>{team.progress}% Compliance</span>
                  <span style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ color: 'var(--apple-accent-green)', fontWeight: '700' }} title="Submitted count">{team.submittedCount}</span>
                    <span style={{ color: 'var(--apple-accent-red)', fontWeight: '700' }} title="Missed count">{team.missing.length}</span>
                  </span>
                </div>
              </div>
            )
          })}

        </div>
      </div>

      {/* ===== SUBMITTED REPORTS SECTION (FIRST) ===== */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <CheckCircle2 size={18} style={{ color: 'var(--apple-accent-green)' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: '700' }}>Submitted Reports</h3>
          <span className="apple-badge apple-badge-green" style={{ fontSize: '0.75rem' }}>
            {filteredSubmissions.length}
          </span>
        </div>

        {filteredSubmissions.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
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
                  className="apple-card"
                  style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    border: '1px solid var(--apple-border)'
                  }}
                >
                  <div style={{ borderBottom: '1px solid var(--apple-border)', paddingBottom: '10px' }}>
                    <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.98rem' }}>
                      {row.profiles?.first_name} {row.profiles?.last_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', wordBreak: 'break-all', marginTop: '2px' }}>
                      {row.profiles?.email}
                    </div>
                    {isAllTeams && displayTeamName && (
                      <div style={{ marginTop: '8px' }}>
                        <span className="apple-badge apple-badge-blue" style={{ fontSize: '0.68rem' }}>
                          {displayTeamName}
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--apple-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Zap size={13} style={{ color: 'var(--apple-accent-orange)' }} /> Positive Leads:
                      </span>
                      <span style={{ fontWeight: 'bold', color: 'var(--apple-accent-orange)' }}>{row.positive_leads}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--apple-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <DollarSign size={13} style={{ color: 'var(--apple-accent-green)' }} /> MTD Revenue:
                      </span>
                      <span style={{ fontWeight: 'bold', color: 'var(--apple-accent-green)' }}>${teamSpecificRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--apple-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Activity size={13} style={{ color: 'var(--apple-accent-blue)' }} /> Expected Revenue:
                      </span>
                      <span style={{ fontWeight: 'bold', color: 'var(--apple-accent-blue)' }}>${Number(row.expected_revenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="apple-card" style={{ padding: '28px', textAlign: 'center', color: 'var(--apple-text-secondary)', fontStyle: 'italic' }}>
            No submitted reports found matching the criteria.
          </div>
        )}
      </div>

      {/* ===== MISSING DIS REPORTS SECTION (SECOND) ===== */}
      <div style={{ marginBottom: '60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} style={{ color: 'var(--apple-accent-red)' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: '700' }}>Missing DIS Reports</h3>
            <span className="apple-badge apple-badge-red" style={{ fontSize: '0.75rem' }}>
              {filteredMissing.length}
            </span>
          </div>
          {filteredMissing.length > 0 && (
            <button
              onClick={handleCopyMissingReports}
              className="apple-btn apple-btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              📋 Copy Missing Reports
            </button>
          )}
        </div>

        {filteredMissing.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {filteredMissing.map((item, idx) => (
              <div 
                key={idx} 
                className="apple-card"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  border: '1px solid var(--apple-border)',
                  background: 'rgba(255, 69, 58, 0.02)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div>
                    <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.98rem' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', wordBreak: 'break-all', marginTop: '2px' }}>
                      {item.email || 'No email registered'}
                    </div>
                  </div>
                  <span className="apple-badge apple-badge-red" style={{ fontSize: '0.65rem', flexShrink: 0 }}>
                    Pending
                  </span>
                </div>
                
                {item.teamName && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', marginTop: 'auto', borderTop: '1px solid var(--apple-border)', paddingTop: '8px' }}>
                    <span style={{ color: 'var(--apple-text-secondary)' }}>Team:</span>
                    <span style={{ fontWeight: '600', color: '#fff' }}>{item.teamName}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="apple-card" style={{ padding: '28px', textAlign: 'center', color: 'var(--apple-text-secondary)', fontStyle: 'italic' }}>
            No missing reports. 100% compliance achieved! 🎉
          </div>
        )}
      </div>

    </div>
  )
}
