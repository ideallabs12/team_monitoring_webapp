import { Outlet, Navigate } from 'react-router-dom'
import Navbar from './Navbar'

function RestrictedAccessView() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '60vh' }}>
      <div className="apple-card" style={{ maxWidth: '480px', textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🚫</div>
        <h2 style={{ marginBottom: '12px', color: '#fff' }}>Access Restricted</h2>
        <p style={{ color: 'var(--apple-text-secondary)', lineHeight: '1.5' }}>
          Your account is currently deactivated or pending approval. Please contact your system administrator to request access to the platform.
        </p>
      </div>
    </div>
  )
}

export default function Layout({ user, isDeactivated }) {
  if (!user) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="apple-theme-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar user={user} />
      <main style={{ 
        flex: 1, 
        padding: 'clamp(20px, 4vw, 40px) clamp(16px, 5%, 48px)', 
        maxWidth: '1200px', 
        margin: '0 auto', 
        width: '100%', 
        boxSizing: 'border-box',
        animation: 'fadeIn 0.3s var(--apple-ease)' 
      }}>
        {isDeactivated ? <RestrictedAccessView /> : <Outlet />}
      </main>
    </div>
  )
}
