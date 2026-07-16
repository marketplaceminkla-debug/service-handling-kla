"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  addFollowUp,
  buildFollowUpMessage,
  getTicket,
  listTicketUpdates,
  ticketAgeDays,
  updateTicket,
  waLink,
} from "@/lib/tickets";
import { listBranches } from "@/lib/branches";
import { listBrands } from "@/lib/brands";
import { PosisiUnitSelect } from "@/components/tickets/PosisiUnitSelect";
import {
  KATEGORI_LABEL,
  STATUS_LABEL,
  type Branch,
  type Brand,
  type FollowUpChannel,
  type TicketKategori,
  type TicketStatus,
  type TicketUpdate,
  type TicketWithBranch,
} from "@/types";
import { cn, formatDate, formatDateOnly } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  baru: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  diproses:
    "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
  tunggu_sparepart:
    "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  done_service: "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",
  selesai: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300",
};

const CHANNEL_LABEL: Record<FollowUpChannel, string> = {
  cabang: "WA ke Cabang",
  brand: "WA ke Brand",
};

export function TicketDetail({
  ticketId,
  startInEdit,
  onBack,
}: {
  ticketId: string;
  startInEdit?: boolean;
  onBack: () => void;
}) {
  const { profile } = useAuth();
  const [ticket, setTicket] = useState<TicketWithBranch | null>(null);
  const [updates, setUpdates] = useState<TicketUpdate[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [statusTo, setStatusTo] = useState<TicketStatus>("diproses");
  const [submitting, setSubmitting] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [edit, setEdit] = useState<{
    branch_id: string;
    brand_id: string;
    kategori: TicketKategori;
    kode_barang: string;
    serial_number: string;
    status: TicketStatus;
    estimasi: string;
    posisi_unit: string;
    keterangan: string;
    tanggal_masuk: string;
  } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const toEditState = (t: TicketWithBranch) => ({
    branch_id: t.branch_id,
    brand_id: t.brand_id ?? "",
    kategori: t.kategori,
    kode_barang: t.kode_barang,
    serial_number: t.serial_number,
    status: t.status,
    estimasi: t.estimasi ?? "",
    posisi_unit: t.posisi_unit ?? "",
    keterangan: t.keterangan ?? "",
    tanggal_masuk: t.tanggal_masuk ?? "",
  });

  const load = async (openEdit?: boolean) => {
    setLoading(true);
    try {
      const [t, u, b, br] = await Promise.all([
        getTicket(ticketId),
        listTicketUpdates(ticketId),
        listBranches(),
        listBrands(),
      ]);
      setTicket(t);
      setUpdates(u);
      setBranches(b);
      setBrands(br);
      setStatusTo(t.status === "selesai" ? "selesai" : nextStatus(t.status));
      if (openEdit) {
        setEdit(toEditState(t));
        setIsEditing(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat tiket");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(startInEdit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const startEdit = () => {
    if (!ticket) return;
    setEdit(toEditState(ticket));
    setIsEditing(true);
  };

  const saveEdit = async () => {
    if (!ticket || !edit) return;
    setSavingEdit(true);
    setError(null);
    try {
      await updateTicket(ticket.id, {
        branch_id: edit.branch_id,
        brand_id: edit.brand_id || null,
        kategori: edit.kategori,
        kode_barang: edit.kode_barang.trim(),
        serial_number: edit.serial_number.trim(),
        status: edit.status,
        estimasi: edit.estimasi.trim() || null,
        posisi_unit: edit.posisi_unit.trim() || null,
        keterangan: edit.keterangan.trim() || null,
        tanggal_masuk: edit.tanggal_masuk || null,
      });
      setIsEditing(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan perubahan");
    } finally {
      setSavingEdit(false);
    }
  };

  const submitFollowUp = async (channel: FollowUpChannel | null) => {
    if (!ticket || !note.trim()) {
      setError("Catatan follow-up wajib diisi.");
      return;
    }

    let target: { name: string; wa_number: string | null } | null = null;
    if (channel === "cabang") target = ticket.branch;
    if (channel === "brand") target = ticket.brand;

    if (channel && (!target || !target.wa_number)) {
      setError(
        channel === "cabang"
          ? "No. WhatsApp cabang ini belum diisi di Master Cabang."
          : "Tiket ini belum ada brand-nya, atau No. WhatsApp brand belum diisi di Master Brand."
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await addFollowUp({
        ticket_id: ticket.id,
        note: note.trim(),
        status_from: ticket.status,
        status_to: statusTo,
        channel,
        created_by: profile?.id ?? null,
        created_by_name: profile?.full_name || profile?.email || null,
      });

      if (channel && target?.wa_number) {
        const message = buildFollowUpMessage(target.name, [ticket], note);
        window.open(waLink(target.wa_number, message), "_blank");
      }

      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan follow-up");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500">
        Memuat tiket...
      </p>
    );
  if (error && !ticket) return <p className="text-sm text-danger">{error}</p>;
  if (!ticket) return null;

  return (
    <div className="max-w-3xl">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 mb-4"
      >
        <ArrowLeft size={16} />
        Kembali
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {ticket.no_service}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {ticket.branch?.name ?? "-"} · {KATEGORI_LABEL[ticket.kategori]}
              {ticket.brand?.name ? ` · ${ticket.brand.name}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-xs font-medium px-2.5 py-1 rounded",
                STATUS_COLORS[ticket.status]
              )}
            >
              {STATUS_LABEL[ticket.status]}
            </span>
            {!isEditing && (
              <button
                onClick={startEdit}
                className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5"
              >
                <Pencil size={13} />
                Edit
              </button>
            )}
          </div>
        </div>

        {!isEditing ? (
          <>
            <dl className="grid grid-cols-2 gap-4 mt-5 text-sm">
              <Detail label="Kode Barang" value={ticket.kode_barang} />
              <Detail label="Serial Number" value={ticket.serial_number} />
              <Detail
                label="Tanggal Masuk"
                value={
                  ticket.tanggal_masuk
                    ? formatDateOnly(ticket.tanggal_masuk)
                    : "-"
                }
              />
              <Detail label="Estimasi" value={ticket.estimasi || "-"} />
              <Detail label="Posisi Unit" value={ticket.posisi_unit || "-"} />
              <Detail
                label="Dilaporkan oleh"
                value={ticket.reported_by_name || "-"}
              />
              <Detail
                label="Lama di-service"
                value={`${ticketAgeDays(ticket)} hari`}
              />
            </dl>

            {ticket.keterangan && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Keterangan
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {ticket.keterangan}
                </p>
              </div>
            )}
          </>
        ) : (
          edit && (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <EditField label="Cabang">
                  <select
                    value={edit.branch_id}
                    onChange={(e) =>
                      setEdit({ ...edit, branch_id: e.target.value })
                    }
                    className="input"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </EditField>
                <EditField label="Brand">
                  <select
                    value={edit.brand_id}
                    onChange={(e) =>
                      setEdit({ ...edit, brand_id: e.target.value })
                    }
                    className="input"
                  >
                    <option value="">- Belum diisi -</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </EditField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <EditField label="Kategori">
                  <select
                    value={edit.kategori}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        kategori: e.target.value as TicketKategori,
                      })
                    }
                    className="input"
                  >
                    <option value="stok">Stok</option>
                    <option value="user">User</option>
                  </select>
                </EditField>
                <EditField label="Status">
                  <select
                    value={edit.status}
                    onChange={(e) =>
                      setEdit({ ...edit, status: e.target.value as TicketStatus })
                    }
                    className="input"
                  >
                    {Object.entries(STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </EditField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <EditField label="Kode Barang">
                  <input
                    value={edit.kode_barang}
                    onChange={(e) =>
                      setEdit({ ...edit, kode_barang: e.target.value })
                    }
                    className="input"
                  />
                </EditField>
                <EditField label="Serial Number">
                  <input
                    value={edit.serial_number}
                    onChange={(e) =>
                      setEdit({ ...edit, serial_number: e.target.value })
                    }
                    className="input"
                  />
                </EditField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <EditField label="Estimasi">
                  <input
                    value={edit.estimasi}
                    onChange={(e) =>
                      setEdit({ ...edit, estimasi: e.target.value })
                    }
                    className="input"
                  />
                </EditField>
                <EditField label="Posisi Unit">
                  <PosisiUnitSelect
                    value={edit.posisi_unit}
                    onChange={(v) => setEdit({ ...edit, posisi_unit: v })}
                  />
                </EditField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <EditField label="Tanggal Masuk">
                  <input
                    type="date"
                    value={edit.tanggal_masuk}
                    onChange={(e) =>
                      setEdit({ ...edit, tanggal_masuk: e.target.value })
                    }
                    className="input dark:[color-scheme:dark]"
                  />
                </EditField>
              </div>

              <EditField label="Keterangan">
                <textarea
                  value={edit.keterangan}
                  onChange={(e) =>
                    setEdit({ ...edit, keterangan: e.target.value })
                  }
                  rows={3}
                  className="input"
                />
              </EditField>

              {error && <p className="text-sm text-danger">{error}</p>}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setError(null);
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
                <button
                  onClick={saveEdit}
                  disabled={savingEdit}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-900 bg-brand rounded-lg hover:brightness-95 disabled:opacity-60"
                >
                  Simpan Perubahan
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
                  box-shadow: 0 0 0 2px #f9c227;
                }
                :global(.dark) .input {
                  border-color: #4b5563;
                  background: #111827;
                  color: #f3f4f6;
                }
              `}</style>
            </div>
          )
        )}
      </div>

      {ticket.status !== "selesai" && !isEditing && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Tambah Follow-up
          </h3>
          <select
            value={statusTo}
            onChange={(e) => setStatusTo(e.target.value as TicketStatus)}
            className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Catatan progres..."
            rows={3}
            className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          />
          {error && <p className="text-sm text-danger mt-2">{error}</p>}
          <div className="flex flex-wrap justify-end gap-3 mt-3">
            <button
              onClick={() => submitFollowUp(null)}
              disabled={submitting}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60"
            >
              Simpan Catatan
            </button>
            <button
              onClick={() => submitFollowUp("cabang")}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60"
            >
              <MessageCircle size={15} />
              Follow Up ke Cabang
            </button>
            <button
              onClick={() => submitFollowUp("brand")}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60"
            >
              <MessageCircle size={15} />
              Follow Up ke Brand
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Riwayat Follow-up
          </h3>
        </div>
        {updates.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 dark:text-gray-500">
            Belum ada follow-up.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {updates.map((u) => (
              <li key={u.id} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {u.created_by_name || "Sistem"}
                    {u.channel && (
                      <span className="ml-2 text-[11px] font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
                        {CHANNEL_LABEL[u.channel]}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {formatDate(u.created_at)}
                  </p>
                </div>
                {u.status_from && u.status_to && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {STATUS_LABEL[u.status_from as TicketStatus]} →{" "}
                    {STATUS_LABEL[u.status_to as TicketStatus]}
                  </p>
                )}
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  {u.note}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function nextStatus(status: TicketStatus): TicketStatus {
  const order: TicketStatus[] = [
    "baru",
    "diproses",
    "tunggu_sparepart",
    "selesai",
  ];
  const idx = order.indexOf(status);
  return order[Math.min(idx + 1, order.length - 1)];
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-gray-900 dark:text-gray-100 font-medium mt-0.5">
        {value}
      </dd>
    </div>
  );
}

function EditField({
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
