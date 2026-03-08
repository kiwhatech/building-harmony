
-- Add bank_details jsonb column to buildings
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS bank_details jsonb DEFAULT '{}'::jsonb;

-- Add trn column to payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS trn text DEFAULT NULL;
