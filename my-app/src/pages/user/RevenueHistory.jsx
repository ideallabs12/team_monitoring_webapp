import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { normalizeMonth, formatRevenueMonth, MONTH_NAMES } from '../../utils/revenueUtils'
import { Search, TrendingUp, Filter, ChevronDown, X } from 'lucide-react'

const SOURCE_OPTIONS = ['All', 'Instagram', 'Facebook', 'TikTok', 'Twitter', 'LinkedIn', 'Email Marketing', 'Organic Search', 'Referral', 'Website', 'Other', 'Unknown']

export default function RevenueHistory({ user }) {
  const [revenues, setRevenues] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterYear, setFilterYear] = useState('All')
  const [filterMonth, setFilterMonth] = useState('All')
  const [filterTeam, setFilterTeam] = useState('All')
  const [filterSource, setFilterSource] = useState('All')
  const [filterWeek, setFilterWeek] = useState('All')
  const [sortBy, setSortBy] = useState('date_desc') // date_desc | date_asc | amount_desc | amount_asc

  useEffect(() => {
    async function fetchAll() {
      try {
        const { data, error } = await supabase
          .from('monthly_revenues')
          .select('*, teams(name)')
          .eq('user_id', user.id)
          .order('revenue_month', { ascending: false })
          .order('created_at', { ascending: false })
        if (error) throw error
        setRevenues(data || [])
      } catch (err) {
        console.error('Error fetching revenue history:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [user])

  // Derive filter option lists from data
  const availableYears = useMemo(() => {
    const years = [...new Set(revenues.map(r => new Date(normalizeMonth(r.revenue_month)).getFullYear()))]
    return years.sort((a, b) => b - a)
  }, [revenues])

  const availableTeams = useMemo(() => {
    const teams = [...new Map(revenues.map(r => [r.team_id, r.teams?.name])).entries()]
    return teams.filter(([, name]) => name)
  }, [revenues])

  // Apply all filters
  const filtered = useMemo(() => {
    let list = [...revenues]

    if (filterYear !== 'All') {
      list = list.filter(r => new Date(normalizeMonth(r.revenue_month)).getFullYear() === Number(filterYear))
    }
    if (filterMonth !== 'All') {
      list = list.filter(r => new Date(normalizeMonth(r.revenue_month)).getMonth() === Number(filterMonth))
    }
    if (filterTeam !== 'All') {
      list = list.filter(r => r.team_id === filterTeam)
    }
    if (filterSource !== 'All') {
      if (filterSource === 'Unknown') {
        list = list.filter(r => !r.source || r.source === 'UNKNOWN' || r.source === 'Unknown')
      } else {
        list = list.filter(r => r.source === filterSource)
      }
    }
    if (filterWeek !== 'All') {
      if (filterWeek === 'none') {
        list = list.filter(r => r.week_number === null || r.week_number === undefined)
      } else {
        list = list.filter(r => r.week_number === Number(filterWeek))
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(r =>
        r.client_name?.toLowerCase().includes(q) ||
        r.teams?.name?.toLowerCase().includes(q) ||
        r.source?.toLowerCase().includes(q) ||
        String(r.amount).includes(q)
      )
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.revenue_month) - new Date(a.revenue_month)
      if (sortBy === 'date_asc') return new Date(a.revenue_month) - new Date(b.revenue_month)
      if (sortBy === 'amount_desc') return Number(b.amount) - Number(a.amount)
      if (sortBy === 'amount_asc') return Number(a.amount) - Number(b.amount)
      return 0
    })

    return list
  }, [revenues, filterYear, filterMonth, filterTeam, filterSource, filterWeek, searchQuery, sortBy])

  const filteredTotal = useMemo(() => filtered.reduce((s, r) => s + Number(r.amount), 0), [filtered])
  const allTimeTotal = useMemo(() => revenues.reduce((s, r) => s + Number(r.amount), 0), [revenues])

  const hasActiveFilters = filterYear !== 'All' || filterMonth !== 'All' || filterTeam !== 'All' || filterSource !== 'All' || filterWeek !== 'All' || searchQuery.trim()

  function clearFilters() {
    setFilterYear('All')
    setFilterMonth('All')
    setFilterTeam('All')
    setFilterSource('All')
    setFilterWeek('All')
    setSearchQuery('')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--apple-text-secondary)', gap: '12px' }}>
        <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--apple-accent-blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        Loading revenue history...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div className="apple-kicker">Complete Record</div>
        <h1 className="apple-title-large">Revenue History</h1>
        <p className="apple-lead">Every revenue contribution you've ever logged, across all teams and time periods.</p>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="apple-card" style={{ padding: '20px !important', textAlign: 'center', background: 'linear-gradient(135deg, rgba(48,213,200,0.08), rgba(0,113,227,0.08)) !important', border: '1px solid rgba(48,213,200,0.2) !important' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700', marginBottom: '6px' }}>All-Time Total</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--apple-accent-green)', letterSpacing: '-0.02em' }}>
            ${allTimeTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>{revenues.length} entries</div>
        </div>

        <div className="apple-card" style={{ padding: '20px !important', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700', marginBottom: '6px' }}>Filtered Total</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: hasActiveFilters ? 'var(--apple-accent-blue)' : 'var(--apple-text-secondary)', letterSpacing: '-0.02em' }}>
            ${filteredTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>{filtered.length} entries shown</div>
        </div>

        <div className="apple-card" style={{ padding: '20px !important', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700', marginBottom: '6px' }}>Avg Per Entry</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#ffffff', letterSpacing: '-0.02em' }}>
            ${filtered.length > 0 ? (filteredTotal / filtered.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>across filtered results</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="apple-card" style={{ padding: '20px !important', marginBottom: '24px' }}>
        {/* Search Row */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search by client, team, source, amount..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="apple-input"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          {/* Sort */}
          <div style={{ position: 'relative' }}>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="apple-input"
              style={{ paddingRight: '36px', minWidth: '160px' }}
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 14px', borderRadius: '10px',
                border: '1px solid rgba(255,69,58,0.3)',
                background: 'rgba(255,69,58,0.08)',
                color: 'var(--apple-accent-red)',
                cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600',
                transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
            >
              <X size={14} /> Clear Filters
            </button>
          )}
        </div>

        {/* Filter Dropdowns Row */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* Year */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.68rem', color: 'var(--apple-text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Year</label>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="apple-input" style={{ minWidth: '100px', padding: '8px 32px 8px 12px', fontSize: '0.85rem' }}>
              <option value="All">All</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Month */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.68rem', color: 'var(--apple-text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Month</label>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="apple-input" style={{ minWidth: '120px', padding: '8px 32px 8px 12px', fontSize: '0.85rem' }}>
              <option value="All">All Months</option>
              {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>

          {/* Team */}
          {availableTeams.length > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.68rem', color: 'var(--apple-text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Team</label>
              <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="apple-input" style={{ minWidth: '130px', padding: '8px 32px 8px 12px', fontSize: '0.85rem' }}>
                <option value="All">All Teams</option>
                {availableTeams.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </div>
          )}

          {/* Week */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.68rem', color: 'var(--apple-text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Week</label>
            <select value={filterWeek} onChange={e => setFilterWeek(e.target.value)} className="apple-input" style={{ minWidth: '110px', padding: '8px 32px 8px 12px', fontSize: '0.85rem' }}>
              <option value="All">All Weeks</option>
              <option value="1">Week 1</option>
              <option value="2">Week 2</option>
              <option value="3">Week 3</option>
              <option value="4">Week 4</option>
              <option value="none">No Week</option>
            </select>
          </div>

          {/* Source */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.68rem', color: 'var(--apple-text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Source</label>
            <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="apple-input" style={{ minWidth: '140px', padding: '8px 32px 8px 12px', fontSize: '0.85rem' }}>
              {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--apple-border)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', alignSelf: 'center', marginRight: '4px' }}>Active:</span>
            {filterYear !== 'All' && <Chip label={filterYear} onRemove={() => setFilterYear('All')} />}
            {filterMonth !== 'All' && <Chip label={MONTH_NAMES[Number(filterMonth)]} onRemove={() => setFilterMonth('All')} />}
            {filterTeam !== 'All' && <Chip label={availableTeams.find(([id]) => id === filterTeam)?.[1] || 'Team'} onRemove={() => setFilterTeam('All')} />}
            {filterSource !== 'All' && <Chip label={filterSource} onRemove={() => setFilterSource('All')} />}
            {filterWeek !== 'All' && <Chip label={filterWeek === 'none' ? 'No Week' : `Week ${filterWeek}`} onRemove={() => setFilterWeek('All')} />}
            {searchQuery.trim() && <Chip label={`"${searchQuery}"`} onRemove={() => setSearchQuery('')} />}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="apple-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--apple-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0,113,227,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} color="var(--apple-accent-blue)" />
            </div>
            <div>
              <div style={{ fontWeight: '600', color: '#fff', fontSize: '1rem' }}>All Contributions</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--apple-text-secondary)', marginTop: '1px' }}>
                {filtered.length} of {revenues.length} records
              </div>
            </div>
          </div>
          <div style={{ fontWeight: '700', color: 'var(--apple-accent-green)', fontSize: '1.1rem' }}>
            ${filteredTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📭</div>
            <div style={{ fontSize: '0.95rem', marginBottom: '8px' }}>No contributions match your filters.</div>
            {hasActiveFilters && (
              <button onClick={clearFilters} style={{ marginTop: '8px', background: 'none', border: 'none', color: 'var(--apple-accent-blue)', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '600' }}>
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="apple-desktop-table-container" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--apple-border)' }}>
                    {['Month', 'Team', 'Week', 'Client', 'Source', 'Amount'].map(h => (
                      <th key={h} style={{ padding: '12px 20px', textAlign: h === 'Amount' ? 'right' : 'left', fontSize: '0.72rem', fontWeight: '700', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((record, idx) => {
                    const monthStr = normalizeMonth(record.revenue_month)
                    const isHistorical = record.entered_by !== record.user_id || !record.week_number
                    return (
                      <tr
                        key={record.id}
                        style={{
                          borderBottom: idx < filtered.length - 1 ? '1px solid var(--apple-border)' : 'none',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '16px 20px', color: 'var(--apple-text-secondary)', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: '600', color: '#fff' }}>{formatRevenueMonth(monthStr)}</div>
                          {isHistorical && (
                            <span style={{ fontSize: '0.62rem', background: 'rgba(255,159,10,0.12)', color: '#ff9f0a', border: '1px solid rgba(255,159,10,0.25)', borderRadius: '4px', padding: '1px 5px', fontWeight: '700' }}>
                              HISTORICAL
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: '600', color: '#fff', fontSize: '0.9rem' }}>
                          {record.teams?.name || '—'}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '0.88rem' }}>
                          {record.week_number
                            ? <span style={{ color: '#fff' }}>Week {record.week_number}</span>
                            : <span style={{ fontSize: '0.65rem', background: 'rgba(255,159,10,0.1)', color: '#ff9f0a', border: '1px solid rgba(255,159,10,0.2)', borderRadius: '4px', padding: '2px 6px', fontWeight: '700' }}>No Week</span>
                          }
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--apple-text-secondary)', fontSize: '0.88rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {!record.client_name ? '—' : record.client_name === 'NONAME' ? <span style={{ fontStyle: 'italic', opacity: 0.6 }}>No Client</span> : record.client_name}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '0.88rem' }}>
                          {record.source
                            ? <span style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--apple-border)', borderRadius: '6px', padding: '2px 8px', fontSize: '0.78rem', color: 'var(--apple-text-secondary)', fontWeight: '500' }}>
                                {record.source === 'UNKNOWN' ? 'Unknown' : record.source}
                              </span>
                            : '—'}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '700', color: 'var(--apple-accent-green)', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                          ${Number(record.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--apple-border)', background: 'rgba(255,255,255,0.01)' }}>
                    <td colSpan={5} style={{ padding: '14px 20px', fontSize: '0.82rem', fontWeight: '700', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Total ({filtered.length} entries)
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: '800', color: 'var(--apple-accent-green)', fontSize: '1.05rem' }}>
                      ${filteredTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="apple-mobile-list-card" style={{ padding: '16px' }}>
              {filtered.map(record => {
                const monthStr = normalizeMonth(record.revenue_month)
                const isHistorical = !record.week_number
                return (
                  <div key={record.id} className="apple-mobile-list-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.95rem' }}>{formatRevenueMonth(monthStr)}</div>
                          {isHistorical && (
                            <span style={{ fontSize: '0.6rem', background: 'rgba(255,159,10,0.12)', color: '#ff9f0a', border: '1px solid rgba(255,159,10,0.25)', borderRadius: '4px', padding: '1px 5px', fontWeight: '700' }}>HISTORICAL</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)', fontWeight: '600' }}>{record.teams?.name || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>
                          {record.week_number ? `Week ${record.week_number}` : 'No Week'} ·{' '}
                          {!record.client_name ? 'No Client' : record.client_name === 'NONAME' ? 'No Client' : record.client_name} ·{' '}
                          {record.source ? (record.source === 'UNKNOWN' ? 'Unknown' : record.source) : '—'}
                        </div>
                      </div>
                      <div style={{ fontWeight: '800', color: 'var(--apple-accent-green)', fontSize: '1.05rem', whiteSpace: 'nowrap' }}>
                        ${Number(record.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                )
              })}
              {/* Mobile total */}
              <div style={{ padding: '14px 16px', background: 'rgba(48,213,200,0.06)', border: '1px solid rgba(48,213,200,0.15)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total ({filtered.length})</span>
                <span style={{ fontWeight: '800', color: 'var(--apple-accent-green)', fontSize: '1.05rem' }}>
                  ${filteredTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
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
