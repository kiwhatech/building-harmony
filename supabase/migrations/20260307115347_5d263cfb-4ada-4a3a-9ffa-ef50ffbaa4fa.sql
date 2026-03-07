
-- Create enums
CREATE TYPE public.estimate_category AS ENUM ('electrical', 'plumbing', 'cleaning', 'other');
CREATE TYPE public.estimate_priority AS ENUM ('low', 'normal', 'urgent');
CREATE TYPE public.estimate_request_status AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'converted');

-- Create table
CREATE TABLE public.estimate_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  category estimate_category NOT NULL DEFAULT 'other',
  priority estimate_priority NOT NULL DEFAULT 'normal',
  estimated_amount numeric,
  provider text,
  status estimate_request_status NOT NULL DEFAULT 'draft',
  internal_notes text,
  linked_request_id uuid REFERENCES public.maintenance_requests(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.estimate_requests ENABLE ROW LEVEL SECURITY;

-- Users can view own estimates; admins/building admins can view all
CREATE POLICY "Users can view own or admins view all estimates"
ON public.estimate_requests FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_building_admin(auth.uid(), building_id)
);

-- Users can create estimates
CREATE POLICY "Users can create estimates"
ON public.estimate_requests FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- Users can update own drafts; admins can update all
CREATE POLICY "Users update own drafts or admins update all"
ON public.estimate_requests FOR UPDATE TO authenticated
USING (
  (created_by = auth.uid() AND status = 'draft'::estimate_request_status)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_building_admin(auth.uid(), building_id)
);

-- Only admins can delete
CREATE POLICY "Admins can delete estimates"
ON public.estimate_requests FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_building_admin(auth.uid(), building_id)
);

-- Updated_at trigger
CREATE TRIGGER update_estimate_requests_updated_at
  BEFORE UPDATE ON public.estimate_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Conversion function: approved estimate → maintenance request
CREATE OR REPLACE FUNCTION public.convert_estimate_to_request(_estimate_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _est estimate_requests%ROWTYPE;
  _new_id uuid;
  _cat maintenance_category;
BEGIN
  SELECT * INTO _est FROM estimate_requests WHERE id = _estimate_id;
  IF _est IS NULL THEN RAISE EXCEPTION 'Estimate not found'; END IF;
  IF _est.status != 'approved' THEN RAISE EXCEPTION 'Only approved estimates can be converted'; END IF;

  _cat := CASE _est.category::text
    WHEN 'electrical' THEN 'electrical'::maintenance_category
    WHEN 'plumbing' THEN 'plumbing'::maintenance_category
    ELSE 'general'::maintenance_category
  END;

  INSERT INTO maintenance_requests (unit_id, title, description, category, priority, requested_by, status)
  VALUES (
    _est.unit_id, _est.title, _est.description, _cat,
    CASE _est.priority::text WHEN 'urgent' THEN 3 WHEN 'normal' THEN 2 ELSE 1 END,
    _est.created_by, 'requested'::request_status
  ) RETURNING id INTO _new_id;

  UPDATE estimate_requests SET status = 'converted', linked_request_id = _new_id WHERE id = _estimate_id;

  RETURN _new_id;
END;
$$;
