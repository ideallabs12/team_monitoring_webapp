import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { Users, Search, Shield, Key, AlertTriangle, Activity, X, Plus, Trash2, ArrowLeft, Mail, Phone, FileText, User as UserIcon, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import UserRevenue from '../user/UserRevenue'

let adminUsersCache = { loaded: false, users: [], teams: [], revenues: [], disReports: [] }

export default function AdminUsers() {
  const [loading, setLoading] = useState(!adminUsersCache.loaded)
  const [users, setUsers] = useState(adminUsersCache.users)
  const [teams, setTeams] = useState(adminUsersCache.teams)
  const [revenues, setRevenues] = useState(adminUsersCache.revenues)
  const [disReports, setDisReports] = useState(adminUsersCache.disReports)

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')

  // Profile Detail View State
  const [viewingProfileUser, setViewingProfileUser] = useState(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [userDisReports, setUserDisReports] = useState([])
  const [loadingDis, setLoadingDis] = useState(false)

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [newTeamId, setNewTeamId] = useState('')
  const [newSecondaryTeamId, setNewSecondaryTeamId] = useState('')
  const [userRevenues, setUserRevenues] = useState([])
  const [userSalesLogs, setUserSalesLogs] = useState([])
  const [loadingRevenues, setLoadingRevenues] = useState(false)

  // Load Details dynamically for the selected profile
  useEffect(() => {
    if (!viewingProfileUser) {
      setUserDisReports([])
      setUserRevenues([])
      setNewTeamId('')
      setErrorMsg('')
      setSuccessMsg('')
      setActiveTab('profile')
      return
    }

    setNewTeamId('')
    setNewSecondaryTeamId('')
    setErrorMsg('')
    setSuccessMsg('')

    async function fetchUserData() {
      setLoadingDis(true)
      setLoadingRevenues(true)
      try {
        const [disRes, revRes, salesRes] = await Promise.all([
          supabase
            .from('dis_reports')
            .select('*')
            .eq('user_id', viewingProfileUser.id)
            .order('report_date', { ascending: false }),
          supabase
            .from('monthly_revenues')
            .select('*')
            .eq('user_id', viewingProfileUser.id),
          supabase
            .from('sales_analytics')
            .select('*, teams(name), profiles:member_id(first_name, last_name)')
            .eq('entered_by', viewingProfileUser.id)
            .order('call_date', { ascending: false })
        ])

        if (disRes.error) throw disRes.error
        if (revRes.error) throw revRes.error

        setUserDisReports(disRes.data || [])
        setUserRevenues(revRes.data || [])
        setUserSalesLogs(salesRes.data || [])
      } catch (err) {
        console.error("Error loading user profile details:", err)
        setErrorMsg('Failed to load profile details.')
      } finally {
        setLoadingDis(false)
        setLoadingRevenues(false)
      }
    }
    fetchUserData()
  }, [viewingProfileUser])

  // Helper helper to update profile state & main state
  const updateProfileUser = (updatedFields) => {
    const updatedUser = { ...viewingProfileUser, ...updatedFields }
    setViewingProfileUser(updatedUser)
    setUsers(prevUsers => {
      const updatedList = prevUsers.map(u => u.id === viewingProfileUser.id ? updatedUser : u)
      adminUsersCache.users = updatedList
      return updatedList
    })
  }

  // Update Platform Role
  const handleUpdatePlatformRole = async (newRole) => {
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ platform_role: newRole })
        .eq('id', viewingProfileUser.id)
      if (error) throw error

      setSuccessMsg(`Platform role updated to ${newRole}!`)
      updateProfileUser({ platform_role: newRole })
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
        .eq('id', viewingProfileUser.id)
      if (error) throw error

      let readableField = field
      if (field === 'has_revenue_logging') readableField = 'Revenue Logging'
      else if (field === 'has_dis_reporting') readableField = 'DIS Reporting'
      else if (field === 'is_sales_executive') readableField = 'Sales Executive'
      else if (field === 'require_gps_attendance') readableField = 'Require GPS Attendance'
      else if (field === 'require_ip_attendance') readableField = 'Require IP Attendance'
      else if (field === 'wfh_enabled') readableField = 'Work From Home'

      setSuccessMsg(`Successfully updated ${readableField} to ${nextStatus ? 'ON' : 'OFF'}`)
      updateProfileUser({ [field]: nextStatus })
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
        .eq('id', viewingProfileUser.id)
      if (error) throw error

      setSuccessMsg(nextStatus ? 'Account successfully deactivated!' : 'Account successfully activated!')
      updateProfileUser({ is_deactivated: nextStatus })
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
      const { error } = await supabase.auth.resetPasswordForEmail(viewingProfileUser.email, {
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
        .eq('id', viewingProfileUser.id)
      if (error) throw error

      setSuccessMsg('Team assignment updated successfully!')
      updateProfileUser({ team_id: newTeamId || null })
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
        .eq('id', viewingProfileUser.id)
      if (error) throw error

      setSuccessMsg('User removed from team successfully!')
      setNewTeamId('')
      updateProfileUser({ team_id: null })
    } catch (err) {
      setErrorMsg(err.message || 'Failed to remove user from team.')
    } finally {
      setSaving(false)
    }
  }

  // Update User's Secondary Team Assignment
  const handleUpdateSecondaryTeam = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ secondary_team_id: newSecondaryTeamId || null })
        .eq('id', viewingProfileUser.id)
      if (error) throw error

      setSuccessMsg('Secondary Team assignment updated successfully!')
      updateProfileUser({ secondary_team_id: newSecondaryTeamId || null })
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update secondary team assignment.')
    } finally {
      setSaving(false)
    }
  }

  // Remove User from Secondary Team
  const handleRemoveFromSecondaryTeam = async () => {
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ secondary_team_id: null })
        .eq('id', viewingProfileUser.id)
      if (error) throw error

      setSuccessMsg('User removed from secondary team successfully!')
      setNewSecondaryTeamId('')
      updateProfileUser({ secondary_team_id: null })
    } catch (err) {
      setErrorMsg(err.message || 'Failed to remove user from secondary team.')
    } finally {
      setSaving(false)
    }
  }

  // Compile Dynamic Activity Logs
  const userActivities = useMemo(() => {
    if (!viewingProfileUser) return []
    const activities = []

    for (const r of userRevenues) {
      const team = teams.find(t => t.id === r.team_id)
      activities.push({
        id: `rev-${r.id}`,
        type: 'revenue',
        date: new Date(r.created_at || r.revenue_month),
        description: `Logged revenue contribution of $${Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} for team "${team ? team.name : 'Unknown'}"`,
        icon: '💰'
      })
    }

    for (const d of userDisReports) {
      activities.push({
        id: `dis-${d.id}`,
        type: 'dis',
        date: new Date(d.report_date),
        description: `Submitted Daily Information Sheet (DIS) with ${d.positive_leads} positive leads and $${Number(d.expected_revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })} expected revenue`,
        icon: '📝'
      })
    }

    if (viewingProfileUser.team_id) {
      const team = teams.find(t => t.id === viewingProfileUser.team_id)
      activities.push({
        id: `team-assigned`,
        type: 'team',
        date: new Date(viewingProfileUser.created_at),
        description: `Assigned to team "${team ? team.name : 'Unknown'}"`,
        icon: '👥'
      })
    }

    return activities.sort((a, b) => b.date - a.date)
  }, [viewingProfileUser, userRevenues, userDisReports, teams])

  const loadData = async () => {
    try {
      const [profilesRes, teamsRes, revRes, disRes] = await Promise.all([
        supabase.from('profiles').select('*').order('first_name', { ascending: true }),
        supabase.from('teams').select('*').order('name', { ascending: true }),
        supabase.from('monthly_revenues').select('*'),
        supabase.from('dis_reports').select('*')
      ])

      if (profilesRes.error) throw profilesRes.error
      if (teamsRes.error) throw teamsRes.error

      const u = profilesRes.data || []
      const t = teamsRes.data || []
      const r = revRes.data || []
      const d = disRes.data || []

      setUsers(u)
      setTeams(t)
      setRevenues(r)
      setDisReports(d)

      adminUsersCache = { loaded: true, users: u, teams: t, revenues: r, disReports: d }
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
      
      const userTeam = user.team_id ? teams.find(t => t.id === user.team_id)?.name.toLowerCase() : ''

      const query = searchQuery.toLowerCase()
      return (
        fullName.includes(query) ||
        email.includes(query) ||
        userTeam.includes(query)
      )
    })
  }, [nonAdminUsers, teams, searchQuery])

  // End modal logic removal

  if (viewingProfileUser) {
    const memberTeam = teams.find(t => t.id === viewingProfileUser.team_id)
    const secondaryTeam = teams.find(t => t.id === viewingProfileUser.secondary_team_id)
    const isDeactivated = !!viewingProfileUser.is_deactivated

    const normalizedRole = viewingProfileUser.platform_role?.toLowerCase() || 'user'
    const isTeamLeadRole = normalizedRole === 'teamlead' || normalizedRole === 'team lead'
    const isUserRole = !isTeamLeadRole && normalizedRole !== 'admin'

    return (
      <div style={{ animation: 'fadeIn 0.3s var(--apple-ease)', paddingBottom: '60px' }}>
        {/* Back navigation left top hero section */}
        <button
          onClick={() => setViewingProfileUser(null)}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--apple-border)',
            color: 'var(--apple-text-primary)',
            padding: '10px 18px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '28px',
            transition: 'all 0.25s var(--apple-ease)'
          }}
          className="apple-btn-secondary"
        >
          <ArrowLeft size={16} /> Back to Directory
        </button>

        {/* Status Messages */}
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

        {/* Apple-themed Segmented Control */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.05)',
            padding: '4px',
            borderRadius: '16px',
            border: '1px solid var(--apple-border)'
          }}>
            <button
              onClick={() => setActiveTab('profile')}
              style={{
                padding: '8px 24px',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === 'profile' ? 'var(--apple-accent-blue)' : 'transparent',
                color: activeTab === 'profile' ? '#fff' : 'var(--apple-text-secondary)',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s var(--apple-ease)'
              }}
            >
              Profile & Analytics
            </button>
            <button
              onClick={() => setActiveTab('control_panel')}
              style={{
                padding: '8px 24px',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === 'control_panel' ? 'var(--apple-accent-blue)' : 'transparent',
                color: activeTab === 'control_panel' ? '#fff' : 'var(--apple-text-secondary)',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s var(--apple-ease)'
              }}
            >
              Control Panel
            </button>
          </div>
        </div>

        {/* Card 1.1: Profile Details (Moved to Top) */}
        <div className="apple-card" style={{ padding: '24px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0071e3, #30d5c8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: 'white'
            }}>
              {viewingProfileUser.first_name?.[0]?.toUpperCase() || 'M'}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--apple-text-primary)', fontWeight: '700' }}>
                {viewingProfileUser.first_name} {viewingProfileUser.last_name}
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>
                {viewingProfileUser.platform_role || 'Member'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ borderBottom: '1px solid var(--apple-border)', paddingBottom: '10px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '2px', fontWeight: '500' }}>
                <Mail size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Email Address
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--apple-text-primary)', fontWeight: '500' }}>{viewingProfileUser.email}</div>
            </div>

            <div style={{ borderBottom: '1px solid var(--apple-border)', paddingBottom: '10px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '2px', fontWeight: '500' }}>
                <Phone size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Phone Number
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--apple-text-primary)', fontWeight: '500' }}>{viewingProfileUser.phone || '—'}</div>
            </div>

          </div>
        </div>

        {activeTab === 'control_panel' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '28px', marginBottom: '28px' }}>
          {/* Two Column Grid */}
          
          {/* Column 1: Access Controls (Profile info moved up) */}
            {/* Card 1.2: Access Controls */}
            <div className="apple-card" style={{ padding: '24px' }}>
              <h3 className="apple-title-small" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} style={{ color: '#818cf8' }} /> Access Controls
              </h3>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase' }}>Platform Role</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleUpdatePlatformRole('user')}
                    disabled={saving || isUserRole}
                    className="apple-btn"
                    style={{
                      flex: 1,
                      background: isUserRole ? '#818cf8' : 'rgba(255,255,255,0.05)',
                      color: isUserRole ? '#0f172a' : 'var(--apple-text-secondary)',
                      borderColor: isUserRole ? '#818cf8' : 'var(--apple-border)',
                      cursor: 'pointer'
                    }}
                  >
                    User Role
                  </button>
                  <button
                    onClick={() => handleUpdatePlatformRole('teamlead')}
                    disabled={saving || isTeamLeadRole}
                    className="apple-btn"
                    style={{
                      flex: 1,
                      background: isTeamLeadRole ? '#eab308' : 'rgba(255,255,255,0.05)',
                      color: isTeamLeadRole ? '#0f172a' : 'var(--apple-text-secondary)',
                      borderColor: isTeamLeadRole ? '#eab308' : 'var(--apple-border)',
                      cursor: 'pointer'
                    }}
                  >
                    Team Lead
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '2px', fontWeight: '600', textTransform: 'uppercase' }}>Feature Access</label>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--apple-text-primary)', fontWeight: '500' }}>Revenue Logging</span>
                  <button
                    onClick={() => handleToggleAccess('has_revenue_logging', viewingProfileUser.has_revenue_logging)}
                    disabled={saving}
                    style={{
                      width: '44px', height: '24px', borderRadius: '12px',
                      background: viewingProfileUser.has_revenue_logging ? '#4ade80' : '#475569',
                      border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
                    }}
                  >
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: viewingProfileUser.has_revenue_logging ? '23px' : '3px', transition: 'left 0.3s' }} />
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--apple-text-primary)', fontWeight: '500' }}>DIS Reporting</span>
                  <button
                    onClick={() => handleToggleAccess('has_dis_reporting', viewingProfileUser.has_dis_reporting)}
                    disabled={saving}
                    style={{
                      width: '44px', height: '24px', borderRadius: '12px',
                      background: viewingProfileUser.has_dis_reporting ? '#4ade80' : '#475569',
                      border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
                    }}
                  >
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: viewingProfileUser.has_dis_reporting ? '23px' : '3px', transition: 'left 0.3s' }} />
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--apple-text-primary)', fontWeight: '500' }}>Sales Executive</span>
                  <button
                    onClick={() => handleToggleAccess('is_sales_executive', viewingProfileUser.is_sales_executive)}
                    disabled={saving}
                    style={{
                      width: '44px', height: '24px', borderRadius: '12px',
                      background: viewingProfileUser.is_sales_executive ? '#4ade80' : '#475569',
                      border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
                    }}
                  >
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: viewingProfileUser.is_sales_executive ? '23px' : '3px', transition: 'left 0.3s' }} />
                  </button>
                </div>
              </div>
            </div>

            {/* Card 1.3: Attendance Controls */}
            <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h3 className="apple-title-small" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} style={{ color: '#ec4899' }} /> Attendance Controls
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: '500' }}>Work From Home (WFH)</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>Bypasses location/IP verification</span>
                  </div>
                  <button
                    onClick={() => handleToggleAccess('wfh_enabled', viewingProfileUser.wfh_enabled)}
                    disabled={saving}
                    style={{
                      width: '44px', height: '24px', borderRadius: '12px',
                      background: viewingProfileUser.wfh_enabled ? '#4ade80' : '#475569',
                      border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s', flexShrink: 0
                    }}
                  >
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: viewingProfileUser.wfh_enabled ? '23px' : '3px', transition: 'left 0.3s' }} />
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: '500' }}>Require Office GPS</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>Must be at office coordinates</span>
                  </div>
                  <button
                    onClick={() => handleToggleAccess('require_gps_attendance', viewingProfileUser.require_gps_attendance !== false)}
                    disabled={saving}
                    style={{
                      width: '44px', height: '24px', borderRadius: '12px',
                      background: viewingProfileUser.require_gps_attendance !== false ? '#4ade80' : '#475569',
                      border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s', flexShrink: 0
                    }}
                  >
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: viewingProfileUser.require_gps_attendance !== false ? '23px' : '3px', transition: 'left 0.3s' }} />
                  </button>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: '500' }}>Require Office Wi-Fi/IP</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>Must be connected to office network</span>
                  </div>
                  <button
                    onClick={() => handleToggleAccess('require_ip_attendance', viewingProfileUser.require_ip_attendance !== false)}
                    disabled={saving}
                    style={{
                      width: '44px', height: '24px', borderRadius: '12px',
                      background: viewingProfileUser.require_ip_attendance !== false ? '#4ade80' : '#475569',
                      border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s', flexShrink: 0
                    }}
                  >
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: viewingProfileUser.require_ip_attendance !== false ? '23px' : '3px', transition: 'left 0.3s' }} />
                  </button>
                </div>
              </div>
            </div>

          {/* Column 2: Security Controls and Team Assignment */}
            
            {/* Card 2.1: Security */}
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
                      borderColor: isDeactivated ? 'rgba(74, 222, 128, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      cursor: 'pointer'
                    }}
                  >
                    {isDeactivated ? '🔓 Reactivate Account' : '🔒 Block Portal Access'}
                  </button>
                  <button
                    onClick={handleSendResetEmail}
                    disabled={saving}
                    className="apple-btn apple-btn-secondary"
                    style={{ width: '100%', cursor: 'pointer' }}
                  >
                    Send Password Reset Email
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2.1b: Team Assignments (Primary & Secondary) */}
            <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 className="apple-title-small" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} style={{ color: '#f59e0b' }} /> Team Assignments
                </h3>
                
                {/* Primary Team Section */}
                <div style={{ marginBottom: '28px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--apple-text-secondary)', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Primary Team</label>
                  {memberTeam && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--apple-border)', borderRadius: '12px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--apple-text-primary)', fontWeight: '500' }}>{memberTeam.name}</span>
                      <button
                        disabled={saving}
                        onClick={handleRemoveFromTeam}
                        style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  )}

                  {!memberTeam && (
                    <form onSubmit={handleUpdateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <select
                        value={newTeamId}
                        onChange={(e) => setNewTeamId(e.target.value)}
                        required
                        className="apple-input"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'var(--apple-bg-secondary)', border: '1px solid var(--apple-border)', color: 'var(--apple-text-primary)' }}
                      >
                        <option value="" disabled>-- Select a Team --</option>
                        {teams.filter(t => t.id !== viewingProfileUser.team_id).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        disabled={saving || !newTeamId}
                        className="apple-btn"
                        style={{ width: '100%', cursor: 'pointer', background: '#1c1c1e', color: '#fafafa', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        Assign to Team
                      </button>
                    </form>
                  )}
                </div>

                <div style={{ height: '1px', background: 'var(--apple-border)', width: '100%', marginBottom: '24px' }} />

                {/* Secondary Team Section */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--apple-text-secondary)', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Secondary Team</label>
                  {secondaryTeam && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--apple-border)', borderRadius: '12px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--apple-text-primary)', fontWeight: '500' }}>{secondaryTeam.name}</span>
                      <button
                        disabled={saving}
                        onClick={handleRemoveFromSecondaryTeam}
                        style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  )}

                  {!secondaryTeam && (
                    <form onSubmit={handleUpdateSecondaryTeam} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <select
                        value={newSecondaryTeamId}
                        onChange={(e) => setNewSecondaryTeamId(e.target.value)}
                        required
                        className="apple-input"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'var(--apple-bg-secondary)', border: '1px solid var(--apple-border)', color: 'var(--apple-text-primary)' }}
                      >
                        <option value="" disabled>-- Select a Secondary Team --</option>
                        {teams.filter(t => t.id !== viewingProfileUser.team_id && t.id !== viewingProfileUser.secondary_team_id).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        disabled={saving || !newSecondaryTeamId}
                        className="apple-btn"
                        style={{ width: '100%', cursor: 'pointer', background: '#1c1c1e', color: '#fafafa', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        Assign Secondary Team
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>

          {/* Removed Column 2 Wrapper */}
          
        </div>
        )}

        {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Full-width Stack: Latest DIS, Revenue details, and then Activity Timeline */}
          
          {/* Latest Daily DIS Reports */}
          <div className="apple-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <FileText size={18} style={{ color: 'var(--apple-accent-orange)' }} />
              <h3 className="apple-title-small" style={{ margin: 0 }}>Latest Daily DIS</h3>
            </div>

            {loadingDis ? (
              <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.88rem' }}>Loading DIS reports...</div>
            ) : userDisReports.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '12px' }}>
                {userDisReports.slice(0, 6).map(rep => (
                  <div
                    key={rep.id}
                    style={{
                      padding: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--apple-border)',
                      borderRadius: '10px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: '600' }}>
                      <span style={{ color: 'var(--apple-text-primary)' }}>
                        {new Date(rep.report_date).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}
                      </span>
                      <span style={{ color: 'var(--apple-accent-green)' }}>
                        + {rep.positive_leads} Leads
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--apple-text-secondary)', fontSize: '0.78rem' }}>
                      <span>Exp Revenue:</span>
                      <span style={{ color: 'var(--apple-text-primary)', fontWeight: '500' }}>${Number(rep.expected_revenue).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.85rem' }}>
                No DIS entries submitted yet.
              </p>
            )}
          </div>

          {/* Revenue Details */}
          <div>
            <UserRevenue user={viewingProfileUser} isAdminView={true} />
          </div>

          {/* Sales Analytics (Only if is_sales_executive) */}
          {viewingProfileUser.is_sales_executive && (
            <div className="apple-card" style={{ padding: '24px' }}>
              <h3 className="apple-title-small" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={18} style={{ color: '#4ade80' }} /> Sales Executive Analytics
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--apple-border)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: '600' }}>Total Calls Logged</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#fff' }}>{userSalesLogs.length}</div>
                </div>
                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--apple-border)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: '600' }}>Total Revenue Generated</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#4ade80' }}>
                    ${userSalesLogs.reduce((sum, log) => sum + Number(log.sales_revenue), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--apple-border)', borderRadius: '12px' }}>
                {userSalesLogs.length > 0 ? (
                  <div style={{ minWidth: '600px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.5fr auto', padding: '12px 16px', borderBottom: '1px solid var(--apple-border)', fontSize: '0.75rem', fontWeight: '600', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <div>Date</div>
                      <div>Team & Member</div>
                      <div>Speaker</div>
                      <div style={{ textAlign: 'right' }}>Revenue</div>
                    </div>
                    {userSalesLogs.map(log => (
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

          {/* Activity Timeline */}
          <div className="apple-card" style={{ padding: '24px' }}>
            <h3 className="apple-title-small" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} style={{ color: '#38bdf8' }} /> Activity Timeline
            </h3>
            <div style={{
              maxHeight: '400px',
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
                      <span style={{ fontSize: '0.9rem', color: 'var(--apple-text-primary)', lineHeight: '1.4' }}>{act.description}</span>
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
        )}

      </div>
    )
  }

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

      <style>{`
        .users-table-container {
          display: block;
        }
        .users-grid-container {
          display: none;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        @media (max-width: 850px) {
          .users-table-container {
            display: none;
          }
          .users-grid-container {
            display: grid;
          }
        }
        .truncate-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>

      {/* Users List Card */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', color: '#fff' }}>Registered Users Directory</h3>

        {filteredUsers.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="users-table-container" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '12px' }}>Name & Email</th>
                    <th style={{ padding: '12px' }}>Platform Role</th>
                    <th style={{ padding: '12px' }}>Active Teams</th>
                    <th style={{ padding: '12px' }}>Account Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => {
                    const isDeactivated = !!user.is_deactivated

                    return (
                      <tr
                        key={user.id}
                        className="watchlist-row"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.95rem', opacity: isDeactivated ? 0.6 : 1, cursor: 'pointer' }}
                        onClick={() => setViewingProfileUser(user)}
                      >
                        <td style={{ padding: '14px 12px', maxWidth: '200px' }}>
                          <div className="truncate-text" style={{ fontWeight: '600', color: '#fff' }}>
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="truncate-text" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{user.email}</div>
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
                        <td style={{ padding: '14px 12px', maxWidth: '150px' }}>
                          {user.team_id ? (
                            <span className="truncate-text" style={{
                              display: 'inline-block',
                              maxWidth: '100%',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              background: 'rgba(74, 222, 128, 0.12)',
                              border: '1px solid rgba(74, 222, 128, 0.25)',
                              color: '#4ade80',
                              fontWeight: '500'
                            }}>
                              {teams.find(t => t.id === user.team_id)?.name || 'Unknown'}
                            </span>
                          ) : (
                            <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No Team</span>
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
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile/Small Device Matrix Card View */}
            <div className="users-grid-container">
              {filteredUsers.map(user => {
                const isDeactivated = !!user.is_deactivated
                return (
                  <div
                    key={user.id}
                    onClick={() => setViewingProfileUser(user)}
                    style={{
                      padding: '16px',
                      cursor: 'pointer',
                      opacity: isDeactivated ? 0.6 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      transition: 'background 0.2s, border-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="truncate-text" style={{ fontWeight: '600', color: '#fff', fontSize: '1.05rem', marginBottom: '2px' }}>
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="truncate-text" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {user.email}
                        </div>
                      </div>
                      <span style={{
                        flexShrink: 0,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        background: user.platform_role === 'admin' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                        border: user.platform_role === 'admin' ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(99, 102, 241, 0.25)',
                        color: user.platform_role === 'admin' ? '#f87171' : '#818cf8'
                      }}>
                        {user.platform_role || 'user'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                        {user.team_id ? (
                          <span className="truncate-text" style={{
                            display: 'inline-block',
                            maxWidth: '100%',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            background: 'rgba(74, 222, 128, 0.12)',
                            border: '1px solid rgba(74, 222, 128, 0.25)',
                            color: '#4ade80',
                            fontWeight: '500'
                          }}>
                            {teams.find(t => t.id === user.team_id)?.name || 'Unknown'}
                          </span>
                        ) : (
                          <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No Team</span>
                        )}
                      </div>
                      <span style={{
                        flexShrink: 0,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        background: isDeactivated ? 'rgba(239, 68, 68, 0.15)' : 'rgba(74, 222, 128, 0.15)',
                        border: isDeactivated ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(74, 222, 128, 0.3)',
                        color: isDeactivated ? '#ef4444' : '#4ade80'
                      }}>
                        {isDeactivated ? 'Deactivated' : 'Active'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>No users found matching search query.</p>
        )}
      </div>

      {/* USER CONTROL PANEL MODAL HAS BEEN MOVED TO A DEDICATED PAGE */}

    </div>
  )
}
