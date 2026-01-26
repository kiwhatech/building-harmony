-- Fix overly permissive notification INSERT policy
-- The system needs to create notifications, but we should scope it better

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Notifications can only be created for the current user or by the system
-- This is more restrictive than true - you can only create notifications for yourself
CREATE POLICY "Users can create notifications for themselves"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());