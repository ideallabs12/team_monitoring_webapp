import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'

let globalDisCache = {
  userId: null,
  profile: null,
  userTeams: []
}

export default function UserDis() {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(globalDisCache.userId ? false : true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [profile, setProfile] = useState(globalDisCache.profile)
  const [userTeams, setUserTeams] = useState(globalDisCache.userTeams || [])
  const [selectedTeamId, setSelectedTeamId] = useState('')


  // Form states
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [positiveLeads, setPositiveLeads] = useState('')
  const [expectedRevenue, setExpectedRevenue] = useState('')
  const [mtdRevenue, setMtdRevenue] = useState(0)
  const [loadingMTD, setLoadingMTD] = useState(false)
  const [existingReportId, setExistingReportId] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // History tab states
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Navigation tab
  const [activeTab, setActiveTab] = useState('submit') // 'submit', 'history', 'team'



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
          
          // Use cached profile if we have it to avoid flash
          if (globalDisCache.userId === user.id && globalDisCache.profile) {
            setProfile(globalDisCache.profile)
            if (globalDisCache.profile.has_dis_reporting === false) {
              setAccessDenied(true)
              setLoading(false)
              return
            }
          }

          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()
          if (prof) {
            setProfile(prof)
            globalDisCache.userId = user.id
            globalDisCache.profile = prof

            if (prof.has_dis_reporting === false) {
              setAccessDenied(true)
              setLoading(false)
              return
            }
          }
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
      const { data: profileData } = await supabase
        .from('profiles')
        .select('team_id, secondary_team_ids, platform_role')
        .eq('id', currentUser.id)
        .single()
      
      const teamIdsToFetch = []
      if (profileData?.team_id) teamIdsToFetch.push(profileData.team_id)
      if (profileData?.secondary_team_ids) {
        teamIdsToFetch.push(...profileData.secondary_team_ids)
      }

      if (teamIdsToFetch.length > 0) {
        const { data: teamsData } = await supabase
          .from('teams')
          .select('*')
          .in('id', teamIdsToFetch)
        
        if (teamsData && teamsData.length > 0) {
          const loadedTeams = teamsData.map(t => ({
            id: t.id,
            name: t.name,
            role: profileData.platform_role === 'teamlead' ? 'lead' : 'member'
          }))
          // Sort primary team first
          loadedTeams.sort((a, b) => a.id === profileData.team_id ? -1 : 1)
          
          setUserTeams(loadedTeams)
          globalDisCache.userTeams = loadedTeams
          if (!selectedTeamId) {
            setSelectedTeamId(loadedTeams[0].id)
          }
        }
      }
    }
    fetchTeams()
  }, [currentUser])



  // Load existing report for form on date & team change
  useEffect(() => {
    if (!currentUser || !reportDate || !selectedTeamId) return
    async function loadExistingReport() {
      const { data, error } = await supabase
        .from('dis_reports')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('team_id', selectedTeamId)
        .eq('report_date', reportDate)
        .maybeSingle()
      
      if (data) {
        setPositiveLeads(String(data.positive_leads))
        setExpectedRevenue(String(data.expected_revenue))
        setExistingReportId(data.id)
        setIsEditMode(true)
        setMessage({ type: '', text: '' })
      } else {
        setPositiveLeads('')
        setExpectedRevenue('')
        setExistingReportId(null)
        setIsEditMode(false)
        setMessage({ type: '', text: '' })
      }
    }
    loadExistingReport()
  }, [currentUser, reportDate, selectedTeamId])

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
        team_id: selectedTeamId,
        report_date: reportDate,
        positive_leads: parseInt(positiveLeads) || 0,
        revenue_generated: latestMtd, // Auto-filled from monthly_revenues
        expected_revenue: parseFloat(expectedRevenue) || 0
      }
      
      if (isEditMode && existingReportId) {
        const { error } = await supabase
          .from('dis_reports')
          .update(reportDataObj)
          .eq('id', existingReportId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('dis_reports')
          .insert([reportDataObj])
        if (error) throw error
      }

      setMessage({ 
        type: 'success', 
        text: isEditMode ? "DIS report updated successfully!" : "DIS report submitted successfully!" 
      })
      
      // Load history immediately to update existing IDs if needed
      if (!isEditMode) {
        const { data } = await supabase.from('dis_reports').select('id').eq('user_id', currentUser.id).eq('team_id', selectedTeamId).eq('report_date', reportDate).maybeSingle()
        if (data) {
          setExistingReportId(data.id)
          setIsEditMode(true)
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || "Failed to submit report." })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading DIS Module...</div>

  if (accessDenied) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '24px' }}>🔒</div>
        <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Access Prohibited</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '500px', margin: '0 auto' }}>
          You do not have permission to access the DIS Reporting page. Please contact your administrator.
        </p>
      </div>
    )
  }

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
              background: 'rgba(0, 113, 227, 0.08)',
              border: '1px solid rgba(0, 113, 227, 0.25)',
              color: 'var(--apple-accent-blue)',
              fontSize: '0.85rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '1.2rem' }}>📝</span>
              <div>
                <strong>Editing Report:</strong> You have already submitted a report for this date. You can update your numbers below.
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

          {userTeams.length > 1 && (
            <div style={{ marginBottom: '24px', display: 'flex', gap: '10px' }}>
              {userTeams.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTeamId(t.id)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: selectedTeamId === t.id ? 'var(--apple-accent-blue)' : 'var(--apple-border)',
                    background: selectedTeamId === t.id ? 'rgba(0, 113, 227, 0.1)' : 'rgba(255,255,255,0.02)',
                    color: selectedTeamId === t.id ? '#fff' : 'var(--apple-text-secondary)',
                    fontWeight: selectedTeamId === t.id ? '600' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textTransform: 'capitalize'
                  }}
                >
                  {t.name}
                </button>
              ))}
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
                  {userTeams.find(t => t.id === selectedTeamId)?.name || 'No Assigned Team'}
                </span>
              </div>
              <div>
                <label className="apple-form-label" style={{ marginBottom: '4px' }}>MTD Revenue</label>
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
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="apple-btn apple-btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '12px' }}
            >
              {submitting ? 'Submitting...' : isEditMode ? '🔄 Update DIS Report' : '🚀 Log DIS Report'}
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
    </div>
  )
}
