// Permission definitions for different actions
// This file can be imported in both client and server components
export const permissions = {
  // Dashboard
  viewDashboard: ["SUPER_ADMIN"],

  // Checkout/Sales permissions
  viewCheckout: ["CASHIER", "OWNER"], // Only cashier and owner can checkout
  createSale: ["CASHIER", "OWNER"],
  viewSales: ["SUPER_ADMIN", "OWNER"], // Super admin and owner can read all sales data
  refundSale: ["SUPER_ADMIN", "OWNER"],
  processRefund: ["SUPER_ADMIN", "OWNER", "CASHIER"],

  // Product permissions
  viewProducts: ["SUPER_ADMIN", "STOCK_MANAGER"],
  createProduct: ["SUPER_ADMIN", "STOCK_MANAGER"],
  editProduct: ["SUPER_ADMIN", "STOCK_MANAGER"],
  deleteProduct: ["SUPER_ADMIN", "STOCK_MANAGER"],
  manageProducts: ["SUPER_ADMIN", "STOCK_MANAGER"],
  manageCategories: ["SUPER_ADMIN", "STOCK_MANAGER"],

  // Customer permissions
  viewCustomers: ["SUPER_ADMIN"],
  manageCustomers: ["SUPER_ADMIN"],

  // Reports permissions
  viewReports: ["SUPER_ADMIN"],
  viewDetailedReports: ["SUPER_ADMIN"],

  // Transactions/Payments
  viewTransactions: ["SUPER_ADMIN", "OWNER", "CASHIER"],
  viewPayments: ["SUPER_ADMIN", "OWNER"],
  viewRefunds: ["SUPER_ADMIN", "OWNER", "CASHIER"],

  // User management (Super Admin only)
  viewUsers: ["SUPER_ADMIN"],
  manageUsers: ["SUPER_ADMIN"], // Can add new users and edit existing ones

  // Settings (Super Admin only)
  viewSettings: ["SUPER_ADMIN"],
  manageSettings: ["SUPER_ADMIN"], // Can edit business details and tax information
  editBusinessDetails: ["SUPER_ADMIN"],
  editTaxInfo: ["SUPER_ADMIN"],

  // Stock management
  adjustStock: ["SUPER_ADMIN", "STOCK_MANAGER"],
  viewStockMovements: ["SUPER_ADMIN", "STOCK_MANAGER"],
} as const

export type UserRole = "SUPER_ADMIN" | "CASHIER" | "STOCK_MANAGER" | "OWNER"

// Check if user has permission (client-safe version)
export function hasPermission(
  userRole: string,
  permission: keyof typeof permissions
): boolean {
  // OWNER has all permissions
  if (userRole === "OWNER") return true

  const allowedRoles = permissions[permission] as readonly string[]
  return allowedRoles.includes(userRole)
}
