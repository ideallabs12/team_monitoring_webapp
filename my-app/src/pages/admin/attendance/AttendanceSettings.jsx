import React, { useState, useEffect } from 'react'
import { supabase } from '../../../supabaseClient'
import { MapPin, Plus, Trash2, Check, X, Pencil, Users, Camera, Calendar } from 'lucide-react'

const AppleToggle = ({ checked, onChange }) => {
  return (
    <div 
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      style={{
        width: '44px',
        height: '24px',
        background: checked ? '#34c759' : 'rgba(120, 120, 128, 0.32)',
        borderRadius: '12px',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.3s ease',
        flexShrink: 0
      }}
    >
      <div 
        style={{
          width: '20px',
          height: '20px',
          background: '#fff',
          borderRadius: '50%',
          position: 'absolute',
          top: '2px',
          left: checked ? '22px' : '2px',
          transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
      />
    </div>
  )
}

export default function AttendanceSettings() {
  const [locations, setLocations] = useState([])
  const [teams, setTeams] = useState([])
  const [systemSettings, setSystemSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  // Photo Cleanup state
  const [cleanupMonth, setCleanupMonth] = useState(new Date().getMonth())
  const [cleanupYear, setCleanupYear] = useState(new Date().getFullYear())
  const [cleaningUp, setCleaningUp] = useState(false)

  // Location form
  const [locName, setLocName] = useState('')
  const [locLat, setLocLat] = useState('')
  const [locLng, setLocLng] = useState('')
  const [locRadius, setLocRadius] = useState('300')

  // Editing state
  const [editingLoc, setEditingLoc] = useState(null)
  const [editLocName, setEditLocName] = useState('')
  const [editLocRadius, setEditLocRadius] = useState('')
  const [editLocLat, setEditLocLat] = useState('')
  const [editLocLng, setEditLocLng] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    const [locRes, teamsRes, settingsRes] = await Promise.all([
      supabase.from('office_locations').select('*').order('created_at', { ascending: true }),
      supabase.from('teams').select('id, name, attendance_enabled').order('name', { ascending: true }),
      supabase.from('system_settings').select('*').eq('id', 1).single()
    ])
    if (locRes.data) setLocations(locRes.data)
    if (teamsRes.data) setTeams(teamsRes.data)
    if (settingsRes.data) setSystemSettings(settingsRes.data)
    setLoading(false)
  }

  const toggleTeamAttendance = async (id, currentStatus) => {
    const { error } = await supabase.from('teams').update({ attendance_enabled: !currentStatus }).eq('id', id)
    if (!error) {
      setTeams(teams.map(t => t.id === id ? { ...t, attendance_enabled: !currentStatus } : t))
    } else {
      alert('Failed to update team attendance setting')
    }
  }

  const toggleGlobalSelfie = async () => {
    if (!systemSettings) return
    const nextStatus = !systemSettings.attendance_require_selfie
    const { error } = await supabase.from('system_settings').update({ attendance_require_selfie: nextStatus }).eq('id', 1)
    if (!error) {
      setSystemSettings({ ...systemSettings, attendance_require_selfie: nextStatus })
    } else {
      alert('Failed to update selfie setting')
    }
  }

  const handlePhotoCleanup = async () => {
    const confirmDelete = window.confirm(`Are you sure you want to delete all attendance photos for ${cleanupMonth + 1}/${cleanupYear}? This action cannot be undone.`)
    if (!confirmDelete) return

    setCleaningUp(true)
    try {
      // Month is 0-indexed in JS, but 1-indexed in our folder structure YYYY-MM
      const formattedMonth = String(cleanupMonth + 1).padStart(2, '0')
      const folderPrefix = `${cleanupYear}-${formattedMonth}/`

      // Supabase storage list is not recursive by default, so we might need to list folders (days) first, or we can just list with wildcard if they add it.
      // Easiest is to list all days in the month (01 to 31)
      let deletedCount = 0;
      
      for (let day = 1; day <= 31; day++) {
        const dayStr = String(day).padStart(2, '0')
        const dayFolder = `${folderPrefix}${dayStr}/`
        
        const { data: files, error: listError } = await supabase.storage.from('attendance').list(dayFolder, { limit: 1000 })
        if (listError) continue;
        
        if (files && files.length > 0) {
          const filesToDelete = files.map(f => `${dayFolder}${f.name}`)
          const { error: delError } = await supabase.storage.from('attendance').remove(filesToDelete)
          if (!delError) deletedCount += files.length
        }
      }
      
      alert(`Successfully deleted ${deletedCount} photos for ${formattedMonth}/${cleanupYear}.`)
    } catch (err) {
      console.error('Cleanup error:', err)
      alert('An error occurred during cleanup.')
    } finally {
      setCleaningUp(false)
    }
  }

  const addLocation = async (e) => {
    e.preventDefault()
    const { data, error } = await supabase
      .from('office_locations')
      .insert({ name: locName, latitude: parseFloat(locLat), longitude: parseFloat(locLng), radius_meters: parseInt(locRadius) })
      .select()
    if (!error && data) {
      setLocations([...locations, ...data])
      setLocName(''); setLocLat(''); setLocLng(''); setLocRadius('300')
    } else {
      alert('Error adding location')
    }
  }

  const deleteLocation = async (id) => {
    await supabase.from('office_locations').delete().eq('id', id)
    setLocations(locations.filter(l => l.id !== id))
  }

  const startEditLoc = (loc) => {
    setEditingLoc(loc.id)
    setEditLocName(loc.name)
    setEditLocRadius(loc.radius_meters)
    setEditLocLat(loc.latitude)
    setEditLocLng(loc.longitude)
  }

  const saveEditLoc = async (id) => {
    const radius = parseInt(editLocRadius) || 300
    const lat = parseFloat(editLocLat)
    const lng = parseFloat(editLocLng)
    const { error } = await supabase.from('office_locations').update({ name: editLocName, radius_meters: radius, latitude: lat, longitude: lng }).eq('id', id)
    if (!error) {
      setLocations(locations.map(l => l.id === id ? { ...l, name: editLocName, radius_meters: radius, latitude: lat, longitude: lng } : l))
      setEditingLoc(null)
    } else {
      alert('Error updating location')
    }
  }

  const toggleLocationActive = async (id, currentStatus) => {
    const { error } = await supabase.from('office_locations').update({ is_active: !currentStatus }).eq('id', id)
    if (!error) {
      setLocations(locations.map(l => l.id === id ? { ...l, is_active: !currentStatus } : l))
    }
  }

  if (loading) return <div>Loading settings...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      
      {/* SECTION: Global Settings */}
      <div>
        <h2 className="apple-title-medium" style={{ marginBottom: '16px' }}>Global Settings</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: '24px' }}>
          
          <div className="apple-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(52, 199, 89, 0.1)', color: '#34c759', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Camera size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: '600' }}>Selfie Verification</h3>
                  {systemSettings && (
                    <AppleToggle 
                      checked={!!systemSettings.attendance_require_selfie} 
                      onChange={toggleGlobalSelfie} 
                    />
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--apple-text-secondary)', lineHeight: '1.5' }}>
                  When enabled, all users will be prompted to capture and upload a selfie after their GPS location is verified. This adds an extra layer of presence verification.
                </p>
              </div>
            </div>
          </div>
          
          {/* Storage Cleanup */}
          <div className="apple-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#fff', fontWeight: '600' }}>Photo Cleanup</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', lineHeight: '1.5' }}>
                  Delete old selfie photos to save storage space. This removes the image files from the bucket but keeps the attendance timestamp logs intact.
                </p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={cleanupMonth}
                    onChange={e => setCleanupMonth(Number(e.target.value))}
                    className="apple-form-control"
                    style={{ padding: '8px 12px', fontSize: '0.9rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                  >
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                      <option key={m} value={i}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={cleanupYear}
                    onChange={e => setCleanupYear(Number(e.target.value))}
                    className="apple-form-control"
                    style={{ padding: '8px 12px', fontSize: '0.9rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <button 
                    onClick={handlePhotoCleanup}
                    disabled={cleaningUp}
                    className="apple-btn"
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {cleaningUp ? 'Processing...' : 'Delete Photos'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* SECTION: Office Locations */}
      <div>
        <h2 className="apple-title-medium" style={{ marginBottom: '16px' }}>Office Locations</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: '24px' }}>
          
          {/* Office Locations List */}
          {locations.map(loc => {
            const isEditing = editingLoc === loc.id;
            
            return (
              <div key={loc.id} className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isEditing ? '#ec4899' : 'var(--apple-text-secondary)' }}>
                    {isEditing ? <Pencil size={18} /> : <MapPin size={18} style={{ color: '#ec4899' }} />} 
                    <span style={{ fontSize: '1rem', fontWeight: '600', opacity: loc.is_active ? 1 : 0.5, textDecoration: (!isEditing && !loc.is_active) ? 'line-through' : 'none' }}>
                      {isEditing ? 'Editing Location' : 'Location Details'}
                    </span>
                  </div>
                  {!isEditing && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <AppleToggle checked={loc.is_active} onChange={() => toggleLocationActive(loc.id, loc.is_active)} />
                      <button onClick={() => startEditLoc(loc)} style={{ background: 'none', border: 'none', color: 'var(--apple-text-secondary)', cursor: 'pointer', padding: '4px' }}><Pencil size={16} /></button>
                      <button onClick={() => deleteLocation(loc.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '6px', borderRadius: '8px', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', paddingLeft: '4px' }}>Location Name</span>
                    <input 
                      className="apple-input" 
                      placeholder="Location Name" 
                      value={isEditing ? editLocName : loc.name} 
                      onChange={e => setEditLocName(e.target.value)} 
                      readOnly={!isEditing}
                      style={{ opacity: isEditing ? 1 : 0.8, cursor: isEditing ? 'text' : 'default' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', paddingLeft: '4px' }}>Latitude</span>
                      <input className="apple-input" type="number" step="any" placeholder="Latitude" value={isEditing ? editLocLat : loc.latitude} onChange={e => setEditLocLat(e.target.value)} readOnly={!isEditing} style={{ width: '100%', opacity: isEditing ? 1 : 0.8, cursor: isEditing ? 'text' : 'default' }} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', paddingLeft: '4px' }}>Longitude</span>
                      <input className="apple-input" type="number" step="any" placeholder="Longitude" value={isEditing ? editLocLng : loc.longitude} onChange={e => setEditLocLng(e.target.value)} readOnly={!isEditing} style={{ width: '100%', opacity: isEditing ? 1 : 0.8, cursor: isEditing ? 'text' : 'default' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', paddingLeft: '4px' }}>Radius (meters)</span>
                    <input className="apple-input" type="number" placeholder="Radius" value={isEditing ? editLocRadius : loc.radius_meters} onChange={e => setEditLocRadius(e.target.value)} readOnly={!isEditing} style={{ opacity: isEditing ? 1 : 0.8, cursor: isEditing ? 'text' : 'default' }} />
                  </div>
                  
                  {isEditing && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button onClick={() => saveEditLoc(loc.id)} className="apple-btn apple-btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}><Check size={16} /> Save</button>
                      <button onClick={() => setEditingLoc(null)} className="apple-btn" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)' }}><X size={16} /> Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add New Location Card */}
          <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', borderStyle: 'dashed', background: 'rgba(255,255,255,0.01)' }}>
            <h3 className="apple-title-small" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--apple-text-secondary)' }}>
              <Plus size={18} /> Add New Location
            </h3>
            <form onSubmit={addLocation} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input className="apple-input" placeholder="Location Name (e.g. Hyderabad Office)" value={locName} onChange={e => setLocName(e.target.value)} required />
              <div style={{ display: 'flex', gap: '12px' }}>
                <input className="apple-input" type="number" step="any" placeholder="Latitude" value={locLat} onChange={e => setLocLat(e.target.value)} required style={{ flex: 1 }} />
                <input className="apple-input" type="number" step="any" placeholder="Longitude" value={locLng} onChange={e => setLocLng(e.target.value)} required style={{ flex: 1 }} />
              </div>
              <input className="apple-input" type="number" placeholder="Allowed Radius (meters)" value={locRadius} onChange={e => setLocRadius(e.target.value)} required />
              <button type="submit" className="apple-btn apple-btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}><Plus size={16} /> Create Location</button>
            </form>
          </div>
        </div>
      </div>

      {/* SECTION: Team Attendance Access */}
      <div>
        <h2 className="apple-title-medium" style={{ marginBottom: '16px' }}>Team Access</h2>
        <p style={{ color: 'var(--apple-text-secondary)', marginBottom: '16px' }}>Enable or disable attendance features for specific teams. Users in disabled teams will not see the attendance widget or page.</p>
        <div className="apple-card" style={{ padding: '0' }}>
          {teams.map((team, index) => (
            <div key={team.id} style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
              padding: '16px 24px', 
              borderBottom: index < teams.length - 1 ? '1px solid var(--apple-border)' : 'none' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Users size={18} style={{ color: 'var(--apple-text-secondary)' }} />
                <span style={{ fontWeight: '500', color: '#fff', fontSize: '1rem' }}>{team.name}</span>
              </div>
              <AppleToggle checked={team.attendance_enabled} onChange={() => toggleTeamAttendance(team.id, team.attendance_enabled)} />
            </div>
          ))}
          {teams.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>No teams found.</div>
          )}
        </div>
      </div>

    </div>
  )
}
