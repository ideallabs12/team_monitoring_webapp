import { useState, useEffect, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Download, CheckSquare, Square, FileSpreadsheet, FileText, Users, DollarSign, ClipboardList, MapPin, Filter, RefreshCw, ChevronDown } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import * as XLSX from 'xlsx'

// ─── Data Source Definitions ──────────────────────────────────────────────────

const DATA_SOURCES = [
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    description: 'User profiles, roles, and team assignments',
    color: '#3b82f6',
    fields: [
      { key: 'first_name',       label: 'First Name',       default: true },
      { key: 'last_name',        label: 'Last Name',        default: true },
      { key: 'email',            label: 'Email',            default: true },
      { key: 'phone',            label: 'Phone',            default: true },
      { key: 'platform_role',    label: 'Role',             default: true },
      { key: 'team_name',        label: 'Team',             default: true },
      { key: 'secondary_team_name', label: 'Secondary Team', default: false },
      { key: 'is_deactivated',   label: 'Status',           default: true },
      { key: 'created_at',       label: 'Join Date',        default: false },
    ],
  },
  {
    id: 'revenue',
    label: 'Revenue',
    icon: DollarSign,
    description: 'Monthly revenue entries by user and team',
    color: '#10b981',
    fields: [
      { key: 'user_name',    label: 'User Name',  default: true },
      { key: 'team_name',    label: 'Team',       default: true },
      { key: 'revenue_month',label: 'Month',      default: true },
      { key: 'amount',       label: 'Amount',     default: true },
      { key: 'created_at',   label: 'Entered At', default: false },
    ],
  },
  {
    id: 'dis',
    label: 'DIS Reports',
    icon: ClipboardList,
    description: 'Daily improvement / DIS report submissions',
    color: '#f59e0b',
    fields: [
      { key: 'user_name',     label: 'User Name',    default: true },
      { key: 'team_name',     label: 'Team',         default: true },
      { key: 'report_date',   label: 'Date',         default: true },
      { key: 'calls_made',    label: 'Calls Made',   default: true },
      { key: 'meetings_done', label: 'Meetings Done',default: true },
      { key: 'leads_generated',label:'Leads Generated',default: true },
      { key: 'revenue_closed',label: 'Revenue Closed',default: false },
      { key: 'notes',         label: 'Notes',        default: false },
      { key: 'created_at',    label: 'Submitted At', default: false },
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: MapPin,
    description: 'Attendance records with check-in/out times',
    color: '#8b5cf6',
    fields: [
      { key: 'user_name',    label: 'User Name',      default: true },
      { key: 'date',         label: 'Date',           default: true },
      { key: 'status',       label: 'Status',         default: true },
      { key: 'check_in',     label: 'Check-in Time',  default: true },
      { key: 'check_out',    label: 'Check-out Time', default: true },
      { key: 'location',     label: 'Location',       default: false },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatValue(key, value) {
  if (value === null || value === undefined) return ''
  if (key === 'is_deactivated') return value ? 'Deactivated' : 'Active'
  if (key === 'created_at' || key === 'report_date' || key === 'date' || key === 'check_in' || key === 'check_out') {
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

  // ── State ──────────────────────────────────────────────────────────────────
  const [sourceId, setSourceId] = useState('users')
  const [selectedFields, setSelectedFields] = useState({})
  const [format, setFormat] = useState('xlsx')

  // Filters
  const [teams, setTeams] = useState([])
  const [selectedTeam, setSelectedTeam] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')    // 'all' | 'active' | 'deactivated'
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Raw data
  const [rawData, setRawData] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const source = DATA_SOURCES.find(s => s.id === sourceId)

  // ── Init default fields on source change ──────────────────────────────────
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

  // ── Load teams once ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('teams').select('id, name').order('name').then(({ data }) => {
      if (data) setTeams(data)
    })
  }, [])

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true)
    setError('')
    setRawData([])

    try {
      // Build team map
      const teamMap = {}
      teams.forEach(t => { teamMap[t.id] = t.name })

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
          .select('user_id, team_id, revenue_month, amount, created_at, profiles(first_name, last_name)')
          .order('revenue_month', { ascending: false })
        if (e) throw e
        setRawData((data || []).map(r => ({
          ...r,
          user_name: r.profiles ? `${r.profiles.first_name || ''} ${r.profiles.last_name || ''}`.trim() : '',
          team_name: teamMap[r.team_id] || '',
        })))

      } else if (sourceId === 'dis') {
        const { data, error: e } = await supabase
          .from('dis_reports')
          .select('user_id, team_id, report_date, calls_made, meetings_done, leads_generated, revenue_closed, notes, created_at, profiles(first_name, last_name)')
          .order('report_date', { ascending: false })
        if (e) throw e
        setRawData((data || []).map(r => ({
          ...r,
          user_name: r.profiles ? `${r.profiles.first_name || ''} ${r.profiles.last_name || ''}`.trim() : '',
          team_name: teamMap[r.team_id] || '',
        })))

      } else if (sourceId === 'attendance') {
        const { data, error: e } = await supabase
          .from('attendance')
          .select('user_id, date, status, check_in, check_out, location, profiles(first_name, last_name)')
          .order('date', { ascending: false })
        if (e) throw e
        setRawData((data || []).map(r => ({
          ...r,
          user_name: r.profiles ? `${r.profiles.first_name || ''} ${r.profiles.last_name || ''}`.trim() : '',
        })))
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  // ── Apply filters ──────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    let rows = [...rawData]

    // Team filter
    if (selectedTeam) {
      rows = rows.filter(r => r.team_id === selectedTeam || r.team_name === selectedTeam)
    }

    // Status filter (users only)
    if (sourceId === 'users' && statusFilter !== 'all') {
      rows = rows.filter(r =>
        statusFilter === 'active' ? !r.is_deactivated : r.is_deactivated
      )
    }

    // Date range filter (revenue/dis/attendance)
    if (dateFrom) {
      const from = new Date(dateFrom)
      rows = rows.filter(r => {
        const d = new Date(r.revenue_month || r.report_date || r.date || r.created_at)
        return d >= from
      })
    }
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      rows = rows.filter(r => {
        const d = new Date(r.revenue_month || r.report_date || r.date || r.created_at)
        return d <= to
      })
    }

    return rows
  }, [rawData, selectedTeam, statusFilter, dateFrom, dateTo, sourceId])

  // ── Active fields list ─────────────────────────────────────────────────────
  const activeFields = source.fields.filter(f => selectedFields[f.key])

  // ── Export ─────────────────────────────────────────────────────────────────
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
        // Auto column widths
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

  // ── Select all / none ──────────────────────────────────────────────────────
  const allSelected = source.fields.every(f => selectedFields[f.key])
  const toggleAll = () => {
    const next = {}
    source.fields.forEach(f => { next[f.key] = !allSelected })
    setSelectedFields(next)
  }

  const toggleField = (key) => {
    setSelectedFields(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const SourceIcon = source.icon

  return (
    <div style={{ padding: '0 0 40px 0' }}>

      {/* ── Page Header ── */}
      <div className="admin-page-header" style={{ marginBottom: '28px' }}>
        <div className="admin-page-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
          <Download size={28} />
        </div>
        <div>
          <h1 className="admin-page-title">Export Data</h1>
          <p className="admin-page-subtitle">Select a data source, choose fields, apply filters, and download</p>
        </div>
      </div>

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

          {/* Error */}
          {error && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

        </div>

        {/* ── RIGHT COLUMN — Summary & Export ── */}
        <div style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Preview Card */}
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
