
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkEnum() {
    console.log('Testing UserRole enum...')

    // Try to create a user with role CASHIER
    const { error: cashierError } = await supabase.from('User').insert({
        id: '00000000-0000-0000-0000-000000000001', // Dummy ID
        email: 'test_cashier@test.com',
        name: 'Test Cashier',
        role: 'CASHIER',
        businessId: '11111111-1111-1111-1111-111111111111',
        isActive: true
    })

    if (cashierError) {
        console.error('Initial CASHIER insert failed:', cashierError.message)

        // Try lowercase
        const { error: lowerCaseError } = await supabase.from('User').insert({
            id: '00000000-0000-0000-0000-000000000002',
            email: 'test_cashier_lower@test.com',
            name: 'Test Cashier Lower',
            role: 'cashier',
            businessId: '11111111-1111-1111-1111-111111111111',
            isActive: true
        })

        if (lowerCaseError) {
            console.error('Lowercase insert failed:', lowerCaseError.message)
        } else {
            console.log('SUCCESS: Role "cashier" (lowercase) IS valid.')
            // Cleanup
            await supabase.from('User').delete().eq('id', '00000000-0000-0000-0000-000000000002')
        }

        // Try Title Case
        const { error: titleCaseError } = await supabase.from('User').insert({
            id: '00000000-0000-0000-0000-000000000003',
            email: 'test_cashier_title@test.com',
            name: 'Test Cashier Title',
            role: 'Cashier',
            businessId: '11111111-1111-1111-1111-111111111111',
            isActive: true
        })

        if (titleCaseError) {
            console.error('Title Case insert failed:', titleCaseError.message)
        } else {
            console.log('SUCCESS: Role "Cashier" (Title Case) IS valid.')
            await supabase.from('User').delete().eq('id', '00000000-0000-0000-0000-000000000003')
        }
    } else {
        console.log('SUCCESS: Role "CASHIER" (uppercase) IS valid.')
        // Cleanup
        await supabase.from('User').delete().eq('id', '00000000-0000-0000-0000-000000000001')
    }
}

checkEnum()
