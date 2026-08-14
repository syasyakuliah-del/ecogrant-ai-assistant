
DROP POLICY IF EXISTS donors_read ON public.donors;
CREATE POLICY donors_read_admin ON public.donors
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.donors_public
WITH (security_barrier = true) AS
  SELECT id, name, category, country, website,
         funding_fields, priorities, requirements,
         min_grant, max_grant, currency, deadline,
         is_active, created_at, updated_at
  FROM public.donors
  WHERE deleted_at IS NULL;

REVOKE ALL ON public.donors_public FROM anon, authenticated;
GRANT SELECT ON public.donors_public TO authenticated;
GRANT ALL ON public.donors_public TO service_role;
