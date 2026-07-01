const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pzalalbpxlwtcnmkaegb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YWxhbGJweGx3dGNubWthZWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzY5NzAsImV4cCI6MjA5NTA1Mjk3MH0.fIRWi_8Q98xEqsLqk0MdarRpq1exziZIWzAaSRMCFq0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const adminEmail = 'testadmin@example.com';
  const adminPassword = 'password123';
  const targetEmail = 'user1@gmail.com';

  console.log("Signing in as admin...");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ 
    email: adminEmail, 
    password: adminPassword 
  });
  
  if (signInError) {
    console.error("Failed to sign in as admin:", signInError);
    return;
  }
  console.log("Signed in successfully!");

  console.log(`Fetching profile for ${targetEmail}...`);
  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('id, feature_access')
    .eq('email', targetEmail);

  if (fetchError || !profiles || profiles.length === 0) {
    console.error("Failed to fetch user profile:", fetchError || "User not found");
    return;
  }

  const user = profiles[0];
  const currentAccess = user.feature_access || {};
  const nextAccess = { ...currentAccess, attendance: true };

  console.log("Updating feature_access...");
  const { data: updateData, error: updateError } = await supabase
    .from('profiles')
    .update({ feature_access: nextAccess })
    .eq('id', user.id);

  if (updateError) {
    console.error("Failed to update feature_access:", updateError);
  } else {
    console.log("Successfully enabled attendance for", targetEmail);
  }
}

main().catch(err => console.error(err));
