-- Treat the building creator as an admin
CREATE OR REPLACE FUNCTION public.is_building_admin(_user_id uuid, _building_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.buildings b
      WHERE b.id = _building_id
        AND b.created_by = _user_id
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.building_members bm
      WHERE bm.user_id = _user_id
        AND bm.building_id = _building_id
        AND bm.role = 'admin'
    );
$$;

-- Treat the building creator as a member
CREATE OR REPLACE FUNCTION public.is_building_member(_user_id uuid, _building_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.buildings b
      WHERE b.id = _building_id
        AND b.created_by = _user_id
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.building_members bm
      WHERE bm.user_id = _user_id
        AND bm.building_id = _building_id
    );
$$;
