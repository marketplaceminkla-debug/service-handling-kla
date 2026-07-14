import { supabase } from "@/lib/supabase";
import type { Branch } from "@/types";

export async function listBranches(): Promise<Branch[]> {
  const { data, error } = await supabase
    .from("branches")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data as Branch[];
}

export async function createBranch(input: {
  name: string;
  code: string;
  wa_number?: string | null;
}): Promise<Branch> {
  const { data, error } = await supabase
    .from("branches")
    .insert({
      name: input.name,
      code: input.code,
      wa_number: input.wa_number || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Branch;
}

export async function updateBranch(
  id: string,
  patch: Partial<Pick<Branch, "name" | "code" | "wa_number" | "is_active">>
): Promise<Branch> {
  const { data, error } = await supabase
    .from("branches")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Branch;
}
