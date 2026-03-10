
ALTER TABLE public.building_budgets 
  ADD COLUMN start_date date,
  ADD COLUMN end_date date;

-- Backfill existing records: calendar year budgets
UPDATE public.building_budgets 
SET start_date = make_date(year, 1, 1),
    end_date = make_date(year, 12, 31);

-- Make columns NOT NULL after backfill
ALTER TABLE public.building_budgets 
  ALTER COLUMN start_date SET NOT NULL,
  ALTER COLUMN end_date SET NOT NULL;
