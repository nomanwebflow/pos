import { db } from "../lib/db"
import bcrypt from "bcryptjs"

const DEFAULT_BUSINESS_ID = "default-business"

async function seedAdminUser() {
  try {
    // Check if business exists
    const business = db
      .prepare("SELECT * FROM Business WHERE id = ?")
      .get(DEFAULT_BUSINESS_ID)

    if (!business) {
      console.log("Creating default business...")
      db.prepare(`
        INSERT INTO Business (id, name, address, phone, email, taxNumber, currency, taxRate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        DEFAULT_BUSINESS_ID,
        "Demo Store",
        "Port Louis, Mauritius",
        "+230 1234 5678",
        "contact@demostore.mu",
        "TIN12345678",
        "MUR",
        15.0
      )
      console.log("✓ Default business created")
    }

    // Check if admin user already exists
    const existingAdmin = db
      .prepare("SELECT * FROM User WHERE email = ?")
      .get("admin@demo.com")

    if (existingAdmin) {
      console.log("Admin user already exists!")
      return
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("admin123", 10)

    // Create admin user
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO User (id, email, name, password, role, isActive, businessId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "admin-user-001",
      "admin@demo.com",
      "Admin User",
      hashedPassword,
      "OWNER",
      1,
      DEFAULT_BUSINESS_ID,
      now,
      now
    )

    console.log("✓ Admin user created successfully!")
    console.log("\nLogin credentials:")
    console.log("Email: admin@demo.com")
    console.log("Password: admin123")
    console.log("\nYou can now login with these credentials.")

    // Create additional demo users
    const demoUsers = [
      {
        id: "seller-user-001",
        email: "seller@demo.com",
        name: "Seller User",
        role: "SELLER",
        password: "seller123",
      },
      {
        id: "manager-user-001",
        email: "manager@demo.com",
        name: "Stock Manager",
        role: "STOCK_MANAGER",
        password: "manager123",
      },
      {
        id: "finance-user-001",
        email: "finance@demo.com",
        name: "Finance User",
        role: "FINANCE",
        password: "finance123",
      },
    ]

    for (const user of demoUsers) {
      const existingUser = db
        .prepare("SELECT * FROM User WHERE email = ?")
        .get(user.email)

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(user.password, 10)
        const now = new Date().toISOString()
        db.prepare(`
          INSERT INTO User (id, email, name, password, role, isActive, businessId, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          user.id,
          user.email,
          user.name,
          hashedPassword,
          user.role,
          1,
          DEFAULT_BUSINESS_ID,
          now,
          now
        )
        console.log(`✓ Created ${user.role} user: ${user.email}`)
      }
    }

    console.log("\n✅ Seeding completed successfully!")
  } catch (error) {
    console.error("Error seeding admin user:", error)
    process.exit(1)
  }
}

seedAdminUser()
