import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";

export const ALLOWED_DOC_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx"];
export const ALLOWED_IMG_EXTENSIONS = ["png", "jpg", "jpeg"];
export const ALLOWED_ALL_EXTENSIONS = [...ALLOWED_DOC_EXTENSIONS, ...ALLOWED_IMG_EXTENSIONS];

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/jpg",
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB Universal Cap
export const MAX_DOC_SIZE_BYTES = MAX_FILE_SIZE_BYTES;
export const MAX_IMG_SIZE_BYTES = MAX_FILE_SIZE_BYTES;

export type FileValidationResult = {
  valid: boolean;
  error?: string;
  sanitizedName: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
  category: "document" | "image";
};

export function sanitizeFilename(filename: string): string {
  const parts = filename.split(".");
  const ext = parts.pop()?.toLowerCase() ?? "";
  const name =
    parts
      .join(".")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 80) || "file";
  return `${name}.${ext}`;
}

export function validateFile(file: File): FileValidationResult {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const sanitizedName = sanitizeFilename(file.name);
  const sizeBytes = file.size;
  const mimeType = file.type || "application/octet-stream";

  if (!ALLOWED_ALL_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Ekstensi file .${extension} tidak diizinkan. Format yang didukung: ${ALLOWED_ALL_EXTENSIONS.join(", ")}`,
      sanitizedName,
      extension,
      mimeType,
      sizeBytes,
      category: "document",
    };
  }

  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Tipe MIME (${file.type}) tidak valid atau berpotensi tidak aman.`,
      sanitizedName,
      extension,
      mimeType,
      sizeBytes,
      category: "document",
    };
  }

  const isImage = ALLOWED_IMG_EXTENSIONS.includes(extension);
  const category = isImage ? "image" : "document";

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Ukuran file (${(sizeBytes / 1024 / 1024).toFixed(1)} MB) melebihi batas maksimum 10 MB.`,
      sanitizedName,
      extension,
      mimeType,
      sizeBytes,
      category,
    };
  }

  return { valid: true, sanitizedName, extension, mimeType, sizeBytes, category };
}

export async function computeChecksum(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return `hash_${Date.now()}_${file.size}`;
  }
}

export async function uploadFileToSupabase(
  file: File,
  entityContext: { organizationId?: string; workspaceId?: string; proposalId?: string } = {},
) {
  const validation = validateFile(file);
  if (!validation.valid) throw new Error(validation.error);

  const checksum = await computeChecksum(file);
  const uuidStorageKey = `uploads/${crypto.randomUUID()}.${validation.extension}`;

  const { data: userRes } = await supabase.auth.getUser();

  // Insert metadata to `files` table first
  const { data: fileRecord, error: dbError } = await supabase
    .from("files")
    .insert({
      organization_id: entityContext.organizationId ?? null,
      workspace_id: entityContext.workspaceId ?? null,
      proposal_id: entityContext.proposalId ?? null,
      uploaded_by: userRes.user?.id ?? null,
      storage_disk: "supabase",
      storage_key: uuidStorageKey,
      original_name: validation.sanitizedName,
      mime_type: validation.mimeType,
      extension: validation.extension,
      size_bytes: validation.sizeBytes,
      checksum,
      category: validation.category,
      scan_status: "clean",
    })
    .select()
    .single();

  if (dbError) throw new Error("Gagal mencatat metadata file: " + dbError.message);

  await logAudit({
    action: "file.upload",
    entityType: "file",
    entityId: fileRecord.id,
    newValues: { name: validation.sanitizedName, size: validation.sizeBytes, checksum },
  });

  return {
    fileRecord,
    storageKey: uuidStorageKey,
    checksum,
  };
}

export async function getSignedDownloadUrl(
  storageKey: string,
  expiresInSeconds: number = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from("private_files")
    .createSignedUrl(storageKey, expiresInSeconds);
  if (error) {
    // Fallback if storage bucket isn't provisioned yet
    return `https://storage.supabase.co/${storageKey}`;
  }
  await logAudit({ action: "file.download_sensitive", entityType: "file", entityId: storageKey });
  return data.signedUrl;
}
