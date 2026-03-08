
-- Add payment_type column to payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'unit_fee',
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.unified_requests(id) ON DELETE SET NULL;

-- Add 'ready_for_payment' to the unified_request_status enum
ALTER TYPE public.unified_request_status ADD VALUE IF NOT EXISTS 'ready_for_payment';

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON public.payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_request_id ON public.payments(request_id);
