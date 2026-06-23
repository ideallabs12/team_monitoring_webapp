import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { Calendar, Plus, Trash2, Power, RefreshCw } from 'lucide-react'

export default function AdminWriteUps() {
  const [events, setEvents] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetTeamId, setTargetTeamId] = useState('all')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const loadEvents = async () => {
    setLoading(true)
    try {
      // Fetch events with teams
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*, teams(name)')
        .order('created_at', { ascending: false })
      
      if (eventsError) throw eventsError
      setEvents(eventsData || [])
      
      // Fetch all teams for the dropdown
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .order('name')
        
      if (!teamsError) {
        setTeams(teamsData || [])
      }
    } catch (err) {
      console.error('Error loading events:', err)
      setMessage({ type: 'error', text: 'Failed to load events.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const handleCreateEvent = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage({ type: '', text: '' })
    
    try {
      const insertData = {
        title,
        description,
        is_active: true,
        target_team_id: targetTeamId === 'all' ? null : targetTeamId
      }
      
      const { data, error } = await supabase
        .from('events')
        .insert([insertData])
        .select('*, teams(name)')
        .single()
        
      if (error) throw error
      
      setEvents([data, ...events])
      setTitle('')
      setDescription('')
      setTargetTeamId('all')
      setShowCreate(false)
      setMessage({ type: 'success', text: 'Event created successfully!' })
    } catch (err) {
      console.error('Error creating event:', err)
      setMessage({ type: 'error', text: 'Failed to create event.' })
    } finally {
      setSubmitting(false)
    }
  }

  const toggleEventStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_active: !currentStatus })
        .eq('id', id)
        
      if (error) throw error
      
      setEvents(events.map(ev => ev.id === id ? { ...ev, is_active: !currentStatus } : ev))
    } catch (err) {
      console.error('Error toggling status:', err)
      alert('Failed to update event status.')
    }
  }

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event? This will also delete all associated reviews.')) return
    
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)
        
      if (error) throw error
      
      setEvents(events.filter(ev => ev.id !== id))
    } catch (err) {
      console.error('Error deleting event:', err)
      alert('Failed to delete event.')
    }
  }

  if (loading && events.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', gap: '16px' }}>
        <RefreshCw size={36} className="spin-anim" style={{ color: 'var(--apple-accent-blue)' }} />
        <div style={{ color: 'var(--apple-text-secondary)', fontSize: '1.05rem', fontWeight: '500' }}>Loading Events...</div>
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* ===== HEADER SECTION ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'clamp(24px, 5vw, 40px)', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="apple-kicker">Review System</div>
          <h1 className="apple-title-large">Manage Review Write-Ups</h1>
          <p className="apple-lead">
            Create review write-ups, toggle their active status, or delete them.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="apple-btn apple-btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {showCreate ? 'Cancel' : <><Plus size={16} /> Create Write-Up</>}
          </button>
        </div>
      </div>

      {message.text && (
        <div style={{
          padding: '12px 16px', borderRadius: '10px', marginBottom: '20px',
          background: message.type === 'success' ? 'rgba(48,213,200,0.08)' : 'rgba(255,69,58,0.08)',
          border: `1px solid ${message.type === 'success' ? 'var(--apple-accent-green)' : 'var(--apple-accent-red)'}`,
          color: message.type === 'success' ? 'var(--apple-accent-green)' : 'var(--apple-accent-red)',
          fontSize: '0.88rem', fontWeight: '500'
        }}>
          {message.text}
        </div>
      )}

      {/* ===== CREATE EVENT FORM ===== */}
      {showCreate && (
        <div className="apple-card" style={{ padding: '24px', marginBottom: '30px', borderTop: '3px solid var(--apple-accent-blue)' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} style={{ color: 'var(--apple-accent-blue)' }} /> New Write-Up
          </h3>
          <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label className="apple-form-label">Write-Up Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q3 Town Hall Feedback"
                required
                className="apple-form-control"
              />
            </div>
            <div>
              <label className="apple-form-label">Target Team</label>
              <select
                className="apple-form-control"
                value={targetTeamId}
                onChange={(e) => setTargetTeamId(e.target.value)}
              >
                <option value="all">All Teams</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="apple-form-label">Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide some context for what users should review..."
                rows={3}
                className="apple-form-control"
                style={{ resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="apple-btn apple-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className="apple-btn apple-btn-primary"
              >
                {submitting ? 'Saving...' : 'Save Write-Up'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===== EVENTS LIST ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {events.map((ev) => (
          <div key={ev.id} className="apple-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: ev.is_active ? 'var(--apple-accent-green)' : 'var(--apple-text-secondary)' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: '700' }}>{ev.title}</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span>Created on {new Date(ev.created_at).toLocaleDateString()}</span>
                  <span>•</span>
                  <span style={{ color: ev.teams?.name ? 'var(--apple-accent-blue)' : 'var(--apple-text-primary)' }}>
                    {ev.teams?.name ? `Target: ${ev.teams.name}` : 'Target: All Teams'}
                  </span>
                </div>
              </div>
              <span className={`apple-badge ${ev.is_active ? 'apple-badge-green' : 'apple-badge-gray'}`} style={{ fontSize: '0.65rem' }}>
                {ev.is_active ? 'Active' : 'Closed'}
              </span>
            </div>

            {ev.description && (
              <p style={{ margin: 0, color: 'var(--apple-text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', flexGrow: 1 }}>
                {ev.description}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--apple-border)' }}>
              <button
                onClick={() => toggleEventStatus(ev.id, ev.is_active)}
                className={`apple-btn ${ev.is_active ? 'apple-btn-secondary' : 'apple-btn-primary'}`}
                style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Power size={14} /> {ev.is_active ? 'Turn Off' : 'Turn On'}
              </button>
              
              <button
                onClick={() => handleDeleteEvent(ev.id)}
                className="apple-btn apple-btn-danger"
                style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid var(--apple-accent-red)' }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}

        {events.length === 0 && !loading && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--apple-text-secondary)', fontStyle: 'italic', background: 'var(--apple-card)', borderRadius: '16px', border: '1px solid var(--apple-border)' }}>
            No review write-ups created yet. Click "Create Write-Up" to get started.
          </div>
        )}
      </div>
    </div>
  )
}
