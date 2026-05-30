import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import {
  normalizeMonth,
  filterRevenuesByPeriod,
  sumRevenues,
  getLastNMonths,
  formatRevenueMonth,
  toRevenueMonthString
} from '../../utils/revenueUtils'
import UserHome from '../user/UserHome'
import UserRevenue from '../user/UserRevenue'



export default function AdminTeams() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])
  const [memberships, setMemberships] = useState([])
  const [profiles, setProfiles] = useState([])
  const [revenues, setRevenues] = useState([])
  const [selectedTeamId, setSelectedTeamId] = useState('all')
  const [viewingProfileUser, setViewingProfileUser] = useState(null)

  // Month picker for revenue column – default to current month
  const now = new Date()
  const [selectedRevenueMonth, setSelectedRevenueMonth] = useState(
    toRevenueMonthString(now.getFullYear(), now.getMonth())
  )

  useEffect(() => {
    setViewingProfileUser(null)
  }, [selectedTeamId])

  useEffect(() => {
    async function loadData() {
      const [teamsRes, membershipsRes, profilesRes, revRes] = await Promise.all([
        supabase.from('teams').select('*').order('created_at', { ascending: true }),
        supabase.from('team_members').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('monthly_revenues').select('*')
      ])

      if (teamsRes.data) setTeams(teamsRes.data)
      if (membershipsRes.data) setMemberships(membershipsRes.data)
      if (profilesRes.data) setProfiles(profilesRes.data)
      if (revRes.data) setRevenues(revRes.data)
        
      setLoading(false)
    }
    loadData()
  }, [])

  // Build list of months available for picker (last 24 months)
  const monthOptions = useMemo(() => getLastNMonths(24), [])

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading teams...</div>

  if (viewingProfileUser) {
    return (
      <div style={{ animation: 'fadeIn 0.2s ease-in-out', paddingBottom: '60px' }}>
        <button
          onClick={() => setViewingProfileUser(null)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-color)',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '30px',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        >
          ← Back to Manage Teams
        </button>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>
          <UserHome user={viewingProfileUser} isAdminView={true} />
          
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', width: '100%' }}></div>
          
          <UserRevenue user={viewingProfileUser} isAdminView={true} />
        </div>
      </div>
    )
  }

  // ---------- Compute members to display ----------

  const isAllTeams = selectedTeamId === 'all'

  // Get all non-admin profiles
  const allNonAdminProfiles = profiles.filter(p => p.platform_role !== 'admin')
  const allNonAdminIds = new Set(allNonAdminProfiles.map(p => p.id))

  let combinedTeamUsers = []

  if (isAllTeams) {
    // Show every non-admin profile across all teams
    combinedTeamUsers = allNonAdminProfiles.map(profile => {
      const activeMem = memberships.find(m => m.user_id === profile.id)
      const team = activeMem ? teams.find(t => t.id === activeMem.team_id) : null
      return {
        userId: profile.id,
        profile,
        activeMem,
        isFormer: !activeMem,
        role: activeMem ? activeMem.team_role : 'no team',
        teamName: team ? team.name : '—',
        keyId: activeMem ? activeMem.id : `nteam-${profile.id}`
      }
    }).sort((a, b) => {
      const getPriority = (u) => {
        if (u.isFormer) return 3
        if (u.role === 'lead') return 1
        return 2
      }
      return getPriority(a) - getPriority(b)
    })
  } else {
    const teamObj = teams.find(t => t.id === selectedTeamId)
    if (teamObj) {
      const teamMemberships = memberships.filter(m => m.team_id === selectedTeamId)
      const nonAdminMemberships = teamMemberships.filter(m => {
        const profile = profiles.find(p => p.id === m.user_id)
        return profile && profile.platform_role !== 'admin'
      })

      const teamRevenues = revenues.filter(r => r.team_id === selectedTeamId && allNonAdminIds.has(r.user_id))
      const historicalUserIds = teamRevenues.map(r => r.user_id)
      const combinedUserIds = [...new Set([
        ...nonAdminMemberships.map(m => m.user_id),
        ...historicalUserIds
      ])]

      combinedTeamUsers = combinedUserIds.map(userId => {
        const profile = profiles.find(p => p.id === userId)
        const activeMem = nonAdminMemberships.find(m => m.user_id === userId)
        const team = teams.find(t => t.id === selectedTeamId)
        return {
          userId,
          profile,
          activeMem,
          isFormer: !activeMem,
          role: activeMem ? activeMem.team_role : 'former member',
          teamName: team ? team.name : '—',
          keyId: activeMem ? activeMem.id : `former-${userId}`
        }
      }).filter(u => u.profile !== undefined)
      .sort((a, b) => {
        const getPriority = (u) => {
          if (u.isFormer) return 3
          if (u.role === 'lead') return 1
          return 2
        }
        return getPriority(a) - getPriority(b)
      })
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Manage Teams</h2>
        <span style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', fontSize: '0.9rem' }}>
          Total Teams: {teams.length}
        </span>
      </div>

      {/* Filter controls */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '500' }}>Team</label>
          <select
            value={selectedTeamId}
            onChange={e => { setSelectedTeamId(e.target.value); setViewingProfileUser(null) }}
            className="form-control"
          >
            <option value="all">All Teams</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '500' }}>Revenue Month</label>
          <select
            value={selectedRevenueMonth}
            onChange={e => setSelectedRevenueMonth(e.target.value)}
            className="form-control"
          >
            {monthOptions.map(m => (
              <option key={m} value={m}>{formatRevenueMonth(m)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Full-width members table */}
      <div className="card" style={{ padding: '24px' }}>
        {/* Table header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {isAllTeams
              ? `All Members (${combinedTeamUsers.length})`
              : `${teams.find(t => t.id === selectedTeamId)?.name || ''} — Members (${combinedTeamUsers.length})`}
          </h4>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Revenue for: <strong style={{ color: '#4ade80' }}>{formatRevenueMonth(selectedRevenueMonth)}</strong>
          </span>
        </div>

        {combinedTeamUsers.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Table Header Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isAllTeams
                ? 'minmax(160px, 1fr) 130px 90px 120px 100px'
                : 'minmax(160px, 1fr) 90px 120px 100px',
              gap: '12px',
              padding: '0 0 12px 0',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <div>Member</div>
              {isAllTeams && <div style={{ textAlign: 'center' }}>Team</div>}
              <div style={{ textAlign: 'center' }}>Role</div>
              <div style={{ textAlign: 'right' }}>{formatRevenueMonth(selectedRevenueMonth)}</div>
              <div style={{ textAlign: 'center' }}>Action</div>
            </div>

            {/* Member Rows */}
            {combinedTeamUsers.map(u => {
              const { profile, isFormer, role, teamName, keyId, userId } = u

              // Revenue for the selected month
              let monthRevenue = 0
              if (isAllTeams) {
                // Sum across all teams for this user in the selected month
                monthRevenue = revenues
                  .filter(r => r.user_id === userId && normalizeMonth(r.revenue_month) === selectedRevenueMonth)
                  .reduce((sum, r) => sum + Number(r.amount || 0), 0)
              } else {
                monthRevenue = revenues
                  .filter(r => r.user_id === userId && r.team_id === selectedTeamId && normalizeMonth(r.revenue_month) === selectedRevenueMonth)
                  .reduce((sum, r) => sum + Number(r.amount || 0), 0)
              }

              return (
                <div
                  key={keyId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isAllTeams
                      ? 'minmax(160px, 1fr) 130px 90px 120px 100px'
                      : 'minmax(160px, 1fr) 90px 120px 100px',
                    gap: '12px',
                    alignItems: 'center',
                    padding: '14px 0',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    fontSize: '0.95rem'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '500', color: '#fff' }}>
                      {profile.first_name} {profile.last_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{profile.email}</div>
                  </div>
                  {isAllTeams && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        textTransform: 'capitalize',
                        background: 'rgba(96,165,250,0.1)',
                        border: '1px solid rgba(96,165,250,0.2)',
                        color: '#60a5fa',
                        display: 'inline-block'
                      }}>
                        {teamName}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      textTransform: 'capitalize',
                      background: isFormer ? 'rgba(239, 68, 68, 0.1)' : role === 'lead' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      border: isFormer ? '1px solid rgba(239, 68, 68, 0.2)' : role === 'lead' ? '1px solid rgba(234, 179, 8, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: isFormer ? '#f87171' : role === 'lead' ? '#eab308' : '#94a3b8',
                      display: 'inline-block'
                    }}>
                      {isFormer ? 'Former Member' : role}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 'bold', color: monthRevenue > 0 ? '#4ade80' : 'var(--text-secondary)' }}>
                    ${monthRevenue.toFixed(2)}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => setViewingProfileUser(profile)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(96, 165, 250, 0.3)',
                        background: 'rgba(96, 165, 250, 0.1)',
                        color: '#60a5fa',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
            {teams.length === 0 ? 'No teams exist.' : 'No non-admin members in this team yet.'}
          </p>
        )}
      </div>
    </div>
  )
}
