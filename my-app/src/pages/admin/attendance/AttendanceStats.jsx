import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../supabaseClient'
import { Users, User, Calendar, Clock, AlertTriangle, CheckCircle, Target, ArrowDownRight, ArrowUpRight } from 'lucide-react'

// Helper function to count Sundays in a date range
const countSundays = (startDate, endDate) => {
  let count = 0;
  let curDate = new Date(startDate);
  while (curDate <= endDate) {
    if (curDate.getDay() === 0) { // Sunday is 0
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
}

export default function AttendanceStats({ users, teams }) {
  const [selectedUser, setSelectedUser] = useState(users.length > 0 ? users[0].id : '')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` // YYYY-MM
  })
  
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)

  // Ensure default user is set when users load
  useEffect(() => {
    if (!selectedUser && users.length > 0) {
      setSelectedUser(users[0].id)
    }
  }, [users, selectedUser])

  useEffect(() => {
    if (!selectedUser || !selectedMonth) return
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser, selectedMonth])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const [year, month] = selectedMonth.split('-').map(Number)
      
      // Calculate start and end of the month
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0, 23, 59, 59)

      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', selectedUser)
        .gte('attendance_date', startDate.toISOString())
        .lte('attendance_date', endDate.toISOString())

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    if (!selectedMonth) return null

    const [year, month] = selectedMonth.split('-').map(Number)
    
    // Total days in the selected month
    const daysInMonth = new Date(year, month, 0).getDate()
    
    // Count sundays in the month
    const startOfMonth = new Date(year, month - 1, 1)
    const endOfMonth = new Date(year, month, 0)
    const totalSundays = countSundays(startOfMonth, endOfMonth)
    
    const workingDays = daysInMonth - totalSundays

    // Calculate passed working days
    const now = new Date()
    let passedWorkingDays = workingDays
    if (year === now.getFullYear() && month === (now.getMonth() + 1)) {
      // It's the current month, so count days up to today
      const today = Math.min(now.getDate(), daysInMonth)
      const currentEnd = new Date(year, month - 1, today)
      const passedSundays = countSundays(startOfMonth, currentEnd)
      passedWorkingDays = today - passedSundays
    } else if (new Date(year, month, 1) > now) {
      // Future month
      passedWorkingDays = 0
    }

    const remainingWorkingDays = workingDays - passedWorkingDays

    let attended = 0
    let onlyLate = 0
    let onlyEarly = 0
    let lateAndEarly = 0
    let onTime = 0

    logs.forEach(log => {
      // We only count them as attended if they have a check_in_time
      if (log.check_in_time) {
        attended++;
        
        // Check late (after 9:40 AM)
        const inTime = new Date(log.check_in_time)
        const inMinutes = inTime.getHours() * 60 + inTime.getMinutes()
        const isLate = inMinutes > 580 // 9:40 AM

        // Check early (before 6:00 PM)
        let isEarly = false
        if (log.check_out_time) {
          const outTime = new Date(log.check_out_time)
          const outMinutes = outTime.getHours() * 60 + outTime.getMinutes()
          isEarly = outMinutes < 1080 // 6:00 PM
        }

        if (isLate && isEarly) {
          lateAndEarly++;
        } else if (isLate) {
          onlyLate++;
        } else if (isEarly) {
          onlyEarly++;
        } else {
          onTime++;
        }
      }
    })

    return {
      daysInMonth,
      workingDays,
      passedWorkingDays,
      remainingWorkingDays,
      attended,
      onlyLate,
      onlyEarly,
      lateAndEarly,
      onTime,
      totalSundays
    }
  }, [selectedMonth, logs])

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* Controls */}
      <div className="apple-card" style={{ marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--apple-text-secondary)', marginBottom: '8px', fontWeight: '500' }}>Select User</label>
          <div style={{ position: 'relative' }}>
            <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)' }} />
            <select
              className="apple-input"
              style={{ paddingLeft: '40px', width: '100%', textTransform: 'capitalize' }}
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--apple-text-secondary)', marginBottom: '8px', fontWeight: '500' }}>Select Month</label>
          <div style={{ position: 'relative' }}>
            <Calendar size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)' }} />
            <input
              type="month"
              className="apple-input"
              style={{ paddingLeft: '40px', width: '100%' }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="apple-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--apple-text-secondary)' }}>
          Loading stats...
        </div>
      ) : !stats ? (
        <div className="apple-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--apple-text-secondary)' }}>
          Select a month to view stats.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Calendar Stats Grid */}
          <div>
            <h3 className="apple-title-small" style={{ marginBottom: '16px' }}>Calendar Metrics</h3>
            <div className="apple-responsive-grid">
              
              <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--apple-text-secondary)', fontSize: '0.85rem' }}>
                  <Calendar size={16} /> Actual Days
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#fff' }}>{stats.daysInMonth}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>Total days in selected month</div>
              </div>

              <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid rgba(56, 189, 248, 0.2)', background: 'rgba(56, 189, 248, 0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontSize: '0.85rem' }}>
                  <Target size={16} /> Working Days
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#38bdf8' }}>{stats.workingDays}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>Excluding {stats.totalSundays} Sundays</div>
              </div>

              <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--apple-text-secondary)', fontSize: '0.85rem' }}>
                  <CheckCircle size={16} /> Passed Working Days
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#fff' }}>{stats.passedWorkingDays}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>Working days passed so far</div>
              </div>

              <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--apple-text-secondary)', fontSize: '0.85rem' }}>
                  <Clock size={16} /> Remaining
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#fff' }}>{stats.remainingWorkingDays}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>Working days left in month</div>
              </div>

            </div>
          </div>

          {/* Performance Stats Grid */}
          <div>
            <h3 className="apple-title-small" style={{ marginBottom: '16px' }}>Attendance Performance</h3>
            <div className="apple-responsive-grid">
              
              <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid rgba(74, 222, 128, 0.2)', background: 'rgba(74, 222, 128, 0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4ade80', fontSize: '0.85rem', fontWeight: '600' }}>
                  <CheckCircle size={16} /> Perfect On-Time
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#4ade80' }}>{stats.onTime}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(74, 222, 128, 0.8)' }}>Days perfectly on schedule</div>
              </div>

              <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontSize: '0.85rem' }}>
                  <ArrowDownRight size={16} /> Only Late
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#fbbf24' }}>{stats.onlyLate}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>Arrived after 9:40 AM</div>
              </div>

              <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f97316', fontSize: '0.85rem' }}>
                  <ArrowUpRight size={16} /> Only Early
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f97316' }}>{stats.onlyEarly}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>Left before 6:00 PM</div>
              </div>

              <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '0.85rem', fontWeight: '600' }}>
                  <AlertTriangle size={16} /> Late & Early
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#ef4444' }}>{stats.lateAndEarly}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(239, 68, 68, 0.8)' }}>Late arrival AND early exit</div>
              </div>

            </div>
          </div>
          
          <div className="apple-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--apple-border)' }}>
            <div>
              <div style={{ fontSize: '0.9rem', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Total Days Attended</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>Includes late, early, and on-time days</div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#fff' }}>{stats.attended} <span style={{ fontSize: '1rem', color: 'var(--apple-text-secondary)', fontWeight: '500' }}>/ {stats.workingDays}</span></div>
          </div>

        </div>
      )}
    </div>
  )
}
