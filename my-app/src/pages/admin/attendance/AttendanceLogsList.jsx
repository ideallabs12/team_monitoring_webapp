import React from 'react'
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

  const getDistanceText = (log) => {
    if (!log.latitude || !log.longitude) return 'No Location Recorded'
    if (officeLocations.length === 0) return `${log.latitude.toFixed(5)}, ${log.longitude.toFixed(5)}`
    
    let minDistance = Infinity
    for (const loc of officeLocations) {
      const dist = getDistanceFromLatLonInMeters(log.latitude, log.longitude, loc.latitude, loc.longitude)
      if (dist < minDistance) minDistance = dist
    }
    return `${Math.round(minDistance)} meters away from office`
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
    <>
      <div className="apple-card" style={{ padding: '0 !important' }}>
        <div className="apple-desktop-table-container" style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--apple-border)' }}>
                <th style={{ padding: '16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Employee</th>
                <th style={{ padding: '16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Time In / Out</th>
                <th style={{ padding: '16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Details</th>
                <th style={{ padding: '16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>Loading logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>No attendance logs found.</td>
                </tr>
              ) : (
                logs.map(log => {
                  const timingStatuses = getTimingStatus(log)
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '16px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: '500', color: '#fff', textTransform: 'capitalize' }}>
                          {log.profiles?.first_name} {log.profiles?.last_name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>{log.profiles?.email}</div>
                      </td>
                      <td style={{ padding: '16px', color: '#fff', fontSize: '0.9rem', fontWeight: '500', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                        {new Date(log.attendance_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ padding: '16px', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#4ade80' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>IN:</span>
                          {new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {log.check_out_time && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#94a3b8', marginTop: '4px' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>OUT:</span>
                            {new Date(log.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                        {timingStatuses.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                            {timingStatuses.map((ts, i) => (
                              <span key={i} style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: ts.bg, color: ts.color, fontWeight: '600' }}>
                                {ts.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px', verticalAlign: 'top', minWidth: '220px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>
                            <MapPin size={14} style={{ flexShrink: 0 }} /> <span>{getDistanceText(log)}</span>
                          </div>
                          {log.exception_reason && (
                            <div style={{ fontSize: '0.8rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.05)', padding: '8px 10px', borderRadius: '6px', borderLeft: '2px solid #fbbf24', lineHeight: '1.4', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                              <div style={{ wordBreak: 'break-word', whiteSpace: 'normal', width: '100%' }}>
                                <strong style={{ display: 'block', marginBottom: '4px', color: '#f59e0b' }}>Exception Note</strong>
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
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button onClick={() => handleDeleteLog(log.id)} className="apple-btn" style={{ padding: '6px', color: '#ef4444', background: 'transparent', border: 'none', marginLeft: 'auto' }} title="Delete Log">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List */}
        <div className="apple-mobile-list-card">
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>Loading logs...</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>No attendance logs found.</div>
          ) : (
            logs.map((log, index) => {
              const timingStatuses = getTimingStatus(log)
              return (
                <div key={log.id} style={{
                  display: 'flex', flexDirection: 'column',
                  padding: '16px 20px',
                  borderBottom: index < logs.length - 1 ? '1px solid var(--apple-border)' : 'none',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: '600', color: '#fff', textTransform: 'capitalize', fontSize: '0.95rem' }}>
                        {log.profiles?.first_name} {log.profiles?.last_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>{log.profiles?.email}</div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '500' }}>
                        {new Date(log.attendance_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--apple-text-secondary)', marginBottom: '2px' }}>IN</div>
                      <div style={{ fontSize: '0.9rem', color: '#4ade80', fontWeight: '500' }}>
                        {new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {timingStatuses.find(t => t.label === 'Late') && (
                        <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '2px', fontWeight: '600' }}>LATE</div>
                      )}
                    </div>
                    {log.check_out_time && (
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--apple-text-secondary)', marginBottom: '2px' }}>OUT</div>
                        <div style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: '500' }}>
                          {new Date(log.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {timingStatuses.find(t => t.label === 'Early Leave') && (
                          <div style={{ fontSize: '0.7rem', color: '#f97316', marginTop: '2px', fontWeight: '600' }}>EARLY</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>
                      <MapPin size={14} /> {getDistanceText(log)}
                    </div>
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

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button onClick={() => handleDeleteLog(log.id)} className="apple-btn" style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
