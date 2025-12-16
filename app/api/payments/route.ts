import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paymentQueries } from '@/lib/db-queries'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile for businessId
    const { data: profile } = await supabase
      .from('User')
      .select('businessId')
      .eq('id', user.id)
      .single()

    if (!profile?.businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const businessId = profile.businessId

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

    // Get payment data
    const [overview, dailyBreakdown, cashDetails, cardDetails, mixedDetails] = await Promise.all([
      paymentQueries.getPaymentOverview(businessId, startDate, endDate),
      paymentQueries.getDailyPaymentBreakdown(businessId, startDate, endDate),
      paymentQueries.getCashTransactionDetails(businessId, startDate, endDate),
      paymentQueries.getCardTransactionDetails(businessId, startDate, endDate),
      paymentQueries.getMixedTransactionDetails(businessId, startDate, endDate) // Assuming this exists or I'll check db-queries again
    ])

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
