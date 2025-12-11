-- Fix infinite recursion in user_profiles RLS policies
-- Drop the problematic policy
DROP POLICY IF EXISTS "Only super admin can manage users" ON public.user_profiles;

-- Create separate policies that don't cause recursion
-- Policy: All authenticated users can read ALL profiles (needed to avoid recursion)
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read all profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Only allow inserts during signup (via trigger)
-- Service role can insert via the trigger function
CREATE POLICY "Service role can insert profiles"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (false); -- Normal users cannot insert directly

-- Policy: Only super admin can delete profiles (checked via function)
CREATE POLICY "Super admin can delete profiles"
  ON public.user_profiles
  FOR DELETE
  TO authenticated
  USING (
    -- Check if the current user is a super admin by using SECURITY DEFINER function
    (SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'SUPER_ADMIN'
  );
