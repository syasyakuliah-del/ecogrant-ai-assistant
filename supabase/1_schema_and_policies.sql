-- ============================================================================
-- PART 1: TABLES, FUNCTIONS & SECURITY POLICIES
-- Project: EcoGrant AI (scnouypfyimjuonbnnhj)
-- IMPORTANT: Run THIS file (Part 1) FIRST in Supabase SQL Editor!
-- ============================================================================

-- 1. ENUMS
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.proposal_status AS ENUM (
    'draft', 'sedang_disusun', 'siap_ditinjau', 'perlu_revisi', 'disetujui', 'selesai', 'diarsipkan'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. HELPER & SECURITY FUNCTIONS
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. CORE TABLES (Strict Dependency Order)

-- ROLES (Create first before user_roles & role_permissions)
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PERMISSIONS
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ROLE PERMISSIONS
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role_id, permission_id)
);

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  position TEXT,
  organization_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  status TEXT NOT NULL DEFAULT 'aktif',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- USER ROLES
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- FUNCTIONS USING TABLES
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    LEFT JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id AND (r.name = _role OR ur.role::text = _role)
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO authenticated, anon, public;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _perm_name TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = _user_id AND p.name = _perm_name
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_permission(UUID, TEXT) TO authenticated, anon, public;

-- MASTER DATA TABLES
CREATE TABLE IF NOT EXISTS public.donors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Lainnya',
  country TEXT,
  website TEXT,
  email TEXT,
  phone TEXT,
  funding_fields TEXT[] NOT NULL DEFAULT '{}',
  priorities TEXT[] NOT NULL DEFAULT '{}',
  requirements TEXT[] NOT NULL DEFAULT '{}',
  min_grant NUMERIC(18,2) NOT NULL DEFAULT 0,
  max_grant NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IDR',
  deadline DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.sbm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  code TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  unit TEXT NOT NULL,
  price NUMERIC(18,2) NOT NULL CHECK (price >= 0),
  region_code TEXT NOT NULL DEFAULT 'NASIONAL',
  regulation_source TEXT,
  effective_from DATE,
  effective_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (year, version, code, region_code)
);

CREATE TABLE IF NOT EXISTS public.sbu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  code TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  unit TEXT NOT NULL,
  price NUMERIC(18,2) NOT NULL CHECK (price >= 0),
  province_code TEXT NOT NULL,
  city_code TEXT NOT NULL DEFAULT 'SEMUA',
  source TEXT,
  effective_from DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (year, version, code, province_code, city_code)
);

CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'Umum',
  sub_category TEXT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  default_output TEXT,
  default_indicator TEXT,
  target_unit TEXT NOT NULL DEFAULT 'kegiatan',
  lfa_level TEXT NOT NULL DEFAULT 'activity',
  budget_category TEXT NOT NULL DEFAULT 'Operasional',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PROPOSALS & WIZARD TABLES
CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  donor_id UUID REFERENCES public.donors(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  organization_name TEXT,
  location TEXT,
  province TEXT,
  city TEXT,
  start_date DATE,
  end_date DATE,
  duration_months INT NOT NULL DEFAULT 0,
  grant_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (grant_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'IDR',
  category TEXT,
  idea_summary TEXT,
  pic_name TEXT,
  tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.11,
  status public.proposal_status NOT NULL DEFAULT 'draft',
  current_step INT NOT NULL DEFAULT 1,
  progress_percent INT NOT NULL DEFAULT 0,
  review_note TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  version_number INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION public.can_access_proposal(_pid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = _pid AND (p.owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'))
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_proposal(UUID) TO authenticated, anon, public;

CREATE TABLE IF NOT EXISTS public.proposal_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  change_summary TEXT NOT NULL DEFAULT '',
  snapshot JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.proposal_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, section_type)
);

CREATE TABLE IF NOT EXISTS public.lfa_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  row_type TEXT NOT NULL DEFAULT 'activity',
  goal TEXT,
  outcome TEXT,
  output TEXT,
  activity TEXT,
  indicator TEXT,
  baseline TEXT,
  target TEXT,
  means_of_verification TEXT,
  assumption TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  lfa_row_id UUID REFERENCES public.lfa_rows(id) ON DELETE SET NULL,
  code TEXT,
  category TEXT NOT NULL DEFAULT 'Operasional',
  activity_name TEXT,
  description TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'MANUAL',
  sbm_id UUID REFERENCES public.sbm(id) ON DELETE SET NULL,
  sbu_id UUID REFERENCES public.sbu(id) ON DELETE SET NULL,
  volume NUMERIC(14,2) NOT NULL DEFAULT 1 CHECK (volume >= 0),
  unit TEXT NOT NULL DEFAULT 'unit',
  frequency NUMERIC(14,2) NOT NULL DEFAULT 1 CHECK (frequency >= 0),
  unit_price NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  total NUMERIC(18,2) NOT NULL DEFAULT 0,
  validation_status TEXT NOT NULL DEFAULT 'belum_divalidasi',
  validation_message TEXT,
  override_reason TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.donor_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  donor_id UUID NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  reasons TEXT[] NOT NULL DEFAULT '{}',
  met_requirements TEXT[] NOT NULL DEFAULT '{}',
  unmet_requirements TEXT[] NOT NULL DEFAULT '{}',
  risks TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, donor_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT,
  action_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'Panduan',
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.login_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_agent TEXT,
  ip_address TEXT,
  status TEXT NOT NULL DEFAULT 'berhasil',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  generation_type TEXT NOT NULL DEFAULT 'narrative',
  model TEXT,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'sukses',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'Umum',
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'terbit',
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'tampil',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. NEW USER REGISTRATION TRIGGER (First Registered User = Admin)
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_exists BOOLEAN;
  v_admin_role_id UUID;
  v_user_role_id UUID;
  v_assigned_role_id UUID;
  v_assigned_role_name public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, organization_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    COALESCE(NEW.email,''),
    NEW.raw_user_meta_data->>'organization_name',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  PERFORM pg_advisory_xact_lock(hashtext('ecogrant_first_admin'));
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    LEFT JOIN public.roles r ON ur.role_id = r.id
    WHERE r.name = 'admin' OR ur.role::text = 'admin'
  ) INTO v_admin_exists;

  SELECT id INTO v_admin_role_id FROM public.roles WHERE name = 'admin';
  SELECT id INTO v_user_role_id FROM public.roles WHERE name = 'user';

  IF NOT v_admin_exists THEN
    v_assigned_role_id := v_admin_role_id;
    v_assigned_role_name := 'admin'::public.app_role;
  ELSE
    v_assigned_role_id := v_user_role_id;
    v_assigned_role_name := 'user'::public.app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role, role_id)
  VALUES (NEW.id, v_assigned_role_name, v_assigned_role_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. RLS GRANTS & POLICIES
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sbm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sbu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lfa_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_matches ENABLE ROW LEVEL SECURITY;

-- POLICIES
DROP POLICY IF EXISTS roles_read ON public.roles;
CREATE POLICY roles_read ON public.roles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS permissions_read ON public.permissions;
CREATE POLICY permissions_read ON public.permissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS role_permissions_read ON public.role_permissions;
CREATE POLICY role_permissions_read ON public.role_permissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS profiles_read ON public.profiles;
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS profiles_write ON public.profiles;
CREATE POLICY profiles_write ON public.profiles FOR ALL TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS user_roles_read ON public.user_roles;
CREATE POLICY user_roles_read ON public.user_roles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS user_roles_write ON public.user_roles;
CREATE POLICY user_roles_write ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS donors_read ON public.donors;
CREATE POLICY donors_read ON public.donors FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS sbm_read ON public.sbm;
CREATE POLICY sbm_read ON public.sbm FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS sbu_read ON public.sbu;
CREATE POLICY sbu_read ON public.sbu FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS activities_read ON public.activities;
CREATE POLICY activities_read ON public.activities FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS proposals_all ON public.proposals;
CREATE POLICY proposals_all ON public.proposals FOR ALL TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS versions_all ON public.proposal_versions;
CREATE POLICY versions_all ON public.proposal_versions FOR ALL TO authenticated USING (public.can_access_proposal(proposal_id));

DROP POLICY IF EXISTS sections_all ON public.proposal_sections;
CREATE POLICY sections_all ON public.proposal_sections FOR ALL TO authenticated USING (public.can_access_proposal(proposal_id));

DROP POLICY IF EXISTS lfa_all ON public.lfa_rows;
CREATE POLICY lfa_all ON public.lfa_rows FOR ALL TO authenticated USING (public.can_access_proposal(proposal_id));

DROP POLICY IF EXISTS budget_all ON public.budget_items;
CREATE POLICY budget_all ON public.budget_items FOR ALL TO authenticated USING (public.can_access_proposal(proposal_id));

DROP POLICY IF EXISTS matches_all ON public.donor_matches;
CREATE POLICY matches_all ON public.donor_matches FOR ALL TO authenticated USING (public.can_access_proposal(proposal_id));
