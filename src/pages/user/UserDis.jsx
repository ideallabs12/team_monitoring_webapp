import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'

export default function UserDis() {
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [userTeams, setUserTeams] = useState([])

  // Form states
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [positiveLeads, setPositiveLeads] = useState('')
  const [expectedRevenue, setExpectedRevenue] = useState('')
  const [mtdRevenue, setMtdRevenue] = useState(0)
  const [loadingMTD, setLoadingMTD] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // History tab states
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Navigation tab
  const [activeTab, setActiveTab] = useState('submit') // 'submit', 'history', 'team'

  // Team Lead states
  const ledTeams = useMemo(() => userTeams.filter(t => t.role === 'lead'), [userTeams])
  const isTeamLead = ledTeams.length > 0
  const [selectedLedTeamId, setSelectedLedTeamId] = useState('')
  const [teamFilterPeriod, setTeamFilterPeriod] = useState('date') // 'date', '1week', '2weeks', '1month'
  const [teamSelectedDate, setTeamSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [teamMembers, setTeamMembers] = useState([])
  const [teamSubmissions, setTeamSubmissions] = useState([])
  const [teamRevenues, setTeamRevenues] = useState([])
  const [missingTeamSubmissions, setMissingTeamSubmissions] = useState([])
  const [loadingTeamData, setLoadingTeamData] = useState(false)
  const [teamMetrics, setTeamMetrics] = useState({}) // { [teamId]: { total: X, submitted: Y } }

  // Edit report states for Team Lead
  const [editingReport, setEditingReport] = useState(null)
  const [editLeads, setEditLeads] = useState('')
  const [editExpected, setEditExpected] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // Helper to parse 'YYYY-MM-01' from Date string
  const getMonthStrFromDate = (dateStr) => {
    if (!dateStr) return ''
    const [year, month] = dateStr.split('-')
    return `${year}-${month}-01`
  }

  // Helper: Month-to-date revenue calculator (total across all teams)
  const fetchMonthToDateRevenue = async (userId, monthStr) => {
    if (!userId || !monthStr) return 0
    
    const { data, error } = await supabase
      .from('monthly_revenues')
      .select('amount')
      .eq('user_id', userId)
      .eq('revenue_month', monthStr)
      
    if (error) {
      console.error("Error fetching MTD revenue:", error)
      throw error
    }
    if (!data) return 0
    return data.reduce((sum, item) => sum + Number(item.amount), 0)
  }

  // Load User & Profile
  useEffect(() => {
    async function getUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUser(user)
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()
          if (prof) setProfile(prof)
        }
      } catch (err) {
        console.error("Error fetching user data:", err)
      } finally {
        setLoading(false)
      }
    }
    getUserData()
  }, [])

  // Load User Teams
  useEffect(() => {
    if (!currentUser) return
    async function fetchTeams() {
      const { data } = await supabase
        .from('team_members')
        .select(`
          team_id,
          team_role,
          teams (
            id,
            name
          )
        `)
        .eq('user_id', currentUser.id)
      
      if (data) {
        const formatted = data.map(tm => ({
          id: tm.team_id,
          name: tm.teams?.name || 'Unnamed Team',
          role: tm.team_role
        }))
        setUserTeams(formatted)
      }
    }
    fetchTeams()
  }, [currentUser])

  // Pre-fill selected led team
  useEffect(() => {
    if (ledTeams.length > 0 && !selectedLedTeamId) {
      setSelectedLedTeamId(ledTeams[0].id)
    }
  }, [ledTeams, selectedLedTeamId])

  // Load existing report for form on date change
  useEffect(() => {
    if (!currentUser || !reportDate) return
    async function loadExistingReport() {
      const { data, error } = await supabase
        .from('dis_reports')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('report_date', reportDate)
        .maybeSingle()
      
      if (data) {
        setPositiveLeads(String(data.positive_leads))
        setExpectedRevenue(String(data.expected_revenue))
        setIsEditMode(true)
        setMessage({ type: '', text: '' })
      } else {
        setPositiveLeads('')
        setExpectedRevenue('')
        setIsEditMode(false)
        setMessage({ type: '', text: '' })
      }
    }
    loadExistingReport()
  }, [currentUser, reportDate])

  // Load MTD revenue on date change
  useEffect(() => {
    if (!currentUser || !reportDate) return
    async function loadMTD() {
      setLoadingMTD(true)
      try {
        const monthStr = getMonthStrFromDate(reportDate)
        const amt = await fetchMonthToDateRevenue(currentUser.id, monthStr)
        setMtdRevenue(amt)
      } catch (err) {
        console.error(err)
        setMessage({ type: 'error', text: `Failed to load Month-to-Date revenue: ${err.message}` })
      } finally {
        setLoadingMTD(false)
      }
    }
    loadMTD()
  }, [currentUser, reportDate])

  // Load submission metrics for all led teams
  useEffect(() => {
    if (!currentUser || ledTeams.length === 0) return
    async function fetchTeamMetrics() {
      const metrics = {}
      for (const team of ledTeams) {
        try {
          const { data: mems } = await supabase
            .from('team_members')
            .select(`
              user_id,
              profiles ( platform_role )
            `)
            .eq('team_id', team.id)

          const nonAdminMems = mems
            ? mems.filter(m => m.profiles && m.profiles.platform_role !== 'admin')
            : []
          const memberIds = nonAdminMems.map(m => m.user_id)

          let submittedCount = 0
          if (memberIds.length > 0) {
            const { count } = await supabase
              .from('dis_reports')
              .select('*', { count: 'exact', head: true })
              .in('user_id', memberIds)
              .eq('report_date', teamSelectedDate)
            submittedCount = count || 0
          }

          metrics[team.id] = {
            total: memberIds.length,
            submitted: submittedCount
          }
        } catch (err) {
          console.error("Error loading team metrics:", err)
        }
      }
      setTeamMetrics(metrics)
    }
    fetchTeamMetrics()
  }, [currentUser, ledTeams, teamSelectedDate])

  const handleOpenEdit = (report) => {
    setEditingReport(report)
    setEditLeads(String(report.positive_leads))
    setEditExpected(String(report.expected_revenue))
    setEditError('')
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editingReport) return
    setEditSaving(true)
    setEditError('')
    try {
      const { error } = await supabase
        .from('dis_reports')
        .update({
          positive_leads: parseInt(editLeads) || 0,
          expected_revenue: parseFloat(editExpected) || 0
        })
        .eq('id', editingReport.id)

      if (error) throw error

      await loadTeamData()
      setEditingReport(null)
    } catch (err) {
      console.error(err)
      setEditError(err.message || "Failed to update report.")
    } finally {
      setEditSaving(false)
    }
  }

  // Load History
  const fetchHistory = async () => {
    if (!currentUser) return
    setLoadingHistory(true)
    const { data } = await supabase
      .from('dis_reports')
      .select(`
        *,
        teams (
          name
        )
      `)
      .eq('user_id', currentUser.id)
      .order('report_date', { ascending: false })
      
    if (data) setHistory(data)
    setLoadingHistory(false)
  }

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory()
    }
  }, [activeTab])

  // Load Team Lead Data
  const loadTeamData = async () => {
    if (!currentUser || !selectedLedTeamId) return
    setLoadingTeamData(true)
    
    try {
      // 1. Fetch team members (excluding admins)
      const { data: mems } = await supabase
        .from('team_members')
        .select(`
          user_id,
          team_role,
          profiles (
            id,
            first_name,
            last_name,
            email,
            platform_role
          )
        `)
        .eq('team_id', selectedLedTeamId)
      
      const nonAdminMems = mems
        ? mems.filter(m => m.profiles && m.profiles.platform_role !== 'admin')
        : []

      const memberUserIds = nonAdminMems.map(m => m.user_id)

      // 2. Fetch reports based on filter
      let reps = []
      let submittedIds = new Set()

      if (memberUserIds.length > 0) {
        let query = supabase
          .from('dis_reports')
          .select(`
            *,
            profiles (
              first_name,
              last_name,
              email
            )
          `)
          .in('user_id', memberUserIds)
          
        if (teamFilterPeriod === 'date') {
          query = query.eq('report_date', teamSelectedDate)
        } else {
          let days = 7
          if (teamFilterPeriod === '2weeks') days = 14
          if (teamFilterPeriod === '1month') days = 30
          
          const cutoffDate = new Date()
          cutoffDate.setDate(cutoffDate.getDate() - days)
          const cutoffStr = cutoffDate.toISOString().split('T')[0]
          query = query.gte('report_date', cutoffStr).lte('report_date', new Date().toISOString().split('T')[0])
        }
        
        const { data: repsData } = await query.order('report_date', { ascending: false })
        reps = repsData || []

        // Calculate missing for the selected date
        const { data: todayReps } = await supabase
          .from('dis_reports')
          .select('user_id')
          .in('user_id', memberUserIds)
          .eq('report_date', teamSelectedDate)
          
        submittedIds = new Set(todayReps?.map(r => r.user_id) || [])
      }
      
      const missing = nonAdminMems.filter(m => !submittedIds.has(m.user_id))

      // 3. Fetch monthly revenues for this team to calculate team-specific stats
      let revs = []
      if (memberUserIds.length > 0) {
        const { data: revsData } = await supabase
          .from('monthly_revenues')
          .select('*')
          .eq('team_id', selectedLedTeamId)
        revs = revsData || []
      }
      
      setTeamMembers(nonAdminMems)
      setTeamSubmissions(reps)
      setTeamRevenues(revs)
      setMissingTeamSubmissions(missing)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingTeamData(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'team' && selectedLedTeamId) {
      loadTeamData()
    }
  }, [activeTab, selectedLedTeamId, teamFilterPeriod, teamSelectedDate])

  // Form Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!currentUser) return
    
    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      const monthStr = getMonthStrFromDate(reportDate)
      const latestMtd = await fetchMonthToDateRevenue(currentUser.id, monthStr)

      const reportDataObj = {
        user_id: currentUser.id,
        team_id: null,
        report_date: reportDate,
        positive_leads: parseInt(positiveLeads) || 0,
        revenue_generated: latestMtd, // Auto-filled from monthly_revenues
        expected_revenue: parseFloat(expectedRevenue) || 0
      }
      
      const { error } = await supabase
        .from('dis_reports')
        .upsert(reportDataObj, { onConflict: 'user_id,report_date' })
        
      if (error) throw error

      setMessage({ 
        type: 'success', 
        text: isEditMode ? "DIS report updated successfully!" : "DIS report submitted successfully!" 
      })
      
      // Force trigger reload of existing report state
      setIsEditMode(true)
    } catch (err) {
      setMessage({ type: 'error', text: err.message || "Failed to submit report." })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading DIS Module...</div>

  if (userTeams.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '24px' }}>🔒</div>
        <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Access Restricted</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '500px', margin: '0 auto' }}>
          You must belong to at least one team to submit daily information sheets (DIS). Please contact your administrator.
        </p>
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* Premium Header */}
      <div style={{ marginBottom: 'clamp(24px, 5vw, 40px)' }}>
        <div className="apple-kicker">Operational Sales Sheets</div>
        <h1 className="apple-title-large">Daily Information Sheet (DIS)</h1>
        <p className="apple-lead">
          Submit and audit your daily sales metrics, positive leads, and revenue targets.
        </p>
      </div>

      {/* ===== NAVIGATION TABS (Apple Pill Selector) ===== */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'center' }}>
        <div className="apple-pill-tabs">
          <button
            onClick={() => setActiveTab('submit')}
            className={`apple-pill-tab ${activeTab === 'submit' ? 'active' : ''}`}
          >
            📝 Submit DIS
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`apple-pill-tab ${activeTab === 'history' ? 'active' : ''}`}
          >
            📂 My History
          </button>
          {isTeamLead && (
            <button
              onClick={() => setActiveTab('team')}
              className={`apple-pill-tab ${activeTab === 'team' ? 'active' : ''}`}
            >
              👥 Team Reports
            </button>
          )}
        </div>
      </div>

      {/* ===== TAB CONTENT: SUBMIT FORM ===== */}
      {activeTab === 'submit' && (
        <div className="apple-card" style={{ maxWidth: '650px', margin: '0 auto' }}>
          <h3 className="apple-title-small" style={{ marginBottom: '20px', borderBottom: '1px solid var(--apple-border)', paddingBottom: '12px' }}>
            {isEditMode ? '🔒 View DIS Report' : '📝 Log New DIS Report'}
          </h3>

          {isEditMode && (
            <div style={{
              padding: '14px 18px',
              borderRadius: '12px',
              marginBottom: '24px',
              background: 'rgba(255, 69, 58, 0.08)',
              border: '1px solid rgba(255, 69, 58, 0.25)',
              color: 'var(--apple-accent-red)',
              fontSize: '0.85rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '1.2rem' }}>🔒</span>
              <div>
                <strong>DIS Report Locked:</strong> You have submitted a report for this date. Submissions cannot be edited once locked. Contact your team lead for changes.
              </div>
            </div>
          )}

          {message.text && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '20px',
              background: message.type === 'success' ? 'rgba(48, 213, 200, 0.08)' : 'rgba(255, 69, 58, 0.08)',
              border: `1px solid ${message.type === 'success' ? 'var(--apple-accent-green)' : 'var(--apple-accent-red)'}`,
              color: message.type === 'success' ? 'var(--apple-accent-green)' : 'var(--apple-accent-red)',
              fontSize: '0.88rem',
              fontWeight: '500'
            }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Auto-filled details */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '16px', 
              background: 'rgba(255,255,255,0.01)', 
              padding: '16px', 
              borderRadius: '12px', 
              border: '1px solid var(--apple-border)' 
            }} className="apple-two-col-grid">
              <div>
                <label className="apple-form-label" style={{ marginBottom: '4px' }}>Reporter & Team</label>
                <span style={{ fontWeight: '600', color: '#ffffff', display: 'block', fontSize: '0.95rem' }}>
                  {profile ? `${profile.first_name} ${profile.last_name}` : '...'}
                </span>
                <span className="apple-badge apple-badge-blue" style={{ fontSize: '0.65rem', padding: '1px 6px', marginTop: '4px', textTransform: 'capitalize' }}>
                  {userTeams.map(t => t.name).join(', ') || 'No Assigned Team'}
                </span>
              </div>
              <div>
                <label className="apple-form-label" style={{ marginBottom: '4px' }}>MTD Revenue (All Teams)</label>
                <span style={{ fontWeight: '700', color: 'var(--apple-accent-green)', display: 'block', fontSize: '1.2rem' }}>
                  {loadingMTD ? 'Calculating...' : `$${mtdRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>
                <div style={{ fontSize: '0.65rem', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>
                  Billing Month: {getMonthStrFromDate(reportDate) || 'None'}
                </div>
              </div>
            </div>

            {/* Date Selection */}
            <div>
              <label className="apple-form-label">DIS Report Date</label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
                className="apple-form-control"
              />
            </div>

            {/* Metrics */}
            <div className="apple-two-col-grid">
              <div>
                <label className="apple-form-label">Positive Leads</label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={positiveLeads}
                  onChange={(e) => setPositiveLeads(e.target.value)}
                  required
                  className="apple-form-control"
                  disabled={isEditMode}
                />
              </div>
              <div>
                <label className="apple-form-label">Expected Revenue ($)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={expectedRevenue}
                  onChange={(e) => setExpectedRevenue(e.target.value)}
                  required
                  className="apple-form-control"
                  disabled={isEditMode}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || isEditMode}
              className="apple-btn apple-btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '12px' }}
            >
              {submitting ? 'Submitting...' : isEditMode ? '🔒 Locked (Submitted)' : '🚀 Log DIS Report'}
            </button>
          </form>
        </div>
      )}

      {/* ===== TAB CONTENT: HISTORY LIST ===== */}
      {activeTab === 'history' && (
        <div className="apple-card">
          <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>DIS Submission History</h3>
          {loadingHistory ? (
            <div style={{ color: 'var(--apple-text-secondary)' }}>Loading history...</div>
          ) : history.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="apple-desktop-table-container" style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--apple-border)', borderRadius: '14px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--apple-border)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '16px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                      <th style={{ padding: '16px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team</th>
                      <th style={{ padding: '16px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Positive Leads</th>
                      <th style={{ padding: '16px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Revenue Generated (MTD)</th>
                      <th style={{ padding: '16px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Expected Revenue</th>
                      <th style={{ padding: '16px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(row => (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--apple-border)', fontSize: '0.92rem' }}>
                        <td style={{ padding: '16px 20px', fontWeight: '600', color: '#ffffff' }}>
                          {new Date(row.report_date).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}
                        </td>
                        <td style={{ padding: '16px 20px', textTransform: 'capitalize', color: 'var(--apple-text-secondary)' }}>
                          {row.teams?.name || userTeams.map(t => t.name).join(', ') || 'None'}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '700', color: row.positive_leads > 0 ? 'var(--apple-accent-orange)' : 'var(--apple-text-secondary)' }}>
                          {row.positive_leads}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '700', color: row.revenue_generated > 0 ? 'var(--apple-accent-green)' : 'var(--apple-text-secondary)' }}>
                          ${Number(row.revenue_generated).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '700', color: row.expected_revenue > 0 ? 'var(--apple-accent-blue)' : 'var(--apple-text-secondary)' }}>
                          ${Number(row.expected_revenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              setReportDate(row.report_date)
                              setActiveTab('submit')
                            }}
                            className="apple-btn apple-btn-secondary"
                            style={{ padding: '6px 14px !important', fontSize: '0.8rem', borderRadius: '12px !important' }}
                          >
                            ✏️ Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards List View */}
              <div className="apple-mobile-list-card">
                {history.map(row => (
                  <div key={row.id} className="apple-mobile-list-item" style={{ gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--apple-border)', paddingBottom: '8px' }}>
                      <span style={{ fontWeight: '700', color: '#ffffff', fontSize: '0.95rem' }}>
                        {new Date(row.report_date).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}
                      </span>
                      <span className="apple-badge apple-badge-blue" style={{ fontSize: '0.65rem', padding: '1px 6px', textTransform: 'capitalize' }}>
                        {row.teams?.name || userTeams.map(t => t.name).join(', ') || 'None'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--apple-text-secondary)' }}>Positive Leads:</span>
                        <span style={{ fontWeight: '700', color: 'var(--apple-accent-orange)' }}>{row.positive_leads}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--apple-text-secondary)' }}>MTD Revenue:</span>
                        <span style={{ fontWeight: '700', color: 'var(--apple-accent-green)' }}>${Number(row.revenue_generated).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--apple-text-secondary)' }}>Expected Revenue:</span>
                        <span style={{ fontWeight: '700', color: 'var(--apple-accent-blue)' }}>${Number(row.expected_revenue).toFixed(2)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setReportDate(row.report_date)
                        setActiveTab('submit')
                      }}
                      className="apple-btn apple-btn-secondary"
                      style={{ 
                        width: '100%', 
                        padding: '10px !important', 
                        fontSize: '0.85rem', 
                        marginTop: '4px',
                        borderRadius: '10px !important'
                      }}
                    >
                      ✏️ Edit Report
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.9rem' }}>No past reports submitted.</p>
          )}
        </div>
      )}

      {/* ===== TAB CONTENT: TEAM LEAD VIEW ===== */}
      {activeTab === 'team' && isTeamLead && (
        <div className="apple-pane-layout">
          
          {/* LEFT SIDEBAR: Teams List */}
          <div className="apple-left-pane">
            <div className="apple-kicker" style={{ paddingLeft: '4px', marginBottom: '12px' }}>
              My Teams Ledger
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ledTeams.map(team => {
                const isSelected = selectedLedTeamId === team.id
                const stats = teamMetrics[team.id] || { total: 0, submitted: 0 }
                return (
                  <button
                    key={team.id}
                    onClick={() => setSelectedLedTeamId(team.id)}
                    className="apple-card"
                    style={{
                      padding: '16px 20px !important',
                      background: isSelected ? 'rgba(0, 113, 227, 0.08) !important' : 'var(--apple-card) !important',
                      borderColor: isSelected ? 'var(--apple-accent-blue) !important' : 'var(--apple-border) !important',
                      textAlign: 'left',
                      width: '100%',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <span style={{ fontWeight: '700', fontSize: '1rem', textTransform: 'capitalize', color: '#ffffff' }}>{team.name}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--apple-text-secondary)', fontWeight: '500' }}>
                      {stats.submitted} / {stats.total} submitted today
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* RIGHT SIDEBAR CONTENT: Selected Team Details */}
          <div className="apple-right-pane">
            {selectedLedTeamId ? (() => {
              const currentTeam = ledTeams.find(t => t.id === selectedLedTeamId)
              
              // Aggregates for the selected team
              const teamUserLatestRevenue = {}
              let totalLeads = 0
              let totalExpected = 0
              for (const r of teamSubmissions) {
                totalLeads += Number(r.positive_leads)
                totalExpected += Number(r.expected_revenue)
                if (teamUserLatestRevenue[r.user_id] === undefined) {
                  const monthStr = `${r.report_date.split('-')[0]}-${r.report_date.split('-')[1]}-01`
                  const revRecord = teamRevenues.find(
                    rv => rv.user_id === r.user_id && 
                          rv.team_id === selectedLedTeamId && 
                          rv.revenue_month === monthStr
                  )
                  teamUserLatestRevenue[r.user_id] = revRecord ? Number(revRecord.amount) : 0
                }
              }
              const totalRevenue = Object.values(teamUserLatestRevenue).reduce((acc, val) => acc + val, 0)

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Team Filter Control Panel */}
                  <div className="apple-card" style={{ padding: '20px !important' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                        <h3 className="apple-title-small" style={{ margin: 0, textTransform: 'capitalize' }}>{currentTeam?.name} DIS Ledger</h3>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--apple-text-secondary)', fontSize: '0.85rem' }}>
                          Manage performance reports and audit daily team entries.
                        </p>
                      </div>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                        <div>
                          <label className="apple-form-label" style={{ fontSize: '0.7rem', marginBottom: '4px' }}>Timeframe</label>
                          <div className="apple-pill-tabs" style={{ padding: '2px' }}>
                            {[
                              { value: 'date', label: 'Single Day' },
                              { value: '1week', label: '1 W' },
                              { value: '2weeks', label: '2 W' },
                              { value: '1month', label: '1 M' }
                            ].map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => setTeamFilterPeriod(opt.value)}
                                className={`apple-pill-tab ${teamFilterPeriod === opt.value ? 'active' : ''}`}
                                style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {teamFilterPeriod === 'date' && (
                          <div>
                            <label className="apple-form-label" style={{ fontSize: '0.7rem', marginBottom: '4px' }}>Select Date</label>
                            <input
                              type="date"
                              value={teamSelectedDate}
                              onChange={(e) => setTeamSelectedDate(e.target.value)}
                              max={new Date().toISOString().split('T')[0]}
                              className="apple-form-control"
                              style={{ padding: '6px 12px !important', fontSize: '0.82rem !important', width: '135px', borderRadius: '10px !important' }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Team summary header stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    <div className="apple-card" style={{ padding: '16px 20px !important', background: 'rgba(48, 213, 200, 0.03) !important', border: '1px solid rgba(48, 213, 200, 0.15) !important' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: '500' }}>This Month MTD</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--apple-accent-green)' }}>${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <div className="apple-card" style={{ padding: '16px 20px !important', background: 'rgba(0, 113, 227, 0.03) !important', border: '1px solid rgba(0, 113, 227, 0.15) !important' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: '500' }}>Expected Revenue</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--apple-accent-blue)' }}>${totalExpected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <div className="apple-card" style={{ padding: '16px 20px !important', background: 'rgba(255, 159, 10, 0.03) !important', border: '1px solid rgba(255, 159, 10, 0.15) !important' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: '500' }}>Positive Leads</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--apple-accent-orange)' }}>{totalLeads}</div>
                    </div>
                  </div>

                  {/* Missing reports block */}
                  {teamFilterPeriod === 'date' && (
                    <div className="apple-card" style={{ border: '1px solid rgba(255, 69, 58, 0.15) !important', background: 'rgba(255, 69, 58, 0.02) !important', padding: '20px !important' }}>
                      <h4 style={{ color: 'var(--apple-accent-red)', fontSize: '0.95rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
                        ⚠️ Missing DIS Submissions ({missingTeamSubmissions.length})
                      </h4>
                      {missingTeamSubmissions.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                          {missingTeamSubmissions.map(m => (
                            <div key={m.user_id} style={{ padding: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--apple-border)', borderRadius: '10px' }}>
                              <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '0.85rem' }}>{m.profiles?.first_name} {m.profiles?.last_name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>{m.profiles?.email}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: 'var(--apple-accent-green)', fontStyle: 'italic', margin: 0, fontSize: '0.88rem', fontWeight: '500' }}>🎉 Great! All active team members have logged their daily DIS report.</p>
                      )}
                    </div>
                  )}

                  {/* Submissions grid */}
                  <div>
                    <h4 className="apple-title-small" style={{ marginBottom: '16px' }}>Submitted Team Reports</h4>
                    {loadingTeamData ? (
                      <div style={{ color: 'var(--apple-text-secondary)' }}>Loading submissions...</div>
                    ) : teamSubmissions.length > 0 ? (
                      <div className="dis-grid">
                        {teamSubmissions.map(row => {
                          const monthStr = `${row.report_date.split('-')[0]}-${row.report_date.split('-')[1]}-01`
                          const revRecord = teamRevenues.find(
                            rv => rv.user_id === row.user_id && 
                                  rv.team_id === selectedLedTeamId && 
                                  rv.revenue_month === monthStr
                          )
                          const teamSpecificRevenue = revRecord ? Number(revRecord.amount) : 0

                          return (
                            <div 
                              key={row.id} 
                              className="apple-card" 
                              style={{ 
                                padding: '20px !important', 
                                background: 'rgba(255, 255, 255, 0.015) !important',
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '12px' 
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '1rem' }}>{row.profiles?.first_name} {row.profiles?.last_name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>{row.profiles?.email}</div>
                              </div>

                              {teamFilterPeriod !== 'date' && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--apple-text-secondary)', borderBottom: '1px solid var(--apple-border)', paddingBottom: '8px' }}>
                                  Date: {new Date(row.report_date).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}
                                </div>
                              )}

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--apple-text-secondary)' }}>Positive Leads:</span>
                                  <span style={{ fontWeight: '700', color: 'var(--apple-accent-orange)' }}>{row.positive_leads}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--apple-text-secondary)' }}>MTD Revenue:</span>
                                  <span style={{ fontWeight: '700', color: 'var(--apple-accent-green)' }}>${teamSpecificRevenue.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--apple-text-secondary)' }}>Expected Revenue:</span>
                                  <span style={{ fontWeight: '700', color: 'var(--apple-accent-blue)' }}>${Number(row.expected_revenue).toFixed(2)}</span>
                                </div>
                              </div>

                              <div style={{ borderTop: '1px solid var(--apple-border)', marginTop: 'auto', paddingTop: '12px' }}>
                                <button
                                  onClick={() => handleOpenEdit(row)}
                                  className="apple-btn apple-btn-secondary"
                                  style={{ 
                                    padding: '6px 14px !important', 
                                    fontSize: '0.8rem', 
                                    width: '100%', 
                                    borderRadius: '10px !important' 
                                  }}
                                >
                                  ✏️ Edit Report
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.9rem' }}>No reports submitted for the selected timeframe.</p>
                    )}
                  </div>
                </div>
              )
            })() : (
              <div className="apple-card" style={{ color: 'var(--apple-text-secondary)', textAlign: 'center', padding: '40px' }}>
                Select a team from the left to view reports.
              </div>
            )}
          </div>

        </div>
      )}

      {/* EDIT MODAL FOR TEAM LEAD (Apple Overlay Sheet) */}
      {editingReport && (
        <div className="apple-modal-overlay" onClick={() => setEditingReport(null)}>
          <div className="apple-modal-card" onClick={(e) => e.stopPropagation()}>
            
            <button 
              onClick={() => setEditingReport(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}
            >
              &times;
            </button>

            <h3 className="apple-title-small" style={{ marginBottom: '16px', borderBottom: '1px solid var(--apple-border)', paddingBottom: '12px' }}>
              ✏️ Override DIS Report
            </h3>

            {editError && (
              <div style={{ padding: '10px', background: 'rgba(255, 69, 58, 0.1)', border: '1px solid var(--apple-accent-red)', color: 'var(--apple-accent-red)', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
                {editError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px', background: 'rgba(255,255,255,0.01)', padding: '14px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
              <span className="apple-form-label" style={{ marginBottom: '2px' }}>Team Member</span>
              <span style={{ fontWeight: '700', color: '#ffffff', fontSize: '1rem' }}>
                {editingReport.profiles?.first_name} {editingReport.profiles?.last_name}
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--apple-text-secondary)', fontWeight: '500' }}>
                Report Day: {new Date(editingReport.report_date).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}
              </span>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label className="apple-form-label">Positive Leads</label>
                <input
                  type="number"
                  min="0"
                  value={editLeads}
                  onChange={(e) => setEditLeads(e.target.value)}
                  required
                  className="apple-form-control"
                />
              </div>
              <div>
                <label className="apple-form-label">Expected Revenue ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editExpected}
                  onChange={(e) => setEditExpected(e.target.value)}
                  required
                  className="apple-form-control"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="apple-btn apple-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="apple-btn apple-btn-primary"
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
