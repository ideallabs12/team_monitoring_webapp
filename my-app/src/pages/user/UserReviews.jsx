import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { RefreshCw, Star, Edit, Trash2, CheckCircle, AlertCircle, Clock, XCircle, Copy, Upload, ExternalLink } from 'lucide-react'

export default function UserReviews({ user }) {
  const [profile, setProfile] = useState(null)
  const [activeEvents, setActiveEvents] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Submission Form State
  const [selectedEventId, setSelectedEventId] = useState('')
  const [speakerName, setSpeakerName] = useState('')
  const [speakerEmail, setSpeakerEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  
  // Edit State
  const [editingReviewId, setEditingReviewId] = useState(null)
  
  // Animation State
  const [snappingId, setSnappingId] = useState(null)
  const [activeTab, setActiveTab] = useState('write') // 'write' or 'submissions'
  const [allowPaste, setAllowPaste] = useState(false)

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    try {
      // 0. Load system settings safely
      try {
        const { data: settingsData, error } = await supabase
          .from('system_settings')
          .select('allow_review_paste')
          .eq('id', 1)
          .single()
          
        if (settingsData && !error) {
          setAllowPaste(settingsData.allow_review_paste || false)
        }
      } catch (settingsErr) {
        console.warn('Settings load skipped or failed:', settingsErr)
      }

      // 1. Load Profile to get primary_team_id
      const { data: profData } = await supabase
        .from('profiles')
        .select('*, team:team_id(name)')
        .eq('id', user.id)
        .single()
        
      if (profData) setProfile(profData)

      // 3. Load user's reviews FIRST to filter out already reviewed events
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*, events(title, description, is_active, social_platform, social_url, collect_email, allow_multiple_submissions)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        
      setReviews(reviewsData || [])

      const reviewedEventIds = reviewsData?.map(r => r.event_id) || []
      
      // 2. Load active events, filtering by target team
      const teamFilter = profData?.team_id 
        ? `target_team_id.is.null,target_team_id.eq.${profData.team_id}` 
        : `target_team_id.is.null`
        
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .or(teamFilter)
        .order('created_at', { ascending: false })
      
      const allActive = eventsData || []
      setActiveEvents(allActive)
      
      const unreviewed = allActive.filter(ev => ev.allow_multiple_submissions || !reviewedEventIds.includes(ev.id))
      if (unreviewed.length > 0 && !editingReviewId) {
        setSelectedEventId(unreviewed[0].id)
      }
    } catch (err) {
      console.error('Error loading reviews data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    
    // Subscribe to realtime changes on the user's reviews
    if (user) {
      const channelId = `user_reviews_${user.id}_${Date.now()}`
      const channel = supabase.channel(channelId)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'reviews',
          filter: `user_id=eq.${user.id}`
        }, payload => {
          // Instead of doing complex state merges, just reload to get the latest joined data
          loadData()
        })
        .subscribe()
        
      const settingsChannelId = `system_settings_${Date.now()}`
      const settingsChannel = supabase.channel(settingsChannelId)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'system_settings'
        }, payload => {
          if (payload.new) {
            setAllowPaste(payload.new.allow_review_paste || false)
          }
        })
        .subscribe()
        
      return () => {
        supabase.removeChannel(channel)
        supabase.removeChannel(settingsChannel)
      }
    }
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage({ type: '', text: '' })
    
    try {
      let uploadedPhotoUrl = null;
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('review_photos')
          .upload(fileName, photoFile);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('review_photos')
          .getPublicUrl(fileName);
          
        uploadedPhotoUrl = publicUrl;
      }

      // Check if event requires email/name
      let eventDetails;
      if (editingReviewId) {
        eventDetails = reviews.find(r => r.id === editingReviewId)?.events;
      } else {
        eventDetails = activeEvents.find(ev => String(ev.id) === String(selectedEventId));
      }

      if (eventDetails?.collect_email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!speakerEmail || !emailRegex.test(speakerEmail)) {
          setMessage({ type: 'error', text: 'Please enter a valid speaker email address.' })
          setSubmitting(false)
          return
        }
      }

      if (!speakerName.trim()) {
        setMessage({ type: 'error', text: 'Please enter a speaker name.' })
        setSubmitting(false)
        return
      }

      if (editingReviewId) {
        const updateData = { 
          title: 'Review Submission', 
          context: null, 
          penname: null, 
          status: 'pending', 
          admin_feedback: null, 
          updated_at: new Date().toISOString(),
          speaker_name: speakerName,
          speaker_email: eventDetails?.collect_email ? speakerEmail : null
        };
        if (uploadedPhotoUrl) updateData.photo_url = uploadedPhotoUrl;
        
        const { error } = await supabase
          .from('reviews')
          .update(updateData)
          .eq('id', editingReviewId)
          
        if (error) throw error
        setMessage({ type: 'success', text: 'Review updated successfully!' })
      } else {
        const insertData = {
          event_id: selectedEventId,
          user_id: user.id,
          team_id: profile?.team_id,
          title: 'Review Submission',
          context: null,
          penname: null,
          speaker_name: speakerName,
          speaker_email: eventDetails?.collect_email ? speakerEmail : null
        };
        if (uploadedPhotoUrl) insertData.photo_url = uploadedPhotoUrl;
        
        const { error } = await supabase
          .from('reviews')
          .insert([insertData])
          
        if (error) throw error
        setMessage({ type: 'success', text: 'Review submitted successfully!' })
      }
      
      // Reset form
      setSpeakerName('')
      setSpeakerEmail('')
      setPhotoFile(null)
      setPhotoPreview(null)
      setEditingReviewId(null)
      setSelectedEventId('')
      loadData()
    } catch (err) {
      console.error('Error submitting review:', err)
      setMessage({ type: 'error', text: 'Failed to submit review.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return
    
    setSnappingId(id)
    
    // Wait for Thanos snap animation to complete before removing from DOM
    setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('reviews')
          .delete()
          .eq('id', id)
          
        if (error) throw error
        setReviews(reviews.filter(r => r.id !== id))
        
        // If we were editing this review, cancel edit
        if (editingReviewId === id) {
          handleCancelEdit()
        }
      } catch (err) {
        console.error('Error deleting review:', err)
        alert('Failed to delete review.')
      } finally {
        setSnappingId(null)
        loadData()
      }
    }, 2500)
  }

  const handleEditClick = (review) => {
    setEditingReviewId(review.id)
    setSelectedEventId(review.event_id)
    setSpeakerName(review.speaker_name || '')
    setSpeakerEmail(review.speaker_email || '')
    setActiveTab('write')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingReviewId(null)
    setSpeakerName('')
    setSpeakerEmail('')
    setPhotoFile(null)
    setPhotoPreview(null)
    
    // Reset selection to the first unreviewed event if available
    const reviewedEventIds = reviews.map(r => r.event_id)
    const unreviewed = activeEvents.filter(ev => ev.allow_multiple_submissions || !reviewedEventIds.includes(ev.id))
    if (unreviewed.length > 0) {
      setSelectedEventId(unreviewed[0].id)
    } else {
      setSelectedEventId('')
    }
  }

  if (loading && !profile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', gap: '16px' }}>
        <RefreshCw size={36} className="spin-anim" style={{ color: 'var(--apple-accent-blue)' }} />
        <div style={{ color: 'var(--apple-text-secondary)', fontSize: '1.05rem', fontWeight: '500' }}>Loading Reviews...</div>
      </div>
    )
  }

  const reviewedEventIds = reviews.map(r => r.event_id)
  const unreviewedEvents = activeEvents.filter(ev => ev.allow_multiple_submissions || !reviewedEventIds.includes(ev.id))

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File is too large! Maximum 5MB.")
        return
      }
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }



  const currentEventDetails = editingReviewId 
    ? reviews.find(r => r.id === editingReviewId)?.events
    : unreviewedEvents.find(ev => String(ev.id) === String(selectedEventId));
  const isEmailCollection = currentEventDetails?.collect_email;

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      <style>{`
        @keyframes dissolve-card {
          0% { opacity: 1; filter: blur(0px); transform: scale(1); }
          20% { opacity: 0.8; filter: blur(2px) sepia(0.3); transform: scale(0.98); }
          100% { opacity: 0; filter: blur(10px) sepia(0.8); transform: scale(0.95) translateY(-10px); }
        }
        .thanos-snap {
          animation: dissolve-card 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          pointer-events: none;
        }
        @keyframes dust-particle {
          0% { opacity: 0; transform: translate(0, 0) scale(1); }
          10% { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0) rotate(var(--rot)); filter: blur(2px); }
        }
      `}</style>

      {/* ===== HEADER ===== */}
      <div style={{ marginBottom: 'clamp(24px, 5vw, 40px)' }}>
        <div className="apple-kicker">Review System</div>
        <h1 className="apple-title-large">My Event Reviews</h1>
        <p className="apple-lead">
          Share your feedback and reviews for ongoing events.
        </p>
      </div>

      {/* ===== TABS ===== */}
      <div className="apple-pill-tabs" style={{ marginBottom: '24px' }}>
        <button className={`apple-pill-tab ${activeTab === 'write' ? 'active' : ''}`} onClick={() => setActiveTab('write')}>
          Write Review
        </button>
        <button className={`apple-pill-tab ${activeTab === 'submissions' ? 'active' : ''}`} onClick={() => setActiveTab('submissions')}>
          My Submissions
        </button>
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

      {/* ===== WRITE REVIEW TAB ===== */}
      {activeTab === 'write' && (
        <>
          {unreviewedEvents.length > 0 || editingReviewId ? (
            <div className="apple-card" style={{ padding: '24px', marginBottom: '40px', borderTop: '3px solid var(--apple-accent-blue)' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {editingReviewId ? <Edit size={18} style={{ color: 'var(--apple-accent-blue)' }} /> : <Star size={18} style={{ color: 'var(--apple-accent-blue)' }} />}
            {editingReviewId ? 'Edit Your Review' : 'Write a Review'}
          </h3>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="apple-two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label className="apple-form-label">Select Event</label>
                <select 
                  className="apple-form-control" 
                  value={selectedEventId} 
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  disabled={editingReviewId !== null} // Don't allow changing event while editing
                >
                  {editingReviewId ? (
                    <option value={selectedEventId}>{reviews.find(r => r.id === editingReviewId)?.events?.title}</option>
                  ) : (
                    unreviewedEvents.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.title}</option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="apple-form-label">Submitting As</label>
                <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--apple-border)', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--apple-text-primary)' }}>
                  {profile?.first_name} {profile?.last_name} <span style={{ color: 'var(--apple-text-secondary)' }}>({profile?.team?.name || 'No Team'})</span>
                </div>
              </div>
            </div>

            {currentEventDetails && currentEventDetails.description && (
              <div style={{ padding: '16px', background: 'rgba(0, 113, 227, 0.05)', border: '1px solid rgba(0, 113, 227, 0.2)', borderRadius: '12px', color: 'var(--apple-text-primary)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--apple-accent-blue)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} /> Instructions
                </h4>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', color: 'var(--apple-text-secondary)' }}>
                  {currentEventDetails.description}
                </p>
              </div>
            )}

            <div>
              <label className="apple-form-label">Speaker Name</label>
              <input
                type="text"
                className="apple-form-control"
                placeholder="Enter speaker name"
                required
                value={speakerName}
                onChange={(e) => setSpeakerName(e.target.value)}
              />
            </div>

            {isEmailCollection && (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
                <label className="apple-form-label">Speaker Email</label>
                <input
                  type="email"
                  className="apple-form-control"
                  placeholder="Enter valid email"
                  required
                  value={speakerEmail}
                  onChange={(e) => setSpeakerEmail(e.target.value)}
                />
              </div>
            )}
            
            <div>
              <label className="apple-form-label">Attach Photo (Optional)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <label className="apple-btn apple-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <Upload size={16} /> Choose Photo
                  <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                </label>
                {photoPreview && (
                  <div style={{ position: 'relative' }}>
                    <img src={photoPreview} alt="Preview" style={{ height: '60px', width: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--apple-border)' }} />
                    <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--apple-accent-red)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}>&times;</button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              {editingReviewId && (
                <button type="button" onClick={handleCancelEdit} className="apple-btn apple-btn-secondary">
                  Cancel Edit
                </button>
              )}
              <button type="submit" disabled={submitting || !speakerName.trim()} className="apple-btn apple-btn-primary">
                {submitting ? 'Submitting...' : editingReviewId ? 'Update Review' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="apple-card" style={{ padding: '30px', textAlign: 'center', marginBottom: '40px', color: 'var(--apple-text-secondary)' }}>
          <Star size={32} style={{ color: 'var(--apple-text-secondary)', opacity: 0.5, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px 0', color: '#fff' }}>All Caught Up!</h3>
          <p style={{ margin: 0 }}>You have submitted reviews for all currently active events.</p>
        </div>
      )}
      </>
      )}

      {/* ===== MY SUBMISSIONS TAB ===== */}
      {activeTab === 'submissions' && (
        <>
          <h2 className="apple-title-small" style={{ marginBottom: '20px', borderBottom: '1px solid var(--apple-border)', paddingBottom: '12px' }}>My Submissions</h2>
          
          {reviews.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {reviews.map(review => (
            <div key={review.id} className={`apple-card ${snappingId === review.id ? 'thanos-snap' : ''}`} style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
              
              {/* Thanos Dust Particles */}
              {snappingId === review.id && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, pointerEvents: 'none', overflow: 'hidden' }}>
                  {[...Array(1500)].map((_, i) => {
                    const dx = (Math.random() * 400 - 200) + 'px';
                    const dy = -(Math.random() * 300 + 50) + 'px';
                    const rot = (Math.random() * 360) + 'deg';
                    return (
                      <div key={i} style={{
                        position: 'absolute',
                        left: Math.random() * 100 + '%',
                        top: Math.random() * 100 + '%',
                        width: Math.random() * 6 + 2 + 'px',
                        height: Math.random() * 6 + 2 + 'px',
                        background: Math.random() > 0.4 ? 'var(--apple-accent-orange)' : Math.random() > 0.5 ? 'var(--apple-text-secondary)' : '#fff',
                        borderRadius: '50%',
                        opacity: 0,
                        '--dx': dx,
                        '--dy': dy,
                        '--rot': rot,
                        animation: `dust-particle 2s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${Math.random() * 0.5}s forwards`
                      }} />
                    )
                  })}
                </div>
              )}

              {/* Status Indicator Bar */}
              <div style={{ 
                position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', 
                background: review.status === 'approved' ? 'var(--apple-accent-green)' 
                          : review.status === 'rejected' ? 'var(--apple-accent-red)' 
                          : review.status === 'feedback' ? 'var(--apple-accent-orange)'
                          : 'var(--apple-accent-blue)' 
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '1.1rem', fontWeight: '700' }}>Review Submission</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Star size={12} /> {review.events?.title || 'Unknown Event'}
                    <span style={{ margin: '0 4px' }}>•</span>
                    {new Date(review.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Status Badge */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  {review.status === 'pending' ? (
                    <div style={{ 
                      background: 'rgba(255, 159, 10, 0.15)', border: '1px solid rgba(255, 159, 10, 0.3)',
                      color: 'var(--apple-accent-orange)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em',
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                      Pending
                    </div>
                  ) : review.status === 'approved' ? (
                    <div style={{ 
                      background: 'rgba(48, 213, 200, 0.15)', border: '1px solid rgba(48, 213, 200, 0.3)',
                      color: 'var(--apple-accent-green)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em',
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                      <CheckCircle size={12} /> Approved
                    </div>
                  ) : review.status === 'feedback' ? (
                    <div style={{ 
                      background: 'rgba(0, 113, 227, 0.15)', border: '1px solid rgba(0, 113, 227, 0.3)',
                      color: 'var(--apple-accent-blue)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em',
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                      <AlertCircle size={12} /> Needs Revision
                    </div>
                  ) : (
                    <div style={{ 
                      background: 'rgba(255, 69, 58, 0.15)', border: '1px solid rgba(255, 69, 58, 0.3)',
                      color: 'var(--apple-accent-red)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em',
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                      <XCircle size={12} /> Rejected
                    </div>
                  )}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--apple-border)', marginBottom: '16px' }}>
                
                {(review.speaker_name || review.speaker_email) && (
                  <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.85rem' }}>
                    <div style={{ color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Speaker Information</div>
                    {review.speaker_name && <div style={{ color: '#fff' }}><strong>Name:</strong> {review.speaker_name}</div>}
                    {review.speaker_email && <div style={{ color: '#fff' }}><strong>Email:</strong> {review.speaker_email}</div>}
                  </div>
                )}
                
                {review.photo_url && (
                  <div style={{ marginTop: '16px' }}>
                    <img src={review.photo_url} alt="Review attachment" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', border: '1px solid var(--apple-border)' }} />
                  </div>
                )}
              </div>

              {review.status === 'feedback' && review.admin_feedback && (
                <div style={{ display: 'flex', gap: '10px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,159,10,0.05)', border: '1px solid rgba(255,159,10,0.2)', color: 'var(--apple-accent-orange)', fontSize: '0.85rem', marginBottom: '16px' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: '4px' }}>Requested Changes / Feedback:</strong>
                    {review.admin_feedback}
                  </div>
                </div>
              )}

              {/* Actions - conditional for others */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--apple-border)', paddingTop: '16px', flexWrap: 'wrap' }}>
                
                {(review.status === 'pending' || review.status === 'rejected') && (
                  <button 
                    onClick={() => handleDelete(review.id)}
                    className="apple-btn apple-btn-danger" style={{ background: 'transparent', border: '1px solid var(--apple-accent-red)', padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
                {(review.status === 'pending' || review.status === 'feedback') && (
                  <button 
                    onClick={() => handleEditClick(review)}
                    className="apple-btn apple-btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Edit size={14} /> Edit Review
                  </button>
                )}
                {review.status === 'approved' && review.events?.social_platform && review.events?.social_url && (
                  <a 
                    href={review.events.social_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="apple-btn apple-btn-primary" 
                    style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                  >
                    <ExternalLink size={14} /> Post on {review.events.social_platform}
                  </a>
                )}
              </div>

            </div>
          ))}
        </div>
        ) : (
          <div className="apple-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--apple-text-secondary)', fontStyle: 'italic' }}>
            No reviews found. Select an event to write your first review!
          </div>
        )}
        </>
      )}
    </div>
  )
}
