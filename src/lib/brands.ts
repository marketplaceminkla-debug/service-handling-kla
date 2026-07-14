import { supabase } from "@/lib/supabase";
import type { Brand } from "@/types";

export async function listBrands(): Promise<Brand[]> {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data as Brand[];
}

export async function createBrand(input: {
  name: string;
  wa_number?: string | null;
}): Promise<Brand> {
  const { data, error } = await supabase
    .from("brands")
    .insert({ name: input.name, wa_number: input.wa_number || null })
    .select("*")
    .single();
  if (error) throw error;
  return data as Brand;
}

export async function updateBrand(
  id: string,
  patch: Partial<Pick<Brand, "name" | "wa_number" | "is_active">>
): Promise<Brand> {
  const { data, error } = await supabase
    .from("brands")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Brand;
}
