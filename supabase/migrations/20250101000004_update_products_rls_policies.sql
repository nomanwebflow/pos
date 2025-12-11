-- Drop existing role-specific policies
DROP POLICY IF EXISTS "Cashier read only products" ON public.products;
DROP POLICY IF EXISTS "Stock manager full access to products" ON public.products;
DROP POLICY IF EXISTS "Super admin full access to products" ON public.products;

-- Create new policies that allow all authenticated users to read products
-- This ensures all users (SUPER_ADMIN, STOCK_MANAGER, CASHIER) see the same products
CREATE POLICY "Allow all authenticated users to read products"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Allow stock managers and super admins to insert products
CREATE POLICY "Allow stock managers and super admins to insert products"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('SUPER_ADMIN', 'STOCK_MANAGER')
      AND is_active = true
    )
  );

-- Allow stock managers and super admins to update products
CREATE POLICY "Allow stock managers and super admins to update products"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('SUPER_ADMIN', 'STOCK_MANAGER')
      AND is_active = true
    )
  );

-- Allow stock managers and super admins to delete products
CREATE POLICY "Allow stock managers and super admins to delete products"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('SUPER_ADMIN', 'STOCK_MANAGER')
      AND is_active = true
    )
  );
