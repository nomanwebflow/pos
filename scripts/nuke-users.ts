
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function nukeUsers() {
    console.log('WARNING: This will delete ALL users from the system.')
    console.log('Fetching users...')

    let hasMore = true
    let page = 1
    const perPage = 50

    while (hasMore) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({
            page,
            perPage
        })

        if (error) {
            console.error('Error listing users:', error)
            process.exit(1)
        }

        if (users.length === 0) {
            hasMore = false
            break
        }

        console.log(`Found ${users.length} users on page ${page}. Deleting...`)

        for (const user of users) {
            console.log(`Deleting user: ${user.email} (${user.id})`)
            const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
            if (deleteError) {
                console.error(`Failed to delete user ${user.id}:`, deleteError.message)
            } else {
                console.log(`Deleted auth user ${user.id}`)
            }
        }

        page++
    }

    // Also clean up public tables if they weren't cascaded
    console.log('Cleaning up public.User table...')
    const { error: dbError } = await supabase.from('User').delete().neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
    if (dbError) {
        console.error('Error cleaning public.User:', dbError.message)
    } else {
        console.log('Public User table cleared.')
    }

    console.log('All users removed successfully.')
}

nukeUsers().catch(console.error)
