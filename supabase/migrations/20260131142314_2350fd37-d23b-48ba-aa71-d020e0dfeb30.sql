-- Update SELECT policies to allow admins to see everything

-- Buildings
DROP POLICY IF EXISTS "Members or creators can view buildings" ON public.buildings;
CREATE POLICY "Members or creators or admins can view buildings"
ON public.buildings FOR SELECT
USING (
  is_building_member(auth.uid(), id) OR 
  (created_by = auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Units
DROP POLICY IF EXISTS "Members can view units in their buildings" ON public.units;
CREATE POLICY "Members and admins can view units"
ON public.units FOR SELECT
USING (
  is_building_member(auth.uid(), building_id) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Maintenance requests
DROP POLICY IF EXISTS "Members can view maintenance requests in their buildings" ON public.maintenance_requests;
CREATE POLICY "Members and admins can view maintenance requests"
ON public.maintenance_requests FOR SELECT
USING (
  is_building_member(auth.uid(), get_building_from_unit(unit_id)) OR 
  (assigned_to = auth.uid()) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Residents
DROP POLICY IF EXISTS "Members can view residents in their buildings" ON public.residents;
CREATE POLICY "Members and admins can view residents"
ON public.residents FOR SELECT
USING (
  is_building_member(auth.uid(), get_building_from_unit(unit_id)) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Fees
DROP POLICY IF EXISTS "Members can view fees in their buildings" ON public.fees;
CREATE POLICY "Members and admins can view fees"
ON public.fees FOR SELECT
USING (
  is_building_member(auth.uid(), building_id) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Announcements
DROP POLICY IF EXISTS "Members can view announcements in their buildings" ON public.announcements;
CREATE POLICY "Members and admins can view announcements"
ON public.announcements FOR SELECT
USING (
  is_building_member(auth.uid(), building_id) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Building members
DROP POLICY IF EXISTS "Members can view building members" ON public.building_members;
CREATE POLICY "Members and admins can view building members"
ON public.building_members FOR SELECT
USING (
  is_building_member(auth.uid(), building_id) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Unit residents
DROP POLICY IF EXISTS "Members can view unit residents in their buildings" ON public.unit_residents;
CREATE POLICY "Members and admins can view unit residents"
ON public.unit_residents FOR SELECT
USING (
  is_building_member(auth.uid(), get_building_from_unit(unit_id)) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Payments
DROP POLICY IF EXISTS "Members can view payments in their buildings" ON public.payments;
CREATE POLICY "Members and admins can view payments"
ON public.payments FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM fees f
    WHERE f.id = payments.fee_id AND is_building_member(auth.uid(), f.building_id)
  )) OR 
  has_role(auth.uid(), 'admin'::app_role)
);