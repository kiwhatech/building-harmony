
-- New enums for unified requests
CREATE TYPE public.unified_request_type AS ENUM ('quotation', 'intervention');
CREATE TYPE public.unified_request_status AS ENUM (
  'new', 'in_review', 'quotation_sent', 'approved', 'scheduled', 'in_progress', 'completed', 'rejected'
);

-- Unified requests table
CREATE TABLE public.unified_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id),
  unit_id uuid NOT NULL REFERENCES public.units(id),
  created_by uuid NOT NULL,
  request_type public.unified_request_type NOT NULL DEFAULT 'intervention',
  title text NOT NULL,
  description text,
  category public.maintenance_category NOT NULL DEFAULT 'general',
  priority integer NOT NULL DEFAULT 2,
  status public.unified_request_status NOT NULL DEFAULT 'new',
  estimated_amount numeric,
  provider text,
  assigned_to uuid,
  internal_notes text,
  attachment_urls text[] DEFAULT '{}',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE TRIGGER update_unified_requests_updated_at
  BEFORE UPDATE ON public.unified_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing maintenance_requests
INSERT INTO public.unified_requests (
  id, building_id, unit_id, created_by, request_type, title, description, category, priority,
  status, assigned_to, completed_at, created_at, updated_at
)
SELECT
  mr.id,
  u.building_id,
  mr.unit_id,
  mr.requested_by,
  'intervention'::public.unified_request_type,
  mr.title,
  mr.description,
  mr.category,
  COALESCE(mr.priority, 2),
  CASE mr.status
    WHEN 'requested' THEN 'new'
    WHEN 'under_review' THEN 'in_review'
    WHEN 'approved' THEN 'approved'
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'completed' THEN 'completed'
    WHEN 'paid' THEN 'completed'
  END::public.unified_request_status,
  mr.assigned_to,
  mr.completed_at,
  mr.created_at,
  mr.updated_at
FROM public.maintenance_requests mr
JOIN public.units u ON u.id = mr.unit_id;

-- Migrate existing estimate_requests
INSERT INTO public.unified_requests (
  id, building_id, unit_id, created_by, request_type, title, description, category, priority,
  status, estimated_amount, provider, internal_notes, created_at, updated_at
)
SELECT
  er.id,
  er.building_id,
  er.unit_id,
  er.created_by,
  'quotation'::public.unified_request_type,
  er.title,
  er.description,
  CASE er.category::text
    WHEN 'electrical' THEN 'electrical'
    WHEN 'plumbing' THEN 'plumbing'
    ELSE 'general'
  END::public.maintenance_category,
  CASE er.priority::text
    WHEN 'urgent' THEN 3
    WHEN 'normal' THEN 2
    ELSE 1
  END,
  CASE er.status::text
    WHEN 'draft' THEN 'new'
    WHEN 'submitted' THEN 'new'
    WHEN 'under_review' THEN 'in_review'
    WHEN 'approved' THEN 'approved'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'converted' THEN 'completed'
  END::public.unified_request_status,
  er.estimated_amount,
  er.provider,
  er.internal_notes,
  er.created_at,
  er.updated_at
FROM public.estimate_requests er;

-- Enable RLS
ALTER TABLE public.unified_requests ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view own requests, admins/building admins see all
CREATE POLICY "Users can view own or admins view all"
  ON public.unified_requests FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR is_building_admin(auth.uid(), building_id)
  );

-- RLS: Authenticated users can create requests
CREATE POLICY "Authenticated users can create requests"
  ON public.unified_requests FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- RLS: Admins/building admins can update any, users can update own if status = new
CREATE POLICY "Users update own new or admins update all"
  ON public.unified_requests FOR UPDATE TO authenticated
  USING (
    (created_by = auth.uid() AND status = 'new')
    OR has_role(auth.uid(), 'admin')
    OR is_building_admin(auth.uid(), building_id)
  );

-- RLS: Admins can delete
CREATE POLICY "Admins can delete requests"
  ON public.unified_requests FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    OR is_building_admin(auth.uid(), building_id)
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.unified_requests;
