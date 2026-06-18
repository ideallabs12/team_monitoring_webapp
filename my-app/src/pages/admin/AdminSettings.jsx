import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { 
  Database, Users, Activity, FileText, Download, ShieldAlert,
  Lock, AlertTriangle, Trash2, CheckCircle2, Megaphone, Settings 
} from 'lucide-react'
import { getSystemTheme, setSystemTheme } from '../../utils/themeHelper'
import ThemeSwitch from '../../components/ThemeSwitch'

export default function AdminSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Settings state
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(true)
  const [theme, setTheme] = useState(getSystemTheme)

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(getSystemTheme())
    }
    window.addEventListener('theme-change', handleThemeChange)
    return () => window.removeEventListener('theme-change', handleThemeChange)
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setSystemTheme(nextTheme)
  }

  // DB Stats
  const [dbSizeMb, setDbSizeMb] = useState(0)
  const [stats, setStats] = useState({ users: 0, logs: 0, dis: 0, revenue: 0 })

  useEffect(() => {
    loadSettingsAndStats()
  }, [])

  const loadSettingsAndStats = async () => {
    setLoading(true)
    try {
      // Load Settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 1)
        .single()
        
      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError
      
      if (settingsData) {
        setMaintenanceMode(settingsData.maintenance_mode || false)
        setShowLeaderboard(settingsData.show_leaderboard ?? true)
      }

      // Load DB Size
      const { data: sizeData, error: sizeError } = await supabase.rpc('get_db_size')
      if (!sizeError) setDbSizeMb(Number(sizeData) || 0)

      // Load Counts
      const [usersCount, logsCount, disCount, revCount] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }),
        supabase.from('dis_reports').select('*', { count: 'exact', head: true }),
        supabase.from('monthly_revenues').select('*', { count: 'exact', head: true })
      ])

      setStats({
        users: usersCount.count || 0,
        logs: logsCount.count || 0,
        dis: disCount.count || 0,
        revenue: revCount.count || 0
      })

    } catch (err) {
      console.error('Error loading settings:', err)
      setErrorMsg('Failed to load advanced settings or stats.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ 
          id: 1, 
          maintenance_mode: maintenanceMode,
          show_leaderboard: showLeaderboard,
          updated_at: new Date().toISOString()
        })
        
      if (error) throw error
      setSuccessMsg('System settings updated successfully.')
    } catch (err) {
      console.error('Error saving settings:', err)
      setErrorMsg('Failed to save settings: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // ---- CSV Export Logic ----
  const downloadCSV = (filename, csvData) => {
    const blob = new Blob([csvData], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('hidden', '')
    a.setAttribute('href', url)
    a.setAttribute('download', filename)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleExportUsers = async () => {
    try {
      const [profilesRes, teamsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('teams').select('id, name')
      ])
      if (profilesRes.error) throw profilesRes.error
      if (teamsRes.error) throw teamsRes.error
      
      const teamMap = {}
      teamsRes.data.forEach(t => teamMap[t.id] = t.name)

      let csv = 'ID,First Name,Last Name,Email,Phone,Role,Team,Status,Created At\n'
      profilesRes.data.forEach(u => {
        const teamName = teamMap[u.team_id] || ''
        const status = u.is_deactivated ? 'Deactivated' : 'Active'
        // Add single quote to phone so Excel treats it as text and doesn't convert to scientific notation
        const phoneTxt = u.phone ? `'${u.phone}` : ''
        csv += `${u.id},"${u.first_name || ''}","${u.last_name || ''}","${u.email}","${phoneTxt}","${u.platform_role}","${teamName}","${status}","${u.created_at}"\n`
      })
      downloadCSV('users_export.csv', csv)
    } catch (err) { alert('Export failed: ' + err.message) }
  }

  const handleExportRevenue = async () => {
    try {
      const [revenuesRes, profilesRes, teamsRes] = await Promise.all([
        supabase.from('monthly_revenues').select('*'),
        supabase.from('profiles').select('id, email, team_id'),
        supabase.from('teams').select('id, name')
      ])
      if (revenuesRes.error) throw revenuesRes.error
      
      const teamMap = {}
      if (teamsRes.data) teamsRes.data.forEach(t => teamMap[t.id] = t.name)
      
      const profileMap = {}
      if (profilesRes.data) profilesRes.data.forEach(p => profileMap[p.id] = p)

      let csv = 'ID,User Email,Team,Amount,Month,Created At\n'
      revenuesRes.data.forEach(r => {
        const profile = profileMap[r.user_id] || {}
        const teamName = teamMap[profile.team_id] || ''
        csv += `${r.id},"${profile.email || r.user_id}","${teamName}","${r.amount}","${r.revenue_month}","${r.created_at}"\n`
      })
      downloadCSV('revenue_export.csv', csv)
    } catch (err) { alert('Export failed: ' + err.message) }
  }

  const handleExportDIS = async () => {
    try {
      const [disRes, profilesRes, teamsRes] = await Promise.all([
        supabase.from('dis_reports').select('*'),
        supabase.from('profiles').select('id, email, team_id'),
        supabase.from('teams').select('id, name')
      ])
      if (disRes.error) throw disRes.error
      
      const teamMap = {}
      if (teamsRes.data) teamsRes.data.forEach(t => teamMap[t.id] = t.name)
      
      const profileMap = {}
      if (profilesRes.data) profilesRes.data.forEach(p => profileMap[p.id] = p)

      let csv = 'ID,User Email,Team,Date,Positive Leads,Expected Revenue,Notes\n'
      disRes.data.forEach(d => {
        const profile = profileMap[d.user_id] || {}
        const teamName = teamMap[profile.team_id] || ''
        csv += `${d.id},"${profile.email || d.user_id}","${teamName}","${d.report_date}","${d.positive_leads}","${d.expected_revenue}","${(d.notes || '').replace(/"/g, '""')}"\n`
      })
      downloadCSV('dis_export.csv', csv)
    } catch (err) { alert('Export failed: ' + err.message) }
  }

  // ---- Maintenance Actions ----
  const handleLockdown = async () => {
    if (!window.confirm("WARNING: This will deactivate ALL non-admin users immediately. They will be logged out and cannot log in until you reactivate them manually in the User Console. Proceed?")) return;
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({ is_deactivated: true }).neq('platform_role', 'admin')
      if (error) throw error
      alert("Lockdown successful. All non-admin users have been deactivated.")
      loadSettingsAndStats()
    } catch (err) { alert("Lockdown failed: " + err.message) }
    setSaving(false)
  }

  const handleCleanupAuditLogs = async () => {
    if (!window.confirm("This will delete all audit logs older than 30 days. Proceed?")) return;
    setSaving(true)
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const { error } = await supabase.from('audit_logs').delete().lt('created_at', thirtyDaysAgo.toISOString())
      if (error) throw error
      alert("Old audit logs deleted successfully.")
      loadSettingsAndStats()
    } catch (err) { alert("Cleanup failed: " + err.message) }
    setSaving(false)
  }

  const handleCleanupInactiveUsers = async () => {
    if (!window.confirm("This will deactivate users who haven't logged in for 90 days. Proceed?")) return;
    setSaving(true)
    try {
      const { data, error } = await supabase.rpc('deactivate_inactive_users', { days_inactive: 90 })
      if (error) throw error
      alert(`Cleanup successful. ${data} inactive users were deactivated.`)
    } catch (err) { alert("Cleanup failed: " + err.message) }
    setSaving(false)
  }

  // ---- Danger Zone Actions ----
  const handleWipeDIS = async () => {
    if (!window.confirm("EXTREME WARNING: This will permanently delete EVERY DIS report in the database. Type 'CONFIRM' in the prompt to proceed.")) return;
    const check = window.prompt("Type CONFIRM to delete all DIS reports:")
    if (check !== 'CONFIRM') return;
    
    try {
      const { error } = await supabase.from('dis_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000') // Deletes all
      if (error) throw error
      alert("All DIS reports have been wiped.")
      loadSettingsAndStats()
    } catch (err) { alert("Wipe failed: " + err.message) }
  }

  const handleWipeSalesLogs = async () => {
    if (!window.confirm("EXTREME WARNING: This will permanently delete ALL Sales Executive call logs. Proceed?")) return;
    const check = window.prompt("Type CONFIRM to delete all sales logs:")
    if (check !== 'CONFIRM') return;
    
    try {
      const { error } = await supabase.from('sales_analytics').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      alert("All Sales Logs have been wiped.")
    } catch (err) { alert("Wipe failed: " + err.message) }
  }

  if (loading) return <div style={{ color: 'var(--apple-text-secondary)', padding: '40px', textAlign: 'center' }}>Loading Advanced Settings...</div>

  return (
    <div style={{ paddingBottom: '60px', animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-page-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
          <Settings size={28} />
        </div>
        <div>
          <h1 className="admin-page-title">Advanced Settings</h1>
          <p className="admin-page-subtitle">
            Global platform configurations, data exports, maintenance routines, and database health.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '12px', fontSize: '0.9rem', marginBottom: '24px' }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '12px 16px', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', color: '#4ade80', borderRadius: '12px', fontSize: '0.9rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} /> {successMsg}
        </div>
      )}

      {/* Database Health Widget */}
      <div className="apple-card" style={{ padding: '24px', marginBottom: '32px', background: 'linear-gradient(135deg, rgba(15,23,42,0.6), rgba(30,41,59,0.6))', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="apple-title-small" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={18} style={{ color: '#38bdf8' }} /> Database Health Monitor
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Storage Used</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              {dbSizeMb.toFixed(2)} <span style={{ fontSize: '1rem', color: 'var(--apple-text-secondary)', fontWeight: '500' }}>MB / 500 MB</span>
            </div>
            {/* Progress bar */}
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((dbSizeMb / 500) * 100, 100)}%`, height: '100%', background: dbSizeMb > 400 ? '#ef4444' : dbSizeMb > 300 ? '#f59e0b' : '#4ade80' }}></div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Users</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#fff' }}>{stats.users.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Audit Logs</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#fff' }}>{stats.logs.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue & DIS Entries</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#fff' }}>{(stats.dis + stats.revenue).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '28px' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* Global Configuration */}
          <div className="apple-card" style={{ padding: '24px' }}>
            <h3 className="apple-title-small" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Megaphone size={18} style={{ color: '#a78bfa' }} /> Global Configurations
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
                <div>
                  <div style={{ fontSize: '0.95rem', color: 'var(--apple-text-primary)', fontWeight: '600' }}>App Theme</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>Toggle between dark and light modes.</div>
                </div>
                <ThemeSwitch theme={theme} toggleTheme={toggleTheme} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
                <div>
                  <div style={{ fontSize: '0.95rem', color: 'var(--apple-text-primary)', fontWeight: '600' }}>Show Leaderboard</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>Allow standard users to view the global leaderboard.</div>
                </div>
                <button
                  onClick={() => setShowLeaderboard(!showLeaderboard)}
                  style={{
                    width: '44px', height: '24px', borderRadius: '12px',
                    background: showLeaderboard ? '#4ade80' : '#475569',
                    border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
                  }}
                >
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: showLeaderboard ? '23px' : '3px', transition: 'left 0.3s' }} />
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div>
                  <div style={{ fontSize: '0.95rem', color: '#f87171', fontWeight: '600' }}>Maintenance Mode</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>Locks out all non-admins from accessing the platform.</div>
                </div>
                <button
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  style={{
                    width: '44px', height: '24px', borderRadius: '12px',
                    background: maintenanceMode ? '#ef4444' : '#475569',
                    border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
                  }}
                >
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: maintenanceMode ? '23px' : '3px', transition: 'left 0.3s' }} />
                </button>
              </div>

              <button 
                onClick={handleSaveSettings} 
                disabled={saving}
                className="apple-btn apple-btn-primary" 
                style={{ width: '100%', marginTop: '8px' }}
              >
                {saving ? 'Saving...' : 'Save Configurations'}
              </button>
            </div>
          </div>

          {/* Security & Maintenance */}
          <div className="apple-card" style={{ padding: '24px' }}>
            <h3 className="apple-title-small" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} style={{ color: '#10b981' }} /> Security & Maintenance
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button onClick={handleLockdown} className="apple-btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                <Lock size={16} /> Platform Lockdown (Deactivate All)
              </button>
              <button onClick={handleCleanupInactiveUsers} className="apple-btn apple-btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                <Users size={16} /> Deactivate Inactive Users (&gt;90 days)
              </button>
              <button onClick={handleCleanupAuditLogs} className="apple-btn apple-btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                <Activity size={16} /> Delete Old Audit Logs (&gt;30 days)
              </button>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* Data Exports */}
          <div className="apple-card" style={{ padding: '24px' }}>
            <h3 className="apple-title-small" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={18} style={{ color: '#38bdf8' }} /> Data Exports (CSV)
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <button onClick={handleExportUsers} className="apple-btn apple-btn-secondary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px 10px', height: 'auto' }}>
                <Users size={24} style={{ color: '#818cf8' }} />
                <span style={{ fontSize: '0.85rem' }}>Users Directory</span>
              </button>
              <button onClick={handleExportRevenue} className="apple-btn apple-btn-secondary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px 10px', height: 'auto' }}>
                <Activity size={24} style={{ color: '#4ade80' }} />
                <span style={{ fontSize: '0.85rem' }}>Revenue Data</span>
              </button>
              <button onClick={handleExportDIS} className="apple-btn apple-btn-secondary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px 10px', height: 'auto' }}>
                <FileText size={24} style={{ color: '#f59e0b' }} />
                <span style={{ fontSize: '0.85rem' }}>DIS Reports</span>
              </button>
              {/* Could add more exports here */}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="apple-card" style={{ padding: '24px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <h3 className="apple-title-small" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
              <AlertTriangle size={18} /> Danger Zone
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
              The actions below are irreversible and will permanently delete data from the database. Ensure you have exported backups before proceeding.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button onClick={handleWipeDIS} className="apple-btn" style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                <Trash2 size={16} /> Wipe All DIS Reports
              </button>
              <button onClick={handleWipeSalesLogs} className="apple-btn" style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                <Trash2 size={16} /> Wipe All Sales Call Logs
              </button>
            </div>
          </div>

        </div>
        
      </div>

    </div>
  )
}
