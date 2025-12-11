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
      // Get categories from categories table with full details
      const { data: categories, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching categories:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(categories || [])
    }

    // Get distinct categories from products (for backward compatibility)
    const { data: products, error } = await supabase
      .from('products')
      .select('category')
      .eq('is_active', true)
      .not('category', 'is', null)

    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Extract unique categories
    const categories = [...new Set(products?.map(p => p.category).filter(Boolean))]
      .sort()
      .map(name => ({ name }))

    return NextResponse.json(categories)
  } catch (error: any) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
