import { NextResponse } from "next/server";
import { adminClient, isAuthorized } from "@/lib/aging/server";

export const dynamic = "force-dynamic";

interface BatchBody {
  batch_key: string;
  level: "warn" | "escalate";
  branch?: string | null;
  branch_id?: string | null;
  ticket_ids: string[];
  message: string;
  status: "sent" | "failed";
  channel?: string;
  error?: string | null;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: BatchBody;
  try {
    body = (await req.json()) as BatchBody;
  } catch {
    return NextResponse.json({ error: "Body bukan JSON" }, { status: 400 });
  }

  const { batch_key, level, ticket_ids, message, status } = body;
  if (
    !batch_key ||
    (level !== "warn" && level !== "escalate") ||
    !Array.isArray(ticket_ids) ||
    typeof message !== "string" ||
    (status !== "sent" && status !== "failed")
  ) {
    return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
  }

  const db = adminClient();
  const sentAt = new Date().toISOString();

  // batch_key unik = kunci idempotensi. Insert duluan: kalau bentrok,
  // berhenti di sini dan jangan sentuh apa pun. n8n memperlakukan 409
  // sebagai "sudah dikirim hari ini, lewati".
  const { error: insertError } = await db.from("followup_batches").insert({
    batch_key,
    level,
    branch_id: body.branch_id ?? null,
    branch_name: body.branch ?? null,
    ticket_count: ticket_ids.length,
    ticket_ids,
    message,
    channel: body.channel ?? "telegram",
    sent_at: status === "sent" ? sentAt : null,
    error: status === "failed" ? body.error ?? "unknown error" : null,
  });

  if (insertError) {
    // 23505 = unique_violation
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "Batch sudah pernah dicatat", batch_key },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Batch gagal sengaja tidak menyentuh cooldown, supaya tiketnya dicoba
  // lagi besok.
  if (status !== "sent" || ticket_ids.length === 0) {
    return NextResponse.json({ ok: true, batch_key, logged: 0 });
  }

  const { error: cooldownError } = await db
    .from("service_tickets")
    .update({ last_aging_notified_at: sentAt })
    .in("id", ticket_ids);
  if (cooldownError) {
    return NextResponse.json({ error: cooldownError.message }, { status: 500 });
  }

  const { error: logError } = await db.from("ticket_updates").insert(
    ticket_ids.map((id) => ({
      ticket_id: id,
      note: message,
      channel: "auto",
      created_by: null,
      created_by_name: "Sistem (aging digest)",
      created_at: sentAt,
    }))
  );
  if (logError) {
    return NextResponse.json({ error: logError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    batch_key,
    logged: ticket_ids.length,
  });
}
