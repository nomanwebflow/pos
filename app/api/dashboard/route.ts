import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEFAULT_BUSINESS_ID = 'default-business'

export async function GET() {
  try {
    // Get total revenue and sales count
    const salesStats = db.prepare(`
      SELECT
        COUNT(*) as totalSales,
        COALESCE(SUM(total), 0) as totalRevenue
      FROM Sale
      WHERE businessId = ?
    `).get(DEFAULT_BUSINESS_ID) as { totalSales: number; totalRevenue: number }

    // Get today's sales count
    const today = new Date().toISOString().split('T')[0]
    const todaySales = db.prepare(`
      SELECT COUNT(*) as count
      FROM Sale
      WHERE businessId = ? AND DATE(createdAt) = ?
    `).get(DEFAULT_BUSINESS_ID, today) as { count: number }

    // Get active products count
    const productsCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM Product
      WHERE businessId = ? AND isActive = 1
    `).get(DEFAULT_BUSINESS_ID) as { count: number }

    // Get total customers count
    const customersCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM Customer
      WHERE businessId = ? AND isActive = 1
    `).get(DEFAULT_BUSINESS_ID) as { count: number }

    // Get recent sales (last 5)
    const recentSales = db.prepare(`
      SELECT
        s.saleNumber,
        s.total,
        s.createdAt,
        c.name as customerName
      FROM Sale s
      LEFT JOIN Customer c ON s.customerId = c.id
      WHERE s.businessId = ?
      ORDER BY s.createdAt DESC
      LIMIT 5
    `).all(DEFAULT_BUSINESS_ID)

    // Get top products
    const topProducts = db.prepare(`
      SELECT
        p.name as productName,
        p.category,
        SUM(si.quantity) as totalQuantity
      FROM SaleItem si
      JOIN Product p ON si.productId = p.id
      JOIN Sale s ON si.saleId = s.id
      WHERE s.businessId = ?
      GROUP BY si.productId
      ORDER BY totalQuantity DESC
      LIMIT 5
    `).all(DEFAULT_BUSINESS_ID)

    return NextResponse.json({
      totalRevenue: salesStats.totalRevenue || 0,
      totalSales: salesStats.totalSales || 0,
      activeProducts: productsCount.count || 0,
      totalCustomers: customersCount.count || 0,
      todaySales: todaySales.count || 0,
      recentSales,
      topProducts,
    })
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
