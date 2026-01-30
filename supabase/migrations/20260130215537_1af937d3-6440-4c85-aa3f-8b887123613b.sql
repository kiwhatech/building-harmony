-- Create residents table to store detailed resident information
CREATE TABLE public.residents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  surname TEXT NOT NULL,
  email TEXT NOT NULL,
  fiscal_code TEXT,
  telephone TEXT,
  additional_info TEXT,
  is_owner BOOLEAN DEFAULT false,
  move_in_date DATE,
  move_out_date DATE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on fiscal_code for uniqueness checks (unique per building)
CREATE INDEX idx_residents_fiscal_code ON public.residents(fiscal_code) WHERE fiscal_code IS NOT NULL;
CREATE INDEX idx_residents_unit_id ON public.residents(unit_id);
CREATE INDEX idx_residents_email ON public.residents(email);

-- Enable RLS
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;

-- Building admins can manage residents
CREATE POLICY "Building admins can manage residents"
  ON public.residents
  FOR ALL
  USING (is_building_admin(auth.uid(), get_building_from_unit(unit_id)));

-- Building members can view residents in their buildings
CREATE POLICY "Members can view residents in their buildings"
  ON public.residents
  FOR SELECT
  USING (is_building_member(auth.uid(), get_building_from_unit(unit_id)));

-- Add trigger to update updated_at
CREATE TRIGGER update_residents_updated_at
  BEFORE UPDATE ON public.residents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();