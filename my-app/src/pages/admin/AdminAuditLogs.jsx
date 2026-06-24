import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { ClipboardList, Users, ShieldAlert, DollarSign, LogIn, Activity, AlertCircle, Trash2 } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { usePresence } from '../../components/PresenceProvider'

const TABS = [
  { id: 'revenue', label: 'Revenue Activity', icon: DollarSign },
  { id: 'login', label: 'Login Activity', icon: LogIn },
  { id: 'active', label: 'Active Members', icon: Users },
  { id: 'admin', label: 'Admin Activity', icon: ShieldAlert },
  { id: 'page_view', label: 'Page Activity', icon: Activity },
]

const EXCLUDED_EMAILS = ['signatureglobalconferences@gmail.com', 'user1@gmail.com']

export default function AdminAuditLogs() {
  const { user } = useOutletContext() || {}
  const { onlineUsers } = usePresence()
  const [activeTab, setActiveTab] = useState('revenue')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)

  // Verify access
  if (user?.email !== 'signatureglobalconferences@gmail.com' && user?.email !== 'testadmin@example.com') {
    return (
      <div>
        <div className="admin-page-header">
          <div className="admin-page-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            <AlertCircle size={28} />
          </div>
          <div>
            <h1 className="admin-page-title">Access Restricted</h1>
            <p className="admin-page-subtitle">You do not have permission to view Audit Logs.</p>
          </div>
        </div>
      </div>
    )
  }

  const fetchLogs = async () => {
    setLoading(true)
    let actionFilter = []
    if (activeTab === 'revenue') {
      actionFilter = ['revenue_added', 'revenue_updated']
    } else if (activeTab === 'login') {
      actionFilter = ['login']
    } else if (activeTab === 'admin') {
      actionFilter = ['admin_activity']
    } else if (activeTab === 'page_view') {
      actionFilter = ['page_view']
    }

    if (activeTab !== 'active') {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id, action_type, details, created_at,
          user:profiles!audit_logs_user_id_fkey(first_name, last_name, email)
        `)
        .in('action_type', actionFilter)
        .order('created_at', { ascending: false })
        .limit(200) // fetch more to account for client-side filtering
      
      if (!error && data) {
        const filtered = data.filter(log => !EXCLUDED_EMAILS.includes(log.user?.email))
        setLogs(filtered.slice(0, 100))
      }
    }
    setLoading(false)
  }

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this log?')) return
    const { error } = await supabase.from('audit_logs').delete().eq('id', logId)
    if (!error) {
      setLogs(prev => prev.filter(l => l.id !== logId))
    } else {
      alert('Failed to delete log: ' + error.message)
    }
  }

  const handleClearAllLogs = async () => {
    if (!window.confirm(`Are you sure you want to delete ALL logs in this category? This cannot be undone.`)) return
    
    let actionFilter = []
    if (activeTab === 'revenue') {
      actionFilter = ['revenue_added', 'revenue_updated']
    } else if (activeTab === 'login') {
      actionFilter = ['login']
    } else if (activeTab === 'admin') {
      actionFilter = ['admin_activity']
    } else if (activeTab === 'page_view') {
      actionFilter = ['page_view']
    }

    if (actionFilter.length > 0) {
      setLoading(true)
      const { error } = await supabase.from('audit_logs').delete().in('action_type', actionFilter)
      if (!error) {
        setLogs([])
        // The realtime subscription might also clear it, but setting it here is safe.
      } else {
        alert('Failed to delete logs: ' + error.message)
      }
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()

    // Subscribe to realtime inserts
    const channel = supabase.channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (payload) => {
          // Instead of complex logic to fetch user relation, just refetch
          fetchLogs()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeTab])

  const formatDate = (isoString) => {
    const d = new Date(isoString)
    return d.toLocaleString()
  }

  const renderDetails = (log) => {
    const { action_type, details } = log
    if (!details) return null
    if (action_type === 'revenue_added') {
      return `Added $${details.amount} for ${details.revenue_month}`
    }
    if (action_type === 'revenue_updated') {
      return `Updated revenue to $${details.new_amount} for ${details.revenue_month}`
    }
    if (action_type === 'login') {
      const dev = details.device ? ` from ${details.device}` : ''
      return `Logged in successfully${dev}`
    }
    if (action_type === 'admin_activity') {
      const dev = details.device ? ` from ${details.device}` : ''
      return (details.description || JSON.stringify(details)) + dev
    }
    if (action_type === 'page_view') {
      return `Navigated to ${details.page_name}`
    }
    return JSON.stringify(details)
  }

  const activeUsersList = Object.values(onlineUsers || {})
    .filter(u => !EXCLUDED_EMAILS.includes(u.email))
    .sort((a, b) => new Date(b.online_at) - new Date(a.online_at))

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
          <ClipboardList size={28} />
        </div>
        <div>
          <h1 className="admin-page-title">Global Audit Logs</h1>
          <p className="admin-page-subtitle">Track real-time activity across the entire platform.</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="apple-btn"
                style={{
                  background: isActive ? 'var(--apple-accent-blue)' : 'rgba(255, 255, 255, 0.05)',
                  color: isActive ? '#fff' : 'var(--apple-text-secondary)',
                  border: isActive ? 'none' : '1px solid var(--apple-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <Icon size={16} />
                {tab.label}
                {tab.id === 'active' && activeUsersList.length > 0 && (
                  <span style={{ background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(48, 213, 200, 0.2)', color: isActive ? '#fff' : 'var(--apple-accent-green)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    {activeUsersList.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        
        {activeTab !== 'active' && logs.length > 0 && (
          <button
            onClick={handleClearAllLogs}
            className="apple-btn"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <Trash2 size={16} />
            Clear All Logs
          </button>
        )}
      </div>

      <div className="admin-card" style={{ padding: '20px' }}>
        {activeTab === 'active' ? (
          <div>
            <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="var(--apple-accent-green)" /> Currently Online
            </h3>
            {activeUsersList.length === 0 ? (
              <p style={{ color: 'var(--apple-text-secondary)' }}>No active members found right now.</p>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {activeUsersList.map(u => (
                  <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--apple-border)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(48, 213, 200, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--apple-accent-green)', fontWeight: 'bold' }}>
                        {(u.first_name?.[0] || u.email?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ color: '#fff', fontWeight: '500' }}>{u.first_name} {u.last_name}</div>
                        <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.85rem' }}>{u.email}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--apple-accent-green)', fontSize: '0.85rem', fontWeight: '500', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--apple-accent-green)', boxShadow: '0 0 8px var(--apple-accent-green)' }}></div>
                      Online Now
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {loading && logs.length === 0 ? (
              <p style={{ color: 'var(--apple-text-secondary)' }}>Loading logs...</p>
            ) : logs.length === 0 ? (
              <p style={{ color: 'var(--apple-text-secondary)' }}>No activity found for this category.</p>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {logs.map(log => (
                  <div key={log.id} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--apple-border)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ color: '#fff', fontWeight: '500' }}>
                        {log.user ? `${log.user.first_name} ${log.user.last_name}` : 'Unknown User'}
                        <span style={{ color: 'var(--apple-text-secondary)', fontSize: '0.85rem', marginLeft: '8px', fontWeight: 'normal' }}>
                          ({log.user?.email})
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.85rem' }}>
                          {formatDate(log.created_at)}
                        </div>
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px',
                            opacity: 0.7,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
                          title="Delete Log"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.95rem' }}>
                      {renderDetails(log)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
