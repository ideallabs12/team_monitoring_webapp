import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { Command, CheckCircle2 } from 'lucide-react'

export default function AdminShortcuts() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  
  const { user, featureAccess } = useOutletContext() || {}
  const canAccess = user?.email === 'signatureglobalconferences@gmail.com' || !!featureAccess?.settings

  const [config, setConfig] = useState({
    enabled: true,
    u: true,
    t: true,
    r: true,
    s: true,
    d: true,
    m: true,
    a: true,
    l: true
  })

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 1)
        .single()
        
      if (error && error.code !== 'PGRST116') throw error
      
      if (data && data.shortcuts_config) {
        setConfig(data.shortcuts_config)
      }
    } catch (err) {
      console.error('Error loading shortcuts config:', err)
      setErrorMsg('Failed to load shortcuts settings: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (key) => {
    const newConfig = { ...config, [key]: !config[key] }
    setConfig(newConfig)
    
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')
    
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ shortcuts_config: newConfig })
        .eq('id', 1)
        
      if (error) throw error
      setSuccessMsg('Shortcut settings saved.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      console.error('Error saving shortcuts config:', err)
      setErrorMsg('Failed to save settings: ' + err.message)
      // Revert on error
      setConfig(config)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ color: 'var(--apple-text-secondary)', padding: '40px', textAlign: 'center' }}>Loading shortcuts settings...</div>

  if (!canAccess) return (
    <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div style={{ color: '#ef4444', fontSize: '1.2rem', fontWeight: '600' }}>Access Denied</div>
    </div>
  )

  const renderToggle = (label, description, key, isMaster = false) => (
    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isMaster ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: isMaster ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid var(--apple-border)', opacity: (!isMaster && !config.enabled) ? 0.5 : 1, transition: 'opacity 0.2s' }}>
      <div>
        <div style={{ fontSize: isMaster ? '1.05rem' : '0.95rem', color: isMaster ? '#818cf8' : 'var(--apple-text-primary)', fontWeight: '600' }}>{label}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>{description}</div>
      </div>
      <button
        onClick={() => handleToggle(key)}
        disabled={saving || (!isMaster && !config.enabled)}
        style={{ position: 'relative', display: 'inline-block', width: '40px', minWidth: '40px', height: '24px', minHeight: '24px', borderRadius: '14px', padding: 0, background: config[key]  ? 'var(--apple-accent-blue)' : 'rgba(150, 150, 150, 0.25)', border: '1px solid rgba(255, 255, 255, 0.05)', cursor: (!isMaster && !config.enabled) || saving ? 'not-allowed' : 'pointer', transition: 'background 150ms ease', flexShrink: 0 }}
      >
        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: config[key]  ? '16px' : '0px', transition: 'left 150ms ease' }} />
      </button>
    </div>
  )

  return (
    <div style={{ paddingBottom: '60px', animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-page-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
          <Command size={28} />
        </div>
        <div>
          <h1 className="admin-page-title">Global Shortcuts</h1>
          <p className="admin-page-subtitle">
            Manage global keyboard navigation shortcuts for all users.
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

      <div className="apple-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {renderToggle('Enable Global Shortcuts', 'Master toggle to enable or disable all keyboard shortcuts globally.', 'enabled', true)}
          
          <div style={{ height: '1px', background: 'var(--apple-border)', margin: '8px 0' }} />
          
          {renderToggle('Users (Ctrl + U)', 'Navigate to User Management (Admin Only).', 'u')}
          {renderToggle('Teams (Ctrl + T)', 'Navigate to Teams.', 't')}
          {renderToggle('Revenue (Ctrl + R)', 'Navigate to Revenue.', 'r')}
          {renderToggle('Settings (Ctrl + S)', 'Navigate to Settings.', 's')}
          {renderToggle('DIS (Ctrl + D)', 'Navigate to DIS Reports.', 'd')}
          {renderToggle('Milestones (Ctrl + M)', 'Navigate to Milestones.', 'm')}
          {renderToggle('Analytics (Ctrl + A)', 'Navigate to Analytics.', 'a')}
          {renderToggle('Leaderboard (Ctrl + L)', 'Navigate to Leaderboard.', 'l')}
          
        </div>
      </div>
    </div>
  )
}
