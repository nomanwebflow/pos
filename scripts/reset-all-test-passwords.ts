import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const testAccounts = [
  { email: 'admin@posystem.local', password: 'admin123' },
  { email: 'cashier@posystem.local', password: 'cashier123' },
  { email: 'stock@posystem.local', password: 'stock123' }
]

async function resetAllPasswords() {
  try {
    // Get all users
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('Error listing users:', listError)
      return
    }

    console.log('Resetting passwords for test accounts...\n')

    for (const account of testAccounts) {
      const user = users.users.find(u => u.email === account.email)

      if (!user) {
        console.log(`❌ User not found: ${account.email}`)
        continue
      }

      const { error } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: account.password }
      )

      if (error) {
        console.log(`❌ Error updating ${account.email}:`, error.message)
      } else {
        console.log(`✅ ${account.email} → ${account.password}`)
      }
    }

    console.log('\n✅ All test account passwords have been reset!')
    console.log('\nYou can now login at http://localhost:3000/login with:')
    console.log('  • admin@posystem.local / admin123 (SUPER_ADMIN)')
    console.log('  • cashier@posystem.local / cashier123 (CASHIER)')
    console.log('  • stock@posystem.local / stock123 (STOCK_MANAGER)')
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

resetAllPasswords()
