import { supabase } from "@/lib/supabase";

export interface FollowUpBatch {
  id: string;
  batch_key: string;
  level: "warn" | "escalate";
  branch_id: string | null;
  branch_name: string | null;
  ticket_count: number;
  ticket_ids: string[];
  message: string;
  channel: string;
  sent_at: string | null;
  error: string | null;
  created_at: string;
}

export async function listDigestBatches(limit = 60): Promise<FollowUpBatch[]> {
  const { data, error } = await supabase
    .from("followup_batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as FollowUpBatch[];
}

/** Tanggal WIB dari sebuah timestamp — batch_key juga dibentuk pakai
 * tanggal WIB, jadi pengelompokan di UI ikut sama. */
export function wibDateKey(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}
