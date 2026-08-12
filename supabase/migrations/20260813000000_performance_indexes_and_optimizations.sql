-- Performance Optimizations & Foreign Key Indexes per Supabase Postgres Best Practices

-- 1. Foreign Key Indexes for fast JOINs and cascades
CREATE INDEX IF NOT EXISTS idx_proposals_donor ON public.proposals(donor_id);
CREATE INDEX IF NOT EXISTS idx_proposal_versions_proposal ON public.proposal_versions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_lfa_rows_proposal ON public.lfa_rows(proposal_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_proposal ON public.budget_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_lfa_row ON public.budget_items(lfa_row_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_sbm ON public.budget_items(sbm_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_sbu ON public.budget_items(sbu_id);
CREATE INDEX IF NOT EXISTS idx_donor_matches_proposal ON public.donor_matches(proposal_id);
CREATE INDEX IF NOT EXISTS idx_donor_matches_donor ON public.donor_matches(donor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_author ON public.community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON public.community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_user ON public.community_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_login_histories_user ON public.login_histories(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_user ON public.ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_proposal ON public.ai_generations(proposal_id);

-- 2. Lookup Indexes for High-Frequency Filter Queries
CREATE INDEX IF NOT EXISTS idx_sbm_lookup ON public.sbm(year, region_code);
CREATE INDEX IF NOT EXISTS idx_sbu_lookup ON public.sbu(province_code, year);
CREATE INDEX IF NOT EXISTS idx_activities_category ON public.activities(category);
CREATE INDEX IF NOT EXISTS idx_help_articles_slug ON public.help_articles(slug);
CREATE INDEX IF NOT EXISTS idx_help_articles_sort ON public.help_articles(sort_order);

-- 3. RLS Performance Optimization - Evaluate auth.uid() once per query via (SELECT auth.uid())
ALTER POLICY "profiles_select_self_or_admin" ON public.profiles USING (id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'));
ALTER POLICY "profiles_update_self_or_admin" ON public.profiles USING (id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'));
ALTER POLICY "profiles_insert_self" ON public.profiles WITH CHECK (id = (SELECT auth.uid()));

ALTER POLICY "proposals_select" ON public.proposals USING (owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'));
ALTER POLICY "proposals_insert" ON public.proposals WITH CHECK (owner_id = (SELECT auth.uid()));
ALTER POLICY "proposals_update" ON public.proposals USING (owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'));
ALTER POLICY "proposals_delete" ON public.proposals USING (owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'));

ALTER POLICY "notif_own" ON public.notifications USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY "audit_insert" ON public.audit_logs WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY "audit_admin_read" ON public.audit_logs USING (public.has_role((SELECT auth.uid()),'admin'));

ALTER POLICY "login_hist_read" ON public.login_histories USING (user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'));
ALTER POLICY "login_hist_insert" ON public.login_histories WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY "ai_gen_read" ON public.ai_generations USING (user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'));
ALTER POLICY "ai_gen_insert" ON public.ai_generations WITH CHECK (user_id = (SELECT auth.uid()));
