import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import {
  getTargetAssignmentMonths,
  formatRevenueMonth,
  getEffectiveTarget,
  normalizeMonth,
  sumRevenues
} from '../../utils/revenueUtils'

export default function UserTeam({ user }) {
  const [teamsData, setTeamsData] = useState([])
  const [loading, setLoading] = useState(true)

  // Target & Revenue specific states
  const monthOptions = useMemo(() => getTargetAssignmentMonths(11, 0), [])
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0])

  useEffect(() => {
    async function fetchTeamData() {
      if (!user) return

      try {
        // 1. Find the user's team
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('team_id')
          .eq('id', user.id)
          .single()

        if (!userProfile?.team_id) {
          setTeamsData([])
          setLoading(false)
          return
        }

        // 2. Get the team details
        const { data: team } = await supabase
          .from('teams')
          .select('*')
          .eq('id', userProfile.team_id)
          .single()

        if (!team) {
          setTeamsData([])
          setLoading(false)
          return
        }

        // 3. Fetch ALL members in this team
        const { data: allMembers } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, platform_role')
          .eq('team_id', userProfile.team_id)

        // 4. Fetch revenue for all members in this team
        const { data: allRevenues } = await supabase
          .from('monthly_revenues')
          .select('*')
          .eq('team_id', userProfile.team_id)

        // 5. Fetch targets for all members in this team
        const { data: allTargets } = await supabase
          .from('monthly_targets')
          .select('*')
          .eq('team_id', userProfile.team_id)

        const tData = [{
          id: team.id,
          name: team.name,
          members: allMembers || [],
          revenues: allRevenues || [],
          targets: allTargets || []
        }]
        
        setTeamsData(tData)
        
      } catch (error) {
        console.error("Error fetching team data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTeamData()
  }, [user])

  if (loading) return <div style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading team data...</div>

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* Premium Header */}
      <div style={{ marginBottom: 'clamp(24px, 5vw, 40px)' }}>
        <div className="apple-kicker">Collaboration Network</div>
        <h1 className="apple-title-large">My Teams</h1>
        <p className="apple-lead">
          View your teammates, their roles, targets, and direct revenue contributions.
        </p>
      </div>

      {teamsData.length === 0 ? (
        <div className="apple-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '20px' }}>👥</div>
          <h3 className="apple-title-medium">You are not assigned to any teams</h3>
          <p className="apple-lead" style={{ marginTop: '8px' }}>Please contact an administrator to be added to an active team.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {teamsData.map(team => {
            // Calculate stats for the selected month
            const monthMembers = team.members.map(member => {
              const target = getEffectiveTarget(team.targets, member.id, team.id, selectedMonth)
              const currentTarget = target ? Number(target.target_amount || 0) : 0
              const reached = sumRevenues(team.revenues.filter(r =>
                r.user_id === member.id &&
                normalizeMonth(r.revenue_month) === selectedMonth
              ))
              return {
                ...member,
                currentTarget,
                reached
              }
            })

            // Sort members by revenue reached (highest first)
            monthMembers.sort((a, b) => b.reached - a.reached)

            const teamTotalTarget = monthMembers.reduce((sum, m) => sum + m.currentTarget, 0)
            const teamTotalReached = monthMembers.reduce((sum, m) => sum + m.reached, 0)

            return (
              <div key={team.id} className="apple-card" style={{ padding: '0 !important', overflow: 'hidden' }}>
                
                {/* Team Header & Filter */}
                <div style={{ 
                  padding: '24px clamp(16px, 4vw, 32px)', 
                  background: 'rgba(255,255,255,0.01)', 
                  borderBottom: '1px solid var(--apple-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '24px'
                }}>
                  <div>
                    <h2 className="apple-title-medium" style={{ margin: 0, textTransform: 'capitalize' }}>{team.name}</h2>
                    <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.88rem', fontWeight: '500', marginTop: '2px' }}>
                      {monthMembers.length} {monthMembers.length === 1 ? 'Member' : 'Members'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)', fontWeight: '600' }}>Filter Month:</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="apple-form-control"
                      style={{ maxWidth: '200px', padding: '6px 12px', fontSize: '0.85rem' }}
                    >
                      {monthOptions.map(month => (
                        <option key={month} value={month}>{formatRevenueMonth(month)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Team Totals Section */}
                <div style={{ 
                  padding: '24px clamp(16px, 4vw, 32px)', 
                  background: 'rgba(255,255,255,0.02)', 
                  borderBottom: '1px solid var(--apple-border)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px'
                }}>
                  <div style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(96,165,250,0.35)', background: 'rgba(96,165,250,0.08)' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Team Target</div>
                    <div style={{ fontSize: '2rem', fontWeight: '800', color: '#60a5fa' }}>
                      ${teamTotalTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.08)' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Team Reached</div>
                    <div style={{ fontSize: '2rem', fontWeight: '800', color: '#4ade80' }}>
                      ${teamTotalReached.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(251,191,36,0.35)', background: 'rgba(251,191,36,0.08)' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Team Achievement</div>
                    <div style={{ fontSize: '2rem', fontWeight: '800', color: '#fbbf24' }}>
                      {teamTotalTarget > 0 ? `${((teamTotalReached / teamTotalTarget) * 100).toFixed(1)}%` : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Members List */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {monthMembers.map((member, idx) => {
                    const achievement = member.currentTarget > 0 ? (member.reached / member.currentTarget) * 100 : 0;
                    
                    return (
                      <div key={member.id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '20px clamp(16px, 4vw, 32px)',
                        borderBottom: idx < monthMembers.length - 1 ? '1px solid var(--apple-border)' : 'none',
                        background: member.id === user.id ? 'rgba(0, 113, 227, 0.04)' : 'transparent',
                        flexWrap: 'wrap',
                        gap: '16px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '240px', flex: '1' }}>
                          <div style={{ 
                            width: '44px', 
                            height: '44px', 
                            borderRadius: '50%', 
                            background: member.id === user.id 
                              ? 'linear-gradient(135deg, #0071e3, #3b82f6)' 
                              : 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            color: '#ffffff',
                            fontSize: '1rem',
                            boxShadow: member.id === user.id ? '0 0 12px rgba(0, 113, 227, 0.3)' : 'none',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>
                            {member.first_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '1.05rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {member.first_name} {member.last_name}
                              {member.id === user.id && (
                                <span className="apple-badge apple-badge-blue" style={{ padding: '2px 8px', fontSize: '0.65rem' }}>You</span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginTop: '4px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                              <span>{member.email}</span>
                              <span style={{ color: 'var(--apple-border-strong)' }}>•</span>
                              <span className={member.platform_role === 'teamlead' ? 'apple-badge apple-badge-orange' : 'apple-badge apple-badge-green'} style={{ padding: '2px 8px', fontSize: '0.65rem', textTransform: 'capitalize' }}>
                                {member.platform_role === 'teamlead' ? 'lead' : 'member'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginLeft: 'auto', textAlign: 'right' }}>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target</div>
                            <div style={{ fontWeight: '700', fontSize: '1.15rem', color: '#60a5fa' }}>
                              ${member.currentTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reached</div>
                            <div style={{ fontWeight: '700', fontSize: '1.15rem', color: member.reached > 0 ? 'var(--apple-accent-green)' : 'var(--apple-text-secondary)' }}>
                              ${member.reached.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            {member.currentTarget > 0 && (
                              <div style={{ fontSize: '0.75rem', color: achievement >= 100 ? 'var(--apple-accent-green)' : '#fbbf24', marginTop: '2px' }}>
                                {achievement.toFixed(1)}%
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    )
                  })}
                </div>



              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

