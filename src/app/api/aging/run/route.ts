import { NextResponse } from "next/server";
import { adminClient, isCronAuthorized } from "@/lib/aging/server";
import { scanAging } from "@/lib/aging/scan";
import { composeAgingMessage } from "@/lib/aging/compose";
import type { AgingLevel } from "@/lib/aging/types";

export const dynamic = "force-dynamic";

interface LevelResult {
  level: AgingLevel;
  groups: number;
  recorded: number;
  skipped: number;
  tickets: number;
}

/**
 * Digest harian. Dipanggil Vercel Cron (lihat vercel.json) — hasilnya
 * disimpan sebagai batch dan dibaca halaman "Digest Harian" di aplikasi.
 * Tidak ada pengiriman ke luar: ini pengingat internal.
 */
export async function POST(req: Request) {
  return run(req);
}

// Vercel Cron memanggil dengan GET.
export async function GET(req: Request) {
  return run(req);
}

async function run(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = adminClient();
  const now = new Date();
  const results: LevelResult[] = [];

  for (const level of ["warn", "escalate"] as AgingLevel[]) {
    let groups;
    try {
      groups = await scanAging(level, now);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Gagal scan", level },
        { status: 500 }
      );
    }

    const result: LevelResult = {
      level,
      groups: groups.length,
      recorded: 0,
      skipped: 0,
      tickets: 0,
    };

    for (const group of groups) {
      const message = composeAgingMessage(group, level);
      if (!message) continue;

      // batch_key unik = kunci idempotensi. Kalau cron kepicu dua kali
      // dalam sehari, insert kedua ditolak database dan grup ini dilewati
      // tanpa menyentuh cooldown.
      const { error: insertError } = await db.from("followup_batches").insert({
        batch_key: group.batch_key,
        level,
        branch_id: group.branch_id,
        branch_name: group.branch,
        ticket_count: group.ticket_count,
        ticket_ids: group.ticket_ids,
        message,
        channel: "app",
        sent_at: now.toISOString(),
      });

      if (insertError) {
        if (insertError.code === "23505") {
          result.skipped++;
          continue;
        }
        return NextResponse.json(
          { error: insertError.message, level, batch_key: group.batch_key },
          { status: 500 }
        );
      }

      const { error: cooldownError } = await db
        .from("service_tickets")
        .update({ last_aging_notified_at: now.toISOString() })
        .in("id", group.ticket_ids);
      if (cooldownError) {
        return NextResponse.json(
          { error: cooldownError.message, level },
          { status: 500 }
        );
      }

      const { error: logError } = await db.from("ticket_updates").insert(
        group.ticket_ids.map((id) => ({
          ticket_id: id,
          note: message,
          channel: "auto",
          created_by: null,
          created_by_name: "Sistem (digest harian)",
          created_at: now.toISOString(),
        }))
      );
      if (logError) {
        return NextResponse.json(
          { error: logError.message, level },
          { status: 500 }
        );
      }

      result.recorded++;
      result.tickets += group.ticket_count;
    }

    results.push(result);
  }

  return NextResponse.json({ ok: true, generated_at: now.toISOString(), results });
}
