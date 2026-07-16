import { useState, useEffect } from 'react'
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
  BarChart2,
  Menu,
  X,
  Trophy,
  Crown,
  Network,
  Sun,
  Moon,
  Calendar,
  Star,
  Sparkles,
  MapPin,
  Shield,
  Megaphone,
  Download,
  Video
} from 'lucide-react'

const NAV_ITEMS = [
  { path: '/admin/home',        label: 'Dashboard',      icon: LayoutDashboard },
  { path: '/admin/teams',       label: 'Teams',          icon: Network },
  { path: '/admin/users',       label: 'Users',          icon: User },
  { path: '/admin/dis',         label: 'DIS Reports',    icon: FileText },
  { path: '/admin/write-ups',   label: 'Review Write-Ups', icon: Calendar },
  { path: '/admin/reviews',     label: 'Review Approvals', icon: Star },
  { path: '/admin/revenue',     label: 'Revenue',        icon: DollarSign },
  { path: '/admin/analytics',   label: 'Analytics',      icon: TrendingUp },
  { path: '/admin/ai-analytics',label: 'AI Analytics',   icon: Sparkles },
  { path: '/admin/leaderboard', label: 'Leaderboard',    icon: Trophy },
  { path: '/admin/milestones',  label: 'Milestones',     icon: Crown },
  { path: '/admin/auditlogs',   label: 'Audit Logs',     icon: ClipboardList },
  { path: '/admin/attendance',  label: 'Attendance',     icon: MapPin },
  { path: '/admin/announcements',label: 'Announcements', icon: Megaphone },
  { path: '/admin/export-data', label: 'Export Data',    icon: Download },
  { path: '/admin/virtual-events', label: 'Virtual Events', icon: Video },
  { path: '/admin/settings',    label: 'Settings',       icon: Settings },
  { path: '/admin/role-manager',label: 'Specials',       icon: Shield },
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
    : 'SA'

  const fullName = profile
    ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
    : 'System Admin'

  const SidebarContent = ({ isMobileView }) => {
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
                <img src="./allhands_logo_cropped.png" alt="All-Hands Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
            </>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className="admin-sidebar-nav" style={{ padding: collapsed ? '0 8px' : '0 10px' }}>
          {NAV_ITEMS.filter(item => {
            if (user?.email === 'signatureglobalconferences@gmail.com') return true;
            if (item.path === '/admin/role-manager') return false;

            if (featureAccess) {
              if (item.path === '/admin/ai-analytics') return !!featureAccess.aiAnalytics;
              if (item.path === '/admin/attendance') return !!featureAccess.attendance;
              if (item.path === '/admin/auditlogs') return !!featureAccess.auditLogs;
              if (item.path === '/admin/settings') return !!featureAccess.settings;
              if (item.path === '/admin/write-ups') return !!featureAccess.writeUps;
              if (item.path === '/admin/reviews') return !!featureAccess.reviews;
            }
            
            return true
          }).map(({ path, label, icon: Icon }) => {
            const active = isActive(path)
            return (
              <Link
                key={path}
                to={path}
                className={`admin-sidebar-link${active ? ' active' : ''}`}
                title={collapsed ? label : ''}
                onClick={() => {
                  if (window.innerWidth <= 768 || isMobileView) setSidebarOpen(false)
                }}
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
              <div className="admin-sidebar-avatar">{initials}</div>
              <div className="admin-sidebar-profile-info">
                <span className="admin-sidebar-profile-name">{fullName}</span>
                <span className="admin-sidebar-role-badge">Admin</span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }} title={fullName}>
              <div className="admin-sidebar-avatar" style={{ width: '36px', height: '36px' }}>{initials}</div>
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
        <SidebarContent isMobileView={false} />
      </div>

      {/* ── Mobile Sidebar ── */}
      <div
        className={`admin-sidebar-mobile${sidebarOpen ? ' open' : ''}`}
        style={{ zIndex: 200 }}
      >
        <SidebarContent isMobileView={true} />
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
              All-Hands Admin
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--apple-accent-blue), #30d5c8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: '700', color: '#fff', flexShrink: 0
            }}>
              {profile ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() : 'SA'}
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
