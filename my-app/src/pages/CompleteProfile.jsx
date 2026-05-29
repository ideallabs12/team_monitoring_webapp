import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function CompleteProfile({ user }) {
  const navigate = useNavigate()
  
  // Try to pre-fill from Google if available
  const [firstName, setFirstName] = useState(user?.user_metadata?.given_name || '')
  const [lastName, setLastName] = useState(user?.user_metadata?.family_name || '')
  
  const [phone, setPhone] = useState('')
  const [teams, setTeams] = useState([])
  
  // New logic for asking how many teams
  const [numTeams, setNumTeams] = useState(1)
  const [selectedTeams, setSelectedTeams] = useState(['']) // Array of team IDs
  
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

  const handleNumTeamsChange = (e) => {
    let val = parseInt(e.target.value) || 0
    if (val < 0) val = 0
    if (val > 2) val = 2 // cap at 2
    setNumTeams(val)
    
    setSelectedTeams(prev => {
      const newArr = [...prev]
      if (val < newArr.length) return newArr.slice(0, val)
      while (newArr.length < val) newArr.push('')
      return newArr
    })
  }

  const handleTeamSelect = (index, value) => {
    const newArr = [...selectedTeams]
    newArr[index] = value
    setSelectedTeams(newArr)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate team selections
    const validTeams = selectedTeams.filter(t => t !== '')
    if (numTeams > 0 && validTeams.length !== numTeams) {
      setError('Please select a team for all dropdowns, or reduce the number of teams.')
      setLoading(false)
      return
    }
    if (validTeams.length > 2) {
      setError('You cannot belong to more than 2 teams.')
      setLoading(false)
      return
    }

    try {
      // 1. Insert/Update Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          email: user.email,
          phone: phone,
          profile_completed: true
        })

      if (profileError) {
        console.error('Profile upsert failed:', profileError)
        throw profileError
      }

      // 2. ALSO store in auth user_metadata (this always works, no RLS issues)
      const { error: metaError } = await supabase.auth.updateUser({
        data: { profile_completed: true, first_name: firstName, last_name: lastName }
      })
      if (metaError) console.warn('Metadata update warning:', metaError)

      // 3. Clear old team memberships first (prevents stacking)
      const { error: deleteError } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', user.id)

      if (deleteError) console.warn('Team cleanup warning:', deleteError)

      // 4. Insert fresh team memberships
      if (validTeams.length > 0) {
        const uniqueTeams = [...new Set(validTeams)]
        
        const teamMemberships = uniqueTeams.map(teamId => ({
          user_id: user.id,
          team_id: teamId
        }))

        const { error: teamError } = await supabase
          .from('team_members')
          .insert(teamMemberships)

        if (teamError) throw teamError
      }

      // Success — full page reload to re-run session check
      window.location.href = '/home'
      
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
              How many teams do you belong to? (Max 2)
            </label>
            <input 
              type="number" 
              min="0"
              max={Math.min(2, teams.length)}
              value={numTeams}
              onChange={handleNumTeamsChange}
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

          {numTeams > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Select Your Teams
              </label>
              
              {teams.length === 0 ? (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No teams available yet. An admin needs to create them.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedTeams.map((selectedId, index) => (
                    <select 
                      key={index}
                      value={selectedId}
                      onChange={(e) => handleTeamSelect(index, e.target.value)}
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
                      <option value="" disabled>Select Team #{index + 1}</option>
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  ))}
                </div>
              )}
            </div>
          )}

          <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Saving...' : 'Save Profile & Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
