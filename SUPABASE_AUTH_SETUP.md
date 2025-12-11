# Supabase Authentication & RBAC Setup Guide

This guide will help you set up Supabase authentication with role-based access control (RBAC) for your POS system.

## Overview

The POS system has three roles with different permissions:

### 1. SUPER_ADMIN
**Full system access** - Can do everything:
- View all reports and analytics
- Manage users (add/remove/edit)
- Export data
- Manage products and inventory
- Access all customer records
- View all transactions
- Access system settings
- Process checkouts

**Default Route**: `/reports`

### 2. CASHIER
**Limited to sales operations**:
- Process checkouts
- Manage customers (add/edit customer info)
- View customer list
- NO access to: reports, user management, products, settings

**Default Route**: `/checkout`

### 3. STOCK_MANAGER
**Limited to inventory management**:
- Add/edit/delete products
- Manage inventory levels
- View product catalog
- NO access to: checkouts, customers, reports, user management

**Default Route**: `/products`

## Setup Instructions

### Option 1: Local Development with Supabase CLI (Recommended for Development)

#### Step 1: Install Docker
Supabase CLI requires Docker to run locally.
- Download and install Docker Desktop from https://www.docker.com/products/docker-desktop
- Start Docker Desktop

#### Step 2: Start Supabase
```bash
supabase start
```

This will:
- Start all Supabase services locally
- Run the database migrations automatically
- Seed the database with test accounts
- Display the local URLs and API keys

#### Step 3: Configure Environment Variables
Copy the output from `supabase start` to your `.env.local`:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add:
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

#### Step 4: Start the Development Server
```bash
npm run dev
```

Visit http://localhost:3000 and you should be redirected to the login page.

#### Step 5: Create Test Users
After Supabase starts, create the test accounts:

```bash
npx tsx scripts/create-test-users.ts
```

This will create three test accounts with proper password hashing.

#### Step 6: Login with Test Accounts
Use one of these test accounts:

**Super Admin:**
- Email: `admin@posystem.local`
- Password: `admin123`
- Will be redirected to `/reports`

**Cashier:**
- Email: `cashier@posystem.local`
- Password: `cashier123`
- Will be redirected to `/checkout`

**Stock Manager:**
- Email: `stock@posystem.local`
- Password: `stock123`
- Will be redirected to `/products`

#### Step 7: Access Supabase Studio (Optional)
Open http://localhost:54323 to access the local Supabase Studio dashboard where you can:
- View and edit data
- Run SQL queries
- Check authentication users
- Monitor logs

### Option 2: Cloud Deployment with Supabase (Production)

#### Step 1: Create a Supabase Project
1. Go to https://supabase.com/dashboard
2. Sign in or create an account
3. Click "New Project"
4. Fill in the details:
   - **Name**: POS System (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Select the closest region
5. Click "Create new project" and wait 2-3 minutes

#### Step 2: Apply Database Migrations
You need to apply the database schema to your cloud project.

```bash
# Link your local project to the cloud project
supabase link --project-ref your-project-ref

# Push the migrations to your cloud database
supabase db push
```

Or manually run the migration SQL:
1. Go to **SQL Editor** in your Supabase dashboard
2. Click "New query"
3. Copy the contents of `supabase/migrations/20251210125719_setup_user_roles_and_rbac.sql`
4. Paste and click "Run"

#### Step 3: Create Test Users
1. Go to **Authentication** > **Users** in Supabase dashboard
2. Click "Add user" > "Create new user"
3. Create each of these users:

**Super Admin:**
- Email: `admin@posystem.local`
- Password: `admin123`
- Auto Confirm User: ✓ YES

**Cashier:**
- Email: `cashier@posystem.local`
- Password: `cashier123`
- Auto Confirm User: ✓ YES

**Stock Manager:**
- Email: `stock@posystem.local`
- Password: `stock123`
- Auto Confirm User: ✓ YES

#### Step 4: Set User Roles
After creating the users, you need to set their roles.

Go to **SQL Editor** and run:

```sql
-- Set Super Admin role
UPDATE public.user_profiles
SET role = 'SUPER_ADMIN'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@posystem.local');

-- Set Cashier role (should already be CASHIER by default, but let's be explicit)
UPDATE public.user_profiles
SET role = 'CASHIER'
WHERE id = (SELECT id FROM auth.users WHERE email = 'cashier@posystem.local');

-- Set Stock Manager role
UPDATE public.user_profiles
SET role = 'STOCK_MANAGER'
WHERE id = (SELECT id FROM auth.users WHERE email = 'stock@posystem.local');
```

#### Step 5: Get API Keys
1. Go to **Settings** > **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Project API keys** > `anon` `public` key

#### Step 6: Configure Environment Variables
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-dashboard
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-dashboard
```

#### Step 7: Deploy to Cloud Run (Optional)
```bash
gcloud run deploy pos-system \
  --source . \
  --region=asia-south1 \
  --set-env-vars="NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co,NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key"
```

## How It Works

### Row Level Security (RLS)
All database tables have Row Level Security enabled. This means:
- Users can only access data they have permission to see
- Permissions are enforced at the database level
- Even if someone bypasses the UI, they can't access unauthorized data

### Route Protection
The middleware checks:
1. If user is authenticated
2. What role they have
3. If they can access the requested route
4. Redirects unauthorized users to their default page

### Permission Functions
Helper functions are available in the database:
- `is_super_admin()` - Returns true if current user is super admin
- `is_cashier()` - Returns true if current user is cashier
- `is_stock_manager()` - Returns true if current user is stock manager

## Managing Users (Super Admin Only)

### Adding a New User
1. Log in as Super Admin
2. Go to `/users`
3. Click "Add User"
4. Enter email, name, and select role
5. User will receive an email to set their password

### Deactivating a User
1. Log in as Super Admin
2. Go to `/users`
3. Find the user
4. Click "Deactivate"
5. User will no longer be able to log in

### Changing User Roles
1. Log in as Super Admin
2. Go to `/users`
3. Find the user
4. Click "Edit" and change role
5. User's permissions will update immediately

## Troubleshooting

### "Invalid API key" error
- Check that `.env.local` has correct values from Supabase dashboard
- Make sure you're not mixing local and cloud credentials

### "Cannot connect to database" error
- If using local: Ensure Docker is running and `supabase start` succeeded
- If using cloud: Check your internet connection and Supabase project status

### "Unauthorized" error after login
- User might be inactive - check `is_active` field in `user_profiles` table
- User might not have permission for that route - check middleware rules

### Login page redirects in a loop
- Check that middleware isn't protecting `/login` route
- Verify user has a profile in `user_profiles` table

### RLS policy errors
- Make sure migrations ran successfully
- Check that RLS is enabled on all tables
- Verify policies are created with correct syntax

## Security Best Practices

1. **Change Default Passwords** - The test accounts use simple passwords for development. Change them for production!

2. **Use Strong Passwords** - For production users, enforce strong passwords

3. **Enable MFA** - Supabase supports multi-factor authentication for added security

4. **Regular Audits** - Super Admin can view audit logs to track all actions

5. **Principle of Least Privilege** - Always assign the minimum role needed

6. **Secure API Keys** - Never commit `.env.local` to git. Keep service role keys secret.

## Database Schema

### user_profiles
- `id` (UUID) - Foreign key to auth.users
- `role` (ENUM) - SUPER_ADMIN, CASHIER, or STOCK_MANAGER
- `name` (TEXT) - User's display name
- `is_active` (BOOLEAN) - Whether user can log in
- `created_at`, `updated_at` (TIMESTAMP)

### Products, Customers, Transactions
All POS tables have RLS policies that check the user's role before allowing access.

## Next Steps

1. Test logging in with each role
2. Try accessing unauthorized routes to verify RBAC works
3. Customize the permissions in `lib/supabase/middleware.ts` if needed
4. Add more fields to `user_profiles` if needed (phone, department, etc.)
5. Set up email templates in Supabase for password reset, etc.

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check Supabase logs in the dashboard
3. Verify environment variables are set correctly
4. Review the migration SQL for any errors
