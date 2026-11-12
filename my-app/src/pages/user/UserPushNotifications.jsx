import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Send,
  ArrowLeft,
  ShieldCheck,
  Radio,
  Sparkles,
  Info
} from 'lucide-react'
import { supabase } from '../../supabaseClient'
import {
  isPushSupported,
  getNotificationPermission,
  detectDeviceType,
  getExistingSubscription,
  subscribeToPush,
  unsubscribeFromPush
} from '../../utils/pushNotificationHelper'

export default function UserPushNotifications({ user }) {
  const [supported, setSupported] = useState(true)
  const [devicePermission, setDevicePermission] = useState('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [deviceType, setDeviceType] = useState('desktop')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', text: '' })

  const isIOS = deviceType === 'ios'
  const isPWA = typeof window !== 'undefined' && (window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches)

  useEffect(() => {
    checkStatus()
  }, [user])

  async function checkStatus() {
    setLoading(true)
    try {
      const isSupp = isPushSupported()
      setSupported(isSupp)
      setDeviceType(detectDeviceType())
      setDevicePermission(getNotificationPermission())

      if (isSupp) {
        const sub = await getExistingSubscription()
        setIsSubscribed(!!sub)
      }
    } catch (err) {
      console.error('Error checking push status:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister() {
    setActionLoading(true)
    setFeedback({ type: '', text: '' })

    try {
      if (!isPushSupported()) {
        throw new Error('Push notifications are not supported on this browser or device.')
      }

      const res = await subscribeToPush(user)
      setIsSubscribed(true)
      setDevicePermission(Notification.permission)
      setFeedback({
        type: 'success',
        text: '🎉 Success! This device is now registered to receive push notifications.'
      })
    } catch (err) {
      console.error('Push register error:', err)
      setDevicePermission(getNotificationPermission())
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to register for push notifications. Please check your browser permission settings.'
      })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleUnsubscribe() {
    if (!window.confirm('Do you want to turn off push notifications on this device?')) return

    setActionLoading(true)
    setFeedback({ type: '', text: '' })

    try {
      await unsubscribeFromPush(user)
      setIsSubscribed(false)
      setFeedback({
        type: 'info',
        text: 'Push notifications have been disabled on this device.'
      })
    } catch (err) {
      console.error('Unsubscribe error:', err)
      setFeedback({ type: 'error', text: err.message || 'Failed to unregister.' })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleTestNotification() {
    setTesting(true)
    setFeedback({ type: '', text: '' })

    try {
      const response = await fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: user.id,
          title: '🔔 Test Notification',
          body: 'Success! Your device is registered and working perfectly for All-Hands notifications.',
          url: '/home'
        })
      })

      const data = await response.json()
      if (data.success || response.ok) {
        setFeedback({
          type: 'success',
          text: '✅ Test notification dispatched! It should pop up on this screen momentarily.'
        })
      } else {
        setFeedback({
          type: 'error',
          text: data.message || 'Failed to deliver test notification.'
        })
      }
    } catch (err) {
      console.error('Test notification error:', err)
      setFeedback({
        type: 'error',
        text: 'Failed to send test notification: ' + err.message
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', animation: 'fadeIn 0.3s var(--apple-ease)' }}>
      {/* Back button */}
      <Link 
        to="/home" 
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px', 
          color: 'var(--apple-text-secondary)', 
          textDecoration: 'none', 
          fontSize: '0.9rem',
          marginBottom: '24px',
          fontWeight: '500'
        }}
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      {/* Main Card */}
      <div className="apple-card" style={{ padding: 'clamp(24px, 5vw, 36px)' }}>
        {/* Header Icon + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: isSubscribed ? 'rgba(52, 211, 153, 0.12)' : 'rgba(0, 113, 227, 0.12)',
            color: isSubscribed ? 'var(--apple-accent-green)' : 'var(--apple-accent-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}>
            <Bell size={22} />
          </div>
          <div>
            <h1 className="apple-title-medium" style={{ margin: 0, fontSize: '1.4rem' }}>
              Push Notifications
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--apple-text-secondary)' }}>
              Enable alerts on this device for company announcements & updates
            </p>
          </div>
        </div>

        {/* Feedback message banner */}
        {feedback.text && (
          <div style={{
            marginTop: '20px',
            padding: '14px 16px',
            borderRadius: '12px',
            fontSize: '0.9rem',
            lineHeight: '1.5',
            background: feedback.type === 'success' 
              ? 'rgba(52, 211, 153, 0.12)' 
              : feedback.type === 'error' 
                ? 'rgba(255, 69, 58, 0.12)' 
                : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${
              feedback.type === 'success' 
                ? 'rgba(52, 211, 153, 0.3)' 
                : feedback.type === 'error' 
                  ? 'rgba(255, 69, 58, 0.3)' 
                  : 'var(--apple-border)'
            }`,
            color: feedback.type === 'success' 
              ? '#34d399' 
              : feedback.type === 'error' 
                ? '#ff453a' 
                : 'var(--apple-text-primary)'
          }}>
            {feedback.text}
          </div>
        )}

        {/* Status Section */}
        <div style={{
          marginTop: '24px',
          padding: '20px',
          borderRadius: '14px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--apple-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          {/* Status Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)', fontWeight: '500' }}>
              Registration Status
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isSubscribed ? 'var(--apple-accent-green)' : '#86868b',
                boxShadow: isSubscribed ? '0 0 8px var(--apple-accent-green)' : 'none'
              }} />
              <span style={{
                fontSize: '0.88rem',
                fontWeight: '600',
                color: isSubscribed ? 'var(--apple-accent-green)' : 'var(--apple-text-secondary)'
              }}>
                {loading ? 'Checking...' : isSubscribed ? 'Registered & Active' : 'Not Registered'}
              </span>
            </div>
          </div>

          {/* Device Type Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)', fontWeight: '500' }}>
              Current Device
            </span>
            <span style={{
              fontSize: '0.85rem',
              fontWeight: '600',
              color: 'var(--apple-text-primary)',
              textTransform: 'capitalize',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Smartphone size={14} style={{ color: 'var(--apple-accent-blue)' }} />
              {deviceType}
            </span>
          </div>

          {/* Browser Permission Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)', fontWeight: '500' }}>
              Browser Permission
            </span>
            <span style={{
              fontSize: '0.85rem',
              fontWeight: '600',
              color: devicePermission === 'granted' 
                ? 'var(--apple-accent-green)' 
                : devicePermission === 'denied' 
                  ? 'var(--apple-accent-red)' 
                  : 'var(--apple-text-secondary)',
              textTransform: 'capitalize'
            }}>
              {devicePermission}
            </span>
          </div>
        </div>

        {/* Permission Denied Warning */}
        {devicePermission === 'denied' && (
          <div style={{
            marginTop: '16px',
            padding: '14px',
            borderRadius: '10px',
            background: 'rgba(255, 69, 58, 0.08)',
            border: '1px solid rgba(255, 69, 58, 0.25)',
            fontSize: '0.82rem',
            color: '#ff453a',
            lineHeight: '1.5'
          }}>
            <strong>Notifications are blocked in your browser:</strong> Click the lock or settings icon next to the URL in your browser address bar and set <em>Notifications</em> to <strong>Allow</strong>, then refresh this page.
          </div>
        )}

        {/* iOS Notice if not installed as PWA */}
        {isIOS && !isPWA && (
          <div style={{
            marginTop: '16px',
            padding: '14px',
            borderRadius: '10px',
            background: 'rgba(0, 113, 227, 0.08)',
            border: '1px solid rgba(0, 113, 227, 0.25)',
            fontSize: '0.82rem',
            color: 'var(--apple-text-secondary)',
            lineHeight: '1.5'
          }}>
            <strong style={{ color: '#fff' }}>iPhone/iPad Tip:</strong> To receive push notifications on iOS, tap the Safari <strong>Share</strong> button (box with arrow) and choose <strong>&ldquo;Add to Home Screen&rdquo;</strong>, then open the app from your Home Screen.
          </div>
        )}

        {/* Main Action Button */}
        <div style={{ marginTop: '28px' }}>
          {!isSubscribed ? (
            <button
              onClick={handleRegister}
              disabled={actionLoading || loading || !supported || devicePermission === 'denied'}
              className="apple-btn apple-btn-primary"
              style={{
                width: '100%',
                padding: '14px 20px',
                fontSize: '1rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                borderRadius: '12px'
              }}
            >
              {actionLoading ? (
                'Registering Device...'
              ) : (
                <>
                  <Radio size={18} /> Register This Device for Notifications
                </>
              )}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleTestNotification}
                disabled={testing}
                className="apple-btn apple-btn-primary"
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  borderRadius: '12px'
                }}
              >
                {testing ? (
                  'Dispatching Test...'
                ) : (
                  <>
                    <Send size={16} /> Send Test Notification to This Device
                  </>
                )}
              </button>

              <button
                onClick={handleUnsubscribe}
                disabled={actionLoading}
                className="apple-btn apple-btn-secondary"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  fontSize: '0.85rem',
                  color: 'var(--apple-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  borderRadius: '10px',
                  background: 'transparent'
                }}
              >
                Turn off notifications on this device
              </button>
            </div>
          )}
        </div>

        {/* Safety Note */}
        <div style={{
          marginTop: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.78rem',
          color: 'var(--apple-text-secondary)',
          justifyContent: 'center'
        }}>
          <ShieldCheck size={14} style={{ color: 'var(--apple-accent-green)' }} />
          Notifications are private and delivered securely through your browser.
        </div>
      </div>
    </div>
  )
}

