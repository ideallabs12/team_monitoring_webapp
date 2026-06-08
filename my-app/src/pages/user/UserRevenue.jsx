import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { getLastNMonths, toRevenueMonthString, formatRevenueMonth, formatRevenueMonthShort, normalizeMonth, filterRevenuesByPeriod, sumRevenues, TIME_PERIOD_OPTIONS, getAvailableYears, MONTH_NAMES, isFutureMonth } from '../../utils/revenueUtils'
import AverageRevenueChart from '../../components/charts/AverageRevenueChart'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import { DollarSign, Users, Calendar, User, Link2 as LinkIcon, Info, PlusCircle, Check, ChevronDown, ChevronsUpDown, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'

let revenueCache = {
  userId: null,
  revenues: [],
  teams: [],
  allTeams: []
}

export default function UserRevenue({ user, isAdminView }) {
  const [revenues, setRevenues] = useState(revenueCache.userId === user?.id ? revenueCache.revenues : [])
  const [teams, setTeams] = useState(revenueCache.userId === user?.id ? revenueCache.teams : [])
  const [loading, setLoading] = useState(revenueCache.userId !== user?.id)

  // Form state
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) // 0-indexed
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [accessDenied, setAccessDenied] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null) // track if we're editing

  const [selectedWeek, setSelectedWeek] = useState(1)
  const [clientName, setClientName] = useState('')
  const [noClientInfo, setNoClientInfo] = useState(false)
  const [source, setSource] = useState('Instagram')

  const getWeekRanges = (year, monthIndex) => {
    const d = new Date(year, monthIndex, 1)
    const monthName = d.toLocaleString('default', { month: 'short' })
    const lastDay = new Date(year, monthIndex + 1, 0).getDate()

    return [
      { label: 'Week 1', range: `${monthName} 1 – ${monthName} 7`, value: 1 },
      { label: 'Week 2', range: `${monthName} 8 – ${monthName} 14`, value: 2 },
      { label: 'Week 3', range: `${monthName} 15 – ${monthName} 21`, value: 3 },
      { label: 'Week 4', range: `${monthName} 22 – ${monthName} ${lastDay}`, value: 4 },
    ]
  }

  // Filter state
  const [periodFilter, setPeriodFilter] = useState(12) // default: last 12 months

  const [historyYear, setHistoryYear] = useState(new Date().getFullYear())
  const [historyMonth, setHistoryMonth] = useState(new Date().getMonth()) // 0-indexed
  const [isAllTime, setIsAllTime] = useState(false)

  const [allTeams, setAllTeams] = useState(revenueCache.userId === user?.id ? revenueCache.allTeams : [])

  useEffect(() => {

    if (user) loadData()
  }, [user])

  async function loadData() {
    try {
      const [profileRes, allTeamsRes, revDataRes] = await Promise.all([
        supabase.from('profiles').select('team_id, has_revenue_logging').eq('id', user.id).single(),
        supabase.from('teams').select('*'),
        supabase.from('monthly_revenues').select('*, teams(name)').eq('user_id', user.id).order('revenue_month', { ascending: false })
      ])

      setAllTeams(allTeamsRes.data || [])

      // Get user's single team
      if (profileRes.data?.has_revenue_logging === false) {
        setAccessDenied(true)
        setLoading(false)
        return
      }
      const assignedTeams = []
      if (profileRes.data?.team_id) {
        const userTeam = allTeamsRes.data?.find(t => t.id === profileRes.data.team_id)
        if (userTeam) {
          assignedTeams.push(userTeam)
        }
      }

      const revData = revDataRes.data || []

      setRevenues(revData)
      setTeams(assignedTeams)
      setAllTeams(allTeamsRes.data || [])

      // Update cache for silent fetching
      revenueCache = {
        userId: user.id,
        revenues: revData,
        teams: assignedTeams,
        allTeams: allTeamsRes.data || []
      }

      if (assignedTeams.length > 0) {
        setSelectedTeam(assignedTeams[0].id)
      }

    } catch (error) {
      console.error('Error loading revenue data:', error)
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

  const uniqueTeamIds = useMemo(() => {
    // User belongs to only one team, so just use that one (or all revenue team IDs if user has no assigned team)
    if (teams.length > 0) {
      return [teams[0].id]
    }
    // Fallback: get unique team IDs from revenues if user has no assigned team
    const revTeamIds = revenues.map(r => r.team_id)
    return [...new Set(revTeamIds)]
  }, [teams, revenues])

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

  // Calculate Weekly Breakdown
  const weeklyData = useMemo(() => {
    if (isAllTime) return []
    const hasWeekly = selectedMonthRevenues.some(r => r.week_number !== null)
    if (!hasWeekly) return []

    const weeks = [
      { name: 'Week 1', amount: 0 },
      { name: 'Week 2', amount: 0 },
      { name: 'Week 3', amount: 0 },
      { name: 'Week 4', amount: 0 }
    ]

    selectedMonthRevenues.forEach(r => {
      if (r.week_number >= 1 && r.week_number <= 4) {
        weeks[r.week_number - 1].amount += Number(r.amount)
      }
    })
    return weeks
  }, [selectedMonthRevenues, isAllTime])

  // Calculate Source Breakdown
  const sourceData = useMemo(() => {
    if (isAllTime) return []
    const sources = {}
    let hasSourceData = false
    selectedMonthRevenues.forEach(r => {
      if (r.source) {
        hasSourceData = true
        const s = r.source === 'UNKNOWN' ? 'Unknown' : r.source
        sources[s] = (sources[s] || 0) + Number(r.amount)
      }
    })

    if (!hasSourceData) return []
    return Object.entries(sources).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [selectedMonthRevenues, isAllTime])



  // =====================
  // FORM HANDLERS
  // =====================
  async function handleSubmit(e) {
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

    const finalClientName = noClientInfo ? 'NONAME' : (clientName || null)
    if (!noClientInfo && (!clientName || !clientName.trim())) {
      setMessage({ type: 'error', text: 'Please enter a client name or check "No Client Info".' })
      return
    }

    setSaving(true)
    const revenueMonth = toRevenueMonthString(selectedYear, selectedMonth)

    try {
      if (editingRecord) {
        // Edit mode: update existing row by id
        const { error } = await supabase
          .from('monthly_revenues')
          .update({
            team_id: selectedTeam,
            revenue_month: revenueMonth,
            week_number: selectedWeek,
            client_name: finalClientName,
            source: source,
            amount: numAmount
          })
          .eq('id', editingRecord.id)
        if (error) throw error
      } else {
        // New entry: always insert a new row
        const { error } = await supabase
          .from('monthly_revenues')
          .insert({
            user_id: user.id,
            team_id: selectedTeam,
            revenue_month: revenueMonth,
            week_number: selectedWeek,
            client_name: finalClientName,
            source: source,
            amount: numAmount,
            entered_by: user.id
          })
        if (error) throw error
      }

      const monthLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`
      const successText = editingRecord
        ? `Revenue updated to $${numAmount.toFixed(2)} for ${monthLabel}!`
        : `Revenue of $${numAmount.toFixed(2)} logged for ${monthLabel} (Week ${selectedWeek})!`

      setMessage({ type: 'success', text: successText })
      setAmount('')
      setEditingRecord(null)
      setClientName('')
      setNoClientInfo(false)
      setSource('Instagram')
      setSelectedWeek(1)
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
    setSelectedWeek(record.week_number || 1)
    setClientName(record.client_name === 'NONAME' ? '' : (record.client_name || ''))
    setNoClientInfo(record.client_name === 'NONAME')
    setSource(record.source || 'Instagram')
    setAmount(String(Number(record.amount)))
    setEditingRecord(record)
    setMessage({ type: '', text: '' })
    // Scroll to form
    document.getElementById('revenue-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingRecord(null)
    setAmount('')
    setClientName('')
    setNoClientInfo(false)
    setSource('Instagram')
    setSelectedWeek(1)
    setMessage({ type: '', text: '' })
  }

  if (loading) return <div style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading revenue data...</div>


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

      {/* ===== ADD / EDIT REVENUE FORM ===== */}
      {!isAdminView && (
        <div id="revenue-form" className="apple-card" style={{
          marginBottom: '32px',
          background: editingRecord ? 'rgba(0, 113, 227, 0.04) !important' : 'var(--apple-card) !important',
          borderColor: editingRecord ? 'rgba(0, 113, 227, 0.3) !important' : 'var(--apple-border) !important',
          padding: '24px',
          position: 'relative'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              width: '48px', height: '48px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(79, 70, 229, 0.25)'
            }}>
              <DollarSign color="#fff" size={24} />
            </div>
            <div>
              <h3 className="apple-title-small" style={{ margin: 0, color: editingRecord ? 'var(--apple-accent-blue)' : '#fff' }}>
                {editingRecord ? 'Edit Revenue Contribution' : 'Log New Revenue'}
              </h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--apple-text-secondary)', fontSize: '0.9rem' }}>
                {editingRecord ? 'Modify your previously logged contribution.' : 'Track and record your monthly revenue contributions.'}
              </p>
            </div>
            {editingRecord ? (
              <button
                onClick={handleCancelEdit}
                className="apple-btn apple-btn-secondary"
                style={{ marginLeft: 'auto', padding: '8px 16px !important', fontSize: '0.85rem', borderRadius: '8px !important' }}
              >
                Cancel Edit
              </button>
            ) : (
              <Link
                to="/historical-revenue"
                className="apple-btn"
                style={{
                  marginLeft: 'auto',
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--apple-text-secondary)',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                  e.currentTarget.style.color = '#fff'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                  e.currentTarget.style.color = 'var(--apple-text-secondary)'
                }}
              >
                <Clock size={14} /> Log Past Team Revenue
              </Link>
            )}
          </div>

          {teams.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👥</div>
              <p>You are not assigned to any active teams yet. Contact an administrator to add revenue contributions.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>

              {/* Row 1: Team, Year, Month */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {/* Team (read-only) */}
                <div>
                  <label className="apple-form-label" style={{ marginBottom: '8px' }}>Team</label>
                  <div style={{ position: 'relative' }}>
                    <Users size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)' }} />
                    <div
                      className="form-control"
                      style={{ paddingLeft: '40px', paddingRight: '16px', display: 'flex', alignItems: 'center', color: '#fff', fontWeight: '500', opacity: 0.8, cursor: 'default' }}
                    >
                      {teams[0]?.name || 'No Team'}
                    </div>
                  </div>
                </div>

                {/* Year Picker */}
                <div>
                  <label className="apple-form-label" style={{ marginBottom: '8px' }}>Year</label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)' }} />
                    <select
                      value={selectedYear}
                      onChange={e => setSelectedYear(Number(e.target.value))}
                      className="form-control"
                      style={{ paddingLeft: '40px', paddingRight: '40px', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
                    >
                      {getAvailableYears().map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Month Picker */}
                <div>
                  <label className="apple-form-label" style={{ marginBottom: '8px' }}>Month</label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)' }} />
                    <select
                      value={selectedMonth}
                      onChange={e => setSelectedMonth(Number(e.target.value))}
                      className="form-control"
                      style={{ paddingLeft: '40px', paddingRight: '40px', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
                    >
                      {MONTH_NAMES.map((name, idx) => (
                        <option key={idx} value={idx} disabled={isFutureMonth(selectedYear, idx)}>
                          {name}{isFutureMonth(selectedYear, idx) ? ' (future)' : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)', pointerEvents: 'none' }} />
                  </div>
                </div>
              </div>

              {/* Select Week */}
              <div style={{ marginBottom: '24px' }}>
                <label className="apple-form-label" style={{ marginBottom: '12px' }}>Select Week</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  {getWeekRanges(selectedYear, selectedMonth).map((w) => {
                    const isActive = selectedWeek === w.value;
                    return (
                      <div
                        key={w.value}
                        onClick={() => setSelectedWeek(w.value)}
                        style={{
                          position: 'relative',
                          padding: '16px',
                          borderRadius: '12px',
                          background: isActive ? 'rgba(0, 113, 227, 0.12)' : 'rgba(255,255,255,0.02)',
                          border: isActive ? '1px solid var(--apple-accent-blue)' : '1px solid var(--apple-border)',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '16px',
                          transition: 'all 0.2s',
                          boxShadow: isActive ? '0 0 12px rgba(0, 113, 227, 0.2)' : 'none'
                        }}
                      >
                        <div style={{
                          width: '40px', height: '40px',
                          borderRadius: '50%',
                          background: isActive ? 'rgba(0, 113, 227, 0.2)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: isActive ? 'none' : '1px solid var(--apple-border)'
                        }}>
                          <Calendar size={18} color={isActive ? 'var(--apple-accent-blue)' : 'var(--apple-text-secondary)'} />
                        </div>
                        <div>
                          <div style={{ color: isActive ? '#fff' : 'var(--apple-text-primary)', fontWeight: '600', fontSize: '1rem' }}>{w.label}</div>
                          <div style={{ color: isActive ? 'var(--apple-accent-blue)' : 'var(--apple-text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>{w.range}</div>
                        </div>
                        {isActive && <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0, 113, 227, 0.2)', borderRadius: '50%', padding: '2px' }}><Check size={14} color="var(--apple-accent-blue)" /></div>}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Row 3: Client Name, Source, Amount */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {/* Client Name */}
                <div>
                  <label className="apple-form-label" style={{ marginBottom: '8px' }}>Client Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)' }} />
                    <input
                      type="text"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      placeholder="Enter client name"
                      disabled={noClientInfo}
                      className="form-control"
                      style={{ paddingLeft: '40px', paddingRight: '16px', opacity: noClientInfo ? 0.5 : 1 }}
                    />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', color: 'var(--apple-text-secondary)', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={noClientInfo}
                      onChange={e => setNoClientInfo(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--apple-accent-blue)', cursor: 'pointer' }}
                    />
                    No Client Info
                  </label>
                </div>

                {/* Source Dropdown */}
                <div>
                  <label className="apple-form-label" style={{ marginBottom: '8px' }}>Source</label>
                  <div style={{ position: 'relative' }}>
                    <LinkIcon size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)' }} />
                    <select
                      value={source}
                      onChange={e => setSource(e.target.value)}
                      className="form-control"
                      style={{ paddingLeft: '40px', paddingRight: '40px', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
                    >
                      <option value="Linkedin">Linkedin</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Website">Website</option>
                      <option value="Other">Other</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                    <ChevronDown size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="apple-form-label" style={{ marginBottom: '8px' }}>Amount (USD)</label>
                  <div style={{ position: 'relative', display: 'flex', height: '46px' }}>
                    <div style={{ width: '40px', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRight: 'none', borderRadius: '8px 0 0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <DollarSign size={16} color="var(--apple-text-secondary)" />
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      className="form-control"
                      style={{ flex: 1, minWidth: 0, paddingLeft: '12px', paddingRight: '36px', borderRadius: '0 8px 8px 0' }}
                    />
                    <ChevronsUpDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)', pointerEvents: 'none' }} />
                  </div>
                </div>
              </div>

              {/* Message Banner */}
              {message.text && (
                <div style={{
                  padding: '16px',
                  marginBottom: '24px',
                  borderRadius: '12px',
                  background: message.type === 'error' ? 'rgba(255, 69, 58, 0.08)' : 'rgba(48, 213, 200, 0.08)',
                  border: `1px solid ${message.type === 'error' ? 'rgba(255, 69, 58, 0.25)' : 'rgba(48, 213, 200, 0.25)'}`,
                  color: message.type === 'error' ? 'var(--apple-accent-red)' : 'var(--apple-accent-green)',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <Info size={18} />
                  {message.text}
                </div>
              )}

              {/* Submit Button */}
              {editingRecord ? (
                <button type="submit" disabled={saving} className="apple-btn apple-btn-primary" style={{ width: '100%', height: '52px', borderRadius: '12px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <PlusCircle size={20} />
                  {saving ? 'Saving...' : 'Update Contribution'}
                </button>
              ) : (
                <button type="submit" disabled={saving} className="apple-btn apple-btn-primary" style={{ width: '100%', height: '52px', borderRadius: '12px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <PlusCircle size={20} />
                  {saving ? 'Saving...' : 'Log Contribution'}
                </button>
              )}
            </form>
          )}
        </div>
      )}

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

      <div style={{ marginBottom: '32px' }}>
        <AverageRevenueChart revenues={revenues} title={isAdminView ? "Average Performance Trend" : "My Average Performance Trend"} />
      </div>

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
                              {MONTH_NAMES[new Date(monthStr).getMonth()].substring(0, 3)}
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

              // Determine role from profile (single-team model)
              const isUserTeam = teams.length > 0 && teams[0].id === teamId
              const teamRole = isUserTeam ? 'member' : 'former member'

              const teamRevs = revenues.filter(r => r.team_id === teamId)
              const teamAllTime = sumRevenues(teamRevs)

              const teamMonthMap = {}
              for (const r of teamRevs) {
                teamMonthMap[normalizeMonth(r.revenue_month)] = (teamMonthMap[normalizeMonth(r.revenue_month)] || 0) + Number(r.amount)
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
                              {MONTH_NAMES[new Date(monthStr).getMonth()].substring(0, 3)}
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
            {/* WEEKLY & SOURCE ANALYTICS */}
            {!isAllTime && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>

                {/* Weekly Analytics */}
                <div className="apple-card" style={{ background: 'rgba(255, 255, 255, 0.015)' }}>
                  <h3 className="apple-title-small" style={{ marginBottom: '16px' }}>Weekly Breakdown</h3>
                  {weeklyData.length > 0 ? (
                    <div style={{ height: 250, width: '100%' }}>
                      <ResponsiveContainer>
                        <BarChart data={weeklyData}>
                          <XAxis dataKey="name" stroke="var(--apple-text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                          <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1c1c1e', border: '1px solid var(--apple-border)', borderRadius: '8px', color: '#fff' }} formatter={(val) => `$${Number(val).toFixed(2)}`} />
                          <Bar dataKey="amount" fill="var(--apple-accent-blue)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--apple-text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                      Weekly data not available for this period. Weekly tracking started from {selectedHistoryMonth ? formatRevenueMonth(selectedHistoryMonth) : ''}.
                    </div>
                  )}
                </div>

                {/* Source Breakdown */}
                <div className="apple-card" style={{ background: 'rgba(255, 255, 255, 0.015)' }}>
                  <h3 className="apple-title-small" style={{ marginBottom: '16px' }}>Source Breakdown</h3>
                  {sourceData.length > 0 ? (
                    <div style={{ height: 250, width: '100%' }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={sourceData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
                              const radius = innerRadius + (outerRadius - innerRadius) * 2.2;
                              const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                              const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                              return (
                                <text x={x} y={y} fill="var(--apple-text-secondary)" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={13} fontWeight={600}>
                                  {`${name} ${(percent * 100).toFixed(0)}%`}
                                </text>
                              );
                            }}
                            labelLine={{ stroke: 'var(--apple-border)', strokeWidth: 1 }}
                          >
                            {sourceData.map((entry, index) => {
                              const colors = ['#30d5c8', '#0071e3', '#ff9f0a', '#ff453a', '#bf5af2', '#64748b']
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            })}
                          </Pie>
                          <RechartsTooltip contentStyle={{ background: '#1c1c1e', border: '1px solid var(--apple-border)', borderRadius: '8px', color: '#fff' }} formatter={(val) => `$${Number(val).toFixed(2)}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--apple-text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                      Source data not available for this period.
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ===== REVENUE HISTORY LINK ===== */}
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
              <Link 
                to="/revenue-history" 
                className="apple-btn apple-btn-secondary"
                style={{ padding: '12px 24px', fontSize: '0.95rem', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Clock size={18} />
                View Full Revenue Logs & History
              </Link>
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
