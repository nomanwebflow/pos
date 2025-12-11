import { NextResponse } from 'next/server'
import { paymentQueries } from '@/lib/db-queries'

// Default business ID for single-business setup
const DEFAULT_BUSINESS_ID = 'default-business'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

    // Get payment data
    const overview = paymentQueries.getPaymentOverview(DEFAULT_BUSINESS_ID, startDate, endDate)
    const dailyBreakdown = paymentQueries.getDailyPaymentBreakdown(DEFAULT_BUSINESS_ID, startDate, endDate)
    const cashDetails = paymentQueries.getCashTransactionDetails(DEFAULT_BUSINESS_ID, startDate, endDate)
    const cardDetails = paymentQueries.getCardTransactionDetails(DEFAULT_BUSINESS_ID, startDate, endDate)
    const mixedDetails = paymentQueries.getMixedTransactionDetails(DEFAULT_BUSINESS_ID, startDate, endDate)

    return NextResponse.json({
      overview,
      dailyBreakdown,
      cashDetails,
      cardDetails,
      mixedDetails,
      dateRange: { startDate, endDate }
    })
  } catch (error: any) {
    console.error('Error fetching payment data:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
