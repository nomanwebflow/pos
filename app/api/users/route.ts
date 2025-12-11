import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user's profile to check permissions
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (!currentUserProfile || currentUserProfile.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all user profiles with auth user data
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Get emails from auth.users for each profile using admin client
    const adminClient = createAdminClient()
    const usersWithEmails = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { data: { user: authUserData } } = await adminClient.auth.admin.getUserById(profile.id)
        return {
          id: profile.id,
          email: authUserData?.email || 'N/A',
          name: profile.name,
          role: profile.role,
          isActive: profile.is_active ? 1 : 0,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at
        }
      })
    )

    return NextResponse.json(usersWithEmails)
  } catch (error: any) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user's profile to check permissions
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (!currentUserProfile || currentUserProfile.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await request.json()

    // Validate required fields
    if (!data.email || !data.name || !data.password || !data.role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate role
    const validRoles = ['SUPER_ADMIN', 'CASHIER', 'STOCK_MANAGER']
    if (!validRoles.includes(data.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Create auth user using admin API
    const adminClient = createAdminClient()
    const { data: newAuthUser, error: createError } = await adminClient.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        name: data.name
      }
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // Update the user profile with the specified role using admin client (bypasses RLS)
    const { error: updateError } = await adminClient
      .from('user_profiles')
      .update({ role: data.role, name: data.name })
      .eq('id', newAuthUser.user.id)

    if (updateError) {
      // If profile update fails, delete the auth user
      await adminClient.auth.admin.deleteUser(newAuthUser.user.id)
      throw updateError
    }

    return NextResponse.json({
      id: newAuthUser.user.id,
      email: data.email,
      name: data.name,
      role: data.role,
      isActive: 1
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (!authUser) {
      console.error('[PUT] No authenticated user:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user's profile to check permissions
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (!currentUserProfile || currentUserProfile.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await request.json()

    // Verify the admin's password using isolated client (no session persistence)
    if (data.verificationPassword) {
      const { createClient } = await import('@supabase/supabase-js')
      const verificationClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storage: {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
          }
        }
      )

      const { error: verifyError } = await verificationClient.auth.signInWithPassword({
        email: authUser.email!,
        password: data.verificationPassword,
      })

      if (verifyError) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
      }
    } else {
      return NextResponse.json({ error: 'Password verification required' }, { status: 400 })
    }

    // Use admin client for all updates (bypasses RLS)
    const adminClient = createAdminClient()

    // Update user profile (name and role)
    const { error: updateProfileError } = await adminClient
      .from('user_profiles')
      .update({
        name: data.name,
        role: data.role,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.id)

    if (updateProfileError) {
      throw updateProfileError
    }

    // Update email if provided
    if (data.email) {
      const { error: emailError } = await adminClient.auth.admin.updateUserById(
        data.id,
        { email: data.email }
      )

      if (emailError) {
        throw emailError
      }
    }

    // Update password if provided
    if (data.newPassword) {
      const { error: passwordError } = await adminClient.auth.admin.updateUserById(
        data.id,
        { password: data.newPassword }
      )

      if (passwordError) {
        throw passwordError
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user's profile to check permissions
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (!currentUserProfile || currentUserProfile.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const verificationPassword = searchParams.get('verificationPassword')

    if (!id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Verify the admin's password using isolated client
    if (verificationPassword) {
      const { createClient } = await import('@supabase/supabase-js')
      const verificationClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storage: {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
          }
        }
      )

      const { error: verifyError } = await verificationClient.auth.signInWithPassword({
        email: authUser.email!,
        password: verificationPassword,
      })

      if (verifyError) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
      }
    } else {
      return NextResponse.json({ error: 'Password verification required' }, { status: 400 })
    }

    // Use admin client for delete (bypasses RLS)
    const adminClient = createAdminClient()

    // Soft delete - set is_active to false
    const { error: deleteError } = await adminClient
      .from('user_profiles')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
