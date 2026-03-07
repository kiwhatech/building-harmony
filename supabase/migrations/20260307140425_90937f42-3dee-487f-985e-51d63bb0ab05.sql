
-- Add new enum values to unified_request_status
ALTER TYPE public.unified_request_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE public.unified_request_status ADD VALUE IF NOT EXISTS 'submitted';
ALTER TYPE public.unified_request_status ADD VALUE IF NOT EXISTS 'quoted';
ALTER TYPE public.unified_request_status ADD VALUE IF NOT EXISTS 'waiting_approval';
ALTER TYPE public.unified_request_status ADD VALUE IF NOT EXISTS 'intervention';
