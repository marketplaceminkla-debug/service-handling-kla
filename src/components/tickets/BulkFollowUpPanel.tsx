"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Send, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  addFollowUp,
  buildPosisiUnitDraftMessage,
  waLink,
} from "@/lib/tickets";
import type { FollowUpChannel, TicketWithBranch } from "@/types";
import { cn, errorMessage } from "@/lib/utils";

function commonValue<T>(values: (T | null)[]): T | null {
  if (values.length === 0) return null;
  const first = values[0];
  if (first == null) return null;
  return values.every((v) => v === first) ? first : null;
}

type Target = Extract<FollowUpChannel, "cabang" | "brand">;

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

  const commonBrandId = commonValue(tickets.map((t) => t.brand_id));
  const commonBrand = commonBrandId
    ? tickets.find((t) => t.brand_id === commonBrandId)?.brand ?? null
    : null;

  // Kalau tiketnya beda cabang tapi satu brand, buka langsung di mode
  // brand — itu satu-satunya tujuan yang masuk akal buat pilihan itu.
  const [target, setTarget] = useState<Target>(() =>
    !commonBranch && commonBrand ? "brand" : "cabang"
  );
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetInfo = target === "cabang" ? commonBranch : commonBrand;
  const targetLabel = target === "cabang" ? "cabang" : "brand";

  // Draft dirakit ulang tiap ganti tujuan, kecuali teksnya sudah diedit
  // sendiri — suntingan orang tidak boleh hilang gara-gara ganti tab.
  useEffect(() => {
    if (touched) return;
    const fallback = target === "cabang" ? "Tim Cabang" : "Tim Brand";
    setMessage(
      buildPosisiUnitDraftMessage(target, targetInfo?.name ?? fallback, tickets)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, targetInfo?.name, tickets, touched]);

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
          channel: target,
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
    if (!targetInfo) {
      setError(
        target === "cabang"
          ? "Tiket yang dipilih beda cabang — pilih tiket dari cabang yang sama, atau follow up ke brand."
          : "Tiket yang dipilih beda brand (atau ada yang belum diisi brand-nya)."
      );
      return;
    }
    if (!targetInfo.wa_number) {
      setError(
        `No. WhatsApp ${targetLabel} ini belum diisi di Master ${
          target === "cabang" ? "Cabang" : "Brand"
        }.`
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await recordHistory();
      window.open(waLink(targetInfo.wa_number, message.trim()), "_blank");
      onDone();
    } catch (err) {
      setError(errorMessage(err, "Gagal menyimpan follow-up"));
      setSubmitting(false);
    }
  };

  const switchTarget = (next: Target) => {
    setTarget(next);
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Follow Up — {targetInfo?.name ?? `Beda ${target === "cabang" ? "Cabang" : "Brand"}`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <div className="inline-flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1 mb-3">
            {(
              [
                ["cabang", "Ke Cabang", commonBranch?.name],
                ["brand", "Ke Brand", commonBrand?.name],
              ] as [Target, string, string | undefined][]
            ).map(([value, label, name]) => (
              <button
                key={value}
                onClick={() => switchTarget(value)}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-md transition",
                  target === value
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                )}
              >
                {label}
                {name && (
                  <span className="hidden sm:inline text-xs opacity-70">
                    {" "}
                    · {name}
                  </span>
                )}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {tickets.length} tiket terpilih · teks bisa diedit dulu sebelum
            disalin/dikirim
          </p>

          {!targetInfo && (
            <p className="text-xs text-gray-500 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 border border-brand/40 rounded-lg px-3 py-2 mb-2">
              {target === "cabang"
                ? "Tiket yang dipilih beda cabang, jadi Send WA ke cabang tidak bisa. Salin teksnya, atau pindah ke tab Ke Brand."
                : "Tiket yang dipilih beda brand atau ada yang belum diisi brand-nya, jadi Send WA ke brand tidak bisa. Salin teksnya saja."}
            </p>
          )}

          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setTouched(true);
            }}
            rows={14}
            className="w-full text-sm font-mono rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          />

          {touched && (
            <button
              onClick={() => setTouched(false)}
              className="text-xs text-gray-500 dark:text-gray-400 underline mt-1.5"
            >
              Kembalikan ke template
            </button>
          )}

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
              disabled={submitting || !targetInfo}
              title={
                targetInfo
                  ? undefined
                  : `Tiket yang dipilih harus dari ${targetLabel} yang sama`
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
