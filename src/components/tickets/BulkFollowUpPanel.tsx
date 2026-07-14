"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { addFollowUp, buildFollowUpMessage, waLink } from "@/lib/tickets";
import {
  STATUS_LABEL,
  type FollowUpChannel,
  type TicketStatus,
  type TicketWithBranch,
} from "@/types";

function commonValue<T>(values: (T | null)[]): T | null {
  if (values.length === 0) return null;
  const first = values[0];
  if (first == null) return null;
  return values.every((v) => v === first) ? first : null;
}

export function BulkFollowUpPanel({
  tickets,
  onClose,
  onDone,
}: {
  tickets: TicketWithBranch[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { profile } = useAuth();
  const [note, setNote] = useState("");
  const [statusTo, setStatusTo] = useState<TicketStatus>("diproses");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commonBranchId = commonValue(tickets.map((t) => t.branch_id));
  const commonBranch = commonBranchId
    ? tickets.find((t) => t.branch_id === commonBranchId)?.branch ?? null
    : null;

  const commonBrandId = commonValue(tickets.map((t) => t.brand_id));
  const commonBrand = commonBrandId
    ? tickets.find((t) => t.brand_id === commonBrandId)?.brand ?? null
    : null;

  const submit = async (channel: FollowUpChannel | null) => {
    if (!note.trim()) {
      setError("Catatan follow-up wajib diisi.");
      return;
    }

    let target: { name: string; wa_number: string | null } | null = null;
    if (channel === "cabang") target = commonBranch;
    if (channel === "brand") target = commonBrand;

    if (channel && !target) {
      setError(
        channel === "cabang"
          ? "Tiket yang dipilih beda cabang — pilih tiket dari cabang yang sama dulu."
          : "Tiket yang dipilih beda brand (atau ada yang belum diisi brand-nya) — pilih tiket dari brand yang sama dulu."
      );
      return;
    }
    if (channel && target && !target.wa_number) {
      setError(
        channel === "cabang"
          ? "No. WhatsApp cabang ini belum diisi di Master Cabang."
          : "No. WhatsApp brand ini belum diisi di Master Brand."
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await Promise.all(
        tickets.map((t) =>
          addFollowUp({
            ticket_id: t.id,
            note: note.trim(),
            status_from: t.status,
            status_to: statusTo,
            channel,
            created_by: profile?.id ?? null,
            created_by_name: profile?.full_name || profile?.email || null,
          })
        )
      );

      if (channel && target?.wa_number) {
        const message = buildFollowUpMessage(target.name, tickets, note);
        window.open(waLink(target.wa_number, message), "_blank");
      }

      onDone();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menyimpan follow-up"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">
          Follow Up {tickets.length} Tiket Terpilih
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700"
        >
          <X size={18} />
        </button>
      </div>

      <select
        value={statusTo}
        onChange={(e) => setStatusTo(e.target.value as TicketStatus)}
        className="text-sm rounded-lg border border-gray-300 px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-brand"
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
        placeholder="Catatan follow-up buat semua tiket terpilih..."
        rows={3}
        className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
      />

      {error && <p className="text-sm text-danger mt-2">{error}</p>}

      <div className="flex flex-wrap justify-end gap-3 mt-3">
        <button
          onClick={() => submit(null)}
          disabled={submitting}
          className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
        >
          Simpan Catatan
        </button>
        <button
          onClick={() => submit("cabang")}
          disabled={submitting || !commonBranch}
          title={
            commonBranch
              ? undefined
              : "Tiket yang dipilih harus dari cabang yang sama"
          }
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-40"
        >
          <MessageCircle size={15} />
          Follow Up ke Cabang
        </button>
        <button
          onClick={() => submit("brand")}
          disabled={submitting || !commonBrand}
          title={
            commonBrand
              ? undefined
              : "Tiket yang dipilih harus dari brand yang sama"
          }
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-40"
        >
          <MessageCircle size={15} />
          Follow Up ke Brand
        </button>
      </div>
    </div>
  );
}
