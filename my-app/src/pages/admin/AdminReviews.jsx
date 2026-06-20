import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { RefreshCw, CheckCircle, XCircle, Edit, Star, AlertCircle, Image as ImageIcon } from 'lucide-react'

export default function AdminReviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('pending')
  
  // Modals for Actions
  const [selectedReview, setSelectedReview] = useState(null)
  const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, reviewId: null, feedback: '' })

  const loadReviews = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          events ( title, is_active ),
          profiles ( first_name, last_name, email ),
          teams ( name )
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setReviews(data || [])
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
    if (filterStatus === 'all') return reviews
    return reviews.filter(r => r.status === filterStatus)
  }, [reviews, filterStatus])

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
          <h1 className="apple-title-large">User Reviews</h1>
          <p className="apple-lead">
            Moderate, edit, and approve event reviews submitted by your team.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={loadReviews} disabled={loading} className="apple-btn apple-btn-secondary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
            <RefreshCw size={14} className={loading ? 'spin-anim' : ''} style={{ marginRight: '6px' }} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ===== FILTERS ===== */}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredReviews.map(review => (
            <div key={review.id} onClick={() => setSelectedReview(review)} className="apple-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', height: '200px' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)' }}
            >
              
              {/* Status Side Indicator */}
              <div style={{ 
                position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', 
                background: review.status === 'approved' ? 'var(--apple-accent-green)' 
                          : review.status === 'rejected' ? 'var(--apple-accent-red)' 
                          : review.status === 'feedback' ? 'var(--apple-accent-orange)'
                          : 'var(--apple-accent-blue)' 
              }} />

              {/* Review Header Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Row 1: Name and Team */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.06)', padding: '8px 10px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {review.profiles?.first_name} {review.profiles?.last_name}
                  </div>
                  <span className="apple-badge apple-badge-blue" style={{ fontSize: '0.65rem', padding: '2px 6px', flexShrink: 0 }}>
                    {review.teams?.name || 'No Team'}
                  </span>
                </div>

                {/* Row 2: Event Name and Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="apple-badge apple-badge-gray" style={{ display: 'flex', gap: '4px', alignItems: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.65rem', padding: '2px 6px' }}>
                    <Star size={10} /> {review.events?.title || 'Unknown Event'}
                  </span>
                  <span className={`apple-badge ${
                    review.status === 'approved' ? 'apple-badge-green' : 
                    review.status === 'rejected' ? 'apple-badge-red' : 
                    review.status === 'pending' ? 'apple-badge-orange' : 'apple-badge-blue'
                  }`} style={{ fontSize: '0.65rem', padding: '2px 8px', flexShrink: 0 }}>
                    {review.status === 'feedback' ? 'Needs Revision' : review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Review Content Snippet */}
              <div style={{ marginTop: '4px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <h4 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '0.9rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{review.title}</h4>
                <p style={{ margin: 0, color: 'var(--apple-text-secondary)', fontSize: '0.8rem', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {review.context}
                </p>
                {review.photo_url && (
                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                    <div style={{ background: 'rgba(0, 113, 227, 0.1)', padding: '4px 8px', borderRadius: '8px' }}>
                      <ImageIcon size={16} color="var(--apple-accent-blue)" />
                    </div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '700', color: '#fff', fontSize: '1.2rem' }}>
                    {selectedReview.profiles?.first_name} {selectedReview.profiles?.last_name}
                  </span>
                  <span style={{ color: 'var(--apple-text-secondary)', fontSize: '0.9rem' }}>
                    ({selectedReview.profiles?.email})
                  </span>
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
            {selectedReview.status === 'pending' && (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid var(--apple-border)', paddingTop: '20px' }}>
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
              </div>
            )}
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
