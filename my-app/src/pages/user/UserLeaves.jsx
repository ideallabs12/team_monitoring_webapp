import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { Calendar, Plus, Clock, CheckCircle, XCircle, Trash2, Sparkles, Loader2 } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'

export default function UserLeaves({ user }) {
  const [balance, setBalance] = useState({ accrued_leaves: 0, used_leaves: 0, available_balance: 0 })
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [showForm, setShowForm] = useState(false)
  const [leaveStyle, setLeaveStyle] = useState('linear')
  
  // Linear state
  const [linearData, setLinearData] = useState({ start_date: '', end_date: '', days_count: 1 })
  
  // Jumbled state
  const [jumbledDates, setJumbledDates] = useState([{ date: '', session: 'Full Day' }])
  
  // Shared state
  const [sharedData, setSharedData] = useState({ leave_type: 'Casual', reason: '' })
  
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  
  // AI Generator state
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiContext, setAiContext] = useState('')
  const [aiCustomContext, setAiCustomContext] = useState('')

  const LEAVE_KEYWORDS = [
    "Marriage", "Sick Leave", "Family Function", 
    "Medical Emergency", "Vacation", "Relocation", 
    "Bereavement", "Personal Work", "Exam/Study", "Maternity/Paternity"
  ]

  useEffect(() => {
    loadLeavesData()

    const channel = supabase.channel(`leave_requests_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests', filter: `user_id=eq.${user.id}` }, () => {
        loadLeavesData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const loadLeavesData = async () => {
    setLoading(true)
    try {
      const { data: balData, error: balErr } = await supabase.rpc('get_leave_balance', { p_user_id: user.id })
      if (balErr) throw balErr
      if (balData && balData.length > 0) setBalance(balData[0])

      const { data: reqData, error: reqErr } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (reqErr) throw reqErr
      setRequests(reqData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate days for Jumbled
  const getJumbledDaysCount = () => {
    return jumbledDates.reduce((total, jd) => {
      if (!jd.date) return total
      return total + (jd.session === 'Full Day' ? 1 : 0.5)
    }, 0)
  }

  const getTotalDays = () => {
    return leaveStyle === 'linear' ? linearData.days_count : getJumbledDaysCount()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')

    try {
      const totalDays = getTotalDays()
      if (totalDays <= 0) throw new Error("Please specify at least 0.5 days of leave.")
      
      if (leaveStyle === 'jumbled' && jumbledDates.some(jd => !jd.date)) {
        throw new Error("Please fill in all dates for your jumbled leave selection.")
      }

      const isLop = totalDays > balance.available_balance

      const insertPayload = {
        user_id: user.id,
        leave_style: leaveStyle,
        days_count: totalDays,
        leave_type: sharedData.leave_type,
        reason: sharedData.reason,
        is_lop: isLop
      }

      if (leaveStyle === 'linear') {
        insertPayload.start_date = linearData.start_date
        insertPayload.end_date = linearData.end_date
      } else {
        // Format jumbled dates and calculate days correctly to pass into jsonb
        insertPayload.jumbled_dates = jumbledDates.map(jd => ({
          date: jd.date,
          session: jd.session,
          days: jd.session === 'Full Day' ? 1.0 : 0.5
        }))
      }

      const { error } = await supabase.from('leave_requests').insert(insertPayload)
      if (error) throw error

      setShowForm(false)
      setLinearData({ start_date: '', end_date: '', days_count: 1 })
      setJumbledDates([{ date: '', session: 'Full Day' }])
      setSharedData({ leave_type: 'Casual', reason: '' })
      
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleGenerateAiReason = async () => {
    const contextStr = aiContext === 'Custom' ? aiCustomContext : aiContext;
    if (!contextStr.trim()) {
      setErrorMsg('Please select a keyword or enter a custom reason for the AI.')
      return
    }

    setAiGenerating(true)
    setErrorMsg('')
    try {
      const prompt = `
        You are an AI assistant in a corporate leave management system.
        Write a professional, concise leave request reason based on the following context: "${contextStr}".
        Make it polite and suitable for a formal work environment. Do not include placeholders like "[Your Name]", just provide the actual reason text (1-3 sentences max).
      `
      const { data, error: invokeError } = await supabase.functions.invoke('ai-analytics', {
        body: { prompt }
      })

      if (invokeError) throw new Error(invokeError.message)
      if (data?.error) throw new Error(data.error.message || JSON.stringify(data.error))
      
      const content = data?.choices?.[0]?.message?.content
      if (content) {
        setSharedData({ ...sharedData, reason: content.trim() })
      } else {
        throw new Error('Invalid response from AI model.')
      }
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'Failed to generate AI reason. Please try again.')
    } finally {
      setAiGenerating(false)
    }
  }

  const addJumbledDate = () => {
    setJumbledDates([...jumbledDates, { date: '', session: 'Full Day' }])
  }

  const removeJumbledDate = (index) => {
    if (jumbledDates.length > 1) {
      const newDates = [...jumbledDates]
      newDates.splice(index, 1)
      setJumbledDates(newDates)
    }
  }

  const updateJumbledDate = (index, field, value) => {
    const newDates = [...jumbledDates]
    newDates[index][field] = value
    setJumbledDates(newDates)
  }

  const getStatusBadge = (status, isLop) => {
    if (status === 'approved') return <span style={{ padding: '4px 8px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '0.8rem', fontWeight: '600' }}><CheckCircle size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}/> Approved {isLop && '(LOP)'}</span>
    if (status === 'rejected') return <span style={{ padding: '4px 8px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.8rem', fontWeight: '600' }}><XCircle size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}/> Rejected</span>
    return <span style={{ padding: '4px 8px', borderRadius: '12px', background: 'rgba(234,179,8,0.1)', color: '#eab308', fontSize: '0.8rem', fontWeight: '600' }}><Clock size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}/> Pending</span>
  }

  return (
    <div className="apple-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="apple-title">My Leaves</h1>
          <p className="apple-subtitle">Manage your leave balance and requests</p>
        </div>
        <button className="apple-btn" onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> New Request
        </button>
      </div>

      {/* Balance Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="apple-card" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: '600' }}>Accrued Leaves</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--apple-text-primary)' }}>{balance.accrued_leaves}</div>
        </div>
        <div className="apple-card" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: '600' }}>Used Leaves</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--apple-accent-orange)' }}>{balance.used_leaves}</div>
        </div>
        <div className="apple-card" style={{ padding: '24px', textAlign: 'center', background: balance.available_balance > 0 ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: '600' }}>Available Balance</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '700', color: balance.available_balance > 0 ? '#10b981' : '#ef4444' }}>{balance.available_balance}</div>
        </div>
      </div>

      {/* Request Form */}
      {showForm && (
        <div className="apple-card" style={{ padding: '24px', marginBottom: '32px', borderLeft: '4px solid var(--apple-accent-blue)' }}>
          <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>Submit Leave Request</h3>
          {errorMsg && <div style={{ color: '#ef4444', marginBottom: '16px', fontSize: '0.9rem' }}>{errorMsg}</div>}
          
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="apple-label" style={{ marginBottom: '8px', display: 'block' }}>Leave Style</label>
              <div style={{ display: 'flex', gap: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--apple-text-primary)' }}>
                  <input type="radio" name="leave_style" checked={leaveStyle === 'linear'} onChange={() => setLeaveStyle('linear')} />
                  <strong>Linear Leaves</strong> (Contiguous dates)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--apple-text-primary)' }}>
                  <input type="radio" name="leave_style" checked={leaveStyle === 'jumbled'} onChange={() => setLeaveStyle('jumbled')} />
                  <strong>Jumbled Leaves</strong> (Pick specific dates & sessions)
                </label>
              </div>
            </div>

            {leaveStyle === 'linear' ? (
              <>
                <div>
                  <label className="apple-label">From Date</label>
                  <input type="date" required className="apple-input" style={{ width: '100%', padding: '10px' }} value={linearData.start_date} onChange={e => setLinearData({...linearData, start_date: e.target.value})} />
                </div>
                <div>
                  <label className="apple-label">To Date</label>
                  <input type="date" required className="apple-input" style={{ width: '100%', padding: '10px' }} value={linearData.end_date} onChange={e => setLinearData({...linearData, end_date: e.target.value})} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="apple-label">Total Days Requested (Exclude weekends manually if needed)</label>
                  <input type="number" step="0.5" min="0.5" required className="apple-input" style={{ width: '100%', padding: '10px' }} value={linearData.days_count} onChange={e => setLinearData({...linearData, days_count: parseFloat(e.target.value)})} />
                </div>
              </>
            ) : (
              <div style={{ gridColumn: '1 / -1', background: 'var(--apple-bg-secondary)', padding: '16px', borderRadius: '12px' }}>
                <label className="apple-label" style={{ marginBottom: '16px', display: 'block' }}>Select Dates & Sessions</label>
                {jumbledDates.map((jd, index) => (
                  <div key={index} style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                    <input type="date" required className="apple-input" style={{ flex: 1, padding: '10px' }} value={jd.date} onChange={e => updateJumbledDate(index, 'date', e.target.value)} />
                    <select className="apple-input" style={{ flex: 1, padding: '10px' }} value={jd.session} onChange={e => updateJumbledDate(index, 'session', e.target.value)}>
                      <option value="Full Day">Full Day (1.0)</option>
                      <option value="Morning">Morning Session (0.5)</option>
                      <option value="Afternoon">Afternoon Session (0.5)</option>
                    </select>
                    {jumbledDates.length > 1 && (
                      <button type="button" onClick={() => removeJumbledDate(index)} style={{ padding: '10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addJumbledDate} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', color: 'var(--apple-text-primary)', border: '1px solid var(--apple-border)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <Plus size={14} /> Add Another Date
                </button>
                <div style={{ marginTop: '16px', fontSize: '0.9rem', fontWeight: '600', color: 'var(--apple-text-secondary)' }}>
                  Total Days Calculated: <span style={{ color: 'var(--apple-text-primary)' }}>{getJumbledDaysCount()}</span>
                </div>
              </div>
            )}

            <div>
              <label className="apple-label">Leave Type</label>
              <select className="apple-input" style={{ width: '100%', padding: '10px' }} value={sharedData.leave_type} onChange={e => setSharedData({...sharedData, leave_type: e.target.value})}>
                <option value="Casual">Casual Leave</option>
                <option value="Sick">Sick Leave</option>
                <option value="LOP">Loss of Pay (LOP)</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="apple-label">Reason</label>
              <div style={{ marginBottom: '16px', padding: '16px', background: 'var(--apple-bg-secondary)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--apple-accent-blue)' }}>
                  <Sparkles size={16} /> <strong>AI Assist</strong> (Optional)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {LEAVE_KEYWORDS.map(kw => (
                    <button 
                      key={kw} type="button" 
                      onClick={() => { setAiContext(kw); setAiCustomContext(''); }}
                      style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '16px', border: '1px solid var(--apple-border)', background: aiContext === kw ? 'var(--apple-accent-blue)' : 'transparent', color: aiContext === kw ? '#fff' : 'var(--apple-text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      {kw}
                    </button>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => setAiContext('Custom')}
                    style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '16px', border: '1px solid var(--apple-border)', background: aiContext === 'Custom' ? 'var(--apple-accent-blue)' : 'transparent', color: aiContext === 'Custom' ? '#fff' : 'var(--apple-text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    Custom...
                  </button>
                </div>
                {aiContext === 'Custom' && (
                  <input 
                    type="text" placeholder="Shortly describe why you need leave..."
                    className="apple-input" style={{ width: '100%', padding: '10px', marginBottom: '12px' }}
                    value={aiCustomContext} onChange={e => setAiCustomContext(e.target.value)}
                  />
                )}
                <button type="button" onClick={handleGenerateAiReason} disabled={aiGenerating || !aiContext} className="apple-btn" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  {aiGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {aiGenerating ? 'Generating...' : 'Generate Reason with AI'}
                </button>
              </div>
              <textarea required className="apple-input" placeholder="Your leave reason..." style={{ width: '100%', padding: '10px', minHeight: '80px' }} value={sharedData.reason} onChange={e => setSharedData({...sharedData, reason: e.target.value})}></textarea>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="apple-btn" style={{ background: 'transparent', border: '1px solid var(--apple-border)', color: 'var(--apple-text-secondary)' }} onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" disabled={submitting} className="apple-btn">{submitting ? 'Submitting...' : 'Submit Request'}</button>
            </div>
          </form>

          {getTotalDays() > balance.available_balance && sharedData.leave_type !== 'LOP' && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '0.85rem' }}>
              <strong>Warning:</strong> You are requesting {getTotalDays()} days, but only have {balance.available_balance} available. This request will be treated as Loss of Pay (LOP) for the excess days.
            </div>
          )}
        </div>
      )}

      {/* History List */}
      <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>Request History</h3>
      <div className="apple-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>Loading history...</div>
        ) : requests.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>No leave requests found.</div>
        ) : (
          <div style={{ minWidth: '800px', overflowX: 'auto' }}>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr 1fr', padding: '16px', borderBottom: '1px solid var(--apple-border)', fontSize: '0.8rem', fontWeight: '600', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>
               <div>Date Details</div>
               <div>Days</div>
               <div>Type</div>
               <div>Reason</div>
               <div style={{ textAlign: 'right' }}>Status</div>
             </div>
             {requests.map(req => (
               <div key={req.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr 1fr', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center', fontSize: '0.9rem' }}>
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
                 <div>{req.days_count} {req.days_count === 1 ? 'Day' : 'Days'}</div>
                 <div>{req.leave_type} {req.is_lop && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginLeft: '4px' }}>(LOP)</span>}</div>
                 <div style={{ color: 'var(--apple-text-secondary)', paddingRight: '16px' }}>{req.reason}</div>
                 <div style={{ textAlign: 'right' }}>{getStatusBadge(req.status, req.is_lop)}</div>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  )
}
