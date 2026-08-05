import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FATHOM_WEBHOOK_SECRET = Deno.env.get('FATHOM_WEBHOOK_SECRET') || ''

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    // 1. Verify webhook (in a real scenario, you'd verify the signature if Fathom provides one in headers)
    // For now, if we have a secret, we could check a token or we just process it.
    // Assuming Fathom might send something in the header or we just rely on the obfuscated URL.
    
    const payload = await req.json()
    console.log("Received Fathom Webhook:", JSON.stringify(payload, null, 2))

    // Fathom payload structure (this is a generalized assumption based on typical meeting webhooks)
    // It might differ slightly based on Fathom's actual API documentation.
    
    // Extract fields safely
    const fathomId = payload.video_id || payload.id || `fathom_${Date.now()}`
    
    // Extract speaker/email (might be in attendees or recorded_by)
    const owner = payload.recorded_by || payload.owner || {}
    
    // Try to find an external invitee first
    const externalInvitee = payload.calendar_invitees?.find((i: any) => i.is_external);
    let speakerName = externalInvitee?.name;
    let email = externalInvitee?.email;

    const transcriptStr = typeof payload.transcript === 'string' ? payload.transcript : JSON.stringify(payload.transcript);

    // Try to extract from transcript if we still don't have it
    if ((!speakerName || !email) && transcriptStr && transcriptStr.startsWith('[')) {
      try {
        const tData = JSON.parse(transcriptStr);
        const extBlock = tData.find((t: any) => t.speaker && t.speaker.display_name && t.speaker.display_name !== owner.name);
        if (extBlock) {
          if (!speakerName) speakerName = extBlock.speaker.display_name;
          if (!email && extBlock.speaker.matched_calendar_invitee_email) {
            email = extBlock.speaker.matched_calendar_invitee_email;
          }
        }
      } catch(e) {}
    }

    // If no external invitee or transcript match, try extracting from title
    if (!speakerName && payload.title) {
      const titleParts = payload.title.split(':');
      if (titleParts.length > 1) {
        speakerName = titleParts[0].trim();
      } else {
        speakerName = payload.title;
      }
    }

    // Fallback
    if (!speakerName) {
      speakerName = owner.name || payload.speaker_name || "Unknown Speaker";
      if (!email) email = owner.email || payload.speaker_email || "";
    } else {
      if (!email && speakerName !== owner.name) {
        email = "";
      } else if (!email) {
        email = owner.email || payload.speaker_email || "";
      }
    }
    
    // Dates
    const meetingDateObj = new Date(payload.created_at || Date.now())
    const meetingDate = meetingDateObj.toISOString().split('T')[0]
    const meetingTime = meetingDateObj.toTimeString().split(' ')[0]

    let summary = payload.summary;
    if (!summary && payload.default_summary) {
      summary = payload.default_summary.markdown_formatted || payload.default_summary.text;
    }
    summary = summary || "No summary available.";

    // Content
    const transcript = payload.transcript || "No transcript available."
    const actionItems = payload.action_items || []
    const fathomLink = payload.url || payload.video_url || ""

    // 2. Initialize Supabase Admin Client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Upsert into database (using fathomId to prevent duplicates if the webhook retries)
    const { data, error } = await supabaseAdmin
      .from('fathom_meetings')
      .upsert({
        fathom_id: fathomId,
        speaker_name: speakerName,
        email: email,
        meeting_date: meetingDate,
        meeting_time: meetingTime,
        transcript: transcript,
        summary: summary,
        action_items: actionItems,
        fathom_link: fathomLink
      }, { onConflict: 'fathom_id' })
      .select()

    if (error) {
      console.error("Error inserting into Supabase:", error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error("Webhook processing error:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
})
