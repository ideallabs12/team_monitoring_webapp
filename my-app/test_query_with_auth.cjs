const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pzalalbpxlwtcnmkaegb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YWxhbGJweGx3dGNubWthZWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzY5NzAsImV4cCI6MjA5NTA1Mjk3MH0.fIRWi_8Q98xEqsLqk0MdarRpq1exziZIWzAaSRMCFq0';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

async function main() {
  console.log("Signing in as admin...");
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: 'testadmin@example.com',
    password: 'password123'
  });

  if (signInError) {
     console.error("Sign in failed:", signInError.message);
     return;
  }

  const { data: targets, error } = await supabase.from('monthly_targets').select('*');
  console.log("\n=== MONTHLY TARGETS ===");
  console.log(JSON.stringify(targets, null, 2));
}

main().catch(err => console.error(err));
