"use client";

import { useState } from "react";
import { Check, Copy, Send, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  addFollowUp,
  buildPosisiUnitDraftMessage,
  waLink,
} from "@/lib/tickets";
import type { TicketWithBranch } from "@/types";
import { errorMessage } from "@/lib/utils";

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
  const commonBranchId = commonValue(tickets.map((t) => t.branch_id));
  const commonBranch = commonBranchId
    ? tickets.find((t) => t.branch_id === commonBranchId)?.branch ?? null
    : null;

  const [message, setMessage] = useState(() =>
    buildPosisiUnitDraftMessage(commonBranch?.name ?? "Tim Cabang", tickets)
  );
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Dicatat sekali per aksi (Salin/Send WA) buat semua tiket terpilih —
   * timestamp-nya disamain biar di History Follow Up kebaca sebagai satu
   * batch, bukan entri terpisah-pisah. */
  const recordHistory = async () => {
    const timestamp = new Date().toISOString();
    await Promise.all(
      tickets.map((t) =>
        addFollowUp({
          ticket_id: t.id,
          note: message.trim(),
          status_from: t.status,
          status_to: t.status,
          channel: "cabang",
          created_by: profile?.id ?? null,
          created_by_name: profile?.full_name || profile?.email || null,
          created_at: timestamp,
        })
      )
    );
  };

  const handleCopy = async () => {
    if (!message.trim()) {
      setError("Teks follow-up masih kosong.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await navigator.clipboard.writeText(message.trim());
      await recordHistory();
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onDone();
      }, 1200);
    } catch (err) {
      setError(errorMessage(err, "Gagal menyalin teks"));
      setSubmitting(false);
    }
  };

  const handleSendWa = async () => {
    if (!message.trim()) {
      setError("Teks follow-up masih kosong.");
      return;
    }
    if (!commonBranch) {
      setError(
        "Tiket yang dipilih beda cabang — pilih tiket dari cabang yang sama dulu."
      );
      return;
    }
    if (!commonBranch.wa_number) {
      setError("No. WhatsApp cabang ini belum diisi di Master Cabang.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await recordHistory();
      window.open(waLink(commonBranch.wa_number, message.trim()), "_blank");
      onDone();
    } catch (err) {
      setError(
        errorMessage(err, "Gagal menyimpan follow-up")
      );
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Follow Up — {commonBranch?.name ?? "Beda Cabang"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {tickets.length} tiket terpilih · teks bisa diedit dulu sebelum
            disalin/dikirim
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={12}
            className="w-full text-sm font-mono rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          />

          {error && <p className="text-sm text-danger mt-2">{error}</p>}

          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={handleCopy}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-gray-900 bg-brand rounded-lg hover:brightness-95 disabled:opacity-60"
            >
              {copied ? (
                <>
                  <Check size={15} />
                  Tersalin!
                </>
              ) : (
                <>
                  <Copy size={15} />
                  Salin Teks
                </>
              )}
            </button>
            <button
              onClick={handleSendWa}
              disabled={submitting || !commonBranch}
              title={
                commonBranch
                  ? undefined
                  : "Tiket yang dipilih harus dari cabang yang sama"
              }
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-40"
            >
              <Send size={15} />
              Send WA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
