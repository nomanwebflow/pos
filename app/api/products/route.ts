import { NextResponse } from 'next/server'
import { productQueries } from '@/lib/db-queries'

// Default business ID for single-business setup
const DEFAULT_BUSINESS_ID = 'default-business'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const category = searchParams.get('category')
    const barcode = searchParams.get('barcode')

    let products

    if (barcode) {
      const product = productQueries.getProductByBarcode(barcode, DEFAULT_BUSINESS_ID)
      products = product ? [product] : []
    } else if (query) {
      products = productQueries.searchProducts(query, DEFAULT_BUSINESS_ID)
    } else if (category) {
      products = productQueries.getProductsByCategory(category, DEFAULT_BUSINESS_ID)
    } else {
      products = productQueries.getAllProducts(DEFAULT_BUSINESS_ID)
    }

    return NextResponse.json(products)
  } catch (error: any) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const productId = productQueries.createProduct({
      ...data,
      businessId: DEFAULT_BUSINESS_ID,
      taxable: data.taxable ? 1 : 0,
      isActive: 1
    })

    return NextResponse.json({ id: productId, success: true })
  } catch (error: any) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
