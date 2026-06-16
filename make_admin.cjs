const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pzalalbpxlwtcnmkaegb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YWxhbGJweGx3dGNubWthZWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzY5NzAsImV4cCI6MjA5NTA1Mjk3MH0.fIRWi_8Q98xEqsLqk0MdarRpq1exziZIWzAaSRMCFq0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const email = 'testadmin@example.com';
  const password = 'password123';

  console.log("Signing up admin user...");
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
  
  let userId;
  if (authError) {
    if (authError.message.includes("already registered")) {
      console.log("User already registered. Fetching user...");
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      userId = signInData.user.id;
    } else {
      throw authError;
    }
  } else {
    userId = authData.user.id;
  }

  console.log("User ID:", userId);

  console.log("Updating profile to admin...");
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      first_name: 'Test',
      last_name: 'Admin',
      phone: '123-456-7890',
      email: email,
      platform_role: 'admin',
      profile_completed: true
    });

  if (profileError) {
    console.error("Profile update error:", profileError);
  } else {
    console.log("Profile updated successfully to admin!", profileData);
  }
}

main().catch(err => console.error(err));
