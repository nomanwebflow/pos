import { NextResponse } from 'next/server'
import { productQueries } from '@/lib/db-queries'

// Default business ID for single-business setup
const DEFAULT_BUSINESS_ID = 'default-business'

export async function GET() {
  try {
    const categories = await productQueries.getCategories(DEFAULT_BUSINESS_ID)
    return NextResponse.json(categories)
  } catch (error: any) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
