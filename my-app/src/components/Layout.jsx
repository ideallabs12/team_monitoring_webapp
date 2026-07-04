import { useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Navbar from './Navbar'
import UserSidebarLayout from './UserSidebarLayout'

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

export default function Layout({ user, isDeactivated, featureAccess }) {
  const [navPref, setNavPref] = useState(null) // 'navbar' or 'sidebar'
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('nav_preference').eq('id', user.id).single()
        .then(({ data }) => {
          setNavPref(data?.nav_preference || 'navbar')
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [user])

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>Loading layout...</div>
  }

  // Sidebar Layout Mode (Force sidebar on mobile)
  if (isMobile || navPref === 'sidebar') {
    return <UserSidebarLayout user={user} isDeactivated={isDeactivated} featureAccess={featureAccess} RestrictedAccessView={RestrictedAccessView} />
  }

  // Default Top Navbar Layout Mode

  return (
    <div className="apple-theme-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar user={user} />
      <main style={{ 
        flex: 1, 
        minWidth: 0,
        padding: 'clamp(20px, 4vw, 40px) clamp(16px, 5%, 48px)', 
        maxWidth: '1200px', 
        margin: '0 auto', 
        width: '100%', 
        boxSizing: 'border-box',
        animation: 'fadeIn 0.3s var(--apple-ease)' 
      }}>
        {isDeactivated ? <RestrictedAccessView /> : <Outlet context={{ featureAccess }} />}
      </main>
    </div>
  )
}
