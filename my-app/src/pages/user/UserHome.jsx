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

export default function UserHome({ user, isAdminView }) {
  const [profile, setProfile] = useState(null)
  const [userTeams, setUserTeams] = useState([])
  const [userRevenues, setUserRevenues] = useState([])
  const [userTargets, setUserTargets] = useState([])
  const [latestReport, setLatestReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return

      try {
        const [profileRes, teamsRes, revRes, reportsRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('team_members').select('team_role, teams(id, name)').eq('user_id', user.id),
          supabase.from('monthly_revenues').select('*').eq('user_id', user.id),
          supabase.from('dis_reports').select('*').eq('user_id', user.id).order('report_date', { ascending: false }).limit(1)
        ])
        
        if (profileRes.data) setProfile(profileRes.data)
        if (teamsRes.data) {
          const formatted = teamsRes.data.map(tm => ({
            id: tm.teams?.id,
            name: tm.teams?.name || 'Unnamed Team',
            role: tm.team_role
          }))
          setUserTeams(formatted)
        }
        if (revRes.data) setUserRevenues(revRes.data)
        if (reportsRes.data && reportsRes.data.length > 0) setLatestReport(reportsRes.data[0])

        // Keep page working even if monthly_targets table is not migrated yet.
        const { data: targetsData, error: targetsError } = await supabase
          .from('monthly_targets')
          .select('*')
          .eq('user_id', user.id)
        if (!targetsError && targetsData) setUserTargets(targetsData)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  // Calculate current month's revenue sum across all user's teams
  const thisMonthRevenue = useMemo(() => {
    const now = new Date()
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const currentRevs = userRevenues.filter(r => normalizeMonth(r.revenue_month) === monthStr)
    return sumRevenues(currentRevs)
  }, [userRevenues])

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
      return { month, expected, reached }
    })
  }, [userTargets, userRevenues, userTeams, user])

  if (loading) return <div style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading your dashboard...</div>

  return (
    <div>
      <div className="dashboard-header" style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>
          {isAdminView ? `Dashboard for ${profile?.first_name || user?.user_metadata?.full_name || 'User'}` : `Welcome, ${profile?.first_name || user?.user_metadata?.full_name || 'User'}!`}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          {isAdminView ? `Overview of teams, performance, and actions.` : `Here is an overview of your teams, performance, and actions.`}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* LEFT COLUMN: Profile & Teams Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 1: My Profile & Teams */}
          <div className="card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '24px', color: '#fff' }}>My Profile</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Email Address</div>
                <div style={{ fontSize: '1.05rem', fontWeight: '500' }}>{profile?.email || user?.email}</div>
              </div>
              
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Phone Number</div>
                <div style={{ fontSize: '1.05rem', fontWeight: '500' }}>{profile?.phone || 'Not provided'}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>My Active Teams</div>
                {userTeams.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {userTeams.map(t => (
                      <span key={t.id} style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        background: t.role === 'lead' ? 'rgba(234, 179, 8, 0.12)' : 'rgba(74, 222, 128, 0.12)',
                        border: t.role === 'lead' ? '1px solid rgba(234, 179, 8, 0.25)' : '1px solid rgba(74, 222, 128, 0.25)',
                        fontSize: '0.8rem',
                        color: t.role === 'lead' ? '#eab308' : '#4ade80',
                        textTransform: 'capitalize',
                        fontWeight: '500'
                      }}>
                        {t.name} ({t.role})
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    No Teams Assigned (Please contact Admin)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Quick Actions */}
          {!isAdminView && (
            <div className="card" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', color: '#fff' }}>Quick Actions</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Link to="/dis" className="btn" style={{ textAlign: 'center', padding: '12px 8px', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
                  <span style={{ fontSize: '1.4rem' }}>📝</span>
                  Submit Daily DIS
                </Link>
                <Link to="/revenue" className="btn" style={{ textAlign: 'center', padding: '12px 8px', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', justifyContent: 'center', background: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.2)', color: '#4ade80' }}>
                  <span style={{ fontSize: '1.4rem' }}>💰</span>
                  Submit Revenue
                </Link>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Statistics & Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 3: Revenue Metrics */}
          <div className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h3 style={{ fontSize: '1.4rem', margin: 0, color: '#fff' }}>Revenue Summary</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>This Month (All Teams)</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#4ade80' }}>
                  ${thisMonthRevenue.toFixed(2)}
                </div>
              </div>
              
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>All Time Total</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fff' }}>
                  ${allTimeRevenue.toFixed(2)}
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.04)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monthly Target (All Teams)</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#60a5fa' }}>${thisMonthTarget.toFixed(2)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reached vs Target</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: targetAchievement >= 100 ? '#4ade80' : '#fbbf24' }}>
                    {thisMonthTarget > 0 ? `${targetAchievement.toFixed(1)}%` : 'No target'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                Target vs Reached (Last 6 Months)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
                {targetHistory.map(row => (
                  <div key={row.month} style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{formatRevenueMonthShort(row.month)}</div>
                    <div style={{ fontSize: '0.72rem', color: '#60a5fa' }}>T: ${row.expected.toFixed(0)}</div>
                    <div style={{ fontSize: '0.72rem', color: '#4ade80' }}>R: ${row.reached.toFixed(0)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 4: Latest DIS Report */}
          <div className="card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '24px', color: '#fff' }}>Latest Daily DIS Report</h3>
            
            {latestReport ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Report Date</span>
                  <span style={{ fontWeight: '600', color: '#fff' }}>{latestReport.report_date}</span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ textAlign: 'center', background: 'rgba(96, 165, 250, 0.04)', border: '1px solid rgba(96, 165, 250, 0.15)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Expected Revenue</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#60a5fa' }}>
                      ${Number(latestReport.expected_revenue).toFixed(2)}
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'center', background: 'rgba(251, 191, 36, 0.04)', border: '1px solid rgba(251, 191, 36, 0.15)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Positive Leads</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fbbf24' }}>
                      {latestReport.positive_leads}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: '0 0 16px 0' }}>
                  {isAdminView ? "This user hasn't submitted any daily reports yet." : "You haven't submitted any daily reports yet."}
                </p>
                {!isAdminView && (
                  <Link to="/dis" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                    Create First Report
                  </Link>
                )}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
