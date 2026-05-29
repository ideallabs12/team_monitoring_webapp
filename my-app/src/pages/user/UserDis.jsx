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
    <div>
      <div className="dashboard-header" style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Daily Information Sheet (DIS)</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          Submit and track your daily sales metrics, positive leads, and revenue.
        </p>
      </div>

      {/* ===== NAVIGATION TABS ===== */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '32px', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('submit')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'submit' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'submit' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'submit' ? '#fff' : 'var(--text-secondary)',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all 0.2s'
          }}
        >
          📝 Submit DIS
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'history' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'history' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'history' ? '#fff' : 'var(--text-secondary)',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all 0.2s'
          }}
        >
          📂 My History
        </button>
        {isTeamLead && (
          <button
            onClick={() => setActiveTab('team')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'team' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'team' ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === 'team' ? '#fff' : 'var(--text-secondary)',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'all 0.2s'
            }}
          >
            👥 Team Reports
          </button>
        )}
      </div>

      {/* ===== TAB CONTENT: SUBMIT FORM ===== */}
      {activeTab === 'submit' && (
        <div className="card" style={{ maxWidth: '650px', margin: '0 auto' }}>
          <h3 style={{ marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
            {isEditMode ? '🔒 View DIS Report' : '📝 New DIS Report'}
          </h3>

          {isEditMode && (
            <div style={{
              padding: '14px 18px',
              borderRadius: '8px',
              marginBottom: '24px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.9rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '1.2rem' }}>🔒</span>
              <div>
                <strong>DIS Report Locked:</strong> You have already submitted a report for this date. Submissions cannot be edited once saved. If changes are necessary, please contact your team lead.
              </div>
            </div>
          )}

          {message.text && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              background: message.type === 'success' ? 'rgba(74,222,128,0.1)' : message.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
              border: `1px solid ${message.type === 'success' ? '#4ade80' : message.type === 'error' ? '#ef4444' : '#3b82f6'}`,
              color: message.type === 'success' ? '#4ade80' : message.type === 'error' ? '#ef4444' : '#60a5fa',
              fontSize: '0.9rem'
            }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Auto-filled details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Reporter Name & Teams</label>
                <span style={{ fontWeight: '600', color: '#fff', display: 'block' }}>{profile ? `${profile.first_name} ${profile.last_name}` : '...'}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                  {userTeams.map(t => t.name).join(', ') || 'No Team'}
                </span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Month-to-Date Revenue (All Teams)</label>
                <span style={{ fontWeight: '600', color: '#4ade80', display: 'block', fontSize: '1.25rem' }}>
                  {loadingMTD ? 'Calculating...' : `$${mtdRevenue.toFixed(2)}`}
                </span>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Month: {getMonthStrFromDate(reportDate) || 'None'}
                </div>
              </div>
            </div>

            {/* Date Selection */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>DIS Date</label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
                className="form-control"
              />
            </div>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Positive Leads</label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={positiveLeads}
                  onChange={(e) => setPositiveLeads(e.target.value)}
                  required
                  className="form-control"
                  disabled={isEditMode}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Expected Revenue ($)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={expectedRevenue}
                  onChange={(e) => setExpectedRevenue(e.target.value)}
                  required
                  className="form-control"
                  disabled={isEditMode}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || isEditMode}
              className="btn btn-primary"
              style={{ padding: '12px', fontSize: '1rem', marginTop: '12px' }}
            >
              {submitting ? 'Submitting...' : isEditMode ? '🔒 Locked (Submitted)' : '🚀 Submit DIS Report'}
            </button>
          </form>
        </div>
      )}

      {/* ===== TAB CONTENT: HISTORY LIST ===== */}
      {activeTab === 'history' && (
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>DIS Submission History</h3>
          {loadingHistory ? (
            <div style={{ color: 'var(--text-secondary)' }}>Loading history...</div>
          ) : history.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <th style={{ padding: '12px' }}>Date</th>
                    <th style={{ padding: '12px' }}>Team</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Positive Leads</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Revenue Generated (MTD)</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Expected Revenue</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(row => (
                    <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.95rem' }}>
                      <td style={{ padding: '14px 12px', fontWeight: '600', color: '#fff' }}>
                        {new Date(row.report_date).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}
                      </td>
                      <td style={{ padding: '14px 12px', textTransform: 'capitalize' }}>
                        {row.teams?.name || userTeams.map(t => t.name).join(', ') || 'None'}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 'bold', color: row.positive_leads > 0 ? '#fbbf24' : 'var(--text-secondary)' }}>
                        {row.positive_leads}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 'bold', color: row.revenue_generated > 0 ? '#4ade80' : 'var(--text-secondary)' }}>
                        ${Number(row.revenue_generated).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 'bold', color: row.expected_revenue > 0 ? '#60a5fa' : 'var(--text-secondary)' }}>
                        ${Number(row.expected_revenue).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setReportDate(row.report_date)
                            setActiveTab('submit')
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.8rem', minWidth: 'auto' }}
                        >
                          ✏️ Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>No past reports submitted.</p>
          )}
        </div>
      )}

      {/* ===== TAB CONTENT: TEAM LEAD VIEW ===== */}
      {activeTab === 'team' && isTeamLead && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Header & Filter Controls */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Team DIS Reports Dashboard</h3>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Manage performance reports and verify daily activity.
                </p>
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Time Period</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                      { value: 'date', label: 'Single Date' },
                      { value: '1week', label: '1 Week' },
                      { value: '2weeks', label: '2 Weeks' },
                      { value: '1month', label: '1 Month' }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setTeamFilterPeriod(opt.value)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: teamFilterPeriod === opt.value ? '1px solid #3b82f6' : '1px solid var(--border-color)',
                          background: teamFilterPeriod === opt.value ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                          color: teamFilterPeriod === opt.value ? '#3b82f6' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          transition: 'all 0.2s'
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {teamFilterPeriod === 'date' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Select Date</label>
                    <input
                      type="date"
                      value={teamSelectedDate}
                      onChange={(e) => setTeamSelectedDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="form-control"
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TWO COLUMN CONTENT AREA */}
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            
            {/* LEFT SIDEBAR: Teams List */}
            <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 0, flexShrink: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', paddingLeft: '8px' }}>
                My Teams
              </div>
              {ledTeams.map(team => {
                const isSelected = selectedLedTeamId === team.id
                const stats = teamMetrics[team.id] || { total: 0, submitted: 0 }
                return (
                  <button
                    key={team.id}
                    onClick={() => setSelectedLedTeamId(team.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '14px 18px',
                      borderRadius: '10px',
                      border: isSelected ? '1px solid #3b82f6' : '1px solid var(--border-color)',
                      background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255,255,255,0.02)',
                      color: '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      width: '100%',
                      boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.1)' : 'none'
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
                      {stats.submitted} / {stats.total} submitted today
                    </span>
                  </button>
                )
              })}
            </div>

            {/* RIGHT SIDEBAR CONTENT: Selected Team Details */}
            <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {selectedLedTeamId ? (() => {
                const currentTeam = ledTeams.find(t => t.id === selectedLedTeamId)
                
                // Aggregates for the selected team (using team-specific dynamic revenues)
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
                  <>
                    {/* Team summary header stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                      <div className="card" style={{ padding: '16px 20px', background: 'rgba(74, 222, 128, 0.03)', border: '1px solid rgba(74, 222, 128, 0.15)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>This Month ({currentTeam?.name})</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4ade80' }}>${totalRevenue.toFixed(2)}</div>
                      </div>
                      <div className="card" style={{ padding: '16px 20px', background: 'rgba(96, 165, 250, 0.03)', border: '1px solid rgba(96, 165, 250, 0.15)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>This Expected Revenue ({currentTeam?.name})</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#60a5fa' }}>${totalExpected.toFixed(2)}</div>
                      </div>
                      <div className="card" style={{ padding: '16px 20px', background: 'rgba(251, 191, 36, 0.03)', border: '1px solid rgba(251, 191, 36, 0.15)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>This Positive Leads ({currentTeam?.name})</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fbbf24' }}>{totalLeads}</div>
                      </div>
                    </div>

                    {/* Missing reports block */}
                    {teamFilterPeriod === 'date' && (
                      <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.15)', background: 'rgba(239, 68, 68, 0.02)', padding: '20px' }}>
                        <h4 style={{ color: '#ef4444', fontSize: '1.05rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
                          ⚠️ Missing DIS Submissions ({missingTeamSubmissions.length})
                        </h4>
                        {missingTeamSubmissions.length > 0 ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                            {missingTeamSubmissions.map(m => (
                              <div key={m.user_id} style={{ padding: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                                <div style={{ fontWeight: '500', color: '#fff', fontSize: '0.85rem' }}>{m.profiles?.first_name} {m.profiles?.last_name}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{m.profiles?.email}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: '#4ade80', fontStyle: 'italic', margin: 0, fontSize: '0.9rem' }}>🎉 All team members have submitted their reports!</p>
                        )}
                      </div>
                    )}

                    {/* Submissions grid (3-in-a-row) */}
                    <div>
                      <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#fff' }}>Submitted Reports</h4>
                      {loadingTeamData ? (
                        <div style={{ color: 'var(--text-secondary)' }}>Loading submissions...</div>
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
                              <div key={row.id} className="card" style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'transform 0.2s', position: 'relative' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}>
                                <div>
                                  <div style={{ fontWeight: '600', color: '#fff', fontSize: '1.05rem' }}>{row.profiles?.first_name} {row.profiles?.last_name}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.profiles?.email}</div>
                                </div>

                                {teamFilterPeriod !== 'date' && (
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                                    Date: {new Date(row.report_date).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}
                                  </div>
                                )}

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

                              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 'auto', paddingTop: '12px' }}>
                                <button
                                  onClick={() => handleOpenEdit(row)}
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 14px', fontSize: '0.8rem', width: '100%', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', color: '#fff', cursor: 'pointer' }}
                                >
                                  ✏️ Edit Report
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      ) : (
                        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.95rem' }}>No reports submitted for the selected timeframe.</p>
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
      )}

      {/* EDIT MODAL FOR TEAM LEAD */}
      {editingReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => setEditingReport(null)}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            
            <button 
              onClick={() => setEditingReport(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                color: '#94a3b8',
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

            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
              ✏️ Edit DIS Report (Team Lead)
            </h3>

            {editError && (
              <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', fontSize: '0.85rem' }}>
                {editError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Team Member</span>
              <span style={{ fontWeight: '600', color: '#fff' }}>
                {editingReport.profiles?.first_name} {editingReport.profiles?.last_name}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Report Date: {new Date(editingReport.report_date).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}
              </span>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Positive Leads</label>
                <input
                  type="number"
                  min="0"
                  value={editLeads}
                  onChange={(e) => setEditLeads(e.target.value)}
                  required
                  className="form-control"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Expected Revenue ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editExpected}
                  onChange={(e) => setEditExpected(e.target.value)}
                  required
                  className="form-control"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="btn btn-secondary"
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="btn btn-primary"
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
