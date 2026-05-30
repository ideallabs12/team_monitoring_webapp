import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import {
  getLastNMonths,
  toRevenueMonthString,
  formatRevenueMonth,
  formatRevenueMonthShort,
  normalizeMonth,
  filterRevenuesByPeriod,
  sumRevenues,
  TIME_PERIOD_OPTIONS,
  getAvailableYears,
  MONTH_NAMES,
  isFutureMonth,
  calculateAverageRevenueData
} from '../../utils/revenueUtils'
import AverageRevenueChart from '../../components/charts/AverageRevenueChart'

export default function UserRevenue({ user, isAdminView }) {
  const [revenues, setRevenues] = useState([])
  const [teams, setTeams] = useState([]) // teams user belongs to
  const [loading, setLoading] = useState(true)

  // Form state
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) // 0-indexed
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [editingRecord, setEditingRecord] = useState(null) // track if we're editing

  // Filter state
  const [periodFilter, setPeriodFilter] = useState(12) // default: last 12 months
  
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear())
  const [historyMonth, setHistoryMonth] = useState(new Date().getMonth()) // 0-indexed
  const [isAllTime, setIsAllTime] = useState(false)
  
  const [memberships, setMemberships] = useState([])
  const [allTeams, setAllTeams] = useState([])

  useEffect(() => {
    if (user) loadData()
  }, [user])

  async function loadData() {
    try {
      const [membershipsRes, allTeamsRes, revDataRes] = await Promise.all([
        supabase.from('team_members').select('team_id, team_role, teams(id, name)').eq('user_id', user.id),
        supabase.from('teams').select('*'),
        supabase.from('monthly_revenues').select('*, teams(name)').eq('user_id', user.id).order('revenue_month', { ascending: false })
      ])

      const memData = membershipsRes.data || []
      setMemberships(memData)
      setAllTeams(allTeamsRes.data || [])

      const userTeams = memData
        .filter(m => m.teams?.id)
        .map(m => ({
          id: m.teams.id,
          name: m.teams?.name || 'Unnamed Team'
        }))
      setTeams(userTeams)
      if (userTeams.length > 0 && !selectedTeam) {
        setSelectedTeam(userTeams[0].id)
      }

      setRevenues(revDataRes.data || [])
    } catch (err) {
      console.error('Error loading revenue data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Computed values
  const filteredRevenues = useMemo(
    () => filterRevenuesByPeriod(revenues, periodFilter),
    [revenues, periodFilter]
  )
  const filteredTotal = useMemo(() => sumRevenues(filteredRevenues), [filteredRevenues])
  const allTimeTotal = useMemo(() => sumRevenues(revenues), [revenues])
  const last12Total = useMemo(() => sumRevenues(filterRevenuesByPeriod(revenues, 12)), [revenues])

  // Build a lookup: 'YYYY-MM-01__teamId' → revenue record (for quick edit detection)
  const revenueMap = useMemo(() => {
    const map = {}
    for (const r of revenues) {
      const key = `${normalizeMonth(r.revenue_month)}__${r.team_id}`
      map[key] = r
    }
    return map
  }, [revenues])

  const uniqueTeamIds = useMemo(() => {
    const activeTeamIds = memberships.map(m => m.team_id)
    const revTeamIds = revenues.map(r => r.team_id)
    return [...new Set([...activeTeamIds, ...revTeamIds])]
  }, [memberships, revenues])

  // Generate the last 12 months for the breakdown grid
  const last12Months = useMemo(() => getLastNMonths(12), [])

  const selectedHistoryMonth = useMemo(() => toRevenueMonthString(historyYear, historyMonth), [historyYear, historyMonth])

  const selectedMonthRevenues = useMemo(() => {
    if (isAllTime) return revenues
    if (!selectedHistoryMonth) return []
    return revenues.filter(r => normalizeMonth(r.revenue_month) === selectedHistoryMonth)
  }, [revenues, selectedHistoryMonth, isAllTime])

  const selectedMonthTotal = useMemo(() => {
    return sumRevenues(selectedMonthRevenues)
  }, [selectedMonthRevenues])

  // Helper: find existing record for current form selection
  function getExistingRecord() {
    if (!selectedTeam) return null
    const key = `${toRevenueMonthString(selectedYear, selectedMonth)}__${selectedTeam}`
    return revenueMap[key] || null
  }

  // =====================
  // FORM HANDLERS
  // =====================
  // mode: 'add' = add amount to existing, 'replace' = overwrite with new amount
  async function handleSubmit(e, mode = 'replace') {
    if (e) e.preventDefault()
    setMessage({ type: '', text: '' })

    // Validation
    if (!selectedTeam) {
      setMessage({ type: 'error', text: 'Please select a team.' })
      return
    }
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount greater than 0.' })
      return
    }
    if (isFutureMonth(selectedYear, selectedMonth)) {
      setMessage({ type: 'error', text: 'Cannot add revenue for a future month.' })
      return
    }

    setSaving(true)
    const revenueMonth = toRevenueMonthString(selectedYear, selectedMonth)
    const existing = getExistingRecord()

    // Calculate final amount
    const finalAmount = (mode === 'add' && existing)
      ? Number(existing.amount) + numAmount
      : numAmount

    try {
      const { error } = await supabase
        .from('monthly_revenues')
        .upsert(
          {
            user_id: user.id,
            team_id: selectedTeam,
            revenue_month: revenueMonth,
            amount: finalAmount,
            entered_by: user.id
          },
          { onConflict: 'user_id,team_id,revenue_month' }
        )

      if (error) throw error

      const monthLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`
      let successText
      if (editingRecord) {
        successText = `Revenue updated to $${finalAmount.toFixed(2)} for ${monthLabel}!`
      } else if (mode === 'add' && existing) {
        successText = `Added $${numAmount.toFixed(2)} to ${monthLabel}. New total: $${finalAmount.toFixed(2)}`
      } else {
        successText = `Revenue of $${finalAmount.toFixed(2)} saved for ${monthLabel}!`
      }

      setMessage({ type: 'success', text: successText })
      setAmount('')
      setEditingRecord(null)
      await loadData() // refresh
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(record) {
    const d = new Date(record.revenue_month)
    setSelectedYear(d.getFullYear())
    setSelectedMonth(d.getMonth())
    setSelectedTeam(record.team_id)
    setAmount(String(Number(record.amount)))
    setEditingRecord(record)
    setMessage({ type: '', text: '' })
    // Scroll to form
    document.getElementById('revenue-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingRecord(null)
    setAmount('')
    setMessage({ type: '', text: '' })
  }

  if (loading) return <div style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading revenue data...</div>

  const averageData = calculateAverageRevenueData(revenues)

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* Premium Header */}
      <div style={{ marginBottom: 'clamp(24px, 5vw, 40px)' }}>
        <div className="apple-kicker">Revenue Tracking</div>
        <h1 className="apple-title-large">
          {isAdminView ? 'Revenue Details' : 'My Revenue'}
        </h1>
        {!isAdminView && (
          <p className="apple-lead">
            Manage, log, and audit your monthly revenue contributions across active teams.
          </p>
        )}
      </div>

      {/* ===== SUMMARY CARDS ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>

        {/* All-Time Total */}
        <div className="apple-card" style={{
          background: 'linear-gradient(135deg, rgba(48, 213, 200, 0.08), rgba(0, 113, 227, 0.08)) !important',
          border: '1px solid rgba(48, 213, 200, 0.2) !important',
          textAlign: 'center',
          padding: '24px !important'
        }}>
          <h3 style={{ color: 'var(--apple-text-secondary)', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>All-Time Revenue</h3>
          <div style={{ fontSize: '2.4rem', fontWeight: '700', color: 'var(--apple-accent-green)' }}>
            ${allTimeTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Last 12 Months */}
        <div className="apple-card" style={{
          textAlign: 'center',
          padding: '24px !important'
        }}>
          <h3 style={{ color: 'var(--apple-text-secondary)', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Last 12 Months</h3>
          <div style={{ fontSize: '2.4rem', fontWeight: '700', color: 'var(--apple-accent-blue)' }}>
            ${last12Total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* ===== AVERAGE REVENUE CHART ===== */}
      <div style={{ marginBottom: '32px' }}>
        <AverageRevenueChart data={averageData} title={isAdminView ? "Average Performance Trend" : "My Average Performance Trend"} />
      </div>

      {/* ===== ADD / EDIT REVENUE FORM ===== */}
      {!isAdminView && (
        <div id="revenue-form" className="apple-card" style={{
          marginBottom: '32px',
          background: editingRecord ? 'rgba(0, 113, 227, 0.04) !important' : 'var(--apple-card) !important',
          borderColor: editingRecord ? 'rgba(0, 113, 227, 0.3) !important' : 'var(--apple-border) !important',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 className="apple-title-small" style={{ margin: 0, color: editingRecord ? 'var(--apple-accent)' : '#fff' }}>
              {editingRecord ? '✏️ Edit Revenue Contribution' : '➕ Log New Revenue'}
            </h3>
            {editingRecord && (
              <button
                onClick={handleCancelEdit}
                className="apple-btn apple-btn-secondary"
                style={{ padding: '6px 14px !important', fontSize: '0.8rem', borderRadius: '14px !important' }}
              >
                Cancel Edit
              </button>
            )}
          </div>

          {teams.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👥</div>
              <p>You are not assigned to any active teams yet. Contact an administrator to add revenue contributions.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>

                {/* Team Picker */}
                <div>
                  <label className="apple-form-label">Team</label>
                  <select
                    value={selectedTeam}
                    onChange={e => setSelectedTeam(e.target.value)}
                    className="apple-form-control"
                    style={{ cursor: 'pointer' }}
                  >
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Year Picker */}
                <div>
                  <label className="apple-form-label">Year</label>
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    className="apple-form-control"
                    style={{ cursor: 'pointer' }}
                  >
                    {getAvailableYears().map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Month Picker */}
                <div>
                  <label className="apple-form-label">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(Number(e.target.value))}
                    className="apple-form-control"
                    style={{ cursor: 'pointer' }}
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={idx} value={idx} disabled={isFutureMonth(selectedYear, idx)}>
                        {name}{isFutureMonth(selectedYear, idx) ? ' (future)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="apple-form-label">Amount ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="apple-form-control"
                  />
                </div>
              </div>

              {/* Message Banner */}
              {message.text && (
                <div style={{
                  padding: '12px 16px', 
                  marginBottom: '20px', 
                  borderRadius: '10px',
                  background: message.type === 'error' ? 'rgba(255, 69, 58, 0.1)' : 'rgba(48, 213, 200, 0.1)',
                  border: `1px solid ${message.type === 'error' ? 'var(--apple-accent-red)' : 'rgba(48, 213, 200, 0.3)'}`,
                  color: message.type === 'error' ? 'var(--apple-accent-red)' : 'var(--apple-accent-green)',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}>
                  {message.text}
                </div>
              )}

              {/* Smart submit picker */}
              {(() => {
                const existing = getExistingRecord()
                const numAmount = parseFloat(amount)
                const hasValidAmount = !isNaN(numAmount) && numAmount > 0

                // EDIT MODE
                if (editingRecord) {
                  return (
                    <button type="submit" className="apple-btn apple-btn-primary" disabled={saving} style={{ width: '100%' }}>
                      {saving ? 'Saving...' : 'Update Contribution'}
                    </button>
                  )
                }

                // EXISTING RECORD CONFLICT
                if (existing && hasValidAmount) {
                  const existingAmt = Number(existing.amount)
                  const newTotal = existingAmt + numAmount
                  return (
                    <div>
                      <div style={{
                        padding: '12px 16px', 
                        marginBottom: '16px', 
                        borderRadius: '10px',
                        background: 'rgba(0, 113, 227, 0.08)', 
                        border: '1px solid rgba(0, 113, 227, 0.25)',
                        color: '#93c5fd', 
                        fontSize: '0.85rem'
                      }}>
                        📋 <strong>{MONTH_NAMES[selectedMonth]} {selectedYear}</strong> already has a recorded contribution of <strong>${existingAmt.toFixed(2)}</strong>.
                      </div>
                      <div className="apple-two-col-grid">
                        <button
                          type="button"
                          className="apple-btn"
                          disabled={saving}
                          onClick={() => handleSubmit(null, 'add')}
                          style={{
                            background: 'linear-gradient(135deg, #28cd41, #30d5c8)',
                            color: '#ffffff'
                          }}
                        >
                          {saving ? 'Saving...' : `Add to Month → $${newTotal.toFixed(2)}`}
                        </button>
                        <button
                          type="button"
                          className="apple-btn"
                          disabled={saving}
                          onClick={() => handleSubmit(null, 'replace')}
                          style={{
                            background: 'linear-gradient(135deg, #ff9f0a, #ff453a)',
                            color: '#ffffff'
                          }}
                        >
                          {saving ? 'Saving...' : `Overwrite Total → $${numAmount.toFixed(2)}`}
                        </button>
                      </div>
                    </div>
                  )
                }

                // RECORD EXISTS but empty amount
                if (existing && !hasValidAmount) {
                  return (
                    <div>
                      <div style={{
                        padding: '12px 16px', 
                        marginBottom: '16px', 
                        borderRadius: '10px',
                        background: 'rgba(0, 113, 227, 0.08)', 
                        border: '1px solid rgba(0, 113, 227, 0.25)',
                        color: '#93c5fd', 
                        fontSize: '0.85rem'
                      }}>
                        📋 <strong>{MONTH_NAMES[selectedMonth]} {selectedYear}</strong> has an existing contribution of <strong>${Number(existing.amount).toFixed(2)}</strong>. Enter an amount above to modify.
                      </div>
                      <button type="submit" className="apple-btn apple-btn-primary" disabled style={{ width: '100%', opacity: 0.4 }}>
                        Enter numeric amount
                      </button>
                    </div>
                  )
                }

                // NORMAL LOGGING
                return (
                  <button type="submit" className="apple-btn apple-btn-primary" disabled={saving} style={{ width: '100%' }}>
                    {saving ? 'Saving...' : 'Log Contribution'}
                  </button>
                )
              })()}
            </form>
          )}
        </div>
      )}

      {/* ===== MY TEAMS BREAKDOWN ===== */}
      <div className="apple-card" style={{ marginBottom: '32px' }}>
        <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>My Teams Breakdown</h3>
        
        {uniqueTeamIds.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Combined Section (Multi-team users) */}
            {uniqueTeamIds.length > 1 && (() => {
              const combinedAllTime = sumRevenues(revenues)
              const combinedMonthMap = {}
              for (const r of revenues) {
                const mStr = normalizeMonth(r.revenue_month)
                combinedMonthMap[mStr] = (combinedMonthMap[mStr] || 0) + Number(r.amount)
              }

              return (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.06), rgba(48, 213, 200, 0.06))',
                  border: '1px solid rgba(0, 113, 227, 0.2)',
                  borderRadius: '14px',
                  padding: '20px',
                  boxShadow: '0 4px 20px rgba(0, 113, 227, 0.08)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{ fontWeight: '700', color: '#ffffff', fontSize: '1rem' }}>Combined Performance</span>
                      <span className="apple-badge apple-badge-blue" style={{ marginLeft: '10px', padding: '2px 8px', fontSize: '0.65rem' }}>
                        All Active Teams
                      </span>
                    </div>
                    <span style={{ fontWeight: '800', color: 'var(--apple-accent-blue)', fontSize: '1.15rem' }}>
                      ${combinedAllTime.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>
                    Monthly Breakdown (Combined)
                  </div>
                  
                  {/* Swipeable responsive month strip */}
                  <div style={{ overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'thin' }}>
                    <div style={{ display: 'flex', gap: '8px', minWidth: '450px' }}>
                      {last12Months.slice(0, 6).map(monthStr => {
                        const amt = combinedMonthMap[monthStr] || 0
                        return (
                          <div key={monthStr} style={{
                            flex: 1,
                            background: amt > 0 ? 'rgba(0, 113, 227, 0.08)' : 'rgba(255,255,255,0.015)',
                            border: `1px solid ${amt > 0 ? 'rgba(0, 113, 227, 0.2)' : 'var(--apple-border)'}`,
                            borderRadius: '8px',
                            padding: '8px 4px',
                            textAlign: 'center'
                          }}>
                            <div style={{ fontSize: '0.6rem', color: 'var(--apple-text-secondary)', marginBottom: '2px', fontWeight: '500' }}>
                              {formatRevenueMonthShort(monthStr).split(" '")[0]}
                            </div>
                            <div style={{ fontWeight: '700', fontSize: '0.8rem', color: amt > 0 ? '#ffffff' : 'rgba(255,255,255,0.1)' }}>
                              ${amt > 0 ? amt.toFixed(0) : 0}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Individual Teams Section */}
            {uniqueTeamIds.map(teamId => {
              const teamObj = allTeams.find(t => t.id === teamId)
              if (!teamObj) return null

              const memObj = memberships.find(m => m.team_id === teamId)
              const teamRole = memObj ? memObj.team_role : 'former member'

              const teamRevs = revenues.filter(r => r.team_id === teamId)
              const teamAllTime = sumRevenues(teamRevs)

              const teamMonthMap = {}
              for (const r of teamRevs) {
                teamMonthMap[normalizeMonth(r.revenue_month)] = Number(r.amount)
              }

              return (
                <div key={teamId} style={{
                  background: 'rgba(255, 255, 255, 0.015)',
                  border: '1px solid var(--apple-border)',
                  borderRadius: '12px',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{ fontWeight: '600', color: '#ffffff', fontSize: '0.95rem', textTransform: 'capitalize' }}>
                        {uniqueTeamIds.length > 1 ? `${teamObj.name} Performance` : teamObj.name}
                      </span>
                      <span 
                        className={
                          teamRole === 'lead' 
                            ? 'apple-badge apple-badge-orange' 
                            : teamRole === 'former member' 
                              ? 'apple-badge apple-badge-red' 
                              : 'apple-badge apple-badge-green'
                        } 
                        style={{ marginLeft: '8px', padding: '1px 6px', fontSize: '0.65rem', textTransform: 'capitalize' }}
                      >
                        {teamRole}
                      </span>
                    </div>
                    <span style={{ fontWeight: '700', color: '#ffffff', fontSize: '1rem' }}>
                      ${teamAllTime.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  {/* Swipeable responsive month strip */}
                  <div style={{ overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'thin' }}>
                    <div style={{ display: 'flex', gap: '6px', minWidth: '450px' }}>
                      {last12Months.slice(0, 6).map(monthStr => {
                        const amt = teamMonthMap[monthStr] || 0
                        return (
                          <div key={monthStr} style={{
                            flex: 1,
                            background: amt > 0 ? 'rgba(48, 213, 200, 0.06)' : 'rgba(255,255,255,0.015)',
                            border: `1px solid ${amt > 0 ? 'rgba(48, 213, 200, 0.15)' : 'var(--apple-border)'}`,
                            borderRadius: '6px',
                            padding: '6px 2px',
                            textAlign: 'center'
                          }}>
                            <div style={{ fontSize: '0.58rem', color: 'var(--apple-text-secondary)', marginBottom: '2px', fontWeight: '500' }}>
                              {formatRevenueMonthShort(monthStr).split(" '")[0]}
                            </div>
                            <div style={{ fontWeight: '600', fontSize: '0.75rem', color: amt > 0 ? 'var(--apple-accent-green)' : 'rgba(255,255,255,0.1)' }}>
                              ${amt > 0 ? amt.toFixed(0) : 0}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.9rem' }}>
            No assigned team records found.
          </p>
        )}
      </div>

      {/* ===== REVENUE HISTORY ===== */}
      <div className="apple-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 className="apple-title-small" style={{ margin: 0 }}>Revenue Contributions Audit</h3>
            <p style={{ color: 'var(--apple-text-secondary)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
              Select a month and year to view team performance breakdowns.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              color: '#ffffff', 
              fontSize: '0.88rem', 
              cursor: 'pointer', 
              background: 'rgba(255,255,255,0.04)', 
              padding: '8px 14px', 
              borderRadius: '12px', 
              border: '1px solid var(--apple-border)',
              fontWeight: '500'
            }}>
              <input
                type="checkbox"
                checked={isAllTime}
                onChange={e => setIsAllTime(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: 'var(--apple-accent)' }}
              />
              All Time
            </label>
            <select
              value={historyMonth}
              onChange={e => setHistoryMonth(Number(e.target.value))}
              disabled={isAllTime}
              className="apple-form-control"
              style={{
                width: 'auto',
                padding: '8px 14px !important',
                fontSize: '0.88rem !important',
                fontWeight: '600',
                opacity: isAllTime ? 0.4 : 1,
                cursor: isAllTime ? 'not-allowed' : 'pointer',
                borderRadius: '12px !important'
              }}
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
            <select
              value={historyYear}
              onChange={e => setHistoryYear(Number(e.target.value))}
              disabled={isAllTime}
              className="apple-form-control"
              style={{
                width: 'auto',
                padding: '8px 14px !important',
                fontSize: '0.88rem !important',
                fontWeight: '600',
                opacity: isAllTime ? 0.4 : 1,
                cursor: isAllTime ? 'not-allowed' : 'pointer',
                borderRadius: '12px !important'
              }}
            >
              {getAvailableYears().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Month Summary banner */}
        <div style={{
          padding: '16px 20px',
          marginBottom: '20px',
          borderRadius: '14px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--apple-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <span style={{ color: 'var(--apple-text-secondary)', fontWeight: '500', fontSize: '0.9rem' }}>
            Combined Total for {isAllTime ? 'All Time' : (selectedHistoryMonth ? formatRevenueMonth(selectedHistoryMonth) : '')}
          </span>
          <span style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--apple-accent-green)' }}>
            ${selectedMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {selectedMonthRevenues.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="apple-desktop-table-container" style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--apple-border)', borderRadius: '14px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--apple-border)' }}>
                    {isAllTime && <th style={{ padding: '16px 24px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Month</th>}
                    <th style={{ padding: '16px 24px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team</th>
                    <th style={{ padding: '16px 24px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Amount</th>
                    {!isAdminView && <th style={{ padding: '16px 24px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', width: '100px' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {selectedMonthRevenues.map((record) => (
                    <tr key={record.id} style={{
                      borderBottom: '1px solid var(--apple-border)',
                      background: editingRecord?.id === record.id ? 'rgba(0,113,227,0.06)' : 'transparent',
                      transition: 'background-color 0.2s'
                    }}>
                      {isAllTime && (
                        <td style={{ padding: '16px 24px', color: 'var(--apple-text-secondary)', fontSize: '0.9rem' }}>
                          {formatRevenueMonth(normalizeMonth(record.revenue_month))}
                        </td>
                      )}
                      <td style={{ padding: '16px 24px', fontWeight: '600', color: '#ffffff' }}>
                        {record.teams?.name || 'Unknown Team'}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: '700', color: 'var(--apple-accent-green)' }}>
                        ${Number(record.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      {!isAdminView && (
                        <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleEdit(record)}
                            className="apple-btn apple-btn-secondary"
                            style={{ padding: '6px 14px !important', fontSize: '0.8rem', borderRadius: '12px !important' }}
                          >
                            ✏️ Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards List View */}
            <div className="apple-mobile-list-card">
              {selectedMonthRevenues.map((record) => (
                <div key={record.id} className="apple-mobile-list-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      {isAllTime && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', marginBottom: '2px', fontWeight: '500' }}>
                          {formatRevenueMonth(normalizeMonth(record.revenue_month))}
                        </div>
                      )}
                      <div style={{ fontWeight: '700', color: '#ffffff', fontSize: '1rem', textTransform: 'capitalize' }}>
                        {record.teams?.name || 'Unknown Team'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: '700', color: 'var(--apple-accent-green)', fontSize: '1.1rem' }}>
                      ${Number(record.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  {!isAdminView && (
                    <button
                      onClick={() => handleEdit(record)}
                      className="apple-btn apple-btn-secondary"
                      style={{ 
                        width: '100%', 
                        padding: '10px !important', 
                        fontSize: '0.85rem', 
                        marginTop: '6px',
                        borderRadius: '10px !important'
                      }}
                    >
                      ✏️ Edit Revenue
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{
            padding: '40px',
            background: 'rgba(255,255,255,0.01)',
            border: '1px dashed var(--apple-border)',
            borderRadius: '14px',
            textAlign: 'center',
            color: 'var(--apple-text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '0.9rem' }}>No logged contributions recorded for {isAllTime ? 'all time' : (selectedHistoryMonth ? formatRevenueMonth(selectedHistoryMonth) : 'this month')}.</span>
            {teams.length > 0 && !isAllTime && !isAdminView && (
              <button
                type="button"
                className="apple-btn apple-btn-secondary"
                onClick={() => {
                  if (selectedHistoryMonth) {
                    const [y, m] = selectedHistoryMonth.split('-')
                    setSelectedYear(Number(y))
                    setSelectedMonth(Number(m) - 1)
                    setAmount('')
                    document.getElementById('revenue-form')?.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
                style={{
                  padding: '8px 18px !important',
                  fontSize: '0.85rem',
                  borderRadius: '12px !important'
                }}
              >
                Log Revenue for {selectedHistoryMonth ? formatRevenueMonth(selectedHistoryMonth) : ''}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
