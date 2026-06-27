import { useState, useMemo } from 'react'

export default function ComplianceHeatmap({ disReports, profiles, memberships, teams, currentDateStr, holidays = [] }) {
  // currentDateStr is 'YYYY-MM-DD'
  const [tooltip, setTooltip] = useState(null)

  const holidaySet = useMemo(() => new Set(holidays.map(h => h.holiday_date || h)), [holidays])

  // 1. Calculate the date range for the last 3 months
  // We want to show about 13 weeks of data ending at currentDateStr.
  const dateRange = useMemo(() => {
    const end = new Date(currentDateStr)
    const start = new Date(end)
    // Go back 13 weeks (91 days)
    start.setDate(end.getDate() - 90)
    
    const dates = []
    const current = new Date(start)
    
    while (current <= end) {
      const year = current.getFullYear()
      const month = String(current.getMonth() + 1).padStart(2, '0')
      const day = String(current.getDate()).padStart(2, '0')
      dates.push(`${year}-${month}-${day}`)
      current.setDate(current.getDate() + 1)
    }
    
    return { dates, startDateStr: dates[0], endDateStr: dates[dates.length - 1] }
  }, [currentDateStr])

  // 2. Active non-admin users map
  const activeUsers = useMemo(() => {
    const nonAdminProfiles = profiles.filter(p => p.platform_role !== 'admin')
    const nonAdminIds = new Set(nonAdminProfiles.map(p => p.id))
    
    // Users in at least one team
    const inTeamIds = new Set(
      memberships
        .filter(m => nonAdminIds.has(m.user_id))
        .map(m => m.user_id)
    )
    
    return nonAdminProfiles.filter(p => inTeamIds.has(p.id))
  }, [profiles, memberships])

  const expectedCount = activeUsers.length

  // 3. Grid data
  const gridData = useMemo(() => {
    const reportsByDate = {}
    disReports.forEach(r => {
      reportsByDate[r.report_date] = (reportsByDate[r.report_date] || 0) + 1
    })

    const data = []
    
    dateRange.dates.forEach(dateStr => {
      const d = new Date(dateStr)
      const dayOfWeek = d.getDay()
      const isWeekend = dayOfWeek === 0
      const isHoliday = holidaySet.has(dateStr)
      const count = reportsByDate[dateStr] || 0
      const rate = expectedCount > 0 ? (count / expectedCount) * 100 : 0
      
      let level = 0 // grey/no data
      if (count > 0) {
        if (rate < 50) level = 1 // red
        else if (rate < 80) level = 2 // yellow
        else level = 3 // green
      } else if (!isWeekend && !isHoliday && expectedCount > 0) {
        level = 1 // weekday with 0 submission is red
      }

      data.push({
        date: dateStr,
        dayOfWeek,
        count,
        total: expectedCount,
        rate: Math.round(rate),
        isWeekend,
        level
      })
    })

    // To align Sunday-Saturday rows, pad the front of the array
    const firstDayOfWeek = new Date(dateRange.startDateStr).getDay()
    const paddedData = []
    for (let i = 0; i < firstDayOfWeek; i++) {
      paddedData.push({ isSpacer: true })
    }
    
    return [...paddedData, ...data]
  }, [dateRange, disReports, expectedCount, holidaySet])

  // 4. Calculate Team Compliance Rates (last 30 business days)
  const teamCompliance = useMemo(() => {
    // Weekdays in the last 30 calendar days
    const today = new Date(currentDateStr)
    const start = new Date(today)
    start.setDate(today.getDate() - 30)

    const weekdays = []
    const current = new Date(start)
    while (current <= today) {
      const dayOfWeek = current.getDay()
      if (dayOfWeek !== 0) {
        const year = current.getFullYear()
        const month = String(current.getMonth() + 1).padStart(2, '0')
        const day = String(current.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`
        if (!holidaySet.has(dateStr)) {
          weekdays.push(dateStr)
        }
      }
      current.setDate(current.getDate() + 1)
    }

    const weekdaySet = new Set(weekdays)

    return teams.map(team => {
      const teamMems = memberships.filter(m => m.team_id === team.id)
      const teamUserIds = new Set(teamMems.map(m => m.user_id))
      const teamActiveMems = activeUsers.filter(u => teamUserIds.has(u.id))
      
      const expectedSubmissions = teamActiveMems.length * weekdays.length
      
      const actualSubmissions = disReports.filter(r => 
        teamUserIds.has(r.user_id) && 
        weekdaySet.has(r.report_date)
      ).length

      const rate = expectedSubmissions > 0 ? Math.round((actualSubmissions / expectedSubmissions) * 100) : 0

      return {
        id: team.id,
        name: team.name,
        count: teamActiveMems.length,
        rate
      }
    }).sort((a, b) => b.rate - a.rate)
  }, [teams, memberships, activeUsers, disReports, currentDateStr, holidaySet])

  // 5. Calculate Users with Missing Streak (consecutive 3+ weekdays missed)
  const missingStreaks = useMemo(() => {
    const list = []
    const today = new Date(currentDateStr)

    activeUsers.forEach(user => {
      const userReports = new Set(
        disReports.filter(r => r.user_id === user.id).map(r => r.report_date)
      )

      let missingDays = 0
      const current = new Date(today)
      
      // Go back up to 15 weekdays
      let weekdaysChecked = 0
      while (weekdaysChecked < 10) {
        const dayOfWeek = current.getDay()
        if (dayOfWeek !== 0) {
          const year = current.getFullYear()
          const month = String(current.getMonth() + 1).padStart(2, '0')
          const day = String(current.getDate()).padStart(2, '0')
          const checkDateStr = `${year}-${month}-${day}`
          const isHoliday = holidaySet.has(checkDateStr)
          
          if (!isHoliday) {
            if (!userReports.has(checkDateStr)) {
              missingDays++
            } else {
              // Submitted, streak broken
              break
            }
            weekdaysChecked++
          }
        }
        current.setDate(current.getDate() - 1)
      }

      if (missingDays >= 3) {
        // Find team names
        const userTeams = memberships
          .filter(m => m.user_id === user.id)
          .map(m => teams.find(t => t.id === m.team_id)?.name)
          .filter(Boolean)

        list.push({
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          teams: userTeams.join(', ') || 'No Team',
          missingDays
        })
      }
    })

    return list.sort((a, b) => b.missingDays - a.missingDays)
  }, [activeUsers, disReports, teams, memberships, currentDateStr, holidaySet])

  // Month header helper labels
  const monthLabels = useMemo(() => {
    const labels = []
    const dates = dateRange.dates
    let lastMonth = -1
    
    // We scan columns (which are chunks of 7 items)
    // There are firstDayOfWeek spacers, so the index in dates is gridIndex - firstDayOfWeek
    const firstDayOfWeek = new Date(dateRange.startDateStr).getDay()
    const columnsCount = Math.ceil(gridData.length / 7)
    
    for (let c = 0; c < columnsCount; c++) {
      const gridIdx = c * 7
      const dateIdx = gridIdx - firstDayOfWeek
      if (dateIdx >= 0 && dateIdx < dates.length) {
        const d = new Date(dates[dateIdx])
        const m = d.getMonth()
        if (m !== lastMonth) {
          labels.push({
            name: d.toLocaleString('default', { month: 'short' }),
            colIndex: c
          })
          lastMonth = m
        }
      }
    }
    
    return labels
  }, [dateRange, gridData])

  const getLevelColor = (level) => {
    switch(level) {
      case 3: return '#10b981' // emerald-500
      case 2: return '#fbbf24' // amber-400
      case 1: return '#ef4444' // red-500
      default: return 'var(--apple-border)' // grey spacer or weekend with 0
    }
  }

  const getLevelName = (level) => {
    switch(level) {
      case 3: return '80-100% Submission'
      case 2: return '50-80% Submission'
      case 1: return '<50% Submission'
      default: return 'No Data / Weekend'
    }
  }

  return (
    <div className="card" style={{ padding: '24px', background: 'var(--card-bg)' }}>
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: 'var(--apple-text-primary)' }}>DIS Compliance Tracker</h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Submission rates and streaks of daily reports.
        </p>
      </div>

      {/* ── HEATMAP GRID SECTION ── */}
      <div style={{ background: 'var(--apple-bg)', borderRadius: '12px', padding: '20px', border: '1px solid var(--apple-border)', marginBottom: '28px' }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--apple-text-primary)', fontWeight: '600' }}>Daily Submission Grid (Last 3 Months)</h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          
          {/* Month Labels row */}
          <div style={{ display: 'flex', position: 'relative', height: '20px', marginLeft: '30px', marginBottom: '4px' }}>
            {monthLabels.map((lbl, idx) => (
              <span key={idx} style={{ 
                position: 'absolute', 
                left: `${lbl.colIndex * 16}px`, 
                fontSize: '0.75rem', 
                color: 'var(--text-secondary)',
                fontWeight: '500'
              }}>
                {lbl.name}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            {/* Days Labels col */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '112px', width: '24px', marginRight: '6px', fontSize: '0.7rem', color: 'var(--text-secondary)', padding: '2px 0' }}>
              <span>Su</span>
              <span>Tu</span>
              <span>Th</span>
              <span>Sa</span>
            </div>

            {/* Grid Container */}
            <div style={{ 
              display: 'grid', 
              gridTemplateRows: 'repeat(7, 13px)', 
              gridAutoFlow: 'column', 
              gridGap: '3px',
              overflowX: 'auto',
              flex: 1,
              paddingBottom: '8px'
            }}>
              {gridData.map((cell, idx) => {
                if (cell.isSpacer) {
                  return <div key={idx} style={{ width: '13px', height: '13px', background: 'transparent' }} />
                }
                return (
                  <div
                    key={idx}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setTooltip({
                        date: cell.date,
                        rate: cell.rate,
                        count: cell.count,
                        total: cell.total,
                        level: cell.level,
                        x: rect.left + window.scrollX - 40,
                        y: rect.top + window.scrollY - 85
                      })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      width: '13px',
                      height: '13px',
                      borderRadius: '2px',
                      background: getLevelColor(cell.level),
                      cursor: 'pointer',
                      border: cell.isWeekend ? '1px dashed var(--apple-border)' : 'none',
                      transition: 'transform 0.1s'
                    }}
                  />
                )
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>Less</span>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: getLevelColor(0) }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: getLevelColor(1) }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: getLevelColor(2) }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: getLevelColor(3) }} />
          <span>More</span>
        </div>
      </div>

      {/* ── TWO-COLUMN SUMMARY (TEAMS & STREAKS) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
        
        {/* Left Column: Team Compliance Rates */}
        <div style={{ background: 'var(--apple-bg)', borderRadius: '12px', padding: '16px', border: '1px solid var(--apple-border)' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--apple-text-primary)', fontWeight: '600' }}>Team Compliance (Last 30 Days)</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {teamCompliance.map(tm => (
              <div key={tm.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--apple-text-primary)', fontWeight: '500' }}>{tm.name} <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>({tm.count} mems)</span></span>
                  <span style={{ fontWeight: 'bold', color: tm.rate >= 80 ? '#34d399' : tm.rate >= 50 ? '#fbbf24' : '#f87171' }}>{tm.rate}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--apple-border)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${tm.rate}%`, 
                    height: '100%', 
                    background: tm.rate >= 80 ? '#10b981' : tm.rate >= 50 ? '#fbbf24' : '#ef4444',
                    borderRadius: '3px',
                    transition: 'width 1s ease-in-out'
                  }} />
                </div>
              </div>
            ))}
            {teamCompliance.length === 0 && (
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No team data available.</p>
            )}
          </div>
        </div>

        {/* Right Column: Missing streaks */}
        <div style={{ background: 'var(--apple-bg)', borderRadius: '12px', padding: '16px', border: '1px solid var(--apple-border)', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: 'var(--apple-text-primary)', fontWeight: '600' }}>Needs Attention (Missed 3+ Consecutive Days)</h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active team members who haven't reported recently.</p>
          <div style={{ position: 'relative', flex: 1, minHeight: '150px' }}>
            <div className="no-scrollbar" style={{ position: 'absolute', inset: 0, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {missingStreaks.map(usr => (
              <div key={usr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255, 69, 58, 0.05)', border: '1px solid rgba(255, 69, 58, 0.15)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--apple-accent-red)' }}>{usr.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{usr.teams}</div>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--apple-accent-red)', background: 'rgba(255, 69, 58, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                  {usr.missingDays} days missed
                </div>
              </div>
            ))}
            {missingStreaks.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100px', border: '1px dashed var(--apple-border)', borderRadius: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🎉</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>All members compliant!</span>
              </div>
            )}
            </div>
          </div>
        </div>

      </div>

      {/* ── TOOLTIP PORTAL ── */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: tooltip.x,
          top: tooltip.y,
          background: 'var(--apple-card)',
          border: '1px solid var(--apple-border)',
          padding: '8px 12px',
          borderRadius: '6px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          zIndex: 100,
          pointerEvents: 'none',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--apple-text-primary)', marginBottom: '2px' }}>
            {new Date(tooltip.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--apple-text-secondary)' }}>
            Rate: <strong style={{ color: getLevelColor(tooltip.level) }}>{tooltip.rate}%</strong> ({tooltip.count}/{tooltip.total} reports)
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {getLevelName(tooltip.level)}
          </div>
        </div>
      )}
    </div>
  )
}
