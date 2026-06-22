import { useEffect, useState, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { SpeedInsights } from "@vercel/speed-insights/react"

// Components
import Layout from './components/Layout'
import MaintenanceScreen from './components/MaintenanceScreen'
import PageTracker from './components/PageTracker'
import Login from './pages/homeprofile/Login'
import UserHome from './pages/user/UserHome'
import UserTeam from './pages/user/UserTeam'
import UserRevenue from './pages/user/UserRevenue'
import UserHistoricalRevenue from './pages/user/UserHistoricalRevenue'
import RevenueHistory from './pages/user/RevenueHistory'
import UserDis from './pages/user/UserDis'
import TeamAnalytics from './pages/user/TeamAnalytics'
import TeamManagement from './pages/user/TeamManagement'
import CompleteProfile from './pages/homeprofile/CompleteProfile'
import ProfileSettings from './pages/homeprofile/ProfileSettings'
import ForgotPassword from './pages/homeprofile/ForgotPassword'
import ResetPassword from './pages/homeprofile/ResetPassword'
import Leaderboard from './pages/user/Leaderboard'
import Milestones from './pages/user/Milestones'
import TeamDisReport from './pages/user/TeamDisReport'
import SalesExecutive from './pages/user/SalesExecutive'
import UserReviews from './pages/user/UserReviews'

// Admin Components
import AdminLayout from './pages/admin/AdminLayout'
import AdminHome from './pages/admin/AdminHome'
import AdminTeams from './pages/admin/AdminTeams'
import AdminRevenue from './pages/admin/AdminRevenue'
import AdminDis from './pages/admin/AdminDis'
import AdminSettings from './pages/admin/AdminSettings'
import AdminUsers from './pages/admin/AdminUsers'
import AdminUserControlPanel from './pages/admin/AdminUserControlPanel'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminAuditLogs from './pages/admin/AdminAuditLogs'
import AdminEvents from './pages/admin/AdminEvents'
import AdminReviews from './pages/admin/AdminReviews'
import { PresenceProvider } from './components/PresenceProvider'

function App() {
  const [user, setUser] = useState(null)
  const [hasProfile, setHasProfile] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDeactivated, setIsDeactivated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [systemSettings, setSystemSettings] = useState({ maintenance_mode: false, show_leaderboard: true })

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

    const fetchSettings = async () => {
      const { data } = await supabase.from('system_settings').select('*').eq('id', 1).maybeSingle()
      if (data) setSystemSettings(data)
    }
    fetchSettings()

    const channel = supabase.channel('system_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, payload => {
        setSystemSettings(payload.new)
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
      supabase.removeChannel(channel)
    }
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

      // Mark user as being fetched immediately to prevent race conditions
      // (e.g., getSession and onAuthStateChange firing simultaneously)
      profileFetchedFor.current = currentUser.id

      // New user — do full check
      setLoading(true)
      setUser(currentUser)
      setHasProfile(null)
      await checkProfile(currentUser)

    } catch (err) {
      console.error("Session handler error:", err)
      setLoading(false)
    }
  }

  const checkProfile = async (currentUser) => {
    const userId = currentUser.id
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

        const deviceInfo = (() => {
          const ua = navigator.userAgent
          if (/Windows/i.test(ua)) return 'Windows'
          if (/Mac/i.test(ua)) return 'Mac'
          if (/iPhone/i.test(ua)) return 'iPhone'
          if (/iPad/i.test(ua)) return 'iPad'
          if (/Android/i.test(ua)) return 'Android'
          if (/Linux/i.test(ua)) return 'Linux'
          return 'Unknown Device'
        })();

        if (data.platform_role === 'admin') {
          setIsAdmin(true)
          setHasProfile(true)
          supabase.from('audit_logs').insert({
            user_id: userId,
            action_type: 'admin_activity',
            details: { description: 'Admin logged in', email: currentUser.email, device: deviceInfo }
          }).then()
        } else {
          setIsAdmin(false)
          const completed = !!data.first_name || data.profile_completed === true
          setHasProfile(completed)
          supabase.from('audit_logs').insert({
            user_id: userId,
            action_type: 'login',
            details: { email: currentUser.email, device: deviceInfo }
          }).then()
        }
      } else {
        // No profile row — check auth metadata as fallback
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        
        // If there's an auth error (e.g. user deleted in backend but session exists locally), sign them out
        if (authError || !authUser) {
          console.warn("User auth invalid (likely deleted). Signing out...")
          await supabase.auth.signOut()
          setUser(null)
          setHasProfile(false)
          setIsDeactivated(false)
          setIsAdmin(false)
          return
        }

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

  // Handle Maintenance Mode
  // If the user is logged in but is NOT an admin, block them with the maintenance screen.
  // Unauthenticated users (user === null) will see the login screen, allowing admins to log in.
  if (systemSettings.maintenance_mode && user && !isAdmin) {
    return <MaintenanceScreen />
  }


  return (
    <PresenceProvider user={user}>
      <Router>
        <PageTracker user={user} />
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
          <Route path="/historical-revenue" element={hasProfile && !isAdmin ? <UserHistoricalRevenue user={user} /> : <Navigate to="/complete-profile" replace />} />
          <Route path="/revenue-history" element={hasProfile && !isAdmin ? <RevenueHistory user={user} /> : <Navigate to="/complete-profile" replace />} />
          <Route path="/dis" element={hasProfile && !isAdmin ? <UserDis /> : <Navigate to="/complete-profile" replace />} />
          <Route path="/team-analytics" element={hasProfile && !isAdmin ? <TeamAnalytics user={user} /> : <Navigate to="/complete-profile" replace />} />
          <Route path="/team-management" element={hasProfile && !isAdmin ? <TeamManagement user={user} /> : <Navigate to="/complete-profile" replace />} />
          <Route path="/team-dis-report" element={hasProfile && !isAdmin ? <TeamDisReport user={user} /> : <Navigate to="/complete-profile" replace />} />
          <Route path="/leaderboard" element={hasProfile && !isAdmin ? (systemSettings.show_leaderboard ? <Leaderboard user={user} /> : <Navigate to="/home" replace />) : <Navigate to="/complete-profile" replace />} />
          <Route path="/milestones" element={hasProfile && !isAdmin ? <Milestones user={user} /> : <Navigate to="/complete-profile" replace />} />
          <Route path="/sales-analytics" element={hasProfile && !isAdmin ? <SalesExecutive user={user} /> : <Navigate to="/complete-profile" replace />} />
          <Route path="/reviews" element={hasProfile && !isAdmin ? <UserReviews user={user} /> : <Navigate to="/complete-profile" replace />} />
          <Route path="/profile" element={hasProfile && !isAdmin ? <ProfileSettings user={user} /> : <Navigate to="/complete-profile" replace />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={isAdmin ? <AdminLayout user={user} isDeactivated={isDeactivated} /> : <Navigate to="/" replace />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<AdminHome />} />
          <Route path="teams" element={<AdminTeams />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:id" element={<AdminUserControlPanel />} />
          <Route path="revenue" element={<AdminRevenue />} />
          <Route path="dis" element={<AdminDis />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="milestones" element={<Milestones user={user} />} />
          <Route path="leaderboard" element={<Leaderboard user={user} />} />
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
    </PresenceProvider>
  )
}

export default App