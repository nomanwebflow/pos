import { auth } from "@/legacy/auth"
import { redirect } from "next/navigation"
import { permissions, hasPermission, type UserRole } from "@/lib/permissions"

// Re-export for convenience
export { permissions, hasPermission, type UserRole }

// Role hierarchy for permission checking
const roleHierarchy: Record<UserRole, number> = {
  SUPER_ADMIN: 3,
  STOCK_MANAGER: 2,
  CASHIER: 1,
}

// Get current user session
export async function getCurrentUser() {
  const session = await auth()
  return session?.user
}

// Require authentication - redirect to login if not authenticated
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }
  return user
}

// Check if user has required role
export function hasRole(userRole: string, requiredRole: UserRole): boolean {
  const userLevel = roleHierarchy[userRole as UserRole] || 0
  const requiredLevel = roleHierarchy[requiredRole] || 0
  return userLevel >= requiredLevel
}

// Require specific role - redirect to home if insufficient permissions
export async function requireRole(role: UserRole) {
  const user = await requireAuth()
  if (!hasRole(user.role, role)) {
    redirect("/")
  }
  return user
}
