
CREATE TABLE public.translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(key, locale)
);

ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- Everyone can read translations
CREATE POLICY "Anyone can view translations"
  ON public.translations FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage translations
CREATE POLICY "Admins can manage translations"
  ON public.translations FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow anon users to read translations (for login page)
CREATE POLICY "Anon can view translations"
  ON public.translations FOR SELECT
  TO anon
  USING (true);
