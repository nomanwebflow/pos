import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { customerQueries } from '@/lib/db-queries'
import { CustomerSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '100')
        const offset = parseInt(searchParams.get('offset') || '0')
        const paginate = searchParams.get('paginate') === 'true'
        const search = searchParams.get('q')

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
            return NextResponse.json(paginate ? { customers: [], total: 0 } : [], { status: paginate ? 200 : 404 })
        }

        // Build query with pagination
        let query = supabase
            .from('Customer')
            .select('id, name, email, phone, address, taxNumber, notes, isActive, createdAt, updatedAt', { count: paginate ? 'exact' : undefined })
            .eq('businessId', profile.businessId)
            .order('name', { ascending: true })

        if (search) {
            query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
        }

        query = query.range(offset, offset + limit - 1)

        const { data: customers, error, count } = await query

        if (error) {
            console.error('Error fetching customers:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (paginate) {
            return NextResponse.json({
                customers: customers || [],
                total: count || 0,
                limit,
                offset,
                hasMore: (offset + limit) < (count || 0)
            })
        }

        return NextResponse.json(customers || [])
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

        const json = await request.json()
        const validation = CustomerSchema.safeParse(json)

        if (!validation.success) {
            return NextResponse.json({
                error: 'Validation Error',
                details: validation.error.format()
            }, { status: 400 })
        }

        const data = validation.data

        const id = await customerQueries.createCustomer({
            ...data,
            email: data.email ?? null,
            phone: data.phone ?? null,
            address: data.address ?? null,
            taxNumber: data.taxNumber ?? null,
            notes: data.notes ?? null,
            businessId: profile.businessId,
            isActive: (data.isActive === true || data.isActive === 1) ? 1 : 0
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

        const json = await request.json()
        if (!json.id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        const validation = CustomerSchema.partial().safeParse(json)
        if (!validation.success) {
            return NextResponse.json({
                error: 'Validation Error',
                details: validation.error.format()
            }, { status: 400 })
        }
        const data = validation.data
        // Map types if necessary (e.g. isActive boolean to number)
        const updates: any = { ...data }
        if (data.isActive !== undefined) {
            updates.isActive = (data.isActive === true || data.isActive === 1) ? 1 : 0
        }

        await customerQueries.updateCustomer(json.id, updates)
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

        const { data: profile } = await supabase
            .from('User')
            .select('businessId')
            .eq('id', user.id)
            .single()

        if (!profile?.businessId) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        await customerQueries.deleteCustomer(id, profile.businessId)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting customer:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
