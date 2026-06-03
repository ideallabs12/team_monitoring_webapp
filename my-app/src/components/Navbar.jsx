import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Navbar({ user }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Close menu when navigation happens
  useEffect(() => {
    setIsOpen(false)
  }, [location])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  const navLinks = [
    { to: '/home', label: 'Home' },
    { to: '/team', label: 'Team' },
    { to: '/revenue', label: 'Revenue' },
    { to: '/dis', label: 'DIS' },
    { to: '/profile', label: 'Profile' }
  ]

  return (
    <nav className="apple-glass-nav" style={{ padding: '0 clamp(16px, 5%, 48px)' }}>
      <div style={{
        display: 'flex',
        height: '64px',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%'
      }}>
        {/* Branding on the left */}
        <Link to="/home" style={{ 
          fontWeight: '700', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          fontSize: '1.25rem',
          letterSpacing: '-0.02em',
          color: '#ffffff',
          textDecoration: 'none'
        }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'linear-gradient(135deg, #0071e3, #30d5c8)', boxShadow: '0 0 12px rgba(0, 113, 227, 0.6)' }}></div>
          <span style={{ 
            background: 'linear-gradient(to right, #ffffff, #86868b)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            iDEALAB
          </span>
        </Link>
        
        {user && (
          <>
            {/* Desktop Nav Links — hidden on mobile via CSS class */}
            <div className="apple-nav-desktop-links">
              {navLinks.map(link => (
                <Link 
                  key={link.to}
                  to={link.to} 
                  style={{ 
                    color: isActive(link.to) ? '#ffffff' : 'var(--apple-text-secondary)', 
                    fontWeight: '500', 
                    fontSize: '0.92rem', 
                    transition: 'color 0.25s var(--apple-ease)',
                    textDecoration: 'none',
                    position: 'relative',
                    padding: '8px 0'
                  }}
                >
                  {link.label}
                  {isActive(link.to) && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: 'var(--apple-accent)',
                      borderRadius: '1px',
                      boxShadow: '0 0 8px rgba(0, 113, 227, 0.4)'
                    }} />
                  )}
                </Link>
              ))}
              
              <div style={{ width: '1px', height: '16px', background: 'var(--apple-border)', margin: '0 4px' }}></div>
              
              <button 
                onClick={handleLogout} 
                className="apple-btn apple-btn-secondary" 
                style={{ padding: '6px 16px !important', fontSize: '0.85rem' }}
              >
                Logout
              </button>
            </div>

            {/* Mobile Hamburger Button — shown on mobile via CSS class */}
            <button 
              className={`apple-hamburger-btn apple-nav-mobile-toggle ${isOpen ? 'open' : ''}`}
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              <span></span>
              <span></span>
            </button>

            {/* Mobile Menu Drawer Overlay */}
            <div className={`apple-mobile-menu-drawer ${isOpen ? 'open' : ''}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
                {navLinks.map((link, idx) => (
                  <Link 
                    key={link.to}
                    to={link.to} 
                    className="apple-drawer-link"
                    style={{ 
                      color: isActive(link.to) ? '#ffffff' : 'var(--apple-text-secondary)',
                      transitionDelay: `${idx * 0.05}s`
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
                
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
