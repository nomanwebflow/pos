import { NextResponse } from 'next/server'
import { categoryQueries } from '@/lib/db-queries'

// Default business ID for single-business setup
const DEFAULT_BUSINESS_ID = 'default-business'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const search = searchParams.get('search')

    if (id) {
      const category = categoryQueries.getCategoryById(id)
      return NextResponse.json(category)
    }

    if (search) {
      const categories = categoryQueries.searchCategories(DEFAULT_BUSINESS_ID, search)
      return NextResponse.json(categories)
    }

    const categories = categoryQueries.getAllCategories(DEFAULT_BUSINESS_ID)
    return NextResponse.json(categories)
  } catch (error: any) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()

    const categoryId = categoryQueries.createCategory({
      name: data.name,
      description: data.description || null,
      isActive: 1,
      businessId: DEFAULT_BUSINESS_ID,
    })

    return NextResponse.json({ success: true, id: categoryId })
  } catch (error: any) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json()
    const { id, ...updates } = data

    categoryQueries.updateCategory(id, updates)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Category ID required' }, { status: 400 })
    }

    categoryQueries.deleteCategory(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
