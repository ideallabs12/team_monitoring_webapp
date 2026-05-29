import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import {
  getLastNMonths,
  normalizeMonth,
  formatRevenueMonthShort,
  filterRevenuesByPeriod,
  sumRevenues,
  TIME_PERIOD_OPTIONS
} from '../../utils/revenueUtils'
import UserHome from '../user/UserHome'
import UserRevenue from '../user/UserRevenue'



export default function AdminTeams() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])
  const [memberships, setMemberships] = useState([])
  const [profiles, setProfiles] = useState([])
  const [revenues, setRevenues] = useState([])
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [viewingProfileUser, setViewingProfileUser] = useState(null)

  // Time filter
  const [periodFilter, setPeriodFilter] = useState(12)

  useEffect(() => {
    setViewingProfileUser(null)
  }, [selectedTeamId])

  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id)
    }
  }, [teams, selectedTeamId])

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

  // Generate last 12 months for breakdown grid
  const last12Months = useMemo(() => getLastNMonths(12), [])

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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Manage Teams</h2>
        <span style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', fontSize: '0.9rem' }}>
          Total Teams: {teams.length}
        </span>
      </div>

      {/* Time Period Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {TIME_PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setPeriodFilter(opt.value)}
            style={{
              padding: '5px 14px',
              borderRadius: '20px',
              border: periodFilter === opt.value ? '1px solid #4ade80' : '1px solid var(--border-color)',
              background: periodFilter === opt.value ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255,255,255,0.03)',
              color: periodFilter === opt.value ? '#4ade80' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: periodFilter === opt.value ? '600' : '400',
              transition: 'all 0.2s'
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 2-Column Split Layout */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '10px' }}>
        
        {/* LEFT COLUMN: Teams List */}
        <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 0, flexShrink: 0 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', paddingLeft: '8px' }}>
            Teams
          </div>
          {teams.map(team => {
            const isSelected = selectedTeamId === team.id
            const teamMemberships = memberships.filter(m => m.team_id === team.id)
            const nonAdminMemberships = teamMemberships.filter(m => {
              const profile = profiles.find(p => p.id === m.user_id)
              return profile && profile.platform_role !== 'admin'
            })

            return (
              <button
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '14px 18px',
                  borderRadius: '10px',
                  border: isSelected ? '1px solid #4ade80' : '1px solid var(--border-color)',
                  background: isSelected ? 'rgba(74, 222, 128, 0.08)' : 'rgba(255,255,255,0.02)',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  width: '100%',
                  boxShadow: isSelected ? '0 4px 12px rgba(74, 222, 128, 0.1)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                }}
              >
                <span style={{ fontWeight: '600', fontSize: '1rem', textTransform: 'capitalize' }}>{team.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {nonAdminMemberships.length} Members
                </span>
              </button>
            )
          })}
          {teams.length === 0 && <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', paddingLeft: '8px' }}>No teams exist.</p>}
        </div>

        {/* RIGHT COLUMN: Selected Team Details */}
        <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {selectedTeamId ? (() => {
            const teamObj = teams.find(t => t.id === selectedTeamId)
            if (!teamObj) return null

            const teamMemberships = memberships.filter(m => m.team_id === selectedTeamId)
            const nonAdminMemberships = teamMemberships.filter(m => {
              const profile = profiles.find(p => p.id === m.user_id)
              return profile && profile.platform_role !== 'admin'
            })

            // Team revenues for non-admin members (including historical contributions from users who left the team)
            const allNonAdminUserIds = new Set(profiles.filter(p => p.platform_role !== 'admin').map(p => p.id))
            const teamRevenues = revenues.filter(r => r.team_id === selectedTeamId && allNonAdminUserIds.has(r.user_id))

            // Combine active non-admin memberships and users who have historical revenue in this team
            const historicalUserIds = teamRevenues.map(r => r.user_id)
            const combinedUserIds = [...new Set([
              ...nonAdminMemberships.map(m => m.user_id),
              ...historicalUserIds
            ])]

            // Construct list of members (active and former)
            const combinedTeamUsers = combinedUserIds.map(userId => {
              const profile = profiles.find(p => p.id === userId)
              const activeMem = nonAdminMemberships.find(m => m.user_id === userId)
              return {
                userId,
                profile,
                activeMem,
                isFormer: !activeMem,
                role: activeMem ? activeMem.team_role : 'former member',
                keyId: activeMem ? activeMem.id : `former-${userId}`
              }
            }).filter(u => u.profile !== undefined) // safety check
            .sort((a, b) => {
              // Priority: lead (1), member (2), former member (3)
              const getPriority = (u) => {
                if (u.isFormer) return 3
                if (u.role === 'lead') return 1
                return 2
              }
              return getPriority(a) - getPriority(b)
            })

            // All-time team total
            const allTimeTeamTotal = sumRevenues(teamRevenues)

            // Filtered team total
            const filteredTeamRevenues = filterRevenuesByPeriod(teamRevenues, periodFilter)
            const filteredTeamTotal = sumRevenues(filteredTeamRevenues)

            const filterLabel = TIME_PERIOD_OPTIONS.find(o => o.value === periodFilter)?.label || ''

            return (
              <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Team Info Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.6rem', color: '#fff', textTransform: 'capitalize' }}>{teamObj.name}</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{nonAdminMemberships.length} active members</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>All Time</div>
                      <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '1.1rem' }}>${allTimeTeamTotal.toFixed(2)}</span>
                    </div>
                    {periodFilter !== 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>{filterLabel}</div>
                        <span style={{ fontWeight: 'bold', color: '#4ade80', fontSize: '1.1rem' }}>${filteredTeamTotal.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Members list */}
                <div>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Team Members</h4>
                  {combinedTeamUsers.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {/* Table Header */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(140px, 1fr) 90px 110px 100px 100px',
                        gap: '12px',
                        padding: '0 0 12px 0',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        <div>Member</div>
                        <div style={{ textAlign: 'center' }}>Role</div>
                        <div style={{ textAlign: 'right' }}>Last 12 Months</div>
                        <div style={{ textAlign: 'right' }}>All Time</div>
                        <div style={{ textAlign: 'center' }}>Action</div>
                      </div>

                      {/* Member Rows */}
                      {combinedTeamUsers.map(u => {
                        const { profile, isFormer, role, keyId, userId } = u

                        const memberAllRevenues = revenues.filter(r => r.team_id === selectedTeamId && r.user_id === userId)
                        const memberAllTimeTotal = sumRevenues(memberAllRevenues)
                        const memberLast12Revenues = filterRevenuesByPeriod(memberAllRevenues, 12)
                        const memberLast12Total = sumRevenues(memberLast12Revenues)

                        return (
                          <div
                            key={keyId}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'minmax(140px, 1fr) 90px 110px 100px 100px',
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
                            <div style={{ textAlign: 'right', fontWeight: 'bold', color: memberLast12Total > 0 ? '#4ade80' : 'var(--text-secondary)' }}>
                              ${memberLast12Total.toFixed(2)}
                            </div>
                            <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#e2e8f0' }}>
                              ${memberAllTimeTotal.toFixed(2)}
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
                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>No non-admin members in this team yet.</p>
                  )}
                </div>
              </div>
            )
          })() : (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>
              Select a team from the left to view members.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
