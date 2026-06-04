import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

let adminSettingsCache = { loaded: false, users: [], teams: [] }

export default function AdminSettings() {
  const [loading, setLoading] = useState(!adminSettingsCache.loaded)
  const [users, setUsers] = useState(adminSettingsCache.users)
  const [teams, setTeams] = useState(adminSettingsCache.teams)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Modal state
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState('')
  const [modalMessage, setModalMessage] = useState('')

  const loadData = async () => {
    try {
      const [profilesRes, teamsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('first_name', { ascending: true }),
        supabase.from('teams').select('*').order('name', { ascending: true })
      ])

      if (profilesRes.error) throw profilesRes.error
      if (teamsRes.error) throw teamsRes.error

      // We only manage team memberships for non-admin users
      const nonAdminUsers = (profilesRes.data || []).filter(p => p.platform_role !== 'admin')
      const t = teamsRes.data || []
      
      setUsers(nonAdminUsers)
      setTeams(t)
      
      adminSettingsCache = { loaded: true, users: nonAdminUsers, teams: t }
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
    setSelectedTeamId(user.team_id || '')
    setModalError('')
    setModalMessage('')
  }

  // Close modal handler
  const handleCloseModal = () => {
    setSelectedUser(null)
  }

  // Remove user from team
  const handleRemoveFromTeam = async () => {
    if (!selectedUser) return
    
    setModalSaving(true)
    setModalError('')
    setModalMessage('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ team_id: null })
        .eq('id', selectedUser.id)

      if (error) throw error

      setModalMessage('Removed from team successfully!')
      setSelectedTeamId('')
      
      // Reload lists
      await loadData()
    } catch (err) {
      console.error('Error removing from team:', err)
      setModalError(err.message || 'Failed to remove from team.')
    } finally {
      setModalSaving(false)
    }
  }

  // Add user to a team (or change their team)
  const handleAddToTeam = async (e) => {
    e.preventDefault()
    if (!selectedUser || !selectedTeamId) return

    setModalSaving(true)
    setModalError('')
    setModalMessage('')

    try {
      // Update user's team assignment
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ team_id: selectedTeamId })
        .eq('id', selectedUser.id)

      if (updateError) throw updateError

      setModalMessage('Team assignment updated successfully!')

      // Reload lists
      await loadData()
      handleCloseModal()
    } catch (err) {
      console.error('Error updating team:', err)
      setModalError(err.message || 'Failed to update team.')
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
          Configure platform structure and manage user team assignments (one team per user).
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
                  <th style={{ padding: '12px' }}>Assigned Team</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => {
                  const userTeam = user.team_id ? teams.find(t => t.id === user.team_id) : null
                  
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
                        {userTeam ? (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            background: 'rgba(96, 165, 250, 0.12)',
                            border: '1px solid rgba(96, 165, 250, 0.25)',
                            fontSize: '0.85rem',
                            color: '#60a5fa',
                            fontWeight: '500'
                          }}>
                            {userTeam.name}
                          </span>
                        ) : (
                          <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            No Team Assigned
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
                          ⚙️ Assign Team
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
        const currentTeam = selectedUser.team_id ? teams.find(t => t.id === selectedUser.team_id) : null

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
                  Manage Team: {selectedUser.first_name} {selectedUser.last_name}
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

              {/* Section 1: Current Team */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Current Team
                </h4>
                {currentTeam ? (
                  <div style={{
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
                        {currentTeam.name}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: selectedUser.platform_role === 'teamlead' ? 'rgba(96, 165, 250, 0.15)' : 'rgba(74, 222, 128, 0.15)',
                        color: selectedUser.platform_role === 'teamlead' ? '#60a5fa' : '#4ade80',
                        textTransform: 'capitalize',
                        fontWeight: 'bold'
                      }}>
                        {selectedUser.platform_role === 'teamlead' ? 'lead' : 'member'}
                      </span>
                    </div>
                    <button
                      disabled={modalSaving}
                      onClick={handleRemoveFromTeam}
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
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.9rem' }}>Not assigned to any team yet.</p>
                )}
              </div>

              {/* Section 2: Assign / Change Team */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {currentTeam ? 'Change Team' : 'Assign to a Team'}
                </h4>
                
                {teams.length > 0 ? (
                  <form onSubmit={handleAddToTeam} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                        {teams.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={modalSaving || !selectedTeamId}
                      className="btn"
                      style={{ background: '#4ade80', color: '#0f172a', fontWeight: 'bold', width: '100%', marginTop: '4px' }}
                    >
                      {modalSaving ? 'Saving...' : currentTeam ? '🔄 Change Team' : '➕ Assign Team'}
                    </button>
                  </form>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.9rem' }}>No teams exist. Create teams first.</p>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
