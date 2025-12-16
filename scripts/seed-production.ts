import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.production
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Must use Service Key for bypass RLS if any

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Credentials')
    console.log('URL:', supabaseUrl)
    console.log('KEY:', supabaseKey ? 'Found' : 'Missing')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const DEFAULT_BUSINESS_ID = 'default-business'
const DEFAULT_USER_ID = 'ab4b297d-7a32-420a-be0e-298989080e96'

async function seed() {
    console.log('Seeding Production Data...')

    // Products Data
    const productsData = [
        { name: 'Coca Cola 330ml', description: 'Refreshing cola drink', price: 25.00, stock: 100, sku: 'COC-330', category: 'Beverages' },
        { name: 'Pepsi 330ml', description: 'Classic pepsi cola', price: 25.00, stock: 80, sku: 'PEP-330', category: 'Beverages' },
        { name: 'Water 1.5L', description: 'Mineral water', price: 35.00, stock: 100, sku: 'WAT-1.5L', category: 'Beverages' },
        { name: 'White Bread', description: 'Fresh white bread loaf', price: 35.00, stock: 50, sku: 'BRD-WHT', category: 'Bakery' },
        { name: 'Croissant', description: 'Butter croissant', price: 45.00, stock: 30, sku: 'CRO-BUT', category: 'Bakery' },
        { name: 'Fresh Milk 1L', description: 'Full cream fresh milk', price: 65.00, stock: 30, sku: 'MLK-1L', category: 'Dairy' },
        { name: 'Rice 5kg', description: 'Premium basmati rice', price: 220.00, stock: 25, sku: 'RIC-5KG', category: 'Groceries' },
        { name: 'Potato Chips', description: 'Salted potato chips', price: 35.00, stock: 50, sku: 'SNK-CHP', category: 'Snacks' },
        { name: 'Soap Bar', description: 'Bathing soap', price: 30.00, stock: 45, sku: 'SOP-BAR', category: 'Personal Care' }
    ]

    const createdProducts: any[] = []

    for (const p of productsData) {
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        const { error } = await supabase.from('Product').insert({
            id,
            name: p.name,
            description: p.description,
            sellingPrice: p.price,
            stockLevel: p.stock,
            sku: p.sku,
            category: p.category,
            barcode: p.sku, // Use SKU as barcode
            businessId: DEFAULT_BUSINESS_ID,
            isActive: true, // boolean in POSTGRES
            taxable: true, // boolean
            lowStockThreshold: 10,
            createdAt: now,
            updatedAt: now
        })

        if (error) {
            // Ignore duplicate SKU error if already seeded
            if (error.code === '23505') {
                // conflict, fetch existing to link to sale
                const { data: existing } = await supabase.from('Product').select('*').eq('sku', p.sku).single()
                if (existing) createdProducts.push(existing)
                continue;
            }
            console.error('Error creating product:', p.name, error)
        } else {
            createdProducts.push({ ...p, id })
        }
    }
    console.log(`Seeded ${createdProducts.length} products`)

    // Customers Data
    const customersData = [
        { name: 'John Doe', email: 'john.doe@example.com', phone: '+1234567890' },
        { name: 'Jane Smith', email: 'jane.smith@example.com', phone: '+0987654321' },
        { name: 'Bob Johnson', email: 'bob.johnson@example.com', phone: '+1122334455' }
    ]

    const createdCustomers: any[] = []

    for (const c of customersData) {
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        const { error } = await supabase.from('Customer').insert({
            id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            address: '123 Seed Street',
            isActive: true, // boolean
            businessId: DEFAULT_BUSINESS_ID,
            createdAt: now,
            updatedAt: now
        })
        if (error) {
            if (error.code === '23505') {
                // conflict
                const { data: existing } = await supabase.from('Customer').select('*').eq('email', c.email).single()
                if (existing) createdCustomers.push(existing)
                continue;
            }
            console.error('Error creating customer:', c.name, error)
        } else {
            createdCustomers.push({ ...c, id })
        }
    }
    console.log(`Seeded ${createdCustomers.length} customers`)

    // Sales (Transactions)
    // Create 5 random sales
    if (createdProducts.length > 0 && createdCustomers.length > 0) {
        console.log('Seeding Sales...')
        for (let i = 0; i < 5; i++) {
            const saleId = crypto.randomUUID()
            const saleNumber = `SALE-SEED-${Date.now()}-${i}`
            const customer = createdCustomers[i % createdCustomers.length]
            const product = createdProducts[i % createdProducts.length]
            const quantity = Math.floor(Math.random() * 3) + 1
            const subtotal = product.sellingPrice * quantity
            const tax = subtotal * 0.15 // 15% tax
            const total = subtotal + tax
            const now = new Date(Date.now() - Math.floor(Math.random() * 100000000)).toISOString()

            // Insert Sale
            const { error: saleError } = await supabase.from('Sale').insert({
                id: saleId,
                saleNumber,
                subtotal,
                taxAmount: tax,
                discount: 0,
                total,
                paymentMethod: 'CASH',
                cashReceived: total,
                cashChange: 0,
                userId: DEFAULT_USER_ID,
                businessId: DEFAULT_BUSINESS_ID,
                createdAt: now,
                customerId: customer.id
            })

            if (saleError) {
                console.error('Error creating sale:', saleError)
                continue
            }

            // Insert SaleItem
            const itemId = crypto.randomUUID()
            const { error: itemError } = await supabase.from('SaleItem').insert({
                id: itemId,
                saleId,
                productId: product.id,
                quantity,
                unitPrice: product.sellingPrice,
                subtotal,
                taxAmount: tax,
                total,
                createdAt: now
            })

            if (itemError) {
                console.error('Error creating sale item:', itemError)
            }
        }
        console.log('Seeded sales')
    }
}

seed().catch(console.error)
