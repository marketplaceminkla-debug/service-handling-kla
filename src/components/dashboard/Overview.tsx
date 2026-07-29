"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Flame } from "lucide-react";
import {
  AGE_BANDS,
  ageBandIndex,
  listTickets,
  ticketAgeDays,
} from "@/lib/tickets";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  type TicketStatus,
  type TicketWithBranch,
} from "@/types";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  baru: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  dalam_pengerjaan:
    "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
  menunggu_part:
    "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  siap_diambil: "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",
  selesai: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300",
};

const BANDS = [
  {
    key: 0,
    label: `< ${AGE_BANDS.pantau} hari`,
    aksi: "Aman",
    dot: "bg-gray-400 dark:bg-gray-500",
    bar: "bg-gray-300 dark:bg-gray-600",
    text: "text-gray-500 dark:text-gray-400",
    pill: "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400",
  },
  {
    key: 1,
    label: `${AGE_BANDS.pantau}–${AGE_BANDS.tindak - 1} hari`,
    aksi: "Pantau",
    dot: "bg-yellow-500",
    bar: "bg-yellow-400",
    text: "text-yellow-700 dark:text-yellow-400",
    pill: "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
  },
  {
    key: 2,
    label: `${AGE_BANDS.tindak}–${AGE_BANDS.eskalasi - 1} hari`,
    aksi: "Tindak",
    dot: "bg-orange-500",
    bar: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-400",
    pill: "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  },
  {
    key: 3,
    label: `≥ ${AGE_BANDS.eskalasi} hari`,
    aksi: "Eskalasi",
    dot: "bg-red-500",
    bar: "bg-red-500",
    text: "text-red-700 dark:text-red-400",
    pill: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  },
] as const;

type SortKey = "mendesak" | "tertua" | "aktif" | "nama";

const SORTS: [SortKey, string][] = [
  ["mendesak", "Paling mendesak"],
  ["tertua", "Tiket tertua"],
  ["aktif", "Aktif terbanyak"],
  ["nama", "A–Z"],
];

const POSISI_UNSET = "__belum_diisi__";

interface BranchRow {
  id: string;
  nama: string;
  total: number;
  aktif: number;
  bands: [number, number, number, number];
  tertua: number;
  /** Eskalasi dihitung paling berat supaya cabang dengan satu tiket ≥30
   * hari naik di atas cabang yang cuma banyak tiket muda. */
  skor: number;
}

export function Overview() {
  const [tickets, setTickets] = useState<TicketWithBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPosisi, setExpandedPosisi] = useState<string | null>(null);
  const [sortir, setSortir] = useState<SortKey>("mendesak");
  const [bandFilter, setBandFilter] = useState<number | null>(null);

  useEffect(() => {
    listTickets()
      .then(setTickets)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Umur hanya berarti buat tiket yang belum selesai — tiket selesai
  // diarsipkan dan tidak ikut hitungan pita mana pun.
  const active = useMemo(
    () => tickets.filter((t) => t.status !== "selesai"),
    [tickets]
  );

  const bandCounts = useMemo(() => {
    const counts: [number, number, number, number] = [0, 0, 0, 0];
    active.forEach((t) => counts[ageBandIndex(ticketAgeDays(t))]++);
    return counts;
  }, [active]);

  const statusCounts = useMemo(() => {
    const map = {} as Record<TicketStatus, number>;
    STATUS_ORDER.forEach((s) => (map[s] = 0));
    tickets.forEach((t) => {
      map[t.status] = (map[t.status] ?? 0) + 1;
    });
    return map;
  }, [tickets]);

  const posisiStats = useMemo(() => {
    const map = new Map<string, { label: string; total: number }>();
    tickets.forEach((t) => {
      const normalized = t.posisi_unit?.trim().toUpperCase() || "";
      const key = normalized || POSISI_UNSET;
      const entry = map.get(key) ?? {
        label: normalized || "Belum diisi",
        total: 0,
      };
      entry.total += 1;
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [tickets]);

  const expandedTickets = useMemo(
    () =>
      expandedPosisi
        ? tickets.filter((t) =>
            expandedPosisi === POSISI_UNSET
              ? !t.posisi_unit
              : t.posisi_unit?.trim().toUpperCase() === expandedPosisi
          )
        : [],
    [tickets, expandedPosisi]
  );

  const branchRows = useMemo(() => {
    const map = new Map<string, BranchRow>();
    tickets.forEach((t) => {
      const key = t.branch_id;
      const row =
        map.get(key) ??
        ({
          id: key,
          nama: t.branch?.name ?? "Tanpa Cabang",
          total: 0,
          aktif: 0,
          bands: [0, 0, 0, 0],
          tertua: 0,
          skor: 0,
        } as BranchRow);
      row.total += 1;
      if (t.status !== "selesai") {
        const days = ticketAgeDays(t);
        row.aktif += 1;
        row.bands[ageBandIndex(days)]++;
        if (days > row.tertua) row.tertua = days;
      }
      map.set(key, row);
    });

    const rows = Array.from(map.values()).map((r) => ({
      ...r,
      skor: r.bands[3] * 100 + r.bands[2] * 10 + r.bands[1],
    }));

    const filtered =
      bandFilter === null
        ? rows
        : rows.filter((r) => r.bands[bandFilter] > 0);

    const cmp: Record<SortKey, (a: BranchRow, b: BranchRow) => number> = {
      mendesak: (a, b) => b.skor - a.skor || b.tertua - a.tertua,
      tertua: (a, b) => b.tertua - a.tertua,
      aktif: (a, b) => b.aktif - a.aktif,
      nama: (a, b) => a.nama.localeCompare(b.nama),
    };
    return [...filtered].sort(cmp[sortir]);
  }, [tickets, sortir, bandFilter]);

  const escalated = useMemo(
    () =>
      active
        .filter((t) => ticketAgeDays(t) >= AGE_BANDS.eskalasi)
        .sort((a, b) => ticketAgeDays(b) - ticketAgeDays(a)),
    [active]
  );

  if (loading) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500">
        Memuat dashboard...
      </p>
    );
  }
  if (error) return <p className="text-sm text-danger">{error}</p>;

  const perluTindak = bandCounts[2] + bandCounts[3];

  return (
    <div className="max-w-6xl">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
        Dashboard
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Ringkasan progres tiket servis semua cabang yang bisa kamu akses.
      </p>

      {/* ---------- PITA UMUR ---------- */}
      <section className="mb-7">
        <SectionHead
          title="Umur tiket aktif"
          note={`${active.length} aktif · ${perluTindak} perlu tindakan`}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          {BANDS.map((b) => {
            const on = bandFilter === b.key;
            return (
              <button
                key={b.key}
                onClick={() => setBandFilter(on ? null : b.key)}
                aria-pressed={on}
                className={cn(
                  "text-left p-4 transition relative",
                  on
                    ? "bg-gray-50 dark:bg-gray-700/60"
                    : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                )}
              >
                <p
                  className={cn(
                    "text-2xl font-bold leading-none",
                    b.key >= 2 ? b.text : "text-gray-900 dark:text-gray-100"
                  )}
                >
                  {bandCounts[b.key]}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                  {b.label}
                </p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider mt-1.5",
                    b.text
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", b.dot)} />
                  {b.aksi}
                </span>
                {on && (
                  <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-brand" />
                )}
              </button>
            );
          })}
        </div>

        {active.length > 0 && (
          <div className="flex h-1.5 rounded-full overflow-hidden mt-2 bg-gray-200 dark:bg-gray-700">
            {BANDS.map((b) => (
              <span
                key={b.key}
                className={b.bar}
                style={{ width: `${(bandCounts[b.key] / active.length) * 100}%` }}
              />
            ))}
          </div>
        )}
      </section>

      {/* ---------- STATUS ---------- */}
      <section className="mb-7">
        <SectionHead title="Status pengerjaan" note="tiket aktif saja" />
        <div className="flex flex-wrap gap-2">
          {STATUS_ORDER.filter((s) => s !== "selesai").map((s) => (
            <div
              key={s}
              className="flex items-center gap-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3.5 py-2.5"
            >
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {STATUS_LABEL[s]}
              </span>
              <span
                className={cn(
                  "text-base font-bold",
                  statusCounts[s] === 0
                    ? "text-gray-300 dark:text-gray-600"
                    : "text-gray-900 dark:text-gray-100"
                )}
              >
                {statusCounts[s]}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-3.5 py-2.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Selesai (arsip)
            </span>
            <span className="text-base font-medium text-gray-400 dark:text-gray-500">
              {statusCounts.selesai}
            </span>
          </div>
        </div>
      </section>

      {/* ---------- POSISI ---------- */}
      <section className="mb-7">
        <SectionHead
          title="Posisi fisik unit"
          note={`${tickets.length} tiket · klik untuk lihat daftar`}
        />
        <div className="flex flex-wrap gap-2">
          {posisiStats.map((p) => {
            const isOpen = expandedPosisi === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setExpandedPosisi(isOpen ? null : p.key)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 transition",
                  isOpen
                    ? "border-brand bg-yellow-50 dark:bg-yellow-900/20"
                    : p.key === POSISI_UNSET
                      ? "border-red-200 dark:border-red-900/50 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                )}
              >
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {p.label}
                </span>
                <span
                  className={cn(
                    "text-base font-bold",
                    p.key === POSISI_UNSET
                      ? "text-red-600 dark:text-red-400"
                      : "text-gray-900 dark:text-gray-100"
                  )}
                >
                  {p.total}
                </span>
                {isOpen ? (
                  <ChevronDown size={14} className="text-gray-400" />
                ) : (
                  <ChevronRight size={14} className="text-gray-400" />
                )}
              </button>
            );
          })}
          {posisiStats.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Belum ada tiket.
            </p>
          )}
        </div>

        {expandedPosisi && (
          <div className="mt-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
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
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------- TABEL CABANG ---------- */}
      <section className="mb-7">
        <SectionHead
          title="Tiket per cabang"
          note={`${branchRows.length} cabang`}
        />

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex-wrap">
            <div className="inline-flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
              {SORTS.map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setSortir(value)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition",
                    sortir === value
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {bandFilter !== null && (
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                Disaring: cabang dengan tiket {BANDS[bandFilter].label}{" "}
                <button
                  onClick={() => setBandFilter(null)}
                  className="text-brand underline"
                >
                  hapus
                </button>
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 text-[11px] uppercase tracking-wide">
                  <th className="px-4 py-2.5 font-medium text-left">Cabang</th>
                  <th className="px-4 py-2.5 font-medium text-right">Aktif</th>
                  <th className="px-4 py-2.5 font-medium text-right hidden sm:table-cell">
                    &lt;{AGE_BANDS.pantau}h
                  </th>
                  <th className="px-4 py-2.5 font-medium text-right">
                    {AGE_BANDS.pantau}–{AGE_BANDS.tindak - 1}h
                  </th>
                  <th className="px-4 py-2.5 font-medium text-right">
                    {AGE_BANDS.tindak}–{AGE_BANDS.eskalasi - 1}h
                  </th>
                  <th className="px-4 py-2.5 font-medium text-right">
                    ≥{AGE_BANDS.eskalasi}h
                  </th>
                  <th className="px-4 py-2.5 font-medium text-right hidden sm:table-cell">
                    Tertua
                  </th>
                  <th className="px-4 py-2.5 font-medium text-left hidden md:table-cell w-36">
                    Sebaran umur
                  </th>
                </tr>
              </thead>
              <tbody>
                {branchRows.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-gray-50 dark:border-gray-700/60 last:border-0"
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                      {b.nama}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">
                      {b.aktif}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300 hidden sm:table-cell">
                      {b.bands[0] || (
                        <span className="text-gray-300 dark:text-gray-600">0</span>
                      )}
                    </td>
                    {[1, 2, 3].map((i) => (
                      <td key={i} className="px-4 py-2.5 text-right">
                        {b.bands[i] ? (
                          <span
                            className={cn(
                              "inline-block min-w-[24px] px-1.5 py-0.5 rounded font-bold text-xs",
                              BANDS[i].pill
                            )}
                          >
                            {b.bands[i]}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">0</span>
                        )}
                      </td>
                    ))}
                    <td
                      className={cn(
                        "px-4 py-2.5 text-right hidden sm:table-cell",
                        b.tertua >= AGE_BANDS.eskalasi
                          ? "text-red-600 dark:text-red-400 font-medium"
                          : "text-gray-600 dark:text-gray-300"
                      )}
                    >
                      {b.tertua}h
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      {b.aktif > 0 && (
                        <span className="flex h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                          {BANDS.map((band) => (
                            <span
                              key={band.key}
                              className={band.bar}
                              style={{
                                width: `${(b.bands[band.key] / b.aktif) * 100}%`,
                              }}
                            />
                          ))}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {branchRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-gray-400 dark:text-gray-500"
                    >
                      Belum ada tiket.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 px-4 py-3 border-t border-gray-100 dark:border-gray-700 leading-relaxed">
            Umur dihitung dari tanggal unit diterima sampai hari ini, hanya
            untuk tiket yang belum selesai. Ambang {AGE_BANDS.pantau}/
            {AGE_BANDS.tindak}/{AGE_BANDS.eskalasi} hari sebaiknya disamakan
            dengan tabel <code>aging_rules</code> supaya dashboard dan digest
            harian tidak saling membantah.
          </p>
        </div>
      </section>

      {/* ---------- TIKET ≥30 HARI ---------- */}
      <section>
        <SectionHead
          title={`Tiket ≥ ${AGE_BANDS.eskalasi} hari`}
          note={`${escalated.length} tiket · perlu eskalasi`}
        />

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {escalated.length === 0 ? (
            <div className="flex items-center gap-2 px-5 py-6 text-sm text-gray-400 dark:text-gray-500">
              <Flame size={16} className="text-gray-300 dark:text-gray-600" />
              Tidak ada tiket yang mengendap lebih dari {AGE_BANDS.eskalasi}{" "}
              hari. Mantap.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 text-[11px] uppercase tracking-wide">
                    <th className="px-4 py-2.5 font-medium text-left">
                      No. Service
                    </th>
                    <th className="px-4 py-2.5 font-medium text-left">Cabang</th>
                    <th className="px-4 py-2.5 font-medium text-left">Barang</th>
                    <th className="px-4 py-2.5 font-medium text-left hidden sm:table-cell">
                      Posisi Unit
                    </th>
                    <th className="px-4 py-2.5 font-medium text-left">Status</th>
                    <th className="px-4 py-2.5 font-medium text-right">Umur</th>
                  </tr>
                </thead>
                <tbody>
                  {escalated.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-gray-50 dark:border-gray-700/60 last:border-0"
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {t.no_service}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {t.branch?.name ?? "-"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                        {t.kode_barang}
                        <span className="text-gray-400 dark:text-gray-500">
                          {" · "}
                          {t.serial_number}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 hidden sm:table-cell">
                        {t.posisi_unit || "-"}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
                        {ticketAgeDays(t)} hari
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SectionHead({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex items-baseline gap-2.5 mb-2.5 flex-wrap">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {title}
      </h3>
      <span className="text-[11px] text-gray-400 dark:text-gray-500">
        {note}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={cn(
        "text-xs font-medium px-2 py-1 rounded whitespace-nowrap",
        STATUS_COLORS[status]
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
