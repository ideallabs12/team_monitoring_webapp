import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { getAvailableYears, MONTH_NAMES, isFutureMonth, toRevenueMonthString } from '../../utils/revenueUtils'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock, Save, Building } from 'lucide-react'

export default function UserHistoricalRevenue({ user }) {
  const [loading, setLoading] = useState(true)
  const [allTeams, setAllTeams] = useState([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Form State
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())

  const [amount, setAmount] = useState('')
  const [clientName, setClientName] = useState('')
  const [noClientInfo, setNoClientInfo] = useState(false)
  const [source, setSource] = useState('Instagram')

  useEffect(() => {
    async function fetchTeams() {
      try {
        const { data, error } = await supabase.from('teams').select('*').order('name')
        if (error) throw error
        setAllTeams(data || [])
      } catch (err) {
        console.error('Error fetching teams:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTeams()
  }, [])



  async function handleSubmit(e) {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    if (!selectedTeam) {
      setMessage({ type: 'error', text: 'Please select the past team you belonged to.' })
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount greater than 0.' })
      return
    }

    if (isFutureMonth(selectedYear, selectedMonth)) {
      setMessage({ type: 'error', text: 'Cannot add revenue for a future month.' })
      return
    }

    const finalClientName = noClientInfo ? 'NONAME' : (clientName || null)
    if (!noClientInfo && (!clientName || !clientName.trim())) {
      setMessage({ type: 'error', text: 'Please enter a client name or check "No Client Info".' })
      return
    }

    setSaving(true)
    const revenueMonth = toRevenueMonthString(selectedYear, selectedMonth)

    try {
      const { error } = await supabase
        .from('monthly_revenues')
        .insert({
          user_id: user.id,
          team_id: selectedTeam,
          revenue_month: revenueMonth,
          week_number: null,
          client_name: finalClientName,
          source: source,
          amount: numAmount,
          entered_by: user.id
        })

      if (error) throw error

      const monthLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`
      const teamName = allTeams.find(t => t.id === selectedTeam)?.name || 'the selected team'
      
      setMessage({ type: 'success', text: `Successfully logged $${numAmount.toFixed(2)} for ${teamName} in ${monthLabel}!` })
      
      // Reset form but keep team and month same for rapid entry
      setAmount('')
      setClientName('')
      setNoClientInfo(false)
      setSource('Instagram')
      
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading...</div>

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)', maxWidth: '600px', margin: '0 auto', paddingTop: '20px' }}>
      <Link to="/user" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--apple-accent-blue)', textDecoration: 'none', marginBottom: '24px', fontWeight: '500' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="apple-card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
            <Clock size={20} />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '700', color: '#fff' }}>Log Historical Revenue</h2>
        </div>
        <p style={{ color: 'var(--apple-text-secondary)', fontSize: '0.95rem', marginBottom: '32px', lineHeight: '1.5' }}>
          Did you work on a different team before your current assignment? Use this form to backfill any past revenue so your historical performance records are perfectly accurate.
        </p>

        {message.text && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '24px',
            fontSize: '0.9rem',
            background: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(74, 222, 128, 0.1)',
            color: message.type === 'error' ? '#ef4444' : '#4ade80',
            border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(74,222,128,0.2)'}`
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
              <Building size={14} /> Past Team
            </label>
            <select
              className="apple-input"
              value={selectedTeam}
              onChange={e => setSelectedTeam(e.target.value)}
              required
            >
              <option value="" disabled>Select the team you belonged to...</option>
              {allTeams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '8px', fontWeight: '600' }}>Year</label>
              <select className="apple-input" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                {getAvailableYears().map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '8px', fontWeight: '600' }}>Month</label>
              <select className="apple-input" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                {MONTH_NAMES.map((m, idx) => (
                  <option key={idx} value={idx}>{m}</option>
                ))}
              </select>
            </div>
          </div>



          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '8px', fontWeight: '600' }}>Revenue Source</label>
              <select className="apple-input" value={source} onChange={e => setSource(e.target.value)}>
                {['Instagram', 'Facebook', 'TikTok', 'Twitter', 'LinkedIn', 'Email Marketing', 'Organic Search', 'Referral', 'Other'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '8px', fontWeight: '600' }}>Amount ($)</label>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                className="apple-input"
                placeholder="0.00"
                value={amount}
                onChange={e => {
                  const val = e.target.value
                  if (val === '' || /^\d*\.?\d*$/.test(val)) setAmount(val)
                }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '8px', fontWeight: '600' }}>Client / Project Name</label>
            <input
              type="text"
              className="apple-input"
              placeholder="e.g. Nike Summer Campaign"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              disabled={noClientInfo}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--apple-text-secondary)' }}>
              <input
                type="checkbox"
                checked={noClientInfo}
                onChange={e => {
                  setNoClientInfo(e.target.checked)
                  if (e.target.checked) setClientName('')
                }}
                style={{ accentColor: 'var(--apple-accent-blue)' }}
              />
              No specific client name to log
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="apple-btn apple-btn-primary"
            style={{ width: '100%', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {saving ? 'Saving...' : (
              <>
                <Save size={18} /> Submit Historical Revenue
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
