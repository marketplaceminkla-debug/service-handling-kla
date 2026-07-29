"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Pencil, Plus, Trash2, UploadCloud } from "lucide-react";
import { listBrands } from "@/lib/brands";
import {
  createProductCatalogEntry,
  deleteProductCatalogEntry,
  listProductCatalog,
  updateProductCatalogEntry,
} from "@/lib/productCatalog";
import {
  importProductCatalog,
  parseProductCatalogExcel,
  type CatalogImportResult,
  type ParsedCatalogRow,
} from "@/lib/productCatalogImport";
import type { Brand, ProductCatalogEntryWithBrand } from "@/types";
import { cn, errorMessage } from "@/lib/utils";

export function ProductCatalogPanel() {
  const [items, setItems] = useState<ProductCatalogEntryWithBrand[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const [namaBarang, setNamaBarang] = useState("");
  const [kodeBarang, setKodeBarang] = useState("");
  const [merk, setMerk] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNamaBarang, setEditNamaBarang] = useState("");
  const [editKodeBarang, setEditKodeBarang] = useState("");
  const [editMerk, setEditMerk] = useState("");
  const [editKeterangan, setEditKeterangan] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [importRows, setImportRows] = useState<ParsedCatalogRow[]>([]);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [parsingImport, setParsingImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<CatalogImportResult | null>(
    null
  );

  const load = () => {
    setLoading(true);
    Promise.all([listProductCatalog(), listBrands()])
      .then(([catalog, brandList]) => {
        setItems(catalog);
        setBrands(brandList);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.nama_barang.toLowerCase().includes(q) ||
        (i.kode_barang ?? "").toLowerCase().includes(q) ||
        (i.brand?.name ?? "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createProductCatalogEntry({
        nama_barang: namaBarang,
        kode_barang: kodeBarang || null,
        brand_name: merk,
        keterangan: keterangan || null,
      });
      setNamaBarang("");
      setKodeBarang("");
      setMerk("");
      setKeterangan("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(errorMessage(err, "Gagal menambah data barang"));
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (item: ProductCatalogEntryWithBrand) => {
    setEditingId(item.id);
    setEditNamaBarang(item.nama_barang);
    setEditKodeBarang(item.kode_barang ?? "");
    setEditMerk(item.brand?.name ?? "");
    setEditKeterangan(item.keterangan ?? "");
    setError(null);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    setSavingEdit(true);
    setError(null);
    try {
      await updateProductCatalogEntry(id, {
        nama_barang: editNamaBarang,
        kode_barang: editKodeBarang || null,
        brand_name: editMerk,
        keterangan: editKeterangan || null,
      });
      setEditingId(null);
      load();
    } catch (err) {
      setError(errorMessage(err, "Gagal menyimpan perubahan"));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus data barang ini dari Database Merk?")) return;
    try {
      await deleteProductCatalogEntry(id);
      load();
    } catch (err) {
      setError(errorMessage(err, "Gagal menghapus data"));
    }
  };

  const toggleImport = () => {
    setShowImport((v) => !v);
    setImportRows([]);
    setImportFileName(null);
    setImportError(null);
    setImportResult(null);
  };

  const handleImportFile = async (file: File) => {
    setImportError(null);
    setImportResult(null);
    setParsingImport(true);
    setImportFileName(file.name);
    try {
      const parsed = await parseProductCatalogExcel(file);
      if (parsed.length === 0) {
        setImportError("Tidak ada baris data yang kebaca dari file ini.");
      }
      setImportRows(parsed);
    } catch (err) {
      setImportError(
        errorMessage(err, "Gagal membaca file Excel")
      );
      setImportRows([]);
    } finally {
      setParsingImport(false);
    }
  };

  const handleImportConfirm = async () => {
    setImporting(true);
    setImportError(null);
    try {
      const res = await importProductCatalog(importRows);
      setImportResult(res);
      setImportRows([]);
      setImportFileName(null);
      load();
    } catch (err) {
      setImportError(errorMessage(err, "Gagal import data"));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Database Merk
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {items.length} nama barang terdaftar — dipakai buat auto-isi Brand
            saat upload Excel tiket servis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleImport}
            className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <UploadCloud size={16} />
            Import Excel
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 bg-brand text-gray-900 font-semibold text-sm px-4 py-2.5 rounded-lg hover:brightness-95"
          >
            <Plus size={16} />
            Tambah Barang
          </button>
        </div>
      </div>

      <datalist id="merk-options">
        {brands.map((b) => (
          <option key={b.id} value={b.name} />
        ))}
      </datalist>

      {showImport && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Upload Excel dengan kolom <strong>Nama Barang</strong>, Kode,
            Merk, dan Keterangan (opsional). Barang yang nama-nya sudah ada
            bakal di-update, yang belum ada bakal jadi entry baru. Merk yang
            belum terdaftar otomatis dibuat.
          </p>
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg py-10 cursor-pointer hover:border-brand transition">
            <UploadCloud size={28} className="text-gray-400 dark:text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {importFileName ?? "Klik buat pilih file .xlsx"}
            </span>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
              }}
            />
          </label>

          {parsingImport && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-4">
              Membaca file...
            </p>
          )}

          {importError && (
            <p className="text-sm text-danger bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50 rounded-lg px-3 py-2 mt-4">
              {importError}
            </p>
          )}

          {importResult && (
            <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/50 rounded-lg px-4 py-3 text-sm text-green-800 dark:text-green-300">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 size={16} />
                Import selesai
              </div>
              <p className="mt-1">
                {importResult.totalRows} baris terbaca ·{" "}
                {importResult.created} barang baru · {importResult.updated}{" "}
                barang ter-update
                {importResult.brandsCreated.length > 0 &&
                  ` · ${importResult.brandsCreated.length} merk baru otomatis dibuat (${importResult.brandsCreated.join(", ")})`}
              </p>
              {importResult.skipped.length > 0 && (
                <div className="mt-2">
                  <p className="flex items-center gap-1 text-yellow-800 dark:text-yellow-300 font-medium">
                    <AlertTriangle size={14} />
                    {importResult.skipped.length} baris dilewati
                  </p>
                  <ul className="mt-1 space-y-0.5 text-yellow-800/90 dark:text-yellow-300/80">
                    {importResult.skipped.map((s, i) => (
                      <li key={i}>
                        {s.nama_barang}: {s.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {importRows.length > 0 && (
            <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  Preview ({importRows.length} baris)
                </h3>
                <button
                  onClick={handleImportConfirm}
                  disabled={importing}
                  className={cn(
                    "px-4 py-2 text-sm font-semibold text-gray-900 bg-brand rounded-lg hover:brightness-95",
                    importing && "opacity-60"
                  )}
                >
                  {importing ? "Memproses..." : "Proses Import"}
                </button>
              </div>
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-gray-800">
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                      <th className="px-4 py-2 font-medium">Nama Barang</th>
                      <th className="px-4 py-2 font-medium">Kode</th>
                      <th className="px-4 py-2 font-medium">Merk</th>
                      <th className="px-4 py-2 font-medium">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map((r, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-50 dark:border-gray-700/60 last:border-0"
                      >
                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                          {r.nama_barang}
                        </td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                          {r.kode_barang || "-"}
                        </td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                          {r.merk || "-"}
                        </td>
                        <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                          {r.keterangan || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6 grid grid-cols-2 gap-4 items-end"
        >
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nama Barang
            </span>
            <input
              required
              value={namaBarang}
              onChange={(e) => setNamaBarang(e.target.value)}
              placeholder="mis. Aspire Lite AL14-37P-32AV"
              className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kode Barang (opsional)
            </span>
            <input
              value={kodeBarang}
              onChange={(e) => setKodeBarang(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Merk
            </span>
            <input
              required
              list="merk-options"
              value={merk}
              onChange={(e) => setMerk(e.target.value)}
              placeholder="Pilih atau ketik merk baru"
              className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Keterangan (opsional)
            </span>
            <input
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
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

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cari nama barang, kode barang, atau merk..."
        className="w-full mb-4 text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand"
      />

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Memuat...</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="max-h-[70vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-gray-800">
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="px-4 py-3 font-medium">Nama Barang</th>
                  <th className="px-4 py-3 font-medium">Kode Barang</th>
                  <th className="px-4 py-3 font-medium">Merk</th>
                  <th className="px-4 py-3 font-medium">Keterangan</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const isEditing = editingId === item.id;
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-gray-50 dark:border-gray-700/60 last:border-0"
                    >
                      {isEditing ? (
                        <>
                          <td className="px-4 py-2.5">
                            <input
                              value={editNamaBarang}
                              onChange={(e) => setEditNamaBarang(e.target.value)}
                              className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand"
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              value={editKodeBarang}
                              onChange={(e) => setEditKodeBarang(e.target.value)}
                              className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand"
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              list="merk-options"
                              value={editMerk}
                              onChange={(e) => setEditMerk(e.target.value)}
                              className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand"
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              value={editKeterangan}
                              onChange={(e) => setEditKeterangan(e.target.value)}
                              className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-right space-x-3 whitespace-nowrap">
                            <button
                              onClick={cancelEdit}
                              className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                            >
                              Batal
                            </button>
                            <button
                              onClick={() => saveEdit(item.id)}
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
                            {item.nama_barang}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                            {item.kode_barang || "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                            {item.brand?.name || "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                            {item.keterangan || "-"}
                          </td>
                          <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                            <button
                              onClick={() => startEdit(item)}
                              title="Edit"
                              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                            >
                              <Pencil size={12} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              title="Hapus"
                              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-danger"
                            >
                              <Trash2 size={12} />
                              Hapus
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-400 dark:text-gray-500"
                    >
                      {items.length === 0
                        ? "Belum ada data barang."
                        : "Tidak ada hasil yang cocok."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
