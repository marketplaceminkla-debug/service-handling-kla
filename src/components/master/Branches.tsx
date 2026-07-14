"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { createBranch, listBranches, updateBranch } from "@/lib/branches";
import type { Branch } from "@/types";
import { cn } from "@/lib/utils";

export function BranchesPanel() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [waNumber, setWaNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    listBranches()
      .then(setBranches)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createBranch({ name, code, wa_number: waNumber || null });
      setName("");
      setCode("");
      setWaNumber("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah cabang");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (b: Branch) => {
    try {
      await updateBranch(b.id, { is_active: !b.is_active });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah cabang");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Master Cabang</h2>
          <p className="text-sm text-gray-500">{branches.length} cabang</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-brand text-gray-900 font-semibold text-sm px-4 py-2.5 rounded-lg hover:brightness-95"
        >
          <Plus size={16} />
          Tambah Cabang
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-200 p-6 mb-6 grid grid-cols-3 gap-4 items-end"
        >
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Nama Cabang
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Kode
            </span>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">
              No. WhatsApp (opsional)
            </span>
            <input
              value={waNumber}
              onChange={(e) => setWaNumber(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <div className="col-span-3 flex justify-end gap-3">
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
        <p className="text-sm text-gray-400">Memuat...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Kode</th>
                <th className="px-4 py-3 font-medium">WhatsApp</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-gray-50 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {b.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.code}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {b.wa_number || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-1 rounded",
                        b.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      )}
                    >
                      {b.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleActive(b)}
                      className="text-xs font-medium text-gray-500 hover:text-gray-900"
                    >
                      {b.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </td>
                </tr>
              ))}
              {branches.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Belum ada cabang.
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
