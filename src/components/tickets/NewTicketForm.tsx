"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { listBranches } from "@/lib/branches";
import { listBrands } from "@/lib/brands";
import { createTicket } from "@/lib/tickets";
import { PosisiUnitSelect } from "@/components/tickets/PosisiUnitSelect";
import type { Branch, Brand, TicketKategori } from "@/types";

export function NewTicketForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: () => void;
}) {
  const { profile } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [noService, setNoService] = useState("");
  const [branchId, setBranchId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [kategori, setKategori] = useState<TicketKategori>("stok");
  const [kodeBarang, setKodeBarang] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [estimasi, setEstimasi] = useState("");
  const [posisiUnit, setPosisiUnit] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [tanggalMasuk, setTanggalMasuk] = useState("");

  useEffect(() => {
    Promise.all([listBranches(), listBrands()])
      .then(([b, br]) => {
        setBranches(b.filter((x) => x.is_active));
        setBrands(br.filter((x) => x.is_active));
      })
      .catch((e) => setError(e.message));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createTicket({
        no_service: noService.trim(),
        branch_id: branchId,
        brand_id: brandId || null,
        kategori,
        kode_barang: kodeBarang.trim(),
        serial_number: serialNumber.trim(),
        estimasi: estimasi.trim() || null,
        posisi_unit: posisiUnit.trim() || null,
        keterangan: keterangan.trim() || null,
        tanggal_masuk: tanggalMasuk || null,
        reported_by: profile?.id ?? null,
        reported_by_name: profile?.full_name || profile?.email || null,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan tiket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <button
        onClick={onCancel}
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 mb-4"
      >
        <ArrowLeft size={16} />
        Kembali
      </button>

      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Lapor Unit Bermasalah
      </h2>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="No. Service">
            <input
              required
              value={noService}
              onChange={(e) => setNoService(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Cabang">
            <select
              required
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="input"
            >
              <option value="">Pilih cabang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
          <Field label="Brand (opsional)">
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Tanggal Masuk">
            <input
              type="date"
              value={tanggalMasuk}
              onChange={(e) => setTanggalMasuk(e.target.value)}
              className="input dark:[color-scheme:dark]"
            />
          </Field>
          <Field label="Estimasi">
            <input
              value={estimasi}
              onChange={(e) => setEstimasi(e.target.value)}
              placeholder="mis. 3 hari kerja"
              className="input"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Kode Barang">
            <input
              required
              value={kodeBarang}
              onChange={(e) => setKodeBarang(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Serial Number">
            <input
              required
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className="input"
            />
          </Field>
        </div>

        <Field label="Posisi Unit">
          <PosisiUnitSelect value={posisiUnit} onChange={setPosisiUnit} />
        </Field>

        <Field label="Keterangan">
          <textarea
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            rows={3}
            className="input"
          />
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 text-sm font-semibold text-gray-900 bg-brand rounded-lg hover:brightness-95 disabled:opacity-60"
          >
            Simpan Tiket
          </button>
        </div>

        <style jsx>{`
          .input {
            width: 100%;
            border: 1px solid #d1d5db;
            border-radius: 0.5rem;
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
            color: #111827;
          }
          .input:focus {
            outline: none;
            box-shadow: 0 0 0 2px #f5c200;
          }
          :global(.dark) .input {
            border-color: #4b5563;
            background: #111827;
            color: #f3f4f6;
          }
        `}</style>
      </form>
    </div>
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
      <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
