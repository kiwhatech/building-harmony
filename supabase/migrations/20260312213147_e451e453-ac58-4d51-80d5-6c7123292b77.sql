
ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS year_of_construction integer,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS admin_name text,
  ADD COLUMN IF NOT EXISTS fiscal_code text,
  ADD COLUMN IF NOT EXISTS contract_info text,
  ADD COLUMN IF NOT EXISTS legal_notes text;
