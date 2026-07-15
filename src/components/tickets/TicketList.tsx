"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  MessageCircle,
  History,
  FileDown,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { ageLevel, listTickets, ticketAgeDays, isStuck } from "@/lib/tickets";
import { listBranches } from "@/lib/branches";
import { listBrands } from "@/lib/brands";
import { BulkFollowUpPanel } from "@/components/tickets/BulkFollowUpPanel";
import { InlineEditTicketRow } from "@/components/tickets/InlineEditTicketRow";
import { ExportExcelPanel } from "@/components/tickets/ExportExcelPanel";
import {
  KATEGORI_LABEL,
  POSISI_UNIT_OPTIONS,
  STATUS_LABEL,
  type Branch,
  type Brand,
  type TicketKategori,
  type TicketStatus,
  type TicketWithBranch,
} from "@/types";

const POSISI_UNIT_EMPTY = "__kosong__";
import { cn, formatDateOnly } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  baru: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  diproses:
    "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
  tunggu_sparepart:
    "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  selesai: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300",
};

const AGE_COLORS: Record<string, string> = {
  urgent: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  warning: "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  normal: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300",
};

export function TicketList({
  onNew,
  onSelect,
}: {
  onNew: () => void;
  onSelect: (id: string) => void;
}) {
  const [tickets, setTickets] = useState<TicketWithBranch[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState<TicketKategori | "">("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "">("");
  const [posisiUnitFilter, setPosisiUnitFilter] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [sort, setSort] = useState<{
    field: "age" | "tanggal_masuk";
    dir: "asc" | "desc";
  } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([listTickets(), listBranches(), listBrands()])
      .then(([t, b, br]) => {
        setTickets(t);
        setBranches(b);
        setBrands(br);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (branchFilter && t.branch_id !== branchFilter) return false;
      if (brandFilter && t.brand_id !== brandFilter) return false;
      if (kategoriFilter && t.kategori !== kategoriFilter) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (posisiUnitFilter) {
        if (posisiUnitFilter === POSISI_UNIT_EMPTY) {
          if (t.posisi_unit) return false;
        } else if (t.posisi_unit !== posisiUnitFilter) {
          return false;
        }
      }
      if (
        q &&
        !`${t.no_service} ${t.kode_barang} ${t.serial_number}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [
    tickets,
    search,
    branchFilter,
    brandFilter,
    kategoriFilter,
    statusFilter,
    posisiUnitFilter,
  ]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      let diff = 0;
      if (sort.field === "age") {
        diff = ticketAgeDays(a) - ticketAgeDays(b);
      } else {
        const av = a.tanggal_masuk;
        const bv = b.tanggal_masuk;
        if (!av && !bv) diff = 0;
        else if (!av) diff = 1;
        else if (!bv) diff = -1;
        else diff = av < bv ? -1 : av > bv ? 1 : 0;
      }
      return sort.dir === "asc" ? diff : -diff;
    });
    return copy;
  }, [filtered, sort]);

  const toggleSort = (field: "age" | "tanggal_masuk") => {
    setSort((prev) => {
      if (!prev || prev.field !== field) return { field, dir: "desc" };
      return { field, dir: prev.dir === "desc" ? "asc" : "desc" };
    });
  };

  const selectedTickets = useMemo(
    () => tickets.filter((t) => selectedIds.has(t.id)),
    [tickets, selectedIds]
  );

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((t) => selectedIds.has(t.id));

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        filtered.forEach((t) => next.delete(t.id));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach((t) => next.add(t.id));
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading)
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500">
        Memuat tiket...
      </p>
    );
  if (error) return <p className="text-sm text-danger">{error}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Tiket Servis
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filtered.length} tiket
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowExportPanel((v) => !v)}
            className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium text-sm px-4 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <FileDown size={16} />
            Export Excel
          </button>
          <button
            onClick={onNew}
            className="flex items-center gap-2 bg-brand text-gray-900 font-semibold text-sm px-4 py-2.5 rounded-lg hover:brightness-95"
          >
            <Plus size={16} />
            Lapor Unit Baru
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari no. service, kode barang, SN..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">Semua Cabang</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">Semua Brand</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={kategoriFilter}
          onChange={(e) =>
            setKategoriFilter(e.target.value as TicketKategori | "")
          }
          className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">Semua Kategori</option>
          {Object.entries(KATEGORI_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TicketStatus | "")}
          className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">Semua Status</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={posisiUnitFilter}
          onChange={(e) => setPosisiUnitFilter(e.target.value)}
          className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">Semua Posisi Unit</option>
          {POSISI_UNIT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
          <option value={POSISI_UNIT_EMPTY}>- Belum diisi -</option>
        </select>
      </div>

      {showExportPanel && (
        <ExportExcelPanel
          tickets={filtered}
          onClose={() => setShowExportPanel(false)}
        />
      )}

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-900/20 border border-brand/40 rounded-xl px-4 py-3 mb-4">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {selectedIds.size} tiket dipilih
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Batal Pilih
            </button>
            <button
              onClick={() => setShowBulkPanel(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-900 bg-brand rounded-lg hover:brightness-95"
            >
              <MessageCircle size={15} />
              Follow Up Terpilih
            </button>
          </div>
        </div>
      )}

      {showBulkPanel && selectedTickets.length > 0 && (
        <BulkFollowUpPanel
          tickets={selectedTickets}
          onClose={() => setShowBulkPanel(false)}
          onDone={() => {
            setShowBulkPanel(false);
            setSelectedIds(new Set());
            load();
          }}
        />
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
              <th className="px-4 py-3 font-medium w-10">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
              </th>
              <th className="px-4 py-3 font-medium">No. Service</th>
              <th className="px-4 py-3 font-medium">
                <button
                  onClick={() => toggleSort("tanggal_masuk")}
                  className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100"
                  title="Urutkan berdasarkan tanggal masuk"
                >
                  Tanggal Masuk
                  <SortIcon active={sort?.field === "tanggal_masuk"} dir={sort?.dir} />
                </button>
              </th>
              <th className="px-4 py-3 font-medium">Cabang</th>
              <th className="px-4 py-3 font-medium">Brand</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Kode Barang</th>
              <th className="px-4 py-3 font-medium">Posisi Unit</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">
                <button
                  onClick={() => toggleSort("age")}
                  className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100"
                  title="Urutkan berdasarkan lama di servis"
                >
                  Lama di Servis
                  <SortIcon active={sort?.field === "age"} dir={sort?.dir} />
                </button>
              </th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => (
              <Fragment key={t.id}>
                <tr
                  className={cn(
                    "border-b border-gray-50 dark:border-gray-700/60 last:border-0",
                    selectedIds.has(t.id) && "bg-yellow-50/60 dark:bg-yellow-900/10"
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(t.id)}
                      onChange={() => toggleOne(t.id)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {t.no_service}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {t.tanggal_masuk ? formatDateOnly(t.tanggal_masuk) : "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {t.branch?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {t.brand?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {KATEGORI_LABEL[t.kategori]}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {t.kode_barang} · {t.serial_number}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {t.posisi_unit || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-1 rounded",
                        STATUS_COLORS[t.status]
                      )}
                    >
                      {STATUS_LABEL[t.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const level = ageLevel(t);
                      return (
                        <span
                          className={cn(
                            "text-xs font-medium px-2 py-1 rounded",
                            level
                              ? AGE_COLORS[level]
                              : "text-gray-500 dark:text-gray-400"
                          )}
                        >
                          {ticketAgeDays(t)} hari
                        </span>
                      );
                    })()}
                    {isStuck(t) && (
                      <span className="ml-2 text-danger font-medium text-xs">
                        macet
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => onSelect(t.id)}
                      title="Follow Up & Riwayat"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <History size={15} />
                    </button>
                    <button
                      onClick={() =>
                        setEditingId(editingId === t.id ? null : t.id)
                      }
                      title="Edit tiket"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Pencil size={15} />
                    </button>
                  </td>
                </tr>
                {editingId === t.id && (
                  <InlineEditTicketRow
                    ticket={t}
                    branches={branches}
                    brands={brands}
                    colSpan={11}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => {
                      setEditingId(null);
                      load();
                    }}
                  />
                )}
              </Fragment>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-8 text-center text-gray-400 dark:text-gray-500"
                >
                  Belum ada tiket.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortIcon({
  active,
  dir,
}: {
  active?: boolean;
  dir?: "asc" | "desc";
}) {
  if (!active) return <ArrowUpDown size={13} className="opacity-40" />;
  return dir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />;
}
