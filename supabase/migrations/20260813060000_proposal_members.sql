-- ============================================================================
-- Migration: Proposal Collaboration & Member Invites
-- Timestamp: 20260813060000
-- ============================================================================

-- 1. Create proposal_members table
CREATE TABLE IF NOT EXISTS public.proposal_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor', -- 'editor' | 'viewer'
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_proposal_members_proposal ON public.proposal_members(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_members_user ON public.proposal_members(user_id);

-- 2. Update can_access_proposal function to include proposal_members
CREATE OR REPLACE FUNCTION public.can_access_proposal(_pid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = _pid AND (
      p.owner_id = (SELECT auth.uid()) 
      OR public.has_role((SELECT auth.uid()), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.proposal_members pm 
        WHERE pm.proposal_id = _pid AND pm.user_id = (SELECT auth.uid())
      )
    )
  );
$$;
GRANT EXECUTE ON FUNCTION public.can_access_proposal(UUID) TO authenticated, anon, public;

-- 3. Enable RLS on proposal_members
ALTER TABLE public.proposal_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view members of proposals they access" ON public.proposal_members;
  CREATE POLICY "Users can view members of proposals they access" ON public.proposal_members
    FOR SELECT TO authenticated
    USING (public.can_access_proposal(proposal_id));
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Proposal owners and admins can manage proposal members" ON public.proposal_members;
  CREATE POLICY "Proposal owners and admins can manage proposal members" ON public.proposal_members
    FOR ALL TO authenticated
    USING (
      public.has_role(auth.uid(), 'admin') OR 
      EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND p.owner_id = auth.uid())
    )
    WITH CHECK (
      public.has_role(auth.uid(), 'admin') OR 
      EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND p.owner_id = auth.uid())
    );
EXCEPTION WHEN undefined_object THEN NULL; END $$;
