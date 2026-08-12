-- 1. ROLES TABLE
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial roles
INSERT INTO public.roles (name, description) VALUES
  ('admin', 'Administrator dengan hak pengelolaan penuh sistem'),
  ('user', 'Pengguna operasional untuk membuat dan mengelola proposal')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- 2. PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed 21 required permissions (PRD 5.3)
INSERT INTO public.permissions (name, description, category) VALUES
  ('dashboard.user.view', 'Melihat dashboard user', 'Dashboard'),
  ('dashboard.admin.view', 'Melihat dashboard admin', 'Dashboard'),
  ('proposal.create', 'Membuat proposal baru', 'Proposal'),
  ('proposal.view.own', 'Melihat proposal milik sendiri atau workspace yang diikuti', 'Proposal'),
  ('proposal.view.all', 'Melihat seluruh proposal sistem', 'Proposal'),
  ('proposal.update.own', 'Mengedit proposal milik sendiri', 'Proposal'),
  ('proposal.update.all', 'Mengedit seluruh proposal sistem', 'Proposal'),
  ('proposal.delete.own', 'Menghapus proposal sendiri dengan soft delete', 'Proposal'),
  ('proposal.delete.all', 'Menghapus seluruh proposal sistem', 'Proposal'),
  ('proposal.approve', 'Mengubah status dan memberikan approval proposal', 'Proposal'),
  ('proposal.export', 'Mengekspor proposal (PDF, Word, Excel)', 'Proposal'),
  ('ai.generate', 'Menjalankan AI generator untuk proposal', 'AI'),
  ('donor.manage', 'Mengelola master data donor (CRUD)', 'Master Data'),
  ('sbm.manage', 'Mengelola master data SBM (CRUD)', 'Master Data'),
  ('sbu.manage', 'Mengelola master data SBU (CRUD)', 'Master Data'),
  ('activity.manage', 'Mengelola master data kegiatan (CRUD)', 'Master Data'),
  ('user.manage', 'Mengelola pengguna, hak akses, peran, dan reset password', 'User Management'),
  ('community.manage', 'Mengelola artikel community dan moderasi komentar', 'Community'),
  ('analytics.view', 'Melihat analytics dan mengekspor laporan platform', 'Analytics'),
  ('audit.view', 'Melihat seluruh Audit Log sistem', 'System'),
  ('settings.manage', 'Mengelola System Settings', 'System')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, category = EXCLUDED.category;

-- 3. ROLE PERMISSIONS LINKING TABLE
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role_id, permission_id)
);

-- Seed role permissions mapping
DO $$
DECLARE
  v_admin_role_id UUID;
  v_user_role_id UUID;
BEGIN
  SELECT id INTO v_admin_role_id FROM public.roles WHERE name = 'admin';
  SELECT id INTO v_user_role_id FROM public.roles WHERE name = 'user';

  -- Admin role gets all 21 permissions
  IF v_admin_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_admin_role_id, id FROM public.permissions
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- User role gets operational permissions
  IF v_user_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_user_role_id, id FROM public.permissions
    WHERE name IN (
      'dashboard.user.view',
      'proposal.create',
      'proposal.view.own',
      'proposal.update.own',
      'proposal.delete.own',
      'proposal.export',
      'ai.generate'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- 4. UPGRADE USER_ROLES TABLE
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE;

-- Sync existing user_roles to role_id based on name matching
UPDATE public.user_roles ur
SET role_id = r.id
FROM public.roles r
WHERE ur.role_id IS NULL AND (ur.role::text = r.name);

-- Fallback for any remaining unlinked user_roles
UPDATE public.user_roles ur
SET role_id = (SELECT id FROM public.roles WHERE name = 'user')
WHERE ur.role_id IS NULL;

-- 5. FUNCTION HAS_PERMISSION
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

-- 6. FUNCTION HAS_ROLE UPDATE
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role_name TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    LEFT JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id AND (r.name = _role_name OR ur.role::text = _role_name)
  );
$$;

-- 7. UPDATE NEW USER TRIGGER
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
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    COALESCE(NEW.email,''),
    NEW.raw_user_meta_data->>'organization_name',
    NEW.raw_user_meta_data->>'phone')
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
END; $$;

-- 8. RLS AND POLICIES FOR RBAC TABLES
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

-- SELECT policies (all authenticated users can read roles/permissions matrix)
DROP POLICY IF EXISTS roles_read ON public.roles;
CREATE POLICY roles_read ON public.roles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS permissions_read ON public.permissions;
CREATE POLICY permissions_read ON public.permissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS role_permissions_read ON public.role_permissions;
CREATE POLICY role_permissions_read ON public.role_permissions FOR SELECT TO authenticated USING (true);

-- WRITE policies (admin or user.manage permission required)
DROP POLICY IF EXISTS roles_write ON public.roles;
CREATE POLICY roles_write ON public.roles FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'user.manage') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_permission(auth.uid(), 'user.manage') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS permissions_write ON public.permissions;
CREATE POLICY permissions_write ON public.permissions FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'user.manage') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_permission(auth.uid(), 'user.manage') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS role_permissions_write ON public.role_permissions;
CREATE POLICY role_permissions_write ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'user.manage') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_permission(auth.uid(), 'user.manage') OR public.has_role(auth.uid(), 'admin'));

-- 9. INDEXES
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
