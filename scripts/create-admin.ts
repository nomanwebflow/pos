
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

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function fixUser() {
    console.log('Starting user repair...')

    // 1. Get the auth user (we'll assume we're fixing the user associated with the known email/password or just listing all)
    const email = 'admin@posystem.local' // The email being used

    // Find auth user
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) throw listError

    const user = users.find(u => u.email === email)

    if (!user) {
        console.log('Auth user not found! Creating...')
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email,
            password: 'password123',
            email_confirm: true,
            user_metadata: { name: 'Admin User' }
        })
        if (createError) throw createError
        console.log('Created auth user:', newUser.user.id)

        await createProfile(newUser.user.id)
        return
    }

    console.log('Found auth user:', user.id)
    await createProfile(user.id)
}

async function createProfile(userId: string) {
    // 2. Check if Business exists
    const businessId = '11111111-1111-1111-1111-111111111111' // Valid UUID
    const { data: business } = await supabase.from('Business').select('*').eq('id', businessId).single()

    if (!business) {
        console.log('Creating default business...')
        const { error: busError } = await supabase.from('Business').insert({
            id: businessId,
            name: 'POS System',
            currency: 'MUR',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        })
        if (busError) console.error('Error creating business:', busError)
    } else {
        console.log('Business exists:', business.id)
    }

    // 3. Check if Public User profile exists
    const { data: profile } = await supabase.from('User').select('*').eq('id', userId).single()

    if (!profile) {
        console.log('Creating missing User profile...')
        const { error: profileError } = await supabase.from('User').insert({
            id: userId,
            email: 'admin@posystem.local',
            name: 'Admin User',
            role: 'OWNER', // Fix role to OWNER
            businessId: businessId,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        })
        if (profileError) {
            console.error('Error creating profile:', profileError)
        } else {
            console.log('User profile created successfully!')
        }
    } else {
        console.log('User profile exists. Updating to OWNER...')
        const { error: updateError } = await supabase.from('User').update({ role: 'OWNER', isActive: true, businessId: businessId }).eq('id', userId)
        if (updateError) console.error(updateError)
    }

    console.log('Done.')
}

fixUser().catch(console.error)
