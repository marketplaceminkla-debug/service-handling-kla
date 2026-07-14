"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil } from "lucide-react";
import { ageLevel, listTickets, ticketAgeDays, isStuck } from "@/lib/tickets";
import { listBranches } from "@/lib/branches";
import { listBrands } from "@/lib/brands";
import {
  KATEGORI_LABEL,
  STATUS_LABEL,
  type Branch,
  type Brand,
  type TicketKategori,
  type TicketStatus,
  type TicketWithBranch,
} from "@/types";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  baru: "bg-blue-50 text-blue-700",
  diproses: "bg-yellow-50 text-yellow-800",
  tunggu_sparepart: "bg-orange-50 text-orange-700",
  selesai: "bg-green-50 text-green-700",
};

const AGE_COLORS: Record<string, string> = {
  urgent: "bg-red-50 text-red-700",
  warning: "bg-orange-50 text-orange-700",
  normal: "bg-green-50 text-green-700",
};

export function TicketList({
  onNew,
  onSelect,
  onEdit,
}: {
  onNew: () => void;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
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

  useEffect(() => {
    Promise.all([listTickets(), listBranches(), listBrands()])
      .then(([t, b, br]) => {
        setTickets(t);
        setBranches(b);
        setBrands(br);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (branchFilter && t.branch_id !== branchFilter) return false;
      if (brandFilter && t.brand_id !== brandFilter) return false;
      if (kategoriFilter && t.kategori !== kategoriFilter) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (
        q &&
        !`${t.no_service} ${t.kode_barang} ${t.serial_number}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [tickets, search, branchFilter, brandFilter, kategoriFilter, statusFilter]);

  if (loading) return <p className="text-sm text-gray-400">Memuat tiket...</p>;
  if (error) return <p className="text-sm text-danger">{error}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tiket Servis</h2>
          <p className="text-sm text-gray-500">{filtered.length} tiket</p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-2 bg-brand text-gray-900 font-semibold text-sm px-4 py-2.5 rounded-lg hover:brightness-95"
        >
          <Plus size={16} />
          Lapor Unit Baru
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari no. service, kode barang, SN..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
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
          className="text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
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
          className="text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
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
          className="text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">Semua Status</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-4 py-3 font-medium">No. Service</th>
              <th className="px-4 py-3 font-medium">Cabang</th>
              <th className="px-4 py-3 font-medium">Brand</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Kode Barang</th>
              <th className="px-4 py-3 font-medium">Posisi Unit</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Lama di Servis</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr
                key={t.id}
                onClick={() => onSelect(t.id)}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                  {t.no_service}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {t.branch?.name ?? "-"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {t.brand?.name ?? "-"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {KATEGORI_LABEL[t.kategori]}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {t.kode_barang} · {t.serial_number}
                </td>
                <td className="px-4 py-3 text-gray-600">
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
                          level ? AGE_COLORS[level] : "text-gray-500"
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
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(t.id);
                    }}
                    title="Edit tiket"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <Pencil size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
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
