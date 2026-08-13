import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import {
  sumRevenues,
  normalizeMonth,
  getLastNMonths,
  formatRevenueMonthShort,
  getEffectiveTargetAmount
} from '../../utils/revenueUtils'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import {
  TrendingUp, Target, FileText, Activity, DollarSign, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react'

/* ─── tiny helpers ─────────────────────────────────────────────────────────── */
const fmtFull = (n) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const pctColor = (v) => (v > 0 ? '#34d399' : v < 0 ? '#ff453a' : '#86868b')
const pctBg   = (v) => (v > 0 ? 'rgba(52,211,153,0.12)' : v < 0 ? 'rgba(255,69,58,0.12)' : 'rgba(255,255,255,0.05)')
const pctBorder= (v) => (v > 0 ? 'rgba(52,211,153,0.25)' : v < 0 ? 'rgba(255,69,58,0.25)' : 'rgba(255,255,255,0.08)')

let globalHomeCache = {
  userId: null,
  profile: null,
  userTeams: [],
  userRevenues: [],
  userTargets: [],
  disReports: [],
  revenueLogs: [],
  latestAnnouncement: null
}

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

export default function UserHome({ user, isAdminView }) {
  const [profile, setProfile] = useState(globalHomeCache.profile)
  const [userTeams, setUserTeams] = useState(globalHomeCache.userTeams)
  const [userRevenues, setUserRevenues] = useState(globalHomeCache.userRevenues)
  const [userTargets, setUserTargets] = useState(globalHomeCache.userTargets)
  const [disReports, setDisReports] = useState(globalHomeCache.disReports)
  const [revenueLogs, setRevenueLogs] = useState(globalHomeCache.revenueLogs)
  const [latestAnnouncement, setLatestAnnouncement] = useState(globalHomeCache.latestAnnouncement)
  const [loading, setLoading] = useState(globalHomeCache.userId !== user?.id)

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return

      try {
        const [profileRes, revRes, reportsRes, annRes, targetsRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('monthly_revenues').select('*').eq('user_id', user.id),
          supabase.from('dis_reports').select('*').eq('user_id', user.id).order('report_date', { ascending: false }).limit(5),
          supabase.from('announcements').select('*').eq('status', 'published').order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(1),
          supabase.from('monthly_targets').select('*').eq('user_id', user.id)
        ])
        
        if (profileRes.data) {
          setProfile(profileRes.data)
          globalHomeCache.profile = profileRes.data
          
          if (profileRes.data.team_id) {
            const { data: teamData } = await supabase
              .from('teams')
              .select('*')
              .eq('id', profileRes.data.team_id)
              .single()
            
            if (teamData) {
              const uTeams = [{
                id: teamData.id,
                name: teamData.name,
                role: profileRes.data.platform_role === 'teamlead' ? 'lead' : 'member'
              }]
              setUserTeams(uTeams)
              globalHomeCache.userTeams = uTeams
            }
          }
        }

        if (revRes.data) {
          setUserRevenues(revRes.data)
          globalHomeCache.userRevenues = revRes.data
        }
        
        if (reportsRes.data) {
          setDisReports(reportsRes.data)
          globalHomeCache.disReports = reportsRes.data
        }

        if (targetsRes.data) {
          setUserTargets(targetsRes.data)
          globalHomeCache.userTargets = targetsRes.data
        }
        
        if (annRes.data && annRes.data.length > 0) {
          setLatestAnnouncement(annRes.data[0])
          globalHomeCache.latestAnnouncement = annRes.data[0]
        }
        
        globalHomeCache.userId = user.id
        
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  // Calculate current month's revenue sum
  const thisMonthRevenue = useMemo(() => {
    const now = new Date()
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const currentRevs = userRevenues.filter(r => normalizeMonth(r.revenue_month) === monthStr)
    return sumRevenues(currentRevs)
  }, [userRevenues])

  // Calculate last month's revenue sum (for % change)
  const lastMonthRevenue = useMemo(() => {
    const now = new Date()
    now.setMonth(now.getMonth() - 1)
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const currentRevs = userRevenues.filter(r => normalizeMonth(r.revenue_month) === monthStr)
    return sumRevenues(currentRevs)
  }, [userRevenues])

  const revenueChange = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : undefined

  // Calculate all-time revenue sum
  const allTimeRevenue = useMemo(() => {
    return sumRevenues(userRevenues)
  }, [userRevenues])

  const thisMonthTarget = useMemo(() => {
    const now = new Date()
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    return userTeams.reduce((sum, team) => {
      return sum + getEffectiveTargetAmount(userTargets, user?.id, team.id, monthStr)
    }, 0)
  }, [userTargets, userTeams, user])

  const targetAchievement = useMemo(() => {
    if (thisMonthTarget <= 0) return 0
    return (thisMonthRevenue / thisMonthTarget) * 100
  }, [thisMonthRevenue, thisMonthTarget])

  const targetHistory = useMemo(() => {
    return getLastNMonths(6).map(month => {
      const expected = userTeams.reduce((sum, team) => {
        return sum + getEffectiveTargetAmount(userTargets, user?.id, team.id, month)
      }, 0)
      const reached = userRevenues
        .filter(r => normalizeMonth(r.revenue_month) === month)
        .reduce((sum, r) => sum + Number(r.amount || 0), 0)
      return { 
        name: formatRevenueMonthShort(month).split(" '")[0], 
        expected, 
        reached 
      }
    }).reverse() // Reverse so left to right = oldest to newest
  }, [userTargets, userRevenues, userTeams, user])

  const recentRevenues = useMemo(() => {
    return [...userRevenues].sort((a, b) => new Date(b.created_at || b.revenue_month) - new Date(a.created_at || a.revenue_month)).slice(0, 5)
  }, [userRevenues])

  if (loading) return <div style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading your dashboard...</div>

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* Premium Header */}
      <div style={{ marginBottom: 'clamp(24px, 5vw, 32px)' }}>
        <div className="apple-kicker">Performance Center</div>
        <h1 className="apple-title-large">
          {isAdminView 
            ? `Dashboard: ${profile?.first_name || user?.user_metadata?.full_name || 'Member'}` 
            : `Welcome, ${profile?.first_name || user?.user_metadata?.full_name || 'Member'}!`}
        </h1>
        <p className="apple-lead">
          {isAdminView 
            ? `Detailed metrics, team assignments, and target achievements.` 
            : `Here is your personal overview of revenue, metrics, and recent activity.`}
        </p>
      </div>

      {/* KPI Stat Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '20px',
        marginBottom: '24px'
      }}>
        {profile?.has_revenue_logging !== false && (
          <>
            <StatCard 
              label="This Month's Revenue"
              value={fmtFull(thisMonthRevenue)}
              sub={`vs ${fmtFull(lastMonthRevenue)} last month`}
              color="var(--apple-accent-blue)"
              icon={DollarSign}
              change={revenueChange}
              pulse={false}
            />
            <StatCard 
              label="Target Achievement"
              value={`${targetAchievement.toFixed(1)}%`}
              sub={`Goal: ${fmtFull(thisMonthTarget)}`}
              color={targetAchievement >= 100 ? 'var(--apple-accent-green)' : 'var(--apple-accent-orange)'}
              icon={Target}
              pulse={targetAchievement >= 100}
            />
            <StatCard 
              label="Total All-Time Revenue"
              value={fmtFull(allTimeRevenue)}
              sub="Across all tracked months"
              color="var(--apple-accent-purple)"
              icon={TrendingUp}
            />
          </>
        )}
        
        {profile?.has_revenue_logging === false && profile?.has_dis_reporting !== false && (
          <StatCard 
            label="Latest DIS Submission"
            value={disReports.length > 0 ? new Date(disReports[0].report_date).toLocaleDateString(undefined, { timeZone: 'UTC' }) : 'No Reports'}
            sub={disReports.length > 0 ? `Expected Rev: ${fmtFull(Number(disReports[0].expected_revenue))}` : 'Get started'}
            color="var(--apple-accent-blue)"
            icon={FileText}
          />
        )}
      </div>

      {/* Middle Section: Charts and Announcements */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
          
          {profile?.has_revenue_logging !== false && (
            <div className="apple-card" style={{ height: '360px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 className="apple-title-small" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} style={{ color: 'var(--apple-accent-blue)' }}/>
                  Revenue Performance
                </h2>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', fontWeight: '600' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--apple-text-primary)' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'url(#colorReached)' }} />
                    Reached
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--apple-text-secondary)' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'transparent', border: '2px solid rgba(255,255,255,0.2)' }} />
                    Target
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={targetHistory} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReached" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0071e3" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#0071e3" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--apple-border)" opacity={0.5} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'var(--apple-text-secondary)', fontSize: 11 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'var(--apple-text-secondary)', fontSize: 11 }}
                      tickFormatter={(val) => `$${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="expected" 
                      name="Target"
                      stroke="rgba(255,255,255,0.2)" 
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fill="transparent" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="reached" 
                      name="Reached"
                      stroke="#0071e3" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorReached)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {latestAnnouncement && (
            <div className="apple-card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--apple-accent-blue)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 className="apple-title-small" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📢 Latest Announcement
                  {latestAnnouncement.is_pinned && <span style={{ fontSize: '0.7rem', background: 'var(--apple-accent-orange)', color: '#fff', padding: '2px 6px', borderRadius: '8px' }}>Pinned</span>}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>
                  {new Date(latestAnnouncement.created_at).toLocaleDateString()}
                </span>
              </div>
              <div style={{ fontWeight: '600', color: '#fff', marginBottom: '8px', fontSize: '1.05rem' }}>
                {latestAnnouncement.title}
              </div>
              <div 
                style={{ 
                  color: 'var(--apple-text-secondary)', fontSize: '0.9rem', lineHeight: '1.5',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                }}
                dangerouslySetInnerHTML={{ __html: latestAnnouncement.content.replace(/<[^>]+>/g, '') }}
              />
              <Link to="/announcements" className="apple-btn apple-btn-secondary" style={{ marginTop: '16px', width: '100%', padding: '10px !important' }}>
                Read Full Announcement
              </Link>
            </div>
          )}

        </div>

      {/* Bottom Section: Activity Feeds */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
          
          {profile?.has_revenue_logging !== false && (
            <div className="apple-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="apple-title-small" style={{ margin: 0 }}>Recent Revenue</h2>
                {!isAdminView && (
                  <Link to="/revenue" className="apple-btn apple-btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem', position: 'relative', zIndex: 10, pointerEvents: 'auto' }}>
                    + Log Revenue
                  </Link>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentRevenues.length > 0 ? recentRevenues.map(log => (
                  <div key={log.id} style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--apple-border)'
                  }}>
                    <div>
                      <div style={{ color: '#fff', fontWeight: '600', fontSize: '0.9rem', marginBottom: '2px' }}>
                        {log.client_name || log.source || 'Revenue Entry'}
                      </div>
                      <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.75rem' }}>
                        {log.created_at ? new Date(log.created_at).toLocaleDateString() : log.revenue_month}
                      </div>
                    </div>
                    <div style={{ color: 'var(--apple-accent-green)', fontWeight: '700', fontSize: '1rem' }}>
                      +${Number(log.amount).toFixed(2)}
                    </div>
                  </div>
                )) : (
                  <div style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', fontSize: '0.9rem', textAlign: 'center', padding: '20px' }}>
                    No recent revenue logged.
                  </div>
                )}
              </div>
            </div>
          )}

          {profile?.has_dis_reporting !== false && (
            <div className="apple-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="apple-title-small" style={{ margin: 0 }}>Recent DIS Reports</h2>
                {!isAdminView && (
                  <Link to="/dis" className="apple-btn apple-btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem', position: 'relative', zIndex: 10, pointerEvents: 'auto' }}>
                    + Submit DIS
                  </Link>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {disReports.length > 0 ? disReports.map(report => (
                  <div key={report.id} style={{ 
                    padding: '12px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--apple-border)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#fff', fontWeight: '600', fontSize: '0.9rem' }}>
                        {new Date(report.report_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                      </span>
                      <span style={{ color: 'var(--apple-text-secondary)', fontSize: '0.8rem' }}>
                        Leads: <span style={{ color: 'var(--apple-accent-orange)', fontWeight: '700' }}>{report.positive_leads}</span>
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--apple-text-secondary)', fontSize: '0.8rem' }}>Expected Rev</span>
                      <span style={{ color: 'var(--apple-accent-blue)', fontWeight: '700', fontSize: '0.9rem' }}>
                        ${Number(report.expected_revenue).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', fontSize: '0.9rem', textAlign: 'center', padding: '20px' }}>
                    No recent DIS reports.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
    </div>
  )
}
