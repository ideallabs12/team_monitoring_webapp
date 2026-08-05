import { createClient } from '@supabase/supabase-js';
// Using native fetch

// --- Configuration ---
// Replace these with your actual keys
const FATHOM_API_KEY = 'cbPjoPLjlEN_Yj6SBA6lPQ.Jn8rpt11mEFZ0ConSmgHm7_GJPk7Fc1CoMq1NBdFy2Q';
const SUPABASE_URL = 'https://pzalalbpxlwtcnmkaegb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YWxhbGJweGx3dGNubWthZWdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQ3Njk3MCwiZXhwIjoyMDk1MDUyOTcwfQ.K7X11tmv9RAIvNh8qY3Dl6jTq-Lqnc_0vBJCnAt2Zfs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchHistoricalMeetings() {
  console.log("Fetching historical meetings from Fathom...");
  
  // Adjust dates as needed
  const createdAfter = '2026-08-01T00:00:00Z'; // e.g., start of this month
  
  try {
    const response = await fetch(
      `https://api.fathom.ai/external/v1/meetings?created_after=${createdAfter}&include_transcript=true&include_summary=true&include_action_items=true`,
      {
        headers: {
          'X-Api-Key': FATHOM_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Fathom API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const meetings = data.items || [];
    
    console.log(`Found ${meetings.length} meetings. Inserting into database...`);

    for (const meeting of meetings) {
      let fathomId = meeting.recording_id || meeting.id;
      if (!fathomId && meeting.url) fathomId = meeting.url.split('/').pop();
      if (!fathomId) fathomId = `fathom_${Date.now()}`;
      const owner = meeting.recorded_by || meeting.owner || {};
      
      // Try to find an external invitee first
      const externalInvitee = meeting.calendar_invitees?.find(i => i.is_external);
      let speakerName = externalInvitee?.name;
      let email = externalInvitee?.email;

      const transcriptStr = typeof meeting.transcript === 'string' ? meeting.transcript : JSON.stringify(meeting.transcript);

      // Try to extract from transcript if we still don't have it
      if ((!speakerName || !email) && transcriptStr && transcriptStr.startsWith('[')) {
        try {
          const tData = JSON.parse(transcriptStr);
          const extBlock = tData.find(t => t.speaker && t.speaker.display_name && t.speaker.display_name !== owner.name);
          if (extBlock) {
            if (!speakerName) speakerName = extBlock.speaker.display_name;
            if (!email && extBlock.speaker.matched_calendar_invitee_email) {
              email = extBlock.speaker.matched_calendar_invitee_email;
            }
          }
        } catch(e) {}
      }

      // If no external invitee or transcript match, try extracting from title
      if (!speakerName && meeting.title) {
        const titleParts = meeting.title.split(':');
        if (titleParts.length > 1) {
          speakerName = titleParts[0].trim();
        } else {
          speakerName = meeting.title;
        }
      }

      // Fallback
      if (!speakerName) {
        speakerName = owner.name || meeting.speaker_name || "Unknown Speaker";
        if (!email) email = owner.email || meeting.speaker_email || "";
      } else {
        // If we found a speaker name that isn't the owner, but couldn't find their email, leave email blank
        if (!email && speakerName !== owner.name) {
          email = "";
        } else if (!email) {
          email = owner.email || meeting.speaker_email || "";
        }
      }
      
      const meetingDateObj = new Date(meeting.created_at || Date.now());
      const meetingDate = meetingDateObj.toISOString().split('T')[0];
      const meetingTime = meetingDateObj.toTimeString().split(' ')[0];

      let summary = meeting.summary;
      if (!summary && meeting.default_summary) {
        summary = meeting.default_summary.markdown_formatted || meeting.default_summary.text;
      }
      summary = summary || "No summary available.";

      const transcript = meeting.transcript || "No transcript available.";
      const actionItems = meeting.action_items || [];
      const fathomLink = meeting.url || meeting.video_url || "";

      const { error } = await supabase
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
        }, { onConflict: 'fathom_id' });

      if (error) {
        console.error(`Failed to insert meeting ${fathomId}:`, error);
      } else {
        console.log(`Successfully synced meeting from ${meetingDate} by ${speakerName}`);
      }
    }
    
    console.log("Sync complete!");

  } catch (error) {
    console.error("Error fetching historical meetings:", error);
  }
}

fetchHistoricalMeetings();
