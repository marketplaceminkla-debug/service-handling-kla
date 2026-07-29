import { adminClient, buildBatchKey, daysBetween, slugify } from "@/lib/aging/server";
import { STATUS_LABEL, type TicketStatus } from "@/types";
import type { AgingGroup, AgingLevel, AgingTicket } from "@/lib/aging/types";

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
  branch: { id: string; name: string; code: string } | null;
}

/** Tiket yang lolos kriteria, dibawa bareng info cabangnya supaya
 * pengelompokan gak perlu nengok balik ke baris mentah. */
interface MatchedTicket {
  ticket: AgingTicket;
  branch: { id: string; name: string; code: string } | null;
}

const TICKET_SELECT =
  "id, no_service, kode_barang, serial_number, status, estimasi, reported_by_name, tanggal_masuk, created_at, status_changed_at, last_aging_notified_at, branch_id, branch:branches(id, name, code)";

/**
 * Cari tiket menua untuk satu level, sudah dikelompokkan siap kirim.
 *
 * Logikanya sengaja di sini, bukan di route — supaya cron harian dan
 * endpoint scan memakai perhitungan yang sama persis, dan bisa diuji
 * tanpa lewat HTTP.
 */
export async function scanAging(
  level: AgingLevel,
  now: Date = new Date()
): Promise<AgingGroup[]> {
  const db = adminClient();

  const { data: rules, error: rulesError } = await db
    .from("aging_rules")
    .select("*")
    .eq("active", true);
  if (rulesError) throw new Error(rulesError.message);

  const ruleByStatus = new Map<TicketStatus, AgingRuleRow>(
    (rules ?? []).map((r) => [r.status as TicketStatus, r as AgingRuleRow])
  );

  const { data: rows, error: ticketsError } = await db
    .from("service_tickets")
    .select(TICKET_SELECT)
    .neq("status", "selesai");
  if (ticketsError) throw new Error(ticketsError.message);

  const matched: MatchedTicket[] = [];

  for (const raw of (rows ?? []) as unknown as TicketRow[]) {
    const rule = ruleByStatus.get(raw.status);
    if (!rule) continue;

    const daysSinceIntake = daysBetween(raw.tanggal_masuk ?? raw.created_at, now);
    const daysInStatus = daysBetween(raw.status_changed_at ?? raw.created_at, now);
    const age = rule.basis === "intake" ? daysSinceIntake : daysInStatus;

    const inBand =
      level === "warn"
        ? age >= rule.warn_days && age < rule.escalate_days
        : age >= rule.escalate_days;
    if (!inBand) continue;

    // Cooldown: tiket yang baru dikejar belum boleh masuk digest lagi.
    if (
      raw.last_aging_notified_at &&
      daysBetween(raw.last_aging_notified_at, now) < rule.cooldown_days
    ) {
      continue;
    }

    matched.push({
      branch: raw.branch,
      ticket: {
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
      },
    });
  }

  if (matched.length === 0) return [];

  return level === "escalate"
    ? buildEscalateGroup(matched, now)
    : buildWarnGroups(matched, now);
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

function buildWarnGroups(matched: MatchedTicket[], now: Date): AgingGroup[] {
  const byBranch = new Map<string, MatchedTicket[]>();
  matched.forEach((m) => {
    const key = m.branch?.id ?? "-";
    if (!byBranch.has(key)) byBranch.set(key, []);
    byBranch.get(key)!.push(m);
  });

  return Array.from(byBranch.values())
    .map((items) => {
      const branch = items[0].branch;
      const tickets = items.map((i) => i.ticket);
      const slug = slugify(branch?.code ?? branch?.name ?? "cabang");
      return {
        batch_key: buildBatchKey(now, slug, "warn"),
        branch: branch?.name ?? "-",
        branch_id: branch?.id ?? null,
        telegram_chat_id: null,
        ticket_count: tickets.length,
        ticket_ids: tickets.map((t) => t.id),
        by_status: groupByStatus(tickets),
      };
    })
    .sort((a, b) => (a.branch ?? "").localeCompare(b.branch ?? ""));
}

function buildEscalateGroup(matched: MatchedTicket[], now: Date): AgingGroup[] {
  const tickets = matched.map((m) => m.ticket);
  return [
    {
      batch_key: buildBatchKey(now, null, "escalate"),
      branch: null,
      branch_id: null,
      telegram_chat_id: null,
      ticket_count: tickets.length,
      ticket_ids: tickets.map((t) => t.id),
      by_status: groupByStatus(tickets),
    },
  ];
}
