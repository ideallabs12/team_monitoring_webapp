import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { CheckCircle, XCircle, Clock, Calendar } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'

export default function LeaveApprovals({ user }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    loadRequests()

    // Real-time subscription for HR to instantly see new requests
    const channel = supabase.channel('hr_leave_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => {
        loadRequests()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadRequests = async () => {
    setLoading(true)
    try {
      // Fetch leave requests and join with profiles to get names/emails
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          profiles:user_id(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRequests(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (requestId, newStatus) => {
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: newStatus, reviewed_by: user.id })
        .eq('id', requestId)

      if (error) throw error
      
      setSuccessMsg(`Request successfully ${newStatus}!`)
      // Optimistic update
      setRequests(prev => prev.map(req => req.id === requestId ? { ...req, status: newStatus } : req))
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const historyRequests = requests.filter(r => r.status !== 'pending')

  return (
    <div className="apple-container">
      <div style={{ marginBottom: '32px' }}>
        <h1 className="apple-title">Leave Approvals</h1>
        <p className="apple-subtitle">Review and manage employee leave requests.</p>
      </div>

      {errorMsg && <div style={{ color: '#ef4444', marginBottom: '16px', background: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: '8px' }}>{errorMsg}</div>}
      {successMsg && <div style={{ color: '#10b981', marginBottom: '16px', background: 'rgba(16,185,129,0.1)', padding: '12px', borderRadius: '8px' }}>{successMsg}</div>}

      <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>Pending Requests ({pendingRequests.length})</h3>
      <div className="apple-card" style={{ marginBottom: '40px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>Loading requests...</div>
        ) : pendingRequests.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>No pending requests right now.</div>
        ) : (
          <div style={{ minWidth: '800px', overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 1.5fr', padding: '16px', borderBottom: '1px solid var(--apple-border)', fontSize: '0.8rem', fontWeight: '600', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>
              <div>Employee</div>
              <div>Dates</div>
              <div>Days</div>
              <div>Reason</div>
              <div style={{ textAlign: 'right' }}>Actions</div>
            </div>
            {pendingRequests.map(req => {
              const fullName = `${req.profiles?.first_name || ''} ${req.profiles?.last_name || ''}`.trim() || req.profiles?.email
              return (
                <div key={req.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 1.5fr', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center', fontSize: '0.9rem' }}>
                  <div style={{ fontWeight: '600' }}>{fullName}</div>
                  <div>
                    {req.leave_style === 'jumbled' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--apple-accent-blue)' }}>Jumbled Leave</span>
                        {req.jumbled_dates?.map((jd, i) => (
                          <div key={i} style={{ fontSize: '0.85rem' }}>• {new Date(jd.date).toLocaleDateString()} <span style={{ color: 'var(--apple-text-secondary)', fontSize: '0.75rem' }}>({jd.session})</span></div>
                        ))}
                      </div>
                    ) : (
                      <div>
                        <span style={{ fontSize: '0.8rem', color: '#10b981' }}>Linear Leave</span><br/>
                        {new Date(req.start_date).toLocaleDateString()} <br/><span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>to {new Date(req.end_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    {req.days_count}
                    {req.is_lop && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>LOP Alert</div>}
                  </div>
                  <div style={{ color: 'var(--apple-text-secondary)' }}>
                    <span style={{ display: 'inline-block', padding: '2px 6px', background: 'var(--apple-bg-secondary)', borderRadius: '4px', fontSize: '0.75rem', marginBottom: '4px', color: '#fff' }}>{req.leave_type}</span>
                    <br/>
                    {req.reason}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button 
                      onClick={() => handleUpdateStatus(req.id, 'approved')}
                      style={{ padding: '6px 12px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
                      <CheckCircle size={14}/> Approve
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(req.id, 'rejected')}
                      style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
                      <XCircle size={14}/> Reject
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>Approval History</h3>
      <div className="apple-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>Loading history...</div>
        ) : historyRequests.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>No history yet.</div>
        ) : (
          <div style={{ minWidth: '800px', overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr', padding: '16px', borderBottom: '1px solid var(--apple-border)', fontSize: '0.8rem', fontWeight: '600', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>
              <div>Employee</div>
              <div>Dates</div>
              <div>Type</div>
              <div>Days</div>
              <div style={{ textAlign: 'right' }}>Status</div>
            </div>
            {historyRequests.map(req => {
              const fullName = `${req.profiles?.first_name || ''} ${req.profiles?.last_name || ''}`.trim() || req.profiles?.email
              return (
                <div key={req.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center', fontSize: '0.9rem' }}>
                  <div style={{ fontWeight: '600' }}>{fullName}</div>
                  <div>
                    {req.leave_style === 'jumbled' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--apple-accent-blue)' }}>Jumbled Leave</span>
                        {req.jumbled_dates?.map((jd, i) => (
                          <div key={i} style={{ fontSize: '0.85rem' }}>• {new Date(jd.date).toLocaleDateString()} <span style={{ color: 'var(--apple-text-secondary)', fontSize: '0.75rem' }}>({jd.session})</span></div>
                        ))}
                      </div>
                    ) : (
                      <div>
                        <span style={{ fontSize: '0.8rem', color: '#10b981' }}>Linear Leave</span><br/>
                        {new Date(req.start_date).toLocaleDateString()} <br/><span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>to {new Date(req.end_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  <div>{req.leave_type}</div>
                  <div>{req.days_count} {req.is_lop && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>(LOP)</span>}</div>
                  <div style={{ textAlign: 'right' }}>
                    {req.status === 'approved' 
                      ? <span style={{ padding: '4px 8px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '0.8rem', fontWeight: '600' }}>Approved</span>
                      : <span style={{ padding: '4px 8px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.8rem', fontWeight: '600' }}>Rejected</span>
                    }
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
