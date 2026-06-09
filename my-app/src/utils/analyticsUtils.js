import { normalizeMonth, getLastNMonths, parseRevenueMonth, formatRevenueMonthShort, getEffectiveTargetAmount } from './revenueUtils'

/**
 * Returns the team mapping as a helper.
 */
function getTeamMap(teams) {
  const map = {}
  teams.forEach(t => {
    map[t.id] = t.name
  })
  return map
}

/**
 * Section 1 - Revenue Trend Line
 * Calculates monthly revenue trend for all teams + total.
 * Returns chronological array of: { period, monthStr, Total, [teamName1], [teamName2]... }
 */
export function calculateMonthlyTrend(revenues, teams, months) {
  const teamMap = getTeamMap(teams)
  
  return months.map(month => {
    const monthRevs = revenues.filter(r => normalizeMonth(r.revenue_month) === month)
    const row = {
      period: formatRevenueMonthShort(month),
      monthStr: month,
      Total: monthRevs.reduce((sum, r) => sum + Number(r.amount || 0), 0)
    }
    
    // Initialize all teams to 0 to keep lines consistent
    teams.forEach(t => {
      row[t.name] = 0
    })
    
    monthRevs.forEach(r => {
      const teamName = teamMap[r.team_id]
      if (teamName) {
        row[teamName] = (row[teamName] || 0) + Number(r.amount || 0)
      }
    })
    
    return row
  })
}

/**
 * Section 2 - Expected vs Actual Revenue
 * Calculates monthly expected (from DIS) vs actual revenue (from monthly_revenues).
 * Supports filtering by a specific team.
 */
export function calculateExpectedVsActual(disReports, revenues, months, selectedTeamId, memberships) {
  return months.map(month => {
    let monthRevs = revenues.filter(r => normalizeMonth(r.revenue_month) === month)
    let monthReports = disReports.filter(r => normalizeMonth(r.report_date) === month)
    
    if (selectedTeamId && selectedTeamId !== 'all') {
      monthRevs = monthRevs.filter(r => r.team_id === selectedTeamId)
      
      const teamMemberUserIds = new Set(
        memberships.filter(m => m.team_id === selectedTeamId).map(m => m.user_id)
      )
      
      monthReports = monthReports.filter(r => {
        if (r.team_id === selectedTeamId) return true
        if (teamMemberUserIds.has(r.user_id)) return true
        // Also fallback to checking if there is a revenue record for this user under this team for this month
        return revenues.some(
          rv => rv.user_id === r.user_id && rv.team_id === selectedTeamId && normalizeMonth(rv.revenue_month) === month
        )
      })
    }
    
    const expected = monthReports.reduce((sum, r) => sum + Number(r.expected_revenue || 0), 0)
    const actual = monthRevs.reduce((sum, r) => sum + Number(r.amount || 0), 0)
    const accuracy = expected > 0 ? Math.round((actual / expected) * 100) : 0
    
    return {
      period: formatRevenueMonthShort(month),
      monthStr: month,
      Expected: expected,
      Actual: actual,
      Accuracy: accuracy
    }
  })
}

/**
 * Target vs Actual Revenue
 * Calculates monthly team target (sum of member monthly_targets) vs actual revenue.
 * Uses carry-forward logic: if a target was last set 2 months ago, it still applies.
 * Returns array of: { period, monthStr, Target, Actual }
 */
export function calculateTargetVsActual(targets, revenues, months, selectedTeamId, memberships, profiles, teams) {
  const nonAdminProfiles = profiles.filter(p => p.platform_role !== 'admin')

  return months.map(month => {
    // Build list of { userId, teamId } pairs to sum targets for
    const pairs = []

    if (!selectedTeamId || selectedTeamId === 'all') {
      // All non-admin members across every team
      teams.forEach(team => {
        memberships
          .filter(m => m.team_id === team.id && nonAdminProfiles.some(p => p.id === m.user_id))
          .forEach(m => pairs.push({ userId: m.user_id, teamId: team.id }))
      })
    } else {
      memberships
        .filter(m => m.team_id === selectedTeamId && nonAdminProfiles.some(p => p.id === m.user_id))
        .forEach(m => pairs.push({ userId: m.user_id, teamId: selectedTeamId }))
    }

    // Sum effective targets (carry-forward: most recent target on or before this month)
    const targetTotal = pairs.reduce(
      (sum, { userId, teamId }) => sum + getEffectiveTargetAmount(targets, userId, teamId, month),
      0
    )

    // Sum actual revenues
    let monthRevs = revenues.filter(r => normalizeMonth(r.revenue_month) === month)
    if (selectedTeamId && selectedTeamId !== 'all') {
      monthRevs = monthRevs.filter(r => r.team_id === selectedTeamId)
    }
    const actual = monthRevs.reduce((sum, r) => sum + Number(r.amount || 0), 0)

    return {
      period: formatRevenueMonthShort(month),
      monthStr: month,
      Target: targetTotal,
      Actual: actual,
    }
  })
}

/**
 * Section 3 - DIS Compliance Tracker (Calendar Heatmap)
 * Prepares GitHub-style contribution grid for the specified range.
 */
export function buildCalendarHeatmapData(disReports, profiles, memberships, startDate, endDate) {
  const activeUserIds = new Set(
    memberships
      .filter(m => {
        const profile = profiles.find(p => p.id === m.user_id)
        return profile && profile.platform_role !== 'admin'
      })
      .map(m => m.user_id)
  )
  const expectedCount = activeUserIds.size
  
  const reportsByDate = {}
  disReports.forEach(r => {
    if (activeUserIds.has(r.user_id)) {
      reportsByDate[r.report_date] = (reportsByDate[r.report_date] || 0) + 1
    }
  })
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  const data = []
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    const dayOfWeek = d.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    
    const count = reportsByDate[dateStr] || 0
    const rate = expectedCount > 0 ? (count / expectedCount) * 100 : 0
    
    let level = 0
    if (count > 0) {
      if (rate < 50) level = 1
      else if (rate < 80) level = 2
      else level = 3
    } else if (!isWeekend && expectedCount > 0) {
      level = 1
    }
    
    data.push({
      date: dateStr,
      count,
      total: expectedCount,
      rate: Math.round(rate),
      isWeekend,
      level
    })
  }
  
  return data
}

/**
 * Section 3 - Team Compliance bar charts
 * Calculate overall compliance rates (%) per team.
 */
export function calculateTeamComplianceRates(teams, disReports, memberships, profiles, startDate, endDate) {
  const weekdays = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      weekdays.push(`${year}-${month}-${day}`)
    }
  }
  
  const weekdaySet = new Set(weekdays)
  const nonAdminProfiles = profiles.filter(p => p.platform_role !== 'admin')
  const nonAdminIds = new Set(nonAdminProfiles.map(p => p.id))
  
  return teams.map(team => {
    const teamMems = memberships.filter(m => m.team_id === team.id && nonAdminIds.has(m.user_id))
    const teamMemberIds = new Set(teamMems.map(m => m.user_id))
    
    const expected = teamMems.length * weekdays.length
    const actual = disReports.filter(r => 
      teamMemberIds.has(r.user_id) && 
      weekdaySet.has(r.report_date)
    ).length
    
    const rate = expected > 0 ? Math.round((actual / expected) * 100) : 0
    
    return {
      id: team.id,
      name: team.name,
      membersCount: teamMems.length,
      expected,
      actual,
      rate
    }
  }).sort((a, b) => b.rate - a.rate)
}

/**
 * Section 4 - Team Comparison Radar
 * Returns normalized 0-100 scores for 5 axes: Revenue, Growth, DIS Compliance, Leads, Efficiency.
 */
export function calculateTeamRadarScores(teams, revenues, disReports, memberships, profiles, months) {
  const nonAdminProfiles = profiles.filter(p => p.platform_role !== 'admin')
  const nonAdminIds = new Set(nonAdminProfiles.map(p => p.id))
  
  if (months.length === 0) return { radarData: [], rawTeams: [] }
  
  const sortedMonths = [...months].sort()
  const startMonthStr = sortedMonths[0]
  const endMonthStr = sortedMonths[sortedMonths.length - 1]
  
  const startDate = parseRevenueMonth(startMonthStr)
  const endDate = new Date(parseRevenueMonth(endMonthStr))
  endDate.setMonth(endDate.getMonth() + 1)
  endDate.setDate(endDate.getDate() - 1)
  
  const weekdaySet = new Set()
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      weekdaySet.add(`${year}-${month}-${day}`)
    }
  }
  
  const weekdaysCount = weekdaySet.size
  const latestMonth = sortedMonths[sortedMonths.length - 1]
  const prevMonth = sortedMonths.length > 1 ? sortedMonths[sortedMonths.length - 2] : null
  
  const rawTeams = teams.map(team => {
    const teamMems = memberships.filter(m => m.team_id === team.id && nonAdminIds.has(m.user_id))
    const teamMemberIds = new Set(teamMems.map(m => m.user_id))
    
    const teamPeriodRevs = revenues.filter(r => r.team_id === team.id && months.includes(normalizeMonth(r.revenue_month)))
    const revenue = teamPeriodRevs.reduce((sum, r) => sum + Number(r.amount || 0), 0)
    
    const latestRev = revenues
      .filter(r => r.team_id === team.id && normalizeMonth(r.revenue_month) === latestMonth)
      .reduce((sum, r) => sum + Number(r.amount || 0), 0)
    const prevRev = prevMonth
      ? revenues
          .filter(r => r.team_id === team.id && normalizeMonth(r.revenue_month) === prevMonth)
          .reduce((sum, r) => sum + Number(r.amount || 0), 0)
      : 0
    const growth = prevRev > 0 
      ? Math.max(0, ((latestRev - prevRev) / prevRev) * 100)
      : (latestRev > 0 ? 100 : 0)
      
    const expectedDIS = teamMems.length * weekdaysCount
    const actualDIS = disReports.filter(r => 
      teamMemberIds.has(r.user_id) && 
      weekdaySet.has(r.report_date)
    ).length
    const compliance = expectedDIS > 0 ? (actualDIS / expectedDIS) * 100 : 0
    
    const teamPeriodReports = disReports.filter(r => 
      teamMemberIds.has(r.user_id) && 
      weekdaySet.has(r.report_date)
    )
    const leads = teamPeriodReports.reduce((sum, r) => sum + Number(r.positive_leads || 0), 0)
    const efficiency = teamMems.length > 0 ? revenue / teamMems.length : 0
    
    return {
      id: team.id,
      name: team.name,
      revenue,
      growth,
      compliance,
      leads,
      efficiency,
      membersCount: teamMems.length
    }
  })
  
  const maxRevenue = Math.max(...rawTeams.map(t => t.revenue), 1)
  const maxGrowth = Math.max(...rawTeams.map(t => t.growth), 1)
  const maxLeads = Math.max(...rawTeams.map(t => t.leads), 1)
  const maxEfficiency = Math.max(...rawTeams.map(t => t.efficiency), 1)
  
  const subjects = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'growth', label: 'Growth' },
    { key: 'compliance', label: 'DIS Compliance' },
    { key: 'leads', label: 'Leads' },
    { key: 'efficiency', label: 'Efficiency' }
  ]
  
  const radarData = subjects.map(sub => {
    const row = { subject: sub.label }
    rawTeams.forEach(t => {
      let score = 0
      if (sub.key === 'revenue') score = (t.revenue / maxRevenue) * 100
      else if (sub.key === 'growth') score = (t.growth / maxGrowth) * 100
      else if (sub.key === 'compliance') score = t.compliance
      else if (sub.key === 'leads') score = (t.leads / maxLeads) * 100
      else if (sub.key === 'efficiency') score = (t.efficiency / maxEfficiency) * 100
      
      row[t.name] = Math.round(score)
    })
    return row
  })
  
  return { radarData, rawTeams }
}

/**
 * Section 5 - Revenue Distribution (Pareto)
 * Computes individual revenue contributions and cumulative percentage.
 */
export function calculateParetoData(revenues, profiles, selectedTeamId, memberships, months) {
  const nonAdminProfiles = profiles.filter(p => p.platform_role !== 'admin')
  const nonAdminIds = new Set(nonAdminProfiles.map(p => p.id))
  
  let targetUserIds = nonAdminIds
  if (selectedTeamId && selectedTeamId !== 'all') {
    targetUserIds = new Set(
      memberships
        .filter(m => m.team_id === selectedTeamId && nonAdminIds.has(m.user_id))
        .map(m => m.user_id)
    )
  }
  
  const userRevs = Array.from(targetUserIds).map(userId => {
    const profile = profiles.find(p => p.id === userId)
    const name = profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown'
    
    const userPeriodRevs = revenues.filter(
      r => r.user_id === userId && months.includes(normalizeMonth(r.revenue_month))
    )
    const total = userPeriodRevs.reduce((sum, r) => sum + Number(r.amount || 0), 0)
    
    return {
      userId,
      name,
      revenue: total
    }
  }).sort((a, b) => b.revenue - a.revenue)
  
  const totalSum = userRevs.reduce((sum, u) => sum + u.revenue, 0)
  
  let cumulativeSum = 0
  const paretoData = userRevs.map(u => {
    cumulativeSum += u.revenue
    const cumulativePercent = totalSum > 0 ? Math.round((cumulativeSum / totalSum) * 100) : 0
    return {
      ...u,
      cumulativePercent
    }
  })
  
  return {
    paretoData,
    totalSum,
    concentrationStats: {
      top20PercentRevenue: getConcentrationPercentage(userRevs, totalSum, 0.2),
      zeroRevenueCount: userRevs.filter(u => u.revenue === 0).length,
      totalCount: userRevs.length
    }
  }
}

function getConcentrationPercentage(sortedUsers, totalSum, fraction) {
  if (totalSum === 0 || sortedUsers.length === 0) return 0
  const count = Math.max(1, Math.round(sortedUsers.length * fraction))
  const topSum = sortedUsers.slice(0, count).reduce((sum, u) => sum + u.revenue, 0)
  return Math.round((topSum / totalSum) * 100)
}

/**
 * Calculates current DIS submission streak for a user.
 */
export function calculateDISStreak(disReports, userId, currentDateStr) {
  const userReports = new Set(
    disReports
      .filter(r => r.user_id === userId)
      .map(r => r.report_date)
  )
  
  let streak = 0
  let d = new Date(currentDateStr)
  
  const todayStr = d.toISOString().split('T')[0]
  const submittedToday = userReports.has(todayStr)
  
  if (!submittedToday) {
    // If they haven't submitted today, skip today and start checking from yesterday.
    d.setDate(d.getDate() - 1)
  }
  
  for (let i = 0; i < 30; i++) {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const checkDateStr = `${year}-${month}-${day}`
    
    const dayOfWeek = d.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    
    if (userReports.has(checkDateStr)) {
      streak++
    } else if (!isWeekend) {
      break
    }
    
    d.setDate(d.getDate() - 1)
  }
  
  return streak
}

/**
 * Section 6 - Performer Rankings
 * Calculates performance lists (top performers and those needing attention).
 */
export function calculatePerformerStatus(revenues, profiles, disReports, memberships, teams, months, currentDateStr) {
  const chronological = [...months].sort()
  const m1 = chronological[chronological.length - 1]
  const m2 = chronological.length > 1 ? chronological[chronological.length - 2] : null
  const m3 = chronological.length > 2 ? chronological[chronological.length - 3] : null
  
  const teamMap = getTeamMap(teams)
  
  const userTeamIds = {}
  memberships.forEach(m => {
    if (!userTeamIds[m.user_id]) userTeamIds[m.user_id] = []
    userTeamIds[m.user_id].push(m.team_id)
  })
  
  const last30Days = []
  const end = new Date(currentDateStr)
  const start = new Date(currentDateStr)
  start.setDate(start.getDate() - 29)
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      last30Days.push(`${year}-${month}-${day}`)
    }
  }
  const weekdaysCount = last30Days.length
  
  const nonAdminProfiles = profiles.filter(p => p.platform_role !== 'admin')
  
  return nonAdminProfiles.map(p => {
    const userTeams = (userTeamIds[p.id] || []).map(tid => teamMap[tid]).filter(Boolean)
    
    const m1Rev = revenues
      .filter(r => r.user_id === p.id && normalizeMonth(r.revenue_month) === m1)
      .reduce((sum, r) => sum + Number(r.amount || 0), 0)
    const m2Rev = m2
      ? revenues
          .filter(r => r.user_id === p.id && normalizeMonth(r.revenue_month) === m2)
          .reduce((sum, r) => sum + Number(r.amount || 0), 0)
      : 0
    const m3Rev = m3
      ? revenues
          .filter(r => r.user_id === p.id && normalizeMonth(r.revenue_month) === m3)
          .reduce((sum, r) => sum + Number(r.amount || 0), 0)
      : 0
      
    // Sparkline (last 6 months)
    const sparkline = chronological.slice(-6).map(m => {
      return revenues
        .filter(r => r.user_id === p.id && normalizeMonth(r.revenue_month) === m)
        .reduce((sum, r) => sum + Number(r.amount || 0), 0)
    })
    
    const streak = calculateDISStreak(disReports, p.id, currentDateStr)
    
    const userReports = disReports.filter(r => r.user_id === p.id && last30Days.includes(r.report_date))
    const complianceRate = weekdaysCount > 0 ? Math.round((userReports.length / weekdaysCount) * 100) : 0
    
    let status = 'Stable'
    if (m2 && m3) {
      if (m1Rev > m2Rev && m2Rev > m3Rev) status = 'Rising'
      else if (m1Rev < m2Rev && m2Rev < m3Rev) status = 'Declining'
    } else if (m2) {
      if (m1Rev > m2Rev) status = 'Rising'
      else if (m1Rev < m2Rev) status = 'Declining'
    }
    
    const hasDeclinedConsecutive = m2 && m3 && m1Rev < m2Rev && m2Rev < m3Rev
    const needsAttention = hasDeclinedConsecutive || (weekdaysCount > 0 && complianceRate < 50)
    
    return {
      id: p.id,
      name: `${p.first_name} ${p.last_name}`,
      teams: userTeams.join(', ') || 'No Team',
      m1Revenue: m1Rev,
      m2Revenue: m2Rev,
      sparkline,
      streak,
      complianceRate,
      status,
      needsAttention
    }
  })
}
