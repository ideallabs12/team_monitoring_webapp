import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { Users, Search, Shield, Key, AlertTriangle, Activity, X, Plus, Trash2 } from 'lucide-react'

export default function AdminUsers() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [teams, setTeams] = useState([])
  const [memberships, setMemberships] = useState([])
  const [revenues, setRevenues] = useState([])
  const [disReports, setDisReports] = useState([])

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')

  // Control Center Modal
  const [selectedUser, setSelectedUser] = useState(null)
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState('')
  const [modalSuccess, setModalSuccess] = useState('')

  // Team Assignment Form inside Modal
  const [newTeamId, setNewTeamId] = useState('')
  const [newTeamRole, setNewTeamRole] = useState('member')

  const loadData = async () => {
    setLoading(true)
    try {
      const [profilesRes, teamsRes, membershipsRes, revRes, disRes] = await Promise.all([
        supabase.from('profiles').select('*').order('first_name', { ascending: true }),
        supabase.from('teams').select('*').order('name', { ascending: true }),
        supabase.from('team_members').select('*'),
        supabase.from('monthly_revenues').select('*'),
        supabase.from('dis_reports').select('*')
      ])

      if (profilesRes.error) throw profilesRes.error
      if (teamsRes.error) throw teamsRes.error
      if (membershipsRes.error) throw membershipsRes.error

      setUsers(profilesRes.data || [])
      setTeams(teamsRes.data || [])
      setMemberships(membershipsRes.data || [])
      setRevenues(revRes.data || [])
      setDisReports(disRes.data || [])
    } catch (err) {
      console.error('Error loading admin users data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Exclude admin profiles from the entire directory
  const nonAdminUsers = useMemo(() => users.filter(u => u.platform_role !== 'admin'), [users])

  // Filtered users: Email, Team, and Name search
  const filteredUsers = useMemo(() => {
    return nonAdminUsers.filter(user => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase()
      const email = (user.email || '').toLowerCase()
      
      const userMems = memberships.filter(m => m.user_id === user.id)
      const userTeamNames = userMems.map(m => {
        const t = teams.find(team => team.id === m.team_id)
        return t ? t.name.toLowerCase() : ''
      })

      const query = searchQuery.toLowerCase()
      return (
        fullName.includes(query) ||
        email.includes(query) ||
        userTeamNames.some(teamName => teamName.includes(query))
      )
    })
  }, [nonAdminUsers, teams, memberships, searchQuery])

  // Open Modal Handler
  const handleOpenModal = (user) => {
    setSelectedUser(user)
    setNewTeamId('')
    setNewTeamRole('member')
    setModalError('')
    setModalSuccess('')
  }

  // Close Modal Handler
  const handleCloseModal = () => {
    setSelectedUser(null)
  }

  // Update Platform Role
  const handleUpdatePlatformRole = async (userId, newRole) => {
    setModalSaving(true)
    setModalError('')
    setModalSuccess('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ platform_role: newRole })
        .eq('id', userId)

      if (error) throw error

      setModalSuccess(`Platform role updated to ${newRole}!`)
      
      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, platform_role: newRole } : u))
      setSelectedUser(prev => prev ? { ...prev, platform_role: newRole } : null)
    } catch (err) {
      console.error(err)
      setModalError(err.message || 'Failed to update platform role.')
    } finally {
      setModalSaving(false)
    }
  }

  // Toggle Account Activation/Deactivation
  const handleToggleDeactivation = async (userId, currentStatus) => {
    setModalSaving(true)
    setModalError('')
    setModalSuccess('')
    const nextStatus = !currentStatus
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_deactivated: nextStatus })
        .eq('id', userId)

      if (error) throw error

      setModalSuccess(nextStatus ? 'Account successfully deactivated!' : 'Account successfully activated!')
      
      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_deactivated: nextStatus } : u))
      setSelectedUser(prev => prev ? { ...prev, is_deactivated: nextStatus } : null)
    } catch (err) {
      console.error(err)
      setModalError(err.message || 'Failed to update activation status.')
    } finally {
      setModalSaving(false)
    }
  }

  // Send Password Reset Email
  const handleSendResetEmail = async (email) => {
    setModalSaving(true)
    setModalError('')
    setModalSuccess('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error

      setModalSuccess('Password reset link sent to user email successfully!')
    } catch (err) {
      console.error(err)
      setModalError(err.message || 'Failed to send password reset email.')
    } finally {
      setModalSaving(false)
    }
  }

  // Add User to a Team
  const handleAddToTeam = async (e) => {
    e.preventDefault()
    if (!selectedUser || !newTeamId) return

    setModalSaving(true)
    setModalError('')
    setModalSuccess('')

    try {
      // Limit check (max 2 teams per user)
      const userMems = memberships.filter(m => m.user_id === selectedUser.id)
      if (userMems.length >= 2) {
        throw new Error('Limit exceeded: A user cannot belong to more than 2 teams.')
      }

      const { error } = await supabase
        .from('team_members')
        .insert({
          user_id: selectedUser.id,
          team_id: newTeamId,
          team_role: newTeamRole
        })

      if (error) throw error

      setModalSuccess('Added to team successfully!')
      setNewTeamId('')
      
      // Reload memberships
      const { data: newMems } = await supabase.from('team_members').select('*')
      setMemberships(newMems || [])
    } catch (err) {
      console.error(err)
      setModalError(err.message || 'Failed to add user to team.')
    } finally {
      setModalSaving(false)
    }
  }

  // Remove User from a Team
  const handleRemoveFromTeam = async (userId, teamId) => {
    setModalSaving(true)
    setModalError('')
    setModalSuccess('')
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', userId)
        .eq('team_id', teamId)

      if (error) throw error

      setModalSuccess('Removed from team successfully!')
      
      // Reload memberships
      const { data: newMems } = await supabase.from('team_members').select('*')
      setMemberships(newMems || [])
    } catch (err) {
      console.error(err)
      setModalError(err.message || 'Failed to remove user from team.')
    } finally {
      setModalSaving(false)
    }
  }

  // Compile Dynamic Activity Logs
  const userActivities = useMemo(() => {
    if (!selectedUser) return []
    const activities = []

    // 1. Revenues Log
    const userRevs = revenues.filter(r => r.user_id === selectedUser.id)
    for (const r of userRevs) {
      const team = teams.find(t => t.id === r.team_id)
      activities.push({
        id: `rev-${r.id}`,
        type: 'revenue',
        date: new Date(r.created_at || r.revenue_month),
        description: `Logged revenue contribution of $${Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} for team "${team ? team.name : 'Unknown'}"`,
        icon: '💰'
      })
    }

    // 2. DIS Reports Log
    const userDis = disReports.filter(d => d.user_id === selectedUser.id)
    for (const d of userDis) {
      activities.push({
        id: `dis-${d.id}`,
        type: 'dis',
        date: new Date(d.report_date),
        description: `Submitted Daily Information Sheet (DIS) with ${d.positive_leads} positive leads and $${Number(d.expected_revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })} expected revenue`,
        icon: '📝'
      })
    }

    // 3. Team memberships Log
    const userMems = memberships.filter(m => m.user_id === selectedUser.id)
    for (const m of userMems) {
      const team = teams.find(t => t.id === m.team_id)
      activities.push({
        id: `team-${m.id}`,
        type: 'team',
        date: new Date(m.joined_at || selectedUser.created_at),
        description: `Assigned to team "${team ? team.name : 'Unknown'}" as "${m.team_role}"`,
        icon: '👥'
      })
    }

    // Sort by date descending
    return activities.sort((a, b) => b.date - a.date)
  }, [selectedUser, revenues, disReports, memberships, teams])

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>Loading registered users...</div>

  return (
    <div>
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-page-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
          <Users size={28} />
        </div>
        <div>
          <h1 className="admin-page-title">User Console</h1>
          <p className="admin-page-subtitle">
            View all registered platform members, manage role configurations, deactivate accounts, and monitor historical activities.
          </p>
        </div>
      </div>

      {/* Directory Search & Statistics */}
      <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search by name, email, or team assignment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '42px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '0.88rem', fontWeight: '500' }}>
              Total Users: {nonAdminUsers.length}
            </span>
            <span style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '12px', fontSize: '0.88rem', fontWeight: '500', color: '#ef4444' }}>
              Deactivated: {nonAdminUsers.filter(u => u.is_deactivated).length}
            </span>
          </div>
        </div>
      </div>

      {/* Users List Card */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', color: '#fff' }}>Registered Users Directory</h3>

        {filteredUsers.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px' }}>Name & Email</th>
                  <th style={{ padding: '12px' }}>Platform Role</th>
                  <th style={{ padding: '12px' }}>Active Teams</th>
                  <th style={{ padding: '12px' }}>Account Status</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => {
                  const userMems = memberships.filter(m => m.user_id === user.id)
                  const isDeactivated = !!user.is_deactivated

                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.95rem', opacity: isDeactivated ? 0.6 : 1 }}>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: '600', color: '#fff' }}>
                          {user.first_name} {user.last_name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{user.email}</div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          background: user.platform_role === 'admin' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                          border: user.platform_role === 'admin' ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(99, 102, 241, 0.25)',
                          color: user.platform_role === 'admin' ? '#f87171' : '#818cf8'
                        }}>
                          {user.platform_role || 'user'}
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
                                  fontSize: '0.72rem',
                                  background: m.team_role === 'lead' ? 'rgba(234, 179, 8, 0.12)' : 'rgba(74, 222, 128, 0.12)',
                                  border: m.team_role === 'lead' ? '1px solid rgba(234, 179, 8, 0.25)' : '1px solid rgba(74, 222, 128, 0.25)',
                                  color: m.team_role === 'lead' ? '#eab308' : '#4ade80',
                                  fontWeight: '500',
                                  textTransform: 'capitalize'
                                }}>
                                  {t?.name || 'Unknown'} ({m.team_role})
                                </span>
                              )
                            })}
                          </div>
                        ) : (
                          <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No Assigned Teams</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: isDeactivated ? 'rgba(239, 68, 68, 0.15)' : 'rgba(74, 222, 128, 0.15)',
                          border: isDeactivated ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(74, 222, 128, 0.3)',
                          color: isDeactivated ? '#ef4444' : '#4ade80'
                        }}>
                          {isDeactivated ? 'Deactivated' : 'Active'}
                        </span>
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
                          ⚙️ Control Panel
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>No users found matching search query.</p>
        )}
      </div>

      {/* USER CONTROL PANEL MODAL */}
      {selectedUser && (() => {
        const userMems = memberships.filter(m => m.user_id === selectedUser.id)
        const isMaxedOut = userMems.length >= 2
        const isDeactivated = !!selectedUser.is_deactivated

        // Teams this user is not in
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
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '30px',
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
                <X size={18} />
              </button>

              {/* Modal Header */}
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#fff', textTransform: 'capitalize' }}>
                  🛠️ Control Panel: {selectedUser.first_name} {selectedUser.last_name}
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedUser.email}</span>
              </div>

              {/* Success / Error Messages inside modal */}
              {modalError && (
                <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', fontSize: '0.85rem' }}>
                  {modalError}
                </div>
              )}
              {modalSuccess && (
                <div style={{ padding: '10px 14px', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid #4ade80', color: '#4ade80', borderRadius: '8px', fontSize: '0.85rem' }}>
                  {modalSuccess}
                </div>
              )}

              {/* Grid content */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '28px' }} className="apple-two-col-grid">
                
                {/* Left side: Account Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Platform Role management */}
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={14} style={{ color: '#818cf8' }} /> Platform Role
                    </h4>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleUpdatePlatformRole(selectedUser.id, 'user')}
                        className="btn"
                        disabled={modalSaving || selectedUser.platform_role === 'user'}
                        style={{
                          flex: 1,
                          fontSize: '0.8rem',
                          padding: '8px 12px',
                          background: selectedUser.platform_role === 'user' ? '#818cf8' : 'rgba(255,255,255,0.05)',
                          color: selectedUser.platform_role === 'user' ? '#0f172a' : '#94a3b8',
                          fontWeight: 'bold',
                          borderRadius: '8px'
                        }}
                      >
                        User Role
                      </button>
                      <button
                        onClick={() => handleUpdatePlatformRole(selectedUser.id, 'teamlead')}
                        className="btn"
                        disabled={modalSaving || selectedUser.platform_role === 'teamlead'}
                        style={{
                          flex: 1,
                          fontSize: '0.8rem',
                          padding: '8px 12px',
                          background: selectedUser.platform_role === 'teamlead' ? '#eab308' : 'rgba(255,255,255,0.05)',
                          color: selectedUser.platform_role === 'teamlead' ? '#0f172a' : '#94a3b8',
                          fontWeight: 'bold',
                          borderRadius: '8px'
                        }}
                      >
                        Team Lead
                      </button>
                    </div>
                  </div>

                  {/* Account Deactivation */}
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={14} style={{ color: '#fbbf24' }} /> Deactivate Account
                    </h4>
                    <button
                      onClick={() => handleToggleDeactivation(selectedUser.id, isDeactivated)}
                      disabled={modalSaving}
                      className="btn"
                      style={{
                        width: '100%',
                        fontSize: '0.85rem',
                        padding: '10px 14px',
                        background: isDeactivated ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        border: isDeactivated ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                        color: isDeactivated ? '#4ade80' : '#f87171',
                        fontWeight: '600',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      {isDeactivated ? '🔓 Activate Account' : '🔒 Block Portal Access'}
                    </button>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginTop: '6px', lineHeight: '1.4' }}>
                      Deactivating will lock the user out from accessing any views inside this application.
                    </span>
                  </div>

                  {/* Password Reset */}
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Key size={14} style={{ color: '#10b981' }} /> Password Recovery
                    </h4>
                    <button
                      onClick={() => handleSendResetEmail(selectedUser.email)}
                      disabled={modalSaving}
                      className="btn btn-secondary"
                      style={{
                        width: '100%',
                        fontSize: '0.85rem',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontWeight: '600'
                      }}
                    >
                      Send Reset Email
                    </button>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginTop: '6px' }}>
                      Sends a secure recovery link to the user's registered email address.
                    </span>
                  </div>

                </div>

                {/* Right side: Team Assignments & Activity Monitor */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Team Memberships */}
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Team Assignments ({userMems.length} / 2)
                    </h4>
                    {userMems.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                        {userMems.map(m => {
                          const t = teams.find(team => team.id === m.team_id)
                          return (
                            <div key={m.id} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px solid rgba(255,255,255,0.04)',
                              borderRadius: '8px'
                            }}>
                              <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '500' }}>
                                {t?.name || 'Unknown Team'} ({m.team_role})
                              </span>
                              <button
                                disabled={modalSaving}
                                onClick={() => handleRemoveFromTeam(selectedUser.id, m.team_id)}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  fontWeight: '600'
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: '0 0 14px 0', fontSize: '0.85rem' }}>No assigned teams.</p>
                    )}

                    {/* Add to Team mini-form */}
                    {!isMaxedOut ? (
                      availableTeams.length > 0 ? (
                        <form onSubmit={handleAddToTeam} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Team</label>
                              <select
                                value={newTeamId}
                                onChange={(e) => setNewTeamId(e.target.value)}
                                required
                                className="form-control"
                                style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                              >
                                <option value="" disabled>-- Select Team --</option>
                                {availableTeams.map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Role</label>
                              <select
                                value={newTeamRole}
                                onChange={(e) => setNewTeamRole(e.target.value)}
                                required
                                className="form-control"
                                style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                              >
                                <option value="member">Member</option>
                                <option value="lead">Team Lead</option>
                              </select>
                            </div>
                          </div>
                          <button
                            type="submit"
                            disabled={modalSaving || !newTeamId}
                            className="btn"
                            style={{ background: '#4ade80', color: '#0f172a', fontWeight: 'bold', fontSize: '0.8rem', width: '100%', padding: '6px 10px', borderRadius: '6px' }}
                          >
                            <Plus size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Assign to Team
                          </button>
                        </form>
                      ) : (
                        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.82rem' }}>User is already assigned to all active teams.</p>
                      )
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#fbbf24', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', padding: '6px 10px', borderRadius: '6px', display: 'block' }}>
                        ⚠️ Maximum limit of 2 team memberships reached.
                      </span>
                    )}
                  </div>

                  {/* Activity Log */}
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Activity size={14} style={{ color: '#38bdf8' }} /> Activity Timeline
                    </h4>
                    <div style={{
                      maxHeight: '180px',
                      overflowY: 'auto',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      {userActivities.length > 0 ? (
                        userActivities.map(act => (
                          <div key={act.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{act.icon}</span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.78rem', color: '#e2e8f0', lineHeight: '1.4' }}>{act.description}</span>
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {act.date.toLocaleDateString(undefined, { dateStyle: 'medium' })}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.82rem', textAlign: 'center', display: 'block', padding: '10px 0' }}>
                          No platform activity logged yet.
                        </span>
                      )}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>
        )
      })()}

    </div>
  )
}
