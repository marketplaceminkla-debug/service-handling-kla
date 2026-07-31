import { describe, expect, it } from "vitest";
import { buildPosisiUnitDraftMessage, type DraftTicket } from "@/lib/tickets";

const ticket = (over: Partial<DraftTicket> = {}): DraftTicket => ({
  no_service: "SRV/00134/202607",
  kode_barang: "Aspire Lite AL14-31P-C0WW",
  serial_number: "NXJ9ESN001442006724500",
  posisi_unit: "SERVICE CENTER",
  branch: { name: "Semarang" },
  ...over,
});

describe("buildPosisiUnitDraftMessage", () => {
  it("lists branch, service number, item, serial and position", () => {
    const msg = buildPosisiUnitDraftMessage("cabang", "Semarang", [ticket()]);
    expect(msg).toContain("1. Semarang · SRV/00134/202607");
    expect(msg).toContain("Aspire Lite AL14-31P-C0WW");
    expect(msg).toContain("SN NXJ9ESN001442006724500");
    expect(msg).toContain("Posisi: SERVICE CENTER");
  });

  it("greets a branch and a brand differently", () => {
    expect(
      buildPosisiUnitDraftMessage("cabang", "Semarang", [ticket()])
    ).toContain("Halo Semarang, tolong dibantu update posisi unit");
    expect(
      buildPosisiUnitDraftMessage("brand", "ACER", [ticket()])
    ).toContain("Halo Tim ACER, mohon dibantu cek posisi unit");
  });

  it("keeps each ticket's own branch so a brand can see where units are", () => {
    const msg = buildPosisiUnitDraftMessage("brand", "ACER", [
      ticket({ no_service: "SRV/00134/202607", branch: { name: "Semarang" } }),
      ticket({ no_service: "SRV/00083/202607", branch: { name: "Cirebon" } }),
    ]);
    expect(msg).toContain("1. Semarang · SRV/00134/202607");
    expect(msg).toContain("2. Cirebon · SRV/00083/202607");
  });

  it("spells out a missing position rather than hiding it", () => {
    const msg = buildPosisiUnitDraftMessage("cabang", "Semarang", [
      ticket({ posisi_unit: null }),
    ]);
    expect(msg).toContain("Posisi: belum diisi");
  });

  it("skips an item or serial stored as the '-' placeholder", () => {
    const msg = buildPosisiUnitDraftMessage("cabang", "Semarang", [
      ticket({ kode_barang: "-", serial_number: "-" }),
    ]);
    expect(msg).not.toContain("SN -");
    expect(msg).not.toContain("   -");
    expect(msg).toContain("1. Semarang · SRV/00134/202607");
  });

  it("still names the ticket when the branch is missing", () => {
    const msg = buildPosisiUnitDraftMessage("brand", "ACER", [
      ticket({ branch: null }),
    ]);
    expect(msg).toContain("1. SRV/00134/202607");
  });
});
