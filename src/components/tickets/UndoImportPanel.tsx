"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, RotateCcw, Trash2 } from "lucide-react";
import {
  listUndoableImports,
  undoImport,
  type UndoableImportBatch,
} from "@/lib/ticketImport";
import { cn, errorMessage, formatDate } from "@/lib/utils";

export function UndoImportPanel() {
  const [batches, setBatches] = useState<UndoableImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listUndoableImports()
      .then(setBatches)
      .catch((e) => setError(errorMessage(e, "Gagal memuat daftar import")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const toggleTicket = (id: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const remove = async (batch: UndoableImportBatch) => {
    const ids = batch.tickets.map((t) => t.id).filter((id) => !excluded.has(id));
    if (ids.length === 0) {
      setError("Semua tiket di kelompok ini dikecualikan — tidak ada yang dihapus.");
      return;
    }
    if (
      !confirm(
        `Hapus ${ids.length} tiket dari import ${formatDate(batch.importedAt)}?\n\nTindakan ini tidak bisa dibatalkan.`
      )
    )
      return;

    setBusyKey(batch.key);
    setError(null);
    try {
      const res = await undoImport(ids);
      setNote(
        res.keptBecauseTouched > 0
          ? `${res.deleted} tiket dihapus. ${res.keptBecauseTouched} dipertahankan karena sudah ada follow-up-nya.`
          : `${res.deleted} tiket berhasil dihapus.`
      );
      load();
    } catch (err) {
      setError(errorMessage(err, "Gagal menghapus tiket"));
    } finally {
      setBusyKey(null);
    }
  };

  const total = useMemo(
    () => batches.reduce((s, b) => s + b.tickets.length, 0),
    [batches]
  );

  if (loading)
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500">
        Mencari import yang bisa dibatalkan...
      </p>
    );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <RotateCcw size={16} className="text-gray-400 dark:text-gray-500" />
            Batalkan Import Sebelumnya
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {total} tiket dari {batches.length} kali import yang belum
            ditindaklanjuti
          </p>
        </div>
        <button
          onClick={load}
          className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          Muat ulang
        </button>
      </div>

      <div className="px-5 py-3 bg-yellow-50 dark:bg-yellow-900/10 border-b border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
          Daftar ini <strong>hasil penyimpulan</strong>, bukan catatan import
          yang sesungguhnya — tidak ada kolom yang menandai asal sebuah tiket.
          Yang ditampilkan adalah tiket berstatus <strong>Baru</strong>, posisi{" "}
          <strong>CABANG</strong>, dan belum punya follow-up. Tiket yang dibuat
          manual dengan kondisi sama bisa ikut terjaring, jadi{" "}
          <strong>buka dan periksa daftarnya dulu</strong>; yang tidak mau
          dihapus tinggal dilepas centangnya.
        </p>
      </div>

      {error && (
        <p className="mx-5 mt-4 text-sm text-danger bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {note && (
        <p className="mx-5 mt-4 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
          {note}
        </p>
      )}

      {batches.length === 0 ? (
        <p className="px-5 py-6 text-sm text-gray-400 dark:text-gray-500">
          Tidak ada tiket hasil import yang belum ditindaklanjuti.
        </p>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {batches.map((batch) => {
            const isOpen = expanded === batch.key;
            const keep = batch.tickets.filter((t) => !excluded.has(t.id)).length;
            return (
              <div key={batch.key}>
                <div className="flex items-center gap-3 px-5 py-3.5">
                  <button
                    onClick={() => setExpanded(isOpen ? null : batch.key)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <ChevronRight
                      size={16}
                      className={cn(
                        "text-gray-400 dark:text-gray-500 shrink-0 transition-transform",
                        isOpen && "rotate-90"
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(batch.importedAt)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {batch.tickets.length} tiket · {batch.branches.join(", ")}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => remove(batch)}
                    disabled={busyKey === batch.key}
                    className="flex items-center gap-1.5 shrink-0 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-300 dark:border-red-900/60 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60"
                  >
                    <Trash2 size={13} />
                    {busyKey === batch.key ? "Menghapus..." : `Hapus ${keep}`}
                  </button>
                </div>

                {isOpen && (
                  <div className="px-5 pb-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 text-[11px] uppercase tracking-wide">
                          <th className="py-2 pr-3 font-medium w-8"></th>
                          <th className="py-2 pr-3 font-medium">No. Service</th>
                          <th className="py-2 pr-3 font-medium">Cabang</th>
                          <th className="py-2 font-medium">Barang</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batch.tickets.map((t) => {
                          const off = excluded.has(t.id);
                          return (
                            <tr
                              key={t.id}
                              className={cn(
                                "border-b border-gray-50 dark:border-gray-700/60 last:border-0",
                                off && "opacity-40"
                              )}
                            >
                              <td className="py-2 pr-3">
                                <input
                                  type="checkbox"
                                  checked={!off}
                                  onChange={() => toggleTicket(t.id)}
                                  title="Lepas centang kalau tiket ini jangan dihapus"
                                  className="rounded border-gray-300 dark:border-gray-600"
                                />
                              </td>
                              <td className="py-2 pr-3 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                {t.no_service}
                              </td>
                              <td className="py-2 pr-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                {t.branch_name}
                              </td>
                              <td className="py-2 text-gray-600 dark:text-gray-300">
                                {t.kode_barang}
                                <span className="text-gray-400 dark:text-gray-500">
                                  {" · "}
                                  {t.serial_number}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
