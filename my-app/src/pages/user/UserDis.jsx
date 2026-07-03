import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { X } from 'lucide-react'
import { MONTH_NAMES } from '../../utils/revenueUtils'

let globalDisCache = {
  userId: null,
  profile: null,
  primaryTeam: null,
  secondaryTeam: null,
}

const getLocalDateString = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

// ─── Reusable DIS Form Component ─────────────────────────────────────────────
function DisForm({ currentUser, team, teamLabel, accentColor = 'var(--apple-accent-blue)', systemSettings, holidays = [] }) {
  const [reportDate, setReportDate] = useState(getLocalDateString())
  const [positiveLeads, setPositiveLeads] = useState('')
  const [expectedRevenue, setExpectedRevenue] = useState('')
  const [mtdRevenue, setMtdRevenue] = useState(0)
  const [loadingMTD, setLoadingMTD] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const getMonthStrFromDate = (dateStr) => {
    if (!dateStr) return ''
    const [year, month] = dateStr.split('-')
    return `${year}-${month}-01`
  }

  const fetchMonthToDateRevenue = async (monthStr) => {
    if (!currentUser || !monthStr || !team?.id) return 0
    const { data, error } = await supabase
      .from('monthly_revenues')
      .select('amount')
      .eq('user_id', currentUser.id)
      .eq('team_id', team.id)
      .eq('revenue_month', monthStr)
    if (error) { console.error('MTD fetch error:', error); return 0 }
    return (data || []).reduce((sum, item) => sum + Number(item.amount), 0)
  }

  // Load existing report when date changes
  useEffect(() => {
    if (!currentUser || !reportDate || !team?.id) return
    async function loadExistingReport() {
      const { data } = await supabase
        .from('dis_reports')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('team_id', team.id)
        .eq('report_date', reportDate)
        .maybeSingle()

      if (data) {
        setPositiveLeads(String(data.positive_leads))
        setExpectedRevenue(String(data.expected_revenue))
        setIsEditMode(true)
      } else {
        setPositiveLeads('')
        setExpectedRevenue('')
        setIsEditMode(false)
      }
      setMessage({ type: '', text: '' })
    }
    loadExistingReport()
  }, [currentUser, reportDate, team?.id])

  // Load MTD revenue on date change
  useEffect(() => {
    if (!currentUser || !reportDate || !team?.id) return
    async function loadMTD() {
      setLoadingMTD(true)
      try {
        const monthStr = getMonthStrFromDate(reportDate)
        const amt = await fetchMonthToDateRevenue(monthStr)
        setMtdRevenue(amt)
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingMTD(false)
      }
    }
    loadMTD()
  }, [currentUser, reportDate, team?.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!currentUser || !team?.id) return
    setSubmitting(true)
    setMessage({ type: '', text: '' })
    try {
      const monthStr = getMonthStrFromDate(reportDate)
      const latestMtd = await fetchMonthToDateRevenue(monthStr)
      const reportDataObj = {
        user_id: currentUser.id,
        team_id: team.id,
        report_date: reportDate,
        positive_leads: parseInt(positiveLeads) || 0,
        revenue_generated: latestMtd,
        expected_revenue: parseFloat(expectedRevenue) || 0
      }
      const { error } = await supabase
        .from('dis_reports')
        .upsert(reportDataObj, { onConflict: 'user_id,team_id,report_date' })
      if (error) throw error
      setMessage({
        type: 'success',
        text: isEditMode ? 'DIS report updated successfully!' : 'DIS report submitted successfully!'
      })
      setIsEditMode(true)
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to submit report.' })
    } finally {
      setSubmitting(false)
    }
  }

  const todayDateStr = getLocalDateString()
  const isLocked = systemSettings?.dis_locked || false
  const allowPast = systemSettings?.dis_allow_past || false
  const isHoliday = holidays.includes(reportDate)
  const isWeekend = new Date(reportDate).getDay() === 0 // Block Sundays by default
  const isInvalidDate = !allowPast && reportDate !== todayDateStr
  const isSubmitDisabled = submitting || isLocked || isHoliday || isWeekend || isInvalidDate

  return (
    <div className="apple-card" style={{ borderTop: `3px solid ${accentColor}` }}>
      {/* Form header with team label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--apple-border)' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: `${accentColor}22`, border: `1px solid ${accentColor}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem'
        }}>
          📝
        </div>
        <div>
          <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--apple-text-primary)' }}>
            {isEditMode ? 'View / Edit DIS Report' : 'Log New DIS Report'}
          </div>
          <div style={{ fontSize: '0.75rem', color: accentColor, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {teamLabel}
          </div>
        </div>
      </div>

      {isEditMode && (
        <div style={{
          padding: '12px 16px', borderRadius: '10px', marginBottom: '20px',
          background: 'rgba(0,113,227,0.08)', border: '1px solid rgba(0,113,227,0.25)',
          color: 'var(--apple-accent-blue)', fontSize: '0.85rem', fontWeight: '500',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <span style={{ fontSize: '1.1rem' }}>📝</span>
          <div><strong>Editing Report:</strong> You have already submitted a report for this date. You can update your numbers below.</div>
        </div>
      )}

      {message.text && (
        <div style={{
          padding: '12px 16px', borderRadius: '10px', marginBottom: '20px',
          background: message.type === 'success' ? 'rgba(48,213,200,0.08)' : 'rgba(255,69,58,0.08)',
          border: `1px solid ${message.type === 'success' ? 'var(--apple-accent-green)' : 'var(--apple-accent-red)'}`,
          color: message.type === 'success' ? 'var(--apple-accent-green)' : 'var(--apple-accent-red)',
          fontSize: '0.88rem', fontWeight: '500'
        }}>
          {message.text}
        </div>
      )}

      {isLocked && (
        <div style={{
          padding: '12px 16px', borderRadius: '10px', marginBottom: '20px',
          background: 'rgba(255,69,58,0.08)', border: '1px solid var(--apple-accent-red)',
          color: 'var(--apple-accent-red)', fontSize: '0.88rem', fontWeight: '500'
        }}>
          🔒 DIS submissions are currently locked by the administrator.
        </div>
      )}

      {(isHoliday || isWeekend) && !isLocked && (
        <div style={{
          padding: '12px 16px', borderRadius: '10px', marginBottom: '20px',
          background: 'rgba(255,159,10,0.08)', border: '1px solid var(--apple-accent-orange)',
          color: 'var(--apple-accent-orange)', fontSize: '0.88rem', fontWeight: '500'
        }}>
          🌴 {isWeekend ? 'This date is a Sunday (default weekend).' : 'This date is a declared holiday.'} DIS submission is not required.
        </div>
      )}

      {isInvalidDate && !isLocked && !isHoliday && !isWeekend && (
        <div style={{
          padding: '12px 16px', borderRadius: '10px', marginBottom: '20px',
          background: 'rgba(255,69,58,0.08)', border: '1px solid var(--apple-accent-red)',
          color: 'var(--apple-accent-red)', fontSize: '0.88rem', fontWeight: '500'
        }}>
          ⏳ Submitting reports for past dates is currently disabled.
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Auto-filled info row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
          background: 'rgba(255,255,255,0.01)', padding: '16px', borderRadius: '12px',
          border: '1px solid var(--apple-border)'
        }} className="apple-two-col-grid">
          <div>
            <label className="apple-form-label" style={{ marginBottom: '4px' }}>Team</label>
            <span style={{ fontWeight: '600', color: accentColor, display: 'block', fontSize: '0.95rem' }}>
              {team?.name || '—'}
            </span>
          </div>
          <div>
            <label className="apple-form-label" style={{ marginBottom: '4px' }}>MTD Revenue (This Team)</label>
            <span style={{ fontWeight: '700', color: 'var(--apple-accent-green)', display: 'block', fontSize: '1.2rem' }}>
              {loadingMTD ? 'Calculating...' : `$${mtdRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
            <div style={{ fontSize: '0.65rem', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>
              Billing Month: {getMonthStrFromDate(reportDate) || 'None'}
            </div>
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="apple-form-label">DIS Report Date</label>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            onClick={(e) => { try { e.target.showPicker() } catch (_) {} }}
            max={todayDateStr}
            min={!allowPast ? todayDateStr : undefined}
            required
            className="apple-form-control"
            disabled={isLocked}
          />
        </div>

        {/* Metrics */}
        <div className="apple-two-col-grid">
          <div>
            <label className="apple-form-label">Positive Leads</label>
            <input
              type="number" placeholder="0" min="0"
              value={positiveLeads}
              onChange={(e) => setPositiveLeads(e.target.value)}
              required className="apple-form-control"
              disabled={isLocked || isHoliday || isWeekend || isInvalidDate}
            />
          </div>
          <div>
            <label className="apple-form-label">Expected Revenue ($)</label>
            <input
              type="number" placeholder="0.00" min="0" step="0.01"
              value={expectedRevenue}
              onChange={(e) => setExpectedRevenue(e.target.value)}
              required className="apple-form-control"
              disabled={isLocked || isHoliday || isWeekend || isInvalidDate}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="apple-btn apple-btn-primary"
          style={{ width: '100%', padding: '14px', fontSize: '1rem', background: isSubmitDisabled ? 'var(--apple-border)' : accentColor }}
        >
          {submitting ? 'Submitting...' : isEditMode ? '🔄 Update DIS Report' : '🚀 Log DIS Report'}
        </button>
      </form>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UserDis() {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(globalDisCache.userId ? false : true)
  const [profile, setProfile] = useState(globalDisCache.profile)
  const [primaryTeam, setPrimaryTeam] = useState(globalDisCache.primaryTeam)
  const [secondaryTeam, setSecondaryTeam] = useState(globalDisCache.secondaryTeam)

  // History tab states
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyMessage, setHistoryMessage] = useState({ type: '', text: '' })
  const [activeTab, setActiveTab] = useState('submit')

  // Data Filters
  const [filterYear, setFilterYear] = useState('All')
  const [filterMonth, setFilterMonth] = useState('All')
  
  const [systemSettings, setSystemSettings] = useState(null)
  const [holidays, setHolidays] = useState([])

  const availableYears = useMemo(() => {
    const years = [...new Set(history.map(r => new Date(r.report_date).getFullYear()))]
    return years.sort((a, b) => b - a)
  }, [history])

  const filteredHistory = useMemo(() => {
    let list = [...history]
    if (filterYear !== 'All') {
      list = list.filter(r => new Date(r.report_date).getFullYear() === Number(filterYear))
    }
    if (filterMonth !== 'All') {
      list = list.filter(r => new Date(r.report_date).getMonth() === Number(filterMonth))
    }
    return list
  }, [history, filterYear, filterMonth])

  const hasActiveFilters = filterYear !== 'All' || filterMonth !== 'All'

  const clearFilters = () => {
    setFilterYear('All')
    setFilterMonth('All')
  }

  // Load User & Profile
  useEffect(() => {
    async function getUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUser(user)

          if (globalDisCache.userId === user.id && globalDisCache.profile) {
            setProfile(globalDisCache.profile)
            setPrimaryTeam(globalDisCache.primaryTeam)
            setSecondaryTeam(globalDisCache.secondaryTeam)
          }

          const { data: prof } = await supabase
            .from('profiles')
            .select('*, team:team_id(id, name), secondary:secondary_team_id(id, name)')
            .eq('id', user.id)
            .maybeSingle()

          if (prof) {
            setProfile(prof)
            const pt = prof.team || null
            const st = prof.secondary || null
            setPrimaryTeam(pt)
            setSecondaryTeam(st)
            globalDisCache.userId = user.id
            globalDisCache.profile = prof
            globalDisCache.primaryTeam = pt
            globalDisCache.secondaryTeam = st
          }
        }
      } catch (err) {
        console.error('Error fetching user data:', err)
      } finally {
        setLoading(false)
      }
    }
    getUserData()

    async function fetchSystemSettings() {
      const [settingsRes, holidaysRes] = await Promise.all([
        supabase.from('system_settings').select('dis_locked, dis_allow_past').eq('id', 1).single(),
        supabase.from('holidays').select('holiday_date')
      ])
      if (settingsRes.data) setSystemSettings(settingsRes.data)
      if (holidaysRes.data) setHolidays(holidaysRes.data.map(h => h.holiday_date))
    }
    fetchSystemSettings()
  }, [])

  // Load History
  const fetchHistory = async () => {
    if (!currentUser) return
    setLoadingHistory(true)
    const { data } = await supabase
      .from('dis_reports')
      .select(`*, teams(name)`)
      .eq('user_id', currentUser.id)
      .order('report_date', { ascending: false })
    if (data) setHistory(data)
    setLoadingHistory(false)
  }

  useEffect(() => {
    setHistoryMessage({ type: '', text: '' })
    if (activeTab === 'history') fetchHistory()
  }, [activeTab])

  const handleDeleteReport = async (reportId, reportDateVal) => {
    if (!window.confirm('Are you sure you want to delete this DIS report? This action cannot be undone.')) return
    setHistoryMessage({ type: '', text: '' })
    try {
      const { error } = await supabase
        .from('dis_reports')
        .delete()
        .eq('id', reportId)
        .eq('user_id', currentUser.id)
      if (error) throw error
      setHistoryMessage({ type: 'success', text: 'DIS report deleted successfully!' })
      await fetchHistory()
    } catch (err) {
      setHistoryMessage({ type: 'error', text: err.message || 'Failed to delete report.' })
    }
  }

  if (loading) return <div style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading DIS Module...</div>

  if (!primaryTeam) {
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
      {/* Header */}
      <div style={{ marginBottom: 'clamp(24px, 5vw, 40px)' }}>
        <div className="apple-kicker">Operational Sales Sheets</div>
        <h1 className="apple-title-large">My Daily Information Sheet</h1>
        <p className="apple-lead">
          Submit and audit your daily sales metrics, positive leads, and revenue targets.
          {secondaryTeam && <span style={{ color: 'var(--apple-accent-green)', fontWeight: '600' }}> You are assigned to 2 teams — submit for both below.</span>}
        </p>
      </div>

      {/* Navigation Tabs */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'center' }}>
        <div className="apple-pill-tabs">
          <button onClick={() => setActiveTab('submit')} className={`apple-pill-tab ${activeTab === 'submit' ? 'active' : ''}`}>
            📝 Submit DIS
          </button>
          <button onClick={() => setActiveTab('history')} className={`apple-pill-tab ${activeTab === 'history' ? 'active' : ''}`}>
            📂 My History
          </button>
        </div>
      </div>

      {/* ===== TAB: SUBMIT ===== */}
      {activeTab === 'submit' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: secondaryTeam ? 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))' : '1fr',
          gap: '28px',
          maxWidth: secondaryTeam ? '100%' : '650px',
          margin: '0 auto'
        }}>
          <DisForm
            currentUser={currentUser}
            team={primaryTeam}
            teamLabel={`Primary Team · ${primaryTeam?.name}`}
            accentColor="var(--apple-accent-blue)"
            systemSettings={systemSettings}
            holidays={holidays}
          />
          {secondaryTeam && (
            <DisForm
              currentUser={currentUser}
              team={secondaryTeam}
              teamLabel={`Secondary Team · ${secondaryTeam?.name}`}
              accentColor="#a78bfa"
              systemSettings={systemSettings}
              holidays={holidays}
            />
          )}
        </div>
      )}

      {/* ===== TAB: HISTORY ===== */}
      {activeTab === 'history' && (
        <div className="apple-card">
          <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>DIS Submission History</h3>
          
          {historyMessage.text && (
            <div style={{
              padding: '12px 16px', borderRadius: '10px', marginBottom: '20px',
              background: historyMessage.type === 'success' ? 'rgba(48,213,200,0.08)' : 'rgba(255,69,58,0.08)',
              border: `1px solid ${historyMessage.type === 'success' ? 'var(--apple-accent-green)' : 'var(--apple-accent-red)'}`,
              color: historyMessage.type === 'success' ? 'var(--apple-accent-green)' : 'var(--apple-accent-red)',
              fontSize: '0.88rem', fontWeight: '500'
            }}>
              {historyMessage.text}
            </div>
          )}

          {/* ===== DATA FILTERS ===== */}
          <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--apple-border)' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.68rem', color: 'var(--apple-text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Year</label>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="apple-input" style={{ minWidth: '100px', padding: '8px 32px 8px 12px', fontSize: '0.85rem' }}>
                  <option value="All">All</option>
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.68rem', color: 'var(--apple-text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Month</label>
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="apple-input" style={{ minWidth: '120px', padding: '8px 32px 8px 12px', fontSize: '0.85rem' }}>
                  <option value="All">All Months</option>
                  {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', borderRadius: '10px',
                    border: '1px solid rgba(255,69,58,0.3)',
                    background: 'rgba(255,69,58,0.08)',
                    color: 'var(--apple-accent-red)',
                    cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600',
                    transition: 'all 0.2s', whiteSpace: 'nowrap', height: '36px'
                  }}
                >
                  <X size={14} /> Clear Filters
                </button>
              )}
            </div>

            {/* Active filter chips */}
            {hasActiveFilters && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '14px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', alignSelf: 'center', marginRight: '4px' }}>Active:</span>
                {filterYear !== 'All' && <Chip label={filterYear} onRemove={() => setFilterYear('All')} />}
                {filterMonth !== 'All' && <Chip label={MONTH_NAMES[Number(filterMonth)]} onRemove={() => setFilterMonth('All')} />}
              </div>
            )}
          </div>

          {loadingHistory ? (
            <div style={{ color: 'var(--apple-text-secondary)' }}>Loading history...</div>
          ) : history.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="apple-desktop-table-container" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--apple-border)', borderRadius: '14px', overflow: 'hidden' }}>
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
                    {filteredHistory.map(row => {
                      const isSecondary = secondaryTeam && row.team_id === secondaryTeam.id
                      return (
                        <tr key={row.id} style={{ borderBottom: '1px solid var(--apple-border)', fontSize: '0.92rem' }}>
                          <td style={{ padding: '16px 20px', fontWeight: '600', color: '#ffffff' }}>
                            {new Date(row.report_date).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{
                              fontSize: '0.72rem', padding: '2px 8px', borderRadius: '999px', fontWeight: '600',
                              background: isSecondary ? 'rgba(167,139,250,0.12)' : 'rgba(0,113,227,0.12)',
                              color: isSecondary ? '#a78bfa' : 'var(--apple-accent-blue)'
                            }}>
                              {row.teams?.name || '—'}
                            </span>
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
                              onClick={() => handleDeleteReport(row.id, row.report_date)}
                              className="apple-btn apple-btn-danger"
                              style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '12px' }}
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filteredHistory.length === 0 && (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--apple-text-secondary)', fontSize: '0.9rem' }}>
                    No reports match the selected filters.
                  </div>
                )}
              </div>

              {/* Mobile Cards */}
              <div className="apple-mobile-list-card">
                {filteredHistory.map(row => {
                  const isSecondary = secondaryTeam && row.team_id === secondaryTeam.id
                  return (
                    <div key={row.id} className="apple-mobile-list-item" style={{ gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--apple-border)', paddingBottom: '8px' }}>
                        <span style={{ fontWeight: '700', color: '#ffffff', fontSize: '0.95rem' }}>
                          {new Date(row.report_date).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}
                        </span>
                        <span style={{
                          fontSize: '0.65rem', padding: '1px 6px', borderRadius: '999px', fontWeight: '600',
                          background: isSecondary ? 'rgba(167,139,250,0.12)' : 'rgba(0,113,227,0.12)',
                          color: isSecondary ? '#a78bfa' : 'var(--apple-accent-blue)'
                        }}>
                          {row.teams?.name || '—'}
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
                      <div style={{ marginTop: '8px' }}>
                        <button
                          onClick={() => handleDeleteReport(row.id, row.report_date)}
                          className="apple-btn apple-btn-danger"
                          style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: '10px' }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
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

function Chip({ label, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 8px 3px 10px',
      background: 'rgba(0,113,227,0.12)', border: '1px solid rgba(0,113,227,0.25)',
      borderRadius: '20px', color: 'var(--apple-accent-blue)',
      fontSize: '0.75rem', fontWeight: '600'
    }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0', display: 'flex', alignItems: 'center', opacity: 0.7 }}>
        <X size={11} />
      </button>
    </span>
  )
}
