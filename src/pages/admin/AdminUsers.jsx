import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { Users, Search, Shield, Key, AlertTriangle, Activity, X, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

let adminUsersCache = { loaded: false, users: [], teams: [], revenues: [], disReports: [] }

export default function AdminUsers() {
  const [loading, setLoading] = useState(!adminUsersCache.loaded)
  const [users, setUsers] = useState(adminUsersCache.users)
  const [teams, setTeams] = useState(adminUsersCache.teams)
  const [revenues, setRevenues] = useState(adminUsersCache.revenues)
  const [disReports, setDisReports] = useState(adminUsersCache.disReports)

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')

  const loadData = async () => {
    try {
      const [profilesRes, teamsRes, revRes, disRes] = await Promise.all([
        supabase.from('profiles').select('*').order('first_name', { ascending: true }),
        supabase.from('teams').select('*').order('name', { ascending: true }),
        supabase.from('monthly_revenues').select('*'),
        supabase.from('dis_reports').select('*')
      ])

      if (profilesRes.error) throw profilesRes.error
      if (teamsRes.error) throw teamsRes.error

      const u = profilesRes.data || []
      const t = teamsRes.data || []
      const r = revRes.data || []
      const d = disRes.data || []

      setUsers(u)
      setTeams(t)
      setRevenues(r)
      setDisReports(d)

      adminUsersCache = { loaded: true, users: u, teams: t, revenues: r, disReports: d }
    } catch (err) {
      console.error('Error loading admin users data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Exclude admin profiles from the entire directory
  const nonAdminUsers = useMemo(() => users.filter(u => u.platform_role !== 'admin'), [users])

  // Filtered users: Email, Team, and Name search
  const filteredUsers = useMemo(() => {
    return nonAdminUsers.filter(user => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase()
      const email = (user.email || '').toLowerCase()
      
      const userTeam = user.team_id ? teams.find(t => t.id === user.team_id)?.name.toLowerCase() : ''

      const query = searchQuery.toLowerCase()
      return (
        fullName.includes(query) ||
        email.includes(query) ||
        userTeam.includes(query)
      )
    })
  }, [nonAdminUsers, teams, searchQuery])

  // End modal logic removal

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>Loading registered users...</div>

  return (
    <div>
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-page-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
          <Users size={28} />
        </div>
        <div>
          <h1 className="admin-page-title">User Console</h1>
          <p className="admin-page-subtitle">
            View all registered platform members, manage role configurations, deactivate accounts, and monitor historical activities.
          </p>
        </div>
      </div>

      {/* Directory Search & Statistics */}
      <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search by name, email, or team assignment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '42px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '0.88rem', fontWeight: '500' }}>
              Total Users: {nonAdminUsers.length}
            </span>
            <span style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '12px', fontSize: '0.88rem', fontWeight: '500', color: '#ef4444' }}>
              Deactivated: {nonAdminUsers.filter(u => u.is_deactivated).length}
            </span>
          </div>
        </div>
      </div>

      {/* Users List Card */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', color: '#fff' }}>Registered Users Directory</h3>

        {filteredUsers.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px' }}>Name & Email</th>
                  <th style={{ padding: '12px' }}>Platform Role</th>
                  <th style={{ padding: '12px' }}>Active Teams</th>
                  <th style={{ padding: '12px' }}>Account Status</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => {
                  const isDeactivated = !!user.is_deactivated

                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.95rem', opacity: isDeactivated ? 0.6 : 1 }}>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: '600', color: '#fff' }}>
                          {user.first_name} {user.last_name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{user.email}</div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          background: user.platform_role === 'admin' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                          border: user.platform_role === 'admin' ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(99, 102, 241, 0.25)',
                          color: user.platform_role === 'admin' ? '#f87171' : '#818cf8'
                        }}>
                          {user.platform_role || 'user'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        {user.team_id ? (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            background: 'rgba(74, 222, 128, 0.12)',
                            border: '1px solid rgba(74, 222, 128, 0.25)',
                            color: '#4ade80',
                            fontWeight: '500'
                          }}>
                            {teams.find(t => t.id === user.team_id)?.name || 'Unknown'}
                          </span>
                        ) : (
                          <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No Team</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: isDeactivated ? 'rgba(239, 68, 68, 0.15)' : 'rgba(74, 222, 128, 0.15)',
                          border: isDeactivated ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(74, 222, 128, 0.3)',
                          color: isDeactivated ? '#ef4444' : '#4ade80'
                        }}>
                          {isDeactivated ? 'Deactivated' : 'Active'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <Link
                          to={`/admin/users/${user.id}`}
                          className="btn btn-secondary"
                          style={{
                            padding: '6px 14px',
                            fontSize: '0.8rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            textDecoration: 'none'
                          }}
                        >
                          ⚙️ Control Panel
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>No users found matching search query.</p>
        )}
      </div>

      {/* USER CONTROL PANEL MODAL HAS BEEN MOVED TO A DEDICATED PAGE */}

    </div>
  )
}
