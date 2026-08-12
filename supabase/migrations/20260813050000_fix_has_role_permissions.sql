-- ============================================================================
-- Migration: Fix function permissions for has_role & has_permission
-- ============================================================================

-- 1. Ensure has_role(UUID, TEXT) has SECURITY DEFINER and EXECUTE grant
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

-- 2. Ensure has_role(UUID, public.app_role) has SECURITY DEFINER and EXECUTE grant
DO $$ BEGIN
  CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
  RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $body$
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND (role = _role OR role::text = _role::text)
    );
  $body$;
  GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, anon, public;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Ensure has_permission(UUID, TEXT) has SECURITY DEFINER and EXECUTE grant
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

-- 4. Ensure can_access_proposal(UUID) has SECURITY DEFINER and EXECUTE grant
CREATE OR REPLACE FUNCTION public.can_access_proposal(_pid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = _pid AND (p.owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'))
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_proposal(UUID) TO authenticated, anon, public;
