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

let globalHomeCache = {
  userId: null,
  profile: null,
  userTeams: [],
  userRevenues: [],
  userTargets: [],
  latestReport: null
}

export default function UserHome({ user, isAdminView }) {
  const [profile, setProfile] = useState(globalHomeCache.profile)
  const [userTeams, setUserTeams] = useState(globalHomeCache.userTeams)
  const [userRevenues, setUserRevenues] = useState(globalHomeCache.userRevenues)
  const [userTargets, setUserTargets] = useState(globalHomeCache.userTargets)
  const [latestReport, setLatestReport] = useState(globalHomeCache.latestReport)
  const [latestAnnouncement, setLatestAnnouncement] = useState(null)
  const [loading, setLoading] = useState(globalHomeCache.userId !== user?.id)

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return

      try {
        const [profileRes, revRes, reportsRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('monthly_revenues').select('*').eq('user_id', user.id),
          supabase.from('dis_reports').select('*').eq('user_id', user.id).order('report_date', { ascending: false }).limit(1),
          supabase.from('announcements').select('*').eq('status', 'published').order('created_at', { ascending: false }).limit(1)
        ])
        
        if (profileRes.data) {
          setProfile(profileRes.data)
          globalHomeCache.profile = profileRes.data
          
          // Get user's single team if assigned
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
        if (reportsRes.data && reportsRes.data.length > 0) {
          setLatestReport(reportsRes.data[0])
          globalHomeCache.latestReport = reportsRes.data[0]
        }
        
        const annRes = reportsRes; // Wait, I added 4 promises to Promise.all, so I need to unpack it correctly
        // Let's fix that. I will just do a separate query below to avoid touching the Promise.all array unpack.

        // Keep page working even if monthly_targets table is not migrated yet.
        const { data: targetsData, error: targetsError } = await supabase
          .from('monthly_targets')
          .select('*')
          .eq('user_id', user.id)
        if (!targetsError && targetsData) {
          setUserTargets(targetsData)
          globalHomeCache.userTargets = targetsData
        }
        
        // Fetch latest announcement
        const { data: annData } = await supabase.from('announcements').select('*').eq('status', 'published').order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(1)
        if (annData && annData.length > 0) {
          setLatestAnnouncement(annData[0])
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
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* Premium Header */}
      <div style={{ marginBottom: 'clamp(24px, 5vw, 48px)' }}>
        <div className="apple-kicker">Performance Center</div>
        <h1 className="apple-title-large">
          {isAdminView 
            ? `Dashboard: ${profile?.first_name || user?.user_metadata?.full_name || 'Member'}` 
            : `Welcome, ${profile?.first_name || user?.user_metadata?.full_name || 'Member'}!`}
        </h1>
        <p className="apple-lead">
          {isAdminView 
            ? `Detailed metrics, team assignments, and target achievements.` 
            : `Here is an elegant overview of your teams, active revenue metrics, and performance.`}
        </p>
      </div>

      {/* Main Grid Wrapper */}
      <div className="apple-responsive-grid">
        
        {/* LEFT COLUMN: Profile & Teams Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 1: My Profile & Teams */}
          <div className="apple-card">
            <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>My Profile</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ borderBottom: '1px solid var(--apple-border)', paddingBottom: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Full Name</div>
                <div style={{ fontSize: '1rem', fontWeight: '500', color: '#ffffff', textTransform: 'capitalize' }}>
                  {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : (user?.user_metadata?.full_name || 'Member')}
                </div>
              </div>

              <div style={{ borderBottom: '1px solid var(--apple-border)', paddingBottom: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Email Address</div>
                <div style={{ fontSize: '1rem', fontWeight: '500', color: '#ffffff' }}>{profile?.email || user?.email}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>My Active Teams</div>
                {userTeams.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {userTeams.map(t => (
                      <span 
                        key={t.id} 
                        className={t.role === 'lead' ? 'apple-badge apple-badge-orange' : 'apple-badge apple-badge-green'}
                        style={{ textTransform: 'capitalize' }}
                      >
                        <span style={{ 
                          width: '6px', 
                          height: '6px', 
                          borderRadius: '50%', 
                          background: t.role === 'lead' ? 'var(--apple-accent-orange)' : 'var(--apple-accent-green)',
                          boxShadow: t.role === 'lead' ? '0 0 6px var(--apple-accent-orange)' : '0 0 6px var(--apple-accent-green)'
                        }}></span>
                        {t.name} ({t.role})
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontStyle: 'italic', color: 'var(--apple-text-secondary)', fontSize: '0.9rem' }}>
                    No Teams Assigned (Please contact Admin)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Quick Actions */}
          {!isAdminView && (
            <div className="apple-card">
              <h3 className="apple-title-small" style={{ marginBottom: '16px' }}>Quick Actions</h3>
              <div className="apple-two-col-grid">
                <Link 
                  to="/dis" 
                  className="apple-btn apple-btn-secondary" 
                  style={{ 
                    textAlign: 'center', 
                    padding: '16px 8px !important', 
                    flexDirection: 'column', 
                    gap: '8px',
                    borderRadius: '16px !important'
                  }}
                >
                  <span style={{ fontSize: '1.4rem' }}>📝</span>
                  <span style={{ fontSize: '0.85rem' }}>Submit Daily DIS</span>
                </Link>
                <Link 
                  to="/revenue" 
                  className="apple-btn apple-btn-secondary" 
                  style={{ 
                    textAlign: 'center', 
                    padding: '16px 8px !important', 
                    flexDirection: 'column', 
                    gap: '8px',
                    borderRadius: '16px !important'
                  }}
                >
                  <span style={{ fontSize: '1.4rem' }}>💰</span>
                  <span style={{ fontSize: '0.85rem' }}>Submit Revenue</span>
                </Link>
              </div>
            </div>
          )}

          {/* Card 2.5: Latest Announcement Widget */}
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
              <Link 
                to="/announcements" 
                className="apple-btn apple-btn-secondary" 
                style={{ marginTop: '16px', width: '100%', padding: '10px !important' }}
              >
                Read Full Announcement
              </Link>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Statistics & Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 3: Revenue Metrics */}
          <div className="apple-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 className="apple-title-small" style={{ margin: 0 }}>Revenue Summary</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.02)', 
                border: '1px solid var(--apple-border)', 
                borderRadius: '14px', 
                padding: '16px' 
              }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>This Month</div>
                <div className="apple-stat-hero" style={{ color: 'var(--apple-accent-green)' }}>
                  ${thisMonthRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.02)', 
                border: '1px solid var(--apple-border)', 
                borderRadius: '14px', 
                padding: '16px' 
              }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>All Time Total</div>
                <div className="apple-stat-hero" style={{ color: '#ffffff' }}>
                  ${allTimeRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div style={{ 
              background: 'rgba(0, 113, 227, 0.04)', 
              border: '1px solid rgba(0, 113, 227, 0.2)', 
              borderRadius: '14px', 
              padding: '18px' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Monthly Target</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--apple-accent-blue)' }}>
                    ${thisMonthTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Target Achievement</div>
                  <div style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: '700', 
                    color: targetAchievement >= 100 ? 'var(--apple-accent-green)' : 'var(--apple-accent-orange)' 
                  }}>
                    {thisMonthTarget > 0 ? `${targetAchievement.toFixed(1)}%` : 'No Active Target'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ 
              background: 'rgba(255, 255, 255, 0.01)', 
              border: '1px solid var(--apple-border)', 
              borderRadius: '14px', 
              padding: '16px' 
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                Target vs Reached (Last 6 Months)
              </div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', 
                gap: '8px' 
              }}>
                {targetHistory.map(row => (
                  <div 
                    key={row.month} 
                    style={{ 
                      padding: '8px', 
                      borderRadius: '8px', 
                      border: '1px solid var(--apple-border)', 
                      background: 'rgba(255, 255, 255, 0.01)',
                      textAlign: 'center' 
                    }}
                  >
                    <div style={{ fontSize: '0.65rem', color: 'var(--apple-text-secondary)', fontWeight: '600', marginBottom: '4px' }}>
                      {formatRevenueMonthShort(row.month).split(" '")[0]}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--apple-accent-blue)', fontWeight: '500' }}>T: ${row.expected.toFixed(0)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--apple-accent-green)', fontWeight: '600' }}>R: ${row.reached.toFixed(0)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* BOTTOM FULL-WIDTH: Latest Daily DIS Report */}
        <div className="apple-card" style={{ gridColumn: '1 / -1' }}>
          <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>Latest Daily DIS Report</h3>
          
          {latestReport ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                borderBottom: '1px solid var(--apple-border)', 
                paddingBottom: '12px' 
              }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)' }}>Report Date</span>
                <span style={{ fontWeight: '600', color: '#ffffff', fontSize: '0.9rem' }}>
                  {new Date(latestReport.report_date).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}
                </span>
              </div>
              
              <div className="apple-two-col-grid">
                <div style={{ 
                  textAlign: 'center', 
                  background: 'rgba(0, 113, 227, 0.03)', 
                  border: '1px solid rgba(0, 113, 227, 0.15)', 
                  borderRadius: '10px', 
                  padding: '12px' 
                }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Expected Revenue</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--apple-accent-blue)' }}>
                    ${Number(latestReport.expected_revenue).toFixed(2)}
                  </div>
                </div>
                
                <div style={{ 
                  textAlign: 'center', 
                  background: 'rgba(255, 159, 10, 0.03)', 
                  border: '1px solid rgba(255, 159, 10, 0.15)', 
                  borderRadius: '10px', 
                  padding: '12px' 
                }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Positive Leads</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--apple-accent-orange)' }}>
                    {latestReport.positive_leads}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <p style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', margin: '0 0 16px 0', fontSize: '0.9rem' }}>
                {isAdminView ? "This user hasn't submitted any daily reports yet." : "You haven't submitted any daily reports yet."}
              </p>
              {!isAdminView && (
                <Link to="/dis" className="apple-btn apple-btn-secondary" style={{ padding: '8px 20px !important', fontSize: '0.85rem' }}>
                  Create First Report
                </Link>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
