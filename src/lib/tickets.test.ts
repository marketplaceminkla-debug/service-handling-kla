import { describe, expect, it } from "vitest";
import { buildPosisiUnitDraftMessage } from "@/lib/tickets";

const ticket = (over: Partial<Parameters<typeof buildPosisiUnitDraftMessage>[1][number]> = {}) => ({
  no_service: "SRV/00004/202607",
  kode_barang: "Ideapad Slim 5 83HX00B0ID",
  serial_number: "1S83HX00B0IDYX0GS1TG",
  ...over,
});

describe("buildPosisiUnitDraftMessage", () => {
  it("lists the service number, item and serial", () => {
    const msg = buildPosisiUnitDraftMessage("Pekalongan", [ticket()]);
    expect(msg).toContain("Halo Pekalongan");
    expect(msg).toContain(
      "1. SRV/00004/202607 - Ideapad Slim 5 83HX00B0ID - 1S83HX00B0IDYX0GS1TG"
    );
  });

  it("skips a serial stored as the '-' placeholder instead of printing it", () => {
    const msg = buildPosisiUnitDraftMessage("Pekalongan", [
      ticket({ serial_number: "-" }),
    ]);
    expect(msg).toContain("1. SRV/00004/202607 - Ideapad Slim 5 83HX00B0ID");
    expect(msg).not.toContain("- -");
  });

  it("skips an empty item as well", () => {
    const msg = buildPosisiUnitDraftMessage("Pekalongan", [
      ticket({ kode_barang: "  ", serial_number: "" }),
    ]);
    expect(msg).toContain("1. SRV/00004/202607");
    expect(msg.trim().endsWith("SRV/00004/202607")).toBe(true);
  });

  it("numbers every ticket in order", () => {
    const msg = buildPosisiUnitDraftMessage("Pekalongan", [
      ticket({ no_service: "SRV/00003/202607" }),
      ticket({ no_service: "SRV/00004/202607" }),
    ]);
    expect(msg).toContain("1. SRV/00003/202607");
    expect(msg).toContain("2. SRV/00004/202607");
  });
});
