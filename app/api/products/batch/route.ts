
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { productQueries } from '@/lib/db-queries'

export const dynamic = 'force-dynamic'

async function getBusinessId(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from('User')
        .select('businessId')
        .eq('id', user.id)
        .single()

    return profile?.businessId
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const businessId = await getBusinessId(supabase)

        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { products } = body

        if (!Array.isArray(products) || products.length === 0) {
            return NextResponse.json({ error: 'No products provided' }, { status: 400 })
        }

        // 1. Resolve Categories
        // Extract all unique category names
        const categoryNames = new Set<string>()
        products.forEach((p: any) => {
            if (p.category) categoryNames.add(p.category)
        })

        const categoryMap = new Map<string, string>() // Name -> ID

        // Create or Fetch categories
        // Ideally we check if they exist first.
        // For simplicity and to avoid too many queries, we can just ensure they exist.
        // However, "ProductCategory" table isn't strictly enforced by "productQueries.createProduct" 
        // because the "Product" table usually just stores "category" as a STRING (from legacy or checking schema).

        // Let's Check Schema from db-queries.ts:
        // interface Product { ... category: string | null ... }
        // interface ProductCategory { ... id, name ... }

        // So Product stores the Category NAME directly?
        // Let's re-read db-queries.ts line 34: "category: string | null"
        // And getProductsByCategory (line 176): .eq('category', category)

        // IT SEEMS THE SYSTEM USES CATEGORY NAMES DIRECTLY IN THE PRODUCT TABLE?
        // BUT there is a 'ProductCategory' table too (lines 75-83).
        // This is a bit inconsistent in the legacy code (or I misread).
        // If Product table has `categoryId` FK, we need ID.
        // If it has `category` string, we just use string.

        // Checking `createProduct` (line 224): `category: product.category`
        // It seems it just inserts the string/name.
        // So we might NOT need to look up IDs if the Product table just uses the name.

        // BUT, if we want to support the "Categories" page correctly, we should probably ensure 
        // the category exists in `ProductCategory` table too, so it shows up in lists?
        // `productQueries.getCategories` (line 183) gets distinct categories from PRODUCT table.
        // So `ProductCategory` table might be unused or for metadata?
        // Wait, `categoryQueries` were mentioned in previous turns.

        // Let's assume we just store the NAME in `Product.category` as per `productQueries`.
        // So we don't need complex mapping! 
        // We just pass the string.

        const results = {
            success: 0,
            failed: 0,
            errors: [] as any[]
        }

        for (const p of products) {
            try {
                // Validation
                if (!p.name || !p.price) {
                    throw new Error(`Missing required fields for ${p.name || 'unknown product'}`)
                }

                // Check if product exists (Duplicate check)
                let existingProduct = null
                if (p.sku) {
                    existingProduct = await productQueries.getProductBySku(p.sku, businessId)
                }
                if (!existingProduct && p.name) {
                    existingProduct = await productQueries.getProductByName(p.name, businessId)
                }

                if (existingProduct) {
                    // Update stock for ACTIVE products (found by getProductBySku logic which filters active)
                    const addedStock = Number(p.stock) || 0
                    const newStock = (existingProduct.stockLevel || 0) + addedStock
                    await productQueries.updateStock(existingProduct.id, newStock)

                    // Optionally update price if provided/changed? 
                    // User said "just update the stock value". So we skip other updates.

                    results.success++
                } else {
                    // Create new product OR Reactivate soft-deleted one
                    // Use upsertProduct to handle "Duplicate key" if it exists but is inactive
                    await productQueries.upsertProduct({
                        name: p.name,
                        // If CSV has 'cost', map to costPrice, etc.
                        costPrice: p.costPrice || 0,
                        sellingPrice: Number(p.price),
                        stockLevel: Number(p.stock) || 0,
                        lowStockThreshold: Number(p.minStock) || 0,
                        description: p.description || '',
                        sku: p.sku || '',
                        barcode: p.barcode || '',
                        category: p.category || 'Uncategorized',
                        taxable: p.taxable ? 1 : 0,
                        isActive: 1,
                        businessId: businessId
                    })
                    results.success++
                }
            } catch (err: any) {
                console.error("Import error details:", err)
                results.failed++
                results.errors.push({ name: p.name, error: err.message })
            }
        }

        return NextResponse.json(results)

    } catch (error: any) {
        console.error('Batch import error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const businessId = await getBusinessId(supabase)

        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { ids } = body

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })
        }

        await productQueries.deleteProducts(ids, businessId)

        return NextResponse.json({ success: true, count: ids.length })
    } catch (error: any) {
        console.error('Batch delete error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()
        const businessId = await getBusinessId(supabase)

        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { ids, updates } = body

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })
        }

        await productQueries.updateProducts(ids, updates, businessId)

        return NextResponse.json({ success: true, count: ids.length })
    } catch (error: any) {
        console.error('Batch update error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
