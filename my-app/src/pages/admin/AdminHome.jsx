import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  TrendingUp, TrendingDown, Users, FileText, Target,
  Zap, Activity, ArrowUpRight, ArrowDownRight, Minus,
  AlertCircle, CheckCircle, Clock
} from 'lucide-react'
import {
  getLastNMonths,
  normalizeMonth,
  formatRevenueMonthShort,
  sumRevenues
} from '../../utils/revenueUtils'

/* ─── tiny helpers ─────────────────────────────────────────────────────────── */
const fmt = (n) =>
  n >= 1000
    ? `$${(n / 1000).toFixed(1)}k`
    : `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`

const fmtFull = (n) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const pctColor = (v) => (v > 0 ? '#10b981' : v < 0 ? '#ef4444' : '#94a3b8')
const pctBg   = (v) => (v > 0 ? 'rgba(16,185,129,0.1)' : v < 0 ? 'rgba(239,68,68,0.1)' : 'rgba(148,163,184,0.1)')
const pctBorder= (v) => (v > 0 ? 'rgba(16,185,129,0.3)' : v < 0 ? 'rgba(239,68,68,0.3)' : 'rgba(148,163,184,0.3)')

const TEAM_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#f43f5e']

let adminHomeCache = { loaded: false, teams: [], profiles: [], revenues: [], targets: [], disReports: [] }

/* ─── Custom tooltip for charts ─────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0f172a', border: '1px solid rgba(99,102,241,0.4)',
      borderRadius: '8px', padding: '10px 14px', fontSize: '0.8rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
    }}>
      <div style={{ color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#fff', display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: '700' }}>{fmtFull(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── Ticker Tape ────────────────────────────────────────────────────────────── */
function TickerTape({ items }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    let x = 0
    const totalW = el.scrollWidth / 2
    let raf
    const tick = () => {
      x -= 0.6
      if (Math.abs(x) >= totalW) x = 0
      el.style.transform = `translateX(${x}px)`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [items])

  if (!items.length) return null
  const doubled = [...items, ...items]

  return (
    <div style={{
      overflow: 'hidden',
      background: 'rgba(15,23,42,0.95)',
      borderBottom: '1px solid rgba(99,102,241,0.2)',
      padding: '8px 0',
      whiteSpace: 'nowrap',
      userSelect: 'none'
    }}>
      <div ref={ref} style={{ display: 'inline-flex', gap: '0' }}>
        {doubled.map((item, i) => (
          <div key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '0 28px', borderRight: '1px solid rgba(255,255,255,0.06)'
          }}>
            <span style={{
              fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.08em',
              color: item.color, fontFamily: 'monospace'
            }}>
              {item.ticker}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#e2e8f0', fontFamily: 'monospace', fontWeight: '600' }}>
              {fmt(item.value)}
            </span>
            <span style={{
              fontSize: '0.68rem', fontWeight: '700', fontFamily: 'monospace',
              color: pctColor(item.change),
              display: 'flex', alignItems: 'center', gap: '2px'
            }}>
              {item.change > 0 ? '▲' : item.change < 0 ? '▼' : '—'}
              {Math.abs(item.change).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Stat Card ──────────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, color, icon: Icon, change, pulse }) {
  return (
    <div style={{
      background: 'rgba(15,23,42,0.8)',
      border: `1px solid ${color}25`,
      borderRadius: '12px',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
      backdropFilter: 'blur(8px)'
    }}>
      {/* Glow top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: `linear-gradient(to right, transparent, ${color}, transparent)`
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <span style={{
          fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em',
          color: '#64748b', fontWeight: '700', fontFamily: 'monospace'
        }}>
          {label}
        </span>
        <div style={{ position: 'relative' }}>
          {pulse && (
            <span style={{
              position: 'absolute', top: '-2px', right: '-2px',
              width: '8px', height: '8px', borderRadius: '50%',
              background: color, animation: 'pulseRing 1.5s infinite'
            }} />
          )}
          <Icon size={18} style={{ color }} />
        </div>
      </div>

      <div style={{
        fontSize: '1.9rem', fontWeight: '800', color: '#f1f5f9',
        fontFamily: 'monospace', letterSpacing: '-0.02em', marginBottom: '6px'
      }}>
        {value}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{sub}</span>
        {change !== undefined && (
          <span style={{
            fontSize: '0.7rem', fontWeight: '700', fontFamily: 'monospace',
            color: pctColor(change),
            background: pctBg(change),
            border: `1px solid ${pctBorder(change)}`,
            borderRadius: '4px', padding: '2px 7px',
            display: 'flex', alignItems: 'center', gap: '3px'
          }}>
            {change > 0 ? <ArrowUpRight size={11} /> : change < 0 ? <ArrowDownRight size={11} /> : <Minus size={11} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */
export default function AdminHome() {
  const [loading, setLoading]     = useState(!adminHomeCache.loaded)
  const [teams, setTeams]         = useState(adminHomeCache.teams)
  const [profiles, setProfiles]   = useState(adminHomeCache.profiles)
  const [revenues, setRevenues]   = useState(adminHomeCache.revenues)
  const [targets, setTargets]     = useState(adminHomeCache.targets)
  const [disReports, setDisReports] = useState(adminHomeCache.disReports)
  const [clock, setClock]         = useState(new Date())
  const navigate = useNavigate()

  /* live clock */
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  /* data fetch */
  useEffect(() => {
    async function loadData() {
      try {
        const today = new Date().toISOString().split('T')[0]
        const [teamsRes, profilesRes, revRes, targetRes, disRes] = await Promise.all([
          supabase.from('teams').select('*').order('name', { ascending: true }),
          supabase.from('profiles').select('*'),
          supabase.from('monthly_revenues').select('*'),
          supabase.from('monthly_targets').select('*'),
          supabase.from('dis_reports').select('user_id').eq('report_date', today)
        ])
        const t  = teamsRes.data   || []
        const p  = profilesRes.data || []
        const r  = revRes.data      || []
        const tg = targetRes.data   || []
        const d  = disRes.data      || []
        setTeams(t); setProfiles(p); setRevenues(r); setTargets(tg); setDisReports(d)
        adminHomeCache = { loaded: true, teams: t, profiles: p, revenues: r, targets: tg, disReports: d }
      } catch (err) {
        console.error('Error loading admin home data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  /* ── derived data ── */
  const nonAdminProfiles = useMemo(
    () => profiles.filter(p => p.platform_role !== 'admin' && !p.is_deactivated),
    [profiles]
  )

  const months12 = useMemo(() => getLastNMonths(12).reverse(), [])

  /* Revenue trend chart data (last 12 months) */
  const revenueTrend = useMemo(() => {
    return months12.map(m => {
      const total = revenues
        .filter(r => normalizeMonth(r.revenue_month) === m)
        .reduce((s, r) => s + Number(r.amount || 0), 0)
      return { month: formatRevenueMonthShort(m), total, key: m }
    })
  }, [revenues, months12])

  /* Per-team monthly data (last 6 months) for stacked bar */
  const months6 = useMemo(() => getLastNMonths(6).reverse(), [])
  const teamMonthlyData = useMemo(() => {
    return months6.map(m => {
      const row = { month: formatRevenueMonthShort(m) }
      teams.forEach(team => {
        row[team.name] = revenues
          .filter(r => r.team_id === team.id && normalizeMonth(r.revenue_month) === m)
          .reduce((s, r) => s + Number(r.amount || 0), 0)
      })
      return row
    })
  }, [revenues, teams, months6])

  /* Current & last month strings */
  const currentMonthStr = useMemo(() => getLastNMonths(1)[0], [])
  const lastMonthStr    = useMemo(() => getLastNMonths(2)[1], [])

  /* MTD & MoM */
  const mtdRevenue  = useMemo(() => sumRevenues(revenues.filter(r => normalizeMonth(r.revenue_month) === currentMonthStr)), [revenues, currentMonthStr])
  const lastMonthRev= useMemo(() => sumRevenues(revenues.filter(r => normalizeMonth(r.revenue_month) === lastMonthStr)),    [revenues, lastMonthStr])
  const momChange   = lastMonthRev > 0 ? ((mtdRevenue - lastMonthRev) / lastMonthRev) * 100 : 0

  /* DIS */
  const totalMembers      = nonAdminProfiles.length
  const submittedIds      = useMemo(() => new Set(disReports.map(r => r.user_id)), [disReports])
  const submittedCount    = useMemo(() => nonAdminProfiles.filter(p => submittedIds.has(p.id)).length, [nonAdminProfiles, submittedIds])
  const missedCount       = totalMembers - submittedCount
  const compliancePct     = totalMembers > 0 ? Math.round((submittedCount / totalMembers) * 100) : 0

  /* Team Watchlist: current vs last month per team */
  const teamWatchlist = useMemo(() => {
    return teams.map((team, idx) => {
      const cur  = sumRevenues(revenues.filter(r => r.team_id === team.id && normalizeMonth(r.revenue_month) === currentMonthStr))
      const prev = sumRevenues(revenues.filter(r => r.team_id === team.id && normalizeMonth(r.revenue_month) === lastMonthStr))
      const chg  = prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? 100 : 0)
      const memberCount = nonAdminProfiles.filter(p => p.team_id === team.id).length
      // mini sparkline (last 4 months)
      const spark = getLastNMonths(4).reverse().map(m =>
        sumRevenues(revenues.filter(r => r.team_id === team.id && normalizeMonth(r.revenue_month) === m))
      )
      return { ...team, cur, prev, chg, memberCount, spark, color: TEAM_COLORS[idx % TEAM_COLORS.length] }
    }).sort((a, b) => b.cur - a.cur)
  }, [teams, revenues, nonAdminProfiles, currentMonthStr, lastMonthStr])

  /* Revenue share per team this month (for pie chart) */
  const revenueShareData = useMemo(() =>
    teams
      .map((team, idx) => ({
        name: team.name,
        value: sumRevenues(revenues.filter(r => r.team_id === team.id && normalizeMonth(r.revenue_month) === currentMonthStr)),
        color: TEAM_COLORS[idx % TEAM_COLORS.length]
      }))
      .filter(d => d.value > 0)
  , [teams, revenues, currentMonthStr])

  /* Ticker items */
  const tickerItems = useMemo(() => [
    ...teamWatchlist.map(t => ({
      ticker: t.name.toUpperCase().replace(/\s+/g, '').slice(0, 6),
      value: t.cur,
      change: t.chg,
      color: t.color
    })),
    { ticker: 'DIS%',  value: compliancePct, change: 0,       color: compliancePct >= 80 ? '#10b981' : '#f59e0b' },
    { ticker: 'TOTAL', value: mtdRevenue,    change: momChange, color: '#6366f1' },
  ], [teamWatchlist, compliancePct, mtdRevenue, momChange])

  /* Top performer this month */
  const topPerformer = useMemo(() => {
    const contribs = nonAdminProfiles.map(p => ({
      ...p,
      amount: sumRevenues(revenues.filter(r => r.user_id === p.id && normalizeMonth(r.revenue_month) === currentMonthStr))
    })).filter(p => p.amount > 0).sort((a, b) => b.amount - a.amount)
    return contribs[0] || null
  }, [nonAdminProfiles, revenues, currentMonthStr])

  /* Fastest growing team */
  const fastestGrowingTeam = useMemo(() => {
    const ranked = [...teamWatchlist].sort((a, b) => b.chg - a.chg)
    return ranked[0] || null
  }, [teamWatchlist])

  /* insights */
  const insights = useMemo(() => {
    const list = []
    if (fastestGrowingTeam && fastestGrowingTeam.chg > 0)
      list.push({ icon: TrendingUp, color: '#10b981', text: `${fastestGrowingTeam.name} is the fastest growing team — up ${fastestGrowingTeam.chg.toFixed(1)}% MoM` })
    if (compliancePct === 100)
      list.push({ icon: CheckCircle, color: '#10b981', text: 'Perfect DIS compliance today — all members submitted!' })
    else if (compliancePct < 60)
      list.push({ icon: AlertCircle, color: '#ef4444', text: `DIS compliance is low at ${compliancePct}% — ${missedCount} members haven't submitted` })
    if (topPerformer)
      list.push({ icon: Zap, color: '#fbbf24', text: `Top performer this month: ${topPerformer.first_name} ${topPerformer.last_name} (${fmt(topPerformer.amount)})` })
    if (momChange > 10)
      list.push({ icon: ArrowUpRight, color: '#10b981', text: `Strong MTD growth — revenue is up ${momChange.toFixed(1)}% vs last month` })
    else if (momChange < -10)
      list.push({ icon: ArrowDownRight, color: '#ef4444', text: `Revenue declined ${Math.abs(momChange).toFixed(1)}% vs last month — review team performance` })
    if (teams.length > 0 && teamWatchlist.length > 0) {
      const bottom = teamWatchlist[teamWatchlist.length - 1]
      if (bottom.cur === 0)
        list.push({ icon: AlertCircle, color: '#f59e0b', text: `${bottom.name} has no revenue recorded this month` })
    }
    return list.slice(0, 5)
  }, [fastestGrowingTeam, compliancePct, missedCount, topPerformer, momChange, teams, teamWatchlist])

  /* ── loading ── */
  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', gap: '12px', color: '#6366f1', fontFamily: 'monospace'
    }}>
      <Activity size={20} style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: '0.9rem', letterSpacing: '0.1em' }}>LOADING TERMINAL...</span>
    </div>
  )

  /* ── render ── */
  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes pulseRing {
          0%   { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
          70%  { box-shadow: 0 0 0 6px transparent; opacity: 0.5; }
          100% { box-shadow: 0 0 0 0 transparent; opacity: 0; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .terminal-card {
          background: rgba(15,23,42,0.85);
          border: 1px solid rgba(99,102,241,0.15);
          border-radius: 12px;
          backdrop-filter: blur(8px);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .terminal-card:hover {
          border-color: rgba(99,102,241,0.35);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .watchlist-row:hover { background: rgba(99,102,241,0.06) !important; }
      `}</style>

      {/* ── TICKER TAPE ── */}
      <div style={{ margin: '-24px -24px 0 -24px' }}>
        <TickerTape items={tickerItems} />
      </div>

      {/* ── HEADER ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '24px 0 20px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
        marginBottom: '24px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%', background: '#10b981',
              animation: 'pulseRing 2s infinite', boxShadow: '0 0 0 0 #10b981'
            }} />
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-0.02em' }}>
              COMMAND TERMINAL
            </h1>
            <span style={{
              fontSize: '0.65rem', fontWeight: '700', fontFamily: 'monospace',
              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
              color: '#818cf8', borderRadius: '4px', padding: '2px 8px', letterSpacing: '0.06em'
            }}>
              ADMIN
            </span>
          </div>
          <p style={{ margin: '4px 0 0 18px', color: '#475569', fontSize: '0.8rem', fontFamily: 'monospace' }}>
            Real-time performance monitoring · {teams.length} teams · {totalMembers} members
          </p>
        </div>
        <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f1f5f9', letterSpacing: '0.04em' }}>
            {clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '2px' }}>
            {clock.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ── TOP STAT CARDS ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <StatCard
          label="MTD REVENUE"
          value={fmt(mtdRevenue)}
          sub="Month-to-date · all teams"
          color="#6366f1"
          icon={TrendingUp}
          change={momChange}
          pulse
        />
        <StatCard
          label="ACTIVE MEMBERS"
          value={totalMembers}
          sub={`across ${teams.length} teams`}
          color="#06b6d4"
          icon={Users}
        />
        <StatCard
          label="DIS COMPLIANCE"
          value={`${compliancePct}%`}
          sub={`${submittedCount} / ${totalMembers} submitted today`}
          color={compliancePct >= 80 ? '#10b981' : compliancePct >= 50 ? '#f59e0b' : '#ef4444'}
          icon={FileText}
          change={compliancePct - 100}
          pulse={compliancePct < 100}
        />
        <StatCard
          label="TOP TEAM MTD"
          value={teamWatchlist[0] ? fmt(teamWatchlist[0].cur) : '$0'}
          sub={teamWatchlist[0]?.name || '—'}
          color="#f59e0b"
          icon={Target}
          change={teamWatchlist[0]?.chg}
        />
      </div>

      {/* ── MAIN GRID: Chart + Watchlist ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        gap: '20px',
        marginBottom: '20px',
        alignItems: 'stretch'
      }}>

        {/* Revenue Trend Area Chart */}
        <div className="terminal-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div style={{
                fontSize: '0.68rem', fontFamily: 'monospace', letterSpacing: '0.1em',
                color: '#475569', textTransform: 'uppercase', marginBottom: '4px'
              }}>
                REVENUE TREND
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f1f5f9' }}>
                12-Month Overview
              </div>
            </div>
            <div style={{
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: '6px', padding: '4px 12px',
              fontSize: '0.72rem', fontFamily: 'monospace', color: '#818cf8', fontWeight: '700'
            }}>
              ALL TEAMS
            </div>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueTrend} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#475569', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tickFormatter={v => fmt(v).replace('$', '')}
                tick={{ fill: '#475569', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={false} tickLine={false} width={44}
              />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine
                y={lastMonthRev} stroke="rgba(99,102,241,0.4)"
                strokeDasharray="6 3"
                label={{ value: 'LM', fill: '#6366f1', fontSize: 9, fontFamily: 'monospace' }}
              />
              <Area
                type="monotone" dataKey="total" name="Revenue"
                stroke="#6366f1" strokeWidth={2.5}
                fill="url(#revGrad)"
                dot={{ fill: '#6366f1', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#818cf8', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Team Watchlist */}
        <div className="terminal-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontSize: '0.68rem', fontFamily: 'monospace', letterSpacing: '0.1em',
              color: '#475569', textTransform: 'uppercase', marginBottom: '4px'
            }}>
              WATCHLIST
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f1f5f9' }}>
              Team Performance
            </div>
          </div>

          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 60px',
            padding: '6px 10px', marginBottom: '4px',
            fontSize: '0.65rem', fontFamily: 'monospace', color: '#334155',
            textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: '700'
          }}>
            <span>TEAM</span>
            <span style={{ textAlign: 'right' }}>MTD</span>
            <span style={{ textAlign: 'right' }}>MoM</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {teamWatchlist.map((team, i) => (
              <div
                key={team.id}
                className="watchlist-row"
                onClick={() => navigate('/admin/revenue')}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 60px',
                  padding: '10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '6px',
                    background: `${team.color}18`, border: `1px solid ${team.color}35`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: '800', fontFamily: 'monospace', color: team.color }}>
                      {team.name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.8rem', fontWeight: '600', color: '#e2e8f0',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {team.name}
                    </div>
                    <div style={{ fontSize: '0.67rem', color: '#475569', fontFamily: 'monospace' }}>
                      {team.memberCount} members
                    </div>
                  </div>
                </div>

                <div style={{
                  textAlign: 'right', fontSize: '0.82rem',
                  fontWeight: '700', fontFamily: 'monospace', color: '#f1f5f9'
                }}>
                  {fmt(team.cur)}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: '700', fontFamily: 'monospace',
                    color: pctColor(team.chg),
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px'
                  }}>
                    {team.chg > 0 ? <ArrowUpRight size={11} /> : team.chg < 0 ? <ArrowDownRight size={11} /> : <Minus size={11} />}
                    {Math.abs(team.chg).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}

            {teamWatchlist.length === 0 && (
              <div style={{ color: '#475569', fontSize: '0.8rem', textAlign: 'center', padding: '20px', fontFamily: 'monospace' }}>
                NO DATA
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SECOND ROW: Bar Chart + Pie Chart + DIS+Insights ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 300px 300px',
        gap: '20px',
        marginBottom: '20px',
        alignItems: 'start'
      }}>

        {/* Team Revenue Bar Chart (last 6 months) */}
        <div className="terminal-card" style={{ padding: '22px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontSize: '0.68rem', fontFamily: 'monospace', letterSpacing: '0.1em',
              color: '#475569', textTransform: 'uppercase', marginBottom: '4px'
            }}>
              TEAM BREAKDOWN
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f1f5f9' }}>
              Revenue by Team · Last 6 Months
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={teamMonthlyData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: '#475569', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tickFormatter={v => fmt(v).replace('$', '')}
                tick={{ fill: '#475569', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={false} tickLine={false} width={44}
              />
              <Tooltip content={<ChartTooltip />} />
              {teams.map((team, i) => (
                <Bar
                  key={team.id}
                  dataKey={team.name}
                  stackId="a"
                  fill={TEAM_COLORS[i % TEAM_COLORS.length]}
                  radius={i === teams.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '14px' }}>
            {teams.map((team, i) => (
              <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '2px',
                  background: TEAM_COLORS[i % TEAM_COLORS.length], flexShrink: 0
                }} />
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>
                  {team.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* MTD Revenue Share Pie Chart */}
        <div className="terminal-card" style={{ padding: '22px' }}>
          <div style={{ marginBottom: '8px' }}>
            <div style={{
              fontSize: '0.68rem', fontFamily: 'monospace', letterSpacing: '0.1em',
              color: '#475569', textTransform: 'uppercase', marginBottom: '4px'
            }}>
              MTD SHARE
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f1f5f9' }}>
              Revenue by Team
            </div>
          </div>

          {revenueShareData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={revenueShareData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {revenueShareData.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={entry.color} stroke="rgba(15,23,42,0.8)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div style={{
                          background: '#0f172a', border: '1px solid rgba(99,102,241,0.4)',
                          borderRadius: '8px', padding: '8px 12px', fontSize: '0.78rem'
                        }}>
                          <div style={{ color: payload[0].payload.color, fontWeight: '700' }}>{payload[0].name}</div>
                          <div style={{ color: '#e2e8f0', fontFamily: 'monospace', fontWeight: '700' }}>{fmt(payload[0].value)}</div>
                        </div>
                      ) : null
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                {revenueShareData.map((d, i) => {
                  const total = revenueShareData.reduce((s, x) => s + x.value, 0)
                  const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0'
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                      <span style={{ fontSize: '0.7rem', color: d.color, fontFamily: 'monospace', fontWeight: '700' }}>{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: '0.78rem', fontFamily: 'monospace' }}>
              NO DATA THIS MONTH
            </div>
          )}
        </div>

        {/* DIS Compliance + Insights column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* DIS Gauge */}
          <div className="terminal-card" style={{ padding: '20px' }}>
            <div style={{
              fontSize: '0.68rem', fontFamily: 'monospace', letterSpacing: '0.1em',
              color: '#475569', textTransform: 'uppercase', marginBottom: '14px'
            }}>
              DIS COMPLIANCE · TODAY
            </div>

            {/* Ring */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
              <div style={{ position: 'relative', width: '72px', height: '72px', flexShrink: 0 }}>
                <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
                  <circle
                    cx="36" cy="36" r="28" fill="none"
                    stroke={compliancePct >= 80 ? '#10b981' : compliancePct >= 50 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - compliancePct / 100)}`}
                    style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '0.85rem', fontWeight: '800',
                  fontFamily: 'monospace',
                  color: compliancePct >= 80 ? '#10b981' : compliancePct >= 50 ? '#f59e0b' : '#ef4444'
                }}>
                  {compliancePct}%
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#10b981', fontFamily: 'monospace', fontWeight: '600' }}>
                      ✓ {submittedCount}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#ef4444', fontFamily: 'monospace', fontWeight: '600' }}>
                      ✗ {missedCount}
                    </span>
                  </div>
                  <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${compliancePct}%`, borderRadius: '3px',
                      background: compliancePct >= 80 ? '#10b981' : compliancePct >= 50 ? '#f59e0b' : '#ef4444',
                      transition: 'width 0.5s ease-out'
                    }} />
                  </div>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#475569', fontFamily: 'monospace' }}>
                  {totalMembers} members total
                </div>
              </div>
            </div>

            <div
              onClick={() => navigate('/admin/dis')}
              style={{
                cursor: 'pointer', textAlign: 'center', padding: '8px',
                borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)',
                background: 'rgba(99,102,241,0.06)',
                fontSize: '0.72rem', color: '#818cf8', fontFamily: 'monospace',
                fontWeight: '600', letterSpacing: '0.05em',
                transition: 'background 0.15s, border-color 0.15s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(99,102,241,0.15)'
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.45)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(99,102,241,0.06)'
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'
              }}
            >
              VIEW DIS REPORTS →
            </div>
          </div>

          {/* Insights Feed */}
          <div className="terminal-card" style={{ padding: '20px', flex: 1 }}>
            <div style={{
              fontSize: '0.68rem', fontFamily: 'monospace', letterSpacing: '0.1em',
              color: '#475569', textTransform: 'uppercase', marginBottom: '14px',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <Activity size={12} />
              AI INSIGHTS
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {insights.map((ins, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '10px', alignItems: 'flex-start',
                  padding: '10px', borderRadius: '8px',
                  background: `${ins.color}08`,
                  border: `1px solid ${ins.color}20`,
                  animation: `fadeSlideIn 0.3s ease ${i * 0.08}s both`
                }}>
                  <ins.icon size={14} style={{ color: ins.color, flexShrink: 0, marginTop: '1px' }} />
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.5' }}>
                    {ins.text}
                  </span>
                </div>
              ))}

              {insights.length === 0 && (
                <div style={{ fontSize: '0.75rem', color: '#334155', fontFamily: 'monospace', textAlign: 'center', padding: '12px' }}>
                  NO SIGNALS DETECTED
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── QUICK NAV ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {[
          { label: 'DIS REPORTS',    sub: 'Audit submissions',          color: '#6366f1', path: '/admin/dis',       icon: FileText },
          { label: 'REVENUE',        sub: 'Targets & actuals',          color: '#10b981', path: '/admin/revenue',   icon: TrendingUp },
          { label: 'ANALYTICS',      sub: 'Performance trends',         color: '#f59e0b', path: '/admin/analytics', icon: Activity },
          { label: 'TEAMS',          sub: 'Rosters & members',          color: '#06b6d4', path: '/admin/teams',     icon: Users },
        ].map(item => (
          <div
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              background: 'rgba(15,23,42,0.8)',
              border: `1px solid rgba(255,255,255,0.05)`,
              borderRadius: '10px', padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', gap: '12px',
              backdropFilter: 'blur(8px)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = `${item.color}40`
              e.currentTarget.style.background = `${item.color}0a`
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
              e.currentTarget.style.background = 'rgba(15,23,42,0.8)'
              e.currentTarget.style.transform = 'none'
            }}
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: `${item.color}15`, border: `1px solid ${item.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <item.icon size={16} style={{ color: item.color }} />
            </div>
            <div>
              <div style={{
                fontSize: '0.72rem', fontWeight: '800', fontFamily: 'monospace',
                color: '#e2e8f0', letterSpacing: '0.05em'
              }}>
                {item.label}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '2px' }}>
                {item.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
