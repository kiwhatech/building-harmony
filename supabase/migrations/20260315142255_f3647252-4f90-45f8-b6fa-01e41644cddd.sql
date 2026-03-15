
-- Create condominiums table
CREATE TABLE public.condominiums (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  address text NOT NULL,
  city text,
  state text,
  zip_code text,
  identifier_code text,
  manager_name text,
  manager_email text,
  manager_phone text,
  common_services text,
  fiscal_code text,
  notes text,
  image_url text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.condominiums ENABLE ROW LEVEL SECURITY;

-- RLS: Creators and admins can view
CREATE POLICY "Members or creators or admins can view condominiums"
  ON public.condominiums FOR SELECT TO public
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- RLS: Authenticated users can create
CREATE POLICY "Authenticated users can create condominiums"
  ON public.condominiums FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- RLS: Creators and admins can update
CREATE POLICY "Creators and admins can update condominiums"
  ON public.condominiums FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- RLS: Creators and admins can delete
CREATE POLICY "Creators and admins can delete condominiums"
  ON public.condominiums FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Add condominium_id FK to buildings
ALTER TABLE public.buildings
  ADD COLUMN condominium_id uuid REFERENCES public.condominiums(id) ON DELETE SET NULL;
