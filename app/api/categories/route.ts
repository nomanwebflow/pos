import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { categoryQueries } from '@/lib/db-queries'

export const dynamic = 'force-dynamic'

// Helper to get business ID
async function getBusinessId(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('User')
    .select('businessId')
    .eq('id', user.id)
    .single()

  return profile?.businessId
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const businessId = await getBusinessId(supabase)

    if (!businessId) {
      return NextResponse.json({ error: 'Unauthorized or Business not found' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const search = searchParams.get('search')

    if (id) {
      const category = await categoryQueries.getCategoryById(id)
      if (category && category.businessId === businessId) {
        return NextResponse.json(category)
      }
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    } else if (search) {
      const categories = await categoryQueries.searchCategories(businessId, search)
      return NextResponse.json(categories)
    }

    const categories = await categoryQueries.getAllCategories(businessId)
    return NextResponse.json(categories)
  } catch (error: any) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const businessId = await getBusinessId(supabase)

    if (!businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    if (!data.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const id = await categoryQueries.createCategory({
      name: data.name,
      description: data.description,
      isActive: 1,
      businessId
    })

    return NextResponse.json({ success: true, id }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const businessId = await getBusinessId(supabase)

    if (!businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { id, ...updates } = data

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await categoryQueries.updateCategory(id, updates)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const businessId = await getBusinessId(supabase)

    if (!businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Category ID required' }, { status: 400 })
    }

    await categoryQueries.deleteCategory(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
