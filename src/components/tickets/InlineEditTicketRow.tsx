"use client";

import { useState } from "react";
import { updateTicket } from "@/lib/tickets";
import {
  STATUS_LABEL,
  type Branch,
  type Brand,
  type TicketKategori,
  type TicketStatus,
  type TicketWithBranch,
} from "@/types";

export function InlineEditTicketRow({
  ticket,
  branches,
  brands,
  colSpan,
  onCancel,
  onSaved,
}: {
  ticket: TicketWithBranch;
  branches: Branch[];
  brands: Brand[];
  colSpan: number;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [branchId, setBranchId] = useState(ticket.branch_id);
  const [brandId, setBrandId] = useState(ticket.brand_id ?? "");
  const [kategori, setKategori] = useState<TicketKategori>(ticket.kategori);
  const [kodeBarang, setKodeBarang] = useState(ticket.kode_barang);
  const [serialNumber, setSerialNumber] = useState(ticket.serial_number);
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [estimasi, setEstimasi] = useState(ticket.estimasi ?? "");
  const [posisiUnit, setPosisiUnit] = useState(ticket.posisi_unit ?? "");
  const [keterangan, setKeterangan] = useState(ticket.keterangan ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateTicket(ticket.id, {
        branch_id: branchId,
        brand_id: brandId || null,
        kategori,
        kode_barang: kodeBarang.trim(),
        serial_number: serialNumber.trim(),
        status,
        estimasi: estimasi.trim() || null,
        posisi_unit: posisiUnit.trim() || null,
        keterangan: keterangan.trim() || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="bg-yellow-50/40">
      <td colSpan={colSpan} className="px-4 py-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Cabang">
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="input"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Brand">
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="input"
            >
              <option value="">- Belum diisi -</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kategori">
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value as TicketKategori)}
              className="input"
            >
              <option value="stok">Stok</option>
              <option value="user">User</option>
            </select>
          </Field>
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TicketStatus)}
              className="input"
            >
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kode Barang">
            <input
              value={kodeBarang}
              onChange={(e) => setKodeBarang(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Serial Number">
            <input
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Estimasi">
            <input
              value={estimasi}
              onChange={(e) => setEstimasi(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Posisi Unit">
            <input
              value={posisiUnit}
              onChange={(e) => setPosisiUnit(e.target.value)}
              className="input"
            />
          </Field>
          <div className="col-span-2 md:col-span-4">
            <Field label="Keterangan">
              <textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                rows={2}
                className="input"
              />
            </Field>
          </div>
        </div>

        {error && <p className="text-sm text-danger mt-3">{error}</p>}

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100"
          >
            Batal
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-gray-900 bg-brand rounded-lg hover:brightness-95 disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>

        <style jsx>{`
          .input {
            width: 100%;
            border: 1px solid #d1d5db;
            border-radius: 0.5rem;
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
            background: white;
          }
          .input:focus {
            outline: none;
            box-shadow: 0 0 0 2px #f9c227;
          }
        `}</style>
      </td>
    </tr>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
