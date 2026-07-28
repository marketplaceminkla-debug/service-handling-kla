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

export function UploadExcel() {
  const { profile } = useAuth();
  const [kategori, setKategori] = useState<TicketKategori>("stok");
  const [rows, setRows] = useState<ParsedTicketRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const switchKategori = (next: TicketKategori) => {
    setKategori(next);
    setRows([]);
    setFileName(null);
    setError(null);
    setResult(null);
  };

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
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
        Upload Servis
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Upload Excel dari sistem internal. Cuma No. Service yang belum ada
        yang bakal ditambahin sebagai tiket baru — yang sudah ada di
        database tidak akan ditimpa/diubah. Tiket baru otomatis mulai dari
        status <strong>Baru</strong> dan posisi unit <strong>CABANG</strong>{" "}
        (kolom Status/Posisi Unit di Excel cuma buat preview, gak dipakai).
      </p>

      <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-6">
        {(Object.entries(KATEGORI_LABEL) as [TicketKategori, string][]).map(
          ([value, label]) => (
            <button
              key={value}
              onClick={() => switchKategori(value)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition",
                kategori === value
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              )}
            >
              Servis {label}
            </button>
          )
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg py-10 cursor-pointer hover:border-brand transition">
          <UploadCloud size={28} className="text-gray-400 dark:text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-300">
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
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-4">
            Membaca file...
          </p>
        )}

        {error && (
          <p className="text-sm text-danger bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50 rounded-lg px-3 py-2 mt-4">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/50 rounded-lg px-4 py-3 text-sm text-green-800 dark:text-green-300">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 size={16} />
              Import selesai
            </div>
            <p className="mt-1">
              {result.totalRows} baris terbaca · {result.created} tiket baru
              ditambahkan
              {result.branchesCreated.length > 0 &&
                ` · ${result.branchesCreated.length} cabang baru otomatis dibuat (${result.branchesCreated.join(", ")})`}
            </p>
            {result.skipped.length > 0 && (
              <div className="mt-2">
                <p className="flex items-center gap-1 text-yellow-800 dark:text-yellow-300 font-medium">
                  <AlertTriangle size={14} />
                  {result.skipped.length} baris dilewati
                </p>
                <ul className="mt-1 space-y-0.5 text-yellow-800/90 dark:text-yellow-300/80">
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
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
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
              <thead className="sticky top-0 bg-white dark:bg-gray-800">
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="px-4 py-2 font-medium">No. Service</th>
                  <th className="px-4 py-2 font-medium">Tanggal Masuk</th>
                  <th className="px-4 py-2 font-medium">Cabang</th>
                  <th className="px-4 py-2 font-medium">Kode Barang</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Lama</th>
                  <th className="px-4 py-2 font-medium">Posisi Unit</th>
                  <th className="px-4 py-2 font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-50 dark:border-gray-700/60 last:border-0"
                  >
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                      {r.no_service}
                    </td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                      {r.tanggal_masuk || "-"}
                    </td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                      {r.branch_name}
                    </td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                      {r.kode_barang}
                    </td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                      {r.status_raw}
                    </td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                      {r.lama_hari ? `${r.lama_hari} hari` : "-"}
                    </td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                      {r.posisi_unit || "-"}
                    </td>
                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                      {r.keterangan}
                    </td>
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
