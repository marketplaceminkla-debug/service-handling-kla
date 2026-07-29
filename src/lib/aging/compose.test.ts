import { describe, expect, it } from "vitest";
import {
  MAX_TICKETS_PER_MESSAGE,
  composeAgingMessage,
  escapeMdV2,
} from "@/lib/aging/compose";
import { STATUS_LABEL } from "@/types";
import type { AgingGroup, AgingTicket } from "@/lib/aging/types";

function ticket(over: Partial<AgingTicket> = {}): AgingTicket {
  return {
    id: over.id ?? "id-1",
    ticket_no: "SRV/00113/202607",
    device: "Lenovo ThinkPad T480",
    serial_number: "PF1ABCDE",
    branch: "Ngaliyan",
    status: "menunggu_part",
    days_since_intake: 9,
    days_in_status: 7,
    part_eta: "30 Jul",
    pic: "jalva",
    ...over,
  };
}

function group(tickets: AgingTicket[]): AgingGroup {
  const byStatus = new Map<string, AgingTicket[]>();
  tickets.forEach((t) => {
    if (!byStatus.has(t.status)) byStatus.set(t.status, []);
    byStatus.get(t.status)!.push(t);
  });
  return {
    batch_key: "2026-07-29:ngaliyan:warn",
    branch: "Ngaliyan",
    branch_id: "branch-1",
    telegram_chat_id: "-1001234567890",
    ticket_count: tickets.length,
    ticket_ids: tickets.map((t) => t.id),
    by_status: Array.from(byStatus.entries()).map(([status, items]) => ({
      status: status as AgingTicket["status"],
      label: STATUS_LABEL[status as AgingTicket["status"]],
      tickets: items,
    })),
  };
}

describe("escapeMdV2", () => {
  it("escapes the dashes in a ticket number but leaves slashes alone", () => {
    expect(escapeMdV2("SRV/00113/202607")).toBe("SRV/00113/202607");
    expect(escapeMdV2("SRV-00113-202607")).toBe("SRV\\-00113\\-202607");
  });

  it("escapes the period in a date-time value", () => {
    expect(escapeMdV2("30 Jul, 14.59")).toBe("30 Jul, 14\\.59");
  });

  it("escapes every MarkdownV2 special character", () => {
    expect(escapeMdV2("_*[]()~`>#+-=|{}.!")).toBe(
      "\\_\\*\\[\\]\\(\\)\\~\\`\\>\\#\\+\\-\\=\\|\\{\\}\\.\\!"
    );
  });
});

describe("composeAgingMessage — warn", () => {
  it("groups by status with the most embarrassing stage first", () => {
    const message = composeAgingMessage(
      group([
        ticket({ id: "a", status: "siap_diambil", days_in_status: 8 }),
        ticket({ id: "b", status: "baru", days_in_status: 9 }),
        ticket({ id: "c", status: "dalam_pengerjaan", days_in_status: 10 }),
        ticket({ id: "d", status: "menunggu_part" }),
      ]),
      "warn"
    );

    const order = ["BARU", "DALAM PENGERJAAN", "MENUNGGU PART", "SIAP DIAMBIL"];
    const positions = order.map((label) => message.indexOf(label));
    expect(positions.every((p) => p !== -1)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("sorts the oldest ticket first inside a status group", () => {
    const message = composeAgingMessage(
      group([
        ticket({ id: "young", ticket_no: "SRV/00001/202607", days_since_intake: 8 }),
        ticket({ id: "old", ticket_no: "SRV/00002/202607", days_since_intake: 14 }),
      ]),
      "warn"
    );
    expect(message.indexOf("SRV/00002/202607")).toBeLessThan(
      message.indexOf("SRV/00001/202607")
    );
  });

  it("writes 'part ETA belum ada' when the ETA is missing", () => {
    const message = composeAgingMessage(
      group([ticket({ part_eta: null })]),
      "warn"
    );
    expect(message).toContain("part ETA belum ada");
  });

  it("shows the raw estimasi text as the ETA", () => {
    const message = composeAgingMessage(
      group([ticket({ part_eta: "minggu depan" })]),
      "warn"
    );
    expect(message).toContain("part ETA minggu depan");
  });

  it("phrases siap_diambil as waiting to be collected, not in service", () => {
    const message = composeAgingMessage(
      group([ticket({ status: "siap_diambil", days_in_status: 8 })]),
      "warn"
    );
    expect(message).toContain("8 hari menunggu diambil");
  });

  it("caps the list at 15 tickets and summarises the rest", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      ticket({
        id: `t${i}`,
        ticket_no: `SRV/${String(i).padStart(5, "0")}/202607`,
        days_since_intake: 8 + i,
      })
    );
    const message = composeAgingMessage(group(many), "warn");

    const bullets = message.split("\n").filter((l) => l.startsWith("•"));
    expect(bullets).toHaveLength(MAX_TICKETS_PER_MESSAGE);
    expect(message).toContain("+5 tiket lain, lihat daftar lengkap");
  });

  it("returns an empty string when there is nothing to report", () => {
    expect(composeAgingMessage(group([]), "warn")).toBe("");
  });
});

describe("composeAgingMessage — format", () => {
  it("leaves punctuation unescaped in the default plain format", () => {
    const message = composeAgingMessage(
      group([ticket({ device: "Ideapad 5 2-in-1", part_eta: "30 Jul, 14.59" })]),
      "warn"
    );
    expect(message).toContain("Ideapad 5 2-in-1");
    expect(message).toContain("part ETA 30 Jul, 14.59");
    expect(message).not.toContain("\\");
  });

  it("escapes MarkdownV2 specials when that format is requested", () => {
    const message = composeAgingMessage(
      group([ticket({ device: "Ideapad 5 2-in-1", part_eta: "30 Jul, 14.59" })]),
      "warn",
      { format: "markdownv2" }
    );
    expect(message).toContain("Ideapad 5 2\\-in\\-1");
    expect(message).toContain("part ETA 30 Jul, 14\\.59");
    // Jumlah per kelompok status ikut di-escape kurungnya.
    expect(message).toContain("\\(1\\)");
  });

  it("appends the list link when one is given", () => {
    const message = composeAgingMessage(group([ticket()]), "warn", {
      listUrl: "https://app.example.com/digest",
    });
    expect(message).toContain("Buka daftar: https://app.example.com/digest");
  });
});

describe("composeAgingMessage — escalate", () => {
  it("sorts purely by age and shows the branch per ticket", () => {
    const message = composeAgingMessage(
      {
        ...group([
          ticket({
            id: "a",
            ticket_no: "SRV/00001/202607",
            branch: "Ngaliyan",
            status: "baru",
            days_since_intake: 16,
          }),
          ticket({
            id: "b",
            ticket_no: "SRV/00002/202607",
            branch: "Cirebon",
            status: "menunggu_part",
            days_since_intake: 25,
          }),
        ]),
        branch: null,
      },
      "escalate"
    );

    expect(message).toContain("lintas cabang");
    expect(message).toContain("Cirebon");
    expect(message).toContain("Ngaliyan");
    // Yang paling tua (25 hari, Cirebon) harus di atas walau statusnya
    // beda kelompok.
    expect(message.indexOf("SRV/00002/202607")).toBeLessThan(
      message.indexOf("SRV/00001/202607")
    );
  });
});
