import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import type { TicketKategori, TicketStatus } from "@/types";

export interface ParsedTicketRow {
  no_service: string;
  kode_barang: string;
  serial_number: string;
  branch_name: string;
  status_raw: string;
  lama_hari: string;
  estimasi: string;
  posisi_unit: string;
  keterangan: string;
  tanggal_masuk: string;
}

export interface ImportResult {
  totalRows: number;
  created: number;
  updated: number;
  skipped: { no_service: string; reason: string }[];
  branchesCreated: string[];
}

type ColumnKey = keyof Omit<ParsedTicketRow, never>;

const HEADER_ALIASES: Record<string, ColumnKey> = {
  "no. service": "no_service",
  "no service": "no_service",
  "kode barang": "kode_barang",
  sn: "serial_number",
  "serial number": "serial_number",
  cabang: "branch_name",
  status: "status_raw",
  "lama di-service": "lama_hari",
  "lama di service": "lama_hari",
  est: "estimasi",
  estimasi: "estimasi",
  "posisi unit": "posisi_unit",
  keterangan: "keterangan",
  "tanggal masuk": "tanggal_masuk",
};

function excelCellToDateString(value: unknown): string {
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value ?? "").trim();
}

export async function parseExcelFile(file: File): Promise<ParsedTicketRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });

  let headerRowIndex = -1;
  let columnMap: Partial<Record<number, ColumnKey>> = {};

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const map: Partial<Record<number, ColumnKey>> = {};
    rows[i].forEach((cell, colIdx) => {
      const key = String(cell).trim().toLowerCase();
      if (HEADER_ALIASES[key]) map[colIdx] = HEADER_ALIASES[key];
    });
    if (Object.values(map).includes("no_service")) {
      headerRowIndex = i;
      columnMap = map;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(
      'Format Excel tidak dikenali — kolom "No. Service" tidak ditemukan.'
    );
  }

  const result: ParsedTicketRow[] = [];
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => String(c).trim() === "")) continue;

    const parsed: ParsedTicketRow = {
      no_service: "",
      kode_barang: "",
      serial_number: "",
      branch_name: "",
      status_raw: "",
      lama_hari: "",
      estimasi: "",
      posisi_unit: "",
      keterangan: "",
      tanggal_masuk: "",
    };
    Object.entries(columnMap).forEach(([colIdx, key]) => {
      if (!key) return;
      const cell = row[Number(colIdx)];
      parsed[key] =
        key === "tanggal_masuk"
          ? excelCellToDateString(cell)
          : String(cell ?? "").trim();
    });

    if (parsed.no_service) result.push(parsed);
  }

  return result;
}

function normalizeRequired(value: string): string {
  const v = value.trim();
  return v === "" || v === "-" ? "-" : v;
}

function normalizeOptional(value: string): string | null {
  const v = value.trim();
  return v === "" || v === "-" ? null : v;
}

/** Sistem internal export "Lama di-service" sebagai jumlah hari sejak SRV
 * dibuka — backdate created_at kita biar umur tiket tetap akurat walau
 * baru pertama kali diimpor ke sini. */
function createdAtFromLamaHari(raw: string): string | null {
  const days = parseInt(raw, 10);
  if (Number.isNaN(days) || days < 0) return null;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function mapStatus(raw: string): TicketStatus {
  const s = raw.toLowerCase();
  if (s.includes("selesai") || s.includes("done") || s.includes("completed"))
    return "selesai";
  if (s.includes("sparepart") || s.includes("spare part")) return "tunggu_sparepart";
  if (s.includes("baru") || s.includes("new")) return "baru";
  return "diproses";
}

function slugCode(name: string): string {
  const cleaned = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned.slice(0, 12) || "CAB";
}

async function resolveBrandMap(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("product_catalog")
    .select("nama_barang, brand_id")
    .not("brand_id", "is", null);
  if (error) throw error;

  const map = new Map<string, string>();
  (data ?? []).forEach((row) => {
    if (row.brand_id) map.set(row.nama_barang.trim().toLowerCase(), row.brand_id);
  });
  return map;
}

async function resolveBranchIds(
  names: string[]
): Promise<{ map: Record<string, string>; created: string[] }> {
  const { data: existing, error } = await supabase
    .from("branches")
    .select("id, name, code");
  if (error) throw error;

  const map: Record<string, string> = {};
  (existing ?? []).forEach((b) => {
    map[b.name.trim().toLowerCase()] = b.id;
  });
  const usedCodes = new Set((existing ?? []).map((b) => b.code));
  const created: string[] = [];

  for (const rawName of names) {
    const key = rawName.trim().toLowerCase();
    if (!key || map[key]) continue;

    let code = slugCode(rawName);
    let suffix = 0;
    while (usedCodes.has(code)) {
      suffix += 1;
      code = `${slugCode(rawName).slice(0, 10)}${suffix}`;
    }
    usedCodes.add(code);

    const { data: inserted, error: insertError } = await supabase
      .from("branches")
      .insert({ name: rawName.trim(), code })
      .select("id, name")
      .single();
    if (insertError) throw insertError;

    map[key] = inserted.id;
    created.push(rawName.trim());
  }

  return { map, created };
}

export async function importTickets(
  kategori: TicketKategori,
  rows: ParsedTicketRow[],
  reportedBy: { id: string | null; name: string | null }
): Promise<ImportResult> {
  const skipped: ImportResult["skipped"] = [];

  const byNoService = new Map<string, ParsedTicketRow>();
  rows.forEach((r) => byNoService.set(r.no_service.trim(), r));
  const uniqueRows = Array.from(byNoService.values());

  if (uniqueRows.length === 0) {
    return { totalRows: rows.length, created: 0, updated: 0, skipped, branchesCreated: [] };
  }

  const branchNames = Array.from(
    new Set(uniqueRows.map((r) => r.branch_name.trim()).filter(Boolean))
  );
  const { map: branchMap, created: branchesCreated } = await resolveBranchIds(
    branchNames
  );
  const brandMap = await resolveBrandMap();

  const noServiceList = uniqueRows.map((r) => r.no_service.trim());
  const { data: existingTickets, error: existingError } = await supabase
    .from("service_tickets")
    .select("id, no_service, brand_id")
    .in("no_service", noServiceList);
  if (existingError) throw existingError;
  const existingMap = new Map(
    (existingTickets ?? []).map((t) => [t.no_service, t.id])
  );
  const existingBrandMap = new Map(
    (existingTickets ?? []).map((t) => [t.id, t.brand_id])
  );

  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: { id: string; patch: Record<string, unknown> }[] = [];

  for (const row of uniqueRows) {
    if (!row.branch_name.trim()) {
      skipped.push({ no_service: row.no_service, reason: "Cabang kosong" });
      continue;
    }
    const branchId = branchMap[row.branch_name.trim().toLowerCase()];
    if (!branchId) {
      skipped.push({
        no_service: row.no_service,
        reason: `Cabang "${row.branch_name}" tidak ditemukan`,
      });
      continue;
    }

    const fields: Record<string, unknown> = {
      branch_id: branchId,
      kode_barang: normalizeRequired(row.kode_barang),
      serial_number: normalizeRequired(row.serial_number),
      status: mapStatus(row.status_raw),
      estimasi: normalizeOptional(row.estimasi),
      posisi_unit: normalizeOptional(row.posisi_unit),
      keterangan: normalizeOptional(row.keterangan),
      updated_at: new Date().toISOString(),
    };
    const createdAt = createdAtFromLamaHari(row.lama_hari);
    if (createdAt) fields.created_at = createdAt;
    if (row.tanggal_masuk) fields.tanggal_masuk = row.tanggal_masuk;

    const lookedUpBrandId =
      brandMap.get(row.kode_barang.trim().toLowerCase()) ?? null;

    const existingId = existingMap.get(row.no_service.trim());
    if (existingId) {
      if (!existingBrandMap.get(existingId) && lookedUpBrandId) {
        fields.brand_id = lookedUpBrandId;
      }
      toUpdate.push({ id: existingId, patch: fields });
    } else {
      toInsert.push({
        ...fields,
        brand_id: lookedUpBrandId,
        no_service: row.no_service.trim(),
        kategori,
        reported_by: reportedBy.id,
        reported_by_name: reportedBy.name,
      });
    }
  }

  let created = 0;
  if (toInsert.length > 0) {
    const { error } = await supabase.from("service_tickets").insert(toInsert);
    if (error) throw error;
    created = toInsert.length;
  }

  let updated = 0;
  for (const item of toUpdate) {
    const { error } = await supabase
      .from("service_tickets")
      .update(item.patch)
      .eq("id", item.id);
    if (error) throw error;
    updated++;
  }

  return { totalRows: rows.length, created, updated, skipped, branchesCreated };
}
