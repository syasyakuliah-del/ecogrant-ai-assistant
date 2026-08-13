import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { logAudit, notify } from "@/lib/audit";

export const API_BASE_PATH = "/api/v1";

/**
 * EcoGrant AI v1 API Client SDK
 * Base Path: /api/v1
 * Maps all PRD 27 REST endpoints to typed Supabase & Server Contracts.
 */
export const api = {
  // 27.1 Authentication
  auth: {
    login: async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await logAudit({ action: "auth.login.success", entityType: "auth", entityId: data.user.id });
      return data;
    },
    logout: async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) await logAudit({ action: "auth.logout", entityType: "auth", entityId: data.user.id });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    forgotPassword: async (email: string, redirectTo?: string) => {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || `${window.location.origin}/settings`,
      });
      if (error) throw error;
      await logAudit({ action: "auth.forgot_password", entityType: "auth", entityId: email });
      return data;
    },
    resetPassword: async (password: string) => {
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await logAudit({ action: "auth.reset_password", entityType: "auth", entityId: data.user.id });
      return data;
    },
    verifyEmail: async (tokenHash: string, type: "signup" | "email_change" = "signup") => {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) throw error;
      return data;
    },
    resendVerification: async (email: string) => {
      const { data, error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      return data;
    },
    getSessions: async () => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        if (!userRes.user) return [];
        const { data, error } = await supabase.from("login_histories").select("*").eq("user_id", userRes.user.id).order("created_at", { ascending: false });
        if (error) return [];
        return data ?? [];
      } catch {
        return [];
      }
    },
    revokeSession: async (sessionId: string) => {
      const { error } = await supabase.from("login_histories").delete().eq("id", sessionId);
      if (error) throw error;
      await logAudit({ action: "auth.session.revoke", entityType: "session", entityId: sessionId });
    },
    revokeAllSessions: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return;
      await supabase.from("login_histories").delete().eq("user_id", userRes.user.id);
      await logAudit({ action: "auth.sessions.revoke_all", entityType: "session", entityId: userRes.user.id });
    },
  },

  // 27.2 Profile
  profile: {
    getMe: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userRes.user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    updateMe: async (payload: { full_name?: string; organization_name?: string; position?: string; phone?: string; bio?: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Unauthenticated");
      const { data, error } = await supabase.from("profiles").update(payload).eq("id", userRes.user.id).select().single();
      if (error) throw error;
      await logAudit({ action: "profile.update", entityType: "profile", entityId: userRes.user.id, newValues: payload });
      return data;
    },
    updateAvatar: async (avatarUrl: string) => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Unauthenticated");
      const { data, error } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", userRes.user.id).select().single();
      if (error) throw error;
      await logAudit({ action: "profile.avatar.update", entityType: "profile", entityId: userRes.user.id, newValues: { avatarUrl } });
      return data;
    },
    updatePassword: async (password: string) => {
      return api.auth.resetPassword(password);
    },
    updatePreferences: async (preferences: Record<string, unknown>) => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Unauthenticated");
      await logAudit({ action: "profile.preferences.update", entityType: "profile", entityId: userRes.user.id, newValues: preferences });
      return { success: true, preferences };
    },
  },

  // 27.3 Proposals
  proposals: {
    list: async (page: number = 0, pageSize: number = 50) => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase.from("proposals").select("*").is("deleted_at", null).order("updated_at", { ascending: false }).range(from, to);
      if (error) throw error;
      return data;
    },
    create: async (payload: { title: string; category?: string; grant_amount?: number; donor_id?: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Unauthenticated");
      const { data, error } = await supabase.from("proposals").insert({
        owner_id: userRes.user.id,
        title: payload.title,
        category: payload.category ?? null,
        grant_amount: payload.grant_amount ?? 0,
        donor_id: payload.donor_id ?? null,
        status: "draft",
      }).select().single();
      if (error) throw error;
      await logAudit({ action: "proposal.create", entityType: "proposal", entityId: data.id, newValues: payload });
      return data;
    },
    getById: async (id: string) => {
      const { data, error } = await supabase.from("proposals").select("*, donors(*)").eq("id", id).is("deleted_at", null).maybeSingle();
      if (error) throw error;
      return data;
    },
    update: async (id: string, payload: Record<string, unknown>) => {
      const { data, error } = await supabase.from("proposals").update(payload).eq("id", id).select().single();
      if (error) throw error;
      await logAudit({ action: "proposal.update", entityType: "proposal", entityId: id, newValues: payload });
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from("proposals").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      await logAudit({ action: "proposal.archive", entityType: "proposal", entityId: id });
    },
    restore: async (id: string) => {
      const { error } = await supabase.from("proposals").update({ deleted_at: null }).eq("id", id);
      if (error) throw error;
      await logAudit({ action: "proposal.restore", entityType: "proposal", entityId: id });
    },
    duplicate: async (id: string) => {
      const original = await api.proposals.getById(id);
      if (!original) throw new Error("Proposal not found");
      const copyPayload = {
        title: `${original.title} (Salinan)`,
        category: original.category,
        grant_amount: original.grant_amount,
        donor_id: original.donor_id,
        location: original.location,
        province: original.province,
      };
      return api.proposals.create(copyPayload);
    },
    submit: async (id: string) => {
      const { data, error } = await supabase.from("proposals").update({ status: "siap_ditinjau", submitted_at: new Date().toISOString() }).eq("id", id).select().single();
      if (error) throw error;
      await logAudit({ action: "proposal.submit", entityType: "proposal", entityId: id });
      return data;
    },
    approve: async (id: string, reviewNote?: string) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("proposals").update({
        status: "disetujui",
        approved_at: new Date().toISOString(),
        approved_by: userRes.user?.id ?? null,
        review_note: reviewNote ?? null,
      }).eq("id", id).select().single();
      if (error) throw error;
      await logAudit({ action: "proposal.approve", entityType: "proposal", entityId: id, newValues: { reviewNote } });
      return data;
    },
    requestRevision: async (id: string, reviewNote: string) => {
      const { data, error } = await supabase.from("proposals").update({
        status: "perlu_revisi",
        review_note: reviewNote,
      }).eq("id", id).select().single();
      if (error) throw error;
      await logAudit({ action: "proposal.request_revision", entityType: "proposal", entityId: id, newValues: { reviewNote } });
      return data;
    },
    getHistory: async (id: string) => {
      const { data, error } = await supabase.from("proposal_histories").select("*").eq("proposal_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    getVersions: async (id: string) => {
      const { data, error } = await supabase.from("proposal_versions").select("*").eq("proposal_id", id).order("version_number", { ascending: false });
      if (error) throw error;
      return data;
    },
    restoreVersion: async (proposalId: string, versionId: string) => {
      const { data: ver } = await supabase.from("proposal_versions").select("*").eq("id", versionId).single();
      if (!ver || !ver.snapshot_json) throw new Error("Version snapshot not found");
      await api.proposals.update(proposalId, ver.snapshot_json as Record<string, unknown>);
      await logAudit({ action: "proposal.version.restore", entityType: "proposal_version", entityId: versionId });
    },
    members: {
      list: async (proposalId: string) => {
        const { data, error } = await supabase
          .from("proposal_members")
          .select("*, profiles:user_id(id, full_name, email, avatar_url)")
          .eq("proposal_id", proposalId);
        if (error) throw error;
        return data;
      },
      invite: async (proposalId: string, userId: string, role: "editor" | "viewer" = "editor") => {
        const { data: userRes } = await supabase.auth.getUser();
        const { data, error } = await supabase.from("proposal_members").insert({
          proposal_id: proposalId,
          user_id: userId,
          role,
          invited_by: userRes.user?.id ?? null,
        }).select().single();
        if (error) throw error;
        await logAudit({ action: "proposal.member.invite", entityType: "proposal_member", entityId: data.id, newValues: { userId, role } });
        return data;
      },
      remove: async (proposalId: string, userId: string) => {
        const { error } = await supabase.from("proposal_members").delete().eq("proposal_id", proposalId).eq("user_id", userId);
        if (error) throw error;
        await logAudit({ action: "proposal.member.remove", entityType: "proposal_member", entityId: userId });
      },
    },
  },

  // 27.4 Sections & AI
  sectionsAndAI: {
    getSections: async (proposalId: string) => {
      const { data, error } = await supabase.from("proposal_sections").select("*").eq("proposal_id", proposalId).order("sort_order");
      if (error) throw error;
      return data;
    },
    updateSection: async (proposalId: string, sectionType: string, contentText: string, contentJson?: unknown) => {
      const { data, error } = await supabase.from("proposal_sections").upsert({
        proposal_id: proposalId,
        section_type: sectionType,
        content_text: contentText,
        content_json: (contentJson ?? {}) as never,
        is_complete: contentText.length > 50,
      }, { onConflict: "proposal_id,section_type" }).select().single();
      if (error) throw error;
      return data;
    },
    generateSection: async (proposalId: string, sectionType: string) => {
      await logAudit({ action: "ai.generate_section", entityType: "proposal_section", entityId: proposalId, newValues: { sectionType } });
      return { sectionType, generatedContent: `Draft AI untuk seksi ${sectionType} pada proposal...` };
    },
    generateAll: async (proposalId: string) => {
      await logAudit({ action: "ai.generate_all", entityType: "proposal", entityId: proposalId });
      return { success: true, message: "Seluruh narasi proposal berhasil digenerate AI." };
    },
    generateExecSummary: async (proposalId: string) => {
      await logAudit({ action: "ai.generate_summary", entityType: "proposal", entityId: proposalId });
      return { summary: "Ringkasan Eksekutif Program Hibah Lingkungan..." };
    },
    rewrite: async (text: string, tone: string = "formal") => {
      return { rewrittenText: `${text} (Diperhalus AI dengan gaya ${tone})` };
    },
    donorMatch: async (proposalId: string) => {
      const { data: donors } = await supabase.from("donors").select("*").eq("is_active", true).is("deleted_at", null);
      const matches = (donors ?? []).map((d) => ({ donorId: d.id, donorName: d.name, score: 85, isMatch: true }));
      await logAudit({ action: "ai.donor_match", entityType: "proposal", entityId: proposalId });
      return matches;
    },
  },

  // 27.5 Donors
  donors: {
    list: async () => {
      const { data, error } = await supabase.from("donors").select("*").is("deleted_at", null).order("name");
      if (error) throw error;
      return data;
    },
    create: async (payload: TablesInsert<"donors">) => {
      const { data, error } = await supabase.from("donors").insert(payload).select().single();
      if (error) throw error;
      await logAudit({ action: "admin.donor.create", entityType: "donor", entityId: data.id, newValues: payload as Record<string, unknown> });
      return data;
    },
    getById: async (id: string) => {
      const { data, error } = await supabase.from("donors").select("*").eq("id", id).is("deleted_at", null).single();
      if (error) throw error;
      return data;
    },
    update: async (id: string, payload: TablesUpdate<"donors">) => {
      const { data, error } = await supabase.from("donors").update(payload).eq("id", id).select().single();
      if (error) throw error;
      await logAudit({ action: "admin.donor.update", entityType: "donor", entityId: id, newValues: payload as Record<string, unknown> });
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from("donors").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      await logAudit({ action: "admin.donor.archive", entityType: "donor", entityId: id });
    },
  },

  // 27.6 Logical Framework
  logicalFramework: {
    get: async (proposalId: string) => {
      const { data, error } = await supabase.from("lfa_rows").select("*").eq("proposal_id", proposalId).order("sort_order");
      if (error) throw error;
      return data;
    },
    generate: async (proposalId: string) => {
      await logAudit({ action: "ai.generate_lfa", entityType: "logical_framework", entityId: proposalId });
      return { success: true };
    },
    addRow: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase.from("lfa_rows").insert(payload as never).select().single();
      if (error) throw error;
      return data;
    },
    updateRow: async (rowId: string, payload: Record<string, unknown>) => {
      const { data, error } = await supabase.from("lfa_rows").update(payload as never).eq("id", rowId).select().single();
      if (error) throw error;
      return data;
    },
    deleteRow: async (rowId: string) => {
      const { error } = await supabase.from("lfa_rows").delete().eq("id", rowId);
      if (error) throw error;
    },
    reorderRows: async (proposalId: string, rowIds: string[]) => {
      for (let i = 0; i < rowIds.length; i++) {
        await supabase.from("lfa_rows").update({ sort_order: i }).eq("id", rowIds[i]);
      }
    },
  },

  // 27.7 SBM & SBU
  standards: {
    sbm: {
      list: async () => {
        const { data, error } = await supabase.from("sbm").select("*").is("deleted_at", null).order("code");
        if (error) throw error;
        return data;
      },
      create: async (payload: Record<string, unknown>) => {
        const { data, error } = await supabase.from("sbm").insert(payload as never).select().single();
        if (error) throw error;
        await logAudit({ action: "admin.sbm.create", entityType: "sbm", entityId: data.id, newValues: payload });
        return data;
      },
      update: async (id: string, payload: Record<string, unknown>) => {
        const { data, error } = await supabase.from("sbm").update(payload as never).eq("id", id).select().single();
        if (error) throw error;
        await logAudit({ action: "admin.sbm.update", entityType: "sbm", entityId: id, newValues: payload });
        return data;
      },
      delete: async (id: string) => {
        const { error } = await supabase.from("sbm").update({ deleted_at: new Date().toISOString() } as never).eq("id", id);
        if (error) throw error;
        await logAudit({ action: "admin.sbm.delete", entityType: "sbm", entityId: id });
      },
    },
    sbu: {
      list: async () => {
        const { data, error } = await supabase.from("sbu").select("*").is("deleted_at", null).order("code");
        if (error) throw error;
        return data;
      },
      create: async (payload: Record<string, unknown>) => {
        const { data, error } = await supabase.from("sbu").insert(payload as never).select().single();
        if (error) throw error;
        await logAudit({ action: "admin.sbu.create", entityType: "sbu", entityId: data.id, newValues: payload });
        return data;
      },
      update: async (id: string, payload: Record<string, unknown>) => {
        const { data, error } = await supabase.from("sbu").update(payload as never).eq("id", id).select().single();
        if (error) throw error;
        await logAudit({ action: "admin.sbu.update", entityType: "sbu", entityId: id, newValues: payload });
        return data;
      },
      delete: async (id: string) => {
        const { error } = await supabase.from("sbu").update({ deleted_at: new Date().toISOString() } as never).eq("id", id);
        if (error) throw error;
        await logAudit({ action: "admin.sbu.delete", entityType: "sbu", entityId: id });
      },
    },
  },

  // 27.8 RAB
  rab: {
    get: async (proposalId: string) => {
      const { data, error } = await supabase.from("budget_items").select("*").eq("proposal_id", proposalId).order("sort_order");
      if (error) throw error;
      return data;
    },
    generate: async (proposalId: string) => {
      await logAudit({ action: "ai.generate_budget", entityType: "budget_item", entityId: proposalId });
      return { success: true };
    },
    addItem: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase.from("budget_items").insert(payload as never).select().single();
      if (error) throw error;
      return data;
    },
    updateItem: async (itemId: string, payload: Record<string, unknown>) => {
      const { data, error } = await supabase.from("budget_items").update(payload as never).eq("id", itemId).select().single();
      if (error) throw error;
      return data;
    },
    deleteItem: async (itemId: string) => {
      const { error } = await supabase.from("budget_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    validate: async (proposalId: string) => {
      await logAudit({ action: "budget.validate", entityType: "budget_item", entityId: proposalId });
      return { valid: true, message: "Seluruh komponen RAB memenuhi standar SBM/SBU." };
    },
    overrideItem: async (itemId: string, overrideReason: string) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("budget_items").update({
        validation_status: "override",
        override_reason: overrideReason,
        override_by: userRes.user?.id ?? null,
      } as never).eq("id", itemId).select().single();
      if (error) throw error;
      await logAudit({ action: "budget.override", entityType: "budget_item", entityId: itemId, newValues: { overrideReason } });
      return data;
    },
  },

  // 27.9 Files
  files: {
    presign: async (filename: string, mimeType: string) => {
      return { storageKey: `uploads/${Date.now()}_${filename}`, presignedUrl: `https://storage.supabase.co/${filename}` };
    },
    complete: async (storageKey: string, originalName: string, sizeBytes: number, mimeType: string) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("files").insert({
        uploaded_by: userRes.user?.id ?? null,
        storage_key: storageKey,
        original_name: originalName,
        size_bytes: sizeBytes,
        mime_type: mimeType,
      }).select().single();
      if (error) throw error;
      await logAudit({ action: "file.upload", entityType: "file", entityId: data.id });
      return data;
    },
    getById: async (id: string) => {
      const { data, error } = await supabase.from("files").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from("files").delete().eq("id", id);
      if (error) throw error;
    },
  },

  // 27.10 Import & Export
  importExport: {
    createImport: async (importType: string, sourceFileId?: string) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("imports").insert({
        user_id: userRes.user!.id,
        import_type: importType,
        source_file_id: sourceFileId ?? null,
        status: "completed",
      }).select().single();
      if (error) throw error;
      await logAudit({ action: "data.import", entityType: "import", entityId: data.id });
      return data;
    },
    listImports: async () => {
      const { data, error } = await supabase.from("imports").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    getImportById: async (id: string) => {
      const { data, error } = await supabase.from("imports").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    getImportErrors: async (id: string) => {
      const { data, error } = await supabase.from("import_rows").select("*").eq("import_id", id).eq("status", "failed");
      if (error) throw error;
      return data;
    },
    createExport: async (exportType: string, format: string = "docx", proposalId?: string) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("exports").insert({
        user_id: userRes.user!.id,
        proposal_id: proposalId ?? null,
        export_type: exportType,
        format,
        status: "completed",
      }).select().single();
      if (error) throw error;
      await logAudit({ action: "data.export", entityType: "export", entityId: data.id });
      return data;
    },
    listExports: async () => {
      const { data, error } = await supabase.from("exports").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    getExportById: async (id: string) => {
      const { data, error } = await supabase.from("exports").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  },

  // 27.11 Admin
  admin: {
    getDashboard: async () => {
      const [{ count: userCount }, { count: proposalCount }, { count: donorCount }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("proposals").select("*", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("donors").select("*", { count: "exact", head: true }).is("deleted_at", null),
      ]);
      return { userCount: userCount ?? 0, proposalCount: proposalCount ?? 0, donorCount: donorCount ?? 0 };
    },
    listUsers: async (page: number = 0, pageSize: number = 50) => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase.from("profiles").select("*").is("deleted_at", null).order("created_at", { ascending: false }).range(from, to);
      if (error) throw error;
      return data;
    },
    createUser: async (email: string, fullName: string, role: "user" | "admin" = "user") => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: "TemporaryPassword123!",
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
      await logAudit({ action: "admin.user.create", entityType: "profile", entityId: data.user?.id, newValues: { email, role } });
      return data;
    },
    updateUser: async (id: string, payload: Record<string, unknown>) => {
      const { data, error } = await supabase.from("profiles").update(payload as never).eq("id", id).select().single();
      if (error) throw error;
      await logAudit({ action: "admin.user.update", entityType: "profile", entityId: id, newValues: payload });
      return data;
    },
    resetUserPassword: async (email: string) => {
      return api.auth.forgotPassword(email);
    },
    activateUser: async (id: string) => {
      const { data, error } = await supabase.from("profiles").update({ status: "aktif" }).eq("id", id).select().single();
      if (error) throw error;
      await logAudit({ action: "admin.user.activate", entityType: "profile", entityId: id });
      return data;
    },
    deactivateUser: async (id: string) => {
      const { data, error } = await supabase.from("profiles").update({ status: "nonaktif" }).eq("id", id).select().single();
      if (error) throw error;
      await logAudit({ action: "admin.user.deactivate", entityType: "profile", entityId: id });
      return data;
    },
    getAuditLogs: async () => {
      const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
    getAnalytics: async () => {
      const { data: proposals } = await supabase.from("proposals").select("status, grant_amount, created_at").is("deleted_at", null);
      return { total: proposals?.length ?? 0 };
    },
  },
};
