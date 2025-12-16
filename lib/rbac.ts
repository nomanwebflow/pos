import { createClient as createServerClient } from '@/lib/supabase/server'
import { permissions, hasPermission as checkPermission } from '@/lib/permissions'

export type UserRole = 'SUPER_ADMIN' | 'CASHIER' | 'STOCK_MANAGER' | 'OWNER'

export interface UserProfile {
  id: string
  role: UserRole
  name: string
  isActive: boolean
  businessId: string
}

// ... (keep permissions object same)

/**
 * Get current user's profile from Supabase
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('User')
    .select('*')
    .eq('id', user.id)
    .eq('isActive', true)
    .single()

  return profile as UserProfile | null
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  role: UserRole,
  permission: keyof typeof permissions
): boolean {
  return checkPermission(role, permission)
}

/**
 * Check if user is Super Admin
 */
export function isSuperAdmin(role: UserRole): boolean {
  return role === 'SUPER_ADMIN'
}

/**
 * Check if user is Cashier
 */
export function isCashier(role: UserRole): boolean {
  return role === 'CASHIER'
}

/**
 * Check if user is Stock Manager
 */
export function isStockManager(role: UserRole): boolean {
  return role === 'STOCK_MANAGER'
}

/**
 * Get user's default route based on role
 */
export function getDefaultRoute(role: UserRole): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/reports'
    case 'CASHIER':
      return '/checkout'
    case 'STOCK_MANAGER':
      return '/products'
    default:
      return '/login'
  }
}

/**
 * Get accessible routes for a role
 */
export function getAccessibleRoutes(role: UserRole): string[] {
  switch (role) {
    case 'SUPER_ADMIN':
      return [
        '/reports',
        '/users',
        '/products',
        '/customers',
        '/checkout',
        '/transactions',
        '/settings',
        '/payments',
      ]
    case 'CASHIER':
      return ['/checkout', '/customers']
    case 'STOCK_MANAGER':
      return ['/products']
    default:
      return []
  }
}
