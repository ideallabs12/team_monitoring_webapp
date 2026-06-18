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
import ThemeSwitch from '../../components/ThemeSwitch'
import { getSystemTheme, setSystemTheme } from '../../utils/themeHelper'

/* ─── tiny helpers ─────────────────────────────────────────────────────────── */
const fmt = (n) =>
  n >= 1000
    ? `$${(n / 1000).toFixed(1)}k`
    : `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`

const fmtFull = (n) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const pctColor = (v) => (v > 0 ? '#34d399' : v < 0 ? '#ff453a' : '#86868b')
const pctBg   = (v) => (v > 0 ? 'rgba(52,211,153,0.12)' : v < 0 ? 'rgba(255,69,58,0.12)' : 'rgba(255,255,255,0.05)')
const pctBorder= (v) => (v > 0 ? 'rgba(52,211,153,0.25)' : v < 0 ? 'rgba(255,69,58,0.25)' : 'rgba(255,255,255,0.08)')

const TEAM_COLORS = ['#0071e3', '#30d5c8', '#ff9f0a', '#af52de', '#ff2d55', '#ffcc00', '#5ac8fa']

let adminHomeCache = { loaded: false, teams: [], profiles: [], revenues: [], targets: [], disReports: [] }

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
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--apple-text-primary)', display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
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
      background: 'var(--apple-card)',
      borderBottom: '1px solid var(--apple-border)',
      padding: '10px 0',
      whiteSpace: 'nowrap',
      userSelect: 'none',
      backdropFilter: 'blur(20px)'
    }}>
      <div ref={ref} style={{ display: 'inline-flex', gap: '0' }}>
        {doubled.map((item, i) => (
          <div key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '0 28px', borderRight: '1px solid var(--apple-border)'
          }}>
            <span style={{
              fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.08em',
              color: item.color, fontFamily: 'monospace'
            }}>
              {item.ticker}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-primary)', fontFamily: 'monospace', fontWeight: '600' }}>
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
      background: 'var(--apple-card)',
      border: '1px solid var(--apple-border)',
      borderRadius: '18px',
      padding: '22px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      transition: 'transform 0.3s var(--apple-ease), border-color 0.3s var(--apple-ease)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)'
      e.currentTarget.style.borderColor = 'var(--apple-border-strong)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'none'
      e.currentTarget.style.borderColor = 'var(--apple-border)'
    }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <span style={{
          fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em',
          color: 'var(--apple-text-secondary)', fontWeight: '600'
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
        fontSize: '2rem', fontWeight: '700', color: 'var(--apple-text-primary)',
        letterSpacing: '-0.02em', marginBottom: '6px'
      }}>
        {value}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--apple-text-secondary)' }}>{sub}</span>
        {change !== undefined && (
          <span style={{
            fontSize: '0.75rem', fontWeight: '600',
            color: pctColor(change),
            background: pctBg(change),
            border: `1px solid ${pctBorder(change)}`,
            borderRadius: '20px', padding: '2px 10px',
            display: 'flex', alignItems: 'center', gap: '3px'
          }}>
            {change > 0 ? <ArrowUpRight size={12} /> : change < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
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
  const [theme, setTheme]         = useState(getSystemTheme)
  const navigate = useNavigate()

  useEffect(() => {
    const handleThemeChange = () => setTheme(getSystemTheme())
    window.addEventListener('theme-change', handleThemeChange)
    return () => window.removeEventListener('theme-change', handleThemeChange)
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setSystemTheme(nextTheme)
  }

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

  /* Top 5 performers list this month */
  const topPerformersList = useMemo(() => {
    return nonAdminProfiles.map(p => {
      const amount = sumRevenues(revenues.filter(r => r.user_id === p.id && normalizeMonth(r.revenue_month) === currentMonthStr))
      return { ...p, amount }
    })
    .filter(p => p.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
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
    <div style={{ fontFamily: "var(--apple-font)" }}>
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
          background: var(--apple-card);
          border: 1px solid var(--apple-border);
          border-radius: 18px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          transition: border-color 0.3s var(--apple-ease), box-shadow 0.3s var(--apple-ease);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.4);
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          overflow: hidden;
        }
        .terminal-card:hover {
          border-color: var(--apple-border-strong);
          box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
        }
        .watchlist-row:hover { background: rgba(255, 255, 255, 0.03) !important; }

        /* Responsive Grid layouts */
        .admin-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
          width: 100%;
          min-width: 0;
        }
        .admin-grid-top {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 20px;
          margin-bottom: 20px;
          align-items: stretch;
          width: 100%;
          min-width: 0;
        }
        .admin-grid-bottom {
          display: grid;
          grid-template-columns: 1fr 300px 300px;
          gap: 20px;
          margin-bottom: 20px;
          align-items: stretch;
          width: 100%;
          min-width: 0;
        }
        .admin-quick-nav-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          width: 100%;
          min-width: 0;
        }

        /* Ensure direct grid items can shrink */
        .admin-stats-grid > *,
        .admin-grid-top > *,
        .admin-grid-bottom > *,
        .admin-quick-nav-grid > * {
          min-width: 0;
        }

        .admin-ticker-container {
          margin: -36px -40px 24px -40px;
        }
        
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 0 20px 0;
          border-bottom: 1px solid var(--apple-border);
          margin-bottom: 24px;
        }

        @media (max-width: 1200px) {
          .admin-grid-top {
            grid-template-columns: 1fr;
          }
          .admin-grid-bottom {
            grid-template-columns: 1fr 1fr;
          }
          .admin-grid-bottom > :first-child {
            grid-column: span 2;
          }
        }
        
        @media (max-width: 900px) {
          .admin-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .admin-grid-bottom {
            grid-template-columns: 1fr;
          }
          .admin-grid-bottom > :first-child {
            grid-column: span 1;
          }
          .admin-quick-nav-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .admin-ticker-container {
            margin: -24px -20px 20px -20px;
          }
        }

        @media (max-width: 600px) {
          .admin-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .admin-header > div:last-child {
            text-align: left !important;
          }
        }

        @media (max-width: 580px) {
          .admin-stats-grid {
            grid-template-columns: 1fr;
          }
          .admin-quick-nav-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* ── TICKER TAPE ── */}
      <div className="admin-ticker-container">
        <TickerTape items={tickerItems} />
      </div>

      {/* ── HEADER ── */}
      <div className="admin-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%', background: '#34d399',
              boxShadow: '0 0 8px #34d399'
            }} />
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700', color: 'var(--apple-text-primary)', letterSpacing: '-0.02em' }}>
              Admin Dashboard
            </h1>
            <span className="apple-badge apple-badge-blue" style={{ fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ADMIN
            </span>
          </div>
          <p style={{ margin: '4px 0 0 18px', color: 'var(--apple-text-secondary)', fontSize: '0.85rem' }}>
            Real-time performance monitoring · {teams.length} teams · {totalMembers} members
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--apple-text-primary)', letterSpacing: '0.02em', textAlign: 'right' }}>
              {clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--apple-text-secondary)', marginTop: '4px', textAlign: 'right' }}>
              {clock.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <div style={{ '--toggle-size': '8px', display: 'flex', alignItems: 'center', height: '100%' }}>
            <ThemeSwitch theme={theme} toggleTheme={toggleTheme} />
          </div>
        </div>
      </div>

      {/* ── TOP STAT CARDS ── */}
      <div className="admin-stats-grid">
        <StatCard
          label="MTD REVENUE"
          value={fmt(mtdRevenue)}
          sub="Month-to-date · all teams"
          color="var(--apple-accent-blue)"
          icon={TrendingUp}
          change={momChange}
          pulse
        />
        <StatCard
          label="ACTIVE MEMBERS"
          value={totalMembers}
          sub={`across ${teams.length} teams`}
          color="var(--apple-accent-green)"
          icon={Users}
        />
        <StatCard
          label="DIS COMPLIANCE"
          value={`${compliancePct}%`}
          sub={`${submittedCount} / ${totalMembers} submitted today`}
          color={compliancePct >= 80 ? 'var(--apple-accent-green-solid)' : compliancePct >= 50 ? 'var(--apple-accent-orange)' : 'var(--apple-accent-red)'}
          icon={FileText}
          change={compliancePct - 100}
          pulse={compliancePct < 100}
        />
        <StatCard
          label="TOP TEAM MTD"
          value={teamWatchlist[0] ? fmt(teamWatchlist[0].cur) : '$0'}
          sub={teamWatchlist[0]?.name || '—'}
          color="var(--apple-accent-orange)"
          icon={Target}
          change={teamWatchlist[0]?.chg}
        />
      </div>

      {/* ── MAIN GRID: Chart + Watchlist ── */}
      <div className="admin-grid-top">
        {/* Left Column: Revenue Trend + Top Contributors */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
          {/* Revenue Trend Area Chart */}
          <div className="terminal-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{
                  fontSize: '0.72rem',
                  color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '4px',
                  fontWeight: '600'
                }}>
                  REVENUE TREND
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--apple-text-primary)', letterSpacing: '-0.01em' }}>
                  12-Month Overview
                </div>
              </div>
              <span className="apple-badge apple-badge-blue" style={{ fontSize: '0.7rem', fontWeight: '600' }}>
                ALL TEAMS
              </span>
            </div>

            <div style={{ flex: 1, minHeight: '240px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--apple-accent-blue)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--apple-accent-blue)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'var(--apple-text-secondary)', fontSize: 11 }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tickFormatter={v => fmt(v).replace('$', '')}
                    tick={{ fill: 'var(--apple-text-secondary)', fontSize: 10 }}
                    axisLine={false} tickLine={false} width={44}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine
                    y={lastMonthRev} stroke="rgba(255,255,255,0.15)"
                    strokeDasharray="4 4"
                    label={{ value: 'LM', fill: 'var(--apple-text-secondary)', fontSize: 9 }}
                  />
                  <Area
                    type="monotone" dataKey="total" name="Revenue"
                    stroke="var(--apple-accent-blue)" strokeWidth={3}
                    fill="url(#revGrad)"
                    dot={{ fill: 'var(--apple-accent-blue)', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#fff', stroke: 'var(--apple-accent-blue)', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Performers Leaderboard Card */}
          <div className="terminal-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{
                  fontSize: '0.72rem',
                  color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '4px',
                  fontWeight: '600'
                }}>
                  LEADERBOARD
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--apple-text-primary)', letterSpacing: '-0.01em' }}>
                  Top Contributors this Month
                </div>
              </div>
              <span className="apple-badge apple-badge-green" style={{ fontSize: '0.7rem', fontWeight: '600' }}>
                REVENUE
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {topPerformersList.map((p, index) => {
                const teamName = teams.find(t => t.id === p.team_id)?.name || 'No Team'
                const initials = `${p.first_name?.[0] || ''}${p.last_name?.[0] || ''}`.toUpperCase()
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: index < topPerformersList.length - 1 ? '1px solid var(--apple-border)' : 'none' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--apple-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: '700', color: 'var(--apple-text-primary)'
                    }}>
                      {index + 1}
                    </div>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, var(--apple-accent-blue), #30d5c8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.9rem', fontWeight: '700', color: 'white', flexShrink: 0
                    }}>
                      {initials || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--apple-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.first_name} {p.last_name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {teamName}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--apple-accent-green)' }}>
                      ${p.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                )
              })}
              {topPerformersList.length === 0 && (
                <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.8rem', textAlign: 'center', padding: '20px' }}>
                  No active revenue contributions logged this month.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Team Watchlist */}
        <div className="terminal-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontSize: '0.72rem',
              color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '4px',
              fontWeight: '600'
            }}>
              WATCHLIST
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--apple-text-primary)', letterSpacing: '-0.01em' }}>
              Team Performance
            </div>
          </div>

          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 60px',
            padding: '6px 10px', marginBottom: '4px',
            fontSize: '0.72rem', color: 'var(--apple-text-secondary)',
            textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600'
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
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'background 0.15s var(--apple-ease)',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    background: `${team.color}15`, border: `1px solid ${team.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: '700', color: team.color }}>
                      {team.name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.85rem', fontWeight: '600', color: 'var(--apple-text-primary)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {team.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)' }}>
                      {team.memberCount} members
                    </div>
                  </div>
                </div>

                <div style={{
                  textAlign: 'right', fontSize: '0.85rem',
                  fontWeight: '700', color: 'var(--apple-text-primary)'
                }}>
                  {fmt(team.cur)}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: '600',
                    color: pctColor(team.chg),
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px'
                  }}>
                    {team.chg > 0 ? <ArrowUpRight size={12} /> : team.chg < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
                    {Math.abs(team.chg).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}

            {teamWatchlist.length === 0 && (
              <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.8rem', textAlign: 'center', padding: '20px' }}>
                NO DATA
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SECOND ROW: Bar Chart + Pie Chart + DIS+Insights ── */}
      <div className="admin-grid-bottom">

        {/* Team Revenue Bar Chart (last 6 months) */}
        <div className="terminal-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontSize: '0.72rem',
              color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '4px',
              fontWeight: '600'
            }}>
              TEAM BREAKDOWN
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--apple-text-primary)', letterSpacing: '-0.01em' }}>
              Revenue by Team · Last 6 Months
            </div>
          </div>

          <div style={{ flex: 1, minHeight: '220px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamMonthlyData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'var(--apple-text-secondary)', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tickFormatter={v => fmt(v).replace('$', '')}
                  tick={{ fill: 'var(--apple-text-secondary)', fontSize: 10 }}
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
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '14px' }}>
            {teams.map((team, i) => (
              <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '2px',
                  background: TEAM_COLORS[i % TEAM_COLORS.length], flexShrink: 0
                }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)' }}>
                  {team.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* MTD Revenue Share Pie Chart */}
        <div className="terminal-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '8px' }}>
            <div style={{
              fontSize: '0.72rem',
              color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '4px',
              fontWeight: '600'
            }}>
              MTD SHARE
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--apple-text-primary)', letterSpacing: '-0.01em' }}>
              Revenue by Team
            </div>
          </div>

          {revenueShareData.length > 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ flex: 1, minHeight: '200px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
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
                        <Cell key={`cell-${i}`} fill={entry.color} stroke="var(--apple-card)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) =>
                        active && payload?.length ? (
                          <div style={{
                            background: 'var(--apple-card-bg)', border: '1px solid var(--apple-border)',
                            borderRadius: '12px', padding: '10px 14px', fontSize: '0.78rem',
                            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)', backdropFilter: 'blur(20px)'
                          }}>
                            <div style={{ color: payload[0].payload.color, fontWeight: '700' }}>{payload[0].name}</div>
                            <div style={{ color: 'var(--apple-text-primary)', fontWeight: '700', marginTop: '4px' }}>{fmt(payload[0].value)}</div>
                          </div>
                        ) : null
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                {revenueShareData.map((d, i) => {
                  const total = revenueShareData.reduce((s, x) => s + x.value, 0)
                  const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0'
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                      <span style={{ fontSize: '0.72rem', color: d.color, fontWeight: '700' }}>{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--apple-text-secondary)', fontSize: '0.78rem' }}>
              NO DATA THIS MONTH
            </div>
          )}
        </div>

        {/* DIS Compliance + Insights column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>

          {/* DIS Gauge */}
          <div className="terminal-card" style={{ padding: '20px' }}>
            <div style={{
              fontSize: '0.72rem',
              color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '14px',
              fontWeight: '600'
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
                    stroke={compliancePct >= 80 ? 'var(--apple-accent-green-solid)' : compliancePct >= 50 ? 'var(--apple-accent-orange)' : 'var(--apple-accent-red)'}
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
                  color: compliancePct >= 80 ? 'var(--apple-accent-green-solid)' : compliancePct >= 50 ? 'var(--apple-accent-orange)' : 'var(--apple-accent-red)'
                }}>
                  {compliancePct}%
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--apple-accent-green-solid)', fontWeight: '600' }}>
                      ✓ {submittedCount}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--apple-accent-red)', fontWeight: '600' }}>
                      ✗ {missedCount}
                    </span>
                  </div>
                  <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${compliancePct}%`, borderRadius: '3px',
                      background: compliancePct >= 80 ? 'var(--apple-accent-green-solid)' : compliancePct >= 50 ? 'var(--apple-accent-orange)' : 'var(--apple-accent-red)',
                      transition: 'width 0.5s ease-out'
                    }} />
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)' }}>
                  {totalMembers} members total
                </div>
              </div>
            </div>

            <div
              onClick={() => navigate('/admin/dis')}
              style={{
                cursor: 'pointer', textAlign: 'center', padding: '10px',
                borderRadius: '12px', border: '1px solid var(--apple-border)',
                background: 'rgba(255, 255, 255, 0.04)',
                fontSize: '0.78rem', color: '#ffffff',
                fontWeight: '600', letterSpacing: '0.02em',
                transition: 'all 0.2s var(--apple-ease)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.borderColor = 'var(--apple-border-strong)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                e.currentTarget.style.borderColor = 'var(--apple-border)'
              }}
            >
              VIEW DIS REPORTS →
            </div>
          </div>

          {/* Insights Feed */}
          <div className="terminal-card" style={{ padding: '20px', flex: 1 }}>
            <div style={{
              fontSize: '0.72rem',
              color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '14px',
              display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600'
            }}>
              <Activity size={12} />
              AI INSIGHTS
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {insights.map((ins, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '10px', alignItems: 'flex-start',
                  padding: '12px', borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid var(--apple-border)',
                  animation: `fadeSlideIn 0.3s ease ${i * 0.08}s both`
                }}>
                  <ins.icon size={14} style={{ color: ins.color, flexShrink: 0, marginTop: '1px' }} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--apple-text-secondary)', lineHeight: '1.5' }}>
                    {ins.text}
                  </span>
                </div>
              ))}

              {insights.length === 0 && (
                <div style={{ fontSize: '0.78rem', color: 'var(--apple-text-secondary)', textAlign: 'center', padding: '12px' }}>
                  NO SIGNALS DETECTED
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── QUICK NAV ── */}
      <div className="admin-quick-nav-grid">
        {[
          { label: 'DIS REPORTS',    sub: 'Audit submissions',          color: 'var(--apple-accent-blue)', path: '/admin/dis',       icon: FileText },
          { label: 'REVENUE',        sub: 'Targets & actuals',          color: 'var(--apple-accent-green)', path: '/admin/revenue',   icon: TrendingUp },
          { label: 'ANALYTICS',      sub: 'Performance trends',         color: 'var(--apple-accent-orange)', path: '/admin/analytics', icon: Activity },
          { label: 'TEAMS',          sub: 'Rosters & members',          color: 'var(--apple-accent-blue)', path: '/admin/teams',     icon: Users },
        ].map(item => (
          <div
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              background: 'var(--apple-card)',
              border: `1px solid var(--apple-border)`,
              borderRadius: '14px', padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.25s var(--apple-ease)',
              display: 'flex', alignItems: 'center', gap: '12px'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--apple-border-strong)'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--apple-border)'
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: `${item.color}12`, border: `1px solid ${item.color}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <item.icon size={16} style={{ color: item.color }} />
            </div>
            <div>
              <div style={{
                fontSize: '0.8rem', fontWeight: '700',
                color: 'var(--apple-text-primary)', letterSpacing: '0.02em'
              }}>
                {item.label}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>
                {item.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
