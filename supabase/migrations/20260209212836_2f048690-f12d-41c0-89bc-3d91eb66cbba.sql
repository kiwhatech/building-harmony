
-- Millesimi tables: defines named millesimi categories per building (e.g., "generali", "riscaldamento")
CREATE TABLE public.millesimi_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(building_id, code)
);

ALTER TABLE public.millesimi_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Building admins can manage millesimi tables"
  ON public.millesimi_tables FOR ALL
  USING (is_building_admin(auth.uid(), building_id));

CREATE POLICY "Members and admins can view millesimi tables"
  ON public.millesimi_tables FOR SELECT
  USING (is_building_member(auth.uid(), building_id) OR has_role(auth.uid(), 'admin'::app_role));

-- Millesimi values: per-unit values for each millesimi table
CREATE TABLE public.millesimi_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  millesimi_table_id UUID NOT NULL REFERENCES public.millesimi_tables(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(millesimi_table_id, unit_id)
);

ALTER TABLE public.millesimi_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Building admins can manage millesimi values"
  ON public.millesimi_values FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.millesimi_tables mt
    WHERE mt.id = millesimi_values.millesimi_table_id
    AND is_building_admin(auth.uid(), mt.building_id)
  ));

CREATE POLICY "Members and admins can view millesimi values"
  ON public.millesimi_values FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.millesimi_tables mt
    WHERE mt.id = millesimi_values.millesimi_table_id
    AND (is_building_member(auth.uid(), mt.building_id) OR has_role(auth.uid(), 'admin'::app_role))
  ));

-- Building budgets: yearly budget definitions
CREATE TABLE public.building_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(building_id, year)
);

ALTER TABLE public.building_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Building admins can manage budgets"
  ON public.building_budgets FOR ALL
  USING (is_building_admin(auth.uid(), building_id));

CREATE POLICY "Members and admins can view budgets"
  ON public.building_budgets FOR SELECT
  USING (is_building_member(auth.uid(), building_id) OR has_role(auth.uid(), 'admin'::app_role));

-- Budget categories: expense categories within a budget, linked to millesimi tables
CREATE TABLE public.budget_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.building_budgets(id) ON DELETE CASCADE,
  millesimi_table_id UUID NOT NULL REFERENCES public.millesimi_tables(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Building admins can manage budget categories"
  ON public.budget_categories FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.building_budgets bb
    WHERE bb.id = budget_categories.budget_id
    AND is_building_admin(auth.uid(), bb.building_id)
  ));

CREATE POLICY "Members and admins can view budget categories"
  ON public.budget_categories FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.building_budgets bb
    WHERE bb.id = budget_categories.budget_id
    AND (is_building_member(auth.uid(), bb.building_id) OR has_role(auth.uid(), 'admin'::app_role))
  ));

-- Triggers for updated_at
CREATE TRIGGER update_millesimi_tables_updated_at BEFORE UPDATE ON public.millesimi_tables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_millesimi_values_updated_at BEFORE UPDATE ON public.millesimi_values FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_building_budgets_updated_at BEFORE UPDATE ON public.building_budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_budget_categories_updated_at BEFORE UPDATE ON public.budget_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
