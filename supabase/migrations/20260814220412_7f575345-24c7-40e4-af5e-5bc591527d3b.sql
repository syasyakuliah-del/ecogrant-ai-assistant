
DROP POLICY IF EXISTS donors_read_admin ON public.donors;
CREATE POLICY donors_read ON public.donors
  FOR SELECT TO authenticated
  USING ((deleted_at IS NULL) OR public.has_role(auth.uid(), 'admin'::app_role));

REVOKE SELECT ON public.donors FROM authenticated;
GRANT SELECT (id, name, category, country, website, funding_fields, priorities,
              requirements, min_grant, max_grant, currency, deadline, is_active,
              created_at, updated_at, deleted_at) ON public.donors TO authenticated;

ALTER VIEW public.donors_public SET (security_invoker = true);

CREATE OR REPLACE FUNCTION public.admin_donor_contacts()
RETURNS TABLE (id uuid, email text, phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.email, d.phone
  FROM public.donors d
  WHERE public.has_role(auth.uid(), 'admin'::app_role);
$$;

REVOKE ALL ON FUNCTION public.admin_donor_contacts() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_donor_contacts() TO authenticated;
