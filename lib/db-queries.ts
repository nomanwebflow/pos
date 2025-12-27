import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

// Initialize Supabase Admin Client
let supabaseInstance: SupabaseClient<any, "public", any> | null = null

function getSupabase() {
  if (supabaseInstance) return supabaseInstance

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    // Only throw at runtime if credentials are missing
    throw new Error('Missing Supabase credentials in db-queries')
  }

  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })

  return supabaseInstance
}

function sanitizeSearchQuery(query: string): string {
  // Remove special characters that could break the filter syntax or cause injection
  // comma is the delimiter for OR
  // dot is the delimiter for col.op.val
  // brackets are for precedence
  return query.replace(/[.,()]/g, ' ').trim()
}

export interface Product {
  id: string
  name: string
  sku: string
  barcode: string | null
  description: string | null
  category: string | null
  costPrice: number | null
  sellingPrice: number
  stockLevel: number
  lowStockThreshold: number
  taxable: number
  isActive: number
  businessId: string
  createdAt: string
  updatedAt: string
}

export interface Sale {
  id: string
  saleNumber: string
  subtotal: number
  taxAmount: number
  discount: number
  total: number
  paymentMethod: string
  cashReceived: number | null
  cashChange: number | null
  cardAmount: number | null
  notes: string | null
  userId: string
  businessId: string
  createdAt: string
}

export interface SaleItem {
  id: string
  saleId: string
  productId: string
  quantity: number
  unitPrice: number
  subtotal: number
  taxAmount: number
  total: number
  createdAt: string
}

export interface ProductCategory {
  id: string
  name: string
  description: string | null
  isActive: number
  businessId: string
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  taxNumber: string | null
  notes: string | null
  isActive: number
  businessId: string
  createdAt: string
  updatedAt: string
}

// Helper to map boolean to number if needed, or just pass through
// The Postgres schema has "isActive" as BOOLEAN? 
// Schema (Step 321): "isActive" BOOLEAN NOT NULL DEFAULT true
// Interface says number (1 or 0). 
// Accessing .select('*') returns boolean.
// We might need to map it.

function mapProduct(p: any): Product {
  return {
    ...p,
    isActive: p.isActive ? 1 : 0
  }
}

function mapCustomer(c: any): Customer {
  return {
    ...c,
    isActive: c.isActive ? 1 : 0
  }
}

function mapCategory(c: any): ProductCategory {
  return {
    ...c,
    isActive: c.isActive ? 1 : 0
  }
}

// Product Queries
export const productQueries = {
  getAllProducts: async (businessId: string): Promise<Product[]> => {
    const { data } = await getSupabase()
      .from('Product')
      .select('*')
      .eq('businessId', businessId)
      .eq('isActive', true)
      .order('name', { ascending: true })

    return (data || []).map(mapProduct)
  },

  getProductById: async (id: string): Promise<Product | undefined> => {
    const { data } = await getSupabase()
      .from('Product')
      .select('*')
      .eq('id', id)
      .single()
    return data ? mapProduct(data) : undefined
  },

  getProductByBarcode: async (barcode: string, businessId: string): Promise<Product | undefined> => {
    const { data } = await getSupabase()
      .from('Product')
      .select('*')
      .eq('barcode', barcode)
      .eq('businessId', businessId)
      .eq('isActive', true)
      .single()
    return data ? mapProduct(data) : undefined
  },

  getProductBySku: async (sku: string, businessId: string): Promise<Product | undefined> => {
    const { data } = await getSupabase()
      .from('Product')
      .select('*')
      .eq('sku', sku)
      .eq('businessId', businessId)
      .eq('isActive', true)
      .single()
    return data ? mapProduct(data) : undefined
  },

  getProductByName: async (name: string, businessId: string): Promise<Product | undefined> => {
    const { data } = await getSupabase()
      .from('Product')
      .select('*')
      .eq('name', name)
      .eq('businessId', businessId)
      .eq('isActive', true)
      .single()
    return data ? mapProduct(data) : undefined
  },

  searchProducts: async (query: string, businessId: string): Promise<Product[]> => {
    const { data } = await getSupabase()
      .from('Product')
      .select('*')
      .eq('businessId', businessId)
      .eq('isActive', true)
      .eq('isActive', true)
      .or(`name.ilike.%${sanitizeSearchQuery(query)}%,sku.ilike.%${sanitizeSearchQuery(query)}%,barcode.ilike.%${sanitizeSearchQuery(query)}%`)
      .order('name', { ascending: true })
      .limit(50)
    return (data || []).map(mapProduct)
  },

  getProductsByCategory: async (category: string, businessId: string): Promise<Product[]> => {
    const { data } = await getSupabase()
      .from('Product')
      .select('*')
      .eq('category', category)
      .eq('businessId', businessId)
      .eq('isActive', true)
      .order('name', { ascending: true })
    return (data || []).map(mapProduct)
  },

  getCategories: async (businessId: string): Promise<string[]> => {
    // Distinct not directly supported in simple select without raw sql or RPC, 
    // but we can fetch and filter or use .select('category')
    const { data } = await getSupabase()
      .from('Product')
      .select('category')
      .eq('businessId', businessId)
      .not('category', 'is', null)
      .eq('isActive', true)
      .order('category', { ascending: true })

    const categories = Array.from(new Set((data || []).map(p => p.category).filter(Boolean))) as string[]
    return categories
  },

  getLowStockProducts: async (businessId: string): Promise<Product[]> => {
    // "stockLevel <= lowStockThreshold" - tough in simple filter.
    // Use rpc or client side filter. Client side is safer for now.
    const { data } = await getSupabase()
      .from('Product')
      .select('*')
      .eq('businessId', businessId)
      .eq('isActive', true)

    // Filter in JS
    const lowStock = (data || []).filter(p => p.stockLevel <= p.lowStockThreshold)
      .sort((a, b) => a.stockLevel - b.stockLevel)

    return lowStock.map(mapProduct)
  },

  createProduct: async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = uuidv4()
    const now = new Date().toISOString()

    const { error } = await getSupabase().from('Product').insert({
      id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      description: product.description,
      category: product.category,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      stockLevel: product.stockLevel,
      lowStockThreshold: product.lowStockThreshold,
      taxable: product.taxable === 1, // Convert number to boolean
      isActive: product.isActive === 1,
      businessId: product.businessId,
      createdAt: now,
      updatedAt: now
    })

    if (error) throw new Error(error.message)
    return id
  },

  // UPSERT product - used for imports to handle reactivation of soft-deleted products
  upsertProduct: async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    // We don't generate ID here because upsert might match existing.
    // However, if it's new, we need an ID. 
    // Supabase upsert requires all columns if we want to insert.
    // If we only provide businessId/sku, we need to handle the ID generation if it's an insert.
    // BUT we can't easily know if it's insert or update without checking first, which defeats the purpose of upsert key collision check.
    // ACTUALLY, if we provide an ID, it tries to match ID.
    // If we rely on Unique Constraint (businessId, sku), we can use onConflict.
    // But we need to provide an ID for the INSERT case.

    // Strategy: Try to find it including soft-deleted.
    const { data: existing } = await getSupabase().from('Product')
      .select('id, stockLevel')
      .eq('sku', product.sku)
      .eq('businessId', product.businessId)
      .single()

    if (existing) {
      // Update logic (Reactivate + Update fields + Add Stock)
      // Note: The caller (route.ts) logic was:
      // If exists -> Update Stock
      // If not -> Create
      // But here we are handling "User thought it didn't exist, but DB says it does".
      // So we should perform an UPDATE on the existing ID.

      const newStock = (existing.stockLevel || 0) + product.stockLevel
      const { error } = await getSupabase().from('Product').update({
        name: product.name,
        barcode: product.barcode,
        description: product.description,
        category: product.category,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        stockLevel: newStock, // Add import stock to existing
        lowStockThreshold: product.lowStockThreshold,
        taxable: product.taxable === 1,
        isActive: true, // Reactivate!
        updatedAt: now
      }).eq('id', existing.id)

      if (error) throw new Error(error.message)
      return existing.id
    } else {
      // It really doesn't exist, so standard create
      return productQueries.createProduct(product)
    }
  },

  updateProduct: async (id: string, updates: Partial<Product>) => {
    const now = new Date().toISOString()
    const payload: any = { ...updates, updatedAt: now }
    if (updates.isActive !== undefined) payload.isActive = updates.isActive === 1
    if (updates.taxable !== undefined) payload.taxable = updates.taxable === 1

    const { error } = await getSupabase().from('Product').update(payload).eq('id', id)
    if (error) throw new Error(error.message)
  },

  updateStock: async (productId: string, newStock: number) => {
    const now = new Date().toISOString()
    const { error } = await getSupabase().from('Product').update({
      stockLevel: newStock,
      updatedAt: now
    }).eq('id', productId)
    if (error) throw new Error(error.message)
  },

  deleteProducts: async (ids: string[], businessId: string) => {
    const now = new Date().toISOString()
    const { error } = await getSupabase()
      .from('Product')
      .update({ isActive: 0, updatedAt: now }) // Soft delete
      .in('id', ids)
      .eq('businessId', businessId) // Security check
    if (error) throw new Error(error.message)
  },

  updateProducts: async (ids: string[], updates: Partial<Product>, businessId: string) => {
    const now = new Date().toISOString()
    const payload: any = { ...updates, updatedAt: now }
    if (updates.isActive !== undefined) payload.isActive = updates.isActive === 1
    if (updates.taxable !== undefined) payload.taxable = updates.taxable === 1

    const { error } = await getSupabase()
      .from('Product')
      .update(payload)
      .in('id', ids)
      .eq('businessId', businessId)
    if (error) throw new Error(error.message)
  }
}

// Sales Queries
export const salesQueries = {
  createSale: async (sale: Omit<Sale, 'id' | 'saleNumber' | 'createdAt'>, items: Omit<SaleItem, 'id' | 'saleId' | 'createdAt'>[]) => {
    const saleId = uuidv4()
    const saleNumber = `SALE-${Date.now()}`
    const now = new Date().toISOString()

    // 1. Insert Sale
    const { error: saleError } = await getSupabase().from('Sale').insert({
      id: saleId,
      saleNumber,
      subtotal: sale.subtotal,
      taxAmount: sale.taxAmount,
      discount: sale.discount,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      cashReceived: sale.cashReceived,
      cashChange: sale.cashChange,
      cardAmount: sale.cardAmount,
      notes: sale.notes,
      userId: sale.userId,
      businessId: sale.businessId,
      createdAt: now
    })
    if (saleError) throw new Error('Failed to create sale: ' + saleError.message)

    // 2. Process Items
    for (const item of items) {
      const itemId = uuidv4()

      // Insert SaleItem
      await getSupabase().from('SaleItem').insert({
        id: itemId,
        saleId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        taxAmount: item.taxAmount,
        total: item.total,
        createdAt: now
      })

      // Atomic Update Product Stock
      const { data: newStock, error: stockError } = await getSupabase()
        .rpc('decrement_stock', {
          p_product_id: item.productId,
          p_quantity: item.quantity
        })

      if (stockError) {
        throw new Error(`Failed to update stock for product ${item.productId}: ${stockError.message}`)
      }

      // Calculate previous stock based on the result of the atomic operation
      const previousStock = (newStock as number) + item.quantity

      // Log Stock Movement
      const movementId = `movement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await getSupabase().from('StockMovement').insert({
        id: movementId,
        type: 'SALE',
        productId: item.productId,
        quantity: -item.quantity,
        previousStock: previousStock,
        newStock: newStock,
        userId: sale.userId,
        createdAt: now
      })
    }

    return { saleId, saleNumber }
  },

  getSaleById: async (id: string) => {
    const { data: sale } = await getSupabase().from('Sale').select('*').eq('id', id).single()
    if (!sale) return null

    const { data: items } = await getSupabase()
      .from('SaleItem')
      .select('*, Product(name, sku)')
      .eq('saleId', id)

    // Flatten product info if needed or map it
    const formattedItems = (items || []).map((item: any) => ({
      ...item,
      productName: item.Product?.name,
      sku: item.Product?.sku
    }))

    return { ...sale, items: formattedItems }
  },

  getSalesByDateRange: async (businessId: string, startDate: string, endDate: string) => {
    // Join User to get name
    const { data } = await getSupabase()
      .from('Sale')
      .select('*, User(name)')
      .eq('businessId', businessId)
      .gte('createdAt', startDate)
      .lte('createdAt', endDate + 'T23:59:59') // simple suffix
      .order('createdAt', { ascending: false })

    return (data || []).map((s: any) => ({
      ...s,
      userName: s.User?.name
    }))
  },

  getTodaySales: async (businessId: string) => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await getSupabase()
      .from('Sale')
      .select('*')
      .eq('businessId', businessId)
      .gte('createdAt', today + 'T00:00:00')
      .order('createdAt', { ascending: false })
    return data || []
  },

  getSalesStats: async (businessId: string, date: string) => {
    // RPC or fetch and aggregate
    // Aggregation better done in DB, but for speed of migration, fetch events for day?
    // Or use execute_sql if I can? No, use client.
    // Fetching all sales for day is fine for a demo.
    const { data: sales } = await getSupabase()
      .from('Sale')
      .select('*')
      .eq('businessId', businessId)
      .gte('createdAt', date + 'T00:00:00')
      .lte('createdAt', date + 'T23:59:59')

    const s = sales || []
    return {
      totalSales: s.length,
      totalRevenue: s.reduce((sum: number, x: any) => sum + x.total, 0),
      subtotal: s.reduce((sum: number, x: any) => sum + x.subtotal, 0),
      totalTax: s.reduce((sum: number, x: any) => sum + x.taxAmount, 0),
      totalDiscount: s.reduce((sum: number, x: any) => sum + x.discount, 0),
      cashSales: s.filter(x => x.paymentMethod === 'CASH').reduce((sum: number, x: any) => sum + x.total, 0),
      cardSales: s.filter(x => x.paymentMethod === 'CARD').reduce((sum: number, x: any) => sum + x.total, 0),
      mixedSales: s.filter(x => x.paymentMethod === 'MIXED').reduce((sum: number, x: any) => sum + x.total, 0)
    }
  }
}

// Stock Movement Queries
export const stockQueries = {
  addStockMovement: async (
    productId: string,
    quantity: number,
    type: 'REFILL' | 'ADJUSTMENT',
    userId: string,
    reference?: string,
    reason?: string
  ) => {
    const now = new Date().toISOString()
    const { data: product } = await getSupabase().from('Product').select('stockLevel').eq('id', productId).single()
    const previousStock = product?.stockLevel || 0
    const newStock = previousStock + quantity
    const movementId = `movement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    await getSupabase().from('StockMovement').insert({
      id: movementId,
      type,
      productId,
      quantity,
      previousStock,
      newStock,
      reference,
      reason,
      userId,
      createdAt: now
    })

    await getSupabase().from('Product').update({
      stockLevel: newStock,
      updatedAt: now
    }).eq('id', productId)

    return movementId
  },

  getStockHistory: async (productId: string) => {
    const { data } = await getSupabase()
      .from('StockMovement')
      .select('*, User(name), Product(name)')
      .eq('productId', productId)
      .order('createdAt', { ascending: false })
      .limit(100)

    return (data || []).map((row: any) => ({
      ...row,
      userName: row.User?.name,
      productName: row.Product?.name
    }))
  }
}

// Customer Queries
export const customerQueries = {
  getAllCustomers: async (businessId: string): Promise<Customer[]> => {
    const { data } = await getSupabase()
      .from('Customer')
      .select('*')
      .eq('businessId', businessId)
      .eq('isActive', true)
      .order('name', { ascending: true })
    return (data || []).map(mapCustomer)
  },

  getCustomerById: async (id: string): Promise<Customer | undefined> => {
    const { data } = await getSupabase().from('Customer').select('*').eq('id', id).single()
    return data ? mapCustomer(data) : undefined
  },

  searchCustomers: async (query: string, businessId: string): Promise<Customer[]> => {
    const { data } = await getSupabase()
      .from('Customer')
      .select('*')
      .eq('businessId', businessId)
      .eq('isActive', true)
      .eq('isActive', true)
      .or(`name.ilike.%${sanitizeSearchQuery(query)}%,email.ilike.%${sanitizeSearchQuery(query)}%,phone.ilike.%${sanitizeSearchQuery(query)}%`)
      .order('name', { ascending: true })
      .limit(50)
    return (data || []).map(mapCustomer)
  },

  createCustomer: async (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = uuidv4()
    const now = new Date().toISOString()

    const { error } = await getSupabase().from('Customer').insert({
      id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      taxNumber: customer.taxNumber,
      notes: customer.notes,
      isActive: customer.isActive === 1,
      businessId: customer.businessId,
      createdAt: now,
      updatedAt: now
    })

    if (error) throw new Error(error.message)
    return id
  },

  updateCustomer: async (id: string, updates: Partial<Omit<Customer, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>>) => {
    const now = new Date().toISOString()
    const payload: any = { ...updates, updatedAt: now }
    if (updates.isActive !== undefined) payload.isActive = updates.isActive === 1

    const { error } = await getSupabase().from('Customer').update(payload).eq('id', id)
    if (error) throw new Error(error.message)
  },

  deleteCustomer: async (id: string, businessId: string) => {
    const now = new Date().toISOString()
    const { error } = await getSupabase().from('Customer').update({
      isActive: false,
      updatedAt: now
    })
      .eq('id', id)
      .eq('businessId', businessId) // Security check
    if (error) throw new Error(error.message)
  },

  getCustomerSalesHistory: async (customerId: string) => {
    const { data } = await getSupabase()
      .from('Sale')
      .select('*')
      .eq('customerId', customerId)
      .order('createdAt', { ascending: false })
      .limit(20)
    return data || []
  }
}

// Reports Queries
export const reportQueries = {
  // Implementing simplified versions using fetches, as aggregation requires RPC or more complex query building
  // For basic stats, fetching range and reducing in memory is acceptable for small scale.

  getSalesReport: async (businessId: string, startDate: string, endDate: string) => {
    const { data: sales } = await getSupabase()
      .from('Sale')
      .select('*')
      .eq('businessId', businessId)
      .gte('createdAt', startDate)
      .lte('createdAt', endDate + 'T23:59:59')

    const salesList = sales || []

    // Group by date
    const grouped: Record<string, any> = {}

    for (const s of salesList) {
      const date = s.createdAt.split('T')[0]
      if (!grouped[date]) {
        grouped[date] = {
          date,
          totalSales: 0,
          subtotal: 0,
          taxAmount: 0,
          discount: 0,
          total: 0,
          cashSales: 0,
          cardSales: 0,
          mixedSales: 0
        }
      }
      const g = grouped[date]
      g.totalSales++
      g.subtotal += s.subtotal
      g.taxAmount += s.taxAmount
      g.discount += s.discount
      g.total += s.total
      if (s.paymentMethod === 'CASH') g.cashSales += s.total
      if (s.paymentMethod === 'CARD') g.cardSales += s.total
      if (s.paymentMethod === 'MIXED') g.mixedSales += s.total
    }

    return Object.values(grouped).sort((a: any, b: any) => b.date.localeCompare(a.date))
  },

  getSalesByCategory: async (businessId: string, startDate: string, endDate: string) => {
    // Need to fetch SaleItems within range
    const { data: items } = await getSupabase()
      .from('SaleItem')
      .select('*, Sale!inner(*), Product(category)')
      .eq('Sale.businessId', businessId)
      .gte('Sale.createdAt', startDate)
      .lte('Sale.createdAt', endDate + 'T23:59:59')

    const byCategory: Record<string, any> = {}

    for (const item of (items || [])) {
      const cat = (item.Product as any)?.category
      if (!cat) continue

      if (!byCategory[cat]) {
        byCategory[cat] = { category: cat, totalSales: new Set(), totalQuantity: 0, revenue: 0 }
      }
      const g = byCategory[cat]
      g.totalSales.add(item.saleId)
      g.totalQuantity += item.quantity
      g.revenue += item.subtotal // or total?
    }

    return Object.values(byCategory)
      .map((g: any) => ({ ...g, totalSales: g.totalSales.size }))
      .sort((a: any, b: any) => b.revenue - a.revenue)
  },

  getTopProducts: async (businessId: string, startDate: string, endDate: string, limit: number = 10) => {
    const { data: items } = await getSupabase()
      .from('SaleItem')
      .select('*, Sale!inner(*), Product(id, name, sku, category)')
      .eq('Sale.businessId', businessId)
      .gte('Sale.createdAt', startDate)
      .lte('Sale.createdAt', endDate + 'T23:59:59')

    const byProduct: Record<string, any> = {}
    for (const item of (items || [])) {
      const pid = item.productId
      if (!byProduct[pid]) {
        byProduct[pid] = {
          id: pid,
          name: (item.Product as any)?.name,
          sku: (item.Product as any)?.sku,
          category: (item.Product as any)?.category,
          totalQuantity: 0,
          revenue: 0,
          salesSet: new Set()
        }
      }
      const g = byProduct[pid]
      g.totalQuantity += item.quantity
      g.revenue += item.subtotal
      g.salesSet.add(item.saleId)
    }

    return Object.values(byProduct)
      .map((g: any) => ({ ...g, salesCount: g.salesSet.size }))
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, limit)
  },

  getSalesByUser: async (businessId: string, startDate: string, endDate: string) => {
    const { data: sales } = await getSupabase()
      .from('Sale')
      .select('*, User!inner(id, name, role)')
      .eq('businessId', businessId)
      .gte('createdAt', startDate)
      .lte('createdAt', endDate + 'T23:59:59')

    const byUser: Record<string, any> = {}
    for (const s of (sales || [])) {
      const uid = s.userId
      if (!byUser[uid]) {
        byUser[uid] = {
          id: uid,
          name: (s.User as any)?.name,
          role: (s.User as any)?.role,
          totalSales: 0,
          totalRevenue: 0
        }
      }
      byUser[uid].totalSales++
      byUser[uid].totalRevenue += s.total
    }

    return Object.values(byUser)
      .filter((u: any) => u.role !== 'SUPER_ADMIN')
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
  },

  getRevenueOverview: async (businessId: string, startDate: string, endDate: string) => {
    // Reuse getSalesStats similar logic
    const { data: sales } = await getSupabase()
      .from('Sale')
      .select('*')
      .eq('businessId', businessId)
      .gte('createdAt', startDate)
      .lte('createdAt', endDate + 'T23:59:59')

    const s = sales || []
    return {
      totalTransactions: s.length,
      totalSubtotal: s.reduce((sum: number, x: any) => sum + x.subtotal, 0),
      totalTax: s.reduce((sum: number, x: any) => sum + x.taxAmount, 0),
      totalDiscount: s.reduce((sum: number, x: any) => sum + x.discount, 0),
      totalRevenue: s.reduce((sum: number, x: any) => sum + x.total, 0),
      averageTransactionValue: s.length ? (s.reduce((sum: number, x: any) => sum + x.total, 0) / s.length) : 0,
      cashRevenue: s.filter(x => x.paymentMethod === 'CASH').reduce((sum: number, x: any) => sum + x.total, 0),
      cardRevenue: s.filter(x => x.paymentMethod === 'CARD').reduce((sum: number, x: any) => sum + x.total, 0),
      mixedRevenue: s.filter(x => x.paymentMethod === 'MIXED').reduce((sum: number, x: any) => sum + x.total, 0)
    }
  },

  getDetailedSales: async (businessId: string, startDate: string, endDate: string) => {
    const { data } = await getSupabase()
      .from('Sale')
      .select('*, User(name), Customer(name)')
      .eq('businessId', businessId)
      .gte('createdAt', startDate)
      .lte('createdAt', endDate + 'T23:59:59')
      .order('createdAt', { ascending: false })

    return (data || []).map((s: any) => ({
      ...s,
      userName: s.User?.name,
      customerName: s.Customer?.name
    }))
  }
}

export const paymentQueries = {
  getPaymentOverview: async (businessId: string, startDate: string, endDate: string) => {
    // Reuse revenue overview logic basically
    const { data: sales } = await getSupabase()
      .from('Sale')
      .select('*')
      .eq('businessId', businessId)
      .gte('createdAt', startDate)
      .lte('createdAt', endDate + 'T23:59:59')

    const s = sales || []
    const totalRevenue = s.reduce((sum: number, x: any) => sum + x.total, 0)
    const cashRevenue = s.filter(x => x.paymentMethod === 'CASH').reduce((sum: number, x: any) => sum + x.total, 0)
    const cardRevenue = s.filter(x => x.paymentMethod === 'CARD').reduce((sum: number, x: any) => sum + x.total, 0)
    const mixedRevenue = s.filter(x => x.paymentMethod === 'MIXED').reduce((sum: number, x: any) => sum + x.total, 0)

    return {
      totalTransactions: s.length,
      totalRevenue,
      cashRevenue,
      cardRevenue,
      mixedRevenue,
      cashTransactions: s.filter(x => x.paymentMethod === 'CASH').length,
      cardTransactions: s.filter(x => x.paymentMethod === 'CARD').length,
      mixedTransactions: s.filter(x => x.paymentMethod === 'MIXED').length,
    }
  },

  getDailyPaymentBreakdown: async (businessId: string, startDate: string, endDate: string) => {
    const { data: sales } = await getSupabase()
      .from('Sale')
      .select('*')
      .eq('businessId', businessId)
      .gte('createdAt', startDate)
      .lte('createdAt', endDate + 'T23:59:59')

    const grouped: Record<string, any> = {}
    for (const s of (sales || [])) {
      const date = s.createdAt.split('T')[0]
      if (!grouped[date]) {
        grouped[date] = {
          date,
          totalRevenue: 0,
          cashRevenue: 0,
          cardRevenue: 0,
          mixedRevenue: 0,
          totalTransactions: 0,
          cashTransactions: 0,
          cardTransactions: 0,
          mixedTransactions: 0
        }
      }
      const g = grouped[date]
      g.totalRevenue += s.total
      if (s.paymentMethod === 'CASH') { g.cashRevenue += s.total; g.cashTransactions++; }
      if (s.paymentMethod === 'CARD') { g.cardRevenue += s.total; g.cardTransactions++; }
      if (s.paymentMethod === 'MIXED') { g.mixedRevenue += s.total; g.mixedTransactions++; }
      g.totalTransactions++
    }

    return Object.values(grouped).sort((a: any, b: any) => b.date.localeCompare(a.date))
  },

  getCashTransactionDetails: async (businessId: string, startDate: string, endDate: string) => {
    const { data } = await getSupabase()
      .from('Sale')
      .select('saleNumber, total, cashReceived, cashChange, createdAt')
      .eq('businessId', businessId)
      .eq('paymentMethod', 'CASH')
      .gte('createdAt', startDate)
      .lte('createdAt', endDate + 'T23:59:59')
      .order('createdAt', { ascending: false })
    return data || []
  },

  getCardTransactionDetails: async (businessId: string, startDate: string, endDate: string) => {
    const { data } = await getSupabase()
      .from('Sale')
      .select('saleNumber, total, cardAmount, createdAt')
      .eq('businessId', businessId)
      .eq('paymentMethod', 'CARD')
      .gte('createdAt', startDate)
      .lte('createdAt', endDate + 'T23:59:59')
      .order('createdAt', { ascending: false })
    return data || []
  },

  getMixedTransactionDetails: async (businessId: string, startDate: string, endDate: string) => {
    const { data } = await getSupabase()
      .from('Sale')
      .select('saleNumber, total, cashReceived, cardAmount, createdAt')
      .eq('businessId', businessId)
      .eq('paymentMethod', 'MIXED')
      .gte('createdAt', startDate)
      .lte('createdAt', endDate + 'T23:59:59')
      .order('createdAt', { ascending: false })
    return data || []
  }
}

export const categoryQueries = {
  getAllCategories: async (businessId: string): Promise<ProductCategory[]> => {
    const { data } = await getSupabase()
      .from('ProductCategory')
      .select('*')
      .eq('businessId', businessId)
      .eq('isActive', true)
      .order('name', { ascending: true })
    return (data || []).map(mapCategory)
  },

  getCategoryById: async (id: string): Promise<ProductCategory | undefined> => {
    const { data } = await getSupabase().from('ProductCategory').select('*').eq('id', id).single()
    return data ? mapCategory(data) : undefined
  },

  createCategory: async (category: Omit<ProductCategory, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = uuidv4()
    const now = new Date().toISOString()
    const { error } = await getSupabase().from('ProductCategory').insert({
      id,
      name: category.name,
      description: category.description,
      isActive: category.isActive === 1,
      businessId: category.businessId,
      createdAt: now,
      updatedAt: now
    })
    if (error) throw new Error(error.message)
    return id
  },

  updateCategory: async (id: string, updates: Partial<Omit<ProductCategory, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>>) => {
    const now = new Date().toISOString()
    const payload: any = { ...updates, updatedAt: now }
    if (updates.isActive !== undefined) payload.isActive = updates.isActive === 1

    const { error } = await getSupabase().from('ProductCategory').update(payload).eq('id', id)
    if (error) throw new Error(error.message)
    return true
  },

  deleteCategory: async (id: string) => {
    const now = new Date().toISOString()
    const { error } = await getSupabase().from('ProductCategory').update({
      isActive: false,
      updatedAt: now
    }).eq('id', id)
    if (error) throw new Error(error.message)
    return true
  },

  searchCategories: async (businessId: string, searchTerm: string): Promise<ProductCategory[]> => {
    const { data } = await getSupabase()
      .from('ProductCategory')
      .select('*')
      .eq('businessId', businessId)
      .eq('isActive', true)
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order('name', { ascending: true })
    return (data || []).map(mapCategory)
  }
}
