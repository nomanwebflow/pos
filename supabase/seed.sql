-- Seed file for creating placeholder user accounts
-- These accounts are for development/testing purposes only

-- WARNING: These are test accounts with simple passwords
-- DO NOT use these in production!

-- NOTE: User creation is handled by the script scripts/create-test-users.ts
-- This ensures proper password hashing via Supabase Auth API
-- Run: npx tsx scripts/create-test-users.ts
--
-- Test accounts:
-- - admin@posystem.local / admin123 (SUPER_ADMIN)
-- - cashier@posystem.local / cashier123 (CASHIER)
-- - stock@posystem.local / stock123 (STOCK_MANAGER)

-- Insert sample products for POS checkout testing
INSERT INTO public.products (name, description, price, stock_quantity, sku, category) VALUES
  ('Coca Cola 330ml', 'Refreshing cola drink', 25.00, 100, 'COC-330', 'Beverages'),
  ('Pepsi 330ml', 'Classic pepsi cola', 25.00, 80, 'PEP-330', 'Beverages'),
  ('Sprite 330ml', 'Lemon-lime soda', 25.00, 75, 'SPR-330', 'Beverages'),
  ('White Bread', 'Fresh white bread loaf', 35.00, 50, 'BRD-WHT', 'Bakery'),
  ('Brown Bread', 'Whole wheat bread', 40.00, 40, 'BRD-BRN', 'Bakery'),
  ('Fresh Milk 1L', 'Full cream fresh milk', 65.00, 30, 'MLK-1L', 'Dairy'),
  ('Yogurt 500g', 'Plain yogurt', 55.00, 25, 'YOG-500', 'Dairy'),
  ('Rice 5kg', 'Premium basmati rice', 220.00, 25, 'RIC-5KG', 'Groceries'),
  ('Rice 10kg', 'Premium basmati rice bulk', 420.00, 15, 'RIC-10KG', 'Groceries'),
  ('Cooking Oil 2L', 'Vegetable cooking oil', 180.00, 20, 'OIL-2L', 'Groceries'),
  ('Pasta 500g', 'Italian pasta', 45.00, 35, 'PAS-500', 'Groceries'),
  ('Tomato Sauce 500ml', 'Pasta sauce', 75.00, 30, 'SAU-TOM', 'Groceries'),
  ('Eggs (12 pack)', 'Fresh farm eggs', 85.00, 40, 'EGG-12', 'Dairy'),
  ('Butter 250g', 'Salted butter', 90.00, 20, 'BUT-250', 'Dairy'),
  ('Cheese Slice 200g', 'Processed cheese slices', 110.00, 18, 'CHE-200', 'Dairy'),
  ('Orange Juice 1L', 'Fresh orange juice', 95.00, 22, 'JUI-ORA', 'Beverages'),
  ('Apple Juice 1L', 'Fresh apple juice', 95.00, 20, 'JUI-APP', 'Beverages'),
  ('Water 1.5L', 'Mineral water', 35.00, 100, 'WAT-1.5L', 'Beverages'),
  ('Coffee 200g', 'Ground coffee', 150.00, 15, 'COF-200', 'Beverages'),
  ('Tea Bags (25)', 'Black tea bags', 85.00, 25, 'TEA-25', 'Beverages'),
  ('Sugar 1kg', 'White sugar', 55.00, 40, 'SUG-1KG', 'Groceries'),
  ('Salt 500g', 'Iodized salt', 25.00, 50, 'SAL-500', 'Groceries'),
  ('Flour 1kg', 'All-purpose flour', 45.00, 30, 'FLO-1KG', 'Groceries'),
  ('Soap Bar', 'Bathing soap', 30.00, 45, 'SOP-BAR', 'Personal Care'),
  ('Shampoo 400ml', 'Hair shampoo', 120.00, 20, 'SHA-400', 'Personal Care'),
  ('Toothpaste 100g', 'Dental care', 65.00, 35, 'TOP-100', 'Personal Care'),
  ('Tissue Box', 'Facial tissues', 55.00, 28, 'TIS-BOX', 'Personal Care'),
  ('Paper Towels', 'Kitchen paper towels', 75.00, 25, 'PAP-TOW', 'Household'),
  ('Dish Soap 500ml', 'Dishwashing liquid', 85.00, 22, 'DIS-500', 'Household'),
  ('Laundry Detergent 1kg', 'Washing powder', 165.00, 18, 'LAU-1KG', 'Household')
ON CONFLICT (sku) DO NOTHING;

-- Insert some sample customers (removed ON CONFLICT clause since no unique constraint on id)
INSERT INTO public.customers (name, email, phone, address)
SELECT 'John Doe', 'john@example.com', '+1234567890', '123 Main St, City'
WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE email = 'john@example.com');

INSERT INTO public.customers (name, email, phone, address)
SELECT 'Jane Smith', 'jane@example.com', '+0987654321', '456 Oak Ave, Town'
WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE email = 'jane@example.com');

INSERT INTO public.customers (name, email, phone, address)
SELECT 'Bob Johnson', 'bob@example.com', '+1122334455', '789 Pine Rd, Village'
WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE email = 'bob@example.com');
