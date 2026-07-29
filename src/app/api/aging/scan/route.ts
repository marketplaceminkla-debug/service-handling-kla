import { NextResponse } from "next/server";
import {
  adminClient,
  buildBatchKey,
  daysBetween,
  isAuthorized,
  slugify,
} from "@/lib/aging/server";
import { STATUS_LABEL } from "@/types";
import type { TicketStatus } from "@/types";
import type {
  AgingGroup,
  AgingLevel,
  AgingScanResponse,
  AgingTicket,
} from "@/lib/aging/types";

export const dynamic = "force-dynamic";

interface AgingRuleRow {
  status: TicketStatus;
  basis: "intake" | "status";
  warn_days: number;
  escalate_days: number;
  cooldown_days: number;
  active: boolean;
}

interface TicketRow {
  id: string;
  no_service: string;
  kode_barang: string;
  serial_number: string;
  status: TicketStatus;
  estimasi: string | null;
  reported_by_name: string | null;
  tanggal_masuk: string | null;
  created_at: string;
  status_changed_at: string | null;
  last_aging_notified_at: string | null;
  branch_id: string;
  branch: {
    id: string;
    name: string;
    code: string;
    telegram_chat_id: string | null;
  } | null;
}

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

  const db = adminClient();
  const now = new Date();

  const { data: rules, error: rulesError } = await db
    .from("aging_rules")
    .select("*")
    .eq("active", true);
  if (rulesError) {
    return NextResponse.json({ error: rulesError.message }, { status: 500 });
  }
  const ruleByStatus = new Map<TicketStatus, AgingRuleRow>(
    (rules ?? []).map((r) => [r.status as TicketStatus, r as AgingRuleRow])
  );

  const { data: tickets, error: ticketsError } = await db
    .from("service_tickets")
    .select(
      "id, no_service, kode_barang, serial_number, status, estimasi, reported_by_name, tanggal_masuk, created_at, status_changed_at, last_aging_notified_at, branch_id, branch:branches(id, name, code, telegram_chat_id)"
    )
    .neq("status", "selesai");
  if (ticketsError) {
    return NextResponse.json({ error: ticketsError.message }, { status: 500 });
  }

  const matched: AgingTicket[] = [];

  for (const raw of (tickets ?? []) as unknown as TicketRow[]) {
    const rule = ruleByStatus.get(raw.status);
    if (!rule) continue;

    const daysSinceIntake = daysBetween(raw.tanggal_masuk ?? raw.created_at, now);
    const daysInStatus = daysBetween(
      raw.status_changed_at ?? raw.created_at,
      now
    );
    const age = rule.basis === "intake" ? daysSinceIntake : daysInStatus;

    const inBand =
      level === "warn"
        ? age >= rule.warn_days && age < rule.escalate_days
        : age >= rule.escalate_days;
    if (!inBand) continue;

    // Cooldown: tiket yang baru dikejar belum boleh masuk digest lagi.
    if (raw.last_aging_notified_at) {
      const sinceNotified = daysBetween(raw.last_aging_notified_at, now);
      if (sinceNotified < rule.cooldown_days) continue;
    }

    matched.push({
      id: raw.id,
      ticket_no: raw.no_service,
      device: raw.kode_barang,
      serial_number: raw.serial_number,
      branch: raw.branch?.name ?? "-",
      status: raw.status,
      days_since_intake: daysSinceIntake,
      days_in_status: daysInStatus,
      part_eta: raw.estimasi,
      pic: raw.reported_by_name,
    });
  }

  const groups: AgingGroup[] =
    level === "escalate"
      ? buildEscalateGroup(matched, now)
      : buildWarnGroups(matched, tickets as unknown as TicketRow[], now);

  const response: AgingScanResponse = {
    generated_at: now.toISOString(),
    level,
    groups,
  };
  return NextResponse.json(response);
}

function groupByStatus(tickets: AgingTicket[]) {
  const map = new Map<TicketStatus, AgingTicket[]>();
  tickets.forEach((t) => {
    if (!map.has(t.status)) map.set(t.status, []);
    map.get(t.status)!.push(t);
  });
  return Array.from(map.entries()).map(([status, items]) => ({
    status,
    label: STATUS_LABEL[status] ?? status,
    tickets: items,
  }));
}

function buildWarnGroups(
  matched: AgingTicket[],
  rows: TicketRow[],
  now: Date
): AgingGroup[] {
  const branchOf = new Map(rows.map((r) => [r.id, r.branch]));
  const byBranch = new Map<string, AgingTicket[]>();

  matched.forEach((t) => {
    const branch = branchOf.get(t.id);
    const key = branch?.id ?? "-";
    if (!byBranch.has(key)) byBranch.set(key, []);
    byBranch.get(key)!.push(t);
  });

  return Array.from(byBranch.entries())
    .map(([branchId, items]) => {
      const branch = branchOf.get(items[0].id);
      const slug = branch?.code ? slugify(branch.code) : slugify(items[0].branch);
      return {
        batch_key: buildBatchKey(now, slug, "warn"),
        branch: branch?.name ?? items[0].branch,
        branch_id: branchId === "-" ? null : branchId,
        telegram_chat_id: branch?.telegram_chat_id ?? null,
        ticket_count: items.length,
        ticket_ids: items.map((t) => t.id),
        by_status: groupByStatus(items),
      };
    })
    .sort((a, b) => (a.branch ?? "").localeCompare(b.branch ?? ""));
}

function buildEscalateGroup(matched: AgingTicket[], now: Date): AgingGroup[] {
  if (matched.length === 0) return [];
  return [
    {
      batch_key: buildBatchKey(now, null, "escalate"),
      branch: null,
      branch_id: null,
      telegram_chat_id: null,
      ticket_count: matched.length,
      ticket_ids: matched.map((t) => t.id),
      by_status: groupByStatus(matched),
    },
  ];
}
