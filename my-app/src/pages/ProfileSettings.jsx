import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import {
  getLastNMonths,
  normalizeMonth,
  formatRevenueMonthShort,
  sumRevenues
} from '../utils/revenueUtils'

let globalProfileCache = {
  userId: null,
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  teams: [],
  revenues: []
}

export default function ProfileSettings({ user }) {
  const [loading, setLoading] = useState(globalProfileCache.userId ? false : true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Form State
  const [firstName, setFirstName] = useState(globalProfileCache.firstName)
  const [lastName, setLastName] = useState(globalProfileCache.lastName)
  const [phone, setPhone] = useState(globalProfileCache.phone)
  const [email, setEmail] = useState(globalProfileCache.email)
  const [password, setPassword] = useState('')

  // Extra features state
  const [teams, setTeams] = useState(globalProfileCache.teams)
  const [revenues, setRevenues] = useState(globalProfileCache.revenues)

  useEffect(() => {
    async function loadProfile() {
      if (!user) return
      
      setEmail(user.email || '')
      
      try {
        const [profileRes, teamsRes, revenuesRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('teams').select('*'),
          supabase.from('monthly_revenues').select('*').eq('user_id', user.id)
        ])

        if (profileRes.data) {
          const fn = profileRes.data.first_name || ''
          const ln = profileRes.data.last_name || ''
          const ph = profileRes.data.phone || ''
          setFirstName(fn)
          setLastName(ln)
          setPhone(ph)
          
          globalProfileCache.firstName = fn
          globalProfileCache.lastName = ln
          globalProfileCache.phone = ph
        }
        if (teamsRes.data) {
          setTeams(teamsRes.data)
          globalProfileCache.teams = teamsRes.data
        }
        if (revenuesRes.data) {
          setRevenues(revenuesRes.data)
          globalProfileCache.revenues = revenuesRes.data
        }

        globalProfileCache.userId = user.id
        globalProfileCache.email = user.email || ''

      } catch (err) {
        console.error("Error loading profile settings", err)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user])



  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      // 1. Update Database Profile (First Name, Last Name, Phone)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // 2. Update Auth Settings (Email, Password)
      const authUpdates = {}
      if (email !== user.email) {
        authUpdates.email = email
      }
      if (password) {
        authUpdates.password = password
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(authUpdates)
        if (authError) throw authError
        
        if (authUpdates.email) {
          setMessage({ type: 'success', text: 'Profile updated! Check your new email address for a confirmation link.' })
          setSaving(false)
          return
        }
      }

      setMessage({ type: 'success', text: 'Profile settings saved successfully!' })
      setPassword('') // Clear password field after save
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ color: '#fff', padding: '20px' }}>Loading profile settings...</div>

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* Premium Header */}
      <div style={{ marginBottom: 'clamp(24px, 5vw, 40px)' }}>
        <div className="apple-kicker">Security & Details</div>
        <h1 className="apple-title-large">Profile Settings</h1>
        <p className="apple-lead">
          Manage your personal information, email preferences, and security settings.
        </p>
      </div>

      {message.text && (
        <div style={{ 
          padding: '12px 16px', 
          borderRadius: '10px',
          marginBottom: '24px',
          background: message.type === 'error' ? 'rgba(255, 69, 58, 0.08)' : 'rgba(48, 213, 200, 0.08)',
          border: `1px solid ${message.type === 'error' ? 'var(--apple-accent-red)' : 'var(--apple-accent-green)'}`,
          color: message.type === 'error' ? 'var(--apple-accent-red)' : 'var(--apple-accent-green)',
          fontSize: '0.88rem',
          fontWeight: '500'
        }}>
          {message.text}
        </div>
      )}

      {/* Pane Layout */}
      <div className="apple-pane-layout">
        
        {/* LEFT COLUMN: Manage Settings */}
        <div className="apple-right-pane" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="apple-card">
              <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>Personal Information</h3>
              
              <div className="apple-two-col-grid" style={{ marginBottom: '16px' }}>
                <div>
                  <label className="apple-form-label">First Name</label>
                  <input 
                    type="text" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="apple-form-control"
                  />
                </div>
                <div>
                  <label className="apple-form-label">Last Name</label>
                  <input 
                    type="text" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="apple-form-control"
                  />
                </div>
              </div>

              <div>
                <label className="apple-form-label">Phone Number</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="apple-form-control"
                />
              </div>
            </div>

            <div className="apple-card">
              <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>Security & Login</h3>
              
              <div style={{ marginBottom: '16px' }}>
                <label className="apple-form-label">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="apple-form-control"
                />
              </div>

              <div>
                <label className="apple-form-label">New Password (leave blank to keep current)</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="apple-form-control"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="apple-btn apple-btn-primary" disabled={saving} style={{ width: '100%' }}>
                {saving ? 'Saving changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: Extra Profile Stats & Achievements */}
        <div className="apple-left-pane" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Performance Overview */}
          <div className="apple-card">
            <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>My Achievements</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.02)', 
                border: '1px solid var(--apple-border)', 
                borderRadius: '12px', 
                padding: '16px' 
              }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>All-Time Contribution</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--apple-accent-green)' }}>
                  ${sumRevenues(revenues).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.02)', 
                border: '1px solid var(--apple-border)', 
                borderRadius: '12px', 
                padding: '16px' 
              }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Active Billing Cycles</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--apple-accent-blue)' }}>
                  {revenues.filter(r => Number(r.amount) > 0).length} Months
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
