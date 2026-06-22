import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { LayoutPanelTop, PanelLeft, CheckCircle2, Loader2 } from 'lucide-react'

export default function UserSettings({ user }) {
  const [preference, setPreference] = useState('navbar')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('nav_preference').eq('id', user.id).single()
        .then(({ data }) => {
          if (data && data.nav_preference) {
            setPreference(data.nav_preference)
          }
          setLoading(false)
        })
    }
  }, [user])

  const handleSelectPreference = async (pref) => {
    if (pref === preference) return
    setSaving(true)
    setSuccess(false)
    
    // Slight delay for animation
    await new Promise(r => setTimeout(r, 800))

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nav_preference: pref })
        .eq('id', user.id)

      if (error) throw error
      setPreference(pref)
      setSuccess(true)
      
      // We will trigger a full page reload to safely apply the new layout to Layout.jsx
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (err) {
      console.error(err)
      alert("Failed to save preference.")
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ color: 'var(--apple-text-secondary)', padding: '40px', textAlign: 'center' }}>Loading Settings...</div>
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      <div style={{ marginBottom: 'clamp(24px, 5vw, 40px)' }}>
        <div className="apple-kicker">Preferences</div>
        <h1 className="apple-title-large">System Settings</h1>
        <p className="apple-lead">
          Customize your workspace layout and navigation experience.
        </p>
      </div>

      <div className="apple-card">
        <h3 className="apple-title-small" style={{ marginBottom: '16px' }}>Navigation Layout</h3>
        <p style={{ color: 'var(--apple-text-secondary)', marginBottom: '24px', fontSize: '0.95rem' }}>
          Choose how you want to navigate the application. Your preference will be saved across devices.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {/* Top Navbar Option */}
          <div 
            onClick={() => !saving && handleSelectPreference('navbar')}
            style={{ 
              border: `2px solid ${preference === 'navbar' ? 'var(--apple-accent-blue)' : 'var(--apple-border)'}`,
              borderRadius: '16px',
              padding: '24px',
              background: preference === 'navbar' ? 'rgba(0,113,227,0.05)' : 'rgba(255,255,255,0.02)',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              position: 'relative',
              opacity: saving && preference !== 'navbar' ? 0.5 : 1
            }}
          >
            {preference === 'navbar' && (
              <div style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--apple-accent-blue)' }}>
                <CheckCircle2 size={24} />
              </div>
            )}
            <LayoutPanelTop size={40} style={{ color: preference === 'navbar' ? 'var(--apple-accent-blue)' : 'var(--apple-text-secondary)', marginBottom: '16px' }} />
            <h4 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '8px' }}>Top Navigation Bar</h4>
            <p style={{ color: 'var(--apple-text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              The default view. A streamlined horizontal navigation menu fixed at the top of the screen.
            </p>
          </div>

          {/* Sidebar Option */}
          <div 
            onClick={() => !saving && handleSelectPreference('sidebar')}
            style={{ 
              border: `2px solid ${preference === 'sidebar' ? 'var(--apple-accent-blue)' : 'var(--apple-border)'}`,
              borderRadius: '16px',
              padding: '24px',
              background: preference === 'sidebar' ? 'rgba(0,113,227,0.05)' : 'rgba(255,255,255,0.02)',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              position: 'relative',
              opacity: saving && preference !== 'sidebar' ? 0.5 : 1
            }}
          >
            {preference === 'sidebar' && (
              <div style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--apple-accent-blue)' }}>
                <CheckCircle2 size={24} />
              </div>
            )}
            <PanelLeft size={40} style={{ color: preference === 'sidebar' ? 'var(--apple-accent-blue)' : 'var(--apple-text-secondary)', marginBottom: '16px' }} />
            <h4 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '8px' }}>Collapsible Sidebar</h4>
            <p style={{ color: 'var(--apple-text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              A vertical navigation menu pinned to the left side of the screen. Ideal for desktop use.
            </p>
          </div>
        </div>

        {/* Action Status */}
        <div style={{ marginTop: '24px', minHeight: '30px', display: 'flex', alignItems: 'center' }}>
          {saving && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--apple-text-secondary)', fontSize: '0.9rem' }}>
              <Loader2 size={16} className="lucide-spin" style={{ animation: 'spin 1s linear infinite' }} />
              Applying layout changes...
            </div>
          )}
          {success && (
            <div style={{ color: 'var(--apple-accent-green)', fontSize: '0.9rem', fontWeight: '500', animation: 'fadeIn 0.3s ease' }}>
              Changes saved! Reloading application...
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
