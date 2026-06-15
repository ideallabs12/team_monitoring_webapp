import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { Users, Search, Shield, Key, AlertTriangle, Activity, X, Plus, Trash2, ArrowLeft, Mail, Phone, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import UserRevenue from '../user/UserRevenue'

let adminUsersCache = { loaded: false, users: [], teams: [], revenues: [], disReports: [] }

export default function AdminUsers() {
  const [loading, setLoading] = useState(!adminUsersCache.loaded)
  const [users, setUsers] = useState(adminUsersCache.users)
  const [teams, setTeams] = useState(adminUsersCache.teams)
  const [revenues, setRevenues] = useState(adminUsersCache.revenues)
  const [disReports, setDisReports] = useState(adminUsersCache.disReports)

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')

  // Profile Detail View State
  const [viewingProfileUser, setViewingProfileUser] = useState(null)
  const [userDisReports, setUserDisReports] = useState([])
  const [loadingDis, setLoadingDis] = useState(false)

  // Load DIS Reports dynamically for the selected profile
  useEffect(() => {
    if (!viewingProfileUser) {
      setUserDisReports([])
      return
    }

    async function fetchUserDis() {
      setLoadingDis(true)
      try {
        const { data, error } = await supabase
          .from('dis_reports')
          .select('*')
          .eq('user_id', viewingProfileUser.id)
          .order('report_date', { ascending: false })
          .limit(6)
        if (data) setUserDisReports(data)
      } catch (err) {
        console.error("Error loading user DIS reports:", err)
      } finally {
        setLoadingDis(false)
      }
    }
    fetchUserDis()
  }, [viewingProfileUser])

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

  if (viewingProfileUser) {
    const memberTeam = teams.find(t => t.id === viewingProfileUser.team_id)
    return (
      <div style={{ animation: 'fadeIn 0.3s var(--apple-ease)', paddingBottom: '60px' }}>
        {/* Back navigation left top hero section */}
        <button
          onClick={() => setViewingProfileUser(null)}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--apple-border)',
            color: 'var(--apple-text-primary)',
            padding: '10px 18px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '28px',
            transition: 'all 0.25s var(--apple-ease)'
          }}
          className="apple-btn-secondary"
        >
          <ArrowLeft size={16} /> Back to Directory
        </button>

        {/* Full-width stacked rows: Profile → Latest DIS → Revenue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* ROW 1: My Profile Card */}
          <div className="apple-card" style={{ padding: '24px !important' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0071e3, #30d5c8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: 'white'
              }}>
                {viewingProfileUser.first_name?.[0]?.toUpperCase() || 'M'}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--apple-text-primary)', fontWeight: '700' }}>
                  {viewingProfileUser.first_name} {viewingProfileUser.last_name}
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>
                  {viewingProfileUser.platform_role || 'Member'}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ borderBottom: '1px solid var(--apple-border)', paddingBottom: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '2px', fontWeight: '500' }}>
                  <Mail size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Email Address
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--apple-text-primary)', fontWeight: '500' }}>{viewingProfileUser.email}</div>
              </div>

              <div style={{ borderBottom: '1px solid var(--apple-border)', paddingBottom: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '2px', fontWeight: '500' }}>
                  <Phone size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Phone Number
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--apple-text-primary)', fontWeight: '500' }}>{viewingProfileUser.phone || '—'}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '500' }}>
                  Team Assignments
                </div>
                {memberTeam ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <span
                      className={viewingProfileUser.platform_role === 'teamlead' ? 'apple-badge apple-badge-orange' : 'apple-badge apple-badge-blue'}
                      style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                    >
                      {memberTeam.name} ({viewingProfileUser.platform_role === 'teamlead' ? 'lead' : 'member'})
                    </span>
                  </div>
                ) : (
                  <span style={{ fontStyle: 'italic', color: 'var(--apple-text-secondary)', fontSize: '0.85rem' }}>
                    No team assigned
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ROW 2: Latest DIS Reports */}
          <div className="apple-card" style={{ padding: '24px !important' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <FileText size={18} style={{ color: 'var(--apple-accent-orange)' }} />
              <h3 className="apple-title-small" style={{ margin: 0 }}>Latest Daily DIS</h3>
            </div>

            {loadingDis ? (
              <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.88rem' }}>Loading DIS reports...</div>
            ) : userDisReports.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {userDisReports.map(rep => (
                  <div
                    key={rep.id}
                    style={{
                      padding: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--apple-border)',
                      borderRadius: '10px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: '600' }}>
                      <span style={{ color: 'var(--apple-text-primary)' }}>
                        {new Date(rep.report_date).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}
                      </span>
                      <span style={{ color: 'var(--apple-accent-green)' }}>
                        + {rep.positive_leads} Leads
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--apple-text-secondary)', fontSize: '0.78rem' }}>
                      <span>Exp Revenue:</span>
                      <span style={{ color: 'var(--apple-text-primary)', fontWeight: '500' }}>${Number(rep.expected_revenue).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.85rem' }}>
                No DIS entries submitted yet.
              </p>
            )}
          </div>

          {/* ROW 3: Revenue (full width) */}
          <div>
            <UserRevenue user={viewingProfileUser} isAdminView={true} />
          </div>

        </div>
      </div>
    )
  }

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
                    <tr
                      key={user.id}
                      className="watchlist-row"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.95rem', opacity: isDeactivated ? 0.6 : 1, cursor: 'pointer' }}
                      onClick={() => setViewingProfileUser(user)}
                    >
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
                      <td style={{ padding: '14px 12px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
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
