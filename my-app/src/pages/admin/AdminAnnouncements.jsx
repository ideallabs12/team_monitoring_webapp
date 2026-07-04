import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'
import JoditEditor from 'jodit-react'
import { 
  Megaphone, Plus, BarChart2, Settings, Image as ImageIcon, 
  Trash2, Edit, Pin, CheckCircle2, Clock, Users, Eye, Bell
} from 'lucide-react'

export default function AdminAnnouncements() {
  const [activeTab, setActiveTab] = useState('manage') // 'manage', 'create', 'analytics'
  const [announcements, setAnnouncements] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  // Form State
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [status, setStatus] = useState('published')
  const [saving, setSaving] = useState(false)
  const [mediaFiles, setMediaFiles] = useState([])
  const [editingId, setEditingId] = useState(null)
  const editor = useRef(null)

  // Analytics State
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [viewsData, setViewsData] = useState([])

  useEffect(() => {
    fetchAnnouncements()
    fetchNotifications()
  }, [])

  const fetchAnnouncements = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('announcements')
      .select('*, created_by(first_name, last_name, email)')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (data) setAnnouncements(data)
    if (error) console.error("Error fetching announcements:", error)
    setLoading(false)
  }

  const fetchNotifications = async () => {
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false })
    if (data) setNotifications(data)
  }

  const handleFileUpload = async (file) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `uploads/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('announcements_media')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('announcements_media')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Error uploading file: ', error)
      alert('Error uploading media')
      return null
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title || !content) return alert("Title and Content are required.")
    
    setSaving(true)

    // Upload media files first
    let new_media_urls = []
    if (mediaFiles.length > 0) {
      for (const file of mediaFiles) {
        const url = await handleFileUpload(file)
        if (url) new_media_urls.push({ name: file.name, url, type: file.type })
      }
    }

    let final_media_urls = new_media_urls
    if (editingId) {
      const existingAnn = announcements.find(a => a.id === editingId)
      if (existingAnn && existingAnn.media_urls) {
        final_media_urls = [...existingAnn.media_urls, ...new_media_urls]
      }
    }

    const { data: { user } } = await supabase.auth.getUser()

    let error;
    if (editingId) {
      const { error: updateError } = await supabase
        .from('announcements')
        .update({
          title,
          content,
          media_urls: final_media_urls,
          is_pinned: isPinned,
          status
        })
        .eq('id', editingId)
      error = updateError
    } else {
      const { error: insertError } = await supabase
        .from('announcements')
        .insert([
          {
            title,
            content,
            media_urls: final_media_urls,
            is_pinned: isPinned,
            status,
            created_by: user.id
          }
        ])
      error = insertError
    }

    if (error) {
      console.error("Error saving announcement:", error)
      alert("Failed to save announcement")
    } else {
      alert(editingId ? "Announcement updated successfully!" : "Announcement created successfully!")
      setTitle('')
      setContent('')
      setIsPinned(false)
      setMediaFiles([])
      setEditingId(null)
      setActiveTab('manage')
      fetchAnnouncements()
    }
    setSaving(false)
  }

  const handleEdit = (ann) => {
    setTitle(ann.title)
    setContent(ann.content)
    setIsPinned(ann.is_pinned)
    setEditingId(ann.id)
    setMediaFiles([])
    setActiveTab('create')
  }

  const togglePin = async (id, currentPin) => {
    await supabase.from('announcements').update({ is_pinned: !currentPin }).eq('id', id)
    fetchAnnouncements()
  }

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this announcement?")) {
      await supabase.from('announcements').delete().eq('id', id)
      fetchAnnouncements()
    }
  }

  const loadAnalytics = async (announcementId) => {
    setSelectedAnnouncement(announcementId)
    setActiveTab('analytics')
    const { data, error } = await supabase
      .from('announcement_views')
      .select('viewed_at, user_id(id, first_name, last_name, email)')
      .eq('announcement_id', announcementId)
      .order('viewed_at', { ascending: false })
      
    if (data) {
      setViewsData(data)
    }
    if (error) console.error("Error fetching views:", error)
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      <div style={{ marginBottom: 'clamp(24px, 5vw, 40px)' }}>
        <div className="apple-kicker">Communication</div>
        <h1 className="apple-title-large">Announcements Hub</h1>
        <p className="apple-lead">Create and manage company-wide announcements.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveTab('manage')}
          className={`apple-btn ${activeTab === 'manage' ? 'apple-btn-primary' : 'apple-btn-secondary'}`}
        >
          <Settings size={18} /> Manage
        </button>
        <button 
          onClick={() => { setActiveTab('create'); setTitle(''); setContent(''); setIsPinned(false); setEditingId(null); setMediaFiles([]); }}
          className={`apple-btn ${activeTab === 'create' ? 'apple-btn-primary' : 'apple-btn-secondary'}`}
        >
          <Plus size={18} /> Create New
        </button>
        <button 
          onClick={() => { setActiveTab('analytics'); setSelectedAnnouncement(null); }}
          className={`apple-btn ${activeTab === 'analytics' ? 'apple-btn-primary' : 'apple-btn-secondary'}`}
        >
          <BarChart2 size={18} /> Analytics
        </button>
        <button 
          onClick={() => setActiveTab('notifications')}
          className={`apple-btn ${activeTab === 'notifications' ? 'apple-btn-primary' : 'apple-btn-secondary'}`}
        >
          <Bell size={18} /> Notifications
        </button>
      </div>

      {/* CREATE / EDIT TAB */}
      {activeTab === 'create' && (
        <div className="apple-card" style={{ maxWidth: '800px' }}>
          <h3 className="apple-title-small" style={{ marginBottom: '24px' }}>
            {editingId ? 'Edit Announcement' : 'Draft Announcement'}
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div className="apple-input-group">
              <label className="apple-label">Title</label>
              <input 
                type="text" 
                className="apple-input" 
                placeholder="e.g., Q3 Company Offsite Details"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="apple-input-group">
              <label className="apple-label">Content</label>
              <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
                <JoditEditor
                  ref={editor}
                  value={content}
                  config={{
                    readonly: false,
                    height: 350,
                    theme: 'default',
                    style: {
                      background: '#ffffff',
                      color: '#000000'
                    }
                  }}
                  onBlur={newContent => setContent(newContent)}
                />
              </div>
            </div>

            <div className="apple-input-group">
              <label className="apple-label">Attach Media (Optional)</label>
              
              <div style={{ position: 'relative' }}>
                <input 
                  type="file" 
                  multiple
                  accept="image/*,video/*,application/pdf"
                  onChange={(e) => setMediaFiles(Array.from(e.target.files))}
                  id="file-upload"
                  style={{ 
                    position: 'absolute', width: '1px', height: '1px', padding: 0, 
                    margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 
                  }}
                />
                <label 
                  htmlFor="file-upload"
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '32px 24px', border: '2px dashed rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)',
                    cursor: 'pointer', transition: 'all 0.2s ease', gap: '12px',
                    color: 'var(--apple-text-secondary)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = 'var(--apple-accent-blue)';
                    e.currentTarget.style.background = 'rgba(0, 113, 227, 0.05)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  }}
                >
                  <ImageIcon size={32} color="var(--apple-accent-blue)" />
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ color: '#fff', fontWeight: '500' }}>Click to select files</span>
                    <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                      Supports Images, PDFs, and Videos
                    </div>
                  </div>
                </label>
              </div>

              {mediaFiles.length > 0 && (
                <div style={{ 
                  marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px',
                  background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px'
                }}>
                  <div style={{ width: '100%', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>
                    Selected Files:
                  </div>
                  {mediaFiles.map((file, i) => (
                    <div key={i} className="apple-badge apple-badge-gray" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ImageIcon size={12} />
                      {file.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--apple-accent-blue)' }}
                />
                Pin to top
              </label>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="apple-btn apple-btn-primary" disabled={saving}>
                {saving ? 'Publishing...' : 'Publish Announcement'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MANAGE TAB */}
      {activeTab === 'manage' && (
        <div className="apple-card">
          <h3 className="apple-title-small" style={{ marginBottom: '24px' }}>Manage Announcements</h3>
          
          {loading ? (
            <div style={{ color: 'var(--apple-text-secondary)' }}>Loading announcements...</div>
          ) : announcements.length === 0 ? (
            <div style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic' }}>No announcements found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {announcements.map(ann => (
                <div key={ann.id} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid var(--apple-border)',
                  padding: '16px 20px', borderRadius: '12px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {ann.is_pinned && <Pin size={16} color="var(--apple-accent-orange)" style={{ transform: 'rotate(45deg)' }}/>}
                      <span style={{ fontWeight: '600', color: '#fff', fontSize: '1.1rem' }}>{ann.title}</span>
                      <span className={`apple-badge ${ann.status === 'published' ? 'apple-badge-green' : 'apple-badge-gray'}`}>
                        {ann.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)', display: 'flex', gap: '16px' }}>
                      <span><Clock size={12} style={{ display: 'inline', marginRight: '4px' }}/> {new Date(ann.created_at).toLocaleDateString()}</span>
                      <span>By: {ann.created_by?.first_name} {ann.created_by?.last_name}</span>
                      {ann.media_urls?.length > 0 && <span>📎 {ann.media_urls.length} files</span>}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => loadAnalytics(ann.id)}
                      className="apple-btn apple-btn-secondary" 
                      title="View Analytics"
                      style={{ padding: '8px' }}
                    >
                      <BarChart2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleEdit(ann)}
                      className="apple-btn apple-btn-secondary" 
                      title="Edit"
                      style={{ padding: '8px' }}
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => togglePin(ann.id, ann.is_pinned)}
                      className="apple-btn apple-btn-secondary" 
                      title={ann.is_pinned ? "Unpin" : "Pin"}
                      style={{ padding: '8px' }}
                    >
                      <Pin size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(ann.id)}
                      className="apple-btn apple-btn-secondary" 
                      title="Delete"
                      style={{ padding: '8px', color: '#ff453a' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div className="apple-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <h3 className="apple-title-small" style={{ margin: 0 }}>
              Analytics {selectedAnnouncement && '- Read Receipts'}
            </h3>
            
            <div style={{ minWidth: '250px' }}>
              <select 
                className="apple-input" 
                value={selectedAnnouncement || ''} 
                onChange={(e) => loadAnalytics(e.target.value)}
                style={{ padding: '8px 12px' }}
              >
                <option value="" disabled>Select an announcement...</option>
                {announcements.map(ann => (
                  <option key={ann.id} value={ann.id}>
                    {ann.title} ({new Date(ann.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {!selectedAnnouncement ? (
            <div style={{ color: 'var(--apple-text-secondary)', padding: '24px 0' }}>
              Please select an announcement from the dropdown above to view its analytics.
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '24px', display: 'flex', gap: '24px' }}>
                <div style={{ background: 'rgba(0,113,227,0.1)', border: '1px solid rgba(0,113,227,0.2)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Total Views</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--apple-accent-blue)' }}>{viewsData.length}</div>
                </div>
              </div>

              <h4 style={{ color: '#fff', marginBottom: '16px' }}>View History</h4>
              {viewsData.length === 0 ? (
                <div style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic' }}>No one has viewed this announcement yet.</div>
              ) : (
                <div className="apple-table-container">
                  <table className="apple-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Email</th>
                        <th>Viewed At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewsData.map((view, i) => (
                        <tr key={i}>
                          <td>{view.user_id?.first_name} {view.user_id?.last_name}</td>
                          <td style={{ color: 'var(--apple-text-secondary)' }}>{view.user_id?.email}</td>
                          <td>{new Date(view.viewed_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* NOTIFICATIONS TAB */}
      {activeTab === 'notifications' && (
        <div className="apple-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 className="apple-title-small">Manage Notifications</h3>
            <button className="apple-btn apple-btn-primary" onClick={async () => {
              const title = prompt("Notification Title:");
              if (!title) return;
              const desc = prompt("Notification Description:");
              if (!desc) return;
              const type = prompt("Type (milestone, action, alert):", "milestone");
              
              const { data: { user } } = await supabase.auth.getUser();
              await supabase.from('notifications').insert([{ title, description: desc, type, created_by: user.id }]);
              fetchNotifications();
            }}>
              <Plus size={18} /> Add Notification
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notifications.map(notif => (
              <div key={notif.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }}>
                <div>
                  <h4 style={{ color: '#fff', margin: '0 0 4px 0' }}>{notif.title} <span className="apple-badge apple-badge-gray" style={{ marginLeft: '8px' }}>{notif.type}</span></h4>
                  <p style={{ color: 'var(--apple-text-secondary)', margin: 0, fontSize: '0.85rem' }}>{notif.description}</p>
                </div>
                <button 
                  onClick={async () => {
                    if (window.confirm('Delete this notification?')) {
                      await supabase.from('notifications').delete().eq('id', notif.id);
                      fetchNotifications();
                    }
                  }}
                  className="apple-btn apple-btn-secondary"
                  style={{ color: '#ff453a' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {notifications.length === 0 && <div style={{ color: 'var(--apple-text-secondary)' }}>No notifications found.</div>}
          </div>
        </div>
      )}

    </div>
  )
}
