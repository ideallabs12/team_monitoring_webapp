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

export default function TeamDisReport({ user }) {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [team, setTeam] = useState(null)
  const [accessDenied, setAccessDenied] = useState(false)
  
  const [profiles, setProfiles] = useState([])
  const [revenues, setRevenues] = useState([])
  const [reports, setReports] = useState([])
  const [submittedToday, setSubmittedToday] = useState(new Set())

  // Filter States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [searchTerm, setSearchTerm] = useState('')

  // First verify teamlead role and load profile/team
  useEffect(() => {
    if (!user) return
    async function loadTeamLeadProfile() {
      try {
        const { data: prof, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (error) throw error
        
        if (prof?.platform_role !== 'teamlead') {
          setAccessDenied(true)
          setLoading(false)
          return
        }
        
        setProfile(prof)
        
        if (prof.team_id) {
          const { data: tm } = await supabase
            .from('teams')
            .select('*')
            .eq('id', prof.team_id)
            .single()
          
          if (tm) setTeam(tm)
        }
      } catch (err) {
        console.error("Error loading team lead profile:", err)
        setAccessDenied(true)
      }
    }
    loadTeamLeadProfile()
  }, [user])

  const loadData = async () => {
    if (!profile?.team_id) return
    setLoading(true)
    try {
      const monthStr = `${selectedDate.split('-')[0]}-${selectedDate.split('-')[1]}-01`

      const [profilesRes, revenuesRes, reportsRes, missingReportsRes] = await Promise.all([
        supabase.from('profiles').select('*'), // Fetch all, filter below
        supabase.from('monthly_revenues').select('*').eq('team_id', profile.team_id).eq('revenue_month', monthStr),
        supabase.from('dis_reports').select(`
          *,
          profiles (
            first_name,
            last_name,
            email,
            team_id
          )
        `).eq('report_date', selectedDate).eq('team_id', profile.team_id), // Filter reports by team
        supabase.from('dis_reports').select('user_id').eq('report_date', selectedDate).eq('team_id', profile.team_id)
      ])

      const profilesData = (profilesRes.data || []).filter(p => 
        p.team_id === profile.team_id || (p.secondary_team_ids || []).includes(profile.team_id)
      )
      const revenuesData = revenuesRes.data || []
      const allReportsData = reportsRes.data || []
      const allMissingData = missingReportsRes.data || []

      // Filter out admins from team members
      const nonAdminProfiles = profilesData.filter(p => p.platform_role !== 'admin')
      const memberIds = new Set(nonAdminProfiles.map(p => p.id))

      // Only care about reports from our team members
      const teamReports = allReportsData.filter(r => memberIds.has(r.user_id))
      const teamMissing = allMissingData.filter(r => memberIds.has(r.user_id))

      const submittedUserIds = new Set(teamMissing.map(r => r.user_id))

      setProfiles(nonAdminProfiles)
      setRevenues(revenuesData)
      setReports(teamReports)
      setSubmittedToday(submittedUserIds)

    } catch (err) {
      console.error("Error loading team DIS data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profile?.team_id) {
      loadData()
    }
  }, [selectedDate, profile])

  // Process data for the team
  const teamData = useMemo(() => {
    if (!team) return null

    const teamUserLatestRevenue = {}
    let teamTotalLeads = 0
    let teamTotalExpected = 0

    for (const r of reports) {
      teamTotalLeads += Number(r.positive_leads)
      teamTotalExpected += Number(r.expected_revenue)
      if (teamUserLatestRevenue[r.user_id] === undefined) {
        const userRevs = revenues.filter(rv => rv.user_id === r.user_id)
        teamUserLatestRevenue[r.user_id] = userRevs.reduce((sum, rv) => sum + Number(rv.amount), 0)
      }
    }

    const teamTotalRevenue = Object.values(teamUserLatestRevenue).reduce((acc, val) => acc + val, 0)

    // Missing users
    const missing = profiles.filter(m => !submittedToday.has(m.id)).map(m => ({
      id: m.id,
      name: `${m.first_name} ${m.last_name}`,
      email: m.email,
      teamName: team.name
    }))

    const submittedCount = profiles.length - missing.length
    const progress = profiles.length > 0 ? Math.round((submittedCount / profiles.length) * 100) : 0

    return {
      ...team,
      membersCount: profiles.length,
      submissions: reports,
      missing,
      submittedCount,
      progress,
      totalRevenue: teamTotalRevenue,
      totalLeads: teamTotalLeads,
      totalExpected: teamTotalExpected
    }
  }, [team, profiles, reports, submittedToday, revenues])

  // Submissions filtered by search term
  const filteredSubmissions = useMemo(() => {
    if (!teamData) return []
    let list = teamData.submissions
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase()
      list = list.filter(r => {
        const fullName = `${r.profiles?.first_name || ''} ${r.profiles?.last_name || ''}`.toLowerCase()
        const email = (r.profiles?.email || '').toLowerCase()
        return fullName.includes(term) || email.includes(term)
      })
    }
    return list
  }, [teamData, searchTerm])

  // Missing filtered by search term
  const filteredMissing = useMemo(() => {
    if (!teamData) return []
    let list = teamData.missing
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase()
      list = list.filter(m => {
        const nameMatch = m.name.toLowerCase().includes(term)
        const emailMatch = (m.email || '').toLowerCase().includes(term)
        return nameMatch || emailMatch
      })
    }
    return list
  }, [teamData, searchTerm])

  if (accessDenied) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '24px' }}>🔒</div>
        <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Access Denied</h2>
        <p style={{ color: 'var(--apple-text-secondary)', fontSize: '1.2rem', maxWidth: '500px', margin: '0 auto' }}>
          This workspace is strictly restricted to Team Leads. If you believe this is an error, please contact your administrator.
        </p>
      </div>
    )
  }

  if (loading && !teamData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', gap: '16px' }}>
        <RefreshCw size={36} className="spin-anim" style={{ color: 'var(--primary)' }} />
        <div style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', fontWeight: '500' }}>Loading Team DIS Report...</div>
      </div>
    )
  }

  if (!teamData) return null;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* ===== HEADER SECTION ===== */}
      <div className="dis-header-section">
        <div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: '#fff' }}>Team DIS Report</h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Track, search, and audit Daily Information Sheets submissions for <strong>{team?.name || 'Your Team'}</strong>.
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
              Team Revenue (MTD)
            </h3>
            <TrendingUp size={16} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#10b981' }}>
            ${teamData.totalRevenue.toFixed(2)}
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
            ${teamData.totalExpected.toFixed(2)}
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
            {teamData.totalLeads}
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
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ background: 'rgba(48, 213, 200, 0.06)', border: '1px solid rgba(48, 213, 200, 0.2)', borderRadius: '10px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                    <span style={{ fontSize: '0.85rem', color: '#ffffff' }}><strong>{teamData.submittedCount}</strong> Submitted</span>
                </div>
                <div style={{ background: 'rgba(255, 69, 58, 0.06)', border: '1px solid rgba(255, 69, 58, 0.2)', borderRadius: '10px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                    <span style={{ fontSize: '0.85rem', color: '#ffffff' }}><strong>{teamData.missing.length}</strong> Missing</span>
                </div>
            </div>
          </div>
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
              const userRevs = revenues.filter(rv => rv.user_id === row.user_id)
              const teamSpecificRevenue = userRevs.reduce((sum, rv) => sum + Number(rv.amount), 0)

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
