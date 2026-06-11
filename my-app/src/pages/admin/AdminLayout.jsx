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
  Crown
} from 'lucide-react'

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
        <h2 style={{ marginBottom: '12px', color: '#fff' }}>Access Restricted</h2>
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
      <div className="admin-sidebar-brand">
        <div className="admin-sidebar-brand-icon">
          <img src="/favicon.svg" alt="All-Hands Logo" style={{ width: '20px', height: '20px' }} />
        </div>
        <span className="admin-sidebar-brand-name">All-Hands</span>
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
        <div className="admin-mobile-topbar">
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

        <main className="admin-content">
          {isDeactivated ? <RestrictedAccessView /> : <Outlet />}
        </main>
      </div>
    </div>
  )
}
