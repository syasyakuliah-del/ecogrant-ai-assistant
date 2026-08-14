
REVOKE ALL ON FUNCTION public.admin_donor_contacts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_donor_contacts() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_donor_contacts() TO authenticated;
