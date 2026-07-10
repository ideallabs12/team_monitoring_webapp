import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { BarChart3, Building2, ShieldCheck, UsersRound } from 'lucide-react'
import { supabase } from '../../supabaseClient'

export default function Login({ user, isAdmin }) {
  const navigate = useNavigate()

  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user) {
      navigate(isAdmin ? '/admin/home' : '/home')
    }
  }, [user, isAdmin, navigate])

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })
  }

  return (
    <div className="auth-container login-auth-container">
      <section className="auth-identity" aria-label="Company application overview">
        <div className="auth-brand-mark" style={{ width: '90px', height: '90px', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="./allhands_logo_cropped.png" alt="All-Hands Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>

        <div>
          <p className="auth-kicker">Internal Operations Portal</p>
          <h1>All-Hands Team Monitoring</h1>
          <p className="auth-copy">
            One workspace for admins, team leads, and employees to track revenue, team activity,
            daily reporting, and operational performance.
          </p>
        </div>

        <div className="auth-feature-grid">
          <div className="auth-feature">
            <ShieldCheck size={20} />
            <span>Role-based secure access</span>
          </div>
          <div className="auth-feature">
            <UsersRound size={20} />
            <span>Employee and team visibility</span>
          </div>
          <div className="auth-feature">
            <BarChart3 size={20} />
            <span>Revenue and DIS tracking</span>
          </div>
        </div>

        <div className="auth-status-panel">
          <div>
            <span className="auth-status-label">Workspace</span>
            <strong>Admin + Employee</strong>
          </div>
          <div>
            <span className="auth-status-label">Access</span>
            <strong>Company Accounts</strong>
          </div>
        </div>
      </section>

      <div className="auth-card">
        <div className="auth-card-header">
          <span className="auth-card-badge">Secure sign in</span>
          <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p>{isLogin ? 'Sign in to continue to your dashboard' : 'Create your employee profile to get started'}</p>
        </div>

        {error && <div className="auth-alert auth-alert-error">{error}</div>}
        {message && <div className="auth-alert auth-alert-success">{message}</div>}

        <form onSubmit={handleEmailAuth} className="auth-form">
          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Password"
            />
          </div>

          <button type="submit" className="btn auth-submit" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        {isLogin && (
          <div className="auth-forgot">
            <Link to="/forgot-password">Forgot your password?</Link>
          </div>
        )}

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <button onClick={handleGoogleLogin} className="google-btn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        <p className="auth-switch">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); setMessage('') }}>
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  )
}
