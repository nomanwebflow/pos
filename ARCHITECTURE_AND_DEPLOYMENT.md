# POS System - Architecture & Deployment Guide

## Table of Contents
1. [Application Architecture](#application-architecture)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Authentication & Authorization](#authentication--authorization)
6. [Deployment Guide](#deployment-guide)
7. [Environment Variables](#environment-variables)
8. [Troubleshooting](#troubleshooting)

---

## Application Architecture

### Overview
This is a modern Point of Sale (POS) system built with Next.js 16 and Supabase. The application follows a full-stack architecture with server-side rendering, API routes, and a PostgreSQL database.

### Key Features
- **Multi-role authentication** (Super Admin, Stock Manager, Cashier)
- **Product management** with categories and inventory tracking
- **Sales processing** with multiple payment methods (Cash, Card, Mixed)
- **Real-time inventory updates** using PostgreSQL triggers
- **Customer management**
- **Transaction history and reporting**
- **Role-based access control (RBAC)** with granular permissions
- **Touch-screen optimized** with virtual keyboard support

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  (Next.js 16 App Router + React 19 + Tailwind CSS)         │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Routes Layer                        │
│            (/app/api/* - Server Components)                  │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Supabase Client Layer                      │
│        (Authentication, RLS, Real-time subscriptions)        │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database Layer (PostgreSQL)                 │
│    (Products, Sales, Users, Transactions, Categories)        │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend
- **Next.js 16.0.8** - React framework with App Router
- **React 19.2.1** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library
- **Lucide React** - Icon library

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Supabase** - Backend-as-a-Service
  - Authentication
  - PostgreSQL database
  - Row Level Security (RLS)
  - Real-time subscriptions

### Database
- **PostgreSQL 15+** - Primary database
- **Supabase Realtime** - Real-time data synchronization

### Development Tools
- **Turbopack** - Fast bundler
- **ESLint** - Code linting
- **TypeScript** - Static type checking

---

## Project Structure

```
pos/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── products-supabase/    # Product CRUD operations
│   │   ├── categories-supabase/  # Category management
│   │   ├── sales-supabase/       # Sales transactions
│   │   └── users/                # User management
│   ├── checkout/                 # Checkout page (POS interface)
│   ├── products/                 # Product management
│   ├── categories/               # Category management
│   ├── customers/                # Customer management
│   ├── transactions/             # Sales history
│   ├── reports/                  # Analytics & reports
│   ├── users/                    # User management (Admin)
│   ├── settings/                 # Business settings
│   ├── login/                    # Login page
│   └── layout.tsx                # Root layout
│
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   ├── app-sidebar.tsx           # Navigation sidebar
│   ├── rbac.tsx                  # Role-based access control
│   ├── receipt.tsx               # Receipt component
│   └── virtual-keyboard.tsx      # Touch keyboard
│
├── lib/                          # Utility libraries
│   ├── supabase/                 # Supabase clients
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   └── middleware.ts         # Auth middleware
│   ├── permissions.ts            # RBAC permissions
│   └── utils.ts                  # Helper functions
│
├── supabase/                     # Supabase configuration
│   ├── migrations/               # Database migrations
│   │   ├── 20241211000001_*.sql  # Initial schema
│   │   ├── 20241211000002_*.sql  # RLS policies
│   │   ├── 20250101000003_*.sql  # Categories table
│   │   └── 20250101000004_*.sql  # Updated RLS
│   └── config.toml               # Supabase config
│
├── scripts/                      # Utility scripts
│   ├── seed-demo-data.ts         # Seed sample data
│   └── reset-all-test-passwords.ts
│
├── public/                       # Static assets
├── .env.local                    # Environment variables
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies
```

---

## Database Schema

### Core Tables

#### `user_profiles`
User account information and roles
```sql
- id (UUID, PK, FK -> auth.users)
- email (TEXT)
- name (TEXT)
- role (ENUM: SUPER_ADMIN, STOCK_MANAGER, CASHIER)
- is_active (BOOLEAN)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### `products`
Product catalog and inventory
```sql
- id (UUID, PK)
- name (TEXT)
- description (TEXT)
- price (NUMERIC)
- stock_quantity (INTEGER)
- sku (TEXT, UNIQUE)
- category (TEXT)
- image_url (TEXT)
- is_active (BOOLEAN)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
- created_by (UUID, FK -> auth.users)
```

#### `categories`
Product categories
```sql
- id (UUID, PK)
- name (TEXT)
- description (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
- created_by (UUID, FK -> auth.users)
- updated_by (UUID, FK -> auth.users)
```

#### `transactions`
Sales transactions
```sql
- id (UUID, PK)
- sale_number (TEXT, UNIQUE)
- customer_id (UUID, FK -> customers)
- subtotal (NUMERIC)
- tax_amount (NUMERIC)
- discount_amount (NUMERIC)
- total_amount (NUMERIC)
- payment_method (TEXT)
- cash_received (NUMERIC)
- cash_change (NUMERIC)
- card_amount (NUMERIC)
- status (TEXT)
- created_at (TIMESTAMPTZ)
- created_by (UUID, FK -> auth.users)
```

#### `transaction_items`
Individual items in transactions
```sql
- id (UUID, PK)
- transaction_id (UUID, FK -> transactions)
- product_id (UUID, FK -> products)
- quantity (INTEGER)
- unit_price (NUMERIC)
- subtotal (NUMERIC)
- created_at (TIMESTAMPTZ)
```

#### `customers`
Customer information
```sql
- id (UUID, PK)
- name (TEXT)
- email (TEXT)
- phone (TEXT)
- address (TEXT)
- is_active (BOOLEAN)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
- created_by (UUID, FK -> auth.users)
```

### Database Relationships
```
auth.users (1) ←→ (1) user_profiles
products (1) ←→ (N) transaction_items
transactions (1) ←→ (N) transaction_items
customers (1) ←→ (N) transactions
auth.users (1) ←→ (N) products (created_by)
auth.users (1) ←→ (N) transactions (created_by)
```

---

## Authentication & Authorization

### Authentication Flow
1. User enters credentials on `/login`
2. Supabase validates credentials
3. JWT token stored in HTTP-only cookie
4. Middleware validates token on each request
5. User profile fetched from `user_profiles` table

### Role Hierarchy
```
SUPER_ADMIN (Highest)
    ↓
STOCK_MANAGER
    ↓
CASHIER (Lowest)
```

### Permissions Matrix

| Feature | Super Admin | Stock Manager | Cashier |
|---------|-------------|---------------|---------|
| View Dashboard | ✅ | ❌ | ❌ |
| Checkout/Sales | ✅ | ✅ | ✅ |
| View Products | ✅ | ✅ | ✅ |
| Manage Products | ✅ | ✅ | ❌ |
| Manage Categories | ✅ | ✅ | ❌ |
| View Customers | ✅ | ❌ | ❌ |
| View Reports | ✅ | ❌ | ❌ |
| View Transactions | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ |

### Row Level Security (RLS)

All tables have RLS enabled with policies based on user roles:

**Products Table:**
- **SELECT**: All authenticated users can view active products
- **INSERT/UPDATE/DELETE**: Only SUPER_ADMIN and STOCK_MANAGER

**Categories Table:**
- **SELECT**: All authenticated users
- **INSERT/UPDATE/DELETE**: Only SUPER_ADMIN and STOCK_MANAGER

**Transactions Table:**
- **SELECT**: Only SUPER_ADMIN
- **INSERT**: SUPER_ADMIN, STOCK_MANAGER, CASHIER

**User Profiles Table:**
- **SELECT**: All authenticated users (own profile)
- **INSERT/UPDATE/DELETE**: Only SUPER_ADMIN

---

## Deployment Guide

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Git (for version control)
- Domain name (optional, for production)

### Option 1: Self-Hosted with Docker (Recommended for Local/On-Premise)

#### Step 1: Install Docker & Docker Compose
```bash
# Install Docker Desktop
# Visit: https://www.docker.com/products/docker-desktop

# Verify installation
docker --version
docker-compose --version
```

#### Step 2: Clone Repository
```bash
git clone <your-repo-url>
cd pos
```

#### Step 3: Start Supabase Locally
```bash
# Start Supabase services
npx supabase start

# Note the API URL and anon key from output
```

#### Step 4: Configure Environment
```bash
# Copy example env file
cp .env.local.example .env.local

# Edit .env.local with your values
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-start>
```

#### Step 5: Run Database Migrations
```bash
# Apply migrations
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/migrations/20241211000001_initial_schema.sql
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/migrations/20241211000002_rls_policies.sql
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/migrations/20250101000003_create_categories_table.sql
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/migrations/20250101000004_update_products_rls_policies.sql
```

#### Step 6: Seed Test Data
```bash
# Install dependencies
npm install

# Create test users (run from Supabase Studio)
# Visit: http://127.0.0.1:54323
# Go to Authentication > Users > Add User

# Seed demo data
npx tsx scripts/seed-demo-data.ts
```

#### Step 7: Start Application
```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

#### Step 8: Access Application
- **Application**: http://localhost:3000
- **Supabase Studio**: http://127.0.0.1:54323
- **Database**: postgresql://postgres:postgres@127.0.0.1:54322/postgres

### Option 2: Cloud Deployment (Supabase Cloud + Vercel)

#### Step 1: Create Supabase Project
1. Go to https://supabase.com
2. Click "New Project"
3. Choose organization and region
4. Set database password
5. Wait for project creation

#### Step 2: Run Migrations
```bash
# Link to your Supabase project
npx supabase link --project-ref <your-project-ref>

# Push migrations
npx supabase db push
```

#### Step 3: Create Test Users
1. Go to Supabase Dashboard > Authentication > Users
2. Add users with emails:
   - admin@posystem.local (Super Admin)
   - stock@posystem.local (Stock Manager)
   - cashier@posystem.local (Cashier)
3. Run SQL to set roles:
```sql
-- Update user roles
UPDATE user_profiles
SET role = 'SUPER_ADMIN', is_active = true
WHERE email = 'admin@posystem.local';

UPDATE user_profiles
SET role = 'STOCK_MANAGER', is_active = true
WHERE email = 'stock@posystem.local';

UPDATE user_profiles
SET role = 'CASHIER', is_active = true
WHERE email = 'cashier@posystem.local';
```

#### Step 4: Deploy to Vercel
1. Push code to GitHub
2. Go to https://vercel.com
3. Import your repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
5. Deploy

#### Step 5: Seed Demo Data
```bash
# Update script with your Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=<your-url> SUPABASE_SERVICE_ROLE_KEY=<your-service-key> npx tsx scripts/seed-demo-data.ts
```

### Option 3: Google Cloud Run Deployment

#### Step 1: Build Docker Image
```bash
# Build image
docker build -t gcr.io/<project-id>/pos-system .

# Test locally
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=<your-url> \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key> \
  gcr.io/<project-id>/pos-system
```

#### Step 2: Push to Container Registry
```bash
# Configure Docker for GCR
gcloud auth configure-docker

# Push image
docker push gcr.io/<project-id>/pos-system
```

#### Step 3: Deploy to Cloud Run
```bash
gcloud run deploy pos-system \
  --image gcr.io/<project-id>/pos-system \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_SUPABASE_URL=<your-url> \
  --set-env-vars NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
```

---

## Environment Variables

### Required Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Service Role Key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Local Development
```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Troubleshooting

### Common Issues

#### 1. Products Not Showing
**Symptom**: Super Admin or Stock Manager sees no products

**Solution**:
```bash
# Check RLS policies
psql <db-url> -c "SELECT polname FROM pg_policy WHERE polrelid = 'public.products'::regclass;"

# Verify products exist
psql <db-url> -c "SELECT COUNT(*) FROM public.products WHERE is_active = true;"

# Clear browser cache
# Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

#### 2. Authentication Errors
**Symptom**: "Unauthorized" or session expired errors

**Solution**:
```bash
# Check Supabase connection
curl <NEXT_PUBLIC_SUPABASE_URL>/rest/v1/

# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Reset user password
npx tsx scripts/reset-all-test-passwords.ts
```

#### 3. Database Migration Errors
**Symptom**: SQL errors when running migrations

**Solution**:
```bash
# Check Supabase status
npx supabase status

# Reset database (WARNING: Deletes all data)
npx supabase db reset

# Reapply migrations
psql <db-url> -f supabase/migrations/*.sql
```

#### 4. Permission Denied Errors
**Symptom**: User can't perform certain actions

**Solution**:
```bash
# Check user role
psql <db-url> -c "SELECT email, role FROM user_profiles WHERE email = 'user@example.com';"

# Update role if needed
psql <db-url> -c "UPDATE user_profiles SET role = 'SUPER_ADMIN' WHERE email = 'user@example.com';"
```

#### 5. Port Already in Use
**Symptom**: "Port 3000 is already in use"

**Solution**:
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
npm run dev -- -p 3001
```

---

## Maintenance & Updates

### Regular Maintenance Tasks

1. **Database Backups**
   ```bash
   # Backup database
   npx supabase db dump -f backup.sql

   # Restore database
   psql <db-url> < backup.sql
   ```

2. **Update Dependencies**
   ```bash
   # Check for updates
   npm outdated

   # Update packages
   npm update

   # Update Next.js
   npm install next@latest react@latest react-dom@latest
   ```

3. **Monitor Logs**
   ```bash
   # View Supabase logs
   npx supabase logs

   # View application logs (production)
   vercel logs
   ```

4. **Security Audits**
   ```bash
   # Run security audit
   npm audit

   # Fix vulnerabilities
   npm audit fix
   ```

---

## Support & Documentation

- **Next.js Documentation**: https://nextjs.org/docs
- **Supabase Documentation**: https://supabase.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **shadcn/ui Components**: https://ui.shadcn.com

---

## License

This project is proprietary software. All rights reserved.

---

## Version History

- **v1.0.0** (2025-01-11)
  - Initial release
  - Multi-role authentication
  - Product management
  - Sales processing
  - Basic reporting

---

*Last Updated: December 11, 2025*
