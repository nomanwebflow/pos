import { NextResponse } from 'next/server'
import { reportQueries } from '@/lib/db-queries'

// Default business ID for single-business setup
const DEFAULT_BUSINESS_ID = 'default-business'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

    // Get all report data
    const overview = reportQueries.getRevenueOverview(DEFAULT_BUSINESS_ID, startDate, endDate)
    const salesByDate = reportQueries.getSalesReport(DEFAULT_BUSINESS_ID, startDate, endDate)
    const salesByCategory = reportQueries.getSalesByCategory(DEFAULT_BUSINESS_ID, startDate, endDate)
    const topProducts = reportQueries.getTopProducts(DEFAULT_BUSINESS_ID, startDate, endDate, 10)
    const salesByUser = reportQueries.getSalesByUser(DEFAULT_BUSINESS_ID, startDate, endDate)
    const detailedSales = reportQueries.getDetailedSales(DEFAULT_BUSINESS_ID, startDate, endDate)

    return NextResponse.json({
      overview,
      salesByDate,
      salesByCategory,
      topProducts,
      salesByUser,
      detailedSales,
      dateRange: { startDate, endDate }
    })
  } catch (error: any) {
    console.error('Error fetching reports:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
