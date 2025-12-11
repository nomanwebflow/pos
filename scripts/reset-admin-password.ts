import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function resetAdminPassword() {
  try {
    // Get the admin user
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('Error listing users:', listError)
      return
    }

    const adminUser = users.users.find(u => u.email === 'admin@posystem.local')

    if (!adminUser) {
      console.error('Admin user not found')
      return
    }

    console.log('Found admin user:', adminUser.email)

    // Update the password
    const { data, error } = await supabase.auth.admin.updateUserById(
      adminUser.id,
      { password: 'admin123' }
    )

    if (error) {
      console.error('Error updating password:', error)
      return
    }

    console.log('✅ Successfully reset admin password to: admin123')
    console.log('You can now login at http://localhost:3000/login')
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

resetAdminPassword()
