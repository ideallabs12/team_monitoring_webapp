import { useState, useEffect, useMemo } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import {
  Home,
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Trophy,
  History,
  PhoneCall,
  Star,
  Megaphone,
  LayoutTemplate,
  Flag,
  CheckSquare,
  Video,
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

export default function UserSidebarLayout({ user, isDeactivated, featureAccess, userPagesAccess, RestrictedAccessView }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  const handleNavClick = () => {
    if (sidebarOpen) setSidebarOpen(false)
  }

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('profiles')
      .select('first_name, last_name, platform_role, email, has_revenue_logging, has_dis_reporting, exclude_from_analytics, is_sales_executive, teams!profiles_team_id_fkey(attendance_enabled)')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setProfile(data) })

    // Fetch unread announcements count
    const fetchUnread = async () => {
      let unreadAnn = 0;
      const { data: announcements } = await supabase.from('announcements').select('id').eq('status', 'published')
      if (announcements) {
        const { data: views } = await supabase.from('announcement_views').select('announcement_id').eq('user_id', user.id)
        if (views) {
          const viewedIds = views.map(v => v.announcement_id)
          unreadAnn = announcements.filter(a => !viewedIds.includes(a.id)).length
        }
      }

      let unreadNotifs = 0;
      const { data: notifs } = await supabase.from('notifications').select('id')
      if (notifs) {
        const { data: reads } = await supabase.from('notification_reads').select('notification_id').eq('user_id', user.id)
        if (reads) {
          const readIds = reads.map(r => r.notification_id)
          unreadNotifs = notifs.filter(n => !readIds.includes(n.id)).length
        }
      }

      setUnreadCount(unreadAnn + unreadNotifs)
    }
    fetchUnread()

    const annChannel = supabase.channel(`sidebar-announcements-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        fetchUnread()
      })
      .subscribe()

    const viewsChannel = supabase.channel(`sidebar-views-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcement_views', filter: `user_id=eq.${user.id}` }, () => {
        fetchUnread()
      })
      .subscribe()

    const notifChannel = supabase.channel(`sidebar-notifs-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchUnread()
      })
      .subscribe()

    const notifReadsChannel = supabase.channel(`sidebar-notif-reads-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_reads', filter: `user_id=eq.${user.id}` }, () => {
        fetchUnread()
      })
      .subscribe()

    const teamsChannel = supabase.channel(`sidebar-teams-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams' }, () => {
        supabase
          .from('profiles')
          .select('first_name, last_name, platform_role, email, has_revenue_logging, has_dis_reporting, exclude_from_analytics, is_sales_executive, teams!profiles_team_id_fkey(attendance_enabled)')
          .eq('id', user.id)
          .maybeSingle()
          .then(({ data }) => { if (data) setProfile(data) })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(annChannel)
      supabase.removeChannel(viewsChannel)
      supabase.removeChannel(notifChannel)
      supabase.removeChannel(notifReadsChannel)
      supabase.removeChannel(teamsChannel)
    }
  }, [user])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  const initials = profile
    ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase()
    : 'U'

  const fullName = profile
    ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
    : 'User'

  const isTeamLead = profile?.platform_role?.toLowerCase() === 'teamlead'
  const isAdmin = profile?.platform_role?.toLowerCase() === 'admin'

  // Build categorized navigation sections
  const userNavSections = useMemo(() => {
    const userPagesAccessMap = featureAccess?.userPagesAccess || {} // if passed down via featureAccess? Wait, we passed it as `userPagesAccess` prop
    // Actually, in Layout.jsx we passed it as userPagesAccess={userPagesAccess} so it's a prop on UserSidebarLayout
    const access = userPagesAccess || {}
    const sections = []

    // 1. Workspace
    const workspaceItems = [
      { path: '/home', label: 'Home', icon: Home },
    ]
    if (access.announcements !== false) workspaceItems.push({ path: '/announcements', label: 'Announcements', icon: Megaphone, badge: unreadCount })
    if (access.aiCopilot !== false) workspaceItems.push({ path: '/ai-copilot', label: 'AI Copilot', icon: Sparkles })
    
    sections.push({
      title: 'Workspace',
      items: workspaceItems
    })

    // 2. Daily Operations & Logs (if enabled)
    const operationsItems = []
    if (profile?.has_dis_reporting !== false && access.dis !== false) {
      operationsItems.push({ path: '/dis', label: 'My DIS', icon: FileText })
    }
    if (operationsItems.length > 0) {
      sections.push({
        title: 'Operations',
        items: operationsItems
      })
    }

    // 3. Team & Collaboration
    const collabItems = []
    if (access.team !== false) collabItems.push({ path: '/team', label: 'Team', icon: Users })
    if (access.virtualEvents !== false) collabItems.push({ path: '/virtual-events', label: 'Virtual Events', icon: LayoutTemplate })
    
    if (collabItems.length > 0) {
      sections.push({
        title: 'Collaboration',
        items: collabItems
      })
    }

    // 4. Team Hub (For Team Leads only)
    if (isTeamLead && access.teamHub !== false) {
      sections.push({
        title: 'Team Hub',
        items: [
          { path: '/team-analytics', label: 'Team Analytics', icon: TrendingUp },
          { path: '/team-management', label: 'Team Mgmt', icon: Users },
          { path: '/team-dis-report', label: 'Team DIS', icon: FileText },
        ]
      })
    }

    // 5. Growth & Recognition
    const growthItems = []
    if (profile?.has_revenue_logging !== false && access.revenue !== false) {
      growthItems.push({ path: '/revenue', label: 'Revenue', icon: DollarSign })
      growthItems.push({ path: '/revenue-history', label: 'Revenue History', icon: History })
    }
    if (access.leaderboard !== false) growthItems.push({ path: '/leaderboard', label: 'Leaderboard', icon: Trophy })
    if (access.milestones !== false) growthItems.push({ path: '/milestones', label: 'Milestones', icon: Flag })
    if (access.reviews !== false) growthItems.push({ path: '/reviews', label: 'Reviews', icon: Star })
    
    if (profile?.is_sales_executive && access.salesAnalytics !== false) {
      growthItems.push({ path: '/sales-analytics', label: 'Sales Exec', icon: PhoneCall })
    }
    
    if (growthItems.length > 0) {
      sections.push({
        title: 'Recognition & Growth',
        items: growthItems
      })
    }

    // 6. Discontinued
    const discontinuedItems = []
    if (access.speakersCRM !== false) discontinuedItems.push({ path: '/crm/speakers', label: 'Speakers CRM', icon: Users })
    if (access.meetings !== false) discontinuedItems.push({ path: '/meetings', label: 'Call Transcripts', icon: Video })
    
    if (isAdmin) {
      discontinuedItems.push({ path: '/attendance', label: 'Attendance', icon: CheckSquare })
    }
    
    if (discontinuedItems.length > 0) {
      sections.push({
        title: 'Discontinued',
        items: discontinuedItems
      })
    }

    return sections
  }, [profile, unreadCount, isTeamLead, isAdmin, userPagesAccess])

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return userNavSections

    return userNavSections.map(section => ({
      ...section,
      items: section.items.filter(item => item.label.toLowerCase().includes(query))
    })).filter(section => section.items.length > 0)
  }, [userNavSections, searchQuery])

  const totalMatchingItems = useMemo(() => {
    return filteredSections.reduce((acc, sec) => acc + sec.items.length, 0)
  }, [filteredSections])

  const renderSidebarContent = (isMobileView) => {
    const collapsed = isMobileView ? false : isCollapsed

    return (
      <div className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
        {/* ── Brand Header ── */}
        <div className="admin-sidebar-brand">
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
              <div className="admin-sidebar-brand-icon" title="All-Hands Platform">
                <img src="/allhands_logo_cropped.png" alt="All-Hands Logo" />
              </div>

              <div className="admin-sidebar-brand-info">
                <span className="admin-sidebar-brand-name">All-Hands</span>
                <div 
                  style={{ 
                    marginTop: '2px'
                  }}
                >
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: 'var(--apple-text-secondary)', 
                    fontWeight: '500', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    maxWidth: '140px', 
                    display: 'block' 
                  }}>
                    {fullName}
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            className="admin-menu-toggle-btn"
            onClick={() => {
              if (isMobileView) setSidebarOpen(false)
              else setIsCollapsed(!isCollapsed)
            }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={collapsed ? { margin: '0 auto', width: '40px', height: '40px' } : {}}
          >
            {isMobileView ? (
              <X size={19} />
            ) : (
              <Menu size={collapsed ? 24 : 18} />
            )}
          </button>
        </div>

        {/* ── Quick Search (Expanded Only) ── */}
        {!collapsed && (
          <div className="sidebar-search-container">
            <div className="sidebar-search-box">
              <Search size={14} style={{ color: 'var(--apple-text-secondary)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Jump to page..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="sidebar-search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'transparent', border: 'none', color: 'var(--apple-text-secondary)',
                    cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center'
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Categorized Navigation ── */}
        <nav className="admin-sidebar-nav">
          {totalMatchingItems === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--apple-text-secondary)', fontSize: '0.8rem' }}>
              No pages match &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            filteredSections.map((section, sIdx) => (
              <div key={section.title} className="sidebar-section">
                {!collapsed && (
                  <div className="sidebar-section-header">
                    <span>{section.title}</span>
                  </div>
                )}
                {collapsed && sIdx > 0 && <div className="sidebar-section-divider" />}

                {section.items.map(({ path, label, icon: Icon, badge }) => {
                  const active = isActive(path)
                  return (
                    <Link
                      key={path}
                      to={path}
                      onClick={handleNavClick}
                      className={`admin-sidebar-link${active ? ' active' : ''}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <div style={{ position: 'relative', display: 'inline-flex' }}>
                        <Icon size={collapsed ? 20 : 17} strokeWidth={active ? 2.3 : 1.9} />
                        {collapsed && badge > 0 && (
                          <span className="sidebar-dot-badge" />
                        )}
                      </div>

                      {!collapsed && <span>{label}</span>}

                      {!collapsed && badge > 0 && (
                        <span className="sidebar-pill-badge">
                          {badge}
                        </span>
                      )}

                      {collapsed && (
                        <span className="sidebar-tooltip">
                          {label} {badge > 0 ? `(${badge} new)` : ''}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            ))
          )}
        </nav>

        {/* ── Bottom: Profile + Account Drawer ── */}
        <div className="admin-sidebar-bottom">
          {!collapsed ? (
            <div className="admin-sidebar-actions-row">
              <Link
                to="/profile"
                onClick={handleNavClick}
                className="admin-sidebar-action-btn"
                title="Profile & Preferences"
              >
                <SettingsIcon size={14} />
                <span>Preferences</span>
              </Link>

              <button
                className="admin-sidebar-action-btn signout"
                onClick={handleLogout}
                title="Sign out of your account"
              >
                <LogOut size={14} />
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Link to="/profile" onClick={handleNavClick} className="admin-sidebar-link" style={{ padding: '8px 0', width: '100%', justifyContent: 'center' }}>
                <div className="admin-sidebar-avatar" style={{ width: '32px', height: '32px', fontSize: '0.7rem' }}>
                  {initials}
                </div>
                <span className="sidebar-tooltip">{fullName} (Profile)</span>
              </Link>

              <Link to="/profile" onClick={handleNavClick} className="admin-sidebar-link" style={{ padding: '8px 0', width: '100%', justifyContent: 'center' }}>
                <SettingsIcon size={18} />
                <span className="sidebar-tooltip">Preferences</span>
              </Link>

              <button
                onClick={handleLogout}
                className="admin-sidebar-link"
                style={{
                  background: 'transparent', border: 'none', padding: '8px 0',
                  width: '100%', justifyContent: 'center', color: 'var(--apple-accent-red)'
                }}
              >
                <LogOut size={18} />
                <span className="sidebar-tooltip">Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Desktop Sidebar ── */}
      <div className={`admin-sidebar-wrapper ${isCollapsed ? 'collapsed' : ''}`}>
        {renderSidebarContent(false)}
      </div>

      {/* ── Mobile Sidebar Drawer ── */}
      <div
        className={`admin-sidebar-mobile${sidebarOpen ? ' open' : ''}`}
      >
        {renderSidebarContent(true)}
      </div>

      {/* ── Main Content ── */}
      <div className="admin-main">
        {/* Mobile top bar */}
        <div className="admin-mobile-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="admin-mobile-menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation menu"
            >
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '6px', overflow: 'hidden', background: '#fff' }}>
                <img src="/allhands_logo_cropped.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <span className="admin-sidebar-brand-name" style={{ fontSize: '0.95rem' }}>
                All-Hands
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--apple-accent-blue), #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: '700', color: '#fff', flexShrink: 0
            }}>
              {initials}
            </div>
          </div>
        </div>

        <main 
          className="admin-content" 
          style={{ 
            animation: 'fadeIn 0.3s var(--apple-ease)'
          }}
        >
          {isDeactivated ? <RestrictedAccessView /> : <Outlet context={{ featureAccess }} />}
        </main>
      </div>
    </div>
  )
}
