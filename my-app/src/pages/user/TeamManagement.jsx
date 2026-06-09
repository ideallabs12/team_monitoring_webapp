import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { 
  Check, 
  Edit2, 
  X, 
  Edit3,
  Trash2,
  Calendar,
  Link2 as LinkIcon,
  Info,
  DollarSign,
  User,
  Clock,
  PlusCircle
} from 'lucide-react'
import { 
  formatRevenueMonth,
  getEffectiveTarget,
  getTargetAssignmentMonths,
  normalizeMonth,
  sumRevenues,
  toRevenueMonthString,
  getAvailableYears,
  MONTH_NAMES,
  isFutureMonth
} from '../../utils/revenueUtils'

export default function TeamManagement({ user }) {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [team, setTeam] = useState(null)
  const [accessDenied, setAccessDenied] = useState(false)
  
  // Data states
  const [teamMembers, setTeamMembers] = useState([])
  const [revenues, setRevenues] = useState([])
  const [targets, setTargets] = useState([])
  const [disReports, setDisReports] = useState([])
  
  // Target states
  const [selectedMonth, setSelectedMonth] = useState(getTargetAssignmentMonths(0, 0)[0])
  const [editingUserId, setEditingUserId] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [savingUserId, setSavingUserId] = useState('')
  const [targetMessage, setTargetMessage] = useState({ type: '', text: '' })

  // DIS states
  const [selectedDisDate, setSelectedDisDate] = useState(new Date().toISOString().split('T')[0])
  const [editingReport, setEditingReport] = useState(null)
  const [editLeads, setEditLeads] = useState('')
  const [editExpected, setEditExpected] = useState('')
  // Revenue Logging States
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [revenueYear, setRevenueYear] = useState(new Date().getFullYear())
  const [revenueMonth, setRevenueMonth] = useState(new Date().getMonth())
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [clientName, setClientName] = useState('')
  const [noClientInfo, setNoClientInfo] = useState(false)
  const [source, setSource] = useState('Instagram')
  const [revenueAmount, setRevenueAmount] = useState('')
  const [revenueMessage, setRevenueMessage] = useState({ type: '', text: '' })
  const [savingRevenue, setSavingRevenue] = useState(false)

  // Load profile & verify teamlead role
  useEffect(() => {
    if (!user) return
    async function loadTeamLeadProfile() {
      try {
        const { data: prof, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (error) throw error
        
        if (prof?.platform_role !== 'teamlead') {
          setAccessDenied(true)
          setLoading(false)
          return
        }
        
        setProfile(prof)
        
        if (prof.team_id) {
          const { data: tm } = await supabase
            .from('teams')
            .select('*')
            .eq('id', prof.team_id)
            .single()
          
          if (tm) setTeam(tm)
        }
      } catch (err) {
        console.error("Error loading team lead profile:", err)
        setAccessDenied(true)
      }
    }
    loadTeamLeadProfile()
  }, [user])

  // Load all team-scoped data
  useEffect(() => {
    if (!profile?.team_id) return
    
    async function loadTeamData() {
      setLoading(true)
      try {
        // 1. Fetch team members (excluding admins)
        const { data: members, error: memError } = await supabase
          .from('profiles')
          .select('*')
          .eq('team_id', profile.team_id)
        
        if (memError) throw memError
        const nonAdminMembers = (members || []).filter(m => m.platform_role !== 'admin')
        setTeamMembers(nonAdminMembers)
        
        const memberUserIds = nonAdminMembers.map(m => m.id)
        
        // 2. Fetch monthly revenues for this team
        const { data: revs, error: revError } = await supabase
          .from('monthly_revenues')
          .select('*')
          .eq('team_id', profile.team_id)
        
        if (revError) throw revError
        setRevenues(revs || [])

        // 3. Fetch targets
        const { data: tgt, error: tgtErr } = await supabase
          .from('monthly_targets')
          .select('*')
          .eq('team_id', profile.team_id)
        
        if (!tgtErr && tgt) setTargets(tgt)
        
        // 4. Fetch DIS reports for these team members
        if (memberUserIds.length > 0) {
          const { data: reports, error: repError } = await supabase
            .from('dis_reports')
            .select('*')
            .in('user_id', memberUserIds)
          
          if (repError) throw repError
          setDisReports(reports || [])
        } else {
          setDisReports([])
        }
        
      } catch (err) {
        console.error("Error fetching team management data:", err)
      } finally {
        setLoading(false)
      }
    }
    
    loadTeamData()
  }, [profile])

  const refreshDisReports = async () => {
    if (teamMembers.length === 0) return
    const memberUserIds = teamMembers.map(m => m.id)
    try {
      const { data: reports } = await supabase
        .from('dis_reports')
        .select('*')
        .in('user_id', memberUserIds)
      if (reports) setDisReports(reports)
    } catch (err) {
      console.error("Error refreshing DIS reports:", err)
    }
  }

  const refreshRevenues = async () => {
    if (!profile?.team_id) return
    try {
      const { data: revs } = await supabase
        .from('monthly_revenues')
        .select('*')
        .eq('team_id', profile.team_id)
      if (revs) setRevenues(revs)
    } catch (err) {
      console.error("Error refreshing revenues:", err)
    }
  }

  const getWeekRanges = (year, monthIndex) => {
    const d = new Date(year, monthIndex, 1)
    const monthName = d.toLocaleString('default', { month: 'short' })
    const lastDay = new Date(year, monthIndex + 1, 0).getDate()
    return [
      { label: 'Week 1', range: `${monthName} 1 – ${monthName} 7`, value: 1 },
      { label: 'Week 2', range: `${monthName} 8 – ${monthName} 14`, value: 2 },
      { label: 'Week 3', range: `${monthName} 15 – ${monthName} 21`, value: 3 },
      { label: 'Week 4', range: `${monthName} 22 – ${monthName} ${lastDay}`, value: 4 },
    ]
  }

  const isPastMonthCheck = (year, monthIndex) => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    if (year < currentYear) return true
    if (year === currentYear && monthIndex < currentMonth) return true
    return false
  }

  const handleRevenueSubmit = async (e) => {
    e.preventDefault()
    setRevenueMessage({ type: '', text: '' })

    if (!selectedMemberId) {
      setRevenueMessage({ type: 'error', text: 'Please select a team member.' })
      return
    }

    const numAmount = parseFloat(revenueAmount)
    if (isNaN(numAmount) || numAmount < 0) {
      setRevenueMessage({ type: 'error', text: 'Please enter a valid amount.' })
      return
    }

    const isPastMonthCheck = !isFutureMonth(revenueYear, revenueMonth)
    const finalClientName = noClientInfo ? 'No Client Info' : clientName.trim()
    if (!isPastMonthCheck && !noClientInfo && !finalClientName) {
      setRevenueMessage({ type: 'error', text: 'Please provide client info.' })
      return
    }

    setSavingRevenue(true)
    try {
      const targetRevMonth = toRevenueMonthString(revenueYear, revenueMonth)
      
      const { error } = await supabase
        .from('monthly_revenues')
        .insert({
          user_id: selectedMemberId,
          team_id: profile.team_id,
          revenue_month: targetRevMonth,
          week_number: selectedWeek,
          client_name: finalClientName,
          source: source,
          amount: numAmount,
          entered_by: user.id
        })
      if (error) throw error
      setRevenueMessage({ type: 'success', text: `Revenue logged successfully!` })
      
      setRevenueAmount('')
      await refreshRevenues()
    } catch (err) {
      setRevenueMessage({ type: 'error', text: err.message || 'Failed to save revenue' })
    } finally {
      setSavingRevenue(false)
    }
  }



  const activeTeamMembers = useMemo(() => {
    return teamMembers.filter(p => !p.is_deactivated)
  }, [teamMembers])

  const memberTargets = useMemo(() => {
    if (!profile?.team_id) return []
    return teamMembers.map(member => {
        const target = getEffectiveTarget(targets, member.id, profile.team_id, selectedMonth)
        const currentTarget = target ? Number(target.target_amount || 0) : 0
        const reached = sumRevenues(revenues.filter(r =>
          r.user_id === member.id &&
          r.team_id === profile.team_id &&
          normalizeMonth(r.revenue_month) === selectedMonth
        ))
        const achievement = currentTarget > 0 ? (reached / currentTarget) * 100 : 0
        const isActiveInTeam = activeTeamMembers.some(a => a.id === member.id)

        return {
          ...member,
          currentTarget,
          targetSourceMonth: target ? normalizeMonth(target.target_month) : '',
          reached,
          achievement,
          isActiveInTeam
        }
      })
      .filter(m => m.isActiveInTeam || m.currentTarget > 0 || m.reached > 0)
      .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`))
  }, [teamMembers, targets, revenues, profile?.team_id, selectedMonth, activeTeamMembers])

  const summary = useMemo(() => {
    const expected = memberTargets.reduce((sum, member) => sum + member.currentTarget, 0)
    const reached = memberTargets.reduce((sum, member) => sum + member.reached, 0)
    const achievement = expected > 0 ? (reached / expected) * 100 : 0
    return { expected, reached, achievement }
  }, [memberTargets])

  const monthOptions = useMemo(() => getTargetAssignmentMonths(11, 12), [])

  // TARGET EDIT HANDLERS
  const startEditingTarget = (member) => {
    setEditingUserId(member.id)
    setEditAmount(member.currentTarget > 0 ? String(member.currentTarget) : '')
    setTargetMessage({ type: '', text: '' })
  }

  const cancelEditingTarget = () => {
    setEditingUserId('')
    setEditAmount('')
  }

  const handleSaveTarget = async (userId) => {
    setTargetMessage({ type: '', text: '' })
    const amount = Number(editAmount)
    if (!userId || !selectedMonth) {
      setTargetMessage({ type: 'error', text: 'Select employee and month.' })
      return
    }
    if (Number.isNaN(amount) || amount < 0) {
      setTargetMessage({ type: 'error', text: 'Target amount must be 0 or greater.' })
      return
    }

    setSavingUserId(userId)
    try {
      const { error } = await supabase
        .from('monthly_targets')
        .upsert(
          {
            user_id: userId,
            team_id: profile.team_id,
            target_month: selectedMonth,
            target_amount: amount
          },
          { onConflict: 'user_id,team_id,target_month' }
        )
      if (error) throw error

      const { data: freshTargets, error: refreshErr } = await supabase.from('monthly_targets').select('*').eq('team_id', profile.team_id)
      if (!refreshErr) setTargets(freshTargets || [])
      cancelEditingTarget()
      setTargetMessage({ type: 'success', text: `Target updated from ${formatRevenueMonth(selectedMonth)} onward.` })
    } catch (err) {
      setTargetMessage({ type: 'error', text: err.message || 'Failed to assign target.' })
    } finally {
      setSavingUserId('')
    }
  }

  // DIS STATUS BOARD
  const disDayBoard = useMemo(() => {
    const selectedDateStr = selectedDisDate
    const reportsForDay = disReports.filter(r => r.report_date === selectedDateStr)
    const submittedMap = {}
    reportsForDay.forEach(r => {
      submittedMap[r.user_id] = r
    })
    
    const submitted = []
    const missing = []
    
    teamMembers.forEach(member => {
      const report = submittedMap[member.id]
      if (report) {
        submitted.push({
          memberId: member.id,
          name: `${member.first_name} ${member.last_name}`,
          reportId: report.id,
          positiveLeads: report.positive_leads,
          expectedRevenue: report.expected_revenue,
          revenueGenerated: report.revenue_generated,
          rawReport: report
        })
      } else {
        missing.push({
          memberId: member.id,
          name: `${member.first_name} ${member.last_name}`,
          email: member.email
        })
      }
    })
    
    return { submitted, missing }
  }, [disReports, teamMembers, selectedDisDate])

  // DIS Form handlers
  const handleOpenEditModal = (sub) => {
    setEditingReport({
      id: sub.reportId,
      userId: sub.memberId,
      name: sub.name,
      reportDate: selectedDisDate
    })
    setEditLeads(String(sub.positiveLeads))
    setEditExpected(String(sub.expectedRevenue))
    setModalMessage({ type: '', text: '' })
  }

  const handleOpenCreateModal = (missingMember) => {
    setEditingReport({
      id: null,
      userId: missingMember.memberId,
      name: missingMember.name,
      reportDate: selectedDisDate
    })
    setEditLeads('0')
    setEditExpected('0.00')
    setModalMessage({ type: '', text: '' })
  }

  const handleSaveReport = async (e) => {
    e.preventDefault()
    if (!editingReport) return
    
    setSubmittingEdit(true)
    setModalMessage({ type: '', text: '' })
    
    try {
      const leads = parseInt(editLeads) || 0
      const expected = parseFloat(editExpected) || 0
      
      if (editingReport.id) {
        const { error } = await supabase
          .from('dis_reports')
          .update({
            positive_leads: leads,
            expected_revenue: expected
          })
          .eq('id', editingReport.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('dis_reports')
          .upsert({
            user_id: editingReport.userId,
            report_date: editingReport.reportDate,
            positive_leads: leads,
            expected_revenue: expected,
            revenue_generated: 0
          }, { onConflict: 'user_id,report_date' })
        
        if (error) throw error
      }
      
      setModalMessage({ type: 'success', text: 'DIS report updated successfully!' })
      await refreshDisReports()
      
      setTimeout(() => {
        setEditingReport(null)
      }, 1000)
      
    } catch (err) {
      console.error(err)
      setModalMessage({ type: 'error', text: err.message || 'Failed to update report.' })
    } finally {
      setSubmittingEdit(false)
    }
  }

  if (accessDenied) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '24px' }}>🔒</div>
        <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Access Denied</h2>
        <p style={{ color: 'var(--apple-text-secondary)', fontSize: '1.2rem', maxWidth: '500px', margin: '0 auto' }}>
          This workspace is strictly restricted to Team Leads. If you believe this is an error, please contact your administrator.
        </p>
      </div>
    )
  }

  if (loading && !profile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#fff' }}>
        Loading Team Management...
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* Header */}
      <div style={{ marginBottom: 'clamp(24px, 5vw, 40px)' }}>
        <div className="apple-kicker">Team Roster Dashboard</div>
        <h1 className="apple-title-large">Team Management</h1>
        <p className="apple-lead">
          Assign monthly targets and manage daily sheets (DIS) for <strong>{team?.name || 'Your Team'}</strong>.
        </p>
      </div>

      {/* TARGETS SECTION */}
      <div className="card" style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '18px' }}>
          <div>
            <h3 style={{ margin: '0 0 6px 0' }}>Assign Monthly Targets</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Edit a member target for the selected month. It continues into upcoming months until another target is saved.
            </p>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {memberTargets.length} team member{memberTargets.length === 1 ? '' : 's'}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', alignItems: 'end', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Effective Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value)
                cancelEditingTarget()
              }}
              className="form-control"
            >
              {monthOptions.map(month => (
                <option key={month} value={month}>{formatRevenueMonth(month)}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(96,165,250,0.35)', background: 'rgba(96,165,250,0.08)' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Target — {formatRevenueMonth(selectedMonth)}</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#60a5fa' }}>${summary.expected.toFixed(2)}</div>
          </div>
          <div style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.08)' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Reached — {formatRevenueMonth(selectedMonth)}</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#4ade80' }}>${summary.reached.toFixed(2)}</div>
          </div>
          <div style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(251,191,36,0.35)', background: 'rgba(251,191,36,0.08)' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Achievement</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#fbbf24' }}>{summary.expected > 0 ? `${summary.achievement.toFixed(1)}%` : 'N/A'}</div>
          </div>
        </div>

        {(() => {
          const activeTargets = memberTargets.filter(m => m.isActiveInTeam)
          const historicalTargets = memberTargets.filter(m => !m.isActiveInTeam)

          if (activeTargets.length === 0 && historicalTargets.length === 0) {
            return <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>No historical or active non-admin members found for this team in this period.</p>
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {activeTargets.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#fff' }}>Active Members</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                        <th style={{ textAlign: 'left', padding: '10px 8px' }}>Member</th>
                        <th style={{ textAlign: 'right', padding: '10px 8px' }}>Current Target</th>
                        <th style={{ textAlign: 'left', padding: '10px 8px' }}>Applies From</th>
                        <th style={{ textAlign: 'right', padding: '10px 8px' }}>Reached</th>
                        <th style={{ textAlign: 'right', padding: '10px 8px' }}>Achievement</th>
                        <th style={{ textAlign: 'right', padding: '10px 8px' }}>Edit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeTargets.map(member => {
                        const isEditing = editingUserId === member.id
                        const isSaving = savingUserId === member.id

                        return (
                          <tr key={member.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '12px 8px' }}>
                              <div style={{ color: '#fff', fontWeight: '700' }}>{member.first_name} {member.last_name}</div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{member.email}</div>
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  pattern="[0-9]*\.?[0-9]*"
                                  className="form-control"
                                  value={editAmount}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    if (val === '' || /^\d*\.?\d*$/.test(val)) setEditAmount(val)
                                  }}
                                  placeholder="0.00"
                                  style={{ width: '140px', marginLeft: 'auto', textAlign: 'right' }}
                                  autoFocus
                                />
                              ) : (
                                <span style={{ color: '#60a5fa', fontWeight: '800' }}>${member.currentTarget.toFixed(2)}</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>
                              {member.targetSourceMonth ? formatRevenueMonth(member.targetSourceMonth) : 'Not assigned'}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right', color: '#4ade80', fontWeight: '700' }}>
                              ${member.reached.toFixed(2)}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right', color: '#fbbf24', fontWeight: '700' }}>
                              {member.currentTarget > 0 ? `${member.achievement.toFixed(1)}%` : 'N/A'}
                            </td>
                            <td style={{ padding: '12px 8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                {isEditing ? (
                                  <>
                                    <button type="button" className="btn" onClick={() => handleSaveTarget(member.id)} disabled={isSaving} style={{ width: '36px', height: '36px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <Check size={16} />
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={cancelEditingTarget} disabled={isSaving} style={{ width: '36px', height: '36px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <X size={16} />
                                    </button>
                                  </>
                                ) : (
                                  <button type="button" className="btn btn-secondary" onClick={() => startEditingTarget(member)} style={{ width: '36px', height: '36px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Edit2 size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {historicalTargets.length > 0 && (
                <div style={{ overflowX: 'auto', opacity: 0.85, padding: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Historical Members</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                        <th style={{ textAlign: 'left', padding: '10px 8px' }}>Member</th>
                        <th style={{ textAlign: 'right', padding: '10px 8px' }}>Target</th>
                        <th style={{ textAlign: 'right', padding: '10px 8px' }}>Reached</th>
                        <th style={{ textAlign: 'right', padding: '10px 8px' }}>Achievement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historicalTargets.map(member => (
                        <tr key={member.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px 8px' }}>
                            <div style={{ color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {member.first_name} {member.last_name}
                              <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff' }}>
                                {member.is_deactivated ? 'Former' : 'Transferred'}
                              </span>
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '2px' }}>{member.email}</div>
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                            ${member.currentTarget.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                            ${member.reached.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                            {member.currentTarget > 0 ? `${member.achievement.toFixed(1)}%` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })()}

        {targetMessage.text && (
          <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '8px', color: targetMessage.type === 'error' ? '#f87171' : '#4ade80', background: targetMessage.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(74,222,128,0.08)', border: `1px solid ${targetMessage.type === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(74,222,128,0.25)'}` }}>
            {targetMessage.text}
          </div>
        )}
      </div>

      {/* DIS SECTION */}
      <div className="apple-card" style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#fff' }}>Team Daily Sheets (DIS)</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--apple-text-secondary)' }}>
              Audit daily compliance, positive leads, and expectations for the roster.
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--apple-text-secondary)', fontWeight: '500' }}>Date:</span>
            <input
              type="date"
              value={selectedDisDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setSelectedDisDate(e.target.value)}
              className="form-control"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', height: '34px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(48, 213, 200, 0.06)', border: '1px solid rgba(48, 213, 200, 0.2)', borderRadius: '10px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--apple-accent-green)' }} />
            <span style={{ fontSize: '0.85rem', color: '#ffffff' }}><strong>{disDayBoard.submitted.length}</strong> Submitted</span>
          </div>
          <div style={{ background: 'rgba(255, 69, 58, 0.06)', border: '1px solid rgba(255, 69, 58, 0.2)', borderRadius: '10px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--apple-accent-red)' }} />
            <span style={{ fontSize: '0.85rem', color: '#ffffff' }}><strong>{disDayBoard.missing.length}</strong> Missing</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '12px', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Submitted Reports</h4>
            {disDayBoard.submitted.length === 0 ? (
              <p style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', fontSize: '0.85rem', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--apple-border)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                No reports logged for this date.
              </p>
            ) : (
              <>
                <div className="apple-desktop-table-container" style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--apple-border)', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--apple-border)', background: 'rgba(255,255,255,0.01)', fontSize: '0.8rem' }}>
                        <th style={{ padding: '12px 16px', color: 'var(--apple-text-secondary)', fontWeight: '600' }}>Member</th>
                        <th style={{ padding: '12px 16px', color: 'var(--apple-text-secondary)', fontWeight: '600', textAlign: 'right' }}>Positive Leads</th>
                        <th style={{ padding: '12px 16px', color: 'var(--apple-text-secondary)', fontWeight: '600', textAlign: 'right' }}>Expected Revenue</th>
                        <th style={{ padding: '12px 16px', color: 'var(--apple-text-secondary)', fontWeight: '600', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disDayBoard.submitted.map(sub => (
                        <tr key={sub.memberId} style={{ borderBottom: '1px solid var(--apple-border)', fontSize: '0.88rem' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '600', color: '#ffffff' }}>{sub.name}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: 'var(--apple-accent-orange)' }}>{sub.positiveLeads}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: 'var(--apple-accent-blue)' }}>${sub.expectedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <button onClick={() => handleOpenEditModal(sub)} className="apple-btn apple-btn-secondary" style={{ padding: '4px 10px !important', fontSize: '0.75rem', borderRadius: '8px !important' }}>
                              <Edit3 size={12} style={{ marginRight: '4px' }} /> Adjust
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="apple-mobile-list-card">
                  {disDayBoard.submitted.map(sub => (
                    <div key={sub.memberId} className="apple-mobile-list-item" style={{ gap: '4px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--apple-border)', paddingBottom: '4px' }}>
                        <span style={{ fontWeight: '700', color: '#ffffff', fontSize: '0.85rem' }}>{sub.name}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--apple-text-secondary)' }}>Positive Leads:</span>
                          <span style={{ fontWeight: '700', color: 'var(--apple-accent-orange)' }}>{sub.positiveLeads}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--apple-text-secondary)' }}>Expected Revenue:</span>
                          <span style={{ fontWeight: '700', color: 'var(--apple-accent-blue)' }}>${sub.expectedRevenue.toFixed(2)}</span>
                        </div>
                      </div>
                      <button onClick={() => handleOpenEditModal(sub)} className="apple-btn apple-btn-secondary" style={{ width: '100%', padding: '6px !important', fontSize: '0.78rem', marginTop: '6px', borderRadius: '8px !important' }}>
                        <Edit3 size={11} style={{ marginRight: '4px' }} /> Adjust figures
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '12px', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Missing Reports</h4>
            {disDayBoard.missing.length === 0 ? (
              <p style={{ color: 'var(--apple-accent-green)', fontWeight: '600', fontSize: '0.85rem', background: 'rgba(48, 213, 200, 0.02)', border: '1px solid rgba(48, 213, 200, 0.1)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                🎉 Roster complete! All team members have submitted reports for this date.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                {disDayBoard.missing.map(member => (
                  <div key={member.memberId} style={{ background: 'rgba(255, 69, 58, 0.02)', border: '1px solid rgba(255, 69, 58, 0.12)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff' }}>{member.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{member.email}</div>
                    </div>
                    <button onClick={() => handleOpenCreateModal(member)} className="apple-btn apple-btn-secondary" style={{ padding: '4px 8px !important', fontSize: '0.72rem', borderRadius: '6px !important', borderColor: 'rgba(255, 69, 58, 0.25)' }}>
                      Log DIS
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REVENUE LOGGING SECTION */}
      <div className="apple-card" style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(96,165,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={20} color="#60a5fa" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#fff' }}>Log Team Revenue</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--apple-text-secondary)' }}>
                Track and record team members' monthly revenue contributions.
              </p>
            </div>
          </div>
        </div>

        {revenueMessage.text && (
          <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '24px', background: revenueMessage.type === 'success' ? 'rgba(48, 213, 200, 0.08)' : 'rgba(255, 69, 58, 0.08)', border: `1px solid ${revenueMessage.type === 'success' ? 'var(--apple-accent-green)' : 'var(--apple-accent-red)'}`, color: revenueMessage.type === 'success' ? 'var(--apple-accent-green)' : 'var(--apple-accent-red)', fontSize: '0.9rem', fontWeight: '500' }}>
            {revenueMessage.text}
          </div>
        )}

        <form onSubmit={handleRevenueSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--apple-border)', borderRadius: '14px', padding: '20px' }}>
            <label className="apple-form-label" style={{ marginBottom: '12px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TEAM MEMBER</label>
            <select 
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="apple-form-control"
              style={{ fontWeight: '500', color: selectedMemberId ? '#fff' : 'var(--apple-text-secondary)' }}
            >
              <option value="" disabled>Select team member</option>
              {activeTeamMembers.map(m => (
                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
              ))}
            </select>
          </div>

          <div className="apple-three-col-grid" style={{ gap: '16px' }}>
            <div>
              <label className="apple-form-label" style={{ marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>YEAR</label>
              <select 
                value={revenueYear} 
                onChange={(e) => setRevenueYear(parseInt(e.target.value))}
                className="apple-form-control"
              >
                {getAvailableYears().map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            
            <div>
              <label className="apple-form-label" style={{ marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MONTH</label>
              <select 
                value={revenueMonth} 
                onChange={(e) => setRevenueMonth(parseInt(e.target.value))}
                className="apple-form-control"
              >
                {MONTH_NAMES.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
              </select>
            </div>
          </div>

          {!isFutureMonth(revenueYear, revenueMonth) && !isPastMonthCheck(revenueYear, revenueMonth) && (
            <div>
              <label className="apple-form-label" style={{ marginBottom: '12px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SELECT WEEK</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {getWeekRanges(revenueYear, revenueMonth).map(w => {
                  const isSelected = selectedWeek === w.value
                  return (
                    <div 
                      key={w.value}
                      onClick={() => setSelectedWeek(w.value)}
                      style={{
                        background: isSelected ? 'rgba(0, 113, 227, 0.08)' : 'rgba(255, 255, 255, 0.01)',
                        border: `1px solid ${isSelected ? 'var(--apple-accent-blue)' : 'var(--apple-border)'}`,
                        borderRadius: '12px', padding: '14px', cursor: 'pointer', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', gap: '12px', position: 'relative'
                      }}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isSelected ? 'rgba(0, 113, 227, 0.15)' : 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar size={16} color={isSelected ? 'var(--apple-accent-blue)' : 'var(--apple-text-secondary)'} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: isSelected ? '#fff' : 'var(--apple-text-secondary)' }}>{w.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>{w.range}</div>
                      </div>
                      {isSelected && <Check size={16} color="var(--apple-accent-blue)" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="apple-two-col-grid" style={{ gap: '16px' }}>
            <div>
              <label className="apple-form-label" style={{ marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CLIENT NAME</label>
              <input 
                type="text" 
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                disabled={noClientInfo || isFutureMonth(revenueYear, revenueMonth)}
                className="apple-form-control"
                placeholder="Enter client name"
                style={{ opacity: (noClientInfo || isFutureMonth(revenueYear, revenueMonth)) ? 0.5 : 1 }}
              />
              {!isFutureMonth(revenueYear, revenueMonth) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', paddingLeft: '4px' }}>
                  <input 
                    type="checkbox" 
                    id="noClient"
                    checked={noClientInfo}
                    onChange={(e) => {
                      setNoClientInfo(e.target.checked)
                      if (e.target.checked) setClientName('')
                    }}
                    style={{ accentColor: 'var(--apple-accent-blue)', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="noClient" style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)', cursor: 'pointer', userSelect: 'none' }}>No Client Info</label>
                </div>
              )}
            </div>

            <div>
              <label className="apple-form-label" style={{ marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SOURCE</label>
              <select 
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="apple-form-control"
              >
                <option>Instagram</option>
                <option>Facebook</option>
                <option>LinkedIn</option>
                <option>Referral</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="apple-form-label" style={{ marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AMOUNT (USD)</label>
              <input 
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                value={revenueAmount}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === '' || /^\d*\.?\d*$/.test(val)) setRevenueAmount(val)
                }}
                className="apple-form-control"
                placeholder="0.00"
                style={{ fontWeight: '600' }}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="apple-btn apple-btn-primary" 
            disabled={savingRevenue}
            style={{ width: '100%', padding: '16px !important', fontSize: '1rem', marginTop: '8px', display: 'flex', justifyContent: 'center', gap: '8px' }}
          >
            {savingRevenue ? 'Processing...' : <><PlusCircle size={20} /> Log Contribution</>}
          </button>
        </form>
      </div>

      {editingReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px', animation: 'fadeIn 0.2s ease-out' }}>
          <div className="apple-card" style={{ maxWidth: '450px', width: '100%', background: 'var(--bg-color)', borderColor: 'rgba(255,255,255,0.15)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)', padding: '28px', position: 'relative' }}>
            <h3 className="apple-title-small" style={{ marginBottom: '6px' }}>{editingReport.id ? 'Adjust Daily Report' : 'Log Daily Report'}</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--apple-text-secondary)', marginBottom: '20px' }}>For <strong>{editingReport.name}</strong> on {editingReport.reportDate}</p>

            {modalMessage.text && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', marginBottom: '16px', background: modalMessage.type === 'success' ? 'rgba(48, 213, 200, 0.08)' : 'rgba(255, 69, 58, 0.08)', border: `1px solid ${modalMessage.type === 'success' ? 'var(--apple-accent-green)' : 'var(--apple-accent-red)'}`, color: modalMessage.type === 'success' ? 'var(--apple-accent-green)' : 'var(--apple-accent-red)', fontSize: '0.82rem', fontWeight: '500' }}>
                {modalMessage.text}
              </div>
            )}

            <form onSubmit={handleSaveReport} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="apple-form-label" style={{ fontSize: '0.8rem', marginBottom: '6px' }}>Positive Leads</label>
                <input type="number" min="0" value={editLeads} onChange={(e) => setEditLeads(e.target.value)} className="apple-form-control" required />
              </div>
              <div>
                <label className="apple-form-label" style={{ fontSize: '0.8rem', marginBottom: '6px' }}>Expected Revenue ($)</label>
                <input type="number" min="0" step="0.01" value={editExpected} onChange={(e) => setEditExpected(e.target.value)} className="apple-form-control" required />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEditingReport(null)} className="apple-btn apple-btn-secondary" style={{ flex: 1, padding: '10px' }} disabled={submittingEdit}>Cancel</button>
                <button type="submit" className="apple-btn apple-btn-primary" style={{ flex: 1, padding: '10px' }} disabled={submittingEdit}>{submittingEdit ? 'Saving...' : 'Save Adjustments'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
