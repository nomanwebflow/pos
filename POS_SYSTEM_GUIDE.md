# POS System - Complete Guide

## Overview
A comprehensive Point of Sale system built with Next.js 14, TypeScript, and SQLite. Optimized for tablet devices with barcode scanner support, targeting businesses in Mauritius and internationally.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **UI**: shadcn/ui components, Tailwind CSS
- **Database**: SQLite with better-sqlite3
- **Styling**: Tailwind CSS with Geist fonts

## Features Implemented

### 1. Database Schema ✅
Complete database with the following tables:
- **Business**: Store configuration (tax rate, currency, etc.)
- **User**: User authentication and roles
- **Product**: Product catalog with inventory
- **Sale**: Sales transactions
- **SaleItem**: Line items for each sale
- **StockMovement**: Inventory tracking (sales, refills, adjustments)
- **Settings**: Business configuration
- **AuditLog**: Action logging for accountability

### 2. Sales/Checkout Interface ✅
**Tablet-Optimized Features**:
- Large, touch-friendly buttons and inputs
- Barcode scanner support (auto-focus input)
- Real-time product search
- Category-based browsing
- Visual product grid with stock levels
- Shopping cart with quantity management
- Payment methods: Cash, Card, Mixed
- Automatic stock updates after sale
- Tax calculation (15% VAT for Mauritius)
- Change calculation for cash payments

**Access**: http://localhost:3000/checkout

### 3. Product Management ✅
**Features**:
- Full CRUD operations (Create, Read, Update, Delete)
- Product fields:
  - Name, SKU, Barcode
  - Description, Category
  - Cost Price, Selling Price
  - Stock Level, Low Stock Threshold
  - Tax settings
- Search functionality
- Stock level indicators
- Low stock alerts
- Bulk import capability (future enhancement)

**Access**: http://localhost:3000/products

### 4. Inventory Management ✅
**Features**:
- Automatic stock updates on sale
- Stock movement tracking:
  - SALE: Automatic deduction
  - REFILL: Manual stock addition
  - ADJUSTMENT: Manual corrections with required reason
- Stock history logging
- Low stock threshold tracking
- Stock value calculations

## Pre-loaded Sample Data

### Products (5 items):
1. **Coca Cola 330ml** - MUR 25.00 (100 in stock)
2. **White Bread** - MUR 35.00 (50 in stock)
3. **Fresh Milk 1L** - MUR 65.00 (30 in stock)
4. **Rice 5kg** - MUR 220.00 (25 in stock)
5. **Cooking Oil 2L** - MUR 180.00 (15 in stock)

## Project Structure

```
/Users/noman/Desktop/pos/
├── app/
│   ├── api/
│   │   ├── products/               # Product API endpoints
│   │   └── sales/                  # Sales API endpoints
│   ├── products/                   # Product management page
│   ├── checkout/                   # POS/Checkout page
│   ├── layout.tsx                  # Root layout
│   └── page.tsx                    # Dashboard
├── components/
│   ├── app-sidebar.tsx             # Navigation sidebar
│   └── ui/                         # shadcn/ui components
├── lib/
│   ├── db.ts                       # Direct SQLite connection
│   ├── db-queries.ts               # Database query functions
│   └── utils.ts                    # Utility functions
├── prisma/
│   ├── schema.prisma               # Database schema
│   ├── migrations/                 # Database migrations
│   └── seed-simple.ts              # Database seeding
├── dev.db                          # SQLite database
└── .env                            # Environment variables
```

## Key Features

### 1. Tablet Optimization
- Large touch targets (minimum 44x44px)
- Auto-focus on barcode input
- Swipe-friendly layouts
- Optimized for landscape orientation
- Minimal keyboard interaction

### 2. Barcode Scanner Integration
- Auto-focus barcode input field
- Instant product lookup by barcode
- Support for USB and Bluetooth scanners
- Visual feedback on scan success/failure

### 3. Multiple Product Selection Methods
1. **Barcode Scan**: Fastest for checkout
2. **Search**: By name, SKU, or barcode
3. **Category Browse**: Visual product grid
4. **Quick Add**: Click product cards

### 4. Cart Management
- Add/remove items
- Quantity adjustment
- Real-time totals calculation
- Tax calculation (configurable)
- Stock availability checking

### 5. Payment Processing
- **Cash**: With change calculation
- **Card**: Direct payment
- **Mixed**: Future enhancement
- Receipt generation (on-screen)
- Automatic inventory updates

### 6. Low Stock Alerts
- Dashboard visibility
- Product list indicators
- Threshold-based tracking
- Future: Email/in-app notifications

### 7. Security Features
- Protected API routes
- Audit logging (future)

## API Endpoints

### Products
- `GET /api/products` - List all products
- `GET /api/products?q=search` - Search products
- `GET /api/products?barcode=123` - Get by barcode
- `GET /api/products?category=Beverages` - Filter by category
- `POST /api/products` - Create new product
- `GET /api/products/categories` - List categories

### Sales
- `POST /api/sales` - Create new sale
- `GET /api/sales` - List today's sales with stats
- `GET /api/sales?id=xxx` - Get sale details

## Running the System

### Start the Development Server
```bash
npm run dev
```
Access at: http://localhost:3000

### Reseed the Database
```bash
npx tsx prisma/seed-simple.ts
```

### Check Database
```bash
sqlite3 dev.db "SELECT * FROM User;"
```

## Keyboard Shortcuts (Future Enhancement)
- `F1` - Focus barcode scanner
- `F2` - Open product search
- `F3` - Clear cart
- `F4` - Checkout
- `Esc` - Cancel operation

## Configuration

### Tax Rate
Edit in `prisma/schema.prisma` (default: 15% VAT for Mauritius)
```prisma
taxRate Float @default(15.0)
```

### Currency
Default: MUR (Mauritian Rupee)
Configurable per business in database

### Low Stock Threshold
Default: 10 units
Configurable per product

## Reporting & Finance (Future Module)

### Planned Features:
- Daily sales reports
- Sales by payment method
- Sales by category
- Sales by seller/cashier
- Profit estimates
- CSV/Excel export
- Time-based viewing (daily, weekly, monthly)
- Custom date ranges

## Next Steps

### Immediate Priorities:
1. Fix Prisma adapter configuration for better database integration
2. Implement receipt printing
3. Add more robust error handling
4. Create reports module
5. Add user management interface

### Future Enhancements:
1. Multi-location support
2. Customer management
3. Loyalty programs
4. Email receipts
5. Cloud backup
6. Mobile app (React Native)
7. Offline mode
8. Invoice generation
9. Purchase orders
10. Supplier management

## Troubleshooting

### Database Issues
Reset database:
```bash
rm dev.db
npx prisma migrate dev
npx tsx prisma/seed-simple.ts
```

### Port Already in Use
Change port in `package.json`:
```json
"dev": "next dev -p 3001"
```

## Support

For issues or questions:
1. Check the console logs (browser & terminal)
2. Verify database integrity
3. Check API responses in Network tab
4. Review server logs in terminal

## License
Proprietary - All rights reserved

## Version
1.0.0 - Initial Release
Built on: December 9, 2025
