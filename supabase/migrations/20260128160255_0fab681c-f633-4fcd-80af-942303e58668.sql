-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Admins can create buildings" ON public.buildings;

-- Allow any authenticated user to create buildings (they'll become the admin of that building)
CREATE POLICY "Authenticated users can create buildings"
  ON public.buildings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Also allow building creators to view their own buildings even before building_members is populated
DROP POLICY IF EXISTS "Members can view their buildings" ON public.buildings;

CREATE POLICY "Members or creators can view buildings"
  ON public.buildings
  FOR SELECT
  TO authenticated
  USING (
    is_building_member(auth.uid(), id) 
    OR created_by = auth.uid()
  );