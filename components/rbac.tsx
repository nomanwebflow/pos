"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { hasPermission, permissions } from "@/lib/permissions"

interface UserProfile {
  id: string
  role: string
  name: string
  is_active: boolean
}

interface RBACProps {
  permission: keyof typeof permissions
  children: React.ReactNode
  fallback?: React.ReactNode
}

// Component to conditionally render based on permissions
export function RBAC({ permission, children, fallback = null }: RBACProps) {
  const user = useUser()

  if (!user) {
    return <>{fallback}</>
  }

  const hasAccess = hasPermission(user.role, permission)

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

// Hook to check permissions in components
export function usePermission(permission: keyof typeof permissions): boolean {
  const user = useUser()

  if (!user) {
    return false
  }

  return hasPermission(user.role, permission)
}

// Hook to get user info
export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Get current user and their profile
    const fetchUser = async () => {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

      if (authUser) {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (profile) {
          setUser(profile as UserProfile)
        } else {
          setUser(null)
        }
      } else {
        setUser(null)
      }
    }

    fetchUser()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      fetchUser()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return user
}
