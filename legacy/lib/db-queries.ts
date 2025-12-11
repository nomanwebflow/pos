import { db } from './db'

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

// Product Queries
export const productQueries = {
  getAllProducts: (businessId: string): Product[] => {
    return db.prepare(`
      SELECT * FROM Product
      WHERE businessId = ? AND isActive = 1
      ORDER BY name ASC
    `).all(businessId) as Product[]
  },

  getProductById: (id: string): Product | undefined => {
    return db.prepare('SELECT * FROM Product WHERE id = ?').get(id) as Product | undefined
  },

  getProductByBarcode: (barcode: string, businessId: string): Product | undefined => {
    return db.prepare(`
      SELECT * FROM Product
      WHERE barcode = ? AND businessId = ? AND isActive = 1
    `).get(barcode, businessId) as Product | undefined
  },

  searchProducts: (query: string, businessId: string): Product[] => {
    const searchTerm = `%${query}%`
    return db.prepare(`
      SELECT * FROM Product
      WHERE businessId = ?
      AND isActive = 1
      AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)
      ORDER BY name ASC
      LIMIT 50
    `).all(businessId, searchTerm, searchTerm, searchTerm) as Product[]
  },

  getProductsByCategory: (category: string, businessId: string): Product[] => {
    return db.prepare(`
      SELECT * FROM Product
      WHERE category = ? AND businessId = ? AND isActive = 1
      ORDER BY name ASC
    `).all(category, businessId) as Product[]
  },

  getCategories: (businessId: string): string[] => {
    const results = db.prepare(`
      SELECT DISTINCT category FROM Product
      WHERE businessId = ? AND category IS NOT NULL AND isActive = 1
      ORDER BY category ASC
    `).all(businessId) as { category: string }[]
    return results.map(r => r.category)
  },

  getLowStockProducts: (businessId: string): Product[] => {
    return db.prepare(`
      SELECT * FROM Product
      WHERE businessId = ?
      AND isActive = 1
      AND stockLevel <= lowStockThreshold
      ORDER BY stockLevel ASC
    `).all(businessId) as Product[]
  },

  createProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO Product (
        id, name, sku, barcode, description, category, costPrice, sellingPrice,
        stockLevel, lowStockThreshold, taxable, isActive, businessId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, product.name, product.sku, product.barcode, product.description,
      product.category, product.costPrice, product.sellingPrice, product.stockLevel,
      product.lowStockThreshold, product.taxable, product.isActive, product.businessId,
      now, now
    )

    return id
  },

  updateProduct: (id: string, updates: Partial<Product>) => {
    const now = new Date().toISOString()
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ')
    const values = [...Object.values(updates), now, id]

    db.prepare(`
      UPDATE Product SET ${fields}, updatedAt = ? WHERE id = ?
    `).run(...values)
  },

  updateStock: (productId: string, newStock: number) => {
    const now = new Date().toISOString()
    db.prepare(`
      UPDATE Product SET stockLevel = ?, updatedAt = ? WHERE id = ?
    `).run(newStock, now, productId)
  }
}

// Sales Queries
export const salesQueries = {
  createSale: (sale: Omit<Sale, 'id' | 'saleNumber' | 'createdAt'>, items: Omit<SaleItem, 'id' | 'saleId' | 'createdAt'>[]) => {
    const saleId = `sale-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const saleNumber = `SALE-${Date.now()}`
    const now = new Date().toISOString()

    // Start transaction
    const transaction = db.transaction(() => {
      // Insert sale
      db.prepare(`
        INSERT INTO Sale (
          id, saleNumber, subtotal, taxAmount, discount, total,
          paymentMethod, cashReceived, cashChange, cardAmount, notes,
          userId, businessId, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        saleId, saleNumber, sale.subtotal, sale.taxAmount, sale.discount, sale.total,
        sale.paymentMethod, sale.cashReceived, sale.cashChange, sale.cardAmount, sale.notes,
        sale.userId, sale.businessId, now
      )

      // Insert sale items and update stock
      for (const item of items) {
        const itemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        // Insert sale item
        db.prepare(`
          INSERT INTO SaleItem (
            id, saleId, productId, quantity, unitPrice, subtotal, taxAmount, total, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          itemId, saleId, item.productId, item.quantity, item.unitPrice,
          item.subtotal, item.taxAmount, item.total, now
        )

        // Update product stock
        db.prepare(`
          UPDATE Product
          SET stockLevel = stockLevel - ?, updatedAt = ?
          WHERE id = ?
        `).run(item.quantity, now, item.productId)

        // Log stock movement
        const product = db.prepare('SELECT stockLevel FROM Product WHERE id = ?').get(item.productId) as { stockLevel: number }
        const movementId = `movement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        db.prepare(`
          INSERT INTO StockMovement (
            id, type, productId, quantity, previousStock, newStock, userId, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          movementId, 'SALE', item.productId, -item.quantity,
          product.stockLevel + item.quantity, product.stockLevel, sale.userId, now
        )
      }
    })

    transaction()
    return { saleId, saleNumber }
  },

  getSaleById: (id: string) => {
    const sale = db.prepare('SELECT * FROM Sale WHERE id = ?').get(id) as Sale | undefined
    if (!sale) return null

    const items = db.prepare(`
      SELECT si.*, p.name as productName, p.sku
      FROM SaleItem si
      JOIN Product p ON si.productId = p.id
      WHERE si.saleId = ?
    `).all(id)

    return { ...sale, items }
  },

  getSalesByDateRange: (businessId: string, startDate: string, endDate: string) => {
    return db.prepare(`
      SELECT s.*, u.name as userName
      FROM Sale s
      JOIN User u ON s.userId = u.id
      WHERE s.businessId = ?
      AND DATE(s.createdAt) BETWEEN DATE(?) AND DATE(?)
      ORDER BY s.createdAt DESC
    `).all(businessId, startDate, endDate)
  },

  getTodaySales: (businessId: string) => {
    const today = new Date().toISOString().split('T')[0]
    return db.prepare(`
      SELECT * FROM Sale
      WHERE businessId = ? AND DATE(createdAt) = DATE(?)
      ORDER BY createdAt DESC
    `).all(businessId, today)
  },

  getSalesStats: (businessId: string, date: string) => {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as totalSales,
        SUM(total) as totalRevenue,
        SUM(subtotal) as subtotal,
        SUM(taxAmount) as totalTax,
        SUM(discount) as totalDiscount,
        SUM(CASE WHEN paymentMethod = 'CASH' THEN total ELSE 0 END) as cashSales,
        SUM(CASE WHEN paymentMethod = 'CARD' THEN total ELSE 0 END) as cardSales,
        SUM(CASE WHEN paymentMethod = 'MIXED' THEN total ELSE 0 END) as mixedSales
      FROM Sale
      WHERE businessId = ? AND DATE(createdAt) = DATE(?)
    `).get(businessId, date)

    return stats
  }
}

// Stock Movement Queries
export const stockQueries = {
  addStockMovement: (
    productId: string,
    quantity: number,
    type: 'REFILL' | 'ADJUSTMENT',
    userId: string,
    reference?: string,
    reason?: string
  ) => {
    const now = new Date().toISOString()
    const product = db.prepare('SELECT stockLevel FROM Product WHERE id = ?').get(productId) as { stockLevel: number }
    const previousStock = product.stockLevel
    const newStock = previousStock + quantity
    const movementId = `movement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const transaction = db.transaction(() => {
      // Insert stock movement
      db.prepare(`
        INSERT INTO StockMovement (
          id, type, productId, quantity, previousStock, newStock, reference, reason, userId, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        movementId, type, productId, quantity, previousStock, newStock, reference, reason, userId, now
      )

      // Update product stock
      db.prepare(`
        UPDATE Product SET stockLevel = ?, updatedAt = ? WHERE id = ?
      `).run(newStock, now, productId)
    })

    transaction()
    return movementId
  },

  getStockHistory: (productId: string) => {
    return db.prepare(`
      SELECT sm.*, u.name as userName, p.name as productName
      FROM StockMovement sm
      JOIN User u ON sm.userId = u.id
      JOIN Product p ON sm.productId = p.id
      WHERE sm.productId = ?
      ORDER BY sm.createdAt DESC
      LIMIT 100
    `).all(productId)
  }
}

// Customer Queries
export const customerQueries = {
  getAllCustomers: (businessId: string): Customer[] => {
    return db.prepare(`
      SELECT * FROM Customer
      WHERE businessId = ? AND isActive = 1
      ORDER BY name ASC
    `).all(businessId) as Customer[]
  },

  getCustomerById: (id: string): Customer | undefined => {
    return db.prepare('SELECT * FROM Customer WHERE id = ?').get(id) as Customer | undefined
  },

  searchCustomers: (query: string, businessId: string): Customer[] => {
    const searchTerm = `%${query}%`
    return db.prepare(`
      SELECT * FROM Customer
      WHERE businessId = ?
      AND isActive = 1
      AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)
      ORDER BY name ASC
      LIMIT 50
    `).all(businessId, searchTerm, searchTerm, searchTerm) as Customer[]
  },

  createCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `customer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO Customer (
        id, name, email, phone, address, taxNumber, notes, isActive, businessId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, customer.name, customer.email, customer.phone, customer.address,
      customer.taxNumber, customer.notes, customer.isActive, customer.businessId,
      now, now
    )

    return id
  },

  updateCustomer: (id: string, updates: Partial<Omit<Customer, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>>) => {
    const now = new Date().toISOString()
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ')
    const values = [...Object.values(updates), now, id]

    db.prepare(`
      UPDATE Customer SET ${fields}, updatedAt = ? WHERE id = ?
    `).run(...values)
  },

  deleteCustomer: (id: string) => {
    db.prepare('UPDATE Customer SET isActive = 0, updatedAt = ? WHERE id = ?').run(new Date().toISOString(), id)
  },

  getCustomerSalesHistory: (customerId: string) => {
    return db.prepare(`
      SELECT * FROM Sale
      WHERE customerId = ?
      ORDER BY createdAt DESC
      LIMIT 20
    `).all(customerId)
  }
}

// Reports Queries
export const reportQueries = {
  getSalesReport: (businessId: string, startDate: string, endDate: string) => {
    return db.prepare(`
      SELECT
        DATE(createdAt) as date,
        COUNT(*) as totalSales,
        SUM(subtotal) as subtotal,
        SUM(taxAmount) as taxAmount,
        SUM(discount) as discount,
        SUM(total) as total,
        SUM(CASE WHEN paymentMethod = 'CASH' THEN total ELSE 0 END) as cashSales,
        SUM(CASE WHEN paymentMethod = 'CARD' THEN total ELSE 0 END) as cardSales,
        SUM(CASE WHEN paymentMethod = 'MIXED' THEN total ELSE 0 END) as mixedSales
      FROM Sale
      WHERE businessId = ?
      AND DATE(createdAt) BETWEEN DATE(?) AND DATE(?)
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
    `).all(businessId, startDate, endDate)
  },

  getSalesByCategory: (businessId: string, startDate: string, endDate: string) => {
    return db.prepare(`
      SELECT
        p.category,
        COUNT(DISTINCT s.id) as totalSales,
        SUM(si.quantity) as totalQuantity,
        SUM(si.subtotal) as revenue
      FROM Sale s
      JOIN SaleItem si ON s.id = si.saleId
      JOIN Product p ON si.productId = p.id
      WHERE s.businessId = ?
      AND DATE(s.createdAt) BETWEEN DATE(?) AND DATE(?)
      AND p.category IS NOT NULL
      GROUP BY p.category
      ORDER BY revenue DESC
    `).all(businessId, startDate, endDate)
  },

  getTopProducts: (businessId: string, startDate: string, endDate: string, limit: number = 10) => {
    return db.prepare(`
      SELECT
        p.id,
        p.name,
        p.sku,
        p.category,
        SUM(si.quantity) as totalQuantity,
        SUM(si.subtotal) as revenue,
        COUNT(DISTINCT s.id) as salesCount
      FROM Sale s
      JOIN SaleItem si ON s.id = si.saleId
      JOIN Product p ON si.productId = p.id
      WHERE s.businessId = ?
      AND DATE(s.createdAt) BETWEEN DATE(?) AND DATE(?)
      GROUP BY p.id, p.name, p.sku, p.category
      ORDER BY revenue DESC
      LIMIT ?
    `).all(businessId, startDate, endDate, limit)
  },

  getSalesByUser: (businessId: string, startDate: string, endDate: string) => {
    return db.prepare(`
      SELECT
        u.id,
        u.name,
        u.role,
        COUNT(*) as totalSales,
        SUM(s.total) as totalRevenue
      FROM Sale s
      JOIN User u ON s.userId = u.id
      WHERE s.businessId = ?
      AND DATE(s.createdAt) BETWEEN DATE(?) AND DATE(?)
      GROUP BY u.id, u.name, u.role
      ORDER BY totalRevenue DESC
    `).all(businessId, startDate, endDate)
  },

  getRevenueOverview: (businessId: string, startDate: string, endDate: string) => {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as totalTransactions,
        SUM(subtotal) as totalSubtotal,
        SUM(taxAmount) as totalTax,
        SUM(discount) as totalDiscount,
        SUM(total) as totalRevenue,
        AVG(total) as averageTransactionValue,
        SUM(CASE WHEN paymentMethod = 'CASH' THEN total ELSE 0 END) as cashRevenue,
        SUM(CASE WHEN paymentMethod = 'CARD' THEN total ELSE 0 END) as cardRevenue,
        SUM(CASE WHEN paymentMethod = 'MIXED' THEN total ELSE 0 END) as mixedRevenue
      FROM Sale
      WHERE businessId = ?
      AND DATE(createdAt) BETWEEN DATE(?) AND DATE(?)
    `).get(businessId, startDate, endDate)

    return stats
  },

  getDetailedSales: (businessId: string, startDate: string, endDate: string) => {
    return db.prepare(`
      SELECT
        s.id,
        s.saleNumber,
        s.total,
        s.discount,
        s.paymentMethod,
        s.createdAt,
        u.name as userName,
        c.name as customerName
      FROM Sale s
      JOIN User u ON s.userId = u.id
      LEFT JOIN Customer c ON s.customerId = c.id
      WHERE s.businessId = ?
      AND DATE(s.createdAt) BETWEEN DATE(?) AND DATE(?)
      ORDER BY s.createdAt DESC
    `).all(businessId, startDate, endDate)
  }
}

export const paymentQueries = {
  getPaymentOverview: (businessId: string, startDate: string, endDate: string) => {
    const result = db.prepare(`
      SELECT
        COUNT(*) as totalTransactions,
        COALESCE(SUM(total), 0) as totalRevenue,
        COALESCE(SUM(CASE WHEN paymentMethod = 'CASH' THEN total ELSE 0 END), 0) as cashRevenue,
        COALESCE(SUM(CASE WHEN paymentMethod = 'CARD' THEN total ELSE 0 END), 0) as cardRevenue,
        COALESCE(SUM(CASE WHEN paymentMethod = 'MIXED' THEN total ELSE 0 END), 0) as mixedRevenue,
        COUNT(CASE WHEN paymentMethod = 'CASH' THEN 1 END) as cashTransactions,
        COUNT(CASE WHEN paymentMethod = 'CARD' THEN 1 END) as cardTransactions,
        COUNT(CASE WHEN paymentMethod = 'MIXED' THEN 1 END) as mixedTransactions
      FROM Sale
      WHERE businessId = ?
      AND DATE(createdAt) BETWEEN DATE(?) AND DATE(?)
    `).get(businessId, startDate, endDate) as any

    return {
      totalTransactions: result.totalTransactions || 0,
      totalRevenue: result.totalRevenue || 0,
      cashRevenue: result.cashRevenue || 0,
      cardRevenue: result.cardRevenue || 0,
      mixedRevenue: result.mixedRevenue || 0,
      cashTransactions: result.cashTransactions || 0,
      cardTransactions: result.cardTransactions || 0,
      mixedTransactions: result.mixedTransactions || 0
    }
  },

  getDailyPaymentBreakdown: (businessId: string, startDate: string, endDate: string) => {
    return db.prepare(`
      SELECT
        DATE(createdAt) as date,
        COALESCE(SUM(total), 0) as totalRevenue,
        COALESCE(SUM(CASE WHEN paymentMethod = 'CASH' THEN total ELSE 0 END), 0) as cashRevenue,
        COALESCE(SUM(CASE WHEN paymentMethod = 'CARD' THEN total ELSE 0 END), 0) as cardRevenue,
        COALESCE(SUM(CASE WHEN paymentMethod = 'MIXED' THEN total ELSE 0 END), 0) as mixedRevenue,
        COUNT(*) as totalTransactions,
        COUNT(CASE WHEN paymentMethod = 'CASH' THEN 1 END) as cashTransactions,
        COUNT(CASE WHEN paymentMethod = 'CARD' THEN 1 END) as cardTransactions,
        COUNT(CASE WHEN paymentMethod = 'MIXED' THEN 1 END) as mixedTransactions
      FROM Sale
      WHERE businessId = ?
      AND DATE(createdAt) BETWEEN DATE(?) AND DATE(?)
      GROUP BY DATE(createdAt)
      ORDER BY DATE(createdAt) DESC
    `).all(businessId, startDate, endDate)
  },

  getCashTransactionDetails: (businessId: string, startDate: string, endDate: string) => {
    return db.prepare(`
      SELECT
        saleNumber,
        total,
        cashReceived,
        cashChange,
        createdAt
      FROM Sale
      WHERE businessId = ?
      AND paymentMethod = 'CASH'
      AND DATE(createdAt) BETWEEN DATE(?) AND DATE(?)
      ORDER BY createdAt DESC
    `).all(businessId, startDate, endDate)
  },

  getCardTransactionDetails: (businessId: string, startDate: string, endDate: string) => {
    return db.prepare(`
      SELECT
        saleNumber,
        total,
        cardAmount,
        createdAt
      FROM Sale
      WHERE businessId = ?
      AND paymentMethod = 'CARD'
      AND DATE(createdAt) BETWEEN DATE(?) AND DATE(?)
      ORDER BY createdAt DESC
    `).all(businessId, startDate, endDate)
  },

  getMixedTransactionDetails: (businessId: string, startDate: string, endDate: string) => {
    return db.prepare(`
      SELECT
        saleNumber,
        total,
        cashReceived,
        cardAmount,
        createdAt
      FROM Sale
      WHERE businessId = ?
      AND paymentMethod = 'MIXED'
      AND DATE(createdAt) BETWEEN DATE(?) AND DATE(?)
      ORDER BY createdAt DESC
    `).all(businessId, startDate, endDate)
  }
}

export const categoryQueries = {
  getAllCategories: (businessId: string): ProductCategory[] => {
    return db.prepare(`
      SELECT * FROM ProductCategory
      WHERE businessId = ? AND isActive = 1
      ORDER BY name ASC
    `).all(businessId) as ProductCategory[]
  },

  getCategoryById: (id: string): ProductCategory | undefined => {
    return db.prepare(`
      SELECT * FROM ProductCategory WHERE id = ?
    `).get(id) as ProductCategory | undefined
  },

  createCategory: (category: Omit<ProductCategory, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = Math.random().toString(36).substring(2, 15)
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO ProductCategory (id, name, description, isActive, businessId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      category.name,
      category.description,
      category.isActive ? 1 : 0,
      category.businessId,
      now,
      now
    )

    return id
  },

  updateCategory: (id: string, updates: Partial<Omit<ProductCategory, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>>) => {
    const fields: string[] = []
    const values: any[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.description !== undefined) {
      fields.push('description = ?')
      values.push(updates.description)
    }
    if (updates.isActive !== undefined) {
      fields.push('isActive = ?')
      values.push(updates.isActive ? 1 : 0)
    }

    fields.push('updatedAt = ?')
    values.push(new Date().toISOString())
    values.push(id)

    if (fields.length > 1) {
      db.prepare(`
        UPDATE ProductCategory
        SET ${fields.join(', ')}
        WHERE id = ?
      `).run(...values)
    }

    return true
  },

  deleteCategory: (id: string) => {
    db.prepare(`
      UPDATE ProductCategory
      SET isActive = 0, updatedAt = ?
      WHERE id = ?
    `).run(new Date().toISOString(), id)

    return true
  },

  searchCategories: (businessId: string, searchTerm: string): ProductCategory[] => {
    return db.prepare(`
      SELECT * FROM ProductCategory
      WHERE businessId = ? AND isActive = 1
      AND (name LIKE ? OR description LIKE ?)
      ORDER BY name ASC
    `).all(businessId, `%${searchTerm}%`, `%${searchTerm}%`) as ProductCategory[]
  }
}
