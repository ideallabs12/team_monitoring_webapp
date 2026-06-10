import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { ChevronDown } from 'lucide-react'

export default function Navbar({ user }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [profile, setProfile] = useState(null)
  const [othersOpen, setOthersOpen] = useState(false)
  const othersRef = useRef(null)
  const [teamHubOpen, setTeamHubOpen] = useState(false)
  const teamHubRef = useRef(null)

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('has_revenue_logging, has_dis_reporting, platform_role').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) setProfile(data)
        })
    }
  }, [user])

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  // Close menus on route change
  useEffect(() => {
    setIsOpen(false)
    setOthersOpen(false)
    setTeamHubOpen(false)
  }, [location])

  // Close Others dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (othersRef.current && !othersRef.current.contains(e.target)) {
        setOthersOpen(false)
      }
      if (teamHubRef.current && !teamHubRef.current.contains(e.target)) {
        setTeamHubOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path
  const isOthersActive = ['/revenue-history', '/milestones'].includes(location.pathname)
  const isTeamHubActive = ['/team-analytics', '/team-management'].includes(location.pathname)

  const navLinks = [
    { to: '/home', label: 'Home' },
    { to: '/team', label: 'Team' }
  ]
  if (profile?.has_revenue_logging !== false) navLinks.push({ to: '/revenue', label: 'Revenue' })
  if (profile?.has_dis_reporting !== false) navLinks.push({ to: '/dis', label: 'DIS' })

  navLinks.push({ to: '/profile', label: 'Profile' })

  // Sub-links under "Others" — easy to extend later
  const othersLinks = [
    { to: '/revenue-history', label: 'Revenue History', desc: 'Full contribution history & filters' },
    { to: '/milestones', label: 'Milestones', desc: 'All-time records & achievements' },
  ]
  if (profile?.platform_role === 'teamlead') {
    othersLinks.push({ to: '/leaderboard', label: 'Leaderboard', desc: 'Team performance rankings' })
  }

  const teamHubLinks = [
    { to: '/team-analytics', label: 'Team Analytics', desc: 'Charts & insights' },
    { to: '/team-management', label: 'Team Management', desc: 'Targets & DIS board' },
  ]

  const linkStyle = (active) => ({
    color: active ? '#ffffff' : 'var(--apple-text-secondary)',
    fontWeight: '500',
    fontSize: '0.92rem',
    transition: 'color 0.25s var(--apple-ease)',
    textDecoration: 'none',
    position: 'relative',
    padding: '8px 0'
  })

  const activeBar = (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: '2px', background: 'var(--apple-accent)',
      borderRadius: '1px', boxShadow: '0 0 8px rgba(0,113,227,0.4)'
    }} />
  )

  return (
    <nav className="apple-glass-nav" style={{ padding: '0 clamp(16px, 5%, 48px)' }}>
      <div style={{
        display: 'flex', height: '64px', alignItems: 'center',
        justifyContent: 'space-between', maxWidth: '1200px', margin: '0 auto', width: '100%'
      }}>
        {/* Brand */}
        <Link to="/home" style={{
          fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px',
          fontSize: '1.25rem', letterSpacing: '-0.02em', color: '#ffffff', textDecoration: 'none'
        }}>
          <img src="/favicon.svg" alt="All-Hands Logo" style={{ width: '28px', height: '28px' }} />
          <span style={{ background: 'linear-gradient(to right, #ffffff, #86868b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            All-Hands
          </span>
        </Link>

        {user && (
          <>
            {/* ── Desktop Nav ── */}
            <div className="apple-nav-desktop-links">
              {navLinks.map(link => (
                <Link key={link.to} to={link.to} style={linkStyle(isActive(link.to))}>
                  {link.label}
                  {isActive(link.to) && activeBar}
                </Link>
              ))}

              {profile?.platform_role === 'teamlead' && (
                <div
                  ref={teamHubRef}
                  style={{ position: 'relative' }}
                  onMouseEnter={() => setTeamHubOpen(true)}
                  onMouseLeave={() => setTeamHubOpen(false)}
                >
                  <button
                    onClick={() => setTeamHubOpen(v => !v)}
                    style={{
                      ...linkStyle(isTeamHubActive),
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                  >
                    Team Hub
                    <ChevronDown size={14} style={{ transition: 'transform 0.2s ease', transform: teamHubOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                    {isTeamHubActive && activeBar}
                  </button>

                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: '50%',
                    minWidth: '230px',
                    background: 'rgba(18,18,20,0.97)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid var(--apple-border)',
                    borderRadius: '14px',
                    padding: '8px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
                    opacity: teamHubOpen ? 1 : 0,
                    visibility: teamHubOpen ? 'visible' : 'hidden',
                    transform: teamHubOpen ? 'translateX(-50%) translateY(0px)' : 'translateX(-50%) translateY(-8px)',
                    transition: 'opacity 0.18s ease, transform 0.18s ease, visibility 0.18s ease',
                    zIndex: 200
                  }}>
                    <div style={{
                      position: 'absolute', top: '-5px', left: '50%',
                      width: '10px', height: '10px',
                      background: 'rgba(18,18,20,0.97)',
                      border: '1px solid var(--apple-border)',
                      borderRight: 'none', borderBottom: 'none',
                      transform: 'translateX(-50%) rotate(45deg)'
                    }} />

                    <div style={{ fontSize: '0.62rem', fontWeight: '800', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '6px 12px 6px' }}>
                      Team Hub
                    </div>

                    {teamHubLinks.map(link => (
                      <Link
                        key={link.to}
                        to={link.to}
                        style={{
                          display: 'block', padding: '10px 12px', borderRadius: '10px',
                          textDecoration: 'none',
                          background: isActive(link.to) ? 'rgba(0,113,227,0.12)' : 'transparent',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => { if (!isActive(link.to)) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                        onMouseLeave={e => { if (!isActive(link.to)) e.currentTarget.style.background = isActive(link.to) ? 'rgba(0,113,227,0.12)' : 'transparent' }}
                      >
                        <div style={{ fontSize: '0.88rem', fontWeight: '600', color: isActive(link.to) ? 'var(--apple-accent-blue)' : '#fff' }}>
                          {link.label}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>
                          {link.desc}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Others Dropdown */}
              <div
                ref={othersRef}
                style={{ position: 'relative' }}
                onMouseEnter={() => setOthersOpen(true)}
                onMouseLeave={() => setOthersOpen(false)}
              >
                <button
                  onClick={() => setOthersOpen(v => !v)}
                  style={{
                    ...linkStyle(isOthersActive),
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  Others
                  <ChevronDown size={14} style={{ transition: 'transform 0.2s ease', transform: othersOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                  {isOthersActive && activeBar}
                </button>

                {/* Dropdown panel */}
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: '50%',
                  minWidth: '230px',
                  background: 'rgba(18,18,20,0.97)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid var(--apple-border)',
                  borderRadius: '14px',
                  padding: '8px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
                  opacity: othersOpen ? 1 : 0,
                  visibility: othersOpen ? 'visible' : 'hidden',
                  transform: othersOpen ? 'translateX(-50%) translateY(0px)' : 'translateX(-50%) translateY(-8px)',
                  transition: 'opacity 0.18s ease, transform 0.18s ease, visibility 0.18s ease',
                  zIndex: 200
                }}>
                  {/* Caret */}
                  <div style={{
                    position: 'absolute', top: '-5px', left: '50%',
                    width: '10px', height: '10px',
                    background: 'rgba(18,18,20,0.97)',
                    border: '1px solid var(--apple-border)',
                    borderRight: 'none', borderBottom: 'none',
                    transform: 'translateX(-50%) rotate(45deg)'
                  }} />

                  <div style={{ fontSize: '0.62rem', fontWeight: '800', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '6px 12px 6px' }}>
                    Others
                  </div>

                  {othersLinks.map(link => (
                    <Link
                      key={link.to}
                      to={link.to}
                      style={{
                        display: 'block', padding: '10px 12px', borderRadius: '10px',
                        textDecoration: 'none',
                        background: isActive(link.to) ? 'rgba(0,113,227,0.12)' : 'transparent',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => { if (!isActive(link.to)) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                      onMouseLeave={e => { if (!isActive(link.to)) e.currentTarget.style.background = isActive(link.to) ? 'rgba(0,113,227,0.12)' : 'transparent' }}
                    >
                      <div style={{ fontSize: '0.88rem', fontWeight: '600', color: isActive(link.to) ? 'var(--apple-accent-blue)' : '#fff' }}>
                        {link.label}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>
                        {link.desc}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div style={{ width: '1px', height: '16px', background: 'var(--apple-border)', margin: '0 4px' }} />

              <button
                onClick={handleLogout}
                className="apple-btn apple-btn-secondary"
                style={{ padding: '6px 16px !important', fontSize: '0.85rem' }}
              >
                Logout
              </button>
            </div>

            {/* ── Mobile Hamburger ── */}
            <button
              className={`apple-hamburger-btn apple-nav-mobile-toggle ${isOpen ? 'open' : ''}`}
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              <span /><span />
            </button>

            {/* ── Mobile Drawer ── */}
            <div className={`apple-mobile-menu-drawer ${isOpen ? 'open' : ''}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
                {navLinks.map((link, idx) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="apple-drawer-link"
                    style={{ color: isActive(link.to) ? '#ffffff' : 'var(--apple-text-secondary)', transitionDelay: `${idx * 0.05}s` }}
                  >
                    {link.label}
                  </Link>
                ))}

                {profile?.platform_role === 'teamlead' && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--apple-border)' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: '800', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', paddingLeft: '2px' }}>
                      Team Hub
                    </div>
                    {teamHubLinks.map((link, idx) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="apple-drawer-link"
                        style={{ color: isActive(link.to) ? '#ffffff' : 'var(--apple-text-secondary)', transitionDelay: `${(navLinks.length + idx) * 0.05}s` }}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Others in mobile */}
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--apple-border)' }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: '800', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', paddingLeft: '2px' }}>
                    Others
                  </div>
                  {othersLinks.map((link, idx) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="apple-drawer-link"
                      style={{ color: isActive(link.to) ? '#ffffff' : 'var(--apple-text-secondary)', transitionDelay: `${(navLinks.length + idx) * 0.05}s` }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                <button
                  onClick={handleLogout}
                  className="apple-btn apple-btn-danger"
                  style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '24px', borderRadius: '28px' }}
                >
                  Logout
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </nav>
  )
}
