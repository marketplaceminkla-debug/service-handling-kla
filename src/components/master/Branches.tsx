"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { createBranch, listBranches, updateBranch } from "@/lib/branches";
import type { Branch } from "@/types";
import { cn, errorMessage } from "@/lib/utils";

export function BranchesPanel() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [waNumber, setWaNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editWa, setEditWa] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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
      setError(errorMessage(err, "Gagal menambah cabang"));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (b: Branch) => {
    try {
      await updateBranch(b.id, { is_active: !b.is_active });
      load();
    } catch (err) {
      setError(errorMessage(err, "Gagal mengubah cabang"));
    }
  };

  const startEdit = (b: Branch) => {
    setEditingId(b.id);
    setEditName(b.name);
    setEditCode(b.code);
    setEditWa(b.wa_number ?? "");
    setError(null);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    setSavingEdit(true);
    setError(null);
    try {
      await updateBranch(id, {
        name: editName.trim(),
        code: editCode.trim(),
        wa_number: editWa.trim() || null,
      });
      setEditingId(null);
      load();
    } catch (err) {
      setError(errorMessage(err, "Gagal menyimpan perubahan"));
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Master Cabang
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {branches.length} cabang
          </p>
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
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6 grid grid-cols-3 gap-4 items-end"
        >
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nama Cabang
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kode
            </span>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
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
        <p className="text-sm text-gray-400 dark:text-gray-500">Memuat...</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Kode</th>
                <th className="px-4 py-3 font-medium">WhatsApp</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => {
                const isEditing = editingId === b.id;
                return (
                  <tr
                    key={b.id}
                    className="border-b border-gray-50 dark:border-gray-700/60 last:border-0"
                  >
                    {isEditing ? (
                      <>
                        <td className="px-4 py-2.5">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            value={editCode}
                            onChange={(e) => setEditCode(e.target.value)}
                            className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            value={editWa}
                            onChange={(e) => setEditWa(e.target.value)}
                            className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand"
                          />
                        </td>
                        <td className="px-4 py-2.5">
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
                        <td className="px-4 py-2.5 text-right space-x-3 whitespace-nowrap">
                          <button
                            onClick={cancelEdit}
                            className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                          >
                            Batal
                          </button>
                          <button
                            onClick={() => saveEdit(b.id)}
                            disabled={savingEdit}
                            className="text-xs font-semibold text-gray-900 bg-brand px-2.5 py-1 rounded hover:brightness-95 disabled:opacity-60"
                          >
                            {savingEdit ? "Menyimpan..." : "Simpan"}
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                          {b.name}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {b.code}
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
                        <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                          <button
                            onClick={() => startEdit(b)}
                            title="Edit cabang"
                            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                          <button
                            onClick={() => toggleActive(b)}
                            className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                          >
                            {b.is_active ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              {branches.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-400 dark:text-gray-500"
                  >
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
