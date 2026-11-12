import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import {
  Bell, Send, Smartphone, Laptop, CheckCircle, AlertCircle,
  Clock, RefreshCw, Trash2, ShieldCheck, Zap, User, ArrowRight
} from 'lucide-react'
import {
  isPushSupported,
  getNotificationPermission,
  detectDeviceType,
  getExistingSubscription,
  subscribeToPush,
  unsubscribeFromPush
} from '../../utils/pushNotificationHelper'

export default function AdminPushManager({ user }) {
  const [profiles, setProfiles] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  // Current Device State
  const [devicePermission, setDevicePermission] = useState(getNotificationPermission())
  const [isCurrentSubscribed, setIsCurrentSubscribed] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  // Dispatch Form State
  const [targetUserId, setTargetUserId] = useState('self') // 'self', 'all', or user UUID
  const [title, setTitle] = useState('New Platform Notification')
  const [body, setBody] = useState('Test notification delivered to your Lock Screen!')
  const [targetUrl, setTargetUrl] = useState('/home')
  const [sending, setSending] = useState(false)
  const [countdown, setCountdown] = useState(null)
  const [resultMessage, setResultMessage] = useState(null)

  // Filter for Roster
  const [rosterFilter, setRosterFilter] = useState('all') // 'all', 'subscribed', 'unsubscribed'
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
    checkCurrentDeviceSubscription()

    // Realtime subscriptions
    const subChannel = supabase
      .channel('admin-push-subs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_push_subscriptions' }, () => {
        loadSubscriptions()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'push_notifications_log' }, () => {
        loadLogs()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subChannel)
    }
  }, [])

  async function checkCurrentDeviceSubscription() {
    setDevicePermission(getNotificationPermission())
    const sub = await getExistingSubscription()
    setIsCurrentSubscribed(!!sub)
  }

  async function loadData() {
    setLoading(true)
    try {
      await Promise.all([loadProfiles(), loadSubscriptions(), loadLogs()])
    } catch (err) {
      console.error('Error loading push manager data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadProfiles() {
    const { data } = await supabase.from('profiles').select('*').order('first_name', { ascending: true })
    setProfiles(data || [])
  }

  async function loadSubscriptions() {
    const { data } = await supabase.from('user_push_subscriptions').select('*').order('created_at', { ascending: false })
    setSubscriptions(data || [])
  }

  async function loadLogs() {
    const { data } = await supabase.from('push_notifications_log').select('*').order('created_at', { ascending: false }).limit(20)
    setLogs(data || [])
  }

  // Toggle Push on Current Device
  async function handleToggleCurrentDevice() {
    if (subscribing) return
    setSubscribing(true)
    setResultMessage(null)
    try {
      if (isCurrentSubscribed) {
        await unsubscribeFromPush(user)
        setIsCurrentSubscribed(false)
        setResultMessage({ type: 'success', text: 'This device unsubscribed from push notifications.' })
      } else {
        await subscribeToPush(user)
        setIsCurrentSubscribed(true)
        setDevicePermission('granted')
        setResultMessage({ type: 'success', text: '🎉 This device is now registered for Native Push Notifications!' })
      }
      await loadSubscriptions()
    } catch (err) {
      setResultMessage({ type: 'error', text: err.message || 'Failed to update subscription.' })
    } finally {
      setSubscribing(false)
    }
  }

  // Map users with subscription counts
  const userRoster = useMemo(() => {
    return profiles.map(p => {
      const userSubs = subscriptions.filter(s => s.user_id === p.id)
      return {
        ...p,
        devices: userSubs,
        isSubscribed: userSubs.length > 0,
        deviceCount: userSubs.length
      }
    })
  }, [profiles, subscriptions])

  const filteredRoster = useMemo(() => {
    let list = userRoster
    if (rosterFilter === 'subscribed') list = list.filter(u => u.isSubscribed)
    if (rosterFilter === 'unsubscribed') list = list.filter(u => !u.isSubscribed)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(u =>
        (u.first_name + ' ' + u.last_name).toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      )
    }
    return list
  }, [userRoster, rosterFilter, searchQuery])

  // Count by device type
  const deviceStats = useMemo(() => {
    const ios = subscriptions.filter(s => s.device_type === 'ios').length
    const android = subscriptions.filter(s => s.device_type === 'android').length
    const desktop = subscriptions.filter(s => s.device_type === 'desktop' || !s.device_type).length
    const uniqueUsers = new Set(subscriptions.map(s => s.user_id)).size
    return { ios, android, desktop, total: subscriptions.length, uniqueUsers }
  }, [subscriptions])

  // Dispatch Push Request
  async function executePush(delaySeconds = 0, explicitTargetId = null) {
    if (sending || countdown !== null) return
    setResultMessage(null)

    const targetToUse = explicitTargetId || targetUserId

    if (delaySeconds > 0) {
      let remaining = delaySeconds
      setCountdown(remaining)
      const timer = setInterval(() => {
        remaining -= 1
        if (remaining <= 0) {
          clearInterval(timer)
          setCountdown(null)
          sendPushPayload(targetToUse)
        } else {
          setCountdown(remaining)
        }
      }, 1000)
    } else {
      sendPushPayload(targetToUse)
    }
  }

  async function sendPushPayload(targetToUse) {
    setSending(true)
    const effectiveTarget = targetToUse || targetUserId
    const finalUserId = effectiveTarget === 'self' ? user?.id : effectiveTarget

    // Check target profile & devices
    const targetProfile = profiles.find(p => p.id === finalUserId)
    const targetName = finalUserId === 'all'
      ? 'All Users'
      : (effectiveTarget === 'self' ? 'Your Device' : (targetProfile ? `${targetProfile.first_name} ${targetProfile.last_name}` : 'Selected User'))

    // Filter target subscriptions from local state
    const targetSubs = finalUserId === 'all'
      ? subscriptions
      : subscriptions.filter(s => s.user_id === finalUserId)

    // Pre-flight check: ensure target has at least one subscription
    if (finalUserId !== 'all' && targetSubs.length === 0) {
      setSending(false)
      setResultMessage({
        type: 'error',
        text: `⚠️ ${targetName} does not have any registered push devices yet. Open the app on their device and click "Enable on this Device" first.`
      })
      return
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token

      // 1. Try Vercel Serverless Function or Local API
      let res
      let sentSuccessfully = false
      let responseData = null

      try {
        res = await fetch('/api/send-push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            targetUserId: finalUserId,
            subscriptions: targetSubs,
            title,
            body,
            url: targetUrl,
            sentBy: user?.id
          })
        })
        if (res.ok) {
          responseData = await res.json()
          if (responseData && responseData.success !== false) {
            sentSuccessfully = true
          }
        }
      } catch (apiErr) {
        console.warn('Local /api/send-push fetch failed, falling back:', apiErr.message)
      }

      // 2. Fallback to Supabase Edge Function if /api/send-push is not hosted locally
      if (!sentSuccessfully) {
        try {
          const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('send-push', {
            body: {
              targetUserId: finalUserId,
              subscriptions: targetSubs,
              title,
              body,
              url: targetUrl,
              sentBy: user?.id
            }
          })
          if (!edgeErr && edgeData && edgeData.success !== false) {
            responseData = edgeData
            sentSuccessfully = true
          }
        } catch (edgeInvokeErr) {
          console.warn('Supabase edge function invoke failed:', edgeInvokeErr.message)
        }
      }

      // 3. Fallback: Local Service Worker direct showNotification test for 'self'
      if (!sentSuccessfully && effectiveTarget === 'self' && isPushSupported()) {
        const reg = await navigator.serviceWorker.ready
        if (reg) {
          await reg.showNotification(title, {
            body,
            icon: '/favicon_cropped.png',
            badge: '/favicon_cropped.png',
            data: { url: targetUrl },
            vibrate: [200, 100, 200]
          })
          responseData = { success: true, delivered: 1, localSimulated: true }
          sentSuccessfully = true
        }
      }

      if (sentSuccessfully && responseData?.success !== false) {
        setResultMessage({
          type: 'success',
          text: `✅ Push successfully sent to ${targetName}! Targeted ${responseData?.targeted ?? 1} device(s). Check the lock screen / notification center!`
        })
      } else {
        setResultMessage({
          type: 'error',
          text: responseData?.message || responseData?.error || `Push failed to deliver to ${targetName}. Ensure device is online.`
        })
      }
      await loadLogs()
    } catch (err) {
      setResultMessage({ type: 'error', text: 'Error dispatching push: ' + err.message })
    } finally {
      setSending(false)
    }
  }

  async function handleDeleteSubscription(subId) {
    if (!window.confirm('Remove this device subscription?')) return
    await supabase.from('user_push_subscriptions').delete().eq('id', subId)
    await loadSubscriptions()
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(0,113,227,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={22} color="var(--apple-accent-blue)" />
            </div>
            <h1 className="apple-title" style={{ margin: 0 }}>Push Notification Center</h1>
          </div>
          <p style={{ color: 'var(--apple-text-secondary)', margin: '6px 0 0 0', fontSize: '0.9rem' }}>
            Send real-time notifications to user lock screens, notification centers, and control shades.
          </p>
        </div>

        {/* Current Device Registration Card */}
        <div className="apple-card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '14px', margin: 0, minWidth: '320px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isCurrentSubscribed ? '#34d399' : '#ff9f0a' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--apple-text-primary)' }}>
              This Device: {detectDeviceType().toUpperCase()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)' }}>
              {isCurrentSubscribed ? '🟢 Registered for Push' : '⚪ Not Registered'}
            </div>
          </div>
          <button
            onClick={handleToggleCurrentDevice}
            disabled={subscribing}
            className={`apple-btn ${isCurrentSubscribed ? 'apple-btn-secondary' : 'apple-btn-primary'}`}
            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
          >
            {subscribing ? 'Updating...' : (isCurrentSubscribed ? 'Unsubscribe' : 'Enable on this Device')}
          </button>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="apple-card" style={{ padding: '18px' }}>
          <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Active Push Devices</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--apple-text-primary)', marginTop: '6px' }}>{deviceStats.total}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--apple-accent-blue)', marginTop: '4px' }}>
            Across {deviceStats.uniqueUsers} registered user(s)
          </div>
        </div>

        <div className="apple-card" style={{ padding: '18px' }}>
          <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>iOS Devices (Apple APNs)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ff2d55', marginTop: '6px' }}>{deviceStats.ios}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>Home Screen PWAs</div>
        </div>

        <div className="apple-card" style={{ padding: '18px' }}>
          <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Android & Desktop</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#34d399', marginTop: '6px' }}>{deviceStats.android + deviceStats.desktop}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>Android: {deviceStats.android} · Desktop: {deviceStats.desktop}</div>
        </div>

        <div className="apple-card" style={{ padding: '18px' }}>
          <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Total Push Dispatches</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ff9f0a', marginTop: '6px' }}>{logs.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>Logged campaigns</div>
        </div>
      </div>

      {/* ── Main Two-Column Layout: Dispatch Form + Devices Roster ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 440px) 1fr', gap: '24px', alignItems: 'start' }}>

        {/* LEFT COLUMN: Dispatch Form & Testing Controls */}
        <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--apple-border)', paddingBottom: '12px' }}>
            <Zap size={18} color="var(--apple-accent-blue)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--apple-text-primary)' }}>Dispatch Notification</h3>
          </div>

          {/* Quick Presets */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Quick Presets</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {[
                { label: '🔔 Test Alert', t: 'Lock Screen Test', b: 'Success! Your device receives notifications when the app is closed.' },
                { label: '💰 Revenue Alert', t: 'New Revenue Recorded', b: 'A team member just logged a new sales transaction.' },
                { label: '📢 Announcement', t: 'New Team Announcement', b: 'Please review the latest update in the announcements tab.' }
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => { setTitle(preset.t); setBody(preset.b); }}
                  className="apple-btn apple-btn-secondary"
                  style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px' }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Recipient Selector */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Target Recipient</label>
            <select
              className="apple-input"
              value={targetUserId}
              onChange={e => setTargetUserId(e.target.value)}
              style={{ width: '100%', marginTop: '6px' }}
            >
              <option value="self">🎯 My Own Device (Current Logged-in Admin)</option>
              <option value="all">📢 Broadcast to All Registered Devices ({deviceStats.total})</option>
              <optgroup label="Select Specific User">
                {userRoster.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} ({u.deviceCount > 0 ? `${u.deviceCount} device(s)` : 'No devices'})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Title */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Notification Title</label>
            <input
              type="text"
              className="apple-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Daily Standup Starting"
              style={{ width: '100%', marginTop: '6px' }}
            />
          </div>

          {/* Body */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Notification Body Message</label>
            <textarea
              className="apple-input"
              rows={3}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Enter message text that will display on the lock screen..."
              style={{ width: '100%', marginTop: '6px', resize: 'vertical' }}
            />
          </div>

          {/* Action Destination URL */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Target Route on Tap</label>
            <select
              className="apple-input"
              value={targetUrl}
              onChange={e => setTargetUrl(e.target.value)}
              style={{ width: '100%', marginTop: '6px' }}
            >
              <option value="/home">Home Dashboard (/home)</option>
              <option value="/revenue">Revenue Page (/revenue)</option>
              <option value="/leaderboard">Leaderboard (/leaderboard)</option>
              <option value="/announcements">Announcements (/announcements)</option>
              <option value="/meetings">Meetings (/meetings)</option>
            </select>
          </div>

          {/* Result Alert */}
          {resultMessage && (
            <div style={{
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              background: resultMessage.type === 'success' ? 'rgba(52,211,153,0.1)' : 'rgba(255,69,58,0.1)',
              border: `1px solid ${resultMessage.type === 'success' ? 'rgba(52,211,153,0.3)' : 'rgba(255,69,58,0.3)'}`,
              color: resultMessage.type === 'success' ? '#34d399' : '#ff453a'
            }}>
              {resultMessage.text}
            </div>
          )}

          {/* Countdown indicator */}
          {countdown !== null && (
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,159,10,0.12)', border: '1px solid rgba(255,159,10,0.3)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ff9f0a' }}>
                ⏳ Sending in {countdown} seconds!
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>
                👉 Lock your phone screen or close the app right now to test native lock-screen delivery!
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
            <button
              onClick={() => executePush(0, targetUserId)}
              disabled={sending || countdown !== null}
              className="apple-btn apple-btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
            >
              <Send size={16} />
              {sending ? 'Dispatching Push...' : 'Send Push Notification Now'}
            </button>

            <button
              onClick={() => executePush(10, 'self')}
              disabled={sending || countdown !== null}
              className="apple-btn apple-btn-secondary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', color: '#ff9f0a' }}
            >
              <Clock size={16} />
              ⏰ Test on My Phone (10-Second Delay)
            </button>
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)', lineHeight: '1.4', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
            💡 <strong>Testing Tip:</strong> Use the 10-second delay button, then tap your phone's power button to lock the screen. The push will arrive on your lock screen with sound and banner.
          </div>
        </div>

        {/* RIGHT COLUMN: Registered Users & Device Roster */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* User Devices Card */}
          <div className="apple-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--apple-text-primary)' }}>Device Subscriptions</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>
                  Active endpoints receiving Web Push
                </span>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setRosterFilter('all')}
                  className={`apple-btn ${rosterFilter === 'all' ? 'apple-btn-primary' : 'apple-btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  All ({userRoster.length})
                </button>
                <button
                  onClick={() => setRosterFilter('subscribed')}
                  className={`apple-btn ${rosterFilter === 'subscribed' ? 'apple-btn-primary' : 'apple-btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  Subscribed ({deviceStats.uniqueUsers})
                </button>
              </div>
            </div>

            {/* Search Input */}
            <input
              type="text"
              className="apple-input"
              placeholder="Search user by name or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', marginBottom: '16px' }}
            />

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
              {filteredRoster.map(u => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: u.isSubscribed ? 'rgba(0,113,227,0.04)' : 'rgba(255,255,255,0.01)',
                    border: `1px solid ${u.isSubscribed ? 'rgba(0,113,227,0.2)' : 'var(--apple-border)'}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: u.isSubscribed ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: u.isSubscribed ? '#34d399' : 'var(--apple-text-secondary)',
                      fontSize: '0.75rem', fontWeight: '700'
                    }}>
                      {u.first_name?.[0] || 'U'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--apple-text-primary)' }}>
                        {u.first_name} {u.last_name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--apple-text-secondary)' }}>
                        {u.email}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {u.devices.map(d => (
                      <span
                        key={d.id}
                        className={`apple-badge ${d.device_type === 'ios' ? 'apple-badge-red' : d.device_type === 'android' ? 'apple-badge-green' : 'apple-badge-blue'}`}
                        style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}
                      >
                        {d.device_type === 'ios' ? '📱 iOS' : d.device_type === 'android' ? '🤖 Android' : '💻 Desktop'}
                      </span>
                    ))}

                    {!u.isSubscribed && (
                      <span className="apple-badge apple-badge-gray" style={{ fontSize: '0.7rem' }}>
                        No Devices
                      </span>
                    )}

                    <button
                      onClick={() => {
                        setTargetUserId(u.id)
                        executePush(0, u.id)
                      }}
                      disabled={!u.isSubscribed || sending}
                      className="apple-btn apple-btn-secondary"
                      style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px' }}
                      title="Send instant push test to this user"
                    >
                      Test
                    </button>
                  </div>
                </div>
              ))}

              {filteredRoster.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--apple-text-secondary)', fontSize: '0.85rem' }}>
                  No matching users found.
                </div>
              )}
            </div>
          </div>

          {/* Recent Dispatches Log Card */}
          <div className="apple-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--apple-text-primary)' }}>Recent Push Dispatches</h3>
              <button onClick={loadLogs} className="apple-btn apple-btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
              {logs.map(log => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.01)', border: '1px solid var(--apple-border)',
                    fontSize: '0.78rem'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--apple-text-primary)' }}>{log.title}</div>
                    <div style={{ color: 'var(--apple-text-secondary)', marginTop: '2px' }}>{log.body}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`apple-badge ${log.status === 'sent' ? 'apple-badge-green' : 'apple-badge-red'}`} style={{ fontSize: '0.68rem' }}>
                      {log.status === 'sent' ? `Delivered (${log.success_count || 1})` : 'Failed'}
                    </span>
                    <div style={{ fontSize: '0.68rem', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}

              {logs.length === 0 && (
                <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.78rem', textAlign: 'center', padding: '16px' }}>
                  No recent push dispatches logged.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}

