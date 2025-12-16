"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { hasPermission, permissions } from "@/lib/permissions"

interface UserProfile {
  id: string
  role: string
  name: string
  isActive: boolean
}

interface RBACProps {
  permission: keyof typeof permissions
  children: React.ReactNode
  fallback?: React.ReactNode
}

// Component to conditionally render based on permissions
export function RBAC({ permission, children, fallback = null }: RBACProps) {
  const { user, loading } = useUser()

  if (loading || !user) {
    return <>{fallback}</>
  }

  const hasAccess = hasPermission(user.role, permission)

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

// Hook to check permissions in components
export function usePermission(permission: keyof typeof permissions): boolean {
  const { user, loading } = useUser()

  if (loading || !user) {
    return false
  }

  return hasPermission(user.role, permission)
}

// Hook to get user info
export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Get current user and their profile
    const fetchUser = async () => {
      console.log('[RBAC] Starting fetchUser...')
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        console.log('[RBAC] Auth user fetch result:', { authUser, authError })

        if (authUser) {
          const { data: profile, error: profileError } = await supabase
            .from('User')
            .select('*')
            .eq('id', authUser.id)
            .single()

          console.log('[RBAC] Profile fetch result:', { profile, profileError })

          if (profile) {
            setUser(profile as UserProfile)
          } else {
            console.error('[RBAC] No profile found for user:', authUser.id)
            setUser(null)
          }
        } else {
          console.log('[RBAC] No auth user found')
          setUser(null)
        }
      } catch (error) {
        console.error('[RBAC] Error fetching user:', error)
        setUser(null)
      } finally {
        console.log('[RBAC] Finished fetchUser, setting loading to false')
        setLoading(false)
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

  return { user, loading }
}
