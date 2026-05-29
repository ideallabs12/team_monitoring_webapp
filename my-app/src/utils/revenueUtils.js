/**
 * Shared revenue utility functions.
 * All "month" values use the first of the month: 'YYYY-MM-01'
 */

/**
 * Returns an array of month strings ('YYYY-MM-01') for the last N months,
 * starting from the current month and going backwards.
 * Example for N=3 in May 2026: ['2026-05-01','2026-04-01','2026-03-01']
 */
export function getLastNMonths(n = 12) {
  const months = []
  const now = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(toRevenueMonthString(d.getFullYear(), d.getMonth()))
  }
  return months
}

/**
 * Returns months that admins can assign targets for.
 * Current/upcoming months are listed first, followed by recent past months.
 */
export function getTargetAssignmentMonths(pastMonths = 11, futureMonths = 12) {
  const months = []
  const now = new Date()

  for (let i = 0; i <= futureMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    months.push(toRevenueMonthString(d.getFullYear(), d.getMonth()))
  }

  for (let i = 1; i <= pastMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(toRevenueMonthString(d.getFullYear(), d.getMonth()))
  }

  return months
}

/**
 * Returns an array of month strings for the last N *completed* months.
 * This explicitly excludes the current ongoing month.
 * Example for N=3 in May 2026: ['2026-04-01','2026-03-01','2026-02-01']
 */
export function getLastNCompletedMonths(n = 12) {
  const months = []
  const now = new Date()
  for (let i = 1; i <= n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(toRevenueMonthString(d.getFullYear(), d.getMonth()))
  }
  return months
}

/**
 * Converts year (number) and month (0-indexed) to 'YYYY-MM-01' string.
 */
export function toRevenueMonthString(year, month) {
  const m = String(month + 1).padStart(2, '0')
  return `${year}-${m}-01`
}

/**
 * Parses a revenue_month string ('YYYY-MM-01' or 'YYYY-MM-DD') into a Date.
 */
export function parseRevenueMonth(dateStr) {
  const [y, m] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

/**
 * Formats a revenue_month string into a human-readable label.
 * '2026-05-01' → 'May 2026'
 */
export function formatRevenueMonth(dateStr) {
  const d = parseRevenueMonth(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
}

/**
 * Short month format: '2026-05-01' → 'May '26'
 */
export function formatRevenueMonthShort(dateStr) {
  const d = parseRevenueMonth(dateStr)
  return d.toLocaleDateString('en-US', { year: '2-digit', month: 'short' })
}

/**
 * Filter revenue records to only those within the last N months from today.
 * If n is null/undefined/0, returns all records (all-time).
 */
export function filterRevenuesByPeriod(revenues, n) {
  if (!n) return revenues
  const cutoffMonths = getLastNMonths(n)
  const cutoffSet = new Set(cutoffMonths)
  return revenues.filter(r => cutoffSet.has(normalizeMonth(r.revenue_month)))
}

/**
 * Filter revenue records to only those within the last N *completed* months.
 * Excludes the current month to prevent incomplete data from skewing averages.
 */
export function filterRevenuesByCompletedPeriod(revenues, n) {
  if (!n) return revenues
  const cutoffMonths = getLastNCompletedMonths(n)
  const cutoffSet = new Set(cutoffMonths)
  return revenues.filter(r => cutoffSet.has(normalizeMonth(r.revenue_month)))
}

/**
 * Normalize a date string to 'YYYY-MM-01' regardless of the day value.
 * Handles both 'YYYY-MM-01' and ISO strings from Supabase.
 */
export function normalizeMonth(dateStr) {
  if (!dateStr) return ''
  // Handle ISO datetime strings like '2026-05-01T00:00:00+00:00'
  const dateOnly = dateStr.substring(0, 10)
  const [y, m] = dateOnly.split('-')
  return `${y}-${m}-01`
}

/**
 * Finds the latest target assigned on or before a month.
 * Target rows act like effective dates: one assignment continues until changed.
 */
export function getEffectiveTarget(targets, userId, teamId, month) {
  const monthKey = normalizeMonth(month)
  if (!monthKey || !userId || !teamId) return null

  return targets
    .filter(t =>
      t.user_id === userId &&
      t.team_id === teamId &&
      normalizeMonth(t.target_month) <= monthKey
    )
    .sort((a, b) => normalizeMonth(b.target_month).localeCompare(normalizeMonth(a.target_month)))[0] || null
}

export function getEffectiveTargetAmount(targets, userId, teamId, month) {
  const target = getEffectiveTarget(targets, userId, teamId, month)
  return target ? Number(target.target_amount || 0) : 0
}

export function sumEffectiveTargets(targets, userIds, teamId, month) {
  return userIds.reduce((sum, userId) => {
    return sum + getEffectiveTargetAmount(targets, userId, teamId, month)
  }, 0)
}

/**
 * Sum the amounts in an array of revenue records.
 */
export function sumRevenues(revenues) {
  return revenues.reduce((sum, r) => sum + Number(r.amount || 0), 0)
}

/**
 * Predefined filter options for time periods.
 */
export const TIME_PERIOD_OPTIONS = [
  { label: 'This Month', value: 1 },
  { label: 'Last 2 Months', value: 2 },
  { label: 'Last 3 Months', value: 3 },
  { label: 'Last 6 Months', value: 6 },
  { label: 'Last 12 Months', value: 12 },
  { label: 'All Time', value: 0 },
]

/**
 * Build a map of month → revenue amount for a given set of revenue records.
 * Key: 'YYYY-MM-01', Value: amount (number).
 */
export function buildMonthlyRevenueMap(revenues) {
  const map = {}
  for (const r of revenues) {
    const key = normalizeMonth(r.revenue_month)
    map[key] = (map[key] || 0) + Number(r.amount || 0)
  }
  return map
}

/**
 * Get years for the year picker — from 2023 to current year.
 */
export function getAvailableYears() {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let y = currentYear; y >= 2023; y--) {
    years.push(y)
  }
  return years
}

/**
 * Month names (0-indexed array).
 */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

/**
 * Check if a year/month combo is in the future.
 */
export function isFutureMonth(year, month) {
  const now = new Date()
  const target = new Date(year, month, 1)
  const current = new Date(now.getFullYear(), now.getMonth(), 1)
  return target > current
}

/**
 * Calculates average revenue across standard time periods for a chart.
 */
export function calculateAverageRevenueData(revenues) {
  const periods = [
    { label: '1M', value: 1 },
    { label: '2M', value: 2 },
    { label: '3M', value: 3 },
    { label: '6M', value: 6 },
    { label: '12M', value: 12 },
    { label: 'All Time', value: 0 },
  ]
  
  return periods.map(p => {
    const filtered = filterRevenuesByPeriod(revenues, p.value)
    const sum = sumRevenues(filtered)
    
    let average = 0
    if (p.value > 0) {
      average = sum / p.value
    } else {
      // All Time: divide by unique active months
      const uniqueMonths = new Set(revenues.map(r => normalizeMonth(r.revenue_month))).size
      average = uniqueMonths > 0 ? sum / uniqueMonths : 0
    }
    
    return {
      period: p.label,
      average: Number(average.toFixed(2))
    }
  })
}
