import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Ambil pesan yang bisa dibaca dari apa pun yang ke-throw.
 *
 * Supabase melempar PostgrestError — objek biasa, BUKAN instance Error —
 * jadi pengecekan `err instanceof Error` selalu meleset dan pesan asli
 * dari database ("violates check constraint ...") ketelan diganti teks
 * generik. Itu bikin kegagalan yang sebenarnya jelas jadi sulit dilacak.
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object") {
    const e = err as { message?: unknown; details?: unknown; hint?: unknown };
    const parts = [e.message, e.details, e.hint]
      .filter((p): p is string => typeof p === "string" && p.trim() !== "")
      .join(" — ");
    if (parts) return parts;
  }
  if (typeof err === "string" && err.trim()) return err;
  return fallback;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "2 jam lalu" / "3 hari lalu" — buat menandai kapan follow-up terakhir,
 * di mana jaraknya lebih berguna daripada tanggal persisnya. */
export function formatRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  const months = Math.floor(days / 30);
  return `${months} bulan lalu`;
}

export function formatDateOnly(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
