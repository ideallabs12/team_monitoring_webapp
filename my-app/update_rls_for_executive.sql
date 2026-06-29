-- ==========================================
-- UPDATE is_admin() FOR EXECUTIVE ROLE
-- ==========================================

-- We update the helper function `is_admin()` to also return true for 'executive'
-- This ensures that all existing RLS policies that grant 'admin' universal access
-- will now also grant the same database-level access to 'executive'.
-- (The frontend UI still correctly hides operational/edit buttons for executives).

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND platform_role IN ('admin', 'executive')
  );
$$ LANGUAGE sql SECURITY DEFINER;
