-- Drop and recreate INSERT policy to support intervention payments (no fee_id)
DROP POLICY IF EXISTS "Residents and admins can create payments" ON public.payments;
CREATE POLICY "Residents and admins can create payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
  (fee_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM fees f WHERE f.id = payments.fee_id AND is_building_member(auth.uid(), f.building_id)
  ))
  OR
  (request_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM unified_requests ur WHERE ur.id = payments.request_id AND (ur.created_by = auth.uid() OR is_building_admin(auth.uid(), ur.building_id))
  ))
  OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Update SELECT policy to also cover intervention payments
DROP POLICY IF EXISTS "Members and admins can view payments" ON public.payments;
CREATE POLICY "Members and admins can view payments"
ON public.payments
FOR SELECT
TO authenticated
USING (
  (fee_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM fees f WHERE f.id = payments.fee_id AND is_building_member(auth.uid(), f.building_id)
  ))
  OR
  (request_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM unified_requests ur WHERE ur.id = payments.request_id AND (ur.created_by = auth.uid() OR is_building_admin(auth.uid(), ur.building_id))
  ))
  OR
  has_role(auth.uid(), 'admin'::app_role)
);