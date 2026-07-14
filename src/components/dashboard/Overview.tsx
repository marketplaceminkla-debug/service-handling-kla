"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { listTickets, ticketAgeDays, isStuck } from "@/lib/tickets";
import { STATUS_LABEL, type TicketWithBranch } from "@/types";
import { cn, formatDate } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  baru: "bg-blue-50 text-blue-700",
  diproses: "bg-yellow-50 text-yellow-800",
  tunggu_sparepart: "bg-orange-50 text-orange-700",
  selesai: "bg-green-50 text-green-700",
};

export function Overview() {
  const [tickets, setTickets] = useState<TicketWithBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTickets()
      .then(setTickets)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-gray-400">Memuat dashboard...</p>;
  }
  if (error) {
    return <p className="text-sm text-danger">{error}</p>;
  }

  const counts = {
    baru: tickets.filter((t) => t.status === "baru").length,
    diproses: tickets.filter((t) => t.status === "diproses").length,
    tunggu_sparepart: tickets.filter((t) => t.status === "tunggu_sparepart")
      .length,
    selesai: tickets.filter((t) => t.status === "selesai").length,
  };

  const stuckTickets = tickets.filter((t) => isStuck(t));

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Dashboard</h2>
      <p className="text-sm text-gray-500 mb-6">
        Ringkasan progres tiket servis semua cabang yang bisa kamu akses.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map(
          (status) => (
            <div
              key={status}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <p className="text-sm text-gray-500">{STATUS_LABEL[status]}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {counts[status]}
              </p>
            </div>
          )
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <AlertTriangle size={18} className="text-danger" />
          <h3 className="font-semibold text-gray-900">
            Tiket Macet ({stuckTickets.length})
          </h3>
          <span className="text-xs text-gray-400">
            &gt; 3 hari tanpa update
          </span>
        </div>

        {stuckTickets.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400">
            Tidak ada tiket yang macet. Mantap.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {stuckTickets.map((t) => (
              <li
                key={t.id}
                className="px-5 py-3 flex items-center justify-between text-sm"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {t.no_service} — {t.kode_barang}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {t.branch?.name ?? "-"} · Umur {ticketAgeDays(t)} hari ·
                    Update terakhir {formatDate(t.updated_at)}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-1 rounded",
                    STATUS_COLORS[t.status]
                  )}
                >
                  {STATUS_LABEL[t.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
