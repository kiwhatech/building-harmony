
-- Update default status for new requests
ALTER TABLE public.unified_requests ALTER COLUMN status SET DEFAULT 'draft'::unified_request_status;

-- Update RLS policy for residents to update their own requests in new statuses
DROP POLICY IF EXISTS "Users update own new or admins update all" ON public.unified_requests;
CREATE POLICY "Users update own or admins update all"
ON public.unified_requests FOR UPDATE TO authenticated
USING (
  ((created_by = auth.uid()) AND (status = ANY (ARRAY['draft'::unified_request_status, 'submitted'::unified_request_status, 'quoted'::unified_request_status, 'waiting_approval'::unified_request_status])))
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_building_admin(auth.uid(), building_id)
);
