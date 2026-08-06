import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuration (fallback to environment variables if set)
const FATHOM_API_KEY = Deno.env.get('FATHOM_API_KEY') || 'cbPjoPLjlEN_Yj6SBA6lPQ.Jn8rpt11mEFZ0ConSmgHm7_GJPk7Fc1CoMq1NBdFy2Q'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { date } = await req.json()
    
    if (!date) {
      return new Response(JSON.stringify({ error: 'Date is required (YYYY-MM-DD)' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    console.log(`Syncing Fathom meetings for date: ${date}`)
    
    // Convert date string to ISO date string for Fathom API (created_after)
    // To ensure we get the full day, we can start at 00:00:00 of that day
    const createdAfter = `${date}T00:00:00Z`

    const response = await fetch(
      `https://api.fathom.ai/external/v1/meetings?created_after=${createdAfter}&include_transcript=true&include_summary=true&include_action_items=true`,
      {
        headers: {
          'X-Api-Key': FATHOM_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Fathom API Error: ${response.statusText}`)
    }

    const data = await response.json()
    const allMeetings = data.items || []
    
    // Filter meetings to only match the requested date
    const targetMeetings = allMeetings.filter((m: any) => {
      const meetingDateStr = new Date(m.created_at || Date.now()).toISOString().split('T')[0]
      return meetingDateStr === date
    })

    console.log(`Found ${targetMeetings.length} meetings for ${date}. Inserting into database...`)

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? 'https://pzalalbpxlwtcnmkaegb.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YWxhbGJweGx3dGNubWthZWdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQ3Njk3MCwiZXhwIjoyMDk1MDUyOTcwfQ.K7X11tmv9RAIvNh8qY3Dl6jTq-Lqnc_0vBJCnAt2Zfs'
    )

    let insertedCount = 0

    for (const meeting of targetMeetings) {
      let fathomId = meeting.recording_id || meeting.id
      if (!fathomId && meeting.url) fathomId = meeting.url.split('/').pop()
      if (!fathomId) fathomId = `fathom_${Date.now()}`
      const owner = meeting.recorded_by || meeting.owner || {}
      
      const externalInvitee = meeting.calendar_invitees?.find((i: any) => i.is_external)
      let speakerName = externalInvitee?.name
      let email = externalInvitee?.email

      const transcriptStr = typeof meeting.transcript === 'string' ? meeting.transcript : JSON.stringify(meeting.transcript)

      if ((!speakerName || !email) && transcriptStr && transcriptStr.startsWith('[')) {
        try {
          const tData = JSON.parse(transcriptStr)
          const extBlock = tData.find((t: any) => t.speaker && t.speaker.display_name && t.speaker.display_name !== owner.name)
          if (extBlock) {
            if (!speakerName) speakerName = extBlock.speaker.display_name
            if (!email && extBlock.speaker.matched_calendar_invitee_email) {
              email = extBlock.speaker.matched_calendar_invitee_email
            }
          }
        } catch(e) {}
      }

      if (!speakerName && meeting.title) {
        const titleParts = meeting.title.split(':')
        if (titleParts.length > 1) {
          speakerName = titleParts[0].trim()
        } else {
          speakerName = meeting.title
        }
      }

      if (!speakerName) {
        speakerName = owner.name || meeting.speaker_name || "Unknown Speaker"
        if (!email) email = owner.email || meeting.speaker_email || ""
      } else {
        if (!email && speakerName !== owner.name) {
          email = ""
        } else if (!email) {
          email = owner.email || meeting.speaker_email || ""
        }
      }
      
      const meetingDateObj = new Date(meeting.created_at || Date.now())
      const meetingDate = meetingDateObj.toISOString().split('T')[0]
      const meetingTime = meetingDateObj.toTimeString().split(' ')[0]

      let summary = meeting.summary
      if (!summary && meeting.default_summary) {
        summary = meeting.default_summary.markdown_formatted || meeting.default_summary.text
      }
      summary = summary || "No summary available."

      const transcript = meeting.transcript || "No transcript available."
      const actionItems = meeting.action_items || []
      const fathomLink = meeting.url || meeting.video_url || ""

      const { error } = await supabaseAdmin
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

      if (error) {
        console.error(`Failed to insert meeting ${fathomId}:`, error)
      } else {
        insertedCount++
      }
    }

    return new Response(JSON.stringify({ success: true, count: insertedCount }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    console.error("Error processing request:", error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
