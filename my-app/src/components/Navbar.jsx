import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Navbar({ user }) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav style={{
      display: 'flex',
      padding: '20px 5%',
      background: 'rgba(15, 23, 42, 0.95)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
    }}>
      {/* Branding on the left */}
      <div style={{ fontWeight: 'bold', marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.4rem' }}>
        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 20px #3b82f6' }}></div>
        <span style={{ background: 'linear-gradient(to right, #3b82f6, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          IdealLabs Profile
        </span>
      </div>
      
      {user && (
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <Link 
            to="/home" 
            style={{ color: isActive('/home') ? '#fff' : 'var(--text-secondary)', fontWeight: 'bold', fontSize: '1.1rem', transition: 'color 0.2s' }}
          >
            Home
          </Link>
          <Link 
            to="/team" 
            style={{ color: isActive('/team') ? '#fff' : 'var(--text-secondary)', fontWeight: 'bold', fontSize: '1.1rem', transition: 'color 0.2s' }}
          >
            Team
          </Link>
          <Link 
            to="/revenue" 
            style={{ color: isActive('/revenue') ? '#fff' : 'var(--text-secondary)', fontWeight: 'bold', fontSize: '1.1rem', transition: 'color 0.2s' }}
          >
            Revenue
          </Link>
          <Link 
            to="/dis" 
            style={{ color: isActive('/dis') ? '#fff' : 'var(--text-secondary)', fontWeight: 'bold', fontSize: '1.1rem', transition: 'color 0.2s' }}
          >
            DIS
          </Link>
          <Link 
            to="/profile" 
            style={{ color: isActive('/profile') ? '#fff' : 'var(--text-secondary)', fontWeight: 'bold', fontSize: '1.1rem', transition: 'color 0.2s' }}
          >
            Profile
          </Link>
          
          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 8px' }}></div>
          
          <button onClick={handleLogout} className="btn btn-danger" style={{ padding: '10px 24px', fontSize: '1rem' }}>
            Logout
          </button>
        </div>
      )}
    </nav>
  )
}
