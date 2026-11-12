// ==============================================================================
// SUPABASE EDGE FUNCTION: send-push
// Handles VAPID signing and Web Push dispatch via Deno runtime
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "https://esm.sh/web-push@3.6.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || 'BNq5WduHm2qQd0Frr6ziNAKAPJE0qZbu_StMfQGnZkDp2PiMsv5BloWm0TcMhWnq-eNnQHJXyz2FgduvIfzanww'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || 'c5R-W7dxCGL_tzyntfkx6k8Q248A4ACWKHwILcmn1Xg'
const VAPID_SUBJECT = 'mailto:admin@ideallabs.com'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { targetUserId, title, body, url, sentBy } = await req.json()

    if (!title) {
      return new Response(JSON.stringify({ error: 'Title is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let query = supabaseClient.from('user_push_subscriptions').select('*')
    if (targetUserId && targetUserId !== 'all') {
      query = query.eq('user_id', targetUserId)
    }

    const { data: subscriptions, error: fetchErr } = await query
    if (fetchErr) throw fetchErr

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'No registered push devices found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
    const deadEndpointIds: string[] = []

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        }, payload)
        successCount++
      } catch (err: any) {
        failureCount++
        if (err.statusCode === 410 || err.statusCode === 404) {
          deadEndpointIds.push(sub.id)
        }
      }
    }

    if (deadEndpointIds.length > 0) {
      await supabaseClient.from('user_push_subscriptions').delete().in('id', deadEndpointIds)
    }

    await supabaseClient.from('push_notifications_log').insert([
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
        status: successCount > 0 ? 'sent' : 'failed'
      }
    ])

    return new Response(JSON.stringify({
      success: successCount > 0,
      targeted: subscriptions.length,
      delivered: successCount,
      failed: failureCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

