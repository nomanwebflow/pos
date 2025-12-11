-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'CASHIER', 'STOCK_MANAGER');

-- Create user_profiles table to store role and additional user info
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role user_role NOT NULL DEFAULT 'CASHIER',
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Only SUPER_ADMIN can insert/update/delete user profiles
CREATE POLICY "Only super admin can manage users"
  ON public.user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role = 'SUPER_ADMIN'
      AND is_active = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role = 'SUPER_ADMIN'
      AND is_active = TRUE
    )
  );

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, name)
  VALUES (
    NEW.id,
    'CASHIER', -- Default role
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user_profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get user role (useful for RLS policies)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM public.user_profiles WHERE id = user_id AND is_active = TRUE;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role = 'SUPER_ADMIN'
    AND is_active = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to check if current user is cashier
CREATE OR REPLACE FUNCTION public.is_cashier()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role = 'CASHIER'
    AND is_active = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to check if current user is stock manager
CREATE OR REPLACE FUNCTION public.is_stock_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role = 'STOCK_MANAGER'
    AND is_active = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create tables for POS system if they don't exist

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  sku TEXT UNIQUE,
  category TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Products policies
-- SUPER_ADMIN: Full access
-- STOCK_MANAGER: Full access
-- CASHIER: Read only
CREATE POLICY "Super admin full access to products"
  ON public.products
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Stock manager full access to products"
  ON public.products
  FOR ALL
  TO authenticated
  USING (public.is_stock_manager())
  WITH CHECK (public.is_stock_manager());

CREATE POLICY "Cashier read only products"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (public.is_cashier());

-- Customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Customers policies
-- SUPER_ADMIN: Full access
-- CASHIER: Full access
-- STOCK_MANAGER: No access
CREATE POLICY "Super admin full access to customers"
  ON public.customers
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Cashier full access to customers"
  ON public.customers
  FOR ALL
  TO authenticated
  USING (public.is_cashier())
  WITH CHECK (public.is_cashier());

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id),
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Transactions policies
-- SUPER_ADMIN: Full access
-- CASHIER: Can create and read
-- STOCK_MANAGER: No access
CREATE POLICY "Super admin full access to transactions"
  ON public.transactions
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Cashier can create transactions"
  ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_cashier());

CREATE POLICY "Cashier can read transactions"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (public.is_cashier());

-- Transaction items table
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

-- Transaction items policies (same as transactions)
CREATE POLICY "Super admin full access to transaction items"
  ON public.transaction_items
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Cashier can create transaction items"
  ON public.transaction_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_cashier());

CREATE POLICY "Cashier can read transaction items"
  ON public.transaction_items
  FOR SELECT
  TO authenticated
  USING (public.is_cashier());

-- Audit log table (for super admin to track all actions)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super admin can read audit logs
CREATE POLICY "Only super admin can read audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON public.transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON public.transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
