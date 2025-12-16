import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
    try {
        const data = await request.json()
        const { businessName, name, email, password } = data

        // Validate inputs
        if (!businessName || !name || !email || !password) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()
        const supabase = await createClient() // For non-admin operations if needed, mainly adminClient here

        // 1. Create Business
        // We use adminClient to bypass RLS since the user isn't logged in yet
        const { data: business, error: businessError } = await adminClient
            .from('Business')
            .insert({
                name: businessName,
                currency: 'USD', // Default
                taxRate: 15.0
            })
            .select()
            .single()

        if (businessError) {
            console.error('Error creating business:', businessError)
            return NextResponse.json(
                { error: 'Failed to create business', details: businessError.message },
                { status: 500 }
            )
        }

        // 2. Create Auth User
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                name,
                // We can store businessId in metadata for easy access, 
                // though the User table is the source of truth.
                businessId: business.id
            }
        })

        if (authError || !authData.user) {
            // Rollback business? (Optional, but good practice)
            // await adminClient.from('Business').delete().eq('id', business.id)
            console.error('Error creating auth user:', authError)
            return NextResponse.json(
                { error: authError?.message || 'Failed to create user' },
                { status: 400 }
            )
        }

        // 3. Create Public User Profile (Linked to Business)
        // We use upsert to handle race condition with triggers
        const { error: profileError } = await adminClient
            .from('User')
            .upsert({
                id: authData.user.id,
                email,
                name,
                role: 'OWNER',
                businessId: business.id,
                isActive: true,
                password: 'hashed' // Legacy field
            })

        if (profileError) {
            console.error('Error creating profile:', profileError)
            // Attempt cleanup
            await adminClient.auth.admin.deleteUser(authData.user.id)
            return NextResponse.json(
                { error: 'Failed to create user profile', details: profileError.message },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true, businessId: business.id })

    } catch (error: any) {
        console.error('Signup error:', error)
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        )
    }
}
