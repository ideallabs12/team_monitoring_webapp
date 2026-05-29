import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pzalalbpxlwtcnmkaegb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YWxhbGJweGx3dGNubWthZWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzY5NzAsImV4cCI6MjA5NTA1Mjk3MH0.fIRWi_8Q98xEqsLqk0MdarRpq1exziZIWzAaSRMCFq0'
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
})

async function seed() {
  console.log("Starting seed process using Official Supabase API...")

  console.log("Fetching Existing Teams...")
  const { data: teams, error: teamsError } = await supabase.from('teams').select('id').limit(8)
  if (teamsError || !teams || teams.length < 8) {
    console.error("Could not fetch 8 teams. Error:", teamsError)
    return;
  }
  const teamIds = teams.map(t => t.id)

  const users = []
  console.log("Signing up 58 test users (this ensures perfect GoTrue auth state)...")
  for (let i = 1; i <= 58; i++) {
    const email = `testuser${i}@example.com`
    const password = 'password123'
    
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) {
      console.error(`Error signing up ${email}:`, authError.message)
      continue
    }
    
    const userId = authData.user.id
    users.push(userId)

    await supabase.from('profiles').upsert({
      id: userId,
      first_name: 'Test',
      last_name: `User ${i}`,
      phone: `555-020${i}`,
      email: email,
      platform_role: 'user',
      profile_completed: true
    })
  }

  console.log("Assigning users to teams...")
  const memberships = []
  
  for (let i = 0; i < 56; i++) {
    const teamIndex = Math.floor(i / 8)
    const role = (i % 8 === 0) ? 'lead' : 'member'
    if (users[i]) {
      memberships.push({ user_id: users[i], team_id: teamIds[teamIndex], team_role: role })
    }
  }
  
  if (users[56]) memberships.push({ user_id: users[56], team_id: teamIds[7], team_role: 'lead' })
  if (users[57]) memberships.push({ user_id: users[57], team_id: teamIds[7], team_role: 'member' })
  for (let i = 48; i < 54; i++) {
    if (users[i]) memberships.push({ user_id: users[i], team_id: teamIds[7], team_role: 'member' })
  }

  const { error: memError } = await supabase.from('team_members').upsert(memberships, { onConflict: 'user_id, team_id' })
  if (memError) console.error("Membership error:", memError)

  console.log("Generating monthly revenues...")
  const revenues = []
  for (const m of memberships) {
    revenues.push({
      user_id: m.user_id,
      team_id: m.team_id,
      revenue_month: '2023-10-01',
      amount: Math.floor(Math.random() * 5000 + 1000),
      entered_by: m.user_id
    })
  }
  
  const { error: revError } = await supabase.from('monthly_revenues').upsert(revenues, { onConflict: 'user_id, team_id, revenue_month' })
  if (revError) console.error("Revenue error:", revError)

  console.log("Seed complete! You can now login with testuser1@example.com / password123")
}

seed()
