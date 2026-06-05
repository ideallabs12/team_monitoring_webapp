import { useEffect, useState, useRef } from 'react'
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

  // Prevent duplicate profile checks
  const profileFetchedFor = useRef(null)

  useEffect(() => {
    // On mount — restore session from localStorage, no loading flash
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Error getting session:", error)
        setLoading(false)
        return
      }
      handleSession(session, 'INITIAL_SESSION')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // If we already have this exact user loaded, ignore any event except SIGNED_OUT
      // This prevents the page from reloading/resetting state when switching tabs
      if (
        session?.user?.id &&
        profileFetchedFor.current === session.user.id &&
        event !== 'SIGNED_OUT'
      ) {
        return
      }

      handleSession(session, event)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSession = async (session, event) => {
    try {
      const currentUser = session?.user ?? null

      if (!currentUser) {
        // Only reset state if it's explicitly a sign out or initial empty session
        if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
          setUser(null)
          setHasProfile(false)
          setIsAdmin(false)
          setIsDeactivated(false)
          profileFetchedFor.current = null
          setLoading(false)
        }
        return
      }

      // Same user already checked — don't re-fetch, just ensure loading is off
      if (profileFetchedFor.current === currentUser.id) {
        setLoading(false)
        return
      }

      // New user — do full check
      setLoading(true)
      setUser(currentUser)
      setHasProfile(null)
      await checkProfile(currentUser.id)

    } catch (err) {
      console.error("Session handler error:", err)
      setLoading(false)
    }
  }

  const checkProfile = async (userId) => {
    try {
      let data = null

      const res = await supabase
        .from('profiles')
        .select('first_name, profile_completed, platform_role, is_deactivated')
        .eq('id', userId)
        .maybeSingle()

      if (res.error) {
        // Fallback if is_deactivated column not migrated yet
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
        // No profile row — check auth metadata as fallback
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser?.user_metadata?.profile_completed === true) {
          setHasProfile(true)
        } else {
          setHasProfile(false)
        }
        setIsDeactivated(false)
        setIsAdmin(false)
      }

      // Mark this user as fully loaded — prevents re-fetch on tab switch
      profileFetchedFor.current = userId

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
    setIsDeactivated(true)
  }

  if (loading || (user && hasProfile === null)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>
        Loading...
      </div>
    )
  }


  return (
    <Router>
      <SpeedInsights />
      <Routes>
        {/* Login/Auth Routes */}
        <Route
          path="/"
          element={
            user
              ? (isAdmin ? <Navigate to="/admin/home" replace /> : <Navigate to={hasProfile ? "/home" : "/complete-profile"} replace />)
              : <Login user={user} isAdmin={isAdmin} />
          }
        />
        <Route path="/forgot-password" element={user ? <Navigate to="/" replace /> : <ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Complete Profile */}
        <Route
          path="/complete-profile"
          element={
            !user ? <Navigate to="/" replace />
              : isAdmin ? <Navigate to="/admin/home" replace />
                : hasProfile === null ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>Loading...</div>
                  : hasProfile ? <Navigate to="/home" replace />
                    : <CompleteProfile user={user} onComplete={handleProfileCompleted} />
          }
        />

        {/* Regular User Routes */}
        <Route element={<Layout user={user} isDeactivated={isDeactivated} />}>
          <Route path="/home" element={hasProfile && !isAdmin ? <UserHome user={user} /> : <Navigate to="/complete-profile" replace />} />
          <Route path="/team" element={hasProfile && !isAdmin ? <UserTeam user={user} /> : <Navigate to="/complete-profile" replace />} />
          <Route path="/revenue" element={hasProfile && !isAdmin ? <UserRevenue user={user} /> : <Navigate to="/complete-profile" replace />} />
          <Route path="/dis" element={hasProfile && !isAdmin ? <UserDis /> : <Navigate to="/complete-profile" replace />} />
          <Route path="/profile" element={hasProfile && !isAdmin ? <ProfileSettings user={user} /> : <Navigate to="/complete-profile" replace />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={isAdmin ? <AdminLayout user={user} isDeactivated={isDeactivated} /> : <Navigate to="/" replace />}>
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

        <Route path="*" element={
          loading || (user && hasProfile === null)
            ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>Loading...</div>
            : <Navigate to={user ? (isAdmin ? "/admin/home" : (hasProfile ? "/home" : "/complete-profile")) : "/"} replace />
        } />
      </Routes>
    </Router>
  )
}

export default App