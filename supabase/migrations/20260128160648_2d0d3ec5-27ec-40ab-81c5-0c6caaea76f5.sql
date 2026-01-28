-- Drop the restrictive building_members INSERT policy
DROP POLICY IF EXISTS "Building admins can manage members" ON public.building_members;

-- Allow building creators to add themselves, OR existing admins to add others
CREATE POLICY "Users can join or admins can add members"
  ON public.building_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Building creator can add themselves as admin
    (
      user_id = auth.uid() 
      AND EXISTS (
        SELECT 1 FROM public.buildings b 
        WHERE b.id = building_id AND b.created_by = auth.uid()
      )
    )
    OR
    -- Existing building admins can add other users
    (
      is_building_admin(auth.uid(), building_id) 
      AND user_id <> auth.uid() 
      AND invited_by = auth.uid()
    )
  );