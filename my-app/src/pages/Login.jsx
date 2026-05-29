import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

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
        // Log in
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (error) throw error
        // On successful login, App.jsx handles the redirect automatically
      } else {
        // Sign up (Auto-login will trigger if Email Confirmations are turned OFF in Supabase)
        const { error } = await supabase.auth.signUp({
          email,
          password
        })
        if (error) throw error
        // App.jsx will automatically detect the new session and redirect to /complete-profile
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
    <div className="auth-container">
      <div className="auth-card">
        <h1>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
        <p>{isLogin ? 'Sign in to access your dashboard' : 'Sign up to get started'}</p>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.9rem' }}>{error}</div>}
        {message && <div style={{ color: '#4ade80', marginBottom: '16px', fontSize: '0.9rem' }}>{message}</div>}

        <form onSubmit={handleEmailAuth} style={{ textAlign: 'left', marginBottom: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(15, 23, 42, 0.5)',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(15, 23, 42, 0.5)',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
          </div>

          <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        {isLogin && (
          <div style={{ marginBottom: '20px', fontSize: '0.9rem' }}>
            <Link to="/forgot-password" style={{ color: 'var(--text-secondary)' }}>Forgot your password?</Link>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
          <span style={{ padding: '0 10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
        </div>

        <button onClick={handleGoogleLogin} className="google-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ marginTop: '20px', fontSize: '0.9rem' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }} 
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  )
}
