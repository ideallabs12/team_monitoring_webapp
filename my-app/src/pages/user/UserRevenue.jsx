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
    <div>
      <div className="dashboard-header" style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>
          {isAdminView ? 'Revenue Details' : 'My Revenue'}
        </h1>
        {!isAdminView && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            Track, add, and edit your monthly revenue contributions.
          </p>
        )}
      </div>

      {/* ===== SUMMARY CARDS ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>

        {/* All-Time Total */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.1), rgba(59, 130, 246, 0.1))',
          border: '1px solid rgba(74, 222, 128, 0.2)',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '12px' }}>All-Time Revenue</h3>
          <div style={{ fontSize: '2.8rem', fontWeight: 'bold', color: '#4ade80', textShadow: '0 0 20px rgba(74, 222, 128, 0.3)' }}>
            ${allTimeTotal.toFixed(2)}
          </div>
        </div>

        {/* Last 12 Months */}
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center'
        }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '12px' }}>Last 12 Months</h3>
          <div style={{ fontSize: '2.8rem', fontWeight: 'bold', color: '#60a5fa' }}>
            ${last12Total.toFixed(2)}
          </div>
        </div>
      </div>

      {/* ===== AVERAGE REVENUE CHART ===== */}
      <div style={{ marginBottom: '40px' }}>
        <AverageRevenueChart data={averageData} title={isAdminView ? "Average Performance" : "My Average Performance"} />
      </div>

      {/* ===== ADD / EDIT REVENUE FORM ===== */}
      {!isAdminView && (
      <div id="revenue-form" className="card" style={{
        marginBottom: '40px',
        background: editingRecord ? 'rgba(59, 130, 246, 0.05)' : 'var(--card-bg)',
        border: editingRecord ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--border-color)',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: editingRecord ? '#60a5fa' : '#fff' }}>
            {editingRecord ? '✏️ Edit Revenue' : '➕ Add Revenue'}
          </h3>
          {editingRecord && (
            <button
              onClick={handleCancelEdit}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'var(--text-secondary)',
                padding: '6px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Cancel Edit
            </button>
          )}
        </div>

        {teams.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👥</div>
            <p>You're not part of any team yet. Contact an admin to be added to a team before adding revenue.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>

              {/* Team Picker */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Team</label>
                <select
                  value={selectedTeam}
                  onChange={e => setSelectedTeam(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid var(--border-color)', background: 'var(--bg-color)',
                    color: '#fff', fontSize: '0.95rem', cursor: 'pointer'
                  }}
                >
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Year Picker */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Year</label>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid var(--border-color)', background: 'var(--bg-color)',
                    color: '#fff', fontSize: '0.95rem', cursor: 'pointer'
                  }}
                >
                  {getAvailableYears().map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Month Picker */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Month</label>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid var(--border-color)', background: 'var(--bg-color)',
                    color: '#fff', fontSize: '0.95rem', cursor: 'pointer'
                  }}
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
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Amount ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid var(--border-color)', background: 'var(--bg-color)',
                    color: '#fff', fontSize: '0.95rem'
                  }}
                />
              </div>
            </div>

            {/* Message */}
            {message.text && (
              <div style={{
                padding: '10px 16px', marginBottom: '16px', borderRadius: '8px',
                background: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(74, 222, 128, 0.1)',
                color: message.type === 'error' ? 'var(--danger)' : '#4ade80',
                fontSize: '0.9rem'
              }}>
                {message.text}
              </div>
            )}

            {/* Smart submit: detect existing record and show appropriate actions */}
            {(() => {
              const existing = getExistingRecord()
              const numAmount = parseFloat(amount)
              const hasValidAmount = !isNaN(numAmount) && numAmount > 0

              // EDIT MODE: simple update button
              if (editingRecord) {
                return (
                  <button type="submit" className="btn" disabled={saving} style={{ width: '100%', padding: '12px' }}>
                    {saving ? 'Saving...' : 'Update Revenue'}
                  </button>
                )
              }

              // EXISTING RECORD FOUND: show info + two action buttons
              if (existing && hasValidAmount) {
                const existingAmt = Number(existing.amount)
                const newTotal = existingAmt + numAmount
                return (
                  <div>
                    <div style={{
                      padding: '12px 16px', marginBottom: '16px', borderRadius: '8px',
                      background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)',
                      color: '#93c5fd', fontSize: '0.85rem'
                    }}>
                      📋 <strong>{MONTH_NAMES[selectedMonth]} {selectedYear}</strong> already has <strong>${existingAmt.toFixed(2)}</strong> recorded. How would you like to proceed?
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <button
                        type="button"
                        className="btn"
                        disabled={saving}
                        onClick={() => handleSubmit(null, 'add')}
                        style={{
                          padding: '12px',
                          background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                          border: 'none',
                          fontSize: '0.9rem'
                        }}
                      >
                        {saving ? 'Saving...' : `Add to Month → $${newTotal.toFixed(2)}`}
                      </button>
                      <button
                        type="button"
                        className="btn"
                        disabled={saving}
                        onClick={() => handleSubmit(null, 'replace')}
                        style={{
                          padding: '12px',
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          border: 'none',
                          fontSize: '0.9rem'
                        }}
                      >
                        {saving ? 'Saving...' : `Replace → $${numAmount.toFixed(2)}`}
                      </button>
                    </div>
                  </div>
                )
              }

              // EXISTING RECORD but no amount typed yet: show info only
              if (existing && !hasValidAmount) {
                return (
                  <div>
                    <div style={{
                      padding: '12px 16px', marginBottom: '16px', borderRadius: '8px',
                      background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)',
                      color: '#93c5fd', fontSize: '0.85rem'
                    }}>
                      📋 <strong>{MONTH_NAMES[selectedMonth]} {selectedYear}</strong> already has <strong>${Number(existing.amount).toFixed(2)}</strong> recorded. Enter an amount to add or replace.
                    </div>
                    <button type="submit" className="btn" disabled style={{ width: '100%', padding: '12px', opacity: 0.5 }}>
                      Enter amount above
                    </button>
                  </div>
                )
              }

              // NO EXISTING RECORD: simple add button
              return (
                <button type="submit" className="btn" disabled={saving} style={{ width: '100%', padding: '12px' }}>
                  {saving ? 'Saving...' : 'Add Revenue'}
                </button>
              )
            })()}
          </form>
        )}
      </div>
      )}

      {/* ===== MY TEAMS BREAKDOWN ===== */}
      <div className="card" style={{ padding: '28px', marginBottom: '40px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', color: '#fff' }}>My Teams Breakdown</h3>
        
        {uniqueTeamIds.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* SECTION 1: Combined Section (rendered only if user has more than 1 team) */}
            {uniqueTeamIds.length > 1 && (() => {
              const combinedAllTime = sumRevenues(revenues)
              const combinedMonthMap = {}
              for (const r of revenues) {
                const mStr = normalizeMonth(r.revenue_month)
                combinedMonthMap[mStr] = (combinedMonthMap[mStr] || 0) + Number(r.amount)
              }

              return (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(124, 58, 237, 0.08))',
                  border: '1px solid rgba(124, 58, 237, 0.25)',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 4px 20px rgba(99, 102, 241, 0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <span style={{ fontWeight: '700', color: '#a5b4fc', fontSize: '1rem' }}>Combined Performance</span>
                      <span style={{
                        marginLeft: '10px',
                        padding: '2px 8px',
                        background: 'rgba(165, 180, 252, 0.12)',
                        border: '1px solid rgba(165, 180, 252, 0.25)',
                        color: '#a5b4fc',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        All Teams
                      </span>
                    </div>
                    <span style={{ fontWeight: '800', color: '#818cf8', fontSize: '1.05rem' }}>
                      ${combinedAllTime.toFixed(0)}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px', fontWeight: '500' }}>
                    Monthly Breakdown (Combined)
                  </div>
                  {/* Month breakdown strip */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
                    {last12Months.slice(0, 6).map(monthStr => {
                      const amt = combinedMonthMap[monthStr] || 0
                      return (
                        <div key={monthStr} style={{
                          background: amt > 0 ? 'rgba(129, 140, 248, 0.08)' : 'rgba(255,255,255,0.015)',
                          border: `1px solid ${amt > 0 ? 'rgba(129, 140, 248, 0.2)' : 'rgba(255,255,255,0.03)'}`,
                          borderRadius: '6px',
                          padding: '6px 2px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '0.55rem', color: '#94a3b8', marginBottom: '1px' }}>
                            {formatRevenueMonthShort(monthStr).split(" '")[0]}
                          </div>
                          <div style={{ fontWeight: '700', fontSize: '0.7rem', color: amt > 0 ? '#a5b4fc' : 'rgba(255,255,255,0.1)' }}>
                            ${amt > 0 ? amt.toFixed(0) : 0}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* INDIVIDUAL TEAM SECTIONS (SECTIONS 2 & 3) */}
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
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '10px',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <span style={{ fontWeight: '600', color: '#fff', fontSize: '0.95rem' }}>
                        {uniqueTeamIds.length > 1 ? `${teamObj.name} Performance` : teamObj.name}
                      </span>
                      <span style={{
                        marginLeft: '8px',
                        padding: '1px 6px',
                        background: teamRole === 'lead' ? 'rgba(234, 179, 8, 0.1)' : teamRole === 'former member' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(74, 222, 128, 0.1)',
                        border: teamRole === 'lead' ? '1px solid rgba(234, 179, 8, 0.2)' : teamRole === 'former member' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(74, 222, 128, 0.2)',
                        color: teamRole === 'lead' ? '#eab308' : teamRole === 'former member' ? '#f87171' : '#4ade80',
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        textTransform: 'capitalize'
                      }}>
                        {teamRole}
                      </span>
                    </div>
                    <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>
                      ${teamAllTime.toFixed(0)}
                    </span>
                  </div>

                  {/* Month breakdown strip */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                    {last12Months.slice(0, 6).map(monthStr => {
                      const amt = teamMonthMap[monthStr] || 0
                      return (
                        <div key={monthStr} style={{
                          background: amt > 0 ? 'rgba(74, 222, 128, 0.06)' : 'rgba(255,255,255,0.015)',
                          border: `1px solid ${amt > 0 ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255,255,255,0.03)'}`,
                          borderRadius: '4px',
                          padding: '4px 2px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '0.55rem', color: '#94a3b8', marginBottom: '1px' }}>
                            {formatRevenueMonthShort(monthStr).split(" '")[0]}
                          </div>
                          <div style={{ fontWeight: '600', fontSize: '0.65rem', color: amt > 0 ? '#4ade80' : 'rgba(255,255,255,0.1)' }}>
                            ${amt > 0 ? amt.toFixed(0) : 0}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0, fontSize: '0.9rem' }}>
            No team records found.
          </p>
        )}
      </div>

      {/* ===== REVENUE HISTORY DROPDOWN ===== */}
      <div className="card" style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', margin: 0, color: '#fff' }}>Revenue History</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
              Select a month and year to view your team contributions.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '0.9rem', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <input
                type="checkbox"
                checked={isAllTime}
                onChange={e => setIsAllTime(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              All Time
            </label>
            <select
              value={historyMonth}
              onChange={e => setHistoryMonth(Number(e.target.value))}
              disabled={isAllTime}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-color)',
                color: '#fff',
                fontSize: '0.95rem',
                cursor: isAllTime ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                outline: 'none',
                opacity: isAllTime ? 0.5 : 1
              }}
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx} value={idx}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={historyYear}
              onChange={e => setHistoryYear(Number(e.target.value))}
              disabled={isAllTime}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-color)',
                color: '#fff',
                fontSize: '0.95rem',
                cursor: isAllTime ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                outline: 'none',
                opacity: isAllTime ? 0.5 : 1
              }}
            >
              {getAvailableYears().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Month Summary */}
        <div style={{
          padding: '20px 24px',
          marginBottom: '20px',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>
            Combined Total for {isAllTime ? 'All Time' : (selectedHistoryMonth ? formatRevenueMonth(selectedHistoryMonth) : '')}
          </span>
          <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#4ade80', textShadow: '0 0 15px rgba(74, 222, 128, 0.2)' }}>
            ${selectedMonthTotal.toFixed(2)}
          </span>
        </div>

        {selectedMonthRevenues.length > 0 ? (
          <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                  {isAllTime && <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Month</th>}
                  <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Team</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Amount</th>
                  {!isAdminView && <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', width: '100px' }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {selectedMonthRevenues.map((record) => (
                  <tr key={record.id} style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    background: editingRecord?.id === record.id ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                    transition: 'background 0.2s'
                  }}>
                    {isAllTime && (
                      <td style={{ padding: '16px 24px', color: '#94a3b8', fontSize: '0.9rem' }}>
                        {formatRevenueMonth(normalizeMonth(record.revenue_month))}
                      </td>
                    )}
                    <td style={{ padding: '16px 24px', fontWeight: '500', color: '#fff' }}>
                      {record.teams?.name || 'Unknown Team'}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 'bold', color: '#4ade80' }}>
                      ${Number(record.amount).toFixed(2)}
                    </td>
                    {!isAdminView && (
                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleEdit(record)}
                          style={{
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            color: '#60a5fa',
                            padding: '6px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => { e.target.style.background = 'rgba(59,130,246,0.3)' }}
                          onMouseLeave={e => { e.target.style.background = 'rgba(59,130,246,0.15)' }}
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
        ) : (
          <div style={{
            padding: '40px',
            background: 'rgba(255,255,255,0.01)',
            border: '1px dotted rgba(255,255,255,0.1)',
            borderRadius: '12px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span>No revenue contributions recorded for {isAllTime ? 'all time' : (selectedHistoryMonth ? formatRevenueMonth(selectedHistoryMonth) : 'this month')}.</span>
            {teams.length > 0 && !isAllTime && !isAdminView && (
              <button
                type="button"
                className="btn btn-secondary"
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
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ➕ Add Revenue for {selectedHistoryMonth ? formatRevenueMonth(selectedHistoryMonth) : ''}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
