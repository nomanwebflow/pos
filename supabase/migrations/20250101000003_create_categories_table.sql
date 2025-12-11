-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories table
-- Allow authenticated users to read all categories
CREATE POLICY "Allow authenticated users to read categories"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow SUPER_ADMIN and STOCK_MANAGER to insert categories
CREATE POLICY "Allow SUPER_ADMIN and STOCK_MANAGER to insert categories"
  ON public.categories
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

-- Allow SUPER_ADMIN and STOCK_MANAGER to update categories
CREATE POLICY "Allow SUPER_ADMIN and STOCK_MANAGER to update categories"
  ON public.categories
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

-- Allow SUPER_ADMIN and STOCK_MANAGER to delete categories
CREATE POLICY "Allow SUPER_ADMIN and STOCK_MANAGER to delete categories"
  ON public.categories
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

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION update_categories_updated_at();
