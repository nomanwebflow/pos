'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/lib/rbac'

export function useUserRole() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserProfile = async () => {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('User')
        .select('*')
        .eq('id', user.id)
        .eq('isActive', true)
        .single()

      setProfile(data as UserProfile | null)
      setLoading(false)
    }

    fetchUserProfile()
  }, [])

  return { profile, loading, role: profile?.role }
}
