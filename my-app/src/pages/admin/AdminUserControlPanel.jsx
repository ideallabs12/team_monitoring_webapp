import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { Shield, Key, Activity, ArrowLeft, User as UserIcon, Plus, Check } from 'lucide-react'

export default function AdminUserControlPanel() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  
  const [user, setUser] = useState(null)
  const [teams, setTeams] = useState([])
  const [revenues, setRevenues] = useState([])
  const [disReports, setDisReports] = useState([])

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  
  // New unified team settings
  const [teamSettings, setTeamSettings] = useState({})
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [newTeamIdToAdd, setNewTeamIdToAdd] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, teamsRes, revRes, disRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', id).single(),
          supabase.from('teams').select('*').order('name', { ascending: true }),
          supabase.from('monthly_revenues').select('*').eq('user_id', id),
          supabase.from('dis_reports').select('*').eq('user_id', id)
        ])

        if (profileRes.error) throw profileRes.error
        
        setUser(profileRes.data)
        setTeams(teamsRes.data || [])
        setRevenues(revRes.data || [])
        setDisReports(disRes.data || [])
        
        const settings = profileRes.data.team_settings || {}
        setTeamSettings(settings)
        
        const assignedIds = Object.keys(settings)
        if (assignedIds.length > 0) {
          setSelectedTeamId(assignedIds[0])
        }
      } catch (err) {
        console.error('Error loading user data:', err)
        setErrorMsg('Failed to load user profile.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  // Update Platform Role (Global)
  const handleUpdatePlatformRole = async (newRole) => {
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ platform_role: newRole })
        .eq('id', user.id)
      if (error) throw error

      setSuccessMsg(`Platform role updated to ${newRole}!`)
      setUser({ ...user, platform_role: newRole })
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update platform role.')
    } finally {
      setSaving(false)
    }
  }

  // Toggle Account Activation/Deactivation
  const handleToggleDeactivation = async (currentStatus) => {
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')
    const nextStatus = !currentStatus
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_deactivated: nextStatus })
        .eq('id', user.id)
      if (error) throw error

      setSuccessMsg(nextStatus ? 'Account successfully deactivated!' : 'Account successfully activated!')
      setUser({ ...user, is_deactivated: nextStatus })
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update activation status.')
    } finally {
      setSaving(false)
    }
  }

  // Send Password Reset Email
  const handleSendResetEmail = async () => {
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error
      setSuccessMsg('Password reset link sent to user email successfully!')
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send password reset email.')
    } finally {
      setSaving(false)
    }
  }

  // Update Team Settings in DB
  const saveTeamSettingsToDb = async (newSettings) => {
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      // Also maintain team_id for backward compatibility if needed, using the first assigned team as primary
      const assignedIds = Object.keys(newSettings)
      const primaryTeamId = assignedIds.length > 0 ? assignedIds[0] : null

      const { error } = await supabase
        .from('profiles')
        .update({ 
          team_settings: newSettings,
          team_id: primaryTeamId
        })
        .eq('id', user.id)
      if (error) throw error

      setSuccessMsg('Team assignments and permissions updated successfully!')
      setTeamSettings(newSettings)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update team settings.')
      // Revert local state on error
      setTeamSettings(user.team_settings || {})
    } finally {
      setSaving(false)
    }
  }

  const handleAddTeam = async () => {
    if (!newTeamIdToAdd) return
    const newSettings = { 
      ...teamSettings, 
      [newTeamIdToAdd]: { role: 'member', has_revenue: true, has_dis: true } 
    }
    await saveTeamSettingsToDb(newSettings)
    setSelectedTeamId(newTeamIdToAdd)
    setNewTeamIdToAdd('')
  }

  const handleRemoveTeam = async (teamIdToRemove) => {
    const newSettings = { ...teamSettings }
    delete newSettings[teamIdToRemove]
    
    await saveTeamSettingsToDb(newSettings)
    
    if (selectedTeamId === teamIdToRemove) {
      const remainingIds = Object.keys(newSettings)
      setSelectedTeamId(remainingIds.length > 0 ? remainingIds[0] : '')
    }
  }

  const handleUpdateTeamPermission = async (teamId, field, value) => {
    const newSettings = {
      ...teamSettings,
      [teamId]: {
        ...teamSettings[teamId],
        [field]: value
      }
    }
    // Optimistic UI update
    setTeamSettings(newSettings)
    await saveTeamSettingsToDb(newSettings)
  }

  // Compile Dynamic Activity Logs
  const userActivities = useMemo(() => {
    if (!user) return []
    const activities = []

    for (const r of revenues) {
      const team = teams.find(t => t.id === r.team_id)
      activities.push({
        id: `rev-${r.id}`,
        type: 'revenue',
        date: new Date(r.created_at || r.revenue_month),
        description: `Logged revenue contribution of $${Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} for team "${team ? team.name : 'Unknown'}"`,
        icon: '💰'
      })
    }

    for (const d of disReports) {
      activities.push({
        id: `dis-${d.id}`,
        type: 'dis',
        date: new Date(d.report_date),
        description: `Submitted Daily Information Sheet (DIS) with ${d.positive_leads} positive leads and $${Number(d.expected_revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })} expected revenue`,
        icon: '📝'
      })
    }

    return activities.sort((a, b) => b.date - a.date)
  }, [user, revenues, disReports, teams])

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>Loading user profile...</div>
  if (!user) return <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>User not found.</div>

  const isDeactivated = !!user.is_deactivated
  const assignedTeamIds = Object.keys(teamSettings)

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* Header & Back Link */}
      <div style={{ marginBottom: '24px' }}>
        <Link to="/admin/users" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--apple-accent-blue)', textDecoration: 'none', marginBottom: '24px', fontWeight: '500' }}>
          <ArrowLeft size={16} /> Back to Users Directory
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--apple-card)', border: '1px solid var(--apple-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <UserIcon size={32} />
          </div>
          <div>
            <h1 className="apple-title-large" style={{ margin: '0 0 4px 0', textTransform: 'capitalize' }}>
              {user.first_name} {user.last_name}
            </h1>
            <p style={{ margin: 0, color: 'var(--apple-text-secondary)' }}>{user.email} • Joined {new Date(user.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '12px', fontSize: '0.9rem', marginBottom: '24px' }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '12px 16px', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', color: '#4ade80', borderRadius: '12px', fontSize: '0.9rem', marginBottom: '24px' }}>
          {successMsg}
        </div>
      )}

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Card 1: Team Assignments & Permissions */}
        <div className="apple-card" style={{ padding: '24px', gridColumn: '1 / -1' }}>
          <h3 className="apple-title-small" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} style={{ color: '#818cf8' }} /> Team Permissions
          </h3>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {/* Left side: Team Selector */}
            <div style={{ flex: '1', minWidth: '250px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase' }}>Assigned Teams</label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {assignedTeamIds.length === 0 ? (
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--apple-border)', color: 'var(--apple-text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    No teams assigned.
                  </div>
                ) : (
                  assignedTeamIds.map(tId => {
                    const t = teams.find(x => x.id === tId)
                    const isSelected = selectedTeamId === tId
                    return (
                      <div 
                        key={tId} 
                        onClick={() => setSelectedTeamId(tId)}
                        style={{ 
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                          padding: '12px 16px', 
                          background: isSelected ? 'rgba(0, 113, 227, 0.1)' : 'rgba(255,255,255,0.02)', 
                          borderRadius: '12px', 
                          border: isSelected ? '1px solid var(--apple-accent-blue)' : '1px solid var(--apple-border)',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.95rem', color: isSelected ? '#fff' : '#e2e8f0', fontWeight: isSelected ? '600' : '500' }}>
                            {t?.name}
                          </span>
                          <span className={teamSettings[tId].role === 'teamlead' ? "apple-badge apple-badge-orange" : "apple-badge apple-badge-blue"} style={{ fontSize: '0.65rem', padding: '2px 6px', textTransform: 'capitalize' }}>
                            {teamSettings[tId].role}
                          </span>
                        </div>
                        {isSelected && <Check size={16} color="var(--apple-accent-blue)" />}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Add Team Dropdown */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <select 
                  value={newTeamIdToAdd} 
                  onChange={e => setNewTeamIdToAdd(e.target.value)}
                  className="apple-input"
                  style={{ flex: 1 }}
                >
                  <option value="">-- Add Team --</option>
                  {teams.filter(t => !teamSettings[t.id]).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button 
                  onClick={handleAddTeam} 
                  disabled={!newTeamIdToAdd || saving} 
                  className="apple-btn apple-btn-primary" 
                  style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} /> Add
                </button>
              </div>
            </div>

            {/* Right side: Team Specific Settings */}
            <div style={{ flex: '2', minWidth: '300px', background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '16px', border: '1px solid var(--apple-border)' }}>
              {selectedTeamId && teamSettings[selectedTeamId] ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{teams.find(t => t.id === selectedTeamId)?.name} Settings</h4>
                    <button 
                      onClick={() => handleRemoveTeam(selectedTeamId)}
                      disabled={saving}
                      style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}
                    >
                      Remove from Team
                    </button>
                  </div>

                  {/* Role Selection */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>Team Role</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleUpdateTeamPermission(selectedTeamId, 'role', 'member')}
                        disabled={saving || teamSettings[selectedTeamId].role === 'member'}
                        className="apple-btn"
                        style={{
                          flex: 1,
                          background: teamSettings[selectedTeamId].role === 'member' ? '#818cf8' : 'rgba(255,255,255,0.05)',
                          color: teamSettings[selectedTeamId].role === 'member' ? '#0f172a' : '#94a3b8',
                          borderColor: teamSettings[selectedTeamId].role === 'member' ? '#818cf8' : 'var(--apple-border)'
                        }}
                      >
                        Member
                      </button>
                      <button
                        onClick={() => handleUpdateTeamPermission(selectedTeamId, 'role', 'teamlead')}
                        disabled={saving || teamSettings[selectedTeamId].role === 'teamlead'}
                        className="apple-btn"
                        style={{
                          flex: 1,
                          background: teamSettings[selectedTeamId].role === 'teamlead' ? '#eab308' : 'rgba(255,255,255,0.05)',
                          color: teamSettings[selectedTeamId].role === 'teamlead' ? '#0f172a' : '#94a3b8',
                          borderColor: teamSettings[selectedTeamId].role === 'teamlead' ? '#eab308' : 'var(--apple-border)'
                        }}
                      >
                        Team Lead
                      </button>
                    </div>
                  </div>

                  {/* Feature Access Toggles */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '2px', fontWeight: '600', textTransform: 'uppercase' }}>Feature Access</label>
                    
                    {/* Revenue Toggle */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
                      <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: '500' }}>Revenue Logging</span>
                      <button
                        onClick={() => handleUpdateTeamPermission(selectedTeamId, 'has_revenue', !teamSettings[selectedTeamId].has_revenue)}
                        disabled={saving}
                        style={{
                          width: '44px', height: '24px', borderRadius: '12px',
                          background: teamSettings[selectedTeamId].has_revenue ? '#4ade80' : '#475569',
                          border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
                        }}
                      >
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: teamSettings[selectedTeamId].has_revenue ? '23px' : '3px', transition: 'left 0.3s' }} />
                      </button>
                    </div>

                    {/* DIS Toggle */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
                      <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: '500' }}>DIS Reporting</span>
                      <button
                        onClick={() => handleUpdateTeamPermission(selectedTeamId, 'has_dis', !teamSettings[selectedTeamId].has_dis)}
                        disabled={saving}
                        style={{
                          width: '44px', height: '24px', borderRadius: '12px',
                          background: teamSettings[selectedTeamId].has_dis ? '#4ade80' : '#475569',
                          border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
                        }}
                      >
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: teamSettings[selectedTeamId].has_dis ? '23px' : '3px', transition: 'left 0.3s' }} />
                      </button>
                    </div>

                  </div>
                </div>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--apple-text-secondary)', fontStyle: 'italic' }}>
                  Select a team to configure its settings.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Security & Global Settings */}
        <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h3 className="apple-title-small" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={18} style={{ color: '#10b981' }} /> Security & Platform Access
            </h3>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase' }}>Global Role</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleUpdatePlatformRole('user')}
                  disabled={saving || user.platform_role === 'user'}
                  className="apple-btn"
                  style={{
                    flex: 1,
                    background: user.platform_role === 'user' ? '#818cf8' : 'rgba(255,255,255,0.05)',
                    color: user.platform_role === 'user' ? '#0f172a' : '#94a3b8',
                    borderColor: user.platform_role === 'user' ? '#818cf8' : 'var(--apple-border)'
                  }}
                >
                  Standard User
                </button>
                <button
                  onClick={() => handleUpdatePlatformRole('admin')}
                  disabled={saving || user.platform_role === 'admin'}
                  className="apple-btn"
                  style={{
                    flex: 1,
                    background: user.platform_role === 'admin' ? '#ef4444' : 'rgba(255,255,255,0.05)',
                    color: user.platform_role === 'admin' ? '#fff' : '#94a3b8',
                    borderColor: user.platform_role === 'admin' ? '#ef4444' : 'var(--apple-border)'
                  }}
                >
                  Admin
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => handleToggleDeactivation(isDeactivated)}
                disabled={saving}
                className="apple-btn"
                style={{
                  width: '100%',
                  background: isDeactivated ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: isDeactivated ? '#4ade80' : '#f87171',
                  borderColor: isDeactivated ? 'rgba(74, 222, 128, 0.2)' : 'rgba(239, 68, 68, 0.2)'
                }}
              >
                {isDeactivated ? '🔓 Reactivate Account' : '🔒 Block Portal Access'}
              </button>
              <button
                onClick={() => handleSendResetEmail()}
                disabled={saving}
                className="apple-btn apple-btn-secondary"
                style={{ width: '100%' }}
              >
                Send Password Reset Email
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: Activity Timeline */}
        <div className="apple-card" style={{ padding: '24px' }}>
          <h3 className="apple-title-small" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} style={{ color: '#38bdf8' }} /> Activity Timeline
          </h3>
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            background: 'rgba(255,255,255,0.01)',
            border: '1px solid var(--apple-border)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {userActivities.length > 0 ? (
              userActivities.map(act => (
                <div key={act.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{act.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: '1.4' }}>{act.description}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>
                      {act.date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <span style={{ fontStyle: 'italic', color: 'var(--apple-text-secondary)', fontSize: '0.9rem', textAlign: 'center', display: 'block', padding: '20px 0' }}>
                No platform activity logged yet.
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
