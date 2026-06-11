import { useEffect, useMemo, useState } from 'react'

import { supabase } from '../../supabaseClient'
import {
  formatRevenueMonth,
  getEffectiveTarget,
  getTargetAssignmentMonths,
  normalizeMonth,
  sumRevenues
} from '../../utils/revenueUtils'

let adminHomeCache = { loaded: false, teams: [], profiles: [], revenues: [], targets: [] }

export default function AdminHome() {
  const [loading, setLoading] = useState(!adminHomeCache.loaded)
  const [teams, setTeams] = useState(adminHomeCache.teams)
  const [profiles, setProfiles] = useState(adminHomeCache.profiles)
  const [revenues, setRevenues] = useState(adminHomeCache.revenues)
  const [targets, setTargets] = useState(adminHomeCache.targets)

  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(getTargetAssignmentMonths(0, 0)[0])
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    async function loadData() {
      try {
        const [teamsRes, profilesRes, revRes] = await Promise.all([
          supabase.from('teams').select('*').order('name', { ascending: true }),
          supabase.from('profiles').select('*'),
          supabase.from('monthly_revenues').select('*')
        ])
        const t = teamsRes.data || []; const p = profilesRes.data || []; const r = revRes.data || []
        setTeams(t); setProfiles(p); setRevenues(r)

        const { data: targetData, error: targetErr } = await supabase.from('monthly_targets').select('*')
        const tgt = (!targetErr && targetData) ? targetData : []
        setTargets(tgt)
        adminHomeCache = { loaded: true, teams: t, profiles: p, revenues: r, targets: tgt }
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

  const activeTeamMembers = useMemo(() => {
    if (!selectedTeamId) return []
    return profiles
      .filter(p => p.team_id === selectedTeamId && p.platform_role !== 'admin' && !p.is_deactivated)
  }, [selectedTeamId, profiles])

  const memberTargets = useMemo(() => {
    if (!selectedTeamId) return []
    return profiles
      .filter(p => p.platform_role !== 'admin')
      .map(member => {
        const target = getEffectiveTarget(targets, member.id, selectedTeamId, selectedMonth)
        const currentTarget = target ? Number(target.target_amount || 0) : 0
        const reached = sumRevenues(revenues.filter(r =>
          r.user_id === member.id &&
          r.team_id === selectedTeamId &&
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
  }, [profiles, targets, revenues, selectedTeamId, selectedMonth, activeTeamMembers])

  const summary = useMemo(() => {
    const expected = memberTargets.reduce((sum, member) => sum + member.currentTarget, 0)
    const reached = memberTargets.reduce((sum, member) => sum + member.reached, 0)
    const achievement = expected > 0 ? (reached / expected) * 100 : 0
    return { expected, reached, achievement }
  }, [memberTargets])

  const monthOptions = useMemo(() => getTargetAssignmentMonths(11, 12), [])



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
            <h3 style={{ margin: '0 0 6px 0' }}>Team Member Targets</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              View targets and achievement for the selected month. Targets are assigned by Team Leads.
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

        {/* Members tables */}
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
                      </tr>
                    </thead>
                    <tbody>
                      {activeTargets.map(member => {
                        return (
                          <tr key={member.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '12px 8px' }}>
                              <div style={{ color: '#fff', fontWeight: '700' }}>{member.first_name} {member.last_name}</div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{member.email}</div>
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                              <span style={{ color: '#60a5fa', fontWeight: '800' }}>${member.currentTarget.toFixed(2)}</span>
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
