"use client";

import { useEffect, useState } from "react";
import { Building2, ChevronDown, ChevronRight, Flame, MapPin } from "lucide-react";
import { ageLevel, listTickets, ticketAgeDays, URGENT_AGE_DAYS } from "@/lib/tickets";
import { STATUS_LABEL, type TicketStatus, type TicketWithBranch } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  baru: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  diproses:
    "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
  tunggu_sparepart:
    "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  done_service: "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",
  selesai: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300",
};

export function Overview() {
  const [tickets, setTickets] = useState<TicketWithBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPosisi, setExpandedPosisi] = useState<string | null>(null);

  useEffect(() => {
    listTickets()
      .then(setTickets)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500">
        Memuat dashboard...
      </p>
    );
  }
  if (error) {
    return <p className="text-sm text-danger">{error}</p>;
  }

  const counts = (Object.keys(STATUS_LABEL) as TicketStatus[]).reduce(
    (acc, status) => {
      acc[status] = tickets.filter((t) => t.status === status).length;
      return acc;
    },
    {} as Record<TicketStatus, number>
  );

  const urgentTickets = tickets.filter((t) => ageLevel(t) === "urgent");

  const branchStatsMap = new Map<
    string,
    { name: string; total: number; aktif: number; urgent: number }
  >();
  tickets.forEach((t) => {
    const key = t.branch_id;
    const entry = branchStatsMap.get(key) ?? {
      name: t.branch?.name ?? "Tanpa Cabang",
      total: 0,
      aktif: 0,
      urgent: 0,
    };
    entry.total += 1;
    if (t.status !== "selesai") entry.aktif += 1;
    if (ageLevel(t) === "urgent") entry.urgent += 1;
    branchStatsMap.set(key, entry);
  });
  const branchStats = Array.from(branchStatsMap.values()).sort(
    (a, b) => b.total - a.total
  );

  const POSISI_UNSET = "__belum_diisi__";
  const posisiStatsMap = new Map<string, { label: string; total: number }>();
  tickets.forEach((t) => {
    const normalized = t.posisi_unit?.trim().toUpperCase() || "";
    const key = normalized || POSISI_UNSET;
    const entry = posisiStatsMap.get(key) ?? {
      label: normalized || "Belum Diisi",
      total: 0,
    };
    entry.total += 1;
    posisiStatsMap.set(key, entry);
  });
  const posisiStats = Array.from(posisiStatsMap.entries())
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.total - a.total);
  const expandedTickets = expandedPosisi
    ? tickets.filter((t) =>
        expandedPosisi === POSISI_UNSET
          ? !t.posisi_unit
          : t.posisi_unit?.trim().toUpperCase() === expandedPosisi
      )
    : [];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
        Dashboard
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Ringkasan progres tiket servis semua cabang yang bisa kamu akses.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-8">
        {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map(
          (status) => (
            <div
              key={status}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {STATUS_LABEL[status]}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {counts[status]}
              </p>
            </div>
          )
        )}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-100 dark:border-red-900/50 p-5">
          <p className="text-sm text-red-600 dark:text-red-400">
            Urgent (&ge;{URGENT_AGE_DAYS}h)
          </p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-400 mt-1">
            {urgentTickets.length}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <MapPin size={18} className="text-gray-400 dark:text-gray-500" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Tiket per Posisi Unit
          </h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            klik buat lihat detail unitnya
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5">
          {posisiStats.map((p) => {
            const isOpen = expandedPosisi === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setExpandedPosisi(isOpen ? null : p.key)}
                className={cn(
                  "text-left rounded-lg border p-4 transition",
                  isOpen
                    ? "border-brand bg-yellow-50 dark:bg-yellow-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {p.label}
                  </p>
                  {isOpen ? (
                    <ChevronDown size={15} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={15} className="text-gray-400" />
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {p.total}
                </p>
              </button>
            );
          })}
          {posisiStats.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 col-span-full">
              Belum ada tiket.
            </p>
          )}
        </div>

        {expandedPosisi && (
          <div className="border-t border-gray-100 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="px-5 py-2 font-medium">No. Service</th>
                    <th className="px-5 py-2 font-medium">Kode Barang</th>
                    <th className="px-5 py-2 font-medium">Serial Number</th>
                    <th className="px-5 py-2 font-medium">Cabang</th>
                    <th className="px-5 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {expandedTickets.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-gray-50 dark:border-gray-700/60 last:border-0"
                    >
                      <td className="px-5 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                        {t.no_service}
                      </td>
                      <td className="px-5 py-2.5 text-gray-600 dark:text-gray-300">
                        {t.kode_barang}
                      </td>
                      <td className="px-5 py-2.5 text-gray-600 dark:text-gray-300">
                        {t.serial_number}
                      </td>
                      <td className="px-5 py-2.5 text-gray-600 dark:text-gray-300">
                        {t.branch?.name ?? "-"}
                      </td>
                      <td className="px-5 py-2.5">
                        <span
                          className={cn(
                            "text-xs font-medium px-2 py-1 rounded",
                            STATUS_COLORS[t.status]
                          )}
                        >
                          {STATUS_LABEL[t.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <Building2 size={18} className="text-gray-400 dark:text-gray-500" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Tiket per Cabang ({branchStats.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="px-5 py-2 font-medium">Cabang</th>
                <th className="px-5 py-2 font-medium">Total Tiket</th>
                <th className="px-5 py-2 font-medium">Aktif (belum selesai)</th>
                <th className="px-5 py-2 font-medium">Urgent</th>
              </tr>
            </thead>
            <tbody>
              {branchStats.map((b) => (
                <tr
                  key={b.name}
                  className="border-b border-gray-50 dark:border-gray-700/60 last:border-0"
                >
                  <td className="px-5 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                    {b.name}
                  </td>
                  <td className="px-5 py-2.5 text-gray-600 dark:text-gray-300">
                    {b.total}
                  </td>
                  <td className="px-5 py-2.5 text-gray-600 dark:text-gray-300">
                    {b.aktif}
                  </td>
                  <td className="px-5 py-2.5">
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-1 rounded",
                        b.urgent > 0
                          ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                          : "text-gray-400 dark:text-gray-500"
                      )}
                    >
                      {b.urgent}
                    </span>
                  </td>
                </tr>
              ))}
              {branchStats.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-6 text-center text-gray-400 dark:text-gray-500"
                  >
                    Belum ada tiket.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <Flame size={18} className="text-red-500 dark:text-red-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Tiket Urgent ({urgentTickets.length})
          </h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            lama di-service &ge; {URGENT_AGE_DAYS} hari
          </span>
        </div>

        {urgentTickets.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 dark:text-gray-500">
            Belum ada tiket yang kelamaan di-service. Mantap.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {urgentTickets.map((t) => (
              <li
                key={t.id}
                className="px-5 py-3 flex items-center justify-between text-sm"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {t.no_service} — {t.kode_barang}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                    {t.branch?.name ?? "-"} · Umur {ticketAgeDays(t)} hari
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
