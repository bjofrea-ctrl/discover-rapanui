-- Drop the recursive policy
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Allow users to read their own role (already exists, but ensure it's correct)
DROP POLICY IF EXISTS "Users can read their own role" ON public.user_roles;
CREATE POLICY "Users can read their own role"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
