import { NextResponse } from 'next/server'
import { customerQueries } from '@/lib/db-queries'

// Default business ID for single-business setup
const DEFAULT_BUSINESS_ID = 'default-business'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('id')
    const searchQuery = searchParams.get('q')

    // Get specific customer
    if (customerId) {
      const customer = customerQueries.getCustomerById(customerId)
      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      }
      return NextResponse.json(customer)
    }

    // Search customers
    if (searchQuery) {
      const customers = customerQueries.searchCustomers(searchQuery, DEFAULT_BUSINESS_ID)
      return NextResponse.json(customers)
    }

    // Get all customers
    const customers = customerQueries.getAllCustomers(DEFAULT_BUSINESS_ID)
    return NextResponse.json(customers)
  } catch (error: any) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()

    const customerId = customerQueries.createCustomer({
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      taxNumber: data.taxNumber || null,
      notes: data.notes || null,
      isActive: 1,
      businessId: DEFAULT_BUSINESS_ID,
    })

    return NextResponse.json({ success: true, customerId })
  } catch (error: any) {
    console.error('Error creating customer:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json()
    const { id, ...updates } = data

    if (!id) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 })
    }

    customerQueries.updateCustomer(id, updates)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating customer:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 })
    }

    customerQueries.deleteCustomer(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting customer:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
