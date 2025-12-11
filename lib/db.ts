import Database from 'better-sqlite3'

// Direct database connection
const db = new Database('./dev.db')

export interface User {
  id: string
  email: string
  name: string
  password: string
  role: string
  isActive: number
  businessId: string
  createdAt: string
  updatedAt: string
}

export interface Business {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  taxNumber: string | null
  currency: string
  taxRate: number
  createdAt: string
  updatedAt: string
}

export const dbQueries = {
  getUserByEmail: (email: string): (User & { business: Business }) | undefined => {
    const user = db.prepare(`
      SELECT
        u.*,
        b.id as business_id,
        b.name as business_name,
        b.address as business_address,
        b.phone as business_phone,
        b.email as business_email,
        b.currency as business_currency,
        b.taxRate as business_taxRate
      FROM User u
      LEFT JOIN Business b ON u.businessId = b.id
      WHERE u.email = ?
    `).get(email) as any

    if (!user) return undefined

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      password: user.password,
      role: user.role,
      isActive: user.isActive,
      businessId: user.businessId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      business: {
        id: user.business_id,
        name: user.business_name,
        address: user.business_address,
        phone: user.business_phone,
        email: user.business_email,
        taxNumber: null,
        currency: user.business_currency,
        taxRate: user.business_taxRate,
        createdAt: '',
        updatedAt: '',
      }
    }
  },

  getAllUsers: () => {
    return db.prepare('SELECT id, email, name, role, isActive, businessId, createdAt, updatedAt FROM User').all() as User[]
  },
}

export { db }
