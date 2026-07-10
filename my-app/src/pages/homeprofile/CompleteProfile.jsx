import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'

export default function CompleteProfile({ user, onComplete }) {
  const navigate = useNavigate()
  
  // Try to pre-fill from Google if available
  const metadataName = user?.user_metadata?.full_name || user?.user_metadata?.name || ''
  const nameParts = metadataName.trim().split(/\s+/)
  const [firstName, setFirstName] = useState(user?.user_metadata?.given_name || nameParts[0] || '')
  const [lastName, setLastName] = useState(user?.user_metadata?.family_name || nameParts.slice(1).join(' ') || '')
  
  const [phone, setPhone] = useState('')
  const [teams, setTeams] = useState([])
  const [selectedTeamId, setSelectedTeamId] = useState('') // Single team selection
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Fetch available teams from Supabase
    const fetchTeams = async () => {
      const { data, error } = await supabase.from('teams').select('*')
      if (data) {
        setTeams(data)
      } else {
        console.error('Error fetching teams:', error)
      }
    }
    fetchTeams()
  }, [])

  const handleTeamSelect = (teamId) => {
    setSelectedTeamId(teamId)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate team selection
    if (teams.length > 0 && !selectedTeamId) {
      setError('Please select a team.')
      setLoading(false)
      return
    }

    try {
      const profileData = {
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        email: user.email,
        phone: phone,
        team_id: selectedTeamId || null,
        platform_role: 'employee',
        has_revenue_logging: true,
        has_dis_reporting: true,
        profile_completed: true,
        is_deactivated: true
      };

      // 1. Insert/Update Profile with team_id
      let { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData)

      if (profileError && profileError.message && profileError.message.toLowerCase().includes('jwt expired')) {
        console.log('JWT expired detected. Attempting to refresh session...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          throw new Error('Your session has expired. Please sign out and try logging in again.');
        }
        // Retry the upsert
        const retry = await supabase.from('profiles').upsert(profileData);
        profileError = retry.error;
      }

      if (profileError) {
        console.error('Profile upsert failed:', profileError)
        throw profileError
      }

      // 2. ALSO store in auth user_metadata (this always works, no RLS issues)
      const { error: metaError } = await supabase.auth.updateUser({
        data: { profile_completed: true, first_name: firstName, last_name: lastName }
      })
      if (metaError) console.warn('Metadata update warning:', metaError)

      onComplete?.()
      navigate('/home', { replace: true })
      
    } catch (err) {
      console.error('CompleteProfile save error:', err)
      setError(err.message || 'An error occurred while saving your profile.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        <h1>Complete Your Profile</h1>
        <p>Please provide a few more details to continue.</p>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>First Name</label>
              <input 
                type="text" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="John"
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px',
                  border: '1px solid var(--border-color)', background: 'rgba(15, 23, 42, 0.5)', color: '#fff', fontSize: '1rem'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Last Name</label>
              <input 
                type="text" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="Doe"
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px',
                  border: '1px solid var(--border-color)', background: 'rgba(15, 23, 42, 0.5)', color: '#fff', fontSize: '1rem'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Phone Number
            </label>
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(15, 23, 42, 0.5)',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Select Your Team *
            </label>
            
            {teams.length === 0 ? (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No teams available yet. An admin needs to create them.</p>
            ) : (
              <select 
                value={selectedTeamId}
                onChange={(e) => handleTeamSelect(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(15, 23, 42, 0.5)',
                  color: '#fff',
                  fontSize: '1rem'
                }}
              >
                <option value="" disabled>Select a Team</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            )}
          </div>

          <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Saving...' : 'Save Profile & Continue'}
          </button>
          
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button 
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/', { replace: true });
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Sign out and try again
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
