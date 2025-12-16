import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

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

    // Verify user has permission (SUPER_ADMIN, CASHIER, or OWNER can create transactions)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, businessId')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'SUPER_ADMIN' && profile.role !== 'CASHIER' && profile.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    if (!profile.businessId) {
      return NextResponse.json({ error: 'User does not belong to a business' }, { status: 400 })
    }

    const saleNumber = generateSaleNumber()
    const transactionId = uuidv4()

    // Create transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('Sale')
      .insert({
        id: transactionId,
        total: data.total,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        discount: data.discount || 0,
        paymentMethod: data.paymentMethod,
        cardAmount: data.cardAmount,
        cashReceived: data.cashReceived,
        cashChange: data.cashChange,
        status: 'completed',
        notes: data.notes || null,
        customerId: data.customerId || null,
        userId: user.id,
        saleNumber: saleNumber,
        businessId: profile.businessId,
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
        .from('SaleItem')
        .insert({
          id: uuidv4(),
          saleId: transaction.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          taxAmount: item.taxAmount || 0,
          total: item.total || item.subtotal,
        })

      if (itemError) {
        console.error('Error creating transaction item:', itemError)
        throw new Error(`Failed to create transaction item: ${itemError.message}`)
      }

      // Update product stock
      const { data: product } = await supabase
        .from('Product')
        .select('stockLevel')
        .eq('id', item.productId)
        .single()

      if (product) {
        // stockLevel might be null for non-inventory items, treat as 0 or skip? 
        // Assuming products have stockLevel.
        const currentStock = product.stockLevel || 0
        const newStock = currentStock - item.quantity
        const { error: stockError } = await supabase
          .from('Product')
          .update({
            stockLevel: newStock,
            updatedAt: new Date().toISOString(),
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

    // Verify user has permission (SUPER_ADMIN or OWNER can view all transactions)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'SUPER_ADMIN' && profile.role !== 'OWNER' && profile.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    if (saleId) {
      // Use service role to bypass RLS for SaleItem fetch logic which might be restrictive for Cashiers
      const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Get specific sale with items
      const { data: transaction, error } = await adminClient
        .from('Sale')
        .select(`
          *,
          SaleItem (
            *,
            Product (name, sku)
          ),
          Customer (name, email, phone)
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
      .from('Sale')
      .select(`
        *,
        SaleItem (count)
      `)
      .order('createdAt', { ascending: false })
      .limit(100)

    if (startDate && endDate) {
      // Ensure endDate includes the full day
      const endDateTime = endDate.includes('T') ? endDate : `${endDate}T23:59:59`
      query = query
        .gte('createdAt', startDate)
        .lte('createdAt', endDateTime)
    } else {
      // Default to today's sales
      const today = new Date().toISOString().split('T')[0]
      query = query
        .gte('createdAt', `${today}T00:00:00`)
        .lte('createdAt', `${today}T23:59:59`)
    }

    const { data: sales, error } = await query

    if (error) {
      console.error('Error fetching sales:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate stats
    const stats = {
      totalSales: sales?.length || 0,
      totalRevenue: sales?.reduce((sum, sale) => sum + parseFloat(sale.total?.toString() || '0'), 0) || 0,
      totalItems: sales?.reduce((sum, sale) => {
        const itemCount = sale.SaleItem?.[0]?.count || 0
        return sum + itemCount
      }, 0) || 0,
    }

    return NextResponse.json({ sales, stats })
  } catch (error: any) {
    console.error('Error fetching sales:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
