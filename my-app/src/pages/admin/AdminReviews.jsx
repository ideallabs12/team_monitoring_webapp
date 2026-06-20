import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { RefreshCw, CheckCircle, XCircle, Edit, Star, AlertCircle } from 'lucide-react'

export default function AdminReviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('pending')
  
  // Modals for Actions
  const [rejectModal, setRejectModal] = useState({ isOpen: false, reviewId: null, feedback: '' })
  const [editModal, setEditModal] = useState({ isOpen: false, reviewId: null, title: '', context: '' })

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

  const handleRejectSubmit = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ 
          status: 'rejected', 
          admin_feedback: rejectModal.feedback, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', rejectModal.reviewId)
        
      if (error) throw error
      
      setReviews(reviews.map(r => r.id === rejectModal.reviewId ? { ...r, status: 'rejected', admin_feedback: rejectModal.feedback } : r))
      setRejectModal({ isOpen: false, reviewId: null, feedback: '' })
    } catch (err) {
      console.error('Error rejecting review:', err)
      alert('Failed to reject review.')
    }
  }

  const handleEditApproveSubmit = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ 
          status: 'approved', 
          title: editModal.title, 
          context: editModal.context, 
          admin_feedback: null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', editModal.reviewId)
        
      if (error) throw error
      
      setReviews(reviews.map(r => r.id === editModal.reviewId ? { 
        ...r, 
        status: 'approved', 
        title: editModal.title, 
        context: editModal.context, 
        admin_feedback: null 
      } : r))
      
      setEditModal({ isOpen: false, reviewId: null, title: '', context: '' })
    } catch (err) {
      console.error('Error updating and approving review:', err)
      alert('Failed to update and approve review.')
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
        <button className={`apple-pill-tab ${filterStatus === 'pending' ? 'active' : ''}`} onClick={() => setFilterStatus('pending')}>
          Pending
        </button>
        <button className={`apple-pill-tab ${filterStatus === 'approved' ? 'active' : ''}`} onClick={() => setFilterStatus('approved')}>
          Approved
        </button>
        <button className={`apple-pill-tab ${filterStatus === 'rejected' ? 'active' : ''}`} onClick={() => setFilterStatus('rejected')}>
          Rejected
        </button>
        <button className={`apple-pill-tab ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>
          All Reviews
        </button>
      </div>

      {/* ===== REVIEWS LIST ===== */}
      {filteredReviews.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredReviews.map(review => (
            <div key={review.id} className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}>
              
              {/* Status Side Indicator */}
              <div style={{ 
                position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', 
                background: review.status === 'approved' ? 'var(--apple-accent-green)' 
                          : review.status === 'rejected' ? 'var(--apple-accent-red)' 
                          : 'var(--apple-accent-orange)' 
              }} />

              {/* Review Header Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '700', color: '#fff', fontSize: '1.05rem' }}>
                      {review.profiles?.first_name} {review.profiles?.last_name}
                    </span>
                    <span style={{ color: 'var(--apple-text-secondary)', fontSize: '0.85rem' }}>
                      ({review.profiles?.email})
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.75rem' }}>
                    <span className="apple-badge apple-badge-blue">{review.teams?.name || 'No Team'}</span>
                    <span className="apple-badge apple-badge-gray" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <Star size={10} /> {review.events?.title || 'Unknown Event'}
                    </span>
                  </div>
                </div>
                
                <span className={`apple-badge ${
                  review.status === 'approved' ? 'apple-badge-green' : 
                  review.status === 'rejected' ? 'apple-badge-red' : 'apple-badge-orange'
                }`}>
                  {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                </span>
              </div>

              {/* Review Content */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '1rem', fontWeight: '600' }}>{review.title}</h4>
                <p style={{ margin: 0, color: 'var(--apple-text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {review.context}
                </p>
              </div>

              {/* Admin Feedback Display (if rejected) */}
              {review.status === 'rejected' && review.admin_feedback && (
                <div style={{ display: 'flex', gap: '10px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,69,58,0.05)', border: '1px solid rgba(255,69,58,0.2)', color: 'var(--apple-accent-red)', fontSize: '0.85rem' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: '4px' }}>Suggested Changes / Reason for Rejection:</strong>
                    {review.admin_feedback}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {review.status === 'pending' && (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px', borderTop: '1px solid var(--apple-border)', paddingTop: '16px' }}>
                  <button 
                    onClick={() => setRejectModal({ isOpen: true, reviewId: review.id, feedback: '' })}
                    className="apple-btn apple-btn-danger" style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <XCircle size={16} /> Reject with Feedback
                  </button>
                  <button 
                    onClick={() => setEditModal({ isOpen: true, reviewId: review.id, title: review.title, context: review.context })}
                    className="apple-btn apple-btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Edit size={16} /> Edit & Approve
                  </button>
                  <button 
                    onClick={() => handleApprove(review.id)}
                    className="apple-btn apple-btn-primary" style={{ background: 'var(--apple-accent-green)', padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CheckCircle size={16} /> Approve
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="apple-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--apple-text-secondary)', fontStyle: 'italic' }}>
          No {filterStatus !== 'all' ? filterStatus : ''} reviews found.
        </div>
      )}

      {/* ===== REJECT MODAL ===== */}
      {rejectModal.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div className="apple-card" style={{ width: '100%', maxWidth: '500px', padding: '24px', borderTop: '4px solid var(--apple-accent-red)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <XCircle size={20} style={{ color: 'var(--apple-accent-red)' }} /> Reject Review
            </h3>
            <form onSubmit={handleRejectSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label className="apple-form-label">Suggested Changes / Feedback</label>
                <textarea
                  className="apple-form-control"
                  rows={4}
                  required
                  placeholder="Explain why this review is being rejected and what needs to be changed..."
                  value={rejectModal.feedback}
                  onChange={(e) => setRejectModal({ ...rejectModal, feedback: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setRejectModal({ isOpen: false, reviewId: null, feedback: '' })} className="apple-btn apple-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="apple-btn apple-btn-danger">
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== EDIT & APPROVE MODAL ===== */}
      {editModal.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div className="apple-card" style={{ width: '100%', maxWidth: '600px', padding: '24px', borderTop: '4px solid var(--apple-accent-blue)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit size={20} style={{ color: 'var(--apple-accent-blue)' }} /> Edit & Approve Review
            </h3>
            <form onSubmit={handleEditApproveSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label className="apple-form-label">Review Title</label>
                <input
                  type="text"
                  className="apple-form-control"
                  required
                  value={editModal.title}
                  onChange={(e) => setEditModal({ ...editModal, title: e.target.value })}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="apple-form-label">Review Context</label>
                <textarea
                  className="apple-form-control"
                  rows={6}
                  required
                  value={editModal.context}
                  onChange={(e) => setEditModal({ ...editModal, context: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setEditModal({ isOpen: false, reviewId: null, title: '', context: '' })} className="apple-btn apple-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="apple-btn apple-btn-primary" style={{ background: 'var(--apple-accent-green)' }}>
                  Save & Approve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
