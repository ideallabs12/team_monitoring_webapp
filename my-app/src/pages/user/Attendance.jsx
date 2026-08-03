import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'
import { MapPin, CheckCircle, AlertTriangle, Clock, Calendar, ChevronLeft, ChevronRight, Camera } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'

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
  const { featureAccess } = useOutletContext() || {}
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  
  const [profile, setProfile] = useState(null)
  const [todayLog, setTodayLog] = useState(null)
  const [officeLocations, setOfficeLocations] = useState([])
  
  const [gpsStatus, setGpsStatus] = useState('pending')
  const [currentLocation, setCurrentLocation] = useState(null)
  
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  
  const [showExceptionForm, setShowExceptionForm] = useState(false)
  const [exceptionReason, setExceptionReason] = useState('')
  const [pendingAction, setPendingAction] = useState('in')

  // My Logs Feature State
  const [activeTab, setActiveTab] = useState('daily') // 'daily' or 'logs'
  const [currentDate, setCurrentDate] = useState(new Date())
  const [monthlyLogs, setMonthlyLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  
  // Selfie Verification State
  const [selfieEnabled, setSelfieEnabled] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [useNativeCamera, setUseNativeCamera] = useState(false)
  const [selfieFile, setSelfieFile] = useState(null)
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState(null)
  const [uploadingSelfie, setUploadingSelfie] = useState(false)
  
  // Live Camera Refs
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  
  // Swipe State
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const minSwipeDistance = 50

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [profileRes, logRes, locRes] = await Promise.all([
          supabase.from('profiles').select('require_gps_attendance, wfh_enabled, teams!profiles_team_id_fkey(attendance_enabled)').eq('id', user.id).single(),
          supabase.from('attendance_logs').select('*').eq('user_id', user.id).eq('attendance_date', new Date().toISOString().split('T')[0]).maybeSingle(),
          supabase.from('office_locations').select('*').eq('is_active', true)
        ])

        if (profileRes.error) throw profileRes.error
        
        // Defaults to true if null in DB
        const pData = profileRes.data
        if (pData.require_gps_attendance === null) pData.require_gps_attendance = true
        setProfile(pData)
        setOfficeLocations(locRes.data || [])

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

    const todayDate = new Date().toISOString().split('T')[0]
    const channel = supabase.channel(`attendance_logs_page_${user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'attendance_logs',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        if (payload.new && payload.new.attendance_date === todayDate) {
          setTodayLog(payload.new)
        }
      })
      .subscribe()

    const teamsChannel = supabase.channel(`attendance_page_teams_${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams' }, () => {
        supabase.from('profiles').select('require_gps_attendance, wfh_enabled, teams!profiles_team_id_fkey(attendance_enabled)').eq('id', user.id).single()
          .then(({ data }) => { if (data) setProfile(data) })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(teamsChannel)
    }
  }, [user.id])

  // Camera Management
  useEffect(() => {
    if (showCamera && !selfiePreviewUrl) {
      startCamera()
    }
    return () => {
      stopCamera()
    }
  }, [showCamera, selfiePreviewUrl])

  const startCamera = async () => {
    // Force native camera for 100% reliability across all mobile devices
    setUseNativeCamera(true)
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }

  const takeLiveSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      // Ensure dimensions are valid before capturing
      if (video.videoWidth === 0 || video.videoHeight === 0) return;
      
      // Carefully compress image to save storage
      const MAX_WIDTH = 640; // Max width for a selfie is plenty for verification
      let targetWidth = video.videoWidth;
      let targetHeight = video.videoHeight;
      
      if (targetWidth > MAX_WIDTH) {
        const ratio = MAX_WIDTH / targetWidth;
        targetWidth = MAX_WIDTH;
        targetHeight = targetHeight * ratio;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight)
      
      // Apply 0.7 JPEG quality compression
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' })
          setSelfieFile(file)
          setSelfiePreviewUrl(URL.createObjectURL(file))
          stopCamera()
        }
      }, 'image/jpeg', 0.7)
    }
  }

  const retakeLiveSelfie = () => {
    setSelfieFile(null)
    setSelfiePreviewUrl(null)
    // startCamera will be triggered automatically by the useEffect
  }

  const cancelSelfie = () => {
    stopCamera()
    setShowCamera(false)
    setChecking(false)
  }

  const captureSelfie = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelfieFile(file);
      setSelfiePreviewUrl(URL.createObjectURL(file));
    }
  };

  // Fetch Monthly Logs
  useEffect(() => {
    if (activeTab === 'logs') {
      fetchMonthlyLogs()
    }
  }, [activeTab, currentDate, user.id])

  const fetchMonthlyLogs = async () => {
    if (!user) return
    setLoadingLogs(true)
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      
      const startDate = new Date(year, month, 1)
      const endDate = new Date(year, month + 1, 0, 23, 59, 59)
      
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('attendance_date', startDate.toISOString())
        .lte('attendance_date', endDate.toISOString())
        .order('attendance_date', { ascending: false })
        
      if (error) throw error
      setMonthlyLogs(data || [])
    } catch (err) {
      console.error('Error fetching monthly logs:', err)
    } finally {
      setLoadingLogs(false)
    }
  }

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }
  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }
  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX)
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    if (distance > minSwipeDistance) handleNextMonth() // swipe left = next month
    if (distance < -minSwipeDistance) handlePrevMonth() // swipe right = prev month
  }

  const getTimingStatus = (log) => {
    const statuses = []
    const inTime = new Date(log.check_in_time)
    const inMinutes = inTime.getHours() * 60 + inTime.getMinutes()
    if (inMinutes > 580) { // 9:40 AM
      statuses.push({ label: 'Late', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' })
    }
    if (log.check_out_time) {
      const outTime = new Date(log.check_out_time)
      const outMinutes = outTime.getHours() * 60 + outTime.getMinutes()
      if (outMinutes < 1080) { // 6:00 PM
        statuses.push({ label: 'Early Leave', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' })
      }
    }
    return statuses
  }

  const runChecks = async (action = 'in') => {
    setPendingAction(action)
    setChecking(true)
    setErrorMsg('')
    setSuccessMsg('')
    setGpsStatus('pending')
    setShowExceptionForm(false)
    setShowCamera(false)
    setSelfieFile(null)
    setSelfiePreviewUrl(null)
    stopCamera()

    let gpsPassed = true
    let fetchedLocation = null
    let validLocations = []

    if (profile?.require_gps_attendance) {
      try {
        let position;
        // If WFH is enabled or no office locations exist, bypass GPS completely to save time
        if (profile.wfh_enabled || officeLocations.length === 0) {
          position = { coords: { latitude: null, longitude: null } };
        } else {
          try {
            // Try high accuracy (GPS) first, but with a shorter timeout (5s)
            position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 })
            })
          } catch (err) {
            console.warn('High accuracy GPS failed/timed out, falling back to low accuracy...')
            // Fallback to low accuracy (Wi-Fi/IP based) which is usually instant and works indoors
            position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 })
            })
          }
        }
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        fetchedLocation = { lat, lng }
        setCurrentLocation({ lat, lng })
        
        if (profile.wfh_enabled || officeLocations.length === 0) {
          setGpsStatus('skipped')
          validLocations = [...officeLocations] 
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
      validLocations = [...officeLocations] 
    }

    // Fetch global setting for selfie in realtime
    let requireSelfie = false;
    try {
      const { data, error } = await supabase.from('system_settings').select('attendance_require_selfie').eq('id', 1).single();
      if (error) throw error;
      requireSelfie = !!data?.attendance_require_selfie;
      setSelfieEnabled(requireSelfie);
      
    } catch (e) {
      console.error("Failed to fetch selfie settings", e);
      setErrorMsg("Unable to verify selfie settings. " + (e.message || ""));
      setChecking(false);
      return; // Stop the punch-in process until this is resolved
    }

    setChecking(false)

    if (!gpsPassed) {
      setShowExceptionForm(true)
      if (requireSelfie) {
        setShowCamera(true) // Show camera even for exceptions
      }
    } else {
      if (requireSelfie) {
        setShowCamera(true) // Wait for user to capture selfie
      } else {
        if (action === 'in') {
          handleCheckIn(false, fetchedLocation)
        } else {
          handleCheckOut(false, fetchedLocation)
        }
      }
    }
  }

  const uploadSelfie = async () => {
    if (!selfieFile) return null;
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const monthStr = dateStr.substring(0, 7); // YYYY-MM
    const fileName = `${monthStr}/${dateStr.substring(8, 10)}/${user.id}_${Date.now()}.jpg`;
    
    const { data, error } = await supabase.storage
      .from('attendance')
      .upload(fileName, selfieFile, { contentType: selfieFile.type });
      
    if (error) throw error;
    
    const { data: publicData } = supabase.storage.from('attendance').getPublicUrl(fileName);
    return publicData.publicUrl;
  };

  const handleCheckIn = async (isException = false, overrideLocation = currentLocation) => {
    setChecking(true)
    setErrorMsg('')
    
    if (isException && exceptionReason.trim().length < 10) {
      setErrorMsg('Please provide a valid reason (minimum 10 characters).')
      setChecking(false)
      return
    }
    
    if (showCamera && !selfieFile) {
      setErrorMsg('Please capture a selfie before punching in.')
      setChecking(false)
      return
    }

    try {
      let selfieUrl = null;
      if (selfieFile) {
        setUploadingSelfie(true);
        selfieUrl = await uploadSelfie();
        setUploadingSelfie(false);
      }

      const logData = {
        user_id: user.id,
        check_in_time: new Date().toISOString(),
        latitude: overrideLocation?.lat || null,
        longitude: overrideLocation?.lng || null,
        status: 'present',
        exception_reason: isException ? exceptionReason : null,
        checkin_url: selfieUrl
      }

      const { data, error } = await supabase.from('attendance_logs').insert([logData]).select().single()
      
      if (error) throw error
      
      setTodayLog(data)
      setSuccessMsg(isException ? 'Exception recorded successfully!' : 'Punched in successfully!')
      setShowExceptionForm(false)
      setShowCamera(false)
      setSelfieFile(null)
      setSelfiePreviewUrl(null)
      stopCamera()
    } catch (err) {
      console.error('Punch-in error:', err)
      setErrorMsg(err.message || 'Failed to punch in.')
    } finally {
      setChecking(false)
    }
  }

  const handleCheckOut = async (isException = false, overrideLocation = currentLocation) => {
    if (!todayLog) return
    setChecking(true)
    setErrorMsg('')
    
    if (isException && exceptionReason.trim().length < 10) {
      setErrorMsg('Please provide a valid reason (minimum 10 characters).')
      setChecking(false)
      return
    }
    
    if (showCamera && !selfieFile) {
      setErrorMsg('Please capture a selfie before punching out.')
      setChecking(false)
      return
    }

    try {
      let selfieUrl = null;
      if (selfieFile) {
        setUploadingSelfie(true);
        selfieUrl = await uploadSelfie();
        setUploadingSelfie(false);
      }

      const updates = { check_out_time: new Date().toISOString() }
      
      // Store checkout selfie
      if (selfieUrl) {
        updates.checkout_url = selfieUrl;
      }
      
      if (isException) {
        updates.status = 'present'
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
      setSuccessMsg(isException ? 'Punch-out exception recorded!' : 'Punched out successfully!')
      setShowExceptionForm(false)
      setShowCamera(false)
      setSelfieFile(null)
      setSelfiePreviewUrl(null)
      stopCamera()
    } catch (err) {
      console.error('Punch-out error:', err)
      setErrorMsg('Failed to punch out.')
    } finally {
      setChecking(false)
    }
  }

  if (profile && profile.teams && !profile.teams.attendance_enabled) {
    return (
      <div className="apple-card" style={{ padding: '40px', textAlign: 'center', marginTop: '40px' }}>
        <AlertTriangle size={48} style={{ color: '#f59e0b', margin: '0 auto 16px' }} />
        <h2 className="apple-title-large">Restricted Access</h2>
        <p style={{ color: 'var(--apple-text-secondary)' }}>Attendance tracking is not enabled for your team.</p>
      </div>
    )
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Attendance...</div>

  const isCheckedIn = !!todayLog?.check_in_time
  const isCheckedOut = !!todayLog?.check_out_time

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 className="apple-title-large" style={{ marginBottom: '8px' }}>Attendance</h1>
          <p style={{ color: 'var(--apple-text-secondary)' }}>Track your daily punch-ins and view your logs.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setActiveTab('daily')}
            className="apple-btn"
            style={{ background: activeTab === 'daily' ? 'var(--apple-card)' : 'transparent', color: activeTab === 'daily' ? '#fff' : 'var(--apple-text-secondary)', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <MapPin size={16} /> Daily Check-In
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className="apple-btn"
            style={{ background: activeTab === 'logs' ? 'var(--apple-card)' : 'transparent', color: activeTab === 'logs' ? '#fff' : 'var(--apple-text-secondary)', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Calendar size={16} /> My Logs
          </button>
        </div>
      </div>

      {errorMsg && activeTab === 'daily' && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '12px', fontSize: '0.9rem', marginBottom: '24px' }}>
          {errorMsg}
        </div>
      )}
      {successMsg && activeTab === 'daily' && (
        <div style={{ padding: '12px 16px', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', color: '#4ade80', borderRadius: '12px', fontSize: '0.9rem', marginBottom: '24px' }}>
          {successMsg}
        </div>
      )}

      {activeTab === 'daily' ? (
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

            {!isCheckedIn && !checking && !showExceptionForm && !showCamera && (
              <button onClick={() => runChecks('in')} className="apple-btn apple-btn-primary" style={{ marginTop: '24px', width: '100%', padding: '14px', fontSize: '1rem' }}>
                Verify & Punch In
              </button>
            )}

            {isCheckedIn && !isCheckedOut && !showExceptionForm && !showCamera && (
              <button onClick={() => runChecks('out')} disabled={checking} className="apple-btn" style={{ marginTop: '24px', width: '100%', padding: '14px', fontSize: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                {checking ? 'Processing...' : 'Verify & Punch Out'}
              </button>
            )}
          </div>

          {showCamera && (
            <div className="apple-card" style={{ padding: '24px' }}>
              <h3 className="apple-title-small" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={18} /> Selfie Verification Required
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginBottom: '16px' }}>
                Please take a clear photo of yourself at your current location to proceed.
              </p>
              
              {!selfiePreviewUrl ? (
                useNativeCamera ? (
                  <div style={{ position: 'relative', width: '100%', height: '220px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="user" 
                      onChange={captureSelfie}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--apple-text-secondary)' }}>
                      <Camera size={32} />
                      <span>Tap to open camera</span>
                      <span style={{ fontSize: '0.75rem', marginTop: '4px' }}>(Native Camera)</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ animation: 'fadeIn 0.3s var(--apple-ease)' }}>
                    <div style={{ position: 'relative', width: '100%', height: '300px', background: '#000', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
                      <video 
                        ref={videoRef}
                        autoPlay 
                        playsInline 
                        muted 
                        onLoadedMetadata={(e) => {
                          e.target.play().catch(err => {
                            console.error("Play error on loadedmetadata:", err);
                            setUseNativeCamera(true);
                          });
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                      />
                      <canvas ref={canvasRef} style={{ display: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button onClick={cancelSelfie} className="apple-btn" style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }}>
                        Cancel
                      </button>
                      <button onClick={takeLiveSelfie} className="apple-btn apple-btn-primary" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Camera size={18} /> Take Photo
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div style={{ animation: 'fadeIn 0.3s var(--apple-ease)' }}>
                  <img src={selfiePreviewUrl} alt="Selfie preview" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.1)', transform: useNativeCamera ? 'none' : 'scaleX(-1)' }} />
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {useNativeCamera ? (
                      <div style={{ position: 'relative', flex: 1 }}>
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="user" 
                          onChange={captureSelfie}
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }}
                        />
                        <button className="apple-btn" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', position: 'relative', zIndex: 1 }}>Retake</button>
                      </div>
                    ) : (
                      <button onClick={retakeLiveSelfie} className="apple-btn" style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }}>
                        Retake
                      </button>
                    )}
                    <button 
                      onClick={() => pendingAction === 'in' ? handleCheckIn(false) : handleCheckOut(false)} 
                      disabled={uploadingSelfie || checking}
                      className="apple-btn apple-btn-primary" 
                      style={{ flex: 2 }}
                    >
                      {uploadingSelfie ? 'Uploading...' : `Submit & Punch ${pendingAction === 'in' ? 'In' : 'Out'}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Verification Checks Panel */}
          {(!isCheckedIn || showExceptionForm) && (gpsStatus !== 'pending' || checking) && (
            <div className="apple-card" style={{ padding: '24px' }}>
              <h3 className="apple-title-small" style={{ marginBottom: '20px' }}>Verification Checks</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                    placeholder="E.g., I am at a client site today..."
                    value={exceptionReason}
                    onChange={(e) => setExceptionReason(e.target.value)}
                    rows={3}
                    style={{ width: '100%', marginBottom: '16px', resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => runChecks(pendingAction)} disabled={checking} className="apple-btn" style={{ flex: 1, background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                      Verify Again
                    </button>
                    <button onClick={() => pendingAction === 'in' ? handleCheckIn(true) : handleCheckOut(true)} disabled={checking} className="apple-btn" style={{ flex: 2, background: '#ef4444', color: '#fff', border: 'none' }}>
                      {checking ? 'Submitting...' : `Request Exception & Punch ${pendingAction === 'in' ? 'In' : 'Out'}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div 
          className="apple-card" 
          style={{ padding: '0 !important', overflow: 'hidden' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Month Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--apple-border)' }}>
            <button onClick={handlePrevMonth} className="apple-btn" style={{ padding: '8px', border: 'none', background: 'transparent' }}>
              <ChevronLeft size={20} />
            </button>
            <h2 className="apple-title-medium" style={{ margin: 0 }}>
              {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={handleNextMonth} className="apple-btn" style={{ padding: '8px', border: 'none', background: 'transparent' }}>
              <ChevronRight size={20} />
            </button>
          </div>

          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loadingLogs ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>Loading logs...</div>
            ) : monthlyLogs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>
                No attendance logs found for this month.
                <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>Swipe left or right to change month.</p>
              </div>
            ) : (
              monthlyLogs.map(log => {
                const timingStatuses = getTimingStatus(log)
                return (
                  <div key={log.id} style={{ 
                    padding: '16px', 
                    background: 'rgba(255,255,255,0.02)', 
                    borderRadius: '12px', 
                    border: '1px solid var(--apple-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: '500', color: '#fff', fontSize: '1rem' }}>
                        {new Date(log.attendance_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {log.checkin_url && (
                          <a href={log.checkin_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '12px', textDecoration: 'none' }}>
                            <Camera size={12} /> In Photo
                          </a>
                        )}
                        {log.checkout_url && (
                          <a href={log.checkout_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#f97316', background: 'rgba(249, 115, 22, 0.1)', padding: '2px 8px', borderRadius: '12px', textDecoration: 'none' }}>
                            <Camera size={12} /> Out Photo
                          </a>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Time In</div>
                        <div style={{ fontSize: '1rem', color: '#4ade80', fontWeight: '500' }}>
                          {new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {timingStatuses.find(t => t.label === 'Late') && (
                          <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '4px', fontWeight: '600', padding: '2px 6px', background: 'rgba(239, 68, 68, 0.1)', display: 'inline-block', borderRadius: '4px' }}>LATE</div>
                        )}
                      </div>
                      {log.check_out_time ? (
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Time Out</div>
                          <div style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: '500' }}>
                            {new Date(log.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {timingStatuses.find(t => t.label === 'Early Leave') && (
                            <div style={{ fontSize: '0.7rem', color: '#f97316', marginTop: '4px', fontWeight: '600', padding: '2px 6px', background: 'rgba(249, 115, 22, 0.1)', display: 'inline-block', borderRadius: '4px' }}>EARLY</div>
                          )}
                        </div>
                      ) : (
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Time Out</div>
                          <div style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: '500' }}>--:--</div>
                        </div>
                      )}
                    </div>

                    {log.exception_reason && (
                      <div style={{ fontSize: '0.8rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.05)', padding: '8px 12px', borderRadius: '6px', borderLeft: '2px solid #fbbf24', marginTop: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <AlertTriangle size={12} />
                          <strong style={{ color: '#f59e0b' }}>Exception Note</strong>
                        </div>
                        <div style={{ color: 'rgba(251, 191, 36, 0.9)' }}>
                          {log.exception_reason.split('|').map((part, index) => {
                            let text = part.trim()
                            if (index === 0 && !text.toLowerCase().includes('punch-in') && !text.toLowerCase().includes('punch-out')) {
                              text = `Punch-in exception: ${text}`
                            }
                            return (
                              <div key={index} style={{ marginBottom: '2px' }}>• {text}</div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
