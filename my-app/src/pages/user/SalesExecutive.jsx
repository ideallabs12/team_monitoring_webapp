import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { Plus, TrendingUp, PhoneCall, Calendar, Search, Filter, Edit2, X, Trash2 } from 'lucide-react'

export default function SalesExecutive({ user }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Data
  const [teams, setTeams] = useState([])
  const [members, setMembers] = useState([])
  const [logs, setLogs] = useState([])
  
  // Form State
  const [editingLogId, setEditingLogId] = useState(null)
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedMember, setSelectedMember] = useState('')
  const [speakerName, setSpeakerName] = useState('')
  const [notes, setNotes] = useState('')
  const [salesRevenue, setSalesRevenue] = useState('0.00')
  const [callDate, setCallDate] = useState(new Date().toISOString().split('T')[0])
  
  // Filters
  const [filterTeam, setFilterTeam] = useState('')
  const [filterDate, setFilterDate] = useState('')
  
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [teamsRes, logsRes] = await Promise.all([
          supabase.from('teams').select('id, name').order('name'),
          supabase.from('sales_analytics')
            .select('*, teams(name), profiles:member_id(first_name, last_name)')
            .eq('entered_by', user.id)
            .order('call_date', { ascending: false })
        ])
        
        if (teamsRes.error) throw teamsRes.error
        if (logsRes.error) throw logsRes.error
        
        setTeams(teamsRes.data || [])
        setLogs(logsRes.data || [])
      } catch (err) {
        console.error('Error loading data:', err)
        setErrorMsg('Failed to load initial data.')
      } finally {
        setLoading(false)
      }
    }
    loadInitialData()
  }, [user.id])

  // Load members when team changes
  useEffect(() => {
    async function loadMembers() {
      if (!selectedTeam) {
        setMembers([])
        return
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('team_id', selectedTeam)
          .order('first_name')
          
        if (error) throw error
        setMembers(data || [])
      } catch (err) {
        console.error('Error loading members:', err)
      }
    }
    loadMembers()
  }, [selectedTeam])

  const handleEdit = (log) => {
    setEditingLogId(log.id)
    setSelectedTeam(log.team_id)
    // We need to wait for members to load, but the useEffect will handle it.
    // However, selectedMember might reset if members load after. 
    // It's safe to just set it here, and the useEffect doesn't clear it.
    // Actually, in the previous code, the useEffect reset selectedMember!
    // I need to fix that or set selectedMember in a timeout. Let's just set it.
    setSelectedMember(log.member_id)
    setSpeakerName(log.speaker_name)
    setNotes(log.notes || '')
    setSalesRevenue(log.sales_revenue.toString())
    setCallDate(log.call_date)
    setErrorMsg('')
    setSuccessMsg('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingLogId(null)
    setSpeakerName('')
    setNotes('')
    setSalesRevenue('0.00')
    setSelectedMember('')
    setErrorMsg('')
    setSuccessMsg('')
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this log?")) return;
    
    try {
      const { error } = await supabase
        .from('sales_analytics')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setLogs(logs.filter(log => log.id !== id));
      setSuccessMsg('Call log deleted successfully!');
    } catch (err) {
      console.error('Error deleting log:', err);
      setErrorMsg('Failed to delete call log.');
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')
    
    if (!selectedTeam || !selectedMember || !speakerName || !salesRevenue || !callDate) {
      setErrorMsg('Please fill in all required fields.')
      setSaving(false)
      return
    }

    try {
      if (editingLogId) {
        // Update existing log
        const { data, error } = await supabase
          .from('sales_analytics')
          .update({
            team_id: selectedTeam,
            member_id: selectedMember,
            speaker_name: speakerName,
            notes: notes,
            sales_revenue: parseFloat(salesRevenue),
            call_date: callDate
          })
          .eq('id', editingLogId)
          .select('*, teams(name), profiles:member_id(first_name, last_name)')
          .single()
          
        if (error) throw error
        
        setSuccessMsg('Call log updated successfully!')
        setLogs(logs.map(l => l.id === editingLogId ? data : l).sort((a, b) => new Date(b.call_date) - new Date(a.call_date)))
        handleCancelEdit()
      } else {
        // Insert new log
        const { data, error } = await supabase
          .from('sales_analytics')
          .insert({
            team_id: selectedTeam,
            member_id: selectedMember,
            speaker_name: speakerName,
            notes: notes,
            sales_revenue: parseFloat(salesRevenue),
            call_date: callDate,
            entered_by: user.id
          })
          .select('*, teams(name), profiles:member_id(first_name, last_name)')
          .single()
          
        if (error) throw error
        
        setSuccessMsg('Call log added successfully!')
        setLogs([data, ...logs].sort((a, b) => new Date(b.call_date) - new Date(a.call_date)))
        
        // Reset form
        setSelectedMember('')
        setSpeakerName('')
        setNotes('')
        setSalesRevenue('0.00')
      }
    } catch (err) {
      console.error('Error saving log:', err)
      setErrorMsg('Failed to save call log.')
    } finally {
      setSaving(false)
    }
  }

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchTeam = filterTeam ? log.team_id === filterTeam : true
      const matchDate = filterDate ? log.call_date === filterDate : true
      return matchTeam && matchDate
    })
  }, [logs, filterTeam, filterDate])

  const stats = useMemo(() => {
    const totalCalls = filteredLogs.length
    const totalRevenue = filteredLogs.reduce((sum, log) => sum + Number(log.sales_revenue), 0)
    return { totalCalls, totalRevenue }
  }, [filteredLogs])

  if (loading) {
    return <div style={{ color: 'var(--apple-text-secondary)', textAlign: 'center', padding: '40px' }}>Loading analytics...</div>
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="apple-title-large" style={{ margin: '0 0 8px 0' }}>Sales Analytics</h1>
        <p style={{ margin: 0, color: 'var(--apple-text-secondary)' }}>Log and track your individual call activity, notes, and generated sales revenue.</p>
      </div>

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

      {/* Analytics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="apple-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0,113,227,0.1)', color: 'var(--apple-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PhoneCall size={24} />
          </div>
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Total Calls Logged</p>
            <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: '700' }}>{stats.totalCalls}</h2>
          </div>
        </div>
        <div className="apple-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(74,222,128,0.1)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Total Sales Revenue</p>
            <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: '700' }}>${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', '@media (min-width: 1024px)': { gridTemplateColumns: '320px 1fr' } }}>
        {/* Entry Form */}
        <div className="apple-card" style={{ padding: '24px', height: 'fit-content' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 className="apple-title-small" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {editingLogId ? <Edit2 size={18} style={{ color: '#a78bfa' }} /> : <Plus size={18} style={{ color: 'var(--apple-accent-blue)' }} />}
              {editingLogId ? 'Edit Call Log' : 'Add Call Log'}
            </h3>
            {editingLogId && (
              <button onClick={handleCancelEdit} style={{ background: 'none', border: 'none', color: 'var(--apple-text-secondary)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '8px', fontWeight: '500' }}>Team <span style={{color: '#ef4444'}}>*</span></label>
              <select className="apple-input" value={selectedTeam} onChange={e => { setSelectedTeam(e.target.value); setSelectedMember(''); }} required>
                <option value="" disabled>Select Team</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '8px', fontWeight: '500' }}>Member <span style={{color: '#ef4444'}}>*</span></label>
              <select className="apple-input" value={selectedMember} onChange={e => setSelectedMember(e.target.value)} required disabled={!selectedTeam}>
                <option value="" disabled>{selectedTeam ? 'Select Member' : 'Select Team First'}</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '8px', fontWeight: '500' }}>Speaker Name <span style={{color: '#ef4444'}}>*</span></label>
              <input type="text" className="apple-input" value={speakerName} onChange={e => setSpeakerName(e.target.value)} required placeholder="e.g. John Doe" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '8px', fontWeight: '500' }}>Call Notes</label>
              <textarea 
                className="apple-input" 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="Enter details about the call..." 
                rows={4}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '8px', fontWeight: '500' }}>Sales Revenue ($) <span style={{color: '#ef4444'}}>*</span></label>
              <input type="number" step="0.01" min="0" className="apple-input" value={salesRevenue} onChange={e => setSalesRevenue(e.target.value)} required placeholder="0.00" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '8px', fontWeight: '500' }}>Call Date <span style={{color: '#ef4444'}}>*</span></label>
              <input type="date" className="apple-input" value={callDate} onChange={e => setCallDate(e.target.value)} required />
            </div>

            <button type="submit" className="apple-btn apple-btn-primary" disabled={saving} style={{ marginTop: '8px', background: editingLogId ? 'linear-gradient(135deg, #7c3aed, #a78bfa)' : '' }}>
              {saving ? 'Saving...' : (editingLogId ? 'Update Log' : 'Submit Log')}
            </button>
          </form>
        </div>

        {/* Logs List & Filters */}
        <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <h3 className="apple-title-small" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} style={{ color: 'var(--apple-accent-blue)' }} /> Call History
            </h3>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Filter size={14} style={{ position: 'absolute', left: '12px', color: 'var(--apple-text-secondary)' }} />
                <select className="apple-input" style={{ paddingLeft: '32px', py: '6px', fontSize: '0.85rem' }} value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
                  <option value="">All Teams</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', color: 'var(--apple-text-secondary)' }} />
                <input type="date" className="apple-input" style={{ paddingLeft: '32px', py: '6px', fontSize: '0.85rem' }} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
              </div>
              {(filterTeam || filterDate) && (
                <button className="apple-btn" onClick={() => { setFilterTeam(''); setFilterDate(''); }} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--apple-border)', borderRadius: '12px' }}>
            {filteredLogs.length > 0 ? (
              <div style={{ minWidth: '600px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', padding: '12px 16px', borderBottom: '1px solid var(--apple-border)', fontSize: '0.75rem', fontWeight: '600', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <div>Date</div>
                  <div>Team</div>
                  <div>Member</div>
                  <div>Speaker</div>
                  <div style={{ textAlign: 'right' }}>Revenue</div>
                  <div style={{ width: '40px' }}></div>
                </div>
                {filteredLogs.map(log => (
                  <div key={log.id} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', padding: '16px', alignItems: 'center', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.02)' } }}>
                      <div style={{ fontSize: '0.9rem' }}>{new Date(log.call_date).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.9rem' }}>{log.teams?.name || 'Unknown'}</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--apple-text-secondary)' }}>{log.profiles?.first_name} {log.profiles?.last_name}</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{log.speaker_name}</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: '600', color: Number(log.sales_revenue) > 0 ? '#4ade80' : 'var(--apple-text-secondary)', textAlign: 'right' }}>
                        ${Number(log.sales_revenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div style={{ textAlign: 'right', paddingLeft: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleEdit(log)} style={{ background: 'none', border: 'none', color: 'var(--apple-text-secondary)', cursor: 'pointer', padding: '4px' }} title="Edit Log">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(log.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }} title="Delete Log">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {log.notes && (
                      <div style={{ padding: '0 16px 16px 16px', fontSize: '0.85rem', color: 'var(--apple-text-secondary)' }}>
                        <strong style={{ color: 'var(--apple-text-primary)' }}>Notes: </strong> 
                        <span style={{ whiteSpace: 'pre-wrap' }}>{log.notes}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--apple-text-secondary)', fontStyle: 'italic' }}>
                No call logs found. Try adjusting your filters or adding a new log.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
