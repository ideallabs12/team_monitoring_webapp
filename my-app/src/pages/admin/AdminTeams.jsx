import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import {
  normalizeMonth,
  filterRevenuesByPeriod,
  sumRevenues,
  getLastNMonths,
  formatRevenueMonth,
  toRevenueMonthString
} from '../../utils/revenueUtils'
import UserRevenue from '../user/UserRevenue'
import { ArrowLeft, Users, TrendingUp, Mail, Phone, Calendar, Shield, FileText } from 'lucide-react'

let adminTeamsCache = { loaded: false, teams: [], profiles: [], revenues: [] }

export default function AdminTeams() {
  const [loading, setLoading] = useState(!adminTeamsCache.loaded)
  const [teams, setTeams] = useState(adminTeamsCache.teams)
  const [profiles, setProfiles] = useState(adminTeamsCache.profiles)
  const [revenues, setRevenues] = useState(adminTeamsCache.revenues)
  
  // Navigation & Detail States
  const [activeTeam, setActiveTeam] = useState(null) // selected team object for detail view
  const [viewingProfileUser, setViewingProfileUser] = useState(null) // selected user profile object for profile view

  // User Profile DIS history state
  const [disReports, setDisReports] = useState([])
  const [loadingDis, setLoadingDis] = useState(false)

  // Month picker for revenue column – default to current month
  const now = new Date()
  const [selectedRevenueMonth, setSelectedRevenueMonth] = useState(
    toRevenueMonthString(now.getFullYear(), now.getMonth())
  )

  useEffect(() => {
    async function loadData() {
      const [teamsRes, profilesRes, revRes] = await Promise.all([
        supabase.from('teams').select('*').order('created_at', { ascending: true }),
        supabase.from('profiles').select('*'),
        supabase.from('monthly_revenues').select('*')
      ])

      const t = teamsRes.data || []
      const p = profilesRes.data || []
      const r = revRes.data || []

      setTeams(t)
      setProfiles(p)
      setRevenues(r)
      
      adminTeamsCache = { loaded: true, teams: t, profiles: p, revenues: r }
        
      setLoading(false)
    }
    loadData()
  }, [])

  // Load DIS Reports for user profile dynamically
  useEffect(() => {
    if (!viewingProfileUser) {
      setDisReports([])
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
        if (data) setDisReports(data)
      } catch (err) {
        console.error("Error loading user DIS reports:", err)
      } finally {
        setLoadingDis(false)
      }
    }
    fetchUserDis()
  }, [viewingProfileUser])

  // Build list of months available for picker (last 24 months)
  const monthOptions = useMemo(() => getLastNMonths(24), [])

  // Find the team this user belongs to
  const memberTeam = useMemo(() => {
    if (!viewingProfileUser || !viewingProfileUser.team_id) return null
    const team = teams.find(t => t.id === viewingProfileUser.team_id)
    return team ? { name: team.name, id: team.id } : null
  }, [viewingProfileUser, teams])

  // Current Month String
  const currentMonthStr = useMemo(() => {
    const d = new Date()
    return toRevenueMonthString(d.getFullYear(), d.getMonth())
  }, [])

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>Loading teams ledger...</div>

  // ==========================================
  // VIEW 1: MEMBER PROFILE VIEW (2-column layout)
  // ==========================================
  if (viewingProfileUser) {
    return (
      <div style={{ animation: 'fadeIn 0.3s var(--apple-ease)', paddingBottom: '60px' }}>
        {/* Back navigation left top hero section */}
        <button
          onClick={() => setViewingProfileUser(null)}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--apple-border)',
            color: '#fff',
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
          <ArrowLeft size={16} /> Back to Members
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
                color: '#fff'
              }}>
                {viewingProfileUser.first_name?.[0]?.toUpperCase() || 'M'}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', fontWeight: '700' }}>
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
                <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '500' }}>{viewingProfileUser.email}</div>
              </div>

              <div style={{ borderBottom: '1px solid var(--apple-border)', paddingBottom: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', marginBottom: '2px', fontWeight: '500' }}>
                  <Phone size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Phone Number
                </div>
                <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '500' }}>{viewingProfileUser.phone || '—'}</div>
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
            ) : disReports.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {disReports.map(rep => (
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
                      <span style={{ color: '#fff' }}>
                        {new Date(rep.report_date).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}
                      </span>
                      <span style={{ color: 'var(--apple-accent-green)' }}>
                        + {rep.positive_leads} Leads
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--apple-text-secondary)', fontSize: '0.78rem' }}>
                      <span>Exp Revenue:</span>
                      <span style={{ color: '#fff', fontWeight: '500' }}>${Number(rep.expected_revenue).toFixed(2)}</span>
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

  // ==========================================
  // VIEW 2: TEAM MEMBERS DETAILS VIEW
  // ==========================================
  if (activeTeam) {
    const activeProfiles = profiles
      .filter(p => (p.team_id === activeTeam.id || Object.keys(p.secondary_team_roles || {}).includes(activeTeam.id)) && p.platform_role !== 'admin' && !p.is_deactivated)
      .sort((a, b) => (a.platform_role === 'teamlead' ? -1 : 1))

    const activeProfileIds = new Set(activeProfiles.map(p => p.id))

    // Historical profiles: non-admins who are NOT currently active in this team
    const historicalProfilesUnfiltered = profiles
      .filter(p => p.platform_role !== 'admin' && !activeProfileIds.has(p.id))

    return (
      <div style={{ animation: 'fadeIn 0.25s var(--apple-ease)' }}>
        {/* Back navigation left top hero section */}
        <button
          onClick={() => setActiveTeam(null)}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--apple-border)',
            color: '#fff',
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
          <ArrowLeft size={16} /> Back to Teams
        </button>

        <div style={{ marginBottom: '32px' }}>
          <span className="apple-kicker">Team Roster</span>
          <h2 className="apple-title-medium" style={{ textTransform: 'capitalize' }}>
            {activeTeam.name} Members
          </h2>
          <p style={{ color: 'var(--apple-text-secondary)', fontSize: '0.95rem', margin: '4px 0 0 0' }}>
            Review role hierarchy and revenue contributions for this team roster.
          </p>
        </div>

        {/* Month Filter */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--apple-text-secondary)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Revenue Month
            </label>
            <select
              value={selectedRevenueMonth}
              onChange={e => setSelectedRevenueMonth(e.target.value)}
              className="apple-form-control"
              style={{ padding: '8px 16px !important', fontSize: '0.88rem !important', width: 'auto', borderRadius: '10px !important' }}
            >
              {monthOptions.map(m => (
                <option key={m} value={m}>{formatRevenueMonth(m)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Member list details */}
        <div className="apple-card" style={{ padding: '24px !important', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff', fontWeight: '600' }}>
              Active Members ({activeProfiles.length})
            </h4>
            <span style={{ fontSize: '0.82rem', color: 'var(--apple-text-secondary)' }}>
              Audit month: <strong style={{ color: 'var(--apple-accent-green)' }}>{formatRevenueMonth(selectedRevenueMonth)}</strong>
            </span>
          </div>

          {activeProfiles.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* Table Header Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(180px, 1.2fr) 110px 120px 100px',
                gap: '12px',
                padding: '0 0 12px 0',
                fontSize: '0.78rem',
                color: 'var(--apple-text-secondary)',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: '1px solid var(--apple-border)'
              }}>
                <div>Member Details</div>
                <div style={{ textAlign: 'center' }}>Role</div>
                <div style={{ textAlign: 'right' }}>Revenue</div>
                <div style={{ textAlign: 'center' }}>Action</div>
              </div>

              {/* Rows */}
              {activeProfiles.map(profile => {
                const monthRevenue = revenues
                  .filter(r => r.user_id === profile.id && r.team_id === activeTeam.id && normalizeMonth(r.revenue_month) === selectedRevenueMonth)
                  .reduce((sum, r) => sum + Number(r.amount || 0), 0)

                return (
                  <div
                    key={profile.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(180px, 1.2fr) 110px 120px 100px',
                      gap: '12px',
                      alignItems: 'center',
                      padding: '14px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      fontSize: '0.92rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', color: '#fff' }}>{profile.first_name} {profile.last_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>{profile.email}</div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span className={profile.platform_role === 'teamlead' ? 'apple-badge apple-badge-orange' : 'apple-badge apple-badge-blue'} style={{ padding: '2px 8px', fontSize: '0.68rem', textTransform: 'capitalize' }}>
                        {profile.platform_role === 'teamlead' ? 'Lead' : 'Member'}
                      </span>
                    </div>

                    <div style={{ textAlign: 'right', fontWeight: '700', color: monthRevenue > 0 ? 'var(--apple-accent-green)' : 'var(--apple-text-secondary)' }}>
                      ${monthRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button
                        onClick={() => setViewingProfileUser(profile)}
                        className="apple-btn apple-btn-secondary"
                        style={{ padding: '6px 12px !important', fontSize: '0.78rem', borderRadius: '10px !important' }}
                      >
                        Profile
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.9rem' }}>
              No active members in this team.
            </p>
          )}
        </div>

        {/* Historical Members List (Only shown if they have revenue in this month) */}
        {(() => {
          // Calculate revenue for historical members and only keep those with > 0
          const historicalWithRevenue = historicalProfilesUnfiltered.map(profile => {
            const monthRevenue = revenues
              .filter(r => r.user_id === profile.id && r.team_id === activeTeam.id && normalizeMonth(r.revenue_month) === selectedRevenueMonth)
              .reduce((sum, r) => sum + Number(r.amount || 0), 0)
            return { ...profile, monthRevenue }
          }).filter(p => p.monthRevenue > 0)

          if (historicalWithRevenue.length === 0) return null

          return (
            <div className="apple-card" style={{ padding: '24px !important', background: 'rgba(255, 255, 255, 0.02) !important', borderStyle: 'dashed' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--apple-text-secondary)', fontWeight: '600' }}>
                  Historical Members ({historicalWithRevenue.length})
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', opacity: 0.85 }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(180px, 1.2fr) 110px 120px 100px',
                  gap: '12px',
                  padding: '0 0 12px 0',
                  fontSize: '0.78rem',
                  color: 'var(--apple-text-secondary)',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '1px solid var(--apple-border)'
                }}>
                  <div>Member Details</div>
                  <div style={{ textAlign: 'center' }}>Status</div>
                  <div style={{ textAlign: 'right' }}>Revenue</div>
                  <div style={{ textAlign: 'center' }}>Action</div>
                </div>

                {historicalWithRevenue.map(profile => (
                  <div
                    key={profile.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(180px, 1.2fr) 110px 120px 100px',
                      gap: '12px',
                      alignItems: 'center',
                      padding: '14px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      fontSize: '0.92rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--apple-text-secondary)' }}>{profile.first_name} {profile.last_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>{profile.email}</div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span className="apple-badge" style={{ padding: '2px 8px', fontSize: '0.68rem', background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                        {profile.is_deactivated ? 'Former' : 'Transferred'}
                      </span>
                    </div>

                    <div style={{ textAlign: 'right', fontWeight: '700', color: 'var(--apple-text-secondary)' }}>
                      ${profile.monthRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button
                        onClick={() => setViewingProfileUser(profile)}
                        className="apple-btn apple-btn-secondary"
                        style={{ padding: '6px 12px !important', fontSize: '0.78rem', borderRadius: '10px !important', opacity: 0.7 }}
                      >
                        Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </div>
    )
  }

  // ==========================================
  // VIEW 3: TEAMS CARD SUMMARY VIEW (Default view)
  // ==========================================
  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* Header */}
      <div style={{ marginBottom: 'clamp(24px, 5vw, 40px)' }}>
        <div className="apple-kicker">Platform Organization</div>
        <h1 className="apple-title-large">Manage Teams</h1>
        <p className="apple-lead">
          View organizational team cards, analyze member sizes, and track current month contributions.
        </p>
      </div>

      {/* Grid of Team Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', width: '100%' }}>
        {teams.length > 0 ? (
          teams.map(team => {
            // Count total members (excluding platform admins and deactivated)
            const teamMemberCount = profiles.filter(p => 
              p.team_id === team.id && p.platform_role !== 'admin' && !p.is_deactivated
            ).length

            // Sum this month's revenue
            const teamThisMonthRevenues = revenues.filter(
              r => r.team_id === team.id && normalizeMonth(r.revenue_month) === currentMonthStr
            )
            const teamThisMonthTotal = teamThisMonthRevenues.reduce((sum, r) => sum + Number(r.amount || 0), 0)

            return (
              <div
                key={team.id}
                onClick={() => setActiveTeam(team)}
                className="apple-card"
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  background: 'var(--apple-card) !important',
                  padding: '24px !important',
                  position: 'relative'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', fontWeight: '700', textTransform: 'capitalize' }}>
                    {team.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', color: 'var(--apple-text-secondary)', fontSize: '0.85rem' }}>
                    <Users size={14} />
                    <span>{teamMemberCount} {teamMemberCount === 1 ? 'member' : 'members'}</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--apple-border)', paddingTop: '14px', marginTop: 'auto' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                    <TrendingUp size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> This Month Revenue
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: teamThisMonthTotal > 0 ? 'var(--apple-accent-green)' : '#fff' }}>
                    ${teamThisMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="apple-card" style={{ textAlign: 'center', padding: '40px !important', gridColumn: '1 / -1' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '12px' }}>👥</span>
            <p style={{ color: 'var(--apple-text-secondary)', margin: 0 }}>No teams found in the database. Add teams in Settings.</p>
          </div>
        )}
      </div>
    </div>
  )
}
