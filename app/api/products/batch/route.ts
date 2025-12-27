import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

// Helper to get business ID
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

// Helper to sanitize price values
function cleanPrice(value: any): number {
    if (value === null || value === undefined || value === '') return 0
    const str = String(value)
    // Remove currency symbols, commas, spaces
    const cleaned = str.replace(/[$€£¥₹,\s]/g, '').replace(/,/g, '.')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : Math.max(0, parsed)
}

// Helper to parse integer with validation
function cleanInt(value: any, defaultValue: number = 0): number {
    if (value === null || value === undefined || value === '') return defaultValue
    const parsed = parseInt(String(value).replace(/[^\d-]/g, ''))
    return isNaN(parsed) ? defaultValue : parsed
}

// Helper to upload image from URL
async function processImage(supabase: any, imageUrl: string, businessId: string, sku: string): Promise<string | null> {
    try {
        if (!imageUrl || !imageUrl.startsWith('http')) return imageUrl

        // 1. Download image
        const response = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) })
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`)

        // 2. Validate Size (5MB)
        const blob = await response.blob()
        if (blob.size > 5 * 1024 * 1024) throw new Error('Image too large (>5MB)')

        // 3. Validate Type
        const type = blob.type
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) {
            // Fallback: If unknown type but downloaded ok, maybe try to save anyway or skip
            // stricter check: throw new Error('Invalid image type')
            // lenient: proceed if type is image/*
            if (!type.startsWith('image/')) throw new Error('Invalid content type')
        }

        // 4. Upload to Supabase
        const ext = type.split('/')[1] || 'jpg'
        const path = `${businessId}/${sku}-${Date.now()}.${ext}`

        // Convert blob to ArrayBuffer for upload
        const arrayBuffer = await blob.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(path, buffer, { contentType: type, upsert: true })

        if (uploadError) throw uploadError

        // 5. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(path)

        return publicUrl
    } catch (error) {
        console.warn(`Image processing failed for SKU ${sku}:`, error)
        return imageUrl // Fallback to original URL
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Check authentication and Get Business ID
        const businessId = await getBusinessId(supabase)
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized or Business not found' }, { status: 401 })
        }

        const { products } = await request.json()

        if (!Array.isArray(products) || products.length === 0) {
            return NextResponse.json({ error: 'Products array is required' }, { status: 400 })
        }

        // Limit batch size
        if (products.length > 500) {
            return NextResponse.json({ error: 'Maximum 500 products per batch' }, { status: 400 })
        }

        // --- Validation Phase ---

        // Check for duplicate SKUs within the import (Case Insensitive)
        const skus = products.map((p: any) => String(p.sku || '').trim().toLowerCase()).filter(Boolean)
        const duplicateSKUs = skus.filter((sku: string, index: number) => skus.indexOf(sku) !== index)
        if (duplicateSKUs.length > 0) {
            return NextResponse.json({
                error: 'Duplicate SKUs found in import',
                duplicates: [...new Set(duplicateSKUs)]
            }, { status: 400 })
        }

        // Check for duplicate Barcodes within the import
        const barcodes = products
            .map((p: any) => p.barcode ? String(p.barcode).trim() : null)
            .filter((b): b is string => b !== null && b !== '') // Type guard

        // Check for duplicate Names within the import (Case Insensitive)
        const names = products.map((p: any) => String(p.name || '').trim().toLowerCase()).filter(Boolean)
        const duplicateNames = names.filter((name: string, index: number) => names.indexOf(name) !== index)
        if (duplicateNames.length > 0) {
            return NextResponse.json({
                error: 'Duplicate Product Names found in import data',
                duplicates: [...new Set(duplicateNames)]
            }, { status: 400 })
        }

        const results = {
            success: 0,
            failed: 0,
            errors: [] as { row: number; error: string; sku?: string; name?: string }[]
        }

        // --- Fetch Existing Products (SKU, Barcode, Name) ---
        // Fetch by SKU
        const { data: existingProductsBySku } = await supabase
            .from('Product')
            .select('id, sku, stockLevel, isActive, barcode, name')
            .eq('businessId', businessId)
            .in('sku', products.map((p: any) => p.sku))

        // Fetch by Barcode (global)
        const { data: existingProductsByBarcode } = await supabase
            .from('Product')
            .select('id, sku, barcode')
            .in('barcode', barcodes)

        // Fetch by Name (business scoped)
        // Note: 'in' query with lowercased names isn't directly supported on simple columns without a computed column or ILIKE ANY (which is raw SQL).
        // Since we can't easily do efficient ILIKE ANY via standard SDK, we filter by EXACT name from CSV. This covers most Copy-Paste errors.
        const { data: existingProductsByName } = await supabase
            .from('Product')
            .select('id, sku, name')
            .eq('businessId', businessId)
            .in('name', products.map((p: any) => String(p.name).trim()))

        // Create Maps
        const productMap = new Map() // Normalized SKU -> Product
        existingProductsBySku?.forEach((p: any) => {
            productMap.set(p.sku.toLowerCase(), p)
        })

        const barcodeMap = new Map() // Barcode -> SKU
        existingProductsByBarcode?.forEach((p: any) => {
            if (p.barcode) barcodeMap.set(String(p.barcode).trim(), p.sku)
        })

        const nameMap = new Map() // Normalized Name -> SKU
        existingProductsByName?.forEach((p: any) => {
            nameMap.set(p.name.toLowerCase(), p.sku)
        })


        // --- Process Categories ---
        // Extract unique category names from products
        const categoryNames = [...new Set(
            products
                .map((p: any) => p.category ? String(p.category).trim() : null)
                .filter((c): c is string => c !== null && c !== '')
        )]

        if (categoryNames.length > 0) {
            // Fetch existing categories
            const { data: existingCategories } = await supabase
                .from('ProductCategory')
                .select('id, name')
                .eq('businessId', businessId)
                .in('name', categoryNames)

            const existingCategoryNames = new Set(existingCategories?.map(c => c.name) || [])

            // Find new categories that don't exist
            const newCategories = categoryNames.filter(name => !existingCategoryNames.has(name))

            // Auto-create new categories
            if (newCategories.length > 0) {
                const categoriesToInsert = newCategories.map(name => ({
                    id: uuidv4(),
                    name,
                    description: null,
                    businessId,
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }))

                const { error: catError } = await supabase
                    .from('ProductCategory')
                    .upsert(categoriesToInsert, { onConflict: 'businessId, name' })

                if (catError) {
                    console.warn('Error auto-creating categories:', catError)
                    // Continue anyway - category will be saved as string on product
                }
            }
        }

        // --- Main Processing Loop ---
        // --- Image Processing (Parallel with Concurrency Limit) ---
        // We process images before DB updates. 
        // Simple Concurrency Limit: 5
        const CONCURRENCY_LIMIT = 5
        const productsWithImages = products.filter((p: any) => p.imageUrl && String(p.imageUrl).startsWith('http'))

        // Process images in chunks
        for (let i = 0; i < productsWithImages.length; i += CONCURRENCY_LIMIT) {
            const chunk = productsWithImages.slice(i, i + CONCURRENCY_LIMIT)
            await Promise.all(chunk.map(async (product: any) => {
                const sku = String(product.sku || '').trim()
                if (sku) {
                    product.imageUrl = await processImage(supabase, product.imageUrl, businessId, sku)
                }
            }))
        }

        // --- Database Processing ---

        for (let i = 0; i < products.length; i++) {
            const product = products[i]
            const rowNum = i + 1
            const normalizedSku = String(product.sku || '').trim().toLowerCase()

            try {
                // Basic Validations
                if (!product.name || String(product.name).trim() === '') {
                    results.errors.push({ row: rowNum, error: 'Name is required', sku: product.sku })
                    results.failed++
                    continue
                }
                if (!product.sku || String(product.sku).trim() === '') {
                    results.errors.push({ row: rowNum, error: 'SKU is required', name: product.name })
                    results.failed++
                    continue
                }
                // Validate name length
                if (String(product.name).length > 200) {
                    results.errors.push({ row: rowNum, error: 'Name too long (max 200 chars)', sku: product.sku })
                    results.failed++
                    continue
                }
                // Validate SKU length
                if (String(product.sku).length > 50) {
                    results.errors.push({ row: rowNum, error: 'SKU too long (max 50 chars)', sku: product.sku })
                    results.failed++
                    continue
                }

                // Values
                const sellingPrice = cleanPrice(product.sellingPrice)
                const costPrice = cleanPrice(product.costPrice)
                const stockLevelImport = cleanInt(product.stockLevel, 0)
                const lowStockThreshold = cleanInt(product.lowStockThreshold, 10)

                if (sellingPrice < 0 || costPrice < 0 || stockLevelImport < 0 || lowStockThreshold < 0) {
                    results.errors.push({ row: rowNum, error: 'Negative values not allowed', sku: product.sku })
                    results.failed++
                    continue
                }

                // Check for barcode collision against DB
                if (product.barcode) {
                    const barcode = String(product.barcode).trim()
                    const existingSkuForBarcode = barcodeMap.get(barcode)

                    // If barcode exists, and belongs to a DIFFERENT SKU (case-insensitive check)
                    if (existingSkuForBarcode && existingSkuForBarcode.toLowerCase() !== normalizedSku) {
                        results.errors.push({
                            row: rowNum,
                            error: `Barcode '${barcode}' is already assigned to SKU '${existingSkuForBarcode}'`,
                            sku: product.sku
                        })
                        results.failed++
                        continue
                    }
                }

                // Check for Name collision against DB (Business Scoped)
                const name = String(product.name).trim()
                const existingSkuForName = nameMap.get(name.toLowerCase())
                if (existingSkuForName && existingSkuForName.toLowerCase() !== normalizedSku) {
                    results.errors.push({
                        row: rowNum,
                        error: `Product Name '${name}' is already used by SKU '${existingSkuForName}'`,
                        sku: product.sku
                    })
                    results.failed++
                    continue
                }

                // Logic for Stock and Active Status
                let finalStockLevel = stockLevelImport
                let isActive = product.isActive !== false

                const existingProduct = productMap.get(normalizedSku)

                if (existingProduct) {
                    // Scenario 1: Product Exists
                    if (existingProduct.isActive) {
                        // If Active: Add stock
                        finalStockLevel = (existingProduct.stockLevel || 0) + stockLevelImport
                    } else {
                        // If Inactive (Deleted): Restore and Reset stock
                        isActive = true // Restore
                        finalStockLevel = stockLevelImport // Use new value (Reset)
                    }
                }

                // Prepare Data
                const productData = {
                    name: String(product.name).trim(),
                    sku: String(product.sku).trim(), // Keep original case for display
                    barcode: product.barcode ? String(product.barcode).trim() : null,
                    description: product.description ? String(product.description).trim() : null,
                    category: product.category ? String(product.category).trim() : null,
                    costPrice,
                    sellingPrice,
                    stockLevel: finalStockLevel,
                    lowStockThreshold,
                    taxable: product.taxable !== false,
                    isActive,
                    businessId,
                    imageUrl: product.imageUrl || null,
                    updatedAt: new Date().toISOString(),
                }

                // DB Operation
                const { error } = await supabase
                    .from('Product')
                    .upsert({
                        ...productData,
                        id: existingProduct?.id || uuidv4() // Use existing ID if match, else new
                    }, { onConflict: 'sku, businessId' }) // Composite key matches DB index

                if (error) {
                    // Check for specific constraint violations
                    if (error.message.includes('duplicate') || error.message.includes('unique')) {
                        // We already checked Barcode/SKU pre-flight, but race conditions exist
                        results.errors.push({ row: rowNum, error: `Database constraint violation (SKU or Barcode duplicate)`, sku: product.sku })
                    } else {
                        results.errors.push({ row: rowNum, error: error.message, sku: product.sku })
                    }
                    results.failed++
                } else {
                    results.success++
                }

            } catch (err: any) {
                results.errors.push({ row: rowNum, error: err.message || 'Unknown error', sku: product.sku })
                results.failed++
            }
        }

        return NextResponse.json({
            message: `Imported ${results.success} products, ${results.failed} failed`,
            success: results.success,
            failed: results.failed,
            errors: results.errors
        })
    } catch (error: any) {
        console.error('Error batch import:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}


export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()

        // Check authentication and Get Business ID
        const businessId = await getBusinessId(supabase)
        if (!businessId) {
            return NextResponse.json({ error: 'Unauthorized or Business not found' }, { status: 401 })
        }

        const body = await request.json()
        const { ids } = body

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'Product IDs array is required' }, { status: 400 })
        }

        // Perform bulk soft delete
        const { error } = await supabase
            .from('Product')
            .update({
                isActive: false,
                updatedAt: new Date().toISOString()
            })
            .in('id', ids)
            .eq('businessId', businessId)

        if (error) {
            console.error('Error batch deleting products:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: `Successfully deleted ${ids.length} products`
        })
    } catch (error: any) {
        console.error('Error in batch delete handler:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
