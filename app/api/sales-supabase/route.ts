import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Generate a unique sale number (format: SALE-YYYYMMDD-XXXX)
function generateSaleNumber() {
  const date = new Date()
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `SALE-${dateStr}-${random}`
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

    // Verify user has permission (SUPER_ADMIN or CASHIER can create transactions)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'SUPER_ADMIN' && profile.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const saleNumber = generateSaleNumber()

    // Create transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        total_amount: data.total,
        payment_method: data.paymentMethod,
        status: 'completed',
        notes: data.notes || null,
        customer_id: data.customerId || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Error creating transaction:', transactionError)
      return NextResponse.json({ error: transactionError.message }, { status: 500 })
    }

    // Create transaction items and update stock
    const itemPromises = data.items.map(async (item: any) => {
      // Insert transaction item
      const { error: itemError } = await supabase
        .from('transaction_items')
        .insert({
          transaction_id: transaction.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          subtotal: item.subtotal,
        })

      if (itemError) {
        console.error('Error creating transaction item:', itemError)
        throw new Error(`Failed to create transaction item: ${itemError.message}`)
      }

      // Update product stock
      const { data: product } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', item.productId)
        .single()

      if (product) {
        const newStock = product.stock_quantity - item.quantity
        const { error: stockError } = await supabase
          .from('products')
          .update({
            stock_quantity: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.productId)

        if (stockError) {
          console.error('Error updating stock:', stockError)
          throw new Error(`Failed to update stock: ${stockError.message}`)
        }
      }
    })

    await Promise.all(itemPromises)

    return NextResponse.json({
      success: true,
      saleId: transaction.id,
      saleNumber,
    })
  } catch (error: any) {
    console.error('Error creating sale:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const saleId = searchParams.get('id')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has permission (SUPER_ADMIN can view all transactions)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    if (saleId) {
      // Get specific sale with items
      const { data: transaction, error } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_items (
            *,
            products (name, sku)
          ),
          customers (name, email, phone)
        `)
        .eq('id', saleId)
        .single()

      if (error) {
        console.error('Error fetching sale:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(transaction)
    }

    // Get sales list with optional date range
    let query = supabase
      .from('transactions')
      .select(`
        *,
        transaction_items (count)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (startDate && endDate) {
      query = query
        .gte('created_at', startDate)
        .lte('created_at', endDate)
    } else {
      // Default to today's sales
      const today = new Date().toISOString().split('T')[0]
      query = query
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
    }

    const { data: sales, error } = await query

    if (error) {
      console.error('Error fetching sales:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate stats
    const stats = {
      totalSales: sales?.length || 0,
      totalRevenue: sales?.reduce((sum, sale) => sum + parseFloat(sale.total_amount?.toString() || '0'), 0) || 0,
      totalItems: sales?.reduce((sum, sale) => {
        const itemCount = sale.transaction_items?.[0]?.count || 0
        return sum + itemCount
      }, 0) || 0,
    }

    return NextResponse.json({ sales, stats })
  } catch (error: any) {
    console.error('Error fetching sales:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
