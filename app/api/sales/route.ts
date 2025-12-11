import { NextResponse } from 'next/server'
import { salesQueries } from '@/lib/db-queries'

// Default business ID for single-business setup
const DEFAULT_BUSINESS_ID = 'default-business'
const DEFAULT_USER_ID = 'user-admin@demostore.mu'

export async function POST(request: Request) {
  try {
    const data = await request.json()

    const { saleId, saleNumber } = salesQueries.createSale(
      {
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        discount: data.discount || 0,
        total: data.total,
        paymentMethod: data.paymentMethod,
        cashReceived: data.cashReceived || null,
        cashChange: data.cashChange || null,
        cardAmount: data.cardAmount || null,
        notes: data.notes || null,
        userId: DEFAULT_USER_ID,
        businessId: DEFAULT_BUSINESS_ID,
      },
      data.items
    )

    return NextResponse.json({
      success: true,
      saleId,
      saleNumber
    })
  } catch (error: any) {
    console.error('Error creating sale:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const saleId = searchParams.get('id')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    if (saleId) {
      const sale = salesQueries.getSaleById(saleId)
      return NextResponse.json(sale)
    }

    // If date range provided, use it
    if (startDate && endDate) {
      const sales = salesQueries.getSalesByDateRange(DEFAULT_BUSINESS_ID, startDate, endDate)
      return NextResponse.json({ sales })
    }

    // Default to today's sales
    const sales = salesQueries.getTodaySales(DEFAULT_BUSINESS_ID)
    const stats = salesQueries.getSalesStats(DEFAULT_BUSINESS_ID, date)

    return NextResponse.json({ sales, stats })
  } catch (error: any) {
    console.error('Error fetching sales:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
