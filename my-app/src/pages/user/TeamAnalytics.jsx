import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar, 
  Award, 
  Clock, 
  Check, 
  Edit3, 
  AlertCircle,
  TrendingDown
} from 'lucide-react'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts'
import { getLastNMonths, formatRevenueMonthShort, sumEffectiveTargets } from '../../utils/revenueUtils'

const CHART_COLORS = [
  '#0071e3', // Apple Blue
  '#30d5c8', // iDEALAB Teal
  '#ff9500', // Apple Orange
  '#af52de', // Apple Purple
  '#ff2d55', // Apple Pink
  '#5ac8fa', // Apple Light Blue
  '#ffcc00', // Apple Yellow
  '#4cd964'  // Apple Green
]

export default function TeamAnalytics({ user }) {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [team, setTeam] = useState(null)
  const [accessDenied, setAccessDenied] = useState(false)
  
  // Data states
  const [teamMembers, setTeamMembers] = useState([])
  const [revenues, setRevenues] = useState([])
  const [targets, setTargets] = useState([])
  
  // User selections
  const [timeframe, setTimeframe] = useState('3m') // 'this_month', '2m', '3m', '6m', '12m', 'all_time'

  
  const getCurrentMonthStr = () => {
    const now = new Date()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    return `${now.getFullYear()}-${m}-01`
  }

  // Load profile & verify teamlead role
  useEffect(() => {
    if (!user) return
    async function loadTeamLeadProfile() {
      try {
        const { data: prof, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (error) throw error
        
        if (prof?.platform_role !== 'teamlead') {
          setAccessDenied(true)
          setLoading(false)
          return
        }
        
        setProfile(prof)
        
        if (prof.team_id) {
          const { data: tm } = await supabase
            .from('teams')
            .select('*')
            .eq('id', prof.team_id)
            .single()
          
          if (tm) setTeam(tm)
        }
      } catch (err) {
        console.error("Error loading team lead profile:", err)
        setAccessDenied(true)
      }
    }
    loadTeamLeadProfile()
  }, [user])

  // Load all team-scoped data
  useEffect(() => {
    if (!profile?.team_id) return
    
    async function loadTeamData() {
      setLoading(true)
      try {
        // 1. Fetch team members (excluding admins)
        const { data: members, error: memError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, platform_role')
          .eq('team_id', profile.team_id)
        
        if (memError) throw memError
        const nonAdminMembers = (members || []).filter(m => m.platform_role !== 'admin')
        setTeamMembers(nonAdminMembers)
        
        const memberUserIds = nonAdminMembers.map(m => m.id)
        
        // 2. Fetch monthly revenues for this team
        const { data: revs, error: revError } = await supabase
          .from('monthly_revenues')
          .select('*')
          .eq('team_id', profile.team_id)
        
        if (revError) throw revError
        setRevenues(revs || [])
        
        // 3. Fetch targets for this team
        const { data: targs, error: tError } = await supabase
          .from('monthly_targets')
          .select('*')
          .eq('team_id', profile.team_id)
        
        if (tError) throw tError
        setTargets(targs || [])
        
      } catch (err) {
        console.error("Error fetching team analytics data:", err)
      } finally {
        setLoading(false)
      }
    }
    
    loadTeamData()
  }, [profile])



  // 1. Performance Overview calculations (Current month actual vs target)
  const currentMonthStats = useMemo(() => {
    const currentMonth = getCurrentMonthStr()
    
    // Actual MTD Revenue for the team
    const actualRevenues = revenues.filter(r => r.revenue_month === currentMonth)
    const totalActual = actualRevenues.reduce((sum, r) => sum + Number(r.amount || 0), 0)
    
    // Assigned Target (sum of effective targets for team members for the current month)
    const memberUserIds = teamMembers.map(m => m.id)
    const totalExpected = sumEffectiveTargets(targets, memberUserIds, profile?.team_id, currentMonth)
    
    return {
      totalActual,
      totalExpected,
      monthLabel: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
  }, [revenues, targets, teamMembers, profile])

  // 2. Trend Line Data based on selected timeframe
  const trendData = useMemo(() => {
    if (timeframe === 'this_month') {
      const currentMonth = getCurrentMonthStr()
      const currentMonthRevs = revenues.filter(r => r.revenue_month === currentMonth)
      return [1, 2, 3, 4].map(wk => {
        const wkRevs = currentMonthRevs.filter(r => r.week_number === wk)
        const sum = wkRevs.reduce((acc, r) => acc + Number(r.amount || 0), 0)
        return {
          label: `Week ${wk}`,
          revenue: sum
        }
      })
    } else {
      let months = []
      if (timeframe === '2m') months = getLastNMonths(2).reverse()
      else if (timeframe === '3m') months = getLastNMonths(3).reverse()
      else if (timeframe === '6m') months = getLastNMonths(6).reverse()
      else if (timeframe === '12m') months = getLastNMonths(12).reverse()
      else {
        const uniqueMonths = [...new Set(revenues.map(r => r.revenue_month))]
        months = uniqueMonths.sort()
        if (months.length === 0) {
          months = getLastNMonths(6).reverse()
        }
      }
      return months.map(mStr => {
        const monthRevs = revenues.filter(r => r.revenue_month === mStr)
        const sum = monthRevs.reduce((acc, r) => acc + Number(r.amount || 0), 0)
        return {
          label: formatRevenueMonthShort(mStr),
          revenue: sum,
          monthStr: mStr
        }
      })
    }
  }, [revenues, timeframe])

  // 3. Pie Chart Data: Member Contribution shares
  const pieData = useMemo(() => {
    let targetMonths = []
    if (timeframe === 'this_month') {
      targetMonths = [getCurrentMonthStr()]
    } else if (timeframe === '2m') {
      targetMonths = getLastNMonths(2)
    } else if (timeframe === '3m') {
      targetMonths = getLastNMonths(3)
    } else if (timeframe === '6m') {
      targetMonths = getLastNMonths(6)
    } else if (timeframe === '12m') {
      targetMonths = getLastNMonths(12)
    } else {
      targetMonths = [...new Set(revenues.map(r => r.revenue_month))]
    }
    
    const monthSet = new Set(targetMonths)
    const filteredRevs = revenues.filter(r => monthSet.has(r.revenue_month))
    
    const userTotals = {}
    filteredRevs.forEach(r => {
      userTotals[r.user_id] = (userTotals[r.user_id] || 0) + Number(r.amount || 0)
    })
    
    return teamMembers.map(member => {
      const value = userTotals[member.id] || 0
      return {
        name: `${member.first_name} ${member.last_name}`,
        value
      }
    }).filter(d => d.value > 0)
  }, [revenues, teamMembers, timeframe])

  const totalPieSum = useMemo(() => pieData.reduce((s, d) => s + d.value, 0), [pieData])

  // 4. Team Members Averages
  const memberAverages = useMemo(() => {
    let divisor = 1
    let periodType = 'month'
    let targetMonths = []
    
    if (timeframe === 'this_month') {
      targetMonths = [getCurrentMonthStr()]
      divisor = 4
      periodType = 'week'
    } else {
      let n = 1
      if (timeframe === '2m') n = 2
      else if (timeframe === '3m') n = 3
      else if (timeframe === '6m') n = 6
      else if (timeframe === '12m') n = 12
      else {
        const uniqueMonths = [...new Set(revenues.map(r => r.revenue_month))]
        n = Math.max(1, uniqueMonths.length)
      }
      targetMonths = timeframe === 'all_time' ? [...new Set(revenues.map(r => r.revenue_month))] : getLastNMonths(n)
      divisor = n
    }
    
    const monthSet = new Set(targetMonths)
    const filteredRevs = revenues.filter(r => monthSet.has(r.revenue_month))
    
    return teamMembers.map(member => {
      const memberRevs = filteredRevs.filter(r => r.user_id === member.id)
      const total = memberRevs.reduce((sum, r) => sum + Number(r.amount || 0), 0)
      const average = total / divisor
      
      return {
        id: member.id,
        name: `${member.first_name} ${member.last_name}`,
        email: member.email,
        total,
        average,
        periodType
      }
    }).sort((a, b) => b.total - a.total)
  }, [revenues, teamMembers, timeframe])



  if (accessDenied) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '24px' }}>🔒</div>
        <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Access Denied</h2>
        <p style={{ color: 'var(--apple-text-secondary)', fontSize: '1.2rem', maxWidth: '500px', margin: '0 auto' }}>
          This analytics workspace is strictly restricted to Team Leads. If you believe this is an error, please contact your administrator.
        </p>
      </div>
    )
  }

  if (loading && !profile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#fff' }}>
        Loading Team Lead Analytics...
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* Premium Header */}
      <div style={{ marginBottom: 'clamp(24px, 5vw, 40px)' }}>
        <div className="apple-kicker">Team Roster Dashboard</div>
        <h1 className="apple-title-large">Team Analytics</h1>
        <p className="apple-lead">
          Monitor revenue trends, contributions, and DIS logging compliance for <strong>{team?.name || 'Your Team'}</strong>.
        </p>
      </div>

      {/* PERFORMANCE OVERVIEW CARDS (Always for current month) */}
      <div className="apple-two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
        {/* Actual Revenue Card */}
        <div className="apple-card" style={{ 
          background: 'linear-gradient(135deg, rgba(48, 213, 200, 0.08) 0%, rgba(30, 41, 59, 0.4) 100%)', 
          borderColor: 'rgba(48, 213, 200, 0.25)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '130px'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--apple-text-secondary)' }}>
              Actual Team Revenue (MTD)
            </span>
            <div style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: '800', color: 'var(--apple-accent-green)', marginTop: '8px' }}>
              ${currentMonthStats.totalActual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <DollarSign size={14} style={{ color: 'var(--apple-accent-green)' }} />
            <span>Finalized logs for {currentMonthStats.monthLabel}</span>
          </div>
        </div>

        {/* Team Target Card */}
        <div className="apple-card" style={{ 
          background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.08) 0%, rgba(30, 41, 59, 0.4) 100%)', 
          borderColor: 'rgba(0, 113, 227, 0.25)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '130px'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--apple-text-secondary)' }}>
              Team Target (MTD)
            </span>
            <div style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: '800', color: '#0071e3', marginTop: '8px' }}>
              ${currentMonthStats.totalExpected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} style={{ color: '#0071e3' }} />
            <span>Assigned targets for {currentMonthStats.monthLabel}</span>
          </div>
        </div>
      </div>

      {/* PERFORMANCE INSIGHTS CONTAINER CARD */}
      <div className="apple-card" style={{ marginBottom: '32px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--apple-border)', paddingBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>Performance Insights</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--apple-text-secondary)' }}>
              Analyze trend progression and breakdown contribution details.
            </p>
          </div>
          
          {/* Timeframe Selector Pill */}
          <div className="apple-pill-tabs" style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '4px' }}>
            {[
              { label: 'This Month', value: 'this_month' },
              { label: '2M', value: '2m' },
              { label: '3M', value: '3m' },
              { label: '6M', value: '6m' },
              { label: '12M', value: '12m' },
              { label: 'All Time', value: 'all_time' }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setTimeframe(opt.value)}
                className={`apple-pill-tab ${timeframe === opt.value ? 'active' : ''}`}
                style={{ fontSize: '0.78rem', padding: '5px 12px' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inner Grid for Charts */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', 
          gap: '24px'
        }}>
          {/* Trend Line Chart */}
          <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#fff' }}>Team Revenue Trend</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>
                {timeframe === 'this_month' ? 'Weekly sales performance for this billing cycle' : 'Chronological sales progression over the selected timeframe'}
              </p>
            </div>
            
            {trendData.every(d => d.revenue === 0) ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '280px', color: 'var(--apple-text-secondary)', fontSize: '0.9rem' }}>
                No revenue records logged in this period.
              </div>
            ) : (
              <div style={{ width: '100%', height: '280px' }}>
                <ResponsiveContainer>
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="teamTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#30d5c8" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#30d5c8" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      stroke="var(--apple-text-secondary)" 
                      tick={{ fill: 'var(--apple-text-secondary)', fontSize: '0.75rem' }}
                      axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="var(--apple-text-secondary)" 
                      tick={{ fill: 'var(--apple-text-secondary)', fontSize: '0.75rem' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `$${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                    />
                    <RechartsTooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div style={{
                              background: 'rgba(15, 23, 42, 0.95)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              padding: '10px 14px',
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                            }}>
                              <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: 'var(--apple-text-secondary)', fontWeight: '600' }}>{label}</p>
                              <p style={{ margin: 0, fontSize: '0.9rem', color: '#30d5c8', fontWeight: '700' }}>
                                Revenue: ${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#30d5c8" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#teamTrendGrad)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Contributions Pie Chart */}
          <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#fff' }}>Member Contributions</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>
                Actual revenue split among active team members.
              </p>
            </div>
            
            {pieData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '280px', color: 'var(--apple-text-secondary)', fontSize: '0.9rem' }}>
                No contribution data in this timeframe.
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', height: '280px', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 180px', height: '100%', minWidth: '150px' }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="rgba(0,0,0,0.3)"
                        strokeWidth={1}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legend with direct percentages */}
                <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '100%', overflowY: 'auto' }}>
                  {pieData.map((item, idx) => {
                    const pct = totalPieSum > 0 ? ((item.value / totalPieSum) * 100).toFixed(1) : '0.0'
                    const color = CHART_COLORS[idx % CHART_COLORS.length]
                    return (
                      <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', gap: '8px', fontSize: '0.82rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ flex: 1, color: 'var(--apple-text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.name}</span>
                        <span style={{ fontWeight: '700', color: '#fff' }}>${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        <span style={{ fontSize: '0.7rem', color, background: `${color}15`, padding: '1px 5px', borderRadius: '4px', minWidth: '38px', textAlign: 'center' }}>
                          {pct}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TEAM MEMBER AVERAGES CARDS */}
      <div className="apple-card" style={{ marginBottom: '32px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#fff' }}>Performance Averages</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--apple-text-secondary)' }}>
            Average revenue contributions per member for the selected timeframe ({timeframe === 'this_month' ? 'This Month' : timeframe.toUpperCase()}).
          </p>
        </div>

        {memberAverages.length === 0 ? (
          <p style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.9rem' }}>No team members found.</p>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
            gap: '16px' 
          }}>
            {memberAverages.map((row, idx) => {
              const initials = row.name.split(' ').map(n => n[0]).join('').toUpperCase()
              const pct = totalPieSum > 0 ? ((row.total / totalPieSum) * 100).toFixed(1) : '0.0'
              const color = CHART_COLORS[idx % CHART_COLORS.length]
              
              return (
                <div key={row.id} className="apple-card" style={{ 
                  padding: '20px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  background: 'rgba(255, 255, 255, 0.01)', 
                  border: '1px solid var(--apple-border)',
                  borderRadius: '14px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Color accent strip at the top */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: color }} />
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                      width: '36px', 
                      height: '36px', 
                      borderRadius: '50%', 
                      background: `${color}15`, 
                      color: color, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: '700'
                    }}>
                      {initials}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.9rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{row.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{row.email}</div>
                    </div>
                  </div>

                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Avg Revenue / {row.periodType}
                    </span>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#30d5c8' }}>
                      ${row.average.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginTop: '4px' }}>
                    <span style={{ color: 'var(--apple-text-secondary)' }}>Total: <strong>${row.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></span>
                    <span style={{ fontSize: '0.7rem', color, background: `${color}12`, padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                      {pct}% share
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
