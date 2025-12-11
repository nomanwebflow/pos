import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create a default business
  const business = await prisma.business.upsert({
    where: { id: 'default-business' },
    update: {},
    create: {
      id: 'default-business',
      name: 'Demo Store',
      address: 'Port Louis, Mauritius',
      phone: '+230 1234 5678',
      email: 'contact@demostore.mu',
      currency: 'MUR',
      taxRate: 15.0,
    },
  })

  console.log('Business created:', business.name)

  // Create default users
  const hashedPassword = await bcrypt.hash('password123', 10)

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@demostore.mu' },
    update: {},
    create: {
      email: 'admin@demostore.mu',
      name: 'Super Admin',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      businessId: business.id,
    },
  })

  const seller = await prisma.user.upsert({
    where: { email: 'seller@demostore.mu' },
    update: {},
    create: {
      email: 'seller@demostore.mu',
      name: 'John Seller',
      password: hashedPassword,
      role: 'SELLER',
      businessId: business.id,
    },
  })

  const stockManager = await prisma.user.upsert({
    where: { email: 'stock@demostore.mu' },
    update: {},
    create: {
      email: 'stock@demostore.mu',
      name: 'Jane Stock',
      password: hashedPassword,
      role: 'STOCK_MANAGER',
      businessId: business.id,
    },
  })

  const finance = await prisma.user.upsert({
    where: { email: 'finance@demostore.mu' },
    update: {},
    create: {
      email: 'finance@demostore.mu',
      name: 'Bob Finance',
      password: hashedPassword,
      role: 'FINANCE',
      businessId: business.id,
    },
  })

  const owner = await prisma.user.upsert({
    where: { email: 'owner@demostore.mu' },
    update: {},
    create: {
      email: 'owner@demostore.mu',
      name: 'Alice Owner',
      password: hashedPassword,
      role: 'OWNER',
      businessId: business.id,
    },
  })

  console.log('Users created')

  // Create sample products
  const products = [
    {
      name: 'Coca Cola 330ml',
      sku: 'COKE-330',
      barcode: '5449000000996',
      category: 'Beverages',
      costPrice: 15.0,
      sellingPrice: 25.0,
      stockLevel: 100,
      lowStockThreshold: 20,
      businessId: business.id,
    },
    {
      name: 'White Bread',
      sku: 'BREAD-001',
      barcode: '6001087370400',
      category: 'Bakery',
      costPrice: 20.0,
      sellingPrice: 35.0,
      stockLevel: 50,
      lowStockThreshold: 10,
      businessId: business.id,
    },
    {
      name: 'Fresh Milk 1L',
      sku: 'MILK-1L',
      barcode: '6001087901017',
      category: 'Dairy',
      costPrice: 45.0,
      sellingPrice: 65.0,
      stockLevel: 30,
      lowStockThreshold: 15,
      businessId: business.id,
    },
    {
      name: 'Rice 5kg',
      sku: 'RICE-5KG',
      barcode: '6001087426510',
      category: 'Groceries',
      costPrice: 150.0,
      sellingPrice: 220.0,
      stockLevel: 25,
      lowStockThreshold: 5,
      businessId: business.id,
    },
    {
      name: 'Cooking Oil 2L',
      sku: 'OIL-2L',
      barcode: '6001087350532',
      category: 'Groceries',
      costPrice: 120.0,
      sellingPrice: 180.0,
      stockLevel: 15,
      lowStockThreshold: 8,
      businessId: business.id,
    },
  ]

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    })
  }

  console.log('Products created')

  console.log('Seeding completed!')
  console.log('\nLogin credentials:')
  console.log('Super Admin: admin@demostore.mu / password123')
  console.log('Seller: seller@demostore.mu / password123')
  console.log('Stock Manager: stock@demostore.mu / password123')
  console.log('Finance: finance@demostore.mu / password123')
  console.log('Owner: owner@demostore.mu / password123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
