import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { CheckCircle, XCircle, Clock, Search, MapPin, Wifi, AlertTriangle, Settings, Plus, Trash2, Pencil, Check, X, ToggleLeft, ToggleRight } from 'lucide-react'

export default function AdminAttendance() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, pending, present
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('logs') // 'logs' or 'settings'

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('attendance_logs')
        .select(`
          *,
          profiles:user_id (first_name, last_name, email, team_id)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error('Error fetching attendance logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (logId) => {
    try {
      const { error } = await supabase
        .from('attendance_logs')
        .update({ status: 'present' })
        .eq('id', logId)

      if (error) throw error
      
      setLogs(logs.map(log => log.id === logId ? { ...log, status: 'present' } : log))
    } catch (err) {
      console.error('Failed to approve:', err)
      alert('Failed to approve exception.')
    }
  }

  const handleReject = async (logId) => {
    try {
      const { error } = await supabase
        .from('attendance_logs')
        .update({ status: 'rejected' })
        .eq('id', logId)

      if (error) throw error
      
      setLogs(logs.map(log => log.id === logId ? { ...log, status: 'rejected' } : log))
    } catch (err) {
      console.error('Failed to reject:', err)
      alert('Failed to reject exception.')
    }
  }

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this attendance log? This action cannot be undone.')) return
    try {
      const { error } = await supabase
        .from('attendance_logs')
        .delete()
        .eq('id', logId)

      if (error) throw error
      
      setLogs(logs.filter(log => log.id !== logId))
    } catch (err) {
      console.error('Failed to delete log:', err)
      alert('Failed to delete log.')
    }
  }

  const filteredLogs = logs.filter(log => {
    if (filter === 'pending' && log.status !== 'pending_approval') return false
    if (filter === 'present' && log.status !== 'present') return false
    
    if (search) {
      const query = search.toLowerCase()
      const name = `${log.profiles?.first_name || ''} ${log.profiles?.last_name || ''}`.toLowerCase()
      const email = (log.profiles?.email || '').toLowerCase()
      if (!name.includes(query) && !email.includes(query)) return false
    }
    return true
  })

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="apple-title-large" style={{ marginBottom: '8px' }}>Attendance Logs</h1>
          <p style={{ color: 'var(--apple-text-secondary)', margin: 0 }}>Review daily punch-ins and approve exceptions.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setActiveTab('logs')}
            className="apple-btn"
            style={{ background: activeTab === 'logs' ? 'var(--apple-card)' : 'transparent', color: activeTab === 'logs' ? '#fff' : 'var(--apple-text-secondary)', border: 'none' }}
          >
            Attendance Logs
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className="apple-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: activeTab === 'settings' ? 'var(--apple-card)' : 'transparent', color: activeTab === 'settings' ? '#fff' : 'var(--apple-text-secondary)', border: 'none' }}
          >
            <Settings size={16} /> Settings
          </button>
        </div>
      </div>

      {activeTab === 'logs' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', marginBottom: '16px', gap: '12px' }}>
            <div style={{ position: 'relative', flex: '1 1 220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)' }} />
              <input
                type="text"
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="apple-input"
                style={{ paddingLeft: '36px', width: '100%' }}
              />
            </div>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="apple-input" style={{ flex: '1 1 180px' }}>
              <option value="all">All Logs</option>
              <option value="pending">Pending Approval</option>
              <option value="present">Present (Approved)</option>
            </select>
          </div>

          <div className="apple-card" style={{ padding: '0 !important' }}>
            <div className="apple-desktop-table-container" style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--apple-border)' }}>
                <th style={{ padding: '16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Employee</th>
                <th style={{ padding: '16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Time In / Out</th>
                <th style={{ padding: '16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Details</th>
                <th style={{ padding: '16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>Loading logs...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>No attendance logs found.</td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '500', color: '#fff', textTransform: 'capitalize' }}>
                        {log.profiles?.first_name} {log.profiles?.last_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>{log.profiles?.email}</div>
                    </td>
                    <td style={{ padding: '16px', color: '#e2e8f0', fontSize: '0.9rem' }}>
                      {new Date(log.attendance_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#4ade80' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>IN:</span>
                        {new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {log.check_out_time && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#94a3b8', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>OUT:</span>
                          {new Date(log.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>
                          <Wifi size={14} /> {log.ip_address || 'No IP Recorded'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>
                          <MapPin size={14} /> {log.latitude ? `${log.latitude}, ${log.longitude}` : 'No Location Recorded'}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {log.status === 'present' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '12px', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', fontSize: '0.8rem', fontWeight: '500' }}><CheckCircle size={14} /> Approved</span>}
                      {log.status === 'pending_approval' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', fontSize: '0.8rem', fontWeight: '500' }}><Clock size={14} /> Pending</span>}
                      {log.status === 'rejected' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.8rem', fontWeight: '500' }}><XCircle size={14} /> Rejected</span>}
                      
                      {log.exception_reason && (
                        <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.05)', padding: '6px 8px', borderRadius: '6px', borderLeft: '2px solid #fbbf24' }}>
                          <AlertTriangle size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          <strong>Exception:</strong> {log.exception_reason}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {log.status === 'pending_approval' && (
                          <>
                            <button onClick={() => handleApprove(log.id)} className="apple-btn" style={{ padding: '6px 12px', fontSize: '0.85rem', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', borderColor: 'rgba(74, 222, 128, 0.2)' }}>Approve</button>
                            <button onClick={() => handleReject(log.id)} className="apple-btn" style={{ padding: '6px 12px', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>Reject</button>
                          </>
                        )}
                        <button onClick={() => handleDeleteLog(log.id)} className="apple-btn" style={{ padding: '6px', color: '#ef4444', background: 'transparent', border: 'none' }} title="Delete Log">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List */}
        <div className="apple-mobile-list-card">
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>Loading logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>No attendance logs found.</div>
          ) : (
            filteredLogs.map((log, index) => (
              <div key={log.id} style={{
                display: 'flex', flexDirection: 'column',
                padding: '16px 20px',
                borderBottom: index < filteredLogs.length - 1 ? '1px solid var(--apple-border)' : 'none',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '600', color: '#fff', textTransform: 'capitalize', fontSize: '0.95rem' }}>
                      {log.profiles?.first_name} {log.profiles?.last_name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>{log.profiles?.email}</div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>
                      {new Date(log.attendance_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      {log.status === 'present' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 6px', borderRadius: '8px', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', fontSize: '0.75rem', fontWeight: '600' }}><CheckCircle size={12} /> Approved</span>}
                      {log.status === 'pending_approval' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 6px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', fontSize: '0.75rem', fontWeight: '600' }}><Clock size={12} /> Pending</span>}
                      {log.status === 'rejected' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 6px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.75rem', fontWeight: '600' }}><XCircle size={12} /> Rejected</span>}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--apple-text-secondary)', marginBottom: '2px' }}>IN</div>
                    <div style={{ fontSize: '0.9rem', color: '#4ade80', fontWeight: '500' }}>
                      {new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {log.check_out_time && (
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--apple-text-secondary)', marginBottom: '2px' }}>OUT</div>
                      <div style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: '500' }}>
                        {new Date(log.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>
                    <Wifi size={14} /> {log.ip_address || 'No IP'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>
                    <MapPin size={14} /> {log.latitude ? `${log.latitude}, ${log.longitude}` : 'No Location'}
                  </div>
                </div>

                {log.exception_reason && (
                  <div style={{ fontSize: '0.8rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.05)', padding: '8px 12px', borderRadius: '6px', borderLeft: '2px solid #fbbf24', marginTop: '4px' }}>
                    <AlertTriangle size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    <strong>Exception:</strong> {log.exception_reason}
                  </div>
                )}

                {log.status === 'pending_approval' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button onClick={() => handleApprove(log.id)} className="apple-btn" style={{ flex: 1, padding: '8px', fontSize: '0.85rem', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', borderColor: 'rgba(74, 222, 128, 0.2)' }}>Approve</button>
                    <button onClick={() => handleReject(log.id)} className="apple-btn" style={{ flex: 1, padding: '8px', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>Reject</button>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button onClick={() => handleDeleteLog(log.id)} className="apple-btn" style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
        </>
      ) : (
        <AttendanceSettings />
      )}
    </div>
  )
}

const AppleToggle = ({ checked, onChange }) => {
  return (
    <div 
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      style={{
        width: '44px',
        height: '24px',
        background: checked ? '#34c759' : 'rgba(120, 120, 128, 0.32)',
        borderRadius: '12px',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.3s ease',
        flexShrink: 0
      }}
    >
      <div 
        style={{
          width: '20px',
          height: '20px',
          background: '#fff',
          borderRadius: '50%',
          position: 'absolute',
          top: '2px',
          left: checked ? '22px' : '2px',
          transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
      />
    </div>
  )
}

function AttendanceSettings() {
  const [locations, setLocations] = useState([])
  const [ips, setIps] = useState([])
  const [loading, setLoading] = useState(true)

  // Location form
  const [locName, setLocName] = useState('')
  const [locLat, setLocLat] = useState('')
  const [locLng, setLocLng] = useState('')
  const [locRadius, setLocRadius] = useState('300')

  // IP forms by location
  const [ipForms, setIpForms] = useState({})

  // Editing state
  const [editingLoc, setEditingLoc] = useState(null)
  const [editLocName, setEditLocName] = useState('')
  const [editLocRadius, setEditLocRadius] = useState('')
  const [editingIp, setEditingIp] = useState(null)
  const [editIpName, setEditIpName] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    const [locRes, ipRes] = await Promise.all([
      supabase.from('office_locations').select('*').order('created_at', { ascending: true }),
      supabase.from('office_ips').select('*').order('created_at', { ascending: true })
    ])
    if (locRes.data) setLocations(locRes.data)
    if (ipRes.data) setIps(ipRes.data)
    setLoading(false)
  }

  const addLocation = async (e) => {
    e.preventDefault()
    const { data, error } = await supabase
      .from('office_locations')
      .insert({ name: locName, latitude: parseFloat(locLat), longitude: parseFloat(locLng), radius_meters: parseInt(locRadius) })
      .select()
    if (!error && data) {
      setLocations([...locations, ...data])
      setLocName(''); setLocLat(''); setLocLng(''); setLocRadius('300')
    } else {
      alert('Error adding location')
    }
  }

  const handleIpFormChange = (locId, field, value) => {
    setIpForms(prev => ({
      ...prev,
      [locId]: { ...prev[locId], [field]: value }
    }))
  }

  const addIpToLocation = async (e, locId) => {
    e.preventDefault()
    const form = ipForms[locId]
    if (!form?.name || !form?.ip) return

    const { data, error } = await supabase
      .from('office_ips')
      .insert({ location_id: locId, name: form.name, ip_address: form.ip })
      .select()

    if (!error && data) {
      setIps([...ips, ...data])
      handleIpFormChange(locId, 'name', '')
      handleIpFormChange(locId, 'ip', '')
    } else {
      alert('Error adding IP')
    }
  }

  const deleteLocation = async (id) => {
    await supabase.from('office_locations').delete().eq('id', id)
    setLocations(locations.filter(l => l.id !== id))
    setIps(ips.filter(i => i.location_id !== id))
  }

  const deleteIp = async (id) => {
    await supabase.from('office_ips').delete().eq('id', id)
    setIps(ips.filter(i => i.id !== id))
  }

  const startEditLoc = (loc) => {
    setEditingLoc(loc.id)
    setEditLocName(loc.name)
    setEditLocRadius(loc.radius_meters)
  }

  const saveEditLoc = async (id) => {
    const radius = parseInt(editLocRadius) || 300
    const { error } = await supabase.from('office_locations').update({ name: editLocName, radius_meters: radius }).eq('id', id)
    if (!error) {
      setLocations(locations.map(l => l.id === id ? { ...l, name: editLocName, radius_meters: radius } : l))
      setEditingLoc(null)
    } else {
      alert('Error updating location')
    }
  }

  const startEditIp = (ip) => {
    setEditingIp(ip.id)
    setEditIpName(ip.name)
  }

  const saveEditIp = async (id) => {
    const { error } = await supabase.from('office_ips').update({ name: editIpName }).eq('id', id)
    if (!error) {
      setIps(ips.map(i => i.id === id ? { ...i, name: editIpName } : i))
      setEditingIp(null)
    } else {
      alert('Error updating network name')
    }
  }

  const toggleLocationActive = async (id, currentStatus) => {
    const { error } = await supabase.from('office_locations').update({ is_active: !currentStatus }).eq('id', id)
    if (!error) {
      setLocations(locations.map(l => l.id === id ? { ...l, is_active: !currentStatus } : l))
    }
  }

  if (loading) return <div>Loading settings...</div>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: '24px', justifyContent: 'center' }}>
      
      {/* Office Locations */}
      {locations.map(loc => {
        const locationIps = ips.filter(ip => ip.location_id === loc.id)
        const ipForm = ipForms[loc.id] || { name: '', ip: '' }

        return (
          <div key={loc.id} className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Location Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, paddingRight: '12px' }}>
                {editingLoc === loc.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <MapPin size={18} style={{ color: '#ec4899' }} />
                    <input className="apple-input" style={{ padding: '4px 8px', fontSize: '0.9rem', flex: 1, minWidth: '150px' }} value={editLocName} onChange={e => setEditLocName(e.target.value)} autoFocus placeholder="Location Name" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="number" className="apple-input" style={{ padding: '4px 8px', fontSize: '0.9rem', width: '80px' }} value={editLocRadius} onChange={e => setEditLocRadius(e.target.value)} placeholder="Radius" />
                      <span style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>m radius</span>
                    </div>
                    <button onClick={() => saveEditLoc(loc.id)} style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', padding: '4px' }}><Check size={16} /></button>
                    <button onClick={() => setEditingLoc(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><X size={16} /></button>
                  </div>
                ) : (
                  <h3 className="apple-title-small" style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '12px', opacity: loc.is_active ? 1 : 0.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <MapPin size={18} style={{ color: '#ec4899' }} /> 
                      <span style={{ textDecoration: loc.is_active ? 'none' : 'line-through' }}>{loc.name}</span>
                    </div>
                    <AppleToggle checked={loc.is_active} onChange={() => toggleLocationActive(loc.id, loc.is_active)} />
                    <button onClick={() => startEditLoc(loc)} style={{ background: 'none', border: 'none', color: 'var(--apple-text-secondary)', cursor: 'pointer', padding: '4px' }}><Pencil size={14} /></button>
                  </h3>
                )}
                <div style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)', paddingLeft: '26px' }}>
                  {loc.latitude}, {loc.longitude} ({loc.radius_meters}m radius)
                </div>
              </div>
              <button onClick={() => deleteLocation(loc.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '6px', borderRadius: '8px', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                <Trash2 size={16} />
              </button>
            </div>

            {/* Nested IPs */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
              <h4 style={{ fontSize: '0.85rem', color: '#e2e8f0', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wifi size={14} style={{ color: '#4ade80' }} /> Associated Wi-Fi Networks
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {locationIps.map(ip => (
                  <div key={ip.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', opacity: loc.is_active ? 1 : 0.5 }}>
                    {editingIp === ip.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <input className="apple-input" style={{ flex: 1, padding: '4px 8px', fontSize: '0.85rem' }} value={editIpName} onChange={e => setEditIpName(e.target.value)} autoFocus />
                        <button onClick={() => saveEditIp(ip.id)} style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', padding: '4px' }}><Check size={14} /></button>
                        <button onClick={() => setEditingIp(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><X size={14} /></button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: '500', color: '#fff', fontSize: '0.85rem' }}>{ip.name}</span>
                            <button onClick={() => startEditIp(ip)} style={{ background: 'none', border: 'none', color: 'var(--apple-text-secondary)', cursor: 'pointer', padding: '2px' }}><Pencil size={12} /></button>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>{ip.ip_address}</div>
                        </div>
                        <button onClick={() => deleteIp(ip.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
                {locationIps.length === 0 && <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>No IPs added yet.</div>}
              </div>

              {/* Add IP Form */}
              <form onSubmit={(e) => addIpToLocation(e, loc.id)} style={{ display: 'flex', gap: '8px' }}>
                <input className="apple-input" style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem' }} placeholder="Network Name" value={ipForm.name} onChange={e => handleIpFormChange(loc.id, 'name', e.target.value)} required />
                <input className="apple-input" style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem' }} placeholder="IP Address" value={ipForm.ip} onChange={e => handleIpFormChange(loc.id, 'ip', e.target.value)} required />
                <button type="submit" className="apple-btn apple-btn-primary" style={{ padding: '8px 12px', fontSize: '0.8rem' }}><Plus size={14} /></button>
              </form>
            </div>
          </div>
        )
      })}

      {/* Add New Location Card */}
      <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', borderStyle: 'dashed', background: 'rgba(255,255,255,0.01)' }}>
        <h3 className="apple-title-small" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--apple-text-secondary)' }}>
          <Plus size={18} /> Add New Location
        </h3>
        <form onSubmit={addLocation} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input className="apple-input" placeholder="Location Name (e.g. Hyderabad Office)" value={locName} onChange={e => setLocName(e.target.value)} required />
          <div style={{ display: 'flex', gap: '12px' }}>
            <input className="apple-input" type="number" step="any" placeholder="Latitude" value={locLat} onChange={e => setLocLat(e.target.value)} required style={{ flex: 1 }} />
            <input className="apple-input" type="number" step="any" placeholder="Longitude" value={locLng} onChange={e => setLocLng(e.target.value)} required style={{ flex: 1 }} />
          </div>
          <input className="apple-input" type="number" placeholder="Allowed Radius (meters)" value={locRadius} onChange={e => setLocRadius(e.target.value)} required />
          <button type="submit" className="apple-btn apple-btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}><Plus size={16} /> Create Location</button>
        </form>
      </div>

    </div>
  )
}

