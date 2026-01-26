-- CondoManager Database Schema

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'resident', 'provider');

-- Create enum for maintenance request status
CREATE TYPE public.request_status AS ENUM ('requested', 'under_review', 'approved', 'in_progress', 'completed', 'paid');

-- Create enum for estimate status
CREATE TYPE public.estimate_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for payment status
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'overdue');

-- Create enum for notification type
CREATE TYPE public.notification_type AS ENUM ('payment_reminder', 'maintenance_update', 'announcement', 'estimate_received', 'estimate_approved', 'general');

-- Create enum for maintenance category
CREATE TYPE public.maintenance_category AS ENUM ('plumbing', 'electrical', 'construction', 'general');

-- =============================================
-- PROFILES TABLE (linked to auth.users)
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- =============================================
-- USER_ROLES TABLE (separate for security)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- BUILDINGS TABLE
-- =============================================
CREATE TABLE public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- BUILDING_MEMBERS TABLE (who can access which building)
-- =============================================
CREATE TABLE public.building_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'resident',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (building_id, user_id)
);

ALTER TABLE public.building_members ENABLE ROW LEVEL SECURITY;

-- =============================================
-- UNITS TABLE (apartments within buildings)
-- =============================================
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  floor INTEGER,
  bedrooms INTEGER,
  bathrooms NUMERIC(3,1),
  area_sqft NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (building_id, unit_number)
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- =============================================
-- UNIT_RESIDENTS TABLE (who lives in which unit)
-- =============================================
CREATE TABLE public.unit_residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_owner BOOLEAN DEFAULT false,
  move_in_date DATE,
  move_out_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (unit_id, user_id)
);

ALTER TABLE public.unit_residents ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FEES TABLE (monthly fees for units)
-- =============================================
CREATE TABLE public.fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PAYMENTS TABLE (payment records)
-- =============================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_id UUID NOT NULL REFERENCES public.fees(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- MAINTENANCE_REQUESTS TABLE
-- =============================================
CREATE TABLE public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category maintenance_category NOT NULL DEFAULT 'general',
  status request_status NOT NULL DEFAULT 'requested',
  priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ESTIMATES TABLE (quotes from providers)
-- =============================================
CREATE TABLE public.estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  estimated_days INTEGER,
  status estimate_status NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ANNOUNCEMENTS TABLE
-- =============================================
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_urgent BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  resource_type TEXT,
  resource_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER FUNCTIONS (for RLS)
-- =============================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Check if user is admin of a building
CREATE OR REPLACE FUNCTION public.is_building_admin(_user_id UUID, _building_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.building_members
    WHERE user_id = _user_id
      AND building_id = _building_id
      AND role = 'admin'
  )
$$;

-- Check if user is member of a building
CREATE OR REPLACE FUNCTION public.is_building_member(_user_id UUID, _building_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.building_members
    WHERE user_id = _user_id
      AND building_id = _building_id
  )
$$;

-- Check if user is resident of a unit
CREATE OR REPLACE FUNCTION public.is_unit_resident(_user_id UUID, _unit_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.unit_residents
    WHERE user_id = _user_id
      AND unit_id = _unit_id
  )
$$;

-- Get building ID from unit
CREATE OR REPLACE FUNCTION public.get_building_from_unit(_unit_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT building_id FROM public.units WHERE id = _unit_id
$$;

-- =============================================
-- RLS POLICIES FOR USER_ROLES
-- =============================================
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES FOR BUILDINGS
-- =============================================
CREATE POLICY "Members can view their buildings"
  ON public.buildings FOR SELECT
  TO authenticated
  USING (public.is_building_member(auth.uid(), id));

CREATE POLICY "Admins can create buildings"
  ON public.buildings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Building admins can update buildings"
  ON public.buildings FOR UPDATE
  TO authenticated
  USING (public.is_building_admin(auth.uid(), id));

CREATE POLICY "Building admins can delete buildings"
  ON public.buildings FOR DELETE
  TO authenticated
  USING (public.is_building_admin(auth.uid(), id));

-- =============================================
-- RLS POLICIES FOR BUILDING_MEMBERS
-- =============================================
CREATE POLICY "Members can view building members"
  ON public.building_members FOR SELECT
  TO authenticated
  USING (public.is_building_member(auth.uid(), building_id));

CREATE POLICY "Building admins can manage members"
  ON public.building_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_building_admin(auth.uid(), building_id)
    AND user_id != auth.uid()
    AND invited_by = auth.uid()
  );

CREATE POLICY "Building admins can update members"
  ON public.building_members FOR UPDATE
  TO authenticated
  USING (public.is_building_admin(auth.uid(), building_id));

CREATE POLICY "Building admins can remove members"
  ON public.building_members FOR DELETE
  TO authenticated
  USING (public.is_building_admin(auth.uid(), building_id));

-- =============================================
-- RLS POLICIES FOR UNITS
-- =============================================
CREATE POLICY "Members can view units in their buildings"
  ON public.units FOR SELECT
  TO authenticated
  USING (public.is_building_member(auth.uid(), building_id));

CREATE POLICY "Building admins can manage units"
  ON public.units FOR ALL
  TO authenticated
  USING (public.is_building_admin(auth.uid(), building_id));

-- =============================================
-- RLS POLICIES FOR UNIT_RESIDENTS
-- =============================================
CREATE POLICY "Members can view unit residents in their buildings"
  ON public.unit_residents FOR SELECT
  TO authenticated
  USING (public.is_building_member(auth.uid(), public.get_building_from_unit(unit_id)));

CREATE POLICY "Building admins can manage unit residents"
  ON public.unit_residents FOR ALL
  TO authenticated
  USING (public.is_building_admin(auth.uid(), public.get_building_from_unit(unit_id)));

-- =============================================
-- RLS POLICIES FOR FEES
-- =============================================
CREATE POLICY "Members can view fees in their buildings"
  ON public.fees FOR SELECT
  TO authenticated
  USING (public.is_building_member(auth.uid(), building_id));

CREATE POLICY "Building admins can manage fees"
  ON public.fees FOR ALL
  TO authenticated
  USING (public.is_building_admin(auth.uid(), building_id));

-- =============================================
-- RLS POLICIES FOR PAYMENTS
-- =============================================
CREATE POLICY "Members can view payments in their buildings"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fees f
      WHERE f.id = fee_id
      AND public.is_building_member(auth.uid(), f.building_id)
    )
  );

CREATE POLICY "Residents and admins can create payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fees f
      WHERE f.id = fee_id
      AND public.is_building_member(auth.uid(), f.building_id)
    )
  );

-- =============================================
-- RLS POLICIES FOR MAINTENANCE_REQUESTS
-- =============================================
CREATE POLICY "Members can view maintenance requests in their buildings"
  ON public.maintenance_requests FOR SELECT
  TO authenticated
  USING (
    public.is_building_member(auth.uid(), public.get_building_from_unit(unit_id))
    OR assigned_to = auth.uid()
  );

CREATE POLICY "Residents can create maintenance requests"
  ON public.maintenance_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_unit_resident(auth.uid(), unit_id)
    AND requested_by = auth.uid()
  );

CREATE POLICY "Admins and providers can update maintenance requests"
  ON public.maintenance_requests FOR UPDATE
  TO authenticated
  USING (
    public.is_building_admin(auth.uid(), public.get_building_from_unit(unit_id))
    OR assigned_to = auth.uid()
  );

-- =============================================
-- RLS POLICIES FOR ESTIMATES
-- =============================================
CREATE POLICY "Relevant users can view estimates"
  ON public.estimates FOR SELECT
  TO authenticated
  USING (
    provider_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.maintenance_requests mr
      WHERE mr.id = maintenance_request_id
      AND (
        public.is_building_admin(auth.uid(), public.get_building_from_unit(mr.unit_id))
        OR mr.requested_by = auth.uid()
      )
    )
  );

CREATE POLICY "Providers can create estimates"
  ON public.estimates FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'provider')
    AND provider_id = auth.uid()
  );

CREATE POLICY "Providers can update own estimates"
  ON public.estimates FOR UPDATE
  TO authenticated
  USING (
    provider_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.maintenance_requests mr
      WHERE mr.id = maintenance_request_id
      AND public.is_building_admin(auth.uid(), public.get_building_from_unit(mr.unit_id))
    )
  );

-- =============================================
-- RLS POLICIES FOR ANNOUNCEMENTS
-- =============================================
CREATE POLICY "Members can view announcements in their buildings"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (public.is_building_member(auth.uid(), building_id));

CREATE POLICY "Building admins can manage announcements"
  ON public.announcements FOR ALL
  TO authenticated
  USING (public.is_building_admin(auth.uid(), building_id));

-- =============================================
-- RLS POLICIES FOR NOTIFICATIONS
-- =============================================
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_buildings_updated_at
  BEFORE UPDATE ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fees_updated_at
  BEFORE UPDATE ON public.fees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_requests_updated_at
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_estimates_updated_at
  BEFORE UPDATE ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TRIGGER TO CREATE PROFILE ON USER SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_building_members_user ON public.building_members(user_id);
CREATE INDEX idx_building_members_building ON public.building_members(building_id);
CREATE INDEX idx_units_building ON public.units(building_id);
CREATE INDEX idx_unit_residents_user ON public.unit_residents(user_id);
CREATE INDEX idx_unit_residents_unit ON public.unit_residents(unit_id);
CREATE INDEX idx_fees_building ON public.fees(building_id);
CREATE INDEX idx_fees_unit ON public.fees(unit_id);
CREATE INDEX idx_fees_status ON public.fees(status);
CREATE INDEX idx_payments_fee ON public.payments(fee_id);
CREATE INDEX idx_maintenance_requests_unit ON public.maintenance_requests(unit_id);
CREATE INDEX idx_maintenance_requests_status ON public.maintenance_requests(status);
CREATE INDEX idx_maintenance_requests_requested_by ON public.maintenance_requests(requested_by);
CREATE INDEX idx_estimates_request ON public.estimates(maintenance_request_id);
CREATE INDEX idx_estimates_provider ON public.estimates(provider_id);
CREATE INDEX idx_announcements_building ON public.announcements(building_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, is_read);