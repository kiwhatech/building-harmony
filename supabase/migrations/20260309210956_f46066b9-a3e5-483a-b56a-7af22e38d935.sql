
CREATE TABLE public.provider_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.unified_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(request_id, user_id)
);

ALTER TABLE public.provider_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own ratings"
  ON public.provider_ratings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view ratings"
  ON public.provider_ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own ratings"
  ON public.provider_ratings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
