import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { SpeedInsights } from "@vercel/speed-insights/react"

// Components
import Layout from './components/Layout'
import Login from './pages/Login'
import UserHome from './pages/user/UserHome'
import UserTeam from './pages/user/UserTeam'
import UserRevenue from './pages/user/UserRevenue'
import UserDis from './pages/user/UserDis'
import CompleteProfile from './pages/CompleteProfile'
import ProfileSettings from './pages/ProfileSettings'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

// Admin Components
import AdminLayout from './pages/admin/AdminLayout'
import AdminHome from './pages/admin/AdminHome'
import AdminTeams from './pages/admin/AdminTeams'
import AdminRevenue from './pages/admin/AdminRevenue'
import AdminDis from './pages/admin/AdminDis'
import AdminSettings from './pages/admin/AdminSettings'
import AdminUsers from './pages/admin/AdminUsers'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminAuditLogs from './pages/admin/AdminAuditLogs'

function App() {
  const [user, setUser] = useState(null)
  const [hasProfile, setHasProfile] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDeactivated, setIsDeactivated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Error getting session:", error)
        setLoading(false)
        return
      }
      handleSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSession = async (session) => {
    try {
      setLoading(true)
      const currentUser = session?.user ?? null
      setUser(currentUser)
      
      if (currentUser) {
        setHasProfile(null)
        await checkProfile(currentUser.id)
      } else {
        setHasProfile(false)
        setLoading(false)
      }
    } catch (err) {
      console.error("Session handler error:", err)
      setLoading(false)
    }
  }

  const checkProfile = async (userId) => {
    try {
      let data = null
      
      // Try to select including is_deactivated
      const res = await supabase
        .from('profiles')
        .select('first_name, profile_completed, platform_role, is_deactivated')
        .eq('id', userId)
        .maybeSingle()
      
      if (res.error) {
        // Fallback in case is_deactivated column is not migrated yet
        const fallbackRes = await supabase
          .from('profiles')
          .select('first_name, profile_completed, platform_role')
          .eq('id', userId)
          .maybeSingle()
        if (fallbackRes.error) throw fallbackRes.error
        data = fallbackRes.data
      } else {
        data = res.data
      }

      if (data) {
        if (data.is_deactivated === true) {
          setIsDeactivated(true)
        } else {
          setIsDeactivated(false)
        }
        
        if (data.platform_role === 'admin') {
          setIsAdmin(true)
          setHasProfile(true)
        } else {
          setIsAdmin(false)
          const completed = !!data.first_name || data.profile_completed === true
          setHasProfile(completed)
        }
      } else {
        // No profile row found — check auth user_metadata as fallback
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser?.user_metadata?.profile_completed === true) {
          setHasProfile(true)
        } else {
          setHasProfile(false)
        }
        setIsDeactivated(false)
        setIsAdmin(false)
      }
    } catch (err) {
      console.error("Profile check error:", err)
      setHasProfile(false)
      setIsDeactivated(false)
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }

  const handleProfileCompleted = () => {
    setHasProfile(true)
    setIsAdmin(false)
  }

  if (loading || (user && hasProfile === null)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>
        Loading...
      </div>
    )
  }

  if (user && isDeactivated) {
    return (
      <div className="apple-theme-wrapper" style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#000',
        color: '#fff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{
          background: '#161617',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          padding: '40px',
          maxWidth: '480px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.5s ease-out'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(255, 69, 58, 0.1)',
            border: '1px solid rgba(255, 69, 58, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '2rem'
          }}>
            🚫
          </div>
          <h1 style={{
            fontSize: '1.8rem',
            fontWeight: '700',
            marginBottom: '12px',
            letterSpacing: '-0.02em',
            color: '#fff'
          }}>Access Blocked</h1>
          <p style={{
            color: '#86868b',
            lineHeight: '1.5',
            fontSize: '0.95rem',
            marginBottom: '32px'
          }}>
            Your access to this portal has been deactivated by an administrator. You do not have permission to view this content or perform other actions.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              setUser(null)
              setIsDeactivated(false)
            }}
            className="apple-btn apple-btn-primary"
            style={{ width: '100%', padding: '14px', borderRadius: '14px' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login user={user} isAdmin={isAdmin} />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route 
          path="/complete-profile" 
          element={
            user && !isAdmin
              ? (hasProfile ? <Navigate to="/home" replace /> : <CompleteProfile user={user} onComplete={handleProfileCompleted} />)
              : <Navigate to="/" replace />
          } 
        />

        {/* Regular User Routes */}
        <Route element={<Layout user={user} />}>
          <Route 
            path="/home" 
            element={
              hasProfile && !isAdmin ? <UserHome user={user} /> : <Navigate to="/complete-profile" replace />
            } 
          />
          <Route 
            path="/team" 
            element={
              hasProfile && !isAdmin ? <UserTeam user={user} /> : <Navigate to="/complete-profile" replace />
            } 
          />
          <Route 
            path="/revenue" 
            element={
              hasProfile && !isAdmin ? <UserRevenue user={user} /> : <Navigate to="/complete-profile" replace />
            } 
          />
          <Route 
            path="/dis" 
            element={
              hasProfile && !isAdmin ? <UserDis /> : <Navigate to="/complete-profile" replace />
            } 
          />
          <Route 
            path="/profile" 
            element={
              hasProfile && !isAdmin ? <ProfileSettings user={user} /> : <Navigate to="/complete-profile" replace />
            } 
          />
        </Route>

        {/* Admin Routes - Bypasses standard Layout and uses AdminLayout exclusively */}
        <Route 
          path="/admin" 
          element={
            isAdmin ? <AdminLayout user={user} /> : <Navigate to="/" replace />
          }
        >
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<AdminHome />} />
          <Route path="teams" element={<AdminTeams />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="revenue" element={<AdminRevenue />} />
          <Route path="dis" element={<AdminDis />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="auditlogs" element={<AdminAuditLogs />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<Navigate to={user ? (isAdmin ? "/admin/home" : (hasProfile ? "/home" : "/complete-profile")) : "/"} replace />} />
      </Routes>
    </Router>
  )
}

export default App
