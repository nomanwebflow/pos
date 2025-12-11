import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const category = searchParams.get('category')
    const barcode = searchParams.get('barcode')

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let productsQuery = supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (barcode) {
      productsQuery = productsQuery.eq('sku', barcode)
    } else if (query) {
      productsQuery = productsQuery.or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
    } else if (category) {
      productsQuery = productsQuery.eq('category', category)
    }

    const { data: products, error } = await productsQuery

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
      sellingPrice: parseFloat(p.price?.toString() || '0'),
      stockLevel: p.stock_quantity || 0,
      taxable: 1, // All products are taxable by default
    })) || []

    return NextResponse.json(transformedProducts)
  } catch (error: any) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const data = await request.json()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Insert product
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name: data.name,
        description: data.description,
        price: data.sellingPrice,
        stock_quantity: data.stockLevel || 0,
        sku: data.sku,
        category: data.category,
        is_active: true,
        created_by: user.id,
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
      .from('products')
      .update({
        name: updates.name,
        description: updates.description,
        price: updates.sellingPrice,
        stock_quantity: updates.stockLevel,
        sku: updates.sku,
        category: updates.category,
        updated_at: new Date().toISOString(),
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
