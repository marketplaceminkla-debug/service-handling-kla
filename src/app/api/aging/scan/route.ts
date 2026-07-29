import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/aging/server";
import { scanAging } from "@/lib/aging/scan";
import type { AgingLevel, AgingScanResponse } from "@/lib/aging/types";

export const dynamic = "force-dynamic";

/** Endpoint baca-saja buat mengintip hasil scan tanpa mencatat apa pun —
 * digest hariannya sendiri dijalankan /api/aging/run lewat Vercel Cron. */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const level = (new URL(req.url).searchParams.get("level") ??
    "warn") as AgingLevel;
  if (level !== "warn" && level !== "escalate") {
    return NextResponse.json(
      { error: "level harus 'warn' atau 'escalate'" },
      { status: 400 }
    );
  }

  try {
    const groups = await scanAging(level);
    const response: AgingScanResponse = {
      generated_at: new Date().toISOString(),
      level,
      groups,
    };
    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal scan" },
      { status: 500 }
    );
  }
}
