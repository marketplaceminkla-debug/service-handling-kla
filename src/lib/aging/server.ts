import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Pemanggil endpoint aging adalah n8n, bukan browser — jadi otentikasinya
 * pakai shared secret di header, bukan session Supabase. Perbandingannya
 * panjang-konstan supaya gak bocor lewat timing.
 */
function secretMatches(provided: string | null, expected: string | undefined) {
  if (!expected || !provided || provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

export function isAuthorized(req: Request): boolean {
  return secretMatches(
    req.headers.get("x-internal-key"),
    process.env.INTERNAL_API_KEY
  );
}

/**
 * Vercel Cron memanggil route-nya dengan header
 * `Authorization: Bearer $CRON_SECRET`. Panggilan manual (buat uji coba)
 * tetap diterima lewat `x-internal-key`.
 */
export function isCronAuthorized(req: Request): boolean {
  const bearer = (req.headers.get("authorization") ?? "").replace(
    /^Bearer\s+/i,
    ""
  );
  return (
    secretMatches(bearer, process.env.CRON_SECRET) || isAuthorized(req)
  );
}

/** Service-role client: endpoint ini jalan tanpa user, jadi RLS per-cabang
 * gak bisa dipakai buat nyaring. */
export function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false } }
  );
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function daysBetween(from: string | null, now: Date): number {
  if (!from) return 0;
  const start = new Date(from).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.floor((now.getTime() - start) / MS_PER_DAY);
}

/** Kunci idempotensi harian: tanggal WIB + cabang + level. Kalau n8n kepicu
 * dua kali dalam satu hari, insert kedua ditolak unique constraint. */
export function buildBatchKey(
  now: Date,
  branchSlug: string | null,
  level: string
): string {
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const date = wib.toISOString().slice(0, 10);
  return `${date}:${branchSlug ?? "all"}:${level}`;
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "cabang"
  );
}
