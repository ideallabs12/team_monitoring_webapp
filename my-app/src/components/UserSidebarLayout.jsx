import { useState, useEffect } from 'react'
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
  User as UserIcon,
  MapPin,
  Megaphone
} from 'lucide-react'

export default function UserSidebarLayout({ user, isDeactivated, featureAccess, RestrictedAccessView }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('profiles')
      .select('first_name, last_name, platform_role, has_revenue_logging, is_sales_executive')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setProfile(data) })

    // Fetch unread announcements count
    const fetchUnread = async () => {
      const { data: announcements } = await supabase.from('announcements').select('id').eq('status', 'published')
      if (announcements) {
        const { data: views } = await supabase.from('announcement_views').select('announcement_id').eq('user_id', user.id)
        if (views) {
          const viewedIds = views.map(v => v.announcement_id)
          const unread = announcements.filter(a => !viewedIds.includes(a.id)).length
          setUnreadCount(unread)
        }
      }
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

    return () => {
      supabase.removeChannel(annChannel)
      supabase.removeChannel(viewsChannel)
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

  // Build nav links based on profile
  const navLinks = [
    { path: '/home', label: 'Home', icon: Home },
  ]
  
  if (user?.email === 'user1@gmail.com') {
    navLinks.push({ path: '/announcements', label: 'Announcements', icon: Megaphone, badge: unreadCount })
  }
  
  navLinks.push({ path: '/team', label: 'Team', icon: Users })
  
  if (profile?.has_revenue_logging !== false) {
    navLinks.push({ path: '/revenue', label: 'Revenue', icon: DollarSign })
  }
  navLinks.push({ path: '/dis', label: 'My DIS', icon: FileText })
  navLinks.push({ path: '/profile', label: 'Profile', icon: UserIcon })
  navLinks.push({ path: '/settings', label: 'Settings', icon: SettingsIcon })

  const isWhitelisted = user?.email === 'signatureglobalconferences@gmail.com' || !!featureAccess?.attendance
  if (isWhitelisted) {
    navLinks.push({ path: '/attendance', label: 'Attendance', icon: MapPin })
  }

  const othersLinks = [
    { path: '/revenue-history', label: 'Revenue History', icon: History },
    { path: '/reviews', label: 'Reviews', icon: Star },
  ]
  
  if (profile?.platform_role?.toLowerCase() === 'teamlead') {
    othersLinks.push({ path: '/leaderboard', label: 'Leaderboard', icon: Trophy })
  }
  if (profile?.is_sales_executive) {
    othersLinks.push({ path: '/sales-analytics', label: 'Sales Exec', icon: PhoneCall })
  }

  navLinks.push(...othersLinks)

  const teamHubLinks = profile?.platform_role?.toLowerCase() === 'teamlead' ? [
    { path: '/team-analytics', label: 'Team Analytics', icon: TrendingUp },
    { path: '/team-management', label: 'Team Mgmt', icon: Users },
    { path: '/team-dis-report', label: 'Team DIS', icon: FileText },
  ] : []

  const SidebarContent = ({ isMobileView }) => {
    const collapsed = isMobileView ? false : isCollapsed

    return (
      <div className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
        {/* ── Brand ── */}
        <div className="admin-sidebar-brand" style={{
          display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
          padding: collapsed ? '18px 0' : '18px 16px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid var(--apple-border)',
          marginBottom: '8px', minHeight: '62px'
        }}>
          <button
            className="admin-menu-toggle-btn"
            onClick={() => {
              if (isMobileView) setSidebarOpen(false)
              else setIsCollapsed(!isCollapsed)
            }}
            style={{
              background: 'transparent', border: 'none', color: 'var(--apple-text-secondary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '6px', borderRadius: '8px', flexShrink: 0,
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'var(--apple-text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--apple-text-secondary)' }}
          >
            {isMobileView ? <X size={20} /> : <Menu size={20} />}
          </button>

          {!collapsed && (
            <>
              <span className="admin-sidebar-brand-name" style={{ flex: 1, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>All-Hands</span>
              <div className="admin-sidebar-brand-icon" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                <img src="/favicon.svg" alt="Logo" style={{ width: '20px', height: '20px' }} />
              </div>
            </>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className="admin-sidebar-nav" style={{ padding: collapsed ? '0 8px' : '0 10px', overflowY: 'auto', flex: 1 }}>
          <div style={{ marginBottom: '16px' }}>
            {navLinks.map(({ path, label, icon: Icon }) => {
              const active = isActive(path)
              return (
                <Link
                  key={path} to={path}
                  className={`admin-sidebar-link${active ? ' active' : ''}`}
                  title={collapsed ? label : ''}
                  onClick={() => { if (window.innerWidth <= 768 || isMobileView) setSidebarOpen(false) }}
                  style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '12px 0' : '9px 12px' }}
                >
                  <div style={{ position: 'relative' }}>
                    <Icon size={collapsed ? 22 : 18} strokeWidth={active ? 2.5 : 2} />
                    {navLinks.find(n => n.path === path)?.badge > 0 && (
                      <span style={{
                        position: 'absolute', top: '-4px', right: '-4px',
                        background: 'var(--apple-accent-red)', color: '#fff',
                        fontSize: '0.6rem', fontWeight: 'bold', width: '14px', height: '14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '50%', border: '2px solid var(--apple-bg)'
                      }}>
                        {navLinks.find(n => n.path === path)?.badge}
                      </span>
                    )}
                  </div>
                  {!collapsed && <span>{label}</span>}
                  {!collapsed && navLinks.find(n => n.path === path)?.badge > 0 && (
                    <span style={{
                      marginLeft: 'auto', background: 'var(--apple-accent-red)', color: '#fff',
                      fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '10px'
                    }}>
                      {navLinks.find(n => n.path === path)?.badge} New
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          {teamHubLinks.length > 0 && (
            <div style={{ marginBottom: '16px', borderTop: '1px solid var(--apple-border)', paddingTop: '16px' }}>
              {!collapsed && <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', paddingLeft: '12px' }}>Team Hub</div>}
              {teamHubLinks.map(({ path, label, icon: Icon }) => {
                const active = isActive(path)
                return (
                  <Link
                    key={path} to={path}
                    className={`admin-sidebar-link${active ? ' active' : ''}`}
                    title={collapsed ? label : ''}
                    onClick={() => { if (window.innerWidth <= 768 || isMobileView) setSidebarOpen(false) }}
                    style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '12px 0' : '9px 12px' }}
                  >
                    <Icon size={collapsed ? 22 : 18} strokeWidth={active ? 2.5 : 2} />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                )
              })}
            </div>
          )}


        </nav>

        {/* ── Bottom: Profile + Sign Out ── */}
        <div className="admin-sidebar-bottom" style={{ padding: collapsed ? '16px 8px 20px' : '16px 10px 20px', borderTop: '1px solid var(--apple-border)' }}>
          {!collapsed ? (
            <div className="admin-sidebar-profile">
              <div className="admin-sidebar-avatar">{initials}</div>
              <div className="admin-sidebar-profile-info">
                <span className="admin-sidebar-profile-name">{fullName}</span>
                <span className="admin-sidebar-role-badge">{profile?.platform_role === 'teamlead' ? 'Team Lead' : 'User'}</span>
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
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          style={{ zIndex: 150 }}
        />
      )}

      <div className={`admin-sidebar-wrapper ${isCollapsed ? 'collapsed' : ''}`}>
        <SidebarContent isMobileView={false} />
      </div>

      <div
        className={`admin-sidebar-mobile${sidebarOpen ? ' open' : ''}`}
        style={{ zIndex: 200 }}
      >
        <SidebarContent isMobileView={true} />
      </div>

      <div className="admin-main">
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
              All-Hands
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

        <main className="admin-content" style={{ animation: 'fadeIn 0.3s var(--apple-ease)' }}>
          {isDeactivated ? <RestrictedAccessView /> : <Outlet context={{ featureAccess }} />}
        </main>
      </div>
    </div>
  )
}
