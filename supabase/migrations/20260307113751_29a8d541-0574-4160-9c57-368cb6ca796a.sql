
-- Create role_permissions table
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(role, permission)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Everyone can read permissions (needed for frontend checks)
CREATE POLICY "Anyone can view role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage permissions
CREATE POLICY "Admins can manage role permissions"
ON public.role_permissions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed default permissions for admin
INSERT INTO public.role_permissions (role, permission) VALUES
  ('admin', 'canView'),
  ('admin', 'canEdit'),
  ('admin', 'canDelete'),
  ('admin', 'canRequest'),
  ('admin', 'canManageUsers'),
  ('admin', 'canManageBuildings'),
  ('admin', 'canManageFees'),
  ('admin', 'canManageAnnouncements'),
  ('admin', 'canViewReports'),
  ('admin', 'canManageDocuments'),
  ('admin', 'canManageSettings');

-- Seed default permissions for resident
INSERT INTO public.role_permissions (role, permission) VALUES
  ('resident', 'canView'),
  ('resident', 'canRequest'),
  ('resident', 'canViewAnnouncements'),
  ('resident', 'canViewDocuments'),
  ('resident', 'canViewOwnFees');

-- Seed default permissions for provider
INSERT INTO public.role_permissions (role, permission) VALUES
  ('provider', 'canView'),
  ('provider', 'canEditOwnEstimates'),
  ('provider', 'canRequest');
