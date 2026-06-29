import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { MapPin, Wifi, CheckCircle, AlertTriangle, Clock, Map } from 'lucide-react'


// Haversine formula to calculate distance between two coordinates
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const d = R * c; 
  return d;
}

export default function Attendance({ user }) {
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  
  const [profile, setProfile] = useState(null)
  const [todayLog, setTodayLog] = useState(null)
  const [officeLocations, setOfficeLocations] = useState([])
  const [officeIps, setOfficeIps] = useState([])
  
  const [ipStatus, setIpStatus] = useState('pending') // pending, success, fail
  const [gpsStatus, setGpsStatus] = useState('pending')
  const [currentIp, setCurrentIp] = useState('')
  const [currentLocation, setCurrentLocation] = useState(null)
  
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  
  const [showExceptionForm, setShowExceptionForm] = useState(false)
  const [exceptionReason, setExceptionReason] = useState('')
  const [pendingAction, setPendingAction] = useState('in')

  // Check if user is whitelisted
  const isWhitelisted = user?.email === 'user1@gmail.com' || user?.email === 'signatureglobalconferences@gmail.com' || user?.email === 'testadmin@example.com'

  useEffect(() => {
    if (!isWhitelisted) {
      setLoading(false)
      return
    }

    async function loadInitialData() {
      try {
        const [profileRes, logRes, locRes, ipRes] = await Promise.all([
          supabase.from('profiles').select('require_gps_attendance, require_ip_attendance, wfh_enabled').eq('id', user.id).single(),
          supabase.from('attendance_logs').select('*').eq('user_id', user.id).eq('attendance_date', new Date().toISOString().split('T')[0]).maybeSingle(),
          supabase.from('office_locations').select('*').eq('is_active', true),
          supabase.from('office_ips').select('*')
        ])

        if (profileRes.error) throw profileRes.error
        
        // Defaults to true if null in DB
        const pData = profileRes.data
        if (pData.require_gps_attendance === null) pData.require_gps_attendance = true
        if (pData.require_ip_attendance === null) pData.require_ip_attendance = true
        setProfile(pData)
        setOfficeLocations(locRes.data || [])
        setOfficeIps(ipRes.data || [])

        if (logRes.data) {
          setTodayLog(logRes.data)
        }
      } catch (err) {
        console.error('Error loading attendance data:', err)
        setErrorMsg('Failed to load attendance profile.')
      } finally {
        setLoading(false)
      }
    }
    loadInitialData()
  }, [user.id, isWhitelisted])

  const runChecks = async (action = 'in') => {
    setPendingAction(action)
    setChecking(true)
    setErrorMsg('')
    setSuccessMsg('')
    setIpStatus('pending')
    setGpsStatus('pending')
    setShowExceptionForm(false)

    let ipPassed = true
    let gpsPassed = true

    let fetchedIp = ''
    let fetchedLocation = null
    let validLocations = []

    // 1. GPS Check
    if (profile?.require_gps_attendance) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
        })
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        fetchedLocation = { lat, lng }
        setCurrentLocation({ lat, lng })
        
        if (profile.wfh_enabled || officeLocations.length === 0) {
          setGpsStatus('skipped')
          validLocations = [...officeLocations] // WFH bypasses, so any IP (if required) can technically pass, though usually IP is also bypassed
        } else {
          for (const loc of officeLocations) {
            const distance = getDistanceFromLatLonInMeters(lat, lng, loc.latitude, loc.longitude)
            if (distance <= (loc.radius_meters || 300)) {
              validLocations.push(loc)
            }
          }
          if (validLocations.length > 0) {
            setGpsStatus('success')
          } else {
            setGpsStatus('fail')
            gpsPassed = false
          }
        }
      } catch (err) {
        console.error('GPS error:', err)
        if (!profile.wfh_enabled) {
          setGpsStatus('fail')
          gpsPassed = false
        }
      }
    } else {
      setGpsStatus('skipped')
      validLocations = [...officeLocations] // If GPS is not required, any active location's IP is allowed
    }

    // 2. IP Check
    if (profile?.require_ip_attendance) {
      try {
        const res = await fetch('https://api.ipify.org?format=json')
        const data = await res.json()
        fetchedIp = data.ip
        setCurrentIp(data.ip)
        
        if (profile.wfh_enabled || officeLocations.length === 0) {
          setIpStatus('skipped')
        } else {
          // Determine allowed IPs based on valid locations
          let isAllowedIp = false
          for (const loc of validLocations) {
            const locIps = officeIps.filter(ip => ip.location_id === loc.id)
            if (locIps.some(ipConfig => ipConfig.ip_address.split(',').map(i => i.trim()).includes(data.ip))) {
              isAllowedIp = true
              break
            }
          }
          
          if (isAllowedIp) {
            setIpStatus('success')
          } else {
            setIpStatus('fail')
            ipPassed = false
          }
        }
      } catch (err) {
        console.error('IP fetch error:', err)
        if (!profile.wfh_enabled) {
          setIpStatus('fail')
          ipPassed = false
        }
      }
    } else {
      setIpStatus('skipped')
    }

    setChecking(false)

    if (!ipPassed || !gpsPassed) {
      setShowExceptionForm(true)
    } else {
      if (action === 'in') {
        handleCheckIn(false, fetchedIp, fetchedLocation)
      } else {
        handleCheckOut(false, fetchedIp, fetchedLocation)
      }
    }
  }

  const handleCheckIn = async (isException = false, overrideIp = currentIp, overrideLocation = currentLocation) => {
    setChecking(true)
    setErrorMsg('')
    
    if (isException && !exceptionReason.trim()) {
      setErrorMsg('Please provide a reason for the exception.')
      setChecking(false)
      return
    }

    try {
      const logData = {
        user_id: user.id,
        check_in_time: new Date().toISOString(),
        latitude: overrideLocation?.lat || null,
        longitude: overrideLocation?.lng || null,
        ip_address: overrideIp || null,
        status: isException ? 'pending_approval' : 'present',
        exception_reason: isException ? exceptionReason : null
      }

      const { data, error } = await supabase.from('attendance_logs').insert([logData]).select().single()
      
      if (error) throw error
      
      setTodayLog(data)
      setSuccessMsg(isException ? 'Exception request submitted. Waiting for manager approval.' : 'Punched in successfully!')
      setShowExceptionForm(false)
    } catch (err) {
      console.error('Punch-in error:', err)
      setErrorMsg(err.message || 'Failed to punch in.')
    } finally {
      setChecking(false)
    }
  }

  const handleCheckOut = async (isException = false, overrideIp = currentIp, overrideLocation = currentLocation) => {
    if (!todayLog) return
    setChecking(true)
    setErrorMsg('')
    
    if (isException && !exceptionReason.trim()) {
      setErrorMsg('Please provide a reason for the exception.')
      setChecking(false)
      return
    }

    try {
      const updates = { check_out_time: new Date().toISOString() }
      
      if (isException) {
        updates.status = 'pending_approval'
        updates.exception_reason = todayLog.exception_reason 
          ? `${todayLog.exception_reason} | Punch-out exception: ${exceptionReason}`
          : `Punch-out exception: ${exceptionReason}`
      }

      const { data, error } = await supabase
        .from('attendance_logs')
        .update(updates)
        .eq('id', todayLog.id)
        .select()
        .single()
        
      if (error) throw error
      setTodayLog(data)
      setSuccessMsg(isException ? 'Punch-out exception requested!' : 'Punched out successfully!')
      setShowExceptionForm(false)
    } catch (err) {
      console.error('Punch-out error:', err)
      setErrorMsg('Failed to punch out.')
    } finally {
      setChecking(false)
    }
  }

  if (!isWhitelisted) {
    return (
      <div className="apple-card" style={{ padding: '40px', textAlign: 'center', marginTop: '40px' }}>
        <AlertTriangle size={48} style={{ color: '#f59e0b', margin: '0 auto 16px' }} />
        <h2 className="apple-title-large">Coming Soon</h2>
        <p style={{ color: 'var(--apple-text-secondary)' }}>Attendance tracking is currently in beta and not enabled for your account yet.</p>
      </div>
    )
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Attendance...</div>

  const isCheckedIn = !!todayLog?.check_in_time
  const isCheckedOut = !!todayLog?.check_out_time

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      <h1 className="apple-title-large" style={{ marginBottom: '8px' }}>Daily Attendance</h1>
      <p style={{ color: 'var(--apple-text-secondary)', marginBottom: '32px' }}>Track your daily punch-ins and working hours.</p>

      {errorMsg && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '12px', fontSize: '0.9rem', marginBottom: '24px' }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '12px 16px', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', color: '#4ade80', borderRadius: '12px', fontSize: '0.9rem', marginBottom: '24px' }}>
          {successMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '24px' }}>
        
        {/* Status Card */}
        <div className="apple-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Clock size={48} style={{ color: isCheckedOut ? '#94a3b8' : isCheckedIn ? '#4ade80' : '#38bdf8', marginBottom: '16px' }} />
          <h2 className="apple-title-large" style={{ marginBottom: '8px' }}>
            {isCheckedOut ? 'Shift Completed' : isCheckedIn ? 'Currently Punched In' : 'Not Punched In'}
          </h2>
          
          {todayLog && (
            <div style={{ display: 'flex', gap: '20px', marginTop: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--apple-border)', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>In</span>
                <strong style={{ fontSize: '1.2rem', color: '#fff' }}>{new Date(todayLog.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
              </div>
              <div style={{ width: '1px', background: 'var(--apple-border)' }} />
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Out</span>
                <strong style={{ fontSize: '1.2rem', color: '#fff' }}>{todayLog.check_out_time ? new Date(todayLog.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</strong>
              </div>
            </div>
          )}

          {todayLog?.status === 'pending_approval' && (
            <div style={{ marginTop: '16px', padding: '8px 12px', background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={14} /> Pending Manager Approval (Exception)
            </div>
          )}

          {!isCheckedIn && !checking && !showExceptionForm && (
            <button onClick={() => runChecks('in')} className="apple-btn apple-btn-primary" style={{ marginTop: '24px', width: '100%', padding: '14px', fontSize: '1rem' }}>
              Verify & Punch In
            </button>
          )}

          {isCheckedIn && !isCheckedOut && !showExceptionForm && (
            <button onClick={() => runChecks('out')} disabled={checking} className="apple-btn" style={{ marginTop: '24px', width: '100%', padding: '14px', fontSize: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              {checking ? 'Processing...' : 'Verify & Punch Out'}
            </button>
          )}
        </div>

        {/* Verification Checks Panel (Only show when checking in or failed) */}
        {(!isCheckedIn || showExceptionForm) && (ipStatus !== 'pending' || gpsStatus !== 'pending' || checking) && (
          <div className="apple-card" style={{ padding: '24px' }}>
            <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>Verification Checks</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* IP Check */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wifi size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#fff' }}>Office Network</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>
                    {profile?.wfh_enabled ? 'Not required (WFH bypass enabled)' : profile?.require_ip_attendance ? 'Must be connected to an office Wi-Fi' : 'Not required for your profile'}
                  </p>
                  {currentIp && <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: ipStatus === 'fail' ? '#ef4444' : '#94a3b8' }}>Detected IP: {currentIp}</p>}
                </div>
                <div>
                  {ipStatus === 'pending' && checking && <span style={{ color: 'var(--apple-text-secondary)' }}>Checking...</span>}
                  {ipStatus === 'skipped' && <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>SKIPPED</span>}
                  {ipStatus === 'success' && <CheckCircle style={{ color: '#4ade80' }} size={24} />}
                  {ipStatus === 'fail' && <AlertTriangle style={{ color: '#ef4444' }} size={24} />}
                </div>
              </div>

              {/* GPS Check */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#fff' }}>Office Location</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>
                    {profile?.wfh_enabled ? 'Not required (WFH bypass enabled)' : profile?.require_gps_attendance ? 'Must be physically at an office location' : 'Not required for your profile'}
                  </p>
                  {currentLocation && <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: gpsStatus === 'fail' ? '#ef4444' : '#94a3b8' }}>Detected: {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}</p>}
                </div>
                <div>
                  {gpsStatus === 'pending' && checking && <span style={{ color: 'var(--apple-text-secondary)' }}>Checking...</span>}
                  {gpsStatus === 'skipped' && <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>SKIPPED</span>}
                  {gpsStatus === 'success' && <CheckCircle style={{ color: '#4ade80' }} size={24} />}
                  {gpsStatus === 'fail' && <AlertTriangle style={{ color: '#ef4444' }} size={24} />}
                </div>
              </div>

            </div>

            {/* Success State is now handled automatically via auto-checkin */}

            {/* Exception Form */}
            {showExceptionForm && (
              <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={16} /> Verification Failed
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '16px' }}>
                  It looks like you didn't pass the required network or location checks. You can still request to punch {pendingAction} by providing a valid reason.
                </p>
                <textarea
                  className="apple-input"
                  placeholder="E.g., I am at a client site today, or office Wi-Fi is down..."
                  value={exceptionReason}
                  onChange={(e) => setExceptionReason(e.target.value)}
                  rows={3}
                  style={{ width: '100%', marginBottom: '16px', resize: 'vertical' }}
                />
                <button onClick={() => pendingAction === 'in' ? handleCheckIn(true) : handleCheckOut(true)} disabled={checking} className="apple-btn" style={{ width: '100%', background: '#ef4444', color: '#fff', border: 'none' }}>
                  {checking ? 'Submitting...' : `Request Exception & Punch ${pendingAction === 'in' ? 'In' : 'Out'}`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
