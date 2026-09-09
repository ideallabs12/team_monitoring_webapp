import { useState, useEffect, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Download, CheckSquare, Square, FileSpreadsheet, FileText,
  Users, DollarSign, ClipboardList, MapPin, Filter, RefreshCw,
  ChevronDown, Layers, BarChart2, Sparkles, Check, AlertCircle, Eye, Table
} from 'lucide-react'
import { supabase } from '../../supabaseClient'
import * as XLSX from 'xlsx'

// ─── Data Source Definitions (Standard Export) ────────────────────────────────

const DATA_SOURCES = [
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    description: 'User profiles, roles, and team assignments',
    color: '#3b82f6',
    fields: [
      { key: 'first_name',          label: 'First Name',       default: true },
      { key: 'last_name',           label: 'Last Name',        default: true },
      { key: 'email',               label: 'Email',            default: true },
      { key: 'phone',               label: 'Phone',            default: true },
      { key: 'platform_role',       label: 'Role',             default: true },
      { key: 'team_name',           label: 'Team',             default: true },
      { key: 'secondary_team_name',  label: 'Secondary Team',   default: false },
      { key: 'is_deactivated',      label: 'Status',           default: true },
      { key: 'created_at',          label: 'Join Date',        default: false },
    ],
  },
  {
    id: 'revenue',
    label: 'Revenue',
    icon: DollarSign,
    description: 'Monthly revenue entries by user and team',
    color: '#10b981',
    fields: [
      { key: 'user_name',     label: 'User Name',  default: true },
      { key: 'team_name',     label: 'Team',       default: true },
      { key: 'revenue_month', label: 'Month',      default: true },
      { key: 'amount',        label: 'Amount',     default: true },
      { key: 'created_at',    label: 'Entered At', default: false },
    ],
  },
  {
    id: 'dis',
    label: 'DIS Reports',
    icon: ClipboardList,
    description: 'Daily improvement / DIS report submissions',
    color: '#f59e0b',
    fields: [
      { key: 'user_name',       label: 'User Name',       default: true },
      { key: 'team_name',       label: 'Team',            default: true },
      { key: 'report_date',     label: 'Date',            default: true },
      { key: 'calls_made',      label: 'Calls Made',      default: true },
      { key: 'meetings_done',   label: 'Meetings Done',   default: true },
      { key: 'leads_generated', label: 'Leads Generated', default: true },
      { key: 'revenue_closed',  label: 'Revenue Closed',  default: false },
      { key: 'notes',           label: 'Notes',           default: false },
      { key: 'created_at',      label: 'Submitted At',    default: false },
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: MapPin,
    description: 'Attendance records with check-in/out times',
    color: '#8b5cf6',
    fields: [
      { key: 'user_name',        label: 'User Name',      default: true },
      { key: 'attendance_date',  label: 'Date',           default: true },
      { key: 'status',           label: 'Status',         default: true },
      { key: 'check_in_time',    label: 'Check-in Time',  default: true },
      { key: 'check_out_time',   label: 'Check-out Time', default: true },
      { key: 'location',         label: 'Location',       default: false },
    ],
  },
]

// ─── Custom Report Definitions ────────────────────────────────────────────────

const CUSTOM_REPORTS = [
  {
    id: 'monthly_summary',
    label: 'Monthly Total Revenue',
    subtitle: '2 Columns: month and total_revenue',
    description: 'High-level executive revenue totals by month across the entire company.',
    icon: DollarSign,
    color: '#10b981',
  },
  {
    id: 'team_matrix',
    label: 'Team vs. Month Matrix',
    subtitle: 'team, jan, feb, march, apr, may, jun, jul, aug',
    description: 'Pivoted matrix showing team performance per month with discontinued team handling.',
    icon: Layers,
    color: '#3b82f6',
  },
  {
    id: 'discon_audit',
    label: 'Discontinued Team Audit',
    subtitle: 'WYNxTALKS_discon breakdown',
    description: 'Detailed audit of discontinued team members, their new destination teams, and monthly contributions.',
    icon: AlertCircle,
    color: '#f59e0b',
  },
  {
    id: 'executive_workbook',
    label: 'Executive Multi-Tab Workbook',
    subtitle: 'All views combined (.xlsx only)',
    description: 'Generates a comprehensive multi-sheet Excel workbook with all custom views and raw transactions.',
    icon: FileSpreadsheet,
    color: '#8b5cf6',
  },
]

const MONTH_KEYS = ['jan', 'feb', 'march', 'apr', 'may', 'jun', 'jul', 'aug']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatValue(key, value) {
  if (value === null || value === undefined) return ''
  if (key === 'is_deactivated') return value ? 'Deactivated' : 'Active'
  if (key === 'created_at' || key === 'report_date' || key === 'attendance_date' || key === 'check_in_time' || key === 'check_out_time') {
    if (!value) return ''
    const d = new Date(value)
    return isNaN(d.getTime()) ? value : d.toLocaleString()
  }
  if (key === 'revenue_month') {
    if (!value) return ''
    const d = new Date(value)
    return isNaN(d.getTime()) ? value : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  }
  return String(value)
}

function triggerDownload(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AdminExportData() {
  useOutletContext()

  // ── Top-level Tab ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('custom') // 'standard' | 'custom'

  // ── Standard Export State ──────────────────────────────────────────────────
  const [sourceId, setSourceId] = useState('revenue')
  const [selectedFields, setSelectedFields] = useState({})
  const [format, setFormat] = useState('xlsx')

  const [teams, setTeams] = useState([])
  const [selectedTeam, setSelectedTeam] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [rawData, setRawData] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  // ── Custom Reports State ───────────────────────────────────────────────────
  const [customReportId, setCustomReportId] = useState('monthly_summary')
  const [customYear, setCustomYear] = useState('2026')
  const [customMonthRange, setCustomMonthRange] = useState('jan_aug') // 'jan_aug' | 'all'
  const [disconHandling, setDisconHandling] = useState('reallocated') // 'reallocated' | 'merged' | 'historical' | 'current_profile'
  const [nullDisplay, setNullDisplay] = useState('NULL') // 'NULL' | '0.00'
  const [customFormat, setCustomFormat] = useState('xlsx')

  // Cache for custom reports
  const [customDataLoaded, setCustomDataLoaded] = useState(false)
  const [customLoading, setCustomLoading] = useState(false)
  const [customRevs, setCustomRevs] = useState([])
  const [customProfiles, setCustomProfiles] = useState([])
  const [customTeams, setCustomTeams] = useState([])

  const source = DATA_SOURCES.find(s => s.id === sourceId)

  // ── Load teams on mount ────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('teams').select('id, name, exclude_from_analytics').order('name').then(({ data }) => {
      if (data) {
        setTeams(data)
        setCustomTeams(data)
      }
    })
  }, [])

  // ── Init default fields on standard source change ─────────────────────────
  useEffect(() => {
    const defaults = {}
    source.fields.forEach(f => { defaults[f.key] = f.default })
    setSelectedFields(defaults)
    setRawData([])
    setError('')
    setSelectedTeam('')
    setStatusFilter('all')
    setDateFrom('')
    setDateTo('')
  }, [sourceId])

  // ── Load data for Custom Reports on demand ─────────────────────────────────
  const loadCustomReportData = async () => {
    setCustomLoading(true)
    setError('')
    try {
      const [teamsRes, profilesRes, revsRes] = await Promise.all([
        supabase.from('teams').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('monthly_revenues').select('*').order('revenue_month', { ascending: true })
      ])

      if (teamsRes.error) throw teamsRes.error
      if (profilesRes.error) throw profilesRes.error
      if (revsRes.error) throw revsRes.error

      setCustomTeams(teamsRes.data || [])
      setCustomProfiles(profilesRes.data || [])
      setCustomRevs(revsRes.data || [])
      setCustomDataLoaded(true)
    } catch (err) {
      setError(err.message || 'Failed to load report data')
    } finally {
      setCustomLoading(false)
    }
  }

  // Auto-fetch custom data when custom tab is activated
  useEffect(() => {
    if (activeTab === 'custom' && !customDataLoaded && !customLoading) {
      loadCustomReportData()
    }
  }, [activeTab, customDataLoaded, customLoading])

  // ── Fetch data for Standard Export ─────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true)
    setError('')
    setRawData([])

    try {
      const teamMap = {}
      teams.forEach(t => { teamMap[t.id] = t.name.trim() })

      if (sourceId === 'users') {
        const { data, error: e } = await supabase
          .from('profiles')
          .select('first_name, last_name, email, phone, platform_role, is_deactivated, team_id, secondary_team_id, created_at')
          .order('first_name')
        if (e) throw e
        setRawData((data || []).map(p => ({
          ...p,
          team_name: teamMap[p.team_id] || '',
          secondary_team_name: teamMap[p.secondary_team_id] || '',
        })))

      } else if (sourceId === 'revenue') {
        const { data, error: e } = await supabase
          .from('monthly_revenues')
          .select('user_id, team_id, revenue_month, amount, created_at, profiles!user_id(first_name, last_name)')
          .order('revenue_month', { ascending: false })
        if (e) throw e
        setRawData((data || []).map(r => {
          const prof = r.profiles
          return {
            ...r,
            user_name: prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : '',
            team_name: teamMap[r.team_id] || '',
          }
        }))

      } else if (sourceId === 'dis') {
        const { data, error: e } = await supabase
          .from('dis_reports')
          .select('user_id, team_id, report_date, calls_made, meetings_done, leads_generated, revenue_closed, notes, created_at, profiles!user_id(first_name, last_name)')
          .order('report_date', { ascending: false })
        if (e) throw e
        setRawData((data || []).map(r => {
          const prof = r.profiles
          return {
            ...r,
            user_name: prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : '',
            team_name: teamMap[r.team_id] || '',
          }
        }))

      } else if (sourceId === 'attendance') {
        const { data, error: e } = await supabase
          .from('attendance_logs')
          .select('user_id, attendance_date, status, check_in_time, check_out_time, location, profiles!user_id(first_name, last_name)')
          .order('attendance_date', { ascending: false })
        if (e) throw e
        setRawData((data || []).map(r => {
          const prof = r.profiles
          return {
            ...r,
            date: r.attendance_date,
            check_in: r.check_in_time,
            check_out: r.check_out_time,
            user_name: prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : '',
          }
        }))
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  // ── Standard Export Filtered Data ──────────────────────────────────────────
  const filteredData = useMemo(() => {
    let rows = [...rawData]

    if (selectedTeam) {
      rows = rows.filter(r => r.team_id === selectedTeam || r.team_name === selectedTeam)
    }

    if (sourceId === 'users' && statusFilter !== 'all') {
      rows = rows.filter(r =>
        statusFilter === 'active' ? !r.is_deactivated : r.is_deactivated
      )
    }

    if (dateFrom) {
      const from = new Date(dateFrom)
      rows = rows.filter(r => {
        const d = new Date(r.revenue_month || r.report_date || r.attendance_date || r.date || r.created_at)
        return d >= from
      })
    }
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      rows = rows.filter(r => {
        const d = new Date(r.revenue_month || r.report_date || r.attendance_date || r.date || r.created_at)
        return d <= to
      })
    }

    return rows
  }, [rawData, selectedTeam, statusFilter, dateFrom, dateTo, sourceId])

  const activeFields = source.fields.filter(f => selectedFields[f.key])

  const handleExport = async () => {
    if (rawData.length === 0) {
      await fetchData()
      return
    }
    if (filteredData.length === 0) {
      setError('No data matches the current filters.')
      return
    }
    if (activeFields.length === 0) {
      setError('Please select at least one field to export.')
      return
    }

    setExporting(true)
    try {
      const rows = filteredData.map(row => {
        const out = {}
        activeFields.forEach(f => {
          out[f.label] = formatValue(f.key, row[f.key])
        })
        return out
      })

      const timestamp = new Date().toISOString().slice(0, 10)
      const filename = `${sourceId}_export_${timestamp}`

      if (format === 'xlsx') {
        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.json_to_sheet(rows)
        ws['!cols'] = activeFields.map(f => ({ wch: Math.max(f.label.length + 4, 18) }))
        XLSX.utils.book_append_sheet(wb, ws, source.label)
        XLSX.writeFile(wb, `${filename}.xlsx`)
      } else {
        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.json_to_sheet(rows)
        const csv = XLSX.utils.sheet_to_csv(ws)
        triggerDownload(csv, `${filename}.csv`, 'text/csv;charset=utf-8;')
      }
    } catch (err) {
      setError('Export failed: ' + (err.message || err))
    } finally {
      setExporting(false)
    }
  }

  const allSelected = source.fields.every(f => selectedFields[f.key])
  const toggleAll = () => {
    const next = {}
    source.fields.forEach(f => { next[f.key] = !allSelected })
    setSelectedFields(next)
  }
  const toggleField = (key) => {
    setSelectedFields(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // ── CUSTOM REPORTS COMPUTATIONS ────────────────────────────────────────────

  const teamMap = useMemo(() => {
    const map = {}
    customTeams.forEach(t => { map[t.id] = t.name.trim() })
    return map
  }, [customTeams])

  const profileMap = useMemo(() => {
    const map = {}
    customProfiles.forEach(p => { map[p.id] = p })
    return map
  }, [customProfiles])

  const disconTeam = useMemo(() => {
    return customTeams.find(t => t.name.toLowerCase().includes('discon'))
  }, [customTeams])

  // Filter revenues by selected year
  const yearFilteredRevs = useMemo(() => {
    if (!customYear || customYear === 'all') return customRevs
    return customRevs.filter(r => (r.revenue_month || '').startsWith(customYear))
  }, [customRevs, customYear])

  // Target months for 2026/Year
  const targetMonths = useMemo(() => {
    if (customYear === 'all') {
      return [...new Set(customRevs.map(r => r.revenue_month))].sort()
    }
    const yr = customYear || '2026'
    if (customMonthRange === 'jan_aug') {
      return [
        `${yr}-01-01`, `${yr}-02-01`, `${yr}-03-01`, `${yr}-04-01`,
        `${yr}-05-01`, `${yr}-06-01`, `${yr}-07-01`, `${yr}-08-01`
      ]
    }
    // All 12 months
    const all12 = []
    for (let m = 1; m <= 12; m++) {
      all12.push(`${yr}-${String(m).padStart(2, '0')}-01`)
    }
    return all12
  }, [customYear, customMonthRange, customRevs])

  // REPORT 1: Monthly Summary Data (month, total_revenue)
  const monthlySummaryRows = useMemo(() => {
    const monthSums = {}
    targetMonths.forEach(m => { monthSums[m] = 0 })

    yearFilteredRevs.forEach(r => {
      if (monthSums[r.revenue_month] !== undefined) {
        monthSums[r.revenue_month] += Number(r.amount || 0)
      }
    })

    const rows = targetMonths.map(m => {
      const parts = m.split('-')
      const mIdx = parseInt(parts[1], 10) - 1
      const shortLabel = MONTH_KEYS[mIdx] || `m${mIdx + 1}`
      const fullLabel = `${MONTH_NAMES[mIdx] || shortLabel} ${parts[0]}`
      const amt = monthSums[m] || 0

      return {
        month: shortLabel,
        month_full: fullLabel,
        month_iso: m,
        total_revenue: amt,
      }
    })

    return rows
  }, [targetMonths, yearFilteredRevs])

  // REPORT 2: Team Matrix Data
  const teamMatrixRows = useMemo(() => {
    const activeTeamNames = customTeams
      .map(t => t.name.trim())
      .filter(name => !name.toLowerCase().includes('discon'))
      .sort()

    const teamRows = {}
    activeTeamNames.forEach(t => {
      teamRows[t] = {}
      targetMonths.forEach(m => { teamRows[t][m] = 0 })
    })

    if (disconTeam) {
      const dName = disconTeam.name.trim()
      teamRows[dName] = {}
      targetMonths.forEach(m => { teamRows[dName][m] = 0 })
    }

    teamRows['Unassigned / Deactivated (Lead)'] = {}
    targetMonths.forEach(m => { teamRows['Unassigned / Deactivated (Lead)'][m] = 0 })

    yearFilteredRevs.forEach(r => {
      if (!targetMonths.includes(r.revenue_month)) return
      const amt = Number(r.amount || 0)
      const m = r.revenue_month
      const u = profileMap[r.user_id]
      const originalTeamName = teamMap[r.team_id] || 'Unknown'

      let destinationTeam = originalTeamName

      if (disconHandling === 'reallocated') {
        if (r.team_id === disconTeam?.id) {
          const destTeamId = u?.team_id
          if (destTeamId && teamMap[destTeamId]) {
            destinationTeam = teamMap[destTeamId]
          } else {
            destinationTeam = 'Unassigned / Deactivated (Lead)'
          }
        }
      } else if (disconHandling === 'merged') {
        if (r.team_id === disconTeam?.id) {
          destinationTeam = 'WYNx TALKS'
        }
      } else if (disconHandling === 'current_profile') {
        const currTeamId = u?.team_id
        destinationTeam = currTeamId ? (teamMap[currTeamId] || 'Unassigned') : 'Unassigned / Deactivated (Lead)'
      }

      if (!teamRows[destinationTeam]) {
        teamRows[destinationTeam] = {}
        targetMonths.forEach(mon => { teamRows[destinationTeam][mon] = 0 })
      }
      teamRows[destinationTeam][m] += amt
    })

    // Format rows for table
    return Object.entries(teamRows)
      .filter(([t]) => {
        if (disconHandling === 'merged' && t.toLowerCase().includes('discon')) return false
        return true
      })
      .map(([teamName, months]) => {
        const row = { team: teamName }
        targetMonths.forEach(m => {
          const mIdx = parseInt(m.split('-')[1], 10) - 1
          const colKey = MONTH_KEYS[mIdx] || `m${mIdx + 1}`
          const val = months[m]
          row[colKey] = (val && val > 0) ? Number(val.toFixed(2)) : (nullDisplay === 'NULL' ? 'NULL' : 0)
        })
        return row
      })
  }, [customTeams, targetMonths, yearFilteredRevs, profileMap, teamMap, disconTeam, disconHandling, nullDisplay])

  // REPORT 3: Discontinued Team Audit Data
  const disconAuditRows = useMemo(() => {
    if (!disconTeam) return []
    const disconRevs = customRevs.filter(r => r.team_id === disconTeam.id && targetMonths.includes(r.revenue_month))
    const membersMap = {}

    disconRevs.forEach(r => {
      const u = profileMap[r.user_id]
      const uname = u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'Unknown Member'
      const role = u?.platform_role || 'member'
      const status = u?.is_deactivated ? 'Deactivated' : 'Active'
      const dest = u?.team_id ? (teamMap[u.team_id] || 'Unassigned') : 'Unassigned (No Team)'
      const amt = Number(r.amount || 0)

      if (!membersMap[uname]) {
        membersMap[uname] = {
          member_name: uname,
          role,
          status,
          moved_to_team: dest,
          months: {},
          total: 0
        }
        targetMonths.forEach(m => { membersMap[uname].months[m] = 0 })
      }
      membersMap[uname].months[r.revenue_month] += amt
      membersMap[uname].total += amt
    })

    return Object.values(membersMap)
      .sort((a, b) => b.total - a.total)
      .map(item => {
        const row = {
          member_name: item.member_name,
          role: item.role,
          status: item.status,
          moved_to_team: item.moved_to_team,
        }
        targetMonths.forEach(m => {
          const mIdx = parseInt(m.split('-')[1], 10) - 1
          const colKey = MONTH_KEYS[mIdx] || `m${mIdx + 1}`
          const val = item.months[m]
          row[colKey] = (val && val > 0) ? Number(val.toFixed(2)) : (nullDisplay === 'NULL' ? 'NULL' : 0)
        })
        row.total = Number(item.total.toFixed(2))
        return row
      })
  }, [disconTeam, customRevs, targetMonths, profileMap, teamMap, nullDisplay])

  // ── Custom Export Download Handlers ────────────────────────────────────────
  const handleCustomDownload = () => {
    try {
      const timestamp = new Date().toISOString().slice(0, 10)

      if (customReportId === 'monthly_summary') {
        const rows = monthlySummaryRows.map(r => ({
          month: r.month,
          total_revenue: r.total_revenue,
        }))

        const filename = `monthly_revenue_${customYear}_${timestamp}`
        if (customFormat === 'xlsx') {
          const wb = XLSX.utils.book_new()
          const ws = XLSX.utils.json_to_sheet(rows)
          ws['!cols'] = [{ wch: 15 }, { wch: 20 }]
          XLSX.utils.book_append_sheet(wb, ws, 'Monthly_Revenue')
          XLSX.writeFile(wb, `${filename}.xlsx`)
        } else {
          const ws = XLSX.utils.json_to_sheet(rows)
          const csv = XLSX.utils.sheet_to_csv(ws)
          triggerDownload(csv, `${filename}.csv`, 'text/csv;charset=utf-8;')
        }

      } else if (customReportId === 'team_matrix') {
        const filename = `team_revenue_matrix_${customYear}_${timestamp}`
        if (customFormat === 'xlsx') {
          const wb = XLSX.utils.book_new()
          const ws = XLSX.utils.json_to_sheet(teamMatrixRows)
          ws['!cols'] = [{ wch: 26 }, ...MONTH_KEYS.map(() => ({ wch: 14 }))]
          XLSX.utils.book_append_sheet(wb, ws, 'Team_Matrix')
          XLSX.writeFile(wb, `${filename}.xlsx`)
        } else {
          const ws = XLSX.utils.json_to_sheet(teamMatrixRows)
          const csv = XLSX.utils.sheet_to_csv(ws)
          triggerDownload(csv, `${filename}.csv`, 'text/csv;charset=utf-8;')
        }

      } else if (customReportId === 'discon_audit') {
        const filename = `discontinued_team_audit_${customYear}_${timestamp}`
        if (customFormat === 'xlsx') {
          const wb = XLSX.utils.book_new()
          const ws = XLSX.utils.json_to_sheet(disconAuditRows)
          ws['!cols'] = [{ wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, ...MONTH_KEYS.map(() => ({ wch: 12 })), { wch: 15 }]
          XLSX.utils.book_append_sheet(wb, ws, 'Discon_Audit')
          XLSX.writeFile(wb, `${filename}.xlsx`)
        } else {
          const ws = XLSX.utils.json_to_sheet(disconAuditRows)
          const csv = XLSX.utils.sheet_to_csv(ws)
          triggerDownload(csv, `${filename}.csv`, 'text/csv;charset=utf-8;')
        }

      } else if (customReportId === 'executive_workbook') {
        const wb = XLSX.utils.book_new()

        // 1. Monthly Summary
        const wsMonth = XLSX.utils.json_to_sheet(monthlySummaryRows.map(r => ({ month: r.month, total_revenue: r.total_revenue })))
        wsMonth['!cols'] = [{ wch: 16 }, { wch: 20 }]
        XLSX.utils.book_append_sheet(wb, wsMonth, 'Monthly_Revenue')

        // 2. Team Matrix Reallocated
        const wsReallocated = XLSX.utils.json_to_sheet(teamMatrixRows)
        wsReallocated['!cols'] = [{ wch: 26 }, ...MONTH_KEYS.map(() => ({ wch: 14 }))]
        XLSX.utils.book_append_sheet(wb, wsReallocated, 'Team_Matrix')

        // 3. Discontinued Team Audit
        if (disconAuditRows.length > 0) {
          const wsAudit = XLSX.utils.json_to_sheet(disconAuditRows)
          wsAudit['!cols'] = [{ wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, ...MONTH_KEYS.map(() => ({ wch: 12 })), { wch: 15 }]
          XLSX.utils.book_append_sheet(wb, wsAudit, 'Discontinued_Audit')
        }

        // 4. Raw Transactions
        const rawRows = yearFilteredRevs.map(r => {
          const u = profileMap[r.user_id]
          return {
            revenue_month: r.revenue_month,
            amount: Number(r.amount || 0),
            member_name: u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'Unknown',
            team_logged: teamMap[r.team_id] || '',
            member_current_team: u?.team_id ? (teamMap[u.team_id] || '') : '',
            client_name: r.client_name || '',
            source: r.source || '',
            logged_at: (r.created_at || '').substring(0, 19).replace('T', ' ')
          }
        })
        const wsRaw = XLSX.utils.json_to_sheet(rawRows)
        XLSX.utils.book_append_sheet(wb, wsRaw, 'All_Transactions')

        XLSX.writeFile(wb, `Executive_Revenue_Workbook_${customYear}_${timestamp}.xlsx`)
      }
    } catch (err) {
      setError('Custom export failed: ' + (err.message || err))
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const SourceIcon = source.icon

  return (
    <div style={{ padding: '0 0 40px 0' }}>

      {/* ── Page Header ── */}
      <div className="admin-page-header" style={{ marginBottom: '24px' }}>
        <div className="admin-page-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
          <Download size={28} />
        </div>
        <div>
          <h1 className="admin-page-title">Export Data</h1>
          <p className="admin-page-subtitle">Download standard database collections or custom executive revenue reports</p>
        </div>
      </div>

      {/* ── Top Segmented Navigation Tabs ── */}
      <div style={{
        display: 'inline-flex',
        padding: '4px',
        background: 'var(--apple-bg-secondary)',
        borderRadius: '12px',
        marginBottom: '24px',
        border: '1px solid var(--apple-border)',
        gap: '4px'
      }}>
        <button
          onClick={() => setActiveTab('custom')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '9px 20px', borderRadius: '9px', border: 'none', cursor: 'pointer',
            fontSize: '0.86rem', fontWeight: activeTab === 'custom' ? 600 : 500,
            background: activeTab === 'custom' ? 'var(--apple-card-bg)' : 'transparent',
            color: activeTab === 'custom' ? 'var(--apple-text-primary)' : 'var(--apple-text-secondary)',
            boxShadow: activeTab === 'custom' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Sparkles size={16} color={activeTab === 'custom' ? 'var(--apple-accent-blue)' : 'var(--apple-text-secondary)'} />
          <span>Custom Reports & Analytics</span>
          <span style={{
            fontSize: '0.68rem', padding: '2px 7px', borderRadius: '10px',
            background: 'rgba(59,130,246,0.15)', color: 'var(--apple-accent-blue)', fontWeight: 700
          }}>
            EXECUTIVE
          </span>
        </button>

        <button
          onClick={() => setActiveTab('standard')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '9px 20px', borderRadius: '9px', border: 'none', cursor: 'pointer',
            fontSize: '0.86rem', fontWeight: activeTab === 'standard' ? 600 : 500,
            background: activeTab === 'standard' ? 'var(--apple-card-bg)' : 'transparent',
            color: activeTab === 'standard' ? 'var(--apple-text-primary)' : 'var(--apple-text-secondary)',
            boxShadow: activeTab === 'standard' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Table size={16} />
          <span>Standard Data Export</span>
        </button>
      </div>

      {/* ── ERROR BANNER ── */}
      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: '0.85rem', marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          TAB 1: CUSTOM REPORTS & ANALYTICS EXPORT
      ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'custom' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>

          {/* ── LEFT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Step 1: Select Custom Report */}
            <div className="card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--apple-text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--apple-accent-blue)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>1</span>
                Choose Custom Report
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {CUSTOM_REPORTS.map(rep => {
                  const RepIcon = rep.icon
                  const active = customReportId === rep.id
                  return (
                    <button
                      key={rep.id}
                      onClick={() => setCustomReportId(rep.id)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '12px',
                        padding: '14px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                        textAlign: 'left', transition: 'all 0.15s',
                        background: active ? `${rep.color}15` : 'var(--apple-bg-secondary)',
                        outline: active ? `2px solid ${rep.color}` : '2px solid transparent',
                      }}
                    >
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${rep.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: rep.color }}>
                        <RepIcon size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--apple-text-primary)' }}>{rep.label}</div>
                        <div style={{ fontSize: '0.72rem', color: rep.color, fontWeight: 600, marginTop: '2px' }}>{rep.subtitle}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', marginTop: '4px', lineHeight: 1.3 }}>{rep.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Step 2: Custom Filters & Discontinued Team Configuration */}
            <div className="card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--apple-text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--apple-accent-blue)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>2</span>
                <Filter size={15} />
                Report Settings & Period
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>

                {/* Year Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--apple-text-secondary)', marginBottom: '6px', fontWeight: 500 }}>Select Year</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={customYear}
                      onChange={e => setCustomYear(e.target.value)}
                      style={{ width: '100%', padding: '9px 32px 9px 12px', borderRadius: '10px', border: '1.5px solid var(--apple-border)', background: 'var(--apple-bg-secondary)', color: 'var(--apple-text-primary)', fontSize: '0.85rem', appearance: 'none', cursor: 'pointer' }}
                    >
                      <option value="2026">2026 (Current)</option>
                      <option value="2025">2025</option>
                      <option value="2024">2024</option>
                      <option value="all">All Time</option>
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Month Range */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--apple-text-secondary)', marginBottom: '6px', fontWeight: 500 }}>Month Range</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={customMonthRange}
                      onChange={e => setCustomMonthRange(e.target.value)}
                      style={{ width: '100%', padding: '9px 32px 9px 12px', borderRadius: '10px', border: '1.5px solid var(--apple-border)', background: 'var(--apple-bg-secondary)', color: 'var(--apple-text-primary)', fontSize: '0.85rem', appearance: 'none', cursor: 'pointer' }}
                    >
                      <option value="jan_aug">Jan – Aug (Completed Months)</option>
                      <option value="all">All Months in Year</option>
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Discontinued Team Handling (Active for Team Matrix) */}
                {customReportId === 'team_matrix' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--apple-text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
                      Discontinued Team Handling
                    </label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={disconHandling}
                        onChange={e => setDisconHandling(e.target.value)}
                        style={{ width: '100%', padding: '9px 32px 9px 12px', borderRadius: '10px', border: '1.5px solid var(--apple-border)', background: 'var(--apple-bg-secondary)', color: 'var(--apple-text-primary)', fontSize: '0.85rem', appearance: 'none', cursor: 'pointer' }}
                      >
                        <option value="reallocated">Reallocate to Moved Members' Teams (Recommended)</option>
                        <option value="merged">Merge into WYNx TALKS (Successor)</option>
                        <option value="historical">Historical DB Logged (As Entered)</option>
                        <option value="current_profile">By Member's Current Assigned Team</option>
                      </select>
                      <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)', pointerEvents: 'none' }} />
                    </div>
                  </div>
                )}

                {/* Null / Zero Display */}
                {customReportId !== 'monthly_summary' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--apple-text-secondary)', marginBottom: '6px', fontWeight: 500 }}>Zero Revenue Label</label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={nullDisplay}
                        onChange={e => setNullDisplay(e.target.value)}
                        style={{ width: '100%', padding: '9px 32px 9px 12px', borderRadius: '10px', border: '1.5px solid var(--apple-border)', background: 'var(--apple-bg-secondary)', color: 'var(--apple-text-primary)', fontSize: '0.85rem', appearance: 'none', cursor: 'pointer' }}
                      >
                        <option value="NULL">Display 'NULL'</option>
                        <option value="0.00">Display 0.00</option>
                      </select>
                      <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)', pointerEvents: 'none' }} />
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Step 3: Live Preview Table */}
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--apple-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={16} color="var(--apple-accent-blue)" />
                  Live Table Preview
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>
                  {customLoading ? 'Loading data…' : 'Computed instantly from active database'}
                </span>
              </div>

              {customLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>
                  <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px auto' }} />
                  <div>Calculating report metrics...</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid var(--apple-border)', borderRadius: '10px' }}>

                  {/* PREVIEW: Monthly Summary */}
                  {customReportId === 'monthly_summary' && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--apple-bg-secondary)', borderBottom: '1px solid var(--apple-border)' }}>
                          <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--apple-text-secondary)' }}>month</th>
                          <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--apple-text-secondary)' }}>total_revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlySummaryRows.map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--apple-border)', background: i % 2 === 1 ? 'rgba(0,0,0,0.015)' : 'transparent' }}>
                            <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--apple-text-primary)' }}>{r.month}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: 'var(--apple-text-primary)' }}>
                              ${r.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ background: 'rgba(59,130,246,0.06)', fontWeight: 700 }}>
                          <td style={{ padding: '12px 16px', color: 'var(--apple-text-primary)' }}>TOTAL</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--apple-accent-blue)', fontSize: '0.9rem' }}>
                            ${monthlySummaryRows.reduce((s, r) => s + r.total_revenue, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}

                  {/* PREVIEW: Team Matrix */}
                  {customReportId === 'team_matrix' && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--apple-bg-secondary)', borderBottom: '1px solid var(--apple-border)' }}>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--apple-text-secondary)', minWidth: '160px' }}>team</th>
                          {MONTH_KEYS.slice(0, targetMonths.length).map(m => (
                            <th key={m} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--apple-text-secondary)' }}>{m}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {teamMatrixRows.map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--apple-border)', background: r.team.includes('discon') || r.team.includes('Lead') ? 'rgba(239,68,68,0.03)' : 'transparent' }}>
                            <td style={{ padding: '9px 14px', fontWeight: 600, color: 'var(--apple-text-primary)' }}>{r.team}</td>
                            {MONTH_KEYS.slice(0, targetMonths.length).map(m => {
                              const val = r[m]
                              const isNull = val === 'NULL'
                              return (
                                <td key={m} style={{
                                  padding: '9px 12px', textAlign: isNull ? 'center' : 'right',
                                  color: isNull ? 'var(--apple-text-secondary)' : 'var(--apple-text-primary)',
                                  fontStyle: isNull ? 'italic' : 'normal',
                                  fontWeight: isNull ? 400 : 500
                                }}>
                                  {isNull ? 'NULL' : (typeof val === 'number' ? `$${val.toLocaleString()}` : val)}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* PREVIEW: Discontinued Team Audit */}
                  {customReportId === 'discon_audit' && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--apple-bg-secondary)', borderBottom: '1px solid var(--apple-border)' }}>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--apple-text-secondary)' }}>member_name</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--apple-text-secondary)' }}>role</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--apple-text-secondary)' }}>moved_to_team</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--apple-text-secondary)' }}>total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {disconAuditRows.map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--apple-border)' }}>
                            <td style={{ padding: '9px 14px', fontWeight: 600, color: 'var(--apple-text-primary)' }}>{r.member_name}</td>
                            <td style={{ padding: '9px 12px', color: 'var(--apple-text-secondary)' }}>{r.role}</td>
                            <td style={{ padding: '9px 12px', color: 'var(--apple-accent-blue)', fontWeight: 600 }}>{r.moved_to_team}</td>
                            <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--apple-text-primary)' }}>
                              ${Number(r.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ background: 'rgba(59,130,246,0.06)', fontWeight: 700 }}>
                          <td colSpan={3} style={{ padding: '12px 14px', color: 'var(--apple-text-primary)' }}>TOTAL DISCONTINUED REVENUE</td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--apple-accent-blue)', fontSize: '0.88rem' }}>
                            ${disconAuditRows.reduce((s, r) => s + Number(r.total || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}

                  {/* PREVIEW: Executive Workbook */}
                  {customReportId === 'executive_workbook' && (
                    <div style={{ padding: '24px', textAlign: 'center' }}>
                      <FileSpreadsheet size={40} color="var(--apple-accent-blue)" style={{ margin: '0 auto 12px auto' }} />
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--apple-text-primary)', marginBottom: '6px' }}>
                        Executive Multi-Sheet Excel Workbook
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--apple-text-secondary)', maxWidth: '440px', margin: '0 auto 16px auto', lineHeight: 1.4 }}>
                        Will generate an Excel workbook with sheets: <strong>Monthly_Revenue</strong>, <strong>Team_Matrix</strong>, <strong>Discontinued_Audit</strong>, and <strong>All_Transactions</strong>.
                      </div>
                      <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {['Monthly_Revenue (2 Cols)', 'Team_Matrix', 'Discontinued_Audit', 'All_Transactions'].map(tab => (
                          <span key={tab} style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '20px', background: 'rgba(59,130,246,0.1)', color: 'var(--apple-accent-blue)', fontWeight: 600 }}>
                            {tab}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>

          </div>

          {/* ── RIGHT COLUMN: Summary & Download ── */}
          <div style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div className="card" style={{ padding: '22px' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--apple-text-primary)', marginBottom: '16px' }}>
                Custom Export Summary
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', marginBottom: '12px' }}>
                <Sparkles size={16} color="var(--apple-accent-blue)" />
                <span style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--apple-text-primary)' }}>
                  {CUSTOM_REPORTS.find(r => r.id === customReportId)?.label}
                </span>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--apple-bg-secondary)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--apple-text-primary)' }}>
                    {customYear}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>Year</div>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--apple-bg-secondary)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--apple-text-primary)' }}>
                    {targetMonths.length}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>Months</div>
                </div>
              </div>

              {/* Grand Total */}
              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', marginBottom: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Revenue</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                  ${monthlySummaryRows.reduce((s, r) => s + r.total_revenue, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Format selection */}
              {customReportId !== 'executive_workbook' && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.73rem', color: 'var(--apple-text-secondary)', marginBottom: '8px', fontWeight: 500 }}>FORMAT</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      { id: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
                      { id: 'csv',  label: 'CSV (.csv)',   icon: FileText },
                    ].map(fmt => {
                      const FmtIcon = fmt.icon
                      const active = customFormat === fmt.id
                      return (
                        <button
                          key={fmt.id}
                          onClick={() => setCustomFormat(fmt.id)}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                            padding: '12px 8px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                            background: active ? 'rgba(59,130,246,0.12)' : 'var(--apple-bg-secondary)',
                            outline: active ? '2px solid rgba(59,130,246,0.5)' : '2px solid transparent',
                            transition: 'all 0.12s',
                          }}
                        >
                          <FmtIcon size={18} color={active ? 'var(--apple-accent-blue)' : 'var(--apple-text-secondary)'} />
                          <span style={{ fontSize: '0.72rem', fontWeight: active ? 600 : 400, color: active ? 'var(--apple-text-primary)' : 'var(--apple-text-secondary)' }}>
                            {fmt.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Refresh Data Button */}
            <button
              onClick={loadCustomReportData}
              disabled={customLoading}
              style={{
                width: '100%', padding: '10px', borderRadius: '10px', border: 'none', cursor: customLoading ? 'not-allowed' : 'pointer',
                background: 'var(--apple-bg-secondary)', color: 'var(--apple-text-secondary)',
                fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                transition: 'all 0.15s',
              }}
            >
              <RefreshCw size={13} className={customLoading ? 'spin' : ''} />
              {customLoading ? 'Refreshing…' : 'Refresh Report Data'}
            </button>

            {/* Download Button */}
            <button
              onClick={handleCustomDownload}
              disabled={customLoading || (customReportId === 'monthly_summary' && monthlySummaryRows.length === 0)}
              style={{
                width: '100%', padding: '15px', borderRadius: '12px', border: 'none',
                cursor: customLoading ? 'not-allowed' : 'pointer',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: '#fff', fontSize: '0.92rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
                transition: 'all 0.15s',
                boxShadow: '0 4px 14px rgba(59,130,246,0.4)',
              }}
            >
              <Download size={17} />
              {customReportId === 'executive_workbook'
                ? 'Download Executive Workbook (.XLSX)'
                : `Download ${customFormat.toUpperCase()}`}
            </button>

          </div>

        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          TAB 2: STANDARD DATA EXPORT
      ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'standard' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>

          {/* ── LEFT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Section 1 — Data Source */}
            <div className="card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--apple-text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--apple-accent-blue)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>1</span>
                Choose Data Source
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {DATA_SOURCES.map(src => {
                  const SrcIcon = src.icon
                  const active = sourceId === src.id
                  return (
                    <button
                      key={src.id}
                      onClick={() => setSourceId(src.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '14px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                        textAlign: 'left', transition: 'all 0.15s',
                        background: active ? `${src.color}18` : 'var(--apple-bg-secondary)',
                        outline: active ? `2px solid ${src.color}` : '2px solid transparent',
                      }}
                    >
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${src.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: src.color }}>
                        <SrcIcon size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--apple-text-primary)' }}>{src.label}</div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--apple-text-secondary)', marginTop: '2px', lineHeight: 1.3 }}>{src.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Section 2 — Field Selector */}
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--apple-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--apple-accent-blue)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>2</span>
                  Select Fields
                </h2>
                <button
                  onClick={toggleAll}
                  style={{ fontSize: '0.78rem', color: 'var(--apple-accent-blue)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500, padding: '4px 8px', borderRadius: '6px' }}
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {source.fields.map(field => {
                  const checked = !!selectedFields[field.key]
                  return (
                    <label
                      key={field.key}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '9px',
                        padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                        background: checked ? 'rgba(59,130,246,0.08)' : 'var(--apple-bg-secondary)',
                        border: checked ? '1.5px solid rgba(59,130,246,0.35)' : '1.5px solid transparent',
                        transition: 'all 0.12s', userSelect: 'none',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleField(field.key)}
                        style={{ display: 'none' }}
                      />
                      {checked
                        ? <CheckSquare size={16} color="var(--apple-accent-blue)" strokeWidth={2.5} />
                        : <Square size={16} color="var(--apple-text-secondary)" />
                      }
                      <span style={{ fontSize: '0.82rem', color: checked ? 'var(--apple-text-primary)' : 'var(--apple-text-secondary)', fontWeight: checked ? 500 : 400 }}>
                        {field.label}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Section 3 — Filters */}
            <div className="card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--apple-text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--apple-accent-blue)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>3</span>
                <Filter size={15} />
                Filters <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--apple-text-secondary)' }}>(optional)</span>
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>

                {/* Team filter */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--apple-text-secondary)', marginBottom: '6px', fontWeight: 500 }}>Filter by Team</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={selectedTeam}
                      onChange={e => setSelectedTeam(e.target.value)}
                      style={{ width: '100%', padding: '9px 32px 9px 12px', borderRadius: '10px', border: '1.5px solid var(--apple-border)', background: 'var(--apple-bg-secondary)', color: 'var(--apple-text-primary)', fontSize: '0.85rem', appearance: 'none', cursor: 'pointer' }}
                    >
                      <option value="">All Teams</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Status filter (users only) */}
                {sourceId === 'users' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--apple-text-secondary)', marginBottom: '6px', fontWeight: 500 }}>Filter by Status</label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        style={{ width: '100%', padding: '9px 32px 9px 12px', borderRadius: '10px', border: '1.5px solid var(--apple-border)', background: 'var(--apple-bg-secondary)', color: 'var(--apple-text-primary)', fontSize: '0.85rem', appearance: 'none', cursor: 'pointer' }}
                      >
                        <option value="all">All Users</option>
                        <option value="active">Active Only</option>
                        <option value="deactivated">Deactivated Only</option>
                      </select>
                      <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)', pointerEvents: 'none' }} />
                    </div>
                  </div>
                )}

                {/* Date range (non-users) */}
                {sourceId !== 'users' && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--apple-text-secondary)', marginBottom: '6px', fontWeight: 500 }}>From Date</label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid var(--apple-border)', background: 'var(--apple-bg-secondary)', color: 'var(--apple-text-primary)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--apple-text-secondary)', marginBottom: '6px', fontWeight: 500 }}>To Date</label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid var(--apple-border)', background: 'var(--apple-bg-secondary)', color: 'var(--apple-text-primary)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN — Summary & Export ── */}
          <div style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div className="card" style={{ padding: '22px' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--apple-text-primary)', marginBottom: '16px' }}>Export Summary</h3>

              {/* Source */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: `${source.color}12`, marginBottom: '12px' }}>
                <SourceIcon size={16} color={source.color} />
                <span style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--apple-text-primary)' }}>{source.label}</span>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--apple-bg-secondary)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--apple-text-primary)' }}>
                    {loading ? '…' : filteredData.length}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>Rows</div>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--apple-bg-secondary)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--apple-text-primary)' }}>
                    {activeFields.length}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>Fields</div>
                </div>
              </div>

              {/* Selected fields preview */}
              {activeFields.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.73rem', color: 'var(--apple-text-secondary)', marginBottom: '6px', fontWeight: 500 }}>COLUMNS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {activeFields.map(f => (
                      <span key={f.key} style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '20px', background: 'rgba(59,130,246,0.12)', color: 'var(--apple-accent-blue)', fontWeight: 500 }}>
                        {f.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Format */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.73rem', color: 'var(--apple-text-secondary)', marginBottom: '8px', fontWeight: 500 }}>FORMAT</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { id: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
                    { id: 'csv',  label: 'CSV (.csv)',   icon: FileText },
                  ].map(fmt => {
                    const FmtIcon = fmt.icon
                    const active = format === fmt.id
                    return (
                      <button
                        key={fmt.id}
                        onClick={() => setFormat(fmt.id)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                          padding: '12px 8px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                          background: active ? 'rgba(59,130,246,0.12)' : 'var(--apple-bg-secondary)',
                          outline: active ? '2px solid rgba(59,130,246,0.5)' : '2px solid transparent',
                          transition: 'all 0.12s',
                        }}
                      >
                        <FmtIcon size={18} color={active ? 'var(--apple-accent-blue)' : 'var(--apple-text-secondary)'} />
                        <span style={{ fontSize: '0.72rem', fontWeight: active ? 600 : 400, color: active ? 'var(--apple-text-primary)' : 'var(--apple-text-secondary)' }}>
                          {fmt.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Load Data Button */}
            {rawData.length === 0 && (
              <button
                onClick={fetchData}
                disabled={loading}
                style={{
                  width: '100%', padding: '13px', borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  background: 'var(--apple-bg-secondary)', color: 'var(--apple-text-primary)',
                  fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.15s', opacity: loading ? 0.6 : 1,
                }}
              >
                <RefreshCw size={16} className={loading ? 'spin' : ''} />
                {loading ? 'Loading…' : 'Load Preview'}
              </button>
            )}

            {rawData.length > 0 && (
              <button
                onClick={fetchData}
                style={{
                  width: '100%', padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  background: 'transparent', color: 'var(--apple-text-secondary)',
                  fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'all 0.15s',
                }}
              >
                <RefreshCw size={13} />
                Refresh Data
              </button>
            )}

            {/* Download Button */}
            <button
              onClick={handleExport}
              disabled={exporting || activeFields.length === 0 || (rawData.length === 0)}
              style={{
                width: '100%', padding: '15px', borderRadius: '12px', border: 'none',
                cursor: (exporting || activeFields.length === 0 || rawData.length === 0) ? 'not-allowed' : 'pointer',
                background: (exporting || activeFields.length === 0 || rawData.length === 0)
                  ? 'var(--apple-bg-secondary)'
                  : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: (activeFields.length === 0 || rawData.length === 0) ? 'var(--apple-text-secondary)' : '#fff',
                fontSize: '0.92rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
                transition: 'all 0.15s',
                boxShadow: (activeFields.length > 0 && rawData.length > 0 && !exporting) ? '0 4px 14px rgba(59,130,246,0.4)' : 'none',
              }}
            >
              <Download size={17} />
              {exporting ? 'Exporting…' : rawData.length === 0 ? 'Load Data First' : `Download ${format.toUpperCase()}`}
            </button>

            {rawData.length > 0 && filteredData.length !== rawData.length && (
              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--apple-text-secondary)', margin: 0 }}>
                {filteredData.length} of {rawData.length} rows match filters
              </p>
            )}

          </div>
        </div>
      )}

      {/* Spinner keyframes */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
        @media (max-width: 900px) {
          .export-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
