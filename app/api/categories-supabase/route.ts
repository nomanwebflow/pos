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

    // Check if the request wants category data from categories table
    const { searchParams } = new URL(request.url)
    const fullData = searchParams.get('full') === 'true'

    if (fullData) {
      // Get categories from ProductCategory table with full details
      const { data: categories, error } = await supabase
        .from('ProductCategory')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching categories:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(categories || [])
    }

    // Get distinct categories from Product table (for backward compatibility)
    // Actually, improved logic: fetch from ProductCategory first?
    // But sticking to existing logic pattern: query products if dynamic.
    // However, Product table links to category via 'categoryId'.
    // If the legacy logic meant "text based categories", we might have a mismatch.
    // The new schema `Product` has `categoryId`. `ProductCategory` has the names.
    // So the fallback logic of "distinct categories from products" is legacy text-based.
    // New system should rely on `ProductCategory`.
    // Let's just fetch from `ProductCategory` for the simple list too.

    const { data: categories, error } = await supabase
      .from('ProductCategory')
      .select('name')
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
