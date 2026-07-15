import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

export interface ParsedCatalogRow {
  nama_barang: string;
  kode_barang: string;
  merk: string;
  keterangan: string;
}

export interface CatalogImportResult {
  totalRows: number;
  created: number;
  updated: number;
  skipped: { nama_barang: string; reason: string }[];
  brandsCreated: string[];
}

type ColumnKey = keyof ParsedCatalogRow;

const HEADER_ALIASES: Record<string, ColumnKey> = {
  kode: "kode_barang",
  "kode barang": "kode_barang",
  "nama barang": "nama_barang",
  "nama unit": "nama_barang",
  merk: "merk",
  brand: "merk",
  keterangan: "keterangan",
};

export async function parseProductCatalogExcel(
  file: File
): Promise<ParsedCatalogRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
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
    if (Object.values(map).includes("nama_barang")) {
      headerRowIndex = i;
      columnMap = map;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(
      'Format Excel tidak dikenali — kolom "Nama Barang" tidak ditemukan.'
    );
  }

  const result: ParsedCatalogRow[] = [];
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => String(c).trim() === "")) continue;

    const parsed: ParsedCatalogRow = {
      nama_barang: "",
      kode_barang: "",
      merk: "",
      keterangan: "",
    };
    Object.entries(columnMap).forEach(([colIdx, key]) => {
      if (!key) return;
      parsed[key] = String(row[Number(colIdx)] ?? "").trim();
    });

    if (parsed.nama_barang) result.push(parsed);
  }

  return result;
}

async function resolveBrandIds(
  names: string[]
): Promise<{ map: Record<string, string>; created: string[] }> {
  const { data: existing, error } = await supabase
    .from("brands")
    .select("id, name");
  if (error) throw error;

  const map: Record<string, string> = {};
  (existing ?? []).forEach((b) => {
    map[b.name.trim().toLowerCase()] = b.id;
  });
  const created: string[] = [];

  for (const rawName of names) {
    const key = rawName.trim().toLowerCase();
    if (!key || map[key]) continue;

    const { data: inserted, error: insertError } = await supabase
      .from("brands")
      .insert({ name: rawName.trim() })
      .select("id, name")
      .single();
    if (insertError) throw insertError;

    map[key] = inserted.id;
    created.push(rawName.trim());
  }

  return { map, created };
}

export async function importProductCatalog(
  rows: ParsedCatalogRow[]
): Promise<CatalogImportResult> {
  const skipped: CatalogImportResult["skipped"] = [];

  const byName = new Map<string, ParsedCatalogRow>();
  rows.forEach((r) => byName.set(r.nama_barang.trim().toLowerCase(), r));
  const uniqueRows = Array.from(byName.values());

  if (uniqueRows.length === 0) {
    return { totalRows: rows.length, created: 0, updated: 0, skipped, brandsCreated: [] };
  }

  const merkNames = Array.from(
    new Set(uniqueRows.map((r) => r.merk.trim()).filter(Boolean))
  );
  const { map: brandMap, created: brandsCreated } = await resolveBrandIds(
    merkNames
  );

  const namaList = uniqueRows.map((r) => r.nama_barang.trim());
  const { data: existingEntries, error: existingError } = await supabase
    .from("product_catalog")
    .select("id, nama_barang")
    .in("nama_barang", namaList);
  if (existingError) throw existingError;
  const existingMap = new Map(
    (existingEntries ?? []).map((e) => [e.nama_barang.trim().toLowerCase(), e.id])
  );

  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: { id: string; patch: Record<string, unknown> }[] = [];

  for (const row of uniqueRows) {
    const namaBarang = row.nama_barang.trim();
    if (!row.merk.trim()) {
      skipped.push({ nama_barang: namaBarang, reason: "Merk kosong" });
      continue;
    }
    const brandId = brandMap[row.merk.trim().toLowerCase()];
    if (!brandId) {
      skipped.push({
        nama_barang: namaBarang,
        reason: `Merk "${row.merk}" tidak ditemukan`,
      });
      continue;
    }

    const fields = {
      kode_barang: row.kode_barang.trim() || null,
      brand_id: brandId,
      keterangan: row.keterangan.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const existingId = existingMap.get(namaBarang.toLowerCase());
    if (existingId) {
      toUpdate.push({ id: existingId, patch: fields });
    } else {
      toInsert.push({ ...fields, nama_barang: namaBarang });
    }
  }

  let created = 0;
  if (toInsert.length > 0) {
    const { error } = await supabase.from("product_catalog").insert(toInsert);
    if (error) throw error;
    created = toInsert.length;
  }

  let updated = 0;
  for (const item of toUpdate) {
    const { error } = await supabase
      .from("product_catalog")
      .update(item.patch)
      .eq("id", item.id);
    if (error) throw error;
    updated++;
  }

  return { totalRows: rows.length, created, updated, skipped, brandsCreated };
}
