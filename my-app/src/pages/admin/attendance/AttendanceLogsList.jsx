import React, { useState } from 'react'
import { CheckCircle, XCircle, Clock, MapPin, AlertTriangle, Trash2 } from 'lucide-react'

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
  return R * c;
}

export default function AttendanceLogsList({ logs, loading, officeLocations, handleApprove, handleReject, handleDeleteLog }) {
  const [showPhotos, setShowPhotos] = useState(false)

  const getDistanceText = (log) => {
    if (!log.latitude || !log.longitude) return 'No Location Recorded'
    if (officeLocations.length === 0) return `${log.latitude.toFixed(5)}, ${log.longitude.toFixed(5)}`
    
    let minDistance = Infinity
    for (const loc of officeLocations) {
      const dist = getDistanceFromLatLonInMeters(log.latitude, log.longitude, loc.latitude, loc.longitude)
      if (dist < minDistance) minDistance = dist
    }
    return `${Math.round(minDistance)} mts away`
  }

  // Helper to determine late/early
  const getTimingStatus = (log) => {
    const statuses = []
    
    const inTime = new Date(log.check_in_time)
    const inMinutes = inTime.getHours() * 60 + inTime.getMinutes()
    // 9:40 AM = 9 * 60 + 40 = 580 minutes
    if (inMinutes > 580) {
      statuses.push({ label: 'Late', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' })
    }

    if (log.check_out_time) {
      const outTime = new Date(log.check_out_time)
      const outMinutes = outTime.getHours() * 60 + outTime.getMinutes()
      // 6:00 PM = 18 * 60 = 1080 minutes
      if (outMinutes < 1080) {
        statuses.push({ label: 'Early Leave', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' })
      }
    }

    return statuses
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', paddingRight: '4px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--apple-text-secondary)', fontSize: '0.85rem' }}>
          <input 
            type="checkbox" 
            checked={showPhotos} 
            onChange={(e) => setShowPhotos(e.target.checked)} 
            style={{ width: '16px', height: '16px', accentColor: '#38bdf8' }}
          />
          Show Selfie Photos
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
        {loading ? (
          <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>Loading logs...</div>
        ) : logs.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>No attendance logs found.</div>
        ) : (
          logs.map((log) => {
            const timingStatuses = getTimingStatus(log)
            return (
              <div key={log.id} className="apple-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Selfie Image */}
                {showPhotos && (
                  log.selfie_url ? (
                    <div style={{ width: '100%', height: '220px', background: '#000', position: 'relative' }}>
                      <img src={log.selfie_url} alt="Selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ width: '100%', height: '80px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--apple-border)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>No Photo Provided</span>
                    </div>
                  )
                )}

              {/* Card Details */}
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                
                {/* Header: Name, Date, Distance, and Delete Action */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#fff', fontSize: '1rem', textTransform: 'capitalize' }}>
                      {log.profiles?.first_name} {log.profiles?.last_name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>
                      <span>{new Date(log.attendance_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span style={{ display: 'inline-block', width: '3px', height: '3px', borderRadius: '50%', background: 'var(--apple-text-secondary)' }}></span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><MapPin size={10} /> {getDistanceText(log)}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteLog(log.id)} style={{ padding: '2px', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Delete Log">
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Timings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '6px', marginTop: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--apple-text-secondary)', fontWeight: '600', width: '60px' }}>PUNCH IN</span>
                      <span style={{ fontSize: '0.9rem', color: '#4ade80', fontWeight: '500' }}>
                        {new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {timingStatuses.find(t => t.label === 'Late') && (
                      <span style={{ fontSize: '0.6rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 4px', borderRadius: '4px', fontWeight: '700', textTransform: 'uppercase' }}>Late</span>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--apple-text-secondary)', fontWeight: '600', width: '60px' }}>PUNCH OUT</span>
                      <span style={{ fontSize: '0.9rem', color: log.check_out_time ? '#94a3b8' : 'rgba(255,255,255,0.2)', fontWeight: '500' }}>
                        {log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </span>
                    </div>
                    {timingStatuses.find(t => t.label === 'Early Leave') && (
                      <span style={{ fontSize: '0.6rem', color: '#f97316', background: 'rgba(249, 115, 22, 0.1)', padding: '2px 4px', borderRadius: '4px', fontWeight: '700', textTransform: 'uppercase' }}>Early</span>
                    )}
                  </div>
                </div>

                {/* Exception */}
                {log.exception_reason && (
                  <div style={{ fontSize: '0.75rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.05)', padding: '6px 8px', borderRadius: '6px', borderLeft: '2px solid #fbbf24', marginTop: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                      <AlertTriangle size={12} />
                      <strong style={{ color: '#f59e0b' }}>Exception Note</strong>
                    </div>
                    <div style={{ color: 'rgba(251, 191, 36, 0.9)', lineHeight: '1.3' }}>
                      {log.exception_reason.split('|').map((part, index) => {
                        let text = part.trim()
                        if (index === 0 && !text.toLowerCase().includes('punch-in') && !text.toLowerCase().includes('punch-out')) {
                          text = `Punch-in exception: ${text}`
                        }
                        return (
                          <div key={index} style={{ marginBottom: '1px' }}>• {text}</div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })
      )}
      </div>
    </div>
  )
}
