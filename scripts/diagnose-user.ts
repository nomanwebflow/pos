
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const adminClient = createClient(supabaseUrl, serviceRoleKey)
const anonClient = createClient(supabaseUrl, anonKey)

const targetUserId = '514e97eb-af89-4a70-8189-83d440de0a44'

async function diagnose() {
    console.log('--- ADMIN CHECK ---')
    const { data: users, error: dbError } = await adminClient
        .from('User')
        .select('*')
        .eq('id', targetUserId)

    if (dbError) {
        console.error('Admin query error:', dbError)
    } else {
        console.log(`Admin found ${users.length} rows for user ${targetUserId}`)
        if (users.length > 0) console.log('User record:', users[0])
    }

    console.log('\n--- AUTH CHECK ---')
    // We need to sign in to test RLS effectively as that user, 
    // but hard to do without password.
    // We know the password for this user is 'password123' from previous steps.

    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
        email: 'admin@posystem.local',
        password: 'password123'
    })

    if (authError) {
        console.error('Auth login failed:', authError.message)
        return
    }

    console.log('Logged in as:', authData.user.id)

    console.log('\n--- RLS CHECK ---')
    const { data: myself, error: rlsError } = await anonClient
        .from('User')
        .select('*')
        .eq('id', targetUserId)
        .single()

    if (rlsError) {
        console.error('RLS/Anon query error:', rlsError)
    } else {
        console.log('RLS query success. Record found:', myself)
    }
}

diagnose()
