import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import {
  normalizeMonth,
  filterRevenuesByPeriod,
  sumRevenues,
  getLastNMonths,
  formatRevenueMonth,
  toRevenueMonthString,
  formatRevenueMonthShort
} from '../../utils/revenueUtils'
import UserRevenue from '../user/UserRevenue'
import { ArrowLeft, Users, TrendingUp, Mail, Phone, Calendar, Shield, FileText, Activity } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'

let adminTeamsCache = { loaded: false, teams: [], profiles: [], revenues: [] }

const ChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)'
      }}>
        <p style={{ color: 'var(--apple-text-secondary)', fontSize: '0.75rem', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
        <p style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>
          ${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

export default function AdminTeams() {
  const [loading, setLoading] = useState(!adminTeamsCache.loaded)
  const [teams, setTeams] = useState(adminTeamsCache.teams)
  const [profiles, setProfiles] = useState(adminTeamsCache.profiles)
  const [revenues, setRevenues] = useState(adminTeamsCache.revenues)
  
  // Navigation & Detail States
  const [activeTeam, setActiveTeam] = useState(null) // selected team object for detail view
  const [viewingProfileUser, setViewingProfileUser] = useState(null) // selected user profile object for profile view

  // User Profile DIS history state
  const [disReports, setDisReports] = useState([])
  const [loadingDis, setLoadingDis] = useState(false)

  // Month picker for revenue column – default to current month
  const now = new Date()
  const [selectedRevenueMonth, setSelectedRevenueMonth] = useState(
    toRevenueMonthString(now.getFullYear(), now.getMonth())
  )

  useEffect(() => {
    async function loadData() {
      const [teamsRes, profilesRes, revRes] = await Promise.all([
        supabase.from('teams').select('*').order('created_at', { ascending: true }),
        supabase.from('profiles').select('*'),
        supabase.from('monthly_revenues').select('*')
      ])

      const t = teamsRes.data || []
      const p = profilesRes.data || []
      const r = revRes.data || []

      setTeams(t)
      setProfiles(p)
      setRevenues(r)
      
      adminTeamsCache = { loaded: true, teams: t, profiles: p, revenues: r }
        
      setLoading(false)
    }
    loadData()

    // Real-time subscription: keep revenues fresh
    const sub = supabase
      .channel('admin-teams-revenues')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_revenues' }, async () => {
        const { data } = await supabase.from('monthly_revenues').select('*')
        if (data) {
          setRevenues(data)
          adminTeamsCache = { ...adminTeamsCache, revenues: data }
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [])

  // Load DIS Reports for user profile dynamically
  useEffect(() => {
    if (!viewingProfileUser) {
      setDisReports([])
      return
    }

    async function fetchUserDis() {
      setLoadingDis(true)
      try {
        const { data, error } = await supabase
          .from('dis_reports')
          .select('*')
          .eq('user_id', viewingProfileUser.id)
          .order('report_date', { ascending: false })
          .limit(6)
        if (data) setDisReports(data)
      } catch (err) {
        console.error("Error loading user DIS reports:", err)
      } finally {
        setLoadingDis(false)
      }
    }
    fetchUserDis()
  }, [viewingProfileUser])

  // Build list of months available for picker (last 24 months)
  const monthOptions = useMemo(() => getLastNMonths(24), [])

  // Find the primary team this user belongs to
  const memberTeam = useMemo(() => {
    if (!viewingProfileUser || !viewingProfileUser.team_id) return null
    const team = teams.find(t => t.id === viewingProfileUser.team_id)
    return team ? { name: team.name, id: team.id } : null
  }, [viewingProfileUser, teams])

  // Find secondary teams this user belongs to
  const memberSecondaryTeams = useMemo(() => {
    if (!viewingProfileUser || !viewingProfileUser.secondary_team_roles) return []
    return teams.filter(t => Object.keys(viewingProfileUser.secondary_team_roles).includes(t.id))
  }, [viewingProfileUser, teams])

  // Current Month String
  const currentMonthStr = useMemo(() => {
    const d = new Date()
    return toRevenueMonthString(d.getFullYear(), d.getMonth())
  }, [])

  // -- TEAM PROFILE TREND DATA (Calculated for activeTeam) --
  const [trendPeriod, setTrendPeriod] = useState(12) // 2, 3, 6, or 12 months
  const team12MonthsStr = useMemo(() => getLastNMonths(12).reverse(), [])
  const teamTrendData = useMemo(() => {
    if (!activeTeam) return []
    return team12MonthsStr.map(m => {
      const total = revenues
        .filter(r => r.team_id === activeTeam.id && normalizeMonth(r.revenue_month) === m)
        .reduce((sum, r) => sum + Number(r.amount || 0), 0)
      return { month: formatRevenueMonthShort(m), total, key: m }
    })
  }, [revenues, activeTeam, team12MonthsStr])

  // Filtered trend data for chart based on selected period
  const teamTrendFiltered = useMemo(() => {
    return teamTrendData.slice(-trendPeriod)
  }, [teamTrendData, trendPeriod])

  const team12MonthTotal = useMemo(() => {
    return teamTrendData.reduce((sum, d) => sum + d.total, 0)
  }, [teamTrendData])

  const teamMonthlyAvg = team12MonthTotal / 12

  // Max monthly revenue (for bar proportions in breakdown grid)
  const teamMaxMonthRevenue = useMemo(() => {
    return Math.max(...teamTrendData.map(d => d.total), 1)
  }, [teamTrendData])

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>Loading teams ledger...</div>

  // ==========================================
  // VIEW 1: MEMBER PROFILE VIEW (2-column layout)
  // ==========================================
  if (viewingProfileUser) {
    return (
      <div style={{ animation: 'fadeIn 0.3s var(--apple-ease)', paddingBottom: '60px' }}>
        {/* Back navigation left top hero section */}
        <button
          onClick={() => setViewingProfileUser(null)}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--apple-border)',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '28px',
            transition: 'all 0.25s var(--apple-ease)'
          }}
          className="apple-btn-secondary"
        >
          <ArrowLeft size={16} /> Back to Members
        </button>

        {/* Full-width stacked rows: Profile → Latest DIS → Revenue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* ROW 1: My Profile Card */}
          <div className="apple-card" style={{ padding: '24px !important' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0071e3, #30d5c8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: '#fff'
              }}>
                {viewingProfileUser.first_name?.[0]?.toUpperCase() || 'M'}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', fontWeight: '700' }}>
                  {viewingProfileUser.first_name} {viewingProfileUser.last_name}
                </h3>
                <div style={{ paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Primary Team</span>
                <p style={{ margin: '4px 0 0 0', color: '#fff', fontWeight: '500' }}>
                  {memberTeam ? memberTeam.name : <span style={{ fontStyle: 'italic', color: 'var(--apple-text-secondary)' }}>Unassigned</span>}
                </p>
              </div>
              
              <div style={{ paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Secondary Teams</span>
                <p style={{ margin: '4px 0 0 0', color: '#fff', fontWeight: '500' }}>
                  {memberSecondaryTeams.length > 0 ? memberSecondaryTeams.map(t => `${t.name} (${viewingProfileUser.secondary_team_roles[t.id]})`).join(', ') : <span style={{ fontStyle: 'italic', color: 'var(--apple-text-secondary)' }}>None</span>}
                </p>
              </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>
                  {viewingProfileUser.platform_role || 'Member'}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ borderBottom: '1px solid var(--apple-border)', paddingBottom: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '2px', fontWeight: '500' }}>
                  <Mail size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Email Address
                </div>
                <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '500' }}>{viewingProfileUser.email}</div>
              </div>

              <div style={{ borderBottom: '1px solid var(--apple-border)', paddingBottom: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '2px', fontWeight: '500' }}>
                  <Phone size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Phone Number
                </div>
                <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '500' }}>{viewingProfileUser.phone || '—'}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '500' }}>
                  Team Assignments
                </div>
                {memberTeam ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <span
                      className={viewingProfileUser.platform_role === 'teamlead' ? 'apple-badge apple-badge-orange' : 'apple-badge apple-badge-blue'}
                      style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                    >
                      {memberTeam.name} ({viewingProfileUser.platform_role === 'teamlead' ? 'lead' : 'member'})
                    </span>
                  </div>
                ) : (
                  <span style={{ fontStyle: 'italic', color: 'var(--apple-text-secondary)', fontSize: '0.85rem' }}>
                    No team assigned
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ROW 2: Latest DIS Reports */}
          <div className="apple-card" style={{ padding: '24px !important' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <FileText size={18} style={{ color: 'var(--apple-accent-orange)' }} />
              <h3 className="apple-title-small" style={{ margin: 0 }}>Latest Daily DIS</h3>
            </div>

            {loadingDis ? (
              <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.88rem' }}>Loading DIS reports...</div>
            ) : disReports.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {disReports.map(rep => (
                  <div
                    key={rep.id}
                    style={{
                      padding: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--apple-border)',
                      borderRadius: '10px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: '600' }}>
                      <span style={{ color: '#fff' }}>
                        {new Date(rep.report_date).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}
                      </span>
                      <span style={{ color: 'var(--apple-accent-green)' }}>
                        + {rep.positive_leads} Leads
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--apple-text-secondary)', fontSize: '0.78rem' }}>
                      <span>Exp Revenue:</span>
                      <span style={{ color: '#fff', fontWeight: '500' }}>${Number(rep.expected_revenue).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.85rem' }}>
                No DIS entries submitted yet.
              </p>
            )}
          </div>

          {/* ROW 3: Revenue (full width) */}
          <div>
            <UserRevenue user={viewingProfileUser} isAdminView={true} />
          </div>

        </div>
      </div>
    )
  }

  // ==========================================
  // VIEW 2: TEAM MEMBERS DETAILS VIEW
  // ==========================================
  if (activeTeam) {
    const activeProfiles = profiles
      .filter(p => {
        const settings = p.team_settings || {}
        return settings[activeTeam.id] && p.platform_role !== 'admin' && !p.is_deactivated
      })
      .sort((a, b) => {
        const aIsLead = a.team_settings?.[activeTeam.id]?.role === 'teamlead'
        const bIsLead = b.team_settings?.[activeTeam.id]?.role === 'teamlead'
        if (aIsLead && !bIsLead) return -1
        if (!aIsLead && bIsLead) return 1
        return 0
      })

    const activeProfileIds = new Set(activeProfiles.map(p => p.id))

    // Historical profiles: non-admins who are NOT currently active in this team
    const historicalProfilesUnfiltered = profiles
      .filter(p => p.platform_role !== 'admin' && !activeProfileIds.has(p.id))

    return (
      <div style={{ animation: 'fadeIn 0.25s var(--apple-ease)' }}>
        {/* Back navigation left top hero section */}
        <button
          onClick={() => setActiveTeam(null)}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--apple-border)',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '28px',
            transition: 'all 0.25s var(--apple-ease)'
          }}
          className="apple-btn-secondary"
        >
          <ArrowLeft size={16} /> Back to Teams
        </button>

        <div style={{ marginBottom: '32px' }}>
          <span className="apple-kicker">Team Profile</span>
          <h2 className="apple-title-medium" style={{ textTransform: 'capitalize' }}>
            {activeTeam.name}
          </h2>
          <p style={{ color: 'var(--apple-text-secondary)', fontSize: '0.95rem', margin: '4px 0 0 0' }}>
            Review role hierarchy, 12-month performance, and member revenue contributions.
          </p>
        </div>

        {/* --- TEAM PERFORMANCE SUMMARY & TREND --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>

          {/* 12-Month Breakdown Grid */}
          <div className="apple-card" style={{ padding: '24px !important' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px', fontWeight: '600' }}>Monthly Revenue</div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: '700' }}>Last 12 Months Breakdown</h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', marginBottom: '2px' }}>12-Month Total</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--apple-accent-blue)', letterSpacing: '-0.02em' }}>
                  ${team12MonthTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>

            {/* Month grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
              {teamTrendData.map((d, i) => {
                const pct = teamMaxMonthRevenue > 0 ? (d.total / teamMaxMonthRevenue) * 100 : 0
                const isCurrentMonth = i === teamTrendData.length - 1
                return (
                  <div key={d.key} style={{
                    background: isCurrentMonth ? 'rgba(0, 113, 227, 0.08)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isCurrentMonth ? 'rgba(0, 113, 227, 0.25)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '10px',
                    padding: '12px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--apple-text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {d.month}
                      {isCurrentMonth && (
                        <span style={{ marginLeft: '4px', fontSize: '0.6rem', background: 'rgba(0,113,227,0.2)', color: 'var(--apple-accent-blue)', padding: '1px 4px', borderRadius: '3px' }}>MTD</span>
                      )}
                    </div>
                    {/* Mini progress bar */}
                    <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: d.total > 0 ? 'var(--apple-accent-blue)' : 'transparent',
                        borderRadius: '2px',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                    <div style={{
                      fontSize: '0.88rem',
                      fontWeight: '700',
                      color: d.total > 0 ? '#fff' : 'rgba(255,255,255,0.2)'
                    }}>
                      {d.total > 0
                        ? `$${d.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '—'}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Summary row */}
            <div style={{ display: 'flex', gap: '24px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', marginBottom: '2px' }}>Monthly Average</div>
                <div style={{ fontSize: '1rem', fontWeight: '600', color: '#fff' }}>
                  ${teamMonthlyAvg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', marginBottom: '2px' }}>Active Members</div>
                <div style={{ fontSize: '1rem', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Users size={14} color="var(--apple-text-secondary)" /> {activeProfiles.length}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', marginBottom: '2px' }}>Best Month</div>
                <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--apple-accent-green)' }}>
                  {teamTrendData.length > 0 ? (() => {
                    const best = teamTrendData.reduce((a, b) => b.total > a.total ? b : a)
                    return best.total > 0
                      ? `${best.month} ($${best.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` 
                      : '—'
                  })() : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Trend Line Card */}
          <div className="apple-card" style={{ padding: '24px !important', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="var(--apple-text-secondary)" />
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff', fontWeight: '600' }}>Performance Trend</h3>
              </div>
              {/* Period filter pills */}
              <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px' }}>
                {[{ label: '2M', value: 2 }, { label: '3M', value: 3 }, { label: '6M', value: 6 }, { label: '12M', value: 12 }].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTrendPeriod(opt.value)}
                    style={{
                      padding: '5px 14px',
                      borderRadius: '7px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      transition: 'all 0.15s ease',
                      background: trendPeriod === opt.value ? 'var(--apple-accent-blue)' : 'transparent',
                      color: trendPeriod === opt.value ? '#fff' : 'var(--apple-text-secondary)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ height: '260px' }}>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={teamTrendFiltered} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="teamTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--apple-accent-blue)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--apple-accent-blue)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'var(--apple-text-secondary)', fontSize: 11 }}
                    axisLine={false} 
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    tickFormatter={(val) => `$${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val.toFixed(0)}`}
                    tick={{ fill: 'var(--apple-text-secondary)', fontSize: 10 }}
                    axisLine={false} 
                    tickLine={false}
                    dx={-4}
                    width={60}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  {teamMonthlyAvg > 0 && (
                    <ReferenceLine 
                      y={teamMonthlyAvg} 
                      stroke="rgba(255,255,255,0.15)" 
                      strokeDasharray="4 4"
                    />
                  )}
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="var(--apple-accent-blue)" 
                    strokeWidth={3}
                    fill="url(#teamTrendGrad)" 
                    activeDot={{ r: 6, fill: '#fff', stroke: 'var(--apple-accent-blue)', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Month + Year Filter — combined in one row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          marginBottom: '28px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px',
          padding: '14px 20px',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
            Viewing revenue for
          </span>
          <select
            value={selectedRevenueMonth.substring(5, 7)}
            onChange={e => {
              const year = selectedRevenueMonth.substring(0, 4)
              setSelectedRevenueMonth(`${year}-${e.target.value}-01`)
            }}
            className="apple-form-control"
            style={{ padding: '6px 14px', fontSize: '0.88rem', width: 'auto', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
          >
            {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => (
              <option key={m} value={m}>
                {['January','February','March','April','May','June','July','August','September','October','November','December'][i]}
              </option>
            ))}
          </select>
          <select
            value={selectedRevenueMonth.substring(0, 4)}
            onChange={e => {
              const month = selectedRevenueMonth.substring(5, 7)
              setSelectedRevenueMonth(`${e.target.value}-${month}-01`)
            }}
            className="apple-form-control"
            style={{ padding: '6px 14px', fontSize: '0.88rem', width: 'auto', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Member cards */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff', fontWeight: '700' }}>
              Active Members
              <span style={{ marginLeft: '8px', fontSize: '0.75rem', fontWeight: '500', color: 'var(--apple-text-secondary)' }}>({activeProfiles.length})</span>
            </h4>
          </div>

          {activeProfiles.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {activeProfiles.map(profile => {
                const monthRevenue = revenues
                  .filter(r => r.user_id === profile.id && r.team_id === activeTeam.id && normalizeMonth(r.revenue_month) === normalizeMonth(selectedRevenueMonth))
                  .reduce((sum, r) => sum + Number(r.amount || 0), 0)
                const isLead = profile.team_settings?.[activeTeam.id]?.role === 'teamlead'
                const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()

                return (
                  <div
                    key={profile.id}
                    className="apple-card"
                    style={{
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      border: isLead ? '1px solid rgba(255,160,0,0.2)' : '1px solid rgba(255,255,255,0.07)',
                      background: isLead ? 'rgba(255,160,0,0.03)' : 'rgba(255,255,255,0.02)',
                      borderRadius: '16px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Top row: avatar + name/email + role badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                        background: isLead
                          ? 'linear-gradient(135deg, rgba(255,160,0,0.25), rgba(255,100,0,0.15))'
                          : 'linear-gradient(135deg, rgba(0,113,227,0.25), rgba(48,213,200,0.15))',
                        border: isLead ? '1px solid rgba(255,160,0,0.3)' : '1px solid rgba(0,113,227,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem', fontWeight: '700',
                        color: isLead ? '#ffa000' : 'var(--apple-accent-blue)'
                      }}>
                        {initials || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {profile.first_name} {profile.last_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                          {profile.email}
                        </div>
                      </div>
                      <span className={isLead ? 'apple-badge apple-badge-orange' : 'apple-badge apple-badge-blue'}
                        style={{ fontSize: '0.65rem', padding: '2px 8px', flexShrink: 0 }}>
                        {isLead ? 'Lead' : 'Member'}
                      </span>
                    </div>

                    {/* Revenue row */}
                    <div style={{
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      paddingTop: '12px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>Revenue</div>
                        <div style={{
                          fontSize: '1.15rem', fontWeight: '700',
                          color: monthRevenue > 0 ? 'var(--apple-accent-green)' : 'rgba(255,255,255,0.2)'
                        }}>
                          ${monthRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <button
                        onClick={() => setViewingProfileUser(profile)}
                        style={{
                          padding: '7px 16px',
                          borderRadius: '10px',
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: 'rgba(255,255,255,0.06)',
                          color: '#fff',
                          fontSize: '0.78rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                      >
                        View Profile →
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--apple-text-secondary)', fontSize: '0.9rem' }}>
              No active members in this team.
            </div>
          )}
        </div>

        {/* Historical Members (only those with revenue this month) */}
        {(() => {
          const historicalWithRevenue = historicalProfilesUnfiltered.map(profile => {
            const monthRevenue = revenues
              .filter(r => r.user_id === profile.id && r.team_id === activeTeam.id && normalizeMonth(r.revenue_month) === normalizeMonth(selectedRevenueMonth))
              .reduce((sum, r) => sum + Number(r.amount || 0), 0)
            return { ...profile, monthRevenue }
          }).filter(p => p.monthRevenue > 0)

          if (historicalWithRevenue.length === 0) return null

          return (
            <div style={{ marginTop: '28px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--apple-text-secondary)', fontWeight: '700' }}>
                Historical Members
                <span style={{ marginLeft: '8px', fontSize: '0.75rem', fontWeight: '500' }}>({historicalWithRevenue.length})</span>
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px', opacity: 0.8 }}>
                {historicalWithRevenue.map(profile => {
                  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()
                  return (
                    <div
                      key={profile.id}
                      style={{
                        padding: '20px',
                        display: 'flex', flexDirection: 'column', gap: '14px',
                        border: '1px dashed rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.015)',
                        borderRadius: '16px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1rem', fontWeight: '700', color: 'var(--apple-text-secondary)'
                        }}>
                          {initials || '?'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '700', color: 'var(--apple-text-secondary)', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {profile.first_name} {profile.last_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px', opacity: 0.7 }}>
                            {profile.email}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '5px', background: 'rgba(255,255,255,0.08)', color: 'var(--apple-text-secondary)', flexShrink: 0 }}>
                          {profile.is_deactivated ? 'Former' : 'Transferred'}
                        </span>
                      </div>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>Revenue</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--apple-text-secondary)' }}>
                            ${profile.monthRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                        <button
                          onClick={() => setViewingProfileUser(profile)}
                          style={{
                            padding: '7px 16px', borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'transparent', color: 'var(--apple-text-secondary)',
                            fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', opacity: 0.8
                          }}
                        >
                          View Profile →
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>
    )
  }

  // ==========================================
  // VIEW 3: TEAMS CARD SUMMARY VIEW (Default view)
  // ==========================================
  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* Header */}
      <div style={{ marginBottom: 'clamp(24px, 5vw, 40px)' }}>
        <div className="apple-kicker">Platform Organization</div>
        <h1 className="apple-title-large">Manage Teams</h1>
        <p className="apple-lead">
          View organizational team cards, analyze member sizes, and track current month contributions.
        </p>
      </div>

      {/* Grid of Team Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', width: '100%' }}>
        {teams.length > 0 ? (
          teams.map(team => {
            // Count total members (excluding platform admins and deactivated)
            const teamMemberCount = profiles.filter(p => 
              (p.team_id === team.id || (p.secondary_team_ids || []).includes(team.id)) && p.platform_role !== 'admin' && !p.is_deactivated
            ).length

            // Sum this month's revenue
            const teamThisMonthRevenues = revenues.filter(
              r => r.team_id === team.id && normalizeMonth(r.revenue_month) === currentMonthStr
            )
            const teamThisMonthTotal = teamThisMonthRevenues.reduce((sum, r) => sum + Number(r.amount || 0), 0)

            return (
              <div
                key={team.id}
                onClick={() => setActiveTeam(team)}
                className="apple-card"
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  background: 'var(--apple-card) !important',
                  padding: '24px !important',
                  position: 'relative'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', fontWeight: '700', textTransform: 'capitalize' }}>
                    {team.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', color: 'var(--apple-text-secondary)', fontSize: '0.85rem' }}>
                    <Users size={14} />
                    <span>{teamMemberCount} {teamMemberCount === 1 ? 'member' : 'members'}</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--apple-border)', paddingTop: '14px', marginTop: 'auto' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                    <TrendingUp size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> This Month Revenue
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: teamThisMonthTotal > 0 ? 'var(--apple-accent-green)' : '#fff' }}>
                    ${teamThisMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="apple-card" style={{ textAlign: 'center', padding: '40px !important', gridColumn: '1 / -1' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '12px' }}>👥</span>
            <p style={{ color: 'var(--apple-text-secondary)', margin: 0 }}>No teams found in the database. Add teams in Settings.</p>
          </div>
        )}
      </div>
    </div>
  )
}
