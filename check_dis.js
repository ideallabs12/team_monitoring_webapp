import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pzalalbpxlwtcnmkaegb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YWxhbGJweGx3dGNubWthZWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzY5NzAsImV4cCI6MjA5NTA1Mjk3MH0.fIRWi_8Q98xEqsLqk0MdarRpq1exziZIWzAaSRMCFq0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
  if (!profiles || profiles.length === 0) return console.log('No profiles found');
  const userId = profiles[0].id;
  
  const reportDataObj = {
    user_id: userId,
    team_id: null,
    report_date: '2023-01-01',
    positive_leads: 0,
    revenue_generated: 0,
    expected_revenue: 0
  };
  
  const { data, error } = await supabase
    .from('dis_reports')
    .upsert(reportDataObj, { onConflict: 'user_id,report_date' });
    
  if (error) console.error("Upsert Error:", error);
  else console.log("Upsert Success:", data);
}
main();
