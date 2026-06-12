const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pzalalbpxlwtcnmkaegb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YWxhbGJweGx3dGNubWthZWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzY5NzAsImV4cCI6MjA5NTA1Mjk3MH0.fIRWi_8Q98xEqsLqk0MdarRpq1exziZIWzAaSRMCFq0';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

async function main() {
  await supabase.auth.signInWithPassword({
    email: 'testadmin@example.com',
    password: 'password123'
  });

  const { data: profiles } = await supabase.from('profiles').select('*');
  const { data: revenues } = await supabase.from('monthly_revenues').select('*');

  const abdul = profiles.find(p => p.email.includes('abdul'));
  const vara = profiles.find(p => p.email.includes('varam'));

  console.log(`Abdul Basheer (ID: ${abdul.id})`);
  console.log(`D Varalaxmi (ID: ${vara.id})`);

  console.log("\n=== Abdul Basheer Monthly Revenues ===");
  const abdulRevs = revenues.filter(r => r.user_id === abdul.id);
  const abdulByMonth = {};
  abdulRevs.forEach(r => {
    const m = r.revenue_month.substring(0, 7);
    abdulByMonth[m] = (abdulByMonth[m] || 0) + Number(r.amount);
  });
  console.log(abdulByMonth);

  console.log("\n=== D Varalaxmi Monthly Revenues ===");
  const varaRevs = revenues.filter(r => r.user_id === vara.id);
  const varaByMonth = {};
  varaRevs.forEach(r => {
    const m = r.revenue_month.substring(0, 7);
    varaByMonth[m] = (varaByMonth[m] || 0) + Number(r.amount);
  });
  console.log(varaByMonth);
}

main().catch(err => console.error(err));
