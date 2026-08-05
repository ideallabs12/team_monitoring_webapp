import { useState, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import {
  LayoutDashboard,
  Users,
  User,
  MapPin,
  Trophy,
  Crown,
  Network,
  LogOut,
  Menu,
  X,
  Copy,
  Megaphone,
  Calendar
} from 'lucide-react'

const NAV_ITEMS = [
  { path: '/hr/home',        label: 'Dashboard',      icon: LayoutDashboard },
  { path: '/hr/teams',       label: 'Teams',          icon: Network },
  { path: '/hr/users',       label: 'Users',          icon: User },
  { path: '/hr/attendance',  label: 'Attendance',     icon: MapPin },
  { path: '/hr/copystats',   label: 'Copy Stats',     icon: Copy },
  { path: '/hr/leaderboard', label: 'Leaderboard',    icon: Trophy },
  { path: '/hr/milestones',  label: 'Milestones',     icon: Crown },
  { path: '/hr/announcements', label: 'Announcements', icon: Megaphone },
  { path: '/hr/leaves',      label: 'Leaves',         icon: Calendar },
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

export default function HrLayout({ user, isDeactivated }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    // Automatically close sidebar on mobile when navigating to a new route
    if (window.innerWidth <= 768) {
      setSidebarOpen(false)
    }
  }, [location.pathname])

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

  const isActive = (path) => location.pathname === path

  // Derive initials for avatar
  const initials = profile
    ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase()
    : 'HR'

  const fullName = profile
    ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
    : 'HR Representative'

  const renderSidebarContent = (isMobileView) => {
    const collapsed = isMobileView ? false : isCollapsed

    return (
      <div className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
        {/* ── Brand ── */}
        <div className="admin-sidebar-brand" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          padding: collapsed ? '18px 0' : '18px 16px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid var(--apple-border)',
          marginBottom: '8px',
          minHeight: '62px'
        }}>
          {/* Hamburger toggle */}
          <button
            className="admin-menu-toggle-btn"
            onClick={() => {
              if (isMobileView) setSidebarOpen(false)
              else setIsCollapsed(!isCollapsed)
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--apple-text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '8px',
              flexShrink: 0,
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'var(--apple-text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--apple-text-secondary)' }}
          >
            {isMobileView ? <X size={20} /> : <Menu size={20} />}
          </button>

          {!collapsed && (
            <>
              {/* Brand text */}
              <span className="admin-sidebar-brand-name" style={{ flex: 1, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>All-Hands</span>

              {/* Logo pushed to the right */}
              <div className="admin-sidebar-brand-icon" style={{ marginLeft: 'auto', flexShrink: 0, width: '44px', height: '44px', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                <img src="/allhands_logo_cropped.png" alt="All-Hands Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
            </>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className="admin-sidebar-nav" style={{ padding: collapsed ? '0 8px' : '0 10px' }}>
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const active = isActive(path)
            return (
              <Link
                key={path}
                to={path}
                className={`admin-sidebar-link${active ? ' active' : ''}`}
                title={collapsed ? label : ''}
                style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '12px 0' : '9px 12px' }}
              >
                <Icon size={collapsed ? 22 : 18} strokeWidth={active ? 2.5 : 2} />
                {!collapsed && <span>{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* ── Bottom: Profile + Sign Out ── */}
        <div className="admin-sidebar-bottom" style={{ padding: collapsed ? '16px 8px 20px' : '16px 10px 20px' }}>

          {!collapsed ? (
            <div className="admin-sidebar-profile">
              <div className="admin-sidebar-avatar" style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>{initials}</div>
              <div className="admin-sidebar-profile-info">
                <span className="admin-sidebar-profile-name">{fullName}</span>
                <span className="admin-sidebar-role-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>HR</span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }} title={fullName}>
              <div className="admin-sidebar-avatar" style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #10b981, #34d399)' }}>{initials}</div>
            </div>
          )}

          <button className="admin-sidebar-signout" onClick={handleLogout} style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '12px 0' : '9px 12px' }} title={collapsed ? "Sign out" : ""}>
            <LogOut size={collapsed ? 20 : 16} />
            {!collapsed && <span>Sign out</span>}
          </button>
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
          style={{ zIndex: 150 }}
        />
      )}

      {/* ── Desktop Sidebar ── */}
      <div className={`admin-sidebar-wrapper ${isCollapsed ? 'collapsed' : ''}`}>
        {renderSidebarContent(false)}
      </div>

      {/* ── Mobile Sidebar ── */}
      <div
        className={`admin-sidebar-mobile${sidebarOpen ? ' open' : ''}`}
        style={{ zIndex: 200 }}
      >
        {renderSidebarContent(true)}
      </div>

      {/* ── Main Content ── */}
      <div className="admin-main">
        {/* Mobile top bar */}
        <div className="admin-mobile-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              className="admin-mobile-menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div className="admin-sidebar-brand-name" style={{ fontSize: '1rem' }}>
              All-Hands HR
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #10b981, #34d399)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: '700', color: '#fff', flexShrink: 0
            }}>
              {initials}
            </div>
          </div>
        </div>

        <main className="admin-content">
          {isDeactivated ? <RestrictedAccessView /> : <Outlet context={{ user, profile, isHrView: true }} />}
        </main>
      </div>
    </div>
  )
}
