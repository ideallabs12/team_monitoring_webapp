import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { RefreshCw, Star, Edit, Trash2, CheckCircle, AlertCircle, Clock, XCircle, Copy, Upload } from 'lucide-react'

export default function UserReviews({ user }) {
  const [profile, setProfile] = useState(null)
  const [activeEvents, setActiveEvents] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Submission Form State
  const [selectedEventId, setSelectedEventId] = useState('')
  const [title, setTitle] = useState('')
  const [context, setContext] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  
  // Edit State
  const [editingReviewId, setEditingReviewId] = useState(null)
  
  // Animation State
  const [snappingId, setSnappingId] = useState(null)

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    try {
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
        .select('*, events(title, is_active)')
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
      
      const unreviewed = allActive.filter(ev => !reviewedEventIds.includes(ev.id))
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
      const channel = supabase.channel('user_reviews_changes')
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
        
      return () => {
        supabase.removeChannel(channel)
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

      if (editingReviewId) {
        const updateData = { title, context, status: 'pending', admin_feedback: null, updated_at: new Date().toISOString() };
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
          title,
          context
        };
        if (uploadedPhotoUrl) insertData.photo_url = uploadedPhotoUrl;
        
        const { error } = await supabase
          .from('reviews')
          .insert([insertData])
          
        if (error) throw error
        setMessage({ type: 'success', text: 'Review submitted successfully!' })
      }
      
      // Reset form
      setTitle('')
      setContext('')
      setPhotoFile(null)
      setPhotoPreview(null)
      setEditingReviewId(null)
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
    }, 1500)
  }

  const handleEditClick = (review) => {
    setEditingReviewId(review.id)
    setSelectedEventId(review.event_id)
    setTitle(review.title)
    setContext(review.context)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingReviewId(null)
    setTitle('')
    setContext('')
    setPhotoFile(null)
    setPhotoPreview(null)
    
    // Reset selection to the first unreviewed event if available
    const reviewedEventIds = reviews.map(r => r.event_id)
    const unreviewed = activeEvents.filter(ev => !reviewedEventIds.includes(ev.id))
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
  const unreviewedEvents = activeEvents.filter(ev => !reviewedEventIds.includes(ev.id))

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

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => alert("Review copied to clipboard!"))
      .catch(() => alert("Failed to copy."))
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      <style>{`
        @keyframes dissolve-card {
          0% { opacity: 1; filter: blur(0px); transform: scale(1); }
          40% { opacity: 0.5; filter: blur(4px) sepia(0.5); transform: scale(0.98); }
          100% { opacity: 0; filter: blur(12px) sepia(1); transform: scale(0.9) translateY(-20px); letter-spacing: 5px; }
        }
        .thanos-snap {
          animation: dissolve-card 1.5s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards;
          pointer-events: none;
        }
        @keyframes dust-particle {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0); }
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

      {/* ===== SUBMISSION FORM ===== */}
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

            <div>
              <label className="apple-form-label">Review Title</label>
              <input
                type="text"
                className="apple-form-control"
                placeholder="Summarize your review..."
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onPaste={(e) => e.preventDefault()} // Anti-paste feature
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--apple-text-secondary)', marginTop: '4px', display: 'block' }}>Pasting text is disabled for this field.</span>
            </div>

            <div>
              <label className="apple-form-label">Review Context</label>
              <textarea
                className="apple-form-control"
                placeholder="Write your detailed review here..."
                required
                rows={6}
                value={context}
                onChange={(e) => setContext(e.target.value)}
                onPaste={(e) => e.preventDefault()} // Anti-paste feature
                style={{ resize: 'vertical' }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--apple-text-secondary)', marginTop: '4px', display: 'block' }}>Pasting text is disabled for this field.</span>
            </div>
            
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
              <button type="submit" disabled={submitting || !title.trim() || !context.trim()} className="apple-btn apple-btn-primary">
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

      {/* ===== MY REVIEWS LIST ===== */}
      <h2 className="apple-title-small" style={{ marginBottom: '20px', borderBottom: '1px solid var(--apple-border)', paddingBottom: '12px' }}>My Submissions</h2>
      
      {reviews.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {reviews.map(review => (
            <div key={review.id} className={`apple-card ${snappingId === review.id ? 'thanos-snap' : ''}`} style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
              
              {/* Thanos Dust Particles */}
              {snappingId === review.id && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, pointerEvents: 'none', overflow: 'hidden' }}>
                  {[...Array(40)].map((_, i) => {
                    const dx = (Math.random() * 200 - 100) + 'px';
                    const dy = -(Math.random() * 200 + 50) + 'px';
                    return (
                      <div key={i} style={{
                        position: 'absolute',
                        left: Math.random() * 100 + '%',
                        top: Math.random() * 100 + '%',
                        width: Math.random() * 4 + 2 + 'px',
                        height: Math.random() * 4 + 2 + 'px',
                        background: Math.random() > 0.5 ? 'var(--apple-accent-orange)' : 'var(--apple-text-secondary)',
                        borderRadius: '50%',
                        opacity: 0,
                        '--dx': dx,
                        '--dy': dy,
                        animation: `dust-particle 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${Math.random() * 0.3}s forwards`
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
                  <h3 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '1.1rem', fontWeight: '700' }}>{review.title}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Star size={12} /> {review.events?.title || 'Unknown Event'}
                    <span style={{ margin: '0 4px' }}>•</span>
                    {new Date(review.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Overlaid Chips Design for Status */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '26px' }}>
                  {review.status === 'pending' ? (
                    <>
                      <div style={{ 
                        position: 'absolute', right: '-4px', top: '-6px', 
                        background: 'rgba(255, 159, 10, 0.1)', border: '1px solid rgba(255, 159, 10, 0.2)',
                        color: 'var(--apple-accent-orange)', padding: '2px 10px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em',
                        transform: 'rotate(3deg)'
                      }}>
                        Pending
                      </div>
                      <div style={{ 
                        position: 'relative', zIndex: 1, 
                        background: 'rgba(0, 113, 227, 0.15)', border: '1px solid rgba(0, 113, 227, 0.3)', backdropFilter: 'blur(8px)',
                        color: 'var(--apple-accent-blue)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em',
                        display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}>
                        <CheckCircle size={12} /> Submitted
                      </div>
                    </>
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
                      background: 'rgba(255, 159, 10, 0.15)', border: '1px solid rgba(255, 159, 10, 0.3)',
                      color: 'var(--apple-accent-orange)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em',
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
                <p style={{ margin: 0, color: 'var(--apple-text-primary)', fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {review.context}
                </p>
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

              {/* Actions - Always visible for Copy, conditional for others */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--apple-border)', paddingTop: '16px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => handleCopy(review.context)}
                  className="apple-btn apple-btn-secondary" style={{ background: 'transparent', padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Copy size={14} /> Copy Context
                </button>
                
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
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="apple-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--apple-text-secondary)', fontStyle: 'italic' }}>
          You haven't submitted any reviews yet.
        </div>
      )}
    </div>
  )
}
