"use client";

import { useState } from "react";
import { UploadCloud, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  importTickets,
  parseExcelFile,
  type ImportResult,
  type ParsedTicketRow,
} from "@/lib/ticketImport";
import { KATEGORI_LABEL, type TicketKategori } from "@/types";
import { cn } from "@/lib/utils";

export function UploadExcel({ kategori }: { kategori: TicketKategori }) {
  const { profile } = useAuth();
  const [rows, setRows] = useState<ParsedTicketRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setResult(null);
    setParsing(true);
    setFileName(file.name);
    try {
      const parsed = await parseExcelFile(file);
      if (parsed.length === 0) {
        setError("Tidak ada baris data yang kebaca dari file ini.");
      }
      setRows(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membaca file Excel");
      setRows([]);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    try {
      const res = await importTickets(kategori, rows, {
        id: profile?.id ?? null,
        name: profile?.full_name || profile?.email || null,
      });
      setResult(res);
      setRows([]);
      setFileName(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal import data");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-bold text-gray-900 mb-1">
        Upload Servis {KATEGORI_LABEL[kategori]}
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Upload Excel dari sistem internal. No. Service yang sudah ada bakal
        di-update statusnya, yang belum ada bakal jadi tiket baru.
      </p>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg py-10 cursor-pointer hover:border-brand transition">
          <UploadCloud size={28} className="text-gray-400" />
          <span className="text-sm text-gray-600">
            {fileName ?? "Klik buat pilih file .xlsx"}
          </span>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>

        {parsing && (
          <p className="text-sm text-gray-400 mt-4">Membaca file...</p>
        )}

        {error && (
          <p className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-4 bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-sm text-green-800">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 size={16} />
              Import selesai
            </div>
            <p className="mt-1">
              {result.totalRows} baris terbaca · {result.created} tiket baru ·{" "}
              {result.updated} tiket ter-update
              {result.branchesCreated.length > 0 &&
                ` · ${result.branchesCreated.length} cabang baru otomatis dibuat (${result.branchesCreated.join(", ")})`}
            </p>
            {result.skipped.length > 0 && (
              <div className="mt-2">
                <p className="flex items-center gap-1 text-yellow-800 font-medium">
                  <AlertTriangle size={14} />
                  {result.skipped.length} baris dilewati
                </p>
                <ul className="mt-1 space-y-0.5 text-yellow-800/90">
                  {result.skipped.map((s, i) => (
                    <li key={i}>
                      {s.no_service}: {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">
              Preview ({rows.length} baris)
            </h3>
            <button
              onClick={handleImport}
              disabled={importing}
              className={cn(
                "px-5 py-2.5 text-sm font-semibold text-gray-900 bg-brand rounded-lg hover:brightness-95",
                importing && "opacity-60"
              )}
            >
              {importing ? "Memproses..." : "Proses Import"}
            </button>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-2 font-medium">No. Service</th>
                  <th className="px-4 py-2 font-medium">Cabang</th>
                  <th className="px-4 py-2 font-medium">Kode Barang</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {r.no_service}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{r.branch_name}</td>
                    <td className="px-4 py-2 text-gray-600">{r.kode_barang}</td>
                    <td className="px-4 py-2 text-gray-600">{r.status_raw}</td>
                    <td className="px-4 py-2 text-gray-500">{r.keterangan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
