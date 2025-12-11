import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function seedDemoData() {
  try {
    console.log('🌱 Starting to seed demo data...\n')

    // Get users for created_by fields
    const { data: users } = await supabase.auth.admin.listUsers()
    const adminUser = users?.users.find(u => u.email === 'admin@posystem.local')
    const cashierUser = users?.users.find(u => u.email === 'cashier@posystem.local')
    const stockUser = users?.users.find(u => u.email === 'stock@posystem.local')

    if (!adminUser || !cashierUser || !stockUser) {
      console.error('❌ Required users not found')
      return
    }

    // 1. SEED PRODUCTS
    console.log('📦 Adding products...')
    const products = [
      // Beverages
      { name: 'Coca Cola 330ml', description: 'Refreshing cola drink', price: 25.00, stock_quantity: 100, sku: 'COC-330', category: 'Beverages', created_by: stockUser.id },
      { name: 'Pepsi 330ml', description: 'Classic pepsi cola', price: 25.00, stock_quantity: 80, sku: 'PEP-330', category: 'Beverages', created_by: stockUser.id },
      { name: 'Sprite 330ml', description: 'Lemon-lime soda', price: 25.00, stock_quantity: 75, sku: 'SPR-330', category: 'Beverages', created_by: stockUser.id },
      { name: 'Orange Juice 1L', description: 'Fresh orange juice', price: 95.00, stock_quantity: 22, sku: 'JUI-ORA', category: 'Beverages', created_by: stockUser.id },
      { name: 'Apple Juice 1L', description: 'Fresh apple juice', price: 95.00, stock_quantity: 20, sku: 'JUI-APP', category: 'Beverages', created_by: stockUser.id },
      { name: 'Water 1.5L', description: 'Mineral water', price: 35.00, stock_quantity: 100, sku: 'WAT-1.5L', category: 'Beverages', created_by: stockUser.id },
      { name: 'Coffee 200g', description: 'Ground coffee', price: 150.00, stock_quantity: 15, sku: 'COF-200', category: 'Beverages', created_by: stockUser.id },
      { name: 'Tea Bags (25)', description: 'Black tea bags', price: 85.00, stock_quantity: 25, sku: 'TEA-25', category: 'Beverages', created_by: stockUser.id },

      // Bakery
      { name: 'White Bread', description: 'Fresh white bread loaf', price: 35.00, stock_quantity: 50, sku: 'BRD-WHT', category: 'Bakery', created_by: stockUser.id },
      { name: 'Brown Bread', description: 'Whole wheat bread', price: 40.00, stock_quantity: 40, sku: 'BRD-BRN', category: 'Bakery', created_by: stockUser.id },
      { name: 'Croissant', description: 'Butter croissant', price: 45.00, stock_quantity: 30, sku: 'CRO-BUT', category: 'Bakery', created_by: stockUser.id },
      { name: 'Donut', description: 'Glazed donut', price: 30.00, stock_quantity: 40, sku: 'DON-GLZ', category: 'Bakery', created_by: stockUser.id },

      // Dairy
      { name: 'Fresh Milk 1L', description: 'Full cream fresh milk', price: 65.00, stock_quantity: 30, sku: 'MLK-1L', category: 'Dairy', created_by: stockUser.id },
      { name: 'Yogurt 500g', description: 'Plain yogurt', price: 55.00, stock_quantity: 25, sku: 'YOG-500', category: 'Dairy', created_by: stockUser.id },
      { name: 'Eggs (12 pack)', description: 'Fresh farm eggs', price: 85.00, stock_quantity: 40, sku: 'EGG-12', category: 'Dairy', created_by: stockUser.id },
      { name: 'Butter 250g', description: 'Salted butter', price: 90.00, stock_quantity: 20, sku: 'BUT-250', category: 'Dairy', created_by: stockUser.id },
      { name: 'Cheese Slice 200g', description: 'Processed cheese slices', price: 110.00, stock_quantity: 18, sku: 'CHE-200', category: 'Dairy', created_by: stockUser.id },

      // Groceries
      { name: 'Rice 5kg', description: 'Premium basmati rice', price: 220.00, stock_quantity: 25, sku: 'RIC-5KG', category: 'Groceries', created_by: stockUser.id },
      { name: 'Cooking Oil 2L', description: 'Vegetable cooking oil', price: 180.00, stock_quantity: 20, sku: 'OIL-2L', category: 'Groceries', created_by: stockUser.id },
      { name: 'Pasta 500g', description: 'Italian pasta', price: 45.00, stock_quantity: 35, sku: 'PAS-500', category: 'Groceries', created_by: stockUser.id },
      { name: 'Tomato Sauce 500ml', description: 'Pasta sauce', price: 75.00, stock_quantity: 30, sku: 'SAU-TOM', category: 'Groceries', created_by: stockUser.id },
      { name: 'Sugar 1kg', description: 'White sugar', price: 55.00, stock_quantity: 40, sku: 'SUG-1KG', category: 'Groceries', created_by: stockUser.id },
      { name: 'Salt 500g', description: 'Iodized salt', price: 25.00, stock_quantity: 50, sku: 'SAL-500', category: 'Groceries', created_by: stockUser.id },
      { name: 'Flour 1kg', description: 'All-purpose flour', price: 45.00, stock_quantity: 30, sku: 'FLO-1KG', category: 'Groceries', created_by: stockUser.id },

      // Snacks
      { name: 'Potato Chips', description: 'Salted potato chips', price: 35.00, stock_quantity: 50, sku: 'SNK-CHP', category: 'Snacks', created_by: stockUser.id },
      { name: 'Chocolate Bar', description: 'Milk chocolate', price: 40.00, stock_quantity: 60, sku: 'SNK-CHC', category: 'Snacks', created_by: stockUser.id },
      { name: 'Cookies Pack', description: 'Assorted cookies', price: 55.00, stock_quantity: 35, sku: 'SNK-COK', category: 'Snacks', created_by: stockUser.id },
      { name: 'Nuts Mix 200g', description: 'Mixed nuts', price: 120.00, stock_quantity: 20, sku: 'SNK-NUT', category: 'Snacks', created_by: stockUser.id },

      // Personal Care
      { name: 'Soap Bar', description: 'Bathing soap', price: 30.00, stock_quantity: 45, sku: 'SOP-BAR', category: 'Personal Care', created_by: stockUser.id },
      { name: 'Shampoo 400ml', description: 'Hair shampoo', price: 120.00, stock_quantity: 20, sku: 'SHA-400', category: 'Personal Care', created_by: stockUser.id },
      { name: 'Toothpaste 100g', description: 'Dental care', price: 65.00, stock_quantity: 35, sku: 'TOP-100', category: 'Personal Care', created_by: stockUser.id },
      { name: 'Tissue Box', description: 'Facial tissues', price: 55.00, stock_quantity: 28, sku: 'TIS-BOX', category: 'Personal Care', created_by: stockUser.id },

      // Household
      { name: 'Paper Towels', description: 'Kitchen paper towels', price: 75.00, stock_quantity: 25, sku: 'PAP-TOW', category: 'Household', created_by: stockUser.id },
      { name: 'Dish Soap 500ml', description: 'Dishwashing liquid', price: 85.00, stock_quantity: 22, sku: 'DIS-500', category: 'Household', created_by: stockUser.id },
      { name: 'Laundry Detergent 1kg', description: 'Washing powder', price: 165.00, stock_quantity: 18, sku: 'LAU-1KG', category: 'Household', created_by: stockUser.id },
    ]

    const { data: insertedProducts, error: productsError } = await supabase
      .from('products')
      .insert(products)
      .select()

    if (productsError) {
      console.error('Error inserting products:', productsError)
      return
    }
    console.log(`✅ Added ${insertedProducts.length} products\n`)

    // 2. SEED CUSTOMERS
    console.log('👥 Adding customers...')
    const customers = [
      { name: 'John Doe', email: 'john.doe@example.com', phone: '+1234567890', address: '123 Main St, Springfield', created_by: cashierUser.id },
      { name: 'Jane Smith', email: 'jane.smith@example.com', phone: '+0987654321', address: '456 Oak Ave, Riverside', created_by: cashierUser.id },
      { name: 'Bob Johnson', email: 'bob.johnson@example.com', phone: '+1122334455', address: '789 Pine Rd, Greenville', created_by: cashierUser.id },
      { name: 'Alice Williams', email: 'alice.w@example.com', phone: '+2233445566', address: '321 Elm St, Lakeside', created_by: cashierUser.id },
      { name: 'Charlie Brown', email: 'charlie.b@example.com', phone: '+3344556677', address: '654 Maple Dr, Hilltown', created_by: cashierUser.id },
      { name: 'Diana Prince', email: 'diana.prince@example.com', phone: '+4455667788', address: '987 Cedar Ln, Seaside', created_by: cashierUser.id },
      { name: 'Eve Anderson', email: 'eve.anderson@example.com', phone: '+5566778899', address: '147 Birch Rd, Valleyview', created_by: cashierUser.id },
      { name: 'Frank Miller', email: 'frank.miller@example.com', phone: '+6677889900', address: '258 Ash St, Mountainview', created_by: cashierUser.id },
      { name: 'Grace Lee', email: 'grace.lee@example.com', phone: '+7788990011', address: '369 Willow Way, Brookside', created_by: cashierUser.id },
      { name: 'Henry Taylor', email: 'henry.taylor@example.com', phone: '+8899001122', address: '753 Spruce Ct, Riverside', created_by: cashierUser.id },
    ]

    const { data: insertedCustomers, error: customersError } = await supabase
      .from('customers')
      .insert(customers)
      .select()

    if (customersError) {
      console.error('Error inserting customers:', customersError)
      return
    }
    console.log(`✅ Added ${insertedCustomers.length} customers\n`)

    // 3. SEED TRANSACTIONS (Sales)
    console.log('💰 Adding sales transactions...')

    // Helper function to get random items from array
    const getRandomItems = (arr: any[], count: number) => {
      const shuffled = [...arr].sort(() => 0.5 - Math.random())
      return shuffled.slice(0, count)
    }

    // Helper function to get random date in last 30 days
    const getRandomDate = (daysAgo: number) => {
      const date = new Date()
      date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo))
      date.setHours(Math.floor(Math.random() * 12) + 8) // Random hour between 8am-8pm
      date.setMinutes(Math.floor(Math.random() * 60))
      return date.toISOString()
    }

    const paymentMethods = ['cash', 'card', 'mobile_payment']

    // Create 20 sample transactions
    for (let i = 0; i < 20; i++) {
      const customer = insertedCustomers[Math.floor(Math.random() * insertedCustomers.length)]
      const transactionProducts = getRandomItems(insertedProducts, Math.floor(Math.random() * 5) + 2) // 2-6 items

      let totalAmount = 0
      const items = transactionProducts.map(product => {
        const quantity = Math.floor(Math.random() * 3) + 1 // 1-3 quantity
        const subtotal = parseFloat(product.price) * quantity
        totalAmount += subtotal

        return {
          product_id: product.id,
          quantity,
          unit_price: product.price,
          subtotal
        }
      })

      // Insert transaction
      const { data: transaction, error: transError } = await supabase
        .from('transactions')
        .insert({
          customer_id: customer.id,
          total_amount: totalAmount.toFixed(2),
          payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          status: 'completed',
          created_at: getRandomDate(30),
          created_by: cashierUser.id
        })
        .select()
        .single()

      if (transError) {
        console.error(`Error creating transaction ${i + 1}:`, transError)
        continue
      }

      // Insert transaction items
      const itemsWithTransactionId = items.map(item => ({
        ...item,
        transaction_id: transaction.id
      }))

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(itemsWithTransactionId)

      if (itemsError) {
        console.error(`Error creating items for transaction ${i + 1}:`, itemsError)
        continue
      }

      console.log(`  ✅ Transaction ${i + 1}/20 - Customer: ${customer.name} - Total: $${totalAmount.toFixed(2)}`)
    }

    console.log('\n🎉 Demo data seeding completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`  • ${insertedProducts.length} products`)
    console.log(`  • ${insertedCustomers.length} customers`)
    console.log(`  • 20 sales transactions`)
    console.log('\nYou can now view this data in your POS system!')
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

seedDemoData()
