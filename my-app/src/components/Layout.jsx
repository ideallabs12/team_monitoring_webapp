import { Outlet, Navigate } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout({ user }) {
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
        <Outlet />
      </main>
    </div>
  )
}
