import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get business ID
    const { data: profile } = await supabase
      .from('User')
      .select('businessId')
      .eq('id', user.id)
      .single()

    if (!profile?.businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const businessId = profile.businessId

    // Use RPC for aggregated stats (single query instead of 10+)
    const { data: stats, error: statsError } = await supabase
      .rpc('get_dashboard_stats', { p_business_id: businessId })

    if (statsError) {
      console.error('Error fetching dashboard stats:', statsError)
      // Fallback to basic response
      return NextResponse.json({
        totalRevenue: 0,
        todayRevenue: 0,
        monthRevenue: 0,
        yearRevenue: 0,
        totalSales: 0,
        activeProducts: 0,
        totalCustomers: 0,
        todaySales: 0,
        lowStockCount: 0,
        recentSales: [],
        salesHistory: [],
        topProducts: [],
      })
    }

    // Recent Sales (still need separate query for details)
    const { data: recentSalesRaw } = await supabase
      .from('Sale')
      .select('saleNumber, total, createdAt')
      .eq('businessId', businessId)
      .order('createdAt', { ascending: false })
      .limit(5)

    const recentSales = recentSalesRaw?.map(s => ({
      saleNumber: s.saleNumber,
      total: s.total,
      createdAt: s.createdAt,
      customerName: 'Walk-in Customer'
    })) || []

    // Get sales history from RPC (last 30 days for performance)
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: salesHistoryRaw } = await supabase
      .rpc('get_sales_by_date_range', {
        p_business_id: businessId,
        p_start_date: startDate,
        p_end_date: endDate
      })

    const salesHistory = salesHistoryRaw?.map((row: any) => ({
      date: row.date,
      totalSales: Number(row.total_sales),
      subtotal: Number(row.subtotal),
      taxAmount: Number(row.tax_amount),
      total: Number(row.total)
    })) || []

    return NextResponse.json({
      totalRevenue: Number(stats?.totalRevenue || 0),
      todayRevenue: Number(stats?.todayRevenue || 0),
      monthRevenue: Number(stats?.monthRevenue || 0),
      yearRevenue: Number(stats?.yearRevenue || 0),
      totalSales: Number(stats?.totalSales || 0),
      activeProducts: Number(stats?.totalProducts || 0),
      totalCustomers: Number(stats?.totalCustomers || 0),
      todaySales: Number(stats?.todaySales || 0),
      lowStockCount: Number(stats?.lowStockCount || 0),
      recentSales,
      salesHistory,
      topProducts: [],
    })
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
