import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const saleId = searchParams.get('saleId')
        const refundId = searchParams.get('refundId')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        // Check authentication
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user profile
        const { data: profile } = await supabase
            .from('User')
            .select('role, businessId')
            .eq('id', user.id)
            .single()

        if (!profile || (profile.role !== 'OWNER' && profile.role !== 'SUPER_ADMIN' && profile.role !== 'CASHIER')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // If specific refund requested
        if (refundId) {
            const { data: refund, error } = await supabase
                .from('Refund')
                .select(`
                    *,
                    sale:Sale(*),
                    items:RefundItem(
                        *,
                        product:Product(name, sku)
                    ),
                    user:User(name)
                `)
                .eq('id', refundId)
                .single()

            if (error || !refund) {
                return NextResponse.json({ error: 'Refund not found' }, { status: 404 })
            }
            if (refund.businessId !== profile.businessId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }

            return NextResponse.json(refund)
        }

        // List refunds
        let query = supabase
            .from('Refund')
            .select(`
                *,
                sale:Sale(saleNumber),
                user:User(name),
                items:RefundItem(
                    *,
                    product:Product(name)
                )
            `)
            .eq('businessId', profile.businessId)
            .order('createdAt', { ascending: false })

        if (saleId) {
            query = query.eq('saleId', saleId)
        }

        if (startDate) {
            query = query.gte('createdAt', startDate)
        }
        if (endDate) {
            const end = new Date(endDate)
            end.setHours(23, 59, 59, 999)
            query = query.lte('createdAt', end.toISOString())
        }

        const { data: refunds, error } = await query

        if (error) {
            throw error
        }

        // Calculate totals
        const totalRefunded = refunds?.reduce((sum, r) => sum + (Number(r.total) || 0), 0) || 0

        return NextResponse.json({
            refunds: refunds || [],
            totalRefunded,
            count: refunds?.length || 0
        })

    } catch (error: any) {
        console.error('Error fetching refunds:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user profile
        const { data: profile } = await supabase
            .from('User')
            .select('role, businessId')
            .eq('id', user.id)
            .single()

        if (!profile || (profile.role !== 'OWNER' && profile.role !== 'SUPER_ADMIN' && profile.role !== 'CASHIER')) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const body = await request.json()
        const { saleId, items, paymentMethod, reason, notes } = body

        if (!saleId || !items || items.length === 0 || !reason) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        if (reason.length < 10) {
            return NextResponse.json({ error: 'Reason must be at least 10 characters' }, { status: 400 })
        }

        // Fetch sale
        const { data: sale, error: saleError } = await supabase
            .from('Sale')
            .select(`
                *,
                saleItems:SaleItem(*),
                business:Business(*)
            `)
            .eq('id', saleId)
            .single()

        if (saleError || !sale) {
            return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
        }

        if (sale.businessId !== profile.businessId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Robustly get business settings (taxRate, refundTimeLimit)
        let business = sale.business
        if (!business && sale.businessId) {
            console.log(`[Refund API] Business join failed. Fetching business ${sale.businessId} manually...`)
            const { data: fetchedBusiness, error: fetchBizError } = await supabase
                .from('Business')
                .select('*')
                .eq('id', sale.businessId)
                .single()

            if (fetchBizError) {
                console.error('[Refund API] Error fetching business manually:', fetchBizError)
            }
            business = fetchedBusiness
        }

        if (!business) {
            console.error('[Refund API] Business settings not found for sale:', saleId, 'BusinessID:', sale.businessId)
            return NextResponse.json({ error: 'Business settings not found for this sale' }, { status: 500 })
        }

        // Check refund time limit
        if (business.refundTimeLimit) {
            const daysSinceSale = (Date.now() - new Date(sale.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            if (daysSinceSale > business.refundTimeLimit) {
                return NextResponse.json({
                    error: `Refund period expired. Limit is ${business.refundTimeLimit} days.`
                }, { status: 400 })
            }
        }

        // Validate items and calculate amounts
        let refundSubtotal = 0
        let refundTax = 0
        const refundItemsData: any[] = []
        const taxRate = Number(business.taxRate) || 0

        for (const item of items) {
            const saleItem = sale.saleItems.find((si: any) => si.id === item.saleItemId)
            if (!saleItem) {
                return NextResponse.json({ error: `Item ${item.saleItemId} not found in sale` }, { status: 400 })
            }

            const currentRefunded = saleItem.quantityRefunded || 0
            const available = saleItem.quantity - currentRefunded

            if (item.quantityToRefund > available) {
                return NextResponse.json({ error: `Quantity exceeds available for item` }, { status: 400 })
            }

            const unitPrice = Number(saleItem.unitPrice)
            const itemSubtotal = unitPrice * item.quantityToRefund
            const itemTax = itemSubtotal * (taxRate / 100)
            const itemTotal = itemSubtotal + itemTax

            refundSubtotal += itemSubtotal
            refundTax += itemTax

            refundItemsData.push({
                productId: saleItem.productId,
                quantity: item.quantityToRefund,
                unitPrice,
                subtotal: itemSubtotal,
                taxAmount: itemTax,
                total: itemTotal,
                saleItemId: saleItem.id
            })
        }

        const refundTotal = refundSubtotal + refundTax // Total refund amount for this transaction

        // Determine new Refund Status for the Sale
        // We need to check if *after* this refund, everything is refunded.
        let allItemsFullyRefunded = true
        for (const si of sale.saleItems) {
            const refundingItem = items.find((i: any) => i.saleItemId === si.id)
            const qtyRefundedAfter = (si.quantityRefunded || 0) + (refundingItem ? refundingItem.quantityToRefund : 0)
            if (qtyRefundedAfter < si.quantity) {
                allItemsFullyRefunded = false
                break
            }
        }
        const newSaleRefundStatus = allItemsFullyRefunded ? 'FULL' : 'PARTIAL'
        const newTotalRefunded = (Number(sale.totalRefunded) || 0) + refundTotal

        // Generate Refund Number
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
        const { count } = await supabase
            .from('Refund')
            .select('*', { count: 'exact', head: true })
            .ilike('refundNumber', `REF-${dateStr}%`)

        const refundNumber = `REF-${dateStr}-${String((count || 0) + 1).padStart(4, '0')}`
        const refundId = uuidv4()

        // 1. Create Refund Record
        const { error: insertError } = await supabase
            .from('Refund')
            .insert({
                id: refundId,
                refundNumber,
                saleId,
                refundType: newSaleRefundStatus, // This refund's type? Or the sale's status? Usually "PARTIAL" or "FULL" refers to THIS refund transaction type relative to sale? Actually usually it marks the sale status. I'll save the resulting status.
                subtotal: refundSubtotal,
                taxAmount: refundTax,
                total: refundTotal,
                paymentMethod,
                reason,
                notes,
                status: 'COMPLETED',
                processedBy: user.id,
                businessId: profile.businessId
            })

        if (insertError) throw new Error(`Failed to create refund: ${insertError.message}`)

        // 2. Create Refund Items
        for (const item of refundItemsData) {
            const { error: itemError } = await supabase
                .from('RefundItem')
                .insert({
                    id: uuidv4(),
                    refundId: refundId,
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    subtotal: item.subtotal,
                    taxAmount: item.taxAmount,
                    total: item.total
                })
            if (itemError) console.error('Error creating refund item:', itemError)
        }

        // 3. Update Sale Items (quantityRefunded)
        for (const item of items) {
            const saleItem = sale.saleItems.find((si: any) => si.id === item.saleItemId)
            await supabase
                .from('SaleItem')
                .update({ quantityRefunded: (saleItem.quantityRefunded || 0) + item.quantityToRefund })
                .eq('id', item.saleItemId)
        }

        // 4. Update Sale (totalRefunded, status)
        await supabase
            .from('Sale')
            .update({
                totalRefunded: newTotalRefunded,
                refundStatus: newSaleRefundStatus
            })
            .eq('id', saleId)

        // 5. Restore Stock & Log Movement
        for (const item of refundItemsData) {
            const { data: product } = await supabase
                .from('Product')
                .select('stockLevel')
                .eq('id', item.productId)
                .single()

            if (product) {
                const newStock = (product.stockLevel || 0) + item.quantity
                await supabase
                    .from('Product')
                    .update({ stockLevel: newStock })
                    .eq('id', item.productId)

                await supabase.from('StockMovement').insert({
                    type: 'REFUND',
                    productId: item.productId,
                    quantity: item.quantity,
                    previousStock: product.stockLevel,
                    newStock,
                    reference: refundNumber,
                    reason: `Refund: ${reason}`,
                    userId: user.id
                })
            }
        }

        return NextResponse.json({
            success: true,
            refundNumber,
            message: 'Refund processed successfully'
        })

    } catch (error: any) {
        console.error('Error processing refund:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
