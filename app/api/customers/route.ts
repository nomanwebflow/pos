import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { customerQueries } from '@/lib/db-queries'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('User')
            .select('businessId')
            .eq('id', user.id)
            .single()

        if (!profile?.businessId) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 })
        }

        const customers = await customerQueries.getAllCustomers(profile.businessId)
        return NextResponse.json(customers)
    } catch (error: any) {
        console.error('Error fetching customers:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('User')
            .select('businessId')
            .eq('id', user.id)
            .single()

        if (!profile?.businessId) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 })
        }

        const data = await request.json()
        // Validation?
        if (!data.name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const id = await customerQueries.createCustomer({
            ...data,
            businessId: profile.businessId,
            isActive: 1 // Default active
        })

        return NextResponse.json({ id, ...data }, { status: 201 })
    } catch (error: any) {
        console.error('Error creating customer:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const data = await request.json()
        if (!data.id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        await customerQueries.updateCustomer(data.id, data)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error updating customer:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        await customerQueries.deleteCustomer(id)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting customer:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
