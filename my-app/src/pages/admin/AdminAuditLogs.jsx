import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { ClipboardList, Users, ShieldAlert, DollarSign, LogIn, Activity, AlertCircle } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { usePresence } from '../../components/PresenceProvider'

const TABS = [
  { id: 'revenue', label: 'Revenue Activity', icon: DollarSign },
  { id: 'login', label: 'Login Activity', icon: LogIn },
  { id: 'active', label: 'Active Members', icon: Users },
  { id: 'admin', label: 'Admin Activity', icon: ShieldAlert },
]

export default function AdminAuditLogs() {
  const { user } = useOutletContext() || {}
  const { onlineUsers } = usePresence()
  const [activeTab, setActiveTab] = useState('revenue')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)

  // Verify access
  if (user?.email !== 'signatureglobalconferences@gmail.com') {
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
        .limit(100)
      
      if (!error && data) {
        setLogs(data)
      }
    }
    setLoading(false)
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
      return `Logged in successfully`
    }
    if (action_type === 'admin_activity') {
      return details.description || JSON.stringify(details)
    }
    return JSON.stringify(details)
  }

  const activeUsersList = Object.values(onlineUsers || {}).sort((a, b) => new Date(b.online_at) - new Date(a.online_at))

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

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
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
                borderRadius: '8px',
                fontSize: '0.9rem'
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
                  <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--apple-border)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(48, 213, 200, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--apple-accent-green)', fontWeight: 'bold' }}>
                        {(u.first_name?.[0] || u.email?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ color: '#fff', fontWeight: '500' }}>{u.first_name} {u.last_name}</div>
                        <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.85rem' }}>{u.email}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--apple-accent-green)', fontSize: '0.85rem', fontWeight: '500' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ color: '#fff', fontWeight: '500' }}>
                        {log.user ? `${log.user.first_name} ${log.user.last_name}` : 'Unknown User'}
                        <span style={{ color: 'var(--apple-text-secondary)', fontSize: '0.85rem', marginLeft: '8px', fontWeight: 'normal' }}>
                          ({log.user?.email})
                        </span>
                      </div>
                      <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.85rem' }}>
                        {formatDate(log.created_at)}
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
