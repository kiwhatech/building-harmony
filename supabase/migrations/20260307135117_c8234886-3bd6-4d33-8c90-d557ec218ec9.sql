
DROP POLICY IF EXISTS "Users update own new or admins update all" ON public.unified_requests;

CREATE POLICY "Users update own new or admins update all"
ON public.unified_requests
FOR UPDATE
TO authenticated
USING (
  (
    (created_by = auth.uid())
    AND status IN ('new', 'quotation_sent', 'scheduled')
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_building_admin(auth.uid(), building_id)
);
