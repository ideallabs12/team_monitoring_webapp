import { useEffect, useMemo, useState } from 'react'
import { Check, Edit2, X } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import {
  formatRevenueMonth,
  getEffectiveTarget,
  getTargetAssignmentMonths,
  normalizeMonth,
  sumRevenues
} from '../../utils/revenueUtils'

export default function AdminHome() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])
  const [profiles, setProfiles] = useState([])
  const [revenues, setRevenues] = useState([])
  const [targets, setTargets] = useState([])

  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(getTargetAssignmentMonths(0, 0)[0])
  const [editingUserId, setEditingUserId] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [savingUserId, setSavingUserId] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    async function loadData() {
      try {
        const [teamsRes, profilesRes, revRes] = await Promise.all([
          supabase.from('teams').select('*').order('name', { ascending: true }),
          supabase.from('profiles').select('*'),
          supabase.from('monthly_revenues').select('*')
        ])
        if (teamsRes.data) setTeams(teamsRes.data)
        if (profilesRes.data) setProfiles(profilesRes.data)
        if (revRes.data) setRevenues(revRes.data)

        const { data: targetData, error: targetErr } = await supabase.from('monthly_targets').select('*')
        if (!targetErr && targetData) setTargets(targetData)
      } catch (err) {
        console.error('Error loading admin home data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    if (!selectedTeamId && teams.length > 0) {
      setSelectedTeamId(teams[0].id)
    }
  }, [selectedTeamId, teams])

  const teamMembers = useMemo(() => {
    if (!selectedTeamId) return []
    return profiles
      .filter(p => p.team_id === selectedTeamId && p.platform_role !== 'admin')
      .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`))
  }, [selectedTeamId, profiles])

  const memberTargets = useMemo(() => {
    return teamMembers.map(member => {
      const target = getEffectiveTarget(targets, member.id, selectedTeamId, selectedMonth)
      const currentTarget = target ? Number(target.target_amount || 0) : 0
      const reached = sumRevenues(revenues.filter(r =>
        r.user_id === member.id &&
        r.team_id === selectedTeamId &&
        normalizeMonth(r.revenue_month) === selectedMonth
      ))
      const achievement = currentTarget > 0 ? (reached / currentTarget) * 100 : 0

      return {
        ...member,
        currentTarget,
        targetSourceMonth: target ? normalizeMonth(target.target_month) : '',
        reached,
        achievement
      }
    })
  }, [teamMembers, targets, revenues, selectedTeamId, selectedMonth])

  const summary = useMemo(() => {
    const expected = memberTargets.reduce((sum, member) => sum + member.currentTarget, 0)
    const reached = memberTargets.reduce((sum, member) => sum + member.reached, 0)
    const achievement = expected > 0 ? (reached / expected) * 100 : 0
    return { expected, reached, achievement }
  }, [memberTargets])

  const monthOptions = useMemo(() => getTargetAssignmentMonths(11, 12), [])

  const startEditing = (member) => {
    setEditingUserId(member.id)
    setEditAmount(member.currentTarget > 0 ? String(member.currentTarget) : '')
    setMessage({ type: '', text: '' })
  }

  const cancelEditing = () => {
    setEditingUserId('')
    setEditAmount('')
  }

  const handleSaveTarget = async (userId) => {
    setMessage({ type: '', text: '' })
    const amount = Number(editAmount)
    if (!selectedTeamId || !userId || !selectedMonth) {
      setMessage({ type: 'error', text: 'Select team, employee, and month.' })
      return
    }
    if (Number.isNaN(amount) || amount < 0) {
      setMessage({ type: 'error', text: 'Target amount must be 0 or greater.' })
      return
    }

    setSavingUserId(userId)
    try {
      const { error } = await supabase
        .from('monthly_targets')
        .upsert(
          {
            user_id: userId,
            team_id: selectedTeamId,
            target_month: selectedMonth,
            target_amount: amount
          },
          { onConflict: 'user_id,team_id,target_month' }
        )
      if (error) throw error

      const { data: freshTargets, error: refreshErr } = await supabase.from('monthly_targets').select('*')
      if (!refreshErr) setTargets(freshTargets || [])
      cancelEditing()
      setMessage({ type: 'success', text: `Target updated from ${formatRevenueMonth(selectedMonth)} onward.` })
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to assign target.' })
    } finally {
      setSavingUserId('')
    }
  }

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</div>

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '2rem' }}>Admin Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
          Assign monthly targets and monitor target vs reached clearly.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        {/* Card header */}
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

        {/* Team + Month dropdowns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', alignItems: 'end', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Team</label>
            <select
              value={selectedTeamId}
              onChange={(e) => {
                setSelectedTeamId(e.target.value)
                cancelEditing()
              }}
              className="form-control"
            >
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Effective Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value)
                cancelEditing()
              }}
              className="form-control"
            >
              {monthOptions.map(month => (
                <option key={month} value={month}>{formatRevenueMonth(month)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ===== SUMMARY CARDS (moved here from the bottom) ===== */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div style={{
            padding: '16px 20px',
            borderRadius: '12px',
            border: '1px solid rgba(96,165,250,0.35)',
            background: 'rgba(96,165,250,0.08)'
          }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Target — {formatRevenueMonth(selectedMonth)}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#60a5fa' }}>${summary.expected.toFixed(2)}</div>
          </div>

          <div style={{
            padding: '16px 20px',
            borderRadius: '12px',
            border: '1px solid rgba(74,222,128,0.35)',
            background: 'rgba(74,222,128,0.08)'
          }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Reached — {formatRevenueMonth(selectedMonth)}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#4ade80' }}>${summary.reached.toFixed(2)}</div>
          </div>

          <div style={{
            padding: '16px 20px',
            borderRadius: '12px',
            border: '1px solid rgba(251,191,36,0.35)',
            background: 'rgba(251,191,36,0.08)'
          }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Achievement</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#fbbf24' }}>
              {summary.expected > 0 ? `${summary.achievement.toFixed(1)}%` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Members table */}
        {memberTargets.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>No non-admin members found for this team.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
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
                {memberTargets.map(member => {
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
                              // Only allow numeric input with optional decimal
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
                              <button
                                type="button"
                                className="btn"
                                onClick={() => handleSaveTarget(member.id)}
                                disabled={isSaving}
                                title="Save target"
                                aria-label="Save target"
                                style={{ width: '36px', height: '36px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Check size={16} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={cancelEditing}
                                disabled={isSaving}
                                title="Cancel edit"
                                aria-label="Cancel edit"
                                style={{ width: '36px', height: '36px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => startEditing(member)}
                              title="Edit target"
                              aria-label={`Edit target for ${member.first_name} ${member.last_name}`}
                              style={{ width: '36px', height: '36px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            >
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

        {message.text && (
          <div style={{
            marginTop: '12px',
            padding: '10px 12px',
            borderRadius: '8px',
            color: message.type === 'error' ? '#f87171' : '#4ade80',
            background: message.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(74,222,128,0.08)',
            border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(74,222,128,0.25)'}`
          }}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}
