"use client";

import { useState } from "react";
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Undo2,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  importTickets,
  parseExcelFile,
  undoImport,
  type ImportResult,
  type ParsedTicketRow,
} from "@/lib/ticketImport";
import { UndoImportPanel } from "@/components/tickets/UndoImportPanel";
import { KATEGORI_LABEL, type TicketKategori } from "@/types";
import { cn, errorMessage } from "@/lib/utils";

export function UploadExcel() {
  const { profile } = useAuth();
  const [kategori, setKategori] = useState<TicketKategori>("stok");
  const [rows, setRows] = useState<ParsedTicketRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [undoNote, setUndoNote] = useState<string | null>(null);

  const switchKategori = (next: TicketKategori) => {
    setKategori(next);
    setRows([]);
    setFileName(null);
    setError(null);
    setResult(null);
    setUndoNote(null);
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
      setError(errorMessage(err, "Gagal membaca file Excel"));
      setRows([]);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    setConfirming(false);
    setImporting(true);
    setError(null);
    setUndoNote(null);
    try {
      const res = await importTickets(kategori, rows, {
        id: profile?.id ?? null,
        name: profile?.full_name || profile?.email || null,
      });
      setResult(res);
      setRows([]);
      setFileName(null);
    } catch (err) {
      setError(errorMessage(err, "Gagal import data"));
    } finally {
      setImporting(false);
    }
  };

  const handleUndo = async () => {
    if (!result?.createdIds.length) return;
    if (
      !confirm(
        `Hapus ${result.createdIds.length} tiket yang baru saja diimpor? Tindakan ini tidak bisa dibatalkan lagi.`
      )
    )
      return;

    setUndoing(true);
    setError(null);
    try {
      const res = await undoImport(result.createdIds);
      setUndoNote(
        res.keptBecauseTouched > 0
          ? `${res.deleted} tiket dihapus. ${res.keptBecauseTouched} tiket dipertahankan karena sudah ada follow-up-nya.`
          : `${res.deleted} tiket berhasil dihapus.`
      );
      setResult(null);
    } catch (err) {
      setError(errorMessage(err, "Gagal membatalkan import"));
    } finally {
      setUndoing(false);
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

            {result.createdIds.length > 0 && (
              <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-900/50">
                <p className="text-xs text-green-800/80 dark:text-green-300/70 mb-2">
                  Salah file? Batalkan selagi tombol ini masih ada — begitu
                  halaman ditutup, pembatalan harus lewat hapus tiket satu per
                  satu.
                </p>
                <button
                  onClick={handleUndo}
                  disabled={undoing}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-300 dark:border-red-900/60 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60"
                >
                  <Undo2 size={14} />
                  {undoing
                    ? "Membatalkan..."
                    : `Batalkan Import (${result.createdIds.length} tiket)`}
                </button>
              </div>
            )}
          </div>
        )}

        {undoNote && (
          <p className="mt-4 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
            {undoNote}
          </p>
        )}
      </div>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirming(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Yakin proses import?
              </h3>
              <button
                onClick={() => setConfirming(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5 mb-4">
                <li>
                  File: <strong>{fileName ?? "-"}</strong>
                </li>
                <li>
                  Kategori: <strong>Servis {KATEGORI_LABEL[kategori]}</strong>
                </li>
                <li>
                  <strong>{rows.length} baris</strong> akan diproses jadi tiket
                  baru
                </li>
              </ul>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                No. Service yang sudah ada di database akan dilewati, bukan
                ditimpa. Kalau ternyata salah file, masih ada tombol Batalkan
                Import setelah ini.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirming(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
                <button
                  onClick={handleImport}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-900 bg-brand rounded-lg hover:brightness-95"
                >
                  Ya, proses
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Preview ({rows.length} baris)
            </h3>
            <button
              onClick={() => setConfirming(true)}
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

      {rows.length === 0 && (
        <div className="mt-6">
          <UndoImportPanel key={undoNote ?? result?.createdIds.length ?? "idle"} />
        </div>
      )}
    </div>
  );
}
