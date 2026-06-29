import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useOutletContext } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { Shield, Key, AlertTriangle, Activity, Trash2, ArrowLeft, User as UserIcon, PhoneCall, MapPin } from 'lucide-react'

export default function AdminUserControlPanel() {
  const { user: adminUser, featureAccess } = useOutletContext() || {}
  const canAccess = adminUser?.email === 'signatureglobalconferences@gmail.com' || !!featureAccess?.controlPanel
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  
  const [user, setUser] = useState(null)
  const [teams, setTeams] = useState([])
  const [revenues, setRevenues] = useState([])
  const [disReports, setDisReports] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [salesLogs, setSalesLogs] = useState([])

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  
  const [newTeamId, setNewTeamId] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, teamsRes, revRes, disRes, auditRes, salesRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', id).single(),
          supabase.from('teams').select('*').order('name', { ascending: true }),
          supabase.from('monthly_revenues').select('*').eq('user_id', id),
          supabase.from('dis_reports').select('*').eq('user_id', id),
          supabase.from('audit_logs').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(50),
          supabase.from('sales_analytics').select('*, teams(name), profiles:member_id(first_name, last_name)').eq('entered_by', id).order('call_date', { ascending: false })
        ])

        if (profileRes.error) throw profileRes.error
        
        setUser(profileRes.data)
        setTeams(teamsRes.data || [])
        setRevenues(revRes.data || [])
        setDisReports(disRes.data || [])
        setAuditLogs(auditRes.data || [])
        setSalesLogs(salesRes.data || [])
        setNewTeamId(profileRes.data.team_id || '')
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

      if (adminUser) {
        await supabase.from('audit_logs').insert({
          user_id: adminUser.id,
          action_type: 'admin_activity',
          details: { description: `Updated role of ${user.email} to ${newRole}` }
        })
      }

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

      if (adminUser) {
        await supabase.from('audit_logs').insert({
          user_id: adminUser.id,
          action_type: 'admin_activity',
          details: { description: `Updated ${field} for ${user.email} to ${nextStatus}` }
        })
      }

      let readableField = field
      if (field === 'has_revenue_logging') readableField = 'Revenue Logging'
      else if (field === 'has_dis_reporting') readableField = 'DIS Reporting'
      else if (field === 'is_sales_executive') readableField = 'Sales Executive'
      else if (field === 'require_gps_attendance') readableField = 'Require GPS Attendance'
      else if (field === 'require_ip_attendance') readableField = 'Require IP Attendance'
      else if (field === 'wfh_enabled') readableField = 'Work From Home'

      setSuccessMsg(`Successfully updated ${readableField} to ${nextStatus ? 'ON' : 'OFF'}`)
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

      if (adminUser) {
        await supabase.from('audit_logs').insert({
          user_id: adminUser.id,
          action_type: 'admin_activity',
          details: { description: `${nextStatus ? 'Deactivated' : 'Activated'} account for ${user.email}` }
        })
      }

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

  // Update User's Team Assignment
  const handleUpdateTeam = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ team_id: newTeamId || null })
        .eq('id', user.id)
      if (error) throw error

      if (adminUser) {
        const teamName = newTeamId ? teams.find(t => t.id === newTeamId)?.name : 'None'
        await supabase.from('audit_logs').insert({
          user_id: adminUser.id,
          action_type: 'admin_activity',
          details: { description: `Updated team assignment for ${user.email} to ${teamName}` }
        })
      }

      setSuccessMsg('Team assignment updated successfully!')
      setUser({ ...user, team_id: newTeamId || null })
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update team assignment.')
    } finally {
      setSaving(false)
    }
  }

  // Remove User from Team
  const handleRemoveFromTeam = async () => {
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ team_id: null })
        .eq('id', user.id)
      if (error) throw error

      if (adminUser) {
        await supabase.from('audit_logs').insert({
          user_id: adminUser.id,
          action_type: 'admin_activity',
          details: { description: `Removed ${user.email} from their team` }
        })
      }

      setSuccessMsg('User removed from team successfully!')
      setNewTeamId('')
      setUser({ ...user, team_id: null })
    } catch (err) {
      setErrorMsg(err.message || 'Failed to remove user from team.')
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

    for (const log of auditLogs) {
      if (log.action_type === 'page_view') {
        activities.push({
          id: `log-${log.id}`,
          type: 'page_view',
          date: new Date(log.created_at),
          description: `Navigated to ${log.details?.page_name || log.details?.path || 'a page'}`,
          icon: '👀'
        })
      } else if (log.action_type === 'login') {
        const dev = log.details?.device ? ` from ${log.details.device}` : ''
        activities.push({
          id: `log-${log.id}`,
          type: 'login',
          date: new Date(log.created_at),
          description: `Logged in successfully${dev}`,
          icon: '🔑'
        })
      } else if (log.action_type === 'admin_activity') {
        activities.push({
          id: `log-${log.id}`,
          type: 'admin',
          date: new Date(log.created_at),
          description: log.details?.description || 'Performed admin activity',
          icon: '⚙️'
        })
      }
    }

    return activities.sort((a, b) => b.date - a.date)
  }, [user, revenues, disReports, teams, auditLogs])

  if (loading) return (
    <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div style={{ color: 'var(--apple-text-secondary)', fontSize: '1.1rem', fontWeight: '500' }}>Loading user data...</div>
    </div>
  )

  if (!canAccess) return (
    <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div style={{ color: '#ef4444', fontSize: '1.2rem', fontWeight: '600' }}>Access Denied</div>
    </div>
  )

  if (!user) return <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>User not found.</div>

  const isDeactivated = !!user.is_deactivated
  const currentTeam = user.team_id ? teams.find(t => t.id === user.team_id) : null

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '24px' }}>
        
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
                style={{ position: 'relative', display: 'inline-block', width: '40px', minWidth: '40px', height: '24px', minHeight: '24px', borderRadius: '14px', padding: 0, background: user.has_revenue_logging  ? 'var(--apple-accent-blue)' : 'rgba(150, 150, 150, 0.25)', border: '1px solid rgba(255, 255, 255, 0.05)', cursor: 'pointer', transition: 'background 150ms ease', flexShrink: 0 }}
              >
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: user.has_revenue_logging  ? '16px' : '0px', transition: 'left 150ms ease' }} />
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
              <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: '500' }}>DIS Reporting</span>
              <button
                onClick={() => handleToggleAccess('has_dis_reporting', user.has_dis_reporting)}
                disabled={saving}
                style={{ position: 'relative', display: 'inline-block', width: '40px', minWidth: '40px', height: '24px', minHeight: '24px', borderRadius: '14px', padding: 0, background: user.has_dis_reporting  ? 'var(--apple-accent-blue)' : 'rgba(150, 150, 150, 0.25)', border: '1px solid rgba(255, 255, 255, 0.05)', cursor: 'pointer', transition: 'background 150ms ease', flexShrink: 0 }}
              >
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: user.has_dis_reporting  ? '16px' : '0px', transition: 'left 150ms ease' }} />
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
              <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: '500' }}>Sales Executive</span>
              <button
                onClick={() => handleToggleAccess('is_sales_executive', user.is_sales_executive)}
                disabled={saving}
                style={{ position: 'relative', display: 'inline-block', width: '40px', minWidth: '40px', height: '24px', minHeight: '24px', borderRadius: '14px', padding: 0, background: user.is_sales_executive  ? 'var(--apple-accent-blue)' : 'rgba(150, 150, 150, 0.25)', border: '1px solid rgba(255, 255, 255, 0.05)', cursor: 'pointer', transition: 'background 150ms ease', flexShrink: 0 }}
              >
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: user.is_sales_executive  ? '16px' : '0px', transition: 'left 150ms ease' }} />
              </button>
            </div>
          </div>
        </div>

        {/* Card 1.5: Attendance Settings */}
        <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h3 className="apple-title-small" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} style={{ color: '#ec4899' }} /> Attendance Settings
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: '500' }}>Work From Home (WFH)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>Bypasses location/IP verification</span>
              </div>
              <button
                onClick={() => handleToggleAccess('wfh_enabled', user.wfh_enabled)}
                disabled={saving}
                style={{ position: 'relative', display: 'inline-block', width: '40px', minWidth: '40px', height: '24px', minHeight: '24px', borderRadius: '14px', padding: 0, background: user.wfh_enabled  ? 'var(--apple-accent-blue)' : 'rgba(150, 150, 150, 0.25)', border: '1px solid rgba(255, 255, 255, 0.05)', cursor: 'pointer', transition: 'background 150ms ease', flexShrink: 0 }}
              >
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: user.wfh_enabled  ? '16px' : '0px', transition: 'left 150ms ease' }} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: '500' }}>Require Office GPS</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>Must be at office coordinates</span>
              </div>
              <button
                onClick={() => handleToggleAccess('require_gps_attendance', user.require_gps_attendance !== false)}
                disabled={saving}
                style={{ position: 'relative', display: 'inline-block', width: '40px', minWidth: '40px', height: '24px', minHeight: '24px', borderRadius: '14px', padding: 0, background: user.require_gps_attendance !== false  ? 'var(--apple-accent-blue)' : 'rgba(150, 150, 150, 0.25)', border: '1px solid rgba(255, 255, 255, 0.05)', cursor: 'pointer', transition: 'background 150ms ease', flexShrink: 0 }}
              >
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: user.require_gps_attendance !== false  ? '16px' : '0px', transition: 'left 150ms ease' }} />
              </button>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: '500' }}>Require Office Wi-Fi/IP</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>Must be connected to office network</span>
              </div>
              <button
                onClick={() => handleToggleAccess('require_ip_attendance', user.require_ip_attendance !== false)}
                disabled={saving}
                style={{ position: 'relative', display: 'inline-block', width: '40px', minWidth: '40px', height: '24px', minHeight: '24px', borderRadius: '14px', padding: 0, background: user.require_ip_attendance !== false  ? 'var(--apple-accent-blue)' : 'rgba(150, 150, 150, 0.25)', border: '1px solid rgba(255, 255, 255, 0.05)', cursor: 'pointer', transition: 'background 150ms ease', flexShrink: 0 }}
              >
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: user.require_ip_attendance !== false  ? '16px' : '0px', transition: 'left 150ms ease' }} />
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
            {currentTeam ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--apple-border)', borderRadius: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '500' }}>{currentTeam.name}</span>
                <button
                  disabled={saving}
                  onClick={handleRemoveFromTeam}
                  style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            ) : (
              <p style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', margin: '0 0 16px 0', fontSize: '0.9rem' }}>No team assigned.</p>
            )}

            <form onSubmit={handleUpdateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select
                value={newTeamId}
                onChange={(e) => setNewTeamId(e.target.value)}
                required
                className="apple-input"
              >
                <option value="" disabled>-- Select a Team --</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={saving || !newTeamId}
                className="apple-btn apple-btn-primary"
                style={{ width: '100%' }}
              >
                {currentTeam ? 'Change Team Assignment' : 'Assign to Team'}
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

        {/* Sales Analytics (Only if is_sales_executive) */}
        {user.is_sales_executive && (
          <div className="apple-card" style={{ padding: '24px', gridColumn: '1 / -1' }}>
            <h3 className="apple-title-small" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PhoneCall size={18} style={{ color: '#4ade80' }} /> Sales Executive Analytics
            </h3>
            
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--apple-border)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: '600' }}>Total Calls Logged</div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#fff' }}>{salesLogs.length}</div>
              </div>
              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--apple-border)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: '600' }}>Total Revenue Generated</div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#4ade80' }}>
                  ${salesLogs.reduce((sum, log) => sum + Number(log.sales_revenue), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* List */}
            <div style={{ maxHeight: '400px', overflowY: 'auto', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--apple-border)', borderRadius: '12px' }}>
              {salesLogs.length > 0 ? (
                <div style={{ minWidth: '600px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.5fr auto', padding: '12px 16px', borderBottom: '1px solid var(--apple-border)', fontSize: '0.75rem', fontWeight: '600', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <div>Date</div>
                    <div>Team & Member</div>
                    <div>Speaker</div>
                    <div style={{ textAlign: 'right' }}>Revenue</div>
                  </div>
                  {salesLogs.map(log => (
                    <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.5fr auto', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.9rem' }}>{new Date(log.call_date).toLocaleDateString()}</div>
                      <div>
                        <div style={{ fontSize: '0.9rem' }}>{log.teams?.name || 'Unknown'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>{log.profiles?.first_name} {log.profiles?.last_name}</div>
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{log.speaker_name}</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: '600', color: Number(log.sales_revenue) > 0 ? '#4ade80' : 'var(--apple-text-secondary)', textAlign: 'right' }}>
                        ${Number(log.sales_revenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--apple-text-secondary)', fontStyle: 'italic' }}>
                  No call logs found for this executive.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
