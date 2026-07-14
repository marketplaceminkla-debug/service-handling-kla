"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { addFollowUp, getTicket, listTicketUpdates, ticketAgeDays } from "@/lib/tickets";
import {
  KATEGORI_LABEL,
  STATUS_LABEL,
  type TicketStatus,
  type TicketUpdate,
  type TicketWithBranch,
} from "@/types";
import { cn, formatDate } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  baru: "bg-blue-50 text-blue-700",
  diproses: "bg-yellow-50 text-yellow-800",
  tunggu_sparepart: "bg-orange-50 text-orange-700",
  selesai: "bg-green-50 text-green-700",
};

export function TicketDetail({
  ticketId,
  onBack,
}: {
  ticketId: string;
  onBack: () => void;
}) {
  const { profile } = useAuth();
  const [ticket, setTicket] = useState<TicketWithBranch | null>(null);
  const [updates, setUpdates] = useState<TicketUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [statusTo, setStatusTo] = useState<TicketStatus>("diproses");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [t, u] = await Promise.all([
        getTicket(ticketId),
        listTicketUpdates(ticketId),
      ]);
      setTicket(t);
      setUpdates(u);
      setStatusTo(t.status === "selesai" ? "selesai" : nextStatus(t.status));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat tiket");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const handleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    setSubmitting(true);
    setError(null);
    try {
      await addFollowUp({
        ticket_id: ticket.id,
        note: note.trim(),
        status_from: ticket.status,
        status_to: statusTo,
        created_by: profile?.id ?? null,
        created_by_name: profile?.full_name || profile?.email || null,
      });
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan follow-up");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Memuat tiket...</p>;
  if (error && !ticket) return <p className="text-sm text-danger">{error}</p>;
  if (!ticket) return null;

  return (
    <div className="max-w-3xl">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4"
      >
        <ArrowLeft size={16} />
        Kembali
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {ticket.no_service}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {ticket.branch?.name ?? "-"} · {KATEGORI_LABEL[ticket.kategori]}
            </p>
          </div>
          <span
            className={cn(
              "text-xs font-medium px-2.5 py-1 rounded",
              STATUS_COLORS[ticket.status]
            )}
          >
            {STATUS_LABEL[ticket.status]}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-4 mt-5 text-sm">
          <Detail label="Kode Barang" value={ticket.kode_barang} />
          <Detail label="Serial Number" value={ticket.serial_number} />
          <Detail label="Estimasi" value={ticket.estimasi || "-"} />
          <Detail label="Posisi Unit" value={ticket.posisi_unit || "-"} />
          <Detail
            label="Dilaporkan oleh"
            value={ticket.reported_by_name || "-"}
          />
          <Detail label="Lama di-service" value={`${ticketAgeDays(ticket)} hari`} />
        </dl>

        {ticket.keterangan && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-1">Keterangan</p>
            <p className="text-sm text-gray-800">{ticket.keterangan}</p>
          </div>
        )}
      </div>

      {ticket.status !== "selesai" && (
        <form
          onSubmit={handleFollowUp}
          className="bg-white rounded-xl border border-gray-200 p-6 mb-6"
        >
          <h3 className="font-semibold text-gray-900 mb-3">Tambah Follow-up</h3>
          <div className="grid grid-cols-[1fr_auto] gap-3 mb-3">
            <select
              value={statusTo}
              onChange={(e) => setStatusTo(e.target.value as TicketStatus)}
              className="text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            required
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Catatan progres..."
            rows={3}
            className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          />
          {error && <p className="text-sm text-danger mt-2">{error}</p>}
          <div className="flex justify-end mt-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-gray-900 bg-brand rounded-lg hover:brightness-95 disabled:opacity-60"
            >
              Simpan Follow-up
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Riwayat Follow-up</h3>
        </div>
        {updates.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400">Belum ada follow-up.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {updates.map((u) => (
              <li key={u.id} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {u.created_by_name || "Sistem"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDate(u.created_at)}
                  </p>
                </div>
                {u.status_from && u.status_to && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {STATUS_LABEL[u.status_from as TicketStatus]} →{" "}
                    {STATUS_LABEL[u.status_to as TicketStatus]}
                  </p>
                )}
                <p className="text-sm text-gray-700 mt-1">{u.note}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function nextStatus(status: TicketStatus): TicketStatus {
  const order: TicketStatus[] = [
    "baru",
    "diproses",
    "tunggu_sparepart",
    "selesai",
  ];
  const idx = order.indexOf(status);
  return order[Math.min(idx + 1, order.length - 1)];
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900 font-medium mt-0.5">{value}</dd>
    </div>
  );
}
