import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Default business ID for single-business setup
const DEFAULT_BUSINESS_ID = 'default-business'

export async function GET(request: Request) {
  try {
    // Get business information
    const business = db.prepare(`
      SELECT * FROM Business WHERE id = ?
    `).get(DEFAULT_BUSINESS_ID)

    return NextResponse.json({ business })
  } catch (error: any) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json()

    db.prepare(`
      UPDATE Business
      SET name = ?,
          address = ?,
          phone = ?,
          email = ?,
          taxNumber = ?,
          currency = ?,
          taxRate = ?,
          updatedAt = ?
      WHERE id = ?
    `).run(
      data.name,
      data.address,
      data.phone,
      data.email,
      data.taxNumber,
      data.currency,
      data.taxRate,
      new Date().toISOString(),
      DEFAULT_BUSINESS_ID
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
