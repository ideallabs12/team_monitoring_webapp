import { supabase } from '../supabaseClient'

// Default public VAPID key (can be overridden via environment variable)
export const VAPID_PUBLIC_KEY = 
  import.meta.env.VITE_VAPID_PUBLIC_KEY || 
  'BNq5WduHm2qQd0Frr6ziNAKAPJE0qZbu_StMfQGnZkDp2PiMsv5BloWm0TcMhWnq-eNnQHJXyz2FgduvIfzanww'

/**
 * Converts a base64 string to a Uint8Array for the PushManager applicationServerKey.
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Detects whether the current device is iOS, Android, or Desktop.
 */
export function detectDeviceType() {
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios'
  }
  if (/Android/.test(ua)) {
    return 'android'
  }
  return 'desktop'
}

/**
 * Checks whether Web Push and Service Workers are supported on this device/browser.
 */
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Gets current notification permission status.
 */
export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

/**
 * Registers the root service worker if supported.
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    return registration
  } catch (err) {
    console.error('Service worker registration failed:', err)
    return null
  }
}

/**
 * Returns existing PushSubscription if already active.
 */
export async function getExistingSubscription() {
  if (!isPushSupported()) return null
  try {
    const registration = await navigator.serviceWorker.ready
    return await registration.pushManager.getSubscription()
  } catch (err) {
    console.error('Error checking existing push subscription:', err)
    return null
  }
}

/**
 * Prompts user for permission, generates a Web Push subscription,
 * and saves the device token to Supabase `user_push_subscriptions`.
 */
export async function subscribeToPush(user) {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported on this browser or device.')
  }

  if (!user?.id) {
    throw new Error('A logged-in user is required to register for push notifications.')
  }

  // Request browser permission
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted by the user.')
  }

  // Ensure Service Worker is registered and active
  let registration = await navigator.serviceWorker.getRegistration('/')
  if (!registration) {
    registration = await registerServiceWorker()
  }
  await navigator.serviceWorker.ready

  // Subscribe to push manager with VAPID key
  const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey
  })

  // Format subscription keys for PostgreSQL storage
  const subJSON = subscription.toJSON()
  const endpoint = subJSON.endpoint
  const p256dh = subJSON.keys?.p256dh
  const auth = subJSON.keys?.auth
  const deviceType = detectDeviceType()
  const userAgent = navigator.userAgent

  if (!endpoint || !p256dh || !auth) {
    throw new Error('Failed to retrieve full push subscription keys from browser.')
  }

  // Upsert subscription into Supabase
  const { data, error } = await supabase
    .from('user_push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        device_type: deviceType,
        user_agent: userAgent,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'endpoint' }
    )
    .select()

  if (error) {
    console.error('Failed to save push subscription to database:', error)
    throw error
  }

  return { subscription, data }
}

/**
 * Unsubscribes from push notifications on the current device.
 */
export async function unsubscribeFromPush(user) {
  if (!isPushSupported()) return

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      const endpoint = subscription.endpoint
      await subscription.unsubscribe()

      if (user?.id) {
        await supabase
          .from('user_push_subscriptions')
          .delete()
          .eq('endpoint', endpoint)
      }
    }
  } catch (err) {
    console.error('Error unsubscribing from push:', err)
  }
}

