import { useState, useEffect } from 'react'
import { useOutletContext, Navigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { Shield, ShieldAlert, Check, RefreshCw, Save, User as UserIcon } from 'lucide-react'

const GENERAL_FEATURES = [
  { key: 'writeUps', label: 'Write-Ups' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'settings', label: 'Settings' },
  { key: 'controlPanel', label: 'Control Panel' },
  { key: 'aiAnalytics', label: 'AI Analytics' },
  { key: 'attendance', label: 'Attendance' }
]

const AUDIT_LOG_FEATURES = [
  { key: 'auditLogs_revenue', label: 'Revenue Logs' },
  { key: 'auditLogs_login', label: 'Login Logs' },
  { key: 'auditLogs_active', label: 'Active Members' },
  { key: 'auditLogs_admin', label: 'Admin Activity' },
  { key: 'auditLogs_page', label: 'Page Activity' }
]

export default function AdminRoleManager() {
  const { user } = useOutletContext() || {}
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  
  const [selectedUserId, setSelectedUserId] = useState('')
  const [activeTab, setActiveTab] = useState('admin') // 'admin' or 'user'
  const [systemSettings, setSystemSettings] = useState(null)

  // STRICT ACCESS CONTROL
  if (user?.email !== 'signatureglobalconferences@gmail.com') {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--apple-accent-red)' }}>Access Denied</h2>
        <p style={{ color: 'var(--apple-text-secondary)' }}>You do not have permission to view the Role Management page.</p>
      </div>
    )
  }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, platform_role, feature_access, is_deactivated')
        .in('platform_role', ['admin', 'executive'])
        .neq('email', 'signatureglobalconferences@gmail.com') // Don't show master admin
        .order('first_name')

      if (usersError) throw usersError
      
      const normalizedData = usersData.map(u => ({
        ...u,
        feature_access: u.feature_access || {}
      }))
      
      setUsers(normalizedData)
      if (normalizedData.length > 0) {
        setSelectedUserId(normalizedData[0].id)
      }

      // Fetch system settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('system_settings')
        .select('user_pages_access')
        .eq('id', 1)
        .maybeSingle()

      if (settingsError) throw settingsError
      if (settingsData) {
        setSystemSettings(settingsData)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleDeactivation = async (userId, currentValue) => {
    setSavingId(userId)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_deactivated: !currentValue })
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(u => u.id === userId ? { ...u, is_deactivated: !currentValue } : u))
    } catch (err) {
      console.error('Error updating deactivation status:', err)
      alert('Failed to update access.')
    } finally {
      setSavingId(null)
    }
  }

  const handleToggle = async (userId, featureKey, currentValue) => {
    setSavingId(userId)
    try {
      const userToUpdate = users.find(u => u.id === userId)
      const newFeatureAccess = {
        ...userToUpdate.feature_access,
        [featureKey]: !currentValue
      }

      const { error } = await supabase
        .from('profiles')
        .update({ feature_access: newFeatureAccess })
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(u => u.id === userId ? { ...u, feature_access: newFeatureAccess } : u))
    } catch (err) {
      console.error('Error updating feature access:', err)
      alert('Failed to update access.')
    } finally {
      setSavingId(null)
    }
  }

  const handleToggleUserPage = async (pageKey, currentValue) => {
    setSavingId('systemSettings')
    try {
      const newAccess = {
        ...(systemSettings?.user_pages_access || {}),
        [pageKey]: !currentValue
      }

      const { error } = await supabase
        .from('system_settings')
        .update({ user_pages_access: newAccess })
        .eq('id', 1)

      if (error) throw error

      setSystemSettings({ ...systemSettings, user_pages_access: newAccess })
    } catch (err) {
      console.error('Error updating global user pages access:', err)
      alert('Failed to update global access.')
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', gap: '16px' }}>
        <RefreshCw size={36} className="spin-anim" style={{ color: 'var(--apple-accent-blue)' }} />
        <div style={{ color: 'var(--apple-text-secondary)', fontSize: '1.05rem', fontWeight: '500' }}>Loading roles...</div>
      </div>
    )
  }

  const selectedUser = users.find(u => u.id === selectedUserId)
  
  const USER_PAGES = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'dis', label: 'My DIS' },
    { key: 'team', label: 'Team' },
    { key: 'teamHub', label: 'Team Hub (Analytics/Mgmt/DIS)' },
    { key: 'virtualEvents', label: 'Virtual Events' },
    { key: 'leaderboard', label: 'Leaderboard' },
    { key: 'milestones', label: 'Milestones' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'salesAnalytics', label: 'Sales Executive' },
    { key: 'speakersCRM', label: 'Speakers CRM' },
    { key: 'meetings', label: 'Call Transcripts' },
    { key: 'announcements', label: 'Announcements' },
    { key: 'aiCopilot', label: 'AI Copilot' },
  ]

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      <div style={{ marginBottom: 'clamp(24px, 5vw, 40px)' }}>
        <div className="apple-kicker">Super Admin</div>
        <h1 className="apple-title-large">Role Management</h1>
        <p className="apple-lead">
          Control feature access dynamically.
        </p>
      </div>

      {/* Subnavbar */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--apple-border)', marginBottom: '32px' }}>
        <button
          onClick={() => setActiveTab('admin')}
          style={{
            background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer',
            fontSize: '0.95rem', fontWeight: '600',
            color: activeTab === 'admin' ? '#fff' : 'var(--apple-text-secondary)',
            borderBottom: activeTab === 'admin' ? '2px solid var(--apple-accent-blue)' : '2px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          Admin Controls
        </button>
        <button
          onClick={() => setActiveTab('user')}
          style={{
            background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer',
            fontSize: '0.95rem', fontWeight: '600',
            color: activeTab === 'user' ? '#fff' : 'var(--apple-text-secondary)',
            borderBottom: activeTab === 'user' ? '2px solid var(--apple-accent-blue)' : '2px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          User Pages Access
        </button>
      </div>

      {activeTab === 'admin' && (
        users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--apple-text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--apple-border)' }}>
            No admins or executives found (excluding yourself).
          </div>
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Dropdown Selector */}
          <div className="apple-card" style={{ padding: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>
              Select User
            </label>
            <select 
              className="apple-input" 
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              style={{ width: '100%', maxWidth: '400px' }}
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.first_name} {u.last_name} ({u.email}) - {u.platform_role.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Control Panel for Selected User */}
          {selectedUser && (
            <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {/* Header info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--apple-border)', paddingBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <UserIcon size={24} style={{ color: 'var(--apple-accent-blue)' }} />
                    {selectedUser.first_name} {selectedUser.last_name}
                    <span className={`apple-badge ${selectedUser.platform_role === 'admin' ? 'apple-badge-red' : 'apple-badge-blue'}`}>
                      {selectedUser.platform_role.toUpperCase()}
                    </span>
                  </h3>
                  <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.95rem', marginTop: '6px' }}>
                    {selectedUser.email}
                  </div>
                </div>
              </div>

              {/* Access Control / Maintenance Mode */}
              <div>
                <h4 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={18} style={{ color: 'var(--apple-accent-red)' }} /> Access Control
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                  
                  {/* Deactivation Switch */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      onClick={() => {
                        if (savingId) return
                        handleToggleDeactivation(selectedUser.id, selectedUser.is_deactivated)
                      }}
                      style={{
                        width: '44px',
                        height: '24px',
                        background: selectedUser.is_deactivated ? 'var(--apple-accent-red)' : 'rgba(150, 150, 150, 0.25)',
                        borderRadius: '12px',
                        position: 'relative',
                        cursor: savingId ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s var(--apple-ease)',
                        opacity: savingId === selectedUser.id ? 0.5 : 1
                      }}
                    >
                      <div style={{
                        width: '20px',
                        height: '20px',
                        background: '#fff',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: '2px',
                        left: selectedUser.is_deactivated ? '22px' : '2px',
                        transition: 'all 0.3s var(--apple-ease)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                    </div>
                    <span style={{ color: selectedUser.is_deactivated ? 'var(--apple-accent-red)' : '#fff', fontSize: '0.95rem', transition: 'color 0.3s' }}>
                      {selectedUser.is_deactivated ? 'Account Deactivated (Blocked)' : 'Account Active'}
                    </span>
                  </div>

                  {/* Maintenance Mode Switch */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      onClick={() => {
                        if (savingId) return
                        const isForced = !!selectedUser.feature_access.maintenanceModeForced
                        handleToggle(selectedUser.id, 'maintenanceModeForced', isForced)
                      }}
                      style={{
                        width: '44px',
                        height: '24px',
                        background: selectedUser.feature_access.maintenanceModeForced ? 'var(--apple-accent-orange, #f59e0b)' : 'rgba(150, 150, 150, 0.25)',
                        borderRadius: '12px',
                        position: 'relative',
                        cursor: savingId ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s var(--apple-ease)',
                        opacity: savingId === selectedUser.id ? 0.5 : 1
                      }}
                    >
                      <div style={{
                        width: '20px',
                        height: '20px',
                        background: '#fff',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: '2px',
                        left: selectedUser.feature_access.maintenanceModeForced ? '22px' : '2px',
                        transition: 'all 0.3s var(--apple-ease)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                    </div>
                    <span style={{ color: selectedUser.feature_access.maintenanceModeForced ? 'var(--apple-accent-orange, #f59e0b)' : '#fff', fontSize: '0.95rem', transition: 'color 0.3s' }}>
                      {selectedUser.feature_access.maintenanceModeForced ? 'System Maintenance Mode Enabled' : 'System Maintenance Mode Disabled'}
                    </span>
                  </div>

                </div>
              </div>

              {/* General Features */}
              <div>
                <h4 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={18} style={{ color: 'var(--apple-accent-blue)' }} /> General Access
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
                  {GENERAL_FEATURES.map(feat => {
                    const isGranted = !!selectedUser.feature_access[feat.key]
                    return (
                      <div key={feat.key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          onClick={() => {
                            if (savingId) return
                            handleToggle(selectedUser.id, feat.key, isGranted)
                          }}
                          style={{
                            width: '44px',
                            height: '24px',
                            background: isGranted ? 'var(--apple-accent-green)' : 'rgba(150, 150, 150, 0.25)',
                            borderRadius: '12px',
                            position: 'relative',
                            cursor: savingId ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s var(--apple-ease)',
                            opacity: savingId === selectedUser.id ? 0.5 : 1
                          }}
                        >
                          <div style={{
                            width: '20px',
                            height: '20px',
                            background: '#fff',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: isGranted ? '22px' : '2px',
                            transition: 'all 0.3s var(--apple-ease)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }} />
                        </div>
                        <span style={{ color: isGranted ? '#fff' : 'var(--apple-text-secondary)', fontSize: '0.95rem', transition: 'color 0.3s' }}>
                          {feat.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Audit Logs Features */}
              <div>
                <h4 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={18} style={{ color: 'var(--apple-accent-red)' }} /> Audit Logs Access
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
                  {AUDIT_LOG_FEATURES.map(feat => {
                    const isGranted = !!selectedUser.feature_access[feat.key]
                    return (
                      <div key={feat.key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          onClick={() => {
                            if (savingId) return
                            handleToggle(selectedUser.id, feat.key, isGranted)
                          }}
                          style={{
                            width: '44px',
                            height: '24px',
                            background: isGranted ? 'var(--apple-accent-green)' : 'rgba(150, 150, 150, 0.25)',
                            borderRadius: '12px',
                            position: 'relative',
                            cursor: savingId ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s var(--apple-ease)',
                            opacity: savingId === selectedUser.id ? 0.5 : 1
                          }}
                        >
                          <div style={{
                            width: '20px',
                            height: '20px',
                            background: '#fff',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: isGranted ? '22px' : '2px',
                            transition: 'all 0.3s var(--apple-ease)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }} />
                        </div>
                        <span style={{ color: isGranted ? '#fff' : 'var(--apple-text-secondary)', fontSize: '0.95rem', transition: 'color 0.3s' }}>
                          {feat.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          )}

        </div>
        )
      )}

      {activeTab === 'user' && (
        <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={24} style={{ color: 'var(--apple-accent-blue)' }} />
              Global User Page Access
            </h3>
            <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.95rem', marginTop: '6px' }}>
              Enable or disable pages for all standard users on the platform in real-time.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
            {USER_PAGES.map(page => {
              const accessMap = systemSettings?.user_pages_access || {}
              const isGranted = accessMap[page.key] !== false // Default to true if undefined
              
              return (
                <div key={page.key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    onClick={() => {
                      if (savingId) return
                      handleToggleUserPage(page.key, isGranted)
                    }}
                    style={{
                      width: '44px',
                      height: '24px',
                      background: isGranted ? 'var(--apple-accent-green)' : 'rgba(150, 150, 150, 0.25)',
                      borderRadius: '12px',
                      position: 'relative',
                      cursor: savingId ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s var(--apple-ease)',
                      opacity: savingId === 'systemSettings' ? 0.5 : 1
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      background: '#fff',
                      borderRadius: '50%',
                      position: 'absolute',
                      top: '2px',
                      left: isGranted ? '22px' : '2px',
                      transition: 'all 0.3s var(--apple-ease)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                  <span style={{ color: isGranted ? '#fff' : 'var(--apple-text-secondary)', fontSize: '0.95rem', transition: 'color 0.3s' }}>
                    {page.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
