import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, notify } from "@/lib/audit";

export type ImportType = "sbm" | "sbu" | "donors" | "activities";

export type RowValidationResult = {
  rowNumber: number;
  data: Record<string, unknown>;
  isValid: boolean;
  errors: string[];
};

export type DryRunSummary = {
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  results: RowValidationResult[];
};

export function parseExcelFile(arrayBuffer: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
}

export function dryRunValidateImport(
  type: ImportType,
  rows: Record<string, unknown>[],
): DryRunSummary {
  const results: RowValidationResult[] = [];
  const seenKeys = new Set<string>();

  rows.forEach((r, idx) => {
    const rowNumber = idx + 2; // 1-based header is row 1
    const errors: string[] = [];

    if (type === "sbm") {
      const code = String(r["Kode"] || r["code"] || "")
        .trim()
        .toUpperCase();
      const year = Number(r["Tahun"] || r["year"] || 2026);
      const version = String(r["Versi"] || r["version"] || "1.0").trim();
      const region = String(r["Wilayah"] || r["region_code"] || "NASIONAL")
        .trim()
        .toUpperCase();
      const price = Number(r["Harga"] || r["price"] || 0);

      if (!code) errors.push("Kode SBM wajib diisi.");
      if (isNaN(year) || year < 2000 || year > 2100)
        errors.push(`Tahun (${r["Tahun"]}) tidak valid.`);
      if (isNaN(price) || price < 0) errors.push(`Harga (${price}) tidak boleh negatif.`);

      const key = `${year}-${version}-${code}-${region}`;
      if (seenKeys.has(key))
        errors.push(
          `Duplikasi kombinasi (Tahun ${year}, Versi ${version}, Kode ${code}, Wilayah ${region}) dalam file.`,
        );
      seenKeys.add(key);
    } else if (type === "sbu") {
      const code = String(r["Kode"] || r["code"] || "")
        .trim()
        .toUpperCase();
      const year = Number(r["Tahun"] || r["year"] || 2026);
      const version = String(r["Versi"] || r["version"] || "1.0").trim();
      const prov = String(r["Provinsi"] || r["province_code"] || "")
        .trim()
        .toUpperCase();
      const city = String(r["Kota"] || r["city_code"] || "SEMUA")
        .trim()
        .toUpperCase();
      const price = Number(r["Harga"] || r["price"] || 0);

      if (!code) errors.push("Kode SBU wajib diisi.");
      if (!prov) errors.push("Provinsi wajib diisi.");
      if (isNaN(price) || price < 0) errors.push(`Harga (${price}) tidak boleh negatif.`);

      const key = `${year}-${version}-${code}-${prov}-${city}`;
      if (seenKeys.has(key))
        errors.push(
          `Duplikasi kombinasi (Tahun ${year}, Versi ${version}, Kode ${code}, Provinsi ${prov}) dalam file.`,
        );
      seenKeys.add(key);
    } else if (type === "donors") {
      const name = String(r["Nama Donor"] || r["Nama"] || r["name"] || "").trim();
      const minGrant = Number(r["Nilai Min"] || r["min_grant"] || 0);
      const maxGrant = Number(r["Nilai Max"] || r["max_grant"] || 0);

      if (!name) errors.push("Nama lembaga donor wajib diisi.");
      if (minGrant < 0) errors.push("Nilai hibah minimum tidak boleh negatif.");
      if (maxGrant < 0) errors.push("Nilai hibah maksimum tidak boleh negatif.");
      if (maxGrant > 0 && minGrant > maxGrant)
        errors.push("Nilai hibah minimum melebihi maksimum.");
    } else if (type === "activities") {
      const name = String(r["Nama Kegiatan"] || r["Nama"] || r["name"] || "").trim();
      if (!name) errors.push("Nama kegiatan wajib diisi.");
    }

    results.push({
      rowNumber,
      data: r,
      isValid: errors.length === 0,
      errors,
    });
  });

  const validRowsCount = results.filter((r) => r.isValid).length;
  const invalidRowsCount = results.length - validRowsCount;

  return {
    totalRows: rows.length,
    validRowsCount,
    invalidRowsCount,
    results,
  };
}

export async function processConfirmedImport(type: ImportType, summary: DryRunSummary) {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) throw new Error("Unauthenticated");

  // 1. Create Import Record
  const { data: importRecord, error: impErr } = await supabase
    .from("imports")
    .insert({
      user_id: userRes.user.id,
      import_type: type,
      total_rows: summary.totalRows,
      success_rows: summary.validRowsCount,
      failed_rows: summary.invalidRowsCount,
      status: summary.invalidRowsCount === 0 ? "completed" : "completed_with_errors",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (impErr) throw new Error("Gagal membuat data impor: " + impErr.message);

  // 2. Log Invalid Rows to `import_rows`
  const invalidRowsToInsert = summary.results
    .filter((r) => !r.isValid)
    .map((r) => ({
      import_id: importRecord.id,
      row_number: r.rowNumber,
      data_json: r.data,
      status: "failed",
      error_message: r.errors.join("; "),
    }));

  if (invalidRowsToInsert.length > 0) {
    await supabase.from("import_rows").insert(invalidRowsToInsert);
  }

  // 3. Batch Insert Valid Rows
  const validRows = summary.results.filter((r) => r.isValid).map((r) => r.data);

  if (type === "sbm" && validRows.length > 0) {
    const toInsert = validRows.map((r) => ({
      year: Number(r["Tahun"] || r["year"] || 2026),
      version: String(r["Versi"] || r["version"] || "1.0").trim(),
      code: String(r["Kode"] || r["code"] || "")
        .trim()
        .toUpperCase(),
      category: String(r["Kategori"] || r["category"] || "Honorarium").trim(),
      description: String(r["Uraian"] || r["description"] || "").trim(),
      unit: String(r["Satuan"] || r["unit"] || "OJ").trim(),
      price: Number(r["Harga"] || r["price"] || 0),
      region_code: String(r["Wilayah"] || r["region_code"] || "NASIONAL")
        .trim()
        .toUpperCase(),
      regulation_source: r["Sumber Regulasi"] ? String(r["Sumber Regulasi"]) : null,
      is_active: true,
    }));
    await supabase.from("sbm").upsert(toInsert, { onConflict: "year,version,code,region_code" });
  } else if (type === "sbu" && validRows.length > 0) {
    const toInsert = validRows.map((r) => ({
      year: Number(r["Tahun"] || r["year"] || 2026),
      version: String(r["Versi"] || r["version"] || "1.0").trim(),
      code: String(r["Kode"] || r["code"] || "")
        .trim()
        .toUpperCase(),
      category: String(r["Kategori"] || r["category"] || "Akomodasi").trim(),
      description: String(r["Uraian"] || r["description"] || "").trim(),
      unit: String(r["Satuan"] || r["unit"] || "OH").trim(),
      price: Number(r["Harga"] || r["price"] || 0),
      province_code: String(r["Provinsi"] || r["province_code"] || "DKI JAKARTA")
        .trim()
        .toUpperCase(),
      city_code: String(r["Kota"] || r["city_code"] || "SEMUA")
        .trim()
        .toUpperCase(),
      source: r["Sumber"] ? String(r["Sumber"]) : null,
      is_active: true,
    }));
    await supabase
      .from("sbu")
      .upsert(toInsert, { onConflict: "year,version,code,province_code,city_code" });
  } else if (type === "donors" && validRows.length > 0) {
    const toInsert = validRows.map((r) => ({
      name: String(r["Nama Donor"] || r["Nama"] || r["name"] || "").trim(),
      category: String(r["Kategori"] || r["category"] || "Lainnya").trim(),
      country: String(r["Negara"] || r["country"] || "Indonesia").trim(),
      website: String(r["Website"] || r["website"] || "").trim() || null,
      email: String(r["Email"] || r["email"] || "").trim() || null,
      phone: String(r["Telepon"] || r["phone"] || "").trim() || null,
      min_grant: Number(r["Nilai Min"] || r["min_grant"] || 0),
      max_grant: Number(r["Nilai Max"] || r["max_grant"] || 0),
      currency: String(r["Mata Uang"] || r["currency"] || "IDR").trim(),
      deadline: r["Deadline"] ? String(r["Deadline"]) : null,
      is_active: true,
    }));
    await supabase.from("donors").insert(toInsert);
  } else if (type === "activities" && validRows.length > 0) {
    const toInsert = validRows.map((r) => ({
      category: String(r["Kategori"] || r["category"] || "Umum").trim(),
      sub_category: String(r["Sub Kategori"] || r["sub_category"] || "").trim() || null,
      name: String(r["Nama Kegiatan"] || r["Nama"] || r["name"] || "").trim(),
      description: String(r["Deskripsi"] || r["description"] || "").trim(),
      default_output: r["Default Output"] ? String(r["Default Output"]) : null,
      default_indicator: r["Default Indikator"] ? String(r["Default Indikator"]) : null,
      target_unit: String(r["Satuan"] || r["target_unit"] || "kegiatan").trim(),
      lfa_level: String(r["Level LFA"] || r["lfa_level"] || "activity").trim(),
      budget_category: String(r["Kategori RAB"] || r["budget_category"] || "Operasional").trim(),
      is_active: true,
    }));
    await supabase.from("activities").insert(toInsert);
  }

  // 4. Audit & Notify
  await logAudit({
    action: "data.import",
    entityType: "import",
    entityId: importRecord.id,
    newValues: { type, successRows: summary.validRowsCount, failedRows: summary.invalidRowsCount },
  });

  await notify({
    userId: userRes.user.id,
    type: summary.invalidRowsCount === 0 ? "import_success" : "import_failed",
    title: `Proses Impor ${type.toUpperCase()} Selesai`,
    message: `${summary.validRowsCount} baris berhasil diimpor, ${summary.invalidRowsCount} baris temuan error.`,
    actionUrl: `/admin/${type}`,
  });

  return importRecord;
}
