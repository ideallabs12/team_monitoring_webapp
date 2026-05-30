const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pzalalbpxlwtcnmkaegb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YWxhbGJweGx3dGNubWthZWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzY5NzAsImV4cCI6MjA5NTA1Mjk3MH0.fIRWi_8Q98xEqsLqk0MdarRpq1exziZIWzAaSRMCFq0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("=== PROFILES ===");
  const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, email, platform_role');
  console.log(JSON.stringify(profiles, null, 2));

  console.log("\n=== TEAMS ===");
  const { data: teams } = await supabase.from('teams').select('*');
  console.log(JSON.stringify(teams, null, 2));

  console.log("\n=== TEAM MEMBERS ===");
  const { data: members } = await supabase.from('team_members').select('user_id, team_id, team_role');
  console.log(JSON.stringify(members, null, 2));

  console.log("\n=== MONTHLY REVENUES ===");
  const { data: revenues } = await supabase.from('monthly_revenues').select('*');
  console.log(JSON.stringify(revenues, null, 2));
}

main().catch(err => console.error(err));
