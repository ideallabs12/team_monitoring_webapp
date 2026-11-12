import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://pzalalbpxlwtcnmkaegb.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YWxhbGJweGx3dGNubWthZWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzY5NzAsImV4cCI6MjA5NTA1Mjk3MH0.fIRWi_8Q98xEqsLqk0MdarRpq1exziZIWzAaSRMCFq0'

const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY || 'BNq5WduHm2qQd0Frr6ziNAKAPJE0qZbu_StMfQGnZkDp2PiMsv5BloWm0TcMhWnq-eNnQHJXyz2FgduvIfzanww'
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'c5R-W7dxCGL_tzyntfkx6k8Q248A4ACWKHwILcmn1Xg'
const VAPID_SUBJECT = 'mailto:admin@ideallabs.com'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. POST is required.' })
  }

  try {
    const { targetUserId, title, body, url, sentBy } = req.body || {}

    if (!title) {
      return res.status(400).json({ error: 'Notification title is required.' })
    }

    // Query target subscriptions
    let query = supabase.from('user_push_subscriptions').select('*')
    if (targetUserId && targetUserId !== 'all') {
      query = query.eq('user_id', targetUserId)
    }

    const { data: subscriptions, error: fetchErr } = await query
    if (fetchErr) {
      return res.status(500).json({ error: 'Failed to fetch target push subscriptions: ' + fetchErr.message })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'No registered push devices found for the selected recipient.',
        targeted: 0,
        delivered: 0,
        failed: 0
      })
    }

    const payload = JSON.stringify({
      title,
      body: body || '',
      url: url || '/home',
      icon: '/favicon_cropped.png',
      badge: '/favicon_cropped.png',
      timestamp: Date.now()
    })

    let successCount = 0
    let failureCount = 0
    const deadEndpointIds = []
    const results = []

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      }

      try {
        const result = await webpush.sendNotification(pushSubscription, payload)
        successCount++
        results.push({ id: sub.id, endpoint: sub.endpoint, status: result.statusCode || 201 })
      } catch (err) {
        failureCount++
        results.push({ id: sub.id, endpoint: sub.endpoint, error: err.message, statusCode: err.statusCode })
        
        // If 410 Gone or 404 Not Found, mark device endpoint as expired for automatic cleanup
        if (err.statusCode === 410 || err.statusCode === 404) {
          deadEndpointIds.push(sub.id)
        }
      }
    }

    // Prune stale device subscriptions
    if (deadEndpointIds.length > 0) {
      await supabase.from('user_push_subscriptions').delete().in('id', deadEndpointIds)
    }

    // Record log
    try {
      await supabase.from('push_notifications_log').insert([
        {
          title,
          body: body || '',
          url: url || '/home',
          target_type: targetUserId === 'all' ? 'all' : 'user',
          target_user_id: targetUserId === 'all' ? null : targetUserId,
          sent_by: sentBy || null,
          devices_targeted: subscriptions.length,
          success_count: successCount,
          failure_count: failureCount,
          status: successCount > 0 ? 'sent' : 'failed',
          error_details: failureCount > 0 ? JSON.stringify(results.filter(r => r.error)) : null
        }
      ])
    } catch (logErr) {
      console.warn('Could not write to push_notifications_log:', logErr.message)
    }

    return res.status(200).json({
      success: successCount > 0,
      targeted: subscriptions.length,
      delivered: successCount,
      failed: failureCount,
      prunedStaleDevices: deadEndpointIds.length,
      results
    })
  } catch (error) {
    console.error('Unhandled push dispatch error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}

