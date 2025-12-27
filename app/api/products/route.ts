import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const category = searchParams.get('category')
    const barcode = searchParams.get('barcode')
    const status = searchParams.get('status') || 'active'
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const paginate = searchParams.get('paginate') === 'true'

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Verify user has permission
    const { data: profile } = await supabase
      .from('User')
      .select('role, businessId')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!profile.businessId) {
      return NextResponse.json(paginate ? { products: [], total: 0 } : [])
    }

    // Select only needed columns for performance
    let productsQuery = supabase
      .from('Product')
      .select('id, name, sku, barcode, category, sellingPrice, costPrice, stockLevel, lowStockThreshold, isActive, taxable, imageUrl', { count: paginate ? 'exact' : undefined })
      .eq('businessId', profile.businessId)
      .order('name', { ascending: true })

    if (status === 'active') {
      productsQuery = productsQuery.eq('isActive', true)
    } else if (status === 'draft') {
      productsQuery = productsQuery.eq('isActive', false)
    }

    if (barcode) {
      productsQuery = productsQuery.eq('sku', barcode)
    } else if (query) {
      productsQuery = productsQuery.or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
    } else if (category) {
      productsQuery = productsQuery.eq('category', category)
    }

    // Apply pagination
    productsQuery = productsQuery.range(offset, offset + limit - 1)

    const { data: products, error, count } = await productsQuery

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[DEBUG] Products fetched:', products?.length || 0, 'products for user:', user.email)

    // Transform to match expected format
    const transformedProducts = products?.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku || '',
      barcode: p.sku, // Using SKU as barcode
      category: p.category,
      sellingPrice: parseFloat(p.sellingPrice?.toString() || '0'),
      costPrice: parseFloat(p.costPrice?.toString() || '0'),
      stockLevel: p.stockLevel || 0,
      lowStockThreshold: p.lowStockThreshold || 10,
      isActive: p.isActive === true || p.isActive === 1 ? 1 : 0,
      taxable: p.taxable ? 1 : 0,
      imageUrl: p.imageUrl || null,
    })) || []

    // Return paginated response if requested
    if (paginate) {
      return NextResponse.json({
        products: transformedProducts,
        total: count || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0)
      })
    }

    return NextResponse.json(transformedProducts)
  } catch (error: any) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

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

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const data = await request.json()

    // Check authentication and Get Business ID
    const businessId = await getBusinessId(supabase)
    if (!businessId) {
      return NextResponse.json({ error: 'Unauthorized or Business not found' }, { status: 401 })
    }

    // Insert product
    const { data: product, error } = await supabase
      .from('Product')
      .insert({
        id: uuidv4(),
        name: data.name,
        description: data.description,
        sellingPrice: data.sellingPrice,
        costPrice: data.costPrice,
        stockLevel: data.stockLevel || 0,
        lowStockThreshold: data.lowStockThreshold || 10,
        sku: data.sku,
        category: data.category,
        isActive: true,
        businessId: businessId, // Use fetched businessId
        imageUrl: data.imageUrl || null,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating product:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: product.id, success: true })
  } catch (error: any) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const data = await request.json()
    const { id, ...updates } = data

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update product
    const { data: product, error } = await supabase
      .from('Product')
      .update({
        name: updates.name,
        description: updates.description,
        sellingPrice: updates.sellingPrice,
        costPrice: updates.costPrice,
        stockLevel: updates.stockLevel,
        lowStockThreshold: updates.lowStockThreshold,
        sku: updates.sku,
        category: updates.category,
        isActive: updates.isActive,
        imageUrl: updates.imageUrl,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating product:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, product })
  } catch (error: any) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
