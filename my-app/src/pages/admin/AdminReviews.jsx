import { useState, useEffect, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { RefreshCw, CheckCircle, XCircle, Edit, Star, AlertCircle, Image as ImageIcon, Users, Clock, Calendar, Trash2 } from 'lucide-react'

export default function AdminReviews() {
  const { user, featureAccess } = useOutletContext() || {}
  const canManage = user?.email === 'signatureglobalconferences@gmail.com' || !!featureAccess?.reviews
  const [reviews, setReviews] = useState([])
  const [writeUps, setWriteUps] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('pending')
  const [selectedWriteUpId, setSelectedWriteUpId] = useState('all')
  
  // Modals for Actions
  const [selectedReview, setSelectedReview] = useState(null)
  const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, reviewId: null, feedback: '' })

  const loadReviews = async () => {
    setLoading(true)
    try {
      const [reviewsRes, eventsRes] = await Promise.all([
        supabase
          .from('reviews')
          .select(`
            *,
            events ( title, is_active ),
            profiles ( first_name, last_name, email ),
            teams ( name )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('events')
          .select('id, title')
          .order('created_at', { ascending: false })
      ])
      
      if (reviewsRes.error) throw reviewsRes.error
      setReviews(reviewsRes.data || [])

      if (eventsRes.error) throw eventsRes.error
      setWriteUps(eventsRes.data || [])
    } catch (err) {
      console.error('Error loading reviews:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReviews()
  }, [])

  const handleApprove = async (id) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ status: 'approved', admin_feedback: null, updated_at: new Date().toISOString() })
        .eq('id', id)
        
      if (error) throw error
      setReviews(reviews.map(r => r.id === id ? { ...r, status: 'approved', admin_feedback: null } : r))
    } catch (err) {
      console.error('Error approving review:', err)
      alert('Failed to approve review.')
    }
  }

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to completely reject this review without feedback?')) return
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ status: 'rejected', admin_feedback: null, updated_at: new Date().toISOString() })
        .eq('id', id)
        
      if (error) throw error
      setReviews(reviews.map(r => r.id === id ? { ...r, status: 'rejected', admin_feedback: null } : r))
    } catch (err) {
      console.error('Error rejecting review:', err)
      alert('Failed to reject review.')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this review? The user will need to write a new one.')) return
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', id)
        
      if (error) throw error
      setReviews(reviews.filter(r => r.id !== id))
    } catch (err) {
      console.error('Error deleting review:', err)
      alert('Failed to delete review.')
    }
  }

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ 
          status: 'feedback', 
          admin_feedback: feedbackModal.feedback, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', feedbackModal.reviewId)
        
      if (error) throw error
      
      setReviews(reviews.map(r => r.id === feedbackModal.reviewId ? { ...r, status: 'feedback', admin_feedback: feedbackModal.feedback } : r))
      setFeedbackModal({ isOpen: false, reviewId: null, feedback: '' })
    } catch (err) {
      console.error('Error providing feedback:', err)
      alert('Failed to provide feedback.')
    }
  }



  const filteredReviews = useMemo(() => {
    let result = reviews
    
    if (selectedWriteUpId !== 'all') {
      result = result.filter(r => r.event_id === selectedWriteUpId)
    }
    
    if (filterStatus !== 'all') {
      result = result.filter(r => r.status === filterStatus)
    }
    
    return result
  }, [reviews, filterStatus, selectedWriteUpId])

  if (loading && reviews.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', gap: '16px' }}>
        <RefreshCw size={36} className="spin-anim" style={{ color: 'var(--apple-accent-blue)' }} />
        <div style={{ color: 'var(--apple-text-secondary)', fontSize: '1.05rem', fontWeight: '500' }}>Loading Reviews...</div>
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* ===== HEADER ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'clamp(24px, 5vw, 40px)', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="apple-kicker">Review System</div>
          <h1 className="apple-title-large">Review Approvals</h1>
          <p className="apple-lead">
            Moderate, edit, and approve review write-ups submitted by your team.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={loadReviews} disabled={loading} className="apple-btn apple-btn-secondary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
            <RefreshCw size={14} className={loading ? 'spin-anim' : ''} style={{ marginRight: '6px' }} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ===== WRITEUP FILTER ===== */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <label className="apple-form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Filter by Write-Up:</label>
        <select 
          className="apple-form-control" 
          style={{ maxWidth: '400px' }}
          value={selectedWriteUpId}
          onChange={(e) => setSelectedWriteUpId(e.target.value)}
        >
          <option value="all">All Write-Ups</option>
          {writeUps.map(w => (
            <option key={w.id} value={w.id}>{w.title}</option>
          ))}
        </select>
      </div>

      {/* ===== STATUS FILTERS ===== */}
      <div className="apple-pill-tabs" style={{ marginBottom: '24px' }}>
        <button className={`apple-pill-tab ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>
          All Reviews
        </button>
        <button className={`apple-pill-tab ${filterStatus === 'pending' ? 'active' : ''}`} onClick={() => setFilterStatus('pending')}>
          Pending
        </button>
        <button className={`apple-pill-tab ${filterStatus === 'approved' ? 'active' : ''}`} onClick={() => setFilterStatus('approved')}>
          Approved
        </button>
        <button className={`apple-pill-tab ${filterStatus === 'rejected' ? 'active' : ''}`} onClick={() => setFilterStatus('rejected')}>
          Rejected
        </button>
        <button className={`apple-pill-tab ${filterStatus === 'feedback' ? 'active' : ''}`} onClick={() => setFilterStatus('feedback')}>
          Needs Revision
        </button>
      </div>

      {/* ===== REVIEWS LIST ===== */}
      {filteredReviews.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '20px' }}>
          {filteredReviews.map(review => (
            <div key={review.id} onClick={() => setSelectedReview(review)} style={{ 
              background: 'var(--apple-card, rgba(30,41,59,0.8))', 
              border: '1px solid var(--apple-border, rgba(255,255,255,0.08))',
              borderRadius: '16px', 
              padding: '24px', 
              display: 'flex', flexDirection: 'column', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)', 
              cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s'
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.35)'; e.currentTarget.style.borderColor = 'rgba(0,113,227,0.3)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'; e.currentTarget.style.borderColor = 'var(--apple-border, rgba(255,255,255,0.08))' }}
            >
              
              {/* Top Section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                {/* Avatar and Name/Team */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: '1 1 auto' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #1a73e8, #30d5c8)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: '700', flexShrink: 0 }}>
                    {review.profiles?.first_name ? review.profiles.first_name.charAt(0).toUpperCase() : 'U'}
                    {review.profiles?.last_name ? review.profiles.last_name.charAt(0).toUpperCase() : ''}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '700', color: 'var(--apple-text-primary, #f8fafc)', fontSize: '1rem', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {review.profiles?.first_name} {review.profiles?.last_name}
                      {review.penname && <span style={{ color: 'var(--apple-text-secondary, #94a3b8)', fontSize: '0.82rem', fontWeight: '400', marginLeft: '8px' }}>(Pen Name: {review.penname})</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                      <span style={{ border: '1px solid rgba(0,113,227,0.3)', background: 'rgba(0,113,227,0.1)', color: 'var(--apple-accent-blue, #0071e3)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '700' }}>
                        {review.teams?.name || 'No Team'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div style={{ 
                  border: review.status === 'approved' ? '1px solid rgba(52,211,153,0.3)' : review.status === 'rejected' ? '1px solid rgba(248,113,113,0.3)' : review.status === 'pending' ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(0,113,227,0.3)', 
                  background: review.status === 'approved' ? 'rgba(52,211,153,0.1)' : review.status === 'rejected' ? 'rgba(248,113,113,0.1)' : review.status === 'pending' ? 'rgba(251,191,36,0.1)' : 'rgba(0,113,227,0.1)', 
                  color: review.status === 'approved' ? '#34d399' : review.status === 'rejected' ? '#f87171' : review.status === 'pending' ? '#fbbf24' : 'var(--apple-accent-blue, #0071e3)', 
                  padding: '5px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '0.8rem', whiteSpace: 'nowrap', flexShrink: 0
                }}>
                  {review.status === 'pending' ? <Clock size={14} /> : review.status === 'approved' ? <CheckCircle size={14} /> : review.status === 'rejected' ? <XCircle size={14} /> : <AlertCircle size={14} />}
                  {review.status === 'feedback' ? 'Needs Revision' : review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                </div>
              </div>

              {/* Separator Line */}
              <div style={{ height: '1px', background: 'var(--apple-border, rgba(255,255,255,0.08))', margin: '16px 0' }} />

              {/* Bottom Section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: 0 }}>
                  <Calendar size={22} color="var(--apple-accent-blue, #0071e3)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '600', color: 'var(--apple-text-primary, #f8fafc)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      {review.events?.title || 'General Review'}
                    </div>
                    <p style={{ margin: 0, color: 'var(--apple-text-secondary, #94a3b8)', fontSize: '0.84rem', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {review.context}
                    </p>
                  </div>
                </div>
                
                {review.photo_url && (
                  <div style={{ background: 'rgba(0,113,227,0.1)', border: '1px solid rgba(0,113,227,0.2)', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ImageIcon size={16} color="var(--apple-accent-blue, #0071e3)" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="apple-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--apple-text-secondary)', fontStyle: 'italic' }}>
          No {filterStatus !== 'all' ? filterStatus : ''} reviews found.
        </div>
      )}

      {/* ===== FULL REVIEW MODAL ===== */}
      {selectedReview && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }} onClick={() => setSelectedReview(null)}>
          <div className="apple-card" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }} onClick={e => e.stopPropagation()}>
            
            <button onClick={() => setSelectedReview(null)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
              <XCircle size={20} />
            </button>

            {/* Header Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', paddingRight: '40px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '700', color: '#fff', fontSize: '1.2rem' }}>
                    {selectedReview.profiles?.first_name} {selectedReview.profiles?.last_name}
                  </span>
                  <span style={{ color: 'var(--apple-text-secondary)', fontSize: '0.9rem' }}>
                    ({selectedReview.profiles?.email})
                  </span>
                  {selectedReview.penname && (
                    <span className="apple-badge" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8rem' }}>
                      Pen Name: {selectedReview.penname}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.8rem' }}>
                  <span className="apple-badge apple-badge-blue">{selectedReview.teams?.name || 'No Team'}</span>
                  <span className="apple-badge apple-badge-gray" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <Star size={10} /> {selectedReview.events?.title || 'Unknown Event'}
                  </span>
                </div>
              </div>
              
              <span className={`apple-badge ${
                selectedReview.status === 'approved' ? 'apple-badge-green' : 
                selectedReview.status === 'rejected' ? 'apple-badge-red' : 
                selectedReview.status === 'feedback' ? 'apple-badge-orange' : 'apple-badge-blue'
              }`}>
                {selectedReview.status === 'feedback' ? 'Needs Revision' : selectedReview.status.charAt(0).toUpperCase() + selectedReview.status.slice(1)}
              </span>
            </div>

            {/* Review Content */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '1.1rem', fontWeight: '600' }}>{selectedReview.title}</h4>
              <p style={{ margin: 0, color: 'var(--apple-text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {selectedReview.context}
              </p>
              {selectedReview.photo_url && (
                <div style={{ marginTop: '20px' }}>
                  <img src={selectedReview.photo_url} alt="Review attachment" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', border: '1px solid var(--apple-border)' }} />
                </div>
              )}
            </div>

            {/* Admin Feedback Display */}
            {selectedReview.status === 'feedback' && selectedReview.admin_feedback && (
              <div style={{ display: 'flex', gap: '10px', padding: '16px', borderRadius: '10px', background: 'rgba(255,159,10,0.05)', border: '1px solid rgba(255,159,10,0.2)', color: 'var(--apple-accent-orange)', fontSize: '0.9rem' }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>Requested Changes / Feedback:</strong>
                  {selectedReview.admin_feedback}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid var(--apple-border)', paddingTop: '20px', flexWrap: 'wrap' }}>
              {canManage && (
                <>
                  <button 
                    onClick={() => { handleDelete(selectedReview.id); setSelectedReview(null); }}
                    className="apple-btn apple-btn-danger" style={{ background: 'transparent', border: '1px solid var(--apple-accent-red)', padding: '10px 20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', marginRight: 'auto' }}
                  >
                    <Trash2 size={18} /> Delete Review
                  </button>

                  {selectedReview.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => { handleReject(selectedReview.id); setSelectedReview(null); }}
                        className="apple-btn apple-btn-danger" style={{ background: 'transparent', border: '1px solid var(--apple-accent-red)', padding: '10px 20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <XCircle size={18} /> Reject
                      </button>
                      <button 
                        onClick={() => setFeedbackModal({ isOpen: true, reviewId: selectedReview.id, feedback: '' })}
                        className="apple-btn apple-btn-secondary" style={{ padding: '10px 20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--apple-accent-orange)' }}
                      >
                        <AlertCircle size={18} /> Give Feedback
                      </button>
                      <button 
                        onClick={() => { handleApprove(selectedReview.id); setSelectedReview(null); }}
                        className="apple-btn apple-btn-primary" style={{ background: 'var(--apple-accent-green)', padding: '10px 20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <CheckCircle size={18} /> Approve
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== FEEDBACK MODAL ===== */}
      {feedbackModal.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div className="apple-card" style={{ width: '100%', maxWidth: '500px', padding: '24px', borderTop: '4px solid var(--apple-accent-orange)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={20} style={{ color: 'var(--apple-accent-orange)' }} /> Provide Feedback
            </h3>
            <form onSubmit={handleFeedbackSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label className="apple-form-label">Suggested Changes / Feedback</label>
                <textarea
                  className="apple-form-control"
                  rows={4}
                  required
                  placeholder="Explain what needs to be changed..."
                  value={feedbackModal.feedback}
                  onChange={(e) => setFeedbackModal({ ...feedbackModal, feedback: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setFeedbackModal({ isOpen: false, reviewId: null, feedback: '' })} className="apple-btn apple-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="apple-btn apple-btn-primary" style={{ background: 'var(--apple-accent-orange)' }}>
                  Send Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  )
}
