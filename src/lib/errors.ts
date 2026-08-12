import { logAudit } from "@/lib/audit";

export type ErrorCategory =
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "FORBIDDEN_ERROR"
  | "NOT_FOUND"
  | "CONFLICT_ERROR"
  | "RATE_LIMIT_EXCEEDED"
  | "UPLOAD_ERROR"
  | "IMPORT_ERROR"
  | "EXPORT_ERROR"
  | "AI_PROVIDER_ERROR"
  | "DATABASE_ERROR"
  | "NETWORK_ERROR";

export class AppError extends Error {
  public readonly code: ErrorCategory;
  public readonly requestId: string;
  public readonly recoveryAction?: string;
  public readonly statusCode: number;

  constructor(
    code: ErrorCategory,
    message: string,
    recoveryAction?: string,
    statusCode: number = 400
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.recoveryAction = recoveryAction;
    this.statusCode = statusCode;
  }
}

export function handleAppError(error: unknown): {
  code: ErrorCategory;
  message: string;
  requestId: string;
  recoveryAction: string;
} {
  let code: ErrorCategory = "DATABASE_ERROR";
  let message = "Terjadi kesalahan internal pada sistem. Silakan coba beberapa saat lagi.";
  let recoveryAction = "Muat ulang halaman atau hubungi tim dukungan jika masalah berlanjut.";
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      requestId: error.requestId,
      recoveryAction: error.recoveryAction ?? recoveryAction,
    };
  }

  const raw = String(error ?? "");

  if (raw.includes("JWT") || raw.includes("unauthenticated") || raw.includes("session")) {
    code = "AUTH_ERROR";
    message = "Sesi masuk Anda telah berakhir. Silakan masuk kembali ke akun Anda.";
    recoveryAction = "Silakan login kembali melalui halaman masuk.";
  } else if (raw.includes("403") || raw.includes("forbidden") || raw.includes("permission")) {
    code = "FORBIDDEN_ERROR";
    message = "Anda tidak memiliki hak akses untuk melakukan tindakan ini.";
    recoveryAction = "Hubungi administrator untuk meminta izin akses tambahan.";
  } else if (raw.includes("404") || raw.includes("not found")) {
    code = "NOT_FOUND";
    message = "Data atau halaman yang Anda cari tidak ditemukan.";
    recoveryAction = "Periksa kembali URL atau kembali ke halaman utama.";
  } else if (raw.includes("429") || raw.includes("rate limit")) {
    code = "RATE_LIMIT_EXCEEDED";
    message = "Terlalu banyak permintaan dilakukan dalam waktu singkat.";
    recoveryAction = "Tunggu sekitar 1 menit sebelum mencoba kembali.";
  } else if (raw.includes("network") || raw.includes("Failed to fetch")) {
    code = "NETWORK_ERROR";
    message = "Koneksi jaringan terputus atau server tidak dapat dijangkau.";
    recoveryAction = "Periksa koneksi internet Anda lalu coba muat ulang.";
  }

  // Log error out-of-band for system audit without leaking sensitive details to UI
  void logAudit({
    action: "system.error",
    entityType: "error",
    entityId: requestId,
    newValues: { code, message: raw.slice(0, 300) },
  });

  return { code, message, requestId, recoveryAction };
}
