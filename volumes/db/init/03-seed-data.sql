-- Seed file for creating placeholder user accounts
-- These accounts are for development/testing purposes only

-- Note: Supabase Auth uses bcrypt for password hashing
-- The passwords below are hashed versions of simple passwords
-- SUPER_ADMIN: password is 'admin123'
-- CASHIER: password is 'cashier123'
-- STOCK_MANAGER: password is 'stock123'

-- Insert test users into auth.users table
-- Note: In production, use Supabase CLI or dashboard to create users
-- For local development, we'll create them directly

-- WARNING: These are test accounts with simple passwords
-- DO NOT use these in production!

-- Create Super Admin user
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin@posystem.local',
  '$2a$10$vZ6FvLSQKz7yKJXDWGKJsOqKQlHVqOqwYzX5Kj8Xy0kKCZGMDxYJ.',  -- admin123
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Super Admin"}',
  FALSE,
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Create Cashier user
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'cashier@posystem.local',
  '$2a$10$wF2HDxQ9p3xKKLHqF5xVGuWKQkGQxKyxXqYxPQ1XGjKFGHWYZKGHa',  -- cashier123
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Cashier User"}',
  FALSE,
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Create Stock Manager user
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'stock@posystem.local',
  '$2a$10$xG3IEyR9q4yMLIJrG6yWHuXLRlIHWrLzYzY6RQ2YHkLGIXZLMHJKi',  -- stock123
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Stock Manager"}',
  FALSE,
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Update user roles in user_profiles table
-- Set the super admin role
UPDATE public.user_profiles
SET role = 'SUPER_ADMIN'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@posystem.local');

-- Set the stock manager role
UPDATE public.user_profiles
SET role = 'STOCK_MANAGER'
WHERE id = (SELECT id FROM auth.users WHERE email = 'stock@posystem.local');

-- Cashier role is already set by default, but let's make it explicit
UPDATE public.user_profiles
SET role = 'CASHIER'
WHERE id = (SELECT id FROM auth.users WHERE email = 'cashier@posystem.local');

-- Insert some sample products for testing
INSERT INTO public.products (name, description, price, stock_quantity, sku, category) VALUES
  ('Laptop Computer', 'High-performance laptop', 999.99, 10, 'TECH-001', 'Electronics'),
  ('Wireless Mouse', 'Ergonomic wireless mouse', 29.99, 50, 'TECH-002', 'Electronics'),
  ('Office Chair', 'Comfortable office chair', 199.99, 15, 'FURN-001', 'Furniture'),
  ('Desk Lamp', 'LED desk lamp', 39.99, 30, 'FURN-002', 'Furniture'),
  ('Notebook', 'A4 spiral notebook', 4.99, 100, 'STAT-001', 'Stationery'),
  ('Pen Set', 'Set of 10 pens', 9.99, 75, 'STAT-002', 'Stationery')
ON CONFLICT (sku) DO NOTHING;

-- Insert some sample customers
INSERT INTO public.customers (name, email, phone, address) VALUES
  ('John Doe', 'john@example.com', '+1234567890', '123 Main St, City'),
  ('Jane Smith', 'jane@example.com', '+0987654321', '456 Oak Ave, Town'),
  ('Bob Johnson', 'bob@example.com', '+1122334455', '789 Pine Rd, Village')
ON CONFLICT DO NOTHING;
