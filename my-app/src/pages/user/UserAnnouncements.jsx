import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { Megaphone, Search, Pin, Calendar, FileText, ChevronRight, Download, Bell, Target, AlertCircle } from 'lucide-react'

export default function UserAnnouncements({ user }) {
  const [announcements, setAnnouncements] = useState([])
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('announcements')
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchAnnouncements()
    if (user?.id) {
      fetchNotifications()
    }

    const announcementsChannel = supabase.channel(`public:announcements-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        fetchAnnouncements(true)
      })
      .subscribe()

    const notificationsChannel = supabase.channel(`public:notifications-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        if (user?.id) fetchNotifications()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(announcementsChannel)
      supabase.removeChannel(notificationsChannel)
    }
  }, [user])

  const fetchAnnouncements = async (silent = false) => {
    if (!silent) setLoading(true)
    const { data, error } = await supabase
      .from('announcements')
      .select('*, created_by(first_name, last_name)')
      .eq('status', 'published')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (data) {
      setAnnouncements(data)
      if (data.length > 0) {
        handleSelectAnnouncement(data[0])
      }
    }
    if (!silent) setLoading(false)
  }

  const fetchNotifications = async () => {
    const { data: notifs } = await supabase.from('notifications').select('*').order('created_at', { ascending: false })
    const { data: reads } = await supabase.from('notification_reads').select('notification_id').eq('user_id', user.id)
    
    if (notifs) {
      const readIds = new Set(reads?.map(r => r.notification_id) || [])
      const mapped = notifs.map(n => ({
        ...n,
        read: readIds.has(n.id),
        date: n.created_at
      }))
      setNotifications(mapped)
      setUnreadCount(mapped.filter(n => !n.read).length)
    }
  }

  const markAsRead = async (notificationId) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    await supabase.from('notification_reads').insert([{ notification_id: notificationId, user_id: user.id }])
  }

  const handleSelectAnnouncement = async (ann) => {
    setSelectedAnnouncement(ann)
    // Mark as read in analytics (ignore if already exists)
    if (user?.id) {
      await supabase.from('announcement_views').insert([
        { announcement_id: ann.id, user_id: user.id }
      ])
    }
  }

  const filteredAnnouncements = announcements.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const renderMedia = (media) => {
    if (!media || media.length === 0) return null
    return (
      <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h4 style={{ fontSize: '0.9rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attachments</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {media.map((file, i) => {
            const isImage = file.type?.startsWith('image/')
            const isVideo = file.type?.startsWith('video/')
            return (
              <a 
                key={i} 
                href={file.url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--apple-border)',
                  borderRadius: '12px', textDecoration: 'none', color: '#fff',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              >
                {isImage ? (
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={file.url} alt="attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : isVideo ? (
                  <div style={{ width: '40px', height: '40px', background: 'rgba(0,113,227,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--apple-accent-blue)', flexShrink: 0 }}>
                    ▶
                  </div>
                ) : (
                  <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                    <FileText size={20} />
                  </div>
                )}
                <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                  {file.name}
                </div>
                <Download size={16} style={{ color: 'var(--apple-text-secondary)' }}/>
              </a>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      <div style={{ marginBottom: 'clamp(24px, 5vw, 40px)' }}>
        <div className="apple-kicker">Updates</div>
        <h1 className="apple-title-large">Announcements</h1>
        <p className="apple-lead">Stay up to date with the latest company news and information.</p>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--apple-border)', paddingBottom: '12px' }}>
        <button 
          onClick={() => setActiveTab('announcements')}
          style={{
            background: 'none', border: 'none', color: activeTab === 'announcements' ? 'var(--apple-text-primary)' : 'var(--apple-text-secondary)',
            fontSize: '1.1rem', fontWeight: activeTab === 'announcements' ? '600' : '400',
            cursor: 'pointer', padding: '8px 16px', position: 'relative', transition: 'color 0.2s ease'
          }}
        >
          Announcements
          {activeTab === 'announcements' && <div style={{ position: 'absolute', bottom: '-13px', left: 0, width: '100%', height: '2px', background: 'var(--apple-accent-blue)', borderRadius: '2px' }} />}
        </button>
        <button 
          onClick={() => setActiveTab('notifications')}
          style={{
            background: 'none', border: 'none', color: activeTab === 'notifications' ? 'var(--apple-text-primary)' : 'var(--apple-text-secondary)',
            fontSize: '1.1rem', fontWeight: activeTab === 'notifications' ? '600' : '400',
            cursor: 'pointer', padding: '8px 16px', position: 'relative', transition: 'color 0.2s ease',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          Notifications
          {unreadCount > 0 && <span className="apple-badge apple-badge-orange" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>{unreadCount} New</span>}
          {activeTab === 'notifications' && <div style={{ position: 'absolute', bottom: '-13px', left: 0, width: '100%', height: '2px', background: 'var(--apple-accent-blue)', borderRadius: '2px' }} />}
        </button>
      </div>

      {activeTab === 'announcements' && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'minmax(300px, 350px) 1fr', 
          gap: '24px',
          alignItems: 'stretch',
          minHeight: '600px'
        }}>
        
        {/* Left Pane - List */}
        <div className="apple-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Search announcements..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="apple-input"
              style={{ paddingLeft: '40px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loading ? (
              <div style={{ color: 'var(--apple-text-secondary)', textAlign: 'center', padding: '20px' }}>Loading...</div>
            ) : filteredAnnouncements.length === 0 ? (
              <div style={{ color: 'var(--apple-text-secondary)', textAlign: 'center', padding: '20px' }}>No announcements found.</div>
            ) : (
              filteredAnnouncements.map(ann => (
                <div 
                  key={ann.id}
                  onClick={() => handleSelectAnnouncement(ann)}
                  style={{ 
                    padding: '16px', 
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: selectedAnnouncement?.id === ann.id ? 'rgba(0,113,227,0.1)' : 'transparent',
                    border: `1px solid ${selectedAnnouncement?.id === ann.id ? 'rgba(0,113,227,0.3)' : 'transparent'}`,
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={e => { if (selectedAnnouncement?.id !== ann.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { if (selectedAnnouncement?.id !== ann.id) e.currentTarget.style.background = 'transparent' }}
                >
                  {ann.is_pinned && <Pin size={14} color="var(--apple-accent-orange)" style={{ position: 'absolute', top: '16px', right: '16px', transform: 'rotate(45deg)' }}/>}
                  <div style={{ fontWeight: '600', color: selectedAnnouncement?.id === ann.id ? 'var(--apple-accent-blue)' : 'var(--apple-text-primary)', marginBottom: '8px', paddingRight: '20px', fontSize: '1rem', lineHeight: '1.3' }}>
                    {ann.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>
                    <Calendar size={12} /> {new Date(ann.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Pane - Detail View */}
        <div className="apple-card" style={{ padding: '40px' }}>
          {selectedAnnouncement ? (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                {selectedAnnouncement.is_pinned && <span className="apple-badge apple-badge-orange">Pinned</span>}
                <span style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)' }}>
                  Posted by {selectedAnnouncement.created_by?.first_name} {selectedAnnouncement.created_by?.last_name} on {new Date(selectedAnnouncement.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <h2 style={{ fontSize: '2rem', color: 'var(--apple-text-primary)', marginBottom: '32px', lineHeight: '1.2' }}>{selectedAnnouncement.title}</h2>
              
              <div 
                className="announcement-content"
                style={{ color: 'var(--apple-text-primary)', opacity: 0.85, lineHeight: '1.7', fontSize: '1.05rem' }}
                dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }}
              />

              {renderMedia(selectedAnnouncement.media_urls)}
              
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--apple-text-secondary)' }}>
              <Megaphone size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p>Select an announcement to read</p>
            </div>
          )}
        </div>

      </div>
      )}

      {activeTab === 'notifications' && (
        <div className="apple-card" style={{ minHeight: '60vh', padding: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--apple-text-primary)', marginBottom: '24px' }}>Your Notifications</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {notifications.map(notification => {
              let Icon = Bell;
              let iconColor = 'var(--apple-text-secondary)';
              let bgColor = 'rgba(255,255,255,0.05)';
              
              if (notification.type === 'milestone') {
                Icon = Target;
                iconColor = 'var(--apple-accent-green)';
                bgColor = 'rgba(48, 209, 88, 0.1)';
              } else if (notification.type === 'action') {
                Icon = AlertCircle;
                iconColor = 'var(--apple-accent-orange)';
                bgColor = 'rgba(255, 159, 10, 0.1)';
              }

              return (
                <div key={notification.id} 
                  onClick={() => !notification.read && markAsRead(notification.id)}
                  style={{ 
                  display: 'flex', gap: '16px', padding: '20px', 
                  background: notification.read ? 'rgba(255,255,255,0.02)' : 'rgba(0,113,227,0.05)',
                  border: `1px solid ${notification.read ? 'var(--apple-border)' : 'rgba(0,113,227,0.2)'}`,
                  borderRadius: '16px', alignItems: 'flex-start',
                  cursor: notification.read ? 'default' : 'pointer',
                  transition: 'background 0.2s ease'
                }}>
                  <div style={{ 
                    width: '48px', height: '48px', borderRadius: '50%', background: bgColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor, flexShrink: 0
                  }}>
                    <Icon size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <h4 style={{ color: 'var(--apple-text-primary)', fontSize: '1.1rem', margin: 0 }}>{notification.title}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>
                        {new Date(notification.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ color: 'var(--apple-text-secondary)', margin: 0, lineHeight: '1.5' }}>{notification.description}</p>
                    
                    {notification.type === 'action' && (
                      <button className="apple-btn apple-btn-primary" style={{ marginTop: '16px', padding: '6px 16px', fontSize: '0.85rem' }}>
                        Take Action
                      </button>
                    )}
                  </div>
                  {!notification.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--apple-accent-blue)', marginTop: '8px' }} />}
                </div>
              )
            })}
            {notifications.length === 0 && <div style={{ color: 'var(--apple-text-secondary)', textAlign: 'center', padding: '40px' }}>No notifications to display.</div>}
          </div>
        </div>
      )}
    </div>
  )
}
