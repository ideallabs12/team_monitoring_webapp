import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { MapPin, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'

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

export default function AttendanceWidget({ user, compact = false }) {
  const { featureAccess } = useOutletContext() || {}
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  
  const [profile, setProfile] = useState(null)
  const [todayLog, setTodayLog] = useState(null)
  const [officeLocations, setOfficeLocations] = useState([])
  
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

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
    const channel = supabase.channel(`attendance_logs_${user.id}`)
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

    const teamsChannel = supabase.channel(`attendance_teams_${user.id}`)
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

  // Attendance actions are now redirected to the main Attendance page
  // to ensure all camera, GPS, and exception logic remains perfectly in sync.

  if (loading) {
    return (
      <div className="apple-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading Attendance...
      </div>
    )
  }

  if (profile && profile.teams && !profile.teams.attendance_enabled) {
    if (compact) return null;
    return (
      <div className="apple-card" style={{ padding: '40px', textAlign: 'center', marginTop: '40px' }}>
        <AlertTriangle size={48} style={{ color: '#fbbf24', marginBottom: '16px', display: 'inline-block' }} />
        <h2 className="apple-title-large">Restricted Access</h2>
        <p style={{ color: 'var(--apple-text-secondary)', marginTop: '8px' }}>
          Attendance tracking is not enabled for your team.
        </p>
      </div>
    )
  }

  const isCheckedIn = !!todayLog?.check_in_time
  const isCheckedOut = !!todayLog?.check_out_time

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {errorMsg && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '12px', fontSize: '0.9rem' }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '12px 16px', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', color: '#4ade80', borderRadius: '12px', fontSize: '0.9rem' }}>
          {successMsg}
        </div>
      )}

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

        {!isCheckedIn && !checking && (
          <Link to="/attendance" className="apple-btn apple-btn-primary" style={{ textDecoration: 'none', textAlign: 'center', marginTop: '24px', width: '100%', padding: '14px', fontSize: '1rem' }}>
            Open Attendance to Punch In
          </Link>
        )}

        {isCheckedIn && !isCheckedOut && (
          <Link to="/attendance" className="apple-btn" style={{ textDecoration: 'none', textAlign: 'center', marginTop: '24px', width: '100%', padding: '14px', fontSize: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            Open Attendance to Punch Out
          </Link>
        )}
      </div>
    </div>
  )
}
