import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { reportQueries } from '@/lib/db-queries'

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

    // Basic stats
    const { count: totalSales } = await supabase.from('Sale').select('*', { count: 'exact', head: true }).eq('businessId', businessId)
    const { count: activeProducts } = await supabase.from('Product').select('*', { count: 'exact', head: true }).eq('businessId', businessId).eq('isActive', true)
    const { count: totalCustomers } = await supabase.from('Customer').select('*', { count: 'exact', head: true }).eq('businessId', businessId)

    // Today sales
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const { count: todaySales } = await supabase.from('Sale')
      .select('*', { count: 'exact', head: true })
      .eq('businessId', businessId)
      .gte('createdAt', `${todayStr}T00:00:00`)

    // Today Revenue
    const { data: todaySalesData } = await supabase.from('Sale').select('total').eq('businessId', businessId).gte('createdAt', `${todayStr}T00:00:00`)
    const todayRevenue = todaySalesData?.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0

    // Month Revenue
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
    const { data: monthSalesData } = await supabase.from('Sale').select('total').eq('businessId', businessId).gte('createdAt', `${startOfMonth}T00:00:00`)
    const monthRevenue = monthSalesData?.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0

    // Year Revenue
    const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]
    const { data: yearSalesData } = await supabase.from('Sale').select('total').eq('businessId', businessId).gte('createdAt', `${startOfYear}T00:00:00`)
    const yearRevenue = yearSalesData?.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0

    // Revenue (Fetching all for sum - optimization needed for large scale)
    const { data: allSales } = await supabase.from('Sale').select('total').eq('businessId', businessId)
    const totalRevenue = allSales?.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0

    // Recent Sales
    const { data: recentSalesRaw } = await supabase
      .from('Sale')
      .select(`
        saleNumber,
        total,
        createdAt
      `)
      .eq('businessId', businessId)
      .order('createdAt', { ascending: false })
      .limit(5)

    const recentSales = recentSalesRaw?.map(s => ({
      saleNumber: s.saleNumber,
      total: s.total,
      createdAt: s.createdAt,
      customerName: 'Walk-in Customer' // TODO: Join with Customer to get name
    })) || []

    // Sales History (Last 90 days)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const startDate = ninetyDaysAgo.toISOString().split('T')[0]

    const salesHistory = await reportQueries.getSalesReport(businessId, startDate, todayStr)

    return NextResponse.json({
      totalRevenue,
      todayRevenue,
      monthRevenue,
      yearRevenue,
      totalSales: totalSales || 0,
      activeProducts: activeProducts || 0,
      totalCustomers: totalCustomers || 0,
      todaySales: todaySales || 0,
      recentSales,
      salesHistory, // Pass to frontend
      topProducts: [], // Placeholder for now
    })
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
