# Supabase Authentication Setup

This guide will help you set up Supabase authentication for your POS system.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in or create an account
3. Click "New Project"
4. Fill in the details:
   - **Name**: POS System (or your preferred name)
   - **Database Password**: Choose a strong password
   - **Region**: Select the closest region to you
5. Click "Create new project" and wait for it to initialize (2-3 minutes)

## Step 2: Get Your API Keys

1. Once the project is ready, go to **Settings** > **API**
2. You'll see:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Project API keys**:
     - `anon` `public` key (safe to use in the browser)
     - `service_role` key (keep this secret, server-side only)

## Step 3: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

## Step 4: Set Up User Roles in Supabase

We need to create a custom table to store user roles and metadata.

1. Go to **SQL Editor** in your Supabase dashboard
2. Click "New query"
3. Paste and run this SQL:

```sql
-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'SELLER',
  business_id TEXT NOT NULL DEFAULT 'default-business',
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own role
CREATE POLICY "Users can read own role"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Only admins can insert/update roles
CREATE POLICY "Admins can manage roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE id = auth.uid()
      AND role IN ('OWNER', 'SUPER_ADMIN')
    )
  );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (id, role, business_id, name)
  VALUES (
    NEW.id,
    'SELLER', -- Default role
    'default-business',
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user_role on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Step 5: Create Your First Admin User

1. Go to **Authentication** > **Users** in Supabase dashboard
2. Click "Add user" > "Create new user"
3. Fill in:
   - **Email**: admin@demo.com (or your email)
   - **Password**: Choose a secure password
   - **Auto Confirm User**: YES (check this box)
4. Click "Create user"

5. Now update this user's role to OWNER:
   - Go to **SQL Editor**
   - Run this query (replace the email):
   ```sql
   UPDATE public.user_roles
   SET role = 'OWNER'
   WHERE id = (
     SELECT id FROM auth.users WHERE email = 'admin@demo.com'
   );
   ```

## Step 6: Configure Email Settings (Optional but Recommended)

By default, Supabase uses a demo email service. For production:

1. Go to **Authentication** > **Email Templates**
2. Configure your SMTP settings or use Supabase's built-in email
3. Customize the email templates for:
   - Confirmation emails
   - Password reset emails
   - Magic link emails

## Step 7: Test the Setup

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Visit http://localhost:3000
3. You should be redirected to `/login`
4. Sign in with the admin credentials you created

## Available Roles

- **OWNER**: Full system access
- **SUPER_ADMIN**: Manage users, products, sales, reports
- **FINANCE**: View sales and financial reports
- **STOCK_MANAGER**: Manage products and inventory
- **SELLER**: Create sales and manage customers

## Deployment to Cloud Run

When deploying to Google Cloud Run, add the environment variables:

```bash
gcloud run deploy pos-system \
  --source . \
  --region=asia-south1 \
  --set-env-vars="NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co,NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key,SUPABASE_SERVICE_ROLE_KEY=your-service-key"
```

## Troubleshooting

**Issue**: "Invalid API key"
- Solution: Double-check your `.env.local` file has the correct keys from Supabase dashboard

**Issue**: Can't sign in
- Solution: Make sure you clicked "Auto Confirm User" when creating the user, or check email for confirmation link

**Issue**: Role not working
- Solution: Run the SQL query to update the user's role in the `user_roles` table

**Issue**: RLS (Row Level Security) errors
- Solution: Make sure all the policies were created correctly from Step 4

## Next Steps

- Invite team members through Supabase Auth
- Set up email templates for password reset
- Enable additional auth providers (Google, GitHub, etc.) in Authentication settings
- Monitor auth logs in Supabase dashboard
