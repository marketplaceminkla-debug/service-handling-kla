"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { addFollowUp, listTickets } from "@/lib/tickets";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  type TicketStatus,
  type TicketWithBranch,
} from "@/types";
import { cn, errorMessage } from "@/lib/utils";

/** Form ini cuma butuh sebagian kolom tiket, jadi tipenya dibikin minimal
 * — supaya bisa dipanggil dari daftar riwayat (yang cuma memuat sebagian
 * kolom) tanpa memaksakan cast. */
export type ManualFollowUpTicket = Pick<
  TicketWithBranch,
  "id" | "no_service" | "kode_barang" | "status"
> & {
  branch: { name: string } | null;
};

/** Nilai untuk <input type="datetime-local">, dalam waktu lokal. */
function nowLocalValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function ManualFollowUpForm({
  presetTicket,
  onClose,
  onSaved,
}: {
  presetTicket?: ManualFollowUpTicket | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<TicketWithBranch[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(!presetTicket);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ManualFollowUpTicket | null>(
    presetTicket ?? null
  );

  const [when, setWhen] = useState(nowLocalValue());
  const [note, setNote] = useState("");
  /** null = jangan ubah status tiket, cuma catat keterangannya. */
  const [statusTo, setStatusTo] = useState<TicketStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (presetTicket) return;
    listTickets()
      .then(setTickets)
      .catch((e) => setError(errorMessage(e, "Gagal memuat daftar tiket")))
      .finally(() => setLoadingTickets(false));
  }, [presetTicket]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return tickets
      .filter((t) =>
        `${t.no_service} ${t.kode_barang} ${t.serial_number}`
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 8);
  }, [tickets, search]);

  const save = async () => {
    if (!selected) {
      setError("Pilih tiketnya dulu.");
      return;
    }
    if (!note.trim()) {
      setError("Keterangannya masih kosong.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addFollowUp({
        ticket_id: selected.id,
        note: note.trim(),
        status_from: selected.status,
        // Tanpa pilihan status, status tiket dibiarkan apa adanya —
        // catatan manual ini merekam jawaban cabang, bukan memindahkan
        // tiket ke tahap berikutnya.
        status_to: statusTo ?? selected.status,
        channel: null,
        created_by: profile?.id ?? null,
        created_by_name: profile?.full_name || profile?.email || null,
        created_at: when ? new Date(when).toISOString() : null,
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err, "Gagal menyimpan catatan"));
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Tambah Catatan Manual
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Tiket
            </label>
            {selected ? (
              <div className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {selected.no_service}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {selected.branch?.name ?? "-"} · {selected.kode_barang}
                  </p>
                </div>
                {!presetTicket && (
                  <button
                    onClick={() => {
                      setSelected(null);
                      setSearch("");
                    }}
                    className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 shrink-0"
                  >
                    Ganti
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={
                      loadingTickets
                        ? "Memuat tiket..."
                        : "Ketik no. service, unit, atau SN..."
                    }
                    disabled={loadingTickets}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
                {matches.length > 0 && (
                  <ul className="mt-1.5 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
                    {matches.map((t) => (
                      <li key={t.id}>
                        <button
                          onClick={() => setSelected(t)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {t.no_service}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {t.branch?.name ?? "-"} · {t.kode_barang}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {search.trim() && matches.length === 0 && !loadingTickets && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                    Tidak ada tiket yang cocok.
                  </p>
                )}
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Tanggal & jam
            </label>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand dark:[color-scheme:dark]"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Isi sesuai kapan jawabannya masuk, bukan kapan kamu mencatatnya.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Keterangan / jawaban mereka
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Contoh: Cabang bilang unit sudah dikirim ke service center tanggal 20, nunggu part LCD."
              className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Sekalian ubah status tiket?
            </label>
            <select
              value={statusTo ?? ""}
              onChange={(e) =>
                setStatusTo((e.target.value || null) as TicketStatus | null)
              }
              className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">
                Jangan diubah
                {selected ? ` (tetap ${STATUS_LABEL[selected.status]})` : ""}
              </option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Batal
            </button>
            <button
              onClick={save}
              disabled={saving}
              className={cn(
                "px-5 py-2.5 text-sm font-semibold text-gray-900 bg-brand rounded-lg hover:brightness-95",
                saving && "opacity-60"
              )}
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
