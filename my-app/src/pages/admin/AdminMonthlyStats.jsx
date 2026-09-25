import { useState, useEffect, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  sumRevenues,
  normalizeMonth,
  toRevenueMonthString
} from '../../utils/revenueUtils'
import RevenueAnalysisModule from '../../components/stats/RevenueAnalysisModule'
import DisSubmissionStatsModule from '../../components/stats/DisSubmissionStatsModule'

export default function AdminMonthlyStats() {
  const { user } = useOutletContext() || {}
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])
  const [profiles, setProfiles] = useState([])
  const [revenues, setRevenues] = useState([])
  const [disReports, setDisReports] = useState([])
  const [expandedTeamId, setExpandedTeamId] = useState(null)
  const [activeTab, setActiveTab] = useState('breakdown')

  useEffect(() => {
    if (user && activeTab) {
      const tabName = activeTab === 'dis' ? 'DIS' : activeTab.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      supabase.from('audit_logs').insert([{
        user_id: user.id,
        action_type: 'admin_page_view',
        details: { 
          page_name: `Monthly Stats - ${tabName}`,
          path: '/admin/monthly-stats'
        }
      }]).then(({ error }) => { if (error) console.error(error) });
    }
  }, [user, activeTab])

  const toggleTeam = (teamId) => {
    setExpandedTeamId(prev => prev === teamId ? null : teamId)
  }

  const memberships = useMemo(() => profiles
    .filter(p => p.team_id)
    .map(p => ({
      user_id: p.id,
      team_id: p.team_id,
      team_role: p.platform_role === 'teamlead' ? 'lead' : 'member'
    })), [profiles])

  useEffect(() => {
    async function loadData() {
      try {
        const [teamsRes, profilesRes, revRes, disRes] = await Promise.all([
          supabase.from('teams').select('*').order('name', { ascending: true }),
          supabase.from('profiles').select('*'),
          supabase.from('monthly_revenues').select('*'),
          supabase.from('dis_reports').select('*')
        ])
        
        if (teamsRes.data) setTeams(teamsRes.data)
        if (profilesRes.data) setProfiles(profilesRes.data)
        if (revRes.data) setRevenues(revRes.data)
        if (disRes.data) setDisReports(disRes.data)
      } catch (err) {
        console.error('Error loading monthly stats data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const currentMonthStr = useMemo(() => {
    const d = new Date()
    return toRevenueMonthString(d.getFullYear(), d.getMonth())
  }, [])

  // Filter for only non-admin members
  const nonAdminProfiles = useMemo(() => {
    return profiles.filter(p => p.platform_role !== 'admin')
  }, [profiles])

  // Get current month revenues for non-admins
  const currentMonthRevenues = useMemo(() => {
    const nonAdminIds = new Set(nonAdminProfiles.map(p => p.id))
    return revenues.filter(r => 
      nonAdminIds.has(r.user_id) && 
      normalizeMonth(r.revenue_month) === currentMonthStr
    )
  }, [revenues, nonAdminProfiles, currentMonthStr])

  // Total Company Revenue for the month
  const totalMonthlyRevenue = useMemo(() => {
    return sumRevenues(currentMonthRevenues)
  }, [currentMonthRevenues])

  // Team-wise data
  const teamStats = useMemo(() => {
    return teams.map(team => {
      // Members currently in this team
      const teamMembers = nonAdminProfiles.filter(p => p.team_id === team.id)
      
      // Revenues tied to this team for the current month
      const teamRevs = currentMonthRevenues.filter(r => r.team_id === team.id)
      const teamTotal = sumRevenues(teamRevs)

      // Map individuals with their revenues
      const memberStats = teamMembers.map(member => {
        const memberRevs = teamRevs.filter(r => r.user_id === member.id)
        const memberTotal = sumRevenues(memberRevs)
        return {
          ...member,
          revenue: memberTotal
        }
      }).sort((a, b) => b.revenue - a.revenue) // Sort by highest revenue

      return {
        ...team,
        totalRevenue: teamTotal,
        members: memberStats
      }
    }).sort((a, b) => b.totalRevenue - a.totalRevenue) // Sort teams by highest revenue
  }, [teams, nonAdminProfiles, currentMonthRevenues])

  // Format month name (e.g., September 2026)
  const displayMonthName = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }, [])

  if (loading) {
    return <div style={{ color: 'var(--apple-text-secondary)', padding: '40px', textAlign: 'center' }}>Loading monthly stats...</div>
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)', paddingBottom: '40px' }}>
      
      {/* Subnavbar */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: '12px', 
        marginBottom: '32px', 
        borderBottom: '1px solid var(--apple-border)', 
        paddingBottom: '20px', 
        width: '100%' 
      }}>
        {['breakdown', 'revenue ranges', 'zero revenue', 'dis'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '14px 16px',
              borderRadius: '14px',
              border: activeTab === tab ? 'none' : '1px solid var(--apple-border)',
              background: activeTab === tab ? 'var(--apple-accent-blue)' : 'var(--apple-bg-secondary)',
              color: activeTab === tab ? '#fff' : 'var(--apple-text-primary)',
              fontSize: '0.95rem',
              fontWeight: activeTab === tab ? '700' : '600',
              cursor: 'pointer',
              textTransform: 'capitalize',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              textAlign: 'center',
              boxShadow: activeTab === tab ? '0 4px 12px rgba(0, 113, 227, 0.2)' : '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            {tab === 'dis' ? 'DIS' : tab}
          </button>
        ))}
      </div>

      {activeTab === 'breakdown' && (
        <>
          {/* Top Level Metric (Combined Header) */}
      <div className="apple-card" style={{ 
        background: 'linear-gradient(135deg, rgba(48, 213, 200, 0.15) 0%, rgba(0, 113, 227, 0.1) 100%)',
        border: '1px solid rgba(48, 213, 200, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 28px',
        borderRadius: '24px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(20px)',
        marginBottom: '40px',
        textAlign: 'center'
      }}>
        <span className="apple-badge apple-badge-green" style={{ marginBottom: '16px', fontSize: '0.9rem', padding: '8px 16px', fontWeight: '700' }}>
          🌟 OVERALL PERFORMANCE - {displayMonthName.toUpperCase()}
        </span>
        <div style={{ color: 'var(--apple-text-secondary)', fontSize: '1rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          Total Company Revenue
        </div>
        <div style={{ fontSize: 'clamp(3rem, 6vw, 4.5rem)', fontWeight: '800', color: 'var(--apple-text-primary)', letterSpacing: '-0.02em', lineHeight: '1.1' }}>
          ${totalMonthlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* Team Breakdown Grids (Card Layout) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '24px',
        alignItems: 'start'
      }}>
        {[...teamStats]
          .sort((a, b) => {
            const aExpanded = expandedTeamId === a.id ? 1 : 0;
            const bExpanded = expandedTeamId === b.id ? 1 : 0;
            return bExpanded - aExpanded;
          })
          .map((team, idx) => {
          const hasRevenue = team.totalRevenue > 0;
          const isExpanded = expandedTeamId === team.id;
          
          return (
            <div key={team.id} className="apple-card" style={{ 
              borderRadius: '20px',
              border: hasRevenue ? '1px solid rgba(0, 113, 227, 0.3)' : '1px solid var(--apple-border)',
              background: hasRevenue ? 'linear-gradient(180deg, rgba(0, 113, 227, 0.05) 0%, rgba(255,255,255,0.01) 100%)' : 'rgba(255, 255, 255, 0.01)',
              overflow: 'hidden',
              gridColumn: isExpanded ? '1 / -1' : 'auto',
              transition: 'grid-column 0.3s ease'
            }}>
              
              {/* Team Header (Clickable for Dropdown) */}
              <div 
                onClick={() => toggleTeam(team.id)}
                style={{ 
                  padding: '24px', 
                  borderBottom: isExpanded ? '1px solid var(--apple-border)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  position: 'relative'
                }}>
                
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: 'var(--apple-text-primary)', paddingRight: '40px', wordBreak: 'break-word' }}>
                  {team.name === 'PROSUMMITS_VIZAG' ? 'PROSUMMITS' : team.name}
                </h3>
                
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
                    Total
                  </span>
                  <span style={{ fontSize: '1.8rem', fontWeight: '800', color: hasRevenue ? 'var(--apple-accent-blue)' : 'var(--apple-text-secondary)', letterSpacing: '-0.02em' }}>
                    ${team.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div style={{ color: 'var(--apple-text-secondary)', position: 'absolute', top: '50%', right: '24px', transform: 'translateY(-50%)' }}>
                  {expandedTeamId === team.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </div>
              </div>

              {/* Members Grid (Dropdown Content) */}
              {expandedTeamId === team.id && (
                <div style={{ padding: '24px 28px', animation: 'fadeIn 0.3s ease-in-out' }}>
                {team.members.length === 0 ? (
                  <div style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                    No active members in this team.
                  </div>
                ) : (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
                    gap: '16px' 
                  }}>
                    {team.members.map(member => (
                      <div key={member.id} style={{ 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        border: '1px solid var(--apple-border)', 
                        borderRadius: '12px', 
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        transition: 'transform 0.2s ease, border-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--apple-border)'; e.currentTarget.style.transform = 'none' }}
                      >
                        <div style={{ fontWeight: '600', fontSize: '1.05rem', color: 'var(--apple-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {member.first_name} {member.last_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '8px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue</span>
                          <span style={{ 
                            fontWeight: '700', 
                            fontSize: '1.1rem',
                            color: member.revenue > 0 ? 'var(--apple-accent-green)' : 'var(--apple-text-secondary)'
                          }}>
                            ${member.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )}

      {activeTab === 'revenue ranges' && (
        <RevenueAnalysisModule 
          mode="brackets" 
          profiles={profiles} 
          revenues={revenues} 
          memberships={memberships} 
          teams={teams} 
        />
      )}

      {activeTab === 'zero revenue' && (
        <RevenueAnalysisModule 
          mode="streak" 
          profiles={profiles} 
          revenues={revenues} 
          memberships={memberships} 
          teams={teams} 
        />
      )}

      {activeTab === 'dis' && (
        <DisSubmissionStatsModule 
          profiles={profiles} 
          revenues={revenues} 
          memberships={memberships} 
          teams={teams} 
          disReports={disReports} 
        />
      )}
    </div>
  )
}
