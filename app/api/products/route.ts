import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { productQueries } from '@/lib/db-queries'

export const dynamic = 'force-dynamic'

// Helper to get business ID
async function getBusinessId(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from('User')
        .select('businessId')
        .eq('id', user.id)
        .single()

    return profile?.businessId
}

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const businessId = await getBusinessId(supabase)

        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized or Business not found' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const query = searchParams.get('q')
        const category = searchParams.get('category')
        const barcode = searchParams.get('barcode')

        let products

        if (barcode) {
            const product = await productQueries.getProductByBarcode(barcode, businessId)
            products = product ? [product] : []
        } else if (query) {
            products = await productQueries.searchProducts(query, businessId)
        } else if (category) {
            products = await productQueries.getProductsByCategory(category, businessId)
        } else {
            products = await productQueries.getAllProducts(businessId)
        }

        return NextResponse.json(products)
    } catch (error: any) {
        console.error('Error fetching products:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const businessId = await getBusinessId(supabase)

        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const data = await request.json()
        const productId = await productQueries.createProduct({
            ...data,
            businessId: businessId,
            taxable: data.taxable ? 1 : 0,
            isActive: 1
        })

        return NextResponse.json({ id: productId, success: true })
    } catch (error: any) {
        console.error('Error creating product:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const supabase = await createClient()
        const businessId = await getBusinessId(supabase)

        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const data = await request.json()
        const { id, ...updates } = data

        if (!id) {
            return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
        }

        await productQueries.updateProduct(id, updates)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error updating product:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const businessId = await getBusinessId(supabase)

        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
        }

        // Soft delete
        await productQueries.updateProduct(id, { isActive: 0 })
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting product:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
