import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProductListView } from "@/components/products/product-list-view"

const getUserProfile = async (supabase: any, userId: string) => {
  const { data: profile } = await supabase
    .from('User')
    .select('businessId, role')
    .eq('id', userId)
    .single()
  return profile
}

export default async function ProductsPage() {
  const supabase = await createClient()

  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user profile for businessId
  const profile = await getUserProfile(supabase, user.id)
  if (!profile?.businessId) {
    redirect('/login') // Or some error page
  }

  // Fetch initial data
  // Products (default to active)
  const { data: products } = await supabase
    .from('Product')
    .select('*')
    .eq('businessId', profile.businessId)
    .eq('isActive', true) // Default filter
    .order('name', { ascending: true })

  // Categories
  const { data: categories } = await supabase
    .from('ProductCategory')
    .select('*')
    .eq('businessId', profile.businessId)
    .order('name', { ascending: true })

  return (
    <ProductListView
      initialProducts={products || []}
      initialCategories={categories || []}
    />
  )
}
