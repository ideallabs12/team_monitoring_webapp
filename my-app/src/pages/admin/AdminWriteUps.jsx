import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { Calendar, Plus, Trash2, Power, RefreshCw, Edit } from 'lucide-react'

export default function AdminWriteUps() {
  const { user, featureAccess } = useOutletContext() || {}
  const canManage = user?.email === 'signatureglobalconferences@gmail.com' || !!featureAccess?.writeUps
  const [events, setEvents] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetTeamId, setTargetTeamId] = useState('all')
  const [socialPlatform, setSocialPlatform] = useState('')
  const [socialUrl, setSocialUrl] = useState('')
  const [collectEmail, setCollectEmail] = useState(false)
  const [editingEventId, setEditingEventId] = useState(null)
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

  const handleSubmitEvent = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage({ type: '', text: '' })
    
    try {
      const eventData = {
        title,
        description,
        target_team_id: targetTeamId === 'all' ? null : targetTeamId,
        social_platform: socialPlatform || null,
        social_url: socialPlatform ? socialUrl : null,
        collect_email: collectEmail
      }
      
      if (editingEventId) {
        // Update existing
        const { data, error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEventId)
          .select('*, teams(name)')
          .single()
          
        if (error) throw error
        
        setEvents(events.map(ev => ev.id === editingEventId ? data : ev))
        setMessage({ type: 'success', text: 'Write-Up updated successfully!' })
      } else {
        // Insert new
        eventData.is_active = true
        
        const { data, error } = await supabase
          .from('events')
          .insert([eventData])
          .select('*, teams(name)')
          .single()
          
        if (error) throw error
        
        setEvents([data, ...events])
        setMessage({ type: 'success', text: 'Write-Up created successfully!' })
      }
      
      handleCancelEdit()
    } catch (err) {
      console.error('Error saving event:', err)
      setMessage({ type: 'error', text: 'Failed to save write-up.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditClick = (ev) => {
    setEditingEventId(ev.id)
    setTitle(ev.title)
    setDescription(ev.description || '')
    setTargetTeamId(ev.target_team_id || 'all')
    setSocialPlatform(ev.social_platform || '')
    setSocialUrl(ev.social_url || '')
    setCollectEmail(ev.collect_email || false)
    setShowCreate(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setTitle('')
    setDescription('')
    setTargetTeamId('all')
    setSocialPlatform('')
    setSocialUrl('')
    setCollectEmail(false)
    setEditingEventId(null)
    setShowCreate(false)
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

  const handleDownloadCSV = async (eventId, eventTitle) => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          created_at,
          title,
          speaker_name,
          speaker_email,
          photo_url,
          status,
          profiles(first_name, last_name, email),
          teams(name)
        `)
        .eq('event_id', eventId)

      if (error) throw error

      if (!data || data.length === 0) {
        alert('No reviews found for this write-up.')
        return
      }

      // Convert to CSV
      const headers = ['Date', 'User First Name', 'User Last Name', 'User Email', 'Team', 'Speaker Name', 'Speaker Email', 'Review Title', 'Photo Link', 'Status']
      const rows = data.map(r => [
        new Date(r.created_at).toLocaleDateString(),
        r.profiles?.first_name || '',
        r.profiles?.last_name || '',
        r.profiles?.email || '',
        r.teams?.name || 'No Team',
        r.speaker_name || '',
        r.speaker_email || '',
        `"${(r.title || '').replace(/"/g, '""')}"`,
        r.photo_url || 'No Photo',
        r.status || ''
      ])

      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `${eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_reviews.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

    } catch (err) {
      console.error('Error downloading CSV:', err)
      alert('Failed to download data.')
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
          {canManage && (
            <button
              onClick={() => {
                if (showCreate) {
                  handleCancelEdit()
                } else {
                  setShowCreate(true)
                }
              }}
              className="apple-btn apple-btn-primary"
              style={{ padding: '8px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {showCreate ? 'Cancel' : <><Plus size={16} /> Create Write-Up</>}
            </button>
          )}
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
            <Calendar size={18} style={{ color: 'var(--apple-accent-blue)' }} /> {editingEventId ? 'Edit Write-Up' : 'New Write-Up'}
          </h3>
          <form onSubmit={handleSubmitEvent} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                id="collectEmail"
                checked={collectEmail}
                onChange={(e) => setCollectEmail(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', appearance: 'auto', display: 'block' }}
              />
              <label htmlFor="collectEmail" className="apple-form-label" style={{ margin: 0, cursor: 'pointer' }}>
                Collect Speaker Info (Name & Email)
              </label>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label className="apple-form-label">Social Media Target (Optional)</label>
                <select
                  className="apple-form-control"
                  value={socialPlatform}
                  onChange={(e) => {
                    const platform = e.target.value;
                    setSocialPlatform(platform);
                    if (platform === 'Facebook') setSocialUrl('https://facebook.com');
                    else if (platform === 'Instagram') setSocialUrl('https://instagram.com');
                    else if (platform === 'LinkedIn') setSocialUrl('https://linkedin.com');
                    else if (platform === 'Reddit') setSocialUrl('https://reddit.com');
                    else if (platform === 'Twitter') setSocialUrl('https://twitter.com');
                    else if (platform === 'Website') setSocialUrl('https://');
                    else setSocialUrl('');
                  }}
                >
                  <option value="">None</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Reddit">Reddit</option>
                  <option value="Twitter">Twitter</option>
                  <option value="Website">Website URL</option>
                </select>
              </div>
              
              {socialPlatform && (
                <div>
                  <label className="apple-form-label">{socialPlatform} URL</label>
                  <input
                    type="url"
                    value={socialUrl}
                    onChange={(e) => setSocialUrl(e.target.value)}
                    placeholder="https://..."
                    required
                    className="apple-form-control"
                  />
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="apple-btn apple-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className="apple-btn apple-btn-primary"
              >
                {submitting ? 'Saving...' : editingEventId ? 'Update Write-Up' : 'Save Write-Up'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===== EVENTS LIST ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '20px' }}>
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

            {ev.social_platform && (
              <div style={{ fontSize: '0.8rem', color: 'var(--apple-accent-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="apple-badge apple-badge-blue" style={{ fontSize: '0.65rem' }}>
                  Target: {ev.social_platform}
                </span>
                <a href={ev.social_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--apple-accent-blue)', textDecoration: 'underline' }}>
                  {ev.social_url.length > 30 ? ev.social_url.substring(0, 30) + '...' : ev.social_url}
                </a>
              </div>
            )}

            {ev.description && (
              <p style={{ margin: 0, color: 'var(--apple-text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', flexGrow: 1 }}>
                {ev.description}
              </p>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--apple-border)' }}>
              {canManage && (
                <>
                  <button
                    onClick={() => handleEditClick(ev)}
                    className="apple-btn apple-btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 auto', justifyContent: 'center' }}
                  >
                    <Edit size={14} /> Edit
                  </button>
                  
                  <button
                    onClick={() => toggleEventStatus(ev.id, ev.is_active)}
                    className={`apple-btn ${ev.is_active ? 'apple-btn-secondary' : 'apple-btn-primary'}`}
                    style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 auto', justifyContent: 'center' }}
                  >
                    <Power size={14} /> {ev.is_active ? 'Turn Off' : 'Turn On'}
                  </button>
                  
                  <button
                    onClick={() => handleDeleteEvent(ev.id)}
                    className="apple-btn apple-btn-danger"
                    style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid var(--apple-accent-red)', flex: '1 1 auto', justifyContent: 'center' }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </>
              )}
              
              <button
                onClick={() => handleDownloadCSV(ev.id, ev.title)}
                className="apple-btn apple-btn-primary"
                style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 100%', justifyContent: 'center', marginTop: '4px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> 
                Download Excel (CSV)
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
