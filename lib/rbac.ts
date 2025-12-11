import { createClient as createServerClient } from '@/lib/supabase/server'

export type UserRole = 'SUPER_ADMIN' | 'CASHIER' | 'STOCK_MANAGER'

export interface UserProfile {
  id: string
  role: UserRole
  name: string
  is_active: boolean
}

// Define permissions for each role
export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: {
    canViewReports: true,
    canManageUsers: true,
    canManageProducts: true,
    canManageCustomers: true,
    canCheckout: true,
    canViewTransactions: true,
    canExportData: true,
    canAccessSettings: true,
    canViewPayments: true,
  },
  CASHIER: {
    canViewReports: false,
    canManageUsers: false,
    canManageProducts: false,
    canManageCustomers: true,
    canCheckout: true,
    canViewTransactions: false,
    canExportData: false,
    canAccessSettings: false,
    canViewPayments: false,
  },
  STOCK_MANAGER: {
    canViewReports: false,
    canManageUsers: false,
    canManageProducts: true,
    canManageCustomers: false,
    canCheckout: false,
    canViewTransactions: false,
    canExportData: false,
    canAccessSettings: false,
    canViewPayments: false,
  },
} as const

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
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .eq('is_active', true)
    .single()

  return profile as UserProfile | null
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  role: UserRole,
  permission: keyof typeof ROLE_PERMISSIONS.SUPER_ADMIN
): boolean {
  return ROLE_PERMISSIONS[role][permission]
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
