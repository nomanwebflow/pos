
-- Fix infinite recursion in RLS policies

-- 1. Create a secure function to check user role without triggering RLS loop
-- SECURITY DEFINER allows this function to run with privileges of the creator (admin), bypassing RLS
CREATE OR REPLACE FUNCTION public.get_user_role(auth_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM "User" WHERE id = auth_id;
$$;

-- 2. Drop the problematic policies
DROP POLICY IF EXISTS "Owner can view all users" ON "User";
DROP POLICY IF EXISTS "Users can view own profile" ON "User";
DROP POLICY IF EXISTS "Users can update own profile" ON "User";

-- 3. Re-create policies utilizing the secure function

-- Policy 1: Users can ALWAYS view their own profile (No recursion risk here usually, but good to be safe)
CREATE POLICY "Users can view own profile" 
ON "User" 
FOR SELECT 
USING (auth.uid() = id);

-- Policy 2: Owners and Super Admins can view ALL users
-- Uses the helper function to avoid table-scan recursion
CREATE POLICY "Owner can view all users" 
ON "User" 
FOR SELECT 
USING (
  public.get_user_role(auth.uid()) IN ('OWNER', 'SUPER_ADMIN')
);

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON "User" 
FOR UPDATE 
USING (auth.uid() = id);
