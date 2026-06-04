import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

let globalTeamCache = {
  userId: null,
  teamsData: []
}

export default function UserTeam({ user }) {
  const [teamsData, setTeamsData] = useState(globalTeamCache.teamsData)
  const [loading, setLoading] = useState(globalTeamCache.userId !== user?.id)

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
          .select('user_id, amount')
          .eq('team_id', userProfile.team_id)

        // 5. Organize data for the single team
        const members = (allMembers || []).map(member => {
          const memberRevenues = (allRevenues || []).filter(r => r.user_id === member.id)
          const totalRev = memberRevenues.reduce((sum, r) => sum + Number(r.amount), 0)
          
          return {
            ...member,
            total_revenue: totalRev
          }
        })

        // Sort members by revenue (highest first)
        members.sort((a, b) => b.total_revenue - a.total_revenue)

        const teamTotalRevenue = (allRevenues || [])
          .reduce((sum, r) => sum + Number(r.amount), 0)

        const tData = [{
          id: team.id,
          name: team.name,
          total_revenue: teamTotalRevenue,
          members: members
        }]
        
        setTeamsData(tData)
        globalTeamCache.teamsData = tData
        globalTeamCache.userId = user.id
        
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
          View your teammates, their roles, and their direct revenue contributions.
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
          {teamsData.map(team => (
            <div key={team.id} className="apple-card" style={{ padding: '0 !important', overflow: 'hidden' }}>
              
              {/* Team Header */}
              <div style={{ 
                padding: '24px clamp(16px, 4vw, 32px)', 
                background: 'rgba(255,255,255,0.01)', 
                borderBottom: '1px solid var(--apple-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <h2 className="apple-title-medium" style={{ margin: 0, textTransform: 'capitalize' }}>{team.name}</h2>
                  <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.88rem', fontWeight: '500', marginTop: '2px' }}>
                    {team.members.length} {team.members.length === 1 ? 'Member' : 'Members'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Team Total Revenue</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--apple-accent-green)' }}>
                    ${team.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Members List */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {team.members.map((member, idx) => (
                  <div key={member.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '20px clamp(16px, 4vw, 32px)',
                    borderBottom: idx < team.members.length - 1 ? '1px solid var(--apple-border)' : 'none',
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
                    
                    <div style={{ 
                      textAlign: 'right', 
                      fontWeight: '700', 
                      fontSize: '1.25rem', 
                      color: member.total_revenue > 0 ? 'var(--apple-accent-green)' : 'var(--apple-text-secondary)',
                      marginLeft: 'auto'
                    }}>
                      ${member.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
