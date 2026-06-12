import { useState, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import {
  LayoutDashboard,
  Users,
  UsersRound,
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
  Sun,
  Moon
} from 'lucide-react'
import { getSystemTheme, setSystemTheme } from '../../utils/themeHelper'

const NAV_ITEMS = [
  { path: '/admin/home',      label: 'Dashboard',   icon: LayoutDashboard },
  { path: '/admin/teams',     label: 'Teams',       icon: UsersRound },
  { path: '/admin/users',     label: 'Users',       icon: Users },
  { path: '/admin/dis',       label: 'DIS Reports', icon: FileText },
  { path: '/admin/revenue',   label: 'Revenue',     icon: DollarSign },
  { path: '/admin/analytics', label: 'Analytics',   icon: TrendingUp },
  { path: '/admin/leaderboard', label: 'Leaderboard', icon: Trophy },
  { path: '/admin/milestones', label: 'Milestones',  icon: Crown },
  { path: '/admin/auditlogs', label: 'Audit Logs',  icon: ClipboardList },
  { path: '/admin/settings',  label: 'Settings',    icon: Settings },
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

export default function AdminLayout({ user, isDeactivated }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState(getSystemTheme)

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(getSystemTheme())
    }
    window.addEventListener('theme-change', handleThemeChange)
    
    // Light mode only works for signatureglobalconferences@gmail.com in admins
    const isAllowedAdmin = user?.email === 'signatureglobalconferences@gmail.com'
    const activeTheme = isAllowedAdmin ? theme : 'dark'
    document.documentElement.setAttribute('data-theme', activeTheme)
    
    return () => window.removeEventListener('theme-change', handleThemeChange)
  }, [theme, user])

  const toggleTheme = () => {
    if (user?.email !== 'signatureglobalconferences@gmail.com') {
      return
    }
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setSystemTheme(nextTheme)
  }

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

  const SidebarContent = () => (
    <div className="admin-sidebar">
      {/* ── Brand ── */}
      <div className="admin-sidebar-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="admin-sidebar-brand-icon">
            <img src="/favicon.svg" alt="All-Hands Logo" style={{ width: '20px', height: '20px' }} />
          </div>
          <span className="admin-sidebar-brand-name">All-Hands</span>
        </div>
        <button
          onClick={toggleTheme}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--apple-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            borderRadius: '50%',
            transition: 'background 0.2s, color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="admin-sidebar-nav">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const active = isActive(path)
          return (
            <Link
              key={path}
              to={path}
              className={`admin-sidebar-link${active ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── Bottom: Profile + Sign Out ── */}
      <div className="admin-sidebar-bottom">
        <div className="admin-sidebar-profile">
          <div className="admin-sidebar-avatar">{initials}</div>
          <div className="admin-sidebar-profile-info">
            <span className="admin-sidebar-profile-name">{fullName}</span>
            <span className="admin-sidebar-role-badge">Admin</span>
          </div>
        </div>

        <button className="admin-sidebar-signout" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  )

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
      <div className="admin-sidebar-wrapper">
        <SidebarContent />
      </div>

      {/* ── Mobile Sidebar ── */}
      <div className={`admin-sidebar-mobile${sidebarOpen ? ' open' : ''}`}>
        <SidebarContent />
      </div>

      {/* ── Main Content ── */}
      <div className="admin-main">
        {/* Mobile top bar */}
        <div className="admin-mobile-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              className="admin-mobile-menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div className="admin-sidebar-brand-name" style={{ fontSize: '1rem' }}>
              All-Hands Admin
            </div>
          </div>
          <button
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--apple-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '50%',
              marginRight: '8px'
            }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <main className="admin-content">
          {isDeactivated ? <RestrictedAccessView /> : <Outlet />}
        </main>
      </div>
    </div>
  )
}
