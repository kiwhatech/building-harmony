-- Update the INSERT policy for maintenance_requests to allow building admins as well
DROP POLICY IF EXISTS "Residents can create maintenance requests" ON public.maintenance_requests;

CREATE POLICY "Residents and admins can create maintenance requests"
ON public.maintenance_requests
FOR INSERT
WITH CHECK (
  (requested_by = auth.uid()) AND 
  (is_unit_resident(auth.uid(), unit_id) OR is_building_admin(auth.uid(), get_building_from_unit(unit_id)))
);