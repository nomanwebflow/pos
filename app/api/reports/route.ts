import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { reportQueries } from '@/lib/db-queries'

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
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

    // Get all report data
    const [overview, salesByDate, salesByCategory, topProducts, salesByUser, detailedSales] = await Promise.all([
      reportQueries.getRevenueOverview(businessId, startDate, endDate),
      reportQueries.getSalesReport(businessId, startDate, endDate),
      reportQueries.getSalesByCategory(businessId, startDate, endDate),
      reportQueries.getTopProducts(businessId, startDate, endDate, 10),
      reportQueries.getSalesByUser(businessId, startDate, endDate),
      reportQueries.getDetailedSales(businessId, startDate, endDate)
    ])

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
