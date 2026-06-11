import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { Shield, Key, AlertTriangle, Activity, Trash2, ArrowLeft, User as UserIcon } from 'lucide-react'

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
  
  const [newTeamId, setNewTeamId] = useState('')
  const [secondaryTeamIds, setSecondaryTeamIds] = useState([])

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
        setNewTeamId(profileRes.data.team_id || '')
        setSecondaryTeamIds(profileRes.data.secondary_team_ids || [])
      } catch (err) {
        console.error('Error loading user data:', err)
        setErrorMsg('Failed to load user profile.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  // Update Platform Role
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

  // Toggle Access Flags
  const handleToggleAccess = async (field, currentStatus) => {
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')
    const nextStatus = !currentStatus
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: nextStatus })
        .eq('id', user.id)
      if (error) throw error

      setSuccessMsg(`Successfully updated ${field === 'has_revenue_logging' ? 'Revenue Logging' : 'DIS Reporting'} to ${nextStatus ? 'ON' : 'OFF'}`)
      setUser({ ...user, [field]: nextStatus })
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update access status.')
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

  // Update User's Team Assignment (Primary & Secondary)
  const handleUpdateTeams = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          team_id: newTeamId || null,
          secondary_team_ids: secondaryTeamIds
        })
        .eq('id', user.id)
      if (error) throw error

      setSuccessMsg('Team assignments updated successfully!')
      setUser({ ...user, team_id: newTeamId || null, secondary_team_ids: secondaryTeamIds })
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update team assignments.')
    } finally {
      setSaving(false)
    }
  }

  // Handle toggling secondary teams in the checklist
  const handleToggleSecondaryTeam = (teamId) => {
    if (secondaryTeamIds.includes(teamId)) {
      setSecondaryTeamIds(secondaryTeamIds.filter(id => id !== teamId))
    } else {
      setSecondaryTeamIds([...secondaryTeamIds, teamId])
    }
  }

  // Remove User from Primary Team
  const handleRemoveFromPrimaryTeam = async () => {
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ team_id: null })
        .eq('id', user.id)
      if (error) throw error

      setSuccessMsg('User removed from primary team successfully!')
      setNewTeamId('')
      setUser({ ...user, team_id: null })
    } catch (err) {
      setErrorMsg(err.message || 'Failed to remove user from primary team.')
    } finally {
      setSaving(false)
    }
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

    if (user.team_id) {
      const team = teams.find(t => t.id === user.team_id)
      activities.push({
        id: `team-assigned`,
        type: 'team',
        date: new Date(user.created_at),
        description: `Assigned to team "${team ? team.name : 'Unknown'}"`,
        icon: '👥'
      })
    }

    return activities.sort((a, b) => b.date - a.date)
  }, [user, revenues, disReports, teams])

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>Loading user profile...</div>
  if (!user) return <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>User not found.</div>

  const isDeactivated = !!user.is_deactivated
  const currentTeam = user.team_id ? teams.find(t => t.id === user.team_id) : null
  const currentSecondaryTeams = user.secondary_team_ids 
    ? teams.filter(t => user.secondary_team_ids.includes(t.id)) 
    : []

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
        
        {/* Card 1: Role & Access */}
        <div className="apple-card" style={{ padding: '24px' }}>
          <h3 className="apple-title-small" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} style={{ color: '#818cf8' }} /> Access Controls
          </h3>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase' }}>Platform Role</label>
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
                User Role
              </button>
              <button
                onClick={() => handleUpdatePlatformRole('teamlead')}
                disabled={saving || user.platform_role === 'teamlead'}
                className="apple-btn"
                style={{
                  flex: 1,
                  background: user.platform_role === 'teamlead' ? '#eab308' : 'rgba(255,255,255,0.05)',
                  color: user.platform_role === 'teamlead' ? '#0f172a' : '#94a3b8',
                  borderColor: user.platform_role === 'teamlead' ? '#eab308' : 'var(--apple-border)'
                }}
              >
                Team Lead
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '2px', fontWeight: '600', textTransform: 'uppercase' }}>Feature Access</label>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
              <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: '500' }}>Revenue Logging</span>
              <button
                onClick={() => handleToggleAccess('has_revenue_logging', user.has_revenue_logging)}
                disabled={saving}
                style={{
                  width: '44px', height: '24px', borderRadius: '12px',
                  background: user.has_revenue_logging ? '#4ade80' : '#475569',
                  border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
                }}
              >
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: user.has_revenue_logging ? '23px' : '3px', transition: 'left 0.3s' }} />
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
              <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: '500' }}>DIS Reporting</span>
              <button
                onClick={() => handleToggleAccess('has_dis_reporting', user.has_dis_reporting)}
                disabled={saving}
                style={{
                  width: '44px', height: '24px', borderRadius: '12px',
                  background: user.has_dis_reporting ? '#4ade80' : '#475569',
                  border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
                }}
              >
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: user.has_dis_reporting ? '23px' : '3px', transition: 'left 0.3s' }} />
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Security & Organization */}
        <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h3 className="apple-title-small" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={18} style={{ color: '#10b981' }} /> Security
            </h3>
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

          <div style={{ height: '1px', background: 'var(--apple-border)', width: '100%' }} />

          <div>
            <h3 className="apple-title-small" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserIcon size={18} style={{ color: '#f59e0b' }} /> Team Assignment
            </h3>
            
            {/* Primary Team Info */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--apple-text-secondary)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>Primary Team</label>
              {currentTeam ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,160,0,0.05)', border: '1px solid rgba(255,160,0,0.2)', borderRadius: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '600' }}>{currentTeam.name}</span>
                  <button
                    disabled={saving}
                    onClick={handleRemoveFromPrimaryTeam}
                    style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              ) : (
                <p style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', margin: '0 0 12px 0', fontSize: '0.9rem' }}>No primary team assigned.</p>
              )}
            </div>

            {/* Secondary Teams Info */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--apple-text-secondary)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>Secondary Teams</label>
              {currentSecondaryTeams.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {currentSecondaryTeams.map(t => (
                    <span key={t.id} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--apple-border)', borderRadius: '8px', fontSize: '0.85rem', color: '#e2e8f0' }}>
                      {t.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', margin: '0 0 16px 0', fontSize: '0.85rem' }}>No secondary teams assigned.</p>
              )}
            </div>

            <form onSubmit={handleUpdateTeams} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--apple-border)', borderRadius: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--apple-text-secondary)', marginBottom: '6px', fontWeight: '500' }}>Set Primary Team</label>
                <select
                  value={newTeamId}
                  onChange={(e) => setNewTeamId(e.target.value)}
                  className="apple-input"
                  style={{ width: '100%', marginBottom: '12px' }}
                >
                  <option value="">-- None --</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--apple-text-secondary)', marginBottom: '8px', fontWeight: '500' }}>Select Secondary Teams (Optional)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '140px', overflowY: 'auto', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {teams.filter(t => t.id !== newTeamId).map(t => (
                    <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#e2e8f0', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={secondaryTeamIds.includes(t.id)}
                        onChange={() => handleToggleSecondaryTeam(t.id)}
                        style={{ accentColor: 'var(--apple-accent-blue)' }}
                      />
                      {t.name}
                    </label>
                  ))}
                  {teams.filter(t => t.id !== newTeamId).length === 0 && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)', fontStyle: 'italic' }}>No other teams available.</span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="apple-btn apple-btn-primary"
                style={{ width: '100%', marginTop: '8px' }}
              >
                Save Team Assignments
              </button>
            </form>
          </div>
        </div>

        {/* Card 3: Activity Timeline */}
        <div className="apple-card" style={{ padding: '24px', gridColumn: '1 / -1' }}>
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
