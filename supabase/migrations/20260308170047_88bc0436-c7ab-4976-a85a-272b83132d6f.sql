
-- Create provider_category enum
CREATE TYPE public.provider_category AS ENUM ('general', 'plumbing', 'electrical', 'structural');

-- Create providers table
CREATE TABLE public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category provider_category NOT NULL DEFAULT 'general',
  contact_email text,
  phone text,
  address text,
  rating numeric(2,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add provider FK columns to unified_requests
ALTER TABLE public.unified_requests
  ADD COLUMN preferred_provider_id uuid REFERENCES public.providers(id),
  ADD COLUMN assigned_provider_id uuid REFERENCES public.providers(id);

-- Enable RLS
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- Admins can fully manage providers
CREATE POLICY "Admins can manage providers"
  ON public.providers FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can view active providers (for resident dropdown)
CREATE POLICY "Authenticated users can view active providers"
  ON public.providers FOR SELECT
  TO authenticated
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_providers_updated_at
  BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
