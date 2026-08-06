import { supabase } from "@/integrations/supabase/client";

export async function logAudit(params: {
  action: string;
  entityType?: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
}) {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("audit_logs").insert({
      user_id: data.user.id,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      old_values: (params.oldValues ?? null) as never,
      new_values: (params.newValues ?? null) as never,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch {
    // audit failures must never block the user flow
  }
}

export async function notify(params: {
  userId: string;
  type?: string;
  title: string;
  message?: string;
  actionUrl?: string;
}) {
  try {
    await supabase.from("notifications").insert({
      user_id: params.userId,
      type: params.type ?? "info",
      title: params.title,
      message: params.message ?? null,
      action_url: params.actionUrl ?? null,
    });
  } catch {
    // ignore
  }
}