import { STATUS_LABEL, STATUS_ORDER } from "@/types";
import type { AgingGroup, AgingLevel, AgingTicket } from "@/lib/aging/types";

/** Maksimal tiket yang ditulis penuh dalam satu pesan. Sisanya diringkas
 * jadi satu baris — pesan Telegram yang kepanjangan gak kebaca orang. */
export const MAX_TICKETS_PER_MESSAGE = 15;

const MDV2_SPECIALS = /[_*[\]()~`>#+\-=|{}.!\\]/g;

/** Escape karakter khusus MarkdownV2 Telegram. Nomor tiket mengandung `-`
 * dan tanggal mengandung `.`, dua-duanya bikin pesan ditolak Telegram kalau
 * gak di-escape. Perhatikan `/` TIDAK termasuk karakter khusus MarkdownV2. */
export function escapeMdV2(value: string): string {
  return value.replace(MDV2_SPECIALS, (c) => `\\${c}`);
}

/** Digest tampil di dalam aplikasi (teks polos, buat disalin), tapi
 * escaping MarkdownV2 tetap dipertahankan kalau suatu saat dikirim ke
 * Telegram. */
export type MessageFormat = "plain" | "markdownv2";

function escaper(format: MessageFormat): (value: string) => string {
  return format === "markdownv2" ? escapeMdV2 : (v: string) => v;
}

function statusRank(status: string): number {
  const idx = STATUS_ORDER.indexOf(status as never);
  return idx === -1 ? STATUS_ORDER.length : idx;
}

/** Umur yang dipakai buat mengurutkan & menampilkan. Tiket `siap_diambil`
 * dinilai dari lama menunggu diambil, bukan total umur servis. */
function displayAge(ticket: AgingTicket): number {
  return ticket.status === "siap_diambil"
    ? ticket.days_in_status
    : ticket.days_since_intake;
}

function formatTicketLine(
  ticket: AgingTicket,
  opts: { showBranch: boolean; format: MessageFormat }
): string {
  const esc = escaper(opts.format);
  const head = [
    esc(ticket.ticket_no),
    esc(ticket.device),
    opts.showBranch ? esc(ticket.branch) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const age = displayAge(ticket);
  const detail: string[] = [];

  if (ticket.status === "siap_diambil") {
    detail.push(`${age} hari menunggu diambil`);
  } else {
    detail.push(`${age} hari`);
  }

  // Tiket menunggu part selalu menampilkan ETA. Kalau kosong, itu sendiri
  // sudah temuan — jadi ditulis eksplisit, bukan disembunyikan.
  if (ticket.status === "menunggu_part") {
    detail.push(
      ticket.part_eta?.trim()
        ? `part ETA ${esc(ticket.part_eta.trim())}`
        : "part ETA belum ada"
    );
  }

  if (ticket.pic?.trim()) detail.push(esc(ticket.pic.trim()));

  return `• ${head}\n  ${detail.join(" · ")}`;
}

function ageRange(tickets: AgingTicket[]): string {
  const ages = tickets.map(displayAge);
  const min = Math.min(...ages);
  const max = Math.max(...ages);
  return min === max ? `${min} hari` : `${min}–${max} hari`;
}

/**
 * Rakit satu pesan digest dari satu grup. Fungsi murni: tidak menyentuh
 * database, jam, maupun jaringan — semua yang dibutuhkan ada di argumen,
 * supaya gampang diuji.
 */
export function composeAgingMessage(
  group: AgingGroup,
  level: AgingLevel,
  opts: { format?: MessageFormat; listUrl?: string } = {}
): string {
  const format = opts.format ?? "plain";
  const esc = escaper(format);
  const md = format === "markdownv2";
  const showBranch = level === "escalate";

  const allTickets = group.by_status.flatMap((g) => g.tickets);
  if (allTickets.length === 0) return "";

  const header =
    level === "escalate"
      ? `🚨 Tiket lewat batas — lintas cabang\n${allTickets.length} tiket, umur ${ageRange(allTickets)}`
      : `🔧 Tiket perlu ditindak — ${esc(group.branch ?? "-")}\n${allTickets.length} tiket, umur ${ageRange(allTickets)}`;

  const body: string[] = [];
  let written = 0;

  if (level === "escalate") {
    // Escalate diurutkan murni umur terlama, tanpa dikelompokkan per status.
    const sorted = [...allTickets].sort((a, b) => displayAge(b) - displayAge(a));
    const shown = sorted.slice(0, MAX_TICKETS_PER_MESSAGE);
    written = shown.length;
    body.push(
      shown.map((t) => formatTicketLine(t, { showBranch, format })).join("\n")
    );
  } else {
    const sortedGroups = [...group.by_status]
      .filter((g) => g.tickets.length > 0)
      .sort((a, b) => statusRank(a.status) - statusRank(b.status));

    for (const statusGroup of sortedGroups) {
      if (written >= MAX_TICKETS_PER_MESSAGE) break;

      const sorted = [...statusGroup.tickets].sort(
        (a, b) => displayAge(b) - displayAge(a)
      );
      const room = MAX_TICKETS_PER_MESSAGE - written;
      const shown = sorted.slice(0, room);
      written += shown.length;

      const label = (
        statusGroup.label || STATUS_LABEL[statusGroup.status] || statusGroup.status
      ).toUpperCase();
      const count = md
        ? `\\(${statusGroup.tickets.length}\\)`
        : `(${statusGroup.tickets.length})`;

      body.push(
        `${esc(label)} ${count}\n` +
          shown.map((t) => formatTicketLine(t, { showBranch, format })).join("\n")
      );
    }
  }

  const parts = [header, "", body.join("\n\n")];

  const remaining = allTickets.length - written;
  if (remaining > 0) {
    parts.push("", `${md ? "\\+" : "+"}${remaining} tiket lain, lihat daftar lengkap`);
  }

  if (opts.listUrl) {
    parts.push("", `Buka daftar: ${esc(opts.listUrl)}`);
  }

  return parts.join("\n");
}
