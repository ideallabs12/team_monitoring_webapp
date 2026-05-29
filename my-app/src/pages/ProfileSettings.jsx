import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import {
  getLastNMonths,
  normalizeMonth,
  formatRevenueMonthShort,
  sumRevenues
} from '../utils/revenueUtils'

export default function ProfileSettings({ user }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Form State
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Extra features state
  const [teams, setTeams] = useState([])
  const [memberships, setMemberships] = useState([])
  const [revenues, setRevenues] = useState([])

  useEffect(() => {
    async function loadProfile() {
      if (!user) return
      
      setEmail(user.email || '')
      
      try {
        const [profileRes, teamsRes, membershipsRes, revenuesRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('teams').select('*'),
          supabase.from('team_members').select('*').eq('user_id', user.id),
          supabase.from('monthly_revenues').select('*').eq('user_id', user.id)
        ])

        if (profileRes.data) {
          setFirstName(profileRes.data.first_name || '')
          setLastName(profileRes.data.last_name || '')
          setPhone(profileRes.data.phone || '')
        }
        if (teamsRes.data) setTeams(teamsRes.data)
        if (membershipsRes.data) setMemberships(membershipsRes.data)
        if (revenuesRes.data) setRevenues(revenuesRes.data)
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
    <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', marginTop: '10px' }}>
      
      {/* LEFT COLUMN: Manage Settings */}
      <div style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h1 style={{ marginBottom: '8px' }}>Profile Settings</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Manage your personal information, email address, and security.
          </p>
        </div>

        {message.text && (
          <div style={{ 
            padding: '12px', 
            borderRadius: '8px',
            background: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(74, 222, 128, 0.1)',
            color: message.type === 'error' ? 'var(--danger)' : '#4ade80'
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ padding: '28px' }}>
            <h3 style={{ marginBottom: '20px' }}>Personal Information</h3>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>First Name</label>
                <input 
                  type="text" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '6px',
                    border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: '#fff'
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Last Name</label>
                <input 
                  type="text" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '6px',
                    border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: '#fff'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Phone Number</label>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  width: '100%', padding: '10px', borderRadius: '6px',
                  border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: '#fff'
                }}
              />
            </div>
          </div>

          <div className="card" style={{ padding: '28px' }}>
            <h3 style={{ marginBottom: '20px' }}>Security & Login</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%', padding: '10px', borderRadius: '6px',
                  border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: '#fff'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>New Password (leave blank to keep current)</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '10px', borderRadius: '6px',
                  border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: '#fff'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* RIGHT COLUMN: Extra Profile Stats & Teams */}
      <div style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '24px', flexGrow: 0, flexShrink: 0 }}>
        
        {/* Performance Overview */}
        <div className="card" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', color: '#fff' }}>My Achievements</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>All-Time Total</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>
                ${sumRevenues(revenues).toFixed(2)}
              </div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Contributions</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#4ade80' }}>
                {revenues.filter(r => Number(r.amount) > 0).length} Months
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
