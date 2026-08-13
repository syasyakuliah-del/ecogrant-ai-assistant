-- ============================================================================
-- SELF-CONTAINED SETUP: CREATE TABLES, ADMIN ROLE & RLS POLICIES
-- Execute this SQL in Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. ENUMS & ROLES
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.roles (name, description)
VALUES 
  ('admin', 'Administrator dengan hak pengelolaan penuh sistem'),
  ('user', 'Pengguna operasional')
ON CONFLICT (name) DO NOTHING;

-- 2. USER ROLES
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 3. ASSIGN ADMIN ROLE TO syasyakuliah@gmail.com
DELETE FROM public.user_roles 
WHERE user_id IN (SELECT id FROM auth.users WHERE LOWER(email) = 'syasyakuliah@gmail.com');

INSERT INTO public.user_roles (user_id, role, role_id)
SELECT u.id, 'admin'::public.app_role, r.id
FROM auth.users u
JOIN public.roles r ON r.name = 'admin'
WHERE LOWER(u.email) = 'syasyakuliah@gmail.com';

-- 4. CREATE EXPORTS, IMPORTS, LOGIN_HISTORIES, AUDIT_LOGS & PROPOSAL_MEMBERS TABLES IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposal_id UUID,
  export_type TEXT NOT NULL DEFAULT 'proposal',
  format TEXT NOT NULL DEFAULT 'docx',
  status TEXT NOT NULL DEFAULT 'pending',
  file_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  import_type TEXT NOT NULL DEFAULT 'sbm',
  source_file_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.login_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_agent TEXT,
  ip_address TEXT,
  status TEXT NOT NULL DEFAULT 'berhasil',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.proposal_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, user_id)
);

-- 5. ENABLE RLS AND CREATE POLICIES
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exports_read ON public.exports;
CREATE POLICY exports_read ON public.exports FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS imports_read ON public.imports;
CREATE POLICY imports_read ON public.imports FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS login_histories_read ON public.login_histories;
CREATE POLICY login_histories_read ON public.login_histories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS audit_logs_read ON public.audit_logs;
CREATE POLICY audit_logs_read ON public.audit_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS proposal_members_read ON public.proposal_members;
CREATE POLICY proposal_members_read ON public.proposal_members FOR SELECT TO authenticated USING (true);
