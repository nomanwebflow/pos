"use client"

// Session provider wrapper - Using Supabase for auth instead of NextAuth
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
