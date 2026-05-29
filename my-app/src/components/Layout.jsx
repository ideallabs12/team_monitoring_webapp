import { Outlet, Navigate } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout({ user }) {
  if (!user) {
    return <Navigate to="/" replace />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar user={user} />
      <main className="admin-content-area" style={{ flex: 1, padding: '40px 5%', maxWidth: '1200px', margin: '0 auto', width: '100%', animation: 'fadeIn 0.3s ease-in-out' }}>
        <Outlet />
      </main>
    </div>
  )
}
