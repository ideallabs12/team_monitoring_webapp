import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import {
  getLastNMonths,
  normalizeMonth,
  formatRevenueMonthShort,
  sumRevenues
} from '../../utils/revenueUtils'
import { getSystemTheme, setSystemTheme } from '../../utils/themeHelper'
import ThemeSwitch from '../../components/ThemeSwitch'

let globalProfileCache = {
  userId: null,
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  jobTitle: '',
  dateOfBirth: '',
  dateOfJoining: '',
  avatarUrl: null,
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
  const [jobTitle, setJobTitle] = useState(globalProfileCache.jobTitle)
  const [dateOfBirth, setDateOfBirth] = useState(globalProfileCache.dateOfBirth)
  const [dateOfJoining, setDateOfJoining] = useState(globalProfileCache.dateOfJoining)
  const [avatarUrl, setAvatarUrl] = useState(globalProfileCache.avatarUrl)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [password, setPassword] = useState('')

  // Extra features state
  const [teams, setTeams] = useState(globalProfileCache.teams)
  const [revenues, setRevenues] = useState(globalProfileCache.revenues)
  const [theme, setTheme] = useState(getSystemTheme)

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(getSystemTheme())
    }
    window.addEventListener('theme-change', handleThemeChange)
    return () => window.removeEventListener('theme-change', handleThemeChange)
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setSystemTheme(nextTheme)
  }

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
          const jt = profileRes.data.job_title || ''
          const dob = profileRes.data.date_of_birth || ''
          const doj = profileRes.data.date_of_joining || ''
          const au = profileRes.data.avatar_url || null

          setFirstName(fn)
          setLastName(ln)
          setPhone(ph)
          setJobTitle(jt)
          setDateOfBirth(dob)
          setDateOfJoining(doj)
          setAvatarUrl(au)
          
          globalProfileCache.firstName = fn
          globalProfileCache.lastName = ln
          globalProfileCache.phone = ph
          globalProfileCache.jobTitle = jt
          globalProfileCache.dateOfBirth = dob
          globalProfileCache.dateOfJoining = doj
          globalProfileCache.avatarUrl = au
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



  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      let uploadedAvatarUrl = avatarUrl;
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
          
        uploadedAvatarUrl = publicUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          first_name: firstName, 
          last_name: lastName, 
          phone: phone,
          job_title: jobTitle || null,
          date_of_birth: dateOfBirth || null,
          date_of_joining: dateOfJoining || null,
          avatar_url: uploadedAvatarUrl || null
        })
        .eq('id', user.id)
      if (error) throw error

      setAvatarUrl(uploadedAvatarUrl)
      setAvatarFile(null)
      setAvatarPreview(null)
      
      globalProfileCache.jobTitle = jobTitle;
      globalProfileCache.dateOfBirth = dateOfBirth;
      globalProfileCache.dateOfJoining = dateOfJoining;
      globalProfileCache.avatarUrl = uploadedAvatarUrl;
      globalProfileCache.firstName = firstName;
      globalProfileCache.lastName = lastName;
      globalProfileCache.phone = phone;

      setMessage({ type: 'success', text: 'Personal information updated successfully!' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSecurity = async (e) => {
    e.preventDefault()
    if (!password) {
      setMessage({ type: 'error', text: 'Please enter a new password to update.' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setMessage({ type: 'success', text: 'Password updated successfully!' })
      setPassword('')
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
          
          <form onSubmit={handleSaveProfile} className="apple-card">
            <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>Personal Information</h3>
            
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              {avatarPreview || avatarUrl ? (
                <img src={avatarPreview || avatarUrl} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--apple-border)' }} />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--apple-border)', color: 'var(--text-secondary)' }}>
                  No Image
                </div>
              )}
              <div>
                <label className="apple-form-label" style={{ marginBottom: '8px' }}>Profile Picture (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setAvatarFile(e.target.files[0])
                      setAvatarPreview(URL.createObjectURL(e.target.files[0]))
                    }
                  }}
                  style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)' }}
                />
              </div>
            </div>

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

            <div className="apple-two-col-grid" style={{ marginBottom: '16px' }}>
              <div>
                <label className="apple-form-label">Phone Number</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="apple-form-control"
                />
              </div>
              <div>
                <label className="apple-form-label">Role / Job Title (Optional)</label>
                <input 
                  type="text" 
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Sales Executive"
                  className="apple-form-control"
                />
              </div>
            </div>
            
            <div className="apple-two-col-grid" style={{ marginBottom: '24px' }}>
              <div>
                <label className="apple-form-label">Date of Birth (Optional)</label>
                <input 
                  type="date" 
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="apple-form-control"
                />
              </div>
              <div>
                <label className="apple-form-label">Date of Joining (Optional)</label>
                <input 
                  type="date" 
                  value={dateOfJoining}
                  onChange={(e) => setDateOfJoining(e.target.value)}
                  className="apple-form-control"
                />
              </div>
            </div>
            
            <button type="submit" className="apple-btn apple-btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Confirm Details'}
            </button>
          </form>

          <form onSubmit={handleSaveSecurity} className="apple-card">
            <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>Security & Login</h3>
            <p style={{ color: 'var(--apple-text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
              For security reasons, email changes must be processed through your administrator. You can update your password below.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label className="apple-form-label">New Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="apple-form-control"
              />
            </div>
            
            <button type="submit" className="apple-btn apple-btn-primary" disabled={saving || !password}>
              {saving ? 'Updating...' : 'Change Password'}
            </button>
          </form>

          <div className="apple-card">
            <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>App Preferences</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
              <div>
                <div style={{ fontSize: '0.95rem', color: 'var(--apple-text-primary)', fontWeight: '600' }}>App Theme</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>Toggle between dark and light modes.</div>
              </div>
              <ThemeSwitch theme={theme} toggleTheme={toggleTheme} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Extra Profile Stats & Achievements */}
        <div className="apple-left-pane" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Identity Overview */}
          <div className="apple-card">
            <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>Identity Overview</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff' }}>{firstName || lastName ? `${firstName} ${lastName}` : 'Not provided'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</span>
                <span style={{ fontSize: '1rem', color: '#fff' }}>{email}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone Number</span>
                <span style={{ fontSize: '1rem', color: '#fff' }}>{phone || 'Not provided'}</span>
              </div>
            </div>
          </div>

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
