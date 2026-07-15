import { supabase } from "@/lib/supabase";
import type { ProductCatalogEntryWithBrand } from "@/types";

export async function listProductCatalog(): Promise<
  ProductCatalogEntryWithBrand[]
> {
  const { data, error } = await supabase
    .from("product_catalog")
    .select("*, brand:brands(id, name, wa_number)")
    .order("nama_barang", { ascending: true });
  if (error) throw error;
  return data as unknown as ProductCatalogEntryWithBrand[];
}

/** Cari brand berdasarkan nama (case-insensitive); kalau belum ada, buat baru. */
async function resolveBrandIdByName(name: string): Promise<string> {
  const trimmed = name.trim();
  const { data: existing, error: findError } = await supabase
    .from("brands")
    .select("id, name")
    .ilike("name", trimmed)
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase
    .from("brands")
    .insert({ name: trimmed })
    .select("id")
    .single();
  if (createError) throw createError;
  return created.id;
}

export async function createProductCatalogEntry(input: {
  nama_barang: string;
  kode_barang?: string | null;
  brand_name: string;
  keterangan?: string | null;
}): Promise<ProductCatalogEntryWithBrand> {
  const brandId = await resolveBrandIdByName(input.brand_name);
  const { data, error } = await supabase
    .from("product_catalog")
    .insert({
      nama_barang: input.nama_barang.trim(),
      kode_barang: input.kode_barang?.trim() || null,
      brand_id: brandId,
      keterangan: input.keterangan?.trim() || null,
    })
    .select("*, brand:brands(id, name, wa_number)")
    .single();
  if (error) throw error;
  return data as unknown as ProductCatalogEntryWithBrand;
}

export async function updateProductCatalogEntry(
  id: string,
  patch: {
    nama_barang: string;
    kode_barang?: string | null;
    brand_name: string;
    keterangan?: string | null;
  }
): Promise<ProductCatalogEntryWithBrand> {
  const brandId = await resolveBrandIdByName(patch.brand_name);
  const { data, error } = await supabase
    .from("product_catalog")
    .update({
      nama_barang: patch.nama_barang.trim(),
      kode_barang: patch.kode_barang?.trim() || null,
      brand_id: brandId,
      keterangan: patch.keterangan?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*, brand:brands(id, name, wa_number)")
    .single();
  if (error) throw error;
  return data as unknown as ProductCatalogEntryWithBrand;
}

export async function deleteProductCatalogEntry(id: string): Promise<void> {
  const { error } = await supabase.from("product_catalog").delete().eq("id", id);
  if (error) throw error;
}
