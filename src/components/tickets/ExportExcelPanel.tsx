"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";
import { exportTicketsToExcel } from "@/lib/exportTickets";
import type { TicketWithBranch } from "@/types";

export function ExportExcelPanel({
  tickets,
  onClose,
}: {
  tickets: TicketWithBranch[];
  onClose: () => void;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const inRange = tickets.filter((t) => {
    const reportedAt = t.created_at.slice(0, 10);
    if (from && reportedAt < from) return false;
    if (to && reportedAt > to) return false;
    return true;
  });

  const handleExport = () => {
    const label = from || to ? `${from || "awal"}_sampai_${to || "sekarang"}` : "semua";
    exportTicketsToExcel(inRange, `laporan-servis_${label}.xlsx`);
    onClose();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Export Laporan Servis</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
          <X size={18} />
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Berdasarkan tanggal lapor. Ngikutin filter cabang/brand/kategori/status
        yang lagi aktif di list. Kosongin kalau mau semua periode.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">
            Dari Tanggal
          </span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">
            Sampai Tanggal
          </span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </label>
        <button
          onClick={handleExport}
          disabled={inRange.length === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-gray-900 bg-brand rounded-lg hover:brightness-95 disabled:opacity-40"
        >
          <Download size={15} />
          Download ({inRange.length} tiket)
        </button>
      </div>
    </div>
  );
}
