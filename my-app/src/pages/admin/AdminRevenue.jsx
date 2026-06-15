// updated admin revenue page instead of displaying regular trend line now it will display creative visual representaion for company performance
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import {
  TrendingUp, Activity, BarChart2, DollarSign, Users, Calendar, Award
} from 'lucide-react'
import {
  filterRevenuesByPeriod,
  filterRevenuesByCompletedPeriod,
  sumRevenues,
  normalizeMonth,
  getLastNMonths,
  getEffectiveTargetAmount,
  TIME_PERIOD_OPTIONS,
  formatRevenueMonthShort,
  toRevenueMonthString
} from '../../utils/revenueUtils'

let adminRevCache = { loaded: false, teams: [], profiles: [], revenues: [], targets: [] }

/* ─── tiny helpers ─────────────────────────────────────────────────────────── */
const fmtFull = (n) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtShort = (n) =>
  n >= 1000
    ? `$${(n / 1000).toFixed(1)}k`
    : `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`

/* ─── Custom tooltip for charts ─────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--apple-card-bg)', border: '1px solid var(--apple-border)',
      borderRadius: '12px', padding: '12px 16px', fontSize: '0.8rem',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)', backdropFilter: 'blur(20px)'
    }}>
      <div style={{ color: 'var(--apple-text-secondary)', marginBottom: '6px', fontWeight: '600' }}>{label}</div>
      {payload.map((p, i) => {
        const color = p.color && p.color.startsWith('url') ? 'var(--apple-accent-blue)' : (p.color || 'var(--apple-text-primary)');
        return (
          <div key={i} style={{ color, display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
            <span>{p.name}</span>
            <span style={{ fontWeight: '700' }}>{fmtFull(p.value)}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function AdminRevenue() {
  const [loading, setLoading] = useState(!adminRevCache.loaded)
  const [teams, setTeams] = useState(adminRevCache.teams)
  const [profiles, setProfiles] = useState(adminRevCache.profiles)
  const [revenues, setRevenues] = useState(adminRevCache.revenues)
  const [targets, setTargets] = useState(adminRevCache.targets)

  const [periodFilter, setPeriodFilter] = useState(1)
  const [averagePeriod, setAveragePeriod] = useState(6)
  const [leaderboardPeriod, setLeaderboardPeriod] = useState(0)
  const [includeCurrentMonth, setIncludeCurrentMonth] = useState(true)
  const [selectedTeamId, setSelectedTeamId] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const [teamsRes, profilesRes, revRes] = await Promise.all([
          supabase.from('teams').select('*'),
          supabase.from('profiles').select('*'),
          supabase.from('monthly_revenues').select('*')
        ])

        const t = teamsRes.data || []; const p = profilesRes.data || []; const r = revRes.data || []
        setTeams(t); setProfiles(p); setRevenues(r)

        const { data: targetData, error: targetError } = await supabase
          .from('monthly_targets')
          .select('*')
        const tgt = (!targetError && targetData) ? targetData : []
        setTargets(tgt)
        adminRevCache = { loaded: true, teams: t, profiles: p, revenues: r, targets: tgt }
      } catch (err) {
        console.error('Error loading admin revenue data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const nonAdminProfiles = useMemo(
    () => profiles.filter(p => p.platform_role !== 'admin'),
    [profiles]
  )
  const nonAdminIds = useMemo(
    () => new Set(nonAdminProfiles.map(p => p.id)),
    [nonAdminProfiles]
  )

  useEffect(() => {
    if (!selectedTeamId && teams.length > 0) {
      setSelectedTeamId(teams[0].id)
    }
  }, [selectedTeamId, teams])

  const nonAdminRevenues = useMemo(
    () => revenues.filter(r => nonAdminIds.has(r.user_id)),
    [revenues, nonAdminIds]
  )

  // Use all-time revenues for top-level cards
  const allTimeTotal = sumRevenues(nonAdminRevenues)

  const currentMonthStr = useMemo(() => {
    const d = new Date()
    return toRevenueMonthString(d.getFullYear(), d.getMonth())
  }, [])
  
  const currentMonthTotal = useMemo(() => {
    return sumRevenues(nonAdminRevenues.filter(r => normalizeMonth(r.revenue_month) === currentMonthStr))
  }, [nonAdminRevenues, currentMonthStr])

  const averagePeriodOptions = [
    { label: '2M', value: 2 },
    { label: '3M', value: 3 },
    { label: '6M', value: 6 },
    { label: '12M', value: 12 },
    { label: 'All Time', value: 0 },
  ]

  const teamAverages = useMemo(() => {
    const filtered = includeCurrentMonth 
      ? filterRevenuesByPeriod(nonAdminRevenues, averagePeriod)
      : filterRevenuesByCompletedPeriod(nonAdminRevenues, averagePeriod)

    return teams.map(team => {
      const teamRevs = filtered.filter(r => r.team_id === team.id)
      const sum = sumRevenues(teamRevs)
      
      const uniqueMonths = new Set(teamRevs.map(r => normalizeMonth(r.revenue_month))).size
      const average = uniqueMonths > 0 ? sum / uniqueMonths : 0
      
      return {
        teamId: team.id,
        teamName: team.name,
        average: Number(average.toFixed(2))
      }
    }).sort((a, b) => b.average - a.average)
  }, [nonAdminRevenues, teams, averagePeriod, includeCurrentMonth])

  const COLORS = ['#0071e3', '#30d5c8', '#ff9f0a', '#af52de', '#ff2d55', '#ffcc00', '#5ac8fa']

  // Dynamic team leaderboard
  const leaderboardPeriodOptions = [
    { label: '1M', value: 1 },
    { label: '2M', value: 2 },
    { label: '3M', value: 3 },
    { label: '6M', value: 6 },
    { label: '12M', value: 12 },
    { label: 'All Time', value: 0 },
  ]

  const teamRevenues = useMemo(() => {
    const filteredRevenues = leaderboardPeriod > 0 
      ? filterRevenuesByPeriod(nonAdminRevenues, leaderboardPeriod) 
      : nonAdminRevenues
      
    return teams.map(team => {
      const periodSum = sumRevenues(filteredRevenues.filter(r => r.team_id === team.id))
      return { ...team, totalRevenue: periodSum }
    }).sort((a, b) => b.totalRevenue - a.totalRevenue)
  }, [teams, nonAdminRevenues, leaderboardPeriod])

  const highestTeam = teamRevenues.length > 0 && teamRevenues[0].totalRevenue > 0 ? teamRevenues[0] : null

  // Last 12 months combined company-wide revenue trend data (Actual vs Target)
  const company12MonthTrend = useMemo(() => {
    const months = getLastNMonths(12).reverse()
    return months.map(m => {
      const monthlyRevs = nonAdminRevenues.filter(r => normalizeMonth(r.revenue_month) === m)
      const totalActual = sumRevenues(monthlyRevs)
      
      const totalExpected = nonAdminProfiles.reduce((sum, member) => {
        return sum + getEffectiveTargetAmount(targets, member.id, member.team_id, m)
      }, 0)

      return {
        month: formatRevenueMonthShort(m),
        actual: totalActual,
        expected: totalExpected,
        total: totalActual, // For backwards compatibility if any
        key: m
      }
    })
  }, [nonAdminRevenues, nonAdminProfiles, targets])

  // Company 12-month statistics
  const company12MonthTotal = useMemo(() => {
    return company12MonthTrend.reduce((sum, d) => sum + d.actual, 0)
  }, [company12MonthTrend])

  const companyMonthlyAvg = useMemo(() => {
    const monthsWithData = company12MonthTrend.filter(d => d.actual > 0).length
    return monthsWithData > 0 ? company12MonthTotal / monthsWithData : 0
  }, [company12MonthTotal, company12MonthTrend])

  const companyMaxMonthRevenue = useMemo(() => {
    return Math.max(1, ...company12MonthTrend.map(d => d.actual))
  }, [company12MonthTrend])

  const companyBestMonth = useMemo(() => {
    if (company12MonthTrend.length === 0) return null
    return company12MonthTrend.reduce((best, cur) => cur.actual > best.actual ? cur : best)
  }, [company12MonthTrend])

  // Period-based month set — for the Expected vs Actual section
  const monthSet = useMemo(() => {
    if (periodFilter === 0) {
      const allMonths = [
        ...revenues.map(r => normalizeMonth(r.revenue_month)),
        ...targets.map(t => normalizeMonth(t.target_month))
      ].filter(Boolean)
      return new Set(allMonths)
    }
    return new Set(getLastNMonths(periodFilter))
  }, [periodFilter, revenues, targets])

  const activeTeamMembers = useMemo(() => {
    if (!selectedTeamId) return []
    return nonAdminProfiles.filter(p => p.team_id === selectedTeamId && !p.is_deactivated)
  }, [selectedTeamId, nonAdminProfiles])

  const memberStats = useMemo(() => {
    return nonAdminProfiles.map(member => {
      const expected = Array.from(monthSet).reduce((sum, month) => {
        return sum + getEffectiveTargetAmount(targets, member.id, selectedTeamId, month)
      }, 0)

      const actual = revenues
        .filter(r =>
          r.user_id === member.id &&
          r.team_id === selectedTeamId &&
          monthSet.has(normalizeMonth(r.revenue_month))
        )
        .reduce((sum, r) => sum + Number(r.amount || 0), 0)

      const achievement = expected > 0 ? (actual / expected) * 100 : 0
      return {
        ...member,
        expected,
        actual,
        gap: actual - expected,
        achievement,
        isActiveInTeam: activeTeamMembers.some(a => a.id === member.id)
      }
    }).filter(m => m.isActiveInTeam || m.expected > 0 || m.actual > 0)
      .sort((a, b) => b.actual - a.actual)
  }, [nonAdminProfiles, activeTeamMembers, targets, revenues, selectedTeamId, monthSet])

  const summary = useMemo(() => {
    const expected = memberStats.reduce((sum, m) => sum + m.expected, 0)
    const actual = memberStats.reduce((sum, m) => sum + m.actual, 0)
    const achievement = expected > 0 ? (actual / expected) * 100 : 0
    return { expected, actual, achievement }
  }, [memberStats])

  const filterLabel = TIME_PERIOD_OPTIONS.find(o => o.value === periodFilter)?.label || 'All Time'

  if (loading) return <div style={{ color: 'var(--apple-text-secondary)', padding: '40px', textAlign: 'center' }}>Loading analytics...</div>

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* Premium Header */}
      <div style={{ marginBottom: 'clamp(24px, 5vw, 40px)' }} className="apple-header-section">
        <div className="apple-kicker">Revenue Executive Dashboard</div>
        <h1 className="apple-title-large">Revenue Analytics</h1>
        <p className="apple-lead">
          Monitor financial targets, team contributions, and overall company performance trends.
        </p>
      </div>

      {/* ===== SPECIAL TOP STATS GRID ===== */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '24px', 
        marginBottom: '28px' 
      }}>
        
        {/* Special This Month Revenue Card */}
        <div className="apple-card" style={{ 
          background: 'linear-gradient(135deg, rgba(255, 159, 10, 0.15) 0%, rgba(255, 45, 85, 0.1) 100%)',
          border: '1px solid rgba(255, 159, 10, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '24px 28px',
          borderRadius: '20px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <span className="apple-badge apple-badge-orange" style={{ marginBottom: '12px', fontSize: '0.75rem' }}>
            🔥 THIS MONTH
          </span>
          <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.82rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            Current Month Revenue
          </div>
          <div style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: '800', color: 'var(--apple-accent-orange)', letterSpacing: '-0.02em' }}>
            ${currentMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Special All Time Revenue Card */}
        <div className="apple-card" style={{ 
          background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.15) 0%, rgba(0, 113, 227, 0.1) 100%)',
          border: '1px solid rgba(52, 211, 153, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '24px 28px',
          borderRadius: '20px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <span className="apple-badge apple-badge-green" style={{ marginBottom: '12px', fontSize: '0.75rem' }}>
            💼 ALL TIME GROSS
          </span>
          <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.82rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            All Time Company Revenue
          </div>
          <div style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.02em' }}>
            ${allTimeTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Special 12-Month Revenue Card */}
        <div className="apple-card" style={{ 
          background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.15) 0%, rgba(175, 82, 222, 0.1) 100%)',
          border: '1px solid rgba(0, 113, 227, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '24px 28px',
          borderRadius: '20px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <span className="apple-badge apple-badge-blue" style={{ marginBottom: '12px', fontSize: '0.75rem' }}>
            📈 12M ACCUMULATED
          </span>
          <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.82rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            Last 12 Months Combined Revenue
          </div>
          <div style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: '800', color: 'var(--apple-accent-blue)', letterSpacing: '-0.02em' }}>
            ${company12MonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* ===== LAST 12 MONTHS BREAKDOWN GRID ===== */}
      <div className="apple-card" style={{ padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px', fontWeight: '600' }}>Company Revenue</div>
            <h3 className="apple-title-small" style={{ margin: 0, border: 'none' }}>Last 12 Months Breakdown</h3>
          </div>
        </div>

        {/* Month grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }} className="apple-two-col-grid">
          {company12MonthTrend.map((d, i) => {
            const pct = companyMaxMonthRevenue > 0 ? (d.actual / companyMaxMonthRevenue) * 100 : 0
            const isCurrentMonth = i === company12MonthTrend.length - 1
            return (
              <div key={d.key} style={{
                background: isCurrentMonth ? 'rgba(0, 113, 227, 0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isCurrentMonth ? 'rgba(0, 113, 227, 0.25)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: '12px',
                padding: '14px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--apple-text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {d.month}
                  </span>
                  {isCurrentMonth && (
                    <span className="apple-badge apple-badge-blue" style={{ fontSize: '0.55rem', padding: '1px 4px' }}>MTD</span>
                  )}
                </div>
                {/* Mini progress bar */}
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: d.actual > 0 ? 'var(--apple-accent-blue)' : 'transparent',
                    borderRadius: '2px',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
                <div style={{
                  fontSize: '0.92rem',
                  fontWeight: '700',
                  color: d.actual > 0 ? 'var(--apple-text-primary)' : 'var(--apple-text-secondary)'
                }}>
                  {d.actual > 0
                    ? `$${d.actual.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                    : '—'}
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary row */}
        <div style={{ display: 'flex', gap: '32px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--apple-border)', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', marginBottom: '2px', fontWeight: '500' }}>Monthly Average</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff' }}>
              ${companyMonthlyAvg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', marginBottom: '2px', fontWeight: '500' }}>Active Members</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} color="var(--apple-text-secondary)" /> {nonAdminProfiles.length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', marginBottom: '2px', fontWeight: '500' }}>Best Month</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--apple-accent-green)' }}>
              {companyBestMonth && companyBestMonth.actual > 0 ? `${companyBestMonth.month} ($${companyBestMonth.actual.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })})` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* ===== CREATIVE PERFORMANCE TREND COMPOSED CHART ===== */}
      <div className="apple-card" style={{ padding: '24px 28px', borderRadius: '20px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: '700' }}>Performance Trend Analysis</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>
              Creative overlay comparison: Combined actual sales (bars) vs target expectations (line) for last 12 months.
            </p>
          </div>
          <span className="apple-badge apple-badge-blue" style={{ fontSize: '0.7rem', fontWeight: '600', padding: '3px 8px' }}>
            TARGET VS ACTUAL
          </span>
        </div>

        <div style={{ flex: 1, height: '240px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={company12MonthTrend} margin={{ top: 20, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0071e3" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#0071e3" stopOpacity={0.15} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--apple-text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => fmtShort(v).replace('$', '')} tick={{ fill: 'var(--apple-text-secondary)', fontSize: 9 }} axisLine={false} tickLine={false} width={42} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="actual" name="Actual Revenue" fill="url(#actualGrad)" radius={[6, 6, 0, 0]} barSize={24} />
              <Line type="monotone" dataKey="expected" name="Target Expectation" stroke="#30d5c8" strokeWidth={3} dot={{ fill: '#30d5c8', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#fff', stroke: '#30d5c8', strokeWidth: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== TEAM MEMBERS EXPECTED VS ACTUAL ===== */}
      <div className="apple-card" style={{ marginBottom: '28px' }}>
        <h3 className="apple-title-small" style={{ marginBottom: '20px', borderBottom: '1px solid var(--apple-border)', paddingBottom: '12px' }}>
          Team Members Expected vs Actual
        </h3>

        {/* Team selector + period dropdown in the same row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'end', marginBottom: '24px' }} className="apple-two-col-grid">
          <div>
            <label className="apple-form-label">Select Team</label>
            <select value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)} className="apple-form-control">
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="apple-form-label">Select Period</label>
            <select value={periodFilter} onChange={e => setPeriodFilter(Number(e.target.value))} className="apple-form-control">
              {TIME_PERIOD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary mini-cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
          <div className="apple-card" style={{ border: '1px solid rgba(0, 113, 227, 0.25)', background: 'rgba(0, 113, 227, 0.04)', padding: '16px 20px', borderRadius: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Expected ({filterLabel})
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--apple-accent-blue)' }}>${summary.expected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="apple-card" style={{ border: '1px solid rgba(48, 213, 200, 0.25)', background: 'rgba(48, 213, 200, 0.04)', padding: '16px 20px', borderRadius: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Actual ({filterLabel})
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--apple-accent-green)' }}>${summary.actual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="apple-card" style={{ border: '1px solid rgba(255, 159, 10, 0.25)', background: 'rgba(255, 159, 10, 0.04)', padding: '16px 20px', borderRadius: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Achievement
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--apple-accent-orange)' }}>
              {summary.expected > 0 ? `${summary.achievement.toFixed(1)}%` : 'N/A'}
            </div>
          </div>
        </div>

        {(() => {
          const activeStats = memberStats.filter(m => m.isActiveInTeam)
          const historicalStats = memberStats.filter(m => !m.isActiveInTeam)

          if (activeStats.length === 0 && historicalStats.length === 0) {
            return <p style={{ color: 'var(--apple-text-secondary)', margin: 0, fontStyle: 'italic' }}>No historical or active non-admin members found for this team in this period.</p>
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {activeStats.length > 0 && (
                <div className="apple-desktop-table-container" style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--apple-border)', borderRadius: '14px', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--apple-border)' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#fff', fontWeight: '700' }}>🟢 Active Members</h4>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--apple-border)', background: 'rgba(255,255,255,0.01)' }}>
                        <th style={{ padding: '14px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Member</th>
                        <th style={{ padding: '14px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Expected</th>
                        <th style={{ padding: '14px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actual</th>
                        <th style={{ padding: '14px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Gap</th>
                        <th style={{ padding: '14px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Achievement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeStats.map(member => (
                        <tr key={member.id} style={{ borderBottom: '1px solid var(--apple-border)', fontSize: '0.92rem' }}>
                          <td style={{ padding: '14px 20px', color: '#fff', fontWeight: '600' }}>
                            {member.first_name} {member.last_name}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right', color: 'var(--apple-accent-blue)', fontWeight: '700' }}>
                            ${member.expected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right', color: 'var(--apple-accent-green)', fontWeight: '700' }}>
                            ${member.actual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right', color: member.gap >= 0 ? 'var(--apple-accent-green)' : 'var(--apple-accent-red)', fontWeight: '700' }}>
                            {member.gap >= 0 ? '+' : ''}${member.gap.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right', color: 'var(--apple-accent-orange)', fontWeight: '700' }}>
                            {member.expected > 0 ? `${member.achievement.toFixed(1)}%` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {historicalStats.length > 0 && (
                <div className="apple-desktop-table-container" style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--apple-border)', borderRadius: '14px', overflow: 'hidden', opacity: 0.85 }}>
                  <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--apple-border)' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--apple-text-secondary)', fontWeight: '700' }}>📂 Historical Members</h4>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--apple-border)', background: 'rgba(255,255,255,0.01)' }}>
                        <th style={{ padding: '14px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Member</th>
                        <th style={{ padding: '14px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Expected</th>
                        <th style={{ padding: '14px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actual</th>
                        <th style={{ padding: '14px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Gap</th>
                        <th style={{ padding: '14px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Achievement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historicalStats.map(member => (
                        <tr key={member.id} style={{ borderBottom: '1px solid var(--apple-border)', fontSize: '0.92rem' }}>
                          <td style={{ padding: '14px 20px', color: 'var(--apple-text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {member.first_name} {member.last_name}
                            <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', color: 'var(--apple-text-secondary)' }}>
                              {member.is_deactivated ? 'Former' : 'Transferred'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right', color: 'var(--apple-text-secondary)' }}>
                            ${member.expected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right', color: 'var(--apple-text-secondary)' }}>
                            ${member.actual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right', color: 'var(--apple-text-secondary)' }}>
                            {member.gap >= 0 ? '+' : ''}${member.gap.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right', color: 'var(--apple-text-secondary)' }}>
                            {member.expected > 0 ? `${member.achievement.toFixed(1)}%` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* ===== TEAM AVERAGE REVENUE ===== */}
      <div className="apple-card" style={{ marginBottom: '28px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff', fontWeight: '700' }}>Team Average Revenue</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--apple-text-secondary)' }}>
              Average monthly revenue per team. Select a period to compare.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            {/* Toggle for Current Month */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--apple-text-secondary)', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={includeCurrentMonth}
                onChange={(e) => setIncludeCurrentMonth(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--apple-accent-blue)', cursor: 'pointer' }}
              />
              Include Current Month
            </label>

            <div className="apple-pill-tabs" style={{ padding: '3px' }}>
              {averagePeriodOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAveragePeriod(opt.value)}
                  className={`apple-pill-tab ${averagePeriod === opt.value ? 'active' : ''}`}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          {teamAverages.map((team, idx) => (
             <div key={team.teamId} style={{
               background: 'rgba(255, 255, 255, 0.02)',
               border: '1px solid var(--apple-border)',
               borderRadius: '16px',
               padding: '20px',
               display: 'flex',
               flexDirection: 'column',
               position: 'relative',
               overflow: 'hidden'
             }}>
               <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: COLORS[idx % COLORS.length] }} />
               <div style={{ fontSize: '0.9rem', color: 'var(--apple-text-secondary)', fontWeight: '600', marginBottom: '8px', paddingLeft: '8px' }}>
                 {team.teamName}
               </div>
               <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', paddingLeft: '8px' }}>
                 ${team.average.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
               </div>
             </div>
          ))}
          {teamAverages.length === 0 && (
            <div style={{ color: 'var(--apple-text-secondary)', padding: '10px' }}>No teams available</div>
          )}
        </div>
      </div>

      {/* ===== TEAM LEADERBOARD (all-time) ===== */}
      <div className="apple-card" style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--apple-border)', paddingBottom: '12px', flexWrap: 'wrap', gap: '16px' }}>
          <h3 className="apple-title-small" style={{ margin: 0 }}>
            Team Leaderboard
          </h3>

          <div className="apple-pill-tabs" style={{ padding: '3px' }}>
            {leaderboardPeriodOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setLeaderboardPeriod(opt.value)}
                className={`apple-pill-tab ${leaderboardPeriod === opt.value ? 'active' : ''}`}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {teamRevenues.map((team, index) => {
            const maxRev = highestTeam?.totalRevenue || 1
            const percentage = Math.max(5, (team.totalRevenue / maxRev) * 100)

            return (
              <div key={team.id} style={{ display: 'grid', gridTemplateColumns: '40px 180px 1fr 120px', alignItems: 'center', gap: '16px' }} className="apple-leaderboard-row">
                <div style={{ color: index === 0 ? '#fbbf24' : index === 1 ? '#afafaf' : index === 2 ? '#b45309' : 'var(--apple-text-secondary)', fontWeight: '800', fontSize: '1.1rem' }}>
                  #{index + 1}
                </div>
                <div style={{ fontWeight: '600', color: '#ffffff' }}>{team.name}</div>

                <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--apple-border)' }}>
                  <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: index === 0 ? 'linear-gradient(90deg, var(--apple-accent-green), var(--apple-accent-blue))' : 'var(--apple-accent-blue)',
                    borderRadius: '6px',
                    transition: 'width 0.8s var(--apple-ease)'
                  }}></div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '700', color: '#ffffff' }}>
                    ${team.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
