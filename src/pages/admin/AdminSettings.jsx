import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export default function AdminSettings() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [teams, setTeams] = useState([])
  const [memberships, setMemberships] = useState([])
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Modal state
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [selectedRole, setSelectedRole] = useState('member')
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState('')
  const [modalMessage, setModalMessage] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [profilesRes, teamsRes, membershipsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('first_name', { ascending: true }),
        supabase.from('teams').select('*').order('name', { ascending: true }),
        supabase.from('team_members').select('*')
      ])

      if (profilesRes.error) throw profilesRes.error
      if (teamsRes.error) throw teamsRes.error
      if (membershipsRes.error) throw membershipsRes.error

      // We only manage team memberships for non-admin users
      const nonAdminUsers = (profilesRes.data || []).filter(p => p.platform_role !== 'admin')
      
      setUsers(nonAdminUsers)
      setTeams(teamsRes.data || [])
      setMemberships(membershipsRes.data || [])
    } catch (err) {
      console.error('Error loading settings data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtered users based on search query
  const filteredUsers = users.filter(user => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase()
    const email = (user.email || '').toLowerCase()
    const query = searchQuery.toLowerCase()
    return fullName.includes(query) || email.includes(query)
  })

  // Open modal handler
  const handleOpenModal = (user) => {
    setSelectedUser(user)
    setSelectedTeamId('')
    setSelectedRole('member')
    setModalError('')
    setModalMessage('')
  }

  // Close modal handler
  const handleCloseModal = () => {
    setSelectedUser(null)
  }

  // Get user's current memberships
  const getUserMemberships = (userId) => {
    return memberships.filter(m => m.user_id === userId)
  }

  // Remove user from a team
  const handleRemoveFromTeam = async (userId, teamId) => {
    setModalSaving(true)
    setModalError('')
    setModalMessage('')
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', userId)
        .eq('team_id', teamId)

      if (error) throw error

      setModalMessage('Removed from team successfully!')
      
      // Reload lists
      const { data: newMems } = await supabase.from('team_members').select('*')
      setMemberships(newMems || [])
    } catch (err) {
      console.error('Error removing from team:', err)
      setModalError(err.message || 'Failed to remove from team.')
    } finally {
      setModalSaving(false)
    }
  }

  // Add user to a team
  const handleAddToTeam = async (e) => {
    e.preventDefault()
    if (!selectedUser || !selectedTeamId) return

    setModalSaving(true)
    setModalError('')
    setModalMessage('')

    try {
      // 1. Enforce maximum 3 teams constraint (double-check query)
      const { data: currentMems, error: countError } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', selectedUser.id)

      if (countError) throw countError

      if ((currentMems || []).length >= 2) {
        throw new Error('Limit exceeded: A user cannot belong to more than 2 teams.')
      }

      // 2. Insert membership record
      const { error: insertError } = await supabase
        .from('team_members')
        .insert({
          user_id: selectedUser.id,
          team_id: selectedTeamId,
          team_role: selectedRole
        })

      if (insertError) throw insertError

      setModalMessage('Added to team successfully!')
      setSelectedTeamId('')
      setSelectedRole('member')

      // Reload lists
      const { data: newMems } = await supabase.from('team_members').select('*')
      setMemberships(newMems || [])
    } catch (err) {
      console.error('Error adding to team:', err)
      setModalError(err.message || 'Failed to add to team.')
    } finally {
      setModalSaving(false)
    }
  }

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>Loading Admin Settings...</div>

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '8px', color: '#fff' }}>Admin Settings</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Configure platform structure and manage user team memberships (Maximum of 2 teams per user).
        </p>
      </div>

      {/* Directory Search & Filter Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '1.2rem' }}>🔍</span>
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control"
            style={{ flex: 1, padding: '10px 14px' }}
          />
        </div>
      </div>

      {/* Directory list of members */}
      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Member Directory</h3>
        
        {filteredUsers.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <th style={{ padding: '12px' }}>Name & Email</th>
                  <th style={{ padding: '12px' }}>Platform Role</th>
                  <th style={{ padding: '12px' }}>Team Memberships (Max 2)</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => {
                  const userMems = getUserMemberships(user.id)
                  
                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.95rem' }}>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: '600', color: '#fff' }}>{user.first_name} {user.last_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</div>
                      </td>
                      <td style={{ padding: '14px 12px', textTransform: 'capitalize' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          fontSize: '0.8rem',
                          color: '#fff'
                        }}>
                          {user.platform_role || 'User'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        {userMems.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {userMems.map(m => {
                              const t = teams.find(team => team.id === m.team_id)
                              return (
                                <span key={m.id} style={{
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  background: m.team_role === 'lead' ? 'rgba(96, 165, 250, 0.12)' : 'rgba(74, 222, 128, 0.12)',
                                  border: m.team_role === 'lead' ? '1px solid rgba(96, 165, 250, 0.25)' : '1px solid rgba(74, 222, 128, 0.25)',
                                  fontSize: '0.75rem',
                                  color: m.team_role === 'lead' ? '#60a5fa' : '#4ade80',
                                  textTransform: 'capitalize',
                                  fontWeight: '500'
                                }}>
                                  {t?.name || 'Unknown'} ({m.team_role})
                                </span>
                              )
                            })}
                          </div>
                        ) : (
                          <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            No Teams Assigned
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleOpenModal(user)}
                          className="btn btn-secondary"
                          style={{
                            padding: '6px 14px',
                            fontSize: '0.8rem',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          ⚙️ Manage Teams
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>No users found matching query.</p>
        )}
      </div>

      {/* MEMBERSHIP MANAGEMENT MODAL */}
      {selectedUser && (() => {
        const userMems = getUserMemberships(selectedUser.id)
        const isMaxedOut = userMems.length >= 2

        // Get list of teams user is NOT already in
        const userJoinedTeamIds = userMems.map(m => m.team_id)
        const availableTeams = teams.filter(t => !userJoinedTeamIds.includes(t.id))

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }} onClick={handleCloseModal}>
            <div style={{
              background: '#1e293b',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '550px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              position: 'relative'
            }} onClick={(e) => e.stopPropagation()}>
              
              {/* Close Button */}
              <button 
                onClick={handleCloseModal}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  color: '#94a3b8',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem'
                }}
              >
                &times;
              </button>

              {/* Modal Header */}
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', textTransform: 'capitalize' }}>
                  Manage Teams: {selectedUser.first_name} {selectedUser.last_name}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedUser.email}</span>
              </div>

              {/* Success / Error Messages inside modal */}
              {modalError && (
                <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', fontSize: '0.85rem' }}>
                  {modalError}
                </div>
              )}
              {modalMessage && (
                <div style={{ padding: '10px 14px', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid #4ade80', color: '#4ade80', borderRadius: '8px', fontSize: '0.85rem' }}>
                  {modalMessage}
                </div>
              )}

              {/* Section 1: Current Memberships */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Current Teams ({userMems.length} / 2)
                </h4>
                {userMems.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {userMems.map(m => {
                      const t = teams.find(team => team.id === m.team_id)
                      return (
                        <div key={m.id} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.04)',
                          borderRadius: '8px'
                        }}>
                          <div>
                            <span style={{ fontWeight: '600', color: '#fff', marginRight: '8px', textTransform: 'capitalize' }}>
                              {t?.name || 'Unknown Team'}
                            </span>
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: m.team_role === 'lead' ? 'rgba(96, 165, 250, 0.15)' : 'rgba(74, 222, 128, 0.15)',
                              color: m.team_role === 'lead' ? '#60a5fa' : '#4ade80',
                              textTransform: 'capitalize',
                              fontWeight: 'bold'
                            }}>
                              {m.team_role}
                            </span>
                          </div>
                          <button
                            disabled={modalSaving}
                            onClick={() => handleRemoveFromTeam(selectedUser.id, m.team_id)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              padding: '4px 8px'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.9rem' }}>Not assigned to any team yet.</p>
                )}
              </div>

              {/* Section 2: Add to New Team */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Add to a Team
                </h4>
                
                {isMaxedOut ? (
                  <div style={{
                    padding: '12px',
                    background: 'rgba(251, 191, 36, 0.08)',
                    border: '1px solid rgba(251, 191, 36, 0.25)',
                    color: '#fbbf24',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '500'
                  }}>
                    ⚠️ Maximum limit reached (2 teams). You must remove this user from a team before adding them to a new one.
                  </div>
                ) : availableTeams.length > 0 ? (
                  <form onSubmit={handleAddToTeam} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Select Team</label>
                        <select
                          value={selectedTeamId}
                          onChange={(e) => setSelectedTeamId(e.target.value)}
                          required
                          className="form-control"
                          style={{ fontSize: '0.9rem', textTransform: 'capitalize' }}
                        >
                          <option value="" disabled>-- Select Team --</option>
                          {availableTeams.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Role</label>
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          required
                          className="form-control"
                          style={{ fontSize: '0.9rem' }}
                        >
                          <option value="member">Member</option>
                          <option value="lead">Team Lead</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={modalSaving || !selectedTeamId}
                      className="btn"
                      style={{ background: '#4ade80', color: '#0f172a', fontWeight: 'bold', width: '100%', marginTop: '4px' }}
                    >
                      {modalSaving ? 'Adding...' : '➕ Add User to Team'}
                    </button>
                  </form>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.9rem' }}>User is already in all available teams.</p>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
