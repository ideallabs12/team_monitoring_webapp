import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://pzalalbpxlwtcnmkaegb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YWxhbGJweGx3dGNubWthZWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzY5NzAsImV4cCI6MjA5NTA1Mjk3MH0.fIRWi_8Q98xEqsLqk0MdarRpq1exziZIWzAaSRMCFq0'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function fetchUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')

  if (error) {
    console.error('Error:', error)
    return
  }
  
  const results = []

  for (const user of data) {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim()
    const identifier = fullName || user.email

    results.push({
      email: user.email,
      name: identifier,
      first_name: user.first_name || '',
      last_name: user.last_name || ''
    })
  }

  fs.writeFileSync('users_list.json', JSON.stringify({ results }, null, 2))
  console.log('Saved to users_list.json')
}

fetchUsers()
