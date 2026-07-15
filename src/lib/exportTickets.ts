import * as XLSX from "xlsx";
import { ticketAgeDays } from "@/lib/tickets";
import { KATEGORI_LABEL, STATUS_LABEL, type TicketWithBranch } from "@/types";

function formatDateOnly(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateOnlyDateCol(dateStr: string | null) {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function exportTicketsToExcel(
  tickets: TicketWithBranch[],
  filename: string
) {
  const rows = tickets.map((t, i) => ({
    "#": i + 1,
    "No. Service": t.no_service,
    "Tanggal Masuk": formatDateOnlyDateCol(t.tanggal_masuk),
    Kategori: KATEGORI_LABEL[t.kategori],
    Cabang: t.branch?.name ?? "-",
    Brand: t.brand?.name ?? "-",
    "Kode Barang": t.kode_barang,
    SN: t.serial_number,
    Status: STATUS_LABEL[t.status],
    "Posisi Unit": t.posisi_unit ?? "-",
    Estimasi: t.estimasi ?? "-",
    Keterangan: t.keterangan ?? "-",
    "Lama di Servis (hari)": ticketAgeDays(t),
    "Dilaporkan Oleh": t.reported_by_name ?? "-",
    "Tanggal Lapor": formatDateOnly(t.created_at),
    "Terakhir Update": formatDateOnly(t.updated_at),
    "Tanggal Selesai": formatDateOnly(t.resolved_at),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 4 },
    { wch: 20 },
    { wch: 14 },
    { wch: 10 },
    { wch: 16 },
    { wch: 14 },
    { wch: 28 },
    { wch: 22 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 32 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Servis");
  XLSX.writeFile(workbook, filename);
}
