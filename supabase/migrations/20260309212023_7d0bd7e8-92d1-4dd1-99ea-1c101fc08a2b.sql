
-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Users can create own ratings" ON public.provider_ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON public.provider_ratings;
DROP POLICY IF EXISTS "Users can view ratings" ON public.provider_ratings;

CREATE POLICY "Users can view ratings"
  ON public.provider_ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create own ratings"
  ON public.provider_ratings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ratings"
  ON public.provider_ratings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
