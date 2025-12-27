import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'
import { RefundCreateSchema } from '@/lib/validations'
import { differenceInCalendarDays } from 'date-fns'


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

        const json = await request.json()
        const validation = RefundCreateSchema.safeParse(json)

        if (!validation.success) {
            return NextResponse.json({
                error: 'Validation Error',
                details: validation.error.format()
            }, { status: 400 })
        }

        const { saleId, items, paymentMethod, reason, notes } = validation.data

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

        // Check refund time limit (Robust Calendar Days Check)
        if (business.refundTimeLimit) {
            const daysSinceSale = differenceInCalendarDays(new Date(), new Date(sale.createdAt))
            if (daysSinceSale > business.refundTimeLimit) {
                return NextResponse.json({
                    error: `Refund period expired. Limit is ${business.refundTimeLimit} days.`,
                    details: {
                        daysSinceSale,
                        limit: business.refundTimeLimit
                    }
                }, { status: 400 })
            }
        }

        // Feature #9: Payment Method Validation (Strict Match)
        // Only enforce if original was NOT Mixed. If Mixed, any method is fine (simplified).
        // Also allow CASH refund for any method if business prefers, but here we enforce match for now as per "Strict" option requested often.
        // Actually, let's allow "CASH" for "CARD" sales commonly? No, strict is safer to prevent fraud.
        if (sale.paymentMethod !== 'MIXED' && paymentMethod !== sale.paymentMethod) {
            return NextResponse.json({
                error: `Payment method mismatch. Original sale was '${sale.paymentMethod}', cannot refund via '${paymentMethod}'.`,
                details: 'Refunds must use the same payment method as the original sale.'
            }, { status: 400 })
        }


        // Validate items and calculate amounts - PROPORTIONAL TAX & VALIDATION
        let refundSubtotal = 0
        let refundTax = 0
        const refundItemsData: any[] = []
        // const taxRate = Number(business.taxRate) || 0 // No longer used for recalculation

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

            // Fix: Proportional Tax Calculation
            // Instead of recalculating with potentially changed rate, use original tax amount
            const taxPerUnit = saleItem.quantity > 0 ? (Number(saleItem.taxAmount) / saleItem.quantity) : 0
            const itemTax = taxPerUnit * item.quantityToRefund

            const itemTotal = itemSubtotal + itemTax

            // Validation: Negative amounts (sanity check)
            if (itemSubtotal < 0 || itemTax < 0 || itemTotal < 0) {
                return NextResponse.json({ error: `Invalid negative amount calculated for item` }, { status: 400 })
            }

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

        const refundTotal = refundSubtotal + refundTax

        // Validation: Global Negative Check
        if (refundTotal <= 0) {
            return NextResponse.json({ error: `Refund total must be positive` }, { status: 400 })
        }

        // Validation: Exceeding Remaining Refundable Amount
        const totalRefundedSoFar = Number(sale.totalRefunded) || 0
        const remainingRefundable = (Number(sale.total) || 0) - totalRefundedSoFar
        if (refundTotal > (remainingRefundable + 0.01)) { // 0.01 tolerance for float
            return NextResponse.json({
                error: `Refund amount ($${refundTotal.toFixed(2)}) exceeds remaining refundable amount ($${remainingRefundable.toFixed(2)})`
            }, { status: 400 })
        }


        // Determine new Refund Status for the Sale (Feature #7 Refined)
        // Check if Total Refunded is close to Total Sale
        const newTotalRefunded = totalRefundedSoFar + refundTotal
        const totalSaleAmount = Number(sale.total) || 0

        let newSaleRefundStatus = 'PARTIAL'
        if (newTotalRefunded >= (totalSaleAmount - 0.05)) { // 5 cent tolerance
            newSaleRefundStatus = 'FULL'
        } else if (newTotalRefunded <= 0.05) {
            newSaleRefundStatus = 'NONE' // Should not happen here but good for logic
        } else {
            // Also check items logic as fallback or reinforcement?
            // If money is full, it's full. 
            newSaleRefundStatus = 'PARTIAL'
        }

        // Override if float math was weird but all items quantity are returned?
        // Let's trust the amount based logic for 'FULL' as it's the financial truth.
        if (newTotalRefunded >= (totalSaleAmount - 0.05)) {
            newSaleRefundStatus = 'FULL'
        }


        // Generate Refund Number with RETRY LOGIC for Uniqueness
        let refundNumber = ''
        let isUnique = false
        let retries = 0
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')

        while (!isUnique && retries < 5) {
            const { count } = await supabase
                .from('Refund')
                .select('*', { count: 'exact', head: true })
                .ilike('refundNumber', `REF-${dateStr}%`)

            // Add random suffix if retrying to minimize collision chance
            const suffix = retries > 0 ? `-${Math.floor(Math.random() * 1000)}` : ''
            refundNumber = `REF-${dateStr}-${String((count || 0) + 1 + retries).padStart(4, '0')}${suffix}`

            // Check if this number exists
            const { data: existing } = await supabase
                .from('Refund')
                .select('id')
                .eq('refundNumber', refundNumber)
                .single()

            if (!existing) {
                isUnique = true
            } else {
                retries++
                await new Promise(resolve => setTimeout(resolve, 50 * retries)) // Exponential backoff
            }
        }

        if (!isUnique) {
            return NextResponse.json({ error: 'Failed to generate unique refund number. Please try again.' }, { status: 500 })
        }

        const refundId = uuidv4()

        const refundPayload = {
            id: refundId,
            refundNumber,
            saleId,
            refundType: newSaleRefundStatus,
            subtotal: refundSubtotal,
            taxAmount: refundTax,
            total: refundTotal,
            paymentMethod,
            reason,
            notes,
            businessId: profile.businessId,
            newTotalRefunded // Passed for updating Sale
        }

        const itemsPayload = refundItemsData.map(item => ({
            ...item,
            quantity: item.quantity, // quantityToRefund mapping
            saleItemId: item.saleItemId // verify key name
        }))

        const { data: result, error: rpcError } = await supabase.rpc('process_refund_transaction', {
            p_refund_data: refundPayload,
            p_items: itemsPayload,
            p_user_id: user.id
        })

        if (rpcError) {
            throw new Error(`Refund RPC failed: ${rpcError.message}`)
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
