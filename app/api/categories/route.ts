import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile including businessId
    const { data: profile } = await supabase
      .from('User')
      .select('businessId')
      .eq('id', user.id)
      .single()

    if (!profile?.businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const fullData = searchParams.get('full') === 'true'

    if (fullData) {
      // Get categories from ProductCategory table with full details
      const { data: categories, error } = await supabase
        .from('ProductCategory')
        .select('*')
        .eq('businessId', profile.businessId)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching categories:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(categories || [])
    }

    const { data: categories, error } = await supabase
      .from('ProductCategory')
      .select('name')
      .eq('businessId', profile.businessId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(categories || [])
  } catch (error: any) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('User')
      .select('businessId')
      .eq('id', user.id)
      .single()

    if (!profile?.businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const { data: category, error } = await supabase
      .from('ProductCategory')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        businessId: profile.businessId,
        isActive: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating category:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(category, { status: 201 })
  } catch (error: any) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('User')
      .select('businessId')
      .eq('id', user.id)
      .single()

    if (!profile?.businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const body = await request.json()
    const { id, name, description, isActive } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const updates: any = { updatedAt: new Date().toISOString() }
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (isActive !== undefined) updates.isActive = isActive

    const { data: category, error } = await supabase
      .from('ProductCategory')
      .update(updates)
      .eq('id', id)
      .eq('businessId', profile.businessId)
      .select()
      .single()

    if (error) {
      console.error('Error updating category:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(category)
  } catch (error: any) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('User')
      .select('businessId')
      .eq('id', user.id)
      .single()

    if (!profile?.businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // Soft delete by setting isActive to false
    const { error } = await supabase
      .from('ProductCategory')
      .update({ isActive: false, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('businessId', profile.businessId)

    if (error) {
      console.error('Error deleting category:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
