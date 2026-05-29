import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function UserTeam({ user }) {
  const [teamsData, setTeamsData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTeamData() {
      if (!user) return

      try {
        // 1. Find which teams this user belongs to
        const { data: myMemberships } = await supabase
          .from('team_members')
          .select('team_id, teams(name)')
          .eq('user_id', user.id)

        if (!myMemberships || myMemberships.length === 0) {
          setTeamsData([])
          setLoading(false)
          return
        }

        const teamIds = myMemberships.map(m => m.team_id)

        // 2. Fetch ALL members for those teams
        const { data: allMembers } = await supabase
          .from('team_members')
          .select('team_id, team_role, user_id, profiles(first_name, last_name, email)')
          .in('team_id', teamIds)

        // 3. Fetch ALL revenue for those teams
        const { data: allRevenues } = await supabase
          .from('monthly_revenues')
          .select('team_id, user_id, amount')
          .in('team_id', teamIds)

        // 4. Organize data by team
        const organizedTeams = myMemberships.map(membership => {
          const tId = membership.team_id
          const teamName = membership.teams.name
          
          const members = (allMembers || []).filter(m => m.team_id === tId).map(member => {
            // Sum up revenue for this specific member in this specific team
            const memberRevenues = (allRevenues || []).filter(r => r.team_id === tId && r.user_id === member.user_id)
            const totalRev = memberRevenues.reduce((sum, r) => sum + Number(r.amount), 0)
            
            return {
              ...member,
              total_revenue: totalRev
            }
          })

          // Sort members by revenue (highest first)
          members.sort((a, b) => b.total_revenue - a.total_revenue)

          const teamTotalRevenue = (allRevenues || [])
            .filter(r => r.team_id === tId)
            .reduce((sum, r) => sum + Number(r.amount), 0)

          return {
            id: tId,
            name: teamName,
            total_revenue: teamTotalRevenue,
            members: members
          }
        })

        setTeamsData(organizedTeams)
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
    <div>
      <div className="dashboard-header" style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>My Teams</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          View your teammates and their revenue contributions.
        </p>
      </div>

      {teamsData.length === 0 ? (
        <div style={{ padding: '60px 20px', background: 'var(--card-bg)', borderRadius: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>👥</div>
          <h3>You are not assigned to any teams</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Please contact an administrator to be added to a team.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {teamsData.map(team => (
            <div key={team.id} style={{ 
              background: 'var(--card-bg)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '16px',
              overflow: 'hidden'
            }}>
              {/* Team Header */}
              <div style={{ 
                padding: '24px 32px', 
                background: 'rgba(255,255,255,0.02)', 
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h2 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '4px' }}>{team.name}</h2>
                  <div style={{ color: 'var(--text-secondary)' }}>{team.members.length} Members</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Team Revenue</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#4ade80' }}>
                    ${team.total_revenue.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Members List */}
              <div style={{ padding: '0' }}>
                {team.members.map((member, idx) => (
                  <div key={member.user_id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '20px 32px',
                    borderBottom: idx < team.members.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    background: member.user_id === user.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '50%', 
                        background: member.user_id === user.id ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        color: '#fff'
                      }}>
                        {member.profiles?.first_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {member.profiles?.first_name} {member.profiles?.last_name}
                          {member.user_id === user.id && (
                            <span style={{ fontSize: '0.75rem', background: '#3b82f6', padding: '2px 8px', borderRadius: '12px' }}>You</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {member.profiles?.email} • Role: {member.team_role}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem', color: member.total_revenue > 0 ? '#4ade80' : 'var(--text-secondary)' }}>
                      ${member.total_revenue.toFixed(2)}
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
