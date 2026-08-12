-- ============================================================================
-- EcoGrant AI - Consolidated Supabase Database Schema & Migrations
-- Generated for Supabase Project: scnouypfyimjuonbnnhj
-- Description: Complete schema, security functions, RLS policies, triggers, 
--              performance indexes, and master seed data.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ENUMS & EXTENSIONS
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.proposal_status AS ENUM (
    'draft',
    'sedang_disusun',
    'siap_ditinjau',
    'perlu_revisi',
    'disetujui',
    'selesai',
    'diarsipkan'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 2. HELPER & SECURITY FUNCTIONS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

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

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    LEFT JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id AND (r.name = _role OR ur.role::text = _role)
  );
GRANT EXECUTE ON FUNCTION public.has_permission(UUID, TEXT) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO authenticated, anon, public;

-- ----------------------------------------------------------------------------
-- 3. CORE TABLES
-- ----------------------------------------------------------------------------

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

-- ROLES
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

-- USER ROLES
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- DONORS
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

-- SBM (STANDAR BIAYA MASUKAN)
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

-- SBU (STANDAR BIAYA UMUM)
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

-- ACTIVITIES MASTER
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

-- PROPOSALS
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
  deleted_at TIMESTAMPTZ,
  CONSTRAINT proposals_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE OR REPLACE FUNCTION public.can_access_proposal(_pid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = _pid AND (p.owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'))
  );
$$;

-- PROPOSAL VERSIONS
CREATE TABLE IF NOT EXISTS public.proposal_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  change_summary TEXT NOT NULL DEFAULT '',
  snapshot JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PROPOSAL SECTIONS
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

-- LFA ROWS
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

-- BUDGET ITEMS
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
  subtotal NUMERIC(18,2) GENERATED ALWAYS AS (volume * frequency * unit_price) STORED,
  tax_amount NUMERIC(18,2) GENERATED ALWAYS AS (volume * frequency * unit_price * tax_rate) STORED,
  total NUMERIC(18,2) GENERATED ALWAYS AS (volume * frequency * unit_price * (1 + tax_rate)) STORED,
  validation_status TEXT NOT NULL DEFAULT 'belum_divalidasi',
  validation_message TEXT,
  override_reason TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- DONOR MATCHES
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

-- NOTIFICATIONS
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

-- AUDIT LOGS
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

-- HELP ARTICLES
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

-- LOGIN HISTORIES
CREATE TABLE IF NOT EXISTS public.login_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_agent TEXT,
  ip_address TEXT,
  status TEXT NOT NULL DEFAULT 'berhasil',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI GENERATIONS LOG
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

-- COMMUNITY POSTS
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

-- COMMUNITY COMMENTS
CREATE TABLE IF NOT EXISTS public.community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'tampil',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. NEW USER REGISTRATION TRIGGER (First Registered User = Admin)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  admin_exists BOOLEAN;
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
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO admin_exists;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN admin_exists THEN 'user'::app_role ELSE 'admin'::app_role END)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- UPDATED_AT TRIGGERS
DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_donors_updated ON public.donors;
CREATE TRIGGER trg_donors_updated BEFORE UPDATE ON public.donors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_sbm_updated ON public.sbm;
CREATE TRIGGER trg_sbm_updated BEFORE UPDATE ON public.sbm FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_sbu_updated ON public.sbu;
CREATE TRIGGER trg_sbu_updated BEFORE UPDATE ON public.sbu FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_proposals_updated ON public.proposals;
CREATE TRIGGER trg_proposals_updated BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_sections_updated ON public.proposal_sections;
CREATE TRIGGER trg_sections_updated BEFORE UPDATE ON public.proposal_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_lfa_updated ON public.lfa_rows;
CREATE TRIGGER trg_lfa_updated BEFORE UPDATE ON public.lfa_rows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_budget_updated ON public.budget_items;
CREATE TRIGGER trg_budget_updated BEFORE UPDATE ON public.budget_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_posts_updated ON public.community_posts;
CREATE TRIGGER trg_posts_updated BEFORE UPDATE ON public.community_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS activities_updated_at ON public.activities;
CREATE TRIGGER activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS help_articles_updated_at ON public.help_articles;
CREATE TRIGGER help_articles_updated_at BEFORE UPDATE ON public.help_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 5. FUNCTION SECURITY & EXECUTION PERMISSIONS
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.can_access_proposal(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY & PERMISSIONS
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_self_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'));

DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'));

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_self_or_admin" ON public.user_roles;
CREATE POLICY "user_roles_select_self_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'));

DROP POLICY IF EXISTS "user_roles_admin_insert" ON public.user_roles;
CREATE POLICY "user_roles_admin_insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS "user_roles_admin_update" ON public.user_roles;
CREATE POLICY "user_roles_admin_update" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin')) WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS "user_roles_admin_delete" ON public.user_roles;
CREATE POLICY "user_roles_admin_delete" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.donors TO authenticated;
GRANT ALL ON public.donors TO service_role;
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "donors_read" ON public.donors;
CREATE POLICY "donors_read" ON public.donors FOR SELECT TO authenticated
  USING (deleted_at IS NULL OR public.has_role((SELECT auth.uid()),'admin'));

DROP POLICY IF EXISTS "donors_admin_write" ON public.donors;
CREATE POLICY "donors_admin_write" ON public.donors FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()),'admin')) WITH CHECK (public.has_role((SELECT auth.uid()),'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sbm TO authenticated;
GRANT ALL ON public.sbm TO service_role;
ALTER TABLE public.sbm ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sbm_read" ON public.sbm;
CREATE POLICY "sbm_read" ON public.sbm FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sbm_admin_write" ON public.sbm;
CREATE POLICY "sbm_admin_write" ON public.sbm FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()),'admin')) WITH CHECK (public.has_role((SELECT auth.uid()),'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sbu TO authenticated;
GRANT ALL ON public.sbu TO service_role;
ALTER TABLE public.sbu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sbu_read" ON public.sbu;
CREATE POLICY "sbu_read" ON public.sbu FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sbu_admin_write" ON public.sbu;
CREATE POLICY "sbu_admin_write" ON public.sbu FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()),'admin')) WITH CHECK (public.has_role((SELECT auth.uid()),'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activities_read" ON public.activities;
CREATE POLICY "activities_read" ON public.activities FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "activities_admin_write" ON public.activities;
CREATE POLICY "activities_admin_write" ON public.activities FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()),'admin')) WITH CHECK (public.has_role((SELECT auth.uid()),'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposals_select" ON public.proposals;
CREATE POLICY "proposals_select" ON public.proposals FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'));

DROP POLICY IF EXISTS "proposals_insert" ON public.proposals;
CREATE POLICY "proposals_insert" ON public.proposals FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "proposals_update" ON public.proposals;
CREATE POLICY "proposals_update" ON public.proposals FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'));

DROP POLICY IF EXISTS "proposals_delete" ON public.proposals;
CREATE POLICY "proposals_delete" ON public.proposals FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'));

GRANT SELECT, INSERT ON public.proposal_versions TO authenticated;
GRANT ALL ON public.proposal_versions TO service_role;
ALTER TABLE public.proposal_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "versions_read" ON public.proposal_versions;
CREATE POLICY "versions_read" ON public.proposal_versions FOR SELECT TO authenticated
  USING (public.can_access_proposal(proposal_id));

DROP POLICY IF EXISTS "versions_insert" ON public.proposal_versions;
CREATE POLICY "versions_insert" ON public.proposal_versions FOR INSERT TO authenticated
  WITH CHECK (public.can_access_proposal(proposal_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_sections TO authenticated;
GRANT ALL ON public.proposal_sections TO service_role;
ALTER TABLE public.proposal_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sections_all" ON public.proposal_sections;
CREATE POLICY "sections_all" ON public.proposal_sections FOR ALL TO authenticated
  USING (public.can_access_proposal(proposal_id)) WITH CHECK (public.can_access_proposal(proposal_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lfa_rows TO authenticated;
GRANT ALL ON public.lfa_rows TO service_role;
ALTER TABLE public.lfa_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lfa_all" ON public.lfa_rows;
CREATE POLICY "lfa_all" ON public.lfa_rows FOR ALL TO authenticated
  USING (public.can_access_proposal(proposal_id)) WITH CHECK (public.can_access_proposal(proposal_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_items TO authenticated;
GRANT ALL ON public.budget_items TO service_role;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budget_all" ON public.budget_items;
CREATE POLICY "budget_all" ON public.budget_items FOR ALL TO authenticated
  USING (public.can_access_proposal(proposal_id)) WITH CHECK (public.can_access_proposal(proposal_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.donor_matches TO authenticated;
GRANT ALL ON public.donor_matches TO service_role;
ALTER TABLE public.donor_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matches_all" ON public.donor_matches;
CREATE POLICY "matches_all" ON public.donor_matches FOR ALL TO authenticated
  USING (public.can_access_proposal(proposal_id)) WITH CHECK (public.can_access_proposal(proposal_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_own" ON public.notifications;
CREATE POLICY "notif_own" ON public.notifications FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_insert" ON public.audit_logs;
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "audit_admin_read" ON public.audit_logs;
CREATE POLICY "audit_admin_read" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()),'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.help_articles TO authenticated;
GRANT ALL ON public.help_articles TO service_role;
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "help_read" ON public.help_articles;
CREATE POLICY "help_read" ON public.help_articles FOR SELECT TO authenticated
  USING (is_published OR public.has_role((SELECT auth.uid()),'admin'));

DROP POLICY IF EXISTS "help_admin_write" ON public.help_articles;
CREATE POLICY "help_admin_write" ON public.help_articles FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()),'admin')) WITH CHECK (public.has_role((SELECT auth.uid()),'admin'));

GRANT SELECT, INSERT ON public.login_histories TO authenticated;
GRANT ALL ON public.login_histories TO service_role;
ALTER TABLE public.login_histories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "login_hist_read" ON public.login_histories;
CREATE POLICY "login_hist_read" ON public.login_histories FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'));

DROP POLICY IF EXISTS "login_hist_insert" ON public.login_histories;
CREATE POLICY "login_hist_insert" ON public.login_histories FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT ON public.ai_generations TO authenticated;
GRANT ALL ON public.ai_generations TO service_role;
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_gen_read" ON public.ai_generations;
CREATE POLICY "ai_gen_read" ON public.ai_generations FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'));

DROP POLICY IF EXISTS "ai_gen_insert" ON public.ai_generations;
CREATE POLICY "ai_gen_insert" ON public.ai_generations FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_read" ON public.community_posts;
CREATE POLICY "posts_read" ON public.community_posts FOR SELECT TO authenticated
  USING (status = 'terbit' OR public.has_role((SELECT auth.uid()),'admin'));

DROP POLICY IF EXISTS "posts_admin_write" ON public.community_posts;
CREATE POLICY "posts_admin_write" ON public.community_posts FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()),'admin')) WITH CHECK (public.has_role((SELECT auth.uid()),'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_comments TO authenticated;
GRANT ALL ON public.community_comments TO service_role;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_read" ON public.community_comments;
CREATE POLICY "comments_read" ON public.community_comments FOR SELECT TO authenticated
  USING (status = 'tampil' OR user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'));

DROP POLICY IF EXISTS "comments_insert" ON public.community_comments;
CREATE POLICY "comments_insert" ON public.community_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "comments_own_update" ON public.community_comments;
CREATE POLICY "comments_own_update" ON public.community_comments FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'));

DROP POLICY IF EXISTS "comments_delete" ON public.community_comments;
CREATE POLICY "comments_delete" ON public.community_comments FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'));

-- ----------------------------------------------------------------------------
-- 7. PERFORMANCE & FOREIGN KEY INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_proposals_owner ON public.proposals(owner_id);
CREATE INDEX IF NOT EXISTS idx_proposals_donor ON public.proposals(donor_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_updated ON public.proposals(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_proposal_versions_proposal ON public.proposal_versions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_lfa_rows_proposal ON public.lfa_rows(proposal_id);

CREATE INDEX IF NOT EXISTS idx_budget_items_proposal ON public.budget_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_lfa_row ON public.budget_items(lfa_row_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_sbm ON public.budget_items(sbm_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_sbu ON public.budget_items(sbu_id);

CREATE INDEX IF NOT EXISTS idx_donor_matches_proposal ON public.donor_matches(proposal_id);
CREATE INDEX IF NOT EXISTS idx_donor_matches_donor ON public.donor_matches(donor_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_community_posts_author ON public.community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON public.community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_user ON public.community_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_login_histories_user ON public.login_histories(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_user ON public.ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_proposal ON public.ai_generations(proposal_id);

CREATE INDEX IF NOT EXISTS idx_sbm_lookup ON public.sbm(year, region_code);
CREATE INDEX IF NOT EXISTS idx_sbu_lookup ON public.sbu(province_code, year);
CREATE INDEX IF NOT EXISTS idx_activities_category ON public.activities(category);
CREATE INDEX IF NOT EXISTS idx_help_articles_slug ON public.help_articles(slug);
CREATE INDEX IF NOT EXISTS idx_help_articles_sort ON public.help_articles(sort_order);

-- ----------------------------------------------------------------------------
-- 8. MASTER SEED DATA
-- ----------------------------------------------------------------------------

-- DONORS SEED
INSERT INTO public.donors (name, category, country, website, email, phone, funding_fields, priorities, requirements, min_grant, max_grant, currency, deadline) VALUES
('Global Environment Facility Small Grants Programme','Multilateral','Amerika Serikat','https://sgp.undp.org','sgp.indonesia@undp.org','+62 21 3141308',
 ARRAY['Konservasi Keanekaragaman Hayati','Mitigasi Perubahan Iklim','Degradasi Lahan'],
 ARRAY['Organisasi berbasis masyarakat','Pelibatan masyarakat adat','Kesetaraan gender'],
 ARRAY['Akta pendirian organisasi','Laporan keuangan dua tahun terakhir','Surat dukungan pemerintah daerah','Logical Framework Matrix','Rencana Anggaran Biaya rinci'],
 200000000, 750000000,'IDR','2026-11-30'),
('Tropical Forest Conservation Action Kalimantan','Bilateral','Indonesia','https://tfcakalimantan.org','info@tfcakalimantan.org','+62 561 733123',
 ARRAY['Konservasi Hutan Tropis','Restorasi Ekosistem','Ekonomi Masyarakat Hutan'],
 ARRAY['Kalimantan','Perhutanan sosial','Pengelolaan kawasan konservasi'],
 ARRAY['Legalitas lembaga','Pengalaman program sejenis','Rencana keberlanjutan','Kerangka monitoring dan evaluasi'],
 150000000, 1500000000,'IDR','2026-09-30'),
('Ford Foundation Indonesia','Yayasan Filantropi','Amerika Serikat','https://www.fordfoundation.org','indonesia@fordfoundation.org','+62 21 2358 6900',
 ARRAY['Keadilan Sosial','Tata Kelola Sumber Daya Alam','Pemberdayaan Masyarakat Adat'],
 ARRAY['Advokasi kebijakan','Penguatan kelembagaan','Inklusi sosial'],
 ARRAY['Profil organisasi','Teori perubahan','Anggaran multi tahun','Audit keuangan'],
 500000000, 3000000000,'IDR','2026-12-15'),
('Kehati Foundation','Yayasan Nasional','Indonesia','https://kehati.or.id','info@kehati.or.id','+62 21 7183185',
 ARRAY['Keanekaragaman Hayati','Pertanian Berkelanjutan','Ekosistem Pesisir'],
 ARRAY['Konservasi berbasis masyarakat','Ekonomi hijau','Riset terapan'],
 ARRAY['NPWP lembaga','Rekening lembaga','Proposal teknis','RAB sesuai standar biaya'],
 50000000, 500000000,'IDR','2026-08-31'),
('Uni Eropa - Delegasi untuk Indonesia','Multilateral','Belgia','https://www.eeas.europa.eu','delegation-indonesia@eeas.europa.eu','+62 21 2554 6200',
 ARRAY['Perubahan Iklim','Kehutanan Lestari','Hak Asasi Manusia','Ekonomi Sirkular'],
 ARRAY['Kemitraan multipihak','Kepatuhan FLEGT','Transparansi anggaran'],
 ARRAY['Registrasi PADOR','Laporan audit independen','Co-financing minimal 10 persen','Logical Framework Matrix','Rencana kerja terperinci'],
 1000000000, 15000000000,'IDR','2026-10-15'),
('Program Pengelolaan Hutan Berkelanjutan KLHK','Pemerintah','Indonesia','https://www.menlhk.go.id','pengaduan@menlhk.go.id','+62 21 5730191',
 ARRAY['Perhutanan Sosial','Rehabilitasi Hutan dan Lahan','Pengendalian Kebakaran Hutan'],
 ARRAY['Kelompok Tani Hutan','Kesatuan Pengelolaan Hutan','Wilayah prioritas nasional'],
 ARRAY['Surat keputusan kelompok','Peta wilayah kelola','RAB mengacu SBM dan SBU','Surat pernyataan tidak konflik'],
 25000000, 300000000,'IDR','2026-07-31'),
('Packard Foundation - Marine Program','Yayasan Filantropi','Amerika Serikat','https://www.packard.org','info@packard.org','+1 650 917 7100',
 ARRAY['Konservasi Laut','Perikanan Berkelanjutan','Ekosistem Mangrove'],
 ARRAY['Kawasan konservasi perairan','Data ilmiah','Kemitraan nelayan'],
 ARRAY['Profil lembaga berbahasa Inggris','Teori perubahan','Indikator terukur'],
 700000000, 5000000000,'IDR','2026-11-01'),
('Dana Indonesia untuk Iklim dan Lingkungan (BPDLH)','Pemerintah','Indonesia','https://bpdlh.id','info@bpdlh.id','+62 21 3512300',
 ARRAY['Mitigasi dan Adaptasi Iklim','Energi Terbarukan','Restorasi Gambut'],
 ARRAY['Penurunan emisi terukur','Pemberdayaan ekonomi lokal','Kesiapan kelembagaan'],
 ARRAY['Legalitas lembaga','Rekening khusus program','RAB sesuai SBM','Sistem MRV emisi'],
 100000000, 2000000000,'IDR','2026-12-31')
ON CONFLICT DO NOTHING;

-- SBM SEED
INSERT INTO public.sbm (year, version, code, category, description, unit, price, region_code, regulation_source, effective_from, effective_until) VALUES
(2026,'1.0','SBM-001','Honorarium','Honorarium Narasumber Pejabat Eselon II','OJ',1000000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-002','Honorarium','Honorarium Narasumber Praktisi atau Ahli','OJ',900000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-003','Honorarium','Honorarium Moderator','OK',700000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-004','Honorarium','Honorarium Panitia Kegiatan','OK',400000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-005','Honorarium','Honorarium Fasilitator Pelatihan Masyarakat','OJ',600000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-010','Perjalanan Dinas','Uang Harian Perjalanan Dinas Dalam Provinsi','OH',380000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-011','Perjalanan Dinas','Uang Harian Perjalanan Dinas Luar Provinsi','OH',430000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-012','Perjalanan Dinas','Uang Representasi Perjalanan Dinas','OH',250000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-013','Perjalanan Dinas','Transport Lokal Dalam Kota','OK',150000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-020','Konsumsi','Konsumsi Rapat Makan Siang','OK',65000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-021','Konsumsi','Konsumsi Rapat Kudapan','OK',30000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-030','Sewa','Sewa Ruang Pertemuan Fullday','Paket',3500000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-031','Sewa','Sewa Kendaraan Roda Empat Harian','Unit/Hari',1000000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-032','Sewa','Sewa Perahu Motor Survei Lapangan','Unit/Hari',1200000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-040','Bahan','Alat Tulis Kantor Paket Kegiatan','Paket',750000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-041','Bahan','Penggandaan dan Penjilidan Dokumen','Eksemplar',75000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-042','Bahan','Bibit Tanaman Kehutanan Siap Tanam','Batang',12000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-043','Bahan','Pupuk Organik untuk Rehabilitasi Lahan','Kg',5000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-050','Jasa Profesional','Jasa Konsultan Individu Ahli Madya','OB',18000000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-051','Jasa Profesional','Jasa Enumerator Survei Lapangan','OH',300000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-052','Jasa Profesional','Jasa Audit Keuangan Program','Paket',35000000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-060','Publikasi','Produksi Video Dokumentasi Program','Paket',25000000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-061','Publikasi','Cetak Media Kampanye Poster','Lembar',15000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2025,'1.0','SBM-001','Honorarium','Honorarium Narasumber Pejabat Eselon II','OJ',900000,'NASIONAL','PMK Standar Biaya Masukan 2025','2025-01-01','2025-12-31'),
(2025,'1.0','SBM-010','Perjalanan Dinas','Uang Harian Perjalanan Dinas Dalam Provinsi','OH',360000,'NASIONAL','PMK Standar Biaya Masukan 2025','2025-01-01','2025-12-31')
ON CONFLICT (year, version, code, region_code) DO NOTHING;

-- SBU SEED
INSERT INTO public.sbu (year, version, code, category, description, unit, price, province_code, city_code, source, effective_from) VALUES
(2026,'1.0','SBU-100','Akomodasi','Penginapan Standar Pelaksana','OH',700000,'KALIMANTAN BARAT','KOTA PONTIANAK','Peraturan Gubernur Kalimantan Barat','2026-01-01'),
(2026,'1.0','SBU-101','Akomodasi','Penginapan Standar Pejabat','OH',1100000,'KALIMANTAN BARAT','KOTA PONTIANAK','Peraturan Gubernur Kalimantan Barat','2026-01-01'),
(2026,'1.0','SBU-102','Transportasi','Sewa Kendaraan Roda Empat','Unit/Hari',950000,'KALIMANTAN BARAT','SEMUA','Peraturan Gubernur Kalimantan Barat','2026-01-01'),
(2026,'1.0','SBU-103','Konsumsi','Paket Fullboard Peserta Kegiatan','OH',520000,'KALIMANTAN BARAT','SEMUA','Peraturan Gubernur Kalimantan Barat','2026-01-01'),
(2026,'1.0','SBU-110','Akomodasi','Penginapan Standar Pelaksana','OH',900000,'DKI JAKARTA','SEMUA','Peraturan Gubernur DKI Jakarta','2026-01-01'),
(2026,'1.0','SBU-111','Konsumsi','Paket Fullboard Peserta Kegiatan','OH',680000,'DKI JAKARTA','SEMUA','Peraturan Gubernur DKI Jakarta','2026-01-01'),
(2026,'1.0','SBU-112','Transportasi','Sewa Kendaraan Roda Empat','Unit/Hari',1200000,'DKI JAKARTA','SEMUA','Peraturan Gubernur DKI Jakarta','2026-01-01'),
(2026,'1.0','SBU-120','Akomodasi','Penginapan Standar Pelaksana','OH',650000,'SULAWESI SELATAN','KOTA MAKASSAR','Peraturan Gubernur Sulawesi Selatan','2026-01-01'),
(2026,'1.0','SBU-121','Konsumsi','Paket Fullboard Peserta Kegiatan','OH',480000,'SULAWESI SELATAN','SEMUA','Peraturan Gubernur Sulawesi Selatan','2026-01-01'),
(2026,'1.0','SBU-122','Transportasi','Sewa Perahu Motor','Unit/Hari',1100000,'SULAWESI SELATAN','SEMUA','Peraturan Gubernur Sulawesi Selatan','2026-01-01'),
(2026,'1.0','SBU-130','Akomodasi','Penginapan Standar Pelaksana','OH',620000,'PAPUA','SEMUA','Peraturan Gubernur Papua','2026-01-01'),
(2026,'1.0','SBU-131','Transportasi','Sewa Kendaraan Roda Empat','Unit/Hari',1500000,'PAPUA','SEMUA','Peraturan Gubernur Papua','2026-01-01'),
(2026,'1.0','SBU-140','Akomodasi','Penginapan Standar Pelaksana','OH',600000,'JAWA BARAT','SEMUA','Peraturan Gubernur Jawa Barat','2026-01-01'),
(2026,'1.0','SBU-141','Konsumsi','Paket Fullboard Peserta Kegiatan','OH',450000,'JAWA BARAT','SEMUA','Peraturan Gubernur Jawa Barat','2026-01-01'),
(2026,'1.0','SBU-150','Akomodasi','Penginapan Standar Pelaksana','OH',640000,'SUMATERA UTARA','SEMUA','Peraturan Gubernur Sumatera Utara','2026-01-01'),
(2026,'1.0','SBU-151','Konsumsi','Paket Fullboard Peserta Kegiatan','OH',470000,'SUMATERA UTARA','SEMUA','Peraturan Gubernur Sumatera Utara','2026-01-01')
ON CONFLICT (year, version, code, province_code, city_code) DO NOTHING;

-- ACTIVITIES SEED
INSERT INTO public.activities (category, sub_category, name, description, default_output, default_indicator, target_unit, lfa_level, budget_category) VALUES
('Rehabilitasi Hutan','Penanaman','Penanaman Pohon Multiguna','Kegiatan penanaman bibit pohon multiguna pada lahan kritis.','Lahan kritis terehabilitasi','Jumlah hektare lahan tertanam','hektare','output','Bahan'),
('Rehabilitasi Hutan','Pembibitan','Pembangunan Persemaian Desa','Pembangunan dan operasional persemaian bibit tingkat desa.','Persemaian desa beroperasi','Jumlah bibit siap tanam','bibit','output','Bahan'),
('Pemberdayaan Masyarakat','Pelatihan','Pelatihan Kelompok Tani Hutan','Peningkatan kapasitas kelompok tani hutan.','Kapasitas kelompok meningkat','Jumlah peserta terlatih','orang','activity','Honorarium'),
('Pemberdayaan Masyarakat','Pendampingan','Pendampingan Usaha Hasil Hutan Bukan Kayu','Pendampingan pengembangan usaha berbasis HHBK.','Usaha kelompok berkembang','Jumlah kelompok terdampingi','kelompok','activity','Perjalanan'),
('Konservasi','Patroli','Patroli Partisipatif Kawasan','Patroli pengamanan kawasan bersama masyarakat.','Kawasan terjaga','Jumlah patroli terlaksana','kegiatan','activity','Perjalanan'),
('Monitoring dan Evaluasi','Monitoring','Monitoring dan Evaluasi Program','Pemantauan capaian indikator program secara berkala.','Laporan monitoring tersusun','Jumlah laporan monitoring','laporan','activity','Operasional'),
('Diseminasi','Publikasi','Lokakarya dan Diseminasi Hasil','Penyebarluasan hasil program kepada pemangku kepentingan.','Hasil program tersebarluaskan','Jumlah peserta lokakarya','orang','activity','Operasional')
ON CONFLICT DO NOTHING;

-- HELP ARTICLES SEED
INSERT INTO public.help_articles (category, title, slug, excerpt, content, sort_order) VALUES
('Memulai','Panduan Memulai','panduan-memulai','Langkah pertama menggunakan EcoGrant AI.','1. Lengkapi profil dan nama organisasi pada menu Profil.\n2. Buka menu Proposal Saya lalu pilih Buat Proposal.\n3. Ikuti wizard sepuluh langkah dari informasi dasar hingga ekspor dokumen.\n4. Seluruh perubahan tersimpan otomatis.',1),
('Panduan','Panduan Wizard Proposal','panduan-wizard','Penjelasan sepuluh langkah penyusunan proposal.','Langkah 1 Informasi Proposal, Langkah 2 Penyusunan Narasi, Langkah 3 Executive Summary, Langkah 4 Pemilihan Donor, Langkah 5 Logical Framework Matrix, Langkah 6 Sinkronisasi SBM, Langkah 7 Sinkronisasi SBU, Langkah 8 Rencana Anggaran Biaya, Langkah 9 Review, Langkah 10 Export.',2),
('Panduan','Panduan Penggunaan AI','panduan-ai','Cara memakai bantuan AI secara bertanggung jawab.','AI menghasilkan draf narasi berdasarkan data proposal. Seluruh hasil wajib ditinjau dan disunting oleh pengguna sebelum diajukan. Semakin lengkap ringkasan ide, lokasi, kategori, dan donor, semakin relevan hasilnya.',3),
('Panduan','Panduan Logical Framework','panduan-lfa','Menyusun matriks kerangka logis.','Logical Framework Matrix memuat Goal, Outcome, Output, Activity, indikator, baseline, target, alat verifikasi, dan asumsi. Baris LFA dapat ditautkan ke item Rencana Anggaran Biaya.',4),
('Panduan','Panduan Standar Biaya Masukan','panduan-sbm','Memahami acuan SBM.','Standar Biaya Masukan adalah acuan harga satuan nasional. Item anggaran yang melebihi SBM ditandai tidak sesuai dan memerlukan alasan penyimpangan.',5),
('Panduan','Panduan Standar Biaya Umum','panduan-sbu','Memahami acuan SBU regional.','Standar Biaya Umum berlaku per provinsi dan kota. Pilih wilayah yang sesuai dengan lokasi pelaksanaan program agar validasi anggaran akurat.',6),
('Panduan','Panduan Rencana Anggaran Biaya','panduan-rab','Menyusun RAB yang valid.','Setiap item RAB memiliki volume, satuan, frekuensi, harga satuan, dan pajak. Total RAB divalidasi terhadap nilai hibah dan standar biaya yang berlaku.',7),
('FAQ','Pertanyaan yang Sering Diajukan','faq','Jawaban atas pertanyaan umum.','Apakah data saya aman? Ya, setiap proposal hanya dapat diakses pemiliknya dan administrator.\nApakah dokumen dapat diekspor? Ya, tersedia format PDF, DOCX, dan XLSX.\nApakah hasil AI dapat disunting? Ya, seluruh hasil dapat disunting bebas.',8),
('Dukungan','Kontak Dukungan','kontak-dukungan','Menghubungi tim dukungan.','Kirim surat elektronik ke dukungan@ecogrant.ai dengan menyertakan nama organisasi, judul proposal, dan tangkapan layar kendala yang dialami.',9)
ON CONFLICT (slug) DO NOTHING;

-- COMMUNITY POSTS SEED
INSERT INTO public.community_posts (category, title, slug, excerpt, content) VALUES
('Panduan Hibah','Sepuluh Kesalahan Umum dalam Penyusunan Proposal Hibah Lingkungan','kesalahan-umum-proposal-hibah',
 'Ringkasan kesalahan yang paling sering membuat proposal hibah ditolak pada tahap penyaringan awal.',
 'Banyak proposal ditolak bukan karena gagasannya lemah, melainkan karena penyajiannya tidak memenuhi standar donor. Kesalahan pertama adalah narasi latar belakang yang tidak didukung data. Kesalahan kedua adalah ketidakselarasan antara Logical Framework dan Rencana Anggaran Biaya. Kesalahan ketiga adalah indikator yang tidak terukur. Kesalahan keempat adalah anggaran yang melampaui standar biaya yang berlaku. Kesalahan kelima adalah tidak adanya rencana keberlanjutan setelah program berakhir. Perbaikan pada kelima aspek tersebut umumnya meningkatkan peluang lolos secara signifikan.'),
('Standar Biaya','Memahami Perbedaan Standar Biaya Masukan dan Standar Biaya Umum','perbedaan-sbm-dan-sbu',
 'Penjelasan praktis mengenai kapan menggunakan SBM dan kapan menggunakan SBU dalam penyusunan RAB.',
 'Standar Biaya Masukan ditetapkan pada tingkat nasional dan menjadi acuan batas tertinggi untuk komponen seperti honorarium, uang harian, dan jasa profesional. Standar Biaya Umum ditetapkan pada tingkat daerah dan menjadi acuan untuk komponen yang sangat dipengaruhi kondisi wilayah seperti akomodasi, transportasi lokal, dan paket kegiatan. Dalam penyusunan Rencana Anggaran Biaya, gunakan SBM sebagai acuan utama dan SBU sebagai acuan wilayah pelaksanaan. Setiap item yang melampaui standar wajib disertai justifikasi tertulis.'),
('Logical Framework','Menyusun Logical Framework Matrix yang Konsisten','menyusun-logical-framework-matrix',
 'Langkah menyusun hierarki Goal, Outcome, Output, dan Activity beserta indikator yang terukur.',
 'Logical Framework Matrix menuntut hierarki yang jelas. Goal menggambarkan dampak jangka panjang. Outcome menggambarkan perubahan perilaku atau kondisi pada akhir program. Output menggambarkan produk yang dihasilkan. Activity menggambarkan pekerjaan yang dilaksanakan. Setiap tingkatan wajib memiliki indikator, baseline, target, dan alat verifikasi. Asumsi dicantumkan untuk menjelaskan kondisi eksternal yang harus terpenuhi. Konsistensi antara Logical Framework, jadwal kegiatan, dan anggaran adalah kunci penilaian donor.'),
('Donor','Strategi Memilih Lembaga Donor yang Tepat','strategi-memilih-lembaga-donor',
 'Kriteria kunci untuk menilai kecocokan antara program organisasi dan prioritas pendanaan donor.',
 'Kecocokan donor ditentukan oleh kesesuaian tema, wilayah kerja, rentang nilai hibah, dan kesiapan administrasi. Pelajari prioritas pendanaan dan riwayat program yang pernah dibiayai. Pastikan nilai hibah yang diajukan berada dalam rentang yang ditetapkan. Perhatikan tenggat pengajuan dan persyaratan dokumen legal. Organisasi yang belum memiliki laporan audit sebaiknya memulai dari donor nasional dengan persyaratan yang lebih ringan sebelum mengajukan ke donor multilateral.')
ON CONFLICT (slug) DO NOTHING;
