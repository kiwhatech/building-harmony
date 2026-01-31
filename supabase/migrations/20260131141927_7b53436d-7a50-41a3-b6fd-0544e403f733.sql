-- Update the INSERT policy to also allow users with admin role
DROP POLICY IF EXISTS "Residents and admins can create maintenance requests" ON public.maintenance_requests;

CREATE POLICY "Residents and admins can create maintenance requests"
ON public.maintenance_requests
FOR INSERT
WITH CHECK (
  (requested_by = auth.uid()) AND 
  (
    is_unit_resident(auth.uid(), unit_id) OR 
    is_building_admin(auth.uid(), get_building_from_unit(unit_id)) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);