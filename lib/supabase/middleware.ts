import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type UserRole = 'SUPER_ADMIN' | 'CASHIER' | 'STOCK_MANAGER' | 'OWNER'

interface UserProfile {
  id: string
  role: UserRole
  name: string
  isActive: boolean
}

// Define route permissions
const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  '/checkout': ['CASHIER', 'OWNER', 'SUPER_ADMIN'], // Cashier, Owner, Admin can access checkout
  '/customers': ['SUPER_ADMIN', 'OWNER'],
  '/products': ['SUPER_ADMIN', 'STOCK_MANAGER', 'OWNER'],
  '/transactions': ['SUPER_ADMIN', 'OWNER', 'CASHIER'],
  '/refunds': ['SUPER_ADMIN', 'OWNER', 'CASHIER'],
  '/reports': ['SUPER_ADMIN', 'OWNER'],
  '/settings': ['SUPER_ADMIN', 'OWNER'],
  '/users': ['SUPER_ADMIN', 'OWNER'],
  '/payments': ['SUPER_ADMIN', 'OWNER'],
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip middleware for API routes and static assets
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshing the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect routes - redirect to login if not authenticated
  if (
    !user &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/signup')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user is authenticated, check role-based access
  if (user) {
    // Get user profile with role
    const { data: profile } = await supabase
      .from('User')
      .select('*')
      .eq('id', user.id)
      .single()

    const userProfile = profile as UserProfile | null

    // Check if user is active
    if (userProfile && !userProfile.isActive) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'account_inactive')
      return NextResponse.redirect(url)
    }

    // Check route permissions
    if (userProfile) {
      // Find matching route permission
      const matchedRoute = Object.keys(ROUTE_PERMISSIONS).find(route =>
        pathname.startsWith(route)
      )

      if (matchedRoute) {
        const allowedRoles = ROUTE_PERMISSIONS[matchedRoute]

        if (!allowedRoles.includes(userProfile.role)) {
          // User doesn't have permission, redirect to appropriate default page
          const url = request.nextUrl.clone()

          // Redirect based on role
          if (userProfile.role === 'CASHIER') {
            url.pathname = '/checkout'
          } else if (userProfile.role === 'STOCK_MANAGER') {
            url.pathname = '/products'
          } else {
            url.pathname = '/'
          }

          url.searchParams.set('error', 'unauthorized')
          return NextResponse.redirect(url)
        }
      }

      // Redirect from root based on role
      if (pathname === '/') {
        const url = request.nextUrl.clone()

        if (userProfile.role === 'CASHIER') {
          url.pathname = '/checkout'
          return NextResponse.redirect(url)
        } else if (userProfile.role === 'STOCK_MANAGER') {
          url.pathname = '/products'
          return NextResponse.redirect(url)
        }
        // For SUPER_ADMIN, don't redirect - let them see dashboard
      }
    }
  }

  return supabaseResponse
}
