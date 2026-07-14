"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { createBrand, listBrands, updateBrand } from "@/lib/brands";
import type { Brand } from "@/types";
import { cn } from "@/lib/utils";

export function BrandsPanel() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [waNumber, setWaNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    listBrands()
      .then(setBrands)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createBrand({ name, wa_number: waNumber || null });
      setName("");
      setWaNumber("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah brand");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (b: Brand) => {
    try {
      await updateBrand(b.id, { is_active: !b.is_active });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah brand");
    }
  };

  const editWaNumber = async (b: Brand) => {
    const value = window.prompt(`No. WhatsApp untuk ${b.name}`, b.wa_number ?? "");
    if (value === null) return;
    try {
      await updateBrand(b.id, { wa_number: value || null });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah brand");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Master Brand
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {brands.length} brand — dipakai buat follow-up via WhatsApp
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-brand text-gray-900 font-semibold text-sm px-4 py-2.5 rounded-lg hover:brightness-95"
        >
          <Plus size={16} />
          Tambah Brand
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6 grid grid-cols-2 gap-4 items-end"
        >
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nama Brand
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mis. Acer, Lenovo, Asus"
              className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              No. WhatsApp (opsional)
            </span>
            <input
              value={waNumber}
              onChange={(e) => setWaNumber(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <div className="col-span-2 flex justify-end gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-gray-900 bg-brand rounded-lg hover:brightness-95 disabled:opacity-60"
            >
              Simpan
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Memuat...</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">WhatsApp</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-gray-50 dark:border-gray-700/60 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {b.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {b.wa_number || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-1 rounded",
                        b.is_active
                          ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      )}
                    >
                      {b.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button
                      onClick={() => editWaNumber(b)}
                      className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    >
                      Ubah WA
                    </button>
                    <button
                      onClick={() => toggleActive(b)}
                      className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    >
                      {b.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </td>
                </tr>
              ))}
              {brands.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-gray-400 dark:text-gray-500"
                  >
                    Belum ada brand.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
