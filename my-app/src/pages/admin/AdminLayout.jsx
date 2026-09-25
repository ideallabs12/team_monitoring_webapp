import { useState, useEffect, useMemo } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import {
  LayoutDashboard,
  Users,
  User,
  FileText,
  DollarSign,
  TrendingUp,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  Trophy,
  Crown,
  Network,
  Star,
  Sparkles,
  MapPin,
  Shield,
  Megaphone,
  Download,
  Video,
  Copy,
  Search,
  ChevronLeft,
  ChevronRight,
  LayoutTemplate,
  Command,
  Calendar
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    title: 'Workspace',
    items: [
      { path: '/admin/home', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/admin/announcements', label: 'Announcements', icon: Megaphone },
    ]
  },
  {
    title: 'People & Teams',
    items: [
      { path: '/admin/users', label: 'Users', icon: User },
      { path: '/admin/teams', label: 'Teams', icon: Network },
    ]
  },
  {
    title: 'Analytics & Growth',
    items: [
      { path: '/admin/revenue', label: 'Revenue', icon: DollarSign },
      { path: '/admin/monthly-stats', label: 'Monthly Stats', icon: Calendar },
      { path: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
      { path: '/admin/leaderboard', label: 'Leaderboard', icon: Trophy },
      { path: '/admin/milestones', label: 'Milestones', icon: Crown },

      { path: '/admin/ai-copilot', label: 'AI Copilot', icon: Sparkles },
    ]
  },
  {
    title: 'Operations',
    items: [
      { path: '/admin/dis', label: 'DIS Reports', icon: FileText },
      { path: '/admin/reviews', label: 'Reviews & Write-Ups', icon: Star },
      { path: '/admin/virtual-events', label: 'Virtual Events', icon: LayoutTemplate },
    ]
  },
  {
    title: 'System & Tools',
    items: [
      { path: '/admin/auditlogs', label: 'Audit Logs', icon: ClipboardList },
      { path: '/admin/export-data', label: 'Export Data', icon: Download },
      { path: '/admin/settings', label: 'Settings', icon: Settings },
      { path: '/admin/shortcuts', label: 'Shortcuts', icon: Command },
      { path: '/admin/role-manager', label: 'Specials', icon: Shield },
    ]
  },
  {
    title: 'Discontinued',
    items: [
      { path: '/admin/attendance', label: 'Attendance', icon: MapPin },
      { path: '/admin/crm/speakers', label: 'Speakers CRM', icon: Users },
      { path: '/admin/meetings', label: 'Call Transcripts', icon: Video },
    ]
  }
]

function RestrictedAccessView() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '60vh' }}>
      <div className="card" style={{ maxWidth: '480px', textAlign: 'center', padding: '40px', background: 'var(--card-bg)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🚫</div>
        <h2 style={{ marginBottom: '12px', color: 'var(--apple-text-primary)' }}>Access Restricted</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          Your account is currently deactivated or pending approval. Please contact your system administrator to request access to the platform.
        </p>
      </div>
    </div>
  )
}

export default function AdminLayout({ user, isDeactivated, isExecutive, featureAccess }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('profiles')
      .select('first_name, last_name, platform_role')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setProfile(data) })
  }, [user])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const handleNavClick = () => {
    if (sidebarOpen) setSidebarOpen(false)
  }

  const isActive = (path) => {
    if (location.pathname === path) return true
    if (path === '/admin/reviews' && (location.pathname.startsWith('/admin/review') || location.pathname.startsWith('/admin/write-up') || location.pathname.startsWith('/admin/writeup'))) return true
    return false
  }

  // Derive initials for avatar
  const initials = profile
    ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase()
    : 'SA'

  const fullName = profile
    ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
    : 'System Admin'

  // Filter items based on access permissions and search query
  const filteredSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return NAV_SECTIONS.map(section => {
      const allowedItems = section.items.filter(item => {
        if (user?.email === 'signatureglobalconferences@gmail.com') return true
        if (item.path === '/admin/role-manager') return false

        if (featureAccess) {
          if (item.path === '/admin/attendance') return !!featureAccess.attendance
          if (item.path === '/admin/auditlogs') return !!featureAccess.auditLogs
          if (item.path === '/admin/settings') return !!featureAccess.settings
          if (item.path === '/admin/reviews') return !!featureAccess.reviews || !!featureAccess.writeUps
        }
        return true
      })

      const matchedItems = query
        ? allowedItems.filter(item => item.label.toLowerCase().includes(query))
        : allowedItems

      return {
        ...section,
        items: matchedItems
      }
    }).filter(section => section.items.length > 0)
  }, [searchQuery, user, featureAccess])

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

                {section.items.map(({ path, label, icon: Icon }) => {
                  const active = isActive(path)
                  return (
                    <Link
                      key={path}
                      to={path}
                      onClick={handleNavClick}
                      className={`admin-sidebar-link${active ? ' active' : ''}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <Icon size={collapsed ? 20 : 17} strokeWidth={active ? 2.3 : 1.9} />
                      {!collapsed && <span>{label}</span>}
                      {collapsed && <span className="sidebar-tooltip">{label}</span>}
                    </Link>
                  )
                })}
              </div>
            ))
          )}
        </nav>

        {/* ── Bottom: Profile + Sign Out ── */}
        <div className="admin-sidebar-bottom">
          {!collapsed ? (
            <div className="admin-sidebar-actions-row">
              <Link
                to="/admin/settings"
                className="admin-sidebar-action-btn"
                title="Admin Settings"
              >
                <Settings size={14} />
                <span>Settings</span>
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
              <Link to="/admin/settings" className="admin-sidebar-link" style={{ padding: '8px 0', width: '100%', justifyContent: 'center' }}>
                <div className="admin-sidebar-avatar" style={{ width: '32px', height: '32px', fontSize: '0.7rem' }}>
                  {initials}
                </div>
                <span className="sidebar-tooltip">{fullName} (Settings)</span>
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
      <div className={`admin-sidebar-mobile${sidebarOpen ? ' open' : ''}`}>
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
                All-Hands Admin
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--apple-accent-blue), #30d5c8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: '700', color: '#fff', flexShrink: 0
            }}>
              {initials}
            </div>
          </div>
        </div>

        <main className="admin-content">
          {isDeactivated ? <RestrictedAccessView /> : <Outlet context={{ user, profile, isExecutive, featureAccess }} />}
        </main>
      </div>
    </div>
  )
}
