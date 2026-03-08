
-- Request activity log for timeline tracking
CREATE TABLE public.request_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.unified_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  activity_type text NOT NULL, -- 'status_change', 'comment', 'attachment', 'assignment', 'quotation_sent', 'quotation_approved', 'quotation_rejected'
  old_status text,
  new_status text,
  message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.request_activities ENABLE ROW LEVEL SECURITY;

-- Anyone who can see the request can see its activities
CREATE POLICY "Users can view request activities"
  ON public.request_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.unified_requests ur
      WHERE ur.id = request_activities.request_id
      AND (
        ur.created_by = auth.uid()
        OR ur.assigned_to = auth.uid()
        OR has_role(auth.uid(), 'admin')
        OR is_building_admin(auth.uid(), ur.building_id)
      )
    )
  );

-- Authenticated users can insert activities for requests they can access
CREATE POLICY "Authenticated users can create activities"
  ON public.request_activities FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.unified_requests ur
      WHERE ur.id = request_activities.request_id
      AND (
        ur.created_by = auth.uid()
        OR ur.assigned_to = auth.uid()
        OR has_role(auth.uid(), 'admin')
        OR is_building_admin(auth.uid(), ur.building_id)
      )
    )
  );

-- Add quotation fields to unified_requests
ALTER TABLE public.unified_requests
  ADD COLUMN IF NOT EXISTS quotation_valid_until date,
  ADD COLUMN IF NOT EXISTS quotation_notes text;

-- Enable realtime for activities
ALTER PUBLICATION supabase_realtime ADD TABLE public.request_activities;
