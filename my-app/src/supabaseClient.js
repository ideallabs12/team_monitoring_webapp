

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pzalalbpxlwtcnmkaegb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YWxhbGJweGx3dGNubWthZWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzY5NzAsImV4cCI6MjA5NTA1Mjk3MH0.fIRWi_8Q98xEqsLqk0MdarRpq1exziZIWzAaSRMCFq0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'ideallabs-auth',
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
})