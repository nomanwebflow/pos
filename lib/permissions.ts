// Permission definitions for different actions
// This file can be imported in both client and server components
export const permissions = {
  // Dashboard
  viewDashboard: ["SUPER_ADMIN"],

  // Checkout/Sales permissions
  viewCheckout: ["CASHIER"], // Only cashier can checkout
  createSale: ["CASHIER"],
  viewSales: ["SUPER_ADMIN"], // Super admin can read all sales data
  refundSale: ["SUPER_ADMIN"],

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
  viewTransactions: ["SUPER_ADMIN"],
  viewPayments: ["SUPER_ADMIN"],

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

export type UserRole = "SUPER_ADMIN" | "CASHIER" | "STOCK_MANAGER"

// Check if user has permission (client-safe version)
export function hasPermission(
  userRole: string,
  permission: keyof typeof permissions
): boolean {
  const allowedRoles = permissions[permission] as readonly string[]
  return allowedRoles.includes(userRole)
}
