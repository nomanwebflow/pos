import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile for businessId
    const { data: profile } = await supabase
      .from('User')
      .select('businessId')
      .eq('id', user.id)
      .single()

    if (!profile?.businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Get business information
    const { data: business, error } = await supabase
      .from('Business')
      .select('*')
      .eq('id', profile.businessId)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ business: business || null })
  } catch (error: any) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const data = await request.json()

    console.log('[Settings API] PUT request received with data:', JSON.stringify(data))

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('[Settings API] Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile for auth check and businessId
    const { data: profile } = await supabase
      .from('User')
      .select('role, businessId')
      .eq('id', user.id)
      .single()

    if (!profile?.businessId) {
      console.log('[Settings API] No businessId found for user:', user.id)
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Check permissions (OWNER or SUPER_ADMIN)
    if (profile.role !== 'OWNER' && profile.role !== 'SUPER_ADMIN') {
      console.log('[Settings API] Insufficient permissions:', profile.role)
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    console.log('[Settings API] Updating business:', profile.businessId)

    const { data: updated, error } = await supabase
      .from('Business')
      .update({
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        taxNumber: data.taxNumber,
        currency: data.currency,
        taxRate: data.taxRate,
        updatedAt: new Date().toISOString()
      })
      .eq('id', profile.businessId)
      .select()

    if (error) {
      console.error('[Settings API] Update error:', error)
      throw error
    }

    if (!updated || updated.length === 0) {
      console.error('[Settings API] No rows updated - businessId may not match')
      return NextResponse.json({ error: 'Business not found or update failed' }, { status: 404 })
    }

    console.log('[Settings API] Update successful:', updated[0])
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Settings API] Error updating settings:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
